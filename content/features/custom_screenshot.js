// content/features/custom_screenshot.js
// =============================================================================
// Foxen — Кастомный скриншот (Alt + Shift + S)
//
// Возможности:
//   • Карточная организация настроек как в главном окне Foxen (.fxn-ss-card).
//   • Свободная плавная регулировка ползунками (скругление, отступы, тень, рамка).
//   • Автоматическое сохранение всех настроек в chrome.storage.local.
//   • 8 уникальных аутентичных стилей (macOS, Браузер, iPhone, Windows 11,
//     Терминал Cyberpunk, Polaroid, Glass Acrylic, Чистый без рамок).
//   • 100% СОХРАНЕНИЕ ОРИГИНАЛЬНОГО СОДЕРЖИМОГО БЕЗ ОБРЕЗКИ УГЛОВ.
//   • Полный контроль градиента (линейный, радиальный, сплошной, прозрачный).
//   • Полноэкранный режим детального просмотра (Lightbox) с зумом.
//   • Синхронизация с темами Foxen (тёмная, светлая, прозрачное стекло).
// =============================================================================

(function () {
    'use strict';

    const STORAGE_KEY = 'foxenCustomScreenshotSettings';

    // ─────────────────────────────────────────────────────────────────────────
    // СИНХРОНИЗАЦИЯ С МАСТЕРОМ НАСТРОЕК (foxenDisabledFeatures)
    // ─────────────────────────────────────────────────────────────────────────
    let disabledFeatures = new Set();

    async function loadDisabledFeatures() {
        try {
            const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
            if (api && api.storage && api.storage.local) {
                const data = await api.storage.local.get('foxenDisabledFeatures');
                if (Array.isArray(data?.foxenDisabledFeatures)) {
                    disabledFeatures = new Set(data.foxenDisabledFeatures);
                }
            }
        } catch (_) {}
    }
    loadDisabledFeatures();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes.foxenDisabledFeatures) return;
            const arr = Array.isArray(changes.foxenDisabledFeatures.newValue)
                ? changes.foxenDisabledFeatures.newValue
                : [];
            disabledFeatures = new Set(arr);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. УНИКАЛЬНЫЕ ПРЕСЕТЫ СТИЛЕЙ
    // ─────────────────────────────────────────────────────────────────────────

    // 1. УНИКАЛЬНЫЕ ПРЕСЕТЫ СТИЛЕЙ (ТОЛЬКО 4 ТОПОВЫХ СТИЛЯ)
    const THEME_PRESETS = {
        'macos-dark': {
            id: 'macos-dark',
            name: 'macOS',
            icon: 'laptop_mac',
            type: 'macos',
            titlebarHeight: 40,
            titlebarBg: '#262629',
            titleColor: 'rgba(255, 255, 255, 0.75)',
            defaultTitle: 'FunPay — Foxen',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            defaultPadding: 60,
            windowBg: '#1c1c1f',
            shadowBlur: 50,
            shadowOffsetY: 22,
            shadowOpacity: 65,
            shadowColor: '#000000',
            hasTitlebar: true,
            controlsStyle: 'traffic-lights',
            titleAlign: 'center'
        },
        'glass-acrylic': {
            id: 'glass-acrylic',
            name: 'Акрил',
            icon: 'blur_on',
            type: 'glass',
            titlebarHeight: 42,
            titlebarBg: 'rgba(255, 255, 255, 0.08)',
            titleColor: '#ffffff',
            defaultTitle: 'Foxen — Liquid Glass',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.28)',
            defaultPadding: 58,
            windowBg: 'rgba(20, 20, 26, 0.75)',
            shadowBlur: 55,
            shadowOffsetY: 20,
            shadowOpacity: 65,
            shadowColor: '#000000',
            hasTitlebar: true,
            controlsStyle: 'dots-subtle',
            titleAlign: 'center'
        }
    };

    // Готовые палитры градиента
    const GRADIENT_PALETTES = [
        { name: 'Sunset', c1: '#ff9f0a', c2: '#bf5af2', angle: 292 },
        { name: 'Sakura', c1: '#370b24', c2: '#9d174d', c3: '#fb7185', angle: 135 },
        { name: 'Cyberpunk', c1: '#050714', c2: '#082f49', c3: '#00f0ff', angle: 135 },
        { name: 'Sonoma', c1: '#1e1b4b', c2: '#312e81', angle: 135 },
        { name: 'Carbon', c1: '#27272a', c2: '#09090b', angle: 180 },
        { name: 'Midnight', c1: '#020617', c2: '#0f172a', angle: 135 },
        { name: 'Emerald', c1: '#022c22', c2: '#10b981', angle: 135 },
        { name: 'Pitch Black', c1: '#000000', c2: '#000000', angle: 0, isSolid: true }
    ];

    // Определение активной темы Foxen
    function getActiveFoxenTheme() {
        const root = document.documentElement;
        if (root) {
            const attr = root.getAttribute('data-fxn-popup-theme');
            if (attr === 'light' || attr === 'dark' || attr === 'transparent') return attr;
            if (root.classList.contains('fxn-popup-theme-light')) return 'light';
            if (root.classList.contains('fxn-popup-theme-transparent')) return 'transparent';
        }
        return 'dark';
    }

    // Сохранение и загрузка настроек
    function loadSavedSettings() {
        return new Promise((resolve) => {
            try {
                const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
                if (api && api.storage && api.storage.local) {
                    api.storage.local.get([STORAGE_KEY], (res) => {
                        resolve(res && res[STORAGE_KEY] ? res[STORAGE_KEY] : null);
                    });
                    return;
                }
            } catch (_) {}
            resolve(null);
        });
    }

    let saveTimer = null;
    function saveSettings(state) {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                const api = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
                if (api && api.storage && api.storage.local) {
                    const toSave = {
                        themeId: state.themeId,
                        padding: state.padding,
                        borderRadius: state.borderRadius,
                        borderWidth: state.borderWidth,
                        borderColor: state.borderColor,
                        shadowBlur: state.shadowBlur,
                        shadowOffsetY: state.shadowOffsetY,
                        shadowOpacity: state.shadowOpacity,
                        shadowColor: state.shadowColor,
                        shadowStyle: state.shadowStyle,
                        showTitlebar: state.showTitlebar,
                        titlebarHeight: state.titlebarHeight,
                        titleText: state.titleText,
                        titleAlign: state.titleAlign,
                        controlsStyle: state.controlsStyle,
                        gradient: state.gradient
                    };
                    api.storage.local.set({ [STORAGE_KEY]: toSave });
                }
            } catch (_) {}
        }, 250);
    }

    // Вспомогательная функция рисования скруглённого прямоугольника
    function drawRoundRect(ctx, x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ОТРИСОВКА ФОНА ПОДЛОЖКИ (ГРАДИЕНТ, СПЛОШНОЙ, ПРОЗРАЧНЫЙ)
    // ─────────────────────────────────────────────────────────────────────────

    function drawCustomBackdrop(ctx, width, height, grad) {
        const type = grad.type || 'linear';

        if (type === 'transparent') {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        if (type === 'solid') {
            ctx.fillStyle = grad.solidColor || '#000000';
            ctx.fillRect(0, 0, width, height);
            return;
        }

        if (type === 'radial') {
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.max(width, height) * 0.75;
            const rad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
            rad.addColorStop(0, grad.color1 || '#1e1b4b');
            if (grad.useColor3 && grad.color3) {
                rad.addColorStop(0.5, grad.color3);
            }
            rad.addColorStop(1, grad.color2 || '#090d16');
            ctx.fillStyle = rad;
            ctx.fillRect(0, 0, width, height);
            return;
        }

        // Linear gradient
        const angle = typeof grad.angle === 'number' ? grad.angle : 135;
        const angleRad = ((angle - 90) * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const length = Math.abs(width * Math.cos(angleRad)) + Math.abs(height * Math.sin(angleRad));
        const half = length / 2;

        const x1 = cx - Math.cos(angleRad) * half;
        const y1 = cy - Math.sin(angleRad) * half;
        const x2 = cx + Math.cos(angleRad) * half;
        const y2 = cy + Math.sin(angleRad) * half;

        const linear = ctx.createLinearGradient(x1, y1, x2, y2);
        linear.addColorStop(0, grad.color1 || '#0f172a');
        if (grad.useColor3 && grad.color3) {
            linear.addColorStop(0.5, grad.color3);
        }
        linear.addColorStop(1, grad.color2 || '#1e1b4b');

        ctx.fillStyle = linear;
        ctx.fillRect(0, 0, width, height);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ОСНОВНАЯ КОМПОЗИЦИЯ СКРИНШОТА
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // ДЕКОРАТИВНЫЕ ЦВЕТЫ И ЛЕПЕСТКИ САКУРЫ
    // ─────────────────────────────────────────────────────────────────────────

    function drawSingleSakuraPetal(ctx, x, y, size, angleRad, alpha = 0.85) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Градиент лепестка: нежно-розовый кончик, бархатное малиново-розовое основание
        const grad = ctx.createLinearGradient(0, -size, 0, size);
        grad.addColorStop(0, '#ffe4e6');
        grad.addColorStop(0.45, '#f472b6');
        grad.addColorStop(1, '#db2777');

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(219, 39, 119, 0.45)';
        ctx.shadowBlur = size * 0.45;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        // Изящный сердечкообразный силуэт лепестка с маленькой выемкой на верхушке
        ctx.moveTo(0, size);
        ctx.bezierCurveTo(-size * 0.75, size * 0.35, -size * 0.85, -size * 0.5, -size * 0.28, -size);
        ctx.quadraticCurveTo(0, -size * 0.65, size * 0.28, -size);
        ctx.bezierCurveTo(size * 0.85, -size * 0.5, size * 0.75, size * 0.35, 0, size);
        ctx.closePath();
        ctx.fill();

        // Нежная светлая прожилка лепестка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = Math.max(0.7, size * 0.05);
        ctx.beginPath();
        ctx.moveTo(0, size * 0.65);
        ctx.lineTo(0, -size * 0.3);
        ctx.stroke();

        ctx.restore();
    }

    function drawSakuraFlower(ctx, x, y, size, angleRad, alpha = 0.9) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // 5 лепестков цветка сакуры
        for (let i = 0; i < 5; i++) {
            const a = (i * 2 * Math.PI) / 5;
            ctx.save();
            ctx.rotate(a);
            drawSingleSakuraPetal(ctx, 0, size * 0.42, size * 0.55, 0, 1.0);
            ctx.restore();
        }

        // Золотисто-розовая сердцевина цветка
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.fill();

        // Тычинки цветка
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = Math.max(0.8, size * 0.04);
        for (let j = 0; j < 5; j++) {
            const ta = (j * 2 * Math.PI) / 5 + Math.PI / 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ta) * size * 0.24, Math.sin(ta) * size * 0.24);
            ctx.stroke();

            // Точечка пыльника
            ctx.beginPath();
            ctx.arc(Math.cos(ta) * size * 0.25, Math.sin(ta) * size * 0.25, size * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        }

        ctx.restore();
    }

    function drawFloatingSakura(ctx, totalWidth, totalHeight, winX, winY, winW, winH) {
        const padL = winX;
        const padT = winY;
        const padR = Math.max(0, totalWidth - winX - winW);
        const padB = Math.max(0, totalHeight - winY - winH);

        // Масштабирование пропорционально отступам
        const avgPad = Math.max(16, (padL + padT + padR + padB) / 4);
        const scale = Math.max(0.6, Math.min(2.2, avgPad / 55));

        // 1. Нежные цветки сакуры в углах подложки (строго за пределами скриншота)
        drawSakuraFlower(ctx, padL * 0.45, padT * 0.45, 26 * scale, 0.3, 0.9);
        drawSakuraFlower(ctx, winX + winW + padR * 0.55, winY + winH + padB * 0.55, 30 * scale, -0.4, 0.9);
        drawSakuraFlower(ctx, winX + winW + padR * 0.6, padT * 0.4, 22 * scale, 0.8, 0.85);

        // 2. Парящие лепестки вокруг рамки окна скриншота
        const petals = [
            // Верхняя зона отступа
            { x: padL * 0.8, y: padT * 0.25, size: 16, angle: -0.3, alpha: 0.85 },
            { x: winX + winW * 0.18, y: padT * 0.35, size: 15, angle: 0.5, alpha: 0.8 },
            { x: winX + winW * 0.45, y: padT * 0.28, size: 18, angle: -0.8, alpha: 0.85 },
            { x: winX + winW * 0.72, y: padT * 0.4, size: 14, angle: 0.9, alpha: 0.75 },
            // Правая зона отступа
            { x: winX + winW + padR * 0.3, y: padT * 0.85, size: 17, angle: -0.4, alpha: 0.85 },
            { x: winX + winW + padR * 0.7, y: winY + winH * 0.3, size: 21, angle: 0.6, alpha: 0.9 },
            { x: winX + winW + padR * 0.4, y: winY + winH * 0.6, size: 15, angle: -1.1, alpha: 0.8 },
            { x: winX + winW + padR * 0.75, y: winY + winH * 0.85, size: 19, angle: 0.3, alpha: 0.85 },
            // Нижняя зона отступа
            { x: winX + winW * 0.8, y: winY + winH + padB * 0.7, size: 16, angle: -0.7, alpha: 0.8 },
            { x: winX + winW * 0.5, y: winY + winH + padB * 0.4, size: 20, angle: 1.1, alpha: 0.9 },
            { x: winX + winW * 0.22, y: winY + winH + padB * 0.6, size: 14, angle: -0.9, alpha: 0.8 },
            // Левая зона отступа
            { x: padL * 0.3, y: winY + winH + padB * 0.4, size: 22, angle: 0.7, alpha: 0.85 },
            { x: padL * 0.75, y: winY + winH * 0.75, size: 17, angle: -1.2, alpha: 0.8 },
            { x: padL * 0.35, y: winY + winH * 0.5, size: 19, angle: -0.5, alpha: 0.85 },
            { x: padL * 0.7, y: winY + winH * 0.25, size: 15, angle: 0.8, alpha: 0.8 }
        ];

        petals.forEach(p => {
            drawSingleSakuraPetal(ctx, p.x, p.y, p.size * scale, p.angle, p.alpha);
        });
    }

    function renderScreenshotCanvas(sourceImg, state) {
        const theme = THEME_PRESETS[state.themeId] || THEME_PRESETS['macos-dark'];
        const padding = typeof state.padding === 'number' ? state.padding : 56;
        const borderRadius = typeof state.borderRadius === 'number' ? state.borderRadius : 14;
        const borderWidth = typeof state.borderWidth === 'number' ? state.borderWidth : 1;
        const borderColor = state.borderColor || 'rgba(255, 255, 255, 0.12)';
        const showTitlebar = state.showTitlebar;
        const titlebarHeight = state.titlebarHeight || (theme.titlebarHeight || 40);
        const titleText = state.titleText !== undefined ? state.titleText : (theme.defaultTitle || '');
        const titleAlign = state.titleAlign || theme.titleAlign || 'center';
        const controlsStyle = state.controlsStyle || theme.controlsStyle || 'traffic-lights';

        // Область исходного изображения
        let sx = 0;
        let sy = 0;
        let sw = sourceImg.naturalWidth || sourceImg.width;
        let sh = sourceImg.naturalHeight || sourceImg.height;

        if (state.crop && state.crop.width > 20 && state.crop.height > 20) {
            sx = Math.max(0, Math.min(sw - 20, Math.round(state.crop.x)));
            sy = Math.max(0, Math.min(sh - 20, Math.round(state.crop.y)));
            sw = Math.max(20, Math.min(sw - sx, Math.round(state.crop.width)));
            sh = Math.max(20, Math.min(sh - sy, Math.round(state.crop.height)));
        }

        const titlebarH = showTitlebar ? titlebarHeight : 0;

        // Для Polaroid: широкое нижнее поле подписи
        let bottomChinH = (theme.type === 'polaroid') ? 54 : 0;

        // Для устройства iPhone: верхнее поле динамического острова и нижняя полоска Home
        let topBezelH = 0;
        let bottomBezelH = 0;
        if (theme.type === 'device-iphone') {
            topBezelH = titlebarHeight;
            bottomBezelH = 26;
        }

        const windowWidth = sw;
        const windowHeight = (theme.type === 'device-iphone')
            ? (topBezelH + sh + bottomBezelH)
            : (titlebarH + sh + bottomChinH);

        const totalWidth = windowWidth + padding * 2;
        const totalHeight = windowHeight + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        // Координаты размещения окна на холсте
        const winX = padding;
        const winY = padding;

        // 1. Отрисовка настраиваемого фона подложки
        drawCustomBackdrop(ctx, totalWidth, totalHeight, state.gradient);

        // Декоративные цветы и лепестки стиля Сакура (на подложке вокруг окна)
        if (theme.type === 'sakura') {
            drawFloatingSakura(ctx, totalWidth, totalHeight, winX, winY, windowWidth, windowHeight);
        }

        // 2. Тень окна
        if (state.shadowStyle !== 'none' && state.shadowBlur > 0 && state.shadowOpacity > 0) {
            ctx.save();
            const alpha = Math.max(0, Math.min(1, state.shadowOpacity / 100));
            // Поддержка HEX цвета для тени
            let sCol = state.shadowColor || '#000000';
            if (sCol.startsWith('#') && sCol.length === 7) {
                const r = parseInt(sCol.slice(1, 3), 16);
                const g = parseInt(sCol.slice(3, 5), 16);
                const b = parseInt(sCol.slice(5, 7), 16);
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                ctx.shadowColor = `rgba(0, 0, 0, ${alpha})`;
            }

            ctx.shadowBlur = state.shadowBlur;
            ctx.shadowOffsetY = state.shadowOffsetY;
            ctx.fillStyle = theme.windowBg || '#18181b';
            drawRoundRect(ctx, winX, winY, windowWidth, windowHeight, borderRadius);
            ctx.fill();
            ctx.restore();
        }

        // 3. Единая отрисовка окна со скруглением и клиппингом (100% защита от вылезания углов)
        ctx.save();
        drawRoundRect(ctx, winX, winY, windowWidth, windowHeight, borderRadius);
        ctx.clip();

        if (showTitlebar || theme.windowBg !== 'transparent') {
            ctx.fillStyle = theme.windowBg || '#18181b';
            ctx.fillRect(winX, winY, windowWidth, windowHeight);
        }

            // Отрисовка уникального дизайна каждого пресета
            if (theme.type === 'macos' && showTitlebar && titlebarH > 0) {
                // macOS классика
                ctx.fillStyle = theme.titlebarBg || '#262629';
                ctx.fillRect(winX, winY, windowWidth, titlebarH);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(winX, winY + titlebarH - 0.5);
                ctx.lineTo(winX + windowWidth, winY + titlebarH - 0.5);
                ctx.stroke();

                const cy = winY + titlebarH / 2;
                if (controlsStyle === 'traffic-lights') {
                    const dots = [
                        { x: winX + 18, color: '#ff5f56' },
                        { x: winX + 38, color: '#ffbd2e' },
                        { x: winX + 58, color: '#27c93f' }
                    ];
                    dots.forEach(d => {
                        ctx.beginPath();
                        ctx.arc(d.x, cy, 6, 0, Math.PI * 2);
                        ctx.fillStyle = d.color;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    });
                }

                if (titleText) {
                    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
                    ctx.fillStyle = theme.titleColor || 'rgba(255, 255, 255, 0.75)';
                    ctx.textAlign = titleAlign === 'left' ? 'left' : (titleAlign === 'right' ? 'right' : 'center');
                    const tx = titleAlign === 'left' ? (winX + 78) : (titleAlign === 'right' ? (winX + windowWidth - 20) : (winX + windowWidth / 2));
                    ctx.textBaseline = 'middle';
                    ctx.fillText(titleText, tx, cy);
                }
            } else if (theme.type === 'sakura' && showTitlebar && titlebarH > 0) {
                // Сакура: розовая градиентная шапка с цветками сакуры
                const grad = ctx.createLinearGradient(winX, winY, winX + windowWidth, winY);
                grad.addColorStop(0, '#2d1120');
                grad.addColorStop(0.5, '#3d152c');
                grad.addColorStop(1, '#2b101f');
                ctx.fillStyle = grad;
                ctx.fillRect(winX, winY, windowWidth, titlebarH);

                ctx.strokeStyle = 'rgba(244, 114, 182, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(winX, winY + titlebarH - 0.5);
                ctx.lineTo(winX + windowWidth, winY + titlebarH - 0.5);
                ctx.stroke();

                const cy = winY + titlebarH / 2;
                // Лепестковые точки управления (розовые градации сакуры с подсветкой)
                const dots = [
                    { x: winX + 18, color: '#f43f5e' },
                    { x: winX + 38, color: '#fb7185' },
                    { x: winX + 58, color: '#fbcfe8' }
                ];
                dots.forEach(d => {
                    ctx.save();
                    ctx.shadowColor = d.color;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(d.x, cy, 6, 0, Math.PI * 2);
                    ctx.fillStyle = d.color;
                    ctx.fill();
                    ctx.restore();
                });

                if (titleText) {
                    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                    ctx.fillStyle = '#fbcfe8';
                    ctx.textAlign = titleAlign === 'left' ? 'left' : (titleAlign === 'right' ? 'right' : 'center');
                    const tx = titleAlign === 'left' ? (winX + 78) : (titleAlign === 'right' ? (winX + windowWidth - 20) : (winX + windowWidth / 2));
                    ctx.textBaseline = 'middle';
                    ctx.fillText(titleText, tx, cy);
                }
            } else if (theme.type === 'cyberpunk' && showTitlebar && titlebarH > 0) {
                // Неон Киберпанк (HUD / Tech)
                ctx.fillStyle = '#090a10';
                ctx.fillRect(winX, winY, windowWidth, titlebarH);

                // Неоновая многоцветная разделительная линия
                const lineGrad = ctx.createLinearGradient(winX, winY + titlebarH, winX + windowWidth, winY + titlebarH);
                lineGrad.addColorStop(0, '#00f0ff');
                lineGrad.addColorStop(0.5, '#ffe600');
                lineGrad.addColorStop(1, '#ff0055');
                ctx.strokeStyle = lineGrad;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(winX, winY + titlebarH - 0.5);
                ctx.lineTo(winX + windowWidth, winY + titlebarH - 0.5);
                ctx.stroke();

                const cy = winY + titlebarH / 2;
                // Неоновые светящиеся точки
                const dots = [
                    { x: winX + 18, color: '#ff0055' },
                    { x: winX + 38, color: '#ffe600' },
                    { x: winX + 58, color: '#00f0ff' }
                ];
                dots.forEach(d => {
                    ctx.save();
                    ctx.shadowColor = d.color;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(d.x, cy, 5.5, 0, Math.PI * 2);
                    ctx.fillStyle = d.color;
                    ctx.fill();
                    ctx.restore();
                });

                if (titleText) {
                    ctx.save();
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 6;
                    ctx.font = '600 12.5px ui-monospace, "JetBrains Mono", monospace';
                    ctx.fillStyle = '#00f0ff';
                    ctx.textAlign = titleAlign === 'left' ? 'left' : (titleAlign === 'right' ? 'right' : 'center');
                    const tx = titleAlign === 'left' ? (winX + 78) : (titleAlign === 'right' ? (winX + windowWidth - 110) : (winX + windowWidth / 2));
                    ctx.textBaseline = 'middle';
                    ctx.fillText(titleText, tx, cy);
                    ctx.restore();
                }

                // Индикатор [ ONLINE ] справа
                ctx.font = '700 10px monospace';
                ctx.fillStyle = '#00f0ff';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText('[ ONLINE ]', winX + windowWidth - 16, cy);
            } else if (theme.type === 'glass' && showTitlebar && titlebarH > 0) {
                // Акриловое матовое стекло Liquid Glass
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.fillRect(winX, winY, windowWidth, titlebarH);

                // Верхний блик стекла
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(winX, winY + 0.5);
                ctx.lineTo(winX + windowWidth, winY + 0.5);
                ctx.stroke();

                // Нижний разделитель
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.moveTo(winX, winY + titlebarH - 0.5);
                ctx.lineTo(winX + windowWidth, winY + titlebarH - 0.5);
                ctx.stroke();

                const cy = winY + titlebarH / 2;
                const dots = [winX + 18, winX + 34, winX + 50];
                dots.forEach(dx => {
                    ctx.beginPath();
                    ctx.arc(dx, cy, 5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                });

                if (titleText) {
                    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = titleAlign === 'left' ? 'left' : (titleAlign === 'right' ? 'right' : 'center');
                    const tx = titleAlign === 'left' ? (winX + 70) : (titleAlign === 'right' ? (winX + windowWidth - 20) : (winX + windowWidth / 2));
                    ctx.textBaseline = 'middle';
                    ctx.fillText(titleText, tx, cy);
                }
            }

            // 4. ОТРИСОВКА СКРИНШОТА (100% ОРИГИНАЛЬНЫХ ПИКСЕЛЕЙ ВНУТРИ ОКНА)
            const imgDestX = winX;
            const imgDestY = (theme.type === 'device-iphone') ? (winY + topBezelH) : (winY + titlebarH);
            const imgDestW = sw;
            const imgDestH = sh;

            ctx.drawImage(
                sourceImg,
                sx, sy, sw, sh,
                imgDestX, imgDestY, imgDestW, imgDestH
            );

            // 5. Декорации нижней планки (Home indicator iPhone / подпись Polaroid)
            if (theme.type === 'device-iphone') {
                const homeY = winY + topBezelH + sh + (bottomBezelH - 4) / 2;
                const homeW = 130;
                const homeX = winX + (windowWidth - homeW) / 2;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                drawRoundRect(ctx, homeX, homeY, homeW, 4.5, 2.5);
                ctx.fill();
            } else if (theme.type === 'polaroid') {
                const chinY = winY + titlebarH + sh + bottomChinH / 2;
                ctx.font = '500 14px "Caveat", "Segoe Print", -apple-system, cursive, sans-serif';
                ctx.fillStyle = '#18181b';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(titleText || 'FunPay Memo', winX + windowWidth / 2, chinY);
            }

            // Завершаем скругленный клип окна
            ctx.restore();

            // 6. Внешняя рамка точно по контуру скругления
            if (borderWidth > 0 && borderColor !== 'transparent' && theme.type !== 'polaroid') {
                ctx.save();
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth;
                drawRoundRect(ctx, winX, winY, windowWidth, windowHeight, borderRadius);
                ctx.stroke();
                ctx.restore();
            }

        return canvas;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. МОДАЛЬНОЕ ОКНО И ИНТЕРФЕЙС
    // ─────────────────────────────────────────────────────────────────────────

    let activeModal = null;
    let activeLightbox = null;

    async function openCustomScreenshotModal(sourceImg, originalDataUrl) {
        if (activeModal) {
            try { activeModal.remove(); } catch (_) {}
            activeModal = null;
        }

        const activeTheme = getActiveFoxenTheme();
        const natW = sourceImg.naturalWidth || sourceImg.width;
        const natH = sourceImg.naturalHeight || sourceImg.height;

        // Загрузка сохранённых настроек пользователя
        const saved = await loadSavedSettings();

        const defaultPreset = THEME_PRESETS['macos-dark'];
        const state = {
            themeId: (saved && saved.themeId && THEME_PRESETS[saved.themeId]) ? saved.themeId : 'macos-dark',
            padding: (saved && typeof saved.padding === 'number') ? saved.padding : defaultPreset.defaultPadding,
            borderRadius: (saved && typeof saved.borderRadius === 'number') ? saved.borderRadius : defaultPreset.borderRadius,
            borderWidth: (saved && typeof saved.borderWidth === 'number') ? saved.borderWidth : defaultPreset.borderWidth,
            borderColor: (saved && saved.borderColor) ? saved.borderColor : defaultPreset.borderColor,
            shadowBlur: (saved && typeof saved.shadowBlur === 'number') ? saved.shadowBlur : defaultPreset.shadowBlur,
            shadowOffsetY: (saved && typeof saved.shadowOffsetY === 'number') ? saved.shadowOffsetY : defaultPreset.shadowOffsetY,
            shadowOpacity: (saved && typeof saved.shadowOpacity === 'number') ? saved.shadowOpacity : defaultPreset.shadowOpacity,
            shadowColor: (saved && saved.shadowColor) ? saved.shadowColor : '#000000',
            shadowStyle: (saved && saved.shadowStyle) ? saved.shadowStyle : 'custom',
            showTitlebar: (saved && typeof saved.showTitlebar === 'boolean') ? saved.showTitlebar : defaultPreset.hasTitlebar,
            titlebarHeight: (saved && typeof saved.titlebarHeight === 'number') ? saved.titlebarHeight : defaultPreset.titlebarHeight,
            titleText: (saved && saved.titleText !== undefined) ? saved.titleText : defaultPreset.defaultTitle,
            titleAlign: (saved && saved.titleAlign) ? saved.titleAlign : defaultPreset.titleAlign,
            controlsStyle: (saved && saved.controlsStyle) ? saved.controlsStyle : defaultPreset.controlsStyle,
            crop: null,
            isCropMode: false,
            gradient: (saved && saved.gradient) ? saved.gradient : {
                type: 'linear',
                color1: '#ff9f0a',
                color2: '#bf5af2',
                color3: '',
                useColor3: false,
                angle: 292,
                solidColor: '#09090b'
            }
        };

        const modalScrim = document.createElement('div');
        modalScrim.id = 'fxn-screenshot-modal';
        modalScrim.className = 'fxn-ss-scrim';
        modalScrim.setAttribute('data-theme', activeTheme);

                modalScrim.innerHTML = `
            <div class="fxn-ss-window" data-theme="${activeTheme}">
                <!-- Левая колонка: Сайдбар (сайдбар слева, превью справа) -->
                <div class="fxn-ss-sidebar">
                    <!-- Скроллируемая область с карточками настроек -->
                    <div class="fxn-ss-sidebar-scroll">
                        <!-- КАРТОЧКА 1: ОКНО (4 ПРЕСЕТА) -->
                    <div class="fxn-ss-card">
                        <div class="fxn-ss-card-header">
                            <span class="fxn-ss-card-title">Окно</span>
                        </div>
                        <div class="fxn-ss-style-grid">
                            <button type="button" class="fxn-ss-style-btn ${state.themeId === 'macos-dark' ? 'active' : ''}" data-preset="macos-dark" title="Apple macOS">
                                <div class="fxn-ss-style-icon-box">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="16" rx="3"></rect>
                                        <circle cx="7" cy="8" r="1" fill="currentColor"></circle>
                                        <circle cx="10" cy="8" r="1" fill="currentColor"></circle>
                                        <circle cx="13" cy="8" r="1" fill="currentColor"></circle>
                                    </svg>
                                </div>
                                <span class="fxn-ss-style-label">macOS</span>
                            </button>
                            <button type="button" class="fxn-ss-style-btn ${state.themeId === 'glass-acrylic' ? 'active' : ''}" data-preset="glass-acrylic" title="Акрил (Liquid Glass)">
                                <div class="fxn-ss-style-icon-box">
                                    <span class="material-symbols-rounded">blur_on</span>
                                </div>
                                <span class="fxn-ss-style-label">Акрил</span>
                            </button>
                        </div>
                    </div>

                    <!-- КАРТОЧКА 2: ФОН -->
                    <div class="fxn-ss-card">
                        <div class="fxn-ss-card-header">
                            <span class="fxn-ss-card-title">Фон</span>
                        </div>

                        <!-- Список типа заливки -->
                        <div class="fxn-ss-select-wrap">
                            <select class="fxn-ss-select" id="fxnSsBgTypeSelect">
                                <option value="linear" ${state.gradient.type === 'linear' ? 'selected' : ''}>Линейный градиент</option>
                                <option value="radial" ${state.gradient.type === 'radial' ? 'selected' : ''}>Радиальный градиент</option>
                                <option value="solid" ${state.gradient.type === 'solid' ? 'selected' : ''}>Сплошной цвет</option>
                                <option value="transparent" ${state.gradient.type === 'transparent' ? 'selected' : ''}>Прозрачный фон</option>
                            </select>
                            <span class="material-symbols-rounded fxn-ss-select-arrow">unfold_more</span>
                        </div>

                        <!-- Круглые свотчи быстрых палитр (как на макете) -->
                        <div class="fxn-ss-circle-swatches" id="fxnSsPalettesWrap" style="${(state.gradient.type === 'solid' || state.gradient.type === 'transparent') ? 'display:none;' : ''}">
                            ${GRADIENT_PALETTES.map((p, idx) => {
                                const bg = p.isSolid ? p.c1 : (p.c3 ? `linear-gradient(135deg, ${p.c1}, ${p.c2}, ${p.c3})` : `linear-gradient(135deg, ${p.c1}, ${p.c2})`);
                                const isCur = (state.gradient.color1.toLowerCase() === p.c1.toLowerCase() && state.gradient.color2.toLowerCase() === p.c2.toLowerCase());
                                return `
                                    <button type="button" class="fxn-ss-circle-swatch ${isCur ? 'active' : ''}" data-idx="${idx}" title="${p.name}" style="background: ${bg};"></button>
                                `;
                            }).join('')}
                        </div>

                        <!-- Цвета градиента и ползунок угла -->
                        <div class="fxn-ss-grad-controls" id="fxnSsGradControls" style="${(state.gradient.type === 'solid' || state.gradient.type === 'transparent') ? 'display:none;' : ''}">
                            <div class="fxn-ss-color-row">
                                <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsColor1Btn" title="Выбрать Цвет 1">
                                    <span class="fxn-ss-color-square" id="fxnSsColor1Dot" style="background:${state.gradient.color1};"></span>
                                    <span class="fxn-ss-color-hex-text" id="fxnSsColor1Hex">${state.gradient.color1}</span>
                                </button>
                                <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsColor2Btn" title="Выбрать Цвет 2">
                                    <span class="fxn-ss-color-square" id="fxnSsColor2Dot" style="background:${state.gradient.color2};"></span>
                                    <span class="fxn-ss-color-hex-text" id="fxnSsColor2Hex">${state.gradient.color2}</span>
                                </button>
                                <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsColor3Btn" title="Выбрать Цвет 3" style="${state.gradient.useColor3 ? '' : 'display:none;'}">
                                    <span class="fxn-ss-color-square" id="fxnSsColor3Dot" style="background:${state.gradient.color3 || state.gradient.color2};"></span>
                                    <span class="fxn-ss-color-hex-text" id="fxnSsColor3Hex">${state.gradient.color3 || state.gradient.color2}</span>
                                </button>
                            </div>

                            <!-- Слайдер угла (Apple pill slider) -->
                            <div class="fxn-ss-pill-slider" id="fxnSsAngleRow" style="${state.gradient.type === 'radial' ? 'display:none;' : ''}">
                                <div class="fxn-ss-pill-fill" id="fxnSsAngleFill"></div>
                                <div class="fxn-ss-pill-content">
                                    <span class="fxn-ss-pill-label">Угол</span>
                                    <span class="fxn-ss-pill-val" id="fxnSsAngleVal">${state.gradient.angle}°</span>
                                </div>
                                <input type="range" class="fxn-ss-pill-range" id="fxnSsAngleRange" min="0" max="360" step="1" value="${state.gradient.angle}">
                            </div>
                        </div>

                        <!-- Сплошной цвет -->
                        <div class="fxn-ss-solid-wrap" id="fxnSsSolidWrap" style="${state.gradient.type === 'solid' ? '' : 'display:none;'}">
                            <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsSolidColorBtn" title="Выбрать цвет заливки">
                                <span class="fxn-ss-color-square" id="fxnSsSolidColorDot" style="background:${state.gradient.solidColor};"></span>
                                <span class="fxn-ss-color-hex-text" id="fxnSsSolidColorHex">${state.gradient.solidColor}</span>
                            </button>
                        </div>
                    </div>

                    <!-- ГЕОМЕТРИЯ: ОТСТУПЫ, СКРУГЛЕНИЕ, РАМКА -->
                    <div class="fxn-ss-sliders-group">
                        <!-- Отступы -->
                        <div class="fxn-ss-pill-slider">
                            <div class="fxn-ss-pill-fill" id="fxnSsPaddingFill"></div>
                            <div class="fxn-ss-pill-content">
                                <span class="fxn-ss-pill-label">Отступы</span>
                                <span class="fxn-ss-pill-val" id="fxnSsPaddingVal">${state.padding} px</span>
                            </div>
                            <input type="range" class="fxn-ss-pill-range" id="fxnSsPaddingRange" min="0" max="120" step="2" value="${state.padding}">
                        </div>

                        <!-- Скругление -->
                        <div class="fxn-ss-pill-slider">
                            <div class="fxn-ss-pill-fill" id="fxnSsRadiusFill"></div>
                            <div class="fxn-ss-pill-content">
                                <span class="fxn-ss-pill-label">Скругление</span>
                                <span class="fxn-ss-pill-val" id="fxnSsRadiusVal">${state.borderRadius} px</span>
                            </div>
                            <input type="range" class="fxn-ss-pill-range" id="fxnSsRadiusRange" min="0" max="44" step="1" value="${state.borderRadius}">
                        </div>

                        <!-- Рамка -->
                        <div class="fxn-ss-pill-slider">
                            <div class="fxn-ss-pill-fill" id="fxnSsBorderFill"></div>
                            <div class="fxn-ss-pill-content">
                                <span class="fxn-ss-pill-label">Рамка</span>
                                <span class="fxn-ss-pill-val" id="fxnSsBorderVal">${state.borderWidth} px</span>
                            </div>
                            <input type="range" class="fxn-ss-pill-range" id="fxnSsBorderRange" min="0" max="8" step="1" value="${state.borderWidth}">
                        </div>
                    </div>

                    <!-- ДОПОЛНИТЕЛЬНО (ТЕНЬ, ШАПКА, ЦВЕТ РАМКИ) -->
                    <div class="fxn-ss-card fxn-ss-collapsible-card" id="fxnSsMoreCard">
                        <div class="fxn-ss-card-header fxn-ss-clickable" id="fxnSsMoreToggle">
                            <span class="fxn-ss-card-title">Дополнительно (тень, шапка)</span>
                            <span class="material-symbols-rounded fxn-ss-chevron" id="fxnSsMoreChevron">expand_more</span>
                        </div>
                        <div class="fxn-ss-collapsible-body" id="fxnSsMoreBody">
                            <!-- Цвет рамки -->
                            <div class="fxn-ss-sub-label">Цвет рамки</div>
                            <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsBorderColorBtn" style="margin-bottom: 8px;">
                                <span class="fxn-ss-color-square" id="fxnSsBorderColorDot" style="background:${state.borderColor};"></span>
                                <span class="fxn-ss-color-hex-text" id="fxnSsBorderColorHex">${state.borderColor}</span>
                            </button>


                            <!-- Тень окна -->
                            <div class="fxn-ss-sub-label">Тень окна</div>
                            <div class="fxn-ss-pill-slider" style="margin-top: 4px;">
                                <div class="fxn-ss-pill-fill" id="fxnSsShadowBlurFill"></div>
                                <div class="fxn-ss-pill-content">
                                    <span class="fxn-ss-pill-label">Размытие</span>
                                    <span class="fxn-ss-pill-val" id="fxnSsShadowBlurVal">${state.shadowBlur} px</span>
                                </div>
                                <input type="range" class="fxn-ss-pill-range" id="fxnSsShadowBlurRange" min="0" max="90" step="2" value="${state.shadowBlur}">
                            </div>

                            <div class="fxn-ss-pill-slider" style="margin-top: 6px;">
                                <div class="fxn-ss-pill-fill" id="fxnSsShadowYFill"></div>
                                <div class="fxn-ss-pill-content">
                                    <span class="fxn-ss-pill-label">Смещение Y</span>
                                    <span class="fxn-ss-pill-val" id="fxnSsShadowYVal">${state.shadowOffsetY} px</span>
                                </div>
                                <input type="range" class="fxn-ss-pill-range" id="fxnSsShadowYRange" min="0" max="50" step="1" value="${state.shadowOffsetY}">
                            </div>

                            <div class="fxn-ss-pill-slider" style="margin-top: 6px;">
                                <div class="fxn-ss-pill-fill" id="fxnSsShadowOpFill"></div>
                                <div class="fxn-ss-pill-content">
                                    <span class="fxn-ss-pill-label">Интенсивность</span>
                                    <span class="fxn-ss-pill-val" id="fxnSsShadowOpVal">${state.shadowOpacity} %</span>
                                </div>
                                <input type="range" class="fxn-ss-pill-range" id="fxnSsShadowOpRange" min="0" max="100" step="5" value="${state.shadowOpacity}">
                            </div>

                            <button type="button" class="fxn-ss-color-picker-btn" id="fxnSsShadowColorBtn" style="margin-top: 6px; margin-bottom: 8px;">
                                <span class="fxn-ss-color-square" id="fxnSsShadowColorDot" style="background:${state.shadowColor};"></span>
                                <span class="fxn-ss-color-hex-text" id="fxnSsShadowColorHex">${state.shadowColor}</span>
                            </button>

                            <!-- Шапка окна -->
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; margin-bottom: 6px;">
                                <span class="fxn-ss-sub-label">Шапка окна</span>
                                <label class="fxn-ss-switch">
                                    <input type="checkbox" id="fxnSsTitlebarToggle" ${state.showTitlebar ? 'checked' : ''}>
                                    <span class="fxn-ss-slider"></span>
                                </label>
                            </div>

                            <div id="fxnSsTitlebarPanel" style="${state.showTitlebar ? '' : 'display:none;'}">
                                <input type="text" class="fxn-ss-text-input" id="fxnSsTitleInput" value="${state.titleText}" placeholder="Заголовок окна...">
                                <div class="fxn-ss-pill-slider" style="margin-top: 6px;">
                                    <div class="fxn-ss-pill-fill" id="fxnSsTbHeightFill"></div>
                                    <div class="fxn-ss-pill-content">
                                        <span class="fxn-ss-pill-label">Высота</span>
                                        <span class="fxn-ss-pill-val" id="fxnSsTbHeightVal">${state.titlebarHeight} px</span>
                                    </div>
                                    <input type="range" class="fxn-ss-pill-range" id="fxnSsTbHeightRange" min="26" max="64" step="2" value="${state.titlebarHeight}">
                                </div>
                                <div class="fxn-ss-seg-control" id="fxnSsTitleAlignSeg" style="margin-top: 6px;">
                                    <button type="button" class="fxn-ss-seg-item ${state.titleAlign === 'left' ? 'active' : ''}" data-align="left">Слева</button>
                                    <button type="button" class="fxn-ss-seg-item ${state.titleAlign === 'center' ? 'active' : ''}" data-align="center">Центр</button>
                                    <button type="button" class="fxn-ss-seg-item ${state.titleAlign === 'right' ? 'active' : ''}" data-align="right">Справа</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    </div> <!-- fxn-ss-sidebar-scroll -->

                    <!-- Зафиксированный подвал сайдбара с кнопками (не листается) -->
                    <div class="fxn-ss-sidebar-footer fxn-ss-sidebar-actions">
                        <button type="button" class="fxn-ss-action-btn fxn-ss-btn-copy" id="fxnSsCopyBtn">
                            <span class="material-symbols-rounded">content_copy</span>
                            <span>Скопировать</span>
                        </button>
                        <button type="button" class="fxn-ss-action-btn fxn-ss-btn-download" id="fxnSsDownloadBtn">
                            <span class="material-symbols-rounded">download</span>
                            <span>Скачать PNG</span>
                        </button>
                    </div>
                </div>

                <!-- Правая область: Превью холста с шапкой -->
                <div class="fxn-ss-preview-pane">
                    <div class="fxn-ss-preview-header">
                        <div class="fxn-ss-preview-title-wrap">
                            <span class="fxn-ss-preview-title-bold">Скриншот</span>
                            <span class="fxn-ss-preview-meta" id="fxnSsDimLabel">${natW} × ${natH} • PNG</span>
                        </div>
                        <div class="fxn-ss-preview-tools">
                            <button type="button" class="fxn-ss-tool-btn ${state.isCropMode ? 'active' : ''}" id="fxnSsToggleCropBtn" title="Выделить область (обрезка)">
                                <span class="material-symbols-rounded">crop</span>
                            </button>
                            <button type="button" class="fxn-ss-tool-btn" id="fxnSsResetCropBtn" title="Сбросить обрезку" style="${state.crop ? '' : 'display:none;'}">
                                <span class="material-symbols-rounded">restart_alt</span>
                            </button>
                            <button type="button" class="fxn-ss-tool-btn" id="fxnSsFullscreenBtn" title="Во весь экран">
                                <span class="material-symbols-rounded">fullscreen</span>
                            </button>
                            <button type="button" class="fxn-ss-tool-btn fxn-ss-btn-close" title="Закрыть (Esc)">
                                <span class="material-symbols-rounded">close</span>
                            </button>
                        </div>
                    </div>

                    <div class="fxn-ss-canvas-scroll">
                        <div class="fxn-ss-crop-hint" id="fxnSsCropHint" style="display:none;">
                            💡 Зажмите левую кнопку мыши и выделите нужную область
                        </div>
                        <div class="fxn-ss-canvas-container" id="fxnSsCanvasContainer">
                            <canvas class="fxn-ss-canvas-preview" id="fxnSsCanvas"></canvas>
                            <div class="fxn-ss-crop-overlay" id="fxnSsCropOverlay" style="display:none;">
                                <div class="fxn-ss-crop-box" id="fxnSsCropBox" style="display:none;">
                                    <div class="fxn-ss-crop-size-badge" id="fxnSsCropSizeBadge">0 × 0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalScrim);
        activeModal = modalScrim;

        // Элементы UI
        const previewCanvas = modalScrim.querySelector('#fxnSsCanvas');
        const dimLabel = modalScrim.querySelector('#fxnSsDimLabel');
        const copyBtn = modalScrim.querySelector('#fxnSsCopyBtn');
        const downloadBtn = modalScrim.querySelector('#fxnSsDownloadBtn');
        const closeBtn = modalScrim.querySelector('.fxn-ss-btn-close');
        const fullscreenBtn = modalScrim.querySelector('#fxnSsFullscreenBtn');
        const presetChips = modalScrim.querySelectorAll('[data-preset]');

        // Дополнительные стили и аккордеон
        const moreToggle = modalScrim.querySelector('#fxnSsMoreToggle');
        const moreBody = modalScrim.querySelector('#fxnSsMoreBody');
        const moreChevron = modalScrim.querySelector('#fxnSsMoreChevron');
        if (moreToggle && moreBody) {
            moreToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = moreBody.classList.toggle('open');
                if (moreChevron) {
                    moreChevron.textContent = isOpen ? 'expand_less' : 'expand_more';
                }
            });
        }

        // Ползунки геометрии
        const paddingRange = modalScrim.querySelector('#fxnSsPaddingRange');
        const paddingVal = modalScrim.querySelector('#fxnSsPaddingVal');
        const paddingFill = modalScrim.querySelector('#fxnSsPaddingFill');

        const radiusRange = modalScrim.querySelector('#fxnSsRadiusRange');
        const radiusVal = modalScrim.querySelector('#fxnSsRadiusVal');
        const radiusFill = modalScrim.querySelector('#fxnSsRadiusFill');

        const borderRange = modalScrim.querySelector('#fxnSsBorderRange');
        const borderVal = modalScrim.querySelector('#fxnSsBorderVal');
        const borderFill = modalScrim.querySelector('#fxnSsBorderFill');

        // Ползунки тени
        const shadowBlurRange = modalScrim.querySelector('#fxnSsShadowBlurRange');
        const shadowBlurVal = modalScrim.querySelector('#fxnSsShadowBlurVal');
        const shadowBlurFill = modalScrim.querySelector('#fxnSsShadowBlurFill');

        const shadowYRange = modalScrim.querySelector('#fxnSsShadowYRange');
        const shadowYVal = modalScrim.querySelector('#fxnSsShadowYVal');
        const shadowYFill = modalScrim.querySelector('#fxnSsShadowYFill');

        const shadowOpRange = modalScrim.querySelector('#fxnSsShadowOpRange');
        const shadowOpVal = modalScrim.querySelector('#fxnSsShadowOpVal');
        const shadowOpFill = modalScrim.querySelector('#fxnSsShadowOpFill');

        // Шапка окна
        const titlebarToggle = modalScrim.querySelector('#fxnSsTitlebarToggle');
        const titlebarPanel = modalScrim.querySelector('#fxnSsTitlebarPanel');
        const titleInput = modalScrim.querySelector('#fxnSsTitleInput');
        const tbHeightRange = modalScrim.querySelector('#fxnSsTbHeightRange');
        const tbHeightVal = modalScrim.querySelector('#fxnSsTbHeightVal');
        const tbHeightFill = modalScrim.querySelector('#fxnSsTbHeightFill');
        const titleAlignSeg = modalScrim.querySelectorAll('#fxnSsTitleAlignSeg .fxn-ss-seg-item');

        // Кадрирование
        const toggleCropBtn = modalScrim.querySelector('#fxnSsToggleCropBtn');
        const resetCropBtn = modalScrim.querySelector('#fxnSsResetCropBtn');
        const cropHint = modalScrim.querySelector('#fxnSsCropHint');
        const cropOverlay = modalScrim.querySelector('#fxnSsCropOverlay');
        const cropBox = modalScrim.querySelector('#fxnSsCropBox');
        const cropSizeBadge = modalScrim.querySelector('#fxnSsCropSizeBadge');

        // Контролы градиента
        const bgTypeSelect = modalScrim.querySelector('#fxnSsBgTypeSelect');
        const palettesRow = modalScrim.querySelectorAll('.fxn-ss-circle-swatch');
        const gradControls = modalScrim.querySelector('#fxnSsGradControls');
        const palettesWrap = modalScrim.querySelector('#fxnSsPalettesWrap');
        const solidWrap = modalScrim.querySelector('#fxnSsSolidWrap');
        const color1Btn = modalScrim.querySelector('#fxnSsColor1Btn');
        const color1Dot = modalScrim.querySelector('#fxnSsColor1Dot');
        const color1Hex = modalScrim.querySelector('#fxnSsColor1Hex');
        const color2Btn = modalScrim.querySelector('#fxnSsColor2Btn');
        const color2Dot = modalScrim.querySelector('#fxnSsColor2Dot');
        const color2Hex = modalScrim.querySelector('#fxnSsColor2Hex');
        const color3Btn = modalScrim.querySelector('#fxnSsColor3Btn');
        const color3Dot = modalScrim.querySelector('#fxnSsColor3Dot');
        const color3Hex = modalScrim.querySelector('#fxnSsColor3Hex');
        const angleRange = modalScrim.querySelector('#fxnSsAngleRange');
        const angleVal = modalScrim.querySelector('#fxnSsAngleVal');
        const angleFill = modalScrim.querySelector('#fxnSsAngleFill');
        const solidColorBtn = modalScrim.querySelector('#fxnSsSolidColorBtn');
        const solidColorDot = modalScrim.querySelector('#fxnSsSolidColorDot');
        const solidColorHex = modalScrim.querySelector('#fxnSsSolidColorHex');
        const borderColorBtn = modalScrim.querySelector('#fxnSsBorderColorBtn');
        const borderColorDot = modalScrim.querySelector('#fxnSsBorderColorDot');
        const borderColorHex = modalScrim.querySelector('#fxnSsBorderColorHex');
        const shadowColorBtn = modalScrim.querySelector('#fxnSsShadowColorBtn');
        const shadowColorDot = modalScrim.querySelector('#fxnSsShadowColorDot');
        const shadowColorHex = modalScrim.querySelector('#fxnSsShadowColorHex');

        // Вспомогательная функция обновления прогресса pill slider
        const updatePill = (range, fill, valEl, unit = ' px') => {
            if (!range) return;
            const min = parseFloat(range.min) || 0;
            const max = parseFloat(range.max) || 100;
            const val = parseFloat(range.value) || 0;
            const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
            if (fill) fill.style.width = pct + '%';
            if (valEl) valEl.textContent = `${val}${unit}`;
        };

        const syncAllPills = () => {
            updatePill(angleRange, angleFill, angleVal, '°');
            updatePill(paddingRange, paddingFill, paddingVal, ' px');
            updatePill(radiusRange, radiusFill, radiusVal, ' px');
            updatePill(borderRange, borderFill, borderVal, ' px');
            updatePill(shadowBlurRange, shadowBlurFill, shadowBlurVal, ' px');
            updatePill(shadowYRange, shadowYFill, shadowYVal, ' px');
            updatePill(shadowOpRange, shadowOpFill, shadowOpVal, ' %');
            updatePill(tbHeightRange, tbHeightFill, tbHeightVal, ' px');
        };
        syncAllPills();

        // Безопасное переключение видимости элементов с учетом !important
        const setVisible = (el, show, displayType = 'block') => {
            if (!el) return;
            if (show) {
                el.style.setProperty('display', displayType, 'important');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        };

        const syncBgTypeUI = () => {
            const type = state.gradient.type;
            const angleRow = modalScrim.querySelector('#fxnSsAngleRow');
            if (bgTypeSelect && bgTypeSelect.value !== type) {
                bgTypeSelect.value = type;
            }

            if (type === 'solid') {
                setVisible(gradControls, false);
                setVisible(palettesWrap, false);
                setVisible(solidWrap, true, 'block');
                if (angleRow) setVisible(angleRow, false);
            } else if (type === 'transparent') {
                setVisible(gradControls, false);
                setVisible(palettesWrap, false);
                setVisible(solidWrap, false);
                if (angleRow) setVisible(angleRow, false);
            } else if (type === 'radial') {
                setVisible(gradControls, true, 'flex');
                setVisible(palettesWrap, true, 'flex');
                setVisible(solidWrap, false);
                if (angleRow) setVisible(angleRow, false);
                if (color3Btn) setVisible(color3Btn, !!state.gradient.useColor3, 'flex');
            } else {
                // linear
                setVisible(gradControls, true, 'flex');
                setVisible(palettesWrap, true, 'flex');
                setVisible(solidWrap, false);
                if (angleRow) setVisible(angleRow, true, 'block');
                if (color3Btn) setVisible(color3Btn, !!state.gradient.useColor3, 'flex');
            }
        };
        syncBgTypeUI();

        let currentRenderedCanvas = null;
        let currentBlob = null;

        // Рендер и обновление холста
        const updatePreview = () => {
            currentRenderedCanvas = renderScreenshotCanvas(sourceImg, state);

            previewCanvas.width = currentRenderedCanvas.width;
            previewCanvas.height = currentRenderedCanvas.height;
            const pCtx = previewCanvas.getContext('2d');
            pCtx.drawImage(currentRenderedCanvas, 0, 0);

            if (dimLabel) {
                dimLabel.textContent = `${currentRenderedCanvas.width} × ${currentRenderedCanvas.height} • PNG`;
            }

            currentRenderedCanvas.toBlob((blob) => {
                currentBlob = blob;
            }, 'image/png');

            // Автоматическое сохранение настроек
            saveSettings(state);
        };

        // Первый рендер
        updatePreview();

        // Закрытие модального окна
        const closeModal = () => {
            if (activeLightbox) {
                try { activeLightbox.remove(); } catch (_) {}
                activeLightbox = null;
            }
            modalScrim.classList.add('fxn-closing');
            setTimeout(() => {
                try { modalScrim.remove(); } catch (_) {}
                if (activeModal === modalScrim) activeModal = null;
            }, 180);
        };

        closeBtn.addEventListener('click', closeModal);
        modalScrim.addEventListener('click', (e) => {
            if (e.target === modalScrim) closeModal();
        });

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (activeLightbox) {
                    try { activeLightbox.remove(); } catch (_) {}
                    activeLightbox = null;
                    return;
                }
                closeModal();
                window.removeEventListener('keydown', onKeyDown);
            }
        };
        window.addEventListener('keydown', onKeyDown);

        // Переключение пресетов
        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const presetId = chip.getAttribute('data-preset');
                const preset = THEME_PRESETS[presetId];
                if (!preset) return;

                presetChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                state.themeId = presetId;
                state.padding = preset.defaultPadding;
                state.borderRadius = preset.borderRadius;
                state.borderWidth = preset.borderWidth;
                state.borderColor = preset.borderColor;
                state.shadowBlur = preset.shadowBlur;
                state.shadowOffsetY = preset.shadowOffsetY;
                state.shadowOpacity = preset.shadowOpacity;
                state.shadowColor = preset.shadowColor;
                state.showTitlebar = preset.hasTitlebar;
                state.titlebarHeight = preset.titlebarHeight;
                state.controlsStyle = preset.controlsStyle;
                state.titleAlign = preset.titleAlign;
                if (preset.defaultTitle !== undefined) state.titleText = preset.defaultTitle;

                // Интеллектуальный подбор градиента под атмосферу выбранного пресета
                if (presetId === 'macos-dark') {
                    state.gradient.type = 'linear';
                    state.gradient.color1 = '#ff9f0a';
                    state.gradient.color2 = '#bf5af2';
                    state.gradient.color3 = '';
                    state.gradient.useColor3 = false;
                    state.gradient.angle = 292;
                } else if (presetId === 'glass-acrylic') {
                    state.gradient.type = 'linear';
                    state.gradient.color1 = '#1e1b4b';
                    state.gradient.color2 = '#312e81';
                    state.gradient.color3 = '';
                    state.gradient.useColor3 = false;
                    state.gradient.angle = 135;
                }

                if (color1Dot) color1Dot.style.backgroundColor = state.gradient.color1;
                if (color1Hex) color1Hex.textContent = state.gradient.color1;
                if (color2Dot) color2Dot.style.backgroundColor = state.gradient.color2;
                if (color2Hex) color2Hex.textContent = state.gradient.color2;
                if (color3Dot) color3Dot.style.backgroundColor = state.gradient.color3 || state.gradient.color2;
                if (color3Hex) color3Hex.textContent = state.gradient.color3 || state.gradient.color2;
                if (color3Btn) setVisible(color3Btn, !!state.gradient.useColor3, 'flex');
                if (angleRange) angleRange.value = state.gradient.angle;

                // Синхронизация свотчей палитр
                palettesRow.forEach(pill => {
                    const idx = parseInt(pill.getAttribute('data-idx'), 10);
                    const p = GRADIENT_PALETTES[idx];
                    if (p && p.c1.toLowerCase() === state.gradient.color1.toLowerCase() && p.c2.toLowerCase() === state.gradient.color2.toLowerCase()) {
                        pill.classList.add('active');
                    } else {
                        pill.classList.remove('active');
                    }
                });

                if (bgTypeSelect) bgTypeSelect.value = state.gradient.type;

                // Синхронизация контролов UI
                paddingRange.value = state.padding;
                radiusRange.value = state.borderRadius;
                borderRange.value = state.borderWidth;
                shadowBlurRange.value = state.shadowBlur;
                shadowYRange.value = state.shadowOffsetY;
                shadowOpRange.value = state.shadowOpacity;

                titlebarToggle.checked = state.showTitlebar;
                titlebarPanel.style.display = state.showTitlebar ? '' : 'none';
                titleInput.value = state.titleText;
                tbHeightRange.value = state.titlebarHeight;

                titleAlignSeg.forEach(b => b.classList.toggle('active', b.dataset.align === state.titleAlign));

                if (borderColorDot) borderColorDot.style.backgroundColor = state.borderColor;
                if (borderColorHex) borderColorHex.textContent = state.borderColor;
                if (shadowColorDot) shadowColorDot.style.backgroundColor = state.shadowColor;
                if (shadowColorHex) shadowColorHex.textContent = state.shadowColor;

                syncAllPills();
                syncBgTypeUI();
                updatePreview();
            });
        });

        // Ползунки геометрии
        paddingRange.addEventListener('input', () => {
            state.padding = parseInt(paddingRange.value, 10);
            updatePill(paddingRange, paddingFill, paddingVal, ' px');
            updatePreview();
        });

        radiusRange.addEventListener('input', () => {
            state.borderRadius = parseInt(radiusRange.value, 10);
            updatePill(radiusRange, radiusFill, radiusVal, ' px');
            updatePreview();
        });

        borderRange.addEventListener('input', () => {
            state.borderWidth = parseInt(borderRange.value, 10);
            updatePill(borderRange, borderFill, borderVal, ' px');
            updatePreview();
        });

        // Ползунки тени
        shadowBlurRange.addEventListener('input', () => {
            state.shadowBlur = parseInt(shadowBlurRange.value, 10);
            updatePill(shadowBlurRange, shadowBlurFill, shadowBlurVal, ' px');
            updatePreview();
        });

        shadowYRange.addEventListener('input', () => {
            state.shadowOffsetY = parseInt(shadowYRange.value, 10);
            updatePill(shadowYRange, shadowYFill, shadowYVal, ' px');
            updatePreview();
        });

        shadowOpRange.addEventListener('input', () => {
            state.shadowOpacity = parseInt(shadowOpRange.value, 10);
            updatePill(shadowOpRange, shadowOpFill, shadowOpVal, ' %');
            updatePreview();
        });

        // Шапка окна
        titlebarToggle.addEventListener('change', () => {
            state.showTitlebar = titlebarToggle.checked;
            setVisible(titlebarPanel, state.showTitlebar, 'block');
            updatePreview();
        });

        titleInput.addEventListener('input', () => {
            state.titleText = titleInput.value;
            updatePreview();
        });

        tbHeightRange.addEventListener('input', () => {
            state.titlebarHeight = parseInt(tbHeightRange.value, 10);
            updatePill(tbHeightRange, tbHeightFill, tbHeightVal, ' px');
            updatePreview();
        });

        titleAlignSeg.forEach(btn => {
            btn.addEventListener('click', () => {
                titleAlignSeg.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.titleAlign = btn.dataset.align;
                updatePreview();
            });
        });

        // Тип фона (выпадающий список)
        if (bgTypeSelect) {
            bgTypeSelect.addEventListener('change', () => {
                state.gradient.type = bgTypeSelect.value;
                syncBgTypeUI();
                updatePreview();
            });
        }

        // Быстрые палитры
        palettesRow.forEach(pill => {
            pill.addEventListener('click', () => {
                const idx = parseInt(pill.getAttribute('data-idx'), 10);
                const p = GRADIENT_PALETTES[idx];
                if (!p) return;

                palettesRow.forEach(c => c.classList.remove('active'));
                pill.classList.add('active');

                if (p.isSolid) {
                    state.gradient.type = 'solid';
                    state.gradient.solidColor = p.c1;
                    if (solidColorDot) solidColorDot.style.backgroundColor = p.c1;
                    if (solidColorHex) solidColorHex.textContent = p.c1;
                    if (bgTypeSelect) bgTypeSelect.value = 'solid';
                    syncBgTypeUI();
                } else {
                    state.gradient.type = 'linear';
                    state.gradient.color1 = p.c1;
                    state.gradient.color2 = p.c2;
                    state.gradient.color3 = p.c3 || '';
                    state.gradient.useColor3 = !!p.c3;
                    state.gradient.angle = p.angle || 135;
                    if (bgTypeSelect) bgTypeSelect.value = 'linear';

                    if (color1Dot) color1Dot.style.backgroundColor = p.c1;
                    if (color1Hex) color1Hex.textContent = p.c1;
                    if (color2Dot) color2Dot.style.backgroundColor = p.c2;
                    if (color2Hex) color2Hex.textContent = p.c2;
                    if (color3Dot) color3Dot.style.backgroundColor = p.c3 || p.c2;
                    if (color3Hex) color3Hex.textContent = p.c3 || p.c2;
                    angleRange.value = state.gradient.angle;
                    updatePill(angleRange, angleFill, angleVal, '°');

                    bgTypeSeg.forEach(b => b.classList.toggle('active', b.dataset.type === 'linear'));
                    syncBgTypeUI();
                }

                updatePreview();
            });
        });

        // Подключение кастомного пикера Foxen ко всем цветовым контролам
        function bindColorPicker(btn, dot, hex, getColor, setColor) {
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cur = getColor() || '#000000';
                if (typeof window.foxenOpenColorPicker === 'function') {
                    window.foxenOpenColorPicker(btn, cur, (newHex) => {
                        setColor(newHex);
                        if (dot) dot.style.backgroundColor = newHex;
                        if (hex) hex.textContent = newHex;
                        updatePreview();
                    });
                }
            });
        }

        bindColorPicker(color1Btn, color1Dot, color1Hex, () => state.gradient.color1, (hex) => { state.gradient.color1 = hex; });
        bindColorPicker(color2Btn, color2Dot, color2Hex, () => state.gradient.color2, (hex) => { state.gradient.color2 = hex; });
        bindColorPicker(color3Btn, color3Dot, color3Hex, () => state.gradient.color3, (hex) => { state.gradient.color3 = hex; });
        bindColorPicker(solidColorBtn, solidColorDot, solidColorHex, () => state.gradient.solidColor, (hex) => { state.gradient.solidColor = hex; });
        bindColorPicker(borderColorBtn, borderColorDot, borderColorHex, () => state.borderColor, (hex) => { state.borderColor = hex; });
        bindColorPicker(shadowColorBtn, shadowColorDot, shadowColorHex, () => state.shadowColor, (hex) => { state.shadowColor = hex; });

        angleRange.addEventListener('input', () => {
            state.gradient.angle = parseInt(angleRange.value, 10);
            updatePill(angleRange, angleFill, angleVal, '°');
            updatePreview();
        });

        // ─────────────────────────────────────────────────────────────────────
        // Интерактивное кадрирование
        // ─────────────────────────────────────────────────────────────────────
        let isSelecting = false;
        let startX = 0;
        let startY = 0;

        const updateCropModeUI = () => {
            if (state.isCropMode) {
                setVisible(cropOverlay, true, 'block');
                setVisible(cropHint, true, 'block');
                toggleCropBtn.classList.add('active');
            } else {
                setVisible(cropOverlay, false);
                setVisible(cropHint, false);
                setVisible(cropBox, false);
                toggleCropBtn.classList.remove('active');
            }
            setVisible(resetCropBtn, !!state.crop, 'inline-flex');
        };

        toggleCropBtn.addEventListener('click', () => {
            state.isCropMode = !state.isCropMode;
            updateCropModeUI();
        });

        resetCropBtn.addEventListener('click', () => {
            state.crop = null;
            state.isCropMode = false;
            updateCropModeUI();
            updatePreview();
        });

        cropOverlay.addEventListener('mousedown', (e) => {
            if (!state.isCropMode) return;
            const rect = cropOverlay.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isSelecting = true;

            cropBox.style.left = `${startX}px`;
            cropBox.style.top = `${startY}px`;
            cropBox.style.width = '0px';
            cropBox.style.height = '0px';
            cropBox.style.display = 'block';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isSelecting || !state.isCropMode) return;
            const rect = cropOverlay.getBoundingClientRect();
            const currX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const currY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

            const left = Math.min(startX, currX);
            const top = Math.min(startY, currY);
            const width = Math.abs(currX - startX);
            const height = Math.abs(currY - startY);

            cropBox.style.left = `${left}px`;
            cropBox.style.top = `${top}px`;
            cropBox.style.width = `${width}px`;
            cropBox.style.height = `${height}px`;

            const scaleX = natW / rect.width;
            const scaleY = natH / rect.height;
            const realW = Math.round(width * scaleX);
            const realH = Math.round(height * scaleY);
            cropSizeBadge.textContent = `${realW} × ${realH}`;
        });

        window.addEventListener('mouseup', (e) => {
            if (!isSelecting || !state.isCropMode) return;
            isSelecting = false;

            const rect = cropOverlay.getBoundingClientRect();
            const currX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const currY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

            const left = Math.min(startX, currX);
            const top = Math.min(startY, currY);
            const width = Math.abs(currX - startX);
            const height = Math.abs(currY - startY);

            if (width > 20 && height > 20) {
                const scaleX = natW / rect.width;
                const scaleY = natH / rect.height;
                state.crop = {
                    x: left * scaleX,
                    y: top * scaleY,
                    width: width * scaleX,
                    height: height * scaleY
                };
                state.isCropMode = false;
                updateCropModeUI();
                updatePreview();
            } else {
                cropBox.style.display = 'none';
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // Полноэкранный режим детального просмотра (Lightbox)
        // ─────────────────────────────────────────────────────────────────────
        fullscreenBtn.addEventListener('click', () => {
            if (!currentRenderedCanvas) return;
            const dataUrl = currentRenderedCanvas.toDataURL('image/png');

            const lightbox = document.createElement('div');
            lightbox.id = 'fxn-ss-lightbox';
            lightbox.className = 'fxn-ss-lightbox-scrim';
            lightbox.setAttribute('data-theme', activeTheme);

            lightbox.innerHTML = `
                <div class="fxn-ss-lb-bar">
                    <div class="fxn-ss-lb-title-wrap">
                        <span class="material-symbols-rounded">fullscreen</span>
                        <span class="fxn-ss-lb-title">Полноэкранный просмотр</span>
                        <span class="fxn-ss-lb-badge">${currentRenderedCanvas.width} × ${currentRenderedCanvas.height} px</span>
                    </div>
                    <div class="fxn-ss-lb-actions">
                        <button type="button" class="fxn-ss-btn fxn-ss-btn-secondary fxn-ss-btn-sm" id="fxnSsLbCopyBtn">
                            <span class="material-symbols-rounded">content_copy</span>
                            <span>Скопировать</span>
                        </button>
                        <button type="button" class="fxn-ss-btn fxn-ss-btn-primary fxn-ss-btn-sm" id="fxnSsLbDownloadBtn">
                            <span class="material-symbols-rounded">download</span>
                            <span>Скачать PNG</span>
                        </button>
                        <button type="button" class="fxn-ss-icon-btn" id="fxnSsLbCloseBtn" title="Закрыть полноэкранный режим (Esc)">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
                <div class="fxn-ss-lb-viewport">
                    <img src="${dataUrl}" class="fxn-ss-lb-img" alt="Скриншот">
                </div>
            `;

            document.body.appendChild(lightbox);
            activeLightbox = lightbox;

            const lbCloseBtn = lightbox.querySelector('#fxnSsLbCloseBtn');
            const lbCopyBtn = lightbox.querySelector('#fxnSsLbCopyBtn');
            const lbDownloadBtn = lightbox.querySelector('#fxnSsLbDownloadBtn');

            const closeLb = () => {
                lightbox.classList.add('fxn-closing');
                setTimeout(() => {
                    try { lightbox.remove(); } catch (_) {}
                    if (activeLightbox === lightbox) activeLightbox = null;
                }, 160);
            };

            lbCloseBtn.addEventListener('click', closeLb);
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox || e.target.classList.contains('fxn-ss-lb-viewport')) {
                    closeLb();
                }
            });

            lbCopyBtn.addEventListener('click', () => {
                copyBtn.click();
                lbCopyBtn.innerHTML = '<span class="material-symbols-rounded" style="color:#4ade80;">check</span><span style="color:#4ade80;">Скопировано!</span>';
                setTimeout(() => {
                    lbCopyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span><span>Скопировать</span>';
                }, 2000);
            });

            lbDownloadBtn.addEventListener('click', () => {
                downloadBtn.click();
            });
        });


// ─────────────────────────────────────────────────────────────────────
        // Копирование в буфер обмена
        // ─────────────────────────────────────────────────────────────────────
        copyBtn.addEventListener('click', async () => {
            try {
                if (!currentBlob && currentRenderedCanvas) {
                    currentBlob = await new Promise(r => currentRenderedCanvas.toBlob(r, 'image/png'));
                }

                if (currentBlob && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': currentBlob })
                    ]);

                    const origHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span class="material-symbols-rounded" style="color:#4ade80;">check</span><span style="color:#4ade80;">Скопировано!</span>';
                    if (typeof showNotification === 'function') {
                        showNotification('📸 Стилизованный скриншот скопирован в буфер обмена!', false);
                    }
                    setTimeout(() => {
                        copyBtn.innerHTML = origHtml;
                    }, 2200);
                } else {
                    throw new Error('ClipboardItem API недоступен');
                }
            } catch (err) {
                console.warn('Clipboard write failed, fallback to download:', err);
                triggerDownload();
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // Скачивание изображения
        // ─────────────────────────────────────────────────────────────────────
        const triggerDownload = () => {
            if (!currentRenderedCanvas) return;
            const dataUrl = currentRenderedCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            a.download = `foxen-screenshot-${dateStr}.png`;
            a.href = dataUrl;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 100);

            if (typeof showNotification === 'function') {
                showNotification('💾 Скриншот успешно скачан!', false);
            }
        };

        downloadBtn.addEventListener('click', triggerDownload);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ЗАХВАТ ВКЛАДКИ ЧЕРЕЗ BACKGROUND
    // ─────────────────────────────────────────────────────────────────────────

    function triggerCustomScreenshot() {
        if (disabledFeatures.has('custom_screenshot')) {
            return;
        }
        if (document.getElementById('fxn-screenshot-modal')) {
            return;
        }

// Вспышка отключена перед захватом, чтобы не засвечивать кадр белой пеленой

        const captureTab = () => {
            return new Promise((resolve) => {
                let resolved = false;
                const safeResolve = (val) => {
                    if (resolved) return;
                    resolved = true;
                    resolve(val);
                };

                const timer = setTimeout(() => {
                    safeResolve({ ok: false, error: 'Время ожидания ответа от браузера истекло (10 сек). Обновите вкладку FunPay.' });
                }, 10000);

                // 1. Попытка через chrome.runtime.sendMessage (Callback API для Chromium и Firefox chrome-совместимости)
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
                        chrome.runtime.sendMessage({ action: 'FOXEN_CAPTURE_VISIBLE_TAB' }, (resp) => {
                            clearTimeout(timer);
                            if (chrome.runtime && chrome.runtime.lastError) {
                                const msg = chrome.runtime.lastError.message || '';
                                safeResolve({ ok: false, error: msg || 'Ошибка связи с расширением' });
                            } else if (resp && typeof resp === 'object') {
                                safeResolve(resp);
                            } else {
                                // Если в Firefox ответ не пришёл в callback (Promise-режим), пробуем browser.runtime
                                if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.sendMessage === 'function') {
                                    browser.runtime.sendMessage({ action: 'FOXEN_CAPTURE_VISIBLE_TAB' })
                                        .then(bResp => safeResolve(bResp || { ok: false, error: 'Фоновый процесс не вернул изображение' }))
                                        .catch(bErr => safeResolve({ ok: false, error: bErr?.message || String(bErr) }));
                                } else {
                                    safeResolve({ ok: false, error: 'Фоновый процесс вернул пустой ответ' });
                                }
                            }
                        });
                        return;
                    }
                } catch (_) {}

                // 2. Попытка через browser.runtime.sendMessage (Promise API для Firefox)
                try {
                    if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.sendMessage === 'function') {
                        browser.runtime.sendMessage({ action: 'FOXEN_CAPTURE_VISIBLE_TAB' })
                            .then(resp => {
                                clearTimeout(timer);
                                safeResolve(resp || { ok: false, error: 'Фоновый процесс не вернул изображение' });
                            })
                            .catch(err => {
                                clearTimeout(timer);
                                safeResolve({ ok: false, error: err?.message || String(err) });
                            });
                        return;
                    }
                } catch (_) {}

                clearTimeout(timer);
                safeResolve({ ok: false, error: 'API расширения недоступно на этой странице' });
            });
        };

        captureTab().then((response) => {
            if (!response || !response.ok || !response.dataUrl) {
                const errMsg = (response && response.error) || 'Не удалось получить данные скриншота. Перезагрузите расширение и обновите страницу FunPay.';
                if (typeof showNotification === 'function') {
                    showNotification('Ошибка захвата: ' + errMsg, true);
                } else {
                    alert('Ошибка захвата: ' + errMsg);
                }
                return;
            }

            const img = new Image();
            img.onload = () => {
                openCustomScreenshotModal(img, response.dataUrl);
            };
            img.onerror = () => {
                if (typeof showNotification === 'function') {
                    showNotification('Ошибка загрузки захваченного изображения', true);
                }
            };
            img.src = response.dataUrl;
        }).catch((err) => {
            const errMsg = (err && err.message) || String(err);
            if (typeof showNotification === 'function') {
                showNotification('Ошибка захвата: ' + errMsg, true);
            }
        });
    }

    window.foxenTriggerCustomScreenshot = triggerCustomScreenshot;

    // ─────────────────────────────────────────────────────────────────────────
    // ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ ГОРЯЧЕЙ КЛАВИШИ ALT + SHIFT + S (и русская Ы)
    // ─────────────────────────────────────────────────────────────────────────

    window.addEventListener('keydown', (e) => {
        if (disabledFeatures.has('custom_screenshot')) {
            return;
        }
        if (e.altKey && e.shiftKey) {
            const key = (e.key || '').toLowerCase();
            const code = e.code;
            if (code === 'KeyS' || key === 's' || key === 'ы') {
                e.preventDefault();
                e.stopPropagation();
                triggerCustomScreenshot();
            }
        }
    }, true);


    // ─────────────────────────────────────────────────────────────────────────
    // ПОДДЕРЖКА ВСТАВКИ СКРИНШОТА ИЗ БУФЕРА ОБМЕНА (Ctrl + V)
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('paste', (e) => {
        if (disabledFeatures.has('custom_screenshot') || disabledFeatures.has('custom_screenshot_paste')) {
            return;
        }
        const active = document.activeElement;
        const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        // Не перехватываем вставку, если пользователь вводит текст на странице вне модалки
        if (isEditing && !document.getElementById('fxn-screenshot-modal')) {
            return;
        }

        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const dataUrl = evt.target.result;
                        const img = new Image();
                        img.onload = () => {
                            openCustomScreenshotModal(img, dataUrl);
                            if (typeof showNotification === 'function') {
                                showNotification('📸 Снимок из буфера (Win+Shift+S) загружен в студию!', false);
                            }
                        };
                        img.src = dataUrl;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        }
    });

})();