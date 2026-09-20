// content/features/chat_order_badge.js
// Плашка заказа в боковой панели чата (.chat-detail-list.custom-scroll).
// Отображает полную статистику заказа (статус, сумму, количество, категорию, ссылку на заказ)
// и имя персонажа с кнопкой быстрого копирования в один клик.

(function () {
    'use strict';

    const _orderPageCache = new Map();

    function hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(192, 38, 211, ${alpha})`;
        let c = hex.trim().replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length !== 6) return `rgba(192, 38, 211, ${alpha})`;
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    async function syncBadgeAccentColor(badge) {
        if (!badge) return;
        let accent = null;
        try {
            if (window.__fptUserAccent) {
                accent = window.__fptUserAccent;
            } else {
                const docAccent = getComputedStyle(document.documentElement).getPropertyValue('--fxn-accent').trim();
                if (docAccent && docAccent !== '#C026D3') {
                    accent = docAccent;
                }
            }

            if (!accent) {
                const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
                const data = await new Promise(r => storage.get(['foxenAccentColor', 'foxenHeaderButtons', 'foxenTheme'], r));
                accent = data?.foxenAccentColor || data?.foxenHeaderButtons?.color || data?.foxenTheme?.bgColor1;
            }
        } catch (_) {}

        if (!accent || accent === 'default') {
            accent = '#C026D3';
        }

        const accentSoft = hexToRgba(accent, 0.15);
        const accentBorder = hexToRgba(accent, 0.38);
        const accentGlow = hexToRgba(accent, 0.28);
        const accentDark = hexToRgba(accent, 0.85);

        badge.style.setProperty('--fxn-accent', accent);
        badge.style.setProperty('--fxn-accent-soft', accentSoft);
        badge.style.setProperty('--fxn-accent-border', accentBorder);
        badge.style.setProperty('--fxn-accent-glow', accentGlow);
        badge.style.setProperty('--fxn-accent-dark', accentDark);
    }

    function injectStyles() {
        if (document.getElementById('fxn-order-badge-styles')) return;
        const style = document.createElement('style');
        style.id = 'fxn-order-badge-styles';
        style.textContent = `
            .fxn-order-badge-panel {
                margin: 10px 0 !important;
                padding: 12px 14px !important;
                background: linear-gradient(165deg,
                    var(--fxn-surface, rgba(22, 24, 38, 0.96)),
                    var(--fxn-surface-2, rgba(16, 18, 30, 0.98))
                ) !important;
                border: 1px solid var(--fxn-accent-border, rgba(192, 38, 211, 0.35)) !important;
                border-radius: 12px !important;
                box-shadow:
                    0 8px 24px rgba(0, 0, 0, 0.45),
                    0 0 16px var(--fxn-accent-soft, rgba(192, 38, 211, 0.12)) !important;
                font-family: Inter, 'Segoe UI', system-ui, sans-serif !important;
                color: var(--fxn-text, #e2e8f0) !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                position: relative !important;
                overflow: visible !important;
                transition: border-color 0.25s ease, box-shadow 0.25s ease !important;
            }
            .fxn-order-badge-panel:hover {
                border-color: var(--fxn-accent, #C026D3) !important;
                box-shadow:
                    0 10px 28px rgba(0, 0, 0, 0.5),
                    0 0 20px var(--fxn-accent-glow, rgba(192, 38, 211, 0.25)) !important;
            }
            .fxn-ob-top-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: wrap !important;
                gap: 4px 8px !important;
                width: 100% !important;
            }
            .fxn-ob-id-badge {
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                min-width: 0 !important;
            }
            .fxn-ob-ms-icon {
                font-family: 'Material Symbols Rounded' !important;
                font-size: 16px !important;
                line-height: 1 !important;
                font-weight: 400 !important;
                font-style: normal !important;
                letter-spacing: normal !important;
                text-transform: none !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
                color: var(--fxn-accent, #C026D3) !important;
                user-select: none !important;
            }
            .fxn-ob-ms-icon.muted {
                color: var(--fxn-text-muted, #9099b8) !important;
                font-size: 14px !important;
            }
            .fxn-ob-ms-icon.sm {
                font-size: 13px !important;
            }
            .fxn-ob-order-id {
                font-size: 13.5px !important;
                font-weight: 800 !important;
                color: var(--fxn-text, #ffffff) !important;
                letter-spacing: 0.2px !important;
                white-space: nowrap !important;
                font-variant-numeric: tabular-nums !important;
            }
            .fxn-ob-status-badge {
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
                padding: 3px 8px !important;
                border-radius: 6px !important;
                font-size: 10.5px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
            }
            .fxn-ob-status-paid {
                background: rgba(34, 197, 94, 0.15) !important;
                color: #4ade80 !important;
                border: 1px solid rgba(34, 197, 94, 0.35) !important;
            }
            .fxn-ob-status-closed {
                background: rgba(96, 165, 250, 0.15) !important;
                color: #60a5fa !important;
                border: 1px solid rgba(96, 165, 250, 0.35) !important;
            }
            .fxn-ob-status-refund {
                background: rgba(248, 113, 113, 0.15) !important;
                color: #f87171 !important;
                border: 1px solid rgba(248, 113, 113, 0.35) !important;
            }
            .fxn-ob-title-box {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 6px 9px !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                border-radius: 8px !important;
                font-size: 11.5px !important;
                font-weight: 600 !important;
                color: var(--fxn-text-muted, #a0aec0) !important;
            }
            .fxn-ob-title-text {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                color: var(--fxn-text, #e2e8f0) !important;
            }
            .fxn-ob-stats-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)) !important;
                gap: 6px !important;
                width: 100% !important;
            }
            .fxn-ob-stat-card {
                display: flex !important;
                flex-direction: column !important;
                gap: 2px !important;
                padding: 6px 8px !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                border-radius: 8px !important;
            }
            .fxn-ob-stat-label {
                font-size: 10px !important;
                font-weight: 600 !important;
                color: var(--fxn-text-muted, #9099b8) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.3px !important;
            }
            .fxn-ob-stat-val {
                font-size: 12.5px !important;
                font-weight: 700 !important;
                color: var(--fxn-text, #ffffff) !important;
            }
            .fxn-ob-char-section {
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
                width: 100% !important;
            }
            .fxn-ob-char-header {
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                font-size: 10px !important;
                font-weight: 600 !important;
                color: var(--fxn-text-muted, #9099b8) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
            }
            .fxn-ob-char-chip {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 6px !important;
                padding: 7px 10px !important;
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.12)) !important;
                border: 1px solid var(--fxn-accent-border, rgba(192, 38, 211, 0.35)) !important;
                border-radius: 8px !important;
                color: var(--fxn-text, #ffffff) !important;
                font-size: 12.5px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                width: 100% !important;
                box-sizing: border-box !important;
                transition: all 0.2s ease !important;
            }
            .fxn-ob-char-chip:hover {
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.22)) !important;
                border-color: var(--fxn-accent, #C026D3) !important;
                box-shadow: 0 0 12px var(--fxn-accent-glow, rgba(192, 38, 211, 0.3)) !important;
            }
            .fxn-ob-char-chip.copied {
                background: rgba(34, 197, 94, 0.18) !important;
                border-color: #22c55e !important;
                color: #4ade80 !important;
            }
            .fxn-ob-char-chip.copied .fxn-ob-ms-icon {
                color: #4ade80 !important;
            }
            .fxn-ob-char-name {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                flex: 1 !important;
            }
            .fxn-ob-open-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 5px !important;
                padding: 5px 10px !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                color: var(--fxn-accent, #C026D3) !important;
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.1)) !important;
                border: 1px solid var(--fxn-accent-border, rgba(192, 38, 211, 0.3)) !important;
                border-radius: 7px !important;
                text-decoration: none !important;
                transition: all 0.15s ease !important;
                width: 100% !important;
                box-sizing: border-box !important;
                margin-top: 2px !important;
            }
            .fxn-ob-open-btn:hover {
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.22)) !important;
                border-color: var(--fxn-accent, #C026D3) !important;
                color: #ffffff !important;
                box-shadow: 0 0 10px var(--fxn-accent-glow, rgba(192, 38, 211, 0.25)) !important;
            }
            .fxn-ob-open-btn .fxn-ob-ms-icon {
                font-size: 13.5px !important;
                color: inherit !important;
            }
        `;
        document.head.appendChild(style);
    }

    function getCleanBuyerUsername() {
        const link = document.querySelector('.chat-header .media-user-name a, .chat-detail .media-user-name a, a.media-user-name');
        if (link && link.textContent) return link.textContent.trim().split(/\s+/)[0];

        const activeItem = document.querySelector('.contact-item.active');
        if (activeItem) {
            const nameEl = activeItem.querySelector('.media-user-name');
            if (nameEl && nameEl.textContent) return nameEl.textContent.trim().split(/\s+/)[0];
        }

        const anyName = document.querySelector('.media-user-name');
        if (anyName && anyName.textContent) return anyName.textContent.trim().split(/\s+/)[0];

        return '';
    }

    function extractOrderDataFromDOM() {
        let orderId = null;
        let charName = null;
        let priceText = null;
        let qty = null;
        let status = 'paid';

        // Собираем сообщения и ссылки в обратном порядке (самые СВЕЖИЕ заказы внизу чата — первыми)
        const msgs = Array.from(document.querySelectorAll('.chat-message-list .chat-msg-text, .chat-message-list .alert-info, .chat-message-list .chat-msg')).reverse();
        const orderLinks = Array.from(document.querySelectorAll('a[href*="/orders/"]')).reverse();

        for (const link of orderLinks) {
            const href = link.getAttribute('href') || '';
            const m = href.match(/\/orders\/([A-Z0-9]{8})\//i);
            if (m) {
                orderId = m[1];
                break; // Нашли самый СВЕЖИЙ заказ!
            }
        }

        if (!orderId) {
            for (const msg of msgs) {
                const text = msg.textContent || '';
                const om = text.match(/#([A-Z0-9]{8})/);
                if (om) {
                    orderId = om[1];
                    break;
                }
            }
        }

        for (const msg of msgs) {
            const text = msg.textContent || '';

            if (orderId && !text.includes(orderId) && !text.includes('/orders/' + orderId)) {
                continue;
            }

            if (/(?:подтвердил|подтвержден|завершен|closed|confirmed)/i.test(text)) status = 'closed';
            else if (/(?:возврат|вернул|refund|отменен)/i.test(text)) status = 'refund';
            else if (/(?:оплатил|оплачен|paid|purchased)/i.test(text)) status = 'paid';

            if (!charName) {
                const cm = text.match(/(?:Имя\s+персонажа|Ник\s+персонажа|Персонаж|Никнейм|Ник|Character\s+name|Character|Nickname|Character\s+nick|Логин|Login)\s*:\s*([^\n,.<>]+)/i);
                if (cm && cm[1]) {
                    const candidate = cm[1].trim();
                    if (candidate && !/^(не\s+указан|none|null|undefined|заказ|покупатель)$/i.test(candidate)) {
                        charName = candidate;
                    }
                }
            }

            if (!qty) {
                const qm = text.match(/(?:Количество|Кол-во|Колво|Quantity|Qty)\s*:\s*([^\n,.<>]+)/i);
                if (qm && qm[1]) qty = qm[1].trim();
            }

            if (!priceText) {
                const pm = text.match(/(\d[\d\s.,]*\s*(?:₽|\$|€|руб))/i);
                if (pm) priceText = pm[1].trim();
            }
        }

        return { orderId, charName, priceText, qty, status };
    }

    async function getOrderFromDB(orderId, buyerUsername) {
        if (!window.FPTSalesDB) return null;
        try {
            const allSales = await window.FPTSalesDB.getAllAsArray();
            if (!Array.isArray(allSales) || !allSales.length) return null;

            if (orderId) {
                const byId = allSales.find(s => String(s.orderId).toUpperCase() === String(orderId).toUpperCase());
                if (byId) return byId;
            }

            if (buyerUsername) {
                const cleanTarget = buyerUsername.trim().toLowerCase();
                const matching = allSales.filter(s => {
                    const b = (s.buyerUsername || '').trim().toLowerCase();
                    return b && (b === cleanTarget || b.includes(cleanTarget) || cleanTarget.includes(b));
                });
                if (matching.length) {
                    matching.sort((a, b) => (b.orderDate || 0) - (a.orderDate || 0));
                    return matching[0];
                }
            }
        } catch (e) {
            console.warn('Foxen: error querying FPTSalesDB:', e);
        }
        return null;
    }

    async function fetchOrderPageDetails(orderId) {
        if (!orderId) return null;
        if (_orderPageCache.has(orderId)) return _orderPageCache.get(orderId);

        try {
            const res = await fetch(`https://funpay.com/orders/${orderId}/`, { credentials: 'include' });
            if (!res.ok) return null;
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            let price = null;
            let title = null;
            let qty = null;
            let charName = null;
            let server = null;
            let status = 'paid';

            // 1. Статус заказа из h1
            const h1Status = doc.querySelector('.page-header span.text-success, .page-header span.text-warning, .page-header span.text-danger, .page-header span.text-muted, .order-status');
            if (h1Status) {
                const sTxt = h1Status.textContent.trim().toLowerCase();
                if (/закрыт|завершен|confirmed|closed/i.test(sTxt)) status = 'closed';
                else if (/возврат|refund|отменен/i.test(sTxt)) status = 'refund';
                else if (/оплачен|оплата получена|paid/i.test(sTxt)) status = 'paid';
            }

            // 2. Название игры / Название лота
            const gameEl = doc.querySelector('.param-list .param-item div.text-bold a, .param-list .param-item div.text-bold');
            if (gameEl) title = gameEl.textContent.trim();

            // 3. Парсинг параметров в блоки .param-item (FunPay использует h5 заголовок)
            const paramItems = doc.querySelectorAll('.param-item');
            paramItems.forEach(item => {
                const labelEl = item.querySelector('h5, .param-title, .name');
                if (!labelEl) return;
                const label = labelEl.textContent.trim().toLowerCase();

                const valEl = item.querySelector('div.text-bold, div:not(h5)');
                let val = valEl ? valEl.textContent.trim() : '';
                val = val.replace(/\s+/g, ' ');

                if (/сумма|стоимость|цена|price/i.test(label) && val) {
                    price = val;
                } else if (/количество|кол-во|колво|qty|quantity/i.test(label) && val) {
                    qty = val;
                } else if (/(?:имя\s+персонажа|ник\s+персонажа|персонаж|никнейм|ник|character|nickname|логин|login|имя)/i.test(label) && val) {
                    if (!/^(не\s+указан|none|null|undefined|заказ|покупатель|продавец)$/i.test(val)) {
                        charName = val;
                    }
                } else if (/сервер|server/i.test(label) && val) {
                    server = val;
                } else if (/название\s+игры|игра|категория/i.test(label) && val && !title) {
                    title = val;
                }
            });

            // Запасной сканер по всему тексту
            if (!price) {
                const bodyText = doc.body ? doc.body.textContent || '' : '';
                const pm = bodyText.match(/(?:Сумма|Стоимость|К оплате)\s*:\s*(\d[\d\s.,]*\s*(?:₽|\$|€|руб))/i);
                if (pm) price = pm[1].trim();
            }

            const data = { price, title, status, charName, server, qty };
            _orderPageCache.set(orderId, data);
            return data;
        } catch (e) {
            console.warn('Foxen: error fetching order details:', e);
            return null;
        }
    }

    function copyToClipboard(text, chipEl) {
        if (!text) return;
        const doFeedback = () => {
            chipEl.classList.add('copied');
            const icon = chipEl.querySelector('.fxn-ob-ms-icon');
            if (icon) icon.textContent = 'check';
            setTimeout(() => {
                chipEl.classList.remove('copied');
                if (icon) icon.textContent = 'content_copy';
            }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(doFeedback).catch(() => {
                fallbackCopy(text, doFeedback);
            });
        } else {
            fallbackCopy(text, doFeedback);
        }
    }

    function fallbackCopy(text, cb) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        ta.remove();
        if (cb) cb();
    }

    async function updateOrderBadge() {
        const detailList = document.querySelector('.chat-detail-list.custom-scroll, .chat-detail-list');
        if (!detailList) return;

        const buyerUsername = getCleanBuyerUsername();
        const domInfo = extractOrderDataFromDOM();
        const dbOrder = await getOrderFromDB(domInfo.orderId, buyerUsername);

        const orderId = domInfo.orderId || dbOrder?.orderId || null;
        if (!orderId) {
            const oldBadge = detailList.querySelector('.fxn-order-badge-panel');
            if (oldBadge) oldBadge.remove();
            delete detailList.dataset.fxnOrderBadgeStamp;
            return;
        }

        const fetched = await fetchOrderPageDetails(orderId);

        // Если в чате появилось свежее системное сообщение о закрытии/возврате, оно имеет высший приоритет
        let status = domInfo.status;
        if (status !== 'closed' && status !== 'refund') {
            if (fetched?.status && fetched.status !== 'paid') status = fetched.status;
            else if (dbOrder?.orderStatus === 'closed') status = 'closed';
            else if (dbOrder?.orderStatus === 'refunded') status = 'refund';
            else if (fetched?.status) status = fetched.status;
        }

        if (status === 'closed' || status === 'refund') {
            const cached = _orderPageCache.get(orderId);
            if (cached) cached.status = status;
        }

        const price = fetched?.price || (dbOrder?.price ? `${dbOrder.price} ${dbOrder.currency || '₽'}` : domInfo.priceText);
        const qty = fetched?.qty || domInfo.qty || null;
        const charName = fetched?.charName || domInfo.charName || null;
        const subcategory = fetched?.title || dbOrder?.subcategoryName || null;

        const stamp = `${buyerUsername}_${orderId}_${charName || ''}_${price || ''}_${status}`;
        if (detailList.dataset.fxnOrderBadgeStamp === stamp) return;
        detailList.dataset.fxnOrderBadgeStamp = stamp;

        injectStyles();

        const statusLabel = status === 'closed' ? 'Завершён' : (status === 'refund' ? 'Возврат' : 'Оплачен');
        const statusClass = status === 'closed' ? 'fxn-ob-status-closed' : (status === 'refund' ? 'fxn-ob-status-refund' : 'fxn-ob-status-paid');
        const statusIcon = status === 'closed' ? 'check_circle' : (status === 'refund' ? 'replay' : 'payments');

        let badge = detailList.querySelector('.fxn-order-badge-panel');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'param-item chat-panel fxn-order-badge-panel';
        }

        // Динамически применяем выбранный пользователем акцентный цвет
        await syncBadgeAccentColor(badge);

        let html = `
            <div class="fxn-ob-top-row">
                <div class="fxn-ob-id-badge">
                    <span class="material-symbols-rounded fxn-ob-ms-icon">inventory_2</span>
                    <span class="fxn-ob-order-id">#${orderId}</span>
                </div>
                <span class="fxn-ob-status-badge ${statusClass}">
                    <span class="material-symbols-rounded fxn-ob-ms-icon sm">${statusIcon}</span>
                    ${statusLabel}
                </span>
            </div>
        `;

        if (subcategory) {
            html += `
                <div class="fxn-ob-title-box">
                    <span class="material-symbols-rounded fxn-ob-ms-icon sm muted">sell</span>
                    <span class="fxn-ob-title-text">${subcategory}</span>
                </div>
            `;
        }

        if (price || qty) {
            html += `<div class="fxn-ob-stats-grid">`;
            if (price) {
                html += `
                    <div class="fxn-ob-stat-card">
                        <span class="fxn-ob-stat-label">Сумма</span>
                        <span class="fxn-ob-stat-val">${price}</span>
                    </div>
                `;
            }
            if (qty) {
                html += `
                    <div class="fxn-ob-stat-card">
                        <span class="fxn-ob-stat-label">Кол-во</span>
                        <span class="fxn-ob-stat-val">${qty}</span>
                    </div>
                `;
            }
            html += `</div>`;
        }

        if (charName) {
            html += `
                <div class="fxn-ob-char-section">
                    <div class="fxn-ob-char-header">
                        <span class="material-symbols-rounded fxn-ob-ms-icon sm muted">person_play</span>
                        Ник персонажа
                    </div>
                    <button type="button" class="fxn-ob-char-chip" id="fxn-char-copy-chip" title="Нажмите, чтобы скопировать ник">
                        <span class="fxn-ob-char-name">${charName}</span>
                        <span class="material-symbols-rounded fxn-ob-ms-icon">content_copy</span>
                    </button>
                </div>
            `;
        }

        html += `
            <a href="https://funpay.com/orders/${orderId}/" target="_blank" class="fxn-ob-open-btn">
                <span>Открыть заказ</span>
                <span class="material-symbols-rounded fxn-ob-ms-icon">open_in_new</span>
            </a>
        `;

        badge.innerHTML = html;

        // Вставляем плашку СТРОГО ПОД родной блок "Покупатель смотрит" (.param-item.chat-panel)
        const existingPanels = Array.from(detailList.querySelectorAll('.param-item.chat-panel')).filter(p => p !== badge);
        if (existingPanels.length > 0) {
            const lastPanel = existingPanels[existingPanels.length - 1];
            if (lastPanel.nextSibling) {
                detailList.insertBefore(badge, lastPanel.nextSibling);
            } else {
                detailList.appendChild(badge);
            }
        } else {
            detailList.appendChild(badge);
        }

        const copyChip = badge.querySelector('#fxn-char-copy-chip');
        if (copyChip && charName) {
            copyChip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyToClipboard(charName, copyChip);
            });
        }
    }

    let _timer = null;
    function scheduleScan() {
        if (_timer) return;
        _timer = setTimeout(() => {
            _timer = null;
            updateOrderBadge();
        }, 150);
    }

    function init() {
        if (!/\/(chat|users)\//.test(window.location.pathname)) return;
        scheduleScan();

        const root = document.getElementById('content') || document.body;
        const observer = new MutationObserver((mutations) => {
            const isOurs = mutations.every(m =>
                Array.from(m.addedNodes).every(n => n.nodeType === 1 && n.classList && n.classList.contains('fxn-order-badge-panel'))
            );
            if (isOurs) return;
            scheduleScan();
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
