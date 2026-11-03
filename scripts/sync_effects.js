/**
 * Foxen Public Profiles & Nickname Effects Sync Script
 * Exports public metadata (banners, nickname effects, emojis, descriptions, verification badges)
 * from Firebase Firestore into GitHub data files (effects.json & public_profiles.json).
 *
 * All private data (emails, passwords, golden keys, tokens, session IDs) is strictly excluded.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUTPUT_EFFECTS = path.resolve(__dirname, '../effects.json');
const OUTPUT_PROFILES = path.resolve(__dirname, '../public_profiles.json');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../FoxenBot/serviceAccount.json');
const FIRESTORE_PROJECT_ID = 'foxen-dt';
const FIRESTORE_API_KEY = 'AIzaSyDtFlmOByNAOEXyIxyT6QjBGPuvWPd5BVk';

const ADMIN_FOXEN_IDS = new Set(['FX-000000', 'FX-000001']);
const ADMIN_FP_USER_IDS = new Set(['13781813', '15508026']);
const ADMIN_FP_USERNAMES = new Set(['sanosenpai', 'vireonshop']);

function cleanUser(name) {
    if (!name || typeof name !== 'string') return '';
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
}

function base64UrlEncode(str) {
    return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGoogleToken(sa) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const claimsB64 = base64UrlEncode(JSON.stringify(claims));
    const signInput = `${headerB64}.${claimsB64}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(sa.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const jwt = `${signInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(jwt)}`
    });

    if (!res.ok) throw new Error(`OAuth token error: ${await res.text()}`);
    const data = await res.json();
    return data.access_token;
}

function fromFirestoreValue(val) {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return val.doubleValue;
    if ('timestampValue' in val) return val.timestampValue;
    if ('nullValue' in val) return null;
    if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
    if ('mapValue' in val) {
        const obj = {};
        for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
            obj[k] = fromFirestoreValue(v);
        }
        return obj;
    }
    return null;
}

function fromFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const docId = doc.name ? doc.name.split('/').pop() : null;
    const res = { _id: docId };
    for (const [k, v] of Object.entries(doc.fields)) {
        res[k] = fromFirestoreValue(v);
    }
    return res;
}

/**
 * Fetch all documents from Firestore with pagination.
 * Attempts service account authentication first; if absent, falls back to direct REST using the API key.
 */
