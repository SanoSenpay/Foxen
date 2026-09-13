let bottomBarObserver = null;
const BOTTOM_BAR_STYLE_ID = 'foxen-bottom-bar-style';
const THEME_OVERRIDE_STYLE_ID = 'foxen-theme-override';

function applyDropupClassForBottomBar() {
    const dropdowns = document.querySelectorAll('#header .navbar-nav > li.dropdown');
    dropdowns.forEach(dd => {
        dd.classList.add('dropup');
    });
    const mobileDropdowns = document.querySelectorAll('#navbar li.dropdown');
     mobileDropdowns.forEach(dd => {
        dd.classList.add('dropup');
    });
}

function enableBottomBar() {
    if (document.getElementById(BOTTOM_BAR_STYLE_ID)) return;

    const styleEl = document.createElement('style');
    styleEl.id = BOTTOM_BAR_STYLE_ID;
    styleEl.textContent = `
        body { padding-bottom: 65px !important; padding-top: 0 !important; }
        #header { top: auto !important; bottom: 0 !important; border-top: 1px solid #e4e4e4; border-bottom: none !important; position: fixed; width: 100%; z-index: 1040; }
        .navbar-default { border-color: rgba(0,0,0,0) !important; }
        #header .navbar-default { border-top: 1px solid #e4e4e466; border-bottom: none !important; }
        #header .dropup .dropdown-menu { top: auto !important; bottom: calc(100% - 1px); margin-top: 0; margin-bottom: 7px; box-shadow: 0 -4px 12px rgba(0,0,0,.175); border-radius: 4px; }
        .navbar-form .dropdown-autocomplete { top: auto !important; bottom: 100% !important; border-bottom: none !important; border-top: 1px solid #e4e4e4 !important; box-shadow: 0 -4px 12px rgba(0,0,0,.175); border-radius: 4px 4px 0 0; }
        @media (max-width: 991px) {
            #navbar.in, #navbar.collapsing { top: auto; bottom: 100%; position: absolute; right: 1px; left: auto; width: 240px; margin-bottom: 12px; border-radius: 4px; }
            .navbar-collapse { max-height: calc(100vh - 80px); }
        }
    `;
    document.head.appendChild(styleEl);

    applyDropupClassForBottomBar();

    bottomBarObserver = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' && document.querySelector('#header li.dropdown:not(.dropup)')) {
                applyDropupClassForBottomBar();
            }
        }
    });

    const ensureHeaderExists = setInterval(() => {
        const header = document.getElementById('header');
        if (header) {
            clearInterval(ensureHeaderExists);
            applyDropupClassForBottomBar();
            bottomBarObserver.observe(header, { childList: true, subtree: true });
        }
    }, 100);
}

function disableBottomBar() {
    const styleEl = document.getElementById(BOTTOM_BAR_STYLE_ID);
    if (styleEl) styleEl.remove();

    document.body.style.paddingBottom = '';

    if (bottomBarObserver) {
        bottomBarObserver.disconnect();
        bottomBarObserver = null;
    }

    const dropdowns = document.querySelectorAll('#header .dropup');
    dropdowns.forEach(dd => dd.classList.remove('dropup'));
}

async function applyHeaderPosition() {
    const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenTheme']);
    const position = foxenTheme.headerPosition || 'top';

    if (position === 'bottom') {
        enableBottomBar();
    } else {
        disableBottomBar();
    }
}

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
    scrollbarWidth: 8,
    // Прозрачное меню Foxen
    menuTransparent: false,
    menuTintColor: '#2a1033',   // тёмно-пурпурный
    menuOpacity: 3,             // %
    menuBlurEnabled: true,
    menuBlur: 8,                // px
    scrimBlurEnabled: true,     // размытие страницы под затемнением
    // Контур тексту
    textOutlineEnabled: false,
    textOutlineColor: '#000000',
    textOutlineWidth: 1         // px
};

function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(42, 16, 51, ${alpha})`;
    let c = hex.trim();
    if (c.startsWith('var(')) return c;
    if (c.startsWith('rgb')) return c.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    if (c.startsWith('#')) {
        let r = 0, g = 0, b = 0;
        if (c.length === 4) {
            r = parseInt(c[1] + c[1], 16);
            g = parseInt(c[2] + c[2], 16);
            b = parseInt(c[3] + c[3], 16);
        } else if (c.length === 7) {
            r = parseInt(c.slice(1, 3), 16);
            g = parseInt(c.slice(3, 5), 16);
            b = parseInt(c.slice(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
}

function manageFontImports(settings) {
    const fontStyleId = 'foxen-google-fonts';
    let styleEl = document.getElementById(fontStyleId);
    const font = settings.font;
    const isGoogleFont = GOOGLE_FONTS.includes(font);
    const newContent = isGoogleFont ? `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap');` : '';

    if (!styleEl) {
        styleEl = createElement('style', { id: fontStyleId });
        document.head.appendChild(styleEl);
    }

    if (styleEl.textContent !== newContent) {
        styleEl.textContent = newContent;
    }
}

