// background/background.js - Foxen 2.8

import './sales_db.js'; // Foxen: IndexedDB-хранилище заказов (self.FPTSalesDB)
import './purchases_db.js'; // Foxen: IndexedDB-хранилище покупок (self.FPTPurchasesDB)
import './finance_db.js'; // Foxen: IndexedDB-хранилище финансов (self.FPTFinanceDB)
import { fetchAIResponse, fetchAILotGeneration, fetchAITranslation, fetchAIImageGeneration, testAIProviderKey } from './ai.js';
import { BUMP_ALARM_NAME, startAutoBump, stopAutoBump, runBumpCycle } from './autobump.js';
import { runAutoResponderCycle, resetAutoResponderState } from './autoresponder.js';
import { startEngine, stopEngine, onHeartbeat, onKeepalivePing, ENGINE_HEARTBEAT_ALARM } from './fpt_engine.js';
import { startSmartBump, stopSmartBump, runSmartBumpCycle, SMART_BUMP_ALARM } from './smart_bump.js';
import {
    TELEGRAM_ALARM, telegramInit, telegramSyncAlarm, telegramPollOnce, startTelegramPollingLoop,
    telegramValidateAndResolve, telegramNotifyNewMessages, telegramNotifyNewOrders, tgSendMessage
} from './telegram.js';

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2.8.1 - НАДЁЖНАЯ ОТПРАВКА КУКОВ.
// Браузер ИГНОРИРУЕТ заголовок Cookie, выставленный вручную в fetch() (forbidden
// header). Раньше многие запросы к funpay.com слали только ручной cookie и
// работали лишь у пользователей, чьи куки случайно подхватывались браузером -
// отсюда «у меня картинки/автоответы работают, а у людей нет».
// Оборачиваем глобальный fetch так, чтобы для ВСЕХ запросов к funpay.com по
// умолчанию подставлялись реальные куки активной сессии (credentials:'include').
// Прочие домены (api.telegram.org, *.workers.dev, CDN и т.д.) не затрагиваются.
// Совместимо с подменой golden_key в fxnSnapshotForKey (она и так грузит главную
// с credentials:'include' из cookie-jar).
(function () {
    const _origFetch = self.fetch.bind(self);
    self.fetch = function (input, init) {
        try {
            const url = (typeof input === 'string') ? input
                      : (input && input.url) ? input.url : '';
            if (/^https:\/\/(?:[a-z0-9-]+\.)?funpay\.com\//i.test(url)) {
                init = init ? { ...init } : {};
                if (!init.credentials) init.credentials = 'include';
            }
        } catch (_) {}
        return _origFetch(input, init);
    };
})();

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';
const DISCORD_LOG_ALARM_NAME = 'foxenDiscordCheck';
const AUTO_RESPONDER_ALARM_NAME = 'foxenAutoResponder';
let lastDiscordChatTag = null;
const IMPORT_PROCESS_KEY = 'foxenLotImportProcess';
const RETRY_LIMIT = 5;
const RETRY_DELAY = 5000; // 5 секунд

// Универсальные обёртки над chrome.storage.local
// В Firefox и Chrome MV2 методы storage.local.get/set/remove могут не возвращать Promise без callback.
// Эти функции гарантированно возвращают валидный Promise через callback-API.
function fxnStorageGet(keys) {
    return new Promise((resolve) => {
        try {
            const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
            api.storage.local.get(keys, (res) => {
                if (chrome.runtime && chrome.runtime.lastError) {}
                resolve(res || {});
            });
        } catch (e) {
            resolve({});
        }
    });
}

function fxnStorageSet(items) {
    return new Promise((resolve) => {
        try {
            const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
            api.storage.local.set(items, () => {
                if (chrome.runtime && chrome.runtime.lastError) {}
                resolve();
            });
        } catch (e) {
            resolve();
        }
    });
}

function fxnStorageRemove(keys) {
    return new Promise((resolve) => {
        try {
            const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
            api.storage.local.remove(keys, () => {
                if (chrome.runtime && chrome.runtime.lastError) {}
                resolve();
            });
        } catch (e) {
            resolve();
        }
    });
}

function storageRemove(keys) { return fxnStorageRemove(keys); }
function storageGet(keys) { return fxnStorageGet(keys); }
function storageSet(items) { return fxnStorageSet(items); }

// ─────────────────────────────────────────────────────────────────────────────
// Универсальные обёртки над chrome.cookies / browser.cookies.
// В MV2 Chrome метод cookies.get/set/remove не возвращает Promise, если передан без callback.
// В Firefox browser.cookies возвращает Promise, но chrome.cookies может требовать callback.
// Эти функции гарантированно работают везде.
function fxnGetCookie(url, name, storeId = null) {
    return new Promise((resolve) => {
        try {
            const details = { url, name };
            if (storeId) details.storeId = storeId;
            if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.get) {
                const p = browser.cookies.get(details);
                if (p && typeof p.then === 'function') {
                    return p.then(resolve).catch(() => resolve(null));
                }
            }
            if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.get) {
                chrome.cookies.get(details, (c) => resolve(c || null));
                return;
            }
            resolve(null);
        } catch (_) {
            resolve(null);
        }
    });
}

function fxnGetAllCookies(details) {
    return new Promise((resolve) => {
        try {
            if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.getAll) {
                const p = browser.cookies.getAll(details);
                if (p && typeof p.then === 'function') {
                    return p.then(resolve).catch(() => resolve([]));
                }
            }
            if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.getAll) {
                chrome.cookies.getAll(details, (list) => resolve(list || []));
                return;
            }
            resolve([]);
        } catch (_) {
            resolve([]);
        }
    });
}

function fxnSetCookie(details) {
    return new Promise((resolve) => {
        try {
            if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.set) {
                const p = browser.cookies.set(details);
                if (p && typeof p.then === 'function') {
                    return p.then(resolve).catch(() => resolve(null));
                }
            }
            if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.set) {
                chrome.cookies.set(details, (c) => resolve(c || null));
                return;
            }
            resolve(null);
        } catch (_) {
            resolve(null);
        }
    });
}

function fxnRemoveCookie(details) {
    return new Promise((resolve) => {
        try {
            if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.remove) {
                const p = browser.cookies.remove(details);
                if (p && typeof p.then === 'function') {
                    return p.then(resolve).catch(() => resolve(null));
                }
            }
            if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.remove) {
                chrome.cookies.remove(details, (res) => resolve(res || null));
                return;
            }
            resolve(null);
        } catch (_) {
            resolve(null);
        }
    });
}

async function fxnFindGoldenKey(preferredStoreId = null) {
    // 1) Если указан конкретный storeId (например, контейнер вкладки Firefox)
    if (preferredStoreId) {
        let c = await fxnGetCookie('https://funpay.com/', 'golden_key', preferredStoreId);
        if (c?.value) return c;
        let all = await fxnGetAllCookies({ name: 'golden_key', storeId: preferredStoreId });
        let found = (all || []).find(item => item.value);
        if (found) return found;
    }
    // 2) Прямые проверки по популярным адресам FunPay
    for (const u of ['https://funpay.com/', 'https://funpay.com', 'https://www.funpay.com/', 'https://sfunpay.com/']) {
        let c = await fxnGetCookie(u, 'golden_key');
        if (c?.value) return c;
    }
    // 3) Поиск по известным доменам
    for (const d of ['funpay.com', '.funpay.com', 'sfunpay.com']) {
        const all = await fxnGetAllCookies({ domain: d });
        const found = (all || []).find(item => item.name === 'golden_key' && item.value);
        if (found) return found;
    }
    // 4) Поиск просто по имени golden_key (без фильтра по домену)
    const byName = await fxnGetAllCookies({ name: 'golden_key' });
    const foundByName = (byName || []).find(item => item.value);
    if (foundByName) return foundByName;

    // 5) В Firefox: перебираем ВСЕ хранилища кук (контейнеры)
    if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.getAllCookieStores) {
        try {
            const stores = await browser.cookies.getAllCookieStores();
            for (const store of stores) {
                const list = await fxnGetAllCookies({ name: 'golden_key', storeId: store.id });
                const f = (list || []).find(item => item.value);
                if (f) return f;
            }
        } catch (_) {}
    }
    return null;
}

async function fxnFindPhpSessId(preferredStoreId = null) {
    if (preferredStoreId) {
        let c = await fxnGetCookie('https://funpay.com/', 'PHPSESSID', preferredStoreId);
        if (c?.value) return c;
        let all = await fxnGetAllCookies({ name: 'PHPSESSID', storeId: preferredStoreId });
        let found = (all || []).find(item => item.value);
        if (found) return found;
    }
    for (const u of ['https://funpay.com/', 'https://funpay.com', 'https://www.funpay.com/', 'https://sfunpay.com/']) {
        let c = await fxnGetCookie(u, 'PHPSESSID');
        if (c?.value) return c;
    }
    for (const d of ['funpay.com', '.funpay.com', 'sfunpay.com']) {
        const all = await fxnGetAllCookies({ domain: d });
        const found = (all || []).find(item => item.name === 'PHPSESSID' && item.value);
        if (found) return found;
    }
    const byName = await fxnGetAllCookies({ name: 'PHPSESSID' });
    const foundByName = (byName || []).find(item => item.value);
    if (foundByName) return foundByName;

    if (typeof browser !== 'undefined' && browser.cookies && browser.cookies.getAllCookieStores) {
        try {
            const stores = await browser.cookies.getAllCookieStores();
            for (const store of stores) {
                const list = await fxnGetAllCookies({ name: 'PHPSESSID', storeId: store.id });
                const f = (list || []).find(item => item.value);
                if (f) return f;
            }
        } catch (_) {}
    }
    return null;
}



// Защита от ПАРАЛЛЕЛЬНЫХ циклов сбора. Если открыть пару вкладок /orders/ или
// перезагрузить страницу, каждый запуск дёргал свой цикл — два цикла разом удваивают
// нагрузку. Эти флаги не дают запуститься второму циклу.
let _salesCycleRunning = false;
let _purchasesCycleRunning = false;
let _financeCycleRunning = false;

// fetch с мягким ретраем на серверные ошибки FunPay (502/503/504/429). Когда у FunPay
// «лежит» бэкенд (а это бывает — в чате жалуются, что сайт падает), один и тот же
// запрос через секунду часто проходит. Это НЕ замедляет обычную работу: ретрай
// включается только при ошибке сервера.
async function fxnFetchResilient(url, options, { retries = 3, baseDelay = 700 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429 || res.status >= 500) {
                lastErr = new Error(`HTTP ${res.status}`);
            } else {
                return res;
            }
        } catch (e) {
            lastErr = e; // network error / Failed to fetch
        }
        if (attempt < retries) {
            await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 300));
        }
    }
    throw lastErr || new Error('fxnFetchResilient: исчерпаны попытки');
}

// Выполнение запроса через открытую вкладку FunPay.
// Это ГАРАНТИРУЕТ, что запрос отправляется из контекста https://funpay.com, с сессионными куками
// активного аккаунта и с правильным Origin/Referer (полностью исключает 401 Authorization Required).
async function fetchWithTabFallback(url, options = {}) {
    const tabs = await new Promise(resolve => {
        try {
            if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.query) {
                const p = browser.tabs.query({ url: "*://*.funpay.com/*" });
                if (p && typeof p.then === 'function') return p.then(resolve).catch(() => resolve([]));
            }
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                chrome.tabs.query({ url: "*://*.funpay.com/*" }, (t) => resolve(t || []));
                return;
            }
            resolve([]);
        } catch (_) { resolve([]); }
    });

    const activeTab = (tabs || []).find(t => t.active) || (tabs || []).find(t => !t.discarded) || (tabs && tabs[0]);
    if (activeTab && activeTab.id) {
        try {
            const bodyStr = options.body instanceof URLSearchParams ? options.body.toString() : options.body;
            const resp = await new Promise((res) => {
                const timeout = setTimeout(() => res(null), 15000);
                const msg = {
                    action: 'foxenProxyFetch',
                    url,
                    options: {
                        method: options.method || 'GET',
                        headers: options.headers || {},
                        body: bodyStr
                    }
                };
                try {
                    if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.sendMessage) {
                        const p = browser.tabs.sendMessage(activeTab.id, msg);
                        if (p && typeof p.then === 'function') {
                            return p.then(r => { clearTimeout(timeout); res(r); }).catch(() => { clearTimeout(timeout); res(null); });
                        }
                    }
                    chrome.tabs.sendMessage(activeTab.id, msg, (r) => {
                        clearTimeout(timeout);
                        res(r || null);
                    });
                } catch (_) {
                    clearTimeout(timeout);
                    res(null);
                }
            });

            if (resp && resp.success) {
                return {
                    status: resp.status,
                    ok: resp.ok,
                    text: async () => resp.text,
                    json: async () => JSON.parse(resp.text)
                };
            }
        } catch (e) {
            console.warn('[Foxen] fetchWithTabFallback failed via tab, using direct fetch:', e.message);
        }
    }

    return await fxnFetchResilient(url, options);
}

