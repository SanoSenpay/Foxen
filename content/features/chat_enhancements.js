// content/features/chat_enhancements.js
// Chat quality-of-life improvements:
// 1. Unread total badge on the "Сообщения" nav link
// 2. Timestamp relative refresh ("только что", "2 мин назад", etc.) 
// 3. Ctrl+Enter to send
// 4. Draft saving per chat (survives page navigation)

(function () {
    'use strict';

    // --- 1. Ctrl+Enter to send ---
    function initCtrlEnterSend() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const input = document.querySelector('.chat-form-input .form-control');
                if (input && document.activeElement === input) {
                    const form = input.closest('form');
                    const submitBtn = form?.querySelector('button[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });
    }

    // --- 2. Draft saving per chat ---
    const DRAFT_KEY = 'fpToolsChatDrafts';
    let _drafts = {};

    async function loadDrafts() {
        const d = await browser.storage.local.get(DRAFT_KEY);
        _drafts = d[DRAFT_KEY] || {};
    }

    async function saveDraft(chatId, text) {
        if (!chatId) return;
        _drafts[chatId] = text;
        // Trim to last 200 chats
        const keys = Object.keys(_drafts);
        if (keys.length > 200) {
            keys.slice(0, keys.length - 200).forEach(k => delete _drafts[k]);
        }
        await browser.storage.local.set({ [DRAFT_KEY]: _drafts });
    }

    function getChatIdFromUrl() {
        const m = window.location.search.match(/[?&]node=(\d+)/);
        return m ? m[1] : null;
    }

    function initDraftSaving() {
        loadDrafts().then(() => {
            const chatId = getChatIdFromUrl();
            if (!chatId) return;

            const input = document.querySelector('.chat-form-input .form-control');
            if (!input) return;

            // Restore draft
            if (_drafts[chatId] && !input.value) {
                input.value = _drafts[chatId];
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Save on input
            let _draftTimer = null;
            input.addEventListener('input', () => {
                clearTimeout(_draftTimer);
                _draftTimer = setTimeout(() => {
                    const text = input.value.trim();
                    if (text) saveDraft(chatId, text);
                    else {
                        delete _drafts[chatId];
                        browser.storage.local.set({ [DRAFT_KEY]: _drafts });
                    }
                }, 800);
            });

            // Clear draft on send
            const form = input.closest('form');
            form?.addEventListener('submit', () => {
                delete _drafts[chatId];
                browser.storage.local.set({ [DRAFT_KEY]: _drafts });
            });
        });
    }

    // --- 3. Character counter on chat input ---
    function initCharCounter() {
        const input = document.querySelector('.chat-form-input .form-control');
        if (!input || document.getElementById('fp-chat-char-count')) return;

        const counter = document.createElement('span');
        counter.id = 'fp-chat-char-count';
        counter.className = 'fp-chat-char-count';
        counter.textContent = '';

        const formGroup = document.querySelector('#comments');
        if (formGroup) {
            formGroup.style.position = 'relative';
            formGroup.appendChild(counter);
        }

        input.addEventListener('input', () => {
            const len = input.value.length;
            if (len > 0) {
                counter.textContent = len;
                counter.style.display = 'block';
                counter.style.color = len > 900 ? '#ff5c5c' : len > 700 ? '#ffa500' : '#4a5070';
            } else {
                counter.style.display = 'none';
            }
        });
    }

    // --- 4. Message Translation ---
    function initMessageTranslation() {
        if (!document.getElementById('fp-translate-styles')) {
            const style = document.createElement('style');
            style.id = 'fp-translate-styles';
            style.textContent = `
                .fp-translate-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    opacity: 0.7;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 6px;
                    background: rgba(107, 102, 255, 0.1);
                    color: #a09ef8;
                    margin-top: 8px;
                    transition: all 0.2s;
                    user-select: none;
                    text-transform: uppercase;
                }
                .fp-translate-btn:hover {
                    opacity: 1;
                    background: rgba(107, 102, 255, 0.2);
                }
                .fp-translate-btn .material-icons {
                    font-size: 14px;
                }
                .fp-translated-text {
                    color: #d8dae8;
                    margin-top: 8px;
                    font-size: 0.95em;
                    display: block;
                    border-left: 3px solid #6B66FF;
                    background: rgba(107, 102, 255, 0.05);
                    border-radius: 0 6px 6px 0;
                    padding: 8px 12px;
                    font-style: italic;
                }
            `;
            document.head.appendChild(style);
        }

        document.querySelectorAll('.chat-msg-item').forEach(attachTranslateBtn);
    }

    function attachTranslateBtn(msgNode) {
        if (msgNode.querySelector('.fp-translate-btn') || msgNode.querySelector('.chat-msg-system')) return;
        const bodyWrap = msgNode.querySelector('.chat-msg-body');
        if (!bodyWrap) return;
        
        const textNode = msgNode.querySelector('.chat-msg-text');
        if (!textNode || !textNode.textContent.trim()) return;

        if (window.getComputedStyle(bodyWrap).position === 'static') {
            bodyWrap.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'fp-translate-btn';
        btn.innerHTML = '<span class="material-icons">translate</span> Перевести';
        btn.title = 'Перевести на русский';
        
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (msgNode.querySelector('.fp-translated-text')) return;

            btn.innerHTML = '<span class="material-icons">hourglass_empty</span> Переводим...';
            btn.style.pointerEvents = 'none';
            
            const originalText = textNode.textContent.trim();
            
            try {
                const response = await browser.runtime.sendMessage({
                    action: 'translateMessage',
                    text: originalText
                });

                if (response && response.success && response.translated) {
                    const transEl = document.createElement('div');
                    transEl.className = 'fp-translated-text';
                    transEl.textContent = response.translated;
                    textNode.appendChild(transEl);
                    btn.remove(); // Hide the button after translating
                } else {
                    throw new Error(response?.error || 'Unknown error');
                }
            } catch (err) {
                console.error("FP Tools: Translation error", err);
                btn.innerHTML = '<span class="material-icons">error</span> Ошибка';
                btn.style.pointerEvents = 'auto';
            }
        });
        
        textNode.parentElement.appendChild(btn);
    }

    // --- Init ---
    function init() {
        initCtrlEnterSend();

        // For chat pages, init draft + char counter
        const isChatPage = window.location.pathname.includes('/chat/') ||
            window.location.pathname.includes('/users/') && document.querySelector('.chat-form-input');

        if (document.querySelector('.chat-form-input')) {
            initDraftSaving();
            initCharCounter();
        }

        initMessageTranslation();

        // Watch for chat form appearing (SPA routing)
        const root = document.getElementById('content') || document.body;
        let _initDone = !!document.querySelector('.chat-form-input');
        new MutationObserver((mutations) => {
            if (!_initDone && document.querySelector('.chat-form-input')) {
                _initDone = true;
                initDraftSaving();
                initCharCounter();
            }
            if (_initDone && !document.querySelector('.chat-form-input')) {
                _initDone = false;
            }

            // Attach translate buttons to new messages
            mutations.forEach(m => {
                m.addedNodes.forEach(n => {
                    if (n.nodeType === Node.ELEMENT_NODE) {
                        if (n.classList.contains('chat-msg-item')) attachTranslateBtn(n);
                        else n.querySelectorAll?.('.chat-msg-item').forEach(attachTranslateBtn);
                    }
                });
            });
        }).observe(root, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();