function getCustomThemeCss(settings) {
    const bgImageUrl = settings.bgImage ? `url(${settings.bgImage})` : 'url(https://i.ibb.co/Kpm5M7gg/Foxen-BCKG.png)';
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
        .media-user.style-circle .avatar-photo:after { background: #a6a6a6 !important; border: 3px solid var(--fxn-theme-container-bg, ${containerBgRgba}) !important; }
        .counter-list-wide { padding-bottom: 20px; padding-top: 20px; }
        .dropdown-menu>li+li, .dropdown-menu .dropdown-menu>li { border-top: #6a6a6a70 1px solid !important; border: 0px; }
        .dropdown-menu>li:first-child>a { border-radius: 8px 8px 0 0; }
        .dropdown-menu>li:last-child>a { border-radius: 0 0 8px 8px; }
        .navbar-nav>li>.dropdown-menu, .dropdown-menu, .nav-tabs .dropdown-menu { border-radius: 8px; }
        .navbar-default .navbar-nav>li>a { color: #TEXT_COLOR# !important; }
        .navbar-default .navbar-nav>li>a:hover, .navbar-default .navbar-nav>li>a:focus { color: #ddd !important; }
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
        .bootstrap-select .dropdown-toggle .filter-option { background: #65a91a !important; height: 100%; width: 100%; border: 0px #fff solid; border-radius: 8px; color: #fff !important; }
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
        .chat-contacts, .chat-detail { background: #0009 !important; border: #fff 0px solid !important; }
        .chat-contacts { border-radius: 10px 0 0 10px; }
        .chat-detail { border-radius: 0 10px 10px 0; }
        .chat { background: #0009 !important; border-radius: 10px; }
        .contact-item { border-bottom: #fff 0px !important; }
        .chat-full-header { border-bottom: #fff 0px solid !important; }
        .chat-full .chat { border-bottom: 0px solid #fff !important; background-color: #0009 !important; border-radius: 0; }
        .chat { border-top: 0px solid #fff !important; border-bottom: 0px solid #90f !important; }
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
        if (!settings.showCircles) {
            circleCss += ` .cd-container { display: none !important; }`;
        }
        themedCss += circleCss;
    }

    if (settings.enableImprovedSeparators) {
        themedCss += `
            .tc:not(.tc-selling):not(.tc-finance) .tc-item > div {
                position: relative;
                border-top: none !important;
            }
            .tc:not(.tc-selling):not(.tc-finance) .tc-item > div::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 1px;
                background: rgba(255, 255, 255, 0.2);
                filter: blur(2px);
                pointer-events: none;
            }
        `;
    }

    if (settings.enableGlassmorphism) {
        const glassBg = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);
        const safeBlur = Math.min(16, Math.max(0, parseInt(settings.glassmorphismBlur, 10) || 10));
        themedCss += `
            .offer, .tc {
                background: ${glassBg} !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            .modal-content, .chat-contacts, .chat-detail, .chat, .dropdown-menu, .panel, .content-with-cd-wide, .payment-card, .details, .form-narrow {
                background: ${glassBg} !important;
                backdrop-filter: blur(${safeBlur}px);
                -webkit-backdrop-filter: blur(${safeBlur}px);
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
        `;
    }

    if (settings.enableCustomScrollbar) {
        themedCss += `
            ::-webkit-scrollbar {
                width: ${settings.scrollbarWidth}px;
            }
            ::-webkit-scrollbar-track {
                background: ${settings.scrollbarTrackColor};
            }
            ::-webkit-scrollbar-thumb {
                background: ${settings.scrollbarThumbColor};
                border-radius: ${settings.scrollbarWidth}px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: ${settings.scrollbarThumbColor}CC; 
            }
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

function isAnimatedBackground(bgImage, isExplicitAnim = false) {
    if (isExplicitAnim) return true;
    if (!bgImage) return false;
    const s = String(bgImage).toLowerCase();
    return s.startsWith('data:image/gif') ||
           s.includes('image/gif') ||
           s.includes('.gif') ||
           s.includes('r0lgod') || // GIF89a base64
           s.includes('r0lht2') || // GIF87a base64
           s.includes('base64,r0l') ||
           s.includes('image/webp') ||
           s.includes('.webp') ||
           s.includes('tenor.com') ||
           s.includes('giphy.com') ||
           s.includes('gfycat.com') ||
           s.includes('blob:');
}

async function migrateBgImageStorage() {
    try {
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        const data = await ext.storage.local.get(['foxenTheme', 'foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
        if (data.foxenTheme && data.foxenTheme.bgImage) {
            const bg = data.foxenTheme.bgImage;
            const isAnim = isAnimatedBackground(bg);
            const cleanedTheme = { ...data.foxenTheme };
            delete cleanedTheme.bgImage;
            await ext.storage.local.set({
                foxenThemeBgImage: bg,
                foxenThemeBgIsAnimated: isAnim,
                foxenTheme: cleanedTheme
            });
        }
    } catch (_) {}
}
migrateBgImageStorage();

async function applyCustomTheme() {
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    const { enableCustomTheme = true, foxenTheme = {}, foxenThemeBgImage, foxenThemeBgIsAnimated } = await ext.storage.local.get(['enableCustomTheme', 'foxenTheme', 'foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
    const bgImage = foxenThemeBgImage || foxenTheme.bgImage || null;
    let styleEl = document.getElementById('foxen-custom-theme');
    let overrideStyleEl = document.getElementById(THEME_OVERRIDE_STYLE_ID);
    const flashFixStyle = document.getElementById('foxen-flash-fix');

    // Контур тексту работает независимо от кастомной темы.
    applyFptTextOutline({ ...DEFAULT_THEME, ...foxenTheme });

    if (!enableCustomTheme) {
        try {
            sessionStorage.setItem('foxen_theme_enabled', '0');
            localStorage.setItem('foxen_theme_enabled', '0');
        } catch (_) {}
        document.documentElement.classList.remove('fxn-custom-theme-on');
        document.documentElement.classList.add('fxn-custom-theme-off');
        document.documentElement.classList.remove('fxn-animated-bg');
        if (document.body) document.body.classList.remove('fxn-animated-bg');
        const popup = document.querySelector('.foxen-popup');
        if (popup) popup.classList.remove('fxn-animated-bg');
        if (styleEl) styleEl.remove();
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
        manageFontImports({font: 'Helvetica Neue'});
        if (!overrideStyleEl) {
            overrideStyleEl = document.createElement('style');
            overrideStyleEl.id = THEME_OVERRIDE_STYLE_ID;
            document.head.appendChild(overrideStyleEl);
        }
        overrideStyleEl.textContent = `
            .fp-stats-header h1, .stat-card-value, .detail-value { color: #111 !important; }
            .stat-card-label, .detail-label { color: #555 !important; }
        `;
        if (flashFixStyle) flashFixStyle.remove();
        if (typeof fxnApplyThemeVars === 'function') {
            requestAnimationFrame(() => { try { fxnApplyThemeVars(); } catch (_) {} });
            setTimeout(() => { try { fxnApplyThemeVars(); } catch (_) {} }, 120);
            setTimeout(() => { try { fxnApplyThemeVars(); } catch (_) {} }, 400);
        }
        return;
    }
    
    if (overrideStyleEl) {
        overrideStyleEl.remove();
    }
    document.documentElement.classList.add('fxn-custom-theme-on');
    document.documentElement.classList.remove('fxn-custom-theme-off');

    const settings = { ...DEFAULT_THEME, ...foxenTheme, bgImage };
    window._foxenThemeSettings = settings;

    const isAnim = isAnimatedBackground(settings.bgImage, !!foxenThemeBgIsAnimated);
    document.documentElement.classList.toggle('fxn-animated-bg', !!isAnim);
    if (document.body) document.body.classList.toggle('fxn-animated-bg', !!isAnim);
    const popup = document.querySelector('.foxen-popup');
    if (popup) popup.classList.toggle('fxn-animated-bg', !!isAnim);

    try {
        sessionStorage.setItem('foxen_theme_enabled', '1');
        localStorage.setItem('foxen_theme_enabled', '1');
        const cacheSettings = { ...settings };
        delete cacheSettings.bgImage; // Never store any bgImage in localStorage / sessionStorage
        const cacheStr = JSON.stringify(cacheSettings);
        sessionStorage.setItem('foxen_theme_cache', cacheStr);
        localStorage.setItem('foxen_theme_cache', cacheStr);
    } catch (_) {}

    // Initialize root CSS variables for instantaneous zero-IPC updates
    const filterParts = [];
    if (settings.bgBlur && parseFloat(settings.bgBlur) > 0) filterParts.push(`blur(${settings.bgBlur}px)`);
    if (settings.bgBrightness !== undefined && parseFloat(settings.bgBrightness) !== 100) filterParts.push(`brightness(${settings.bgBrightness}%)`);
    const containerBgRgba = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);

    const rootStyle = document.documentElement?.style;
    if (rootStyle) {
        rootStyle.setProperty('--fxn-theme-container-bg', containerBgRgba);
        rootStyle.setProperty('--fxn-theme-bg-filter', filterParts.length ? filterParts.join(' ') : 'none');
        rootStyle.setProperty('--fxn-theme-border-radius', `${settings.borderRadius ?? 8}px`);
        rootStyle.setProperty('--fxn-theme-text-color', settings.textColor || '#f0f0f0');
        rootStyle.setProperty('--fxn-theme-accent-color', settings.bgColor2 || '#f4cf78');
        rootStyle.setProperty('--fxn-theme-primary-color', settings.bgColor1 || '#ff6d15');
        rootStyle.setProperty('--fxn-theme-link-color', settings.linkColor || '#2d6bb3');
    }

    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'foxen-custom-theme';
        (document.head || document.documentElement).appendChild(styleEl);
    } else if (document.head && styleEl.parentNode !== document.head) {
        document.head.appendChild(styleEl);
    }

    manageFontImports(settings);
    let themeCss = getCustomThemeCss(settings);
    themeCss += ` body { visibility: visible !important; } `; 
    if (styleEl.textContent !== themeCss) {
        styleEl.textContent = themeCss;
    }
    // фон становится тёмным не мгновенно - пересчитываем палитру на след. кадрах
    if (typeof fxnApplyThemeVars === 'function') {
        requestAnimationFrame(() => { try { fxnApplyThemeVars(); } catch (_) {} });
        setTimeout(() => { try { fxnApplyThemeVars(); } catch (_) {} }, 120);
        setTimeout(() => { try { fxnApplyThemeVars(); } catch (_) {} }, 400);
    }
}

function updateCirclePreview() {
    const previewContainer = document.getElementById('circlePreviewContainer');
    const previewEl = document.getElementById('circlePreview');
    if (!previewEl || !previewContainer) return;

    const showEl = document.getElementById('showCircles');
    const show = showEl ? (showEl.checked ?? showEl.classList.contains('on')) : true;
    const size = document.getElementById('circleSize')?.value || 100;
    const opacity = document.getElementById('circleOpacity')?.value || 100;
    const blur = document.getElementById('circleBlur')?.value || 0;

    previewContainer.style.opacity = show ? '1' : '0.3';
    previewEl.style.transform = `scale(${size / 100})`;
    previewEl.style.opacity = opacity / 100;
    previewEl.style.filter = `blur(${blur}px)`;
}

async function updateThemePreview() {
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    const { foxenTheme = {}, foxenThemeBgImage, enableCustomTheme = true, enableRedesignedHomepage = true } = await ext.storage.local.get(['foxenTheme', 'foxenThemeBgImage', 'enableCustomTheme', 'enableRedesignedHomepage']);
    const bgImage = foxenThemeBgImage || foxenTheme.bgImage || null;
    const settings = { ...DEFAULT_THEME, ...foxenTheme, bgImage };

    const setToggle = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        if ('checked' in el) el.checked = !!val;
        el.classList.toggle('on', !!val);
    };

    const setSwatch = (id, color) => {
        const el = document.getElementById(id);
        if (el && color) el.style.background = color;
    };

    setToggle('enableCustomThemeCheckbox', enableCustomTheme);
    setToggle('enableGlassmorphism', settings.enableGlassmorphism);
    setToggle('headerPositionBottom', settings.headerPosition === 'bottom');
    setToggle('enableCustomScrollbar', settings.enableCustomScrollbar);
    setToggle('enableImprovedSeparators', settings.enableImprovedSeparators);
    setToggle('enableRedesignedHomepage', enableRedesignedHomepage);
    setToggle('enableCircleCustomization', settings.enableCircleCustomization);
    setToggle('showCircles', settings.showCircles);

    setSwatch('themeBgColor1Swatch', settings.bgColor1);
    setSwatch('themeBgColor2Swatch', settings.bgColor2);
    setSwatch('themeContainerBgColorSwatch', settings.containerBgColor);
    setSwatch('themeTextColorSwatch', settings.textColor);
    setSwatch('themeLinkColorSwatch', settings.linkColor);

    const elements = {
        previewDiv: document.getElementById('bg-image-preview'),
        color1Input: document.getElementById('themeColor1') || document.getElementById('themeBgColor1'),
        color2Input: document.getElementById('themeColor2') || document.getElementById('themeBgColor2'),
        containerBgColorInput: document.getElementById('themeContainerBgColor'),
        textColorInput: document.getElementById('themeTextColor'),
        linkColorInput: document.getElementById('themeLinkColor'),
        fontSelect: document.getElementById('themeFont') || document.getElementById('themeFontSelect'),
        bgBlurSlider: document.getElementById('themeBgBlur'),
        bgBlurValue: document.getElementById('themeBgBlurValue'),
        bgBrightnessSlider: document.getElementById('themeBgBrightness'),
        bgBrightnessValue: document.getElementById('themeBgBrightnessValue'),
        containerBgOpacitySlider: document.getElementById('themeContainerBgOpacity'),
        containerBgOpacityValue: document.getElementById('themeContainerBgOpacityValue'),
        borderRadiusSlider: document.getElementById('themeBorderRadius'),
        borderRadiusValue: document.getElementById('themeBorderRadiusValue'),
        circleCustomizationControls: document.getElementById('circleCustomizationControls'),
        circleSize: document.getElementById('circleSize'),
        circleSizeValue: document.getElementById('circleSizeValue'),
        circleOpacity: document.getElementById('circleOpacity'),
        circleOpacityValue: document.getElementById('circleOpacityValue'),
        circleBlur: document.getElementById('circleBlur'),
        circleBlurValue: document.getElementById('circleBlurValue'),
        headerPositionSelect: document.getElementById('headerPositionSelect'),
        glassmorphismControls: document.getElementById('glassmorphismControls'),
        glassmorphismBlur: document.getElementById('glassmorphismBlur'),
        glassmorphismBlurValue: document.getElementById('glassmorphismBlurValue'),
        customScrollbarControls: document.getElementById('customScrollbarControls'),
        scrollbarThumbColor: document.getElementById('scrollbarThumbColor'),
        scrollbarTrackColor: document.getElementById('scrollbarTrackColor'),
        scrollbarWidth: document.getElementById('scrollbarWidth'),
        scrollbarWidthValue: document.getElementById('scrollbarWidthValue'),
        generatePaletteBtn: document.getElementById('generatePaletteBtn'),
    };

    if(elements.previewDiv) {
        if (settings.bgImage) {
            elements.previewDiv.style.backgroundImage = `url(${settings.bgImage})`;
            elements.previewDiv.textContent = '';
            if (elements.generatePaletteBtn) elements.generatePaletteBtn.disabled = false;
        } else {
            elements.previewDiv.style.backgroundImage = 'none';
            elements.previewDiv.textContent = 'Нет изображения';
            if (elements.generatePaletteBtn) elements.generatePaletteBtn.disabled = true;
        }
    }
    if(elements.color1Input) elements.color1Input.value = settings.bgColor1;
    if(elements.color2Input) elements.color2Input.value = settings.bgColor2;
    if(elements.containerBgColorInput) elements.containerBgColorInput.value = settings.containerBgColor;
    if(elements.textColorInput) elements.textColorInput.value = settings.textColor;
    if(elements.linkColorInput) elements.linkColorInput.value = settings.linkColor;
    if(elements.fontSelect) elements.fontSelect.value = settings.font;
    if(elements.bgBlurSlider) elements.bgBlurSlider.value = settings.bgBlur;
    if(elements.bgBlurValue) elements.bgBlurValue.textContent = `${settings.bgBlur}px`;
    if(elements.bgBrightnessSlider) elements.bgBrightnessSlider.value = settings.bgBrightness;
    if(elements.bgBrightnessValue) elements.bgBrightnessValue.textContent = `${settings.bgBrightness}%`;
    if(elements.containerBgOpacitySlider) elements.containerBgOpacitySlider.value = settings.containerBgOpacity * 100;
    if(elements.containerBgOpacityValue) elements.containerBgOpacityValue.textContent = `${Math.round(settings.containerBgOpacity * 100)}%`;
    if(elements.borderRadiusSlider) elements.borderRadiusSlider.value = settings.borderRadius;
    if(elements.borderRadiusValue) elements.borderRadiusValue.textContent = `${settings.borderRadius}px`;

    if (elements.circleCustomizationControls) elements.circleCustomizationControls.style.display = settings.enableCircleCustomization ? 'block' : 'none';
    if (elements.circleSize) elements.circleSize.value = settings.circleSize;
    if (elements.circleSizeValue) elements.circleSizeValue.textContent = `${settings.circleSize}%`;
    if (elements.circleOpacity) elements.circleOpacity.value = settings.circleOpacity;
    if (elements.circleOpacityValue) elements.circleOpacityValue.textContent = `${settings.circleOpacity}%`;
    if (elements.circleBlur) elements.circleBlur.value = settings.circleBlur;
    if (elements.circleBlurValue) elements.circleBlurValue.textContent = `${settings.circleBlur}px`;
    if(elements.headerPositionSelect) elements.headerPositionSelect.value = settings.headerPosition || 'top';

    if (elements.glassmorphismControls) elements.glassmorphismControls.style.display = settings.enableGlassmorphism ? 'block' : 'none';
    if (elements.glassmorphismBlur) elements.glassmorphismBlur.value = settings.glassmorphismBlur;
    if (elements.glassmorphismBlurValue) elements.glassmorphismBlurValue.textContent = `${settings.glassmorphismBlur}px`;

    if (elements.customScrollbarControls) elements.customScrollbarControls.style.display = settings.enableCustomScrollbar ? 'block' : 'none';
    if (elements.scrollbarThumbColor) elements.scrollbarThumbColor.value = settings.scrollbarThumbColor;
    if (elements.scrollbarTrackColor) elements.scrollbarTrackColor.value = settings.scrollbarTrackColor;
    if (elements.scrollbarWidth) elements.scrollbarWidth.value = settings.scrollbarWidth;
    if (elements.scrollbarWidthValue) elements.scrollbarWidthValue.textContent = `${settings.scrollbarWidth}px`;

    updateCirclePreview();
    syncFptMenuControls();
    if (typeof window.updateFoxenAllSliders === 'function') {
        window.updateFoxenAllSliders(document.getElementById('theme') || document);
    }
}

function toggleThemeControls(disabled) {
    const controls = [
        'uploadBgImageBtn', 'removeBgImageBtn', 'bgImageInput',
        'themeColor1', 'themeColor2', 'themeContainerBgColor', 'themeTextColor', 'themeLinkColor',
        'themeFontSelect', 'themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius',
        'resetThemeBtn',
        'enableCircleCustomization', 'showCircles', 'circleSize', 'circleOpacity', 'circleBlur',
        'enableImprovedSeparators', 'headerPositionSelect', 'enableRedesignedHomepage',
        'enableGlassmorphism', 'glassmorphismBlur',
        'enableCustomScrollbar', 'scrollbarThumbColor', 'scrollbarTrackColor', 'scrollbarWidth',
        'generatePaletteBtn', 'randomizeThemeBtn', 'exportThemeBtn', 'importThemeBtn'
    ];
    controls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });

    const circleControlsContainer = document.getElementById('circleCustomizationControls');
    if (circleControlsContainer) {
        if (disabled) {
            circleControlsContainer.style.display = 'none';
        } else {
            const enableCirclesCheckbox = document.getElementById('enableCircleCustomization');
            circleControlsContainer.style.display = enableCirclesCheckbox.checked ? 'block' : 'none';
        }
    }
    const glassControls = document.getElementById('glassmorphismControls');
    if (glassControls) glassControls.style.display = (!disabled && document.getElementById('enableGlassmorphism').checked) ? 'block' : 'none';
    
    const scrollbarControls = document.getElementById('customScrollbarControls');
    if (scrollbarControls) scrollbarControls.style.display = (!disabled && document.getElementById('enableCustomScrollbar').checked) ? 'block' : 'none';
}

async function randomizeTheme() {
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    const { foxenTheme: currentTheme = {} } = await ext.storage.local.get(['foxenTheme']);
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const fontsWithDefault = ['Helvetica Neue', ...GOOGLE_FONTS];

    const randomTheme = {
        bgColor1: randomHex(),
        bgColor2: randomHex(),
        containerBgColor: randomHex(),
        containerBgOpacity: Math.random() * 0.8 + 0.2, 
        textColor: randomHex(),
        linkColor: randomHex(),
        font: fontsWithDefault[randomInt(0, fontsWithDefault.length - 1)],
        bgBlur: randomInt(0, 15),
        bgBrightness: randomInt(50, 120),
        borderRadius: randomInt(0, 25),
        enableCircleCustomization: Math.random() > 0.5,
        showCircles: Math.random() > 0.3,
        circleSize: randomInt(70, 130),
        circleOpacity: randomInt(20, 100),
        circleBlur: randomInt(0, 30),
        enableImprovedSeparators: Math.random() > 0.5,
        headerPosition: Math.random() > 0.5 ? 'top' : 'bottom',
        enableGlassmorphism: Math.random() > 0.5,
        glassmorphismBlur: randomInt(5, 20),
        enableCustomScrollbar: Math.random() > 0.5,
        scrollbarThumbColor: randomHex(),
        scrollbarTrackColor: randomHex(),
        scrollbarWidth: randomInt(4, 12)
    };

    delete randomTheme.bgImage;

    try {
        await ext.storage.local.set({ foxenTheme: randomTheme });
        await applyCustomTheme();
        await applyHeaderPosition();
        await updateThemePreview();
        showNotification('Тема рандомизирована! ✨');
    } catch (error) {
        console.error('Foxen: Error randomizing theme:', error);
        showNotification('Ошибка при рандомизации темы.', true);
    }
}

async function exportTheme() {
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    const { foxenTheme = {}, foxenThemeBgImage } = await ext.storage.local.get(['foxenTheme', 'foxenThemeBgImage']);
    const bgImage = foxenThemeBgImage || foxenTheme.bgImage || null;
    const settingsToExport = { ...DEFAULT_THEME, ...foxenTheme, bgImage };

    const themeName = prompt("Введите название темы:", "Моя тема");
    if (!themeName || themeName.trim() === "") {
        return;
    }

    const fileName = `${themeName.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '_')}.fptheme`;
    const fileContent = JSON.stringify(settingsToExport, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    showNotification(`Тема "${themeName}" экспортирована!`);
}

function importTheme(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const importedTheme = JSON.parse(e.target.result);
            if (importedTheme && importedTheme.bgColor1 && importedTheme.font) {
                const importedBg = importedTheme.bgImage || null;
                const cleanedTheme = { ...importedTheme };
                delete cleanedTheme.bgImage;
                if (importedBg) {
                    const isAnim = isAnimatedBackground(importedBg);
                    await ext.storage.local.set({ 
                        foxenThemeBgImage: importedBg,
                        foxenThemeBgIsAnimated: isAnim,
                        foxenTheme: cleanedTheme 
                    });
                } else {
                    await ext.storage.local.remove(['foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
                    await ext.storage.local.set({ foxenTheme: cleanedTheme });
                }
                await applyCustomTheme();
                await applyHeaderPosition();
                await updateThemePreview();
                showNotification('Тема успешно импортирована!');
            } else {
                throw new Error("Неверный формат файла темы.");
            }
        } catch (err) {
            showNotification(`Ошибка импорта: ${err.message}`, true);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

async function generatePaletteFromImage() {
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    const { foxenTheme = {}, foxenThemeBgImage } = await ext.storage.local.get(['foxenTheme', 'foxenThemeBgImage']);
    const bgImage = foxenThemeBgImage || foxenTheme.bgImage;
    if (!bgImage) {
        showNotification('Сначала загрузите фоновое изображение.', true);
        return;
    }

    const btn = document.getElementById('generatePaletteBtn');
    if (!btn) return;
    
    const btnTextSpan = btn.querySelector('span:not(.material-icons)');
    const originalText = btnTextSpan ? btnTextSpan.textContent : 'Создать палитру';
    
    btn.disabled = true;
    if (btnTextSpan) btnTextSpan.textContent = 'Анализ...';

    try {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const promise = new Promise((resolve, reject) => {
            img.onload = async () => {
                const size = 100;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorMap = {};
                for (let i = 0; i < imageData.length; i += 4) {
                    if (imageData[i+3] < 128) continue; 
                    const r = Math.round(imageData[i] / 32) * 32;
                    const g = Math.round(imageData[i+1] / 32) * 32;
                    const b = Math.round(imageData[i+2] / 32) * 32;
                    const key = `${r},${g},${b}`;
                    colorMap[key] = (colorMap[key] || 0) + 1;
                }

                const sortedColors = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
                
                const toHex = (rgbStr) => {
                    const [r, g, b] = rgbStr.split(',').map(Number);
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
                };
                
                const getContrastColor = (hex) => {
                    const [r,g,b] = hex.match(/\w\w/g).map(x => parseInt(x,16));
                    return (r*0.299 + g*0.587 + b*0.114) > 128 ? '#111111' : '#FFFFFF';
                };

                const newPalette = {};
                if (sortedColors.length > 0) newPalette.containerBgColor = toHex(sortedColors[0][0]);
                if (sortedColors.length > 1) newPalette.bgColor1 = toHex(sortedColors[1][0]);
                if (sortedColors.length > 2) newPalette.bgColor2 = toHex(sortedColors[2][0]);
                if (sortedColors.length > 3) newPalette.linkColor = toHex(sortedColors[3][0]);
                
                if (newPalette.containerBgColor) newPalette.textColor = getContrastColor(newPalette.containerBgColor);
                
                const finalTheme = { ...foxenTheme, ...newPalette };
                delete finalTheme.bgImage;

                await ext.storage.local.set({ foxenTheme: finalTheme });
                await applyCustomTheme();
                await updateThemePreview();
                showNotification('Палитра успешно сгенерирована!');
                resolve();
            };
            img.onerror = () => { reject(new Error('Не удалось загрузить изображение для анализа.')); };
        });
        
        img.src = bgImage;
        await promise;

    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, true);
    } finally {
        btn.disabled = false;
        if (btnTextSpan) btnTextSpan.textContent = originalText;
    }
}

function createShareThemeModal() {
    if (document.getElementById('foxen-share-theme-modal')) return;

    const modalOverlay = createElement('div', { id: 'foxen-share-theme-modal', class: 'foxen-share-modal-overlay' });
    modalOverlay.innerHTML = `
        <div class="foxen-share-modal-content">
            <div class="foxen-share-modal-header">
                <h3>Поделиться темой</h3>
                <button class="foxen-share-modal-close">&times;</button>
            </div>
            <div class="foxen-share-modal-body">
                <p>Для того, чтобы поделиться темой, вы можете нажать кнопку "ЭКСПОРТ" и поделиться темой с телеграм-ботом <a href="https://t.me/FunPayThemesBot" target="_blank">@FunPayThemesBot</a>.</p>
                <p>Там вы сможете кинуть файл темы и поделиться темой по ссылке либо выложить в боте в публичный доступ чтобы другие люди тоже могли скачивать.</p>
            </div>
            <div class="foxen-share-modal-footer">
                <a href="https://t.me/FunPayThemesBot" target="_blank" class="btn">Перейти к боту</a>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.style.display = 'none';
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.querySelector('.foxen-share-modal-close').addEventListener('click', closeModal);
}

function setupThemeCustomizationHandlers() {
    const fontSelect = document.getElementById('themeFont') || document.getElementById('themeFontSelect');
    if (fontSelect && fontSelect.options.length === 0) {
        const allFonts = ['Системный (Helvetica Neue)', 'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'JetBrains Mono', 'Fira Code', ...GOOGLE_FONTS];
        allFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.includes('Helvetica Neue') ? 'Helvetica Neue' : font;
            option.textContent = font;
            fontSelect.appendChild(option);
        });
    }

    // Connect Unified Modern Color Picker Swatches & Tracks
    let _themeSaveTimer = null;
    const saveThemeDebounced = (patch) => {
        clearTimeout(_themeSaveTimer);
        _themeSaveTimer = setTimeout(async () => {
            try {
                const ext = typeof browser !== 'undefined' ? browser : chrome;
                const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
                const next = { ...DEFAULT_THEME, ...foxenTheme, ...patch };
                delete next.bgImage;
                await ext.storage.local.set({ foxenTheme: next });
            } catch (_) {}
        }, 350);
    };

    function applyLiveThemeProperty(key, val) {
        const root = document.documentElement;
        if (!root) return;

        if (key === 'themeBgBlur' || key === 'themeBgBrightness' || key === 'bgBlur' || key === 'bgBrightness') {
            const b = document.getElementById('themeBgBlur')?.value ?? window._foxenThemeSettings?.bgBlur ?? 0;
            const br = document.getElementById('themeBgBrightness')?.value ?? window._foxenThemeSettings?.bgBrightness ?? 100;
            let f = '';
            if (parseFloat(b) > 0) f += `blur(${b}px) `;
            if (parseFloat(br) !== 100) f += `brightness(${br}%)`;
            root.style.setProperty('--fxn-theme-bg-filter', f.trim() || 'none');
        } else if (key === 'themeContainerBgColor' || key === 'themeContainerBgOpacity' || key === 'containerBgColor' || key === 'containerBgOpacity') {
            const c = document.getElementById('themeContainerBgColor')?.value ?? window._foxenThemeSettings?.containerBgColor ?? '#0b0b0b';
            const opVal = document.getElementById('themeContainerBgOpacity')?.value ?? (window._foxenThemeSettings?.containerBgOpacity ? window._foxenThemeSettings.containerBgOpacity * 100 : 100);
            const op = (parseFloat(opVal) || 100) / 100;
            root.style.setProperty('--fxn-theme-container-bg', hexToRgba(c, op));
        } else if (key === 'themeBorderRadius' || key === 'borderRadius') {
            root.style.setProperty('--fxn-theme-border-radius', `${val}px`);
        } else if (key === 'themeTextColor' || key === 'textColor') {
            root.style.setProperty('--fxn-theme-text-color', val);
        } else if (key === 'themeLinkColor' || key === 'linkColor') {
            root.style.setProperty('--fxn-theme-link-color', val);
        } else if (key === 'themeBgColor1' || key === 'bgColor1' || key === 'themeColor1') {
            root.style.setProperty('--fxn-theme-primary-color', val);
        } else if (key === 'themeBgColor2' || key === 'bgColor2' || key === 'themeColor2') {
            root.style.setProperty('--fxn-theme-accent-color', val);
        }
    }

    // Connect Unified Modern Color Picker Swatches & Tracks
    const bindSwatch = (swatchId, trackId, key) => {
        const sw = document.getElementById(swatchId);
        const tr = document.getElementById(trackId);
        const elementsToBind = [sw, tr].filter(Boolean);

        elementsToBind.forEach(el => {
            if (el && !el.dataset.fxnBound) {
                el.dataset.fxnBound = '1';
                el.addEventListener('click', async () => {
                    const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTheme');
                    const curTheme = { ...DEFAULT_THEME, ...foxenTheme };
                    const curVal = curTheme[key] || '#c026d3';
                    if (typeof foxenOpenColorPicker === 'function') {
                        foxenOpenColorPicker(el, curVal, async (newHex, isFinal) => {
                            if (sw) sw.style.background = newHex;
                            const hiddenInput = document.getElementById(key) || document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1));
                            if (hiddenInput) hiddenInput.value = newHex;
                            curTheme[key] = newHex;
                            applyLiveThemeProperty(key, newHex);

                            if (isFinal) {
                                clearTimeout(_themeSaveTimer);
                                const ext = typeof browser !== 'undefined' ? browser : chrome;
                                delete curTheme.bgImage;
                                await ext.storage.local.set({ foxenTheme: curTheme });
                            } else {
                                saveThemeDebounced({ [key]: newHex });
                            }
                        });
                    }
                });
            }
        });
    };

    bindSwatch('themeBgColor1Swatch', 'themeBgColor1Track', 'bgColor1');
    bindSwatch('themeBgColor2Swatch', 'themeBgColor2Track', 'bgColor2');
    bindSwatch('themeContainerBgColorSwatch', 'themeContainerBgColorTrack', 'containerBgColor');
    bindSwatch('themeTextColorSwatch', 'themeTextColorTrack', 'textColor');
    bindSwatch('themeLinkColorSwatch', 'themeLinkColorTrack', 'linkColor');

    // Particle FX Swatches
    const bindFxSwatch = (swatchId, inputId, defaultColor) => {
        const sw = document.getElementById(swatchId);
        if (sw && !sw.dataset.fxnBound) {
            sw.dataset.fxnBound = '1';
            sw.addEventListener('click', async () => {
                const { foxenCursorFx = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCursorFx');
                const curVal = (inputId === 'cursorFxColor1' ? foxenCursorFx.color1 : foxenCursorFx.color2) || defaultColor;
                if (typeof foxenOpenColorPicker === 'function') {
                    foxenOpenColorPicker(sw, curVal, async (newHex, isFinal) => {
                        sw.style.background = newHex;
                        const hiddenInput = document.getElementById(inputId);
                        if (hiddenInput) hiddenInput.value = newHex;
                        if (inputId === 'cursorFxColor1') foxenCursorFx.color1 = newHex;
                        else foxenCursorFx.color2 = newHex;
                        if (typeof cursorFx !== 'undefined' && cursorFx.updateConfig) cursorFx.updateConfig(foxenCursorFx);
                        if (isFinal) {
                            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCursorFx });
                        }
                    });
                }
            });
        }
    };
    bindFxSwatch('cursorFxColor1Swatch', 'cursorFxColor1', '#FF6B6B');
    bindFxSwatch('cursorFxColor2Swatch', 'cursorFxColor2', '#C026D3');

    const liveUpdate = (event) => {
        const el = event.target;
        const patch = {};

        switch(el.id) {
            case 'themeColor1': patch.bgColor1 = el.value; break;
            case 'themeColor2': patch.bgColor2 = el.value; break;
            case 'themeContainerBgColor': patch.containerBgColor = el.value; break;
            case 'themeTextColor': patch.textColor = el.value; break;
            case 'themeLinkColor': patch.linkColor = el.value; break;
            case 'themeBgBlur':
                patch.bgBlur = el.value;
                const vBlur = document.getElementById('themeBgBlurValue');
                if (vBlur) vBlur.textContent = `${el.value}px`;
                break;
            case 'themeBgBrightness':
                patch.bgBrightness = el.value;
                const vBri = document.getElementById('themeBgBrightnessValue');
                if (vBri) vBri.textContent = `${el.value}%`;
                break;
            case 'themeContainerBgOpacity':
                patch.containerBgOpacity = el.value / 100;
                const vOp = document.getElementById('themeContainerBgOpacityValue');
                if (vOp) vOp.textContent = `${el.value}%`;
                break;
            case 'themeBorderRadius':
                patch.borderRadius = el.value;
                const vRad = document.getElementById('themeBorderRadiusValue');
                if (vRad) vRad.textContent = `${el.value}px`;
                break;
            case 'circleSize': patch.circleSize = el.value; break;
            case 'circleOpacity': patch.circleOpacity = el.value; break;
            case 'circleBlur': patch.circleBlur = el.value; break;
            case 'glassmorphismBlur': patch.glassmorphismBlur = el.value; break;
            case 'scrollbarThumbColor': patch.scrollbarThumbColor = el.value; break;
            case 'scrollbarTrackColor': patch.scrollbarTrackColor = el.value; break;
            case 'scrollbarWidth': patch.scrollbarWidth = el.value; break;
        }

        applyLiveThemeProperty(el.id, el.value);
        if (typeof window.updateFoxenSliderFill === 'function') {
            window.updateFoxenSliderFill(el);
        }
        saveThemeDebounced(patch);
    };

    const liveControls = [
        'themeColor1', 'themeColor2', 'themeContainerBgColor', 'themeTextColor', 'themeLinkColor',
        'themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius',
        'circleSize', 'circleOpacity', 'circleBlur', 'glassmorphismBlur',
        'scrollbarThumbColor', 'scrollbarTrackColor', 'scrollbarWidth'
    ];
    liveControls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', liveUpdate);
        el.addEventListener('change', async () => {
            clearTimeout(_themeSaveTimer);
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
            const newSettings = { ...DEFAULT_THEME, ...foxenTheme };
            if (el.id === 'themeBgBlur') newSettings.bgBlur = el.value;
            else if (el.id === 'themeBgBrightness') newSettings.bgBrightness = el.value;
            else if (el.id === 'themeContainerBgOpacity') newSettings.containerBgOpacity = el.value / 100;
            else if (el.id === 'themeBorderRadius') newSettings.borderRadius = el.value;
            else if (el.id === 'themeColor1') newSettings.bgColor1 = el.value;
            else if (el.id === 'themeColor2') newSettings.bgColor2 = el.value;
            else if (el.id === 'themeContainerBgColor') newSettings.containerBgColor = el.value;
            else if (el.id === 'themeTextColor') newSettings.textColor = el.value;
            else if (el.id === 'themeLinkColor') newSettings.linkColor = el.value;
            delete newSettings.bgImage;
            await ext.storage.local.set({ foxenTheme: newSettings });
        });
    });

    const changeControls = [
        'themeFont', 'themeFontSelect', 'enableCustomThemeCheckbox', 'bgImageInput',
        'enableCircleCustomization', 'showCircles', 'enableImprovedSeparators',
        'headerPositionSelect', 'headerPositionBottom', 'enableGlassmorphism', 'enableCustomScrollbar'
    ];
    changeControls.forEach(id => {
        document.getElementById(id)?.addEventListener('change', async (event) => {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
            const newSettings = { ...DEFAULT_THEME, ...foxenTheme };
            let applyAll = true;

            const isChecked = event.target.checked ?? event.target.classList?.contains('on');

            if (id === 'enableCustomThemeCheckbox') {
                await ext.storage.local.set({ enableCustomTheme: isChecked });
                toggleThemeControls(!isChecked);
            } else if (id === 'bgImageInput') {
                 const file = event.target.files[0];
                 if (!file) return;
                 const isAnim = file.type.includes('gif') || 
                                file.name.toLowerCase().endsWith('.gif') || 
                                file.type.includes('webp') || 
                                file.name.toLowerCase().endsWith('.webp');
                 const reader = new FileReader();
                 reader.onload = async (readEvent) => {
                     const bgData = readEvent.target.result;
                     const isAnimDetected = isAnim || isAnimatedBackground(bgData);
                     await ext.storage.local.set({
                         foxenThemeBgImage: bgData,
                         foxenThemeBgIsAnimated: isAnimDetected
                     });
                     const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
                     const cleanedTheme = { ...DEFAULT_THEME, ...foxenTheme };
                     delete cleanedTheme.bgImage;
                     await ext.storage.local.set({ foxenTheme: cleanedTheme });
                     await applyCustomTheme();
                     await updateThemePreview();
                 };
                 reader.readAsDataURL(file);
                 applyAll = false;
            } else {
                if (id === 'enableCircleCustomization') {
                    const c = document.getElementById('circleCustomizationControls');
                    if (c) c.style.display = isChecked ? 'block' : 'none';
                    newSettings.enableCircleCustomization = isChecked;
                } else if (id === 'showCircles') {
                    newSettings.showCircles = isChecked;
                } else if (id === 'enableImprovedSeparators') {
                    newSettings.enableImprovedSeparators = isChecked;
                } else if (id === 'themeFont' || id === 'themeFontSelect') {
                     newSettings.font = event.target.value;
                } else if (id === 'headerPositionBottom') {
                     newSettings.headerPosition = isChecked ? 'bottom' : 'top';
                } else if (id === 'headerPositionSelect') {
                     newSettings.headerPosition = event.target.value;
                } else if (id === 'enableGlassmorphism') {
                     const g = document.getElementById('glassmorphismControls');
                     if (g) g.style.display = isChecked ? 'block' : 'none';
                     newSettings.enableGlassmorphism = isChecked;
                } else if (id === 'enableCustomScrollbar') {
                     const s = document.getElementById('customScrollbarControls');
                     if (s) s.style.display = isChecked ? 'block' : 'none';
                     newSettings.enableCustomScrollbar = isChecked;
                }
                delete newSettings.bgImage;
                await ext.storage.local.set({ foxenTheme: newSettings });
            }

            if(applyAll) {
                applyCustomTheme();
                applyHeaderPosition();
                updateCirclePreview();
            }
        });
    });

    document.getElementById('enableRedesignedHomepage')?.addEventListener('change', async (event) => {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ enableRedesignedHomepage: event.target.checked });
        const genCheckbox = document.getElementById('enableRedesignedHomepageGeneral');
        if (genCheckbox) genCheckbox.checked = event.target.checked;
        showNotification('Настройка сохранена. Страница будет перезагружена.', false);
        setTimeout(() => window.location.reload(), 1500);
    });

    ['themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius', 'circleSize', 'circleOpacity', 'circleBlur', 'glassmorphismBlur', 'scrollbarWidth'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
             const valueLabel = document.getElementById(`${id}Value`);
             if (!valueLabel) return;
             if (id === 'themeBgBlur' || id === 'themeBorderRadius' || id === 'circleBlur' || id === 'glassmorphismBlur' || id === 'scrollbarWidth') valueLabel.textContent = `${e.target.value}px`;
             else if (id === 'themeBgBrightness' || id === 'themeContainerBgOpacity' || id === 'circleSize' || id === 'circleOpacity') valueLabel.textContent = `${e.target.value}%`;
             updateCirclePreview();
             if (typeof window.updateFoxenSliderFill === 'function') {
                 window.updateFoxenSliderFill(e.target);
             }
        });
    });

    document.getElementById('uploadBgImageBtn')?.addEventListener('click', () => document.getElementById('bgImageInput').click());

    document.getElementById('removeBgImageBtn')?.addEventListener('click', async () => {
         const ext = typeof browser !== 'undefined' ? browser : chrome;
         await ext.storage.local.remove(['foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
         const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
         delete foxenTheme.bgImage;
         await ext.storage.local.set({ foxenTheme });
         document.documentElement.classList.remove('fxn-animated-bg');
         if (document.body) document.body.classList.remove('fxn-animated-bg');
         document.querySelector('.foxen-popup')?.classList.remove('fxn-animated-bg');
         await applyCustomTheme();
         await updateThemePreview();
         showNotification('Фоновое изображение удалено.');
    });

    document.getElementById('resetThemeBtn')?.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите сбросить все настройки темы и оформления?')) return;
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        await ext.storage.local.remove(['foxenTheme', 'foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
        await ext.storage.local.set({ enableRedesignedHomepage: true });
        document.documentElement.classList.remove('fxn-animated-bg');
        if (document.body) document.body.classList.remove('fxn-animated-bg');
        document.querySelector('.foxen-popup')?.classList.remove('fxn-animated-bg');
        applyCustomTheme();
        applyHeaderPosition();
        updateThemePreview();
        showNotification('Настройки темы сброшены. Страница будет перезагружена для применения.');
        setTimeout(() => window.location.reload(), 1500);
    });

    createShareThemeModal();
    document.getElementById('shareThemeBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('foxen-share-theme-modal');
        if (modal) modal.style.display = 'flex';
    });
    document.getElementById('randomizeThemeBtn')?.addEventListener('click', randomizeTheme);
    document.getElementById('exportThemeBtn')?.addEventListener('click', exportTheme);
    document.getElementById('importThemeBtn')?.addEventListener('click', () => {
        document.getElementById('importThemeInput').click();
    });
    document.getElementById('importThemeInput')?.addEventListener('change', importTheme);
    document.getElementById('generatePaletteBtn')?.addEventListener('click', generatePaletteFromImage);

    setupFptMenuTransparency();
}

// ════════════════════════════════════════════════════════════════════════════
// Прозрачное меню Foxen
// ════════════════════════════════════════════════════════════════════════════

let _fptCachedIsAnim = null;
let _fptCachedIsAnimTime = 0;

async function checkIsAnimatedBg(s, ext) {
    const now = Date.now();
    if (_fptCachedIsAnim !== null && (now - _fptCachedIsAnimTime < 4000)) {
        return _fptCachedIsAnim;
    }
    try {
        const bgData = await ext.storage.local.get(['foxenThemeBgImage', 'foxenThemeBgIsAnimated']);
        const hasParticles = !!document.getElementById('fxn-fullpage-particles-canvas');
        const isAnim = !!bgData.foxenThemeBgIsAnimated || isAnimatedBackground(bgData.foxenThemeBgImage || s.bgImage) || hasParticles || document.documentElement.classList.contains('fxn-animated-bg');
        _fptCachedIsAnim = isAnim;
        _fptCachedIsAnimTime = now;
        return isAnim;
    } catch (_) {
        return false;
    }
}

// Применяет настройки прозрачности к окну .foxen-popup.
// Может принять явные значения (из контролов) - иначе читает из storage.
async function applyFptMenuTransparency(override) {
    const popup = document.querySelector('.foxen-popup');
    if (!popup) return;

    let s;
    const ext = typeof browser !== 'undefined' ? browser : chrome;
    if (override) {
        s = override;
    } else {
        const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
        s = { ...DEFAULT_THEME, ...foxenTheme };
    }

    const isAnim = await checkIsAnimatedBg(s, ext);

    if (isAnim) {
        document.documentElement.classList.add('fxn-animated-bg');
        if (document.body) document.body.classList.add('fxn-animated-bg');
        popup.classList.add('fxn-animated-bg');
    } else {
        popup.classList.remove('fxn-animated-bg');
    }

    // Управление размытием фона страницы под скримом:
    // Если включено прозрачное меню или активна анимация, скрим НЕ размываем (предотвращает утечку памяти)
    const disableScrimBlur = (s.scrimBlurEnabled === false) || !!s.menuTransparent || isAnim;
    popup.classList.toggle('fxn-no-scrim-blur', disableScrimBlur);

    if (s.menuTransparent) {
        const alpha = Math.max(0, Math.min(100, parseFloat(s.menuOpacity))) / 100;
        const tintC = s.menuTintColor || DEFAULT_THEME.menuTintColor;
        popup.style.setProperty('--fxn-menu-bg', hexToRgba(tintC, alpha));
        // кнопки боковой панели - на 2% плотнее самого меню (как просил пользователь)
        popup.style.setProperty('--fxn-menu-navbtn', hexToRgba(tintC, Math.min(1, alpha + 0.02)));
        // активный пункт - заметнее, на 8% плотнее
        popup.style.setProperty('--fxn-menu-navactive', hexToRgba(tintC, Math.min(1, alpha + 0.08)));
        popup.classList.add('fxn-menu-transparent');

        // ЧИТАЕМОСТЬ: при 3% прозрачности на СВЕТЛОМ фоне (белая/выключенная тема)
        // светлый текст меню сливается. Определяем яркость фона за меню и:
        //   - на светлом фоне → тёмный текст меню + светлый скрим;
        //   - на тёмном фоне → светлый текст + тёмный скрим.
        let lightBg = false;
        try {
            if (popup.querySelector('.window.light-theme') || document.documentElement.classList.contains('fxn-theme-light')) {
                lightBg = true;
            } else if (typeof fxnResolveBg === 'function' && typeof fxnLuma === 'function') {
                lightBg = fxnLuma(fxnResolveBg()) >= 0.5;
            }
        } catch (_) {}
        popup.classList.toggle('fxn-menu-on-light', lightBg);
        popup.classList.toggle('fxn-menu-on-dark', !lightBg);
        popup.style.setProperty('--fxn-menu-scrim', lightBg ? 'rgba(245,245,250,0.80)' : 'rgba(15,16,22,0.45)');

        // Безопасный радиус размытия (ограничен 20px для защиты GPU/RAM)
        const safeBlur = Math.min(20, Math.max(0, parseInt(s.menuBlur, 10) || 0));
        if (s.menuBlurEnabled && !isAnim && safeBlur > 0) {
            popup.style.setProperty('--fxn-menu-blur', `${safeBlur}px`);
            popup.classList.add('fxn-menu-blur');
        } else {
            popup.classList.remove('fxn-menu-blur');
            popup.style.removeProperty('--fxn-menu-blur');
        }
    } else {
        popup.classList.remove('fxn-menu-transparent', 'fxn-menu-blur', 'fxn-menu-on-light', 'fxn-menu-on-dark');
        popup.style.removeProperty('--fxn-menu-bg');
        popup.style.removeProperty('--fxn-menu-navbtn');
        popup.style.removeProperty('--fxn-menu-navactive');
        popup.style.removeProperty('--fxn-menu-scrim');
        popup.style.removeProperty('--fxn-menu-blur');
    }
}

// Загружает значения в контролы и навешивает обработчики для прозрачности и оформления меню Foxen.
// Поддерживает двустороннюю синхронизацию контролов на панели темы и в модальном окне настроек меню.
let _fptMenuTransparencyWired = false;
let _menuSaveTimer = null;

async function setupFptMenuTransparency() {
    const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTheme');
    const s = { ...DEFAULT_THEME, ...foxenTheme };

    // Селекторы элементов на странице и в модальном окне
    const enabledEls = [document.getElementById('fxnMenuTransparentEnabled'), document.getElementById('fxnModalMenuTransparent')].filter(Boolean);
    const tintEls = [document.getElementById('fxnMenuTintColor'), document.getElementById('fxnModalMenuTintColor')].filter(Boolean);
    const opacityEls = [document.getElementById('fxnMenuOpacity'), document.getElementById('fxnModalMenuOpacity')].filter(Boolean);
    const opacityValEls = [document.getElementById('fxnMenuOpacityValue'), document.getElementById('fxnModalMenuOpacityValue')].filter(Boolean);
    const blurEnabledEls = [document.getElementById('fxnMenuBlurEnabled'), document.getElementById('fxnModalMenuBlurEnabled')].filter(Boolean);
    const blurEls = [document.getElementById('fxnMenuBlur'), document.getElementById('fxnModalMenuBlur')].filter(Boolean);
    const blurValEls = [document.getElementById('fxnMenuBlurValue'), document.getElementById('fxnModalMenuBlurValue')].filter(Boolean);
    const scrimBlurEls = [document.getElementById('fxnScrimBlurEnabled'), document.getElementById('fxnModalScrimBlurEnabled')].filter(Boolean);

    const controlsBoxes = [document.getElementById('fxnMenuTransparentControls'), document.getElementById('fxnModalMenuTransparentControls')].filter(Boolean);
    const blurControlBoxes = [document.getElementById('fxnMenuBlurControls'), document.getElementById('fxnModalMenuBlurControls')].filter(Boolean);
    const outlineGroups = [document.getElementById('fxnTextOutlineGroup'), document.getElementById('fxnModalTextOutlineGroup')].filter(Boolean);

    applyFptMenuTransparency(s);
    syncFptMenuControls();

    const saveMenuSettings = async (patch) => {
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
            const next = { ...DEFAULT_THEME, ...foxenTheme, ...patch };
            delete next.bgImage;
            await ext.storage.local.set({ foxenTheme: next });
        } catch (_) {}
    };

    const debouncedSaveMenuSettings = (patch) => {
        clearTimeout(_menuSaveTimer);
        _menuSaveTimer = setTimeout(() => saveMenuSettings(patch), 300);
    };

    const getMenuState = () => {
        const isTransp = enabledEls[0] ? (enabledEls[0].checked ?? enabledEls[0].classList.contains('on')) : !!s.menuTransparent;
        const tint = (tintEls[0] && tintEls[0].value) || DEFAULT_THEME.menuTintColor;
        const op = opacityEls[0] ? parseFloat(opacityEls[0].value) : DEFAULT_THEME.menuOpacity;
        const blurEn = blurEnabledEls[0] ? (blurEnabledEls[0].checked ?? blurEnabledEls[0].classList.contains('on')) : DEFAULT_THEME.menuBlurEnabled;
        const blur = blurEls[0] ? parseFloat(blurEls[0].value) : DEFAULT_THEME.menuBlur;
        const scrimBlurEn = scrimBlurEls[0] ? (scrimBlurEls[0].checked ?? scrimBlurEls[0].classList.contains('on')) : (s.scrimBlurEnabled !== false);
        return {
            menuTransparent: isTransp,
            menuTintColor: tint,
            menuOpacity: op,
            menuBlurEnabled: blurEn,
            menuBlur: blur,
            scrimBlurEnabled: scrimBlurEn
        };
    };

    const onMenuChange = (patch, saveNow = false) => {
        const current = { ...getMenuState(), ...patch };
        const popup = document.querySelector('.foxen-popup');

        // При перетаскивании ползунка (saveNow === false): обновляем CSS переменные мгновенно без IPC
        if (!saveNow && popup) {
            if ('menuBlur' in patch) {
                const b = Math.min(20, Math.max(0, parseInt(patch.menuBlur, 10) || 0));
                popup.style.setProperty('--fxn-menu-blur', `${b}px`);
                blurValEls.forEach(el => { el.textContent = `${b}px`; });
            }
            if ('menuOpacity' in patch) {
                const alpha = Math.max(0, Math.min(100, parseFloat(patch.menuOpacity))) / 100;
                const tintC = current.menuTintColor || DEFAULT_THEME.menuTintColor;
                popup.style.setProperty('--fxn-menu-bg', hexToRgba(tintC, alpha));
                popup.style.setProperty('--fxn-menu-navbtn', hexToRgba(tintC, Math.min(1, alpha + 0.02)));
                popup.style.setProperty('--fxn-menu-navactive', hexToRgba(tintC, Math.min(1, alpha + 0.08)));
                opacityValEls.forEach(el => { el.textContent = `${Math.round(patch.menuOpacity)}%`; });
            }
            if ('menuTintColor' in patch) {
                const alpha = Math.max(0, Math.min(100, parseFloat(current.menuOpacity))) / 100;
                const tintC = patch.menuTintColor || DEFAULT_THEME.menuTintColor;
                popup.style.setProperty('--fxn-menu-bg', hexToRgba(tintC, alpha));
                popup.style.setProperty('--fxn-menu-navbtn', hexToRgba(tintC, Math.min(1, alpha + 0.02)));
                popup.style.setProperty('--fxn-menu-navactive', hexToRgba(tintC, Math.min(1, alpha + 0.08)));
            }
            debouncedSaveMenuSettings(current);
            return;
        }

        enabledEls.forEach(el => {
            if ('checked' in el) el.checked = !!current.menuTransparent;
            el.classList.toggle('on', !!current.menuTransparent);
        });
        controlsBoxes.forEach(box => {
            box.style.display = current.menuTransparent ? 'flex' : 'none';
            if (current.menuTransparent) box.style.flexDirection = 'column';
        });
        outlineGroups.forEach(grp => {
            grp.style.display = current.menuTransparent ? '' : 'none';
        });

        scrimBlurEls.forEach(el => {
            if ('checked' in el) el.checked = current.scrimBlurEnabled !== false;
            el.classList.toggle('on', current.scrimBlurEnabled !== false);
        });

        tintEls.forEach(el => { el.value = current.menuTintColor; });
        const tintDot = document.getElementById('fxnModalMenuTintDot');
        const tintHex = document.getElementById('fxnModalMenuTintHex');
        if (tintDot) tintDot.style.background = current.menuTintColor;
        if (tintHex) tintHex.textContent = current.menuTintColor;

        opacityEls.forEach(el => { el.value = current.menuOpacity; });
        opacityValEls.forEach(el => { el.textContent = `${Math.round(current.menuOpacity)}%`; });

        blurEnabledEls.forEach(el => {
            if ('checked' in el) el.checked = !!current.menuBlurEnabled;
            el.classList.toggle('on', !!current.menuBlurEnabled);
        });
        blurControlBoxes.forEach(box => {
            box.style.display = current.menuBlurEnabled ? 'block' : 'none';
        });
        blurEls.forEach(el => { el.value = current.menuBlur; });
        blurValEls.forEach(el => { el.textContent = `${Math.round(current.menuBlur)}px`; });

        applyFptMenuTransparency(current);
        if (saveNow) {
            clearTimeout(_menuSaveTimer);
            saveMenuSettings(current);
        } else {
            debouncedSaveMenuSettings(current);
        }

        const oEnabled = document.getElementById('fxnTextOutlineEnabled') || document.getElementById('fxnModalTextOutlineEnabled');
        const oColor = document.getElementById('fxnTextOutlineColor') || document.getElementById('fxnModalTextOutlineColor');
        const oWidth = document.getElementById('fxnTextOutlineWidth') || document.getElementById('fxnModalTextOutlineWidth');
        const outlineColorVal = (oColor && oColor.value) || '#000000';
        const outlineDot = document.getElementById('fxnModalTextOutlineDot');
        const outlineHex = document.getElementById('fxnModalTextOutlineHex');
        if (outlineDot) outlineDot.style.background = outlineColorVal;
        if (outlineHex) outlineHex.textContent = outlineColorVal;

        applyFptTextOutline({
            ...current,
            textOutlineEnabled: !!(oEnabled && (oEnabled.checked ?? oEnabled.classList.contains('on'))),
            textOutlineColor: outlineColorVal,
            textOutlineWidth: oWidth ? parseFloat(oWidth.value) : 1
        });
    };

    const wireListener = (el, event, handler) => {
        if (!el || el.dataset.fptWired === 'true') return;
        el.dataset.fptWired = 'true';
        el.addEventListener(event, handler);
    };

    enabledEls.forEach(el => {
        wireListener(el, 'change', (e) => {
            const isChecked = el.tagName === 'INPUT' ? el.checked : (e.detail?.checked ?? el.classList.contains('on'));
            onMenuChange({ menuTransparent: isChecked }, true);
        });
    });

    scrimBlurEls.forEach(el => {
        wireListener(el, 'change', (e) => {
            const isChecked = el.tagName === 'INPUT' ? el.checked : (e.detail?.checked ?? el.classList.contains('on'));
            onMenuChange({ scrimBlurEnabled: isChecked }, true);
        });
    });

    tintEls.forEach(el => {
        wireListener(el, 'input', (e) => onMenuChange({ menuTintColor: e.target.value }, false));
        wireListener(el, 'change', (e) => onMenuChange({ menuTintColor: e.target.value }, true));
    });

    opacityEls.forEach(el => {
        wireListener(el, 'input', (e) => onMenuChange({ menuOpacity: parseFloat(e.target.value) }, false));
        wireListener(el, 'change', (e) => onMenuChange({ menuOpacity: parseFloat(e.target.value) }, true));
    });

    blurEnabledEls.forEach(el => {
        wireListener(el, 'change', (e) => {
            const isChecked = el.tagName === 'INPUT' ? el.checked : (e.detail?.checked ?? el.classList.contains('on'));
            onMenuChange({ menuBlurEnabled: isChecked }, true);
        });
    });

    blurEls.forEach(el => {
        wireListener(el, 'input', (e) => onMenuChange({ menuBlur: parseFloat(e.target.value) }, false));
        wireListener(el, 'change', (e) => onMenuChange({ menuBlur: parseFloat(e.target.value) }, true));
    });

    const resetBtn = document.getElementById('fxnModalResetMenuBtn');
    if (resetBtn && resetBtn.dataset.fptWired !== 'true') {
        resetBtn.dataset.fptWired = 'true';
        resetBtn.addEventListener('click', async () => {
            const defaults = {
                menuTransparent: DEFAULT_THEME.menuTransparent,
                menuTintColor: DEFAULT_THEME.menuTintColor,
                menuOpacity: DEFAULT_THEME.menuOpacity,
                menuBlurEnabled: DEFAULT_THEME.menuBlurEnabled,
                menuBlur: DEFAULT_THEME.menuBlur,
                scrimBlurEnabled: DEFAULT_THEME.scrimBlurEnabled,
                textOutlineEnabled: DEFAULT_THEME.textOutlineEnabled,
                textOutlineColor: DEFAULT_THEME.textOutlineColor,
                textOutlineWidth: DEFAULT_THEME.textOutlineWidth
            };
            await saveMenuSettings(defaults);
            syncFptMenuControls();
            if (typeof showNotification === 'function') {
                showNotification('Настройки меню Foxen сброшены к стандартным');
            }
        });
    }

    setupFptTextOutline();
}

