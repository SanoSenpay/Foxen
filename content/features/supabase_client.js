// content/features/supabase_client.js - Foxen Worker & API Integration Client

const FOXEN_API_BASE = 'https://api.foxen.site';
const WORKER_API_URL = 'https://api.foxen.site/api';
const SUPABASE_URL = 'https://yoacfrbedwksnfksjjmv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';

/**
 * Запросить данные профиля пользователя по ID, Foxen ID или нику в FunPay
 */
async function fxnFetchProfileByFpUser(identifier) {
    if (!identifier) return null;

    try {
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
                const profile = json.profile;
                const sub = json.subscription || {};
                
                // Нормализуем данные профиля
                const normalized = {
                    FP_USER: profile.fp_user || identifier,
                    FP_USER_ID: profile.fp_user_id || null,
                    FOXEN_ID: profile.foxen_id || (profile.fp_user_id ? `FX-${profile.fp_user_id}` : null),
                    TG_USER: profile.tg_username ? `@${profile.tg_username.replace(/^@/, '')}` : null,
                    SUBSCRIPTION: sub.is_active ? (sub.tier || 'premium') : 'free',
                    avatar_url: profile.avatar_url || null,
                    is_fp_verified: Boolean(profile.is_fp_verified),
                    CREATED_AT: profile.created_at || null
                };

                await fxnSaveCachedProfile(normalized);
                return normalized;
            }
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
