// content/features/fpt_identifier.js
// =============================================================================
// FOXEN & FUNPAY TOOLS USER IDENTIFIER (ULTRA-OPTIMIZED)
//  • Identifies active users of Foxen and original FunPay Tools via zero-width signatures.
//  • Dual Signatures:
//      - FPT_SIGNATURE   : '\u200B\u200D\u200C' (FunPay Tools)
//      - FOXEN_SIGNATURE : '\u200C\u200D\u200B' (Foxen)
//  • Body Event Delegation: Captures form submit/click/enter BEFORE FunPay reads content.
//  • Header, Profile, and Message Badges: Displays distinct "🦊 Foxen" and "⚡ FunPay Tools" labels.
// =============================================================================

(function () {
    'use strict';

    const ALLOWED = ['/chat/', '/lots/offer', '/orders/', '/users/'];
    if (!ALLOWED.some(p => window.location.pathname.startsWith(p))) return;

    const FPT_SIGNATURE   = '\u200B\u200D\u200C';
    const FOXEN_SIGNATURE = '\u200C\u200D\u200B';

    const foxenUsers = new Set();
    const fxnUsers   = new Set();

    const extApi = (typeof browser !== 'undefined' ? browser : chrome);
    const FOXEN_ICON_URL = extApi.runtime.getURL('icons/icon128.png');
    const FPT_ICON_URL   = extApi.runtime.getURL('icons/fptlogo.png');

    let currentChatUserId = null;
    let lastSeenAuthorId  = null;
    let lastRenderedBadgeKey = '';

    // ── Inject Badge Styles ──────────────────────────────────────────────────
    function addIdentifierStyles() {
        if (document.getElementById('fxn-identifier-styles')) return;
        const s = document.createElement('style');
        s.id = 'fxn-identifier-styles';
        s.textContent = `
            .fxn-status-badge-wrap {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 6px;
                vertical-align: middle;
                user-select: none;
                line-height: 1;
            }
            .fxn-badge-icon {
                width: 22px;
                height: 22px;
                object-fit: contain;
                display: inline-block;
                vertical-align: middle;
                transition: transform 0.18s ease, filter 0.18s ease;
                cursor: pointer;
            }
            .chat-header .fxn-badge-icon,
            .profile-header .fxn-badge-icon {
                width: 24px;
                height: 24px;
            }
            .chat-msg-author .fxn-badge-icon {
                width: 20px;
                height: 20px;
            }
            .fxn-badge-icon:hover {
                transform: scale(1.18);
            }
            .fxn-badge-foxen-icon {
                width: 25px;
                height: 25px;
                filter: drop-shadow(0 0 4px rgba(255, 254, 255, 0.63));
            }
            .chat-header .fxn-badge-foxen-icon,
            .profile-header .fxn-badge-foxen-icon {
                width: 28px;
                height: 28px;
            }
            .chat-msg-author .fxn-badge-foxen-icon {
                width: 23px;
                height: 23px;
            }
            .fxn-badge-fpt-icon {
                filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.55));
            }
        `;
        document.head.appendChild(s);
    }

    function createBadge(type) {
        const wrap = document.createElement('span');
        wrap.className = 'fxn-status-badge-wrap';
        const img = document.createElement('img');
        const isFoxen = type === 'foxen';
        img.className = isFoxen ? 'fxn-badge-icon fxn-badge-foxen-icon' : 'fxn-badge-icon fxn-badge-fpt-icon';
        img.src = isFoxen ? FOXEN_ICON_URL : FPT_ICON_URL;
        img.alt = isFoxen ? 'Foxen' : 'FunPay Tools';
        img.title = isFoxen ? 'Пользователь расширения Foxen' : 'Пользователь расширения FunPay Tools';
        wrap.appendChild(img);
        return wrap;
    }

    function getUserIdFromUrl(url) {
        if (!url) return null;
        const m = String(url).match(/users\/(\d+)/);
        return m ? m[1] : null;
    }

    // ── Update Header / Profile Status Badge ──────────────────────────────────
    function updateHeaderStatus() {
        const header = document.querySelector('.chat-header') || document.querySelector('.profile-header');
        if (!header) return;

        const statusEl = header.querySelector('.media-user-status') || header.querySelector('.user-status') || header.querySelector('.media-user-name');
        const userLink = header.querySelector('.media-user-name a') || header.querySelector('a[href*="/users/"]');
        if (!statusEl || !userLink) return;

        const userId = getUserIdFromUrl(userLink.href);
        currentChatUserId = userId;

        if (!userId) {
            statusEl.querySelector('.fxn-status-badge-wrap')?.remove();
            lastRenderedBadgeKey = '';
            return;
        }

        const isFoxen = foxenUsers.has(userId);
        const isFPT   = fxnUsers.has(userId);
        const badgeKey = `${userId}:${isFoxen}:${isFPT}`;

        if (badgeKey === lastRenderedBadgeKey && statusEl.querySelector('.fxn-status-badge-wrap')) {
            return;
        }
        lastRenderedBadgeKey = badgeKey;

        statusEl.querySelector('.fxn-status-badge-wrap')?.remove();

        if (isFoxen) {
            statusEl.appendChild(createBadge('foxen'));
        } else if (isFPT) {
            statusEl.appendChild(createBadge('fpt'));
        }
    }

    // ── Message Scanning Logic (With Message-Level Badges) ────────────────────
    function processMessage(node) {
        if (node.classList.contains('fxn-scanned-msg')) return;
        node.classList.add('fxn-scanned-msg');

        let authorId = null;
        if (node.classList.contains('chat-msg-with-head')) {
            const link = node.querySelector('.chat-msg-author-link');
            if (link) {
                authorId = getUserIdFromUrl(link.href);
                lastSeenAuthorId = authorId;
            }
        } else {
            authorId = lastSeenAuthorId;
        }

        const txt = node.querySelector('.chat-msg-text');
        if (!txt) return;

        const content = txt.textContent || '';
        const hasFoxen = content.includes(FOXEN_SIGNATURE);
        const hasFPT   = content.includes(FPT_SIGNATURE);

        if (hasFoxen || hasFPT) {
            if (authorId) {
                if (hasFoxen) foxenUsers.add(authorId);
                if (hasFPT) fxnUsers.add(authorId);
            }

            // Inline badge on message author header
            const headAuthor = node.querySelector('.chat-msg-author');
            if (headAuthor && !headAuthor.querySelector('.fxn-status-badge-wrap')) {
                if (hasFoxen) {
                    headAuthor.appendChild(createBadge('foxen'));
                } else if (hasFPT) {
                    headAuthor.appendChild(createBadge('fpt'));
                }
            }

            if (authorId && authorId === currentChatUserId) {
                updateHeaderStatus();
            }
        }
    }

    // ── Should Inject Guard ──────────────────────────────────────────────────
    function shouldInject(text) {
        if (!text || text.trim().length < 1) return false;
        if (text.includes(FOXEN_SIGNATURE)) return false; // Already injected
        if (/(https?:\/\/|www\.|ftp:\/\/)/i.test(text)) return false;
        if (/funpay\.com/i.test(text)) return false;
        if (/[A-Za-z]:\\/i.test(text) || /^\/[a-z]/i.test(text)) return false;

        // Skip commands
        const trimmed = text.trimStart();
        const blockedFirstChars = ['/', '.', '!', '+', '№', '\\', '"', ':', '(', ')', '?', '#'];
        if (blockedFirstChars.includes(trimmed.charAt(0))) return false;

        return true;
    }

    // ── Body Delegation for Outgoing Messages (Synchronous Capture) ───────────
    function attachGlobalFormDelegation() {
        const injectSignatureIntoTextarea = (textarea) => {
            if (!textarea) return;
            let val = textarea.value;
            if (!shouldInject(val)) return;

            if (!val.endsWith(' ')) val += ' ';
            val += FOXEN_SIGNATURE;
            textarea.value = val;
        };

        // Capture submit on forms
        document.body.addEventListener('submit', (e) => {
            const form = e.target;
            if (form && form.tagName === 'FORM') {
                const textarea = form.querySelector('textarea[name="content"]');
                injectSignatureIntoTextarea(textarea);
            }
        }, true);

        // Capture button clicks
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('button[type="submit"], button.btn-round, .chat-form-btn button');
            if (!btn) return;
            const form = btn.closest('form');
            const textarea = form ? form.querySelector('textarea[name="content"]') : document.querySelector('textarea[name="content"]');
            injectSignatureIntoTextarea(textarea);
        }, true);

        // Capture Enter keypress
        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const textarea = e.target.closest('textarea[name="content"]');
                if (textarea) {
                    injectSignatureIntoTextarea(textarea);
                }
            }
        }, true);
    }

    // ── Throttled Observer for Incoming Chat Messages ────────────────────────
    function setupMessageObserver() {
        let scanTimer = null;

        const scanAll = () => {
            const headerLink = document.querySelector('.chat-header .media-user-name a') || document.querySelector('a[href*="/users/"]');
            const newUserId  = headerLink ? getUserIdFromUrl(headerLink.href) : null;
            if (newUserId !== currentChatUserId) {
                lastSeenAuthorId = null;
                currentChatUserId = newUserId;
                lastRenderedBadgeKey = '';
            }

            document.querySelectorAll('.chat-msg-item:not(.fxn-scanned-msg)').forEach(processMessage);
            updateHeaderStatus();
        };

        const scheduleScan = () => {
            if (scanTimer) return;
            scanTimer = setTimeout(() => {
                scanTimer = null;
                scanAll();
            }, 250);
        };

        scanAll();

        const containerSelector = '.chat.chat-float, .chat-full .chat, .chat-message-list, .chat-message-container, .chat-full';
        const targetContainer = document.querySelector(containerSelector) || document.body;

        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;

            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.classList && node.classList.contains('fxn-status-badge-wrap')) continue;

                        if (node.classList && node.classList.contains('chat-msg-item')) {
                            shouldScan = true;
                            break;
                        } else if (node.querySelector && node.querySelector('.chat-msg-item')) {
                            shouldScan = true;
                            break;
                        }
                    }
                }
                if (shouldScan) break;
            }

            if (shouldScan) {
                scheduleScan();
            }
        });

        observer.observe(targetContainer, { childList: true, subtree: true });
    }

    // ── Boot ────────────────────────────────────────────────────────────────
    async function boot() {
        try {
            const st = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenIdentifierEnabled');
            if (st.foxenIdentifierEnabled === false) return;
        } catch (_) {}

        addIdentifierStyles();
        attachGlobalFormDelegation();
        setupMessageObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
