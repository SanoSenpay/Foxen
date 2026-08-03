
function randomTag() {
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
}

const BOT_MARKER = '\u2061';
const OLD_BOT_MARKER = '\u2064';
function markOutgoing(text) {
    const t = (text == null) ? '' : String(text);
    if (!t) return t;
    // don't double-mark
    if (t.startsWith(BOT_MARKER) || t.startsWith(OLD_BOT_MARKER)) return t;
    return BOT_MARKER + t;
}
function isBotMarked(text) {
    return typeof text === 'string' && (text.includes(BOT_MARKER) || text.includes(OLD_BOT_MARKER));
}


async function fetchWithRetry(url, options, { retries = 4, baseDelay = 800, timeoutMs = 15000 } = {}) {
    let lastErr;
    // Блокировка отправки ручных заголовков Cookie и передача куки сессии (golden_key / PHPSESSID)
    const _opts = (options && typeof options === 'object') ? { ...options } : {};
    if (/^https:\/\/(?:[a-z0-9-]+\.)?funpay\.com\//i.test(String(url)) && !_opts.credentials) {
        _opts.credentials = 'include';
    }
    options = _opts;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            // Retry on rate-limit / server errors; return everything else to caller.
            if (res.status === 429 || res.status >= 500) {
                lastErr = new Error(`HTTP ${res.status}`);
            } else {
                return res;
            }
        } catch (e) {
            clearTimeout(timer);
            lastErr = e;
        }
        if (attempt < retries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 400;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastErr || new Error('fetchWithRetry: exhausted');
}

const RX = {
    ORDER_PURCHASED:    /(?:оплатил|оплачен|оформил|оплата|paid|purchased).+?#([A-Z0-9]{8})|#([A-Z0-9]{8}).+?(?:оплатил|оплачен|оформил|оплата|paid|purchased)/i,
    ORDER_CONFIRMED:    /(?:подтвердил|подтвержден|завершен|confirmed|completed).+?#([A-Z0-9]{8})|#([A-Z0-9]{8}).+?(?:подтвердил|подтвержден|завершен|confirmed|completed)/i,
    NEW_FEEDBACK:       /(?:написал|оставил|добавил)\s+отзыв|left\s+a?\s*feedback|left\s+a?\s*review|gave\s+a?\s*feedback/i,
    FEEDBACK_CHANGED:   /(?:изменил|обновил)\s+отзыв|edited\s+a?\s*feedback|updated\s+a?\s*review/i,
    FEEDBACK_DELETED:   /(?:удалил)\s+отзыв|deleted\s+a?\s*feedback/i,
    ORDER_REOPENED:     /(?:открыт\s+повторно|reopened)/i,
    REFUND:             /(?:вернул\s+деньги|возврат|returned\s+money|refund)/i,
    PARTIAL_REFUND:     /(?:часть\s+средств|partial\s+refund)/i,
    DEAR_VENDORS:       /(?:уважаемые\s+продавцы|dear\s+vendors|dear\s+sellers)/i,
    ORDER_ID:           /#([A-Z0-9]{8})/,
};

function getMessageType(text) {
    if (!text) return 'NON_SYSTEM';
    if (RX.DEAR_VENDORS.test(text))     return 'DEAR_VENDORS';
    if (RX.ORDER_PURCHASED.test(text))  return 'ORDER_PURCHASED';
    if (RX.ORDER_CONFIRMED.test(text))  return 'ORDER_CONFIRMED';
    if (RX.NEW_FEEDBACK.test(text))     return 'NEW_FEEDBACK';
    if (RX.FEEDBACK_CHANGED.test(text)) return 'FEEDBACK_CHANGED';
    if (RX.FEEDBACK_DELETED.test(text)) return 'FEEDBACK_DELETED';
    if (RX.ORDER_REOPENED.test(text))   return 'ORDER_REOPENED';
    if (RX.REFUND.test(text))           return 'REFUND';
    if (RX.PARTIAL_REFUND.test(text))   return 'PARTIAL_REFUND';
    return 'NON_SYSTEM';
}

const RESERVED_VERBS = new Set([
    'оплатил', 'подтвердил', 'написал', 'изменил', 'оставил', 'добавил', 'обновил', 'удалил', 'вернул', 'оплачен', 'оформил', 'подтвержден',
    'has', 'paid', 'confirmed', 'given', 'left', 'edited', 'updated', 'deleted', 'returned'
]);

/**
 * Извлечение имени покупателя из текста системного сообщения о заказе (RU/EN).
 */
function extractOrderBuyer(text) {
    if (!text) return null;
    let buyer = null;
    // Парсинг русского формата ("Покупатель ИМЯ" или "Пользователь ИМЯ")
    let m = text.match(/(?:Покупатель|Пользователь)\s+([^\s,.]+)/i);
    if (m && !RESERVED_VERBS.has(m[1].toLowerCase())) buyer = m[1];
    if (!buyer) {
        // Парсинг английского формата ("Buyer ИМЯ" или "User ИМЯ")
        m = text.match(/(?:Buyer|User)\s+([^\s,.]+)/i);
        if (m && !RESERVED_VERBS.has(m[1].toLowerCase())) buyer = m[1];
    }
    if (!buyer) {
        // Парсинг имени в английском сообщении об отзыве или оплате
        m = text.match(/^([^\s,.]+)\s+has\s+(?:given|edited|deleted|left|paid|confirmed)/i);
        if (m && !RESERVED_VERBS.has(m[1].toLowerCase())) buyer = m[1];
    }
    if (!buyer) {
        // Парсинг имени при возврате средств (RU)
        m = text.match(/покупателю\s+([^\s,.]+)/i);
        if (m && !RESERVED_VERBS.has(m[1].toLowerCase())) buyer = m[1];
    }
    if (!buyer) {
        // Парсинг имени при возврате средств (EN)
        m = text.match(/to\s+buyer\s+([^\s,.]+)/i);
        if (m && !RESERVED_VERBS.has(m[1].toLowerCase())) buyer = m[1];
    }
    return buyer;
}

