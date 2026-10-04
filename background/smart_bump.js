// background/smart_bump.js - Foxen 2.8
import { getAuthDetailsForBackground, fetchWithTabFallback } from './auth_helper.js';

export const SMART_BUMP_ALARM = 'foxenSmartBump';
const STATE_KEY = 'foxenSmartBumpState'; // { [categoryUrl]: { nextRaiseAt, name } }
const OFFSCREEN_PATH = 'offscreen/offscreen.html';

// Ported 1:1 from Foxen utils.parse_wait_time - returns seconds to wait.
function parseWaitTime(msg) {
    const s = String(msg || '');
    const digits = (s.match(/\d/g) || []).join('');
    const n = digits ? parseInt(digits, 10) : 0;
    if (/секунд|second/i.test(s)) return n || 2;
    if (/минут|хвилин|minute/i.test(s)) return ((n || 2) - 1) * 60;
    if (/час|годин|hour/i.test(s)) return Math.round(((n || 1) - 0.5) * 3600);
    return 10;
}

async function parseHtmlViaOffscreen(html, action, extra = {}) {
    return Promise.resolve().then(() => {
        if (action === 'parseSellerLotPrice') return window[action](html, extra.offerId);
        else if (action === 'solveCloneForm') return window[action](html, extra.attributes, extra.attributePairs);
        else if (action === 'parseBuyerHistory') return window[action](html, extra.buyerUserId);
        else if (typeof window[action] === 'function') return window[action](html);
        else throw new Error('Unknown parser action: ' + action);
    });
}

