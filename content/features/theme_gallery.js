// ============================================================================
// Foxen — Встроенный каталог тем (Theme Gallery & Presets Catalog)
// ============================================================================
// Профессиональный каталог тем оформления для FunPay в едином стиле Foxen:
// - Полная интеграция с нативной дизайн-системой Foxen (.panel-header, .group, .btn)
// - 11 встроенных curated-пресетов + онлайн-синхронизация с CDN Cloudflare R2
// - Фильтрация по категориям (Тёмные, Неон, Пастель, Арт, Закладки)
// - Моментальный поиск по названию, стилю и автору
// - Индикация активной темы (бейджи "Активна" и кнопка "Установлена")
// - Применение темы в 1 клик через движок applyCustomTheme()
// - Сброс оформления к стандартному виду FunPay
// - Импорт пользовательских файлов .fptheme
// - Модальное окно предпросмотра с детальной палитрой цветов
// ============================================================================

(() => {
    'use strict';

    const R2_THEMES_BASE = 'https://cdn.foxen.site/download/Catalog/Themes/';
    const INDEX_URL = R2_THEMES_BASE + 'index.json';
    const CACHE_KEY = 'foxen_themes_catalog_cache_v3';
    const CACHE_TIME_KEY = 'foxen_themes_catalog_time_v3';
    const BOOKMARKS_KEY = 'foxenBookmarkedThemeIds';
    const CACHE_TTL = 1800 * 1000; // 30 минут кэша

    // Актуальные проверенные темы из каталога (надежный оффлайн fallback)
    const BUILTIN_THEMES = [
        {
            id: 'FXNT-99375',
            name: 'Crimson Mist',
            desc: 'Таинственный багровый лес в тумане, сквозь который пробиваются лучи солнца.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'crimson_mist.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/crimson_mist_preview.png',
            colors: {
                bgColor1: '#202020',
                bgColor2: '#640808',
                containerBgColor: '#2D0808',
                textColor: '#FFFFFF',
                linkColor: '#610101'
            }
        },
        {
            id: 'FXNT-37890',
            name: 'Scarlet Bamboo',
            desc: 'Черно-белая бамбуковая чаща с контрастными ветвями алого клена.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'scarlet_bamboo.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/scarlet_bamboo_preview.png',
            colors: {
                bgColor1: '#202020',
                bgColor2: '#640808',
                containerBgColor: '#383737',
                textColor: '#FFFFFF',
                linkColor: '#610101'
            }
        },
        {
            id: 'FXNT-36956',
            name: 'Azure Horizon',
            desc: 'Бескрайняя безмятежная гладь океана под чистым лазурным небом.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'azure_horizon.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/azure_horizon_preview.png',
            colors: {
                bgColor1: '#0D8BDF',
                bgColor2: '#009AB5',
                containerBgColor: '#106F9E',
                textColor: '#FFFFFF',
                linkColor: '#2060e0'
            }
        },
        {
            id: 'FXNT-57528',
            name: 'Enchanted Grove',
            desc: 'Уютная лесная тропа среди вековых замшелых деревьев и мягкого света.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'enchanted_grove.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/enchanted_grove_preview.png',
            colors: {
                bgColor1: '#404020',
                bgColor2: '#5D5D20',
                containerBgColor: '#202000',
                textColor: '#FFFFFF',
                linkColor: '#404000'
            }
        },
        {
            id: 'FXNT-92463',
            name: 'Autumn Serenity',
            desc: 'Одинокий алый клен над безмолвной зеркальной гладью ночного озера.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'autumn_serenity.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/autumn_serenity_preview.png',
            colors: {
                bgColor1: '#000000',
                bgColor2: '#404040',
                containerBgColor: '#202020',
                textColor: '#FFFFFF',
                linkColor: '#6B0202'
            }
        },
        {
            id: 'FXNT-89734',
            name: 'Crimson River',
            desc: 'Плывущие багряные листья по темному лесному ручью в лучах света.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'crimson_river.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/crimson_river_preview.png',
            colors: {
                bgColor1: '#000000',
                bgColor2: '#404040',
                containerBgColor: '#202020',
                textColor: '#FFFFFF',
                linkColor: '#6B0202'
            }
        },
        {
            id: 'FXNT-99913',
            name: 'Stairway of Fate',
            desc: 'Старинная каменная лестница, ведущая сквозь чащу к скрытой святыне.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'stairway_of_fate.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/stairway_of_fate_preview.png',
            colors: {
                bgColor1: '#000000',
                bgColor2: '#761616',
                containerBgColor: '#202020',
                textColor: '#FFFFFF',
                linkColor: '#6B0202'
            }
        },
        {
            id: 'FXNT-19067',
            name: 'Higanbana Bloom',
            desc: 'Призрачный туманный лес, усыпанный алыми цветами паучьей лилии.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'higanbana_bloom.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/higanbana_bloom_preview.png',
            colors: {
                bgColor1: '#000000',
                bgColor2: '#761616',
                containerBgColor: '#202020',
                textColor: '#FFFFFF',
                linkColor: '#6B0202'
            }
        },
        {
            id: 'FXNT-96538',
            name: 'Ashen Moon',
            desc: 'Безмолвная каменистая равнина далекой планеты под тусклым светилом.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'ashen_moon.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/ashen_moon_preview.png',
            colors: {
                bgColor1: '#404040',
                bgColor2: '#202020',
                containerBgColor: '#808080',
                textColor: '#FFFFFF',
                linkColor: '#606060'
            }
        },
        {
            id: 'FXNT-29497',
            name: 'Bamboo Sanctuary',
            desc: 'Таинственная тропа сквозь вечнозеленую бамбуковую рощу в дымке.',
            author: 'FoxenTeam',
            category: 'dark',
            fileUrl: R2_THEMES_BASE + 'bamboo_sanctuary.fptheme',
            previewUrl: R2_THEMES_BASE + 'previews/bamboo_sanctuary_preview.png',
            colors: {
                bgColor1: '#404040',
                bgColor2: '#39422A',
                containerBgColor: '#202020',
                textColor: '#FFFFFF',
                linkColor: '#2B3726'
            }
        }
    ];

    // State
    let _allThemes = [...BUILTIN_THEMES];
    let _activeThemeId = null;
    let _bookmarkedIds = new Set();
    let _searchQuery = '';
    let _isLoaded = false;
    let _previewModal = null;
    let _livePreviewPrevState = null;
    let _livePreviewActiveTheme = null;
    let _previewDockEl = null;

    // Встроенные надежные векторные SVG-иконки (не зависят от веб-шрифтов и исключают утечку лигатур вроде DASHBOARD_CUSTOMIZE)
    const ICONS = {
        palette: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
        check: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        checkCircle: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        grid: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
        close: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        visibility: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        bookmark: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        bookmarkBorder: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        spin: `<svg class="fxn-tg-spin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
    };

    function getStorage() {
        try {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            return api?.storage?.local || null;
        } catch (_) {
            return null;
        }
    }

    function matchThemeId(id1, id2) {
        if (!id1 || !id2) return false;
        if (id1 === id2) return true;
        const clean1 = String(id1).toLowerCase().replace(/^the_/i, '').replace(/[\s_-]+/g, '');
        const clean2 = String(id2).toLowerCase().replace(/^the_/i, '').replace(/[\s_-]+/g, '');
        return clean1 === clean2;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Инъекция стилей каталога тем, полностью гармонирующих с main_popup.css
    function ensureStyles() {
        if (document.getElementById('fxn-theme-gallery-styles')) return;

        const css = `
        /* ═══════════════ FOXEN THEME GALLERY STYLES ═══════════════ */
        .fxn-tg-root {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
            box-sizing: border-box;
            color: var(--fxn-text-main, #f4f4f3);
        }

        /* ── Universal SVG Helper ── */
        .fxn-tg-root svg,
        .fxn-theme-preview-dock svg,
        .fxn-tg-modal-window svg {
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 0 !important;
        }

        /* ── Search Bar (Clean Single Field in Foxen Style, No Double Box) ── */
        .fxn-tg-root .fxn-tg-search-bar,
        .fxn-popup .fxn-tg-search-bar,
        .foxen-popup .fxn-tg-search-bar {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            background: #101012 !important;
            border: 1px solid var(--fxn-divider-color, rgba(255, 255, 255, 0.08)) !important;
            border-radius: 10px !important;
            padding: 0 12px 0 14px !important;
            height: 40px !important;
            min-height: 40px !important;
            box-sizing: border-box !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease !important;
            width: 100% !important;
        }
        .fxn-tg-root .fxn-tg-search-bar:focus-within,
        .fxn-popup .fxn-tg-search-bar:focus-within,
        .foxen-popup .fxn-tg-search-bar:focus-within {
            border-color: rgba(255, 255, 255, 0.28) !important;
            background: #141416 !important;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 4px 16px rgba(0, 0, 0, 0.3) !important;
        }
        .fxn-tg-search-icon {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            width: 16px !important;
            height: 16px !important;
            color: var(--fxn-text-desc, #96969a) !important;
            pointer-events: none !important;
        }
        .fxn-tg-search-icon svg {
            width: 16px !important;
            height: 16px !important;
            display: block !important;
        }
        .fxn-popup .fxn-tg-root input.fxn-tg-search-input,
        .foxen-popup .fxn-tg-root input.fxn-tg-search-input,
        .fxn-popup .fxn-tg-search-bar input[type="text"],
        .foxen-popup .fxn-tg-search-bar input[type="text"],
        .fxn-tg-search-bar input {
            flex: 1 1 auto !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            outline: none !important;
            padding: 0 !important;
            margin: 0 !important;
            height: 100% !important;
            font-size: 13px !important;
            color: var(--fxn-text-main, #ffffff) !important;
            font-family: inherit !important;
            min-width: 0 !important;
        }
        .fxn-tg-search-bar input::placeholder {
            color: var(--fxn-text-desc, #71717a) !important;
        }
        .fxn-tg-search-clear {
            width: 22px !important;
            height: 22px !important;
            border-radius: 50% !important;
            display: none;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(255, 255, 255, 0.08) !important;
            color: var(--fxn-text-desc, #a1a1aa) !important;
            border: none !important;
            cursor: pointer !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
            transition: all 0.15s ease !important;
        }
        .fxn-tg-search-clear:hover {
            background: rgba(255, 255, 255, 0.22) !important;
            color: #ffffff !important;
        }
        .fxn-tg-search-clear svg {
            width: 12px !important;
            height: 12px !important;
        }

        /* ── Grid ── */
        .fxn-tg-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)) !important;
            gap: 14px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* ── Card (Nested Radius: Card 12px -> Inner Preview 8px) ── */
        .fxn-tg-card {
            background: var(--fxn-card-color, #1c1c1e) !important;
            border: 1px solid var(--fxn-divider-color, rgba(255, 255, 255, 0.08)) !important;
            border-radius: 12px !important;
            padding: 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            box-sizing: border-box !important;
            transition: border-color 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s !important;
            position: relative !important;
        }
        .fxn-tg-card:hover {
            border-color: rgba(255, 255, 255, 0.22) !important;
            background: var(--fxn-card-color-hover, #242426) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
        }
        .fxn-tg-card.is-active {
            border-color: rgba(16, 185, 129, 0.45) !important;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.14) !important;
        }

        /* ── 16:9 Image Preview ── */
        .fxn-tg-card-preview-wrap {
            position: relative !important;
            width: 100% !important;
            aspect-ratio: 16 / 9 !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            background: #000000 !important;
            cursor: pointer !important;
        }
        .fxn-tg-card-img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: top center !important;
            display: block !important;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .fxn-tg-card:hover .fxn-tg-card-img {
            transform: scale(1.03) !important;
        }
        .fxn-tg-card-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%) !important;
            pointer-events: none !important;
        }

        /* ── Badges on Preview ── */
        .fxn-tg-badge-category {
            display: none !important;
        }
        .fxn-tg-bookmark-btn {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            width: 28px !important;
            height: 28px !important;
            border-radius: 6px !important;
            background: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            color: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 4 !important;
            padding: 0 !important;
            transition: background 0.2s, transform 0.15s !important;
        }
        .fxn-tg-bookmark-btn:hover {
            background: rgba(0, 0, 0, 0.85) !important;
            transform: scale(1.08) !important;
        }
        .fxn-tg-bookmark-btn svg {
            width: 15px !important;
            height: 15px !important;
        }
        .fxn-tg-bookmark-btn.bookmarked {
            color: #facc15 !important;
        }
        .fxn-tg-bookmark-btn.bookmarked svg {
            fill: #facc15 !important;
            color: #facc15 !important;
        }

        /* ── Card Meta ── */
        .fxn-tg-card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            flex: 1 !important;
        }
        .fxn-tg-card-title-row {
            display: flex !important;
            align-items: baseline !important;
            justify-content: space-between !important;
            gap: 8px !important;
        }
        .fxn-tg-card-title {
            font-size: 15px !important;
            font-weight: 700 !important;
            color: var(--fxn-text-main, #ffffff) !important;
            margin: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        .fxn-tg-card-author {
            font-size: 11.5px !important;
            color: var(--fxn-text-desc, #94a3b8) !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
        }
        .fxn-tg-card-desc {
            font-size: 12.5px !important;
            line-height: 17px !important;
            color: var(--fxn-text-desc, #a1a1aa) !important;
            margin: 0 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            min-height: 34px !important;
        }

        /* ── Card Buttons ── */
        .fxn-tg-card-actions {
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            margin-top: auto !important;
        }
        .fxn-tg-card-actions .fxn-tg-apply-btn {
            width: 100% !important;
            flex: 1 1 100% !important;
            justify-content: center !important;
            height: 32px !important;
            min-height: 32px !important;
            font-size: 12.5px !important;
            font-weight: 650 !important;
            border-radius: 8px !important;
        }

        /* ── Theme Live Preview Floating Dockbar (macOS / Dockbar Style) ── */
        .fxn-theme-preview-dock {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483647 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 8px 16px 8px 18px !important;
            background: rgba(18, 18, 22, 0.88) !important;
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.16) !important;
            border-radius: 9999px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
            color: #f4f4f5 !important;
            font-family: var(--fxn-font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
            animation: fxnTpdSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            max-width: calc(100vw - 32px) !important;
            box-sizing: border-box !important;
            user-select: none !important;
            pointer-events: auto !important;
        }
        @keyframes fxnTpdSlideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(24px) scale(0.96);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        .fxn-tpd-info {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
        }
        .fxn-tpd-badge {
            position: relative !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            color: #38bdf8 !important;
        }
        .fxn-tpd-badge svg {
            width: 17px !important;
            height: 17px !important;
            color: #38bdf8 !important;
        }
        .fxn-tpd-pulse {
            position: absolute !important;
            top: -1px !important;
            right: -1px !important;
            width: 9px !important;
            height: 9px !important;
            border-radius: 50% !important;
            background: #10b981 !important;
            box-shadow: 0 0 8px #10b981 !important;
            animation: fxnTpdPulse 2s infinite !important;
        }
        @keyframes fxnTpdPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.3); }
        }
        .fxn-tpd-texts {
            display: flex !important;
            flex-direction: column !important;
            gap: 1px !important;
        }
        .fxn-tpd-title {
            font-size: 13.5px !important;
            font-weight: 700 !important;
            color: #ffffff !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
        }
        .fxn-tpd-title span {
            color: #38bdf8 !important;
        }
        .fxn-tpd-sub {
            font-size: 11px !important;
            color: rgba(255, 255, 255, 0.55) !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
        }
        .fxn-tpd-actions {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
            padding-left: 12px !important;
        }
        .fxn-tpd-actions .btn {
            height: 30px !important;
            min-height: 30px !important;
            padding: 0 12px !important;
            border-radius: 9999px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            white-space: nowrap !important;
            cursor: pointer !important;
            transition: all 0.18s ease !important;
        }
        .fxn-tpd-actions .btn svg {
            width: 14px !important;
            height: 14px !important;
            flex-shrink: 0 !important;
        }
        .fxn-tpd-actions .btn-solid {
            background: #ffffff !important;
            color: #0c0c0d !important;
            border: 1px solid #ffffff !important;
        }
        .fxn-tpd-actions .btn-solid:hover {
            background: #e4e4e7 !important;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.25) !important;
        }
        .fxn-tpd-actions .btn-ghost {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
        }
        .fxn-tpd-actions .btn-ghost:hover {
            background: rgba(255, 255, 255, 0.16) !important;
            border-color: rgba(255, 255, 255, 0.28) !important;
        }

        /* ── Empty State ── */
        .fxn-tg-empty {
            grid-column: 1 / -1;
            padding: 44px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 12px;
            background: var(--fxn-card-color, #1c1c1e);
            border: 1px dashed var(--fxn-divider-color, rgba(255, 255, 255, 0.15));
            border-radius: 12px;
        }
        .fxn-tg-empty-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--fxn-text-main, #ffffff);
            margin: 0;
        }
        .fxn-tg-empty-desc {
            font-size: 13px;
            color: var(--fxn-text-desc, #a1a1aa);
            margin: 0;
            max-width: 360px;
        }

        /* ── Modal Lightbox ── */
        .fxn-tg-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: fxnTgFadeIn 0.2s ease-out;
        }
        .fxn-tg-modal-window {
            background: var(--fxn-sidebar-color, #101012);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            max-width: 640px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            animation: fxnTgScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fxn-tg-modal-img-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
            overflow: hidden;
        }
        .fxn-tg-modal-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .fxn-tg-modal-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background 0.15s;
        }
        .fxn-tg-modal-close:hover {
            background: rgba(0, 0, 0, 0.95);
        }
        .fxn-tg-modal-body {
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .fxn-tg-modal-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--fxn-text-main, #ffffff);
            margin: 0;
        }
        .fxn-tg-modal-desc {
            font-size: 13.5px;
            line-height: 1.45;
            color: var(--fxn-text-desc, #cbd5e1);
            margin: 0;
        }
        .fxn-tg-modal-colors {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            padding: 10px 14px;
            border-radius: 8px;
            background: var(--fxn-card-color, #1c1c1e);
            border: 1px solid var(--fxn-divider-color);
        }
        .fxn-tg-modal-color-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--fxn-text-desc);
            font-family: var(--fxn-font-mono);
        }
        .fxn-tg-modal-color-chip span.dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.25);
            display: inline-block;
        }
        .fxn-tg-modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            padding: 12px 20px;
            background: var(--fxn-bg-color, #0a0a0a);
            border-top: 1px solid var(--fxn-divider-color);
        }

        @keyframes fxnTgFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fxnTgScaleIn {
            from { opacity: 0; transform: scale(0.96) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fxnTgSpin {
            100% { transform: rotate(360deg); }
        }
        .fxn-tg-spin {
            animation: fxnTgSpin 0.9s linear infinite;
        }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = 'fxn-theme-gallery-styles';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    // Загрузка тем с Cloudflare R2 CDN с кэшированием
    async function fetchThemesCatalog() {
        const storage = getStorage();
        if (storage) {
            try {
                // Очистка устаревших версий кэша
                storage.remove?.(['foxen_themes_catalog_cache', 'foxen_themes_catalog_time', 'foxen_themes_catalog_cache_v2']);
                const res = await new Promise(r => storage.get([CACHE_KEY, CACHE_TIME_KEY], r));
                if (res && res[CACHE_KEY] && res[CACHE_TIME_KEY]) {
                    if (Date.now() - res[CACHE_TIME_KEY] < CACHE_TTL) {
                        return res[CACHE_KEY];
                    }
                }
            } catch (_) {}
        }

        try {
            const resp = await fetch(INDEX_URL, { cache: 'no-store' });
            if (resp.ok) {
                const data = await resp.json();
                const list = Array.isArray(data) ? data : (Array.isArray(data.themes) ? data.themes : []);
                
                const remoteThemes = list.map(t => {
                    let fileUrl = t.file || '';
                    if (!/^https?:\/\//i.test(fileUrl)) {
                        const cleanFile = String(fileUrl).replace(/^\/+/, '').replace(/^themes\//i, '');
                        fileUrl = R2_THEMES_BASE + cleanFile;
                    }
                    let previewUrl = t.preview || '';
                    if (!/^https?:\/\//i.test(previewUrl)) {
                        const cleanPrev = String(previewUrl).replace(/^\/+/, '');
                        previewUrl = cleanPrev.startsWith('previews/') ? R2_THEMES_BASE + cleanPrev : R2_THEMES_BASE + 'previews/' + cleanPrev;
                    }

                    // Определение категории
                    let category = 'dark';
                    const text = `${t.name} ${t.desc || ''}`.toLowerCase();
                    if (/neon|cyber|bloom|liquid|purple/i.test(text)) category = 'neon';
                    else if (/peak|foggy|mountain|закат|пастел/i.test(text)) category = 'pastel';
                    else if (/haven|lantern|zen|kyoto|арт/i.test(text)) category = 'art';

                    return {
                        id: t.id || t.name,
                        name: t.name || 'Без названия',
                        desc: t.desc || t.description || 'Стильная тема оформления для Foxen.',
                        author: t.author || 'FoxenTeam',
                        category,
                        categoryLabel: category === 'neon' ? 'Неон' : category === 'pastel' ? 'Пастель' : category === 'art' ? 'Арт' : 'Тёмная',
                        badge: t.author === 'SanoSenpay' ? 'Авторская' : 'Сообщество',
                        fileUrl,
                        previewUrl,
                        colors: t.colors || {
                            bgColor1: '#0c0a09',
                            bgColor2: '#27272a',
                            containerBgColor: '#09090b',
                            textColor: '#f4f4f5',
                            linkColor: '#60a5fa'
                        }
                    };
                });

                if (remoteThemes.length > 0) {
                    if (storage) {
                        storage.set({
                            [CACHE_KEY]: remoteThemes,
                            [CACHE_TIME_KEY]: Date.now()
                        });
                    }
                    return remoteThemes;
                }
            }
        } catch (e) {
            console.warn('[Foxen Theme Gallery] Ошибка загрузки удаленного каталога R2:', e);
        }

        return BUILTIN_THEMES;
    }

    // Получить активную тему из storage
    async function loadActiveThemeInfo() {
        const storage = getStorage();
        if (!storage) return null;
        return new Promise(resolve => {
            storage.get(['foxenTheme', 'foxenCurrentThemeId', 'enableCustomTheme', BOOKMARKS_KEY], res => {
                if (res && Array.isArray(res[BOOKMARKS_KEY])) {
                    _bookmarkedIds = new Set(res[BOOKMARKS_KEY]);
                }
                const isCustomOn = res?.enableCustomTheme !== false;
                if (!isCustomOn) {
                    _activeThemeId = null;
                } else if (res?.foxenCurrentThemeId) {
                    _activeThemeId = res.foxenCurrentThemeId;
                } else if (res?.foxenTheme?.name) {
                    _activeThemeId = res.foxenTheme.name;
                } else {
                    _activeThemeId = null;
                }
                resolve(_activeThemeId);
            });
        });
    }

    // Применить выбранную тему
    async function applyTheme(theme, btnEl) {
        if (!theme) return;
        const storage = getStorage();
        if (!storage) return;

        const origHtml = btnEl ? btnEl.innerHTML : '';
        if (btnEl) {
            btnEl.innerHTML = `${ICONS.spin}<span>Применяю...</span>`;
            btnEl.disabled = true;
        }

        try {
            let themeObj = null;

            // 1. Попытка скачать .fptheme
            if (theme.fileUrl) {
                try {
                    const res = await fetch(theme.fileUrl);
                    if (res.ok) {
                        themeObj = await res.json();
                    }
                } catch (e) {
                    console.warn('[Foxen Theme Gallery] Не удалось скачать .fptheme, применяем встроенные параметры:', e);
                }
            }

            // 2. Fallback из встроенных параметров
            if (!themeObj) {
                const c = theme.colors || {};
                themeObj = {
                    name: theme.name,
                    id: theme.id,
                    bgColor1: c.bgColor1 || '#0c0a09',
                    bgColor2: c.bgColor2 || '#27272a',
                    containerBgColor: c.containerBgColor || '#09090b',
                    containerBgOpacity: 0.88,
                    textColor: c.textColor || '#f4f4f5',
                    linkColor: c.linkColor || '#38bdf8',
                    bgImage: theme.previewUrl || null,
                    font: 'Helvetica Neue',
                    bgBlur: 0,
                    bgBrightness: 100,
                    borderRadius: 8,
                    enableGlassmorphism: true,
                    glassmorphismBlur: 10
                };
            }

            // Сохраняем в storage
            await new Promise(r => storage.set({
                foxenTheme: themeObj,
                foxenThemeBgImage: themeObj.bgImage || theme.previewUrl || '',
                foxenThemeBgIsAnimated: false,
                enableCustomTheme: true,
                foxenCurrentThemeId: theme.id
            }, r));

            _activeThemeId = theme.id;

            // Вызываем применение темы
            if (typeof window.applyCustomTheme === 'function') {
                await window.applyCustomTheme();
            } else if (typeof applyCustomTheme === 'function') {
                await applyCustomTheme();
            }

            if (typeof showNotification === 'function') {
                showNotification(`Тема «${theme.name}» успешно применена!`);
            }

            // Обновляем состояние карточек
            updateGridActiveStates();
        } catch (err) {
            console.error('[Foxen Theme Gallery] Ошибка применения темы:', err);
            if (typeof showNotification === 'function') {
                showNotification(`Ошибка применения темы: ${err.message}`, true);
            }
        } finally {
            if (btnEl) {
                btnEl.innerHTML = origHtml;
                btnEl.disabled = false;
            }
        }
    }

    // Сбросить оформление к стандартному стилю FunPay
    async function resetTheme() {
        const storage = getStorage();
        if (!storage) return;

        try {
            await new Promise(r => storage.set({
                enableCustomTheme: false,
                foxenTheme: {},
                foxenThemeBgImage: '',
                foxenCurrentThemeId: null
            }, r));

            _activeThemeId = null;

            if (typeof window.applyCustomTheme === 'function') {
                await window.applyCustomTheme();
            } else if (typeof applyCustomTheme === 'function') {
                await applyCustomTheme();
            }

            if (typeof showNotification === 'function') {
                showNotification('Оформление сброшено к стандартному стилю FunPay');
            }

            updateGridActiveStates();
        } catch (err) {
            console.error('[Foxen Theme Gallery] Ошибка сброса темы:', err);
        }
    }

    // Переключение закладки темы
    async function toggleBookmark(themeId, btnEl) {
        const storage = getStorage();
        if (!storage) return;

        if (_bookmarkedIds.has(themeId)) {
            _bookmarkedIds.delete(themeId);
        } else {
            _bookmarkedIds.add(themeId);
        }

        await new Promise(r => storage.set({ [BOOKMARKS_KEY]: Array.from(_bookmarkedIds) }, r));

        if (btnEl) {
            const isFav = _bookmarkedIds.has(themeId);
            btnEl.classList.toggle('bookmarked', isFav);
            btnEl.title = isFav ? 'Удалить из закладок' : 'В закладки';
            btnEl.innerHTML = isFav ? ICONS.bookmark : ICONS.bookmarkBorder;
        }

        updateBookmarkCountBadge();

        if (_currentCategory === 'favorite') {
            renderThemesGrid();
        }
    }

    // Импорт пользовательской темы .fptheme
    function triggerThemeImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fptheme,.json';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const themeObj = JSON.parse(text);
                const themeName = themeObj.name || file.name.replace(/\.[^/.]+$/, '');

                const storage = getStorage();
                if (storage) {
                    await new Promise(r => storage.set({
                        foxenTheme: themeObj,
                        foxenThemeBgImage: themeObj.bgImage || '',
                        foxenThemeBgIsAnimated: false,
                        enableCustomTheme: true,
                        foxenCurrentThemeId: 'custom_' + Date.now()
                    }, r));

                    if (typeof window.applyCustomTheme === 'function') {
                        await window.applyCustomTheme();
                    } else if (typeof applyCustomTheme === 'function') {
                        await applyCustomTheme();
                    }

                    if (typeof showNotification === 'function') {
                        showNotification(`Импортирована и применена тема «${themeName}»!`);
                    }
                }
            } catch (err) {
                console.error('[Foxen Theme Gallery] Ошибка импорта файла темы:', err);
                if (typeof showNotification === 'function') {
                    showNotification(`Ошибка чтения файла темы: ${err.message}`, true);
                }
            } finally {
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.click();
    }

    // Обновление состояния "Установлена" на всех карточках
    function updateGridActiveStates() {
        const root = document.getElementById('fxn-theme-gallery-root');
        if (!root) return;

        const cards = root.querySelectorAll('.fxn-tg-card');
        cards.forEach(card => {
            const themeId = card.dataset.themeId;
            const isActive = matchThemeId(themeId, _activeThemeId);
            card.classList.toggle('is-active', isActive);

            const applyBtn = card.querySelector('.fxn-tg-apply-btn');
            if (applyBtn) {
                if (isActive) {
                    applyBtn.disabled = true;
                    applyBtn.className = 'btn btn-sm btn-ghost fxn-tg-apply-btn';
                    applyBtn.style.color = '#34d399';
                    applyBtn.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                    applyBtn.style.background = 'rgba(16, 185, 129, 0.12)';
                    applyBtn.innerHTML = `${ICONS.checkCircle}<span>Установлена</span>`;
                } else {
                    applyBtn.disabled = false;
                    applyBtn.className = 'btn btn-sm btn-solid fxn-tg-apply-btn';
                    applyBtn.style.color = '';
                    applyBtn.style.borderColor = '';
                    applyBtn.style.background = '';
                    applyBtn.innerHTML = '<span>Применить</span>';
                }
            }
        });
    }

    // Управление окном Foxen Popup при живом предпросмотре
    function closeFoxenMainPopup() {
        const popup = document.getElementById('foxenMainPopup');
        if (popup) {
            popup.classList.remove('active');
            popup.classList.remove('mobile-sidebar-open');
        }
        document.body.classList.remove('fxn-popup-open');
        if (typeof window.closeFoxenMenuSettings === 'function') {
            try { window.closeFoxenMenuSettings(); } catch (_) {}
        }
    }

    function openFoxenMainPopupAndNavigateToThemeGallery() {
        const popup = document.getElementById('foxenMainPopup');
        if (popup) {
            popup.classList.add('active');
            document.body.classList.add('fxn-popup-open');
            const subitem = popup.querySelector('.nav-subitem[data-target="theme_gallery"]');
            if (subitem) {
                subitem.click();
            } else {
                popup.querySelectorAll('.panel, .foxen-page-content').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById('theme_gallery');
                if (panel) panel.classList.add('active');
            }
        } else if (typeof window.__fpTogglePopup === 'function') {
            window.__fpTogglePopup();
        }
    }

    // Нижняя плавающая панель живого предпросмотра (в духе Foxen Dockbar)
    function removeThemePreviewDock() {
        if (_previewDockEl) {
            _previewDockEl.remove();
            _previewDockEl = null;
        }
        const existing = document.getElementById('fxn-theme-preview-dock');
        if (existing) existing.remove();
    }

    async function revertLiveThemePreview() {
        if (!_livePreviewPrevState) return;
        const storage = getStorage();
        if (storage) {
            await new Promise(r => storage.set(_livePreviewPrevState, r));
        }
        _livePreviewPrevState = null;
        _livePreviewActiveTheme = null;

        if (typeof window.applyCustomTheme === 'function') {
            await window.applyCustomTheme();
        } else if (typeof applyCustomTheme === 'function') {
            await applyCustomTheme();
        }
        await loadActiveThemeInfo();
        updateGridActiveStates();
    }

    async function startLiveThemePreview(theme) {
        if (!theme) return;

        const storage = getStorage();
        if (storage && !_livePreviewPrevState) {
            try {
                const current = await new Promise(r => storage.get(['enableCustomTheme', 'foxenTheme', 'foxenThemeBgImage', 'foxenThemeBgIsAnimated', 'foxenCurrentThemeId'], r));
                _livePreviewPrevState = {
                    enableCustomTheme: current?.enableCustomTheme ?? false,
                    foxenTheme: current?.foxenTheme || {},
                    foxenThemeBgImage: current?.foxenThemeBgImage || '',
                    foxenThemeBgIsAnimated: current?.foxenThemeBgIsAnimated || false,
                    foxenCurrentThemeId: current?.foxenCurrentThemeId || null
                };
            } catch (_) {}
        }

        closePreviewModal();
        closeFoxenMainPopup();

        _livePreviewActiveTheme = theme;

        let themeObj = null;
        if (theme.fileUrl) {
            try {
                const res = await fetch(theme.fileUrl);
                if (res.ok) {
                    themeObj = await res.json();
                }
            } catch (_) {}
        }
        if (!themeObj) {
            const c = theme.colors || {};
            themeObj = {
                name: theme.name,
                id: theme.id,
                bgColor1: c.bgColor1 || '#0c0a09',
                bgColor2: c.bgColor2 || '#27272a',
                containerBgColor: c.containerBgColor || '#09090b',
                containerBgOpacity: 0.88,
                textColor: c.textColor || '#f4f4f5',
                linkColor: c.linkColor || '#38bdf8',
                bgImage: theme.previewUrl || null,
                font: 'Helvetica Neue',
                bgBlur: 0,
                bgBrightness: 100,
                borderRadius: 8,
                enableGlassmorphism: true,
                glassmorphismBlur: 10
            };
        }

        if (storage) {
            await new Promise(r => storage.set({
                foxenTheme: themeObj,
                foxenThemeBgImage: themeObj.bgImage || theme.previewUrl || '',
                foxenThemeBgIsAnimated: false,
                enableCustomTheme: true,
                foxenCurrentThemeId: theme.id
            }, r));
        }

        if (typeof window.applyCustomTheme === 'function') {
            await window.applyCustomTheme();
        } else if (typeof applyCustomTheme === 'function') {
            await applyCustomTheme();
        }

        showThemePreviewDock(theme);
    }

    function showThemePreviewDock(theme) {
        removeThemePreviewDock();

        const dock = document.createElement('div');
        dock.id = 'fxn-theme-preview-dock';
        dock.className = 'fxn-theme-preview-dock';
        dock.innerHTML = `
            <div class="fxn-tpd-info">
                <div class="fxn-tpd-badge">
                    <span class="fxn-tpd-pulse"></span>
                    ${ICONS.palette}
                </div>
                <div class="fxn-tpd-texts">
                    <div class="fxn-tpd-title">Предпросмотр: <span>${escapeHtml(theme.name)}</span></div>
                    <div class="fxn-tpd-sub">${escapeHtml(theme.author || 'FoxenTeam')} • Живой просмотр оформления</div>
                </div>
            </div>
            <div class="fxn-tpd-actions">
                <button type="button" class="btn btn-sm btn-solid fxn-tpd-btn-apply" title="Сохранить и применить эту тему">
                    ${ICONS.check}
                    <span>Применить</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost fxn-tpd-btn-back" title="Вернуться в каталог тем">
                    ${ICONS.grid}
                    <span>В каталог</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost fxn-tpd-btn-cancel" title="Отменить предпросмотр">
                    ${ICONS.close}
                    <span>Отмена</span>
                </button>
            </div>
        `;

        document.body.appendChild(dock);
        _previewDockEl = dock;

        // Кнопка: Сохранить и применить
        dock.querySelector('.fxn-tpd-btn-apply')?.addEventListener('click', async () => {
            _livePreviewPrevState = null;
            _activeThemeId = theme.id;
            removeThemePreviewDock();
            if (typeof showNotification === 'function') {
                showNotification(`Тема «${theme.name}» успешно сохранена и установлена!`);
            }
            updateGridActiveStates();
        });

        // Кнопка: Вернуться в каталог Foxen
        dock.querySelector('.fxn-tpd-btn-back')?.addEventListener('click', async () => {
            await revertLiveThemePreview();
            removeThemePreviewDock();
            openFoxenMainPopupAndNavigateToThemeGallery();
        });

        // Кнопка: Отмена предпросмотра
        dock.querySelector('.fxn-tpd-btn-cancel')?.addEventListener('click', async () => {
            await revertLiveThemePreview();
            removeThemePreviewDock();
            if (typeof showNotification === 'function') {
                showNotification('Предпросмотр темы отменён');
            }
        });
    }

    // Модальное окно с деталями и кнопкой живого предпросмотра
    function openPreviewModal(theme) {
        if (!theme) return;
        closePreviewModal();

        const isActive = matchThemeId(theme.id, _activeThemeId);
        const c = theme.colors || {};

        const modal = document.createElement('div');
        modal.className = 'fxn-tg-modal-backdrop';
        modal.innerHTML = `
            <div class="fxn-tg-modal-window" role="dialog" aria-modal="true">
                <div class="fxn-tg-modal-img-wrap">
                    <img class="fxn-tg-modal-img" src="${theme.previewUrl}" alt="${escapeHtml(theme.name)}" onerror="this.src='https://cdn.foxen.site/download/Catalog/Themes/previews/azure_horizon_preview.png'" />
                    <button type="button" class="fxn-tg-modal-close" title="Закрыть (Esc)">
                        ${ICONS.close}
                    </button>
                </div>
                <div class="fxn-tg-modal-body">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <h2 class="fxn-tg-modal-title">${escapeHtml(theme.name)}</h2>
                    </div>
                    <div style="font-size: 12.5px; color: var(--fxn-text-desc);">Автор: <b style="color: var(--fxn-text-main);">${escapeHtml(theme.author || 'FoxenTeam')}</b></div>
                    <p class="fxn-tg-modal-desc">${escapeHtml(theme.desc || 'Стильная тема оформления FunPay.')}</p>

                    <div class="fxn-tg-modal-colors">
                        <div class="fxn-tg-modal-color-chip">
                            <span class="dot" style="background: ${c.bgColor1 || '#0c0a09'};"></span>
                            <span>Фон: ${c.bgColor1 || 'default'}</span>
                        </div>
                        <div class="fxn-tg-modal-color-chip">
                            <span class="dot" style="background: ${c.containerBgColor || '#09090b'};"></span>
                            <span>Блоки: ${c.containerBgColor || 'default'}</span>
                        </div>
                        <div class="fxn-tg-modal-color-chip">
                            <span class="dot" style="background: ${c.linkColor || '#38bdf8'};"></span>
                            <span>Акцент: ${c.linkColor || 'default'}</span>
                        </div>
                    </div>
                </div>
                <div class="fxn-tg-modal-footer">
                    <button type="button" class="btn btn-sm btn-ghost" id="fxn-tg-modal-close-btn">
                        Закрыть
                    </button>
                    <button type="button" class="btn btn-sm btn-ghost" id="fxn-tg-modal-live-preview-btn" title="Временно применить тему и протестировать на странице">
                        ${ICONS.visibility}
                        <span>Предпросмотр</span>
                    </button>
                    <button type="button" class="btn btn-sm ${isActive ? 'btn-ghost' : 'btn-solid'}" id="fxn-tg-modal-apply-btn" ${isActive ? 'disabled style="color:#34d399;background:rgba(16,185,129,0.1);"' : ''}>
                        ${isActive ? ICONS.checkCircle : ''}
                        <span>${isActive ? 'Установлена' : 'Применить тему'}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        _previewModal = modal;

        const close = () => closePreviewModal();
        modal.querySelector('.fxn-tg-modal-close')?.addEventListener('click', close);
        modal.querySelector('#fxn-tg-modal-close-btn')?.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        const onEsc = (e) => {
            if (e.key === 'Escape') {
                close();
                window.removeEventListener('keydown', onEsc);
            }
        };
        window.addEventListener('keydown', onEsc);

        // Кнопка "Предпросмотр" в модалке
        modal.querySelector('#fxn-tg-modal-live-preview-btn')?.addEventListener('click', () => {
            startLiveThemePreview(theme);
        });

        // Кнопка "Применить" в модалке
        modal.querySelector('#fxn-tg-modal-apply-btn')?.addEventListener('click', async (e) => {
            await applyTheme(theme, e.currentTarget);
            close();
        });
    }

    function closePreviewModal() {
        if (_previewModal) {
            _previewModal.remove();
            _previewModal = null;
        }
    }

    // Отрисовка карточек тем в сетке
    function renderThemesGrid() {
        const grid = document.getElementById('fxn-tg-grid');
        if (!grid) return;

        const q = _searchQuery.trim().toLowerCase();
        const filtered = _allThemes.filter(t => {
            if (q) {
                const haystack = `${t.name} ${t.desc} ${t.author}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="fxn-tg-empty">
                    ${ICONS.search}
                    <h3 class="fxn-tg-empty-title">Темы не найдены</h3>
                    <p class="fxn-tg-empty-desc">
                        Попробуйте изменить поисковый запрос.
                    </p>
                    ${_searchQuery ? `
                        <button type="button" class="btn btn-sm btn-ghost" id="fxn-tg-reset-filters-btn">
                            Очистить поиск
                        </button>
                    ` : ''}
                </div>
            `;

            grid.querySelector('#fxn-tg-reset-filters-btn')?.addEventListener('click', () => {
                _searchQuery = '';
                const input = document.getElementById('fxn-tg-search');
                if (input) input.value = '';
                const clearBtn = document.getElementById('fxn-tg-clear-search');
                if (clearBtn) clearBtn.style.display = 'none';
                renderThemesGrid();
            });

            return;
        }

        grid.innerHTML = filtered.map(t => {
            const isActive = matchThemeId(t.id, _activeThemeId);
            const isFav = _bookmarkedIds.has(t.id);

            return `
                <div class="fxn-tg-card ${isActive ? 'is-active' : ''}" data-theme-id="${escapeHtml(t.id)}">
                    <div class="fxn-tg-card-preview-wrap" data-act="open-preview" title="Нажмите для просмотра и предпросмотра">
                        <img class="fxn-tg-card-img" src="${t.previewUrl}" alt="${escapeHtml(t.name)}" loading="lazy" onerror="this.src='https://cdn.foxen.site/download/Catalog/Themes/previews/azure_horizon_preview.png'" />
                        <div class="fxn-tg-card-overlay"></div>

                        <button type="button" class="fxn-tg-bookmark-btn ${isFav ? 'bookmarked' : ''}" data-act="fav" title="${isFav ? 'Удалить из закладок' : 'В закладки'}">
                            ${isFav ? ICONS.bookmark : ICONS.bookmarkBorder}
                        </button>
                    </div>

                    <div class="fxn-tg-card-body">
                        <div class="fxn-tg-card-title-row" data-act="open-preview" style="cursor: pointer;" title="Нажмите для подробного просмотра">
                            <h3 class="fxn-tg-card-title">${escapeHtml(t.name)}</h3>
                            <span class="fxn-tg-card-author">${escapeHtml(t.author || 'FoxenTeam')}</span>
                        </div>

                        <p class="fxn-tg-card-desc" data-act="open-preview" style="cursor: pointer;" title="${escapeHtml(t.desc)}">${escapeHtml(t.desc)}</p>

                        <div class="fxn-tg-card-actions">
                            <button type="button" class="btn btn-sm ${isActive ? 'btn-ghost' : 'btn-solid'} fxn-tg-apply-btn" data-act="apply" ${isActive ? 'disabled style="color:#34d399;border-color:rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);"' : ''}>
                                ${isActive ? ICONS.checkCircle : ''}
                                <span>${isActive ? 'Установлена' : 'Применить'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Обработчики карточек
        grid.querySelectorAll('.fxn-tg-card').forEach(card => {
            const themeId = card.dataset.themeId;
            const theme = _allThemes.find(t => t.id === themeId);
            if (!theme) return;

            card.querySelector('[data-act="fav"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBookmark(theme.id, e.currentTarget);
            });

            card.querySelector('[data-act="apply"]')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await applyTheme(theme, e.currentTarget);
            });

            card.querySelectorAll('[data-act="open-preview"]').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.fxn-tg-bookmark-btn') || e.target.closest('.fxn-tg-apply-btn')) return;
                    openPreviewModal(theme);
                });
            });
        });
    }

    // Главный рендер панели каталога тем в едином стиле Foxen
    async function renderThemeGalleryContainer(container) {
        if (!container) return;
        ensureStyles();

        container.innerHTML = `
            <div class="fxn-tg-root" id="fxn-theme-gallery-root">
                <!-- 1. Нативный Hero Header в стиле всех разделов Foxen -->
                <div class="panel-header">
                    <div class="panel-icon">
                        ${ICONS.palette}
                    </div>
                    <div>
                        <div class="crumb">Кастомизация &amp; Стиль</div>
                        <h1>Каталог тем</h1>
                        <p>Подборка стильных тем и фонов оформления FunPay с моментальной установкой в 1 клик</p>
                    </div>
                    <div class="status-pill on">
                        ${ICONS.checkCircle}
                        <span>АКТИВНО</span>
                    </div>
                </div>

                <!-- 2. Блок поиска (чистое поле поиска в стиле Foxen) -->
                <div class="section-label">Поиск тем</div>
                <div class="fxn-tg-search-bar" id="fxn-tg-search-bar">
                    <span class="fxn-tg-search-icon">
                        ${ICONS.search}
                    </span>
                    <input type="text" id="fxn-tg-search" class="fxn-tg-search-input" placeholder="Поиск тем по названию или автору..." autocomplete="off" spellcheck="false" style="padding:0 !important; margin:0 !important; background:transparent !important; border:none !important; outline:none !important; box-shadow:none !important;" />
                    <button type="button" id="fxn-tg-clear-search" class="fxn-tg-search-clear" title="Очистить поиск" style="display:none;">
                        ${ICONS.close}
                    </button>
                </div>

                <!-- 3. Сетка карточек тем -->
                <div class="section-label">Коллекция тем</div>
                <div class="fxn-tg-grid" id="fxn-tg-grid">
                    <!-- Заполняется renderThemesGrid() -->
                </div>
            </div>
        `;

        // Слушатель поиска
        const searchInput = container.querySelector('#fxn-tg-search');
        const searchClear = container.querySelector('#fxn-tg-clear-search');
        if (searchInput) {
            searchInput.value = _searchQuery;
            if (searchClear) searchClear.style.display = _searchQuery ? 'flex' : 'none';

            searchInput.addEventListener('input', () => {
                _searchQuery = searchInput.value;
                if (searchClear) searchClear.style.display = _searchQuery ? 'flex' : 'none';
                renderThemesGrid();
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                _searchQuery = '';
                if (searchInput) searchInput.value = '';
                searchClear.style.display = 'none';
                renderThemesGrid();
                if (searchInput) searchInput.focus();
            });
        }

        // Первичный рендер сетки
        renderThemesGrid();
    }

    // Главная входная точка
    async function loadThemeGallery(forceReload = false) {
        const container = document.getElementById('fxn-theme-gallery-root') ||
                          document.querySelector('#theme_gallery .panel-body');
        if (!container) return;

        await loadActiveThemeInfo();

        if (!_isLoaded || forceReload) {
            _allThemes = await fetchThemesCatalog();
            _isLoaded = true;
        }

        await renderThemeGalleryContainer(container);
    }

    // Экспорт в глобальный scope
    window.loadThemeGallery = loadThemeGallery;
    window.foxenThemeGallery = {
        load: loadThemeGallery,
        apply: applyTheme,
        reset: resetTheme,
        importFile: triggerThemeImport
    };

    function autoInit() {
        const panel = document.getElementById('theme_gallery');
        if (panel && panel.classList.contains('active')) {
            loadThemeGallery();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();