// --- СБОР СТАТИСТИКИ ПРОДАЖ (IndexedDB) ---
// Данные хранятся в IndexedDB (self.FPTSalesDB), а не в chrome.storage.local,
// поэтому квота ~10 МБ больше не упирается на ~18800 заказах. Между страницами —
// небольшая вежливая пауза, чтобы FunPay не банил IP за флуд.
async function runSalesUpdateCycle() {
    if (_salesCycleRunning) { console.log("Foxen: цикл продаж уже идёт — пропуск повторного запуска."); return; }
    _salesCycleRunning = true;
    console.log("Foxen: Запуск полного цикла сбора статистики продаж...");
    try {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenSalesCollecting: true, foxenSalesError: null });
        // Однократно переносим старые данные из storage.local в IndexedDB
        // (и освобождаем квоту). Безопасно вызывать каждый раз — отработает один раз.
        await FPTSalesDB.migrateFromLocalStorage();

        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key) throw new Error("Не удалось получить golden_key для сбора статистики.");

        let firstOrderId = await FPTSalesDB.getMeta('firstOrderId');
        let lastOrderId = await FPTSalesDB.getMeta('lastOrderId');

        const fetchAndParseSales = async (continueToken = null) => {
            const url = 'https://funpay.com/orders/trade';
            const body = continueToken ? new URLSearchParams({ 'continue': continueToken }) : null;
            const options = {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'X-Csrf-Token': auth.csrf_token, 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` },
                body: body
            };
            // 429/5xx-aware retry: если FunPay всё-таки притормозит — откатываемся и
            // пробуем снова, но НЕ держим паузу на каждой успешной странице.
            let response;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    response = await fetch(url, options);
                } catch (netErr) {
                    response = await fetchWithTabFallback(url, options);
                    if (!response) throw netErr;
                }
                if (response && (response.status === 401 || response.status === 403)) {
                    const fallbackResp = await fetchWithTabFallback(url, options);
                    if (fallbackResp && (fallbackResp.ok || fallbackResp.status < 400)) {
                        response = fallbackResp;
                        break;
                    }
                }
                if (response && (response.status === 429 || response.status >= 500)) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1) + Math.random() * 500));
                    continue;
                }
                break;
            }
            if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
            const html = await response.text();
            return await parseHtmlViaOffscreen(html, 'parseSalesPage');
        };

        const commitMeta = async (firstId, lastId) => {
            if (firstId !== undefined) await FPTSalesDB.setMeta('firstOrderId', firstId);
            if (lastId !== undefined) await FPTSalesDB.setMeta('lastOrderId', lastId);
            const now = Date.now();
            await FPTSalesDB.setMeta('lastUpdate', now);
            // Маленькое зеркало для UI, который читает дату из storage.local — это байты, не мегабайты.
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenSalesLastUpdate: now });
        };

        // --- Догрузка НОВЫХ заказов сверху (инкрементально) ---
        if (firstOrderId) {
            let continueToken = null;
            let newOrdersFoundInCycle = true;
            while (newOrdersFoundInCycle) {
                const { nextOrderId, orders } = await fetchAndParseSales(continueToken);
                if (!orders || orders.length === 0) break;

                const knownOrderIndex = orders.findIndex(o => o.orderId === firstOrderId);
                const newOrders = (knownOrderIndex !== -1) ? orders.slice(0, knownOrderIndex) : orders;

                if (newOrders.length > 0) {
                    await FPTSalesDB.putOrders(newOrders);
                    firstOrderId = newOrders[0].orderId;
                    await commitMeta(firstOrderId, undefined);
                    console.log(`Foxen: Добавлено ${newOrders.length} новых заказов сверху.`);
                } else {
                    newOrdersFoundInCycle = false;
                }

                if (knownOrderIndex !== -1 || !nextOrderId) break;
                continueToken = nextOrderId;
            }
        }

        // --- Догрузка СТАРЫХ заказов вниз / первичная инициализация ---
        let continueToken = lastOrderId;
        let _emptyPages = 0;
        const MAX_EMPTY_PAGES = 5;
        const _seenTokens = new Set();
        if (lastOrderId) _seenTokens.add(lastOrderId);

        if (!firstOrderId) {
            const { nextOrderId, orders } = await fetchAndParseSales(null);
            if (orders && orders.length > 0) {
                await FPTSalesDB.putOrders(orders);
                firstOrderId = orders[0].orderId;
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(firstOrderId, lastOrderId);
                console.log(`Foxen: Инициализация статистики с ${orders.length} заказами.`);
                continueToken = nextOrderId;
            } else {
                continueToken = null;
            }
        }

        // Множество уже известных orderId грузим ОДИН раз в память (а не с диска
        // на каждой странице) — иначе на 65к заказов проверки тормозили бы.
        const _knownIds = new Set(Object.keys(await FPTSalesDB.getAllAsMap()));

        while (continueToken) {
            const { nextOrderId, orders } = await fetchAndParseSales(continueToken);
            if (!orders || orders.length === 0) {
                console.log("Foxen: Достигнут конец истории заказов.");
                break;
            }

            // Какие из заказов на странице — новые для базы.
            let newOrdersOnPageCount = 0;
            const toPut = [];
            for (const order of orders) {
                if (!_knownIds.has(order.orderId)) { toPut.push(order); _knownIds.add(order.orderId); newOrdersOnPageCount++; }
            }

            if (newOrdersOnPageCount > 0) {
                await FPTSalesDB.putOrders(toPut);
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(undefined, lastOrderId);
                const total = await FPTSalesDB.count();
                console.log(`Foxen: Добавлено ${newOrdersOnPageCount} старых заказов. Всего: ${total}.`);
                _emptyPages = 0;
            } else {
                _emptyPages++;
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(undefined, lastOrderId);
                console.log(`Foxen: Страница без новых заказов (${_emptyPages}/${MAX_EMPTY_PAGES}).`);
                if (_emptyPages >= MAX_EMPTY_PAGES) {
                    console.log("Foxen: Несколько страниц подряд без новых заказов - остановка.");
                    break;
                }
            }

            if (!nextOrderId || nextOrderId === continueToken || _seenTokens.has(nextOrderId)) {
                console.log("Foxen: continue-токен не меняется/повторяется - конец пагинации.");
                break;
            }
            _seenTokens.add(nextOrderId);
            if (_seenTokens.size > 5000) _seenTokens.clear();

            continueToken = nextOrderId;
        }

    } catch (e) {
        console.error(`Foxen: Ошибка в цикле сбора статистики: ${e.message}`);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenSalesError: e.message });
    } finally {
        _salesCycleRunning = false;
        console.log("Foxen: Сбор статистики продаж завершен.");
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
            foxenSalesLastUpdate: Date.now(),
            foxenSalesCollecting: false
        });
    }
}

async function runFinanceUpdateCycle() {
    if (_financeCycleRunning) { console.log("Foxen: цикл финансов уже идёт — пропуск."); return; }
    _financeCycleRunning = true;
    console.log("Foxen: Запуск сбора статистики финансов...");
    try {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ 
            foxenFinanceCollecting: true,
            foxenFinanceError: null 
        });
        const auth = await getAuthDetailsForBackground();
        let userId = auth?.userId;
        if (!userId) {
            const stored = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['fpCurrentUserInfo', 'foxenProfileData']);
            userId = stored.fpCurrentUserInfo?.userId || stored.foxenProfileData?.userId || null;
        }

        const fetchPage = async (continueToken) => {
            const url = 'https://funpay.com/users/transactions';
            const params = new URLSearchParams();
            if (userId) params.set('user_id', String(userId));
            params.set('filter', ''); // все операции
            if (continueToken) params.set('continue', continueToken);
            const options = {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Csrf-Token': auth.csrf_token || '',
                    'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`
                },
                body: params
            };
            let response;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    response = await fetch(url, options);
                } catch (netErr) {
                    response = await fetchWithTabFallback(url, options);
                    if (!response) throw netErr;
                }
                if (response && (response.status === 401 || response.status === 403)) {
                    const fallbackResp = await fetchWithTabFallback(url, options);
                    if (fallbackResp && (fallbackResp.ok || fallbackResp.status < 400)) {
                        response = fallbackResp;
                        break;
                    }
                }
                if (response && (response.status === 429 || response.status >= 500)) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1) + Math.random() * 500));
                    continue;
                }
                break;
            }
            if (!response || !response.ok) {
                const fallbackResp = await fetchWithTabFallback(url, options);
                if (fallbackResp && (fallbackResp.ok || fallbackResp.status < 400)) {
                    response = fallbackResp;
                } else {
                    throw new Error(`Ошибка сети (финансы): ${response ? response.status : 'нет ответа'}`);
                }
            }
            let html = await response.text();
            if (html && html.trim().startsWith('{') && (html.includes('"error":1') || html.includes('Необходимо авторизоваться'))) {
                const fallbackResp = await fetchWithTabFallback(url, options);
                if (fallbackResp && fallbackResp.ok) {
                    html = await fallbackResp.text();
                }
                if (!html || (html.trim().startsWith('{') && html.includes('"error":1'))) {
                    throw new Error("Необходимо авторизоваться на FunPay для просмотра баланса.");
                }
            }
            return await parseHtmlViaOffscreen(html, 'parseFinancePage');
        };

        // Финансовых операций немного — собираем целиком заново каждый раз.
        await FPTFinanceDB.clearAll();
        let continueToken = null;
        const seenIds = new Set();        // все id операций, что уже сохранили
        const seenTokens = new Set();     // continue-токены, что уже использовали
        let lastFirstId = null;           // id первой операции прошлой страницы (детект зацикливания)
        const MAX_PAGES = 600;            // жёсткий предохранитель

        for (let page = 0; page < MAX_PAGES; page++) {
            // защита от повторного использования того же токена (зацикливание)
            if (continueToken && seenTokens.has(continueToken)) {
                console.log("Foxen: финансы — повтор continue-токена, останавливаемся.");
                break;
            }
            if (continueToken) seenTokens.add(continueToken);

            const { nextId, txns } = await fetchPage(continueToken);
            if (!txns || txns.length === 0) break;

            // оставляем только НОВЫЕ операции (которых ещё не видели)
            const fresh = txns.filter(t => t.id && !seenIds.has(t.id));
            for (const t of fresh) seenIds.add(t.id);

            if (fresh.length > 0) {
                await FPTFinanceDB.putOrders(fresh);
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenFinanceCount: seenIds.size });
                const dts = txns.map(t => t.date).filter(Boolean);
                if (dts.length) {
                    const newest = new Date(Math.max(...dts)).toISOString().slice(0, 10);
                    const oldest = new Date(Math.min(...dts)).toISOString().slice(0, 10);
                    console.log(`Foxen: финансы стр.${page + 1} — ${txns.length} операц. (новых ${fresh.length}), ${newest}…${oldest}, всего уникальных ${seenIds.size}`);
                }
            }

            // Если страница не принесла ни одной новой операции — дальше идти бессмысленно.
            if (fresh.length === 0) {
                console.log("Foxen: финансы — страница без новых операций, конец.");
                break;
            }

            // Детект зацикливания по содержимому: та же «первая» операция, что и раньше.
            const firstId = txns[0].id;
            if (firstId && firstId === lastFirstId) {
                console.log("Foxen: финансы — та же страница повторилась, конец.");
                break;
            }
            lastFirstId = firstId;

            // нет следующего токена ИЛИ он совпал с текущим → конец
            if (!nextId || nextId === continueToken) break;
            continueToken = nextId;
        }

        const total = seenIds.size;

        const now = Date.now();
        await FPTFinanceDB.setMeta('lastUpdate', now);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenFinanceLastUpdate: now });
        console.log(`Foxen: Финансы собраны, операций: ${total}.`);
    } catch (e) {
        console.error(`Foxen: Ошибка в цикле сбора финансов: ${e.message}`);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenFinanceError: e.message });
    } finally {
        _financeCycleRunning = false;
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
            foxenFinanceLastUpdate: Date.now(),
            foxenFinanceCollecting: false
        });
    }
}

