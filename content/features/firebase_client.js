// content/features/firebase_client.js - Foxen Firebase & Firestore Integration Client
// Direct, lightweight REST client for Cloud Firestore & Firebase Auth (0 external dependencies)

const FIREBASE_CONFIG = {
    projectId: 'foxen-dt',
    apiKey: 'AIzaSyDtFlmOByNAOEXyIxyT6QjBGPuvWPd5BVk',
    authDomain: 'foxen-dt.firebaseapp.com',
    storageBucket: 'foxen-dt.firebasestorage.app',
    messagingSenderId: '175803067191',
    appId: '1:175803067191:web:188ee7e66c1669c3b008b2',
    measurementId: 'G-4GDFQHTJGW',
    databaseId: '(default)'
};

window.FOXEN_API_BASE = (typeof window !== 'undefined' && window.FOXEN_API_BASE) || 'https://api.foxen.site';
window.FIRESTORE_REST_BASE = (typeof window !== 'undefined' && window.FIRESTORE_REST_BASE) || 'https://firestore.googleapis.com/v1';

/**
 * Get active Firebase project configuration from storage or defaults
 */
async function getFirebaseConfig() {
    try {
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (storage) {
            const data = await storage.get(['foxenFirebaseConfig', 'foxenFirebaseProjectId', 'foxenFirebaseApiKey']);
            if (data?.foxenFirebaseConfig) {
                return { ...FIREBASE_CONFIG, ...data.foxenFirebaseConfig };
            }
            if (data?.foxenFirebaseProjectId) {
                return {
                    ...FIREBASE_CONFIG,
                    projectId: data.foxenFirebaseProjectId,
                    apiKey: data.foxenFirebaseApiKey || FIREBASE_CONFIG.apiKey
                };
            }
        }
    } catch (_) {}
    return FIREBASE_CONFIG;
}

/**
 * Helper to parse Firestore Value format (e.g. { stringValue: 'abc' } -> 'abc')
 */
function parseFirestoreFields(fields) {
    if (!fields || typeof fields !== 'object') return {};
    const res = {};
    for (const [key, val] of Object.entries(fields)) {
        if (!val || typeof val !== 'object') {
            res[key] = val;
            continue;
        }
        if ('stringValue' in val) res[key] = val.stringValue;
        else if ('integerValue' in val) res[key] = parseInt(val.integerValue, 10);
        else if ('doubleValue' in val) res[key] = parseFloat(val.doubleValue);
        else if ('booleanValue' in val) res[key] = Boolean(val.booleanValue);
        else if ('timestampValue' in val) res[key] = val.timestampValue;
        else if ('nullValue' in val) res[key] = null;
        else if ('mapValue' in val) res[key] = parseFirestoreFields(val.mapValue.fields);
        else if ('arrayValue' in val) {
            res[key] = (val.arrayValue.values || []).map(v => {
                const parsed = parseFirestoreFields({ temp: v });
                return parsed.temp;
            });
        } else {
            res[key] = val;
        }
    }
    return res;
}

/**
 * Helper to convert plain JS object into Firestore Value format
 */
function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) {
            fields[k] = { nullValue: null };
        } else if (typeof v === 'boolean') {
            fields[k] = { booleanValue: v };
        } else if (typeof v === 'number') {
            if (Number.isInteger(v)) {
                fields[k] = { integerValue: String(v) };
            } else {
                fields[k] = { doubleValue: v };
            }
        } else if (typeof v === 'string') {
            fields[k] = { stringValue: v };
        } else if (Array.isArray(v)) {
            fields[k] = {
                arrayValue: {
                    values: v.map(item => {
                        const m = toFirestoreFields({ temp: item });
                        return m.temp;
                    })
                }
            };
        } else if (typeof v === 'object') {
            fields[k] = {
                mapValue: {
                    fields: toFirestoreFields(v)
                }
            };
        }
    }
    return fields;
}

/**
 * Запросить данные профиля пользователя по ID, Foxen ID или нику в FunPay через Cloud Firestore
 */
