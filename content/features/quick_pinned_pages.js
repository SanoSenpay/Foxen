// content/features/quick_pinned_pages.js
// =============================================================================
// Foxen Quick Pinned Pages (Spotlight Launcher)
// Minimalist Apple macOS Command Palette for fast navigation across FunPay
// Synchronized with Foxen themes (Dark, Light, Transparent)
// Supports custom hotkey re-binding and full FunPay games & categories catalog
// =============================================================================

(function () {
    'use strict';

    const STORAGE_PAGES_KEY = 'foxen_pinned_pages';
    const STORAGE_CATALOG_KEY = 'foxen_games_catalog';
    const STORAGE_CATALOG_TIME = 'foxen_games_catalog_time';
    const STORAGE_HOTKEY_KEY = 'foxen_quick_pages_shortcut';

    // 24 hours catalog cache validity
    const CATALOG_CACHE_TTL = 24 * 60 * 60 * 1000;

    // Default Shortcut: Alt + Q
    const DEFAULT_SHORTCUT = {
        code: 'KeyQ',
        key: 'q',
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
        metaKey: false,
        label: 'Alt + Q'
    };

    // SVG Icons (Clean Apple-style vector icons with FILLED pin)
    const ICONS = {
        search: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 4 4"/></svg>`,
        // Filled Pushpin (Material/Apple style)
        pinFilled: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1.03 1 1.03-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>`,
        refresh: `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v5h5m13 7v-5h-5"/><path d="M17.49 8A8 8 0 0 0 4.56 5.56L1 9m18 2-3.56 3.44A8 8 0 0 1 2.51 12"/></svg>`,
        keyboard: `<svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><path fill-rule="evenodd" d="M3 5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H3zm1 3a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75h-1A.75.75 0 0 1 4 8.5V8zm3.5-.75a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75h1a.75.75 0 0 0 .75-.75V8a.75.75 0 0 0-.75-.75h-1zm2.75.75a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1-.75-.75V8zm3.5-.75a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75h1a.75.75 0 0 0 .75-.75V8a.75.75 0 0 0-.75-.75h-1zm-9.75 3.5a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1-.75-.75v-.5zm3.5-.75a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75h5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-5zm6.75.75a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1-.75-.75v-.5z" clip-rule="evenodd"/></svg>`,
        chat: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 2C5.58 2 2 5.25 2 9.25c0 2.22 1.13 4.2 2.89 5.51-.12.82-.49 2.07-1.42 3.01a.5.5 0 0 0 .4.85c1.9 0 3.53-.94 4.41-1.63.56.17 1.14.26 1.72.26 4.42 0 8-3.25 8-7.25S14.42 2 10 2zm-3.5 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm3.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm3.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>`,
        orders: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M3.5 4A1.5 1.5 0 0 0 2 5.5v9A1.5 1.5 0 0 0 3.5 16h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 16.5 4h-13zM6 6.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 6.5zm0 3.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 10zm0 3.5a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75z"/></svg>`,
        buyer: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M4.5 3a.75.75 0 0 0 0 1.5h1.16l1.7 7.42A2 2 0 0 0 9.31 13.5h6.4a2 2 0 0 0 1.95-1.58l1.2-5.4A.75.75 0 0 0 18.13 5.5H6.38L6.03 4a1.5 1.5 0 0 0-1.47-1H4.5zm4.75 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm6.5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z"/></svg>`,
        finance: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M2.5 4A1.5 1.5 0 0 0 1 5.5v9A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 4h-15zM2.5 7h15v7.5h-15V7zm10.5 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z"/></svg>`,
        market: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v1.25a.75.75 0 0 0 .22.53L3 8.06V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.06l1.78-1.78a.75.75 0 0 0 .22-.53V4.5A1.5 1.5 0 0 0 17.5 3h-15zm2 5.5h11V15.5h-11V8.5zm3.5 2a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5a.75.75 0 0 0-.75-.75zm4 0a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5a.75.75 0 0 0-.75-.75z"/></svg>`,
        settings: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473a5.52 5.52 0 0 1 1.256.52l1.32-.763a1 1 0 0 1 1.248.243l.962.962a1 1 0 0 1 .243 1.248l-.763 1.32c.214.398.39.82.52 1.256l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a5.52 5.52 0 0 1-.52 1.256l.763 1.32a1 1 0 0 1-.243 1.248l-.962.962a1 1 0 0 1-1.248.243l-1.32-.763a5.52 5.52 0 0 1-1.256.52l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a5.52 5.52 0 0 1-1.256-.52l-1.32.763a1 1 0 0 1-1.248-.243l-.962-.962a1 1 0 0 1-.243-1.248l.763-1.32a5.52 5.52 0 0 1-.52-1.256l-1.473-.295A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295a5.52 5.52 0 0 1 .52-1.256l-.763-1.32a1 1 0 0 1 .243-1.248l.962-.962a1 1 0 0 1 1.248-.243l1.32.763c.398-.214.82-.39 1.256-.52l.295-1.473zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clip-rule="evenodd"/></svg>`,
        support: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a5 5 0 0 0-4.78 6.54l-1.44 1.44a.75.75 0 0 0 .53 1.28H7.5a.75.75 0 0 0 .75-.75V11.3a.75.75 0 0 0-1.28-.53l-.86.86A3.5 3.5 0 1 1 13.5 10a3.48 3.48 0 0 1-.78 2.19.75.75 0 1 0 1.16.96A4.98 4.98 0 0 0 15 10a5 5 0 0 0-5-5z" clip-rule="evenodd"/></svg>`,
        profile: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-6 13a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1z" clip-rule="evenodd"/></svg>`,
        notifications: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zM10 18a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 10 18z"/></svg>`,
        custom: `<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M5 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14l-5-2.5L5 18V4z"/></svg>`,
        trash: `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h14m-2 0v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-6 5v4m4-4v4"/></svg>`,
        arrowRight: `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10m-4-4 4 4-4 4"/></svg>`,
        external: `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6m3-2h5v5m0-5L9 11"/></svg>`,
        close: `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m5 5 10 10M5 15 15 5"/></svg>`
    };

    // Helper: Dynamic category gradient
    function getCategoryGradient(name) {
        const gradients = [
            'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
            'linear-gradient(135deg, #10b981, #047857)', // Emerald
            'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Violet
            'linear-gradient(135deg, #f59e0b, #b45309)', // Amber
            'linear-gradient(135deg, #ec4899, #be185d)', // Pink
            'linear-gradient(135deg, #06b6d4, #0e7490)', // Cyan
            'linear-gradient(135deg, #f97316, #c2410c)', // Orange
            'linear-gradient(135deg, #a855f7, #7e22ce)', // Purple
            'linear-gradient(135deg, #14b8a6, #0f766e)'  // Teal
        ];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i);
            hash |= 0;
        }
        const idx = Math.abs(hash) % gradients.length;
        return gradients[idx];
    }

    // Helper: Dynamic profile URL
    function getUserProfileUrl() {
        try {
            const userLink = document.querySelector('.user-link-dropdown[href*="/users/"]') ||
                             document.querySelector('a.user-link[href*="/users/"]') ||
                             document.querySelector('.navbar a[href*="/users/"]') ||
                             document.querySelector('a[href*="/users/"]');
            if (userLink) {
                const href = userLink.getAttribute('href');
                if (href && href.startsWith('/users/')) return href;
            }
        } catch (_) {}
        return '/users/';
    }

    // Default Pinned Pages
    function getDefaultPages() {
        return [
            {
                id: 'chat',
                title: 'Сообщения',
                desc: '/chat/',
                url: '/chat/',
                icon: 'chat',
                gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                pinned: true,
                isDefault: true
            },
            {
                id: 'orders_trade',
                title: 'Мои заказы (Продажи)',
                desc: '/orders/trade',
                url: '/orders/trade',
                icon: 'orders',
                gradient: 'linear-gradient(135deg, #10b981, #059669)',
                pinned: true,
                isDefault: true
            },
            {
                id: 'orders_buyer',
                title: 'Мои покупки',
                desc: '/orders/buyer',
                url: '/orders/buyer',
                icon: 'buyer',
                gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
                pinned: true,
                isDefault: true
            },
            {
                id: 'finance',
                title: 'Финансы и баланс',
                desc: '/account/finance',
                url: '/account/finance',
                icon: 'finance',
                gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                pinned: true,
                isDefault: true
            },
            {
                id: 'market',
                title: 'Торговая площадка',
                desc: '/',
                url: '/',
                icon: 'market',
                gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                pinned: true,
                isDefault: true
            },
            {
                id: 'settings',
                title: 'Настройки аккаунта',
                desc: '/account/settings',
                url: '/account/settings',
                icon: 'settings',
                gradient: 'linear-gradient(135deg, #64748b, #475569)',
                pinned: true,
                isDefault: true
            }
        ];
    }

    // Suggested Quick Sections
    function getSuggestedPresets() {
        return [
            {
                id: 'profile',
                title: 'Мой профиль и лоты',
                desc: getUserProfileUrl(),
                url: getUserProfileUrl(),
                icon: 'profile',
                gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
                pinned: false,
                isDefault: true
            },
            {
                id: 'support',
                title: 'Служба поддержки FunPay',
                desc: 'support.funpay.com',
                url: 'https://support.funpay.com/',
                icon: 'support',
                gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
                pinned: false,
                isDefault: true,
                external: true
            },
            {
                id: 'notifications',
                title: 'Центр уведомлений',
                desc: '/account/notifications',
                url: '/account/notifications',
                icon: 'notifications',
                gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
                pinned: false,
                isDefault: true
            }
        ];
    }

    // Active Theme Detection (Dark, Light, Transparent)
    function getActiveTheme() {
        const root = document.documentElement;
        if (root) {
            const attr = root.getAttribute('data-fxn-popup-theme');
            if (attr === 'light' || attr === 'dark' || attr === 'transparent') return attr;
            if (root.classList.contains('fxn-popup-theme-light')) return 'light';
            if (root.classList.contains('fxn-popup-theme-transparent')) return 'transparent';
        }
        return 'dark';
    }

    class QuickPinnedPages {
        constructor() {
            this.dialog = null;
            this.searchInput = null;
            this.listContainer = null;
            this.pages = [];
            this.catalogGames = []; // Full catalog of all FunPay games and categories
            this.selectedIndex = 0;
            this.filteredItems = [];
            this.isOpen = false;
            this.shortcut = { ...DEFAULT_SHORTCUT };
            this.isRecordingShortcut = false;
            this.isSyncingCatalog = false;

            this.init();
        }

        async init() {
            try {
                this.bindGlobalShortcuts();
                await this.loadSettings();
                this.buildDialog();
                this.bindThemeListeners();

                console.log('[Foxen QuickPages] Initialized. Shortcut:', this.shortcut?.label || 'Alt + Q');

                // Background fetch games catalog if cache is empty
                if (!this.catalogGames.length) {
                    this.refreshCatalog(false);
                }
            } catch (err) {
                console.error('[Foxen QuickPages] Init error:', err);
            }
        }

        getStorage() {
            try {
                const api = typeof browser !== 'undefined' ? browser : chrome;
                return api?.storage?.local || null;
            } catch (_) {
                return null;
            }
        }

        async loadSettings() {
            return new Promise((resolve) => {
                const storage = this.getStorage();
                if (!storage) {
                    this.pages = getDefaultPages();
                    this.catalogGames = [];
                    this.shortcut = { ...DEFAULT_SHORTCUT };
                    resolve();
                    return;
                }
                storage.get([STORAGE_PAGES_KEY, STORAGE_CATALOG_KEY, STORAGE_CATALOG_TIME, STORAGE_HOTKEY_KEY], (res) => {
                    if (res && Array.isArray(res[STORAGE_PAGES_KEY]) && res[STORAGE_PAGES_KEY].length > 0) {
                        this.pages = res[STORAGE_PAGES_KEY];
                    } else {
                        this.pages = getDefaultPages();
                        this.savePages();
                    }

                    if (res && Array.isArray(res[STORAGE_CATALOG_KEY]) && res[STORAGE_CATALOG_KEY].length > 0) {
                        this.catalogGames = res[STORAGE_CATALOG_KEY];
                        const lastTime = res[STORAGE_CATALOG_TIME] || 0;
                        if (Date.now() - lastTime > CATALOG_CACHE_TTL) {
                            setTimeout(() => this.refreshCatalog(false), 2000);
                        }
                    } else {
                        this.catalogGames = [];
                    }

                    const savedShortcut = res ? res[STORAGE_HOTKEY_KEY] : null;
                    if (savedShortcut) {
                        // Migrate legacy Ctrl+Q or invalid shortcuts to Alt+Q
                        const isOldCtrlQ = savedShortcut.ctrlKey && !savedShortcut.altKey && 
                            (savedShortcut.code === 'KeyQ' || savedShortcut.key === 'q' || savedShortcut.label === 'Ctrl + Q');
                        if (isOldCtrlQ) {
                            this.shortcut = { ...DEFAULT_SHORTCUT };
                            this.saveShortcut();
                        } else if (savedShortcut.label) {
                            this.shortcut = savedShortcut;
                        } else {
                            this.shortcut = { ...DEFAULT_SHORTCUT };
                        }
                    } else {
                        this.shortcut = { ...DEFAULT_SHORTCUT };
                    }

                    resolve();
                });
            });
        }

        savePages() {
            const storage = this.getStorage();
            if (storage) {
                storage.set({ [STORAGE_PAGES_KEY]: this.pages });
            }
        }

        saveShortcut() {
            const storage = this.getStorage();
            if (storage) {
                storage.set({ [STORAGE_HOTKEY_KEY]: this.shortcut });
            }
        }

        // Parse entire FunPay games & categories catalog from HTML
        parseCatalogFromHTML(html) {
            if (!html) return [];
            const games = [];
            const blocks = html.split('class="promo-game-item"').slice(1);

            for (const b of blocks) {
                const titleMatch = b.match(/<div class="game-title"[^>]*><a href="([^"]+)">([^<]+)<\/a><\/div>/);
                if (titleMatch) {
                    let gameUrl = titleMatch[1];
                    try {
                        gameUrl = new URL(gameUrl, 'https://funpay.com/').pathname;
                    } catch (_) {}
                    const gameName = titleMatch[2].trim();
                    const subcats = [];

                    const catRegex = /<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g;
                    let catMatch;
                    while ((catMatch = catRegex.exec(b)) !== null) {
                        let catUrl = catMatch[1];
                        try {
                            catUrl = new URL(catUrl, 'https://funpay.com/').pathname;
                        } catch (_) {}
                        subcats.push({
                            url: catUrl,
                            name: catMatch[2].trim()
                        });
                    }
                    games.push({ name: gameName, url: gameUrl, subcats });
                }
            }
            return games;
        }

        // Fetch and refresh all games and categories
        async refreshCatalog(showNotification = true) {
            if (this.isSyncingCatalog) return;
            this.isSyncingCatalog = true;

            if (this.syncBtn) this.syncBtn.classList.add('spinning');

            try {
                let html = '';

                // If currently on FunPay main page, extract from live DOM directly
                if (window.location.pathname === '/' || window.location.pathname === '') {
                    html = document.documentElement.outerHTML;
                } else {
                    const res = await fetch('https://funpay.com/', { credentials: 'include' });
                    if (res.ok) {
                        html = await res.text();
                    }
                }

                const games = this.parseCatalogFromHTML(html);

                if (games.length > 0) {
                    this.catalogGames = games;
                    const storage = this.getStorage();
                    if (storage) {
                        storage.set({
                            [STORAGE_CATALOG_KEY]: games,
                            [STORAGE_CATALOG_TIME]: Date.now()
                        });
                    }

                    if (showNotification) {
                        this.showToast(`Обновлено: ${games.length} категорий игр`);
                    }
                } else if (showNotification) {
                    this.showToast('Не удалось загрузить каталог');
                }
            } catch (err) {
                console.warn('Foxen QuickPages: Error fetching games catalog:', err);
                if (showNotification) this.showToast('Ошибка обновления каталога');
            } finally {
                if (this.syncBtn) this.syncBtn.classList.remove('spinning');
                this.isSyncingCatalog = false;
                if (this.isOpen) {
                    this.renderList();
                }
            }
        }

        // Build the Apple Modal Dialog Element
        buildDialog() {
            const existingDialog = document.getElementById('fxn-quick-pages-dialog');
            if (existingDialog) {
                this.dialog = existingDialog;
                this.searchInput = existingDialog.querySelector('.fxn-qp-search-input');
                this.listContainer = existingDialog.querySelector('.fxn-qp-scroll-body');
                this.clearBtn = existingDialog.querySelector('.fxn-qp-clear-btn');
                this.pinCurrentBtn = existingDialog.querySelector('.fxn-qp-pin-current-btn');
                this.syncBtn = existingDialog.querySelector('.fxn-qp-sync-btn');
                this.rebindBtn = existingDialog.querySelector('.fxn-qp-rebind-btn');
                this.closeBtn = existingDialog.querySelector('.fxn-qp-close-btn');
                return;
            }

            if (!document.body) return;

            const dialog = document.createElement('dialog');
            dialog.id = 'fxn-quick-pages-dialog';
            dialog.className = 'fxn-quick-pages-dialog';
            dialog.setAttribute('aria-label', 'Быстрый переход по страницам и категориям Foxen');

            dialog.innerHTML = `
                <div class="fxn-qp-backdrop-surface"></div>
                <div class="fxn-qp-window" role="document">
                    <!-- Clean Minimalist Header: Search + Filled Pin Current + Parse Catalog Sync + Hotkey Rebind + Close -->
                    <div class="fxn-qp-header">
                        <div class="fxn-qp-search-icon">${ICONS.search}</div>
                        <input type="text"
                               class="fxn-qp-search-input"
                               placeholder="Поиск по страницам и категориям игр (напр., Tele, CS)..."
                               autocomplete="off"
                               spellcheck="false"
                               aria-autocomplete="list" />
                        
                        <button type="button" class="fxn-qp-clear-btn" title="Очистить" style="display: none;">
                            ${ICONS.close}
                        </button>

                        <button type="button" class="fxn-qp-header-btn fxn-qp-pin-current-btn" title="Закрепить текущую страницу">
                            ${ICONS.pinFilled}
                        </button>

                        <button type="button" class="fxn-qp-header-btn fxn-qp-sync-btn" title="Обновить каталог игр и категорий FunPay">
                            ${ICONS.refresh}
                        </button>

                        <button type="button" class="fxn-qp-rebind-btn" title="Нажмите, чтобы перепривязать горячие клавиши открытия">
                            <span class="fxn-qp-rebind-icon">${ICONS.keyboard}</span>
                            <span class="fxn-qp-rebind-label">${this.shortcut.label}</span>
                        </button>

                        <button type="button" class="fxn-qp-header-btn fxn-qp-close-btn" title="Закрыть (ESC)">
                            ${ICONS.close}
                        </button>
                    </div>

                    <!-- Results List Container (Spotlight Body) -->
                    <div class="fxn-qp-content" role="listbox">
                        <div class="fxn-qp-scroll-body">
                            <!-- Injected dynamically via renderList() -->
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);
            this.dialog = dialog;
            this.searchInput = dialog.querySelector('.fxn-qp-search-input');
            this.listContainer = dialog.querySelector('.fxn-qp-scroll-body');
            this.clearBtn = dialog.querySelector('.fxn-qp-clear-btn');
            this.pinCurrentBtn = dialog.querySelector('.fxn-qp-pin-current-btn');
            this.syncBtn = dialog.querySelector('.fxn-qp-sync-btn');
            this.rebindBtn = dialog.querySelector('.fxn-qp-rebind-btn');
            this.closeBtn = dialog.querySelector('.fxn-qp-close-btn');

            this.bindDialogEvents();
            this.syncTheme();
        }

        // Bind interactive events within the dialog
        bindDialogEvents() {
            // Search Input listener
            this.searchInput.addEventListener('input', () => {
                const query = this.searchInput.value.trim();
                this.clearBtn.style.display = query ? 'flex' : 'none';
                this.selectedIndex = 0;
                this.renderList();
            });

            // Clear search button
            this.clearBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.clearBtn.style.display = 'none';
                this.searchInput.focus();
                this.selectedIndex = 0;
                this.renderList();
            });

            // Pin / Unpin Current Page Button in Header
            this.pinCurrentBtn.addEventListener('click', () => {
                this.toggleCurrentPagePin();
            });

            // Sync / Re-parse catalog button
            this.syncBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.refreshCatalog(true);
            });

            // Rebind hotkey button
            this.rebindBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startRecordingShortcut();
            });

            // Close button
            this.closeBtn.addEventListener('click', () => {
                this.close();
            });

            // Light Dismiss: Pointer down + up outside detection
            let pressedOutside = false;
            const isOutside = (e) => {
                const rect = this.dialog.querySelector('.fxn-qp-window').getBoundingClientRect();
                return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
            };

            this.dialog.addEventListener('pointerdown', (e) => {
                pressedOutside = isOutside(e);
            });

            this.dialog.addEventListener('pointerup', (e) => {
                if (pressedOutside && isOutside(e)) {
                    this.close();
                }
                pressedOutside = false;
            });

            // Native cancel event
            this.dialog.addEventListener('cancel', (e) => {
                e.preventDefault();
                this.close();
            });

            // Dialog keyboard navigation
            this.dialog.addEventListener('keydown', (e) => {
                if (this.isRecordingShortcut) return;
                this.handleDialogKeyDown(e);
            });
        }

        // Global hotkey listener
        bindGlobalShortcuts() {
            if (this._hasBoundGlobalShortcuts) return;
            this._hasBoundGlobalShortcuts = true;

            window.addEventListener('keydown', (e) => {
                if (this.isRecordingShortcut) return;

                if (this.isShortcutMatching(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Foxen QuickPages] Opening via shortcut:', this.shortcut?.label);
                    this.toggle();
                }
            }, true);

            // Support custom event trigger
            window.addEventListener('foxen:open-quick-pages', () => {
                this.open();
            });
        }

        // Compare event with active shortcut
        isShortcutMatching(e) {
            const sc = this.shortcut || DEFAULT_SHORTCUT;

            // Modifiers check
            const matchCtrl = sc.ctrlKey ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
            if (!matchCtrl) return false;
            if (Boolean(sc.altKey) !== Boolean(e.altKey)) return false;
            if (Boolean(sc.shiftKey) !== Boolean(e.shiftKey)) return false;

            // Key check
            const code = e.code;
            const key = (e.key || '').toLowerCase();
            const targetKey = (sc.key || '').toLowerCase();

            // Match exact code or key
            if (sc.code && code === sc.code) return true;
            if (targetKey && key === targetKey) return true;

            // Support Russian layout and cross-platform KeyQ ('q' / 'й')
            if (sc.code === 'KeyQ' || targetKey === 'q') {
                if (code === 'KeyQ' || key === 'q' || key === 'й') return true;
            }

            return false;
        }

        // Interactive Hotkey Recording
        startRecordingShortcut() {
            if (this.isRecordingShortcut) return;
            this.isRecordingShortcut = true;

            const rebindBtn = this.rebindBtn;
            const labelEl = rebindBtn.querySelector('.fxn-qp-rebind-label');
            rebindBtn.classList.add('recording');
            labelEl.textContent = 'Нажмите клавиши...';

            const onKeyDown = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // If Escape alone, cancel
                if (e.key === 'Escape') {
                    stopRecording();
                    return;
                }

                // If standalone modifier, show preview
                const isModifierOnly = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);
                if (isModifierOnly) {
                    const temp = [];
                    if (e.ctrlKey) temp.push('Ctrl');
                    if (e.altKey) temp.push('Alt');
                    if (e.shiftKey) temp.push('Shift');
                    if (e.metaKey) temp.push('Cmd');
                    labelEl.textContent = temp.length ? temp.join(' + ') + ' + ...' : 'Нажмите клавиши...';
                    return;
                }

                // Full combo captured!
                const parts = [];
                if (e.ctrlKey) parts.push('Ctrl');
                if (e.altKey) parts.push('Alt');
                if (e.shiftKey) parts.push('Shift');
                if (e.metaKey) parts.push('Cmd');

                let keyLabel = e.key;
                if (e.code && e.code.startsWith('Key')) keyLabel = e.code.slice(3);
                else if (e.code && e.code.startsWith('Digit')) keyLabel = e.code.slice(5);
                else if (e.code === 'Space') keyLabel = 'Space';
                else if (e.key && e.key.length === 1) keyLabel = e.key.toUpperCase();

                parts.push(keyLabel);
                const newLabel = parts.join(' + ');

                this.shortcut = {
                    code: e.code,
                    key: e.key.toLowerCase(),
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    label: newLabel
                };

                this.saveShortcut();
                this.showToast(`Горячая клавиша: ${newLabel}`);
                stopRecording();
            };

            const stopRecording = () => {
                this.isRecordingShortcut = false;
                rebindBtn.classList.remove('recording');
                labelEl.textContent = this.shortcut.label;
                window.removeEventListener('keydown', onKeyDown, true);
                if (this.searchInput) this.searchInput.focus();
            };

            window.addEventListener('keydown', onKeyDown, true);
        }

        // Theme synchronization
        bindThemeListeners() {
            try {
                const observer = new MutationObserver(() => this.syncTheme());
                observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['class', 'data-fxn-popup-theme']
                });
            } catch (_) {}

            try {
                const storage = typeof browser !== 'undefined' ? browser?.storage : chrome?.storage;
                if (storage?.onChanged) {
                    storage.onChanged.addListener((changes, area) => {
                        if (area === 'local') {
                            if (changes.foxenPopupTheme || changes.foxenGlassBlur) {
                                this.syncTheme();
                            }
                            if (changes[STORAGE_HOTKEY_KEY]) {
                                this.shortcut = changes[STORAGE_HOTKEY_KEY].newValue || { ...DEFAULT_SHORTCUT };
                                if (this.rebindBtn) {
                                    const lbl = this.rebindBtn.querySelector('.fxn-qp-rebind-label');
                                    if (lbl) lbl.textContent = this.shortcut.label;
                                }
                            }
                            if (changes[STORAGE_CATALOG_KEY]) {
                                this.catalogGames = changes[STORAGE_CATALOG_KEY].newValue || [];
                                if (this.isOpen) this.renderList();
                            }
                        }
                    });
                }
            } catch (_) {}
        }

        syncTheme() {
            if (!this.dialog) return;
            const theme = getActiveTheme();
            this.dialog.classList.remove('theme-dark', 'theme-light', 'theme-transparent');
            this.dialog.classList.add(`theme-${theme}`);

            const blurVal = window.__foxenGlassBlur || 18;
            this.dialog.style.setProperty('--fxn-glass-blur', `${blurVal}px`);
        }

        // Clean current title
        getCleanCurrentTitle() {
            let title = document.title || 'Текущая страница';
            title = title.replace(/\s*—\s*FunPay.*$/i, '')
                         .replace(/\s*\|\s*FunPay.*$/i, '')
                         .replace(/\s*FunPay\s*$/i, '')
                         .trim();
            return title || 'Текущая страница';
        }

        isUrlPinned(url) {
            if (!url) return false;
            const cleanUrl = url.replace(/https?:\/\/[^\/]+/, '');
            return this.pages.some(p => {
                if (!p.pinned) return false;
                const pClean = (p.url || '').replace(/https?:\/\/[^\/]+/, '');
                return pClean === cleanUrl;
            });
        }

        isCurrentPagePinned() {
            const currentPath = window.location.pathname;
            return this.isUrlPinned(currentPath);
        }

        updateCurrentPageButtonState() {
            const isPinned = this.isCurrentPagePinned();
            this.pinCurrentBtn.classList.toggle('pinned', isPinned);
            this.pinCurrentBtn.setAttribute('title', isPinned ? 'Открепить текущую страницу' : 'Закрепить текущую страницу');
        }

        toggleCurrentPagePin() {
            const isPinned = this.isCurrentPagePinned();
            const currentPath = window.location.pathname + window.location.search;
            const cleanTitle = this.getCleanCurrentTitle();

            if (isPinned) {
                // Find and unpin
                this.pages = this.pages.map(p => {
                    const pClean = (p.url || '').replace(/https?:\/\/[^\/]+/, '');
                    if (pClean === window.location.pathname) {
                        return { ...p, pinned: false };
                    }
                    return p;
                });
                this.showToast('Страница откреплена');
            } else {
                let found = false;
                this.pages = this.pages.map(p => {
                    const pClean = (p.url || '').replace(/https?:\/\/[^\/]+/, '');
                    if (pClean === window.location.pathname) {
                        found = true;
                        return { ...p, pinned: true };
                    }
                    return p;
                });

                if (!found) {
                    this.pages.unshift({
                        id: 'custom_' + Date.now(),
                        title: cleanTitle,
                        desc: currentPath,
                        url: currentPath,
                        icon: 'custom',
                        gradient: 'linear-gradient(135deg, #c026d3, #9333ea)',
                        pinned: true,
                        isCustom: true
                    });
                }
                this.showToast('Страница закреплена!');
            }

            this.savePages();
            this.updateCurrentPageButtonState();
            this.renderList();
        }

        // Show brief Apple toast
        showToast(message) {
            let toast = this.dialog.querySelector('.fxn-qp-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'fxn-qp-toast';
                this.dialog.querySelector('.fxn-qp-window').appendChild(toast);
            }
            toast.textContent = message;
            toast.classList.add('visible');
            setTimeout(() => {
                toast.classList.remove('visible');
            }, 1800);
        }

        // Keyboard navigation inside dialog
        handleDialogKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.filteredItems.length > 0) {
                    this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
                    this.updateSelection();
                }
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.filteredItems.length > 0) {
                    this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
                    this.updateSelection();
                }
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.filteredItems[this.selectedIndex]) {
                    this.navigateTo(this.filteredItems[this.selectedIndex]);
                }
                return;
            }

            // Number keys 1-9
            if (e.key >= '1' && e.key <= '9') {
                const idx = parseInt(e.key, 10) - 1;
                const isInputActive = document.activeElement === this.searchInput && this.searchInput.value.length > 0;
                if ((e.altKey || !isInputActive) && this.filteredItems[idx]) {
                    e.preventDefault();
                    this.navigateTo(this.filteredItems[idx]);
                }
            }
        }

        updateSelection() {
            const itemEls = this.listContainer.querySelectorAll('.fxn-qp-item');
            itemEls.forEach((el, idx) => {
                const isSelected = idx === this.selectedIndex;
                el.classList.toggle('selected', isSelected);
                el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                if (isSelected) {
                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            });
        }

        navigateTo(item) {
            this.close();
            if (!item || !item.url) return;
            window.location.href = item.url;
        }

        // Search through the full catalog of games & subcategories
        searchCatalog(query) {
            if (!query || !this.catalogGames.length) return [];
            const q = query.toLowerCase().trim();

            const gameMatches = [];
            const subcatMatches = [];

            for (const g of this.catalogGames) {
                const gNameLower = g.name.toLowerCase();
                const isGameMatch = gNameLower.includes(q);

                if (isGameMatch) {
                    // Main game card
                    const subcatNames = (g.subcats || []).map(s => s.name).join(', ');
                    gameMatches.push({
                        id: 'game_' + g.url,
                        title: g.name,
                        desc: subcatNames ? `Все разделы • ${subcatNames}` : g.url,
                        url: g.url,
                        icon: 'market',
                        gradient: getCategoryGradient(g.name),
                        gameName: g.name,
                        isGame: true,
                        pinned: this.isUrlPinned(g.url),
                        priority: gNameLower.startsWith(q) ? 1 : 2
                    });

                    // Subcategories of this matching game
                    if (g.subcats && g.subcats.length) {
                        for (const sub of g.subcats) {
                            subcatMatches.push({
                                id: 'cat_' + sub.url,
                                title: `${g.name} — ${sub.name}`,
                                desc: sub.url,
                                url: sub.url,
                                icon: 'orders',
                                gradient: getCategoryGradient(g.name),
                                gameName: g.name,
                                subcatName: sub.name,
                                isGameCategory: true,
                                pinned: this.isUrlPinned(sub.url),
                                priority: sub.name.toLowerCase().includes(q) ? 1 : 3
                            });
                        }
                    }
                } else if (g.subcats && g.subcats.length) {
                    // Search in subcategories when game name itself doesn't contain query
                    for (const sub of g.subcats) {
                        if (sub.name.toLowerCase().includes(q)) {
                            subcatMatches.push({
                                id: 'cat_' + sub.url,
                                title: `${g.name} — ${sub.name}`,
                                desc: sub.url,
                                url: sub.url,
                                icon: 'orders',
                                gradient: getCategoryGradient(g.name),
                                gameName: g.name,
                                subcatName: sub.name,
                                isGameCategory: true,
                                pinned: this.isUrlPinned(sub.url),
                                priority: 4
                            });
                        }
                    }
                }
            }

            gameMatches.sort((a, b) => a.priority - b.priority);
            subcatMatches.sort((a, b) => a.priority - b.priority);

            return [...gameMatches, ...subcatMatches].slice(0, 50);
        }

        // Render the list of pinned and search results
        renderList() {
            const query = (this.searchInput.value || '').toLowerCase().trim();
            const pinnedList = this.pages.filter(p => p.pinned);

            let displayItems = [];

            if (query) {
                // 1. Search in pinned list
                const matchingPinned = pinnedList.filter(item => {
                    const matchTitle = item.title && item.title.toLowerCase().includes(query);
                    const matchDesc = item.desc && item.desc.toLowerCase().includes(query);
                    const matchUrl = item.url && item.url.toLowerCase().includes(query);
                    return matchTitle || matchDesc || matchUrl;
                });

                // 2. Search in games and categories catalog
                const matchingCatalog = this.searchCatalog(query);

                // Combine avoiding duplicates
                const seenUrls = new Set();
                const combined = [];

                for (const item of [...matchingPinned, ...matchingCatalog]) {
                    const cleanUrl = (item.url || '').replace(/https?:\/\/[^\/]+/, '');
                    if (!seenUrls.has(cleanUrl)) {
                        seenUrls.add(cleanUrl);
                        // Sync pinned state with storage
                        item.pinned = this.isUrlPinned(cleanUrl);
                        combined.push(item);
                    }
                }

                displayItems = combined;
            } else {
                displayItems = pinnedList;
            }

            this.filteredItems = displayItems;

            if (this.filteredItems.length === 0) {
                this.listContainer.innerHTML = `
                    <div class="fxn-qp-empty-state">
                        <div class="fxn-qp-empty-icon">${ICONS.search}</div>
                        <div class="fxn-qp-empty-title">Ничего не найдено</div>
                        <div class="fxn-qp-empty-desc">По запросу «${query}» игр или категорий не обнаружено.</div>
                    </div>
                `;
                return;
            }

            if (this.selectedIndex >= this.filteredItems.length) {
                this.selectedIndex = Math.max(0, this.filteredItems.length - 1);
            }

            let html = '';
            let globalIndex = 0;

            if (!query) {
                // Section 1: Pinned pages
                if (pinnedList.length > 0) {
                    html += `
                        <div class="fxn-qp-section-heading">
                            <span>⭐ ЗАКРЕПЛЁННЫЕ СТРАНИЦЫ</span>
                            <span class="fxn-qp-badge-count">${pinnedList.length}</span>
                        </div>
                        <div class="fxn-qp-items-group">
                    `;
                    pinnedList.forEach(item => {
                        html += this.renderItemHTML(item, globalIndex);
                        globalIndex++;
                    });
                    html += `</div>`;
                }

                // Section 2: Quick suggestions
                const suggestions = getSuggestedPresets().filter(sp => !this.isUrlPinned(sp.url));
                if (suggestions.length > 0) {
                    html += `
                        <div class="fxn-qp-section-heading">
                            <span>⚡ БЫСТРЫЕ РАЗДЕЛЫ FUNPAY</span>
                        </div>
                        <div class="fxn-qp-items-group">
                    `;
                    suggestions.forEach(item => {
                        html += this.renderItemHTML(item, globalIndex);
                        globalIndex++;
                    });
                    html += `</div>`;
                }
            } else {
                // Search Results
                html += `
                    <div class="fxn-qp-section-heading">
                        <span>РЕЗУЛЬТАТЫ ПОИСКА (${displayItems.length})</span>
                    </div>
                    <div class="fxn-qp-items-group">
                `;
                displayItems.forEach(item => {
                    html += this.renderItemHTML(item, globalIndex);
                    globalIndex++;
                });
                html += `</div>`;
            }

            this.listContainer.innerHTML = html;
            this.bindItemActions();
            this.updateSelection();
        }

        renderItemHTML(item, index) {
            const isSelected = index === this.selectedIndex;
            const iconSvg = ICONS[item.icon] || ICONS.custom;
            const bgGradient = item.gradient || 'linear-gradient(135deg, var(--fxn-accent, #c026d3), #9333ea)';
            const numberBadge = index < 9 ? `<span class="fxn-qp-item-number" title="Быстрый переход Alt+${index + 1}">${index + 1}</span>` : '';
            const isPinned = !!item.pinned;

            return `
                <div class="fxn-qp-item ${isSelected ? 'selected' : ''}"
                     data-index="${index}"
                     data-id="${item.id}"
                     role="option"
                     aria-selected="${isSelected ? 'true' : 'false'}">
                    <div class="fxn-qp-item-icon" style="background: ${bgGradient};">
                        ${iconSvg}
                    </div>
                    <div class="fxn-qp-item-info">
                        <div class="fxn-qp-item-title-row">
                            <span class="fxn-qp-item-title">${item.title}</span>
                            ${item.external ? `<span class="fxn-qp-external-icon">${ICONS.external}</span>` : ''}
                        </div>
                        <div class="fxn-qp-item-desc">${item.desc || item.url}</div>
                    </div>
                    <div class="fxn-qp-item-actions">
                        ${numberBadge}
                        <button type="button" class="fxn-qp-action-btn fxn-qp-pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Открепить страницу' : 'Закрепить страницу'}">
                            ${ICONS.pinFilled}
                        </button>
                        ${item.isCustom ? `
                            <button type="button" class="fxn-qp-action-btn fxn-qp-delete-btn" title="Удалить ссылку">
                                ${ICONS.trash}
                            </button>
                        ` : ''}
                        <div class="fxn-qp-item-jump-icon">${ICONS.arrowRight}</div>
                    </div>
                </div>
            `;
        }

        bindItemActions() {
            const itemEls = this.listContainer.querySelectorAll('.fxn-qp-item');
            itemEls.forEach((el) => {
                const idx = parseInt(el.getAttribute('data-index'), 10);
                const item = this.filteredItems[idx];
                if (!item) return;

                el.addEventListener('mouseenter', () => {
                    this.selectedIndex = idx;
                    this.updateSelection();
                });

                el.addEventListener('click', (e) => {
                    if (e.target.closest('.fxn-qp-action-btn')) return;
                    this.navigateTo(item);
                });

                // Pin toggle button with FILLED pin
                const pinBtn = el.querySelector('.fxn-qp-pin-btn');
                if (pinBtn) {
                    pinBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleItemPin(item);
                    });
                }

                // Delete custom button
                const delBtn = el.querySelector('.fxn-qp-delete-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteCustomItem(item);
                    });
                }
            });
        }

        toggleItemPin(item) {
            const cleanUrl = (item.url || '').replace(/https?:\/\/[^\/]+/, '');
            const target = this.pages.find(p => (p.url || '').replace(/https?:\/\/[^\/]+/, '') === cleanUrl);

            if (target) {
                target.pinned = !target.pinned;
            } else {
                this.pages.unshift({
                    id: 'pinned_' + Date.now(),
                    title: item.title,
                    desc: item.url,
                    url: item.url,
                    icon: item.icon || 'orders',
                    gradient: item.gradient || getCategoryGradient(item.title),
                    pinned: true
                });
            }

            this.savePages();
            this.updateCurrentPageButtonState();
            this.renderList();
            this.showToast(target && !target.pinned ? 'Страница откреплена' : 'Категория закреплена!');
        }

        deleteCustomItem(item) {
            this.pages = this.pages.filter(p => p.id !== item.id);
            this.savePages();
            this.updateCurrentPageButtonState();
            this.renderList();
            this.showToast('Ссылка удалена');
        }

        // Open Modal Dialog
        open() {
            if (!this.dialog) {
                this.buildDialog();
            }
            if (!this.dialog) return;

            if (this.isOpen) return;
            this.syncTheme();
            this.isOpen = true;
            this.searchInput.value = '';
            this.clearBtn.style.display = 'none';
            this.selectedIndex = 0;

            const rebindLabel = this.rebindBtn ? this.rebindBtn.querySelector('.fxn-qp-rebind-label') : null;
            if (rebindLabel) rebindLabel.textContent = this.shortcut.label;

            this.updateCurrentPageButtonState();
            this.renderList();

            try {
                if (typeof this.dialog.showModal === 'function') {
                    this.dialog.showModal();
                } else {
                    this.dialog.setAttribute('open', '');
                }
            } catch (err) {
                this.dialog.setAttribute('open', '');
            }

            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                    this.searchInput.select();
                }
            }, 30);
        }

        // Close Modal Dialog
        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.isRecordingShortcut = false;
            if (this.rebindBtn) {
                this.rebindBtn.classList.remove('recording');
                const lbl = this.rebindBtn.querySelector('.fxn-qp-rebind-label');
                if (lbl) lbl.textContent = this.shortcut.label;
            }

            if (this.dialog) {
                if (typeof this.dialog.close === 'function') {
                    try {
                        this.dialog.close();
                    } catch (_) {
                        this.dialog.removeAttribute('open');
                    }
                } else {
                    this.dialog.removeAttribute('open');
                }
            }
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }
    }

    function init() {
        if (!window.__foxenQuickPinnedPages) {
            window.__foxenQuickPinnedPages = new QuickPinnedPages();
            window.foxenOpenQuickPages = () => window.__foxenQuickPinnedPages?.toggle();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