async function runPurchasesUpdateCycle() {
    if (_purchasesCycleRunning) { console.log("Foxen: цикл покупок уже идёт — пропуск."); return; }
    _purchasesCycleRunning = true;
    console.log("Foxen: Запуск полного цикла сбора статистики покупок...");
    try {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenPurchasesCollecting: true, foxenPurchasesError: null });
        // Однократно переносим старые данные из storage.local в IndexedDB
        // (и освобождаем квоту). Безопасно вызывать каждый раз — отработает один раз.
        await FPTPurchasesDB.migrateFromLocalStorage();

        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key) throw new Error("Не удалось получить golden_key для сбора статистики.");

        let firstOrderId = await FPTPurchasesDB.getMeta('firstOrderId');
        let lastOrderId = await FPTPurchasesDB.getMeta('lastOrderId');

        const fetchAndParseSales = async (continueToken = null) => {
            const url = 'https://funpay.com/orders/';
            const body = continueToken ? new URLSearchParams({ 'continue': continueToken }) : null;
            const options = {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'X-Csrf-Token': auth.csrf_token, 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` },
                body: body
            };
            // 429/5xx-aware retry: если FunPay всё-таки притормозит — откатываемся и
            // пробуем снова, но НЕ держим паузу на каждой успешной странице.
            let response;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    response = await fetch(url, options);
                } catch (netErr) {
                    response = await fetchWithTabFallback(url, options);
                    if (!response) throw netErr;
                }
                if (response && (response.status === 401 || response.status === 403)) {
                    const fallbackResp = await fetchWithTabFallback(url, options);
                    if (fallbackResp && (fallbackResp.ok || fallbackResp.status < 400)) {
                        response = fallbackResp;
                        break;
                    }
                }
                if (response && (response.status === 429 || response.status >= 500)) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1) + Math.random() * 500));
                    continue;
                }
                break;
            }
            if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
            const html = await response.text();
            return await parseHtmlViaOffscreen(html, 'parseSalesPage');
        };

        const commitMeta = async (firstId, lastId) => {
            if (firstId !== undefined) await FPTPurchasesDB.setMeta('firstOrderId', firstId);
            if (lastId !== undefined) await FPTPurchasesDB.setMeta('lastOrderId', lastId);
            const now = Date.now();
            await FPTPurchasesDB.setMeta('lastUpdate', now);
            // Маленькое зеркало для UI, который читает дату из storage.local — это байты, не мегабайты.
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenPurchasesLastUpdate: now });
        };

        // --- Догрузка НОВЫХ покупок сверху (инкрементально) ---
        if (firstOrderId) {
            let continueToken = null;
            let newOrdersFoundInCycle = true;
            while (newOrdersFoundInCycle) {
                const { nextOrderId, orders } = await fetchAndParseSales(continueToken);
                if (!orders || orders.length === 0) break;

                const knownOrderIndex = orders.findIndex(o => o.orderId === firstOrderId);
                const newOrders = (knownOrderIndex !== -1) ? orders.slice(0, knownOrderIndex) : orders;

                if (newOrders.length > 0) {
                    await FPTPurchasesDB.putOrders(newOrders);
                    firstOrderId = newOrders[0].orderId;
                    await commitMeta(firstOrderId, undefined);
                    console.log(`Foxen: Добавлено ${newOrders.length} новых покупок сверху.`);
                } else {
                    newOrdersFoundInCycle = false;
                }

                if (knownOrderIndex !== -1 || !nextOrderId) break;
                continueToken = nextOrderId;
            }
        }

        // --- Догрузка СТАРЫХ заказов вниз / первичная инициализация ---
        let continueToken = lastOrderId;
        let _emptyPages = 0;
        const MAX_EMPTY_PAGES = 5;
        const _seenTokens = new Set();
        if (lastOrderId) _seenTokens.add(lastOrderId);

        if (!firstOrderId) {
            const { nextOrderId, orders } = await fetchAndParseSales(null);
            if (orders && orders.length > 0) {
                await FPTPurchasesDB.putOrders(orders);
                firstOrderId = orders[0].orderId;
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(firstOrderId, lastOrderId);
                console.log(`Foxen: Инициализация статистики с ${orders.length} заказами.`);
                continueToken = nextOrderId;
            } else {
                continueToken = null;
            }
        }

        // Множество уже известных orderId грузим ОДИН раз в память (а не с диска
        // на каждой странице) — иначе на 65к заказов проверки тормозили бы.
        const _knownIds = new Set(Object.keys(await FPTPurchasesDB.getAllAsMap()));

        while (continueToken) {
            const { nextOrderId, orders } = await fetchAndParseSales(continueToken);
            if (!orders || orders.length === 0) {
                console.log("Foxen: Достигнут конец истории заказов.");
                break;
            }

            // Какие из заказов на странице — новые для базы.
            let newOrdersOnPageCount = 0;
            const toPut = [];
            for (const order of orders) {
                if (!_knownIds.has(order.orderId)) { toPut.push(order); _knownIds.add(order.orderId); newOrdersOnPageCount++; }
            }

            if (newOrdersOnPageCount > 0) {
                await FPTPurchasesDB.putOrders(toPut);
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(undefined, lastOrderId);
                const total = await FPTPurchasesDB.count();
                console.log(`Foxen: Добавлено ${newOrdersOnPageCount} старых покупок. Всего: ${total}.`);
                _emptyPages = 0;
            } else {
                _emptyPages++;
                lastOrderId = orders[orders.length - 1].orderId;
                await commitMeta(undefined, lastOrderId);
                console.log(`Foxen: Страница без новых покупок (${_emptyPages}/${MAX_EMPTY_PAGES}).`);
                if (_emptyPages >= MAX_EMPTY_PAGES) {
                    console.log("Foxen: Несколько страниц подряд без новых покупок - остановка.");
                    break;
                }
            }

            if (!nextOrderId || nextOrderId === continueToken || _seenTokens.has(nextOrderId)) {
                console.log("Foxen: continue-токен не меняется/повторяется - конец пагинации.");
                break;
            }
            _seenTokens.add(nextOrderId);
            if (_seenTokens.size > 5000) _seenTokens.clear();

            continueToken = nextOrderId;
        }

    } catch (e) {
        console.error(`Foxen: Ошибка в цикле сбора статистики: ${e.message}`);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenPurchasesError: e.message });
    } finally {
        _purchasesCycleRunning = false;
        console.log("Foxen: Сбор статистики покупок завершен.");
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
            foxenPurchasesLastUpdate: Date.now(),
            foxenPurchasesCollecting: false
        });
    }
}



// --- НИЖЕ ИДЕТ ОСТАЛЬНОЙ КОД ФАЙЛА, ОН ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ ---

// --- НАДЁЖНАЯ ФУНКЦИЯ АУТЕНТИФИКАЦИИ ---
// 3.0: Upload an image to FunPay and send it to a chat via the runner - all in background.
// Ported from Foxen (Account.upload_image + Account.send_image).
async function sendChatImageInBackground(chatId, dataUrl, chatName, clientCsrfToken = null) {
    let auth = await getAuthDetailsForBackground();
    let csrfToken = clientCsrfToken || auth.csrf_token;
    if (!csrfToken) {
        auth = await getAuthDetailsForBackground(true);
        csrfToken = clientCsrfToken || auth.csrf_token;
    }
    if (!csrfToken) throw new Error('Нет авторизации для отправки изображения (CSRF токен не найден).');

    const getHeaders = (baseHeaders = {}) => {
        const h = { ...baseHeaders };
        if (auth.golden_key && auth.golden_key !== 'active_session') {
            h['cookie'] = auth.phpsessid
                ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
                : `golden_key=${auth.golden_key}`;
        }
        return h;
    };

    // 1) dataURL → Blob
    const blob = await (await fetch(dataUrl)).blob();

    // 2) Upload to FunPay (multipart) → fileId
    const fd = new FormData();
    fd.append('file', new File([blob], 'image.png', { type: blob.type || 'image/png' }));
    fd.append('file_id', '0');
    const upRes = await fetch('https://funpay.com/file/addChatImage', {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders({ 'x-requested-with': 'XMLHttpRequest' }),
        body: fd
    });
    if (!upRes.ok) throw new Error(`Загрузка изображения: HTTP ${upRes.status}`);
    const upJson = await upRes.json().catch(() => ({}));
    const fileId = upJson.fileId;
    if (!fileId) throw new Error('FunPay не вернул fileId: ' + (upJson.msg || 'неизвестная ошибка'));

    // 3) Send via runner with image_id
    const postRunner = async (token) => {
        const request = { action: 'chat_message', data: { node: String(chatId), last_message: -1, content: '', image_id: fileId } };
        const payload = {
            objects: JSON.stringify([{ type: 'chat_node', id: String(chatId), tag: '00000000', data: { node: String(chatId), last_message: -1, content: '' } }]),
            request: JSON.stringify(request),
            csrf_token: token
        };
        const sendRes = await fetch('https://funpay.com/runner/', {
            method: 'POST',
            credentials: 'include',
            headers: getHeaders({
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest'
            }),
            body: new URLSearchParams(payload)
        });
        const sendJson = await sendRes.json().catch(() => null);
        return { sendRes, sendJson };
    };

    const isCsrfOrStale = (j, status) => {
        if (status === 400) return true;
        if (!j) return false;
        const msg = String(j.msg || j.message || j.error || '');
        return msg.includes('Обновите страницу') || msg.includes('csrf') || j.error === 1 || j.error === '1';
    };

    let { sendRes, sendJson } = await postRunner(csrfToken);

    // If runner returned CSRF / session error, refresh token directly and retry
    if (!sendRes.ok || isCsrfOrStale(sendJson, sendRes.status)) {
        console.warn('Foxen: runner вернул ошибку CSRF/сессии при отправке изображения. Обновляем токен...');
        _authCache = null;
        auth = await getAuthDetailsForBackground(true);
        if (auth.csrf_token && auth.csrf_token !== csrfToken) {
            const retry = await postRunner(auth.csrf_token);
            sendRes = retry.sendRes;
            sendJson = retry.sendJson;
        }
    }

    if (!sendRes.ok || sendJson?.error) {
        const errMsg = sendJson?.msg || sendJson?.error || `HTTP ${sendRes.status}`;
        throw new Error(errMsg);
    }

    return { fileId };
}

let _authCache = null;
let _authCacheTime = 0;

async function getAuthDetailsForBackground(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _authCache && (now - _authCacheTime < 15000)) {
        return _authCache;
    }

    // 1) Ищем golden_key и PHPSESSID в cookies браузера
    const goldenKeyCookie = await fxnFindGoldenKey();
    const phpSessIdCookie = await fxnFindPhpSessId();
    let golden_key = goldenKeyCookie?.value || '';
    let phpsessid = phpSessIdCookie?.value || '';

    // 2) Если не запрошено принудительное обновление, пробуем получить из открытой вкладки FunPay
    if (!forceRefresh) {
        const tabs = await new Promise(resolve => {
            try {
                if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.query) {
                    const p = browser.tabs.query({ url: "*://*.funpay.com/*" });
                    if (p && typeof p.then === 'function') return p.then(resolve).catch(() => resolve([]));
                }
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                    chrome.tabs.query({ url: "*://*.funpay.com/*" }, (t) => resolve(t || []));
                    return;
                }
                resolve([]);
            } catch (_) { resolve([]); }
        });

        for (const tab of tabs) {
            try {
                if (tab.discarded) continue;
                let tabGoldenKey = golden_key;
                let tabPhpSessId = phpsessid;
                if (!tabGoldenKey && tab.cookieStoreId) {
                    const c = await fxnFindGoldenKey(tab.cookieStoreId);
                    if (c?.value) tabGoldenKey = c.value;
                    const p = await fxnFindPhpSessId(tab.cookieStoreId);
                    if (p?.value) tabPhpSessId = p.value;
                }

                const response = await new Promise(res => {
                    if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.sendMessage) {
                        const p = browser.tabs.sendMessage(tab.id, { action: "getAppData" });
                        if (p && typeof p.then === 'function') return p.then(res).catch(() => res(null));
                    }
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
                        chrome.tabs.sendMessage(tab.id, { action: "getAppData" }, (r) => res(r || null));
                        return;
                    }
                    res(null);
                });

                if (response && response.success) {
                    const appData = Array.isArray(response.data) ? response.data[0] : response.data;
                    if (appData && appData['csrf-token'] && appData.userId) {
                        const authRes = {
                            golden_key: tabGoldenKey || golden_key || 'active_session',
                            phpsessid: tabPhpSessId || phpsessid,
                            csrf_token: appData['csrf-token'],
                            userId: appData.userId,
                            username: appData.userName || '',
                            tabId: tab.id,
                            cookieStoreId: tab.cookieStoreId || null
                        };
                        _authCache = authRes;
                        _authCacheTime = now;
                        return authRes;
                    }
                }
            } catch (e) {
                // пробуем следующую вкладку
            }
        }
    }

    // 3) Прямой сетевой запрос к funpay.com (браузер сам прикрепит куки сессии через credentials: 'include')
    try {
        const headers = { 
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
        if (golden_key) {
            headers["Cookie"] = phpsessid ? `golden_key=${golden_key}; PHPSESSID=${phpsessid}` : `golden_key=${golden_key}`;
        }
        const response = await fetch("https://funpay.com/", {
            credentials: 'include',
            cache: 'no-store',
            headers
        });
        if (!response.ok) throw new Error(`Статус ответа: ${response.status}`);
        const text = await response.text();

        const appDataMatch = text.match(/<body[^>]*data-app-data="([^"]+)"/);
        if (appDataMatch && appDataMatch[1]) {
            const appDataString = appDataMatch[1].replace(/&quot;/g, '"');
            const appData = JSON.parse(appDataString);
            const userData = Array.isArray(appData) ? appData[0] : appData;
            if (userData && userData['csrf-token'] && userData.userId) {
                const updatedPhpSess = await fxnFindPhpSessId();
                const authRes = {
                    golden_key: golden_key || 'active_session',
                    phpsessid: updatedPhpSess?.value || phpsessid,
                    csrf_token: userData['csrf-token'],
                    userId: userData.userId,
                    username: userData.userName || '',
                };
                _authCache = authRes;
                _authCacheTime = now;
                return authRes;
            }
        }
        throw new Error("Не удалось найти data-app-data в HTML страницы (возможно, требуется вход).");
    } catch (e) {
        console.warn("Foxen: Ошибка получения auth через fetch:", e.message);
        if (golden_key) {
            return { golden_key, phpsessid };
        }
        return {};
    }
}

// ── Telegram integration deps ─────────────────────────────────────────────────
// Получить последние заказы (детально) для уведомлений/команд.
async function tgFetchOrders(limit) {
    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key) return [];
        // credentials:'include' заставляет браузер приложить настоящие cookie
        // активной сессии (ручной заголовок Cookie браузер игнорирует - forbidden header).
        const resp = await fetch('https://funpay.com/orders/trade', {
            credentials: 'include',
            cache: 'no-store'
        });
        if (!resp.ok) return [];
        // Если нас разлогинило/редиректнуло на страницу входа - не считаем это заказами.
        if (/\/account\/login/.test(resp.url)) return [];
        const html = await resp.text();
        const orders = await parseHtmlViaOffscreen(html, 'parseOrdersDetailed');
        const arr = Array.isArray(orders) ? orders : [];
        return (limit && limit > 0) ? arr.slice(0, limit) : arr;
    } catch (e) {
        console.error('Foxen: tgFetchOrders error:', e.message);
        return [];
    }
}

// Получить детальную информацию профиля (имя, баланс, аватар, рейтинг, лоты, статистика).
async function tgFetchProfileInfo() {
    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key) return null;

        // Параллельно загружаем главную страницу и страницу профиля пользователя
        const fetchHome = fetch('https://funpay.com/', { credentials: 'include', cache: 'no-store' })
            .then(r => r.ok ? r.text() : '').catch(() => '');
        
        const fetchUser = auth.userId
            ? fetch(`https://funpay.com/users/${auth.userId}/`, { credentials: 'include', cache: 'no-store' })
                .then(r => r.ok ? r.text() : '').catch(() => '')
            : Promise.resolve('');

        const [homeHtml, userHtml, orders, sales, bumpStore, arStore, tgStore] = await Promise.all([
            fetchHome,
            fetchUser,
            tgFetchOrders(0).catch(() => []),
            tgSalesSummary().catch(() => null),
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoBump').catch(() => ({})),
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies').catch(() => ({})),
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTelegram').catch(() => ({}))
        ]);

        const [homeSnapshot, userProfile, apiAvatar] = await Promise.all([
            homeHtml ? parseHtmlViaOffscreen(homeHtml, 'parseAccountSnapshot').catch(() => null) : null,
            userHtml ? parseHtmlViaOffscreen(userHtml, 'parseUserProfileFull').catch(() => null) : null,
            auth.userId
                ? fetch(`https://api.foxen.site/api/avatar?user_id=${encodeURIComponent(auth.userId)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(j => (j && j.avatar && !j.avatar.includes('layout/avatar.png')) ? j.avatar : '')
                    .catch(() => '')
                : Promise.resolve('')
        ]);

        const activeStatuses = ['paid', 'active', 'pending', 'оплачен', 'в работе'];
        const activeCount = (orders || []).filter(o => {
            const s = String(o.status || o.orderStatus || '').toLowerCase();
            if (!s) return false;
            return activeStatuses.some(a => s.includes(a));
        }).length;

        let resolvedAvatar = apiAvatar || (userProfile && userProfile.avatar) || (homeSnapshot && homeSnapshot.avatar) || '';
        if (resolvedAvatar && /avatar\.png|default-avatar/i.test(resolvedAvatar)) {
            resolvedAvatar = '';
        }

        return {
            username: (userProfile && userProfile.username) || (homeSnapshot && homeSnapshot.username) || auth.username || '',
            userId: auth.userId || null,
            avatar: resolvedAvatar,
            balance: (homeSnapshot && homeSnapshot.balance) || '',
            unreadChats: (homeSnapshot && homeSnapshot.unread) || 0,
            rating: (userProfile && userProfile.rating) || '',
            reviewsCount: (userProfile && userProfile.reviewsCount) || 0,
            yearsOnSite: (userProfile && userProfile.yearsOnSite) || '',
            onlineStatus: (userProfile && userProfile.onlineStatus) || '',
            lotsCount: userProfile?.lotsCount ?? null,
            categoriesCount: userProfile?.categoriesCount ?? null,
            activeOrders: activeCount,
            sales: sales || null,
            modules: {
                autobump: !!bumpStore?.foxenAutoBump?.enabled,
                autoresponder: !!(arStore?.foxenAutoReplies?.autoReplyEnabled || arStore?.foxenAutoReplies?.newOrderReplyEnabled || arStore?.foxenAutoReplies?.autoDeliveryEnabled),
                tgControl: tgStore?.foxenTelegram?.allowControl !== false
            }
        };
    } catch (e) {
        console.error('Foxen: tgFetchProfileInfo error:', e.message);
        return null;
    }
}

// Получить список чатов (для команды /chats) - переиспользуем runner как Discord.
async function tgFetchChatList() {
    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key || !auth.csrf_token || !auth.userId) return [];
        const payload = {
            objects: JSON.stringify([{ type: 'chat_bookmarks', id: auth.userId, tag: '0000000000', data: false }]),
            request: false,
            csrf_token: auth.csrf_token
        };
        const resp = await fetch('https://funpay.com/runner/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest'
            },
            body: new URLSearchParams(payload).toString()
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        const chatObj = data.objects.find(o => o.type === 'chat_bookmarks');
        if (!chatObj || !chatObj.data || !chatObj.data.html) return [];
        const chats = await parseHtmlViaOffscreen(chatObj.data.html, 'parseChatList');
        return Array.isArray(chats) ? chats : [];
    } catch (e) {
        return [];
    }
}

// Запустить поднятие лотов по команде /bump.
async function tgRunBump() {
    try {
        const res = await runBumpCycle();
        if (res && typeof res === 'object') {
            return {
                raised: res.raised || 0,
                errors: res.errors || 0,
                skipped: res.skipped || 0,
                raisedNames: res.raisedNames || [],
                skippedNames: res.skippedNames || []
            };
        }
        return { raised: 0, errors: 0, skipped: 0, raisedNames: [], skippedNames: [] };
    } catch (e) {
        return { raised: 0, errors: 1, skipped: 0, raisedNames: [], skippedNames: [] };
    }
}

// Сводка продаж для команды /sales.
async function tgSalesSummary() {
    try {
        const all = await FPTSalesDB.getAllAsArray();
        if (!all.length) return null;
        const now = Date.now(), day = 864e5;
        const t0 = new Date(); const todayStart = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()).getTime();
        const sym = { RUB: '₽', USD: '$', EUR: '€' };
        const bucket = (since) => {
            let count = 0; const rev = {};
            for (const o of all) {
                if (since && o.orderDate < since) continue;
                count++;
                if (o.orderStatus === 'closed' || o.orderStatus === 'paid') {
                    rev[o.currency] = (rev[o.currency] || 0) + (o.price || 0);
                }
            }
            const revStr = Object.entries(rev).map(([c, v]) => `${Math.round(v).toLocaleString('ru-RU')} ${sym[c] || c}`).join(' · ') || '0 ₽';
            return { count, revenue: revStr };
        };
        return {
            today: bucket(todayStart),
            week: bucket(now - 7 * day),
            month: bucket(now - 30 * day),
            all: bucket(null)
        };
    } catch (_) { return null; }
}

// Список лотов для команды /lots.
async function tgGetLots(limit) {
    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key || !auth.userId) return [];
        const resp = await fetch(`https://funpay.com/users/${auth.userId}/`, { credentials: 'include', cache: 'no-store' });
        if (!resp.ok) return [];
        const html = await resp.text();
        const lots = await parseHtmlViaOffscreen(html, 'parseUserLotsList').catch(() => null);
        if (Array.isArray(lots)) return limit ? lots.slice(0, limit) : lots;
        return [];
    } catch (_) { return []; }
}

// Поддержать онлайн для команды /online.
async function tgKeepOnline() {
    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key) return false;
        const resp = await fetch('https://funpay.com/', { credentials: 'include', cache: 'no-store' });
        return resp.ok;
    } catch (_) { return false; }
}

// Отправка сообщения в чат FunPay (используется при ответе через reply в Telegram).
async function tgSendChatMessage(chatId, text, counterpartUserId = null) {
    try {
        let auth = await getAuthDetailsForBackground();
        if (!auth.golden_key || !auth.csrf_token) {
            auth = await getAuthDetailsForBackground(true);
        }
        if (!auth.golden_key || !auth.csrf_token) throw new Error('Нет авторизации на FunPay');

        const postToRunner = async (nodeId, curAuth) => {
            const cookieStr = curAuth.phpsessid
                ? `golden_key=${curAuth.golden_key}; PHPSESSID=${curAuth.phpsessid}`
                : `golden_key=${curAuth.golden_key}`;
            const payload = {
                objects: JSON.stringify([{ type: 'chat_node', id: String(nodeId), tag: '00000000', data: { node: String(nodeId), last_message: -1, content: '' } }]),
                request: JSON.stringify({ action: 'chat_message', data: { node: String(nodeId), last_message: -1, content: text } }),
                csrf_token: curAuth.csrf_token
            };
            const res = await fetch('https://funpay.com/runner/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'x-requested-with': 'XMLHttpRequest',
                    'cookie': cookieStr
                },
                body: new URLSearchParams(payload).toString()
            });
            const json = await res.json().catch(() => null);
            return { res, json };
        };

        const isCsrfOrStaleError = (j) => {
            if (!j) return false;
            const msg = String(j.msg || j.message || j.error || '');
            return msg.includes('Обновите страницу') || msg.includes('csrf') || msg.includes('token') || j.error === 1 || j.error === '1';
        };

        let targetNode = String(chatId).trim();
        let { res, json } = await postToRunner(targetNode, auth);

        // Если получен ответ с ошибкой CSRF / сессии — сбрасываем кэш и пробуем со свежим CSRF напрямую
        if (isCsrfOrStaleError(json)) {
            console.warn('Foxen: runner вернул ошибку CSRF (' + (json?.msg || json?.error) + '). Обновляем токен напрямую с FunPay...');
            _authCache = null;
            auth = await getAuthDetailsForBackground(true);
            if (auth.csrf_token) {
                const freshRetry = await postToRunner(targetNode, auth);
                res = freshRetry.res;
                json = freshRetry.json;
            }
        }

        // Если ошибка и известен ID собеседника, пробуем формат users-MYID-THEIRID
        if (json?.error && counterpartUserId && auth.userId) {
            const userPairNode = `users-${auth.userId}-${counterpartUserId}`;
            if (userPairNode !== targetNode) {
                const retryPair = await postToRunner(userPairNode, auth);
                if (retryPair.res.ok && !retryPair.json?.error) {
                    res = retryPair.res;
                    json = retryPair.json;
                }
            }
        }

        // Если ошибка и targetNode не содержит users-, пробуем парный формат users-MYID-TARGETID
        if (json?.error && !targetNode.startsWith('users-') && auth.userId) {
            const pairedNode = `users-${auth.userId}-${targetNode}`;
            const retry = await postToRunner(pairedNode, auth);
            if (retry.res.ok && !retry.json?.error) {
                res = retry.res;
                json = retry.json;
            }
        }

        // Если ошибка и targetNode в формате users-A-B, пробуем поменять порядок на users-B-A
        if (json?.error && targetNode.startsWith('users-')) {
            const parts = targetNode.split('-');
            if (parts.length === 3 && parts[1] && parts[2]) {
                const swappedNode = `users-${parts[2]}-${parts[1]}`;
                const retrySwapped = await postToRunner(swappedNode, auth);
                if (retrySwapped.res.ok && !retrySwapped.json?.error) {
                    res = retrySwapped.res;
                    json = retrySwapped.json;
                }
            }
        }

        if (json?.error) {
            const errMsg = json.msg || json.message || (typeof json.error === 'string' ? json.error : null);
            throw new Error(errMsg || `FunPay отклонил сообщение (код ${json.error})`);
        }
        if (json?.response?.error) {
            const errMsg = json.response.msg || json.response.message || (typeof json.response.error === 'string' ? json.response.error : null);
            throw new Error(errMsg || 'Не удалось доставить сообщение');
        }

        return { ok: res.ok };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

telegramInit({
    getOrders: tgFetchOrders,
    getProfileInfo: tgFetchProfileInfo,
    getChatList: tgFetchChatList,
    runBump: tgRunBump,
    getSalesSummary: tgSalesSummary,
    getLots: tgGetLots,
    keepOnline: tgKeepOnline,
    sendChatMessage: tgSendChatMessage
});

// Полный цикл Telegram: приём команд (getUpdates) + уведомления (сообщения/заказы).
let _tgChatTag = null;
async function runTelegramCheckCycle() {
    const { foxenTelegram } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTelegram');
    const cfg = foxenTelegram || {};
    if (!cfg.enabled || !cfg.token) return;

    // 1) гарантируем активный опрос команд (Long Polling)
    startTelegramPollingLoop();

    // 2) уведомления о новых сообщениях (если Discord-цикл не активен, тянем сами)
    if (cfg.notifyMessages) {
        try {
            const { foxenDiscord } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDiscord');
            const discordActive = foxenDiscord && foxenDiscord.enabled && foxenDiscord.webhookUrl;
            // Если Discord активен - он уже кормит Telegram внутри runDiscordCheckCycle.
            if (!discordActive) {
                const chats = await tgFetchChatList();
                if (chats.length) await telegramNotifyNewMessages(chats);
            }
        } catch (e) { console.error('Foxen: TG msg notify:', e.message); }
    }

    // 3) уведомления о новых заказах
    if (cfg.notifyOrders) {
        try {
            const orders = await tgFetchOrders(0);
            if (orders.length) await telegramNotifyNewOrders(orders);
        } catch (e) { console.error('Foxen: TG order notify:', e.message); }
    }
}

// Функция для парсинга HTML (в Firefox выполняется синхронно в фоне)
async function parseHtmlViaOffscreen(html, action, extra = {}) {
    return Promise.resolve().then(() => {
        if (action === 'parseSellerLotPrice') {
            return window[action](html, extra.offerId);
        } else if (action === 'solveCloneForm') {
            return window[action](html, extra.attributes, extra.attributePairs);
        } else if (action === 'parseBuyerHistory') {
            return window[action](html, extra.buyerUserId);
        } else if (typeof window[action] === 'function') {
            return window[action](html);
        } else {
            throw new Error(`Unknown parser action: ${action}`);
        }
    });
}

async function cloneBuildFieldsInternal(auth, nodeId, attributes, attributePairs) {
    if (!nodeId) throw new Error('Неизвестна подкатегория (node) лота.');
    
    const editUrl = `https://funpay.com/lots/offerEdit?node=${nodeId}`;
    const editHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    if (auth && auth.golden_key && auth.golden_key !== 'active_session') {
        editHeaders['Cookie'] = auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`;
    }
    const resp = await fetchWithTabFallback(editUrl, {
        credentials: 'include',
        headers: editHeaders
    });
    if (!resp.ok) throw new Error(`Не удалось открыть форму категории: ${resp.status}`);
    const html = await resp.text();
    
    const fields = await parseHtmlViaOffscreen(html, 'solveCloneForm', { attributes: attributes || [], attributePairs: attributePairs || [] });
    if (!fields) throw new Error('Не удалось разобрать форму категории.');
    fields.node_id = String(nodeId);
    fields.offer_id = '0';
    return fields;
}

// 3.0: «чистая» цена продавца с учётом комиссии - повторяет Account.calc()+commission_coefficient.
// calc(price=100) возвращает методы оплаты с ценой ПОКУПАТЕЛЯ в разных валютах. Коэффициент =
// (минимальная цена покупателя в нужной валюте) / 100. Чистая цена = желаемая цена / коэффициент.
// Валюта берётся из списка лотов продавца (rub/usd/eur), как в get_coefficient(account_currency).
async function cloneCalcNetPrice(auth, nodeId, buyerPrice, currencyCode) {
    if (!buyerPrice || buyerPrice <= 0) return null;
    const headers = {
        'accept': '*/*',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest'
    };
    if (auth && auth.golden_key && auth.golden_key !== 'active_session') {
        headers['Cookie'] = auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`;
    }
    const base = 100; // как в плагине
    const body = new URLSearchParams({ nodeId: String(nodeId), price: String(base) });
    const r = await fetchWithTabFallback('https://funpay.com/lots/calc', { method: 'POST', headers, body });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.error) return null;

    const want = (currencyCode || '').toLowerCase(); // 'rub' | 'usd' | 'eur' | ''
    const symFor = (c) => c === 'rub' ? '₽' : c === 'usd' ? '$' : c === 'eur' ? '€' : '';

    // Собираем цены методов с их валютой (по unit или data-cy).
    let buyerForBase = Infinity;
    if (Array.isArray(j.methods)) {
        for (const m of j.methods) {
            const p = parseFloat(String(m.price).replace(/\s/g, '').replace(',', '.'));
            if (Number.isNaN(p)) continue;
            const unit = String(m.unit || '');
            let mcur = '';
            if (unit.includes('₽')) mcur = 'rub';
            else if (unit.includes('$')) mcur = 'usd';
            else if (unit.includes('€')) mcur = 'eur';
            // если знаем нужную валюту - берём только методы в ней; иначе минимум по всем
            if (want && mcur && mcur !== want) continue;
            buyerForBase = Math.min(buyerForBase, p);
        }
    }
    // если по нужной валюте ничего не нашли - пробуем minPrice
    if (!Number.isFinite(buyerForBase) && typeof j.minPrice === 'string') {
        const mp = parseFloat(j.minPrice.replace(/\s/g, '').replace(',', '.'));
        if (!Number.isNaN(mp)) buyerForBase = mp;
    }
    if (!Number.isFinite(buyerForBase) || buyerForBase <= 0) return null;

    const coeff = buyerForBase / base;     // commission_coefficient в нужной валюте
    if (coeff <= 0) return null;
    const net = buyerPrice / coeff;
    return Math.round(net * 100) / 100;
}

