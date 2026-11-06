// content/features/buyer_history.js

let _bhCache = {};

async function loadBuyerHistory(buyerUsername) {
    if (!buyerUsername) return [];
    const cached = _bhCache[buyerUsername];
    if (cached && Date.now() - cached.t < 5 * 60 * 1000) return cached.orders;

    try {
        const allOrders = await FPTSalesDB.getAllAsArray();
        const localOrders = allOrders
            .filter(o => o.buyerUsername && o.buyerUsername.toLowerCase() === buyerUsername.toLowerCase())
            .sort((a, b) => (b.orderDate || 0) - (a.orderDate || 0))
            .slice(0, 30)
            .map(o => ({
                orderId: o.orderId,
                desc: o.description || o.subcategoryName || '',
                price: o.price ? `${o.price} ${o.currency || '₽'}` : '',
                date: o.orderDateText || o.orderDate || ''
            }));
        if (localOrders.length > 0) {
            _bhCache[buyerUsername] = { orders: localOrders, t: Date.now() };
            return localOrders;
        }
    } catch (_) {}

    try {
        const url = `https://funpay.com/orders/trade?buyer=${encodeURIComponent(buyerUsername)}`;
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) return [];
        const html = await res.text();

        const orders = await Promise.race([
            new Promise(r => chrome.runtime.sendMessage(
                { target: 'offscreen', action: 'parseBuyerHistory', html, buyerUserId: buyerUsername },
                d => r(d || [])
            )),
            new Promise(r => setTimeout(() => r([]), 8000))
        ]);

        if (orders.length > 0) {
            _bhCache[buyerUsername] = { orders, t: Date.now() };
        }
        return orders;
    } catch (_) { return []; }
}

function renderHistoryPanel(orders, name, anchor) {
    document.getElementById('fp-buyer-hist-panel')?.remove();

    const total = orders.reduce((s, o) => {
        const num = parseFloat((o.price || '').replace(/[^\d.]/g, ''));
        return s + (isNaN(num) ? 0 : num);
    }, 0);

    const panel = document.createElement('div');
    panel.id = 'fp-buyer-hist-panel';
    panel.className = 'fp-buyer-hist-panel';

    panel.innerHTML = `
        <div class="fp-bh-header">
            <div class="fp-bh-title">
                <span class="fp-bh-icon">📦</span>
                <span>История покупок <strong>${name}</strong></span>
            </div>
            <button class="fp-bh-close" title="Закрыть">✕</button>
        </div>
        <div class="fp-bh-meta">${orders.length} заказ${orders.length === 1 ? '' : (orders.length < 5 ? 'а' : 'ов')} · ~${Math.round(total).toLocaleString('ru')} ₽</div>
        <div class="fp-bh-list">
            ${orders.slice(0, 20).map(o => `
                <a href="https://funpay.com/orders/${o.orderId}/" target="_blank" class="fp-bh-item">
                    <div class="fp-bh-item-desc">${o.desc || o.orderId}</div>
                    <div class="fp-bh-item-meta">
                        <span class="fp-bh-price">${o.price}</span>
                        <span class="fp-bh-dot">·</span>
                        <span class="fp-bh-date">${o.date}</span>
                    </div>
                </a>`).join('')}
        </div>`;

    panel.querySelector('.fp-bh-close').addEventListener('click', () => panel.remove());
    anchor.style.position = 'relative';
    anchor.appendChild(panel);

    setTimeout(() => {
        const handler = (e) => {
            const targetEl = e.target instanceof Element ? e.target : e.target?.parentElement;
            if (!panel.contains(e.target) && !targetEl?.closest?.('#fp-buyer-hist-menu-btn')) {
                panel.remove();
                document.removeEventListener('click', handler);
            }
        };
        document.addEventListener('click', handler);
    }, 0);
}

// ─── Translation engine ────────────────────────────────────────────────────────

