// 3.0: Image reference store. Instead of dumping a giant [image:data:...base64...] string
// into textareas (ugly, "in your face"), we insert a short readable token like {img:ab12cd}
// and keep the real data URL in chrome.storage under foxenImageStore. Senders resolve
// tokens → data URLs right before sending. Old [image:dataURL] tags still work too.
const FPT_IMG_STORE_KEY = 'foxenImageStore';
async function fxnStoreImage(dataUrl) {
    const id = Math.random().toString(36).slice(2, 8);
    try {
        const { [FPT_IMG_STORE_KEY]: store = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(FPT_IMG_STORE_KEY);
        store[id] = dataUrl;
        const keys = Object.keys(store);
        if (keys.length > 200) delete store[keys[0]];
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [FPT_IMG_STORE_KEY]: store });
    } catch (_) {}
    return id;
}

// 3.0: guards against "Extension context invalidated" errors. When the extension reloads or
// updates, old content-script contexts linger on the page; any chrome.* call from them throws.
// Use fxnExtAlive() before chrome.* calls in observers/listeners, and fxnSafe() to wrap them.
function fxnExtAlive() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (_) { return false; }
}
async function fxnSafe(fn, fallback) {
    if (!fxnExtAlive()) return fallback;
    try { return await fn(); } catch (e) {
        if (String(e && e.message || '').includes('Extension context invalidated')) return fallback;
        throw e;
    }
}

// 3.0: Preload the bundled Material Symbols font the moment the extension activates on the
// page, so icons are ready before the menu is ever opened. The woff2 is bundled in the
// extension and served from chrome-extension://, so the browser caches it on disk
// effectively forever (no network, instant on subsequent loads). We additionally warm the
// CSS Font Loading API cache here.
(function preloadMaterialIcons() {
    try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return;
        const url = chrome.runtime.getURL('fonts/material-symbols-rounded.woff2');
        const face = new FontFace(
            'Material Symbols Rounded',
            `url(${url}) format('woff2')`,
            { style: 'normal', weight: '400', display: 'block' }
        );
        face.load().then(loaded => {
            try { document.fonts.add(loaded); } catch (_) {}
        }).catch(() => { /* CSS @font-face fallback still applies */ });
    } catch (_) {}
})();

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function createElement(tag, attributes = {}, styles = {}, innerHTML = '') {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    for (const [key, value] of Object.entries(styles)) {
        element.style[key] = value;
    }
    element.innerHTML = innerHTML;
    return element;
}

function waitForElementToBeEnabled(element, timeout = 2000) {
    return new Promise((resolve) => {
        if (!element.disabled) {
            return resolve();
        }
        const interval = 50;
        let elapsedTime = 0;
        const checker = setInterval(() => {
            elapsedTime += interval;
            if (!element.disabled || elapsedTime >= timeout) {
                clearInterval(checker);
                resolve();
            }
        }, interval);
    });
}

/**
 * --- НОВАЯ ВЕРСИЯ УВЕДОМЛЕНИЙ V4 (Более масштабная анимация) ---
 * Показывает уведомление с предварительной анимацией частиц.
 * @param {string} message - Текст для отображения.
 * @param {boolean} isError - Если true, уведомление будет в стиле ошибки.
 */