// --- СЕКЦИЯ РАБОТЫ С DISCORD ---
async function sendDiscordNotification(chat, settings) {
    let content = "";
    if (settings.pingEveryone) content += "@everyone ";
    if (settings.pingHere) content += "@here ";

    const payload = {
        content: content.trim(),
        embeds: [{
            author: {
                name: chat.chatName,
                url: `https://funpay.com/chat/?node=${chat.chatId}`,
                icon_url: chat.avatarUrl || 'https://funpay.com/img/layout/avatar.png'
            },
            description: chat.messageText.substring(0, 2000),
            color: 5814783,
            footer: {
                text: `Foxen • ${new Date().toLocaleTimeString()}`
            }
        }]
    };

    try {
        const response = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.error('Foxen: Не удалось отправить сообщение в Discord, статус:', response.status);
        } else {
            console.log(`Foxen: Уведомление о сообщении от ${chat.chatName} отправлено в Discord.`);
        }
    } catch (error) {
        console.error('Foxen: Ошибка при отправке сообщения в Discord:', error);
    }
}

async function runDiscordCheckCycle() {
    const { foxenDiscord, foxenProcessedDiscordIds } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenDiscord', 'foxenProcessedDiscordIds']);

    if (!foxenDiscord || !foxenDiscord.enabled || !foxenDiscord.webhookUrl) {
        chrome.alarms.clear(DISCORD_LOG_ALARM_NAME);
        return;
    }
    
    const processedDiscordMessageIds = new Set(foxenProcessedDiscordIds || []);

    try {
        const auth = await getAuthDetailsForBackground();
        if (!auth.golden_key || !auth.csrf_token || !auth.userId) throw new Error("Нет данных авторизации для Discord-цикла.");

        const runnerPayload = {
            objects: JSON.stringify([{
                type: "chat_bookmarks",
                id: auth.userId,
                tag: lastDiscordChatTag || "0000000000",
                data: false
            }]),
            request: false,
            csrf_token: auth.csrf_token
        };

        const discordCookieStr = auth.phpsessid
            ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
            : `golden_key=${auth.golden_key}`;
        const response = await fetch("https://funpay.com/runner/", {
            method: "POST",
            credentials: 'include',
            headers: {
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "x-requested-with": "XMLHttpRequest",
                "cookie": discordCookieStr
            },
            body: new URLSearchParams(runnerPayload).toString()
        });

        if (!response.ok) throw new Error(`Runner-запрос для Discord провалился: ${response.status}`);

        const data = await response.json();
        // 3.0: Also capture buyer_viewing data for chat header display
        const buyerViewingObjects = data.objects.filter(o => o.type === "buyer_viewing");
        if (buyerViewingObjects.length > 0) {
            const tabs = await (typeof browser !== 'undefined' ? browser : chrome).tabs.query({ url: "https://funpay.com/*" });
            buyerViewingObjects.forEach(bv => {
                tabs.forEach(tab => {
                    const b = typeof browser !== 'undefined' ? browser : chrome;
                    try {
                        const p = b.tabs.sendMessage(tab.id, {
                            action: 'foxenBuyerViewing',
                            buyerId: bv.id,
                            data: bv.data
                        });
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                    } catch (e) {}
                });
            });
        }
        const chatObject = data.objects.find(o => o.type === "chat_bookmarks");

        if (!chatObject || !chatObject.data || !chatObject.data.html) return;

        lastDiscordChatTag = chatObject.tag;

        const parsedChats = await parseHtmlViaOffscreen(chatObject.data.html, 'parseChatList');

        // Telegram: уведомления о новых сообщениях (тот же источник, что и Discord).
        try { await telegramNotifyNewMessages(parsedChats); } catch (e) { console.error('Foxen: TG notify msgs:', e.message); }

        // 3.0: stop Discord spam. Two fixes:
        //  (1) First-run seeding - if we've never recorded ids, just record current unread ids
        //      and DON'T notify (otherwise enabling Discord blasts every existing unread chat).
        //  (2) Only notify when the chat's last message is genuinely new inbound
        //      (nodeMsg > userMsg), not merely flagged unread.
        const { foxenDiscordSeeded } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDiscordSeeded');
        const isFirstDiscordRun = !foxenDiscordSeeded;

        let newMessagesToSend = false;
        for (const chat of parsedChats) {
            const genuinelyNew = (chat.nodeMsg != null && chat.userMsg != null)
                ? (chat.nodeMsg > chat.userMsg)
                : chat.isUnread;
            if (!genuinelyNew) continue;
            if (processedDiscordMessageIds.has(chat.msgId)) continue;

            if (!isFirstDiscordRun) {
                await sendDiscordNotification(chat, foxenDiscord);
            }
            processedDiscordMessageIds.add(chat.msgId);
            newMessagesToSend = true;
        }

        if (newMessagesToSend || isFirstDiscordRun) {
            let idsToStore = Array.from(processedDiscordMessageIds);
            if (idsToStore.length > 200) {
                idsToStore = idsToStore.slice(-200);
            }
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenProcessedDiscordIds: idsToStore, foxenDiscordSeeded: true });
        }

    } catch (e) {
        console.error(`Foxen: Ошибка в цикле проверки Discord: ${e.message}`);
    }
}


// --- ИЗМЕНЕННЫЙ БЛОК: ЭКСПОРТ И ИМПОРТ ЛОТОВ ---

function sendImportProgressUpdate(progressData) {
    try {
        const api = typeof browser !== 'undefined' ? browser : chrome;
        api.tabs.query({ url: ["https://funpay.com/*", "https://*.funpay.com/*"] }, (tabs) => {
            if (!tabs || !tabs.length) return;
            tabs.forEach(tab => {
                try {
                    api.tabs.sendMessage(tab.id, {
                        action: 'lotImportProgressUpdate',
                        data: progressData
                    }, () => {
                        if (chrome.runtime && chrome.runtime.lastError) {}
                    });
                } catch (e) {}
            });
        });
    } catch (e) {}
}

async function processNextLotImport() {
    const { [IMPORT_PROCESS_KEY]: process } = await fxnStorageGet(IMPORT_PROCESS_KEY);
    
    // Если процесса нет, или он отложен, или закончен - выходим.
    if (!process || process.state === 'postponed' || process.currentIndex >= process.lots.length) {
        if (process && process.currentIndex >= process.lots.length) {
            await fxnStorageRemove(IMPORT_PROCESS_KEY);
            sendImportProgressUpdate({ finished: true, lots: process.lots || [] });
        }
        return;
    }

    const currentLot = process.lots[process.currentIndex];
    
    // Если лот уже успешно создан или пропущен, переходим к следующему
    if (currentLot.status === 'success' || currentLot.status === 'skipped') {
        process.currentIndex++;
        await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
        processNextLotImport(); // Сразу переходим к следующему
        return;
    }
    
    // Если попытки исчерпаны, останавливаемся
    if (currentLot.retries >= RETRY_LIMIT) {
        currentLot.status = 'error';
        currentLot.error = `Превышен лимит попыток (${RETRY_LIMIT}). Процесс остановлен.`;
        await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
        sendImportProgressUpdate(process);
        return;
    }

    try {
        // Используем кэш авторизации (сбрасывается при смене аккаунта через setGoldenKey).
        // forceRefresh=true убран — он делал HTTP-запрос к funpay.com для КАЖДОГО лота (спам).
        // При смене аккаунта _authCache = null уже выставляется в setGoldenKey-хендлере,
        // поэтому первый лот после смены аккаунта всегда получает свежие данные.
        let auth = await getAuthDetailsForBackground();
        if (!auth || (!auth.csrf_token && !auth.userId && !auth.golden_key)) {
            auth = await getAuthDetailsForBackground(true);
        }
        if (!auth || (!auth.csrf_token && !auth.userId && !auth.golden_key)) {
            throw new Error("Не авторизован на FunPay. Откройте вкладку funpay.com и войдите в аккаунт.");
        }
        console.log(`[Foxen Import] Используется аккаунт: userId=${auth.userId || '?'} username=${auth.username || '?'}`);

        // Поддерживаем разные форматы хранения данных лота
        const rawData = currentLot.data || currentLot.fields || currentLot || {};
        const d = { ...rawData };

        const nodeId = d.node_id || d.node || d.nodeId || currentLot.nodeId || currentLot.node_id || currentLot.node;
        if (!nodeId) {
            throw new Error(`У лота отсутствует ID категории (node_id). Невозможно создать предложение.`);
        }

        // КРИТИЧНО: FunPay привязывает form_created_at и csrf_token к форме редактирования категории.
        // Обязательно загружаем свежую форму категории перед сохранением каждого лота, иначе сервер возвращает:
        // "{"msg":"Обновите страницу и повторите попытку.","error":1}"
        const editUrl = `https://funpay.com/lots/offerEdit?node=${nodeId}`;
        const editHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        };
        if (auth.golden_key && auth.golden_key !== 'active_session') {
            editHeaders['Cookie'] = auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`;
        }
        const editResp = await fetchWithTabFallback(editUrl, {
            credentials: 'include',
            headers: editHeaders
        });
        if (!editResp.ok) throw new Error(`Не удалось открыть форму категории ${nodeId}: HTTP ${editResp.status}`);
        const editHtml = await editResp.text();

        const baseForm = await parseHtmlViaOffscreen(editHtml, 'parseLotEditPage');
        if (!baseForm) {
            if (/account\/login|form-signin/i.test(editHtml)) {
                throw new Error('Сессия FunPay истекла (перенаправление на вход).');
            }
            throw new Error(`Не удалось разобрать форму для категории ${nodeId}.`);
        }

        const freshCsrf = baseForm.csrf_token || auth.csrf_token;
        const freshFormCreatedAt = baseForm.form_created_at;

        // Список мета-полей, которые НЕ должны попадать в POST-запрос FunPay
        const metaKeys = new Set([
            'categoryName', 'sourceTitle', 'sourceCategory', 'title',
            'nodeId', 'node', 'isOwn', 'rawPrice', 'priceCurrency',
            'finalPrice', 'enDiffers', 'query', 'formError', 'csrf',
            'csrf_token', 'form_created_at', 'status', 'retries', 'error', 'data', 'fields',
            'autoDelivery', 'isChips'
        ]);

        const payload = { ...baseForm };

        // Накладываем поля импортируемого лота
        for (const [k, v] of Object.entries(d)) {
            if (metaKeys.has(k)) continue;
            if (v != null && typeof v !== 'object') {
                payload[k] = String(v);
            }
        }

        // Ключевые параметры FunPay для создания лота
        payload.node_id = String(nodeId);
        payload.offer_id = '0'; // Всегда создаем новый лот
        payload.location = 'trade';
        payload.active = 'on';

        // Свежие токены из только что открытой формы
        if (freshCsrf) payload.csrf_token = freshCsrf;
        if (freshFormCreatedAt) payload.form_created_at = freshFormCreatedAt;

        // Удаляем deleted если пустое/0
        if (payload.deleted === '' || payload.deleted === '0' || !payload.deleted) {
            delete payload.deleted;
        }

        // Автоматическая адаптация полей (FunPay summary vs name)
        if (payload['fields[summary][ru]'] && !payload['fields[name][ru]']) payload['fields[name][ru]'] = payload['fields[summary][ru]'];
        if (payload['fields[summary][en]'] && !payload['fields[name][en]']) payload['fields[name][en]'] = payload['fields[summary][en]'];
        if (payload['fields[name][ru]'] && !payload['fields[summary][ru]']) payload['fields[summary][ru]'] = payload['fields[name][ru]'];
        if (payload['fields[name][en]'] && !payload['fields[summary][en]']) payload['fields[summary][en]'] = payload['fields[name][en]'];

        // Нормализация цены (не обрезаем дробные значения, заменяем запятую на точку)
        if (payload.price != null && payload.price !== '') {
            let str = String(payload.price).trim().replace(',', '.');
            let n = parseFloat(str);
            if (!Number.isNaN(n) && n > 0) {
                payload.price = str;
            }
        }

        // Нормализация количества
        if (!payload.amount) {
            payload.amount = '1';
        }

        const formData = new URLSearchParams(payload);

        const postOfferSave = async (curToken) => {
            formData.set('csrf_token', curToken);
            const headers = { 
                "X-Requested-With": "XMLHttpRequest", 
                "X-Csrf-Token": curToken,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            };
            if (auth.golden_key && auth.golden_key !== 'active_session') {
                headers['Cookie'] = auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`;
            }
            return await fetchWithTabFallback("https://funpay.com/lots/offerSave", {
                method: "POST",
                credentials: 'include',
                headers,
                body: formData
            });
        };

        let response = await postOfferSave(freshCsrf || auth.csrf_token);
        let rawText = await response.text();
        let result = null;
        try { result = JSON.parse(rawText); } catch (_) {}

        const isCsrfOrSessionError = response.status === 400 || (result && (result.error === 1 || result.error === true) && /обновит|csrf|token|session|auth/i.test(result.msg || ''));

        if (isCsrfOrSessionError) {
            _authCache = null;
            _authCacheTime = 0;
            const freshAuth = await getAuthDetailsForBackground(true);
            if (freshAuth && freshAuth.csrf_token) {
                auth = freshAuth;
                response = await postOfferSave(auth.csrf_token);
                rawText = await response.text();
                try { result = JSON.parse(rawText); } catch (_) {}
            }
        }

        const hasError = !result || result.error === 1 || result.error === true ||
            (result.errors && (Array.isArray(result.errors) ? result.errors.length > 0 : Object.keys(result.errors).length > 0));

        if (hasError) {
            let msg = result?.msg || 'Ошибка сохранения лота';
            if (result?.errors) {
                const parts = Array.isArray(result.errors)
                    ? result.errors.map(e => Array.isArray(e) ? e[1] : e)
                    : Object.values(result.errors);
                if (parts.length) msg = parts.join('; ');
            }
            if (!result) msg = `HTTP ${response.status}: ${rawText.slice(0, 100)}`;
            throw new Error(msg);
        }

        // Проверяем, действительно ли создан лот (FunPay возвращает url с id/offer или offer_id в json)
        let createdOfferId = null;
        const txt = JSON.stringify(result);
        let m = txt.match(/"offer_id"\s*:\s*"?(\d+)"?/) || txt.match(/id=(\d+)/);
        if (m) createdOfferId = m[1];
        if (!createdOfferId && result.url) {
            const um = String(result.url).match(/[?&]offer=(\d+)/) || String(result.url).match(/[?&]id=(\d+)/);
            if (um) createdOfferId = um[1];
        }

        if (!createdOfferId && (result.url === 'https://funpay.com/' || result.url === 'https://funpay.com')) {
            throw new Error('FunPay перенаправил на главную страницу (возможно, категория недоступна).');
        }

        currentLot.status = 'success';
        currentLot.newId = createdOfferId || null;
        currentLot.error = null;
        process.currentIndex++;
        await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
        sendImportProgressUpdate(process);
        setTimeout(processNextLotImport, 800); // Задержка между запросами

    } catch (error) {
        currentLot.retries++;
        currentLot.status = 'pending';
        currentLot.error = error.message;
        await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
        sendImportProgressUpdate(process);
        
        // Если это была не последняя попытка, делаем таймаут
        if (currentLot.retries < RETRY_LIMIT) {
            setTimeout(processNextLotImport, RETRY_DELAY);
        }
    }
}

// --- КОНЕЦ ИЗМЕНЕННОГО БЛОКА ---

// =====================================================================
// Снимок аккаунта (аватар/баланс/непрочитанные) для вкладки мультиаккаунтов.
//
// ВАЖНО: браузер игнорирует заголовок Cookie, выставленный вручную в fetch()
// (это forbidden header). Поэтому единственный надёжный способ получить главную
// страницу ПОД КОНКРЕТНЫМ аккаунтом - временно подменить cookie golden_key,
// сделать запрос с credentials:'include', затем вернуть исходную cookie.
//
// Все вызовы сериализуются (очередь), чтобы параллельные снимки не затирали
// cookie друг друга и не разлогинивали активную сессию.
// =====================================================================
let _fxnSnapChain = Promise.resolve();

function fxnSnapshotForKey(key) {
    const run = async () => {
        // 1) Если прямо сейчас идёт процесс импорта лотов, НИ В КОЕМ СЛУЧАЕ не трогаем куки!
        try {
            const { [IMPORT_PROCESS_KEY]: importProc } = await new Promise(r => {
                const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
                api.storage.local.get(IMPORT_PROCESS_KEY, r);
            });
            if (importProc && importProc.state === 'running') {
                return null;
            }
        } catch (_) {}

        // 2) Запоминаем текущую golden_key, чтобы вернуть её после запроса.
        const original = await fxnFindGoldenKey();
        const originalVal = original?.value || null;

        // Если ключ совпадает с активным - просто грузим главную как есть.
        if (originalVal && originalVal === key) {
            try {
                const resp = await fetch('https://funpay.com/', { credentials: 'include', cache: 'no-store' });
                const html = await resp.text();
                return await parseHtmlViaOffscreen(html, 'parseAccountSnapshot');
            } catch (e) { return null; }
        }

        // Если текущий ключ определить не удалось — не подменяем куку вслепую,
        // чтобы не испортить активную сессию пользователя!
        if (!originalVal) {
            return null;
        }

        const setKey = async (value) => {
            let res = await fxnSetCookie({
                url: 'https://funpay.com/',
                name: 'golden_key',
                value,
                domain: '.funpay.com',
                path: '/',
                secure: true,
                sameSite: 'lax',
                expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
            });
            if (!res) {
                await fxnSetCookie({
                    url: 'https://funpay.com/',
                    name: 'golden_key',
                    value,
                    path: '/',
                    secure: true,
                    sameSite: 'lax',
                    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
                });
            }
        };

        try {
            // 3) Ставим cookie целевого аккаунта.
            await setKey(key);
            // 4) Грузим главную под этим аккаунтом.
            const resp = await fetch('https://funpay.com/', { credentials: 'include', cache: 'no-store' });
            const html = await resp.text();
            return await parseHtmlViaOffscreen(html, 'parseAccountSnapshot');
        } catch (e) {
            return null;
        } finally {
            // 5) ВСЕГДА возвращаем исходную golden_key активного аккаунта!
            // НИ В КОЕМ СЛУЧАЕ не удаляем куку!
            try {
                if (originalVal) await setKey(originalVal);
            } catch (_) {}
        }
    };
    // сериализация
    const next = _fxnSnapChain.then(run, run);
    _fxnSnapChain = next.catch(() => {});
    return next;
}