async function translateText(text) {
    if (!text || !text.trim()) return null;
    if (typeof window.fxnTranslateText === 'function') {
        try {
            const res = await window.fxnTranslateText(text, 'ru');
            if (res && res.text && res.text !== text) return res.text;
        } catch (_) {}
    }
    try {
        const u = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=ru&q=' + encodeURIComponent(text);
        const res = await fetch(u);
        const json = await res.json();
        const tr = Array.isArray(json) ? (Array.isArray(json[0]) ? json[0][0] : json[0]) : '';
        if (tr && tr !== text) return tr;
    } catch (_) {}
    return null;
}

async function appendTranslation(msgTextEl) {
    if (msgTextEl.dataset.fpTransDone) return;
    msgTextEl.dataset.fpTransDone = '1';

    const orig = msgTextEl.innerText.trim();
    if (!orig || orig.length < 3) return;

    const translated = await translateText(orig);
    if (!translated) return;

    const wrap = document.createElement('div');
    wrap.className = 'fp-trans-wrap';
    wrap.innerHTML =
        '<div class="fp-trans-divider"></div>' +
        '<div class="fp-trans-text">' + translated + '</div>';

    msgTextEl.appendChild(wrap);
}

function removeAllTranslations() {
    document.querySelectorAll('.fp-trans-wrap').forEach(el => el.remove());
    document.querySelectorAll('[data-fp-trans-done]').forEach(el => delete el.dataset.fpTransDone);
}

let _translateMode = false;
let _chatObserver  = null;

function startRealtimeTranslation() {
    const list = document.querySelector('.chat-message-list');
    if (!list) return;

    list.querySelectorAll('.chat-msg-text').forEach(appendTranslation);

    _chatObserver = new MutationObserver((muts) => {
        for (const mut of muts) {
            for (const node of mut.addedNodes) {
                if (node.nodeType !== 1) continue;
                const els = node.matches?.('.chat-msg-text')
                    ? [node]
                    : [...(node.querySelectorAll?.('.chat-msg-text') || [])];
                els.forEach(appendTranslation);
            }
        }
    });
    _chatObserver.observe(list, { childList: true, subtree: true });
}

function stopRealtimeTranslation() {
    _chatObserver?.disconnect();
    _chatObserver = null;
    removeAllTranslations();
}

(function injectTranslateStyles() {
    if (document.getElementById('fp-trans-styles')) return;
    const s = document.createElement('style');
    s.id = 'fp-trans-styles';
    s.textContent = `
        .fp-trans-divider {
            margin: 5px 0 4px;
            border-top: 1px solid rgba(255,255,255,0.08);
        }
        .fp-trans-text {
            color: rgba(200,202,220,0.55);
            font-size: 0.92em;
            line-height: 1.4;
            word-break: break-word;
        }
    `;
    document.head.appendChild(s);
})();

// ─── Внедрение кнопок в НАСТОЯЩЕЕ ТРОЕТОЧИЕ FunPay ────────────────────────────

const FXN_CHAT_ICONS = {
    report: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#f87171"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>`,
    block: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fb7185"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>`,
    unblock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#34d399"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    history: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z"/></svg>`,
    loading: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" style="animation: fxnSpin 0.8s linear infinite;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`,
    translate: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12.87 15.07l-2.54-2.51.03-.08c1.74-1.94 2.98-4.17 3.71-6.49H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`,
    export: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#a78bfa"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
    blurOff: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    blurOn: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#c084fc"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`,
    blacklistAdd: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#f87171"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>`,
    blacklistRemove: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#34d399"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`
};

