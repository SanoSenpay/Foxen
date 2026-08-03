// content/utils/error_tracker.js
// =============================================================================
// Foxen Telemetry & Error Tracker (Open-Source Safe)
// Сбор логов консоли, сетевых запросов (Fetch/XHR) и безопасная отправка отчетов разработчику.
// =============================================================================

(function () {
    'use strict';

    if (window._foxenErrorTrackerInitialized) return;
    window._foxenErrorTrackerInitialized = true;

    // -------------------------------------------------------------------------
    // 1. Конфигурация прокси-эндпоинта (Open-Source Webhook Endpoint)
    // -------------------------------------------------------------------------
    const TELEMETRY_WEBHOOK_URL = 'https://foxen-telemetry.sanosenpay.workers.dev';

    const DEV_TELEGRAM_BOT_TOKEN = '';
    const DEV_TELEGRAM_CHAT_ID = '';

    // ID веток (message_thread_id) в Telegram-супергруппе разработчика
    const DEV_TELEGRAM_TOPICS = {
        storage: null, // ID топика для ошибок IndexedDB / хранилища (напр. 2)
        network: null, // ID топика для сетевых ошибок / API FunPay (напр. 4)
        engine:  null, // ID топика для ошибок движка / автоподнятия (напр. 6)
        ai:      null, // ID топика для ошибок нейросетей (напр. 8)
        auth:    null, // ID топика для ошибок авторизации / CSRF (напр. 10)
        general: null  // ID топика для общих ошибок (напр. 12)
    };

    const MAX_CONSOLE_LOGS = 20;
    const MAX_NETWORK_LOGS = 10;
    const FINGERPRINT_COOLDOWN_MS = 60 * 60 * 1000; // 1 час сокрытия одинаковых ошибок
    const MAX_REPORTS_PER_MINUTE = 3;
    const MAX_REPORTS_PER_DAY = 15;

    const consoleBuffer = [];
    const networkBuffer = [];
    const fingerprintHistory = new Map();

    let reportsSentThisMinute = 0;
    let lastMinuteReset = Date.now();
    let reportsSentToday = 0;
    let lastDayReset = Date.now();

    let telemetryEnabled = true;

    // -------------------------------------------------------------------------
    // 2. Вспомогательные функции хранения, хеширования и категоризации
    // -------------------------------------------------------------------------
    function getStorageApi() {
        return (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null);
    }

    async function loadTelemetryConfig() {
        try {
            const api = getStorageApi();
            if (!api) return;
            const res = await new Promise((resolve) => api.get(['foxen_telemetry_enabled', 'fpt_telemetry_enabled'], (r) => resolve(r || {})));
            telemetryEnabled = (res.foxen_telemetry_enabled !== false) && (res.fpt_telemetry_enabled !== false);
        } catch (_) {}
    }

    loadTelemetryConfig();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && (changes.foxen_telemetry_enabled || changes.fpt_telemetry_enabled)) {
                const val = changes.foxen_telemetry_enabled ? changes.foxen_telemetry_enabled.newValue : changes.fpt_telemetry_enabled.newValue;
                telemetryEnabled = val !== false;
            }
        });
    }

    function sanitizeText(text) {
        if (!text) return '';
        let str = String(text);
        str = str.replace(/(PHPSESSID=)[a-zA-Z0-9_-]+/gi, '$1[REDACTED]');
        str = str.replace(/(bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[REDACTED]');
        str = str.replace(/(token=)[a-zA-Z0-9._-]+/gi, '$1[REDACTED]');
        str = str.replace(/(password=)[^&]+/gi, '$1[REDACTED]');
        return str;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function getTimeStamp() {
        const d = new Date();
        return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    function getFingerprint(errorObj) {
        if (!errorObj) return 'err_unknown';
        let rawMsg = String(errorObj.message || '');
        rawMsg = rawMsg.replace(/https?:\/\/[^\s]+/gi, '[URL]')
                       .replace(/(?:moz|chrome)-extension:\/\/[^\s]+/gi, '[EXT_URL]')
                       .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
                       .replace(/\b\d+\b/g, '#')
                       .trim();

        const file = String(errorObj.filename || '');
        const line = String(errorObj.line || 0);

        let stackFrame = '';
        if (errorObj.stack) {
            const lines = String(errorObj.stack).split('\n');
            if (lines.length > 1) {
                stackFrame = lines[1].replace(/https?:\/\/[^\s]+/g, '').replace(/(?:moz|chrome)-extension:\/\/[^\s]+/g, '').trim();
            }
        }

        const composite = `${rawMsg}|${file}:${line}|${stackFrame}`;
        let hash = 0;
        for (let i = 0; i < composite.length; i++) {
            hash = ((hash << 5) - hash) + composite.charCodeAt(i);
            hash |= 0;
        }
        return 'err_' + Math.abs(hash).toString(36);
    }

    function classifyCategory(errorObj) {
        const fullText = (
            String(errorObj.message || '') + ' ' +
            String(errorObj.filename || '') + ' ' +
            String(errorObj.stack || '')
        ).toLowerCase();

        if (/indexeddb|sales_db|purchases_db|finance_db|quotaexceeded|storage\.local|database|objectstore/i.test(fullText)) {
            return { key: 'storage', icon: '🗄️', name: 'База данных / Хранилище' };
        }
        if (/fetch|xmlhttprequest|429|500|502|503|504|networkerror|err_connection|funpay\.com\/orders/i.test(fullText)) {
            return { key: 'network', icon: '🌐', name: 'Сеть / API FunPay' };
        }
        if (/foxen_engine|fxn_engine|fpt_engine|auto_reply|autobump|order_reply|autodelivery|watchdog|engine/i.test(fullText)) {
            return { key: 'engine', icon: '🤖', name: 'Движок / Автоматизация' };
        }
        if (/ai\.js|openai|openrouter|claude|proxy_ai|llm/i.test(fullText)) {
            return { key: 'ai', icon: '🧠', name: 'ИИ / Нейросети' };
        }
        if (/golden_key|phpsessid|csrf|401|403|unauthorized|forbidden/i.test(fullText)) {
            return { key: 'auth', icon: '🔐', name: 'Авторизация / Сессии' };
        }
        return { key: 'general', icon: '⚠️', name: 'Общие ошибки' };
    }

    // -------------------------------------------------------------------------
    // 3. Хранение логов консоли (только WARN и ERROR, обычные LOG пропускаются)
    // -------------------------------------------------------------------------
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    function pushConsoleLog(level, args) {
        try {
            const levelUpper = String(level || '').toUpperCase();
            if (levelUpper !== 'WARN' && levelUpper !== 'ERROR' && levelUpper !== 'ERR') {
                return;
            }
            const msg = args.map(a => {
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch (_) { return String(a); }
                }
                return String(a);
            }).join(' ');

            if (!msg || msg.includes('[Foxen Error Tracker]') || msg.includes('[FXN Error Tracker]') || msg.includes('[FPT Error Tracker]')) {
                return;
            }

            consoleBuffer.push({
                time: getTimeStamp(),
                level: levelUpper,
                msg: sanitizeText(msg).slice(0, 300)
            });

            if (consoleBuffer.length > MAX_CONSOLE_LOGS) {
                consoleBuffer.shift();
            }
        } catch (_) {}
    }

    console.warn = function (...args) {
        pushConsoleLog('WARN', args);
        return originalConsoleWarn.apply(this, args);
    };

    console.error = function (...args) {
        pushConsoleLog('ERROR', args);
        return originalConsoleError.apply(this, args);
    };

    // -------------------------------------------------------------------------
    // 4. Перехватчик сетевых запросов (Network Interceptor: Fetch & XHR)
    // -------------------------------------------------------------------------
    if (typeof window.fetch === 'function') {
        try {
            const originalFetch = window.fetch;
            const customFetch = async function (...args) {
                const startTime = Date.now();
                let url = '';
                let method = 'GET';
                let reqBodySnippet = '';

                try {
                    if (typeof args[0] === 'string') url = args[0];
                    else if (args[0] && args[0].url) url = args[0].url;

                    if (args[1] && args[1].method) method = args[1].method.toUpperCase();
                    if (args[1] && args[1].body) reqBodySnippet = sanitizeText(String(args[1].body)).slice(0, 200);
                } catch (_) {}

                try {
                    const response = await originalFetch.apply(this, args);
                    const duration = Date.now() - startTime;
                    
                    let resSnippet = '';
                    try {
                        const cloned = response.clone();
                        const text = await cloned.text();
                        resSnippet = sanitizeText(text).slice(0, 300);
                    } catch (_) {}

                    pushNetworkLog({
                        time: getTimeStamp(),
                        type: 'FETCH',
                        method,
                        url: sanitizeText(url),
                        status: response.status,
                        duration: `${duration}ms`,
                        reqBody: reqBodySnippet,
                        resBody: resSnippet
                    });

                    return response;
                } catch (err) {
                    const duration = Date.now() - startTime;
                    pushNetworkLog({
                        time: getTimeStamp(),
                        type: 'FETCH',
                        method,
                        url: sanitizeText(url),
                        status: 'FAILED',
                        duration: `${duration}ms`,
                        reqBody: reqBodySnippet,
                        resBody: sanitizeText(err.message)
                    });
                    throw err;
                }
            };

            try {
                Object.defineProperty(window, 'fetch', {
                    value: customFetch,
                    writable: true,
                    configurable: true
                });
            } catch (_) {
                window.fetch = customFetch;
            }
        } catch (_) {}
    }

    if (typeof window.XMLHttpRequest === 'function') {
        const XHR = window.XMLHttpRequest;
        const originalOpen = XHR.prototype.open;
        const originalSend = XHR.prototype.send;

        XHR.prototype.open = function (method, url, ...rest) {
            this._fxnMethod = method ? method.toUpperCase() : 'GET';
            this._fxnUrl = url;
            this._fxnStartTime = Date.now();
            return originalOpen.apply(this, [method, url, ...rest]);
        };

        XHR.prototype.send = function (body) {
            this._fxnReqBody = body ? sanitizeText(String(body)).slice(0, 200) : '';
            
            this.addEventListener('loadend', () => {
                try {
                    const duration = Date.now() - (this._fxnStartTime || Date.now());
                    let resSnippet = '';
                    try {
                        resSnippet = sanitizeText(this.responseText || '').slice(0, 300);
                    } catch (_) {}

                    pushNetworkLog({
                        time: getTimeStamp(),
                        type: 'XHR',
                        method: this._fxnMethod || 'GET',
                        url: sanitizeText(this._fxnUrl || ''),
                        status: this.status || 'FAILED',
                        duration: `${duration}ms`,
                        reqBody: this._fxnReqBody,
                        resBody: resSnippet
                    });
                } catch (_) {}
            });

            return originalSend.apply(this, arguments);
        };
    }

    function isInternalTelemetryUrl(url) {
        if (!url) return false;
        const str = String(url);
        if (TELEMETRY_WEBHOOK_URL && str.includes(TELEMETRY_WEBHOOK_URL)) return true;
        if (str.includes('foxen-telemetry.sanosenpay.workers.dev')) return true;
        if (str.includes('api.telegram.org')) return true;
        return false;
    }

    function pushNetworkLog(logObj) {
        if (!logObj || isInternalTelemetryUrl(logObj.url)) return;
        networkBuffer.push(logObj);
        if (networkBuffer.length > MAX_NETWORK_LOGS) {
            networkBuffer.shift();
        }
    }

    // -------------------------------------------------------------------------
    // 5. Отправка отчётов на прокси-сервер / Telegram
    // -------------------------------------------------------------------------
    async function sendTelegramError(errorObj, isTest = false) {
        await loadTelemetryConfig();

        if (!telemetryEnabled) return;

        const now = Date.now();

        // Сброс минутных и суточных счётчиков
        if (now - lastMinuteReset > 60000) {
            reportsSentThisMinute = 0;
            lastMinuteReset = now;
        }
        if (now - lastDayReset > 86400000) {
            reportsSentToday = 0;
            lastDayReset = now;
        }

        // Защита от спама (пропускаем для явных тестов)
        if (!isTest) {
            if (reportsSentThisMinute >= MAX_REPORTS_PER_MINUTE) return;
            if (reportsSentToday >= MAX_REPORTS_PER_DAY) return;
        }

        // Дедупликация и агрегация повторов через Fingerprint
        const fp = getFingerprint(errorObj);
        const record = fingerprintHistory.get(fp) || { timestamp: 0, count: 0 };

        if (!isTest && record.timestamp > 0 && (now - record.timestamp) < FINGERPRINT_COOLDOWN_MS) {
            record.count++;
            fingerprintHistory.set(fp, record);
            return;
        }

        const repeatedCount = record.count;
        fingerprintHistory.set(fp, { timestamp: now, count: 0 });

        reportsSentThisMinute++;
        reportsSentToday++;

        const cat = classifyCategory(errorObj);
        const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : { version: '3.2.2' };
        const extVersion = manifest.version || '3.2.2';

        let msg = `🚨 <b>[Foxen Error Report] v${extVersion}</b>\n`;
        msg += `🏷️ <b>Категория:</b> ${cat.icon} <b>${cat.name}</b>\n\n`;
        msg += `❌ <b>Ошибка:</b> <code>${escapeHtml(sanitizeText(errorObj.message))}</code>\n`;
        if (errorObj.filename) msg += `📍 <b>Файл:</b> <code>${escapeHtml(errorObj.filename)}:${errorObj.line || 0}:${errorObj.col || 0}</code>\n`;
        msg += `🌐 <b>URL:</b> <code>${escapeHtml(sanitizeText(window.location.href))}</code>\n`;
        if (repeatedCount > 0) {
            msg += `🔁 <b>Повторов за прошлый час:</b> ${repeatedCount}\n`;
        }
        msg += `\n`;

        if (errorObj.stack) {
            const shortStack = errorObj.stack.split('\n').slice(0, 4).join('\n');
            msg += `🥞 <b>Stack:</b>\n<pre>${escapeHtml(sanitizeText(shortStack))}</pre>\n\n`;
        }

        const filteredConsole = consoleBuffer.filter(l => {
            if (!l || !l.msg) return false;
            if (l.msg.includes('[Foxen Error Tracker]') || l.msg.includes('[FXN Error Tracker]') || l.msg.includes('[FPT Error Tracker]')) return false;
            const lvl = String(l.level || '').toUpperCase();
            return lvl === 'WARN' || lvl === 'ERROR' || lvl === 'ERR';
        });
        if (filteredConsole.length > 0) {
            msg += `📝 <b>Консоль (последние ${Math.min(5, filteredConsole.length)}):</b>\n`;
            filteredConsole.slice(-5).forEach(l => {
                msg += `• [${l.time} ${l.level}] <code>${escapeHtml(l.msg)}</code>\n`;
            });
            msg += `\n`;
        }

        const filteredNetwork = networkBuffer.filter(n => n && n.url && !isInternalTelemetryUrl(n.url));
        if (filteredNetwork.length > 0) {
            msg += `🔄 <b>Сеть (последние 3):</b>\n`;
            filteredNetwork.slice(-3).forEach((n, idx) => {
                msg += `${idx + 1}. <b>${n.method}</b> <code>${escapeHtml(n.url.slice(0, 60))}</code> → [${n.status}] (${n.duration})\n`;
                if (n.resBody) {
                    msg += `   └ <i>Ответ:</i> <code>${escapeHtml(n.resBody.slice(0, 120))}</code>\n`;
                }
            });
        }

        if (msg.length > 4000) {
            msg = msg.slice(0, 3950) + '\n\n<i>[Сообщение сокращено из-за лимита]</i>';
        }

        const api = getStorageApi();
        let tgConfig = {};
        if (api) {
            tgConfig = await new Promise(r => api.get(['foxenTelegram', 'foxenTelegram'], res => r((res && (res.foxenTelegram || res.foxenTelegram)) || {})));
        }

        let messageThreadId = DEV_TELEGRAM_TOPICS[cat.key] || DEV_TELEGRAM_TOPICS.general || null;
        if (!messageThreadId && tgConfig && tgConfig.topics) {
            messageThreadId = tgConfig.topics[cat.key] || tgConfig.topics.general || null;
        }

        if (TELEMETRY_WEBHOOK_URL) {
            try {
                await fetch(TELEMETRY_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: extVersion,
                        category: cat.key,
                        categoryName: cat.name,
                        messageThreadId: messageThreadId,
                        fingerprint: fp,
                        repeatedCount: repeatedCount,
                        error: errorObj,
                        formattedMessage: msg
                    })
                });
            } catch (e) {
                console.warn('[Foxen Error Tracker] Webhook error:', (e && e.message) ? e.message : String(e));
            }
        }

        try {
            const token = tgConfig.token || DEV_TELEGRAM_BOT_TOKEN;
            const chatId = tgConfig.chatId || DEV_TELEGRAM_CHAT_ID;
            const isEnabled = (tgConfig.enabled || (DEV_TELEGRAM_BOT_TOKEN && DEV_TELEGRAM_CHAT_ID)) && token && chatId;

            if (isEnabled && tgConfig.notifyErrors !== false) {
                const endpoint = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
                const tgPayload = {
                    chat_id: chatId,
                    text: msg,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                };
                if (messageThreadId) {
                    tgPayload.message_thread_id = parseInt(messageThreadId, 10);
                }

                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tgPayload)
                });
            }
        } catch (e) {
            console.warn('[Foxen Error Tracker] Failed to send Telegram log:', (e && e.message) ? e.message : String(e));
        }
    }

    // Expose inside Content Script context
    window.fxnSendErrorLog = sendTelegramError;
    window.fxnSendErrorLog = sendTelegramError;

    window.addEventListener('message', function(e) {
        if (!e.data) return;
        if (e.data.type === 'FXN_SEND_ERROR' || e.data.type === 'FPT_SEND_ERROR') {
            sendTelegramError(e.data.error);
        }
    });

    // -------------------------------------------------------------------------
    // 6. Глобальные обработчики ошибок
    // -------------------------------------------------------------------------
    window.addEventListener('error', function (event) {
        if (!event || !event.message) return;
        if (/Content-Security-Policy|CSP Violation|script-src/i.test(event.message)) return;
        sendTelegramError({
            message: event.message,
            filename: event.filename ? event.filename.split('/').pop() : '',
            line: event.lineno,
            col: event.colno,
            stack: event.error ? event.error.stack : ''
        });
    });

    window.addEventListener('unhandledrejection', function (event) {
        if (!event || !event.reason) return;
        const reason = event.reason;
        const msg = typeof reason === 'object' ? (reason.message || reason.name || 'Unhandled Rejection') : String(reason);
        if (/Content-Security-Policy|CSP Violation|script-src/i.test(msg)) return;

        let filename = reason && reason.fileName ? reason.fileName.split('/').pop() : '';
        let line = reason && reason.lineNumber ? reason.lineNumber : 0;
        const stack = typeof reason === 'object' ? (reason.stack || '') : '';

        if (!filename && stack) {
            const stackLines = String(stack).split('\n');
            for (const l of stackLines) {
                const match = l.match(/(?:@|at\s+).+?([^/\s:\\]+\.js):(\d+):(\d+)/);
                if (match) {
                    filename = match[1];
                    line = parseInt(match[2], 10);
                    break;
                }
            }
        }

        sendTelegramError({
            message: msg,
            filename: filename || '',
            line: line || 0,
            col: 0,
            stack: stack
        });
    });

    // Отключен захват сторонних нарушений CSP страницы FunPay (не являются ошибкой расширения)
    /*
    window.addEventListener('securitypolicyviolation', function (event) { ... });
    */

    console.log('[Foxen Error Tracker] Open-Source Safe Telemetry Tracker initialized.');
})();
