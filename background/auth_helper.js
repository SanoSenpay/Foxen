// background/auth_helper.js - Централизованный помощник для авторизации, куки и запросов к FunPay

export function fxnGetCookie(url, name, storeId = null) {
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

export function fxnGetAllCookies(details) {
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

export function fxnSetCookie(details) {
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

export function fxnRemoveCookie(details) {
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

export async function fxnFindGoldenKey(preferredStoreId = null) {
    // 0) Если storeId не передан, попробуем узнать cookieStoreId у активной вкладки FunPay
    if (!preferredStoreId) {
        try {
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
            const activeTab = (tabs || []).find(t => t.active) || (tabs || [])[0];
            if (activeTab && activeTab.cookieStoreId) {
                preferredStoreId = activeTab.cookieStoreId;
            }
        } catch (_) {}
    }

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

export async function fxnFindPhpSessId(preferredStoreId = null) {
    if (!preferredStoreId) {
        try {
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
            const activeTab = (tabs || []).find(t => t.active) || (tabs || [])[0];
            if (activeTab && activeTab.cookieStoreId) {
                preferredStoreId = activeTab.cookieStoreId;
            }
        } catch (_) {}
    }
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

export async function fxnFetchResilient(url, options, { retries = 3, baseDelay = 700 } = {}) {
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
            lastErr = e;
        }
        if (attempt < retries) {
            await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + Math.random() * 300));
        }
    }
    throw lastErr || new Error('fxnFetchResilient: исчерпаны попытки');
}

export async function fetchWithTabFallback(url, options = {}) {
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

let _authCache = null;
let _authCacheTime = 0;

export function clearAuthCache() {
    _authCache = null;
    _authCacheTime = 0;
}

export async function getAuthDetailsForBackground(forceRefresh = false) {
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
