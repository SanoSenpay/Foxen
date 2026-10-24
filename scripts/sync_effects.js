/**
 * Foxen Effects Sync Script
 * Fetches premium users and nickname effects from Supabase and updates effects.json
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yoacfrbedwksnfksjjmv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';

const OUTPUT_FILE = path.resolve(__dirname, '../effects.json');

function cleanUser(name) {
    if (!name || typeof name !== 'string') return '';
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
}

async function run() {
    console.log('[Foxen Sync] Querying Supabase for active effects & premium users...');
    
    const queryUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,fp_user,fp_user_id,foxen_id,is_premium,custom_emoji,nickname_effect&or=(is_premium.eq.true,nickname_effect.not.is.null,custom_emoji.not.is.null)`;
    
    const res = await fetch(queryUrl, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to query Supabase: ${res.status} ${res.statusText}`);
    }

    const profiles = await res.json();
    console.log(`[Foxen Sync] Found ${profiles.length} candidate profiles in Supabase.`);

    const registry = {};

    for (const p of profiles) {
        const isPrem = !!p.is_premium;
        const effect = (isPrem && p.nickname_effect && p.nickname_effect.id) ? p.nickname_effect : null;
        const emoji = p.custom_emoji || null;

        // Skip if user has neither effect nor emoji
        if (!effect && !emoji) continue;

        const record = {
            foxen_id: p.foxen_id || '',
            is_premium: isPrem,
            emoji: emoji,
            effect: effect ? {
                id: effect.id,
                colors: effect.colors || null,
                updated_at: effect.updated_at || undefined
            } : null
        };

        const usernames = new Set();
        if (p.fp_user) usernames.add(p.fp_user);
        if (effect && effect.username) usernames.add(effect.username);

        const userIds = new Set();
        if (p.fp_user_id) userIds.add(String(p.fp_user_id));
        if (effect && effect.fp_user_id) userIds.add(String(effect.fp_user_id));

        // Index by username (both raw lower and cleaned)
        for (const u of usernames) {
            const raw = u.toLowerCase().trim();
            const cln = cleanUser(u);
            if (raw) registry[raw] = { ...record, username: u };
            if (cln && cln !== raw) registry[cln] = { ...record, username: u };
        }

        // Index by FunPay user ID
        for (const uid of userIds) {
            if (uid) registry[uid] = { ...record, fp_user_id: Number(uid) || uid };
        }
    }

    const outputData = {
        updated_at: new Date().toISOString(),
        version: 1,
        total_active: Object.keys(registry).length,
        registry: registry
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`[Foxen Sync] Successfully saved ${outputData.total_active} registry keys to ${OUTPUT_FILE}`);
}

run().catch(err => {
    console.error('[Foxen Sync] Error:', err);
    process.exit(1);
});