// Многоуровневый отказоустойчивый перевод в фоне (обход CORS и 429 блокировок Google)
async function fxnBackgroundTranslate(text, targetLang = 'en', sourceLang = 'auto', useAi = false) {
    if (!text || !text.trim()) return { success: true, text: '', provider: 'none', isAi: false };
    const cleanText = text.trim();
    const sl = encodeURIComponent(sourceLang || 'auto');
    const tl = encodeURIComponent(targetLang || 'en');
    const q = encodeURIComponent(cleanText);

    // 1. Попытка через AI (если запрошен режим ИИ)
    if (useAi) {
        try {
            const aiRes = await fetchAIResponse(cleanText, targetLang, '', 'translate');
            if (aiRes && aiRes.success && aiRes.data && aiRes.data.trim()) {
                return { success: true, text: aiRes.data.trim(), provider: 'ai', isAi: true };
            }
        } catch (e) {
            console.warn('[Foxen BG Translate] AI error, falling back to multi-tier engine:', e);
        }
    }

    // 2. Google clients5 (официальный эндпойнт Chrome-расширения, высокий лимит запросов)
    try {
        const u = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${q}`;
        const res = await fetch(u);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                const tr = Array.isArray(data[0]) ? data[0][0] : data[0];
                if (typeof tr === 'string' && tr.trim()) {
                    return { success: true, text: tr.trim(), provider: 'google_clients5', isAi: false };
                }
            }
        }
    } catch (_) {}

    // 3. Google translate.google.com (dj=1 JSON sentences format)
    try {
        const u = `https://translate.google.com/translate_a/single?client=at&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${q}`;
        const res = await fetch(u);
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.sentences)) {
                const tr = data.sentences.map(s => s.trans || '').join('');
                if (tr.trim()) {
                    return { success: true, text: tr.trim(), provider: 'google_dj', isAi: false };
                }
            }
        }
    } catch (_) {}

    // 4. Google translate.googleapis.com (gtx)
    try {
        const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${q}`;
        const res = await fetch(u);
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const tr = data[0].map(c => c[0] || '').join('');
                if (tr.trim()) {
                    return { success: true, text: tr.trim(), provider: 'google_gtx', isAi: false };
                }
            }
        }
    } catch (_) {}

    // 5. MyMemory API (бесплатный независимый переводчик)
    try {
        const lp = (sourceLang && sourceLang !== 'auto') ? `${sourceLang}|${targetLang}` : `autodetect|${targetLang}`;
        const u = `https://api.mymemory.translated.net/get?q=${q}&langpair=${encodeURIComponent(lp)}`;
        const res = await fetch(u);
        if (res.ok) {
            const data = await res.json();
            const tr = data?.responseData?.translatedText;
            if (typeof tr === 'string' && tr.trim() && !tr.includes('MYMEMORY WARNING')) {
                return { success: true, text: tr.trim(), provider: 'mymemory', isAi: false };
            }
        }
    } catch (_) {}

    throw new Error('Все серверы перевода временно недоступны. Попробуйте через несколько секунд.');
}

