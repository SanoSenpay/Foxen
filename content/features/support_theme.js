// content/features/support_theme.js
// Кастомная тема Foxen для сайта поддержки (support.funpay.com) с эффектом матового стекла (glassmorphism).

(function () {
    'use strict';

    const STYLE_ID = 'foxen-support-theme';
    const FONT_ID  = 'foxen-support-fonts';

    const DEFAULTS = {
        bgColor1: '#ff6d15',
        bgColor2: '#f4cf78',
        containerBgColor: '#0b0b0b',
        containerBgOpacity: 0.75,
        textColor: '#f0f0f0',
        linkColor: '#2d6bb3',
        bgImage: null,
        font: 'Helvetica Neue',
        bgBlur: 0,
        bgBrightness: 100,
        borderRadius: 10,
        glassmorphismBlur: 14
    };

    const GOOGLE_FONTS = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
        'Poppins', 'Nunito', 'Inter', 'Ubuntu', 'Rubik', 'Manrope', 'PT Sans'
    ];

    function toRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (!hex) return '11,11,11';
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `${r},${g},${b}`;
    }
    function hexToRgba(hex, a) { return `rgba(${toRgb(hex)},${a})`; }

    function shade(hex, amt) {
        const [r, g, b] = toRgb(hex).split(',').map(Number);
        const cl = v => Math.max(0, Math.min(255, v + amt));
        const h = v => cl(v).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    function manageFont(font) {
        let el = document.getElementById(FONT_ID);
        const isGoogle = GOOGLE_FONTS.includes(font);
        const content = isGoogle
            ? `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;600;700&display=swap');`
            : '';
        if (!el) {
            el = document.createElement('style');
            el.id = FONT_ID;
            (document.head || document.documentElement).appendChild(el);
        }
        if (el.textContent !== content) el.textContent = content;
    }

    function buildCss(s) {
        let cleanBg = (s.bgImage || '').trim();
        let bgImageUrl;
        if (!cleanBg) {
            bgImageUrl = 'url("https://i.ibb.co/Kpm5M7gg/Foxen-BCKG.png")';
        } else if (cleanBg.startsWith('url(')) {
            bgImageUrl = cleanBg;
        } else {
            bgImageUrl = `url("${cleanBg.replace(/"/g, '\\"')}")`;
        }

        const op = Math.max(0.35, Math.min(0.95, parseFloat(s.containerBgOpacity) || 0.75));
        const safeBlur = Math.min(30, Math.max(4, parseInt(s.glassmorphismBlur, 10) || 14));
        const accent = s.bgColor1 || '#ff6d15';
        const accentRgb = toRgb(accent);
        const link = s.linkColor || '#2d6bb3';
        const textRgb = toRgb(s.textColor || '#f0f0f0');
        const rr = `${s.borderRadius || 10}px`;
        const rrInput = `${Math.max(6, (s.borderRadius || 10) - 2)}px`;

        // Полупрозрачное матовое стекло (Glassmorphism)
        const glassBg = hexToRgba(s.containerBgColor || '#0b0b0b', op);
        const glassBorder = 'rgba(255, 255, 255, 0.12)';
        const glassShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.45)';

        // Поля ввода с эффектом матового стекла
        const inputBg = hexToRgba(shade(s.containerBgColor || '#0b0b0b', 18), Math.min(0.92, op + 0.12));
        const inputHoverBg = hexToRgba(shade(s.containerBgColor || '#0b0b0b', 26), Math.min(0.96, op + 0.16));
        const inputBorder = 'rgba(255, 255, 255, 0.16)';

        return `
        /* ── Фон пользователя ── */
        html, body {
            background: transparent !important;
            color-scheme: dark !important;
        }
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: ${bgImageUrl} no-repeat center center;
            background-size: cover;
            filter: blur(${s.bgBlur || 0}px) brightness(${s.bgBrightness !== undefined ? s.bgBrightness : 100}%);
            z-index: -1;
            transform: translateZ(0);
            pointer-events: none;
        }

        /* ── Переменные Bootstrap 5 ── */
        :root, html, [data-bs-theme=light], [data-bs-theme=dark], html[data-bs-theme] {
            --bs-body-color: ${s.textColor};
            --bs-body-color-rgb: ${textRgb};
            --bs-body-bg: transparent;
            --bs-body-bg-rgb: ${toRgb(s.containerBgColor || '#0b0b0b')};
            --bs-emphasis-color: #ffffff;
            --bs-emphasis-color-rgb: 255, 255, 255;
            --bs-secondary-color: ${hexToRgba(s.textColor, 0.7)};
            --bs-secondary-bg: ${hexToRgba(s.containerBgColor, 0.6)};
            --bs-secondary-bg-rgb: ${toRgb(shade(s.containerBgColor || '#0b0b0b', 14))};
            --bs-tertiary-color: ${hexToRgba(s.textColor, 0.5)};
            --bs-tertiary-bg: ${hexToRgba(s.containerBgColor, 0.4)};
            --bs-tertiary-bg-rgb: ${toRgb(shade(s.containerBgColor || '#0b0b0b', 8))};
            --bs-heading-color: #ffffff;

            --bs-white: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)};
            --bs-white-rgb: ${toRgb(shade(s.containerBgColor || '#0b0b0b', 12))};
            --bs-light: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)};
            --bs-light-rgb: ${toRgb(shade(s.containerBgColor || '#0b0b0b', 12))};
            --bs-light-subtle: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)};
            --bs-light-bg-subtle: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)};
            --bs-light-border-subtle: ${glassBorder};

            --bs-link-color: ${accent};
            --bs-link-hover-color: ${shade(accent, 25)};

            --bs-primary: ${accent};
            --bs-primary-rgb: ${accentRgb};
            --bs-primary-text-emphasis: #ffffff;
            --bs-primary-bg-subtle: ${glassBg};
            --bs-primary-border-subtle: ${glassBorder};

            --bs-card-bg: ${glassBg};
            --bs-card-color: ${s.textColor};
            --bs-card-border-color: ${glassBorder};
            --bs-list-group-bg: ${glassBg};
            --bs-list-group-color: ${s.textColor};
            --bs-list-group-border-color: ${glassBorder};

            --bs-border-color: ${glassBorder};
            --bs-border-color-translucent: ${glassBorder};
            --bs-border-radius: ${rr};
            --bs-border-radius-sm: ${Math.max(4, (s.borderRadius || 10) - 2)}px;
            --bs-border-radius-lg: ${(s.borderRadius || 10) + 4}px;

            --bs-box-shadow: ${glassShadow};
            --bs-box-shadow-sm: 0 .25rem .5rem rgba(0,0,0,.3);

            color-scheme: dark;
        }

        /* ── Переопределение белых / светлых фонов Bootstrap ── */
        .bg-white,
        .bg-light,
        .bg-light-subtle,
        .bg-body,
        .bg-body-secondary,
        .bg-body-tertiary,
        .bg-body-subtle,
        [class*="bg-white"],
        [class*="bg-light"] {
            background-color: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)} !important;
            background: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)} !important;
            color: ${s.textColor} !important;
        }

        .text-dark,
        .text-body,
        .text-black {
            color: ${s.textColor} !important;
        }

        body {
            font-family: '${s.font}', 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
            color: ${s.textColor};
        }

        #content {
            visibility: visible !important;
            opacity: 1 !important;
        }

        /* ── Навбар (Матовое стекло) ── */
        .navbar.navbar-dark, nav.navbar {
            background: ${glassBg} !important;
            backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            border-bottom: 1px solid ${glassBorder} !important;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35) !important;
        }
        .navbar .nav-link, .navbar .navbar-brand, .navbar span {
            color: ${s.textColor} !important;
        }
        .navbar .nav-link:hover {
            color: #ffffff !important;
        }
        .navbar .nav-link.active {
            color: ${accent} !important;
            font-weight: 600;
        }
        .navbar .logo-image > path {
            fill: #ffffff !important;
        }
        .navbar .btn-light, .nav-button.btn-light {
            background: ${accent} !important;
            border-color: ${accent} !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px ${hexToRgba(accent, 0.4)} !important;
            border-radius: ${rrInput} !important;
        }
        .navbar .btn-light:hover, .nav-button.btn-light:hover {
            background: ${shade(accent, -15)} !important;
            border-color: ${shade(accent, -15)} !important;
            transform: translateY(-1px);
        }

        /* ── Хлебные крошки (Матовое стекло) ── */
        .breadcrumb {
            background: ${hexToRgba(s.containerBgColor, 0.55)} !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: 8px !important;
            padding: 8px 16px !important;
            display: inline-flex !important;
            margin-bottom: 18px !important;
        }
        .breadcrumb a {
            color: ${hexToRgba(s.textColor, 0.8)} !important;
            text-decoration: none !important;
            transition: color 0.15s;
        }
        .breadcrumb a:hover {
            color: ${accent} !important;
        }
        .breadcrumb .breadcrumb-item.active,
        .breadcrumb .active {
            color: ${accent} !important;
            font-weight: 500;
        }
        .breadcrumb-item + .breadcrumb-item::before {
            color: ${hexToRgba(s.textColor, 0.4)} !important;
        }

        /* ── Блоки контента / Форма заявки / Карточки (Матовое стекло) ── */
        #content .container-xxl > form,
        .ticket-card,
        .card,
        .ticket-search-panel,
        .ticket-info-panel,
        .ticket-main-panel {
            background: ${glassBg} !important;
            backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: ${rr} !important;
            box-shadow: ${glassShadow} !important;
        }

        #content .container-xxl > form {
            padding: 28px 32px !important;
            margin-top: 14px !important;
            margin-bottom: 32px !important;
        }

        /* ── Статьи базы знаний / Основные блоки контента (col-lg-9) (Матовое стекло) ── */
        .col-lg-9,
        #content .col-lg-9 {
            background: ${glassBg} !important;
            backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: ${rr} !important;
            box-shadow: ${glassShadow} !important;
            padding: clamp(20px, 3.5vw, 36px) !important;
            margin-top: 10px !important;
            margin-bottom: 36px !important;
        }

        .col-lg-9 .title,
        .col-lg-9 h1 {
            color: #ffffff !important;
            font-size: 26px !important;
            font-weight: 700 !important;
            margin-bottom: 22px !important;
            padding-bottom: 14px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .knowledge-base-article-body {
            color: ${s.textColor} !important;
            font-size: 15px !important;
            line-height: 1.65 !important;
        }

        .knowledge-base-article-body a {
            color: ${accent} !important;
            text-decoration: underline !important;
        }

        .knowledge-base-article-body a:hover {
            color: ${shade(accent, 25)} !important;
        }

        .knowledge-base-article-body img {
            border-radius: 8px !important;
            border: 1px solid ${glassBorder} !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 12px 0 !important;
        }

        .knowledge-base-article-body blockquote {
            background: rgba(255, 255, 255, 0.05) !important;
            border-left: 4px solid ${accent} !important;
            padding: 12px 18px !important;
            border-radius: 0 8px 8px 0 !important;
            margin: 16px 0 !important;
        }

        .knowledge-base-article-body table {
            background: ${inputBg} !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            border: 1px solid ${glassBorder} !important;
            color: ${s.textColor} !important;
            margin: 16px 0 !important;
        }

        .knowledge-base-article-body th,
        .knowledge-base-article-body td {
            border-color: ${glassBorder} !important;
            padding: 10px 14px !important;
        }

        .knowledge-base-article-body th {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
        }

        /* ── Аккордеоны (FAQ) ── */
        .accordion, .accordion-item {
            background: ${glassBg} !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: ${rr} !important;
            overflow: hidden !important;
        }
        .accordion-button {
            background-color: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 16), op)} !important;
            color: ${s.textColor} !important;
            border: none !important;
            box-shadow: none !important;
        }
        .accordion-button:not(.collapsed) {
            background-color: ${hexToRgba(accent, 0.22)} !important;
            color: #ffffff !important;
        }
        .accordion-button::after {
            filter: brightness(0) invert(1) !important;
        }

        /* ── Заголовки и лейблы ── */
        label, .form-label, legend, .col-form-label {
            color: ${s.textColor} !important;
            font-weight: 500 !important;
            margin-bottom: 8px !important;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #ffffff !important;
            font-weight: 600 !important;
        }

        /* ── Поля ввода, селекты, TomSelect (Матовое стекло) ── */
        .form-control,
        .form-select,
        .ts-control,
        .ts-wrapper.single.input-active .ts-control {
            background-color: ${inputBg} !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid ${inputBorder} !important;
            border-radius: ${rrInput} !important;
            color: ${s.textColor} !important;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.25) !important;
            transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease !important;
            padding: 9px 14px !important;
            font-size: 14px !important;
        }
        .form-control:hover,
        .form-select:hover,
        .ts-control:hover {
            background-color: ${inputHoverBg} !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
        }
        .form-control:focus,
        .form-select:focus,
        .ts-control.focus,
        .focus .ts-control {
            background-color: ${inputHoverBg} !important;
            border-color: ${accent} !important;
            box-shadow: 0 0 0 3px ${hexToRgba(accent, 0.3)} !important;
            color: #ffffff !important;
            outline: none !important;
        }
        .form-control::placeholder,
        .ts-control input::placeholder,
        .ts-control input {
            color: ${hexToRgba(s.textColor, 0.6)} !important;
        }
        .ts-wrapper.single .ts-control .item {
            color: ${s.textColor} !important;
        }

        /* Белая стрелка для выпадающих списков (зафиксирована, не сдвигается при наведении) */
        .form-select,
        .form-select:hover,
        .form-select:focus,
        .ts-wrapper.single .ts-control,
        .ts-wrapper.single .ts-control:hover,
        .ts-wrapper.single.focus .ts-control,
        .ts-wrapper.single.input-active .ts-control {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") !important;
            background-repeat: no-repeat !important;
            background-position: right 0.75rem center !important;
            background-size: 16px 12px !important;
        }
        .ts-wrapper.single .ts-control::after,
        .ts-wrapper.single::after {
            transition: none !important;
        }

        /* Меню опций TomSelect (Матовое стекло) */
        .ts-dropdown {
            background: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), 0.95)} !important;
            backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) saturate(160%) !important;
            border: 1px solid ${inputBorder} !important;
            border-radius: ${rrInput} !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important;
            color: ${s.textColor} !important;
            margin-top: 6px !important;
            overflow: hidden !important;
            z-index: 2000 !important;
        }
        .ts-dropdown .option {
            color: ${s.textColor} !important;
            padding: 10px 14px !important;
            transition: background 0.15s ease !important;
        }
        .ts-dropdown .option:hover,
        .ts-dropdown .option.active {
            background: ${hexToRgba(accent, 0.25)} !important;
            color: #ffffff !important;
        }
        .ts-dropdown .option.selected {
            background: ${hexToRgba(accent, 0.4)} !important;
            color: #ffffff !important;
        }

        /* ── Алерты (Матовое стекло) ── */
        .alert {
            background: ${glassBg} !important;
            backdrop-filter: blur(${safeBlur}px) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: ${rr} !important;
            color: ${s.textColor} !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
            margin-bottom: 20px !important;
        }
        .alert-warning {
            background: rgba(245, 166, 35, 0.14) !important;
            border-color: rgba(245, 166, 35, 0.35) !important;
            color: #ffe082 !important;
        }
        .alert-danger {
            background: rgba(221, 75, 57, 0.14) !important;
            border-color: rgba(221, 75, 57, 0.35) !important;
            color: #ffab91 !important;
        }
        .alert-info {
            background: rgba(45, 107, 179, 0.15) !important;
            border-color: rgba(45, 107, 179, 0.35) !important;
            color: #90caf9 !important;
        }
        .alert-success {
            background: rgba(76, 175, 80, 0.14) !important;
            border-color: rgba(76, 175, 80, 0.35) !important;
            color: #a5d6a7 !important;
        }
        .alert .alert-icon, .alert i, .alert svg {
            fill: currentColor !important;
            color: currentColor !important;
        }

        /* ── Чекбоксы и радио-кнопки (Блоки с эффектом матового стекла) ── */
        .form-check {
            position: relative !important;
            background: ${inputBg} !important;
            backdrop-filter: blur(12px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
            border: 1px solid ${inputBorder} !important;
            border-radius: ${rrInput} !important;
            padding: 12px 18px 12px 48px !important;
            margin-bottom: 10px !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            cursor: pointer !important;
            transition: all 0.2s ease-in-out !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
        }
        .form-check:hover {
            background: ${inputHoverBg} !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35) !important;
        }
        .form-check:has(.form-check-input:checked),
        .form-check:has(input:checked),
        .form-check.is-checked {
            background: ${hexToRgba(accent, 0.22)} !important;
            border-color: ${accent} !important;
            box-shadow: 0 0 16px ${hexToRgba(accent, 0.35)} !important;
        }
        .form-check .form-check-input,
        .form-check input[type="radio"],
        .form-check input[type="checkbox"] {
            position: absolute !important;
            left: 16px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            margin: 0 !important;
            width: 18px !important;
            height: 18px !important;
            accent-color: ${accent} !important;
            cursor: pointer !important;
            background-color: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 30), 0.8)} !important;
            border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
        }
        .form-check .form-check-input:checked,
        .form-check input[type="radio"]:checked,
        .form-check input[type="checkbox"]:checked {
            background-color: ${accent} !important;
            border-color: ${accent} !important;
        }
        .form-check .form-check-label,
        .form-check label {
            display: inline-block !important;
            color: ${s.textColor} !important;
            cursor: pointer !important;
            font-size: 14.5px !important;
            font-weight: 500 !important;
            margin: 0 !important;
            user-select: none !important;
            line-height: 1.3 !important;
        }

        /* Fallback для групп radio/checkbox внутри fieldset или div */
        fieldset {
            border: none !important;
            padding: 0 !important;
            margin: 0 0 18px 0 !important;
        }
        fieldset legend {
            color: ${s.textColor} !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            margin-bottom: 10px !important;
            display: block !important;
            float: none !important;
            width: 100% !important;
        }
        label:has(> input[type="radio"]),
        label:has(> input[type="checkbox"]) {
            position: relative !important;
            background: ${inputBg} !important;
            backdrop-filter: blur(12px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
            border: 1px solid ${inputBorder} !important;
            border-radius: ${rrInput} !important;
            padding: 12px 18px !important;
            margin-bottom: 10px !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            cursor: pointer !important;
            transition: all 0.2s ease-in-out !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
            color: ${s.textColor} !important;
            font-size: 14.5px !important;
            font-weight: 500 !important;
        }
        label:has(> input[type="radio"]:hover),
        label:has(> input[type="checkbox"]:hover) {
            background: ${inputHoverBg} !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
        }
        label:has(> input[type="radio"]:checked),
        label:has(> input[type="checkbox"]:checked) {
            background: ${hexToRgba(accent, 0.22)} !important;
            border-color: ${accent} !important;
            box-shadow: 0 0 16px ${hexToRgba(accent, 0.35)} !important;
        }
        label > input[type="radio"],
        label > input[type="checkbox"] {
            margin: 0 !important;
            width: 18px !important;
            height: 18px !important;
            accent-color: ${accent} !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
        }

        /* ── Кнопки ── */
        .btn-primary, .btn-success, button[type="submit"] {
            background: ${accent} !important;
            border-color: ${accent} !important;
            color: #ffffff !important;
            border-radius: ${rrInput} !important;
            box-shadow: 0 4px 16px ${hexToRgba(accent, 0.35)} !important;
            font-weight: 600 !important;
            padding: 10px 24px !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        }
        .btn-primary:hover, .btn-success:hover, button[type="submit"]:hover {
            background: ${shade(accent, -15)} !important;
            border-color: ${shade(accent, -15)} !important;
            box-shadow: 0 6px 20px ${hexToRgba(accent, 0.5)} !important;
            transform: translateY(-1px);
        }

        /* Кнопка «Вложения» и второстепенные кнопки (Матовое стекло) */
        .btn-light:not(.nav-button),
        .btn-secondary,
        .btn-outline-secondary,
        .btn-outline-light,
        .attachment-btn,
        .btn-attachment,
        .btn-upload {
            background: ${inputBg} !important;
            background-color: ${inputBg} !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border: 1px solid ${inputBorder} !important;
            color: ${s.textColor} !important;
            border-radius: ${rrInput} !important;
            padding: 8px 18px !important;
            font-weight: 500 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
            transition: all 0.2s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
        }
        .btn-light:not(.nav-button):hover,
        .btn-secondary:hover,
        .btn-outline-secondary:hover,
        .btn-outline-light:hover,
        .attachment-btn:hover,
        .btn-attachment:hover,
        .btn-upload:hover {
            background: ${inputHoverBg} !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
            transform: translateY(-1px);
        }

        /* ── Списки тикетов и пагинация ── */
        .ticket-item {
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: ${s.textColor} !important;
            transition: all 0.2s ease !important;
        }
        .ticket-item:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            transform: translateX(2px);
        }
        .list-group-item {
            background: ${glassBg} !important;
            color: ${s.textColor} !important;
            border-color: ${glassBorder} !important;
        }
        .pagination .page-link {
            background: ${inputBg} !important;
            border-color: ${glassBorder} !important;
            color: ${s.textColor} !important;
            border-radius: 6px !important;
            margin: 0 2px !important;
        }
        .pagination .page-item.active .page-link {
            background: ${accent} !important;
            border-color: ${accent} !important;
            color: #ffffff !important;
        }

        /* ── Сообщения / Комментарии тикетов (Матовое стекло) ── */
        .comment,
        .comment-body,
        .comment-content,
        .comment-card,
        .comment-item,
        .comment-box,
        .comment-wrapper,
        .comment-container,
        .ticket-comment,
        .ticket-message,
        .ticket-reply,
        .ticket-content,
        .ticket-thread,
        .ticket-thread-item,
        .timeline-comment,
        .timeline-item,
        .timeline-body,
        .timeline-content,
        .request-comment,
        .request-message,
        .request-content,
        .request-reply,
        .request-container,
        .conversation-comment,
        .conversation-item,
        .speech-bubble,
        .bubble,
        .card,
        .card-body,
        div:has(> .comment-username),
        div:has(> .username) {
            background: ${hexToRgba(shade(s.containerBgColor || '#0b0b0b', 12), op)} !important;
            backdrop-filter: blur(${safeBlur}px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(${safeBlur}px) saturate(140%) !important;
            border: 1px solid ${glassBorder} !important;
            border-radius: ${rr} !important;
            color: ${s.textColor} !important;
        }

        /* Предотвращение дублирования фона внутри вложенных card-body */
        .card > .card-body,
        .comment > .comment-body,
        .timeline-item > .timeline-body {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        /* Текст внутри комментариев */
        .comment-body,
        .comment-text,
        .comment-content,
        .ticket-comment,
        .ticket-message,
        .timeline-body,
        .request-comment,
        .comment p,
        .comment div:not(.comment-username):not(.badge),
        .comment span:not(.badge):not(.username),
        .ticket-comment p,
        .ticket-comment div:not(.comment-username):not(.badge),
        .ticket-comment span:not(.badge):not(.username),
        .timeline-item p,
        .timeline-item div:not(.username):not(.badge) {
            color: ${s.textColor} !important;
        }

        /* Автор и дата */
        .comment-username,
        .comment-username .username,
        .comment-author,
        .author-name,
        .user-name,
        .username {
            color: ${accent} !important;
            font-weight: 600 !important;
        }

        .comment-date,
        .comment-time,
        .comment-meta,
        .ticket-comment-meta,
        .text-muted,
        .text-secondary {
            color: ${hexToRgba(s.textColor, 0.65)} !important;
        }

        /* Ссылки внутри комментариев */
        .comment a,
        .comment-body a,
        .ticket-comment a,
        .timeline a,
        .request a {
            color: ${link || accent} !important;
            text-decoration: underline !important;
        }

        .comment a:hover,
        .comment-body a:hover,
        .ticket-comment a:hover,
        .timeline a:hover,
        .request a:hover {
            color: ${shade(link || accent, 25)} !important;
        }

        blockquote {
            background: rgba(255, 255, 255, 0.05) !important;
            border-left: .25em solid ${accent} !important;
            color: ${s.textColor} !important;
            padding: 8px 14px !important;
            border-radius: 0 6px 6px 0 !important;
        }

        /* ── Summernote редактор ── */
        .note-editor.note-frame {
            background: ${inputBg} !important;
            border: 1px solid ${inputBorder} !important;
            border-radius: ${rrInput} !important;
            overflow: hidden !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
        }
        .note-toolbar.card-header {
            background: rgba(255, 255, 255, 0.05) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .note-editing-area, .note-editable, .note-codable {
            background: transparent !important;
            color: ${s.textColor} !important;
        }
        .note-btn {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            color: ${s.textColor} !important;
            border-radius: 4px !important;
        }
        .note-btn:hover {
            background: rgba(255, 255, 255, 0.16) !important;
            color: #ffffff !important;
        }

        /* ── Вложения ── */
        .attachments-list .attachment-item > * {
            background: ${inputBg} !important;
            border-color: ${inputBorder} !important;
            color: ${s.textColor} !important;
        }

        /* ── Скроллбар ── */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.35); }
        `;
    }

    function getCachedThemeData() {
        try {
            const enabledStr = sessionStorage.getItem('foxen_theme_enabled') ?? localStorage.getItem('foxen_theme_enabled');
            const cacheStr = sessionStorage.getItem('foxen_theme_cache') ?? localStorage.getItem('foxen_theme_cache');
            const bgImage = sessionStorage.getItem('foxen_theme_bg_image') ?? localStorage.getItem('foxen_theme_bg_image');
            const enabled = enabledStr === null ? true : enabledStr !== '0';
            const theme = cacheStr ? JSON.parse(cacheStr) : null;
            if (theme && bgImage && !theme.bgImage) {
                theme.bgImage = bgImage;
            }
            return { enabled, theme, bgImage };
        } catch (_) {
            return { enabled: true, theme: null, bgImage: null };
        }
    }

    function setCachedThemeData(enabled, theme, bgImage) {
        try {
            sessionStorage.setItem('foxen_theme_enabled', enabled ? '1' : '0');
            localStorage.setItem('foxen_theme_enabled', enabled ? '1' : '0');
            if (bgImage !== undefined) {
                if (bgImage) {
                    sessionStorage.setItem('foxen_theme_bg_image', bgImage);
                    localStorage.setItem('foxen_theme_bg_image', bgImage);
                } else {
                    sessionStorage.removeItem('foxen_theme_bg_image');
                    localStorage.removeItem('foxen_theme_bg_image');
                }
            }
            if (theme) {
                const copy = { ...theme };
                delete copy.bgImage;
                const str = JSON.stringify(copy);
                sessionStorage.setItem('foxen_theme_cache', str);
                localStorage.setItem('foxen_theme_cache', str);
            }
        } catch (_) {}
    }

    function ensureStyle() {
        let el = document.getElementById(STYLE_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(el);
        }
        return el;
    }

    // Синхронное применение из кеша на document_start (0 мс)
    const cached = getCachedThemeData();
    if (cached.enabled !== false) {
        const s = { ...DEFAULTS, ...(cached.theme || {}), bgImage: cached.bgImage || cached.theme?.bgImage || null };
        manageFont(s.font);
        const styleEl = ensureStyle();
        styleEl.textContent = buildCss(s);
    }

    async function apply() {
        let data = {};
        try {
            const extApi = typeof browser !== 'undefined' ? browser : chrome;
            data = await extApi.storage.local.get([
                'enableCustomTheme',
                'foxenTheme',
                'foxenThemeBgImage',
                'foxenGlassBlur'
            ]);
        } catch { return; }

        const styleEl = ensureStyle();
        if (data.enableCustomTheme === false) {
            setCachedThemeData(false, null, null);
            styleEl.textContent = '';
            const f = document.getElementById(FONT_ID);
            if (f) f.textContent = '';
            return;
        }

        const bgImage = data.foxenThemeBgImage || data.foxenTheme?.bgImage || null;
        const glassBlur = data.foxenGlassBlur || data.foxenTheme?.glassmorphismBlur || 14;
        const s = {
            ...DEFAULTS,
            ...(data.foxenTheme || {}),
            bgImage,
            glassmorphismBlur: glassBlur
        };
        setCachedThemeData(true, s, bgImage);
        manageFont(s.font);
        styleEl.textContent = buildCss(s);

        // Перемещаем стиль в самый низ head, чтобы он гарантированно перебивал Bootstrap CSS
        if (document.head && styleEl.parentNode === document.head && styleEl.nextSibling) {
            document.head.appendChild(styleEl);
        }
    }

    function sanitizeInlineStyles() {
        try {
            document.querySelectorAll('[style*="background"], [style*="color"]').forEach(el => {
                const bg = el.style.backgroundColor || el.style.background;
                if (/white|#fff|#ffffff|rgb\(255,\s*255,\s*255\)/i.test(bg)) {
                    el.style.removeProperty('background');
                    el.style.removeProperty('background-color');
                }
                const color = el.style.color;
                if (/#000|#000000|rgb\(0,\s*0,\s*0\)|black/i.test(color)) {
                    el.style.removeProperty('color');
                }
            });
        } catch (_) {}
    }

    apply();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            apply();
            sanitizeInlineStyles();
            const el = document.getElementById(STYLE_ID);
            if (el && document.head && el.parentNode === document.head) {
                document.head.appendChild(el);
            }
        });
    } else {
        sanitizeInlineStyles();
    }

    // Периодическая проверка и очистка жестко прописанных inline-стилей
    if (typeof MutationObserver !== 'undefined') {
        let timer = null;
        const obs = new MutationObserver(() => {
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                sanitizeInlineStyles();
            }, 300);
        });
        obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (changes.foxenTheme || changes.foxenThemeBgImage || changes.enableCustomTheme || changes.foxenGlassBlur) {
                apply();
            }
        });
    }
})();

