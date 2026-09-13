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

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
/**
 * Modern Foxen Toast Notification V5
 * High z-index (2147483647), glassmorphism card, status icons, micro-header, progress bar, close button.
 */
function showNotification(message, isError = false) {
    const NOTIFICATION_DURATION = 4000;

    let container = document.getElementById('foxen-notification-container');
    if (!container) {
        container = createElement('div', { id: 'foxen-notification-container' }, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'flex-end',
            pointerEvents: 'none',
            maxWidth: '420px'
        });
        document.body.appendChild(container);
    }

    const toast = createElement('div', { className: 'fxn-toast' }, {
        position: 'relative',
        background: 'rgba(18, 18, 22, 0.94)',
        border: isError ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        webkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '14px',
        padding: '14px 16px 14px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        minWidth: '280px',
        maxWidth: '380px',
        pointerEvents: 'auto',
        overflow: 'hidden',
        animation: 'fxnToastIn 0.35s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif'
    });

    const activeAccent = (!isError && (window.__foxenAccentColor || document.querySelector('.foxen-popup')?.style.getPropertyValue('--fxn-accent')?.trim() || '#c026d3')) || '#ef4444';
    const iconBg = isError ? 'rgba(239, 68, 68, 0.18)' : (activeAccent.startsWith('#') ? activeAccent + '24' : 'rgba(192, 38, 211, 0.18)');
    const iconBorder = isError ? 'rgba(239, 68, 68, 0.4)' : (activeAccent.startsWith('#') ? activeAccent + '55' : 'rgba(192, 38, 211, 0.4)');
    const iconColor = isError ? '#ef4444' : activeAccent;
    const iconSymbol = isError ? '✕' : '✓';
    const headerTitle = isError ? 'FOXEN // ОШИБКА' : 'FOXEN // СИСТЕМА';
    const progressColor = isError ? '#ef4444' : activeAccent;

    toast.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 9px; background: ${iconBg}; border: 1px solid ${iconBorder}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: ${iconColor}; font-size: 15px; font-weight: 800;">
            ${iconSymbol}
        </div>
        <div style="flex: 1; min-width: 0;">
            <div style="font-size: 10px; font-weight: 700; color: ${isError ? '#f87171' : 'rgba(255, 255, 255, 0.45)'}; letter-spacing: 0.08em; text-transform: uppercase; font-family: ui-monospace, 'JetBrains Mono', monospace; margin-bottom: 3px;">
                ${headerTitle}
            </div>
            <div style="font-size: 13px; font-weight: 500; color: #f4f4f3; line-height: 1.4; word-break: break-word;">
                ${message}
            </div>
        </div>
        <div class="fxn-toast-close" style="cursor: pointer; opacity: 0.45; transition: opacity 0.15s; font-size: 12px; color: #ffffff; padding: 2px 4px; border-radius: 4px;" title="Закрыть">
            ✕
        </div>
        <div style="position: absolute; bottom: 0; left: 0; height: 2.5px; background: ${progressColor}; width: 100%; animation: fxnToastProgress ${NOTIFICATION_DURATION}ms linear forwards; border-radius: 0 0 14px 14px;"></div>
    `;

    if (!document.querySelector('style[data-foxen-toast-styles]')) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-foxen-toast-styles', 'true');
        styleEl.textContent = `
            @keyframes fxnToastIn {
                from { opacity: 0; transform: translateY(16px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes fxnToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(10px) scale(0.92); }
            }
            @keyframes fxnToastProgress {
                from { width: 100%; }
                to { width: 0%; }
            }
            .fxn-toast-close:hover { opacity: 1 !important; background: rgba(255,255,255,0.1); }
        `;
        document.head.appendChild(styleEl);
    }

    const closeBtn = toast.querySelector('.fxn-toast-close');
    const dismiss = () => {
        toast.style.animation = 'fxnToastOut 0.25s ease forwards';
        setTimeout(() => toast.remove(), 250);
    };
    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    container.appendChild(toast);
    setTimeout(dismiss, NOTIFICATION_DURATION);
}

/**
 * Modern Unified Foxen Pro Color Picker (2D HSV Canvas + Hue Slider + Hex + 16 Curated Presets)
 */
function foxenOpenColorPicker(anchorEl, initialColor = '#c026d3', onChange) {
    // Remove any open picker first
    document.querySelector('.fxn-pro-color-picker')?.remove();

    let hex = initialColor.startsWith('#') ? initialColor : '#' + initialColor;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) hex = '#C026D3';

    // Convert Hex -> RGB -> HSV
    function hexToHsv(h) {
        let r = parseInt(h.slice(1, 3), 16) / 255;
        let g = parseInt(h.slice(3, 5), 16) / 255;
        let b = parseInt(h.slice(5, 7), 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let d = max - min;
        let hVal = 0;
        if (d !== 0) {
            if (max === r) hVal = ((g - b) / d) % 6;
            else if (max === g) hVal = (b - r) / d + 2;
            else hVal = (r - g) / d + 4;
            hVal = Math.round(hVal * 60);
            if (hVal < 0) hVal += 360;
        }
        let sVal = max === 0 ? 0 : d / max;
        let vVal = max;
        return { h: hVal, s: sVal, v: vVal };
    }

    // Convert HSV -> RGB -> Hex
    function hsvToHex(h, s, v) {
        let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
        let r = Math.round(f(5) * 255).toString(16).padStart(2, '0');
        let g = Math.round(f(3) * 255).toString(16).padStart(2, '0');
        let b = Math.round(f(1) * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
    }

    let hsv = hexToHsv(hex);

    const picker = document.createElement('div');
    picker.className = 'fxn-pro-color-picker';
    const isLight = !!document.querySelector('.window.light-theme, .foxen-popup.light-theme, .fxn-popup.light-theme');
    if (isLight) {
        picker.classList.add('light-theme');
    }

    const presets = [
        '#C026D3', '#EC4899', '#8B5CF6', '#6366F1',
        '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
        '#EAB308', '#F97316', '#EF4444', '#F43F5E',
        '#64748B', '#94A3B8', '#E2E8F0', '#FFFFFF'
    ];

    const presetsHtml = presets.map(p => `
        <div class="fxn-picker-swatch ${p.toLowerCase() === hex.toLowerCase() ? 'active' : ''}" style="background:${p};" data-color="${p}"></div>
    `).join('');

    picker.innerHTML = `
        <div class="fxn-picker-header">
            <span class="fxn-picker-title">Палитра цветов</span>
            <div class="fxn-picker-preview" id="fxnPickerDot" style="background:${hex}; color:${hex};"></div>
        </div>
        <div class="fxn-picker-canvas-wrap" id="fxnCanvasWrap">
            <canvas id="fxnPickerCanvas" width="216" height="120"></canvas>
            <div class="fxn-picker-handle" id="fxnPickerHandle"></div>
        </div>
        <div class="fxn-picker-controls">
            <input type="range" min="0" max="360" value="${hsv.h}" class="fxn-picker-hue" id="fxnPickerHue">
        </div>
        <div class="fxn-picker-inputs">
            <div class="fxn-picker-hex-wrap">
                <span class="fxn-picker-hash">#</span>
                <input type="text" class="fxn-picker-hex" id="fxnPickerHex" value="${hex.replace('#', '')}" maxlength="6" spellcheck="false">
            </div>
            <button class="fxn-picker-copy" id="fxnPickerCopy" title="Скопировать HEX" type="button">
                <span class="material-icons" style="font-size:15px;">content_copy</span>
            </button>
        </div>
        <div class="fxn-picker-presets">
            ${presetsHtml}
        </div>
    `;

    document.body.appendChild(picker);

    // Position popover
    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        let top = rect.bottom + 8;
        let left = rect.left;
        if (left + 260 > window.innerWidth) left = window.innerWidth - 270;
        if (top + 340 > window.innerHeight) top = Math.max(10, rect.top - 340);
        if (top < 10) top = 10;
        if (left < 10) left = 10;
        picker.style.top = top + 'px';
        picker.style.left = left + 'px';
    } else {
        picker.style.top = '50%';
        picker.style.left = '50%';
        picker.style.transform = 'translate(-50%, -50%)';
    }

    const canvas = picker.querySelector('#fxnPickerCanvas');
    const ctx = canvas.getContext('2d');
    const handle = picker.querySelector('#fxnPickerHandle');
    const dot = picker.querySelector('#fxnPickerDot');
    const hexInput = picker.querySelector('#fxnPickerHex');
    const hueSlider = picker.querySelector('#fxnPickerHue');

    function drawCanvas() {
        const w = canvas.width, h = canvas.height;
        // Base hue
        ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
        ctx.fillRect(0, 0, w, h);

        // White gradient (left to right)
        let whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
        whiteGrad.addColorStop(0, '#ffffff');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, w, h);

        // Black gradient (top to bottom)
        let blackGrad = ctx.createLinearGradient(0, 0, 0, h);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, '#000000');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, w, h);
    }

    function updateHandlePosition() {
        handle.style.left = `${Math.max(0, Math.min(100, hsv.s * 100))}%`;
        handle.style.top = `${Math.max(0, Math.min(100, (1 - hsv.v) * 100))}%`;
    }

    let lastHueDrawn = -1;
    function updateColor(newHex, triggerCallback = true, hueChanged = true) {
        hex = newHex.toUpperCase();
        const nextHsv = hexToHsv(hex);
        if (nextHsv.s > 0 && nextHsv.v > 0) {
            hsv.h = nextHsv.h;
        }
        hsv.s = nextHsv.s;
        hsv.v = nextHsv.v;

        if (hueChanged || lastHueDrawn !== hsv.h) {
            lastHueDrawn = hsv.h;
            drawCanvas();
        }
        updateHandlePosition();
        if (dot) {
            dot.style.background = hex;
            dot.style.color = hex;
        }
        if (hexInput && hexInput.value.toUpperCase() !== hex.replace('#', '')) {
            hexInput.value = hex.replace('#', '');
        }
        if (hueSlider && Number(hueSlider.value) !== hsv.h) {
            hueSlider.value = hsv.h;
        }
        picker.querySelectorAll('.fxn-picker-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.color.toUpperCase() === hex);
        });
        if (triggerCallback && typeof onChange === 'function') {
            onChange(hex, isFinal);
        }
    }

    lastHueDrawn = hsv.h;
    drawCanvas();
    updateHandlePosition();

    // Fast 2D Canvas Dragging with zero lag
    const canvasWrap = picker.querySelector('#fxnCanvasWrap');
    let isDraggingCanvas = false;

    function handleCanvasMove(e, isFinal = false) {
        const rect = canvas.getBoundingClientRect();
        let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        hsv.s = rect.width ? (x / rect.width) : 0;
        hsv.v = rect.height ? (1 - (y / rect.height)) : 0;
        const newHex = hsvToHex(hsv.h, hsv.s, hsv.v);
        updateColor(newHex, true, false, isFinal);
    }

    const onMouseDown = (e) => {
        e.preventDefault();
        isDraggingCanvas = true;
        handleCanvasMove(e, false);
    };
    canvasWrap.addEventListener('mousedown', onMouseDown);

    const onMouseMove = (e) => {
        if (isDraggingCanvas) handleCanvasMove(e, false);
    };
    const onMouseUp = () => {
        if (isDraggingCanvas) {
            isDraggingCanvas = false;
            if (typeof onChange === 'function') onChange(hex, true);
        }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Hue Slider
    hueSlider.addEventListener('input', (e) => {
        hsv.h = Number(e.target.value);
        const newHex = hsvToHex(hsv.h, hsv.s, hsv.v);
        updateColor(newHex, true, true, false);
    });
    hueSlider.addEventListener('change', () => {
        if (typeof onChange === 'function') onChange(hex, true);
    });

    // Hex Input
    hexInput.addEventListener('input', (e) => {
        let val = e.target.value.trim().replace('#', '');
        if (/^[0-9A-Fa-f]{6}$/.test(val)) {
            updateColor('#' + val, true, true, false);
        } else if (/^[0-9A-Fa-f]{3}$/.test(val)) {
            const expanded = val.split('').map(c => c + c).join('');
            updateColor('#' + expanded, true, true, false);
        }
    });
    hexInput.addEventListener('change', () => {
        if (typeof onChange === 'function') onChange(hex, true);
    });

    // Copy Button
    picker.querySelector('#fxnPickerCopy').addEventListener('click', () => {
        navigator.clipboard.writeText(hex);
        if (typeof showNotification === 'function') showNotification('HEX скопирован: ' + hex);
    });

    // Presets
    picker.querySelectorAll('.fxn-picker-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            updateColor(sw.dataset.color, true, true, true);
        });
    });

    // Close on outside click & cleanup listeners
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!picker.contains(e.target) && (!anchorEl || !anchorEl.contains(e.target))) {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('click', closeHandler);
                if (typeof onChange === 'function') onChange(hex, true);
                picker.remove();
            }
        };
        document.addEventListener('click', closeHandler);
    }, 50);

    return picker;
}

if (typeof window !== 'undefined') {
    window.foxenOpenColorPicker = foxenOpenColorPicker;
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
    // акцент берём из настроек пользователя (bgColor2/bgColor1) или фолбэк #C026D3
    let customAccentHex = (window._foxenThemeSettings && (window._foxenThemeSettings.bgColor2 || window._foxenThemeSettings.bgColor1)) || null;
    let accent = customAccentHex ? (fxnParseRGB(customAccentHex) || [193, 38, 211, 1]) : [193, 38, 211, 1];

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
let _fxnThemeApplying = false;
let _fxnLastPaletteJson = '';

function fxnApplyThemeVars() {
    if (_fxnThemeApplying) return;
    _fxnThemeApplying = true;
    try {
        const p = fxnComputePalette();
        const pJson = JSON.stringify(p);
        if (pJson === _fxnLastPaletteJson) return;
        _fxnLastPaletteJson = pJson;

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
    finally {
        _fxnThemeApplying = false;
    }
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
    // следим за сменой темы: класс на <html>/<body> (НЕ style, чтобы не зацикливать при выставлении CSS-переменных)
    try {
        const mo = new MutationObserver(() => {
            if (_fxnThemeApplying) return;
            clearTimeout(window.__fptThemeT);
            window.__fptThemeT = setTimeout(fxnApplyThemeVars, 150);
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
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
