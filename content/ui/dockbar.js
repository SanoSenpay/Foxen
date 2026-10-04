// content/ui/dockbar.js
// Modern Apple macOS / 21st.dev style Floating Dockbar for Foxen

(function() {
    'use strict';

    const STORAGE_KEY_ACTIVE = 'foxenDockbarActive';
    const STORAGE_KEY_SECTIONS = 'foxenDockbarSections';
    const STORAGE_KEY_POS = 'foxenDockbarPos';

    // Catalog of all available Foxen sections
    const DOCK_SECTIONS_REGISTRY = [
        // 1. Главная & Настройки
        { id: 'general', name: 'Общие настройки', default: true, icon: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
        { id: 'accounts', name: 'Мульти-аккаунты', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
        { id: 'settings_io', name: 'Импорт / Экспорт', default: false, icon: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>` },
        { id: 'needs', name: 'Мастер настройки', default: false, icon: `<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>` },

        // 2. Торговля & Лоты
        { id: 'lot_io', name: 'Управление лотами', default: true, icon: `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>` },
        { id: 'autobump', name: 'Авто-поднятие', default: true, icon: `<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
        { id: 'auto_delivery', name: 'Авто-выдача', default: true, icon: `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },

        // 3. Чат & Клиенты
        { id: 'auto_review', name: 'Авто-ответчик & Отзывы', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
        { id: 'templates', name: 'Шаблоны ответов', default: true, icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>` },
        { id: 'slash_commands', name: 'Слэш-команды', default: false, icon: `<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>` },
        { id: 'blacklist', name: 'Чёрный список', default: false, icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>` },

        // 4. Финансы & Расчёты
        { id: 'calculator', name: 'Калькулятор комиссий', default: true, icon: `<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>` },
        { id: 'currency_calc', name: 'Курсы валют', default: false, icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>` },
        { id: 'piggy_banks', name: 'Копилки целей', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.5-1 2-2.5V8.5C20 6.5 20.5 5 19 5z"/><circle cx="8" cy="10" r="1"/></svg>` },
        { id: 'notes', name: 'Личные заметки', default: true, icon: `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>` },

        // 5. Интеграции & ИИ
        { id: 'telegram', name: 'Telegram-бот', default: false, icon: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>` },
        { id: 'ai_settings', name: 'Нейросеть (ИИ)', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>` },
        { id: 'tickets', name: 'Тикеты FunPay', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>` },

        // 6. Кастомизация & Стиль
        { id: 'theme', name: 'Внешний вид', default: true, icon: `<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>` },
        { id: 'theme_gallery', name: 'Каталог тем', default: false, icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
        { id: 'effects', name: 'Эффекты & Курсор', default: false, icon: `<svg viewBox="0 0 24 24"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg>` },

        // 7. Справка & О проекте
        { id: 'overview', name: 'Обучение & Тур', default: false, icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>` },
        { id: 'support', name: 'Поддержка проекта', default: false, icon: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` }
    ];

    let dockContainer = null;
    let isDragging = false;
    let currentOrientation = 'horizontal';
    let currentSide = 'bottom';
    let enabledSections = [];

    // Helper: get storage instance
    function getStorage() {
        return typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    }

    // Initialize or load enabled sections and position
    async function loadConfig() {
        const data = await getStorage().get([STORAGE_KEY_ACTIVE, STORAGE_KEY_SECTIONS, STORAGE_KEY_POS]);
        const active = !!data[STORAGE_KEY_ACTIVE];

        if (Array.isArray(data[STORAGE_KEY_SECTIONS]) && data[STORAGE_KEY_SECTIONS].length > 0) {
            enabledSections = data[STORAGE_KEY_SECTIONS];
        } else {
            enabledSections = DOCK_SECTIONS_REGISTRY.filter(s => s.default).map(s => s.id);
        }

        const savedPos = data[STORAGE_KEY_POS] || null;
        return { active, savedPos };
    }

    // Save enabled sections
    async function saveSections(sections) {
        enabledSections = sections;
        await getStorage().set({ [STORAGE_KEY_SECTIONS]: sections });
        renderDockItems();
    }

    // Save position & orientation state
    function savePosition(posData) {
        getStorage().set({
            [STORAGE_KEY_POS]: posData
        });
    }

    // Toggle Dockbar visibility & navbar button visibility
    window.fxnEnableDockbar = async function(enable, showToast = true) {
        const storage = getStorage();
        await storage.set({ [STORAGE_KEY_ACTIVE]: !!enable });

        if (enable) {
            document.documentElement.classList.add('fxn-dockbar-active');
            ensureDockbar();
            if (dockContainer) {
                dockContainer.style.display = 'flex';
                const { savedPos } = await loadConfig();
                applyPosition(savedPos);
                updateActiveIndicators();
            }
            if (showToast && typeof showNotification === 'function') {
                showNotification('Включён режим Dockbar. Кнопка FOXEN скрыта из меню.', false);
            }
        } else {
            document.documentElement.classList.remove('fxn-dockbar-active');
            if (dockContainer) dockContainer.style.display = 'none';
            // Show standard navbar button
            const navBtn = document.getElementById('foxenButton');
            if (navBtn) {
                const li = navBtn.closest('li');
                if (li) li.style.removeProperty('display');
            }
            if (showToast && typeof showNotification === 'function') {
                showNotification('Обычный вид восстановлен (кнопка FOXEN возвращена в меню).', false);
            }
        }
    };

    // Ensure DOM elements for dockbar
    function ensureDockbar() {
        if (dockContainer && document.body.contains(dockContainer)) return dockContainer;

        dockContainer = document.createElement('div');
        dockContainer.id = 'fxnDockbar';
        dockContainer.className = 'fxn-dock-container fxn-dock-horizontal fxn-dock-bottom';

        dockContainer.innerHTML = `
            <div class="fxn-dock-handle" title="Зажмите палочку и перетащите Докбар к краю экрана">
                <span class="fxn-dock-handle-bar"></span>
            </div>
            <div class="fxn-dock-shell">
                <div class="fxn-dock-items" id="fxnDockItems"></div>
                <div class="fxn-dock-separator"></div>
                <!-- Action: Customize Sections -->
                <button type="button" class="fxn-dock-item fxn-dock-btn-action" id="fxnDockSettingsBtn" aria-label="Настроить разделы">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span class="fxn-dock-tooltip">Настроить разделы</span>
                </button>
                <!-- Action: Return to regular navbar button -->
                <button type="button" class="fxn-dock-item fxn-dock-btn-action fxn-dock-btn-return" id="fxnDockReturnBtn" aria-label="Вернуть в меню">
                    <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span class="fxn-dock-tooltip">Вернуть кнопку в меню</span>
                </button>
            </div>
            <!-- Popover for Section Selection (Centered over stick) -->
            <div class="fxn-dock-popover" id="fxnDockPickerPopover" style="display: none;">
                <div class="fxn-dock-popover-head">
                    <span class="fxn-dock-popover-title">Разделы Докбара</span>
                    <button type="button" class="fxn-dock-popover-close" id="fxnDockPickerClose">&times;</button>
                </div>
                <div class="fxn-dock-popover-list" id="fxnDockPickerList"></div>
            </div>
        `;

        document.body.appendChild(dockContainer);

        setupDragging();
        setupMagnification();
        setupActions();
        renderDockItems();
        setupPopupSync();

        return dockContainer;
    }

    // Render items inside the dock based on user's selection
    function renderDockItems() {
        const itemsWrap = document.getElementById('fxnDockItems');
        if (!itemsWrap) return;

        itemsWrap.innerHTML = '';

        enabledSections.forEach(sectionId => {
            const reg = DOCK_SECTIONS_REGISTRY.find(r => r.id === sectionId);
            if (!reg) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fxn-dock-item';
            btn.dataset.section = reg.id;
            btn.setAttribute('aria-label', reg.name);
            btn.innerHTML = `
                ${reg.icon}
                <span class="fxn-dock-tooltip">${reg.name}</span>
            `;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSectionPicker();

                // Open Foxen popup directly to this section
                let popup = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
                if (!popup && typeof window.__fpEnsurePopup === 'function') {
                    popup = window.__fpEnsurePopup();
                }
                if (popup) {
                    popup.classList.add('active');
                    if (typeof window.switchFoxenPanel === 'function') {
                        window.switchFoxenPanel(reg.id);
                    }
                    updateActiveIndicators();
                }
            });

            itemsWrap.appendChild(btn);
        });

        updateActiveIndicators();
    }

    // Highlight current active tab in dockbar ONLY when Foxen popup is actually open
    function updateActiveIndicators() {
        if (!dockContainer) return;
        const popup = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
        const isPopupOpen = popup && popup.classList.contains('active') && getComputedStyle(popup).display !== 'none';

        if (!isPopupOpen) {
            dockContainer.querySelectorAll('.fxn-dock-item[data-section]').forEach(item => {
                item.classList.remove('active');
            });
            return;
        }

        const activePanel = popup.querySelector('.panel.active');
        const currentActive = activePanel ? (activePanel.id || activePanel.dataset.page) : null;

        dockContainer.querySelectorAll('.fxn-dock-item[data-section]').forEach(item => {
            item.classList.toggle('active', !!currentActive && item.dataset.section === currentActive);
        });
    }
    window.fxnSyncDockbarActive = updateActiveIndicators;

    // Observer to keep active indicators in sync with Foxen Popup open/close/tab changes
    function setupPopupSync() {
        let popupObserver = null;

        function hookPopup(popup) {
            if (!popup || popupObserver) return;
            popupObserver = new MutationObserver(() => {
                updateActiveIndicators();
            });
            popupObserver.observe(popup, {
                attributes: true,
                subtree: true,
                attributeFilter: ['class', 'style']
            });
        }

        const existing = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
        if (existing) {
            hookPopup(existing);
        }

        const docObserver = new MutationObserver(() => {
            const popup = document.querySelector('.foxen-popup') || document.getElementById('foxenMainPopup');
            if (popup) {
                hookPopup(popup);
            }
            updateActiveIndicators();
        });

        if (document.body) {
            docObserver.observe(document.body, { childList: true });
        }
    }

    // Setup Apple Dock Magnification effect
    function setupMagnification() {
        const shell = dockContainer.querySelector('.fxn-dock-shell');
        if (!shell) return;

        const maxDistance = 90;
        const maxScale = 1.32;

        shell.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            const items = shell.querySelectorAll('.fxn-dock-item');
            const isVert = currentOrientation === 'vertical';

            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const center = isVert ? (rect.top + rect.height / 2) : (rect.left + rect.width / 2);
                const mousePos = isVert ? e.clientY : e.clientX;
                const dist = Math.abs(mousePos - center);

                if (dist < maxDistance) {
                    const factor = Math.cos((dist / maxDistance) * (Math.PI / 2));
                    item.style.transform = `scale(${1 + (maxScale - 1) * factor})`;
                } else {
                    item.style.transform = 'scale(1)';
                }
            });
        });

        shell.addEventListener('mouseleave', () => {
            const items = shell.querySelectorAll('.fxn-dock-item');
            items.forEach(item => {
                item.style.transform = '';
            });
        });
    }

    // Apply orientation and exact side classes
    function applyOrientation(orientation, side) {
        currentOrientation = orientation;
        currentSide = side;

        dockContainer.classList.remove(
            'fxn-dock-vertical',
            'fxn-dock-horizontal',
            'fxn-dock-bottom',
            'fxn-dock-top',
            'fxn-dock-left',
            'fxn-dock-right',
            'dock-at-right',
            'dock-at-left'
        );

        dockContainer.classList.add(
            orientation === 'vertical' ? 'fxn-dock-vertical' : 'fxn-dock-horizontal',
            `fxn-dock-${side}`
        );
    }

    // Setup Drag and Drop with Clean Edge Snapping & Smooth Fluid Motion
    function setupDragging() {
        const handle = dockContainer.querySelector('.fxn-dock-handle');
        if (!handle) return;

        let animFrameId = null;
        let lastEvent = null;

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            dockContainer.classList.add('is-dragging');
            dockContainer.style.transform = 'none';

            closeSectionPicker();
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !dockContainer) return;
            lastEvent = e;
            if (!animFrameId) {
                animFrameId = requestAnimationFrame(handleDragMove);
            }
        });

        function handleDragMove() {
            animFrameId = null;
            if (!isDragging || !dockContainer || !lastEvent) return;
            const e = lastEvent;

            // Distances from screen edges to mouse
            const distRight = window.innerWidth - e.clientX;
            const distLeft = e.clientX;
            const distBottom = window.innerHeight - e.clientY;
            const distTop = e.clientY;

            let nextOrientation = currentOrientation;
            let nextSide = currentSide;

            // Smart Edge Snapping with Hysteresis:
            // Switch to vertical only when brought close to left/right edge (< 70px)
            // And not inside top/bottom edge zones (> 80px)
            if (currentOrientation === 'horizontal') {
                if (distRight < 70 && distTop > 80 && distBottom > 80) {
                    nextOrientation = 'vertical';
                    nextSide = 'right';
                } else if (distLeft < 70 && distTop > 80 && distBottom > 80) {
                    nextOrientation = 'vertical';
                    nextSide = 'left';
                } else {
                    nextOrientation = 'horizontal';
                    nextSide = distTop < 80 ? 'top' : 'bottom';
                }
            } else {
                // Currently vertical: require moving well inward (> 130px) to revert to horizontal
                if (currentSide === 'right') {
                    if (distRight > 130 || distTop < 80 || distBottom < 80) {
                        nextOrientation = 'horizontal';
                        nextSide = distTop < distBottom ? 'top' : 'bottom';
                    }
                } else if (currentSide === 'left') {
                    if (distLeft > 130 || distTop < 80 || distBottom < 80) {
                        nextOrientation = 'horizontal';
                        nextSide = distTop < distBottom ? 'top' : 'bottom';
                    }
                }
            }

            if (nextOrientation !== currentOrientation || nextSide !== currentSide) {
                applyOrientation(nextOrientation, nextSide);
            }

            // Flush edge docking with cursor tracking along the edge
            if (nextSide === 'right') {
                const h = dockContainer.offsetHeight || 300;
                let top = e.clientY - h / 2;
                top = Math.max(10, Math.min(top, window.innerHeight - h - 10));

                dockContainer.style.right = '8px';
                dockContainer.style.left = 'auto';
                dockContainer.style.top = `${top}px`;
                dockContainer.style.bottom = 'auto';
            } else if (nextSide === 'left') {
                const h = dockContainer.offsetHeight || 300;
                let top = e.clientY - h / 2;
                top = Math.max(10, Math.min(top, window.innerHeight - h - 10));

                dockContainer.style.left = '8px';
                dockContainer.style.right = 'auto';
                dockContainer.style.top = `${top}px`;
                dockContainer.style.bottom = 'auto';
            } else if (nextSide === 'top') {
                const w = dockContainer.offsetWidth || 400;
                let left = e.clientX - w / 2;
                left = Math.max(10, Math.min(left, window.innerWidth - w - 10));

                dockContainer.style.top = '10px';
                dockContainer.style.bottom = 'auto';
                dockContainer.style.left = `${left}px`;
                dockContainer.style.right = 'auto';
            } else { // bottom
                const w = dockContainer.offsetWidth || 400;
                let left = e.clientX - w / 2;
                left = Math.max(10, Math.min(left, window.innerWidth - w - 10));

                dockContainer.style.bottom = '12px';
                dockContainer.style.top = 'auto';
                dockContainer.style.left = `${left}px`;
                dockContainer.style.right = 'auto';
            }
        }

        window.addEventListener('mouseup', () => {
            if (!isDragging || !dockContainer) return;
            isDragging = false;
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
            dockContainer.classList.remove('is-dragging');

            let savedData = {
                orientation: currentOrientation,
                side: currentSide
            };

            if (currentSide === 'left' || currentSide === 'right') {
                savedData.y = parseFloat(dockContainer.style.top) || 10;
            } else {
                savedData.x = parseFloat(dockContainer.style.left) || 10;
            }

            savePosition(savedData);
        });

        // Responsive boundary check on window resize
        window.addEventListener('resize', () => {
            if (!dockContainer || isDragging) return;
            const dockW = dockContainer.offsetWidth;
            const dockH = dockContainer.offsetHeight;

            if (currentSide === 'right' || currentSide === 'left') {
                let top = parseFloat(dockContainer.style.top) || 10;
                top = Math.max(10, Math.min(top, window.innerHeight - dockH - 10));
                dockContainer.style.top = `${top}px`;
            } else {
                let left = parseFloat(dockContainer.style.left) || 10;
                left = Math.max(10, Math.min(left, window.innerWidth - dockW - 10));
                dockContainer.style.left = `${left}px`;
            }
        });
    }

    // Position the dockbar at default or saved position
    function applyPosition(savedPos) {
        if (!dockContainer) return;

        const side = (savedPos && savedPos.side) || 'bottom';
        const orientation = (savedPos && savedPos.orientation) || (side === 'left' || side === 'right' ? 'vertical' : 'horizontal');

        applyOrientation(orientation, side);
        dockContainer.style.transform = 'none';

        const dockW = dockContainer.offsetWidth || 400;
        const dockH = dockContainer.offsetHeight || 300;

        if (side === 'right') {
            dockContainer.style.right = '8px';
            dockContainer.style.left = 'auto';
            dockContainer.style.bottom = 'auto';

            let top = (savedPos && typeof savedPos.y === 'number') ? savedPos.y : ((window.innerHeight - dockH) / 2);
            top = Math.max(10, Math.min(top, window.innerHeight - dockH - 10));
            dockContainer.style.top = `${top}px`;
        } else if (side === 'left') {
            dockContainer.style.left = '8px';
            dockContainer.style.right = 'auto';
            dockContainer.style.bottom = 'auto';

            let top = (savedPos && typeof savedPos.y === 'number') ? savedPos.y : ((window.innerHeight - dockH) / 2);
            top = Math.max(10, Math.min(top, window.innerHeight - dockH - 10));
            dockContainer.style.top = `${top}px`;
        } else if (side === 'top') {
            dockContainer.style.top = '10px';
            dockContainer.style.bottom = 'auto';
            dockContainer.style.right = 'auto';

            let left = (savedPos && typeof savedPos.x === 'number') ? savedPos.x : ((window.innerWidth - dockW) / 2);
            left = Math.max(10, Math.min(left, window.innerWidth - dockW - 10));
            dockContainer.style.left = `${left}px`;
        } else { // bottom
            dockContainer.style.bottom = '12px';
            dockContainer.style.top = 'auto';
            dockContainer.style.right = 'auto';

            let left = (savedPos && typeof savedPos.x === 'number') ? savedPos.x : ((window.innerWidth - dockW) / 2);
            left = Math.max(10, Math.min(left, window.innerWidth - dockW - 10));
            dockContainer.style.left = `${left}px`;
        }
    }

    // Setup action buttons (Settings and Return to navbar)
    function setupActions() {
        const returnBtn = dockContainer.querySelector('#fxnDockReturnBtn');
        if (returnBtn) {
            returnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.fxnEnableDockbar(false);
            });
        }

        const settingsBtn = dockContainer.querySelector('#fxnDockSettingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSectionPicker();
            });
        }

        const closePickerBtn = dockContainer.querySelector('#fxnDockPickerClose');
        if (closePickerBtn) {
            closePickerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSectionPicker();
            });
        }

        // Close popover on outside click
        document.addEventListener('click', (e) => {
            if (dockContainer && !dockContainer.contains(e.target)) {
                closeSectionPicker();
            }
        });
    }

    // Popover section selection
    function toggleSectionPicker() {
        const popover = document.getElementById('fxnDockPickerPopover');
        if (!popover) return;

        if (popover.style.display === 'none' || !popover.style.display) {
            renderSectionPickerList();
            popover.style.display = 'flex';
        } else {
            popover.style.display = 'none';
        }
    }

    function closeSectionPicker() {
        const popover = document.getElementById('fxnDockPickerPopover');
        if (popover) popover.style.display = 'none';
    }

    function renderSectionPickerList() {
        const listWrap = document.getElementById('fxnDockPickerList');
        if (!listWrap) return;

        listWrap.innerHTML = '';

        DOCK_SECTIONS_REGISTRY.forEach(sec => {
            const isSelected = enabledSections.includes(sec.id);
            const row = document.createElement('div');
            row.className = `fxn-dock-popover-item ${isSelected ? 'selected' : ''}`;
            row.innerHTML = `
                <div class="fxn-dock-popover-label">
                    <span class="fxn-dock-popover-icon">${sec.icon}</span>
                    <span>${sec.name}</span>
                </div>
                <div class="fxn-dock-checkbox"></div>
            `;

            row.addEventListener('click', (e) => {
                e.stopPropagation();
                let updated = [...enabledSections];
                if (updated.includes(sec.id)) {
                    if (updated.length <= 1) {
                        if (typeof showNotification === 'function') showNotification('Минимум один раздел должен остаться', true);
                        return;
                    }
                    updated = updated.filter(id => id !== sec.id);
                } else {
                    updated.push(sec.id);
                }
                saveSections(updated);
                row.classList.toggle('selected', updated.includes(sec.id));
            });

            listWrap.appendChild(row);
        });
    }

    // Master Bootstrapping
    async function initDockbar() {
        const { active, savedPos } = await loadConfig();

        if (active) {
            document.documentElement.classList.add('fxn-dockbar-active');
            ensureDockbar();
            applyPosition(savedPos);
        }

        setupPopupSync();
    }

    // Run when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDockbar);
    } else {
        initDockbar();
    }

})();