function showNotification(message, isError = false) {
    const NOTIFICATION_DURATION = 7000;
    const PARTICLE_ANIMATION_DURATION = 1000;
    const NOTIFICATION_APPEAR_DELAY = 500;
    const PARTICLE_COUNT = 25;

    const particleContainer = createElement('div', { 'aria-hidden': 'true' });
    const animationId = `foxenParticleAnimation-${Date.now()}`;
    const styleTagId = `foxen-particle-style-${Date.now()}`;

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    const targetX = window.innerWidth - 150;
    const targetY = window.innerHeight - 60;

    const keyframes = `
        @keyframes ${animationId} {
            0% {
                transform: translate(var(--startX), var(--startY)) scale(var(--startScale));
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                transform: translate(${targetX - startX}px, ${targetY - startY}px) scale(0);
                opacity: 0;
            }
        }
    `;

    const styleTag = createElement('style', { id: styleTagId }, {}, keyframes);
    document.head.appendChild(styleTag);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 150 + 50;
        const particleSize = Math.random() * 8 + 6;

        const particle = createElement('div', {}, {
            '--startX': `${Math.cos(angle) * radius}px`,
            '--startY': `${Math.sin(angle) * radius}px`,
            '--startScale': `${Math.random() * 0.5 + 0.8}`,
            position: 'fixed',
            top: `${startY}px`,
            left: `${startX}px`,
            width: `${particleSize}px`,
            height: `${particleSize}px`,
            background: isError ? '#FF8A80' : '#A259FF',
            borderRadius: '50%',
            zIndex: '20001',
            pointerEvents: 'none',
            opacity: '0',
            transform: `translate(var(--startX), var(--startY)) scale(0)`,
            animation: `${animationId} ${PARTICLE_ANIMATION_DURATION}ms cubic-bezier(0.5, 0.05, 0.6, 1) forwards`,
            animationDelay: `${Math.random() * 200}ms`,
        });
        
        const tail = createElement('div', {}, {
             width: '150%', height: '150%', position: 'absolute', top: '-25%', left: '-25%',
             borderRadius: '50%', background: isError ? '#FF8A80' : '#A259FF',
             filter: 'blur(8px)', opacity: '0.7'
        });
        particle.appendChild(tail);

        particleContainer.appendChild(particle);
    }
    document.body.appendChild(particleContainer);
    
    requestAnimationFrame(() => {
        Array.from(particleContainer.children).forEach(p => {
            p.style.transition = 'transform 0.4s cubic-bezier(0.1, 0.8, 0.7, 1), opacity 0.3s ease';
            p.style.transform = `translate(var(--startX), var(--startY)) scale(var(--startScale))`;
            p.style.opacity = '1';
        });
    });

    setTimeout(() => {
        let container = document.getElementById('foxen-notification-container');
        if (!container) {
            container = createElement('div', { id: 'foxen-notification-container' }, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: '20000',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'flex-end',
                pointerEvents: 'none'
            });
            document.body.appendChild(container);
        }

        const FADE_OUT_DELAY = NOTIFICATION_DURATION - 500;

        const notification = createElement('div', {}, {
            position: 'relative',
            background: isError ? 'rgba(194, 57, 42, 0.92)' : 'var(--fxn-surface-2, rgba(44, 47, 51, 0.9))',
            color: isError ? '#fff' : 'var(--fxn-text, #A259FF)',
            padding: '14px 22px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            boxShadow: '0 5px 25px var(--fxn-shadow, rgba(0, 0, 0, 0.3))',
            border: '1px solid var(--fxn-border, rgba(255, 255, 255, 0.1))',
            backdropFilter: 'blur(8px)',
            webkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
            transform: 'scale(0.8)',
            opacity: '0',
            animation: `foxenEmerge 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards, foxenFadeOut 0.5s ${FADE_OUT_DELAY / 1000}s forwards`
        }, message);

        if (!document.querySelector('style[data-foxen-notify-keyframes]')) {
            const keyframesStyle = `
                @keyframes foxenEmerge {
                    from { opacity: 0; transform: scale(0.8) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes foxenFadeOut {
                    from { opacity: 1; transform: scale(1); margin-top: 0; margin-bottom: 0; } 
                    to { opacity: 0; transform: scale(0.9); margin-top: -20px; margin-bottom: -20px; }
                }
            `;
            const keyframesStyleSheet = createElement("style", { 'data-foxen-notify-keyframes': 'true' }, {}, keyframesStyle);
            document.head.appendChild(keyframesStyleSheet);
        }

        container.appendChild(notification);
        
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, NOTIFICATION_DURATION);

    }, NOTIFICATION_APPEAR_DELAY);


    setTimeout(() => {
        if (document.body.contains(particleContainer)) {
            document.body.removeChild(particleContainer);
        }
        if (document.head.contains(styleTag)) {
            document.head.removeChild(styleTag);
        }
    }, PARTICLE_ANIMATION_DURATION + 300);
}