function cleanName(n) {
    if (!n) return '';
    return String(n)
        .replace(/[\u200B-\u200D\uFEFF\u2060\u2061\u2064]/g, '')
        .trim()
        .split(/\s+/)[0]
        .toLowerCase();
}

function extractOrderSeller(text) {
    if (!text) return null;
    let m = text.match(/продавцу\s+([^\s,.]+)/i);
    if (m) return m[1];
    m = text.match(/Продавец\s+([^\s,.]+)/i);
    if (m) return m[1];
    m = text.match(/to\s+seller\s+([^\s,.]+)/i);
    if (m) return m[1];
    m = text.match(/Seller\s+([^\s,.]+)/i);
    if (m) return m[1];
    return null;
}

function extractFeedbackAuthor(text) {
    return extractOrderBuyer(text);
}

let _authCache = null;
let _authCacheTime = 0;
const AUTH_CACHE_TTL_MS = 60000;

export function clearAutoresponderAuthCache() {
    _authCache = null;
    _authCacheTime = 0;
}

async function getAuth() {
    const now = Date.now();
    const goldenKeyCookie = await (typeof browser !== 'undefined' ? browser : chrome).cookies.get({ url: 'https://funpay.com', name: 'golden_key' });
    if (!goldenKeyCookie?.value) {
        _authCache = null;
        return {};
    }
    const golden_key = goldenKeyCookie.value;

    const phpSessIdCookie = await (typeof browser !== 'undefined' ? browser : chrome).cookies.get({ url: 'https://funpay.com', name: 'PHPSESSID' });
    const phpsessid = phpSessIdCookie?.value || '';

    if (_authCache && (now - _authCacheTime < AUTH_CACHE_TTL_MS) && _authCache.golden_key === golden_key && _authCache.phpsessid === phpsessid && _authCache.csrf_token && _authCache.userId) {
        return _authCache;
    }

    let storedUser = {};
    try {
        const s = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('fpCurrentUserInfo');
        if (s?.fpCurrentUserInfo) storedUser = s.fpCurrentUserInfo;
    } catch (_) {}

    const tabs = await (typeof browser !== 'undefined' ? browser : chrome).tabs.query({ url: 'https://funpay.com/*' });
    for (const tab of tabs) {
        if (tab.discarded) continue;
        try {
            const r = await (typeof browser !== 'undefined' ? browser : chrome).tabs.sendMessage(tab.id, { action: 'getAppData' });
            if (r?.success) {
                const d = Array.isArray(r.data) ? r.data[0] : r.data;
                const username = d?.userName || d?.username || d?.user?.name || storedUser.username || '';
                const userId = d?.userId || storedUser.userId || '';
                if (username || userId) {
                    (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ fpCurrentUserInfo: { userId: String(userId), username } });
                }
                if (d?.['csrf-token'] && userId) {
                    const res = { golden_key, phpsessid, csrf_token: d['csrf-token'], userId, username };
                    _authCache = res;
                    _authCacheTime = now;
                    return res;
                }
            }
        } catch (_) {}
    }

    try {
        const cookieStr = phpsessid
            ? `golden_key=${golden_key}; PHPSESSID=${phpsessid}`
            : `golden_key=${golden_key}`;
        const res = await fetch('https://funpay.com/', { credentials: 'include', headers: { cookie: cookieStr } });
        const text = await res.text();
        const m = text.match(/<body[^>]*data-app-data="([^"]+)"/);
        if (m) {
            const d = JSON.parse(m[1].replace(/&quot;/g, '"'));
            const u = Array.isArray(d) ? d[0] : d;
            const username = u?.userName || u?.username || u?.user?.name || storedUser.username || '';
            const userId = u?.userId || storedUser.userId || '';
            if (username || userId) {
                (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ fpCurrentUserInfo: { userId: String(userId), username } });
            }
            if (u?.['csrf-token'] && userId) {
                const result = { golden_key, phpsessid, csrf_token: u['csrf-token'], userId, username };
                _authCache = result;
                _authCacheTime = now;
                return result;
            }
        }
    } catch (e) {}

    if (_authCache && _authCache.golden_key === golden_key && _authCache.csrf_token && _authCache.userId) {
        return _authCache;
    }

    return { golden_key, phpsessid, userId: storedUser.userId || '', username: storedUser.username || '' };
}

async function parseViaOffscreen(html, action, extra = {}) {
    return Promise.resolve().then(() => {
        if (action === 'parseSellerLotPrice') return window[action](html, extra.offerId);
        else if (action === 'solveCloneForm') return window[action](html, extra.attributes, extra.attributePairs);
        else if (action === 'parseBuyerHistory') return window[action](html, extra.buyerUserId);
        else if (typeof window[action] === 'function') return window[action](html);
        else throw new Error('Unknown parser action: ' + action);
    });
}