async function fxnFetchProfileByFpUser(identifier) {
    if (!identifier) return null;

    try {
        let profile = null;
        let sub = {};

        // 0. Быстрый поиск в публичном реестре GitHub (public_profiles.json) - 0 нагрузки на БД и воркер
        try {
            const cleanTarget = String(identifier).trim();
            const cleanTargetLower = cleanTarget.toLowerCase();
            const cleanTargetUpper = cleanTarget.toUpperCase();
            
            let reg = null;
            if (typeof window !== 'undefined' && window._fxnPublicProfiles) {
                reg = window._fxnPublicProfiles;
            } else {
                const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
                if (storage) {
                    const st = await storage.get(['fxnPublicProfilesRegistry']);
                    if (st && st.fxnPublicProfilesRegistry && st.fxnPublicProfilesRegistry.data) {
                        reg = st.fxnPublicProfilesRegistry.data;
                        if (typeof window !== 'undefined') window._fxnPublicProfiles = reg;
                    }
                }
                if (!reg) {
                    const ghUrls = [
                        'https://raw.githubusercontent.com/SanoSenpay/Foxen/data/public_profiles.json',
                        'https://cdn.jsdelivr.net/gh/SanoSenpay/Foxen@data/public_profiles.json'
                    ];
                    for (const u of ghUrls) {
                        try {
                            const r = await fetch(u);
                            if (r.ok) {
                                reg = await r.json();
                                if (reg && (reg.by_fp_id || reg.profiles)) {
                                    if (typeof window !== 'undefined') window._fxnPublicProfiles = reg;
                                    if (storage) storage.set({ fxnPublicProfilesRegistry: { ts: Date.now(), data: reg } }).catch(() => {});
                                    break;
                                }
                            }
                        } catch (_) {}
                    }
                }
            }

            if (reg) {
                const item = (reg.by_fp_id && (reg.by_fp_id[cleanTarget] || reg.by_fp_id[cleanTargetLower])) ||
                             (reg.by_username && (reg.by_username[cleanTargetLower] || reg.by_username[cleanTarget])) ||
                             (reg.by_foxen_id && (reg.by_foxen_id[cleanTargetUpper] || reg.by_foxen_id[cleanTarget]));
                if (item) {
                    profile = {
                        id: item.foxen_id || item.fp_user_id || cleanTarget,
                        foxen_id: item.foxen_id,
                        fp_user: item.fp_user,
                        fp_user_id: item.fp_user_id,
                        avatar_url: item.avatar_url,
                        banner_url: item.banner_url,
                        banner_id: item.banner_id,
                        is_fp_verified: item.is_fp_verified,
                        is_premium: item.is_premium,
                        is_admin: item.is_admin,
                        custom_emoji: item.custom_emoji,
                        nickname_effect: item.nickname_effect,
                        description: item.description,
                        created_at: item.created_at,
                        updated_at: item.updated_at
                    };
                    sub = {
                        is_active: Boolean(item.is_premium),
                        is_lifetime: Boolean(item.is_admin),
                        plan_id: item.is_admin ? 'lifetime' : (item.is_premium ? 'premium' : 'free'),
                        status: item.is_premium ? 'active' : 'inactive'
                    };
                }
            }
        } catch (_) {}

        // 1. Worker API Proxy (если активен)
        try {
            const url = `${(window.FOXEN_API_BASE || 'https://api.foxen.site')}/api/users/${encodeURIComponent(identifier)}`;
            const res = await fetch(url, {
                credentials: 'omit',
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.ok && json.profile) {
                    profile = json.profile;
                    sub = profile.subscription || json.subscription || {};
                }
            }
        } catch (_) {}

        // 2. Прямой запрос к Cloud Firestore REST API (runQuery)
        if (!profile) {
            const cfg = await getFirebaseConfig();
            if (cfg.projectId) {
                const queryUrl = `${(window.FIRESTORE_REST_BASE || 'https://firestore.googleapis.com/v1')}/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.databaseId)}/documents:runQuery`;
                const searchTarget = String(identifier).trim();
                const numTarget = parseInt(searchTarget, 10);

                const filters = [
                    {
                        fieldFilter: {
                            field: { fieldPath: 'fp_user' },
                            op: 'EQUAL',
                            value: { stringValue: searchTarget }
                        }
                    },
                    {
                        fieldFilter: {
                            field: { fieldPath: 'foxen_id' },
                            op: 'EQUAL',
                            value: { stringValue: searchTarget.toUpperCase() }
                        }
                    }
                ];

                if (!isNaN(numTarget)) {
                    filters.push({
                        fieldFilter: {
                            field: { fieldPath: 'fp_user_id' },
                            op: 'EQUAL',
                            value: { integerValue: String(numTarget) }
                        }
                    });
                }

                const queryBody = {
                    structuredQuery: {
                        from: [{ collectionId: 'profiles' }],
                        where: {
                            compositeFilter: {
                                op: 'OR',
                                filters: filters
                            }
                        },
                        limit: 1
                    }
                };

                const fsHeaders = { 'Content-Type': 'application/json' };
                if (cfg.apiKey) {
                    fsHeaders['X-Goog-Api-Key'] = cfg.apiKey;
                }

                const fsRes = await fetch(queryUrl, {
                    method: 'POST',
                    headers: fsHeaders,
                    body: JSON.stringify(queryBody)
                });

                if (fsRes.ok) {
                    const results = await fsRes.json();
                    if (Array.isArray(results) && results[0]?.document) {
                        const doc = results[0].document;
                        const data = parseFirestoreFields(doc.fields);
                        profile = {
                            id: doc.name.split('/').pop(),
                            ...data
                        };
                        sub = profile.subscription || {};
                    }
                }
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
                nickname_effect: profile.nickname_effect || null,
                custom_emoji: profile.custom_emoji || null
            };

            await fxnSaveCachedProfile(normalized);
            return normalized;
        }
    } catch (e) {
        console.warn('[Foxen Firebase] Failed to fetch profile:', e);
    }

    return null;
}