async function getAuth() {
    const auth = await getAuthDetailsForBackground();
    if (!auth || (!auth.userId && !auth.golden_key)) return null;
    const cookies = (auth.golden_key && auth.golden_key !== 'active_session')
        ? (auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`)
        : '';
    const csrfToken = auth.csrf_token || auth.csrfToken;
    const userId = auth.userId;
    if (!csrfToken || !userId) return null;
    return { cookies, csrfToken, userId, golden_key: auth.golden_key, phpsessid: auth.phpsessid };
}

// Raise one category. Returns { ok, waitSec, name } - waitSec is when to try again.
async function raiseCategory(categoryUrl, auth) {
    const headers = {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': auth.csrfToken
    };
    if (auth.cookies) headers['cookie'] = auth.cookies;

    // Load category page to discover game_id / node_id and name.
    const pageRes = await fetchWithTabFallback(categoryUrl, { credentials: 'include', headers });
    if (!pageRes.ok) return { ok: false, waitSec: 600, name: categoryUrl };
    const pageHtml = await pageRes.text();
    const nameMatch = pageHtml.match(/<span class="inside">([^<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : categoryUrl;
    const btn = pageHtml.match(/<button[^>]+class="[^"]*js-lot-raise[^"]*"[^>]*data-game="(\d+)"[^>]*data-node="([^"]+)"/);
    if (!btn) return { ok: false, waitSec: 600, name };

    const gameId = btn[1], nodeId = btn[2];

    // First attempt (single node).
    let body = new URLSearchParams({ game_id: gameId, node_id: nodeId });
    let res = await fetchWithTabFallback('https://funpay.com/lots/raise', { method: 'POST', headers, body: body.toString(), credentials: 'include' });
    let json = await res.json().catch(() => ({}));

    // FunPay may ask to confirm multiple subcategories via a modal.
    if (json.modal) {
        const ids = Array.from(json.modal.matchAll(/<input[^>]*value="(\d+)"/g), m => m[1]);
        if (ids.length) {
            body = new URLSearchParams();
            body.append('game_id', gameId);
            body.append('node_id', nodeId);
            ids.forEach(id => body.append('node_ids[]', id));
            res = await fetchWithTabFallback('https://funpay.com/lots/raise', { method: 'POST', headers, body: body.toString(), credentials: 'include' });
            json = await res.json().catch(() => ({}));
        }
    }

    // Foxen logic: success when no error and no url; url => 2h; "wait" msg => parse it.
    if (!json.error && !json.url) {
        return { ok: true, waitSec: 4 * 3600, name }; // default FunPay cooldown ~4h
    }
    if (json.url) {
        return { ok: false, waitSec: 7200, name };
    }
    if (json.msg && /(Подожди|Please wait|Зачекай)/i.test(json.msg)) {
        return { ok: false, waitSec: parseWaitTime(json.msg), name };
    }
    return { ok: false, waitSec: 600, name };
}

async function getState() {
    const { [STATE_KEY]: st = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(STATE_KEY);
    return st;
}
async function setState(st) {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [STATE_KEY]: st });
}

function logToTabs(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.log('[Foxen SmartBump]', line);
    const extApi = typeof browser !== 'undefined' ? browser : chrome;
    try {
        extApi.tabs.query({ url: 'https://funpay.com/*' }, (tabs) => {
            if (extApi.runtime?.lastError || !tabs || !Array.isArray(tabs)) return;
            tabs.forEach(t => {
                try {
                    const p = extApi.tabs.sendMessage(t.id, { action: 'logToAutoBumpConsole', message: line });
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch (_) {}
            });
        });
    } catch (_) {}
}

// Run one smart-bump pass. Raises only due categories, updates per-category nextRaiseAt,
// and arms the alarm for the soonest upcoming due time.
let _isSmartBumpCycleRunning = false;

export async function runSmartBumpCycle() {
    if (_isSmartBumpCycleRunning) return;
    _isSmartBumpCycleRunning = true;

    try {
        // FALLBACK: Arm a fallback alarm so if the service worker dies during the loop, it still recovers.
    await (typeof browser !== 'undefined' ? browser : chrome).alarms.create(SMART_BUMP_ALARM + '_fallback', { delayInMinutes: 10 });

    const { foxenSelectiveBumpEnabled, foxenSelectedBumpCategories, foxenBumpOnlyAutoDelivery } =
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenSelectiveBumpEnabled', 'foxenSelectedBumpCategories', 'foxenBumpOnlyAutoDelivery']);

    const auth = await getAuth();
    if (!auth) { logToTabs('Умное поднятие: нет авторизации (golden_key/csrf).'); return; }

    const userUrl = `https://funpay.com/users/${auth.userId}/`;
    const userHtml = await (await fetchWithTabFallback(userUrl, { credentials: 'include', headers: auth.cookies ? { cookie: auth.cookies } : {} })).text();
    let categories = await parseHtmlViaOffscreen(userHtml, 'parseUserCategories');
    if (!Array.isArray(categories)) categories = [];

    if (foxenBumpOnlyAutoDelivery) categories = categories.filter(c => c.hasAutoDelivery);
    if (foxenSelectiveBumpEnabled && foxenSelectedBumpCategories?.length) {
        categories = categories.filter(c => foxenSelectedBumpCategories.includes(c.id));
    } else if (foxenSelectiveBumpEnabled) {
        logToTabs('Умное поднятие: выборочный режим включён, но категории не выбраны.');
        return;
    }

    const state = await getState();
    const now = Date.now();
    let soonest = Infinity;
    let anyRaised = false;

    for (const cat of categories) {
        const url = new URL(cat.id, 'https://funpay.com/').href;
        const entry = state[url];
        if (entry && entry.nextRaiseAt > now) {
            soonest = Math.min(soonest, entry.nextRaiseAt);
            continue; // not due yet
        }

        try {
            const { ok, waitSec, name } = await raiseCategory(url, auth);
            const nextRaiseAt = now + Math.max(waitSec, 30) * 1000;
            state[url] = { nextRaiseAt, name };
            soonest = Math.min(soonest, nextRaiseAt);
            if (ok) anyRaised = true;
            logToTabs(ok ? `Поднято: ${name}. Следующее через ~${Math.round(waitSec / 60)} мин.`
                         : `Не поднято: ${name}. Повтор через ~${Math.round(waitSec / 60)} мин.`);
        } catch (e) {
            state[url] = { nextRaiseAt: now + 600000, name: url };
            soonest = Math.min(soonest, state[url].nextRaiseAt);
            logToTabs(`Ошибка поднятия ${url}: ${e.message}. Повтор через 10 мин.`);
        }
        await new Promise(r => setTimeout(r, 3000)); // pacing between categories
    }

    await setState(state);
    
    if (anyRaised) {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenLastSmartBumpTime: Date.now() });
    }

    // Arm the alarm to fire when the soonest category becomes due (min 1 min - MV3 floor).
    if (soonest !== Infinity) {
        const delayMin = Math.max(1, Math.ceil((soonest - Date.now()) / 60000));
        await (typeof browser !== 'undefined' ? browser : chrome).alarms.create(SMART_BUMP_ALARM, { delayInMinutes: delayMin });
        logToTabs(`Умное поднятие: следующая проверка через ~${delayMin} мин.`);
    } else {
        await (typeof browser !== 'undefined' ? browser : chrome).alarms.create(SMART_BUMP_ALARM, { delayInMinutes: 5 });
    }
    
    // Clear the fallback since we succeeded
    await (typeof browser !== 'undefined' ? browser : chrome).alarms.clear(SMART_BUMP_ALARM + '_fallback');
    } finally {
        _isSmartBumpCycleRunning = false;
    }
}

export async function startSmartBump() {
    const extApi = typeof browser !== 'undefined' ? browser : chrome;
    await extApi.storage.local.set({ foxenSmartBumpRunning: true });
    await extApi.alarms.create(SMART_BUMP_ALARM, { delayInMinutes: 0.1 });
    await runSmartBumpCycle();
}

export async function stopSmartBump() {
    const extApi = typeof browser !== 'undefined' ? browser : chrome;
    await extApi.storage.local.set({ foxenSmartBumpRunning: false });
    await extApi.alarms.clear(SMART_BUMP_ALARM);
    await extApi.storage.local.remove(STATE_KEY);
}

// Прослушивание пингов со страницы для стабильного интервала (как в AutoRaise.js)
(typeof browser !== 'undefined' ? browser : chrome).runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fxnAutobumpPing') {
        handleSmartBumpPing();
    }
});

async function handleSmartBumpPing() {
    const extApi = typeof browser !== 'undefined' ? browser : chrome;
    const { foxenSmartBumpRunning } = await extApi.storage.local.get('foxenSmartBumpRunning');
    if (!foxenSmartBumpRunning) return;
    
    const state = await getState();
    const now = Date.now();
    let soonest = Infinity;
    for (const url in state) {
        soonest = Math.min(soonest, state[url].nextRaiseAt || 0);
    }
    
    if (now >= soonest && !_isSmartBumpCycleRunning) {
        runSmartBumpCycle();
    }
}