async function sendChatMessage(chatId, text, auth) {
    // Для корректной работы раннера FunPay необходимы куки golden_key и PHPSESSID
    const cookieStr = auth.phpsessid
        ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
        : `golden_key=${auth.golden_key}`;

    // tag '00000000', last_message: -1 в обоих местах (objects.data и request.data)
    const markedText = markOutgoing(text);
    const payload = {
        objects: JSON.stringify([{ type: 'chat_node', id: chatId, tag: '00000000', data: { node: chatId, last_message: -1, content: '' } }]),
        request: JSON.stringify({ action: 'chat_message', data: { node: chatId, last_message: -1, content: markedText } }),
        csrf_token: auth.csrf_token
    };
    const res = await fetchWithRetry('https://funpay.com/runner/', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            'cookie': cookieStr
        },
        body: new URLSearchParams(payload)
    });
    if (!res.ok) throw new Error(`sendMessage HTTP ${res.status}`);
    const json = await res.json().catch(() => null);
    if (json?.error) throw new Error(`FunPay runner error: ${json.error}`);
    console.log(`Foxen AR: → чат ${chatId}`);
}

// 3.0: upload an image (data URL) to FunPay and send it to a chat, in the background.
async function sendChatImage(chatId, dataUrl, auth) {
    const cookieStr = auth.phpsessid
        ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
        : `golden_key=${auth.golden_key}`;

    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append('file', new File([blob], 'image.png', { type: blob.type || 'image/png' }));
    fd.append('file_id', '0');

    const upRes = await fetchWithRetry('https://funpay.com/file/addChatImage', {
        method: 'POST',
        headers: { 'cookie': cookieStr, 'x-requested-with': 'XMLHttpRequest' },
        body: fd
    });
    if (!upRes.ok) throw new Error(`uploadImage HTTP ${upRes.status}`);
    const upJson = await upRes.json().catch(() => ({}));
    const fileId = upJson.fileId;
    if (!fileId) throw new Error('addChatImage: no fileId');

    const payload = {
        objects: JSON.stringify([{ type: 'chat_node', id: chatId, tag: '00000000', data: { node: chatId, last_message: -1, content: '' } }]),
        request: JSON.stringify({ action: 'chat_message', data: { node: chatId, last_message: -1, content: '', image_id: fileId } }),
        csrf_token: auth.csrf_token
    };
    const res = await fetchWithRetry('https://funpay.com/runner/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', 'cookie': cookieStr },
        body: new URLSearchParams(payload)
    });
    if (!res.ok) throw new Error(`sendImage HTTP ${res.status}`);
    const json = await res.json().catch(() => null);
    if (json?.error) throw new Error(`FunPay runner error: ${json.error}`);
    console.log(`Foxen AR: 🖼 → чат ${chatId}`);
}

// 3.0: send autoreply content that may contain [image:dataURL] tags. Pieces are sent in the
// SAME ORDER they appear in the text - so "text [image:...]" sends text then image, and
// "[image:...] text" sends image then text. This is the send-order control (order = position).
async function sendReplyContent(chatId, content, auth, images, sendOrder) {
    const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
    const text = (content || '').trim();
    const order = (sendOrder === 'image_first') ? 'image_first' : 'text_first';

    const sendText = async () => { if (text) await sendChatMessage(chatId, text, auth); };
    const sendImages = async (delayFirst) => {
        for (let i = 0; i < imgs.length; i++) {
            try {
                if (delayFirst || i > 0) await new Promise(r => setTimeout(r, 400));
                await sendChatImage(chatId, imgs[i], auth);
            } catch (e) {
                console.error('Foxen AR: ошибка отправки картинки автоответа', e.message);
            }
        }
    };

    // Send in the chosen order (text→image OR image→text), in the background.
    if (order === 'image_first') {
        await sendImages(false);
        if (text && imgs.length) await new Promise(r => setTimeout(r, 400));
        await sendText();
    } else {
        await sendText();
        await sendImages(!!text);
    }
}

async function sendReviewReply(orderId, text, auth, rating) {

    const stars = (rating >= 1 && rating <= 5) ? rating : '';
    const markedText = text ? (text + BOT_MARKER) : text;
    const payload = new URLSearchParams({ orderId, text: markedText, rating: stars, authorId: auth.userId, csrf_token: auth.csrf_token });
    const res = await fetchWithRetry('https://funpay.com/orders/review', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', cookie: `golden_key=${auth.golden_key}` },
        body: payload
    });
    if (!res.ok) throw new Error(`sendReviewReply HTTP ${res.status}`);
}