// --- Главный обработчик сообщений ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'fxnRaiseAllNow') {
        runBumpCycle()
            .then(res => sendResponse({ ok: true, summary: res || {} }))
            .catch(e => sendResponse({ ok: false, error: e && e.message }));
        return true;
    }

    if (request && request.action === 'FOXEN_FORWARD_THEME_INSTALL_TO_FUNPAY') {
        (async () => {
            try {
                const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
                // Всегда гарантированно сохраняем pendingThemeInstallModal в локальное хранилище
                const modalPayload = {
                    theme: request.theme,
                    themeName: request.themeName,
                    timestamp: Date.now()
                };
                if (api && api.storage && api.storage.local) {
                    try {
                        const p = api.storage.local.set({ pendingThemeInstallModal: modalPayload });
                        if (p && typeof p.then === 'function') await p;
                    } catch (_) {}
                }

                const tabs = await new Promise(r => chrome.tabs.query({ url: ['*://*.funpay.com/*', '*://funpay.com/*'] }, r));
                if (Array.isArray(tabs) && tabs.length > 0) {
                    const fpTab = tabs.find(t => t.active) || tabs[0];
                    if (fpTab && fpTab.id) {
                        await new Promise(r => chrome.tabs.update(fpTab.id, { active: true }, r));
                        if (fpTab.windowId) {
                            try { await new Promise(r => chrome.windows.update(fpTab.windowId, { focused: true }, r)); } catch(_) {}
                        }
                        chrome.tabs.sendMessage(fpTab.id, {
                            action: 'FOXEN_SHOW_THEME_INSTALL_MODAL',
                            theme: request.theme,
                            themeName: request.themeName
                        }, (resp) => {
                            if (chrome.runtime.lastError || !resp) {
                                // Если скрипты вкладки отвалились (например, при перезагрузке расширения разработчиком), перезагружаем вкладку для гарантированного подхвата модалки
                                try { chrome.tabs.reload(fpTab.id); } catch(_) {}
                            }
                        });
                        sendResponse({ ok: true, forwarded: true, tabId: fpTab.id });
                        return;
                    }
                }

                // Если вкладка FunPay не была открыта — открываем новую
                chrome.tabs.create({ url: 'https://funpay.com/', active: true }, (newTab) => {
                    sendResponse({ ok: true, createdTab: true, tabId: newTab?.id });
                });
            } catch(err) {
                sendResponse({ ok: false, error: err.message });
            }
        })();
        return true;
    }
    // 3.0: offscreen keepalive ping - receiving it resets the worker idle timer.
    if (request && request.target === 'background' && request.action === 'fxnEngineKeepalive') {
        onKeepalivePing();
        sendResponse({ ok: true });
        return true;
    }
    // Relay parse requests from content scripts to the offscreen document
    if (request.target === 'offscreen') {
        parseHtmlViaOffscreen(request.html, request.action)
            .then(result => sendResponse(result))
            .catch(() => sendResponse(null));
        return true;
    }

    // 3.0: Background image send (ported from Foxen upload_image + send_image).
    // Uploads the image to FunPay, then sends it via the runner with image_id - entirely
    // in the background, so it never touches the visible chat input.
    if (request.action === 'fxnSendImage') {
        (async () => {
            try {
                const result = await sendChatImageInBackground(request.chatId, request.dataUrl, request.chatName, request.csrfToken);
                sendResponse({ ok: true, result });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // 3.0: send plain text to a chat in the background (used for ordered template parts).
    if (request.action === 'fxnSendChatText') {
        (async () => {
            try {
                let auth = await getAuthDetailsForBackground();
                let csrfToken = request.csrfToken || auth.csrf_token;
                if (!csrfToken) {
                    auth = await getAuthDetailsForBackground(true);
                    csrfToken = request.csrfToken || auth.csrf_token;
                }
                if (!csrfToken) throw new Error('Нет авторизации.');

                const getHeaders = (baseHeaders = {}) => {
                    const h = { ...baseHeaders };
                    if (auth.golden_key && auth.golden_key !== 'active_session') {
                        h['cookie'] = auth.phpsessid
                            ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
                            : `golden_key=${auth.golden_key}`;
                    }
                    return h;
                };

                const postText = async (token) => {
                    const payload = {
                        objects: JSON.stringify([{ type: 'chat_node', id: String(request.chatId), tag: '00000000', data: { node: String(request.chatId), last_message: -1, content: '' } }]),
                        request: JSON.stringify({ action: 'chat_message', data: { node: String(request.chatId), last_message: -1, content: request.text } }),
                        csrf_token: token
                    };
                    const res = await fetch('https://funpay.com/runner/', {
                        method: 'POST',
                        credentials: 'include',
                        headers: getHeaders({
                            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'x-requested-with': 'XMLHttpRequest'
                        }),
                        body: new URLSearchParams(payload)
                    });
                    const json = await res.json().catch(() => null);
                    return { res, json };
                };

                let { res, json } = await postText(csrfToken);
                if (!res.ok || json?.error) {
                    _authCache = null;
                    auth = await getAuthDetailsForBackground(true);
                    if (auth.csrf_token && auth.csrf_token !== csrfToken) {
                        const retry = await postText(auth.csrf_token);
                        res = retry.res;
                        json = retry.json;
                    }
                }

                if (!res.ok || json?.error) {
                    throw new Error(json?.msg || json?.error || `HTTP ${res.status}`);
                }
                sendResponse({ ok: true });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'FOXEN_GET_FUNPAY_PROFILE') {
        (async () => {
            try {
                const api = typeof browser !== 'undefined' ? browser : chrome;

                // --- ШАГ 1: Поиск открытых вкладок FunPay и приоритетный парсинг активной вкладки ---
                let parsedFromTab = null;

                const queryTabs = () => new Promise(resolve => {
                    if (!chrome.tabs || !chrome.tabs.query) return resolve([]);
                    chrome.tabs.query({ url: ['*://funpay.com/*', '*://*.funpay.com/*'] }, tabs => {
                        if (chrome.runtime.lastError || !tabs) return resolve([]);
                        resolve(tabs);
                    });
                });

                const fpTabs = await queryTabs();
                console.log('[Foxen BG] Найдено открытых вкладок FunPay:', fpTabs.length);

                if (fpTabs && fpTabs.length > 0) {
                    // Приоритет выбора вкладки:
                    // 1. Активная вкладка в текущем активном окне
                    // 2. Любая активная вкладка в любом окне
                    // 3. Последняя использованная / любая открытая вкладка FunPay
                    const targetTab = fpTabs.find(t => t.active && t.highlighted)
                        || fpTabs.find(t => t.active)
                        || fpTabs[0];

                    console.log('[Foxen BG] Выбрана целевая вкладка FunPay:', targetTab.id, targetTab.url);

                    // 1a. Пробуем получить через sendMessage в content_script этой вкладки
                    const msgResult = await new Promise(resolve => {
                        const tId = setTimeout(() => resolve(null), 1200);
                        chrome.tabs.sendMessage(targetTab.id, { action: 'FOXEN_PARSE_ACTIVE_PROFILE' }, resp => {
                            clearTimeout(tId);
                            if (chrome.runtime.lastError || !resp || !resp.ok) return resolve(null);
                            resolve(resp.profile);
                        });
                    });

                    if (msgResult && msgResult.userId) {
                        console.log('[Foxen BG] Успешно получен профиль через sendMessage из вкладки FunPay:', msgResult.username, msgResult.userId);
                        parsedFromTab = msgResult;
                    }

                    // 1b. Если sendMessage не ответил (скрипт не успел инициализироваться), выполняем executeScript
                    if (!parsedFromTab && chrome.tabs && chrome.tabs.executeScript) {
                        const execResult = await new Promise(resolve => {
                            const tId = setTimeout(() => resolve(null), 2000);
                            function extractFunPayTabProfile() {
                                try {
                                    // 1. Ссылка на профиль из шапки
                                    const userLink = document.querySelector('.user-link-dropdown[href*="/users/"], .navbar-right a[href*="/users/"], a.user-link[href*="/users/"]');
                                    let userId = null;
                                    if (userLink) {
                                        const href = userLink.getAttribute('href') || '';
                                        const m = href.match(/\/users\/(\d+)/);
                                        if (m) userId = m[1];
                                    }

                                    // 2. data-app-data на body
                                    let appData = null;
                                    try {
                                        const raw = document.body && document.body.dataset && document.body.dataset.appData;
                                        if (raw) {
                                            const parsed = JSON.parse(raw);
                                            appData = Array.isArray(parsed) ? parsed[0] : parsed;
                                        }
                                    } catch (_) {}

                                    if (!userId && appData && appData.userId) {
                                        userId = String(appData.userId);
                                    }

                                    if (!userId) {
                                        return { loggedIn: false, error: 'Not logged in' };
                                    }

                                    let username = '';
                                    const nameEl = document.querySelector('.user-link-name, .navbar-right .user-link-name, a.user-link-dropdown .user-link-name, .media-user-name');
                                    if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
                                        username = nameEl.textContent.trim();
                                    } else if (appData && (appData.userName || appData.username)) {
                                        username = appData.userName || appData.username;
                                    } else {
                                        username = 'User #' + userId;
                                    }

                                    let avatarUrl = '';
                                    const avEl = document.querySelector('.user-link-dropdown .avatar-photo, .navbar-right .avatar-photo, .avatar-photo');
                                    if (avEl) {
                                        const bg = avEl.style && avEl.style.backgroundImage ? avEl.style.backgroundImage : window.getComputedStyle(avEl).backgroundImage;
                                        if (bg && bg !== 'none') {
                                            const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
                                            if (m) avatarUrl = m[1];
                                        }
                                        if (!avatarUrl && avEl.getAttribute('src')) {
                                            avatarUrl = avEl.getAttribute('src');
                                        }
                                    }
                                    if (!avatarUrl && appData && appData.avatar) {
                                        avatarUrl = appData.avatar;
                                    }

                                    let bannerUrl = '';
                                    const bannerAttr = document.querySelector('[data-fxn-banner]');
                                    if (bannerAttr && bannerAttr.getAttribute('data-fxn-banner')) {
                                        bannerUrl = bannerAttr.getAttribute('data-fxn-banner');
                                    } else {
                                        const coverEl = document.querySelector('.fxn-cover-pic, .profile-cover-img');
                                        if (coverEl) {
                                            const bg = coverEl.style && coverEl.style.backgroundImage ? coverEl.style.backgroundImage : window.getComputedStyle(coverEl).backgroundImage;
                                            const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
                                            if (m) bannerUrl = m[1];
                                        }
                                    }

                                    let registeredAt = '';
                                    const regMatch = document.body && document.body.textContent && document.body.textContent.match(/(?:На сайте с|Зарегистрирован(?:а)?)\s+([0-9]+\s+[а-яА-Яa-zA-Z]+\s+[0-9]{4})/i);
                                    if (regMatch) registeredAt = regMatch[1];

                                    return {
                                        loggedIn: true,
                                        userId: String(userId),
                                        username: String(username),
                                        avatarUrl: avatarUrl || '',
                                        bannerUrl: bannerUrl || '',
                                        registeredAt: registeredAt || ''
                                    };
                                } catch(e) {
                                    return { loggedIn: false, error: e.message };
                                }
                            }

                            const code = '(' + extractFunPayTabProfile.toString() + ')()';

                            chrome.tabs.executeScript(targetTab.id, { code }, results => {
                                clearTimeout(tId);
                                if (chrome.runtime.lastError || !results || !results[0]) return resolve(null);
                                resolve(results[0]);
                            });
                        });

                        if (execResult && execResult.loggedIn && execResult.userId) {
                            console.log('[Foxen BG] Успешно спарсен профиль через executeScript из вкладки FunPay:', execResult.username, execResult.userId);
                            parsedFromTab = execResult;
                        }
                    }
                }

                let userId = parsedFromTab ? parsedFromTab.userId : null;
                let username = parsedFromTab ? parsedFromTab.username : null;
                let avatarUrl = parsedFromTab ? parsedFromTab.avatarUrl : '';
                let bannerUrl = parsedFromTab ? parsedFromTab.bannerUrl : '';
                let registeredAt = parsedFromTab ? parsedFromTab.registeredAt : '';

                // --- ШАГ 2: Если вкладка не открыта или не вернула userId — резервный прямой fetch к сессии FunPay ---
                if (!userId) {
                    console.log('[Foxen BG] Вкладка FunPay не дала userId, выполняем запрос к активной сессии funpay.com...');
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
                    const fetchOptions = { credentials: 'include', cache: 'no-store' };
                    if (controller) fetchOptions.signal = controller.signal;

                    const res = await fetch('https://funpay.com/', fetchOptions);
                    if (timeoutId) clearTimeout(timeoutId);

                    if (!res.ok) {
                        sendResponse({ ok: false, error: 'FunPay недоступен' });
                        return;
                    }

                    const html = await res.text();
                    const userMatch = html.match(/href="https?:\/\/funpay\.com\/users\/(\d+)\/"[^>]*class="[^"]*user-link-dropdown[^"]*"/i)
                        || html.match(/class="[^"]*user-link-dropdown[^"]*"[^>]*href="https?:\/\/funpay\.com\/users\/(\d+)\/"/i)
                        || html.match(/\/users\/(\d+)\//i);

                    if (!userMatch) {
                        sendResponse({ ok: false, error: 'Вы не авторизованы на FunPay. Откройте funpay.com и войдите в аккаунт.' });
                        return;
                    }

                    userId = userMatch[1];
                    const nameMatch = html.match(/class="user-link-name"[^>]*>([^<]+)</i) || html.match(/class="media-user-name"[^>]*>([^<]+)</i);
                    username = nameMatch ? nameMatch[1].trim() : `User #${userId}`;
                }

                // --- ШАГ 3: Догрузка аватара, баннера и даты регистрации со страницы профиля (если отсутствуют) ---
                if (!avatarUrl || !bannerUrl || !registeredAt) {
                    try {
                        const pRes = await fetch(`https://funpay.com/users/${userId}/`, { credentials: 'include', cache: 'no-store' });
                        if (pRes.ok) {
                            const pHtml = await pRes.text();

                            if (!avatarUrl) {
                                const avMatch = pHtml.match(/class="avatar-photo"[^>]*style="background-image:\s*url\(([^)]+)\)/i);
                                if (avMatch) avatarUrl = avMatch[1].replace(/['"]/g, '').replace(/&quot;/g, '').trim();
                            }

                            if (!bannerUrl) {
                                const bannerAttr = pHtml.match(/data-fxn-banner="([^"]+)"/i);
                                if (bannerAttr) {
                                    bannerUrl = bannerAttr[1].trim();
                                } else {
                                    const coverMatch = pHtml.match(/class="fxn-cover-pic"[^>]*style="background-image:\s*url\(([^)]+)\)/i)
                                        || pHtml.match(/class="profile-cover-img"[^>]*style="background-image:\s*url\(([^)]+)\)/i);
                                    if (coverMatch) bannerUrl = coverMatch[1].replace(/['"]/g, '').replace(/&quot;/g, '').trim();
                                }
                            }

                            if (!registeredAt) {
                                const regMatch = pHtml.match(/(?:На сайте с|Зарегистрирован(?:а)?)\s+([0-9]+\s+[а-яА-Яa-zA-Z]+\s+[0-9]{4})/i)
                                    || pHtml.match(/([0-9]+\s+[а-яА-Яa-zA-Z]+\s+[0-9]{4})/i);
                                if (regMatch) registeredAt = regMatch[1];
                            }
                        }
                    } catch(e) {
                        console.warn('[Foxen BG] Ошибка дозапроса страницы профиля:', e);
                    }
                }

                // --- ШАГ 4: Поиск кастомного баннера расширения (bannerId) ---
                try {
                    const { fxnProfileDescrCache, fxnBannersCatalogCache } = await api.storage.local.get(['fxnProfileDescrCache', 'fxnBannersCatalogCache']);
                    const userDescr = fxnProfileDescrCache ? (fxnProfileDescrCache[userId] || fxnProfileDescrCache[String(userId)]) : null;
                    const bannerId = userDescr ? userDescr.bannerId : null;

                    if (bannerId) {
                        let extensionBannerUrl = null;
                        if (fxnBannersCatalogCache && fxnBannersCatalogCache.catalog && Array.isArray(fxnBannersCatalogCache.catalog.banners)) {
                            const found = fxnBannersCatalogCache.catalog.banners.find(b => b.id === bannerId);
                            if (found && found.url) extensionBannerUrl = found.url;
                        }

                        if (!extensionBannerUrl) {
                            if (bannerId.startsWith('http://') || bannerId.startsWith('https://')) {
                                extensionBannerUrl = bannerId;
                            } else if (/\.(gif|png|jpg|jpeg|webp)$/i.test(bannerId)) {
                                extensionBannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}`;
                            } else if (['banner1', 'banner2', 'banner3', 'foxen_blackhole', 'foxen_blackhole2'].includes(bannerId) || bannerId.includes('anim') || bannerId.includes('gif')) {
                                extensionBannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}.gif`;
                            } else {
                                extensionBannerUrl = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bannerId}.jpg`;
                            }
                        }

                        if (extensionBannerUrl) {
                            bannerUrl = extensionBannerUrl;
                        }
                    }
                } catch(e) {
                    console.warn('[Foxen BG] Ошибка поиска баннера расширения:', e);
                }

                const profileData = {
                    userId: String(userId),
                    username: String(username),
                    avatarUrl: avatarUrl || 'https://funpay.com/img/layout/avatar.png',
                    bannerUrl: bannerUrl || 'https://funpay.com/img/layout/profile-header.jpg',
                    registeredAt: registeredAt || 'Не указано',
                    source: parsedFromTab ? 'active_tab' : 'live_session',
                    updatedAt: new Date().toISOString()
                };

                console.log('[Foxen BG] Успешно извлечен актуальный профиль FunPay:', profileData);

                // Синхронизируем кэш storage со свежим профилем активной вкладки
                await api.storage.local.set({ 
                    foxenUserProfile: profileData,
                    fpCurrentUserInfo: { userId: profileData.userId, username: profileData.username }
                });

                // Синхронизируем avatar_url в Supabase profiles для сайта
                if (avatarUrl && avatarUrl.startsWith('http') && !avatarUrl.includes('layout/avatar.png')) {
                    (async () => {
                        try {
                            const supabaseUrl = 'https://yoacfrbedwksnfksjjmv.supabase.co';
                            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';
                            const target = encodeURIComponent(userId);
                            const uTarget = encodeURIComponent(username);
                            await fetch(`${supabaseUrl}/rest/v1/profiles?or=(fp_user_id.eq.${target},fp_user.ilike.${uTarget})`, {
                                method: 'PATCH',
                                headers: {
                                    'apikey': apiKey,
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal'
                                },
                                body: JSON.stringify({
                                    avatar_url: avatarUrl,
                                    updated_at: new Date().toISOString()
                                })
                            });
                            console.log('[Foxen BG] avatar_url synced to Supabase profiles:', avatarUrl);
                        } catch(e) {}
                    })();
                }

                sendResponse({ ok: true, profile: profileData });
            } catch (e) {
                console.error('[Foxen BG] Ошибка FOXEN_GET_FUNPAY_PROFILE:', e);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // Generic Fetch Proxy for bypassing CSP (used by profile_descriptions.js & nickname_fx_renderer.js)
    if (request.action === 'fxnFetchProxy') {
        (async () => {
            try {
                const fetchOptions = {
                    credentials: 'omit',
                    ...(request.options || {})
                };
                const res = await fetch(request.url, fetchOptions);
                const text = await res.text();
                const headers = {};
                res.headers.forEach((val, key) => { headers[key] = val; });
                sendResponse({ ok: res.ok, status: res.status, statusText: res.statusText, text, headers });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // RMTHUB PROXY (bypasses CORS - content scripts can't fetch cross-origin)
    if (request.action === 'rmthubFetch') {
        (async () => {
            const API = 'https://api.foxen.site/api';
            try {
                const res = await fetch(`${API}/rmthub?username=${encodeURIComponent(request.username)}`);
                if (res.status === 404) { sendResponse({ ok: false, notFound: true }); return; }
                if (!res.ok) { sendResponse({ ok: false, status: res.status }); return; }
                const json = await res.json();
                if (json.error) { sendResponse({ ok: false, notFound: true }); return; }
                // Fetch avatar
                let avatar = 'https://funpay.com/img/layout/avatar.png';
                const uid = String(json.user?.id || '');
                if (uid) {
                    try {
                        const ar = await fetch(`${API}/avatar?user_id=${uid}`);
                        const aj = await ar.json();
                        if (aj.avatar && aj.avatar !== avatar) avatar = aj.avatar;
                    } catch (_) {}
                }
                sendResponse({ ok: true, data: json, avatar });
            } catch (e) {
                sendResponse({ ok: false, error: String(e) });
            }
        })();
        return true;
    }

    if (request.action === 'fetchDonaters') {
        sendResponse({ success: true, data: {} });
        return false;
    }

    // AI HANDLERS
    if (request.action === "getAIProcessedText") {
        fetchAIResponse(request.text, request.context, request.myUsername, request.type).then(sendResponse);
        return true;
    }
    if (request.action === "generateAILot") {
        fetchAILotGeneration(request.data).then(sendResponse);
        return true;
    }
    if (request.action === "translateLotText") {
        fetchAITranslation(request.data).then(sendResponse);
        return true;
    }
    if (request.action === "fxnTranslateText") {
        (async () => {
            try {
                const res = await fxnBackgroundTranslate(request.text, request.targetLang, request.sourceLang, request.useAi);
                sendResponse(res);
            } catch (e) {
                sendResponse({ success: false, error: e?.message || String(e) });
            }
        })();
        return true;
    }
    if (request.action === "getAIImageSettings") {
        fetchAIImageGeneration(request.prompt).then(sendResponse);
        return true;
    }
    if (request.action === "testAIProviderKey") {
        testAIProviderKey(request.provider, request.apiKey, request.model).then(sendResponse);
        return true;
    }

    // AUTOBUMP HANDLERS
    if (request.action === 'startAutoBump') {
        startAutoBump(request.cooldown).then(() => sendResponse({ success: true }));
        return true;
    }
    if (request.action === 'stopAutoBump') {
        stopAutoBump().then(() => sendResponse({ success: true }));
        return true;
    }
    if (request.action === 'getUserCategories') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.userId) throw new Error("Не удалось получить ID пользователя.");
                const userUrl = `https://funpay.com/users/${auth.userId}/`;
                const userPageResponse = await fetch(userUrl, { headers: { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` } });
                if (!userPageResponse.ok) throw new Error(`Ошибка сети: ${userPageResponse.status}`);
                const userPageHtml = await userPageResponse.text();
                const categories = await parseHtmlViaOffscreen(userPageHtml, 'parseUserCategories');
                sendResponse({success: true, data: categories});
            } catch (e) {
                console.error("Error in getUserCategories:", e);
                sendResponse({success: false, error: e.message}); 
            }
        })();
        return true;
    }
    
    // --- ИЗМЕНЕННЫЙ БЛОК: LOT IO HANDLERS ---
    if (request.action === 'getLotForExport') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                const editUrl = request.nodeId
                    ? `https://funpay.com/lots/offerEdit?node=${request.nodeId}&offer=${request.offerId}`
                    : `https://funpay.com/lots/offerEdit?offer=${request.offerId}`;
                const response = await fetchWithTabFallback(editUrl, {
                    credentials: 'include',
                    headers: { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` }
                });
                if (!response.ok) throw new Error(`Network Error: ${response.status}`);
                const html = await response.text();
                const data = await parseHtmlViaOffscreen(html, 'parseLotEditPage');
                if (!data) throw new Error('Не удалось разобрать форму лота.');
                if (!data.node_id && request.nodeId) data.node_id = String(request.nodeId);
                delete data.csrf_token;
                delete data.csrf;
                data.offer_id = '0';
                data.location = 'trade';
                sendResponse({ success: true, data: data });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // FIX 2.9.1: импорт СВОИХ лотов. Раньше превью своих лотов шло через cloneGetSource,
    // который читает ПУБЛИЧНУЮ страницу (без payment_msg/secrets) и переключает локаль.
    // Здесь читаем форму offerEdit владельца НАПРЯМУЮ (одна загрузка, без смены локали) -
    // там есть ВСЁ: цена, сообщение покупателю (ru/en), товары автовыдачи, галка автовыдачи.
    if (request.action === 'getOwnLotFull') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.golden_key) throw new Error('Не авторизован (нет golden_key).');
                const offerId = request.offerId;
                if (!offerId) throw new Error('Не передан ID лота.');

                // node не обязателен: offerEdit?offer=ID сам отдаёт нужную форму
                const editUrl = request.nodeId
                    ? `https://funpay.com/lots/offerEdit?node=${request.nodeId}&offer=${offerId}`
                    : `https://funpay.com/lots/offerEdit?offer=${offerId}`;
                const resp = await fetchWithTabFallback(editUrl, {
                    credentials: 'include',
                    headers: { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` }
                });
                if (!resp.ok) throw new Error(`Ошибка загрузки лота: ${resp.status}`);
                const html = await resp.text();
                const data = await parseHtmlViaOffscreen(html, 'parseLotEditPage');
                if (!data) throw new Error('Не удалось разобрать форму лота.');

                // Формируем source для превью импорта из полного набора полей формы.
                const g = (k) => (data[k] != null ? data[k] : '');
                const source = {
                    isOwn: true,
                    offerId: String(offerId),
                    nodeId: data.node_id || request.nodeId || '',
                    summary_ru: g('fields[summary][ru]'),
                    summary_en: g('fields[summary][en]'),
                    desc_ru: g('fields[desc][ru]'),
                    desc_en: g('fields[desc][en]'),
                    payment_msg_ru: g('fields[payment_msg][ru]'),
                    payment_msg_en: g('fields[payment_msg][en]'),
                    rawPrice: g('price'),
                    amount: g('amount'),
                    secrets: g('secrets'),
                    autoDelivery: !!data.auto_delivery,
                    fullData: data    // полный набор для вставки/импорта без потерь
                };
                sendResponse({ success: true, source });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // =====================================================================================
    // 3.0 SERVER-SIDE LOT CLONING - фоновые обработчики
    // -------------------------------------------------------------------------------------
    // cloneGetSource:  читает публичную страницу чужого лота и (если найден node) сразу
    //                  строит черновик полей на основе НАШЕЙ пустой формы offerEdit?node=...
    // cloneBuildFields: то же построение полей отдельно (если node меняется в UI).
    // cloneCreateLot:  собирает финальный payload и постит lots/offerSave (offer_id=0).
    // =====================================================================================
    if (request.action === 'cloneGetSource') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.golden_key) throw new Error('Не авторизован (нет golden_key).');

                const offerId = request.offerId;
                if (!offerId) throw new Error('Не передан ID лота.');

                const ck = { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` };
                const waitIfBatch = async () => {}; // Паузы между лотами контролируются вызывающим процессом

                let ownLotData = null;
                let rawPrice = '';
                let priceCurrency = '';
                let priceAlreadyNet = false;
                let discoveredNodeId = null;

                // 1) Сначала пробуем offerEdit (если это СВОЙ лот - там есть абсолютно всё без угадываний)
                try {
                    const edResp = await fetchWithTabFallback(
                        `https://funpay.com/lots/offerEdit?offer=${offerId}&location=offer`,
                        { credentials: 'include', headers: ck });
                    if (edResp.ok) {
                        const edHtml = await edResp.text();
                        const pr = await parseHtmlViaOffscreen(edHtml, 'parseOfferEditPrice');
                        if (pr) {
                            if (pr.price) { rawPrice = pr.price; priceCurrency = pr.currency || priceCurrency; priceAlreadyNet = true; }
                            if (pr.nodeId && /^\d+$/.test(pr.nodeId)) discoveredNodeId = pr.nodeId;
                        }
                        const parsedFull = await parseHtmlViaOffscreen(edHtml, 'parseLotEditPage');
                        if (parsedFull && (parsedFull.node_id || discoveredNodeId)) {
                            ownLotData = parsedFull;
                        }
                    }
                } catch (_) {}

                // Если это свой лот — сразу формируем ответ БЕЗ лишних сетевых запросов к публичной странице
                if (ownLotData && (ownLotData.node_id || discoveredNodeId)) {
                    const finalNodeId = String(ownLotData.node_id || discoveredNodeId || '');
                    const fields = { ...ownLotData };
                    fields.offer_id = '0';
                    fields.node_id = finalNodeId;
                    fields.active = 'on';

                    let finalPrice = null;
                    if (rawPrice) {
                        const rawNum = parseFloat(String(rawPrice).replace(',', '.'));
                        if (!Number.isNaN(rawNum) && rawNum > 0) finalPrice = rawNum;
                    }

                    const source = {
                        isOwn: true,
                        offerId: String(offerId),
                        nodeId: finalNodeId,
                        summary: ownLotData['fields[summary][ru]'] || '',
                        summary_ru: ownLotData['fields[summary][ru]'] || '',
                        desc_ru: ownLotData['fields[desc][ru]'] || '',
                        summary_en: ownLotData['fields[summary][en]'] || '',
                        desc_en: ownLotData['fields[desc][en]'] || '',
                        payment_msg_ru: ownLotData['fields[payment_msg][ru]'] || '',
                        payment_msg_en: ownLotData['fields[payment_msg][en]'] || '',
                        secrets: ownLotData['secrets'] || '',
                        autoDelivery: !!ownLotData['auto_delivery'],
                        enDiffers: !!(ownLotData['fields[summary][en]'] || ownLotData['fields[desc][en]']),
                        rawPrice: rawPrice || ownLotData['price'] || '',
                        priceCurrency: priceCurrency || 'rub',
                        finalPrice: finalPrice,
                        categoryName: ownLotData.categoryName || '',
                        amount: ownLotData['amount'] || '1'
                    };

                    sendResponse({ success: true, source, fields, formError: null, csrf: auth.csrf_token });
                    return;
                }

                // 2) Загружаем публичную страницу лота (только для чужих лотов)
                let ruResp;
                try {
                    ruResp = await fxnFetchResilient(`https://funpay.com/lots/offer?id=${offerId}`, { credentials: 'include', headers: ck });
                } catch (err) {
                    const msg = String(err?.message || err);
                    if (msg.includes('429')) throw new Error('429 (Слишком много запросов)');
                    throw new Error(msg || 'FunPay не отвечает (таймаут сети)');
                }
                if (ruResp.status === 429) throw new Error('429 (Слишком много запросов)');
                if (ruResp.status >= 500) throw new Error(`FunPay вернул ошибку сервера (${ruResp.status}). Повторите позже.`);
                if (!ruResp.ok) throw new Error(`Ошибка загрузки лота: ${ruResp.status}`);
                const ruHtml = await ruResp.text();
                const ru = await parseHtmlViaOffscreen(ruHtml, 'parsePublicLotForClone');
                if (!ru) throw new Error('Не удалось разобрать страницу лота.');
                if (ru.notFound) throw new Error('Предложение не найдено.');

                if (discoveredNodeId) ru.nodeId = discoveredNodeId;

                // Цена с публичной страницы (если не взята из offerEdit)
                if (!rawPrice && ru.price && ru.priceIsSellerNet) {
                    rawPrice = String(ru.price);
                    priceCurrency = ru.priceCurrencyHint || 'rub';
                    priceAlreadyNet = true;
                }

                if (!rawPrice && ru.sellerId) {
                    try {
                        await waitIfBatch();
                        const upResp = await fxnFetchResilient(`https://funpay.com/users/${ru.sellerId}/`, { credentials: 'include', headers: ck });
                        if (upResp.ok) {
                            const upHtml = await upResp.text();
                            const pr = await parseHtmlViaOffscreen(upHtml, 'parseSellerLotPrice', { offerId });
                            if (pr && pr.price) { rawPrice = pr.price; priceCurrency = pr.currency || ''; }
                        }
                    } catch (_) {}
                }

                const source = {
                    ...ru,
                    nodeId: ru.nodeId || (ownLotData && ownLotData.node_id) || '',
                    summary_ru: (ownLotData && ownLotData['fields[summary][ru]']) || ru.summary || '',
                    desc_ru: (ownLotData && ownLotData['fields[desc][ru]']) || ru.description || '',
                    summary_en: (ownLotData && ownLotData['fields[summary][en]']) || '',
                    desc_en: (ownLotData && ownLotData['fields[desc][en]']) || '',
                    payment_msg_ru: (ownLotData && ownLotData['fields[payment_msg][ru]']) || '',
                    payment_msg_en: (ownLotData && ownLotData['fields[payment_msg][en]']) || '',
                    secrets: (ownLotData && ownLotData['secrets']) || '',
                    autoDelivery: ownLotData ? !!ownLotData['auto_delivery'] : false,
                    enDiffers: !!(ownLotData && (ownLotData['fields[summary][en]'] || ownLotData['fields[desc][en]'])),
                    rawPrice,
                    priceCurrency,
                    matchAttributes: Array.from(new Set((ru.attributes || []).map(a => String(a).toLowerCase()))),
                    matchPairs: ru.attributePairs || []
                };

                let fields = null;
                let formError = null;

                if (ownLotData && (ownLotData.node_id || source.nodeId)) {
                    // Свой лот: форма уже разобрана идеально
                    fields = { ...ownLotData };
                    fields.offer_id = '0';
                    fields.node_id = String(ownLotData.node_id || source.nodeId);
                    fields.active = 'on';
                    if (rawPrice) {
                        const rawNum = parseFloat(String(rawPrice).replace(',', '.'));
                        source.finalPrice = (!Number.isNaN(rawNum) && rawNum > 0) ? rawNum : null;
                    }
                } else if (source.nodeId && !source.isChips) {
                    // Чужой лот: строим форму через solveCloneForm
                    try {
                        await waitIfBatch();
                        fields = await cloneBuildFieldsInternal(auth, source.nodeId, source.matchAttributes, source.matchPairs);

                        if (rawPrice) {
                            const rawNum = parseFloat(String(rawPrice).replace(',', '.'));
                            if (priceAlreadyNet) {
                                source.finalPrice = (!Number.isNaN(rawNum) && rawNum > 0) ? rawNum : null;
                            } else {
                                try {
                                    const net = await cloneCalcNetPrice(auth, source.nodeId, rawNum, priceCurrency);
                                    source.finalPrice = (net != null && !Number.isNaN(net) && net > 0) ? net : ((!Number.isNaN(rawNum) && rawNum > 0) ? rawNum : null);
                                } catch (_) {
                                    source.finalPrice = (!Number.isNaN(rawNum) && rawNum > 0) ? rawNum : null;
                                }
                            }
                        }
                    } catch (e) {
                        formError = e.message;
                    }
                }

                sendResponse({ success: true, source, fields, formError, csrf: auth.csrf_token });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'cloneBuildFields') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.golden_key) throw new Error('Не авторизован.');
                const fields = await cloneBuildFieldsInternal(auth, request.nodeId, request.attributes || []);
                sendResponse({ success: true, fields });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'cloneUploadImages') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.golden_key) throw new Error('Не авторизован.');
                const urls = Array.isArray(request.urls) ? request.urls : [];
                if (!urls.length) { sendResponse({ success: true, ids: [] }); return; }

                const ids = [];
                const errors = [];
                for (const url of urls) {
                    try {
                        // 1) скачиваем картинку (публичный sfunpay.com)
                        const imgResp = await fetch(url, { headers: { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` } });
                        if (!imgResp.ok) throw new Error(`download ${imgResp.status}`);
                        const blob = await imgResp.blob();

                        // 2) перезаливаем на FunPay как изображение лота - file/addOfferImage,
                        //    поля file + file_id=0, как в Account.upload_image(type_="offer").
                        const fd = new FormData();
                        const ext = (blob.type && blob.type.includes('png')) ? 'png' : 'jpg';
                        fd.append('file', blob, `image.${ext}`);
                        fd.append('file_id', '0');

                        const upResp = await fetch('https://funpay.com/file/addOfferImage', {
                            method: 'POST',
                            headers: {
                                'Accept': '*/*',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`
                            },
                            body: fd
                        });
                        if (!upResp.ok) {
                            let m = `upload ${upResp.status}`;
                            try { const j = await upResp.json(); if (j.msg) m = j.msg; } catch (_) {}
                            throw new Error(m);
                        }
                        const j = await upResp.json();
                        const fileId = j && j.fileId;
                        if (!fileId) throw new Error('нет fileId в ответе');
                        ids.push(parseInt(fileId, 10));
                    } catch (e) {
                        errors.push(`${url}: ${e.message}`);
                    }
                }
                sendResponse({ success: true, ids, errors });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'cloneCreateLot') {
        (async () => {
            try {
                let auth = await getAuthDetailsForBackground();
                if (!auth.csrf_token) {
                    auth = await getAuthDetailsForBackground(true);
                }
                if (!auth.csrf_token) throw new Error('Нет CSRF-токена.');

                const payload = { ...(request.fields || {}) };
                payload.offer_id = '0';
                if (request.location) payload.location = request.location;

                const postCreate = async (curAuth) => {
                    payload.csrf_token = curAuth.csrf_token;
                    const body = new URLSearchParams(payload);
                    return await fetchWithTabFallback('https://funpay.com/lots/offerSave', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-Csrf-Token': curAuth.csrf_token,
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Cookie': curAuth.phpsessid ? `golden_key=${curAuth.golden_key}; PHPSESSID=${curAuth.phpsessid}` : `golden_key=${curAuth.golden_key}`
                        },
                        body
                    });
                };

                let response;
                try {
                    response = await postCreate(auth);
                } catch (netErr) {
                    throw new Error('FunPay не отвечает (возможно, у сайта временные неполадки — 502/таймаут). Лот мог НЕ создаться. Подождите минуту и проверьте список лотов перед повторной попыткой.');
                }
                if (response.status >= 500) {
                    throw new Error(`FunPay вернул ошибку сервера (${response.status}). Это проблема на стороне FunPay, не расширения. Лот мог не создаться — проверьте список лотов перед повтором.`);
                }

                let rawText = await response.text();
                let result = null;
                try { result = JSON.parse(rawText); } catch (_) {}

                const isCsrfErr = response.status === 400 || (result && (result.error === 1 || result.error === true) && /обновит|csrf|token|session|auth/i.test(result.msg || ''));
                if (isCsrfErr) {
                    _authCache = null;
                    _authCacheTime = 0;
                    const freshAuth = await getAuthDetailsForBackground(true);
                    if (freshAuth && freshAuth.csrf_token) {
                        auth = freshAuth;
                        response = await postCreate(auth);
                        rawText = await response.text();
                        try { result = JSON.parse(rawText); } catch (_) {}
                    }
                }

                if (!result) throw new Error(`FunPay вернул не-JSON ответ (${response.status}): ${rawText.slice(0, 80)}`);

                const hasError = result && (result.error === 1 || result.error === true ||
                    (result.errors && (Array.isArray(result.errors) ? result.errors.length : Object.keys(result.errors).length)));

                if (result && !hasError) {
                    // пробуем вытащить ID нового лота
                    let newId = null;
                    const txt = JSON.stringify(result);
                    let m = txt.match(/"offer_id"\s*:\s*"?(\d+)"?/) || txt.match(/id=(\d+)/);
                    if (m) newId = m[1];
                    if (!newId && result.url) {
                        const um = String(result.url).match(/id=(\d+)/);
                        if (um) newId = um[1];
                    }
                    sendResponse({ success: true, newId });
                } else {
                    let msg = result.msg || 'Ошибка сохранения лота';
                    if (result.errors) {
                        const parts = Array.isArray(result.errors)
                            ? result.errors.map(e => Array.isArray(e) ? e[1] : e)
                            : Object.values(result.errors);
                        if (parts.length) msg = parts.join('; ');
                    }
                    throw new Error(msg);
                }
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'cloneDeleteLot') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                if (!auth.csrf_token) throw new Error('Нет CSRF-токена.');
                if (!request.offerId) throw new Error('Не передан ID лота.');
                const body = new URLSearchParams({
                    offer_id: String(request.offerId),
                    deleted: '1',
                    csrf_token: auth.csrf_token
                });
                const response = await fetchWithTabFallback('https://funpay.com/lots/offerSave', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`
                    },
                    body
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // 2.9: Save/update a single lot (used by bulk editor)
    if (request.action === 'saveSingleLot') {
        (async () => {
            try {
                let auth = await getAuthDetailsForBackground();
                if (!auth.csrf_token) {
                    auth = await getAuthDetailsForBackground(true);
                }
                if (!auth.csrf_token) throw new Error('Нет CSRF токена');

                let payload = { ...request.data };

                // Clean up payload: remove empty deleted or falsy active
                if (payload.deleted === '' || payload.deleted === '0' || !payload.deleted) {
                    delete payload.deleted;
                }
                if (payload.active === '' || payload.active === '0' || payload.active === false) {
                    delete payload.active;
                }

                // If the caller only sent a partial payload (e.g. the inline price editor
                // sends just { offer_id, price }), FunPay's offerSave would blank every
                // field that isn't present. Detect that and merge onto the full current
                // form so we only change what was intended.
                const looksPartial = !Object.keys(payload).some(k => k.startsWith('fields['));
                if (looksPartial && payload.offer_id && payload.offer_id !== '0') {
                    try {
                        let nodeId = request.nodeId || payload.node_id;
                        const editUrl = nodeId
                            ? `https://funpay.com/lots/offerEdit?node=${nodeId}&offer=${payload.offer_id}`
                            : `https://funpay.com/lots/offerEdit?offer=${payload.offer_id}`;
                        const r = await fetchWithTabFallback(editUrl, {
                            credentials: 'include',
                            headers: { 'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}` }
                        });
                        if (r.ok) {
                            const html = await r.text();
                            const full = await parseHtmlViaOffscreen(html, 'parseLotEditPage');
                            if (full && typeof full === 'object') {
                                payload = { ...full, ...payload }; // overrides win
                                if (payload.deleted === '' || payload.deleted === '0' || !payload.deleted) {
                                    delete payload.deleted;
                                }
                            }
                        }
                    } catch (mergeErr) {
                        console.warn('saveSingleLot: could not merge full form:', mergeErr.message);
                    }
                }

                const postSave = async (curAuth) => {
                    const cleanData = {};
                    for (const [k, v] of Object.entries(payload)) {
                        if (v !== undefined && v !== null) {
                            // Don't send deleted if not deleting
                            if (k === 'deleted' && (v === '' || v === '0' || !v)) continue;
                            // Don't send empty active
                            if (k === 'active' && (v === '' || v === '0' || v === false)) continue;
                            cleanData[k] = String(v);
                        }
                    }
                    cleanData.csrf_token = curAuth.csrf_token;
                    const formData = new URLSearchParams(cleanData);

                    return await fetchWithTabFallback('https://funpay.com/lots/offerSave', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-Csrf-Token': curAuth.csrf_token,
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Cookie': curAuth.phpsessid ? `golden_key=${curAuth.golden_key}; PHPSESSID=${curAuth.phpsessid}` : `golden_key=${curAuth.golden_key}`
                        },
                        body: formData
                    });
                };

                let response = await postSave(auth);
                let rawText = await response.text();
                let result = null;
                try { result = JSON.parse(rawText); } catch (_) {}

                // CSRF / session expiration check and retry
                const isCsrfErr = response.status === 400 && (!result || result.error === 1 || result.error === true) &&
                    (!result?.msg || /обновит|csrf|token|session|auth|сесси/i.test(result.msg || ''));

                if (isCsrfErr) {
                    _authCache = null;
                    _authCacheTime = 0;
                    const freshAuth = await getAuthDetailsForBackground(true);
                    if (freshAuth && freshAuth.csrf_token) {
                        auth = freshAuth;
                        response = await postSave(auth);
                        rawText = await response.text();
                        try { result = JSON.parse(rawText); } catch (_) {}
                    }
                }

                if (!result) {
                    if (!response.ok) throw new Error(`HTTP ${response.status}: ${rawText.slice(0, 100)}`);
                    throw new Error(`Некорректный ответ FunPay: ${rawText.slice(0, 100)}`);
                }

                const hasError = result && (result.error === 1 || result.error === true ||
                    (result.errors && (Array.isArray(result.errors) ? result.errors.length : Object.keys(result.errors).length)));

                if (!hasError && (result.error === 0 || result.error === false || result.error === undefined)) {
                    sendResponse({ success: true, result });
                } else {
                    let msg = result.msg || '';
                    if (result.errors) {
                        const parts = Array.isArray(result.errors)
                            ? result.errors.map(e => Array.isArray(e) ? (e[1] || e[0]) : (typeof e === 'object' ? JSON.stringify(e) : String(e)))
                            : Object.entries(result.errors).map(([k, v]) => `${v}`);
                        if (parts.length) msg = (msg ? msg + ': ' : '') + parts.join('; ');
                    }
                    if (!msg) msg = `Ошибка сохранения (HTTP ${response.status})`;
                    throw new Error(msg);
                }
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // 2.9: Get unconfirmed (pending) balance
    if (request.action === 'getUnconfirmedBalance') {
        (async () => {
            try {
                const auth = await getAuthDetailsForBackground();
                const res = await fetch('https://funpay.com/orders/trade?status=paid', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Cookie': auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`
                    }
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                const data = await parseHtmlViaOffscreen(html, 'parseUnconfirmedBalance');
                sendResponse({ success: true, data });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'startLotImport') {
        (async () => {
            const importProcess = {
                name: request.fileName || `Импорт от ${new Date().toLocaleString()}`,
                state: 'running', // 'running', 'postponed'
                lots: request.lots.map(lot => ({ ...lot, status: 'pending', retries: 0, error: null })),
                currentIndex: 0
            };
            await fxnStorageSet({ [IMPORT_PROCESS_KEY]: importProcess });
            sendImportProgressUpdate(importProcess);
            sendResponse({ success: true });
            processNextLotImport();
        })();
        return true;
    }

    if (request.action === 'resumeLotImport') {
        (async () => {
             const { [IMPORT_PROCESS_KEY]: process } = await fxnStorageGet(IMPORT_PROCESS_KEY);
             if (process) {
                process.state = 'running'; // Меняем статус на "в процессе"
                // Сбрасываем счетчик попыток для всех лотов с ошибками
                process.lots.forEach(lot => {
                    if (lot.status === 'error') {
                        lot.retries = 0;
                        lot.status = 'pending';
                    }
                });
                await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
                sendResponse({ success: true });
                processNextLotImport(); // Запускаем процесс
             } else {
                sendResponse({ success: false, error: 'Процесс импорта не найден.' });
             }
        })();
        return true;
    }

    if (request.action === 'cancelLotImport') {
        fxnStorageRemove(IMPORT_PROCESS_KEY).then(() => sendResponse({success: true}));
        return true;
    }

    if (request.action === 'postponeLotImport') {
        (async () => {
            const { [IMPORT_PROCESS_KEY]: process } = await fxnStorageGet(IMPORT_PROCESS_KEY);
            if (process) {
                process.state = 'postponed';
                await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Процесс для откладывания не найден.' });
            }
        })();
        return true;
    }

    if (request.action === 'skipLotImportItem') {
        (async () => {
            const { [IMPORT_PROCESS_KEY]: process } = await fxnStorageGet(IMPORT_PROCESS_KEY);
            if (process && process.lots[request.index]) {
                const lot = process.lots[request.index];
                lot.status = 'skipped';
                lot.error = 'Пропущено пользователем';
                await fxnStorageSet({ [IMPORT_PROCESS_KEY]: process });
                sendImportProgressUpdate(process);
                
                // Если пропущенный лот был текущим, немедленно запускаем следующий
                if (process.currentIndex === request.index) {
                    processNextLotImport();
                }

                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Лот для пропуска не найден.' });
            }
        })();
        return true;
    }
    // --- КОНЕЦ ИЗМЕНЕННОГО БЛОКА ---

    if (request.action === 'getGoldenKey') {
        (async () => {
            const cookie = await fxnFindGoldenKey();
            sendResponse({ success: !!cookie, key: cookie ? cookie.value : null });
        })();
        return true;
    }
    if (request.action === 'setGoldenKey') {
        (async () => {
            try {
                if (!request.key) throw new Error('Пустой ключ аккаунта.');

                // 1) Снимаем ВСЕ golden_key куки для funpay.com (включая host-only и httpOnly).
                try {
                    const existing = await fxnGetAllCookies({ domain: 'funpay.com' });
                    for (const c of (existing || [])) {
                        if (c.name !== 'golden_key') continue;
                        const proto = c.secure ? 'https' : 'http';
                        const host = c.domain.replace(/^\./, '');
                        await fxnRemoveCookie({
                            url: `${proto}://${host}${c.path || '/'}`,
                            name: 'golden_key',
                            storeId: c.storeId
                        });
                    }
                } catch (_) {}

                // 2) Ставим новый golden_key.
                let setResult = await fxnSetCookie({
                    url: 'https://funpay.com/',
                    name: 'golden_key',
                    value: request.key,
                    domain: '.funpay.com',
                    path: '/',
                    secure: true,
                    sameSite: 'lax',
                    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
                });

                // Подстраховка: пробуем host-only вариант
                if (!setResult) {
                    setResult = await fxnSetCookie({
                        url: 'https://funpay.com/',
                        name: 'golden_key',
                        value: request.key,
                        path: '/',
                        secure: true,
                        sameSite: 'lax',
                        expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
                    });
                }

                if (!setResult) {
                    throw new Error('Не удалось записать куку аккаунта (cookies.set вернул null).');
                }

                // 3) Сбрасываем кэш авторизации — иначе processNextLotImport может
                //    использовать устаревший golden_key предыдущего аккаунта.
                _authCache = null;
                _authCacheTime = 0;

                // 4) Перезагружаем вкладку — FunPay выдаст/перепривяжет сессию под новый ключ.
                const tabId = sender.tab && sender.tab.id;
                if (tabId != null) {
                    try { (typeof browser !== 'undefined' ? browser : chrome).tabs.reload(tabId); } catch (_) {}
                }
                sendResponse({ success: true });
            } catch (e) {
                console.error('Foxen: setGoldenKey error:', e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }
    // ACCOUNT SNAPSHOT (avatar / balance / unread) для вкладки мультиаккаунтов
    if (request.action === 'getAccountSnapshot') {
        (async () => {
            try {
                const key = request.key;
                if (!key) { sendResponse({ ok: false, error: 'no key' }); return; }
                const snap = await fxnSnapshotForKey(key);
                sendResponse({ ok: true, snapshot: snap || {} });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // TELEGRAM HANDLERS
    if (request.action === 'telegramValidate') {
        (async () => {
            const res = await telegramValidateAndResolve(request.token);
            sendResponse(res);
        })();
        return true;
    }
    if (request.action === 'telegramTest') {
        (async () => {
            try {
                const r = await tgSendMessage('✅ Foxen подключён к этому чату. Уведомления и управление работают.');
                sendResponse({ ok: !!(r && r.ok), error: r && r.description });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    if (request.action === 'deleteCookiesAndReload') {
        (async () => {
            const allCookies = await (typeof browser !== 'undefined' ? browser : chrome).cookies.getAll({ url: "https://funpay.com" });
            for (const cookie of allCookies) {
                await (typeof browser !== 'undefined' ? browser : chrome).cookies.remove({ url: "https://funpay.com", name: cookie.name, storeId: cookie.storeId });
            }
            chrome.tabs.reload(sender.tab.id);
        })();
        return true;
    }
    
    // SALES STATS HANDLERS
    if (request.action === 'getSalesOrders') {
        (async () => {
            try {
                await FPTSalesDB.migrateFromLocalStorage(); // на случай первого запуска
                const orders = await FPTSalesDB.getAllAsArray();
                sendResponse({ success: true, orders });
            } catch (e) {
                sendResponse({ success: false, error: e.message, orders: [] });
            }
        })();
        return true;
    }
    if (request.action === 'getSalesCount') {
        (async () => {
            try {
                await FPTSalesDB.migrateFromLocalStorage();
                const c = await FPTSalesDB.count();
                sendResponse({ success: true, count: c });
            } catch (e) {
                sendResponse({ success: false, error: e.message, count: 0 });
            }
        })();
        return true;
    }
    if (request.action === 'updateSales') {
        runSalesUpdateCycle().then(() => sendResponse({success: true})).catch(e => sendResponse({success: false, error: e.message}));
        return true;
    }
    if (request.action === 'resetSalesStorage') {
        (async () => {
            try {
                await FPTSalesDB.clearAll();
                await FPTSalesDB.setMeta('migratedFromLocal', true); // не тянуть старьё обратно
                await storageRemove([
                    'foxenSalesData', 'foxenFirstOrderId', 'foxenLastOrderId', 'foxenSalesLastUpdate'
                ]);
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // PURCHASES STATS HANDLERS (зеркало продаж, отдельная база покупок)
    if (request.action === 'getPurchaseOrders') {
        (async () => {
            try {
                const orders = await FPTPurchasesDB.getAllAsArray();
                sendResponse({ success: true, orders });
            } catch (e) {
                sendResponse({ success: false, error: e.message, orders: [] });
            }
        })();
        return true;
    }
    if (request.action === 'getPurchaseCount') {
        (async () => {
            try {
                const c = await FPTPurchasesDB.count();
                sendResponse({ success: true, count: c });
            } catch (e) {
                sendResponse({ success: false, error: e.message, count: 0 });
            }
        })();
        return true;
    }
    if (request.action === 'updatePurchases') {
        runPurchasesUpdateCycle().then(() => sendResponse({success: true})).catch(e => sendResponse({success: false, error: e.message}));
        return true;
    }
    if (request.action === 'resetPurchasesStorage') {
        (async () => {
            try {
                await FPTPurchasesDB.clearAll();
                await storageRemove(['foxenPurchasesLastUpdate']);
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // FINANCE STATS HANDLERS (отдельная база финансов)
    if (request.action === 'getFinanceTxns') {
        (async () => {
            try {
                const txns = await FPTFinanceDB.getAllAsArray();
                sendResponse({ success: true, txns });
            } catch (e) {
                sendResponse({ success: false, error: e.message, txns: [] });
            }
        })();
        return true;
    }
    if (request.action === 'getFinanceCount') {
        (async () => {
            try {
                const c = await FPTFinanceDB.count();
                sendResponse({ success: true, count: c });
            } catch (e) {
                sendResponse({ success: false, error: e.message, count: 0 });
            }
        })();
        return true;
    }
    if (request.action === 'updateFinance') {
        runFinanceUpdateCycle().then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === 'resetFinanceStorage') {
        (async () => {
            try {
                await FPTFinanceDB.clearAll();
                await storageRemove(['foxenFinanceLastUpdate', 'foxenFinanceCount']);
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }



    // IMPORT & GLOBAL SEARCH HANDLERS
    if (request.action === 'getUserLotsList') {
        (async () => {
            try {
                const response = await fetch(`https://funpay.com/users/${request.userId}/`);
                const html = await response.text();
                const lots = await parseHtmlViaOffscreen(html, 'parseUserLotsList');
                sendResponse(lots);
            } catch (e) {
                sendResponse(null);
            }
        })();
        return true;
    }
    if (request.action === 'searchGames') {
        (async () => {
            try {
                const response = await fetch('https://funpay.com/games/promoFilter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
                    body: new URLSearchParams({ query: request.query })
                });
                const data = await response.json();
                const games = await parseHtmlViaOffscreen(data.html, 'parseGameSearchResults');
                sendResponse(games);
            } catch (e) {
                console.error("Error in searchGames:", e);
                sendResponse([]);
            }
        })();
        return true;
    }
    if (request.action === 'getCategoryList' || request.action === 'getLotList') {
        (async () => {
            try {
                const response = await fetch(request.url);
                const html = await response.text();
                const action = request.action === 'getCategoryList' ? 'parseCategoryPage' : 'parseLotListPage';
                const items = await parseHtmlViaOffscreen(html, action);
                sendResponse(items);
            } catch (e) {
                console.error(`Error in ${request.action}:`, e);
                sendResponse([]);
            }
        })();
        return true;
    }

    // ── Support / Tickets handlers ────────────────────────────────────────────
    if (request.action === 'supportGetTickets' || request.action === 'supportGetCategories' ||
        request.action === 'supportGetFields' || request.action === 'supportCreateTicket' ||
        request.action === 'getUnconfirmedOrders' || request.action === 'supportGetTicketDetails' ||
        request.action === 'supportAddComment' || request.action === 'supportCloseTicket') {
        (async () => {
            try {
                const gkCookie = await fxnFindGoldenKey();
                const phpCookie = await fxnFindPhpSessId();
                if (!gkCookie) { sendResponse({ success: false, error: 'Не авторизован на FunPay' }); return; }
                const baseCookie = `golden_key=${gkCookie.value}${phpCookie ? '; PHPSESSID=' + phpCookie.value : ''}`;
                const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
                const supportBase = 'https://support.funpay.com';

                async function sfetch(url, opts = {}) {
                    // SSO: first go through funpay.com/support/sso to get support session cookies
                    const resp = await fetch(url, {
                        ...opts,
                        headers: { ...(opts.headers || {}), 'Cookie': baseCookie, 'User-Agent': ua }
                    });
                    return resp;
                }

                async function sfetchSupport(url, opts = {}) {
                    // For support.funpay.com we need to do SSO first to get the session
                    const ssoResp = await fetch('https://funpay.com/support/sso?return_to=' + encodeURIComponent(url.replace(supportBase, '')), {
                        redirect: 'follow',
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua }
                    });
                    // The SSO sets a cookie on support.funpay.com - but we can't read cross-domain cookies
                    // Instead use the direct URL with the same golden_key (funpay SSO shares session)
                    const finalResp = await fetch(url, {
                        ...opts,
                        headers: { ...(opts.headers || {}), 'Cookie': baseCookie, 'User-Agent': ua }
                    });
                    return finalResp;
                }

                if (request.action === 'getUnconfirmedOrders') {
                    const r = await sfetch('https://funpay.com/orders/trade?state=paid');
                    const html = await r.text();
                    const ids = await parseHtmlViaOffscreen(html, 'parseOrdersPage');
                    sendResponse({ success: true, orderIds: (ids || []).slice(0, request.maxOrders || 5) });
                    return;
                }

                if (request.action === 'supportGetTickets') {
                    // FIX 2.9.1: грузим заявки ДВУМЯ наборами - status=all И status=active,
                    // постранично, затем объединяем по id. Причина: в выдаче status=all
                    // FunPay может показывать открытые заявки не на первой странице
                    // (порядок last_answered), и при ранней остановке пагинации активная
                    // заявка терялась - фильтр "Актуальные" оказывался пустым. Отдельная
                    // загрузка status=active гарантирует, что все открытые заявки в кэше.
                    const all = [];
                    const seen = new Set();
                    const MAX_PAGES = 30;

                    const loadStatus = async (status) => {
                        for (let page = 1; page <= MAX_PAGES; page++) {
                            let pageTickets = null;
                            try {
                                const r = await sfetchSupport(`${supportBase}/tickets?status=${status}&order=last_answered&page=${page}`);
                                if (!r.ok || r.status === 404) break;
                                const html = await r.text();
                                pageTickets = await parseHtmlViaOffscreen(html, 'parseSupportTickets');
                            } catch (pageErr) {
                                if (page === 1 && status === 'all') throw pageErr;
                                break;
                            }
                            if (!pageTickets || !pageTickets.length) break;
                            let added = 0;
                            for (const t of pageTickets) {
                                if (t && t.id != null && !seen.has(t.id)) {
                                    seen.add(t.id);
                                    all.push(t);
                                    added++;
                                }
                            }
                            if (added === 0) break;
                        }
                    };

                    await loadStatus('all');
                    // активные догружаем отдельно (их обычно немного - 1-2 страницы)
                    try { await loadStatus('active'); } catch (_) {}

                    sendResponse({ success: true, tickets: all });
                    return;
                }

                if (request.action === 'supportGetCategories') {
                    const r = await sfetchSupport(`${supportBase}/tickets/new`);
                    const html = await r.text();
                    const categories = await parseHtmlViaOffscreen(html, 'parseSupportCategories');
                    sendResponse({ success: true, categories: categories || [] });
                    return;
                }

                if (request.action === 'supportGetFields') {
                    const r = await sfetchSupport(`${supportBase}/tickets/new/${request.categoryId}`);
                    const html = await r.text();
                    const fields = await parseHtmlViaOffscreen(html, 'parseSupportFields');
                    sendResponse({ success: true, fields: fields || [] });
                    return;
                }

                if (request.action === 'supportCreateTicket') {
                    const { categoryId, fieldValues, message } = request;
                    const formResp = await sfetchSupport(`${supportBase}/tickets/new/${categoryId}`);
                    const formHtml = await formResp.text();
                    const token = await parseHtmlViaOffscreen(formHtml, 'parseSupportFormToken');
                    if (!token) { sendResponse({ success: false, error: 'Не удалось получить токен формы (возможно, не авторизован в ТП)' }); return; }
                    const params = new URLSearchParams();
                    Object.entries(fieldValues || {}).forEach(([k, v]) => { if (v) params.set(k, v); });
                    if (message) params.set('ticket[comment][body_html]', `<p>${message}</p>`);
                    params.set('ticket[comment][attachments]', '');
                    params.set('ticket[_token]', token);
                    const createResp = await fetch(`${supportBase}/tickets/create/${categoryId}`, {
                        method: 'POST',
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json', 'Referer': `${supportBase}/tickets/new/${categoryId}` },
                        body: params.toString()
                    });
                    const body = await createResp.text();
                    let ticketId = null;
                    try { ticketId = JSON.parse(body)?.action?.url?.split('/').pop(); } catch (_) {}
                    if (!createResp.ok && createResp.status >= 400) {
                        let errMsg = `Ошибка ${createResp.status}`;
                        try { errMsg = JSON.parse(body)?.error || errMsg; } catch (_) {}
                        sendResponse({ success: false, error: errMsg }); return;
                    }
                    sendResponse({ success: true, ticketId });
                    return;
                }


                if (request.action === 'supportGetTicketDetails') {
                    const r = await fetch(`${supportBase}/tickets/${request.ticketId}`, {
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua }
                    });
                    const html = await r.text();
                    const details = await parseHtmlViaOffscreen(html, 'parseTicketDetails');
                    sendResponse({ success: true, ...details });
                    return;
                }

                if (request.action === 'supportAddComment') {
                    const { ticketId, message, token } = request;
                    const params = new URLSearchParams();
                    params.set('add_comment[comment][body_html]', `<p>${message}</p>`);
                    params.set('add_comment[comment][attachments]', '');
                    params.set('add_comment[_token]', token);
                    const r = await fetch(`${supportBase}/tickets/${ticketId}/comments/create`, {
                        method: 'POST',
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json', 'Referer': `${supportBase}/tickets/${ticketId}` },
                        body: params.toString()
                    });
                    if (!r.ok) {
                        let err = `Ошибка ${r.status}`;
                        try { const b = await r.text(); err = JSON.parse(b)?.error || err; } catch(_) {}
                        sendResponse({ success: false, error: err }); return;
                    }
                    sendResponse({ success: true });
                    return;
                }

                if (request.action === 'supportCloseTicket') {
                    const { ticketId } = request;
                    // Get token from ticket page
                    const pageResp = await fetch(`${supportBase}/tickets/${ticketId}`, {
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua }
                    });
                    const pageHtml = await pageResp.text();
                    // Parse token: try close_ticket[_token] input, fallback to data-app-config csrfToken
                    let token = null;
                    const tokenMatch = pageHtml.match(/name="close_ticket\[_token\]"[^>]*value="([^"]+)"/);
                    if (tokenMatch) token = tokenMatch[1];
                    if (!token) {
                        const cfgMatch = pageHtml.match(/data-app-config="([^"]+)"/);
                        if (cfgMatch) {
                            try { token = JSON.parse(cfgMatch[1].replace(/&quot;/g, '"'))?.csrfToken || null; } catch(_) {}
                        }
                    }
                    if (!token) { sendResponse({ success: false, error: 'Не удалось получить токен' }); return; }
                    const closeResp = await fetch(`${supportBase}/tickets/${ticketId}/close`, {
                        method: 'POST',
                        headers: { 'Cookie': baseCookie, 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                        body: new URLSearchParams({ csrf_token: token }).toString()
                    });
                    sendResponse({ success: closeResp.ok });
                    return;
                }

                sendResponse({ success: false, error: 'Unknown action' });
            } catch (e) {
                console.error('[Foxen Support]', e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }
    return false;
});

// --- Обработчики будильников ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === BUMP_ALARM_NAME) {
        await runBumpCycle();
    }
    if (alarm.name === DISCORD_LOG_ALARM_NAME) {
        await runDiscordCheckCycle();
    }
    if (alarm.name === TELEGRAM_ALARM) {
        await runTelegramCheckCycle();
    }
    // <-- НОВЫЙ ОБРАБОТЧИК -->
    if (alarm.name === AUTO_RESPONDER_ALARM_NAME) {
        await runAutoResponderCycle();
    }
    // 3.0: engine heartbeat - resurrects the active polling loop after the worker is killed
    if (alarm.name === ENGINE_HEARTBEAT_ALARM) {
        await onHeartbeat();
    }
    // 3.0: smart auto-raise - self-schedules its next run based on FunPay's wait times
    if (alarm.name === SMART_BUMP_ALARM) {
        await runSmartBumpCycle();
    }
    if (alarm.name === 'foxenAutoRestore') {
        // Notify all FunPay tabs to check and restore/disable lots
        const tabs = await (typeof browser !== 'undefined' ? browser : chrome).tabs.query({ url: "https://funpay.com/*" });
        tabs.forEach(tab => {
            const b = typeof browser !== 'undefined' ? browser : chrome;
            try {
                const p = b.tabs.sendMessage(tab.id, { action: 'foxenCheckRestoreLots' });
                if (p && typeof p.catch === 'function') p.catch(() => {});
            } catch (e) {}
        });
    }
});

function setupInitialAlarms() {
    chrome.storage.local.get(['autoBumpEnabled', 'autoBumpCooldown', 'foxenDiscord', 'foxenAutoReplies', 'foxenSmartBumpEnabled'], (settings) => {
        if (settings.foxenSmartBumpEnabled) {
            // 3.0: smart raise takes over; the fixed-interval bump is disabled to avoid double-raising.
            chrome.alarms.clear(BUMP_ALARM_NAME);
            startSmartBump();
        } else if (settings.autoBumpEnabled && settings.autoBumpCooldown) {
            startAutoBump(settings.autoBumpCooldown);
        }
        // 3.0: Periodic lot restore/disable check (every 5 minutes)
        const AUTO_RESTORE_ALARM = 'foxenAutoRestore';
        if (settings.foxenAutoRestoreEnabled || settings.foxenAutoDisableEnabled) {
            chrome.alarms.create(AUTO_RESTORE_ALARM, {
                delayInMinutes: 1,
                periodInMinutes: 5
            });
        }

        if (settings.foxenDiscord && settings.foxenDiscord.enabled && settings.foxenDiscord.webhookUrl) {
            chrome.alarms.create(DISCORD_LOG_ALARM_NAME, {
                delayInMinutes: 1,
                periodInMinutes: 1
            });
            runDiscordCheckCycle();
        }
        // Telegram: запускаем опрос, если включён и есть токен.
        telegramSyncAlarm();
        // <-- НОВЫЙ БЛОК ДЛЯ АВТООТВЕТЧИКА -->
        const autoReplies = settings.foxenAutoReplies || {};
        const arAnyEnabled = autoReplies.greetingEnabled || autoReplies.keywordsEnabled ||
            autoReplies.autoReviewEnabled || autoReplies.bonusForReviewEnabled ||
            autoReplies.newOrderReplyEnabled || autoReplies.orderConfirmReplyEnabled ||
            autoReplies.autoDeliveryEnabled;
        if (arAnyEnabled) {
            // 3.0: start the MV3-safe active loop instead of the broken 0.25-min alarm.
            startEngine();
        }
    });
}

chrome.runtime.onStartup.addListener(setupInitialAlarms);

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.storage.local.set({ 
            autoBumpEnabled: false, 
            autoBumpCooldown: 245,
            showSalesStats: true,
            hideBalance: false,
            viewSellersPromo: true,
            foxenDisabledFeatures: [],
            foxenDiscord: { enabled: false, webhookUrl: '', pingEveryone: false, pingHere: false }
        });
    }
    
    setupInitialAlarms();
});

// Всегда запускаем инициализацию движка при старте/пробуждении Service Worker
setupInitialAlarms();


chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.foxenDiscord) {
        const newValue = changes.foxenDiscord.newValue;
        const isEnabled = newValue && newValue.enabled && newValue.webhookUrl;

        chrome.alarms.get(DISCORD_LOG_ALARM_NAME, (alarm) => {
            if (isEnabled && !alarm) {
                chrome.alarms.create(DISCORD_LOG_ALARM_NAME, { delayInMinutes: 1, periodInMinutes: 1 });
                runDiscordCheckCycle();
            } else if (!isEnabled && alarm) {
                chrome.alarms.clear(DISCORD_LOG_ALARM_NAME);
            }
        });
    }

    // Telegram: включение/выключение и смена токена → пересоздаём/убираем опрос.
    if (changes.foxenTelegram) {
        telegramSyncAlarm();
    }

    // <-- НОВЫЙ БЛОК ДЛЯ УПРАВЛЕНИЯ БУДИЛЬНИКОМ АВТООТВЕТЧИКА -->
    if (changes.foxenAutoReplies) {
        const oldSettings = changes.foxenAutoReplies.oldValue || {};
        const newSettings = changes.foxenAutoReplies.newValue || {};
        const isEnabled = !!(newSettings.greetingEnabled || newSettings.keywordsEnabled || newSettings.autoReviewEnabled || newSettings.bonusForReviewEnabled ||
            newSettings.newOrderReplyEnabled || newSettings.orderConfirmReplyEnabled || newSettings.autoDeliveryEnabled);
        const wasEnabled = !!(oldSettings.greetingEnabled || oldSettings.keywordsEnabled || oldSettings.autoReviewEnabled || oldSettings.bonusForReviewEnabled ||
            oldSettings.newOrderReplyEnabled || oldSettings.orderConfirmReplyEnabled || oldSettings.autoDeliveryEnabled);

        // 3.0: drive the engine instead of the broken alarm
        if (isEnabled) {
            startEngine();
        } else if (wasEnabled) {
            stopEngine();
            chrome.alarms.clear(AUTO_RESPONDER_ALARM_NAME);
            resetAutoResponderState();
        }
    }
    // 3.0: smart auto-raise toggle
    if (changes.foxenSmartBumpEnabled) {
        const enabled = changes.foxenSmartBumpEnabled.newValue;
        if (enabled) {
            chrome.alarms.clear(BUMP_ALARM_NAME); // stop fixed-interval bump
            startSmartBump();
        } else {
            stopSmartBump();
            // re-arm the classic bump if it's still enabled
            chrome.storage.local.get(['autoBumpEnabled', 'autoBumpCooldown'], (s) => {
                if (s.autoBumpEnabled && s.autoBumpCooldown) {
                    startAutoBump(s.autoBumpCooldown);
                }
            });
        }
    }
});

chrome.runtime.onUpdateAvailable.addListener(function(details) {
    console.log("Foxen: доступно обновление до версии " + details.version + ". применение...");
    chrome.runtime.reload();
});