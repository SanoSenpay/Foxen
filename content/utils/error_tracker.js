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

    const MAX_CONSOLE_LOGS = 20;
    const MAX_NETWORK_LOGS = 10;
    const ERROR_COOLDOWN_MS = 10000;

    const consoleBuffer = [];
    const networkBuffer = [];
    const recentErrorHashes = new Map();

    let telemetryEnabled = true;

    // -------------------------------------------------------------------------
    // 2. Вспомогательные функции хранения и маскирования
    // -------------------------------------------------------------------------
    function getStorageApi() {
        return (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null);
    }

    async function loadTelemetryConfig() {
        try {
            const api = getStorageApi();
            if (!api) return;
            const res = await new Promise((resolve) => api.get(['fpt_telemetry_enabled'], (r) => resolve(r || {})));
            telemetryEnabled = res.fpt_telemetry_enabled !== false;
        } catch (_) {}
    }

    loadTelemetryConfig();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.fpt_telemetry_enabled) {
                telemetryEnabled = changes.fpt_telemetry_enabled.newValue !== false;
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

    // -------------------------------------------------------------------------
    // 3. Перехватчик логов консоли (Console Interceptor)
    // -------------------------------------------------------------------------
    ['log', 'warn', 'error', 'info'].forEach(level => {
        const original = console[level];
        console[level] = function (...args) {
            try {
                const formattedArgs = args.map(arg => {
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg); } catch (_) { return String(arg); }
                    }
                    return String(arg);
                }).join(' ');

                consoleBuffer.push({
                    time: getTimeStamp(),
                    level: level.toUpperCase(),
                    msg: sanitizeText(formattedArgs).slice(0, 300)
                });

                if (consoleBuffer.length > MAX_CONSOLE_LOGS) {
                    consoleBuffer.shift();
                }
            } catch (_) {}

            if (typeof original === 'function') {
                original.apply(console, args);
            }
        };
    });

    // -------------------------------------------------------------------------
    // 4. Перехватчик сетевых запросов (Network Interceptor: Fetch & XHR)
    // -------------------------------------------------------------------------
    if (typeof window.fetch === 'function') {
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
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
    }

    if (typeof window.XMLHttpRequest === 'function') {
        const XHR = window.XMLHttpRequest;
        const originalOpen = XHR.prototype.open;
        const originalSend = XHR.prototype.send;

        XHR.prototype.open = function (method, url, ...rest) {
            this._fptMethod = method ? method.toUpperCase() : 'GET';
            this._fptUrl = url;
            this._fptStartTime = Date.now();
            return originalOpen.apply(this, [method, url, ...rest]);
        };

        XHR.prototype.send = function (body) {
            this._fptReqBody = body ? sanitizeText(String(body)).slice(0, 200) : '';
            
            this.addEventListener('loadend', () => {
                try {
                    const duration = Date.now() - (this._fptStartTime || Date.now());
                    let resSnippet = '';
                    try {
                        resSnippet = sanitizeText(this.responseText || '').slice(0, 300);
                    } catch (_) {}

                    pushNetworkLog({
                        time: getTimeStamp(),
                        type: 'XHR',
                        method: this._fptMethod || 'GET',
                        url: sanitizeText(this._fptUrl || ''),
                        status: this.status || 'FAILED',
                        duration: `${duration}ms`,
                        reqBody: this._fptReqBody,
                        resBody: resSnippet
                    });
                } catch (_) {}
            });

            return originalSend.apply(this, arguments);
        };
    }

    function pushNetworkLog(logObj) {
        networkBuffer.push(logObj);
        if (networkBuffer.length > MAX_NETWORK_LOGS) {
            networkBuffer.shift();
        }
    }

    // -------------------------------------------------------------------------
    // 5. Отправка отчётов на прокси-сервер / Telegram
    // -------------------------------------------------------------------------
    async function sendTelegramError(errorObj) {
        await loadTelemetryConfig();

        if (!telemetryEnabled) return;

        const errorKey = `${errorObj.message}_${errorObj.filename}_${errorObj.line}`;
        const now = Date.now();
        if (recentErrorHashes.has(errorKey) && (now - recentErrorHashes.get(errorKey)) < ERROR_COOLDOWN_MS) {
            return;
        }
        recentErrorHashes.set(errorKey, now);

        const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : { version: '3.2.2' };
        const extVersion = manifest.version || '3.2.2';

        let msg = `🚨 <b>[Foxen Error Report] v${extVersion}</b>\n\n`;
        msg += `❌ <b>Ошибка:</b> <code>${escapeHtml(sanitizeText(errorObj.message))}</code>\n`;
        if (errorObj.filename) msg += `📍 <b>Файл:</b> <code>${escapeHtml(errorObj.filename)}:${errorObj.line || 0}:${errorObj.col || 0}</code>\n`;
        msg += `🌐 <b>URL:</b> <code>${escapeHtml(sanitizeText(window.location.href))}</code>\n\n`;

        if (errorObj.stack) {
            const shortStack = errorObj.stack.split('\n').slice(0, 4).join('\n');
            msg += `🥞 <b>Stack:</b>\n<pre>${escapeHtml(sanitizeText(shortStack))}</pre>\n\n`;
        }

        if (consoleBuffer.length > 0) {
            msg += `📝 <b>Консоль (последние ${Math.min(5, consoleBuffer.length)}):</b>\n`;
            consoleBuffer.slice(-5).forEach(l => {
                msg += `• [${l.time} ${l.level}] <code>${escapeHtml(l.msg)}</code>\n`;
            });
            msg += `\n`;
        }

        if (networkBuffer.length > 0) {
            msg += `🔄 <b>Сеть (последние 3):</b>\n`;
            networkBuffer.slice(-3).forEach((n, idx) => {
                msg += `${idx + 1}. <b>${n.method}</b> <code>${escapeHtml(n.url.slice(0, 60))}</code> → [${n.status}] (${n.duration})\n`;
                if (n.resBody) {
                    msg += `   └ <i>Ответ:</i> <code>${escapeHtml(n.resBody.slice(0, 120))}</code>\n`;
                }
            });
        }

        if (msg.length > 4000) {
            msg = msg.slice(0, 3950) + '\n\n<i>[Сообщение сокращено из-за лимита]</i>';
        }

        if (TELEMETRY_WEBHOOK_URL) {
            try {
                await fetch(TELEMETRY_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: extVersion,
                        error: errorObj,
                        formattedMessage: msg
                    })
                });
                return;
            } catch (e) {
                console.warn('[FPT Error Tracker] Webhook error:', e);
            }
        }

        if (DEV_TELEGRAM_BOT_TOKEN && DEV_TELEGRAM_CHAT_ID) {
            try {
                const endpoint = `https://api.telegram.org/bot${DEV_TELEGRAM_BOT_TOKEN}/sendMessage`;
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: DEV_TELEGRAM_CHAT_ID,
                        text: msg,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    })
                });
            } catch (e) {
                console.warn('[FPT Error Tracker] Failed to send Telegram log:', e);
            }
        }
    }

    async function runManualTest() {
        console.log('[FPT Test] Manual console log entry');
        console.warn('[FPT Test] Manual console warn entry');

        pushNetworkLog({
            time: getTimeStamp(),
            type: 'FETCH',
            method: 'POST',
            url: 'https://funpay.com/api/test_endpoint',
            status: 200,
            duration: '45ms',
            reqBody: '{"test": true}',
            resBody: '{"success": true, "msg": "Тестовый запрос прошел успешно"}'
        });

        await sendTelegramError({
            message: 'Тестовая проверка сбора логов и ошибок Foxen',
            filename: 'error_tracker.js',
            line: 1,
            col: 1,
            stack: 'TestError: Тестовый запуск отправки в Telegram\n    at fptTestTelegramLog (error_tracker.js:1:1)'
        });
    }

    // Expose inside Content Script context
    window.fptSendErrorLog = sendTelegramError;
    window.fptTestTelegramLog = runManualTest;

    // Inject Bridge script to expose window.fptTestTelegramLog to DevTools Main Page context (top)
    try {
        const script = document.createElement('script');
        script.textContent = `
            window.fptSendErrorLog = function(err) { window.postMessage({ type: 'FPT_SEND_ERROR', error: err }, '*'); };
            window.fptTestTelegramLog = function() { window.postMessage({ type: 'FPT_TEST_TELEGRAM' }, '*'); };
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();

        window.addEventListener('message', function(e) {
            if (!e.data) return;
            if (e.data.type === 'FPT_TEST_TELEGRAM') {
                runManualTest();
            } else if (e.data.type === 'FPT_SEND_ERROR') {
                sendTelegramError(e.data.error);
            }
        });
    } catch (_) {}

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
            if (req && req.type === 'FPT_TEST_TELEGRAM') {
                runManualTest().then(() => sendResponse({ success: true })).catch(e => sendResponse({ error: e.message }));
                return true;
            }
        });
    }

    // -------------------------------------------------------------------------
    // 6. Глобальные обработчики ошибок
    // -------------------------------------------------------------------------
    window.addEventListener('error', function (event) {
        if (!event || !event.message) return;
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
        sendTelegramError({
            message: typeof reason === 'object' ? (reason.message || 'Unhandled Rejection') : String(reason),
            filename: reason && reason.fileName ? reason.fileName.split('/').pop() : '',
            line: reason && reason.lineNumber ? reason.lineNumber : 0,
            col: 0,
            stack: typeof reason === 'object' ? (reason.stack || '') : ''
        });
    });

    console.log('[FPT Error Tracker] Open-Source Safe Telemetry Tracker initialized.');
})();
