// content/features/chat_order_badge.js
// Правая панель чата FunPay (.chat-detail-list):
// 1. Стилизованные карточки даты регистрации и просматриваемого лота (без багов шрифтов)
// 2. Карточка активного заказа с двухколоночной статистикой, копированием ID и быстрым переходом (строго без дубликатов)
// 3. Личные заметки о клиенте с автосохранением в локальное хранилище
// 4. Карточка пользовательских шаблонов ответов (перенесены из нижней панели в сайдбар)

(function () {
    'use strict';

    const _orderPageCache = new Map();
    let _isUpdating = false;

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

    async function syncAccentVariables(targetEl) {
        if (!targetEl) return;
        let accent = null;
        try {
            if (window.__foxenAccentColor) {
                accent = window.__foxenAccentColor;
            } else if (window.__fptUserAccent) {
                accent = window.__fptUserAccent;
            } else {
                const cached = (function() {
                    try { return localStorage.getItem('foxen_accent_color') || sessionStorage.getItem('foxen_accent_color'); } catch (_) { return null; }
                })();
                if (cached) {
                    accent = cached;
                } else {
                    const docAccent = getComputedStyle(document.documentElement).getPropertyValue('--fxn-accent').trim();
                    if (docAccent && docAccent !== '#C026D3' && docAccent !== '#c026d3') {
                        accent = docAccent;
                    }
                }
            }

            if (!accent) {
                const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
                const data = await new Promise(r => storage.get(['foxenAccentColor', 'foxenHeaderButtonStyles', 'foxenHeaderButtons', 'foxenTheme'], r));
                accent = data?.foxenAccentColor || data?.foxenHeaderButtonStyles?.color || data?.foxenHeaderButtons?.color || data?.foxenTheme?.bgColor1;
            }
        } catch (_) {}

        if (!accent || accent === 'default') {
            accent = '#c026d3';
        }

        const accentSoft = hexToRgba(accent, 0.14);
        const accentBorder = hexToRgba(accent, 0.32);
        const accentGlow = hexToRgba(accent, 0.22);
        const accentDark = hexToRgba(accent, 0.85);

        targetEl.style.setProperty('--fxn-accent', accent);
        targetEl.style.setProperty('--fxn-accent-soft', accentSoft);
        targetEl.style.setProperty('--fxn-accent-border', accentBorder);
        targetEl.style.setProperty('--fxn-accent-glow', accentGlow);
        targetEl.style.setProperty('--fxn-accent-dark', accentDark);
    }

    function injectStyles() {
        if (document.getElementById('fxn-chat-sidebar-styles')) return;
        const style = document.createElement('style');
        style.id = 'fxn-chat-sidebar-styles';
        style.textContent = `
            /* ==========================================================================
               FOXEN CHAT RIGHT SIDEBAR - GLASSMORPHISM CRM SUITE
               ========================================================================== */
            .chat-detail-list {
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                padding: 12px 10px 24px 10px !important;
                box-sizing: border-box !important;
            }

            /* Единая база Glassmorphism для всех карточек сайдбара */
            .fxn-sb-card,
            .fxn-order-badge-panel,
            #fxn-order-badge-panel,
            .fxn-sb-notes-card,
            .fxn-sb-templates-card,
            .chat-detail-list .param-item:not(.fxn-order-badge-panel):not(.chat-panel),
            .chat-detail-list .param-item.chat-panel[data-type="c-p-u"] {
                background: rgba(255, 255, 255, 0.04) !important;
                backdrop-filter: blur(16px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 14px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
                padding: 12px 14px !important;
                margin: 0 !important;
                color: #e2e8f0 !important;
                box-sizing: border-box !important;
                font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease !important;
            }

            .fxn-sb-card:hover,
            .fxn-order-badge-panel:hover,
            #fxn-order-badge-panel:hover,
            .fxn-sb-notes-card:hover,
            .fxn-sb-templates-card:hover,
            .chat-detail-list .param-item:not(.fxn-order-badge-panel):not(.chat-panel):hover,
            .chat-detail-list .param-item.chat-panel[data-type="c-p-u"]:hover {
                border-color: rgba(255, 255, 255, 0.16) !important;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
                transform: translateY(-1px) !important;
            }

            /* --- 1. СТИЛИЗАЦИЯ РОДНЫХ ЭЛЕМЕНТОВ FUNPAY (БЕЗ ПСЕВДОЭЛЕМЕНТОВ И БЕЗ БАГОВ) --- */
            .chat-detail-list .param-item:not(.fxn-order-badge-panel):not(.chat-panel) h5,
            .chat-detail-list .param-item.chat-panel[data-type="c-p-u"] h5 {
                font-size: 10.5px !important;
                font-weight: 700 !important;
                color: var(--fxn-text-muted, #94a3b8) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                margin: 0 0 6px 0 !important;
            }
            .chat-detail-list .param-item:not(.fxn-order-badge-panel):not(.chat-panel) > div:not(.text-muted) {
                font-size: 13px !important;
                font-weight: 600 !important;
                color: #ffffff !important;
            }
            .chat-detail-list .param-item:not(.fxn-order-badge-panel):not(.chat-panel) .text-muted {
                display: inline-block !important;
                font-size: 11px !important;
                color: #a1a1aa !important;
                background: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                padding: 2px 7px !important;
                border-radius: 6px !important;
                margin-top: 4px !important;
            }
            .chat-detail-list .param-item.chat-panel[data-type="c-p-u"] a {
                color: #ffffff !important;
                font-size: 12.5px !important;
                font-weight: 600 !important;
                text-decoration: none !important;
                display: block !important;
                line-height: 1.4 !important;
                transition: color 0.15s ease !important;
            }
            .chat-detail-list .param-item.chat-panel[data-type="c-p-u"] a:hover {
                color: var(--fxn-accent, #c026d3) !important;
                text-decoration: underline !important;
            }

            /* --- 2. КАРТОЧКА ЗАКАЗА (#fxn-order-badge-panel) --- */
            .fxn-order-badge-panel,
            #fxn-order-badge-panel {
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                width: 100% !important;
                position: relative !important;
            }
            .fxn-ob-top-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 8px !important;
                width: 100% !important;
            }
            .fxn-ob-id-badge {
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                min-width: 0 !important;
            }
            .fxn-ob-order-id {
                font-size: 13.5px !important;
                font-weight: 800 !important;
                color: #ffffff !important;
                letter-spacing: 0.3px !important;
                font-variant-numeric: tabular-nums !important;
            }
            .fxn-ob-copy-id-btn {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
                color: #94a3b8 !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: color 0.15s ease, transform 0.15s ease !important;
            }
            .fxn-ob-copy-id-btn:hover {
                color: #ffffff !important;
                transform: scale(1.1) !important;
            }
            .fxn-ob-copy-id-btn.copied {
                color: #4ade80 !important;
            }
            .fxn-ob-copy-id-btn .material-symbols-rounded {
                font-size: 14px !important;
            }
            .fxn-ob-status-badge {
                display: inline-flex !important;
                align-items: center !important;
                gap: 5px !important;
                padding: 3px 8px !important;
                border-radius: 7px !important;
                font-size: 10.5px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
            }
            .fxn-ob-status-dot {
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background: currentColor !important;
                box-shadow: 0 0 6px currentColor !important;
            }
            .fxn-ob-status-paid {
                background: rgba(34, 197, 94, 0.12) !important;
                color: #4ade80 !important;
                border: 1px solid rgba(34, 197, 94, 0.3) !important;
            }
            .fxn-ob-status-closed {
                background: rgba(56, 189, 248, 0.12) !important;
                color: #38bdf8 !important;
                border: 1px solid rgba(56, 189, 248, 0.3) !important;
            }
            .fxn-ob-status-refund {
                background: rgba(244, 63, 94, 0.12) !important;
                color: #fb7185 !important;
                border: 1px solid rgba(244, 63, 94, 0.3) !important;
            }

            .fxn-ob-title-box {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 6px 9px !important;
                background: rgba(255, 255, 255, 0.035) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                color: #e2e8f0 !important;
            }
            .fxn-ob-title-box .material-symbols-rounded {
                font-size: 14px !important;
                color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-ob-title-text {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }

            /* Компактный и эстетичный грид статистики (Сумма + Кол-во) */
            .fxn-ob-stats-grid {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
                width: 100% !important;
            }
            .fxn-ob-stats-grid.single-col {
                grid-template-columns: 1fr !important;
            }
            .fxn-ob-stat-card {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                padding: 7px 9px !important;
                background: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                border-radius: 10px !important;
                min-width: 0 !important;
            }
            .fxn-ob-stat-icon {
                font-size: 17px !important;
                color: var(--fxn-accent, #c026d3) !important;
                flex-shrink: 0 !important;
            }
            .fxn-ob-stat-text {
                display: flex !important;
                flex-direction: column !important;
                min-width: 0 !important;
            }
            .fxn-ob-stat-label {
                font-size: 9.5px !important;
                font-weight: 600 !important;
                color: rgba(255, 255, 255, 0.5) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
                line-height: 1 !important;
                margin-bottom: 2px !important;
            }
            .fxn-ob-stat-val {
                font-size: 13px !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                line-height: 1.2 !important;
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
                gap: 5px !important;
                font-size: 10px !important;
                font-weight: 600 !important;
                color: rgba(255, 255, 255, 0.5) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
            }
            .fxn-ob-char-header .material-symbols-rounded {
                font-size: 13px !important;
                color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-ob-char-chip {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 6px !important;
                padding: 6px 10px !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 9px !important;
                color: #ffffff !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                width: 100% !important;
                box-sizing: border-box !important;
                transition: all 0.2s ease !important;
            }
            .fxn-ob-char-chip:hover {
                background: rgba(255, 255, 255, 0.08) !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
            }
            .fxn-ob-char-chip.copied {
                background: rgba(34, 197, 94, 0.15) !important;
                border-color: #22c55e !important;
                color: #4ade80 !important;
            }
            .fxn-ob-char-chip.copied .material-symbols-rounded {
                color: #4ade80 !important;
            }
            .fxn-ob-char-chip .material-symbols-rounded {
                font-size: 14px !important;
                color: #a1a1aa !important;
            }

            .fxn-ob-open-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                padding: 7px 12px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                color: #ffffff !important;
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 9px !important;
                text-decoration: none !important;
                transition: all 0.2s ease !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .fxn-ob-open-btn:hover {
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.22)) !important;
                border-color: var(--fxn-accent, #c026d3) !important;
                color: #ffffff !important;
                box-shadow: 0 4px 14px var(--fxn-accent-soft, rgba(192, 38, 211, 0.25)) !important;
                transform: translateY(-1px) !important;
            }
            .fxn-ob-open-btn .material-symbols-rounded {
                font-size: 14px !important;
            }

            /* --- 3. ЗАМЕТКИ О ПОКУПАТЕЛЕ (.fxn-sb-notes-card) --- */
            .fxn-sb-notes-card {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
            }
            .fxn-sb-card-head {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
            }
            .fxn-sb-card-title {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                font-size: 10.5px !important;
                font-weight: 700 !important;
                color: var(--fxn-text-muted, #94a3b8) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
            }
            .fxn-sb-card-title .material-symbols-rounded {
                font-size: 15px !important;
                color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-sb-notes-status {
                font-size: 10px !important;
                color: #4ade80 !important;
                font-weight: 600 !important;
                opacity: 0;
                transition: opacity 0.25s ease !important;
            }
            .fxn-sb-notes-status.visible {
                opacity: 1 !important;
            }
            .fxn-sb-notes-input {
                width: 100% !important;
                min-height: 62px !important;
                max-height: none !important;
                background: rgba(0, 0, 0, 0.22) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 9px !important;
                padding: 8px 10px !important;
                color: #ffffff !important;
                font-family: inherit !important;
                font-size: 12px !important;
                line-height: 1.45 !important;
                resize: vertical !important;
                outline: none !important;
                box-sizing: border-box !important;
                transition: border-color 0.15s ease !important;
            }
            .fxn-sb-notes-input::-webkit-resizer {
                background: transparent !important;
                border-bottom: 2px solid rgba(255, 255, 255, 0.35) !important;
                border-right: 2px solid rgba(255, 255, 255, 0.35) !important;
            }
            .fxn-sb-notes-input:focus {
                border-color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-sb-notes-input::placeholder {
                color: rgba(255, 255, 255, 0.35) !important;
            }

            /* --- 4. ШАБЛОНЫ ОТВЕТОВ В САЙДБАРЕ (.fxn-sb-templates-card) --- */
            .fxn-sb-templates-card {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
            }
            .fxn-sb-templates-card .foxen-template-sidebar {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 6px !important;
                width: 100% !important;
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                position: static !important;
                box-shadow: none !important;
            }
            .fxn-sb-templates-card .sidebar-template-btn,
            .fxn-sb-templates-card .chat-template-btn,
            .fxn-sb-templates-card .custom-chat-template-btn {
                flex-grow: 1 !important;
                min-width: calc(50% - 6px) !important;
                padding: 7px 10px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                border-radius: 9px !important;
                text-align: center !important;
                color: #ffffff !important;
                background-color: var(--template-color, var(--btn-color, #C026D3)) !important;
                border: 1px solid rgba(255, 255, 255, 0.18) !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
            }
            .fxn-sb-templates-card .sidebar-template-btn:hover,
            .fxn-sb-templates-card .chat-template-btn:hover,
            .fxn-sb-templates-card .custom-chat-template-btn:hover {
                filter: brightness(1.15) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35) !important;
            }

            /* --- 4c. РАЗДЕЛИТЕЛЬ И ТУМБЛЕР МГНОВЕННОЙ ОТПРАВКИ В ШАБЛОНАХ --- */
            .fxn-sb-templates-footer {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
                width: 100% !important;
                margin-top: 4px !important;
            }
            .fxn-sb-divider {
                width: 100% !important;
                height: 1px !important;
                background: rgba(255, 255, 255, 0.08) !important;
                margin: 4px 0 2px !important;
                border: none !important;
            }
            .fxn-sb-instant-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                width: 100% !important;
                padding: 3px 2px !important;
                box-sizing: border-box !important;
            }
            .fxn-sb-instant-label {
                font-size: 11.5px !important;
                font-weight: 600 !important;
                color: #cbd5e1 !important;
                letter-spacing: 0.1px !important;
                user-select: none !important;
            }
            .fxn-sb-instant-switch.switch {
                width: 38px !important;
                min-width: 38px !important;
                max-width: 38px !important;
                height: 22px !important;
                min-height: 22px !important;
                max-height: 22px !important;
                border-radius: 999px !important;
                background: rgba(255, 255, 255, 0.12) !important;
                border: 1px solid rgba(255, 255, 255, 0.16) !important;
                position: relative !important;
                flex-shrink: 0 !important;
                cursor: pointer !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                transition: background .22s ease, border-color .22s ease, box-shadow .22s ease !important;
                outline: none !important;
            }
            .fxn-sb-instant-switch.switch:hover {
                background: rgba(255, 255, 255, 0.18) !important;
                border-color: rgba(255, 255, 255, 0.26) !important;
            }
            .fxn-sb-instant-switch.switch::before {
                content: "" !important;
                display: block !important;
                position: absolute !important;
                top: 2px !important;
                left: 2px !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                background: #e2e2e7 !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45) !important;
                transition: transform .22s cubic-bezier(.25, 1.25, .5, 1), background .22s ease !important;
            }
            .fxn-sb-instant-switch.switch.on {
                background: var(--fxn-active, #c026d3) !important;
                border-color: var(--fxn-active, #c026d3) !important;
                box-shadow: 0 0 10px rgba(192, 38, 211, 0.25) !important;
            }
            .fxn-sb-instant-switch.switch.on::before {
                transform: translateX(16px) !important;
                background: #0a0a0a !important;
            }

            /* Скроллбар для сайдбара */
            /* Скроллбар для сайдбара */
            .chat-detail-list::-webkit-scrollbar {
                width: 4px !important;
            }
            .chat-detail-list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15) !important;
                border-radius: 4px !important;
            }
            .chat-detail-list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3) !important;
            }

            /* --- Скрытие элементов по настройкам сайдбара --- */
            .chat-detail-list.fxn-hide-order-badge #fxn-order-badge-panel,
            .chat-detail-list.fxn-hide-order-badge .fxn-order-badge-panel,
            #fxn-order-badge-panel.fxn-hidden,
            .fxn-order-badge-panel.fxn-hidden {
                display: none !important;
            }

            .chat-detail-list.fxn-hide-buyer-notes .fxn-sb-notes-card,
            .fxn-sb-notes-card.fxn-hidden {
                display: none !important;
            }

            .chat-detail-list.fxn-hide-templates .fxn-sb-templates-card,
            .fxn-sb-templates-card.fxn-hidden {
                display: none !important;
            }

            .chat-detail-list.fxn-hide-native-info .param-item:not(.fxn-order-badge-panel):not(.chat-panel),
            .chat-detail-list.fxn-hide-native-info .param-item.chat-panel[data-type="c-p-u"],
            .chat-detail-list .param-item.fxn-hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function getCleanBuyerUsername() {
        const header = document.querySelector('.chat-header');
        if (header) {
            const nameLink = header.querySelector('.media-user-name a');
            if (nameLink && nameLink.textContent) return nameLink.textContent.trim().split(/\s+/)[0];
        }
        const activeContact = document.querySelector('.contact-item.active .media-user-name');
        if (activeContact && activeContact.textContent) return activeContact.textContent.trim().split(/\s+/)[0];

        const anyLink = document.querySelector('.chat-detail .media-user-name a, a.media-user-name');
        if (anyLink && anyLink.textContent) return anyLink.textContent.trim().split(/\s+/)[0];

        return '';
    }

    function extractOrderDataFromDOM() {
        let orderId = null;
        let charName = null;
        let priceText = null;
        let qty = null;
        let status = 'paid';

        const msgs = Array.from(document.querySelectorAll('.chat-message-list .chat-msg-text, .chat-message-list .alert-info, .chat-message-list .chat-msg')).reverse();
        const orderLinks = Array.from(document.querySelectorAll('a[href*="/orders/"]')).reverse();

        for (const link of orderLinks) {
            const href = link.getAttribute('href') || '';
            const m = href.match(/\/orders\/([A-Z0-9]{8})\//i);
            if (m) {
                orderId = m[1];
                break;
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

            const h1Status = doc.querySelector('.page-header span.text-success, .page-header span.text-warning, .page-header span.text-danger, .page-header span.text-muted, .order-status');
            if (h1Status) {
                const sTxt = h1Status.textContent.trim().toLowerCase();
                if (/закрыт|завершен|confirmed|closed/i.test(sTxt)) status = 'closed';
                else if (/возврат|refund|отменен/i.test(sTxt)) status = 'refund';
                else if (/оплачен|оплата получена|paid/i.test(sTxt)) status = 'paid';
            }

            const gameEl = doc.querySelector('.param-list .param-item div.text-bold a, .param-list .param-item div.text-bold');
            if (gameEl) title = gameEl.textContent.trim();

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
            const icon = chipEl.querySelector('.material-symbols-rounded');
            const origIcon = icon ? icon.textContent : '';
            if (icon) icon.textContent = 'check';
            setTimeout(() => {
                chipEl.classList.remove('copied');
                if (icon) icon.textContent = origIcon || 'content_copy';
            }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(doFeedback).catch(() => fallbackCopy(text, doFeedback));
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

    // --- РЕНДЕРИНГ ЗАМЕТОК О ПОКУПАТЕЛЕ ---
    
    // --- НАСТРОЙКИ САЙДБАРА ЧАТА ---
    const DEFAULT_CHAT_SIDEBAR_SETTINGS = {
        showOrderBadge: true,
        showBuyerNotes: true,
        showTemplates: true,
        showNativeInfo: true,
        templatesTransparent: false
    };

    let _sidebarSettings = { ...DEFAULT_CHAT_SIDEBAR_SETTINGS };

    async function loadChatSidebarSettings() {
        return new Promise(resolve => {
            try {
                const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
                if (!storage) return resolve();
                storage.get(['foxenChatSidebarSettings'], res => {
                    if (res && res.foxenChatSidebarSettings) {
                        _sidebarSettings = { ...DEFAULT_CHAT_SIDEBAR_SETTINGS, ...res.foxenChatSidebarSettings };
                    }
                    resolve();
                });
            } catch (_) {
                resolve();
            }
        });
    }

    function applyChatSidebarSettings(cfg) {
        if (cfg) _sidebarSettings = { ..._sidebarSettings, ...cfg };
        const detailList = document.querySelector('.chat-detail-list.custom-scroll, .chat-detail-list');
        if (!detailList) return;

        // Container-level utility classes
        detailList.classList.toggle('fxn-hide-order-badge', _sidebarSettings.showOrderBadge === false);
        detailList.classList.toggle('fxn-hide-buyer-notes', _sidebarSettings.showBuyerNotes === false);
        detailList.classList.toggle('fxn-hide-templates', _sidebarSettings.showTemplates === false);
        detailList.classList.toggle('fxn-hide-native-info', _sidebarSettings.showNativeInfo === false);

        // 1. Плашка заказа
        const badges = detailList.querySelectorAll('#fxn-order-badge-panel, .fxn-order-badge-panel');
        const hideBadge = _sidebarSettings.showOrderBadge === false;
        badges.forEach(b => {
            b.classList.toggle('fxn-hidden', hideBadge);
            if (hideBadge) {
                b.style.setProperty('display', 'none', 'important');
            } else {
                b.style.removeProperty('display');
            }
        });

        // 2. Блок заметок о покупателе
        const notesCards = detailList.querySelectorAll('.fxn-sb-notes-card');
        const hideNotes = _sidebarSettings.showBuyerNotes === false;
        notesCards.forEach(n => {
            n.classList.toggle('fxn-hidden', hideNotes);
            if (hideNotes) {
                n.style.setProperty('display', 'none', 'important');
            } else {
                n.style.removeProperty('display');
            }
        });

        // 3. Шаблоны ответов
        const tplCards = detailList.querySelectorAll('.fxn-sb-templates-card');
        const hideTpls = _sidebarSettings.showTemplates === false;
        tplCards.forEach(t => {
            t.classList.toggle('fxn-hidden', hideTpls);
            if (hideTpls) {
                t.style.setProperty('display', 'none', 'important');
            } else {
                t.style.removeProperty('display');
            }
            t.classList.toggle('fxn-templates-transparent', !!_sidebarSettings.templatesTransparent);
        });

        // 4. Нативные блоки сайта
        const nativeItems = detailList.querySelectorAll(
            '.param-item:not(.fxn-order-badge-panel):not(.chat-panel), .param-item.chat-panel[data-type="c-p-u"]'
        );
        const hideNative = _sidebarSettings.showNativeInfo === false;
        nativeItems.forEach(el => {
            el.classList.toggle('fxn-hidden', hideNative);
            if (hideNative) {
                el.style.setProperty('display', 'none', 'important');
            } else {
                el.style.removeProperty('display');
            }
        });
    }

    window.applyChatSidebarSettings = applyChatSidebarSettings;
    window.addEventListener('foxenChatSidebarSettingsChanged', (e) => {
        if (e && e.detail) {
            applyChatSidebarSettings(e.detail);
        }
    });

    let _noteSaveTimeout = null;
    function renderBuyerNotesCard(detailList, username) {
        let card = detailList.querySelector('.fxn-sb-notes-card');
        if (!username) {
            if (card) card.remove();
            return;
        }

        if (!card) {
            card = document.createElement('div');
            card.className = 'fxn-sb-notes-card';
            detailList.appendChild(card);
        }

        if (card.dataset.buyer === username) return;
        card.dataset.buyer = username;

        card.innerHTML = `
            <div class="fxn-sb-card-head">
                <div class="fxn-sb-card-title">
                    <span class="material-symbols-rounded">edit_note</span>
                    <span>Заметка о клиенте</span>
                </div>
                <div class="fxn-sb-notes-head-actions">
                    <span class="fxn-sb-notes-status">✓ Сохранено</span>
                </div>
            </div>
            <textarea class="fxn-sb-notes-input" placeholder="Личная заметка (видна только вам)..." rows="3"></textarea>
        `;

        const textarea = card.querySelector('.fxn-sb-notes-input');

        // Restore manual user resize height if saved
        try {
            const savedHeight = localStorage.getItem('foxen_chat_notes_height');
            if (savedHeight && parseInt(savedHeight, 10) >= 50) {
                textarea.style.height = `${parseInt(savedHeight, 10)}px`;
            }
        } catch (_) {}

        // Persist manual corner resize height
        textarea.addEventListener('mouseup', () => {
            if (textarea.style.height) {
                try {
                    localStorage.setItem('foxen_chat_notes_height', parseInt(textarea.style.height, 10));
                } catch (_) {}
            }
        });
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === textarea && textarea.style.height) {
                        try {
                            localStorage.setItem('foxen_chat_notes_height', parseInt(textarea.style.height, 10));
                        } catch (_) {}
                    }
                }
            });
            ro.observe(textarea);
        }
        const statusEl = card.querySelector('.fxn-sb-notes-status');
        const storageKey = `fxn_buyer_note_${username.toLowerCase()}`;
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;

        storage.get([storageKey], (res) => {
            if (res && res[storageKey] && card.dataset.buyer === username) {
                textarea.value = res[storageKey];
            }
        });

        textarea.oninput = () => {
            clearTimeout(_noteSaveTimeout);
            _noteSaveTimeout = setTimeout(() => {
                const val = textarea.value.trim();
                storage.set({ [storageKey]: val }, () => {
                    statusEl.classList.add('visible');
                    setTimeout(() => statusEl.classList.remove('visible'), 1600);
                });
            }, 350);
        };
    }

    // --- ГЛАВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ САЙДБАРА ---
    async function updateChatSidebar() {
        if (_isUpdating) return;
        _isUpdating = true;

        try {
            const detailList = document.querySelector('.chat-detail-list.custom-scroll, .chat-detail-list');
            if (!detailList) return;

            // Удаляем ненужные/устаревшие элементы (hero card и быстрые ответы)
            detailList.querySelectorAll('.fxn-sb-hero-card, .fxn-sb-quick-replies').forEach(el => el.remove());

            injectStyles();
            await syncAccentVariables(detailList);

            const buyerUsername = getCleanBuyerUsername();
            const domInfo = extractOrderDataFromDOM();
            const dbOrder = await getOrderFromDB(domInfo.orderId, buyerUsername);
            const orderId = domInfo.orderId || dbOrder?.orderId || null;

            // СТРОГИЙ КОНТРОЛЬ ДУБЛИКАТОВ: удаляем любые дубликаты плашки заказа
            const existingBadges = Array.from(detailList.querySelectorAll('#fxn-order-badge-panel, .fxn-order-badge-panel'));
            if (!orderId) {
                existingBadges.forEach(b => b.remove());
            } else {
                let badge = existingBadges[0] || null;
                if (existingBadges.length > 1) {
                    for (let i = 1; i < existingBadges.length; i++) existingBadges[i].remove();
                }

                const fetched = await fetchOrderPageDetails(orderId);

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

                const statusLabel = status === 'closed' ? 'Завершён' : (status === 'refund' ? 'Возврат' : 'Оплачен');
                const statusClass = status === 'closed' ? 'fxn-ob-status-closed' : (status === 'refund' ? 'fxn-ob-status-refund' : 'fxn-ob-status-paid');

                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'fxn-order-badge-panel';
                    badge.className = 'fxn-order-badge-panel';
                }

                let statsHtml = '';
                if (price || qty) {
                    const singleCol = !(price && qty);
                    statsHtml = `
                        <div class="fxn-ob-stats-grid ${singleCol ? 'single-col' : ''}">
                            ${price ? `
                                <div class="fxn-ob-stat-card">
                                    <span class="material-symbols-rounded fxn-ob-stat-icon">payments</span>
                                    <div class="fxn-ob-stat-text">
                                        <span class="fxn-ob-stat-label">Сумма</span>
                                        <span class="fxn-ob-stat-val">${price}</span>
                                    </div>
                                </div>
                            ` : ''}
                            ${qty ? `
                                <div class="fxn-ob-stat-card">
                                    <span class="material-symbols-rounded fxn-ob-stat-icon">inventory_2</span>
                                    <div class="fxn-ob-stat-text">
                                        <span class="fxn-ob-stat-label">Кол-во</span>
                                        <span class="fxn-ob-stat-val">${qty}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }

                let charHtml = '';
                if (charName) {
                    charHtml = `
                        <div class="fxn-ob-char-section">
                            <div class="fxn-ob-char-header">
                                <span class="material-symbols-rounded">person_play</span>
                                <span>Ник персонажа</span>
                            </div>
                            <button type="button" class="fxn-ob-char-chip" id="fxn-char-copy-chip" title="Нажмите, чтобы скопировать ник">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${charName}</span>
                                <span class="material-symbols-rounded">content_copy</span>
                            </button>
                        </div>
                    `;
                }

                badge.innerHTML = `
                    <div class="fxn-ob-top-row">
                        <div class="fxn-ob-id-badge">
                            <span class="material-symbols-rounded" style="color:var(--fxn-accent,#c026d3); font-size:16px;">receipt_long</span>
                            <span class="fxn-ob-order-id">#${orderId}</span>
                            <button type="button" class="fxn-ob-copy-id-btn" id="fxn-order-id-copy" title="Скопировать номер заказа">
                                <span class="material-symbols-rounded">content_copy</span>
                            </button>
                        </div>
                        <span class="fxn-ob-status-badge ${statusClass}">
                            <span class="fxn-ob-status-dot"></span>
                            <span>${statusLabel}</span>
                        </span>
                    </div>
                    ${subcategory ? `
                        <div class="fxn-ob-title-box">
                            <span class="material-symbols-rounded">sell</span>
                            <span class="fxn-ob-title-text">${subcategory}</span>
                        </div>
                    ` : ''}
                    ${statsHtml}
                    ${charHtml}
                    <a href="https://funpay.com/orders/${orderId}/" target="_blank" class="fxn-ob-open-btn">
                        <span>Открыть заказ</span>
                        <span class="material-symbols-rounded">open_in_new</span>
                    </a>
                `;

                // Позиционируем плашку заказа аккуратно под родными блоками FunPay
                const nativePanels = Array.from(detailList.querySelectorAll('.param-item:not(.fxn-order-badge-panel):not(#fxn-order-badge-panel)'));
                if (nativePanels.length > 0) {
                    const lastNative = nativePanels[nativePanels.length - 1];
                    if (lastNative.nextSibling !== badge) {
                        detailList.insertBefore(badge, lastNative.nextSibling);
                    }
                } else if (!detailList.contains(badge)) {
                    detailList.prepend(badge);
                }

                const copyIdBtn = badge.querySelector('#fxn-order-id-copy');
                if (copyIdBtn) {
                    copyIdBtn.onclick = (e) => {
                        e.preventDefault();
                        copyToClipboard(orderId, copyIdBtn);
                    };
                }

                const copyChip = badge.querySelector('#fxn-char-copy-chip');
                if (copyChip && charName) {
                    copyChip.onclick = (e) => {
                        e.preventDefault();
                        copyToClipboard(charName, copyChip);
                    };
                }
            }

            renderBuyerNotesCard(detailList, buyerUsername);

            // Обновляем шаблоны ответов пользователя в сайдбаре только если они еще не смонтированы
            if (typeof window.addChatTemplateButtons === 'function') {
                const hasTpls = detailList.querySelector('.fxn-sb-templates-card .foxen-template-sidebar');
                if (!hasTpls) {
                    await window.addChatTemplateButtons();
                }
            }

            // Применяем настройки сайдбара (видимость блоков, растяжение заметки, прозрачность)
            applyChatSidebarSettings();
        } finally {
            _isUpdating = false;
        }
    }

    let _timer = null;
    function scheduleScan() {
        if (_timer) return;
        _timer = setTimeout(() => {
            _timer = null;
            updateChatSidebar();
        }, 120);
    }

    async function init() {
        if (!/\/(chat|users)\//.test(window.location.pathname)) return;
        await loadChatSidebarSettings();
        scheduleScan();

        try {
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
            storage?.onChanged?.addListener((changes, area) => {
                if (area === 'local' && changes.foxenChatSidebarSettings) {
                    applyChatSidebarSettings(changes.foxenChatSidebarSettings.newValue);
                }
            });
        } catch (_) {}

        const root = document.getElementById('content') || document.body;
        const observer = new MutationObserver((mutations) => {
            const isOurs = mutations.every(m => {
                const t = m.target;
                if (t && t.closest && (
                    t.closest('.fxn-order-badge-panel') ||
                    t.closest('#fxn-order-badge-panel') ||
                    t.closest('.fxn-sb-notes-card') ||
                    t.closest('.fxn-sb-templates-card') ||
                    t.closest('.foxen-template-preview') ||
                    t.closest('.chat-detail-list')
                )) {
                    return true;
                }
                return Array.from(m.addedNodes).every(n => n.nodeType === 1 && (
                    n.closest?.('.fxn-order-badge-panel') ||
                    n.closest?.('#fxn-order-badge-panel') ||
                    n.closest?.('.fxn-sb-notes-card') ||
                    n.closest?.('.fxn-sb-templates-card') ||
                    n.closest?.('.foxen-template-preview') ||
                    n.closest?.('.chat-detail-list') ||
                    n.classList?.contains('fxn-order-badge-panel') ||
                    n.classList?.contains('fxn-sb-notes-card') ||
                    n.classList?.contains('fxn-sb-templates-card') ||
                    n.classList?.contains('foxen-template-preview')
                ));
            });
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
