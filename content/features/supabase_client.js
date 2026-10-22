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

        // 2. Прямой запрос к Supabase RPC get_public_profile (1 атомарный SQL запрос)
        const supabaseUrl = SUPABASE_FALLBACK_URL || 'https://yoacfrbedwksnfksjjmv.supabase.co';
        const apiKey = SUPABASE_ANON_KEY;
        if (!profile) {
            try {
                const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_profile`, {
                    method: 'POST',
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ p_query: identifier })
                });
                if (rpcRes.ok) {
                    const pub = await rpcRes.json();
                    if (pub && pub.id) {
                        profile = pub;
                        sub = pub.subscription || {};
                    }
                }
            } catch (_) {}
        }

        // 3. Fallback: Прямой запрос к Supabase profiles (если RPC недоступен)
        if (!profile) {
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
                        profile = sbProf;
                        if (sbProf.is_premium) {
                            profile.is_premium = true;
                            sub = {
                                is_active: true,
                                is_lifetime: false,
                                plan_id: 'premium',
                                status: 'active'
                            };
                        }
                        if (sbProf.foxen_id) profile.foxen_id = sbProf.foxen_id;
                    }
                }
            } catch (_) {}

            // 4. Прямой запрос к subscriptions (только при fallback-поиске, если подписка ещё не подтверждена)
            if (profile && !sub.is_active) {
                try {
                    const subFilters = [];
                    if (profile.id) subFilters.push(`user_id.eq.${encodeURIComponent(profile.id)}`);
                    if (profile.foxen_id) subFilters.push(`foxen_id.eq.${encodeURIComponent(profile.foxen_id)}`);
                    if (profile.fp_user) subFilters.push(`fp_user.ilike.${encodeURIComponent(profile.fp_user)}`);
                    if (identifier) subFilters.push(`fp_user.ilike.${encodeURIComponent(identifier)}`);
                    
                    const subQuery = subFilters.length > 0 ? `or=(${subFilters.join(',')})&` : '';
                    const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${subQuery}select=*&order=starts_at.desc&limit=1`, {
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
                            const hasExp = Boolean(s.expires_at);
                            const isNotExp = !hasExp || new Date(s.expires_at) > new Date();
                            const isLife = !hasExp && Boolean(s.is_lifetime || s.plan_id === 'lifetime');
                            const isSActive = (s.status === 'active' || isLife || isNotExp) && isNotExp;
                            if (isSActive) {
                                sub = {
                                    is_active: true,
                                    is_lifetime: isLife,
                                    plan_id: isLife ? 'lifetime' : (s.plan_id || 'premium'),
                                    status: s.status || 'active',
                                    starts_at: s.starts_at,
                                    expires_at: s.expires_at
                                };
                                profile.is_premium = true;
                            }
                        }
                    }
                } catch (_) {}
            }
        }

        if (profile) {
            const currentFid = String(profile.foxen_id || '').toUpperCase();
            const currentUid = String(profile.fp_user_id || '');
            const currentUName = String(profile.fp_user || identifier || '').toLowerCase();
            const isAdmin = ['FX-000000', 'FX-000001'].includes(currentFid) ||
                            ['15508026', '13781813'].includes(currentUid) ||
                            ['vireonshop', 'sanosenpai'].includes(currentUName);

            let assignedFoxenId = profile.foxen_id;
            if (!assignedFoxenId || assignedFoxenId === '—') {
                if (currentUid === '13781813' || currentUName === 'sanosenpai') {
                    assignedFoxenId = 'FX-000000';
                } else if (currentUid === '15508026' || currentUName === 'vireonshop') {
                    assignedFoxenId = 'FX-000001';
                } else if (profile.fp_user_id) {
                    assignedFoxenId = `FX-${profile.fp_user_id}`;
                }
            }

            const hasExpiry = Boolean(sub.expires_at);
            const isExpired = hasExpiry && (new Date(sub.expires_at).getTime() <= Date.now());
            const isSubActive = Boolean((profile.is_premium || sub.is_active) && !isExpired);
            const isLifetime = Boolean(isSubActive && !hasExpiry && (sub.is_lifetime || sub.plan_id === 'lifetime'));

            const normalized = {
                FP_USER: profile.fp_user || identifier,
                FP_USER_ID: profile.fp_user_id || null,
                FOXEN_ID: assignedFoxenId || null,
                TG_USER: profile.tg_username ? `@${profile.tg_username.replace(/^@/, '')}` : null,
                SUBSCRIPTION: isSubActive ? (isLifetime ? 'lifetime' : 'premium') : 'free',
                is_premium: isSubActive,
                is_admin: isAdmin,
                subscription: {
                    is_active: isSubActive,
                    is_lifetime: isLifetime,
                    plan_id: isLifetime ? 'lifetime' : (isSubActive ? 'premium' : 'free'),
                    status: isSubActive ? 'active' : 'inactive',
                    starts_at: sub.starts_at || null,
                    expires_at: isLifetime ? null : (sub.expires_at || null)
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
 * Единая верификация наличия активной подписки Foxen Premium
 * @param {Object} [profileData] Опциональный объект профиля. Если null — читается кэш из storage.
 * @returns {Promise<boolean>}
 */
/**
 * Проверка принадлежности к администрации и разработчикам Foxen
 * Администраторы и разработчики:
 *   • SanoSenpai: FX-000000, ID 13781813
 *   • VireonShop: FX-000001, ID 15508026
 */
function isFoxenAdmin(profileData) {
    if (!profileData) return false;
    const fid = String(profileData.FOXEN_ID || profileData.foxen_id || profileData.foxenId || '').toUpperCase();
    const uid = String(profileData.FP_USER_ID || profileData.fp_user_id || profileData.userId || '');
    const uname = String(profileData.FP_USER || profileData.fp_user || profileData.username || '').toLowerCase();

    const adminIds = ['FX-000000', 'FX-000001', 'FX-774724', 'FX-15508026'];
    const adminUids = ['15508026', '13781813'];
    const adminUsers = ['vireonshop', 'sanosenpai', 'sano'];

    return adminIds.includes(fid) || adminUids.includes(uid) || adminUsers.includes(uname) || Boolean(profileData.is_admin || profileData.isAdmin);
}

/**
 * Единая верификация наличия активной подписки Foxen Premium
 * @param {Object} [profileData] Опциональный объект профиля. Если null — читается кэш из storage.
 * @returns {Promise<boolean>}
 */
async function isFoxenPremiumUser(profileData = null) {
    try {
        let p = profileData;
        if (!p) {
            p = await fxnGetCachedProfile();
        }

        if (p) {
            // 1. Проверка бессрочной подписки (Lifetime)
            const sub = p.subscription || {};
            const isLifetime = Boolean(
                p.SUBSCRIPTION === 'lifetime' || 
                p.subscription_tier === 'lifetime' ||
                sub.is_lifetime || 
                sub.plan_id === 'lifetime' ||
                p.is_lifetime
            );
            if (isLifetime) {
                return true;
            }

            // 2. Строгая проверка срока действия (expires_at)
            const exp = sub.expires_at || p.expires_at;
            if (exp) {
                const expMs = new Date(exp).getTime();
                if (!isNaN(expMs) && expMs <= Date.now()) {
                    // Подписка истекла!
                    return false;
                }
            }

            // 3. Проверка активного статуса в профиле или объекте подписки
            if (p.is_premium || p.has_premium || sub.is_active || (p.SUBSCRIPTION && p.SUBSCRIPTION !== 'free') || sub.status === 'active') {
                return true;
            }
        }

        // 4. Fallback к хранилищу chrome.storage.local
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (storage) {
            const st = await storage.get(['foxenUserProfileCache', 'foxen_user_profile', 'foxen_is_premium', 'cached_profile']);
            if (st) {
                const prof = st.foxen_user_profile || st.foxenUserProfileCache?.data || st.cached_profile;
                if (prof && prof !== p) {
                    return await isFoxenPremiumUser(prof);
                }
                if (st.foxen_is_premium && !p) {
                    return true;
                }
            }
        }
    } catch (e) {
        console.warn('[Foxen] isFoxenPremiumUser verification error:', e);
    }
    return false;
}

const FXN_CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут TTL для кэша профиля

/**
 * Сохранить кэш профиля локально в storage с полной синхронизацией всех ключей
 */
async function fxnSaveCachedProfile(profileData) {
    if (!profileData) return;
    try {
        const isAdmin = isFoxenAdmin(profileData);

        const sub = profileData.subscription || {};
        const expDate = sub.expires_at || profileData.expires_at;
        const hasExpiry = Boolean(expDate);
        const isExpired = hasExpiry && (new Date(expDate).getTime() <= Date.now());

        const isPrem = Boolean((profileData.is_premium || sub.is_active || (profileData.SUBSCRIPTION && profileData.SUBSCRIPTION !== 'free')) && !isExpired);
        const isLife = Boolean(isPrem && !hasExpiry && (sub.is_lifetime || sub.plan_id === 'lifetime' || profileData.SUBSCRIPTION === 'lifetime'));

        // Нормализуем объект, чтобы и uppercase, и lowercase поля присутствовали
        profileData.is_premium = isPrem;
        profileData.has_premium = isPrem;
        profileData.is_admin = isAdmin;
        profileData.SUBSCRIPTION = isPrem ? (isLife ? 'lifetime' : 'premium') : 'free';
        if (!profileData.subscription) {
            profileData.subscription = {};
        }
        profileData.subscription.is_active = isPrem;
        profileData.subscription.is_lifetime = isLife;
        profileData.subscription.plan_id = isPrem ? (isLife ? 'lifetime' : (sub.plan_id || 'premium')) : 'free';
        profileData.subscription.status = isPrem ? 'active' : 'inactive';
        if (isLife) profileData.subscription.expires_at = null;

        const cacheObj = {
            data: profileData,
            ts: Date.now()
        };

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (storage) {
            await storage.set({ 
                foxenUserProfileCache: cacheObj,
                foxen_user_profile: profileData,
                foxen_is_premium: isPrem
            });
        }
    } catch (_) {}
}

/**
 * Получить кэшированный профиль локально с валидацией TTL
 */
async function fxnGetCachedProfile(options = {}) {
    const { ignoreTTL = false } = options;
    try {
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (!storage) return null;
        const res = await storage.get(['foxenUserProfileCache', 'foxen_user_profile']);
        const cacheEntry = res?.foxenUserProfileCache;
        if (cacheEntry && cacheEntry.data) {
            const isExpired = !ignoreTTL && cacheEntry.ts && (Date.now() - cacheEntry.ts > FXN_CACHE_TTL_MS);
            if (!isExpired) {
                return cacheEntry.data;
            }
            // Кэш устарел по TTL — фоново запускаем обновление, если есть идентификатор
            const ident = cacheEntry.data.FP_USER || cacheEntry.data.fp_user || cacheEntry.data.foxen_id;
            if (ident && typeof fxnFetchProfileByFpUser === 'function') {
                fxnFetchProfileByFpUser(ident).catch(() => {});
            }
            return cacheEntry.data;
        }
        if (res?.foxen_user_profile) {
            return res.foxen_user_profile;
        }
    } catch (e) {}
    return null;
}

// Экспорт глобально для всех контентных скриптов и модулей Foxen
if (typeof window !== 'undefined') {
    window.isFoxenAdmin = isFoxenAdmin;
    window.isFoxenPremiumUser = isFoxenPremiumUser;
    window.fxnGetCachedProfile = fxnGetCachedProfile;
    window.fxnSaveCachedProfile = fxnSaveCachedProfile;
    window.fxnFetchProfileByFpUser = fxnFetchProfileByFpUser;
}
