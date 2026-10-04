// content/features/supabase_client.js - Foxen Worker & API Integration Client

const FOXEN_API_BASE = 'https://api.foxen.site';
const WORKER_API_URL = 'https://api.foxen.site/api';
const SUPABASE_URL = 'https://api.foxen.site';
const SUPABASE_FALLBACK_URL = 'https://yoacfrbedwksnfksjjmv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';

/**
 * Запросить данные профиля пользователя по ID, Foxen ID или нику в FunPay
 */
async function fxnFetchProfileByFpUser(identifier) {
    if (!identifier) return null;

    try {
        let profile = null;
        let sub = {};

        // 1. Запрос к Worker API
        const url = `${FOXEN_API_BASE}/api/users/${encodeURIComponent(identifier)}`;
        const res = await fetch(url, {
            credentials: 'omit',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            const json = await res.json();
            if (json && json.ok && json.profile) {
                profile = json.profile;
                sub = profile.subscription || json.subscription || {};
            }
        }

        // 2. Прямой запрос к Supabase profiles (если подписка не найдена в Worker или Worker вернул неактивную)
        const supabaseUrl = SUPABASE_FALLBACK_URL || 'https://yoacfrbedwksnfksjjmv.supabase.co';
        const apiKey = SUPABASE_ANON_KEY;
        if (!profile || (!sub.is_active && !profile.is_premium)) {
            try {
                const target = encodeURIComponent(identifier);
                const q = `or=(foxen_id.eq.${target},fp_user.ilike.${target},fp_user_id.eq.${target})`;
                const sbRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${q}&select=*&limit=1`, {
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (sbRes.ok) {
                    const sbList = await sbRes.json();
                    if (sbList && sbList.length > 0) {
                        const sbProf = sbList[0];
                        if (!profile) profile = sbProf;
                        if (sbProf.is_premium) {
                            profile.is_premium = true;
                            if (!sub.is_active) {
                                sub.is_active = true;
                                sub.is_lifetime = true;
                                sub.plan_id = 'premium';
                                sub.status = 'active';
                            }
                        }
                        if (sbProf.foxen_id) profile.foxen_id = sbProf.foxen_id;
                    }
                }
            } catch (_) {}
        }

        // 3. Прямой запрос к subscriptions (если есть доступ по foxen_id)
        if (profile?.foxen_id && (!sub.is_active || !sub.expires_at)) {
            try {
                const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?foxen_id=eq.${encodeURIComponent(profile.foxen_id)}&select=*&limit=1`, {
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (subRes.ok) {
                    const sList = await subRes.json();
                    if (sList && sList.length > 0) {
                        const s = sList[0];
                        const isSActive = s.status === 'active' || s.is_lifetime || (s.expires_at && new Date(s.expires_at) > new Date());
                        if (isSActive) {
                            sub = {
                                is_active: true,
                                is_lifetime: Boolean(s.is_lifetime || s.plan_id === 'lifetime'),
                                plan_id: 'premium',
                                status: s.status || 'active',
                                starts_at: s.starts_at,
                                expires_at: s.expires_at
                            };
                        }
                    }
                }
            } catch (_) {}
        }

        if (profile) {
            const isSubActive = Boolean(profile.is_premium || sub.is_active || sub.is_lifetime || sub.status === 'active');
            const isLifetime = Boolean(sub.is_lifetime || sub.plan_id === 'lifetime');

            const normalized = {
                FP_USER: profile.fp_user || identifier,
                FP_USER_ID: profile.fp_user_id || null,
                FOXEN_ID: profile.foxen_id || (profile.fp_user_id ? `FX-${profile.fp_user_id}` : null),
                TG_USER: profile.tg_username ? `@${profile.tg_username.replace(/^@/, '')}` : null,
                SUBSCRIPTION: isSubActive ? 'premium' : 'free',
                is_premium: isSubActive,
                subscription: {
                    is_active: isSubActive,
                    is_lifetime: isLifetime,
                    plan_id: 'premium',
                    status: isSubActive ? 'active' : 'inactive',
                    starts_at: sub.starts_at || null,
                    expires_at: sub.expires_at || null
                },
                avatar_url: profile.avatar_url || null,
                is_fp_verified: Boolean(profile.is_fp_verified),
                CREATED_AT: profile.created_at || null,
                nickname_effect: profile.nickname_effect || null
            };

            await fxnSaveCachedProfile(normalized);
            return normalized;
        }
    } catch (e) {
        console.warn('[Foxen] Failed to fetch profile from api.foxen.site:', e);
    }

    return null;
}

/**
 * Активировать ключ подписки по USED_KEY
 */
async function fxnActivateKeyInSupabase(key, fpUsername, tgUsername = '') {
    if (!key) throw new Error('Введен пустой ключ.');
    const formattedKey = key.trim().toUpperCase();

    // 1) Пробуем через Worker
    if (WORKER_API_URL) {
        try {
            const res = await fetch(`${WORKER_API_URL}?key=${encodeURIComponent(formattedKey)}&fp_user=${encodeURIComponent(fpUsername || '')}`);
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data) {
                    return json.data;
                }
                if (json && json.error) throw new Error(json.error);
            }
        } catch (e) {
            if (e.message && !e.message.includes('Fetch Error')) throw e;
        }
    }

    // 2) Прямой запрос к Supabase (если Worker не настроен)
    if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE')) {
        const url = `${SUPABASE_URL}/rest/v1/foxen_users?USED_KEY=eq.${encodeURIComponent(formattedKey)}&select=*`;
        const res = await fetch(url, {
            credentials: 'omit',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (res.ok) {
            const records = await res.json();
            if (!records || records.length === 0) throw new Error('Ключ не найден или недействителен.');
            return records[0];
        }
    }

    throw new Error('Не удалось связаться с сервером подписок.');
}

/**
 * Проверить временный код авторизации из бота и создать/привязать профиль в Supabase
 */
async function fxnVerifyAuthCodeInSupabase(authCode, fpUsername) {
    if (!authCode) throw new Error('Введите код авторизации из бота.');
    const code = authCode.trim();

    // 1) Пробуем через Worker
    if (WORKER_API_URL) {
        try {
            const res = await fetch(`${WORKER_API_URL}?action=verify_code&code=${encodeURIComponent(code)}&fp_user=${encodeURIComponent(fpUsername || '')}`, { credentials: 'omit' });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data) return json.data;
                if (json && json.error) throw new Error(json.error);
            }
        } catch (e) {
            if (e.message && !e.message.includes('Fetch Error')) throw e;
        }
    }

    // 2) Прямой запрос к Supabase (создание / обновление профиля)
    if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE')) {
        try {
            const url = `${SUPABASE_URL}/rest/v1/foxen_users`;
            const payload = {
                FP_USER: fpUsername,
                TG_USER: `@tg_${code}`,
                CREATED_AT: new Date().toISOString()
            };
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'omit',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) return data[0];
            }
        } catch (e) {
            console.error('Foxen Supabase Auth Verification Error:', e);
        }
    }

    // 3) Локальный фоллбэк
    const cached = (await fxnGetCachedProfile()) || { SUBSCRIPTION: 'free', USED_KEY: 'FXN-FREE-DEFAULT' };
    cached.FP_USER = fpUsername;
    cached.TG_USER = `@user_${code}`;
    cached.CREATED_AT = new Date().toISOString();
    await fxnSaveCachedProfile(cached);
    return cached;
}

/**
 * Сохранить кэш профиля локально в storage
 */
async function fxnSaveCachedProfile(profileData) {
    if (!profileData) return;
    const cacheObj = {
        data: profileData,
        ts: Date.now()
    };
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenUserProfileCache: cacheObj });
}

/**
 * Получить кэшированный профиль локально
 */
async function fxnGetCachedProfile() {
    try {
        const res = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenUserProfileCache');
        if (res && res.foxenUserProfileCache) {
            return res.foxenUserProfileCache.data || null;
        }
    } catch (e) {}
    return null;
}