function applyVariables(template, vars = {}) {
    const h = new Date().getHours();
    const greeting = h >= 5 && h < 12 ? 'Доброе утро!' : h >= 12 && h < 18 ? 'Добрый день!' : 'Добрый вечер!';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const orderLink = vars.orderId ? `https://funpay.com/orders/${vars.orderId}/` : '';

    let result = template
        
        .replace(/{buyername}/gi,  vars.buyerName  || '')
        .replace(/{lotname}/gi,    vars.lotName    || '')
        .replace(/{orderid}/gi,    vars.orderId    || '')
        .replace(/{orderlink}/gi,  orderLink)
        .replace(/{welcome}/gi,    greeting)
        .replace(/{date}/gi,       `${dateStr} ${timeStr}`)
        
        .replace(/\$username/g,     vars.buyerName  || '')
        .replace(/\$order_id/g,     vars.orderId    || '')
        .replace(/\$order_link/g,   orderLink)
        .replace(/\$order_title/g,  vars.lotName    || '')
        .replace(/\$order_desc/g,   vars.lotName    || '')
        .replace(/\$game/g,         vars.game       || '')
        .replace(/\$category/g,     vars.category   || '')
        .replace(/\$date/g,         dateStr)
        .replace(/\$time/g,         timeStr)
        .replace(/\$chat_name/g,    vars.buyerName  || '');

    // Parse Spintax {option1|option2|...}
    const spintaxRegex = /{([^{}]+)}/g;
    let prevResult = '';
    let iterations = 0;
    while (result !== prevResult && iterations < 5) {
        prevResult = result;
        iterations++;
        result = result.replace(spintaxRegex, (match, optionsText) => {
            if (optionsText.includes('|')) {
                const options = optionsText.split('|');
                const randomIndex = Math.floor(Math.random() * options.length);
                return options[randomIndex];
            }
            return match;
        });
    }
    return result;
}

async function atomicUpdate(updater) {
    const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
    updater(foxenAutoReplies);
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
}

async function isBlacklisted(username, feature) {
    const { foxenBlacklist = [] } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenBlacklist');
    const entry = foxenBlacklist.find(e => e.username.toLowerCase() === username?.toLowerCase());
    if (!entry) return false;
    if (feature === 'delivery'     && entry.blockDelivery)     return true;
    if (feature === 'response'     && entry.blockResponse)     return true;
    if (feature === 'notification' && entry.blockNotification) return true;
    return false;
}

async function handleGreeting(msg, auth, settings) {
    if (!settings.greetingEnabled || !settings.greetingText) return;

    
    if (getMessageType(msg.messageText) === 'DEAR_VENDORS') return;

    
    if (settings.ignoreSystemMessages && getMessageType(msg.messageText) !== 'NON_SYSTEM') return;

    
    if (await isBlacklisted(msg.buyerName, 'response')) return;

    // Если чат инициирован нами (написали первыми), пропускаем приветствие
    const selfInitiated = settings.selfInitiatedChats || [];
    if (selfInitiated.includes(msg.chatId)) {
        console.log(`Foxen AR: пропуск приветствия — чат ${msg.chatId} инициирован нами.`);
        return;
    }

    
    const cooldownDays = parseFloat(settings.greetingCooldownDays || 0);
    const greetedTimestamps = settings.greetedTimestamps || {};
    const lastGreeted = greetedTimestamps[msg.chatId] || 0;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

    if (cooldownDays > 0 && Date.now() - lastGreeted < cooldownMs) return;

    
    if (settings.onlyNewChats) {
        const greetedUsers = settings.greetedUsers || [];
        if (greetedUsers.includes(msg.chatId)) return;
    } else {
        const greetedUsers = settings.greetedUsers || [];
        if (greetedUsers.includes(msg.chatId) && cooldownDays === 0) return;
    }

    const text = applyVariables(settings.greetingText, { buyerName: msg.buyerName, chatId: msg.chatId });

    try {
        await sendReplyContent(msg.chatId, text, auth, settings.greetingImages, settings.greetingSendOrder);
        await atomicUpdate(s => {
            const arr = s.greetedUsers || [];
            if (!arr.includes(msg.chatId)) arr.push(msg.chatId);
            s.greetedUsers = arr;
            const ts = s.greetedTimestamps || {};
            ts[msg.chatId] = Date.now();
            s.greetedTimestamps = ts;
        });
        console.log(`Foxen AR: приветствие → ${msg.chatId}`);
    } catch (e) {
        console.error('Foxen AR: ошибка приветствия', e.message);
    }
}

