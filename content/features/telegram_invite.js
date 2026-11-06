// content/features/telegram_invite.js
// =============================================================================
// Foxen Telegram Community Invite Notification
// =============================================================================
// Elegant bottom-right frosted glass toast on FunPay entrance.
// Features:
// - Synced with the active Foxen theme & accent color
// - Luminous frosted glass with enhanced transparency & backdrop blur
// - Identical height for both action buttons
// - Direct, confident, and professional copy
// - Clicking (X) closes plate for current view only (shows again on page reload)
// - Clicking "Больше не показывать" permanently dismisses it
// - Respects bottom navigation bar if active
// =============================================================================

(function() {
    'use strict';

    // Run only in top window and on FunPay pages
    if (typeof window === 'undefined' || window.top !== window) return;
    if (!location.hostname.includes('funpay.com')) return;

    const TG_STORAGE_KEY = 'foxen_tg_invite_dismissed';
    const TG_CHANNEL_URL = 'https://t.me/FoxenFF';

    let _toastEl = null;

    /**
     * Checks if the notification has been dismissed permanently.
     */
    async function isDismissed() {
        try {
            if (localStorage.getItem(TG_STORAGE_KEY) === '1') return true;

            const ext = typeof browser !== 'undefined' ? browser : chrome;
            if (ext && ext.storage && ext.storage.local) {
                const data = await ext.storage.local.get(TG_STORAGE_KEY);
                if (data && data[TG_STORAGE_KEY]) return true;
            }
        } catch (_) {}
        return false;
    }

    /**
     * Permanently dismisses the notification across all storage layers.
     */
    async function dismissPermanently() {
        try {
            localStorage.setItem(TG_STORAGE_KEY, '1');
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            if (ext && ext.storage && ext.storage.local) {
                await ext.storage.local.set({ [TG_STORAGE_KEY]: true });
            }
        } catch (_) {}
    }

    /**
     * Retrieves the current theme, accent, and styling values.
     */
    async function getThemeConfig() {
        let accent = '#c026d3';
        let bgContainer = 'rgba(14, 15, 24, 0.65)';
        let textColor = '#f4f4f3';
        let borderRadius = 16;
        let glassBlur = 28;

        try {
            const rootStyles = getComputedStyle(document.documentElement);
            const activeCss = rootStyles.getPropertyValue('--fxn-accent')?.trim() || rootStyles.getPropertyValue('--fxn-active')?.trim();
            if (activeCss && activeCss.length > 2) accent = activeCss;

            const ext = typeof browser !== 'undefined' ? browser : chrome;
            if (ext && ext.storage && ext.storage.local) {
                const data = await ext.storage.local.get(['foxenAccentColor', 'foxenTheme', 'themeSettings']);
                if (data.foxenAccentColor) {
                    accent = data.foxenAccentColor;
                }
                if (data.foxenTheme) {
                    const t = data.foxenTheme;
                    if (t.borderRadius !== undefined && t.borderRadius !== null) {
                        borderRadius = Math.min(24, Math.max(8, parseInt(t.borderRadius, 10) || 16));
                    }
                    if (t.textColor) {
                        textColor = t.textColor;
                    }
                    if (t.glassmorphismBlur) {
                        glassBlur = Math.min(32, Math.max(16, parseInt(t.glassmorphismBlur, 10) || 28));
                    }
                    if (t.containerBgColor && t.containerBgColor.startsWith('#') && t.containerBgColor.length === 7) {
                        const r = parseInt(t.containerBgColor.slice(1, 3), 16);
                        const g = parseInt(t.containerBgColor.slice(3, 5), 16);
                        const b = parseInt(t.containerBgColor.slice(5, 7), 16);
                        // Transparent frosted glass factor (0.55 - 0.72)
                        bgContainer = `rgba(${r}, ${g}, ${b}, 0.65)`;
                    }
                }
            }
        } catch (_) {}

        return { accent, bgContainer, textColor, borderRadius, glassBlur };
    }

    /**
     * Converts hex or rgb accent to rgba with specified opacity.
     */
    function toRgba(color, alpha) {
        if (!color || typeof color !== 'string') return `rgba(192, 38, 211, ${alpha})`;
        let c = color.trim();
        if (c.startsWith('#')) {
            if (c.length === 4) {
                c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
            }
            if (c.length === 7) {
                const r = parseInt(c.slice(1, 3), 16);
                const g = parseInt(c.slice(3, 5), 16);
                const b = parseInt(c.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
        }
        if (c.startsWith('rgb')) {
            return c.replace(/rgba?\(([^)]+)\)/, (_, vals) => {
                const parts = vals.split(',').map(s => s.trim());
                return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
            });
        }
        return `rgba(192, 38, 211, ${alpha})`;
    }

    /**
     * Applies theme styles to the notification card and sub-elements.
     */
    function applyStyles(toast, theme) {
        if (!toast) return;
        const accent = theme.accent || '#c026d3';
        const accentGlow = toRgba(accent, 0.45);
        const accentSoft = toRgba(accent, 0.18);
        const accentSubtle = toRgba(accent, 0.08);

        toast.style.setProperty('--fxn-tg-accent', accent);
        toast.style.setProperty('--fxn-tg-accent-glow', accentGlow);
        toast.style.setProperty('--fxn-tg-accent-soft', accentSoft);
        toast.style.setProperty('--fxn-tg-accent-subtle', accentSubtle);
        toast.style.setProperty('--fxn-tg-bg', theme.bgContainer || 'rgba(14, 15, 24, 0.65)');
        toast.style.setProperty('--fxn-tg-text', theme.textColor || '#f4f4f3');
        toast.style.setProperty('--fxn-tg-radius', `${theme.borderRadius || 16}px`);
        toast.style.setProperty('--fxn-tg-blur', `${theme.glassBlur || 28}px`);
    }

    /**
     * Injects styles and renders the invite toast.
     */
    async function showInviteToast() {
        if (_toastEl && document.body.contains(_toastEl)) return;

        // Ensure keyframes and base CSS are injected
        if (!document.getElementById('foxen-tg-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'foxen-tg-toast-styles';
            style.textContent = `
                @keyframes fxnTgToastIn {
                    0% {
                        opacity: 0;
                        transform: translateY(24px) scale(0.96);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes fxnTgToastOut {
                    0% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(18px) scale(0.94);
                    }
                }
                .fxn-tg-toast {
                    position: fixed;
                    right: 24px;
                    bottom: 24px;
                    z-index: 2147483640;
                    width: 380px;
                    max-width: calc(100vw - 36px);
                    background: var(--fxn-tg-bg, rgba(14, 15, 24, 0.65));
                    backdrop-filter: blur(var(--fxn-tg-blur, 28px)) saturate(190%) contrast(105%);
                    -webkit-backdrop-filter: blur(var(--fxn-tg-blur, 28px)) saturate(190%) contrast(105%);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: var(--fxn-tg-radius, 16px);
                    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 8px 32px var(--fxn-tg-accent-soft, rgba(192, 38, 211, 0.18));
                    padding: 16px 18px;
                    color: var(--fxn-tg-text, #f4f4f3);
                    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
                    box-sizing: border-box;
                    animation: fxnTgToastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    user-select: none;
                    overflow: hidden;
                    transition: bottom 0.25s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .fxn-header-bottom .fxn-tg-toast,
                body.fxn-header-bottom .fxn-tg-toast {
                    bottom: 84px !important;
                }
                .fxn-tg-toast:hover {
                    border-color: rgba(255, 255, 255, 0.25);
                    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.3), 0 10px 38px var(--fxn-tg-accent-soft, rgba(192, 38, 211, 0.25));
                }
                .fxn-tg-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .fxn-tg-badge {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--fxn-tg-accent, #c026d3) 0%, #2AABEE 100%);
                    box-shadow: 0 3px 12px var(--fxn-tg-accent-glow, rgba(192, 38, 211, 0.35));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    flex-shrink: 0;
                }
                .fxn-tg-title-box {
                    flex: 1;
                    min-width: 0;
                }
                .fxn-tg-tag {
                    display: block;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--fxn-tg-accent, #c026d3);
                    font-family: ui-monospace, "JetBrains Mono", monospace;
                    margin-bottom: 2px;
                }
                .fxn-tg-title {
                    display: block;
                    font-size: 14px;
                    font-weight: 700;
                    color: #ffffff;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .fxn-tg-close-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255, 255, 255, 0.45);
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                    flex-shrink: 0;
                }
                .fxn-tg-close-btn:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.12);
                }
                .fxn-tg-body {
                    font-size: 13px;
                    font-weight: 450;
                    line-height: 1.5;
                    color: rgba(255, 255, 255, 0.92);
                    margin-bottom: 14px;
                    word-break: break-word;
                }
                .fxn-tg-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                /* Яркая акцентная кнопка «Перейти» — строго выровненная высота */
                .fxn-tg-btn-primary {
                    flex: 1;
                    height: 38px;
                    min-height: 38px;
                    max-height: 38px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    background: var(--fxn-tg-accent, #c026d3);
                    color: #ffffff !important;
                    font-size: 13px;
                    font-weight: 600;
                    padding: 0 16px;
                    border-radius: 9px;
                    box-sizing: border-box;
                    text-decoration: none !important;
                    box-shadow: 0 4px 16px var(--fxn-tg-accent-glow, rgba(192, 38, 211, 0.45)), 0 1px 3px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    cursor: pointer;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
                }
                .fxn-tg-btn-primary:hover {
                    filter: brightness(1.12);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 22px var(--fxn-tg-accent-glow, rgba(192, 38, 211, 0.6)), 0 2px 5px rgba(0, 0, 0, 0.35);
                    color: #ffffff !important;
                }
                .fxn-tg-btn-primary:active {
                    transform: translateY(0);
                    filter: brightness(0.96);
                }
                /* Второстепенная приглушённая кнопка «Больше не показывать» — строго одинаковая высота */
                .fxn-tg-btn-dismiss {
                    height: 38px;
                    min-height: 38px;
                    max-height: 38px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.72) !important;
                    font-size: 12px;
                    font-weight: 500;
                    padding: 0 14px;
                    border-radius: 9px;
                    box-sizing: border-box;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    cursor: pointer;
                    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
                    white-space: nowrap;
                }
                .fxn-tg-btn-dismiss:hover {
                    background: rgba(255, 255, 255, 0.14);
                    color: #ffffff !important;
                    border-color: rgba(255, 255, 255, 0.25);
                }
                .fxn-tg-btn-dismiss:active {
                    background: rgba(255, 255, 255, 0.09);
                }
                /* Нижняя декоративная акцентная полоска */
                .fxn-tg-accent-bar {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2.5px;
                    background: linear-gradient(90deg, transparent, var(--fxn-tg-accent, #c026d3), transparent);
                    border-radius: 0 0 var(--fxn-tg-radius, 16px) var(--fxn-tg-radius, 16px);
                    pointer-events: none;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const theme = await getThemeConfig();

        const toast = document.createElement('div');
        toast.id = 'foxen-tg-invite-toast';
        toast.className = 'fxn-tg-toast';
        applyStyles(toast, theme);

        toast.innerHTML = `
            <div class="fxn-tg-header">
                <div class="fxn-tg-badge">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21.6 3.6L2.8 10.8c-1.3.5-1.3 1.3-.2 1.7l4.8 1.5 11.2-7c.5-.3 1-.1.6.2l-9.1 8.2-.3 4.9c.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.6.3 1.8-.8l3.3-15.5c.3-1.3-.5-1.9-1.7-1.3z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="fxn-tg-title-box">
                    <span class="fxn-tg-tag">FOXEN COMMUNITY</span>
                    <span class="fxn-tg-title">Официальный Telegram</span>
                </div>
                <button class="fxn-tg-close-btn" type="button" aria-label="Закрыть" title="Закрыть">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="fxn-tg-body">
                Официальный Telegram Foxen: важные анонсы обновлений, полезные фишки и прямая связь с разработчиком для сообщений о багах.
            </div>
            <div class="fxn-tg-actions">
                <a href="${TG_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" class="fxn-tg-btn-primary" id="fxn-tg-btn-go">
                    <span>Перейти</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                <button type="button" class="fxn-tg-btn-dismiss" id="fxn-tg-btn-never">
                    Больше не показывать
                </button>
            </div>
            <div class="fxn-tg-accent-bar"></div>
        `;

        const dismissToast = (cb) => {
            if (!toast || !toast.parentElement) return;
            toast.style.animation = 'fxnTgToastOut 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => {
                toast.remove();
                if (_toastEl === toast) _toastEl = null;
                if (typeof cb === 'function') cb();
            }, 270);
        };

        // Button «Перейти»: opens link, closes plate for current view
        const goBtn = toast.querySelector('#fxn-tg-btn-go');
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                setTimeout(() => dismissToast(), 150);
            });
        }

        // Button «Больше не показывать»: permanently suppresses plate
        const neverBtn = toast.querySelector('#fxn-tg-btn-never');
        if (neverBtn) {
            neverBtn.addEventListener('click', async () => {
                await dismissPermanently();
                dismissToast();
            });
        }

        // Close button (×): simply removes plate for current view (shows again on reload/next visit)
        const closeBtn = toast.querySelector('.fxn-tg-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                dismissToast();
            });
        }

        _toastEl = toast;
        document.body.appendChild(toast);
    }

    /**
     * Watches for real-time changes to theme and accent settings so the toast updates instantly.
     */
    function attachThemeObserver() {
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            if (ext && ext.storage && ext.storage.onChanged) {
                ext.storage.onChanged.addListener((changes, area) => {
                    if (area !== 'local' || !_toastEl || !document.body.contains(_toastEl)) return;
                    if (changes.foxenAccentColor || changes.foxenTheme || changes.themeSettings) {
                        getThemeConfig().then(th => applyStyles(_toastEl, th));
                    }
                });
            }
        } catch (_) {}

        // Also observe mutations on documentElement's style attribute for --fxn-accent changes
        try {
            const mo = new MutationObserver(() => {
                if (_toastEl && document.body.contains(_toastEl)) {
                    getThemeConfig().then(th => applyStyles(_toastEl, th));
                }
            });
            mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
        } catch (_) {}
    }

    /**
     * Initializes the invite notification after a slight, smooth delay.
     */
    async function init() {
        const dismissed = await isDismissed();
        if (dismissed) return;

        // Slight delay so FunPay's initial UI settles and the toast glides in smoothly
        setTimeout(async () => {
            const stillDismissed = await isDismissed();
            if (stillDismissed) return;

            await showInviteToast();
            attachThemeObserver();
        }, 1800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