// === ВЛОЖЕНИЯ ИЗОБРАЖЕНИЙ (отдельно от текста) ===
// Картинки больше НЕ вставляются в поле ввода. Вместо этого под полем появляется чип
// "Прикреплённая картинка" с возможностью посмотреть (👁) и убрать (✕). Сами данные хранятся
// отдельно и подставляются только в момент отправки - пользователь видит чистый текст.
const __fptAttachments = new Map(); // textarea (element) -> [{id, dataUrl}]

function fxnGetAttachments(textarea) {
    return __fptAttachments.get(textarea) || [];
}

// Send order: 'text_first' = сообщение → картинка, 'image_first' = картинка → сообщение.
// Stored on the textarea dataset so senders/savers can read it without a separate map.
function fxnGetSendOrder(textarea) {
    const v = textarea && textarea.dataset ? textarea.dataset.fxnSendOrder : '';
    return v === 'image_first' ? 'image_first' : 'text_first';
}
function fxnSetSendOrder(textarea, order) {
    if (!textarea || !textarea.dataset) return;
    textarea.dataset.fxnSendOrder = (order === 'image_first') ? 'image_first' : 'text_first';
}

// Build the icon-only "order" mini-row markup (no words, just icons + arrow).
function fxnOrderIconsHtml(order) {
    if (order === 'image_first') {
        return `<span class="material-symbols-rounded fxn-order-img">image</span>` +
               `<span class="fxn-order-arrow">→</span>` +
               `<span class="material-symbols-rounded fxn-order-msg">chat_bubble</span>`;
    }
    return `<span class="material-symbols-rounded fxn-order-msg">chat_bubble</span>` +
           `<span class="fxn-order-arrow">→</span>` +
           `<span class="material-symbols-rounded fxn-order-img">image</span>`;
}

// Icon-only popup that lets the user pick the send order. No text at all - the
// two rows are: 💬 → 🖼️  and  🖼️ → 💬. Returns nothing; calls onPick(order).
function fxnShowOrderPopup(anchorEl, current, onPick) {
    document.querySelectorAll('.fxn-order-popup').forEach(p => p.remove());

    const popup = document.createElement('div');
    popup.className = 'fxn-order-popup';
    const mk = (order) => `
        <div class="fxn-order-opt${order === current ? ' active' : ''}" data-order="${order}" title="">
            ${fxnOrderIconsHtml(order)}
            <span class="material-symbols-rounded fxn-order-check">check</span>
        </div>`;
    popup.innerHTML = mk('text_first') + mk('image_first');
    document.body.appendChild(popup);

    // position below the anchor, clamped to viewport
    const r = anchorEl.getBoundingClientRect();
    const pw = popup.offsetWidth || 160;
    let left = r.left + window.scrollX;
    if (left + pw > window.scrollX + window.innerWidth - 8) {
        left = window.scrollX + window.innerWidth - pw - 8;
    }
    popup.style.left = Math.max(8, left) + 'px';
    popup.style.top = (r.bottom + window.scrollY + 6) + 'px';

    popup.addEventListener('click', (e) => {
        const opt = e.target.closest('.fxn-order-opt');
        if (!opt) return;
        const order = opt.dataset.order;
        if (typeof onPick === 'function') onPick(order);
        popup.remove();
        document.removeEventListener('mousedown', outside, true);
    });

    const outside = (e) => {
        if (!popup.contains(e.target)) {
            popup.remove();
            document.removeEventListener('mousedown', outside, true);
        }
    };
    // defer so the opening click doesn't immediately close it
    setTimeout(() => document.addEventListener('mousedown', outside, true), 0);
}