// Пере-синхронизирует контролы из storage (вызывается при каждом открытии меню или модалки)
async function syncFptMenuControls() {
    const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTheme');
    const s = { ...DEFAULT_THEME, ...foxenTheme };

    // 1. Меню
    const enabledEls = [document.getElementById('fxnMenuTransparentEnabled'), document.getElementById('fxnModalMenuTransparent')].filter(Boolean);
    const tintEls = [document.getElementById('fxnMenuTintColor'), document.getElementById('fxnModalMenuTintColor')].filter(Boolean);
    const opacityEls = [document.getElementById('fxnMenuOpacity'), document.getElementById('fxnModalMenuOpacity')].filter(Boolean);
    const opacityValEls = [document.getElementById('fxnMenuOpacityValue'), document.getElementById('fxnModalMenuOpacityValue')].filter(Boolean);
    const blurEnabledEls = [document.getElementById('fxnMenuBlurEnabled'), document.getElementById('fxnModalMenuBlurEnabled')].filter(Boolean);
    const blurEls = [document.getElementById('fxnMenuBlur'), document.getElementById('fxnModalMenuBlur')].filter(Boolean);
    const blurValEls = [document.getElementById('fxnMenuBlurValue'), document.getElementById('fxnModalMenuBlurValue')].filter(Boolean);
    const scrimBlurEls = [document.getElementById('fxnScrimBlurEnabled'), document.getElementById('fxnModalScrimBlurEnabled')].filter(Boolean);

    const controlsBoxes = [document.getElementById('fxnMenuTransparentControls'), document.getElementById('fxnModalMenuTransparentControls')].filter(Boolean);
    const blurControlBoxes = [document.getElementById('fxnMenuBlurControls'), document.getElementById('fxnModalMenuBlurControls')].filter(Boolean);
    const outlineGroups = [document.getElementById('fxnTextOutlineGroup'), document.getElementById('fxnModalTextOutlineGroup')].filter(Boolean);

    enabledEls.forEach(el => {
        if ('checked' in el) el.checked = !!s.menuTransparent;
        el.classList.toggle('on', !!s.menuTransparent);
    });
    controlsBoxes.forEach(box => {
        box.style.display = s.menuTransparent ? 'flex' : 'none';
        if (s.menuTransparent) box.style.flexDirection = 'column';
    });
    outlineGroups.forEach(grp => {
        grp.style.display = s.menuTransparent ? '' : 'none';
    });

    const isScrimBlur = s.scrimBlurEnabled !== false;
    scrimBlurEls.forEach(el => {
        if ('checked' in el) el.checked = isScrimBlur;
        el.classList.toggle('on', isScrimBlur);
    });

    const currentTint = s.menuTintColor || DEFAULT_THEME.menuTintColor;
    tintEls.forEach(el => { el.value = currentTint; });
    const tintDot = document.getElementById('fxnModalMenuTintDot');
    const tintHex = document.getElementById('fxnModalMenuTintHex');
    if (tintDot) tintDot.style.background = currentTint;
    if (tintHex) tintHex.textContent = currentTint;

    const op = s.menuOpacity !== undefined ? s.menuOpacity : DEFAULT_THEME.menuOpacity;
    opacityEls.forEach(el => { el.value = op; });
    opacityValEls.forEach(el => { el.textContent = `${Math.round(op)}%`; });

    const blurEn = s.menuBlurEnabled !== undefined ? s.menuBlurEnabled : DEFAULT_THEME.menuBlurEnabled;
    blurEnabledEls.forEach(el => {
        if ('checked' in el) el.checked = !!blurEn;
        el.classList.toggle('on', !!blurEn);
    });
    blurControlBoxes.forEach(box => {
        box.style.display = blurEn ? 'block' : 'none';
    });

    const blur = s.menuBlur !== undefined ? s.menuBlur : DEFAULT_THEME.menuBlur;
    blurEls.forEach(el => { el.value = blur; });
    blurValEls.forEach(el => { el.textContent = `${Math.round(blur)}px`; });

    // 2. Контур текста
    const oEnEls = [document.getElementById('fxnTextOutlineEnabled'), document.getElementById('fxnModalTextOutlineEnabled')].filter(Boolean);
    const oCtlBoxes = [document.getElementById('fxnTextOutlineControls'), document.getElementById('fxnModalTextOutlineControls')].filter(Boolean);
    const oColEls = [document.getElementById('fxnTextOutlineColor'), document.getElementById('fxnModalTextOutlineColor')].filter(Boolean);
    const oWEs = [document.getElementById('fxnTextOutlineWidth'), document.getElementById('fxnModalTextOutlineWidth')].filter(Boolean);
    const oWVEs = [document.getElementById('fxnTextOutlineWidthValue'), document.getElementById('fxnModalTextOutlineWidthValue')].filter(Boolean);

    oEnEls.forEach(el => {
        if ('checked' in el) el.checked = !!s.textOutlineEnabled;
        el.classList.toggle('on', !!s.textOutlineEnabled);
    });
    oCtlBoxes.forEach(box => {
        box.style.display = s.textOutlineEnabled ? 'flex' : 'none';
        if (s.textOutlineEnabled) box.style.flexDirection = 'column';
    });
    const currentOutlineColor = s.textOutlineColor || '#000000';
    oColEls.forEach(el => { el.value = currentOutlineColor; });
    const outlineDot = document.getElementById('fxnModalTextOutlineDot');
    const outlineHex = document.getElementById('fxnModalTextOutlineHex');
    if (outlineDot) outlineDot.style.background = currentOutlineColor;
    if (outlineHex) outlineHex.textContent = currentOutlineColor;

    oWEs.forEach(el => { el.value = s.textOutlineWidth !== undefined ? s.textOutlineWidth : 1; });
    oWVEs.forEach(el => { el.textContent = `${s.textOutlineWidth !== undefined ? s.textOutlineWidth : 1}px`; });

    applyFptMenuTransparency(s);
    applyFptTextOutline(s);
    if (typeof window.updateFoxenAllSliders === 'function') {
        window.updateFoxenAllSliders();
    }
}

