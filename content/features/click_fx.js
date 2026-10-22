// content/features/click_fx.js
// =============================================================================
// FOXEN CLICK FX ENGINE (HIGH PERFORMANCE)
//  • 15 minimalist geometric click animations ported from Click FX
//  • Configurable: Scale, Speed, Color, Stroke Width, Rainbow (RGB), and Random mode
//  • Safe DOM lifecycle with Web Animations API & instant element cleanup
// =============================================================================

class ClickFX {
    constructor() {
        this.config = {
            enabled: false,
            type: 'ring',
            color: '#c026d3',
            rgb: false,
            scale: 1.0,
            speed: 1.0,
            strokeWidth: 1.5
        };
        this.container = null;
        this.hue = 0;
        this.EASE = 'cubic-bezier(.16,1,.3,1)';
        this.EFFECT_KEYS = [
            'ring', 'collapse', 'morph', 'arc', 'split',
            'triangle', 'orbit', 'intersect', 'focus', 'double_morph',
            'spiral', 'clock', 'wire', 'plus', 'dash'
        ];

        this.init();
    }

    injectStyles() {
        if (document.getElementById('foxen-click-fx-styles')) return;
        const style = document.createElement('style');
        style.id = 'foxen-click-fx-styles';
        style.textContent = `
            #foxen-click-fx-container {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                pointer-events: none !important;
                z-index: 2147483646 !important;
                overflow: hidden !important;
            }
            .fxn-trail-chip .fxn-trail-icon {
                transition: color 0.15s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .fxn-trail-chip.fxn-chip-previewing .fxn-trail-icon {
                opacity: 0 !important;
                transform: scale(0.35) !important;
                pointer-events: none !important;
            }
            .fxn-trail-chip .fxn-trail-title {
                transition: opacity 0.22s ease, transform 0.22s ease !important;
            }
            .fxn-trail-chip.fxn-chip-previewing .fxn-trail-title {
                opacity: 0.2 !important;
                transform: translateY(2px) !important;
            }
            .fxn-cfx {
                position: absolute !important;
                box-sizing: border-box !important;
                translate: -50% -50% !important;
                pointer-events: none !important;
                will-change: transform, opacity !important;
            }
            .fxn-cfx-ring {
                width: 0;
                height: 0;
                border: var(--fx-stroke, 1.5px) solid var(--fx, currentColor);
                border-radius: 50%;
                box-sizing: border-box;
            }
            .fxn-cfx-sq {
                width: 6px;
                height: 6px;
                border: var(--fx-stroke, 1.5px) solid var(--fx, currentColor);
                box-sizing: border-box;
            }
            .fxn-cfx-arc {
                width: 64px;
                height: 64px;
                color: var(--fx, currentColor);
            }
            .fxn-cfx-arc svg { display: block; overflow: visible; }
            .fxn-cfx-shp {
                width: 80px;
                height: 80px;
                color: var(--fx, currentColor);
            }
            .fxn-cfx-shp svg { display: block; overflow: visible; }
            .fxn-cfx-orb { width: 0; height: 0; }
            .fxn-cfx-orb b {
                position: absolute;
                left: 0; top: 0;
                translate: -50% -50%;
                width: 64px; height: 64px;
                box-sizing: border-box;
                border: var(--fx-stroke, 1.5px) solid color-mix(in srgb, var(--fx, currentColor) 40%, transparent);
                border-radius: 50%;
            }
            .fxn-cfx-orb i {
                position: absolute;
                left: 0; top: 0;
                width: 6px; height: 6px;
                margin: -3px 0 0 -3px;
                border-radius: 50%;
                background: var(--fx, currentColor);
                transform: translateY(-32px);
            }
            .fxn-cfx-spl { width: 0; height: 0; }
            .fxn-cfx-spl i {
                position: absolute;
                left: 0; top: 0;
                width: 60px; height: 60px;
                margin: -30px 0 0 -30px;
                box-sizing: border-box;
                border: var(--fx-stroke, 1.5px) solid var(--fx, currentColor);
                border-radius: 50%;
            }
            .fxn-cfx-spl i:nth-child(1) { clip-path: inset(0 50% 0 0); }
            .fxn-cfx-spl i:nth-child(2) { clip-path: inset(0 0 0 50%); }
            .fxn-cfx-spl b {
                position: absolute;
                left: 0; top: 0;
                width: var(--fx-stroke, 1.5px);
                height: 60px;
                margin: -30px 0 0 -0.75px;
                background: var(--fx, currentColor);
            }
            .fxn-cfx-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--fx, currentColor);
            }
            .fxn-cfx-wire {
                width: 180px;
                height: 60px;
                color: var(--fx, currentColor);
            }
            .fxn-cfx-wire svg { display: block; overflow: visible; }
            .fxn-cfx-dash { width: 0; height: 0; }
            .fxn-cfx-dash b {
                position: absolute;
                left: -30px; top: 0;
                width: 60px;
                height: var(--fx-stroke, 1.5px);
                translate: 0 -50%;
                background: var(--fx, currentColor);
            }
            .fxn-cfx-dash i {
                position: absolute;
                left: -30px; top: 0;
                width: 6px; height: 6px;
                margin: -3px 0 0 -3px;
                border-radius: 50%;
                background: var(--fx, currentColor);
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    ensureContainer() {
        if (!this.container || !document.contains(this.container)) {
            let existing = document.getElementById('foxen-click-fx-container');
            if (existing) {
                this.container = existing;
            } else {
                this.container = document.createElement('div');
                this.container.id = 'foxen-click-fx-container';
                (document.body || document.documentElement).appendChild(this.container);
            }
        }
        return this.container;
    }

    init() {
        this.injectStyles();
        this.loadSettings();

        // Listen for user clicks anywhere on the page
        window.addEventListener('pointerdown', (e) => {
            if (!this.config.enabled) return;
            // Left click or direct touch only
            if (e.button !== undefined && e.button !== 0) return;

            // Do not trigger ambient click effect inside Click FX controls and presets selector
            if (e.target && e.target.closest) {
                if (e.target.closest('#clickFxControls, #fxnClickPresets, .fxn-trail-chip, #clickFxEnabled')) {
                    return;
                }
            }

            this.trigger(e.clientX, e.clientY);
        }, { passive: true, capture: true });

        // Storage change listener for live synchronization across tabs
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes.foxenClickFx) {
                    this.updateConfig(changes.foxenClickFx.newValue || {});
                }
            });
        }
    }

    async loadSettings() {
        try {
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage?.local;
            if (!storage) return;
            const res = await storage.get('foxenClickFx');
            if (res?.foxenClickFx) {
                this.updateConfig(res.foxenClickFx);
            }
        } catch (_) {}
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    getActiveColor() {
        if (this.config.rgb) {
            this.hue = (this.hue + 25) % 360;
            return `hsl(${this.hue}, 100%, 65%)`;
        }
        return this.config.color || '#c026d3';
    }

    trigger(x, y, forcedType = null) {
        this.ensureContainer();

        const color = this.getActiveColor();
        const scale = Math.max(0.3, Number(this.config.scale) || 1.0);
        const speed = Math.max(0.3, Number(this.config.speed) || 1.0);
        const strokeWidth = Math.max(1, Number(this.config.strokeWidth) || 1.5);

        let type = forcedType || this.config.type || 'ring';
        if (type === 'random') {
            const idx = Math.floor(Math.random() * this.EFFECT_KEYS.length);
            type = this.EFFECT_KEYS[idx];
        }

        const params = { color, scale, speed, strokeWidth };
        if (typeof this[type] === 'function') {
            this[type](x, y, params);
        } else {
            this.ring(x, y, params);
        }
    }

    mk(cls, x, y, html, color, strokeWidth) {
        const c = this.ensureContainer();
        const e = document.createElement('div');
        e.className = 'fxn-cfx ' + cls;
        e.style.left = x + 'px';
        e.style.top = y + 'px';
        e.style.setProperty('--fx', color);
        e.style.setProperty('--fx-stroke', strokeWidth + 'px');
        e.style.color = color;
        if (html) e.innerHTML = html;
        c.appendChild(e);
        return e;
    }

    go(e, kf, o) {
        try {
            const a = e.animate(kf, Object.assign({ duration: 1000, easing: this.EASE, fill: 'both' }, o || {}));
            const cleanup = () => { if (e.parentNode) e.parentNode.removeChild(e); };
            if (a.finished) {
                a.finished.then(cleanup).catch(cleanup);
            }
            const totalDur = (o && o.duration ? o.duration : 1000) + (o && o.delay ? o.delay : 0);
            setTimeout(cleanup, Math.max(300, totalDur + 300));
            return a;
        } catch (_) {
            if (e.parentNode) e.parentNode.removeChild(e);
        }
    }

    // --- 1. Кольцо (Ring) ---
    ring(x, y, { color, scale, speed, strokeWidth }) {
        const size = Math.round(120 * scale);
        const dur = Math.round(1100 / speed);
        const e = this.mk('fxn-cfx-ring', x, y, '', color, strokeWidth);
        this.go(e, [
            { width: '0px', height: '0px', opacity: 0 },
            { opacity: 1, offset: 0.1 },
            { width: size + 'px', height: size + 'px', opacity: 0 }
        ], { duration: dur });
    }

    // --- 2. Схлопывание (Collapse) ---
    collapse(x, y, { color, scale, speed, strokeWidth }) {
        const size = Math.round(160 * scale);
        const dur1 = Math.round(800 / speed);
        const dur2 = Math.round(700 / speed);
        const delay2 = Math.round(760 / speed);

        const r = this.mk('fxn-cfx-ring', x, y, '', color, strokeWidth);
        this.go(r, [
            { width: size + 'px', height: size + 'px', opacity: 0 },
            { opacity: 1, offset: 0.3 },
            { width: '0px', height: '0px', opacity: 1 }
        ], { duration: dur1, easing: 'cubic-bezier(.7,0,.84,0)' });

        const d = this.mk('fxn-cfx-dot', x, y, '', color, strokeWidth);
        this.go(d, [
            { transform: 'scale(0)', opacity: 1 },
            { transform: `scale(${1.8 * scale})`, opacity: 1, offset: 0.3 },
            { transform: 'scale(0)', opacity: 0 }
        ], { duration: dur2, delay: delay2 });
    }

    // --- 3. Морф (Morph) ---
    morph(x, y, { color, scale, speed, strokeWidth }) {
        const startSize = Math.max(3, Math.round(6 * scale));
        const endSize = Math.round(76 * scale);
        const dur = Math.round(1200 / speed);
        const e = this.mk('fxn-cfx-sq', x, y, '', color, strokeWidth);
        this.go(e, [
            { width: startSize + 'px', height: startSize + 'px', transform: 'rotate(0deg)', borderRadius: '0%', opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { width: endSize + 'px', height: endSize + 'px', transform: 'rotate(180deg)', borderRadius: '50%', opacity: 0 }
        ], { duration: dur });
    }

    // --- 4. Дуга (Arc) ---
    arc(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1200 / speed);
        const animDur = Math.round(1100 / speed);
        const e = this.mk('fxn-cfx-arc', x, y, `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="28" pathLength="100" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="10 90"/></svg>`, color, strokeWidth);
        const circle = e.querySelector('circle');
        if (circle) {
            circle.animate([{ strokeDasharray: '6 94' }, { strokeDasharray: '62 38' }], { duration: animDur, easing: this.EASE, fill: 'both' });
        }
        this.go(e, [
            { transform: `scale(${0.4 * scale}) rotate(-90deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: `scale(${1.15 * scale}) rotate(270deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 5. Разрыв (Split) ---
    split(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1200 / speed);
        const shift = 26 * scale;
        const e = this.mk('fxn-cfx-spl', x, y, '<i></i><i></i><b></b>', color, strokeWidth);
        const k = e.children;
        const d = [-1, 1];
        if (k.length >= 3) {
            for (let n = 0; n < 2; n++) {
                k[n].animate([
                    { transform: `scale(${0.6 * scale}) translateX(0)`, opacity: 0 },
                    { opacity: 1, offset: 0.25 },
                    { transform: `scale(${1.1 * scale}) translateX(${d[n] * shift}px)`, opacity: 0 }
                ], { duration: dur, easing: this.EASE, fill: 'both' });
            }
            k[2].animate([
                { transform: 'scaleY(0)', opacity: 1 },
                { transform: `scaleY(${scale})`, opacity: 1, offset: 0.4 },
                { transform: 'scaleY(0)', opacity: 0 }
            ], { duration: dur, easing: this.EASE, fill: 'both' });
        }
        this.go(e, [{ opacity: 1 }, { opacity: 1 }], { duration: dur });
    }

    // --- 6. Треугольник (Triangle) ---
    triangle(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1300 / speed);
        const drawDur = Math.round(900 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><polygon points="40,10 66,55 14,55" pathLength="100" stroke-dasharray="100"/></svg>`, color, strokeWidth);
        const poly = e.querySelector('polygon');
        if (poly) poly.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, easing: this.EASE, fill: 'both' });
        this.go(e, [
            { transform: `scale(${0.5 * scale}) rotate(-60deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: `scale(${1.1 * scale}) rotate(120deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 7. Орбита (Orbit) ---
    orbit(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1400 / speed);
        const e = this.mk('fxn-cfx-orb', x, y, '<b></b><i></i>', color, strokeWidth);
        this.go(e, [
            { transform: `scale(${0.3 * scale}) rotate(-120deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: `scale(${1.4 * scale}) rotate(240deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 8. Пересечение (Intersect) ---
    intersect(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1400 / speed);
        const drawDur = Math.round(900 / speed);
        const delay2 = Math.round(120 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><ellipse cx="40" cy="40" rx="34" ry="13" transform="rotate(45 40 40)" pathLength="100" stroke-dasharray="100"/><ellipse cx="40" cy="40" rx="34" ry="13" transform="rotate(-45 40 40)" pathLength="100" stroke-dasharray="100"/></svg>`, color, strokeWidth);
        const s = e.querySelectorAll('ellipse');
        if (s[0]) s[0].animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, easing: this.EASE, fill: 'both' });
        if (s[1]) s[1].animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, delay: delay2, easing: this.EASE, fill: 'both' });
        this.go(e, [
            { transform: `scale(${0.4 * scale}) rotate(-45deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: `scale(${1.1 * scale}) rotate(90deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 9. Фокус (Focus) ---
    focus(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1300 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" aria-hidden="true"><path d="M10 26V10H26M54 10H70V26M70 54V70H54M26 70H10V54"/></svg>`, color, strokeWidth);
        this.go(e, [
            { transform: `scale(${1.9 * scale})`, opacity: 0 },
            { transform: `scale(${1.0 * scale})`, opacity: 1, offset: 0.35 },
            { transform: `scale(${1.0 * scale})`, opacity: 1, offset: 0.7 },
            { transform: `scale(${0.92 * scale})`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 10. Двойной морф (Double Morph) ---
    double_morph(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1200 / speed);
        const configs = [
            { delay: 0, dir: 1, size: Math.round(76 * scale) },
            { delay: Math.round(140 / speed), dir: -1, size: Math.round(48 * scale) }
        ];
        const startSize = Math.max(3, Math.round(6 * scale));
        configs.forEach(p => {
            const e = this.mk('fxn-cfx-sq', x, y, '', color, strokeWidth);
            this.go(e, [
                { width: startSize + 'px', height: startSize + 'px', transform: 'rotate(0deg)', borderRadius: '0%', opacity: 0 },
                { opacity: 1, offset: 0.15 },
                { width: p.size + 'px', height: p.size + 'px', transform: `rotate(${180 * p.dir}deg)`, borderRadius: '50%', opacity: 0 }
            ], { duration: dur, delay: p.delay });
        });
    }

    // --- 11. Спираль (Spiral) ---
    spiral(x, y, { color, scale, speed, strokeWidth }) {
        let d = '';
        for (let n = 0; n <= 70; n++) {
            const t = n / 70;
            const r = 2 + 32 * t;
            const a = t * Math.PI * 4.4;
            d += (n ? 'L' : 'M') + (40 + r * Math.cos(a)).toFixed(1) + ' ' + (40 + r * Math.sin(a)).toFixed(1);
        }
        const dur = Math.round(1400 / speed);
        const drawDur = Math.round(1000 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" aria-hidden="true"><path d="${d}" pathLength="100" stroke-dasharray="100"/></svg>`, color, strokeWidth);
        const path = e.querySelector('path');
        if (path) path.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, easing: this.EASE, fill: 'both' });
        this.go(e, [
            { transform: `scale(${0.5 * scale}) rotate(-120deg)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: `scale(${1.1 * scale}) rotate(60deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 12. Циферблат (Clock) ---
    clock(x, y, { color, scale, speed, strokeWidth }) {
        let s = '';
        for (let n = 0; n < 12; n++) {
            const a = n * Math.PI / 6;
            const r1 = n % 3 ? 26 : 20;
            const c = Math.cos(a);
            const f = Math.sin(a);
            s += '<path d="M' + (40 + r1 * c).toFixed(1) + ' ' + (40 + r1 * f).toFixed(1) + 'L' + (40 + 34 * c).toFixed(1) + ' ' + (40 + 34 * f).toFixed(1) + '" pathLength="100" stroke-dasharray="100"/>';
        }
        const dur = Math.round(1500 / speed);
        const drawDur = Math.round(350 / speed);
        const stepDelay = Math.round(50 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" aria-hidden="true">${s}</svg>`, color, strokeWidth);
        const p = e.querySelectorAll('path');
        for (let i = 0; i < p.length; i++) {
            p[i].animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, delay: i * stepDelay, easing: this.EASE, fill: 'both' });
        }
        this.go(e, [
            { transform: `scale(${scale}) rotate(-30deg)`, opacity: 1 },
            { opacity: 1, offset: 0.65 },
            { transform: `scale(${scale}) rotate(0deg)`, opacity: 0 }
        ], { duration: dur, easing: 'linear' });
    }

    // --- 13. Нить (Wire) ---
    wire(x, y, { color, scale, speed, strokeWidth }) {
        const D = Math.round(1200 / speed);
        const w = Math.round(180 * scale);
        const h = Math.round(60 * scale);
        const e = this.mk('fxn-cfx-wire', x, y, `<svg viewBox="0 0 180 60" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" aria-hidden="true"><path d="M0 30H180"/></svg>`, color, strokeWidth);
        const p = e.querySelector('path');
        const t0 = performance.now();
        const anim = (now) => {
            if (!e.parentNode) return;
            const t = Math.min((now - t0) / D, 1);
            let d = '';
            for (let i = 0; i <= 60; i++) {
                const u = i / 60;
                const q = Math.abs(u - 0.5) * 2;
                const env = 1 - q * q;
                const yy = 30 + 16 * Math.exp(-3.4 * t) * env * Math.sin((q * 1.8 - t * 2.2) * Math.PI * 2);
                d += (i ? 'L' : 'M') + (u * 180).toFixed(1) + ' ' + yy.toFixed(2);
            }
            if (p) p.setAttribute('d', d);
            if (t < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
        this.go(e, [
            { opacity: 0 },
            { opacity: 1, offset: 0.08 },
            { opacity: 1, offset: 0.7 },
            { opacity: 0 }
        ], { duration: D, easing: 'linear' });
    }

    // --- 14. Плюс (Plus) ---
    plus(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1400 / speed);
        const drawDur = Math.round(600 / speed);
        const delay2 = Math.round(100 / speed);
        const e = this.mk('fxn-cfx-shp', x, y, `<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" aria-hidden="true"><path d="M40 26V54" pathLength="100" stroke-dasharray="100"/><path d="M26 40H54" pathLength="100" stroke-dasharray="100"/></svg>`, color, strokeWidth);
        const p = e.querySelectorAll('path');
        if (p[0]) p[0].animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, easing: this.EASE, fill: 'both' });
        if (p[1]) p[1].animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: drawDur, delay: delay2, easing: this.EASE, fill: 'both' });
        this.go(e, [
            { transform: `scale(${0.4 * scale}) rotate(0deg)`, opacity: 0 },
            { transform: `scale(${1.0 * scale}) rotate(0deg)`, opacity: 1, offset: 0.3 },
            { transform: `scale(${1.0 * scale}) rotate(45deg)`, opacity: 1, offset: 0.65 },
            { transform: `scale(${1.3 * scale}) rotate(45deg)`, opacity: 0 }
        ], { duration: dur });
    }

    // --- 15. Штрих (Dash) ---
    dash(x, y, { color, scale, speed, strokeWidth }) {
        const dur = Math.round(1300 / speed);
        const dotDur = Math.round(520 / speed);
        const length = Math.round(60 * scale);
        const e = this.mk('fxn-cfx-dash', x, y, '<b></b><i></i>', color, strokeWidth);
        const k = e.children;
        if (k.length >= 2) {
            k[0].style.width = length + 'px';
            k[0].style.left = (-length / 2) + 'px';
            k[0].animate([
                { transform: 'scaleX(0)', transformOrigin: 'left', easing: this.EASE },
                { transform: 'scaleX(1)', transformOrigin: 'left', offset: 0.4 },
                { transform: 'scaleX(1)', transformOrigin: 'right', easing: this.EASE, offset: 0.401 },
                { transform: 'scaleX(0)', transformOrigin: 'right' }
            ], { duration: dur, easing: 'linear', fill: 'both' });

            k[1].style.left = (-length / 2) + 'px';
            k[1].animate([
                { transform: 'translateX(0)', easing: this.EASE },
                { transform: `translateX(${length}px)` }
            ], { duration: dotDur, fill: 'both' });
        }
        this.go(e, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: dur, easing: 'linear' });
    }
}

// Global instance
const clickFx = new ClickFX();
window.clickFx = clickFx;

function setupClickFxHandlers() {
    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;

    // 1. Toggle switch
    const enabledToggle = document.getElementById('clickFxEnabled');
    const controls = document.getElementById('clickFxControls');
    if (enabledToggle && !enabledToggle.dataset.fxnBound) {
        enabledToggle.dataset.fxnBound = '1';
        const updateState = async () => {
            const on = enabledToggle.classList.contains('on') || enabledToggle.checked;
            if (controls) controls.style.display = on ? 'flex' : 'none';
            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, enabled: on };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);
        };
        enabledToggle.addEventListener('change', updateState);
        enabledToggle.addEventListener('click', () => setTimeout(updateState, 20));
    }

    // 2. Preset Style Chips
    const presetsContainer = document.getElementById('fxnClickPresets');
    const typeLabel = document.getElementById('clickFxActiveTypeLabel');
    let previewTimer = null;
    let restoreTimer = null;
    let currentPreviewChip = null;

    if (presetsContainer && !presetsContainer.dataset.fxnBound) {
        presetsContainer.dataset.fxnBound = '1';
        presetsContainer.addEventListener('click', async (e) => {
            const chip = e.target.closest('.fxn-trail-chip');
            if (!chip) return;

            const selectedType = chip.dataset.type;
            if (!selectedType) return;

            presetsContainer.querySelectorAll('.fxn-trail-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const title = chip.querySelector('.fxn-trail-title')?.textContent || selectedType;
            if (typeLabel) typeLabel.textContent = title;

            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, type: selectedType };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);

            // Clean up any pending preview timers and previous preview chips
            if (previewTimer) clearTimeout(previewTimer);
            if (restoreTimer) clearTimeout(restoreTimer);
            if (currentPreviewChip && currentPreviewChip !== chip) {
                currentPreviewChip.classList.remove('fxn-chip-previewing');
            }

            // Capture icon/chip center coordinates BEFORE fading out
            const iconEl = chip.querySelector('.fxn-trail-icon');
            const targetEl = iconEl || chip;
            const rect = targetEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Smoothly fade out the icon and dim title to clear visual space
            chip.classList.add('fxn-chip-previewing');
            currentPreviewChip = chip;

            // Wait 180ms for smooth icon fade-out before bursting animation
            previewTimer = setTimeout(() => {
                clickFx.trigger(centerX, centerY, selectedType);

                const speed = Math.max(0.3, Number(clickFx.config.speed) || 1.0);
                const animDuration = Math.round(580 / speed);

                // Smoothly restore the icon once the animation finishes
                restoreTimer = setTimeout(() => {
                    chip.classList.remove('fxn-chip-previewing');
                    if (currentPreviewChip === chip) currentPreviewChip = null;
                }, animDuration);
            }, 180);
        });
    }

    // 3. Color picker & Quick swatches
    const colorBtn = document.getElementById('clickFxColor1');
    const quickSwatches = document.getElementById('clickFxQuickSwatches');

    const saveColor = async (color, forceDisableRgb = false) => {
        if (!color) return;
        if (colorBtn) {
            colorBtn.value = color;
            colorBtn.dataset.color = color;
            colorBtn.style.backgroundColor = color;
        }

        if (quickSwatches) {
            quickSwatches.querySelectorAll('.fxn-mini-swatch').forEach(sw => {
                sw.classList.toggle('active', (sw.dataset.color || '').toLowerCase() === color.toLowerCase());
            });
        }

        const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
        const next = { ...cur, color: color };
        if (forceDisableRgb) {
            next.rgb = false;
            const rgbToggle = document.getElementById('clickFxRgb');
            if (rgbToggle) {
                rgbToggle.checked = false;
                rgbToggle.classList.remove('on');
            }
        }
        await storage.set({ foxenClickFx: next });
        clickFx.updateConfig(next);
    };

    if (colorBtn && !colorBtn.dataset.fxnBound) {
        colorBtn.dataset.fxnBound = '1';
        colorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof foxenOpenColorPicker === 'function') {
                const cur = colorBtn.dataset.color || colorBtn.value || '#c026d3';
                foxenOpenColorPicker(colorBtn, cur, (newHex) => {
                    saveColor(newHex, true);
                });
            }
        });
    }

    if (quickSwatches && !quickSwatches.dataset.fxnBound) {
        quickSwatches.dataset.fxnBound = '1';
        quickSwatches.addEventListener('click', (e) => {
            const swatch = e.target.closest('.fxn-mini-swatch');
            if (!swatch) return;
            saveColor(swatch.dataset.color, true);
        });
    }

    // 4. RGB Toggle
    const rgbToggle = document.getElementById('clickFxRgb');
    if (rgbToggle && !rgbToggle.dataset.fxnBound) {
        rgbToggle.dataset.fxnBound = '1';
        const toggleRgb = async () => {
            const isRgb = rgbToggle.classList.contains('on') || rgbToggle.checked;
            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, rgb: isRgb };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);
        };
        rgbToggle.addEventListener('change', toggleRgb);
        rgbToggle.addEventListener('click', () => setTimeout(toggleRgb, 20));
    }

    // 5. Sliders (Scale, Speed, StrokeWidth)
    const scaleSlider = document.getElementById('clickFxScale');
    const scaleVal = document.getElementById('clickFxScaleValue');
    if (scaleSlider && !scaleSlider.dataset.fxnBound) {
        scaleSlider.dataset.fxnBound = '1';
        scaleSlider.addEventListener('input', async (e) => {
            const val = parseFloat(e.target.value) || 1.0;
            if (scaleVal) scaleVal.textContent = `${val.toFixed(1)}x`;
            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, scale: val };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);
        });
    }

    const speedSlider = document.getElementById('clickFxSpeed');
    const speedVal = document.getElementById('clickFxSpeedValue');
    if (speedSlider && !speedSlider.dataset.fxnBound) {
        speedSlider.dataset.fxnBound = '1';
        speedSlider.addEventListener('input', async (e) => {
            const val = parseFloat(e.target.value) || 1.0;
            if (speedVal) speedVal.textContent = `${val.toFixed(1)}x`;
            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, speed: val };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);
        });
    }

    const strokeSlider = document.getElementById('clickFxStroke');
    const strokeVal = document.getElementById('clickFxStrokeValue');
    if (strokeSlider && !strokeSlider.dataset.fxnBound) {
        strokeSlider.dataset.fxnBound = '1';
        strokeSlider.addEventListener('input', async (e) => {
            const val = parseFloat(e.target.value) || 1.5;
            if (strokeVal) strokeVal.textContent = `${val.toFixed(1)}px`;
            const cur = (await storage.get('foxenClickFx')).foxenClickFx || {};
            const next = { ...cur, strokeWidth: val };
            await storage.set({ foxenClickFx: next });
            clickFx.updateConfig(next);
        });
    }

    // 6. Interactive Test Zone
    const testZone = document.getElementById('clickFxTestZone');
    if (testZone && !testZone.dataset.fxnBound) {
        testZone.dataset.fxnBound = '1';
        testZone.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            clickFx.trigger(e.clientX, e.clientY);
        });
    }
}