function fxnRenderAttachments(textarea) {
    // find or create the attachments container right after the textarea
    let box = textarea.parentNode && textarea.parentNode.querySelector(':scope > .fxn-attachments');
    if (!box) {
        box = document.createElement('div');
        box.className = 'fxn-attachments';
        textarea.insertAdjacentElement('afterend', box);
    }
    const list = fxnGetAttachments(textarea);
    box.innerHTML = '';
    list.forEach((att) => {
        const order = fxnGetSendOrder(textarea);
        const chip = document.createElement('div');
        chip.className = 'fxn-attachment-chip';
        chip.title = 'Нажмите, чтобы выбрать порядок отправки';
        // Whole chip is clickable → opens the icon-only order picker. The view/remove
        // buttons stop propagation so they still work independently.
        chip.innerHTML = `
            <span class="material-symbols-rounded fxn-att-ic">image</span>
            <span class="fxn-att-label">Прикреплённое изображение</span>
            <span class="fxn-order-mini" aria-hidden="true">${fxnOrderIconsHtml(order)}</span>
            <span class="material-symbols-rounded fxn-att-hint">tune</span>
            <button type="button" class="fxn-att-view" title="Посмотреть"><span class="material-symbols-rounded">visibility</span></button>
            <button type="button" class="fxn-att-remove" title="Убрать"><span class="material-symbols-rounded">close</span></button>
        `;
        // click anywhere on the chip (except the action buttons) → order picker
        chip.addEventListener('click', (e) => {
            if (e.target.closest('.fxn-att-view') || e.target.closest('.fxn-att-remove')) return;
            e.preventDefault();
            fxnShowOrderPopup(chip, fxnGetSendOrder(textarea), (newOrder) => {
                fxnSetSendOrder(textarea, newOrder);
                fxnRenderAttachments(textarea);
                textarea.dispatchEvent(new CustomEvent('fxn-attachment-changed', { bubbles: true }));
            });
        });
        chip.querySelector('.fxn-att-view').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fxnShowImagePreview(att.dataUrl);
        });
        chip.querySelector('.fxn-att-remove').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const arr = fxnGetAttachments(textarea).filter(a => a.id !== att.id);
            if (arr.length) __fptAttachments.set(textarea, arr); else __fptAttachments.delete(textarea);
            fxnRenderAttachments(textarea);
            // also persist on the element dataset so senders can read it
            textarea.dataset.fxnImages = JSON.stringify(fxnGetAttachments(textarea).map(a => a.dataUrl));
            textarea.dispatchEvent(new CustomEvent('fxn-attachment-changed', { bubbles: true }));
        });
        box.appendChild(chip);
    });
}

function fxnShowImagePreview(dataUrl) {
    const overlay = document.createElement('div');
    overlay.className = 'fxn-img-preview-overlay';
    overlay.innerHTML = `<div class="fxn-img-preview-inner"><img src="${dataUrl}" alt="preview"><button type="button" class="fxn-img-preview-close"><span class="material-symbols-rounded">close</span></button></div>`;
    const close = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.fxn-img-preview-close').addEventListener('click', close);
    document.body.appendChild(overlay);
}

let __fptImagePickerOpen = false;
function handleImageAddClick(targetTextarea) {
    if (__fptImagePickerOpen) return;
    __fptImagePickerOpen = true;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/gif, image/webp';
    fileInput.style.display = 'none';

    const cleanup = () => {
        __fptImagePickerOpen = false;
        if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
    };
    fileInput.addEventListener('cancel', cleanup, { once: true });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) { cleanup(); return; }
        if (file.size > 1 * 1024 * 1024) {
            showNotification('Файл слишком большой. Выберите изображение до 1 МБ.', true);
            cleanup();
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const id = Math.random().toString(36).slice(2, 8);
            const arr = fxnGetAttachments(targetTextarea);
            arr.push({ id, dataUrl });
            __fptAttachments.set(targetTextarea, arr);
            // store on the element so the sender can pick them up (separate from text value)
            targetTextarea.dataset.fxnImages = JSON.stringify(arr.map(a => a.dataUrl));
            fxnRenderAttachments(targetTextarea);
            // Trigger autosave ONCE via a non-bubbling custom event (avoids re-render loops /
            // flicker that a bubbling 'input' caused on the whole popup).
            targetTextarea.dispatchEvent(new CustomEvent('fxn-attachment-changed', { bubbles: true }));
            if (typeof showNotification === 'function') showNotification('Картинка прикреплена.');
            cleanup();
        };
        reader.onerror = () => { showNotification('Не удалось прочитать файл.', true); cleanup(); };
        reader.readAsDataURL(file);
    }, { once: true });

    document.body.appendChild(fileInput);
    fileInput.click();
}