// ── Контур тексту ───────────────────────────────────────────────────────────
async function applyFptTextOutline(override) {
    let s = override;
    if (!s) {
        const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTheme');
        s = { ...DEFAULT_THEME, ...foxenTheme };
    }
    const STYLE_ID = 'fxn-text-outline-style';
    let styleEl = document.getElementById(STYLE_ID);

    const liveTranspEl = document.getElementById('fxnMenuTransparentEnabled') || document.getElementById('fxnModalMenuTransparent');
    const menuTransparent = liveTranspEl ? (liveTranspEl.checked ?? liveTranspEl.classList.contains('on')) : !!s.menuTransparent;

    if (!s.textOutlineEnabled || !menuTransparent) {
        if (styleEl) styleEl.remove();
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
    }
    const w = Math.max(0, parseFloat(s.textOutlineWidth) || 0);
    const c = s.textOutlineColor || '#000000';
    if (w <= 0) { if (styleEl) styleEl.textContent = ''; return; }

    const o = w.toFixed(2);
    const shadow = [
        `${o}px 0 0 ${c}`, `-${o}px 0 0 ${c}`, `0 ${o}px 0 ${c}`, `0 -${o}px 0 ${c}`,
        `${o}px ${o}px 0 ${c}`, `-${o}px -${o}px 0 ${c}`, `${o}px -${o}px 0 ${c}`, `-${o}px ${o}px 0 ${c}`
    ].join(', ');
    styleEl.textContent = `
        .foxen-popup h1, .foxen-popup h2, .foxen-popup h3, .foxen-popup h4,
        .foxen-popup h5, .foxen-popup p, .foxen-popup span:not(.material-symbols-rounded):not(.material-icons):not(.nav-icon),
        .foxen-popup label, .foxen-popup a, .foxen-popup li, .foxen-popup small,
        .foxen-popup .range-label, .foxen-popup b, .foxen-popup strong, .foxen-popup code {
            text-shadow: ${shadow} !important;
        }
        .foxen-popup input, .foxen-popup textarea, .foxen-popup select,
        .foxen-popup .material-symbols-rounded, .foxen-popup .material-icons,
        .foxen-popup .nav-icon {
            text-shadow: none !important;
        }
    `;
}