async function handleKeywords(msg, auth, settings) {
    if (!settings.keywordsEnabled || !settings.keywords?.length) {
        return;
    }
    if (getMessageType(msg.messageText) !== 'NON_SYSTEM') return;
    if (await isBlacklisted(msg.buyerName, 'response')) return;

    const clean = msg.messageText
        .replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, '')  // zero-width chars
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const cleanNoPunct = clean.replace(/[!?,.:;()\-–—"']/g, '').trim();

    console.log(`Foxen AR: проверка ключевых слов для чата ${msg.chatId} ("${clean}"):`, settings.keywords.map(r => r.keyword));

    for (const rule of settings.keywords) {
        if (!rule.keyword) continue;
        const kw = rule.keyword
            .replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        if (!kw) continue;
        const kwNoPunct = kw.replace(/[!?,.:;()\-–—"']/g, '').trim();

        const matches = (rule.matchMode === 'contains')
            ? (clean.includes(kw) || cleanNoPunct.includes(kwNoPunct))
            : (clean === kw || cleanNoPunct === kwNoPunct);

        if (matches) {
            console.log(`Foxen AR: совпадение по ключевому слову "${kw}" в чате ${msg.chatId}`);
            const text = applyVariables(rule.response, { buyerName: msg.buyerName });
            try {
                await sendReplyContent(msg.chatId, text, auth, rule.images, rule.sendOrder);
                return;
            } catch (e) {
                console.error('Foxen AR: ошибка keyword', e.message);
            }
        }
    }
}

async function handleReview(msg, auth, settings) {
    if (!settings.autoReviewEnabled && !settings.bonusForReviewEnabled) return;
    const msgType = getMessageType(msg.messageText);
    if (msgType !== 'NEW_FEEDBACK' && msgType !== 'FEEDBACK_CHANGED') return;

    const orderMatch = msg.messageText.match(RX.ORDER_ID);
    if (!orderMatch) return;
    const orderId = orderMatch[1];

    const alreadyReplied = (settings.repliedOrderIds || []).includes(orderId);
    // Блокировка повторного ответа для создания и изменения отзыва
    if (alreadyReplied) return;

    // Double-check: if order buyer is current user (or we are buyer in order), NEVER auto-reply to review!
    const orderBuyer = extractOrderBuyer(msg.messageText);
    if (orderBuyer && msg.chatName && orderBuyer.toLowerCase() !== msg.chatName.toLowerCase()) {
        console.log(`Foxen AR: пропуск ответа на отзыв #${orderId} — это наш отзыв как покупателя (продавцу ${msg.chatName}).`);
        return;
    }
    if (orderBuyer && auth.username && orderBuyer.toLowerCase() === auth.username.toLowerCase()) {
        console.log(`Foxen AR: пропуск ответа на отзыв #${orderId} — это наш собственный отзыв как покупателя.`);
        return;
    }
    const iAmSeller = await verifyIAmSeller(orderId, auth, msg.chatName);
    if (!iAmSeller) {
        console.log(`Foxen AR: пропуск ответа на отзыв #${orderId} — мы покупатель в этом заказе.`);
        return;
    }

    try {
        // Загрузка авторизованной страницы заказа для получения звезд и отзыва
        const cookieStr = auth.phpsessid
            ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
            : `golden_key=${auth.golden_key}`;
        const orderRes = await fetchWithRetry(`https://funpay.com/orders/${orderId}/`, { headers: { cookie: cookieStr } });
        if (!orderRes.ok) throw new Error(`HTTP ${orderRes.status}`);
        const orderHtml = await orderRes.text();
        const orderData = await parseViaOffscreen(orderHtml, 'parseOrderPageForReview');
        if (!orderData) return;

        const stars   = typeof orderData === 'object' ? orderData.stars   : orderData;
        const lotName = typeof orderData === 'object' ? (orderData.lotName || '') : '';
        const vars = { buyerName: msg.buyerName, lotName, orderId };

        if (settings.autoReviewEnabled && settings.reviewTemplates?.[stars]?.trim()) {
            const text = applyVariables(settings.reviewTemplates[stars], vars);
            try {
                await sendReviewReply(orderId, text, auth, stars);
                await atomicUpdate(s => {
                    const ids = s.repliedOrderIds || [];
                    if (!ids.includes(orderId)) ids.push(orderId);
                    if (ids.length > 500) ids.splice(0, ids.length - 500);
                    s.repliedOrderIds = ids;
                });
                // attached review images go to the chat (the review endpoint can't carry images)
                const rImgs = settings.reviewTemplateImages && settings.reviewTemplateImages[stars];
                if (Array.isArray(rImgs) && rImgs.length) {
                    for (const dataUrl of rImgs) {
                        try { await sendChatImage(msg.chatId, dataUrl, auth); await new Promise(r => setTimeout(r, 400)); }
                        catch (e) { console.error('Foxen AR: review image error', e.message); }
                    }
                }
            } catch (e) {
                console.error(`Foxen AR: ошибка ответа на отзыв #${orderId}`, e.message);
            }
        }

        if (settings.bonusForReviewEnabled && stars === 5) {
            let bonusText = '';
            if (settings.bonusMode === 'single' && settings.singleBonusText) bonusText = settings.singleBonusText;
            else if (settings.bonusMode === 'random' && settings.randomBonuses?.length)
                bonusText = settings.randomBonuses[Math.floor(Math.random() * settings.randomBonuses.length)];
            if (bonusText?.trim()) {
                // Настраиваемая задержка перед отправкой бонуса за отзыв
                const delaySec = Number(settings.bonusForReviewDelaySec);
                const delayMs = (Number.isFinite(delaySec) && delaySec >= 0 ? delaySec : 4) * 1000;
                if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
                try { await sendReplyContent(msg.chatId, applyVariables(bonusText, vars), auth); }
                catch (e) { console.error(`Foxen AR: ошибка бонуса #${orderId}`, e.message); }
            }
        }
    } catch (e) {
        console.error(`Foxen AR: ошибка обработки отзыва #${orderId}`, e.message);
    }
}

// Проверка роли продавца с кэшированием результатов по orderId
const _sellerCheckCache = new Map();
async function verifyIAmSeller(orderId, auth, chatName = '') {
    if (!orderId) return true; // нет orderId - не блокируем (старое поведение)
    if (_sellerCheckCache.has(orderId)) return _sellerCheckCache.get(orderId);
    try {
        const cookieStr = auth.phpsessid
            ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
            : `golden_key=${auth.golden_key}`;
        const res = await fetchWithRetry(`https://funpay.com/orders/${orderId}/`, { headers: { cookie: cookieStr } });
        if (!res.ok) return true; // не смогли проверить - не ломаем автоответы
        const html = await res.text();
        const info = await parseViaOffscreen(html, 'parseOrderParticipants');
        if (!info) return true;

        const myId = String(auth.userId || '');
        let iAmSeller = null;
        if (myId && info.sellerId) iAmSeller = (myId === String(info.sellerId));
        else if (myId && info.buyerId) iAmSeller = (myId !== String(info.buyerId));
        else iAmSeller = info.iAmSeller; // fall back to DOM-parsed result

        if (iAmSeller === null && chatName && info.buyerName) {
            iAmSeller = (chatName.toLowerCase() === info.buyerName.toLowerCase());
        }
        if (iAmSeller === null && auth.username) {
            if (info.buyerName) iAmSeller = (auth.username.toLowerCase() !== info.buyerName.toLowerCase());
            else if (info.sellerName) iAmSeller = (auth.username.toLowerCase() === info.sellerName.toLowerCase());
        }

        const ok = !(iAmSeller === false);
        if (iAmSeller !== null) {
            _sellerCheckCache.set(orderId, ok);
            if (_sellerCheckCache.size > 300) _sellerCheckCache.clear();
        }
        return ok;
    } catch (e) {
        return true; // при ошибке - не блокируем
    }
}

async function handleOrderPurchased(msg, auth, settings) {
    if (!settings.newOrderReplyEnabled || !settings.newOrderReplyText) return;

    const orderMatch = msg.messageText.match(RX.ORDER_ID);
    const orderId = orderMatch ? orderMatch[1] : null;
    const vars = { buyerName: msg.buyerName, orderId, orderLink: orderId ? `https://funpay.com/orders/${orderId}/` : '' };
    const text = applyVariables(settings.newOrderReplyText, vars);

    
    if (await isBlacklisted(msg.buyerName, 'response')) return;

    
    const repliedOrders = settings.repliedNewOrders || [];
    if (orderId && repliedOrders.includes(orderId)) return;

    try {
        await sendReplyContent(msg.chatId, text, auth, settings.newOrderReplyImages, settings.newOrderReplySendOrder);
        if (orderId) {
            await atomicUpdate(s => {
                const arr = s.repliedNewOrders || [];
                if (!arr.includes(orderId)) arr.push(orderId);
                if (arr.length > 200) arr.splice(0, arr.length - 200);
                s.repliedNewOrders = arr;
            });
        }
        console.log(`Foxen AR: ответ на новый заказ #${orderId} → чат ${msg.chatId}`);
    } catch (e) {
        console.error('Foxen AR: ошибка ответа на новый заказ', e.message);
    }
}

async function handleOrderConfirmed(msg, auth, settings) {
    if (!settings.orderConfirmReplyEnabled || !settings.orderConfirmReplyText) return;

    const orderMatch = msg.messageText.match(RX.ORDER_ID);
    const orderId = orderMatch ? orderMatch[1] : null;
    const vars = { buyerName: msg.buyerName, orderId };
    const text = applyVariables(settings.orderConfirmReplyText, vars);

    
    const replied = settings.repliedConfirmedOrders || [];
    if (orderId && replied.includes(orderId)) return;

    if (await isBlacklisted(msg.buyerName, 'response')) return;

    try {
        await sendReplyContent(msg.chatId, text, auth, settings.orderConfirmReplyImages, settings.orderConfirmReplySendOrder);
        if (orderId) {
            await atomicUpdate(s => {
                const arr = s.repliedConfirmedOrders || [];
                if (!arr.includes(orderId)) arr.push(orderId);
                if (arr.length > 200) arr.splice(0, arr.length - 200);
                s.repliedConfirmedOrders = arr;
            });
        }
        console.log(`Foxen AR: ответ на подтверждение заказа #${orderId}`);
    } catch (e) {
        console.error('Foxen AR: ошибка ответа на подтверждение', e.message);
    }
}

async function handleAutoDelivery(msg, auth, settings) {
    if (!settings.autoDeliveryEnabled) return;

    const msgType = getMessageType(msg.messageText);
    if (msgType !== 'ORDER_PURCHASED') return;

    const orderMatch = msg.messageText.match(RX.ORDER_ID);
    if (!orderMatch) return;
    const orderId = orderMatch[1];

    
    if (await isBlacklisted(msg.buyerName, 'delivery')) return;

    
    const delivered = settings.deliveredOrderIds || [];
    if (delivered.includes(orderId)) return;

    try {
        
        const orderRes = await fetchWithRetry(`https://funpay.com/orders/${orderId}/`, { headers: { cookie: `golden_key=${auth.golden_key}` } });
        if (!orderRes.ok) return;
        const orderHtml = await orderRes.text();

        
        const orderInfo = await parseViaOffscreen(orderHtml, 'parseOrderPageForDelivery');
        if (!orderInfo) return;

        const { secrets, lotId, nodeId, buyerChatId } = orderInfo;
        const chatId = msg.chatId || buyerChatId;

        
        const { foxenAutoDeliveryLots = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoDeliveryLots');
        const deliveryConfig = lotId ? foxenAutoDeliveryLots[String(lotId)] : null;

        let deliveryText = '';
        let deliveryMode = 'secrets'; 

        if (deliveryConfig?.mode === 'template' && deliveryConfig.text) {
            deliveryText = applyVariables(deliveryConfig.text, { buyerName: msg.buyerName, orderId });
            deliveryMode = 'template';
        } else if (deliveryConfig?.mode === 'secrets' && secrets) {
            deliveryText = secrets;
            deliveryMode = 'secrets';
        } else if (secrets && !deliveryConfig) {
            
            deliveryText = secrets;
        }

        if (!deliveryText?.trim() || !chatId) return;

        
        const parts = deliveryText.split(/\$sleep=(\d+\.?\d*)/i);
        for (let i = 0; i < parts.length; i++) {
            if (/^\d+\.?\d*$/.test(parts[i])) {
                const sleepSec = parseFloat(parts[i]);
                await new Promise(r => setTimeout(r, sleepSec * 1000));
            } else if (parts[i].trim()) {
                await sendChatMessage(chatId, parts[i].trim(), auth);
                if (i < parts.length - 1) await new Promise(r => setTimeout(r, 500));
            }
        }

        await atomicUpdate(s => {
            const arr = s.deliveredOrderIds || [];
            if (!arr.includes(orderId)) arr.push(orderId);
            if (arr.length > 200) arr.splice(0, arr.length - 200);
            s.deliveredOrderIds = arr;
        });
        console.log(`Foxen AR: авто-выдача → заказ #${orderId}, чат ${chatId}`);

    } catch (e) {
        console.error(`Foxen AR: ошибка авто-выдачи #${orderId}`, e.message);
    }
}

async function notifyDearVendors(msg) {
    const tabs = await (typeof browser !== 'undefined' ? browser : chrome).tabs.query({ url: 'https://funpay.com/*' });
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            action: 'foxenDearVendors',
            chatId: msg.chatId,
            buyerName: msg.buyerName
        }).catch(() => {});
    });
}