// ════════════════════════════════════════════════════════════════════════════
// 3.0: ОБЩИЙ ДВИЖОК ТЕМЫ (парсинг цветов со страницы)
// Многие наши окна (системные уведомления, глобальный импорт, аналитика рынка,
// статистика продаж и т.д.) раньше были захардкожены под тёмно-фиолетовую палитру
// и «шакалили» на светлой/кастомной теме FunPay. Этот движок ОДИН РАЗ парсит реальные
// цвета страницы и выставляет CSS-переменные --fxn-* на :root. Фичи ссылаются на эти
// переменные вместо фиксированных цветов - и автоматически совпадают с любой темой.
// ════════════════════════════════════════════════════════════════════════════

// rgb(a) / hex → [r,g,b,a]
function fxnParseRGB(str) {
    if (!str) return null;
    str = String(str).trim();
    let m = str.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const p = m[1].split(',').map(s => parseFloat(s.trim()));
        return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] == null ? 1 : p[3]];
    }
    m = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
        let h = m[1];
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    return null;
}
function fxnRgbStr(rgb, a) { return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${a == null ? (rgb[3] == null ? 1 : rgb[3]) : a})`; }
function fxnLuma(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
// смешать цвет к белому/чёрному на долю t (0..1)
function fxnMix(rgb, toward, t) {
    const tgt = toward === 'white' ? [255, 255, 255] : [0, 0, 0];
    return [rgb[0] + (tgt[0] - rgb[0]) * t, rgb[1] + (tgt[1] - rgb[1]) * t, rgb[2] + (tgt[2] - rgb[2]) * t, 1];
}

// Находит ближайший НЕпрозрачный фон. Идём по широкому списку реальных контейнеров
// FunPay и поднимаемся к <html>. Если у элемента фон прозрачный - берём вычисленный
// фон через родителей. Это критично: на белой теме фон часто покрашен на .content/html,
// а не на body, и раньше детект ошибочно считал тему тёмной.
function fxnResolveBg() {
    const sel = [
        '.content-with-cd-wide', '.content-with-cd', '.content',
        '.page-content', '.chat-contacts', '.chat',
        'main', '#content', '.container'
    ];
    const candidates = [];
    for (const s of sel) { const el = document.querySelector(s); if (el) candidates.push(el); }
    candidates.push(document.body, document.documentElement);

    for (const start of candidates) {
        let el = start;
        // поднимаемся по дереву, пока не найдём непрозрачный фон
        for (let i = 0; el && i < 12; i++, el = el.parentElement) {
            const rgb = fxnParseRGB(getComputedStyle(el).backgroundColor);
            if (rgb && rgb[3] > 0.2) return rgb;
        }
    }
    // последний шанс - фон html/body даже если бледный
    const bodyBg = fxnParseRGB(getComputedStyle(document.body).backgroundColor);
    if (bodyBg && bodyBg[3] > 0) return bodyBg;
    return [255, 255, 255, 1]; // дефолт - СВЕТЛЫЙ (белая тема FunPay по умолчанию)
}

// Главная функция: парсит палитру и возвращает набор производных цветов.
function fxnComputePalette() {
    let bg = fxnResolveBg();
    const textRaw = fxnParseRGB(getComputedStyle(document.body).color) || [224, 224, 224, 1];

    // Если наша кастомная тема ВЫКЛЮЧЕНА, базовая страница FunPay - светлая по
    // умолчанию (тёмной её делает только сам сайт в редких темах). Чтобы случайный
    // тёмный фон какого-то контейнера (или нашего же окна) не «переключал» палитру
    // в тёмную при перемещении меню, при выключенной теме фон считаем светлым,
    // если он подозрительно тёмный.
    try {
        if (document.documentElement.classList.contains('fxn-custom-theme-off')) {
            // Если фон вышел тёмным, но текст страницы тёмный - это противоречие
            // (на тёмном фоне текст светлый). Значит фон считан ошибочно с тёмного
            // оверлея/нашего окна → принудительно светлая база.
            const txtDark = textRaw && fxnLuma(textRaw) < 0.5;
            if (fxnLuma(bg) < 0.5 && txtDark) bg = [255, 255, 255, 1];
        }
    } catch (_) {}

    const dark = fxnLuma(bg) < 0.5; // тёмная тема?

    // поверхности: чуть светлее (на тёмной) или чуть темнее (на светлой) основного фона
    const surface  = fxnMix(bg, dark ? 'white' : 'black', dark ? 0.05 : 0.03);
    const surface2 = fxnMix(bg, dark ? 'white' : 'black', dark ? 0.10 : 0.06);
    const border   = fxnMix(bg, dark ? 'white' : 'black', dark ? 0.16 : 0.12);
    const hover    = fxnMix(bg, dark ? 'white' : 'black', dark ? 0.14 : 0.08);
    const text     = textRaw;
    const textMuted = dark ? fxnMix(textRaw, 'black', 0.35) : fxnMix(textRaw, 'white', 0.35);
    // акцент берём фирменный фанпеевский, но это можно переопределить
    const accent = [193, 38, 211, 1]; // #C026D3 - но используем умеренно

    return {
        dark,
        bg:        fxnRgbStr(bg),
        surface:   fxnRgbStr(surface),
        surface2:  fxnRgbStr(surface2),
        border:    fxnRgbStr(border),
        hover:     fxnRgbStr(hover),
        text:      fxnRgbStr(text),
        textMuted: fxnRgbStr(textMuted),
        accent:    fxnRgbStr(accent),
        accentSoft: fxnRgbStr(accent, dark ? 0.18 : 0.12),
        shadow:    dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.18)'
    };
}

// Выставляет CSS-переменные --fxn-* на :root.
function fxnApplyThemeVars() {
    try {
        const p = fxnComputePalette();
        const r = document.documentElement.style;
        r.setProperty('--fxn-bg',         p.bg);
        r.setProperty('--fxn-surface',    p.surface);
        r.setProperty('--fxn-surface-2',  p.surface2);
        r.setProperty('--fxn-border',     p.border);
        r.setProperty('--fxn-hover',      p.hover);
        r.setProperty('--fxn-text',       p.text);
        r.setProperty('--fxn-text-muted', p.textMuted);
        r.setProperty('--fxn-accent',     p.accent);
        r.setProperty('--fxn-accent-soft',p.accentSoft);
        r.setProperty('--fxn-shadow',     p.shadow);
        document.documentElement.classList.toggle('fxn-theme-dark', p.dark);
        document.documentElement.classList.toggle('fxn-theme-light', !p.dark);
    } catch (e) { /* noop */ }
}

// Инициализация + реакция на смену темы (FunPay-тема, наша кастомная тема, смена страницы).
let __fptThemeInited = false;
function fxnInitThemeEngine() {
    if (__fptThemeInited) return;
    __fptThemeInited = true;
    fxnApplyThemeVars();
    // повтор после полной загрузки (на случай если фон применяется позже)
    if (document.readyState !== 'complete') {
        window.addEventListener('load', fxnApplyThemeVars, { once: true });
    }
    // следим за сменой темы: класс/стиль на <html>/<body>
    try {
        const mo = new MutationObserver(() => {
            clearTimeout(window.__fptThemeT);
            window.__fptThemeT = setTimeout(fxnApplyThemeVars, 80);
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (_) {}
}

// запуск как можно раньше
if (document.body) fxnInitThemeEngine();
else document.addEventListener('DOMContentLoaded', fxnInitThemeEngine, { once: true });

// Если вкладку открыли в фоне, computed-стили могли посчитаться до отрисовки -
// палитра выходила «чёрной». Переприменяем при возврате на вкладку и фокусе.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { try { fxnApplyThemeVars(); } catch (_) {} }
});
window.addEventListener('focus', () => { try { fxnApplyThemeVars(); } catch (_) {} });
window.addEventListener('pageshow', () => { try { fxnApplyThemeVars(); } catch (_) {} });