async function setupFptTextOutline() {
    const { foxenTheme = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenTheme');
    const s = { ...DEFAULT_THEME, ...foxenTheme };

    const enabledEls = [document.getElementById('fxnTextOutlineEnabled'), document.getElementById('fxnModalTextOutlineEnabled')].filter(Boolean);
    const controlsBoxes = [document.getElementById('fxnTextOutlineControls'), document.getElementById('fxnModalTextOutlineControls')].filter(Boolean);
    const colorEls = [document.getElementById('fxnTextOutlineColor'), document.getElementById('fxnModalTextOutlineColor')].filter(Boolean);
    const widthEls = [document.getElementById('fxnTextOutlineWidth'), document.getElementById('fxnModalTextOutlineWidth')].filter(Boolean);
    const widthValEls = [document.getElementById('fxnTextOutlineWidthValue'), document.getElementById('fxnModalTextOutlineWidthValue')].filter(Boolean);

    const wireListener = (el, event, handler) => {
        if (!el || el.dataset.fptOutlineWired === 'true') return;
        el.dataset.fptOutlineWired = 'true';
        el.addEventListener(event, handler);
    };

    const read = () => {
        const isEn = enabledEls[0] ? (enabledEls[0].checked ?? enabledEls[0].classList.contains('on')) : !!s.textOutlineEnabled;
        const col = (colorEls[0] && colorEls[0].value) || '#000000';
        const w = widthEls[0] ? parseFloat(widthEls[0].value) : 1;
        return {
            textOutlineEnabled: isEn,
            textOutlineColor: col,
            textOutlineWidth: w
        };
    };

    const save = async () => {
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
            const next = { ...DEFAULT_THEME, ...foxenTheme, ...read() };
            delete next.bgImage;
            await ext.storage.local.set({ foxenTheme: next });
        } catch (_) {}
    };

    const onOutlineChange = (patch, saveNow = false) => {
        const cur = { ...read(), ...patch };
        enabledEls.forEach(el => {
            if ('checked' in el) el.checked = !!cur.textOutlineEnabled;
            el.classList.toggle('on', !!cur.textOutlineEnabled);
        });
        controlsBoxes.forEach(box => {
            box.style.display = cur.textOutlineEnabled ? 'flex' : 'none';
            if (cur.textOutlineEnabled) box.style.flexDirection = 'column';
        });
        colorEls.forEach(el => { el.value = cur.textOutlineColor; });
        const outlineDot = document.getElementById('fxnModalTextOutlineDot');
        const outlineHex = document.getElementById('fxnModalTextOutlineHex');
        if (outlineDot) outlineDot.style.background = cur.textOutlineColor;
        if (outlineHex) outlineHex.textContent = cur.textOutlineColor;

        widthEls.forEach(el => { el.value = cur.textOutlineWidth; });
        widthValEls.forEach(el => { el.textContent = `${cur.textOutlineWidth}px`; });

        applyFptTextOutline({ ...DEFAULT_THEME, ...s, ...cur });
        if (saveNow) save();
    };

    enabledEls.forEach(el => {
        wireListener(el, 'change', (e) => {
            const isChecked = el.tagName === 'INPUT' ? el.checked : (e.detail?.checked ?? el.classList.contains('on'));
            onOutlineChange({ textOutlineEnabled: isChecked }, true);
        });
    });

    colorEls.forEach(el => {
        wireListener(el, 'input', (e) => onOutlineChange({ textOutlineColor: e.target.value }, false));
        wireListener(el, 'change', (e) => onOutlineChange({ textOutlineColor: e.target.value }, true));
    });

    widthEls.forEach(el => {
        wireListener(el, 'input', (e) => onOutlineChange({ textOutlineWidth: parseFloat(e.target.value) }, false));
        wireListener(el, 'change', (e) => onOutlineChange({ textOutlineWidth: parseFloat(e.target.value) }, true));
    });
}

// Ensure custom theme and animated-bg safeguards are applied on load
applyCustomTheme().catch(() => {});