/**
 * Активировать ключ подписки в Firebase
 */
async function fxnActivateKeyInFirebase(key, fpUsername, tgUsername = '') {
    if (!key) throw new Error('Введен пустой ключ.');
    const formattedKey = key.trim().toUpperCase();

    // 1) Worker API
    if ((window.FOXEN_API_BASE || 'https://api.foxen.site')) {
        try {
            const res = await fetch(`${(window.FOXEN_API_BASE || 'https://api.foxen.site')}/api/keys/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: formattedKey,
                    fp_user: fpUsername,
                    tg_user: tgUsername
                })
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data) return json.data;
                if (json && json.error) throw new Error(json.error);
            }
        } catch (e) {
            if (e.message && !e.message.includes('Fetch Error')) throw e;
        }
    }

    // 2) Прямой запрос к Firestore (чтение документа license_keys)
    const cfg = await getFirebaseConfig();
    if (cfg.projectId) {
        const docUrl = `${(window.FIRESTORE_REST_BASE || 'https://firestore.googleapis.com/v1')}/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.databaseId)}/documents/license_keys/${encodeURIComponent(formattedKey)}`;
        const headers = cfg.apiKey ? { 'X-Goog-Api-Key': cfg.apiKey } : {};
        const res = await fetch(docUrl, { headers });
        if (res.ok) {
            const doc = await res.json();
            const data = parseFirestoreFields(doc.fields);
            if (data.is_used) {
                throw new Error('Данный ключ уже был активирован ранее.');
            }
            return data;
        }
    }

    throw new Error('Не удалось связаться с сервером подписок.');
}

/**
 * Проверка принадлежности к администрации Foxen
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
 */
async function isFoxenPremiumUser(profileData = null) {
    try {
        let p = profileData;
        if (!p) {
            p = await fxnGetCachedProfile();
        }

        if (p) {
            const sub = p.subscription || {};
            const isLifetime = Boolean(
                p.SUBSCRIPTION === 'lifetime' || 
                p.subscription_tier === 'lifetime' ||
                sub.is_lifetime || 
                sub.plan_id === 'lifetime' ||
                p.is_lifetime
            );
            if (isLifetime) return true;

            const exp = sub.expires_at || p.expires_at;
            if (exp) {
                const expMs = new Date(exp).getTime();
                if (!isNaN(expMs) && expMs <= Date.now()) return false;
            }

            if (p.is_premium || p.has_premium || sub.is_active || (p.SUBSCRIPTION && p.SUBSCRIPTION !== 'free') || sub.status === 'active') {
                return true;
            }
        }

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (storage) {
            const st = await storage.get(['foxenUserProfileCache', 'foxen_user_profile', 'foxen_is_premium', 'cached_profile']);
            if (st) {
                const prof = st.foxen_user_profile || st.foxenUserProfileCache?.data || st.cached_profile;
                if (prof && prof !== p) {
                    return await isFoxenPremiumUser(prof);
                }
                if (st.foxen_is_premium && !p) return true;
            }
        }
    } catch (e) {
        console.warn('[Foxen] isFoxenPremiumUser verification error:', e);
    }
    return false;
}

var FXN_CACHE_TTL_MS = 30 * 60 * 1000;

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

        profileData.is_premium = isPrem;
        profileData.has_premium = isPrem;
        profileData.is_admin = isAdmin;
        profileData.SUBSCRIPTION = isPrem ? (isLife ? 'lifetime' : 'premium') : 'free';
        if (!profileData.subscription) profileData.subscription = {};
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

async function fxnGetCachedProfile(options = {}) {
    const { ignoreTTL = false } = options;
    try {
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
        if (!storage) return null;
        const res = await storage.get(['foxenUserProfileCache', 'foxen_user_profile']);
        const cacheEntry = res?.foxenUserProfileCache;
        if (cacheEntry && cacheEntry.data) {
            const isExpired = !ignoreTTL && cacheEntry.ts && (Date.now() - cacheEntry.ts > FXN_CACHE_TTL_MS);
            if (!isExpired) return cacheEntry.data;
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

// Global exports for all Foxen modules
if (typeof window !== 'undefined') {
    window.FOXEN_API_BASE = (window.FOXEN_API_BASE || 'https://api.foxen.site');
    window.isFoxenAdmin = isFoxenAdmin;
    window.isFoxenPremiumUser = isFoxenPremiumUser;
    window.fxnGetCachedProfile = fxnGetCachedProfile;
    window.fxnSaveCachedProfile = fxnSaveCachedProfile;
    window.fxnFetchProfileByFpUser = fxnFetchProfileByFpUser;
    window.fxnActivateKeyInFirebase = fxnActivateKeyInFirebase;
    window.fxnActivateKeyInSupabase = fxnActivateKeyInFirebase;
}