function attachChatMenuItems(chatHeader) {
    if (!chatHeader || chatHeader.dataset.fpHistAttached) return;

    const chatEl = chatHeader.closest(".chat") || chatHeader.parentElement?.closest(".chat");
    const buyerUserId = chatEl?.dataset?.user;
    if (!buyerUserId) return;

    const userLink = chatHeader.querySelector(".media-user-name a[href*=\"/users/\"]");
    const buyerName = userLink ? userLink.textContent.trim() : "Покупатель";


    const tryInject = () => {
        // Ищем родное выпадающее меню FunPay (находится в .chat-header-controls .dropdown-menu)
        const menu = chatHeader.querySelector('.dropdown-menu');
        if (!menu) { setTimeout(tryInject, 200); return; }
        if (menu.querySelector('#fp-buyer-hist-menu-btn')) return;

        chatHeader.dataset.fpHistAttached = 'true';

        // Декорируем стандартные пункты FunPay иконками для единого гармоничного стиля
        const decorateNativeItems = () => {
            menu.querySelectorAll('li > a').forEach(a => {
                if (a.dataset.fxnDecorated) return;
                const txt = a.textContent.trim();
                if (txt === 'Пожаловаться' || txt.includes('Пожаловаться') || txt.toLowerCase().includes('report')) {
                    a.dataset.fxnDecorated = '1';
                    a.classList.add('fxn-chat-dd-item');
                    a.innerHTML = `<span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.report}</span><span class="fxn-chat-dd-text">${txt}</span>`;
                } else if (txt === 'Заблокировать' || txt.includes('Заблокировать') || txt.includes('Разблокировать') || txt.toLowerCase().includes('block')) {
                    a.dataset.fxnDecorated = '1';
                    a.classList.add('fxn-chat-dd-item');
                    const isUnblock = txt.includes('Разблокировать') || txt.toLowerCase().includes('unblock');
                    a.innerHTML = `<span class="fxn-chat-dd-icon">${isUnblock ? FXN_CHAT_ICONS.unblock : FXN_CHAT_ICONS.block}</span><span class="fxn-chat-dd-text">${txt}</span>`;
                }
            });
        };
        decorateNativeItems();

        menu.insertAdjacentHTML('beforeend', '<li class="divider" style="margin:4px 0;"></li>');

        // 1. История покупок
        const histLi = document.createElement('li');
        histLi.innerHTML = `
            <a href="#" id="fp-buyer-hist-menu-btn" class="fxn-chat-dd-item">
                <span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.history}</span>
                <span class="fxn-chat-dd-text">История покупок</span>
            </a>
        `;
        histLi.querySelector('a').addEventListener('click', async (e) => {
            e.preventDefault();
            const a = e.currentTarget;
            const _ulink = chatHeader.querySelector('.media-user-name a[href*="/users/"]');
            const _name = _ulink ? _ulink.textContent.trim() : '';
            if (!_name) { if (typeof showNotification === 'function') showNotification('Не удалось определить покупателя'); return; }
            document.getElementById('fp-buyer-hist-panel')?.remove();
            const iconEl = a.querySelector('.fxn-chat-dd-icon');
            const textEl = a.querySelector('.fxn-chat-dd-text');
            if (iconEl) iconEl.innerHTML = FXN_CHAT_ICONS.loading;
            if (textEl) textEl.textContent = 'Загрузка...';
            const orders = await loadBuyerHistory(_name);
            if (iconEl) iconEl.innerHTML = FXN_CHAT_ICONS.history;
            if (textEl) textEl.textContent = 'История покупок';
            if (!orders || !orders.length) {
                if (typeof showNotification === 'function') showNotification('Покупок у этого покупателя не найдено');
                return;
            }
            renderHistoryPanel(orders, _name, chatHeader);
        });
        menu.appendChild(histLi);

        // 2. Режим перевода
        const transLi = document.createElement('li');
        transLi.innerHTML = `
            <a href="#" id="fp-translate-menu-btn" class="fxn-chat-dd-item ${_translateMode ? 'active' : ''}">
                <span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.translate}</span>
                <span class="fxn-chat-dd-text">${_translateMode ? 'Выключить перевод' : 'Включить перевод'}</span>
            </a>
        `;
        transLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            const a = e.currentTarget;
            _translateMode = !_translateMode;
            const textEl = a.querySelector('.fxn-chat-dd-text');
            if (_translateMode) {
                if (textEl) textEl.textContent = 'Выключить перевод';
                a.classList.add('active');
                startRealtimeTranslation();
            } else {
                if (textEl) textEl.textContent = 'Включить перевод';
                a.classList.remove('active');
                stopRealtimeTranslation();
            }
        });
        menu.appendChild(transLi);

        // 3. Экспорт чата
        const exportLi = document.createElement('li');
        exportLi.innerHTML = `
            <a href="#" id="fp-export-chat-menu-btn" class="fxn-chat-dd-item">
                <span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.export}</span>
                <span class="fxn-chat-dd-text">Экспортировать чат</span>
            </a>
        `;
        exportLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            const msgs = [];
            let lastAuthor = '';
            document.querySelectorAll('.chat-msg-item').forEach(item => {
                const authorEl = item.querySelector('.chat-msg-author-link');
                if (authorEl) lastAuthor = authorEl.textContent.trim();
                const author = lastAuthor || 'Собеседник';
                const text   = item.querySelector('.chat-msg-text')?.textContent.trim() || '';
                const dateEl = item.querySelector('.chat-msg-date');
                // у первого сообщения серии есть видимая дата, у последующих - только в title
                const date   = dateEl ? (dateEl.textContent.trim() || dateEl.getAttribute('title')?.trim() || '') : '';
                if (text) msgs.push(date ? `[${date}] ${author}: ${text}` : `${author}: ${text}`);
            });
            if (!msgs.length) { if (typeof showNotification === 'function') showNotification('Нет сообщений для экспорта', true); return; }
            const partner = chatHeader.querySelector('.media-user-name a')?.textContent.trim() || 'chat';
            const dateStr = new Date().toISOString().slice(0, 10);
            const blob = new Blob([msgs.join('\n')], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `funpay_chat_${partner}_${dateStr}.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
            if (typeof showNotification === 'function') showNotification('Чат экспортирован ✓');
        });
        menu.appendChild(exportLi);

        // 4. Размытие сообщений (блок по центру) - обычная аккуратная кнопка без тумблера
        const blurLi = document.createElement('li');
        blurLi.className = 'fxn-chat-blur-msg-item';
        blurLi.innerHTML = `
            <a href="#" id="fp-chat-blur-msg-btn" class="fxn-chat-dd-item">
                <span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.blurOff}</span>
                <span class="fxn-chat-dd-text">Размытие сообщений</span>
            </a>
        `;

        const blurBtn = blurLi.querySelector('#fp-chat-blur-msg-btn');

        const syncMsgBlurState = () => {
            const isMsgBlur = (function() {
                try {
                    return sessionStorage.getItem('foxen_blur_chat_messages') === '1' ||
                           localStorage.getItem('foxen_blur_chat_messages') === '1' ||
                           document.documentElement.classList.contains('fxn-blur-messages');
                } catch (_) { return false; }
            })();
            blurBtn.classList.toggle('active', !!isMsgBlur);
            const iconEl = blurBtn.querySelector('.fxn-chat-dd-icon');
            const textEl = blurBtn.querySelector('.fxn-chat-dd-text');
            if (iconEl) iconEl.innerHTML = isMsgBlur ? FXN_CHAT_ICONS.blurOn : FXN_CHAT_ICONS.blurOff;
            if (textEl) textEl.textContent = isMsgBlur ? 'Выключить размытие' : 'Размытие сообщений';
        };
        syncMsgBlurState();

        const toggleMsgBlur = (newVal) => {
            const current = document.documentElement.classList.contains('fxn-blur-messages');
            const nextVal = typeof newVal === 'boolean' ? newVal : !current;
            document.documentElement.classList.toggle('fxn-blur-messages', nextVal);
            document.body?.classList.toggle('fxn-blur-messages', nextVal);
            try {
                sessionStorage.setItem('foxen_blur_chat_messages', nextVal ? '1' : '0');
                localStorage.setItem('foxen_blur_chat_messages', nextVal ? '1' : '0');
            } catch (_) {}
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ foxen_blur_chat_messages: nextVal });
            }
            syncMsgBlurState();
            window.dispatchEvent(new CustomEvent('foxen_blur_messages_changed', { detail: { enabled: nextVal } }));
        };

        blurBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMsgBlur();
        });

        window.addEventListener('foxen_blur_messages_changed', (e) => {
            if (typeof e.detail?.enabled === 'boolean') {
                syncMsgBlurState();
            }
        });

        menu.appendChild(blurLi);

        menu.insertAdjacentHTML('beforeend', '<li class="divider" style="margin:4px 0;"></li>');

        // 5. Добавить / удалить из ЧС
        const blLi = document.createElement('li');
        const blA = document.createElement('a');
        blA.href = '#';
        blA.id = 'fp-blacklist-menu-btn';
        blA.className = 'fxn-chat-dd-item';
        blA.innerHTML = `<span class="fxn-chat-dd-icon">${FXN_CHAT_ICONS.blacklistAdd}</span><span class="fxn-chat-dd-text">Добавить в ЧС</span>`;
        blA.style.color = '#f87171';
        blLi.appendChild(blA);

        const syncBlText = async () => {
            const inList = (typeof isInBlacklist === 'function') ? await isInBlacklist(buyerName) : false;
            const iconEl = blA.querySelector('.fxn-chat-dd-icon');
            const textEl = blA.querySelector('.fxn-chat-dd-text');
            if (iconEl) iconEl.innerHTML = inList ? FXN_CHAT_ICONS.blacklistRemove : FXN_CHAT_ICONS.blacklistAdd;
            if (textEl) textEl.textContent = inList ? 'Удалить из ЧС' : 'Добавить в ЧС';
            blA.style.color = inList ? '#34d399' : '#f87171';
        };
        syncBlText();

        blA.addEventListener('click', async (e) => {
            e.preventDefault();
            if (typeof isInBlacklist !== 'function' || typeof addToBlacklistFromChat !== 'function') {
                if (typeof showNotification === 'function') showNotification('Модуль чёрного списка загружается...', true);
                return;
            }
            const inList = await isInBlacklist(buyerName);
            if (inList) {
                await removeFromBlacklistByName(buyerName);
            } else {
                await addToBlacklistFromChat(buyerName);
            }
            await syncBlText();
        });

        // Обновляем подпись и синхронизацию при каждом открытии меню
        const blToggleBtn = chatHeader.querySelector('[data-toggle="dropdown"]');
        if (blToggleBtn && !blToggleBtn.dataset.fpBlSyncBound) {
            blToggleBtn.dataset.fpBlSyncBound = '1';
            blToggleBtn.addEventListener('click', () => {
                setTimeout(decorateNativeItems, 0);
                setTimeout(syncBlText, 0);
                setTimeout(syncMsgBlurState, 0);
            });
        }
        document.addEventListener('foxenBlacklistUpdated', syncBlText);

        menu.appendChild(blLi);
    };

    chatHeader.querySelectorAll('.fxn-header-quick-group').forEach(el => el.remove());
    tryInject();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _bhObsActive = false;
function initBuyerHistoryObserver() {
    if (_bhObsActive) return;
    _bhObsActive = true;

    document.querySelectorAll('#fp-buyer-hist-btn, .fxn-header-quick-group').forEach(el => el.remove());
    document.querySelectorAll('.chat-header, .chat-full-header').forEach(attachChatMenuItems);

    const root = document.getElementById('content') || document.body;
    new MutationObserver((muts) => {
        for (const mut of muts) {
            for (const node of mut.addedNodes) {
                if (node.nodeType !== 1) continue;
                const headers = node.matches?.('.chat-header, .chat-full-header')
                    ? [node]
                    : [...(node.querySelectorAll?.('.chat-header, .chat-full-header') || [])];
                headers.forEach(attachChatMenuItems);
            }
        }
    }).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuyerHistoryObserver);
} else {
    initBuyerHistoryObserver();
}