async function fetchAllProfiles() {
    let token = null;
    try {
        let sa = null;
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
        }
        if (sa) {
            token = await getGoogleToken(sa);
            console.log('[Foxen Sync] Authenticated via Firebase Service Account.');
        }
    } catch (err) {
        console.warn('[Foxen Sync] Service account authentication skipped:', err.message);
    }

    if (!token) {
        console.log('[Foxen Sync] Using Firestore Web API Key for public data sync.');
    }

    const allDocs = [];
    let pageToken = '';

    do {
        let url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/profiles?pageSize=100`;
        if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
        if (!token) url += `&key=${FIRESTORE_API_KEY}`;

        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`Firestore list error: HTTP ${res.status} - ${await res.text()}`);
        }

        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
            for (const doc of data.documents) {
                const parsed = fromFirestoreDoc(doc);
                if (parsed) allDocs.push(parsed);
            }
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);

    return allDocs;
}

async function run() {
    console.log('[Foxen Sync] Starting public profiles & effects sync...');
    const rawProfiles = await fetchAllProfiles();
    console.log(`[Foxen Sync] Retrieved ${rawProfiles.length} raw profile documents from Firestore.`);

    const effectsRegistry = {};
    const publicProfilesArray = [];
    const byFpId = {};
    const byUsername = {};
    const byFoxenId = {};

    for (const p of rawProfiles) {
        const fpUidStr = p.fp_user_id ? String(p.fp_user_id).trim() : '';
        const fpUserStr = p.fp_user ? String(p.fp_user).trim() : '';
        const cleanUserStr = cleanUser(fpUserStr);
        const foxenIdStr = p.foxen_id ? String(p.foxen_id).trim() : '';

        const isAdmin = Boolean(
            (foxenIdStr && ADMIN_FOXEN_IDS.has(foxenIdStr.toUpperCase())) ||
            (fpUidStr && ADMIN_FP_USER_IDS.has(fpUidStr)) ||
            (cleanUserStr && ADMIN_FP_USERNAMES.has(cleanUserStr))
        );

        const isPrem = Boolean(p.is_premium || isAdmin);

        // Normalize nickname effect
        let effect = null;
        if (p.nickname_effect) {
            if (typeof p.nickname_effect === 'string') {
                try { effect = JSON.parse(p.nickname_effect); } catch (_) { effect = null; }
            } else if (typeof p.nickname_effect === 'object') {
                effect = p.nickname_effect;
            }
        }
        if (effect && !effect.id) effect = null;

        const emoji = p.custom_emoji && typeof p.custom_emoji === 'string' && p.custom_emoji.trim() ? p.custom_emoji.trim() : null;

        // Banner and description fields
        const bannerId = p.banner_id || p.bannerId || null;
        let bannerUrl = p.banner_url || null;
        if (!bannerUrl && bannerId) {
            if (typeof bannerId === 'string' && (bannerId.startsWith('http://') || bannerId.startsWith('https://'))) {
                bannerUrl = bannerId;
            } else if (typeof bannerId === 'string' && /^FXNB-\d+$/i.test(bannerId.trim())) {
                bannerUrl = `https://cdn.foxen.site/download/Catalog/Banners/${bannerId.trim().toUpperCase()}.png`;
            } else if (/\.(gif|png|jpg|jpeg|webp)$/i.test(bannerId)) {
                bannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}`;
            } else if (["banner1", "banner2", "banner3", "foxen_blackhole", "foxen_blackhole2"].includes(bannerId) || String(bannerId).includes("anim") || String(bannerId).includes("gif")) {
                bannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}.gif`;
            } else {
                bannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}.jpg`;
            }
        }

        const description = (p.description != null && typeof p.description === 'string' && p.description.trim()) ? p.description.trim() : null;

        // Build strictly public record - ZERO private fields
        const publicRecord = {
            foxen_id: foxenIdStr || null,
            fp_user_id: fpUidStr ? (Number(fpUidStr) || fpUidStr) : null,
            fp_user: fpUserStr || null,
            avatar_url: p.avatar_url || null,
            banner_id: bannerId,
            banner_url: bannerUrl,
            banner_position: p.banner_position || null,
            banner_repeat: p.banner_repeat || null,
            description: description,
            nickname_effect: (isPrem && effect) ? {
                id: effect.id,
                colors: effect.colors || null,
                updated_at: effect.updated_at || undefined
            } : null,
            custom_emoji: emoji,
            is_premium: isPrem,
            is_admin: isAdmin,
            is_fp_verified: Boolean(p.is_fp_verified || isAdmin || fpUserStr),
            created_at: p.created_at || null,
            updated_at: p.updated_at || null
        };

        publicProfilesArray.push(publicRecord);

        // Map into indices
        if (fpUidStr) {
            byFpId[fpUidStr] = publicRecord;
        }
        if (cleanUserStr) {
            byUsername[cleanUserStr] = publicRecord;
            if (fpUserStr.toLowerCase() !== cleanUserStr) {
                byUsername[fpUserStr.toLowerCase()] = publicRecord;
            }
        }
        if (foxenIdStr) {
            byFoxenId[foxenIdStr.toUpperCase()] = publicRecord;
            if (foxenIdStr.toUpperCase() === 'FX-000000') {
                if (!publicRecord.fp_user_id) publicRecord.fp_user_id = 13781813;
                byFpId['13781813'] = publicRecord;
                byUsername['sanosenpai'] = publicRecord;
            } else if (foxenIdStr.toUpperCase() === 'FX-000001') {
                if (!publicRecord.fp_user_id) publicRecord.fp_user_id = 15508026;
                byFpId['15508026'] = publicRecord;
                byUsername['vireonshop'] = publicRecord;
            }
        }

        // Backward-compatible effects.json registry entry
        if ((isPrem && effect) || emoji) {
            const effEntry = {
                foxen_id: foxenIdStr || '',
                is_premium: isPrem,
                emoji: emoji,
                effect: (isPrem && effect) ? {
                    id: effect.id,
                    colors: effect.colors || null,
                    updated_at: effect.updated_at || undefined
                } : null
            };

            const usernames = new Set();
            if (fpUserStr) usernames.add(fpUserStr);
            if (effect && effect.username) usernames.add(effect.username);

            const userIds = new Set();
            if (fpUidStr) userIds.add(fpUidStr);
            if (effect && effect.fp_user_id) userIds.add(String(effect.fp_user_id));

            for (const u of usernames) {
                const raw = u.toLowerCase().trim();
                const cln = cleanUser(u);
                if (raw) effectsRegistry[raw] = { ...effEntry, username: u };
                if (cln && cln !== raw) effectsRegistry[cln] = { ...effEntry, username: u };
            }

            for (const uid of userIds) {
                if (uid) effectsRegistry[uid] = { ...effEntry, fp_user_id: Number(uid) || uid };
            }
        }
    }

    const timestamp = new Date().toISOString();

    // 1. Write effects.json
    const effectsPayload = {
        _updated: timestamp,
        _count: Object.keys(effectsRegistry).length,
        version: 1,
        registry: effectsRegistry,
        users: effectsRegistry
    };
    fs.writeFileSync(OUTPUT_EFFECTS, JSON.stringify(effectsPayload, null, 2), 'utf-8');
    console.log(`[Foxen Sync] Successfully saved ${effectsPayload._count} entries to effects.json`);

    // 2. Write public_profiles.json
    const publicProfilesPayload = {
        _updated: timestamp,
        _count: publicProfilesArray.length,
        profiles: publicProfilesArray,
        by_fp_id: byFpId,
        by_username: byUsername,
        by_foxen_id: byFoxenId
    };
    fs.writeFileSync(OUTPUT_PROFILES, JSON.stringify(publicProfilesPayload, null, 2), 'utf-8');
    console.log(`[Foxen Sync] Successfully saved ${publicProfilesArray.length} profiles to public_profiles.json`);
}

run().catch(err => {
    console.error('[Foxen Sync] Fatal Error:', err);
    process.exit(1);
});
