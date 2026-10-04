// C:\Users\AlliSighs\Desktop\◘FUNPAY ◘\Foxen 2.6\content\content_script.js 

(function() {
    'use strict';

    // --- ПИНГ ДЛЯ АВТОПОДНЯТИЯ (Решение проблемы засыпания) ---
    // Каждые 30 секунд отправляем пинг в фоновый скрипт.
    // Если фоновый скрипт спал (проблема MV3 / Firefox), это его разбудит.
    // Фоновый скрипт сам решит, пришло ли время для запуска цикла.
    setInterval(() => {
        try {
            const extApi = typeof browser !== 'undefined' ? browser : chrome;
            extApi.runtime.sendMessage({ action: 'fxnAutobumpPing' }).catch(() => {});
        } catch (_) {}
    }, 30000);

    // --- ИНТЕГРАЦИЯ С САЙТОМ FOXEN (ОБЛАЧНЫЕ БЭКАПЫ СУПАБЕЙЗ) ---
    window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'FOXEN_REQUEST_SETTINGS_EXPORT') {
            try {
                const extApi = typeof browser !== 'undefined' ? browser : chrome;
                const allData = await extApi.storage.local.get(null);
                window.postMessage({
                    type: 'FOXEN_SETTINGS_EXPORT_RESPONSE',
                    payload: allData
                }, '*');
            } catch (e) {
                console.warn('[Foxen Extension] Ошибка выгрузки настроек:', e);
            }
        }
    });
    
    // --- НОВЫЙ БЛОК: ФУНКЦИОНАЛ ОБЪЯВЛЕНИЙ ---
    function initializeAnnouncementsFeature() {
        const announcementsTab = document.getElementById('announcementsNavTab');
        if (!announcementsTab) return;

        const displayAnnouncements = (announcements) => {
            const contentArea = document.getElementById('announcements-content-area');
            if (!contentArea) return;

            if (!announcements || announcements.length === 0) {
                contentArea.innerHTML = '<p class="announcement-empty">Пока нет никаких объявлений.</p>';
                return;
            }

            contentArea.innerHTML = announcements.map(a => {
                const date = new Date(a.id).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(a.title) : a.title;
                const safeContent = typeof escapeHtml === 'function' ? escapeHtml(a.content).replace(/\n/g, '<br>') : String(a.content || '').replace(/\n/g, '<br>');
                return `
                    <div class="announcement-item">
                        <div class="announcement-item-header">
                            <h4>${safeTitle}</h4>
                            <span class="announcement-date">${date}</span>
                        </div>
                        <p>${safeContent}</p>
                    </div>
                `;
            }).join('');
        };

        announcementsTab.addEventListener('click', async () => {
            const popup = document.querySelector('.foxen-popup');
            const navItems = popup.querySelectorAll('.foxen-nav li, .foxen-header-tab');
            const contentPages = popup.querySelectorAll('.foxen-page-content');

            navItems.forEach(item => item.classList.remove('active'));
            announcementsTab.classList.add('active');
            
            contentPages.forEach(page => page.classList.remove('active'));
            popup.querySelector('.foxen-page-content[data-page="announcements"]').classList.add('active');

            chrome.runtime.sendMessage({ action: 'markAnnouncementsAsRead' });
            
            const { foxenAnnouncements } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAnnouncements');
            displayAnnouncements(foxenAnnouncements);
        });

        const refreshBtn = document.getElementById('refresh-announcements-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.disabled = true;
                refreshBtn.querySelector('.material-icons').classList.add('spinning');
                
                chrome.runtime.sendMessage({ action: 'forceCheckAnnouncements' }, (response) => {
                    if (response && response.success) {
                        showNotification('Объявления обновлены!', false);
                    }
                });

                setTimeout(() => {
                    refreshBtn.disabled = false;
                    refreshBtn.querySelector('.material-icons').classList.remove('spinning');
                }, 5000);
            });
        }

        chrome.storage.local.get('foxenUnreadCount', ({ foxenUnreadCount }) => {
            updateAnnouncementsBadgeUI(foxenUnreadCount || 0);
        });
    }

    function updateAnnouncementsBadgeUI(unreadCount) {
        const announcementsTab = document.getElementById('announcementsNavTab');
        if (!announcementsTab) return;
        const badge = announcementsTab.querySelector('.notification-badge');

        if (unreadCount > 0) {
            announcementsTab.classList.add('has-unread');
            badge.textContent = `+${unreadCount}`;
            badge.style.display = 'flex';
        } else {
            announcementsTab.classList.remove('has-unread');
            badge.style.display = 'none';
        }
    }
    // --- КОНЕЦ НОВОГО БЛОКА ---

    function loadGoogleFonts() {
        if (document.getElementById('google-material-icons')) return;
        const link = createElement('link', {
            id: 'google-material-icons',
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/icon?family=Material+Icons'
        });
        document.head.appendChild(link);
    }

    let __fpPopupBuilding = false;
    function ensureFpToolsPopup() {
        let toolsPopup = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
        if (!toolsPopup) {
            if (typeof createMainPopup === 'function') {
                toolsPopup = createMainPopup();
            } else if (typeof window.createMainPopup === 'function') {
                toolsPopup = window.createMainPopup();
            }
            if (toolsPopup && !document.body.contains(toolsPopup)) {
                document.body.appendChild(toolsPopup);
            }
            if (typeof getModalOverlaysHTML === 'function') {
                const modalsHTML = getModalOverlaysHTML();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = modalsHTML;
                while (tempDiv.firstChild) {
                    document.body.appendChild(tempDiv.firstChild);
                }
            }
        }

        if (!__fpPopupBuilding && toolsPopup) {
            __fpPopupBuilding = true;
            (async () => {
                const safeRun = async (fn) => {
                    try { if (typeof fn === 'function') await fn(); } catch (err) { console.warn('[Foxen] Plugin init error:', err); }
                };

                if (typeof loadSavedSettings === 'function') await safeRun(loadSavedSettings);
                if (typeof initializeToolsPopup === 'function') await safeRun(initializeToolsPopup);
                if (typeof makePopupInteractive === 'function') {
                    try { makePopupInteractive(toolsPopup); } catch (_) {}
                }
                if (typeof initializeImageGenerator === 'function') await safeRun(initializeImageGenerator);
                if (typeof initializeCustomSound === 'function') await safeRun(initializeCustomSound);
                if (typeof initializeCustomSoundEditor === 'function') await safeRun(initializeCustomSoundEditor);
                if (typeof initializeMagicStickStyler === 'function') await safeRun(initializeMagicStickStyler);
                if (typeof initializePiggyBank === 'function') await safeRun(initializePiggyBank);
                if (typeof initializeHeaderButtonStyler === 'function') await safeRun(initializeHeaderButtonStyler);
                if (typeof initializeAnnouncementsFeature === 'function') await safeRun(initializeAnnouncementsFeature);
                if (typeof initializeLotIO === 'function') await safeRun(initializeLotIO);
                if (typeof initializeAutoReview === 'function') await safeRun(initializeAutoReview);
                if (typeof initializeAILotAudit === 'function') await safeRun(initializeAILotAudit);
                if (typeof initializeAISettings === 'function') await safeRun(initializeAISettings);
                if (typeof initTicketsTab === 'function') await safeRun(initTicketsTab);
                if (typeof initializeSettingsIO === 'function') await safeRun(initializeSettingsIO);
                if (typeof initBulkLotEditor === 'function') await safeRun(initBulkLotEditor);
                if (typeof initAutoDeliveryUI === 'function') await safeRun(initAutoDeliveryUI);
                if (typeof initializeResetButtons === 'function') await safeRun(initializeResetButtons);
                if (typeof initializeOverviewTour === 'function') await safeRun(initializeOverviewTour);
            })();
        }

        return toolsPopup;
    }
    window.__fpEnsurePopup = ensureFpToolsPopup;

    // Dedicated, foolproof global popup toggle
    window.__fpTogglePopup = function() {
        let popup = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
        if (!popup) {
            popup = ensureFpToolsPopup();
        }
        if (!popup) {
            console.error('[Foxen] Cannot build popup');
            return;
        }

        if (popup.classList.contains('active')) {
            popup.classList.remove('active');
            if (typeof window.closeFoxenMenuSettings === 'function') {
                try { window.closeFoxenMenuSettings(); } catch (_) {}
            }
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
        } else {
            try {
                const cachedScrim = localStorage.getItem('foxenScrimEnabled') ?? sessionStorage.getItem('foxenScrimEnabled');
                if (cachedScrim !== null) {
                    popup.classList.toggle('fxn-no-scrim', cachedScrim === 'false');
                }
            } catch (_) {}
            popup.classList.add('active');
            if (typeof window.switchFoxenPanel === 'function') {
                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) {
                        storage.local.get('foxenLastActivePage', (data) => {
                            window.switchFoxenPanel(data?.foxenLastActivePage || 'general');
                            if (typeof window.fxnSyncDockbarActive === 'function') {
                                window.fxnSyncDockbarActive();
                            }
                        });
                    } else {
                        window.switchFoxenPanel('general');
                    }
                } catch (_) {
                    window.switchFoxenPanel('general');
                }
            }
            if (typeof applyFptMenuTransparency === 'function') applyFptMenuTransparency();
            if (typeof syncFptMenuControls === 'function') syncFptMenuControls();
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
        }
    };

    // Global delegated capture listener (in case of dynamic navbar re-rendering)
    if (!window.__fpButtonDelegatedListenerAdded) {
        window.__fpButtonDelegatedListenerAdded = true;
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#foxenButton');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                window.__fpTogglePopup();
            }
        }, true);
    }

    function addFpToolsButton() {
        if (document.getElementById('foxenButton')) return true;

        const anchor = document.querySelector('.nav.navbar-nav.navbar-right.logged .user-link[data-toggle="dropdown"]')?.parentElement
            || document.querySelector('.nav.navbar-nav.navbar-right .user-link')?.parentElement
            || document.querySelector('.nav.navbar-nav.navbar-right li:last-child')
            || document.querySelector('.nav.navbar-nav.navbar-right')
            || document.querySelector('.navbar-nav.navbar-right');

        if (!anchor) {
            return false;
        }

        const toolsMenu = createElement('li', { id: 'foxenButtonLi' });
        const savedAccent = (function() {
            try {
                return window.__foxenAccentColor || localStorage.getItem('foxen_accent_color') || sessionStorage.getItem('foxen_accent_color') || '';
            } catch (_) { return ''; }
        })();
        const colorStyle = savedAccent ? `color: ${savedAccent} !important;` : `color: var(--fxn-btn-color, var(--fxn-accent, #c026d3)) !important;`;
        toolsMenu.innerHTML = `<a style="font-family: 'Jim Nightshade', cursive !important; font-size: 21px !important; font-weight: 700 !important; letter-spacing: 2px !important; line-height: 1 !important; cursor: pointer; user-select: none; ${colorStyle}" id="foxenButton">FOXEN<span></span></a>`;
        if (document.documentElement.classList.contains('fxn-dockbar-active')) {
            toolsMenu.style.setProperty('display', 'none', 'important');
        }
        
        if (anchor.tagName && anchor.tagName.toLowerCase() === 'li') {
            anchor.insertAdjacentElement('afterend', toolsMenu);
        } else {
            anchor.appendChild(toolsMenu);
        }

        const button = toolsMenu.querySelector('#foxenButton');

        if (typeof applyHeaderButtonStylesEarly === 'function') {
            applyHeaderButtonStylesEarly();
        }

        // Direct listener
        button?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.__fpTogglePopup();
        });
        
        let hoverTimeout;
        button?.addEventListener('mouseenter', () => {
            hoverTimeout = setTimeout(() => {
                if (typeof showHeaderButtonTooltip === 'function') {
                    showHeaderButtonTooltip(button);
                }
            }, 2000);
        });

        button?.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            if (typeof hideHeaderButtonTooltip === 'function') {
                hideHeaderButtonTooltip();
            }
        });

        button?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        console.log("Foxen: Кнопка в хедере успешно добавлена.");
        return true;
    }

    async function handleAIReviewReply(event) {
        const button = event.currentTarget;
    
        if (!document.querySelector('style[data-foxen-btn-loader]')) {
            const style = document.createElement('style');
            style.dataset.foxenBtnLoader = 'true';
            style.textContent = `
                .foxen-btn-loader {
                    display: inline-block;
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }
    
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="foxen-btn-loader"></span><span style="margin-left:8px;">Генерация…</span>`;
        
        const replyTextarea = document.querySelector('.review-item-answer-form textarea[name="text"], .review-editor-reply textarea[name="text"]');
        if (!replyTextarea) {
            showNotification('Не найдено поле для ответа.', true);
            button.disabled = false;
            button.innerHTML = originalText;
            return;
        }
        
        try {
            const myUsername = document.querySelector('.user-link-name')?.textContent.trim() || 'Продавец';

            // Parse the lot name from the order page. Prefer «Краткое описание»; fall back
            // to «Игра», the order-secrets title, or the review detail line.
            const headers = Array.from(document.querySelectorAll('.param-item h5'));
            const findParam = (label) => {
                const h = headers.find(x => x.textContent.trim() === label);
                return h && h.nextElementSibling ? h.nextElementSibling.textContent.trim() : '';
            };
            let lotName = findParam('Краткое описание') || findParam('Игра') || '';
            if (!lotName) {
                lotName = document.querySelector('.review-item-detail')?.textContent.trim()
                       || 'ваш товар';
            }

            const reviewText = document.querySelector('.review-item-text')?.textContent.trim() || 'положительный отзыв';
    
            const response = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
                action: "getAIProcessedText",
                text: lotName,
                context: reviewText,
                myUsername: myUsername,
                type: "review_reply"
            });
    
            if (response && response.success) {
                replyTextarea.value = response.data;
                replyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                throw new Error(response.error || 'Неизвестная ошибка ИИ.');
            }
    
        } catch (error) {
            showNotification(`Ошибка ИИ: ${error.message}`, true);
            console.error('Foxen AI Review Reply Error:', error);
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    function initializeDynamicFeatures() {
        document.body.addEventListener('focusin', (event) => {
            if (event.target.matches('.chat-form-input .form-control')) {
                if (!document.querySelector('.chat-buttons-container') && !document.querySelector('.foxen-template-sidebar')) {
                    addChatTemplateButtons();
                }
                if (!document.getElementById('aiModeToggleBtn')) {
                    setupAIChatFeature();
                }
            }
            if (event.target.matches('textarea.textarea-lot-secrets')) {
                if (!document.getElementById('ad-manager-placeholder')) {
                    initializeAutoDeliveryManager();
                }
            }
        });
    
        const checkAndInitFeatures = () => {
            if (!document.getElementById('foxenGenerateImageBtn') && document.querySelector('.attachments-box')) {
                initializeImageGenerator();
            }
            if (!document.getElementById('foxen-ai-gen-btn')) {
                const header = document.querySelector('h1.page-header, h1.page-header.page-header-no-hr');
                if (header && (header.textContent.includes('Добавление предложения') || header.textContent.includes('Редактирование предложения'))) {
                    createAIGeneratorUI();
                }
            }
            if (!document.getElementById('foxen-read-all-btn') && document.querySelector('.chat-full-header')) {
                initializeMarkAllAsRead();
            }
            // --- ИИ-ОТВЕТ НА ОТЗЫВ: кнопка-клон «Опубликовать» со звёздочкой ---
            const reviewPublishBtn = document.querySelector('.review-item-answer-form .btn[data-action="save"], .review-editor-reply .btn[data-action="save"]');
            if (reviewPublishBtn && !document.getElementById('foxen-ai-review-reply-btn')) {
                const aiBtn = createElement('button', {
                    type: 'button',
                    class: reviewPublishBtn.className.trim(),
                    id: 'foxen-ai-review-reply-btn'
                });
                aiBtn.innerHTML = `<span class="fp-ai-reply-star">✦</span><span class="fp-ai-reply-label">Ответить</span>`;
                aiBtn.style.marginLeft = '10px';
                reviewPublishBtn.style.marginLeft = '';
                reviewPublishBtn.after(aiBtn);
                aiBtn.addEventListener('click', handleAIReviewReply);
            }
            if (window.location.pathname.includes('/lots/offer') && !document.getElementById('foxen-public-clone-btn')) {
                const buyButtonForm = document.querySelector('form[action$="/orders/new"]');
                const buyButton = buyButtonForm?.querySelector('button[type="submit"]');

                if (buyButton) {
                    // Создаем отдельную обертку только для кнопок, чтобы не сломать текст <p class="help-block">
                    const btnWrapper = document.createElement('div');
                    btnWrapper.style.display = 'flex';
                    btnWrapper.style.gap = '10px';
                    btnWrapper.style.marginBottom = '10px';

                    const cloneBtn = createElement('button', {
                        type: 'button',
                        id: 'foxen-public-clone-btn',
                        class: 'btn btn-default'
                    }, {
                        flex: '0 0 auto', // Кнопка занимает только нужную ширину
                        padding: '0 15px'
                    }, 'Копировать лот');
                    
                    // Кнопка "Купить" занимает всё оставшееся место
                    buyButton.style.flex = '1';
                    buyButton.style.marginBottom = '0'; // Убираем родной отступ, так как он теперь у обертки
                    
                    // Помещаем кнопки в обертку
                    buyButton.parentNode.insertBefore(btnWrapper, buyButton);
                    btnWrapper.appendChild(cloneBtn);
                    btnWrapper.appendChild(buyButton);
                    
                    if (typeof handlePublicLotCopy === 'function') {
                        cloneBtn.addEventListener('click', handlePublicLotCopy);
                    }
                }
            }
            // --- КОНЕЦ НОВОГО БЛОКА ---
        };
    
        checkAndInitFeatures();
    
        const observer = new MutationObserver(throttle(checkAndInitFeatures, 500));
    
        const contentNode = document.getElementById('content');
        if (contentNode) {
            observer.observe(contentNode, { childList: true, subtree: true });
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    async function initializeFpTools() {
        loadGoogleFonts();

        const buttonObserver = new MutationObserver((mutations, obs) => {
            if (addFpToolsButton()) {
                obs.disconnect(); 
            }
        });

        if (!addFpToolsButton()) {
            buttonObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        initializeDynamicFeatures();
        initializeQuickGamesMenu();

        // Popup DOM and background initializers are handled on-demand by ensureFpToolsPopup / window.__fpTogglePopup

        const settings = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
            'enableRedesignedHomepage', 
            'showSalesStats', 
            'hideBalance', 
            'viewSellersPromo',
            'enableCustomTheme'
        ]);

        if (settings.enableRedesignedHomepage !== false) {
            await handleHomepageRedesign();
        } else {
            const content = document.querySelector('#content');
            if (content) content.style.visibility = 'visible';
        }

        if (settings.showSalesStats !== false) initializeSalesStatistics();
        if (settings.hideBalance === true) initializeHideBalance();
        if (settings.viewSellersPromo !== false) initializeViewPromoIcons();

        // Page-side features (NOT popup-bound) - keep eager so the FunPay pages work
        // immediately without opening the settings popup.
        addChatTemplateButtons();
        initializeExactPrice();
        // FIX 2.8.4 (№9): применяем кастомные стили редактора сразу, не дожидаясь
        // открытия меню Foxen.
        if (typeof injectMagicStickStylesEarly === 'function') injectMagicStickStylesEarly();
        setupAIChatFeature();
        initializeFontTools();
        applyHeaderPosition();
        initializeUserNotes();
        initializeAutoDeliveryManager();
        initializeLotCloning();
        initializeLotManagement();
        initializeReviewSorter();
        initializeMarketAnalytics();
        if (typeof initializeMarkAllAsRead === 'function') initializeMarkAllAsRead();
        if (typeof initializeFPTIdentifier === 'function') initializeFPTIdentifier();
        initializeBlacklist();
        initializeUnconfirmedBalanceDisplay();
        initializeSalesFilters();
        // Apply saved Foxen button colour/size at load (panel itself builds with popup).
        if (typeof applyHeaderButtonStylesEarly === 'function') applyHeaderButtonStylesEarly();
        // order_page_enhancements.js, lot_context_menu.js, auto_restore_lots.js self-initialize
        // New 3.0 features (self-initializing modules loaded separately)
        // quick_lot_search.js, chat_enhancements.js self-initialize

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'logToAutoBumpConsole') {
                logToAutoBumpConsole(request.message);
                return true;
            }
            if (request.action === "getAppData") {
                try {
                    const appDataString = document.body.dataset.appData;
                    let appData = {};
                    if (appDataString) {
                        const parsed = JSON.parse(appDataString);
                        appData = Array.isArray(parsed) ? parsed[0] : parsed;
                    }
                    let userName = appData?.userName || appData?.username || appData?.user?.name || '';
                    if (!userName) {
                        const nameEl = document.querySelector('.user-link-name, a.user-link-dropdown .user-link-name, .navbar-right .user-link-name');
                        if (nameEl) userName = nameEl.textContent.trim();
                    }
                    if (userName) appData.userName = userName;
                    if (appData.userId || userName) {
                        chrome.storage.local.set({ fpCurrentUserInfo: { userId: String(appData.userId || ''), username: userName } });
                    }
                    sendResponse({ success: true, data: appData });
                } catch (e) {
                    sendResponse({ success: false, error: e.message });
                }
                return true;
            }
            if (request.action === 'foxenProxyFetch') {
                (async () => {
                    try {
                        const init = {
                            method: request.options?.method || 'GET',
                            credentials: 'include'
                        };
                        const h = request.options?.headers ? { ...request.options.headers } : {};
                        delete h['Cookie'];
                        delete h['cookie'];
                        delete h['Origin'];
                        delete h['origin'];
                        delete h['Referer'];
                        delete h['referer'];

                        let body = request.options?.body;
                        try {
                            const appDataEl = document.querySelector('body[data-app-data]');
                            if (appDataEl) {
                                const appData = JSON.parse(appDataEl.getAttribute('data-app-data') || '{}');
                                if (appData && appData['csrf-token']) {
                                    h['X-Csrf-Token'] = appData['csrf-token'];
                                }
                                if (appData && appData.userId && typeof body === 'string' && !body.includes('user_id=')) {
                                    body = (body ? body + '&' : '') + 'user_id=' + encodeURIComponent(appData.userId);
                                }
                            }
                        } catch (_) {}

                        init.headers = h;
                        if (body) {
                            init.body = body;
                        }
                        const res = await fetch(request.url, init);
                        const text = await res.text();
                        sendResponse({ success: true, status: res.status, text, ok: res.ok });
                    } catch (err) {
                        sendResponse({ success: false, error: err.message });
                    }
                })();
                return true;
            }
            if (request.action === 'FOXEN_PARSE_ACTIVE_PROFILE') {
                try {
                    let userId = null;
                    let username = '';
                    let avatarUrl = '';
                    let bannerUrl = '';
                    let registeredAt = '';

                    // 1. Ссылка на профиль в шапке FunPay
                    const userLink = document.querySelector('.user-link-dropdown[href*="/users/"], .navbar-right a[href*="/users/"], a.user-link[href*="/users/"]');
                    if (userLink) {
                        const href = userLink.getAttribute('href') || '';
                        const m = href.match(/\/users\/(\d+)/);
                        if (m) userId = m[1];
                    }

                    // 2. data-app-data на body
                    try {
                        const raw = document.body?.dataset?.appData;
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            const d = Array.isArray(parsed) ? parsed[0] : parsed;
                            if (!userId && d?.userId) userId = String(d.userId);
                            if (d?.userName || d?.username) username = d.userName || d.username;
                            if (d?.avatar) avatarUrl = d.avatar;
                        }
                    } catch (_) {}

                    // 3. Никнейм из шапки
                    if (!username) {
                        const nameEl = document.querySelector('.user-link-name, .navbar-right .user-link-name, a.user-link-dropdown .user-link-name, .media-user-name');
                        if (nameEl && nameEl.textContent.trim()) username = nameEl.textContent.trim();
                    }

                    // 4. Аватарка из шапки или страницы
                    if (!avatarUrl) {
                        const avEl = document.querySelector('.user-link-dropdown .avatar-photo, .navbar-right .avatar-photo, .avatar-photo');
                        if (avEl) {
                            const bg = avEl.style?.backgroundImage || window.getComputedStyle(avEl).backgroundImage;
                            if (bg && bg !== 'none') {
                                const m = bg.match(/url\(["']?([^"']+)["']?\)/);
                                if (m) avatarUrl = m[1];
                            }
                            if (!avatarUrl && avEl.getAttribute('src')) avatarUrl = avEl.getAttribute('src');
                        }
                    }

                    // 5. Баннер (если открыта страница профиля)
                    const bannerAttr = document.querySelector('[data-fxn-banner]')?.getAttribute('data-fxn-banner');
                    if (bannerAttr) {
                        bannerUrl = bannerAttr;
                    } else {
                        const coverEl = document.querySelector('.fxn-cover-pic, .profile-cover-img');
                        if (coverEl) {
                            const coverBg = coverEl.style?.backgroundImage || window.getComputedStyle(coverEl).backgroundImage;
                            const cMatch = coverBg?.match(/url\(["']?([^"']+)["']?\)/);
                            if (cMatch) bannerUrl = cMatch[1];
                        }
                    }

                    // 6. Дата регистрации (если на странице профиля)
                    const regMatch = document.body?.textContent?.match(/(?:На сайте с|Зарегистрирован(?:а)?)\s+([0-9]+\s+[а-яА-Яa-zA-Z]+\s+[0-9]{4})/i);
                    if (regMatch) registeredAt = regMatch[1];

                    if (!userId) {
                        sendResponse({ ok: false, error: 'Пользователь не авторизован во вкладке FunPay' });
                    } else {
                        sendResponse({
                            ok: true,
                            profile: {
                                userId: String(userId),
                                username: String(username || `User #${userId}`),
                                avatarUrl: avatarUrl || '',
                                bannerUrl: bannerUrl || '',
                                registeredAt: registeredAt || '',
                                url: window.location.href
                            }
                        });
                    }
                } catch(e) {
                    sendResponse({ ok: false, error: e.message });
                }
                return true;
            }
            if (request.action === 'foxenCheckRestoreLots') {
                setTimeout(checkAndRestoreLots, 5000);
                return true;
            }
            if (request.action === 'updateAnnouncementsBadge') {
                updateAnnouncementsBadgeUI(request.unreadCount);
                return true;
            }
            if (request.action === 'announcementsUpdated') {
                const announcementsArea = document.getElementById('announcements-content-area');
                if (announcementsArea && document.querySelector('.foxen-page-content[data-page="announcements"]').classList.contains('active')) {
                    const displayAnnouncements = (announcements) => {
                        if (!announcementsArea) return;
                        if (!announcements || announcements.length === 0) {
                            announcementsArea.innerHTML = '<p class="announcement-empty">Пока нет никаких объявлений.</p>';
                            return;
                        }
                        announcementsArea.innerHTML = announcements.map(a => {
                            const date = new Date(a.id).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                            const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(a.title) : a.title;
                            const safeContent = typeof escapeHtml === 'function' ? escapeHtml(a.content).replace(/\n/g, '<br>') : String(a.content || '').replace(/\n/g, '<br>');
                            return `
                                <div class="announcement-item">
                                    <div class="announcement-item-header">
                                        <h4>${safeTitle}</h4>
                                        <span class="announcement-date">${date}</span>
                                    </div>
                                    <p>${safeContent}</p>
                                </div>
                            `;
                        }).join('');
                    };
                    displayAnnouncements(request.announcements);
                }
                return true;
            }
        });
    }

    // ── 2.9: Unconfirmed balance display ─────────────────────────────────────
    function initializeUnconfirmedBalanceDisplay() {
        chrome.storage.local.get('foxenShowUnconfirmed', ({ foxenShowUnconfirmed }) => {
            if (foxenShowUnconfirmed === false) return;

            async function updateUnconfirmedBadge() {
                const balanceEl = document.querySelector('.user-balance-sum, .navbar-balance');
                if (!balanceEl || document.getElementById('fp-unconfirmed-badge')) return;

                try {
                    const res = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getUnconfirmedBalance' });
                    if (!res?.success || !res.data?.total) return;

                    const { total, count } = res.data;
                    if (!count) return;

                    const badge = document.createElement('span');
                    badge.id = 'fp-unconfirmed-badge';
                    badge.title = `${count} неподтверждённых заказа(ов) на сумму ${total} ₽`;
                    badge.style.cssText = `
                        font-size:11px;color:#ff9800;cursor:default;margin-left:4px;
                        font-family:Inter,sans-serif;
                    `;
                    badge.textContent = `(+${total} ₽ ожид.)`;
                    balanceEl.parentElement?.appendChild(badge);
                } catch (e) {}
            }

            setTimeout(updateUnconfirmedBadge, 3000);
        });
    }

    // ── 2.9: Sales period filter ──────────────────────────────────────────────
    function initializeSalesFilters() {
        const salesSection = document.querySelector('.sales-statistics, #foxen-sales-block');
        if (!salesSection) return;
        if (document.getElementById('fp-sales-filter-bar')) return;

        const filterBar = document.createElement('div');
        filterBar.id = 'fp-sales-filter-bar';
        filterBar.style.cssText = `
            display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;
        `;

        const periods = [
            { label: 'Сегодня',    days: 1   },
            { label: 'Неделя',     days: 7   },
            { label: 'Месяц',      days: 30  },
            { label: '3 месяца',   days: 90  },
            { label: 'Всё время',  days: 9999 }
        ];

        periods.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-default';
            btn.style.cssText = 'padding:4px 10px;font-size:11px;font-weight:600;';
            btn.textContent = p.label;
            if (i === 2) { // Default: month
                btn.style.background = '#2A1830';
                btn.style.color = '#E9A8FF';
                btn.style.borderColor = '#363a5a';
            }
            btn.addEventListener('click', () => {
                filterBar.querySelectorAll('button').forEach(b => {
                    b.style.background = '';
                    b.style.color = '';
                    b.style.borderColor = '';
                });
                btn.style.background = '#2A1830';
                btn.style.color = '#E9A8FF';
                btn.style.borderColor = '#363a5a';
                applySalesPeriodFilter(p.days);
            });
            filterBar.appendChild(btn);
        });

        salesSection.insertBefore(filterBar, salesSection.firstChild);
    }

    function applySalesPeriodFilter(days) {
        (async () => {
            const foxenSalesData = await FPTSalesDB.getAllAsArray();
            if (!foxenSalesData.length) return;
            const cutoff = days >= 9999 ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;
            const filtered = foxenSalesData.filter(o => o.orderDate >= cutoff);
            const total = filtered.reduce((s, o) => s + (o.price || 0), 0);
            const countEl = document.getElementById('fp-sales-count');
            const totalEl = document.getElementById('fp-sales-total');
            if (countEl) countEl.textContent = filtered.length;
            if (totalEl) totalEl.textContent = `${Math.round(total).toLocaleString('ru-RU')} ₽`;
        })();
    }

    // ── 2.9: Reset buttons in settings_io page ────────────────────────────────
    // Helper: visually confirm a reset button action
    function _resetBtnFeedback(btn, successText) {
        if (!btn) return;
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ Сброс...';
        setTimeout(() => {
            btn.textContent = '✅ ' + successText;
            btn.style.color = '#4caf82';
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.color = '';
                btn.disabled = false;
            }, 2000);
        }, 400);
    }

    function initializeResetButtons() {
        const arBtn = document.getElementById('fp-reset-autoresponder-btn');
        arBtn?.addEventListener('click', async () => {
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.remove(['foxenAutoResponderTag']);
            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            foxenAutoReplies.processedMessageIds = [];
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
            _resetBtnFeedback(arBtn, 'Сброшено');
        });

        const pinBtn = document.getElementById('fp-reset-pinned-btn');
        pinBtn?.addEventListener('click', async () => {
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.remove('foxenPinnedLots');
            _resetBtnFeedback(pinBtn, 'Очищено');
        });

        const greetBtn = document.getElementById('fp-reset-greeted-btn');
        greetBtn?.addEventListener('click', async () => {
            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            foxenAutoReplies.greetedUsers = [];
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
            _resetBtnFeedback(greetBtn, 'Сброшено');
        });

        // 3.0: Reset April Fools date counter
        const aprBtn = document.getElementById('fp-reset-april-btn');
        aprBtn?.addEventListener('click', async () => {
            const year = new Date().getFullYear();
            try { localStorage.removeItem(`fpApril_${year}_done`); } catch(e) {}
            try { localStorage.removeItem(`fpApril_${year - 1}_done`); } catch(e) {}
            try { sessionStorage.removeItem('fpAprilReloads'); } catch(e) {}
            try { sessionStorage.removeItem('fpAprilActive'); } catch(e) {}
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.remove([
                `fpApril_${year}_done`,
                `fpApril_${year - 1}_done`,
                `fpApril_${year + 1}_done`,
                'fpAprilReloads',
                'fpAprilActive',
            ]);
            _resetBtnFeedback(aprBtn, 'Сброшено');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFpTools);
    } else {
        initializeFpTools();
    }
    
})();