const RUNNER_TAG_KEY = 'foxenAutoResponderTag';
let __arCycleRunning = false;

export async function runAutoResponderCycle() {
    if (__arCycleRunning) return;          // a cycle is already in flight - skip this trigger
    __arCycleRunning = true;
    try {
        await _runAutoResponderCycleInner();
    } finally {
        __arCycleRunning = false;
    }
}

async function _runAutoResponderCycleInner() {
    const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');

    const anyEnabled =
        foxenAutoReplies.greetingEnabled      ||
        foxenAutoReplies.keywordsEnabled      ||
        foxenAutoReplies.autoReviewEnabled    ||
        foxenAutoReplies.bonusForReviewEnabled||
        foxenAutoReplies.newOrderReplyEnabled ||
        foxenAutoReplies.orderConfirmReplyEnabled ||
        foxenAutoReplies.autoDeliveryEnabled;

    if (!anyEnabled) return;

    const auth = await getAuth();
    if (!auth.golden_key || !auth.csrf_token || !auth.userId) return;

    try {
        // Foxen 3.3.1: Generate fresh random tags for chat_bookmarks and orders_counters
        // on every poll. Reusing server tags causes FunPay long-polling to conflict with open tabs
        // on funpay.com, leading to data: false and missed auto-responses.
        const chatReqTag = randomTag();
        const orderReqTag = randomTag();

        const runnerPayload = {
            objects: JSON.stringify([
                { type: 'chat_bookmarks',  id: auth.userId, tag: chatReqTag,  data: false },
                { type: 'orders_counters', id: auth.userId, tag: orderReqTag, data: false }
            ]),
            request: false,
            csrf_token: auth.csrf_token
        };

        // FunPay runner requires BOTH golden_key AND PHPSESSID - without PHPSESSID it
        // returns 200 but silently drops the request.
        const pollingCookieStr = auth.phpsessid
            ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}`
            : `golden_key=${auth.golden_key}`;

        const res = await fetchWithRetry('https://funpay.com/runner/', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', cookie: pollingCookieStr },
            body: new URLSearchParams(runnerPayload)
        }, { retries: 2, baseDelay: 600, timeoutMs: 12000 });

        if (!res.ok) throw new Error(`Runner HTTP ${res.status}`);
        const data = await res.json();
        
        const chatObj = data.objects?.find(o => o.type === 'chat_bookmarks');
        const orderObj = data.objects?.find(o => o.type === 'orders_counters');

        if (!chatObj || !chatObj.data?.html) return;

        const chats = await parseViaOffscreen(chatObj.data.html, 'parseChatList');
        const { foxenAutoReplies: fresh = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');

        const lastSeen = fresh.lastSeenMsgIds || {};
        const isFirstRun = !fresh.autoResponderSeeded;

        const updates = {}; // chatId -> newest msgId to persist
        const textUpdates = {}; // chatId -> last handled message text 

        for (const chat of chats) {
            const nodeMsg = chat.nodeMsg;            // last message id in the chat
            const userMsg = chat.userMsg;            // last id the account has read
            const prevSeen = lastSeen[chat.chatId] || 0;

            let hasNew;
            if (nodeMsg != null) {
                hasNew = nodeMsg > prevSeen;
            } else {
                hasNew = chat.isUnread && !( (fresh.processedMessageIds || []).includes(chat.msgId) );
            }
            if (chat.lastByBot) {
                if (nodeMsg != null) updates[chat.chatId] = Math.max(prevSeen, nodeMsg);
                continue;
            }

            // Пропускаем чаты, где последнее сообщение отправлено нами
            if (chat.lastByMe) {
                if (nodeMsg != null) updates[chat.chatId] = Math.max(prevSeen, nodeMsg);
                continue;
            }

            if (!hasNew) continue;

            // Always advance our per-chat marker so we never re-handle this id, even on first run.
            if (nodeMsg != null) updates[chat.chatId] = Math.max(prevSeen, nodeMsg);

            if (isFirstRun) continue; 
            const lastText = (fresh.lastHandledText || {})[chat.chatId];
            const isSameText = lastText != null && lastText === chat.messageText;
            if (isSameText) continue;

            const msgType = getMessageType(chat.messageText);
            const msg = {
                chatId:      chat.chatId,
                messageId:   chat.msgId,
                messageText: chat.messageText,
                buyerName:   chat.chatName,
                msgType
            };

            if (msgType === 'DEAR_VENDORS') {
                await notifyDearVendors(msg);
            } else if (msgType === 'ORDER_PURCHASED' || msgType === 'ORDER_CONFIRMED'
                       || msgType === 'NEW_FEEDBACK' || msgType === 'FEEDBACK_CHANGED') {

                // 1. Извлекаем реальный ник покупателя и продавца из текста системного сообщения
                const orderBuyer = extractOrderBuyer(msg.messageText);
                const orderSeller = extractOrderSeller(msg.messageText);
                if (orderBuyer) {
                    msg.buyerName = orderBuyer;
                }

                let iAmSeller = null;

                // Priority 1: Прямое совпадение продавца/покупателя из сообщения с нашим текущим ником
                if (orderSeller && auth.username) {
                    if (cleanName(orderSeller) === cleanName(auth.username)) {
                        iAmSeller = true;
                    }
                }
                if (orderBuyer && auth.username) {
                    if (cleanName(orderBuyer) === cleanName(auth.username)) {
                        iAmSeller = false;
                    }
                }

                // Priority 2: Мгновенная проверка по названию собеседника в чате (очищенному)
                if (iAmSeller === null && orderBuyer && chat.chatName) {
                    const cBuyer = cleanName(orderBuyer);
                    const cChat = cleanName(chat.chatName);
                    if (cBuyer && cChat) {
                        iAmSeller = (cBuyer === cChat);
                    }
                }

                // Priority 3: Запасная проверка через запрос страницы заказа
                if (iAmSeller === null) {
                    const _oid = (msg.messageText.match(RX.ORDER_ID) || [])[1] || null;
                    iAmSeller = await verifyIAmSeller(_oid, auth, chat.chatName);
                }

                // Если я ПОКУПАТЕЛЬ (iAmSeller === false), блокируем ВСЕ авто-ответы/авто-выдачи!
                if (!iAmSeller) {
                    console.log(`Foxen AR: пропуск события по заказу — это моя покупка (покупатель: ${msg.buyerName}), не реагируем.`);
                    if (!(fresh.selfInitiatedChats || []).includes(msg.chatId)) {
                        await atomicUpdate(s => {
                            const arr = s.selfInitiatedChats || [];
                            if (!arr.includes(msg.chatId)) arr.push(msg.chatId);
                            if (arr.length > 500) arr.splice(0, arr.length - 500);
                            s.selfInitiatedChats = arr;
                        });
                    }
                    continue;
                }

                const _oid = (msg.messageText.match(RX.ORDER_ID) || [])[1] || null;

                if (msgType === 'ORDER_PURCHASED') {
                    await handleOrderPurchased(msg, auth, fresh);
                    await handleAutoDelivery(msg, auth, fresh);
                } else if (msgType === 'ORDER_CONFIRMED') {
                    await handleOrderConfirmed(msg, auth, fresh);
                } else {
                    await handleReview(msg, auth, fresh);
                }
            } else if (msgType === 'NON_SYSTEM') {
                await handleGreeting(msg, auth, fresh);
                await handleKeywords(msg, auth, fresh);
            }

            // remember the text we just handled for this chat (text guard above)
            textUpdates[chat.chatId] = chat.messageText;
        }

        if (Object.keys(updates).length > 0 || Object.keys(textUpdates).length > 0 || isFirstRun) {
            await atomicUpdate(s => {
                const m = s.lastSeenMsgIds || {};
                for (const [cid, id] of Object.entries(updates)) {
                    m[cid] = Math.max(m[cid] || 0, id);
                }
                // cap size
                const keys = Object.keys(m);
                if (keys.length > 1000) {
                    // drop the lowest-id (oldest) entries
                    keys.sort((a, b) => m[a] - m[b]).slice(0, keys.length - 1000).forEach(k => delete m[k]);
                }
                s.lastSeenMsgIds = m;

                const t = s.lastHandledText || {};
                for (const [cid, txt] of Object.entries(textUpdates)) t[cid] = txt;
                const tkeys = Object.keys(t);
                if (tkeys.length > 1000) {
                    // drop oldest by id ordering if available, else arbitrary
                    tkeys.slice(0, tkeys.length - 1000).forEach(k => delete t[k]);
                }
                s.lastHandledText = t;

                s.autoResponderSeeded = true;
            });
        }

    } catch (e) {
        clearAutoresponderAuthCache();
        console.error('Foxen AR: ошибка цикла', e.message);
    }
}

export async function resetAutoResponderState() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.remove(RUNNER_TAG_KEY);
    const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
    if (
        !foxenAutoReplies.lastSeenMsgIds &&
        !foxenAutoReplies.lastHandledText &&
        !foxenAutoReplies.autoResponderSeeded &&
        !foxenAutoReplies.selfInitiatedChats
    ) {
        return;
    }
    delete foxenAutoReplies.lastSeenMsgIds;
    delete foxenAutoReplies.lastHandledText;
    delete foxenAutoReplies.autoResponderSeeded;
    delete foxenAutoReplies.selfInitiatedChats;
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
}