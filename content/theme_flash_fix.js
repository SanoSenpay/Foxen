// content/theme_flash_fix.js
// Мгновенное применение темы и устранение белой вспышки (FOUC / flashbang) на FunPay.

(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    // Не применяем основной стиль к саппорту (у него отдельный support_theme.js)
    if (window.location && window.location.hostname === 'support.funpay.com') {
        return;
    }

    const HIDE_STYLE_ID = 'foxen-flash-hide-style';
    const THEME_STYLE_ID = 'foxen-custom-theme';
    const FONT_STYLE_ID = 'foxen-google-fonts';
    const DISABLED_FEATURES_STYLE_ID = 'foxen-disabled-features';
    const BALANCE_PREHIDE_STYLE_ID = 'foxen-balance-prehide';
    const LIVE_STYLES_ID = 'foxen-magic-stick-persistent-styles';

    const GOOGLE_FONTS = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro'];
    const DEFAULT_THEME = {
        bgColor1: '#ff6d15',
        bgColor2: '#f4cf78',
        containerBgColor: '#0b0b0b',
        containerBgOpacity: 1,
        textColor: '#f0f0f0',
        linkColor: '#2d6bb3',
        bgImage: null,
        font: 'Helvetica Neue',
        bgBlur: 0,
        bgBrightness: 100,
        borderRadius: 8,
        enableCircleCustomization: false,
        showCircles: true,
        circleSize: 100,
        circleOpacity: 100,
        circleBlur: 0,
        enableImprovedSeparators: false,
        headerPosition: 'top',
        enableGlassmorphism: false,
        glassmorphismBlur: 10,
        enableCustomScrollbar: false,
        scrollbarThumbColor: '#555555',
        scrollbarTrackColor: '#222222',
        scrollbarWidth: 8
    };

    const SELECTOR_MAP = {
        rmthub_seller_search: '#fp-rmthub-form',
        chat_ai_rewrite_btn: '#aiModeToggleBtn',
        chat_char_counter: '#fp-chat-char-count',
        profanity_warning: '#foxenProfanityWarning',
        chat_read_all_btn: '#foxen-read-all-btn',
        chat_filter_marked_btn: '#foxen-filter-marked-btn',
        chat_menu_buyer_history: '#fp-buyer-hist-menu-btn',
        chat_menu_translate: '#fp-translate-menu-btn',
        chat_menu_export: '#fp-export-chat-menu-btn',
        chat_menu_blacklist: '#fp-blacklist-menu-btn',
        chat_image_generator_btn: '#foxenGenerateImageBtn, .generate-btn-container',
        lot_ai_gen_btn: '#foxen-ai-gen-btn-wrapper',
        lot_font_controls: '.foxen-font-controls, .foxen-symbols-panel',
        lot_keyboard_btn: '#foxenKeyboardToggleBtn',
        lot_translate_btn: '#foxen-translate-btn',
        lot_exact_price_btn: '.set-exact-price',
        lot_paste_bar: '#foxen-paste-bar',
        lot_clone_btn: '.foxen-clone-btn',
        lot_import_btn: '.foxen-import-btn',
        lot_public_clone_btn: '#foxen-public-clone-btn',
        lot_search_bar: '#fp-lot-search-bar',
        lot_select_btn: '#foxen-select-lots-btn',
        lot_reactivate_btn: '#foxen-reactivate-lots-btn',
        lot_pinned_container: '#foxen-pinned-lots-container',
        market_analytics_btn: '#fpTools-market-analytics-btn-wrapper',
        sales_stats_expand: '#fpTools-stats-extra, #fpTools-stats-expand-btn',
        notes_add_status_btn: '#foxen-add-status-btn'
    };

    function hexToRgba(hex, alpha) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) {
            r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3];
        } else if (hex.length == 7) {
            r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6];
        }
        return `rgba(${+r},${+g},${+b},${alpha})`;
    }

    function isAnimatedBackground(bgImage, isExplicitAnim = false) {
        if (isExplicitAnim) return true;
        if (!bgImage) return false;
        const s = String(bgImage).toLowerCase();
        return s.startsWith('data:image/gif') ||
               s.includes('image/gif') ||
               s.includes('.gif') ||
               s.includes('r0lgod') ||
               s.includes('r0lht2') ||
               s.includes('base64,r0l') ||
               s.includes('image/webp') ||
               s.includes('.webp') ||
               s.includes('tenor.com') ||
               s.includes('giphy.com') ||
               s.includes('gfycat.com') ||
               s.includes('blob:');
    }

    function getCustomThemeCss(settings) {
        let cleanBg = (settings.bgImage || '').trim();
        let bgImageUrl;
        if (!cleanBg) {
            bgImageUrl = 'url("https://i.ibb.co/Kpm5M7gg/Foxen-BCKG.png")';
        } else if (cleanBg.startsWith('url(')) {
            bgImageUrl = cleanBg;
        } else {
            bgImageUrl = `url("${cleanBg.replace(/"/g, '\\"')}")`;
        }
        const containerBgRgba = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);

        const hasBlur = settings.bgBlur && parseFloat(settings.bgBlur) > 0;
        const hasBrightness = settings.bgBrightness !== undefined && parseFloat(settings.bgBrightness) !== 100;
        let filterParts = [];
        if (hasBlur) filterParts.push(`blur(${settings.bgBlur}px)`);
        if (hasBrightness) filterParts.push(`brightness(${settings.bgBrightness}%)`);
        const filterFallback = filterParts.length ? filterParts.join(' ') : 'none';

        let baseCss = `
            body::before {
                content: ''; position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
                background: ${bgImageUrl} no-repeat center center;
                background-size: cover;
                filter: var(--fxn-theme-bg-filter, ${filterFallback});
                -webkit-filter: var(--fxn-theme-bg-filter, ${filterFallback});
                z-index: -1;
                pointer-events: none;
            }
            html { background-color: #0b0b0b !important; color-scheme: dark !important; }
            body, body.bg-light-style, .wrapper, .bg-light-style .wrapper, .content-orders, .bg-light-style .content-orders, .bg-light-color #header, .bg-light-color #footer, .wrapper-footer, .bg-light-style .wrapper-footer, #footer, .bg-light-style #footer { background: transparent !important; }
            .wrapper-content, .bg-light-style .wrapper-content, .wrapper-footer, .bg-light-style .wrapper-footer { background: transparent !important; background-color: rgba(0,0,0,0.4) !important; }
            #header, .navbar-default, header, #header.navbar-default, .bg-light-style #header, .bg-light-style .navbar-default, .bg-light-color #header { background: rgba(0,0,0,0.08) !important; background-color: rgba(0,0,0,0.08) !important; border-color: rgba(228, 228, 228, 0.4) !important; }
            body { font-family: '${settings.font}', Helvetica Neue, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.428571429; color: #TEXT_COLOR# !important; }
            .profile-cover-img { background-clip: border-box; background: url(https://funpay.com/img/layout/profile-header.jpg) no-repeat center bottom; background-size: 100% auto; }
            .profile-cover { overflow: unset; }
            .media-user-name { color: #TEXT_COLOR# !important; }
            .media-user-name a { color: #fff !important; }
            .bg-light-color, .bg-light-style { background-color: transparent !important; }
            .game-title a { color: #ACCENT_COLOR# !important; text-decoration: none; }
            .navbar-right.logged .dropdown-menu { border-radius: 8px; }
            .user-link-name { color: #ACCENT_COLOR# !important; }
            .product-page .page-content { background-color: rgba(0,0,0,0.6) !important; border-radius: 10px; margin-top: 12px; margin-bottom: 20px; padding: 20px; }
            .chat-btn-image { background-color: transparent !important; border: 0px !important; color: #fff !important; }
            .chat-btn-image:hover, .chat-btn-image:focus { background-color: transparent !important; border: 0px !important; color: #fff !important; }
            .btn-default:active:hover, .btn-default:active:focus, .btn-default:active.focus, .btn-default.active:hover, .btn-default.active:focus, .btn-default.active.focus { color: #fff !important; background-color: transparent !important; border: 0px !important; }
            .fa-info-circle:before { filter: brightness(0) invert(1); }
            .chat-form-input .form-group { transform: translate(-10px); width: 103%; }
            .tc.table-hover .tc-item.transaction-status-waiting { background-color: #b17f2e94 !important; }
            .tc.table-hover .tc-item.transaction-status-waiting:hover { background-color: #b37f2abf !important; }
            .tc-finance .tc-header>div, .tc-finance .tc-item>div { border-bottom: #505050 1px solid !important; border-top: #505050 0px solid !important; }
            .tc.table-hover .tc-item.info { background-color: #1f508994 !important; }
            .tc.table-hover .tc-item.info:hover { background-color: #1f5089bf !important; }
            .tc.table-hover .tc-item:hover, .tc.table-hover a.tc-item:hover { background-color: #1b1b1b !important; }
            .navbar-default .navbar-nav>.active>a, .navbar-default .navbar-nav>.active>a:hover, .navbar-default .navbar-nav>.active>a:focus { color: #LINK_COLOR# !important; font-weight: 700; background-color: transparent !important; }
            .counter-list .counter-item { background: #14141480 !important; border: 0px solid #feff00; border-radius: 20px; outline: 0; }
            .content-with-cd-wide, .bg-light-style .content-with-cd-wide { background: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border-radius: 10px; }
            .content-with-cd:not(.content-with-cd-wide):not(.content-with-cd-narrow), .counter-list, .counter-list-wide { background: transparent !important; background-color: transparent !important; border: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; box-shadow: none !important; }
            a.tc-item { color: #TEXT_COLOR# !important; text-decoration: none; }
            .cd { position: relative; z-index: 100; border-radius: 50%; width: 700px; height: 700px; filter: brightness(.8); border: 0px; }
            a.cd-satellite { transform: translate(-25px); }
            .offer, .bg-light-style .offer { background: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; padding: 20px; border-radius: 10px; }
            .tc, .bg-light-style .tc { background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border-radius: 10px; }
            .tc-finance { border-top: 0px solid #322f34; border-bottom: #322f34 0px solid; border-left: #322f34 0px solid; border-right: #322f34 0px solid; border-radius: 10px; }
            .modal-content, .bg-light-style .modal-content { background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border: 0px solid #999; border-radius: 10px; -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, .5); box-shadow: 0 3px 9px #00000080; background-clip: padding-box; outline: 0; }
            label.control-label { color: #ffba4cc4 !important; }
            .counter-item { background: #0b0b0b90 !important; color: #TEXT_COLOR# !important; }
            .counter-item:hover, .counter-item:focus, .counter-item:active, .counter-item:active:hover { background: #0b0b0bad !important; color: #TEXT_COLOR# !important; }
            .counter-item.active { background: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; color: #fff !important; }
            .counter-item.active:hover, .counter-item.active:focus, .counter-item.active:active, .counter-item.active:active:hover { background: #101010 !important; color: #fff !important; }
            .form-control-box { background: transparent !important; border: 1px solid #fff; border-radius: 10px; }
            h5, .h5, .form-group>label { color: #fff !important; }
            .bootstrap-select .dropdown-menu.inner { background-color: #0f0f0f !important; }
            .lot-field .lot-field-radio-box button { background-color: #161617 !important; color: #fbfbfb !important; }
            .lot-field .lot-field-radio-box button:hover { color: #fff !important; background-color: #1b1b1b !important; }
            .btn-dark { background-color: #222 !important; border-radius: 10px; border-color: #fff; }
            .btn-gray:hover { background-color: #2a5590 !important; color: #fff !important; border-radius: 10px; border-color: #2a5590; }
            .chat-promo { border-radius: 10px; border: 0px; background: #00000073 !important; transform: translate(-10px); }
            .dropdown-menu { background-color: #0f0f0f !important; border-radius: 8px; }
            .navbar-default { border-color: #e4e4e466 !important; }
            .chat-form-btn .btn-round { background-color: #cbcbcb1f !important; color: #fff !important; border-radius: 100px; border: 0px; }
            .chat-form-btn .btn-round:hover { background-color: #3466a1 !important; color: #fff !important; }
            .chat-img { border-radius: 8px; }
            .btn-danger { border: 0px !important; border-radius: 8px; }
            .btn-gray { background-color: #3466a1 !important; border-radius: 8px; color: #fff !important; border: 0px; }
            .btn-primary, .bg-light-style .btn-primary { border: 0px solid #fff !important; border-radius: 8px; background-color: #PRIMARY_COLOR# !important; color: #fff !important; }
            .btn-primary:hover, .btn-primary:focus, .btn-primary:active, .btn-primary:active:hover, .btn-primary:active:focus, .btn-primary[disabled]:hover, .btn-primary[disabled]:focus, .btn-primary[disabled]:active, .btn-primary[disabled]:active:hover, .btn-primary[disabled]:active:focus { background-color: #1a3d6e !important; color: #fff !important; }
            .btn-default, .bg-light-style .btn-default { border: 0px solid #fff !important; border-radius: 8px; background-color: #PRIMARY_COLOR#60 !important; color: #fff !important; }
            .btn-default:hover, .btn-default:focus, .btn-default:active, .btn-default:active:hover, .btn-default:active:focus, .btn-default[disabled]:hover, .btn-default[disabled]:focus, .btn-default[disabled]:active, .btn-default[disabled]:active:hover, .btn-default[disabled]:active:focus { border: 0px solid #1e4f8700 !important; background-color: #PRIMARY_COLOR# !important; color: #fff !important; }
            .block-info { color: #ffffffd9 !important; }
            .navbar-form .form-control { background-color: transparent !important; }
            .logo-color, .footer-block-als { filter: brightness(0) invert(1) !important; }
            .nav-abc ul .active a, .nav-abc ul .active a:hover, .nav-abc ul .active a:focus { text-decoration: none; cursor: default; color: #ACCENT_COLOR# !important; }
            .nav-abc .nav>li>a:hover, .nav-abc .nav>li>a:focus { text-decoration: none; cursor: default; color: #ACCENT_COLOR# !important; }
            a:focus { text-decoration: none; cursor: default; color: #fff !important; }
            .list-inline>li:after { content: " ·"; color: #919191; }
            .media-user.style-circle .avatar-photo:after, .media-user.style-circle .avatar-photo::after { background: #20ff00 !important; border: 3px solid rgba(0, 0, 0, 0.34) !important; }
            .counter-list-wide { padding-bottom: 20px; padding-top: 20px; }
            .dropdown-menu>li+li, .dropdown-menu .dropdown-menu>li { border-top: #6a6a6a70 1px solid !important; border: 0px; }
            .dropdown-menu>li:first-child>a { border-radius: 8px 8px 0 0; }
            .dropdown-menu>li:last-child>a { border-radius: 0 0 8px 8px; }
            .navbar-nav>li>.dropdown-menu, .dropdown-menu, .nav-tabs .dropdown-menu { border-radius: 8px; }
            .navbar-default .navbar-nav>li>a:not(#foxenButton) { color: #TEXT_COLOR# !important; }
            .navbar-default .navbar-nav>li>a:not(#foxenButton):hover, .navbar-default .navbar-nav>li>a:not(#foxenButton):focus { color: #ddd !important; }
            #foxenButton { color: var(--fxn-btn-color, var(--fxn-accent, #c026d3)) !important; }
            #foxenButton::before { background: var(--fxn-btn-color, var(--fxn-accent, #c026d3)) !important; }
            .ajax-alert { border-radius: 10px; }
            .offer-tc-container { border-top: #ff0000 0px solid !important; }
            .tc:not(.tc-selling):not(.tc-finance) .tc-item>div { border-top: #505050 1px solid !important; }
            .review-container { border-top: #505050 1px solid !important; }
            a:hover { color: #ACCENT_COLOR# !important; text-decoration: underline; }
            a.tc-item:hover, a.tc-item:hover div, a.tc-item:hover .tc-desc-text, a.tc-item:hover .tc-server { color: #TEXT_COLOR# !important; text-decoration: none; }
            .panel, .bg-light-style .panel { background-color: #423e3e !important; }
            .contact-item:hover { background: #4040956b !important; }
            a { color: #LINK_COLOR#; text-decoration: none; }
            .panel-default>.panel-heading { background-color: #292929 !important; border-color: #2d2d2d61 !important; color: #ddd !important; }
            .tc.table-hover .tc-item, .bg-light-style .tc.table-hover .tc-item { background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; }
            .chat-not-selected .chat-message-container { border-top: 0px solid #fff !important; border-bottom: 0px solid #fff !important; }
            .chat-message-container { border-left: 0px solid #fff !important; border-right: 0px solid #fff !important; }
            .dropdown-menu>li>a:hover, .dropdown-menu>li>a:focus { color: #fff !important; background-color: #292828 !important; }
            .navbar-nav>li>.dropdown-menu>.active>a { background: #LINK_COLOR#85 !important; color: #fff !important; }
            .navbar-nav>li>.dropdown-menu>.active>a:hover { background: #LINK_COLOR#b5 !important; }
            .navbar-default .navbar-nav>.open>a, .navbar-default .navbar-nav>.open>a:hover, .navbar-default .navbar-nav>.open>a:focus { color: #LINK_COLOR# !important; }
            .btn-default:active, .btn-default.active, .open>.btn-default.dropdown-toggle { color: #4384d0 !important; background-color: #ff6c1130 !important; border-color: red !important; }
            .contact-item-message { color: #ffffff73 !important; }
            .contact-item.active { background: #6f6dff90 !important; color: #ffffffd4 !important; }
            .contact-item.active:hover, .contact-item.active:focus { background: #6f6dffb5 !important; }
            .contact-item.unread { background: #ff9d00a1 !important; }
            .contact-item.unread, .contact-item.unread .contact-item-message { color: #ffffffd4 !important; }
            .chat-form { border: #8924b100 0px solid !important; }
            .chat-form-input .form-control, .chat-form-input .hiddendiv { padding: 11px 10px 10px !important; background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border-radius: 10px; }
            .badge { display: inline-block; min-width: 20px; padding: 3px 5px 5px; font-size: 12px; font-weight: 500; color: #fff !important; line-height: 12px; vertical-align: middle; white-space: nowrap; text-align: center; background-color: #0b0b0b55 !important; border-radius: 10px; }
            .payment-card, .bg-light-style .payment-card { background: #0009 !important; padding: 20px; border-radius: 10px; margin: 12px 0; }
            .form-control, .bg-light-style .form-control { border: 1px solid rgba(255,255,255,0.15) !important; background-color: #060606 !important; color: #TEXT_COLOR# !important; border-radius: 10px; }
            .review-item-answer { display: inline-block; padding: 15px; background: #0f0f0f !important; border-radius: 10px; position: relative; color: #fff !important; }
            .setting-item .btn-gray { background-color: #LINK_COLOR# !important; color: #fff !important; border-radius: 8px; }
            .setting-item .btn-gray:hover, .setting-item .btn-gray:focus, .setting-item .btn-gray:active { background-color: #244f81 !important; color: #fff !important; }
            p { color: #ffffffd9 !important; }
            .btn-success { border-radius: 8px; border: 0px !important; }
            .drop-area { background-color: #1e1e1e !important; border-radius: 8px; color: #d3d3d3 !important; border: 1px solid #0f0f0f !important; }
            .drop-area.hover { background-color: #323232 !important; }
            .drop-area.error { background: #ff3434c7 !important; border: #f00 !important; color: #TEXT_COLOR# !important; }
            .btn-info { border-radius: 8px; background-color: #11a8d5 !important; border: 0px !important; margin-right: 5px; }
            .btn-warning { border-radius: 8px; background-color: #ffa002 !important; border: 0px !important; }
            .details, .form-narrow, .bg-light-style .details, .bg-light-style .form-narrow { background-color: #0009 !important; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
            .form-narrow .btn-block, .form-narrow .form-control, .form-narrow .input-group { background-color: #0f0f0f !important; border-radius: 8px; }
            .nav-tabs>li.active>a, .nav-tabs>li.active>a:hover, .nav-tabs>li.active>a:focus { color: #fff !important; background-color: transparent !important; }
            .nav-tabs>li>a { color: #b5b5b5 !important; }
            .lot-fields-multilingual .nav-tabs a { color: #b5b5b5 !important; }
            table.table-clickable tbody tr a { color: #14e6a4 !important; text-decoration: none; }
            table.table-clickable tbody tr a:hover { color: #fff !important; text-decoration: underline; }
            .caret { color: #888 !important; }
            .sort::after { color: #555 !important; }
            .bootstrap-select > .btn.dropdown-toggle, .bootstrap-select > .dropdown-toggle, .bootstrap-select .btn.btn-default.dropdown-toggle, .form-narrow .bootstrap-select .btn.dropdown-toggle, .form-narrow .bootstrap-select > .btn { background: #65a91a !important; background-color: #65a91a !important; border: 0px !important; border-radius: 8px !important; color: #fff !important; box-shadow: none !important; }
            .bootstrap-select > .btn.dropdown-toggle:hover, .bootstrap-select > .btn.dropdown-toggle:focus, .bootstrap-select > .btn.dropdown-toggle:active, .open > .bootstrap-select > .btn.dropdown-toggle, .open > .bootstrap-select > .btn { background: #589516 !important; background-color: #589516 !important; border: 0px !important; color: #fff !important; }
            .bootstrap-select .dropdown-toggle .filter-option { background: transparent !important; background-color: transparent !important; border: 0px !important; color: #fff !important; }
            .bootstrap-select .dropdown-toggle .caret, .bootstrap-select .dropdown-toggle .bs-caret, .bootstrap-select .dropdown-toggle span { color: #fff !important; border-top-color: #fff !important; }
            .has-feedback .form-control { border-radius: 8px; }
            .withdraw-box .slave { background-color: #303030 !important; border-radius: 8px; }
            .withdraw-box .slave:hover { background-color: #3e3e3e !important; border-radius: 8px; }
            .input-group .form-control:first-child, .input-group-addon:first-child, .input-group-btn:first-child>.btn, .input-group-btn:first-child>.btn-group>.btn, .input-group-btn:first-child>.dropdown-toggle, .input-group-btn:last-child>.btn:not(:last-child):not(.dropdown-toggle), .input-group-btn:last-child>.btn-group:not(:last-child)>.btn { border-radius: 10px 0 0 10px; }
            .btn-default.dropdown-toggle { color: #fff !important; border: 0px !important; background-color: #PRIMARY_COLOR# !important; }
            .btn-default.dropdown-toggle:hover, .btn-default.dropdown-toggle:focus, .btn-default.dropdown-toggle:active, .btn-default.dropdown-toggle:active:hover, .open>.btn-default.dropdown-toggle, .open>.btn-default.dropdown-toggle:hover, .open>.btn-default.dropdown-toggle:focus, .open>.btn-default.dropdown-toggle:active { color: #fff !important; border: 0px !important; background-color: #1a3d6e !important; }
            .form-control[disabled], .form-control[readonly], fieldset[disabled] .form-control { background-color: #484343 !important; }
            .payment-title { color: #fff !important; font-weight: bold; }
            .bootstrap-select .dropdown-menu>li>a { color: #b0b0b0 !important; }
            .bootstrap-select .dropdown-menu>.active>a, .bootstrap-select .dropdown-menu>.active>a:hover, .bootstrap-select .dropdown-menu>.active>a:focus { background-color: #1b1b1b !important; color: #82dd1e !important; }
            .chat-header { border: #bd59be00 0px solid !important; }
            .form-inline .form-control { background-color: #0f0f0f !important; border-radius: 8px; }
            .chat-contacts, .chat-detail { background: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border: #fff 0px solid !important; }
            .chat-contacts { border-radius: 10px 0 0 10px; }
            .chat-detail { border-radius: 0 10px 10px 0; }
            .chat, .chat-full .chat { background: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; background-color: var(--fxn-theme-container-bg, ${containerBgRgba}) !important; border-radius: 10px; }
            .contact-item { border-bottom: #fff 0px !important; }
            .chat-full-header { border-bottom: #fff 0px solid !important; }
            .chat-full .chat { border-bottom: 0px solid transparent !important; }
            .chat { border-top: 0px solid #fff !important; border-bottom: 0px solid transparent !important; }
            .alert-info { background-color: #709fdc3b !important; border-color: #709fdc !important; color: #fff !important; border-radius: 8px; }
            .alert-info, .alert-info .chat-msg-text, .alert-info .chat-msg-text * { color: #fff !important; }
            .alert-info a, .alert-info .chat-msg-text a { color: #LINK_COLOR# !important; }
            .fa-exclamation-circle:before { filter: brightness(0) invert(1); }
            .chat-message-list-date .inside { background-color: #0f0f0f !important; color: #fff !important; border-radius: 8px; }
            .custom-scroll::-webkit-scrollbar, .chat-message-list::-webkit-scrollbar, .chat-empty::-webkit-scrollbar, .chat-form-input .form-control::-webkit-scrollbar, .chat-form-input .hiddendiv::-webkit-scrollbar { background: #e600ff00; width: 5px; height: 10px; }
            .custom-scroll::-webkit-scrollbar-thumb, .chat-message-list::-webkit-scrollbar-thumb, .chat-empty::-webkit-scrollbar-thumb, .chat-form-input .form-control::-webkit-scrollbar-thumb, .chat-form-input .hiddendiv::-webkit-scrollbar-thumb { background: #1f1f2090; }
            .chat-form-input .form-control, .chat-form-input .hiddendiv { transform: translate(-10px); }
            .form-inline .form-control { background-color: #171718 !important; border-radius: 10px; }
            .theme-select { color: #d3cfc9 !important; background-color: #181a1b !important; background-image: none; border-color: #383c3f !important; box-shadow: #00000012 0 1px 1px inset; }
        `;

        let themedCss = baseCss
            .replace(/#PRIMARY_COLOR#60/gi, `${settings.bgColor1}60`)
            .replace(/#LINK_COLOR#85/gi, `${settings.linkColor}85`)
            .replace(/#LINK_COLOR#b5/gi, `${settings.linkColor}b5`)
            .replace(/#ff6d15/gi, `var(--fxn-theme-primary-color, ${settings.bgColor1})`)
            .replace(/#PRIMARY_COLOR#/gi, `var(--fxn-theme-primary-color, ${settings.bgColor1})`)
            .replace(/#f4cf78/gi, `var(--fxn-theme-accent-color, ${settings.bgColor2})`)
            .replace(/#ACCENT_COLOR#/gi, `var(--fxn-theme-accent-color, ${settings.bgColor2})`)
            .replace(/#f0f0f0/gi, `var(--fxn-theme-text-color, ${settings.textColor})`)
            .replace(/#TEXT_COLOR#/gi, `var(--fxn-theme-text-color, ${settings.textColor})`)
            .replace(/#2d6bb3/gi, `var(--fxn-theme-link-color, ${settings.linkColor})`)
            .replace(/#LINK_COLOR#/gi, `var(--fxn-theme-link-color, ${settings.linkColor})`);

        themedCss = themedCss.replace(/border-radius: \d+px/g, `border-radius: var(--fxn-theme-border-radius, ${settings.borderRadius}px)`);

        if (settings.enableCircleCustomization) {
            let circleCss = `.cd-container .cd, .corner-cd, .profile-cover-img {
                transition: transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease;
                transform: scale(${settings.circleSize / 100});
                filter: blur(${settings.circleBlur}px);
                opacity: ${settings.circleOpacity / 100};
            }`;
            if (!settings.showCircles) { circleCss += ` .cd-container { display: none !important; }`; }
            themedCss += circleCss;
        }
        if (settings.enableImprovedSeparators) {
            themedCss += `
                .tc:not(.tc-selling):not(.tc-finance) .tc-item > div { position: relative; border-top: none !important; }
                .tc:not(.tc-selling):not(.tc-finance) .tc-item > div::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: rgba(255, 255, 255, 0.2); filter: blur(2px); pointer-events: none; }
            `;
        }
        if (settings.enableGlassmorphism) {
            const opVal = (settings.containerBgOpacity !== undefined && parseFloat(settings.containerBgOpacity) < 1)
                ? parseFloat(settings.containerBgOpacity)
                : 0.75;
            const glassBg = hexToRgba(settings.containerBgColor || '#0b0b0b', opVal);
            const safeBlur = Math.min(30, Math.max(2, parseInt(settings.glassmorphismBlur, 10) || 12));
            themedCss += `
                #header, .navbar-default, header, #header.navbar-default, .bg-light-style #header, .bg-light-style .navbar-default {
                    background: ${glassBg} !important;
                    background-color: ${glassBg} !important;
                    backdrop-filter: blur(var(--fxn-theme-glass-blur, ${safeBlur}px)) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(var(--fxn-theme-glass-blur, ${safeBlur}px)) saturate(140%) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                }
                .offer, 
                .tc:not(.offer .tc), 
                .content-with-cd-wide, 
                .content-with-cd-narrow, 
                .modal-content, 
                .chat-contacts, 
                .chat-detail, 
                .chat, 
                .chat-full .chat,
                .chat-full,
                .fxn-chat-translate-banner,
                .dropdown-menu, 
                #fp-rmthub-drop,
                .fp-rmthub-drop,
                .panel, 
                .payment-card, 
                .details, 
                .form-narrow, 
                .user-card,
                .fxn-peek-panel {
                    background: ${glassBg} !important;
                    background-color: ${glassBg} !important;
                    backdrop-filter: blur(var(--fxn-theme-glass-blur, ${safeBlur}px)) saturate(140%) !important;
                    -webkit-backdrop-filter: blur(var(--fxn-theme-glass-blur, ${safeBlur}px)) saturate(140%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: var(--fxn-theme-border-radius, 10px) !important;
                    isolation: isolate !important;
                }
                .offer .tc,
                .offer .tc.table-hover,
                .tc .tc-header,
                .tc .tc-item,
                .tc.table-hover .tc-item,
                .bg-light-style .tc.table-hover .tc-item {
                    background: transparent !important;
                    background-color: transparent !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                }
                .tc.table-hover .tc-item:hover,
                .tc.table-hover a.tc-item:hover {
                    background-color: rgba(255, 255, 255, 0.06) !important;
                }
                .content-with-cd:not(.content-with-cd-wide):not(.content-with-cd-narrow),
                .counter-list,
                .counter-list-wide {
                    background: transparent !important;
                    background-color: transparent !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `;
        }
        if (settings.enableCustomScrollbar) {
            themedCss += `
                ::-webkit-scrollbar { width: ${settings.scrollbarWidth}px; }
                ::-webkit-scrollbar-track { background: ${settings.scrollbarTrackColor}; }
                ::-webkit-scrollbar-thumb { background: ${settings.scrollbarThumbColor}; border-radius: ${settings.scrollbarWidth}px; }
                ::-webkit-scrollbar-thumb:hover { background: ${settings.scrollbarThumbColor}CC; }
            `;
        }
        if (settings.headerPosition === 'bottom') {
            themedCss += `
                body { padding-bottom: 65px !important; padding-top: 0 !important; }
                #header { top: auto !important; bottom: 0 !important; border-top: 1px solid #e4e4e4; border-bottom: none !important; position: fixed; width: 100%; z-index: 1040; }
                .navbar-default { border-color: rgba(0,0,0,0) !important; }
                #header .navbar-default { border-top: 1px solid #e4e4e466; border-bottom: none !important; }
                #header .dropup .dropdown-menu, #header .dropdown-menu { top: auto !important; bottom: calc(100% - 1px); margin-top: 0; margin-bottom: 7px; box-shadow: 0 -4px 12px rgba(0,0,0,.175); }
                .navbar-form .dropdown-autocomplete { top: auto !important; bottom: 100% !important; border-bottom: none !important; border-top: 1px solid #e4e4e4 !important; box-shadow: 0 -4px 12px rgba(0,0,0,.175); border-radius: 4px 4px 0 0; }
                @media (max-width: 991px) {
                    #navbar.in, #navbar.collapsing { top: auto; bottom: 100%; position: absolute; right: 1px; left: auto; width: 240px; margin-bottom: 12px; border-radius: 4px; }
                    .navbar-collapse { max-height: calc(100vh - 80px); }
                }
            `;
        }
        return themedCss;
    }

    function manageFontImports(settings) {
        if (document.getElementById(FONT_STYLE_ID)) return;
        const font = settings.font;
        const isGoogleFont = GOOGLE_FONTS.includes(font);
        if (isGoogleFont) {
            const styleEl = document.createElement('style');
            styleEl.id = FONT_STYLE_ID;
            styleEl.textContent = `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap');`;
            (document.head || document.documentElement).appendChild(styleEl);
        }
    }

    function getTargetParent() {
        return document.head || document.documentElement;
    }

    function ensureStyle(id) {
        let el = document.getElementById(id);
        const parent = getTargetParent();
        if (!el) {
            el = document.createElement('style');
            el.id = id;
            if (parent) parent.appendChild(el);
        } else if (document.head && el.parentNode !== document.head) {
            document.head.appendChild(el);
        }
        return el;
    }

    function getCachedThemeData() {
        try {
            const enabledStr = sessionStorage.getItem('foxen_theme_enabled') ?? localStorage.getItem('foxen_theme_enabled');
            const cacheStr = sessionStorage.getItem('foxen_theme_cache') ?? localStorage.getItem('foxen_theme_cache');
            const accent = sessionStorage.getItem('foxen_accent_color') ?? localStorage.getItem('foxen_accent_color');
            const glass = sessionStorage.getItem('foxen_glass_blur') ?? localStorage.getItem('foxen_glass_blur');
            const popupTheme = sessionStorage.getItem('foxen_popup_theme') ?? localStorage.getItem('foxen_popup_theme');
            const enabled = enabledStr === null ? true : enabledStr !== '0';
            const theme = cacheStr ? JSON.parse(cacheStr) : null;
            return { enabled, theme, accent, glass, popupTheme };
        } catch (_) {
            return { enabled: true, theme: null, accent: null, glass: null, popupTheme: null };
        }
    }

    function setCachedThemeData(enabled, theme) {
        try {
            sessionStorage.setItem('foxen_theme_enabled', enabled ? '1' : '0');
            localStorage.setItem('foxen_theme_enabled', enabled ? '1' : '0');
            if (theme) {
                const copy = { ...theme };
                delete copy.bgImage;
                const str = JSON.stringify(copy);
                sessionStorage.setItem('foxen_theme_cache', str);
                localStorage.setItem('foxen_theme_cache', str);
            }
        } catch (_) {}
    }

    function removeHideStyle() {
        const hideEl = document.getElementById(HIDE_STYLE_ID);
        if (hideEl) hideEl.remove();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. СИНХРОННЫЙ ЩИТ (0 мс, прямо на document_start, БЕЗ await)
    // ──────────────────────────────────────────────────────────────────────────
    const cached = getCachedThemeData();
    const isThemeOn = cached.enabled !== false;

    if (document.documentElement) {
        document.documentElement.classList.toggle('fxn-custom-theme-on', isThemeOn);
        document.documentElement.classList.toggle('fxn-custom-theme-off', !isThemeOn);
        if (cached.accent) {
            document.documentElement.style.setProperty('--fxn-accent', cached.accent);
            document.documentElement.style.setProperty('--fxn-active', cached.accent);
            document.documentElement.style.setProperty('--fxn-btn-color', cached.accent);
        }
        if (cached.glass) {
            document.documentElement.style.setProperty('--fxn-glass-blur', `${cached.glass}px`);
        }
        if (cached.popupTheme) {
            document.documentElement.setAttribute('data-fxn-popup-theme', cached.popupTheme);
            document.documentElement.classList.toggle('fxn-popup-theme-light', cached.popupTheme === 'light');
            document.documentElement.classList.toggle('fxn-popup-theme-dark', cached.popupTheme === 'dark');
            document.documentElement.classList.toggle('fxn-popup-theme-transparent', cached.popupTheme === 'transparent');
        }
    }

    if (isThemeOn) {
        // Устанавливаем мгновенный тёмный холст на html и скрываем пока не применятся стили
        const hideStyle = ensureStyle(HIDE_STYLE_ID);
        hideStyle.textContent = `
            html {
                background-color: #0b0b0b !important;
                color-scheme: dark !important;
            }
            html:not(.fxn-custom-theme-off) body {
                background-color: #0b0b0b !important;
            }
        `;

        // Если есть кеш темы или берем DEFAULT_THEME - СИНХРОННО внедряем стили
        const initialSettings = { ...DEFAULT_THEME, ...(cached.theme || {}) };
        manageFontImports(initialSettings);

        const filterParts = [];
        if (initialSettings.bgBlur && parseFloat(initialSettings.bgBlur) > 0) filterParts.push(`blur(${initialSettings.bgBlur}px)`);
        if (initialSettings.bgBrightness !== undefined && parseFloat(initialSettings.bgBrightness) !== 100) filterParts.push(`brightness(${initialSettings.bgBrightness}%)`);
        let containerBgRgba = hexToRgba(initialSettings.containerBgColor, initialSettings.containerBgOpacity);
        if (initialSettings.enableGlassmorphism) {
            const opVal = (initialSettings.containerBgOpacity !== undefined && parseFloat(initialSettings.containerBgOpacity) < 1)
                ? parseFloat(initialSettings.containerBgOpacity)
                : 0.75;
            containerBgRgba = hexToRgba(initialSettings.containerBgColor || '#0b0b0b', opVal);
        }

        const rootStyle = document.documentElement?.style;
        if (rootStyle) {
            rootStyle.setProperty('--fxn-theme-container-bg', containerBgRgba);
            rootStyle.setProperty('--fxn-theme-bg-filter', filterParts.length ? filterParts.join(' ') : 'none');
            rootStyle.setProperty('--fxn-theme-border-radius', `${initialSettings.borderRadius ?? 8}px`);
            rootStyle.setProperty('--fxn-theme-text-color', initialSettings.textColor || '#f0f0f0');
            rootStyle.setProperty('--fxn-theme-accent-color', initialSettings.bgColor2 || '#f4cf78');
            rootStyle.setProperty('--fxn-theme-primary-color', initialSettings.bgColor1 || '#ff6d15');
            rootStyle.setProperty('--fxn-theme-link-color', initialSettings.linkColor || '#2d6bb3');
            const safeBlur = Math.min(30, Math.max(2, parseInt(initialSettings.glassmorphismBlur, 10) || 12));
            rootStyle.setProperty('--fxn-theme-glass-blur', `${safeBlur}px`);
            rootStyle.setProperty('--fxn-glass-blur', `${safeBlur}px`);
        }
        document.documentElement.classList.toggle('fxn-glass-enabled', !!initialSettings.enableGlassmorphism);

        const themeStyle = ensureStyle(THEME_STYLE_ID);
        themeStyle.textContent = getCustomThemeCss(initialSettings);
    }

    // Перемещаем стили в head когда он будет готов, чтобы они были в самом низу каскада
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const themeEl = document.getElementById(THEME_STYLE_ID);
            if (themeEl && document.head && themeEl.parentNode !== document.head) {
                document.head.appendChild(themeEl);
            }
        });
    }

    // Защитный таймаут: гарантируем, что пре-хайд удалится в любом случае через 1 сек
    const safetyTimer = setTimeout(removeHideStyle, 1000);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. АСИНХРОННАЯ СВЕРКА С ХРАНИЛИЩЕМ (ОДИН вызов chrome.storage.local.get)
    // ──────────────────────────────────────────────────────────────────────────
    (async () => {
        try {
            const extApi = typeof browser !== 'undefined' ? browser : chrome;
            if (!extApi || !extApi.storage || !extApi.storage.local) {
                removeHideStyle();
                return;
            }

            const data = await extApi.storage.local.get([
                'enableCustomTheme',
                'foxenTheme',
                'foxenThemeBgImage',
                'foxenThemeBgIsAnimated',
                'hideBalance',
                'foxenDisabledFeatures',
                'foxenLiveStyles',
                'foxenPopupTheme',
                'foxenAccentColor',
                'foxenGlassBlur',
                'foxenHeaderButtonStyles'
            ]);

            const enableCustomTheme = data.enableCustomTheme !== false;
            const bgImage = data.foxenThemeBgImage || data.foxenTheme?.bgImage || null;
            const isAnim = !!data.foxenThemeBgIsAnimated || isAnimatedBackground(bgImage);
            const settings = { ...DEFAULT_THEME, ...(data.foxenTheme || {}), bgImage };

            // Обновляем кеш
            setCachedThemeData(enableCustomTheme, settings);

            const popupTheme = data.foxenPopupTheme || (data.foxenTheme?.menuTransparent ? 'transparent' : (cached.popupTheme || 'dark'));
            const accentColor = data.foxenAccentColor || data.foxenHeaderButtonStyles?.color || cached.accent || '#c026d3';
            const glassBlur = data.foxenGlassBlur || cached.glass || 16;

            try {
                sessionStorage.setItem('foxen_accent_color', accentColor);
                localStorage.setItem('foxen_accent_color', accentColor);
                sessionStorage.setItem('foxen_glass_blur', String(glassBlur));
                localStorage.setItem('foxen_glass_blur', String(glassBlur));
                sessionStorage.setItem('foxen_popup_theme', popupTheme);
                localStorage.setItem('foxen_popup_theme', popupTheme);
            } catch (_) {}

            if (document.documentElement) {
                document.documentElement.classList.toggle('fxn-custom-theme-on', enableCustomTheme);
                document.documentElement.classList.toggle('fxn-custom-theme-off', !enableCustomTheme);
                document.documentElement.classList.toggle('fxn-animated-bg', enableCustomTheme && !!isAnim);
                document.documentElement.setAttribute('data-fxn-popup-theme', popupTheme);
                document.documentElement.classList.toggle('fxn-popup-theme-light', popupTheme === 'light');
                document.documentElement.classList.toggle('fxn-popup-theme-dark', popupTheme === 'dark');
                document.documentElement.classList.toggle('fxn-popup-theme-transparent', popupTheme === 'transparent');

                document.documentElement.style.setProperty('--fxn-accent', accentColor);
                document.documentElement.style.setProperty('--fxn-active', accentColor);
                document.documentElement.style.setProperty('--fxn-btn-color', accentColor);
                document.documentElement.style.setProperty('--fxn-glass-blur', `${glassBlur}px`);
            }
            if (document.body) {
                document.body.classList.toggle('fxn-animated-bg', enableCustomTheme && !!isAnim);
            }

            if (!enableCustomTheme) {
                const existingTheme = document.getElementById(THEME_STYLE_ID);
                if (existingTheme) existingTheme.remove();
                const rootStyle = document.documentElement?.style;
                if (rootStyle) {
                    rootStyle.removeProperty('--fxn-theme-container-bg');
                    rootStyle.removeProperty('--fxn-theme-bg-filter');
                    rootStyle.removeProperty('--fxn-theme-border-radius');
                    rootStyle.removeProperty('--fxn-theme-text-color');
                    rootStyle.removeProperty('--fxn-theme-accent-color');
                    rootStyle.removeProperty('--fxn-theme-primary-color');
                    rootStyle.removeProperty('--fxn-theme-link-color');
                }
                removeHideStyle();
            } else {
                manageFontImports(settings);
                const filterParts = [];
                if (settings.bgBlur && parseFloat(settings.bgBlur) > 0) filterParts.push(`blur(${settings.bgBlur}px)`);
                if (settings.bgBrightness !== undefined && parseFloat(settings.bgBrightness) !== 100) filterParts.push(`brightness(${settings.bgBrightness}%)`);
                let containerBgRgba = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);
                if (settings.enableGlassmorphism) {
                    const opVal = (settings.containerBgOpacity !== undefined && parseFloat(settings.containerBgOpacity) < 1)
                        ? parseFloat(settings.containerBgOpacity)
                        : 0.75;
                    containerBgRgba = hexToRgba(settings.containerBgColor || '#0b0b0b', opVal);
                }

                const rootStyle = document.documentElement?.style;
                if (rootStyle) {
                    rootStyle.setProperty('--fxn-theme-container-bg', containerBgRgba);
                    rootStyle.setProperty('--fxn-theme-bg-filter', filterParts.length ? filterParts.join(' ') : 'none');
                    rootStyle.setProperty('--fxn-theme-border-radius', `${settings.borderRadius ?? 8}px`);
                    rootStyle.setProperty('--fxn-theme-text-color', settings.textColor || '#f0f0f0');
                    rootStyle.setProperty('--fxn-theme-accent-color', settings.bgColor2 || '#f4cf78');
                    rootStyle.setProperty('--fxn-theme-primary-color', settings.bgColor1 || '#ff6d15');
                    rootStyle.setProperty('--fxn-theme-link-color', settings.linkColor || '#2d6bb3');
                    const safeBlur = Math.min(30, Math.max(2, parseInt(settings.glassmorphismBlur, 10) || 12));
                    rootStyle.setProperty('--fxn-theme-glass-blur', `${safeBlur}px`);
                    rootStyle.setProperty('--fxn-glass-blur', `${safeBlur}px`);
                }
                document.documentElement.classList.toggle('fxn-glass-enabled', !!settings.enableGlassmorphism);
                if (document.body) document.body.classList.toggle('fxn-glass-enabled', !!settings.enableGlassmorphism);

                const themeStyle = ensureStyle(THEME_STYLE_ID);
                const newCss = getCustomThemeCss(settings);
                if (themeStyle.textContent !== newCss) {
                    themeStyle.textContent = newCss;
                }
            }

            // Маскировка баланса
            if (data.hideBalance === true) {
                const balStyle = ensureStyle(BALANCE_PREHIDE_STYLE_ID);
                balStyle.textContent = `
                    .badge-balance, .balances-value {
                        color: transparent !important;
                        text-shadow: none !important;
                    }
                    .badge-balance::after { content: '••••'; color: #9099b8; }
                `;
            }

            // Отключенные функции
            const disabled = Array.isArray(data.foxenDisabledFeatures) ? data.foxenDisabledFeatures : [];
            if (disabled.length) {
                const selectors = disabled.map(id => SELECTOR_MAP[id]).filter(Boolean);
                if (selectors.length) {
                    const offStyle = ensureStyle(DISABLED_FEATURES_STYLE_ID);
                    offStyle.textContent = selectors.join(', ') + ' { display: none !important; }';
                }
            }

            // MagicStick live styles
            const savedStyles = data.foxenLiveStyles;
            if (savedStyles && typeof savedStyles === 'object' && Object.keys(savedStyles).length > 0) {
                let cssText = '';
                for (const selector in savedStyles) {
                    cssText += `${selector} {\n`;
                    for (const prop in savedStyles[selector]) {
                        cssText += `  ${prop}: ${savedStyles[selector][prop]} !important;\n`;
                    }
                    cssText += '}\n';
                }
                if (cssText) {
                    const liveStyleEl = ensureStyle(LIVE_STYLES_ID);
                    liveStyleEl.textContent = cssText;
                }
            }

            try {
                const extApi = typeof browser !== 'undefined' ? browser : chrome;
                if (extApi?.storage?.onChanged) {
                    extApi.storage.onChanged.addListener((changes, area) => {
                        if (area !== 'local') return;
                        const root = document.documentElement;
                        if (!root) return;

                        if (changes.foxenPopupTheme) {
                            const newTheme = changes.foxenPopupTheme.newValue || 'dark';
                            try {
                                sessionStorage.setItem('foxen_popup_theme', newTheme);
                                localStorage.setItem('foxen_popup_theme', newTheme);
                            } catch (_) {}
                            root.setAttribute('data-fxn-popup-theme', newTheme);
                            root.classList.toggle('fxn-popup-theme-light', newTheme === 'light');
                            root.classList.toggle('fxn-popup-theme-dark', newTheme === 'dark');
                            root.classList.toggle('fxn-popup-theme-transparent', newTheme === 'transparent');
                            document.dispatchEvent(new CustomEvent('foxenThemeChanged', { detail: { theme: newTheme } }));
                        }
                        if (changes.foxenAccentColor || changes.foxenHeaderButtonStyles) {
                            const newAccent = changes.foxenAccentColor?.newValue || changes.foxenHeaderButtonStyles?.newValue?.color;
                            if (newAccent) {
                                try {
                                    sessionStorage.setItem('foxen_accent_color', newAccent);
                                    localStorage.setItem('foxen_accent_color', newAccent);
                                } catch (_) {}
                                root.style.setProperty('--fxn-accent', newAccent);
                                root.style.setProperty('--fxn-active', newAccent);
                                root.style.setProperty('--fxn-btn-color', newAccent);
                                document.dispatchEvent(new CustomEvent('foxenThemeChanged', { detail: { accent: newAccent } }));
                            }
                        }
                        if (changes.foxenGlassBlur) {
                            const newBlur = changes.foxenGlassBlur.newValue || 16;
                            try {
                                sessionStorage.setItem('foxen_glass_blur', String(newBlur));
                                localStorage.setItem('foxen_glass_blur', String(newBlur));
                            } catch (_) {}
                            root.style.setProperty('--fxn-glass-blur', `${newBlur}px`);
                        }
                    });
                }
            } catch (_) {}
        } catch (error) {
            console.error('[Foxen] theme_flash_fix error:', error);
        } finally {
            clearTimeout(safetyTimer);
            requestAnimationFrame(removeHideStyle);
        }
    })();
})();