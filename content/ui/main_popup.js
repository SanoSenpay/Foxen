// content/ui/main_popup.js


function createMainPopup() {
    const toolsPopup = document.createElement('div');
    toolsPopup.className = 'fp-tools-popup';
    toolsPopup.innerHTML = getMainPopupHTML();
    return toolsPopup;
}

const FP_WALLPAPER_PRESETS = [
    { name: 'Горы и озеро', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon><line x1="3" y1="22" x2="21" y2="22"></line></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2023/03/iso-republic-mountain-winter-lake.jpg', palette: { bgColor1: '#1a3050', bgColor2: '#4a7aaa', containerBgColor: '#0d1828', textColor: '#dde8f4', linkColor: '#7aaad8' } },
    { name: 'Туманные горы', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2023/02/iso-republic-napa-hill-fog.jpg', palette: { bgColor1: '#1e2830', bgColor2: '#5a7888', containerBgColor: '#101820', textColor: '#d8e4ec', linkColor: '#7aaac0' } },
    { name: 'Каньон', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H4L3 9L12 2L21 9V20Z"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2023/03/iso-republic-rough-rocky-landscape.jpg', palette: { bgColor1: '#2a1808', bgColor2: '#a85030', containerBgColor: '#180e04', textColor: '#f0ddd0', linkColor: '#e08060' } },
    { name: 'Горный туман', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2022/10/iso-republic-mist-mountains-clouds.jpg', palette: { bgColor1: '#151e2a', bgColor2: '#3a6090', containerBgColor: '#0a1018', textColor: '#dce8f8', linkColor: '#6090c8' } },
    { name: 'Закат', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M3 18h18"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2022/11/iso-republic-clouds-sky-trees.jpg', palette: { bgColor1: '#280a18', bgColor2: '#c84810', containerBgColor: '#180508', textColor: '#f8ddd0', linkColor: '#f08060' } },
    { name: 'Пустыня', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"></path><path d="M12 20v-8"></path><path d="M12 12c-4 0-4-8-4-8s0 8-4 8"></path><path d="M12 12c4 0 4-8 4-8s0 8 4 8"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2023/06/iso-republic-desert-barren-sky.jpg', palette: { bgColor1: '#201808', bgColor2: '#c89840', containerBgColor: '#100c04', textColor: '#f8ead8', linkColor: '#e0b860' } },
    { name: 'Побережье', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"></path><path d="M2 18h20"></path><path d="M2 6h20"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2023/05/iso-republic-scenic-coast-beach-03.jpg', palette: { bgColor1: '#082028', bgColor2: '#2888a0', containerBgColor: '#041018', textColor: '#d8eef8', linkColor: '#50a8c8' } },
    { name: 'Млечный путь', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M2 12h20"></path><circle cx="12" cy="12" r="2"></circle></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2025/02/isorepublic-milky-way.jpg', palette: { bgColor1: '#080618', bgColor2: '#4030a0', containerBgColor: '#04030e', textColor: '#e0d8f8', linkColor: '#8070e0' } },
    { name: 'Звёзды', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2022/12/iso-republic-mikly-way-trees-sky.jpg', palette: { bgColor1: '#040a18', bgColor2: '#103868', containerBgColor: '#020508', textColor: '#d8e8f8', linkColor: '#4080b8' } },
    { name: 'Синий дуотон', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2022/10/iso-republic-abstract-wallpaper-duotone.jpg', palette: { bgColor1: '#080e28', bgColor2: '#1840c0', containerBgColor: '#040818', textColor: '#d8e0f8', linkColor: '#4868e8' } },
    { name: 'Тёмно-синий', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2024/05/iso-republic-abstract-wallpaper-dark-blues.jpg', palette: { bgColor1: '#030610', bgColor2: '#0c2890', containerBgColor: '#020408', textColor: '#d0d8f0', linkColor: '#3060c8' } },
    { name: 'Мягкий боке', emoji: '<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v20"></path><path d="M2 12h20"></path></svg></span>', url: 'https://isorepublic.com/wp-content/uploads/2022/10/iso-republic-abstract-wallpaper-soft-blur.jpg', palette: { bgColor1: '#0e0618', bgColor2: '#6030b0', containerBgColor: '#06030c', textColor: '#e8d8f8', linkColor: '#9060e0' } }
];

const FP_WP_CACHE_KEY = 'fpToolsWallpaperCache';
const FP_WP_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const _fpWpImgCache = new Map();

async function _getWpCache() {
    try { const r = await browser.storage.local.get(FP_WP_CACHE_KEY); return r[FP_WP_CACHE_KEY] || {}; } catch { return {}; }
}
async function _markWpCached(url) {
    try { const c = await _getWpCache(); c[url] = { ts: Date.now() }; await browser.storage.local.set({ [FP_WP_CACHE_KEY]: c }); } catch { }
}

let _wpIndex = 0;
let _wpLoading = false;

async function _loadCarouselSlide(index) {
    if (_wpLoading) return;
    const preset = FP_WALLPAPER_PRESETS[index];
    if (!preset) return;
    _wpLoading = true;

    const slot = document.getElementById('fp-wp-img-slot');
    const loaderEl = document.getElementById('fp-wp-loader');
    const bar = document.getElementById('fp-wp-bar');
    const pct = document.getElementById('fp-wp-pct');
    const emoji = document.getElementById('fp-wp-emoji');
    const nameEl = document.getElementById('fp-wp-name');
    const counter = document.getElementById('fp-wp-counter');
    const applyBtn = document.getElementById('fp-wp-apply-cur');
    if (!slot) { _wpLoading = false; return; }

    nameEl.textContent = preset.name;
    counter.textContent = `${index + 1} / ${FP_WALLPAPER_PRESETS.length}`;
    emoji.innerHTML = preset.emoji;
    if (applyBtn) applyBtn.style.display = 'none';

    if (_fpWpImgCache.has(preset.url)) {
        const img = _fpWpImgCache.get(preset.url).cloneNode();
        _showCarouselImg(img, slot, loaderEl);
        _wpLoading = false;
        return;
    }

    loaderEl.style.display = 'flex';
    slot.innerHTML = '';
    bar.style.width = '0%'; pct.textContent = '0%';

    const storageCache = await _getWpCache();
    const cached = storageCache[preset.url] && Date.now() - storageCache[preset.url].ts < FP_WP_CACHE_TTL;

    if (!cached) {
        let fakeP = 0;
        slot._fakeIv = setInterval(() => {
            fakeP = Math.min(fakeP + Math.random() * 10, 88);
            bar.style.width = Math.round(fakeP) + '%';
            pct.textContent = Math.round(fakeP) + '%';
        }, 150);
    } else {
        bar.style.width = '90%'; pct.textContent = '…';
    }

    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.width = 160;
    img.src = preset.url;

    try {
        await img.decode();
        if (slot._fakeIv) { clearInterval(slot._fakeIv); delete slot._fakeIv; }
        bar.style.width = '100%'; pct.textContent = '100%';
        _fpWpImgCache.set(preset.url, img);
        if (!cached) _markWpCached(preset.url);
        _showCarouselImg(img.cloneNode(), slot, loaderEl);
    } catch {
        if (slot._fakeIv) { clearInterval(slot._fakeIv); delete slot._fakeIv; }
        _wpLoading = false;
        _wpIndex = (index + 1) % FP_WALLPAPER_PRESETS.length;
        _loadCarouselSlide(_wpIndex);
        return;
    }
    _wpLoading = false;
}

function _showCarouselImg(img, slot, loaderEl) {
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;opacity:0;transition:opacity .35s ease;pointer-events:none;';
    slot.innerHTML = '';
    slot.appendChild(img);
    const applyBtn = document.getElementById('fp-wp-apply-cur');
    if (applyBtn) applyBtn.style.display = 'block';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        img.style.opacity = '1';
        if (loaderEl) loaderEl.style.display = 'none';
    }));
}

function initializeWallpaperPresets() {
    const carousel = document.getElementById('fp-wallpaper-carousel');
    if (!carousel || carousel.dataset.initialized) return;
    carousel.dataset.initialized = '1';

    _wpIndex = 0;
    _loadCarouselSlide(0);

    document.getElementById('fp-wp-prev')?.addEventListener('click', () => {
        if (_wpLoading) return;
        _wpIndex = (_wpIndex - 1 + FP_WALLPAPER_PRESETS.length) % FP_WALLPAPER_PRESETS.length;
        _loadCarouselSlide(_wpIndex);
    });
    document.getElementById('fp-wp-next')?.addEventListener('click', () => {
        if (_wpLoading) return;
        _wpIndex = (_wpIndex + 1) % FP_WALLPAPER_PRESETS.length;
        _loadCarouselSlide(_wpIndex);
    });
    document.getElementById('fp-wp-apply-cur')?.addEventListener('click', () => {
        const preset = FP_WALLPAPER_PRESETS[_wpIndex];
        if (preset) applyWallpaperPreset(preset);
    });
    document.getElementById('fp-apply-dark-preset')?.addEventListener('click', applyBlackThemePreset);
}

async function applyWallpaperPreset(preset, cardEl) {
    const { fpToolsTheme = {} } = await browser.storage.local.get('fpToolsTheme');
    const newTheme = { ...fpToolsTheme, bgImage: preset.url, enableCustomTheme: true, ...preset.palette };
    await browser.storage.local.set({ fpToolsTheme: newTheme, enableCustomTheme: true });

    const previewDiv = document.getElementById('bg-image-preview');
    if (previewDiv) { previewDiv.style.backgroundImage = `url(${preset.url})`; previewDiv.textContent = ''; }

    _updateColorInputs(preset.palette);
    const cb = document.getElementById('enableCustomThemeCheckbox');
    if (cb) cb.checked = true;

    if (typeof applyCustomTheme === 'function') applyCustomTheme();
    if (typeof showNotification === 'function') showNotification(`Обои «${preset.name}» применены ✓`);
}

async function applyBlackThemePreset() {
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 2, 2);
    const base64 = canvas.toDataURL('image/png');

    const darkPalette = { bgColor1: '#0a0a0a', bgColor2: '#222222', containerBgColor: '#111111', textColor: '#cccccc', linkColor: '#888888' };
    const { fpToolsTheme = {} } = await browser.storage.local.get('fpToolsTheme');
    const newTheme = { ...fpToolsTheme, bgImage: base64, enableCustomTheme: true, ...darkPalette };
    await browser.storage.local.set({ fpToolsTheme: newTheme, enableCustomTheme: true });

    const previewDiv = document.getElementById('bg-image-preview');
    if (previewDiv) { previewDiv.style.backgroundImage = `url(${base64})`; previewDiv.style.backgroundColor = '#1a1a1a'; previewDiv.textContent = ''; }

    _updateColorInputs(darkPalette);
    const cb = document.getElementById('enableCustomThemeCheckbox');
    if (cb) cb.checked = true;
    document.querySelectorAll('.fp-wallpaper-card').forEach(c => c.style.borderColor = 'transparent');

    if (typeof applyCustomTheme === 'function') applyCustomTheme();
    if (typeof showNotification === 'function') showNotification('Чёрная тема применена ✓');
}

function _updateColorInputs(palette) {
    const map = { bgColor1: 'themeColor1', bgColor2: 'themeColor2', containerBgColor: 'themeContainerBgColor', textColor: 'themeTextColor', linkColor: 'themeLinkColor' };
    Object.entries(map).forEach(([key, id]) => { if (palette[key]) { const el = document.getElementById(id); if (el) el.value = palette[key]; } });
}



function setupPopupNavigation() {
    const toolsPopup = document.querySelector('.fp-tools-popup');
    if (!toolsPopup) return;
    const navItems = toolsPopup.querySelectorAll('.fp-tools-nav li, .fp-tools-header-tab');
    const contentPages = toolsPopup.querySelectorAll('.fp-tools-page-content');

    navItems.forEach(li => {
        if (!li.dataset.page) return;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = li.dataset.page;

            navItems.forEach(item => item.classList.remove('active'));
            li.classList.add('active');

            contentPages.forEach(page => {
                page.classList.toggle('active', page.dataset.page === pageId);
            });

            if (pageId === 'currency_calc') initializeCurrencyCalculator();
            if (pageId === 'notes') { if (typeof initializeNotes === 'function') initializeNotes(); }
            if (pageId === 'templates') { if (typeof setupTemplateSettingsHandlers === 'function') setupTemplateSettingsHandlers(); }
            if (pageId === 'piggy_banks') { if (typeof renderPiggyBankSettings === 'function') renderPiggyBankSettings(); }
            if (pageId === 'lot_io') { if (typeof initializeLotIO === 'function') initializeLotIO(); }
            if (pageId === 'auto_review') { if (typeof initializeAutoReviewUI === 'function') initializeAutoReviewUI(); }
            if (pageId === 'tickets') { initTicketsTab(); }
            if (pageId === 'theme') {
                initializeWallpaperPresets();
                const g = document.getElementById('fp-wallpaper-carousel');
                if (g) g.style.display = 'block';
            } else {
                const g = document.getElementById('fp-wallpaper-carousel');
                if (g) g.style.display = 'none';
            }

            browser.storage.local.set({ fpToolsLastPage: pageId });
        });
    });

    const promoLink = document.querySelector('a[data-nav-to="support"]');
    if (promoLink) {
        promoLink.addEventListener('click', (e) => {
            e.preventDefault();
            const supportTabLi = document.querySelector('.fp-tools-nav li[data-page="support"]');
            if (supportTabLi) supportTabLi.click();
        });
    }
}


async function loadLastActivePage() {
    const { fpToolsLastPage } = await browser.storage.local.get('fpToolsLastPage');
    if (fpToolsLastPage) {
        const itemToActivate = document.querySelector(`.fp-tools-nav li[data-page="${fpToolsLastPage}"]`);
        if (itemToActivate) {
            itemToActivate.click();
        }
    }
}

function makePopupInteractive(popupEl) {
    const header = popupEl.querySelector('.fp-tools-header h2');
    if (!header) return;

    let isDragging = false;
    let offset = { x: 0, y: 0 };
    let hasBeenDragged = false;

    header.addEventListener('mousedown', (e) => {
        if (e.target !== header) return;
        isDragging = true;
        if (!hasBeenDragged) {
            const rect = popupEl.getBoundingClientRect();
            popupEl.style.left = `${rect.left}px`;
            popupEl.style.top = `${rect.top}px`;
            popupEl.classList.add('no-transform');
            hasBeenDragged = true;
        }
        offset.x = e.clientX - popupEl.offsetLeft;
        offset.y = e.clientY - popupEl.offsetTop;
        popupEl.style.transition = 'none';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            let left = e.clientX - offset.x;
            let top = e.clientY - offset.y;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            const popupWidth = popupEl.offsetWidth;
            const popupHeight = popupEl.offsetHeight;
            left = Math.max(0, Math.min(left, winWidth - popupWidth));
            top = Math.max(0, Math.min(top, winHeight - popupHeight));
            popupEl.style.left = `${left}px`;
            popupEl.style.top = `${top}px`;
        }
    });

    window.addEventListener('mouseup', async () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.userSelect = '';
            await browser.storage.local.set({
                fpToolsPopupPosition: { top: popupEl.style.top, left: popupEl.style.left },
                fpToolsPopupDragged: true
            });
        }
    });

    const resizeObserver = new MutationObserver(async () => {
        const newWidth = popupEl.style.width;
        const newHeight = popupEl.style.height;
        await browser.storage.local.set({ fpToolsPopupSize: { width: newWidth, height: newHeight } });
    });
    resizeObserver.observe(popupEl, { attributes: true, attributeFilter: ['style'] });
}