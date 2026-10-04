class CursorFX {
    constructor() {
        this.canvas = createElement('canvas', { id: 'foxen-cursor-fx' });
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: false, alpha: true });
        this.config = { enabled: false, type: 'braid', color1: '#c026d3', rgb: false };
        this.pts = [];
        this.trailId = 0;
        this.cumulativeDist = 0;
        this.live = false;
        this.LIFE = 700;
        this.TAU = Math.PI * 2;
        this.hue = 0;
        this.mouse = { x: -100, y: -100 };
        this.animationFrame = null;
        this.isEnabled = false;
        this.customCursor = null;
        this.customCursorConfig = {};
        this._customCursorActive = false;
        this.cursorHideStyleTag = null;
        this._lastMouseTime = 0;

        this.init();
    }

    init() {
        Object.assign(this.canvas.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '999999'
        });
        document.body.appendChild(this.canvas);
        
        this.customCursor = createElement('div', { id: 'foxen-custom-cursor' });
        Object.assign(this.customCursor.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: '9999999',
            left: '0px',
            top: '0px',
            display: 'none',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center'
        });
        document.body.appendChild(this.customCursor);

        this.cursorHideStyleTag = createElement('style', { id: 'foxen-cursor-hide-style' });
        document.documentElement.appendChild(this.cursorHideStyleTag);

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();

        document.addEventListener('mouseleave', () => {
            this.live = false;
            this.pts = [];
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            if (this._customCursorActive && this.customCursor) {
                this.customCursor.style.display = 'none';
            }
        });

        document.addEventListener('mouseenter', () => {
            this.live = true;
            if (this._customCursorActive && this.customCursor) {
                this.customCursor.style.display = 'block';
            }
        });

        let lastCheckedEl = null;
        let lastIsSpecial = false;

        const isCursorSpecial = (el) => {
            if (!el || el === document.body || el === document.documentElement) return false;
            if (el === lastCheckedEl) return lastIsSpecial;
            lastCheckedEl = el;

            // Interactive elements that change cursor to pointer, text, grab, etc.
            if (el.closest('a, button, input, select, textarea, label, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [data-toggle], .btn, .switch, [onclick], .lot-item, .chat-item, [style*="cursor"]')) {
                lastIsSpecial = true;
                return true;
            }

            try {
                const c = window.getComputedStyle(el).cursor;
                if (c && c !== 'auto' && c !== 'default' && c !== 'none') {
                    lastIsSpecial = true;
                    return true;
                }
            } catch (_) {}

            lastIsSpecial = false;
            return false;
        };

        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.live = true;

            // When hovering an element that changes cursor to another type (pointer, text, etc.),
            // hide custom cursor and let the native system pointer for that element display.
            if (this._customCursorActive) {
                const isSpecial = isCursorSpecial(e.target);
                if (isSpecial) {
                    if (this.customCursor.style.display !== 'none') {
                        this.customCursor.style.display = 'none';
                    }
                } else {
                    if (this.customCursor.style.display !== 'block') {
                        this.customCursor.style.display = 'block';
                    }
                    this.customCursor.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
                }
            }

            // Trigger trail animation
            if (this.isEnabled && !this.animationFrame) {
                this.animationFrame = requestAnimationFrame(t => this.animate(t));
            }
        });
    }

    resize() {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * d;
        this.canvas.height = window.innerHeight * d;
        this.ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    
    updateCustomCursor(newConfig) {
        this.customCursorConfig = { ...this.customCursorConfig, ...newConfig };
        
        if (this.customCursorConfig.enabled && this.customCursorConfig.image) {
            this._customCursorActive = true;
            this.customCursor.style.display = 'block';
            
            this.applyHideSystemCursor(this.customCursorConfig.hideSystem !== false);
            
            this.customCursor.style.backgroundImage = `url("${this.customCursorConfig.image}")`;
            const size = this.customCursorConfig.size || 32;
            this.customCursor.style.width = `${size}px`;
            this.customCursor.style.height = `${size}px`;
            this.customCursor.style.opacity = (this.customCursorConfig.opacity !== undefined ? this.customCursorConfig.opacity : 100) / 100;
            this.customCursor.style.transform = `translate(calc(${this.mouse.x}px - 50%), calc(${this.mouse.y}px - 50%))`;
        } else {
            this._customCursorActive = false;
            this.customCursor.style.display = 'none';
            this.applyHideSystemCursor(false);
        }
    }

    applyHideSystemCursor(hide) {
        if (!this.cursorHideStyleTag) {
            this.cursorHideStyleTag = createElement('style', { id: 'foxen-cursor-hide-style' });
        }
        
        if (hide) {
            // Hide system cursor on default page content, but display native pointer/text/etc. on interactive elements
            this.cursorHideStyleTag.textContent = `
                html, body, div, span, p, table, tr, td, th, ul, li, section, article, aside, header, footer, main {
                    cursor: none;
                }
                a, a *,
                button, button *,
                [role="button"], [role="button"] *,
                [role="link"], [role="link"] *,
                .btn, .btn *, .switch, [data-toggle], [onclick] {
                    cursor: pointer !important;
                }
                input[type="text"], input[type="password"], input[type="search"], input[type="number"], input[type="email"], textarea {
                    cursor: text !important;
                }
            `;
            if (this.cursorHideStyleTag.parentNode !== document.documentElement) {
                document.documentElement.appendChild(this.cursorHideStyleTag);
            }
        } else {
            this.cursorHideStyleTag.textContent = '';
        }
    }

    updateConfig(newConfig) {
        const wasEnabled = this.isEnabled;
        const typeChanged = newConfig.type && newConfig.type !== this.config.type;
        this.config = { ...this.config, ...newConfig };
        if (typeChanged) {
            this.pts = [];
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
        if (this.config.enabled && !wasEnabled) {
            this.start();
        } else if (!this.config.enabled && wasEnabled) {
            this.stop();
        }
    }

    start() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        if (!this.animationFrame) {
            this.animationFrame = requestAnimationFrame(t => this.animate(t));
        }
    }

    stop() {
        this.isEnabled = false;
        this.live = false;
        this.pts = [];
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    /* Плавная кривая через середины отрезков; fn(i) -> [толщина, прозрачность] */
    curve(p, fn) {
        const q = p.concat(p[p.length - 1]);
        for (let i = 1; i < q.length - 1; i++) {
            const a = q[i - 1], b = q[i], c = q[i + 1];
            if (Math.abs(a.x - c.x) + Math.abs(a.y - c.y) < 0.4) continue;
            const r = fn(i);
            this.ctx.lineWidth = r[0];
            this.ctx.globalAlpha = r[1];
            this.ctx.beginPath();
            this.ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
            this.ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
            this.ctx.stroke();
        }
    }

    /* Точки вдоль следа через равные расстояния */
    samples(step, now) {
        const out = [];
        for (let i = 1; i < this.pts.length; i++) {
            const a = this.pts[i - 1], b = this.pts[i], len = b.d - a.d;
            if (len <= 0) continue;
            const da = Math.atan2(Math.sin(b.a - a.a), Math.cos(b.a - a.a));
            for (let j = Math.ceil(a.d / step) * step; j < b.d; j += step) {
                const f = (j - a.d) / len;
                const t = a.t + (b.t - a.t) * f;
                out.push({
                    x: a.x + (b.x - a.x) * f,
                    y: a.y + (b.y - a.y) * f,
                    ang: a.a + da * f,
                    k: Math.max(0, 1 - (now - t) / this.LIFE),
                    d: j,
                    i: Math.round(j / step)
                });
            }
        }
        return out;
    }

    /* Коса: две нити переплетаются вдоль следа */
    drawBraid(now) {
        const kf = p => Math.max(0, 1 - (now - p.t) / this.LIFE);
        const s1 = [], s2 = [], n = this.pts.length;
        for (let i = 0; i < n; i++) {
            const p = this.pts[i];
            const a = this.pts[Math.max(i - 1, 0)];
            const b = this.pts[Math.min(i + 1, n - 1)];
            let nx = a.y - b.y, ny = b.x - a.x;
            const l = Math.hypot(nx, ny) || 1;
            nx /= l; ny /= l;
            const o = 7 * Math.sin(Math.PI * (1 - kf(p))) * Math.sin(p.n * 0.45);
            s1.push({ x: p.x + nx * o, y: p.y + ny * o });
            s2.push({ x: p.x - nx * o, y: p.y - ny * o });
        }
        const fn = i => [1.8, 0.95 * kf(this.pts[i])];
        this.curve(s1, fn);
        this.curve(s2, fn);
    }

    /* Пружина: линия закручивается в петли */
    drawCoil(now) {
        const o = this.samples(3, now).map(p => {
            const e = Math.sin(Math.PI * (1 - p.k));
            const ph = p.d * 0.32;
            const A = 6.5 * e * Math.sin(ph);
            const B = 6 * e * Math.cos(ph);
            const c = Math.cos(p.ang);
            const s = Math.sin(p.ang);
            return { x: p.x - s * A + c * B, y: p.y + c * A + s * B, k: p.k };
        });
        if (o.length > 2) this.curve(o, i => [1.8, 0.95 * o[i].k]);
    }

    /* Схема: след печатной платы с прямыми углами */
    drawCircuit(now) {
        const s = this.samples(28, now);
        s.push({ x: this.mouse.x, y: this.mouse.y, k: 1 });
        for (let i = 1; i < s.length; i++) {
            const P = s[i - 1], Q = s[i];
            const E = Math.abs(Q.x - P.x) > Math.abs(Q.y - P.y) ? { x: Q.x, y: P.y } : { x: P.x, y: Q.y };
            this.ctx.globalAlpha = 0.95 * Q.k;
            this.ctx.lineWidth = 1.6;
            this.ctx.beginPath();
            this.ctx.moveTo(P.x, P.y);
            this.ctx.arcTo(E.x, E.y, Q.x, Q.y, 7);
            this.ctx.lineTo(Q.x, Q.y);
            this.ctx.stroke();
            if (i < s.length - 1) {
                this.ctx.beginPath();
                this.ctx.arc(Q.x, Q.y, 2.6, 0, this.TAU);
                this.ctx.fill();
            }
        }
    }

    /* Рельсы: две параллельные линии со шпалами */
    drawRails(now) {
        const w = k => 7 * Math.min(1, (1 - k) * 4);
        const s = this.samples(4, now);
        const L = [], R = [];
        s.forEach(p => {
            const d = w(p.k), nx = -Math.sin(p.ang) * d, ny = Math.cos(p.ang) * d;
            L.push({ x: p.x + nx, y: p.y + ny });
            R.push({ x: p.x - nx, y: p.y - ny });
        });
        if (s.length > 2) {
            const fn = i => [1.6, 0.9 * s[i].k];
            this.curve(L, fn);
            this.curve(R, fn);
        }
        this.ctx.lineWidth = 1.4;
        this.samples(10, now).forEach(p => {
            const d = w(p.k), nx = -Math.sin(p.ang) * d, ny = Math.cos(p.ang) * d;
            this.ctx.globalAlpha = 0.75 * p.k;
            this.ctx.beginPath();
            this.ctx.moveTo(p.x + nx, p.y + ny);
            this.ctx.lineTo(p.x - nx, p.y - ny);
            this.ctx.stroke();
        });
    }

    /* Веер: тонкие хорды от курсора к прошлым точкам */
    drawFan(now) {
        const kf = p => Math.max(0, 1 - (now - p.t) / this.LIFE);
        this.ctx.lineWidth = 1.4;
        for (let i = 0; i < this.pts.length - 1; i += 2) {
            const p = this.pts[i];
            this.ctx.globalAlpha = 0.65 * kf(p);
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouse.x, this.mouse.y);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.stroke();
        }
    }

    /* Цепь: звенья вдоль следа */
    drawChain(now) {
        this.ctx.lineWidth = 1.5;
        this.samples(12, now).forEach(p => {
            const s = 0.6 + 0.4 * p.k;
            this.ctx.globalAlpha = 0.95 * p.k;
            this.ctx.beginPath();
            this.ctx.ellipse(p.x, p.y, 8 * s, (p.i % 2 ? 1.5 : 4) * s, p.ang, 0, this.TAU);
            this.ctx.stroke();
        });
    }

    animate(t) {
        if (!this.isEnabled) {
            this.animationFrame = null;
            return;
        }

        const now = t || performance.now();
        this.hue = (this.hue + 1.5) % 360;

        // Record trail points on motion
        if (this.live) {
            const l = this.pts[this.pts.length - 1];
            const dist = l ? Math.hypot(this.mouse.x - l.x, this.mouse.y - l.y) : 9;
            if (!l || dist > 1.2) {
                if (l) this.cumulativeDist += dist;
                this.pts.push({
                    x: this.mouse.x,
                    y: this.mouse.y,
                    t: now,
                    n: this.trailId++,
                    d: this.cumulativeDist,
                    a: 0
                });
            }
        }

        // Purge points older than LIFE
        while (this.pts.length && (now - this.pts[0].t > this.LIFE)) {
            this.pts.shift();
        }

        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const strokeColor = this.config.rgb ? `hsl(${this.hue}, 100%, 65%)` : (this.config.color1 || '#c026d3');
        this.ctx.strokeStyle = strokeColor;
        this.ctx.fillStyle = strokeColor;
        this.ctx.shadowColor = strokeColor;
        this.ctx.shadowBlur = 6;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (this.pts.length > 2) {
            for (let i = 0; i < this.pts.length; i++) {
                const a = this.pts[Math.max(i - 3, 0)];
                const b = this.pts[Math.min(i + 3, this.pts.length - 1)];
                this.pts[i].a = Math.atan2(b.y - a.y, b.x - a.x);
            }

            switch (this.config.type) {
                case 'coil': this.drawCoil(now); break;
                case 'circuit': this.drawCircuit(now); break;
                case 'rails': this.drawRails(now); break;
                case 'fan': this.drawFan(now); break;
                case 'chain': this.drawChain(now); break;
                case 'braid':
                default:
                    this.drawBraid(now);
                    break;
            }
        }

        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;

        // Idle when nothing to draw
        if (this.pts.length === 0) {
            this.animationFrame = null;
            return;
        }

        this.animationFrame = requestAnimationFrame(time => this.animate(time));
    }
}
const cursorFx = new CursorFX();

function setupCursorFxHandlers() {
    // 1. Trail style chips selector
    const trailPresets = document.getElementById('fxnTrailPresets');
    const typeLabel = document.getElementById('cursorFxActiveTypeLabel');
    const typeSelect = document.getElementById('cursorFxType');

    if (trailPresets && !trailPresets.dataset.fxnBound) {
        trailPresets.dataset.fxnBound = '1';
        trailPresets.addEventListener('click', async (e) => {
            const chip = e.target.closest('.fxn-trail-chip');
            if (!chip) return;

            const selectedType = chip.dataset.type;
            if (!selectedType) return;

            trailPresets.querySelectorAll('.fxn-trail-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const title = chip.querySelector('.fxn-trail-title')?.textContent || selectedType;
            if (typeLabel) typeLabel.textContent = title;
            if (typeSelect) typeSelect.value = selectedType;

            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
            const currentSettings = (await storage.get('foxenCursorFx')).foxenCursorFx || {};
            const newSettings = { ...currentSettings, type: selectedType };
            await storage.set({ foxenCursorFx: newSettings });
            cursorFx.updateConfig(newSettings);
        });
    }

    // 2. Color picker & Quick swatches
    const colorInput = document.getElementById('cursorFxColor1');
    const quickSwatches = document.getElementById('cursorFxQuickSwatches');

    const saveColor = async (color) => {
        if (!color) return;
        if (colorInput) colorInput.value = color;

        if (quickSwatches) {
            quickSwatches.querySelectorAll('.fxn-mini-swatch').forEach(sw => {
                sw.classList.toggle('active', (sw.dataset.color || '').toLowerCase() === color.toLowerCase());
            });
        }

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
        const currentSettings = (await storage.get('foxenCursorFx')).foxenCursorFx || {};
        const newSettings = { ...currentSettings, color1: color };
        await storage.set({ foxenCursorFx: newSettings });
        cursorFx.updateConfig(newSettings);
    };

    if (colorInput && !colorInput.dataset.fxnBound) {
        colorInput.dataset.fxnBound = '1';
        colorInput.addEventListener('input', (e) => saveColor(e.target.value));
        colorInput.addEventListener('change', (e) => saveColor(e.target.value));
    }

    if (quickSwatches && !quickSwatches.dataset.fxnBound) {
        quickSwatches.dataset.fxnBound = '1';
        quickSwatches.addEventListener('click', (e) => {
            const swatch = e.target.closest('.fxn-mini-swatch');
            if (!swatch) return;
            saveColor(swatch.dataset.color);
        });
    }

    // 3. RGB Rainbow toggle
    const rgbToggle = document.getElementById('cursorFxRgb');
    if (rgbToggle && !rgbToggle.dataset.fxnBound) {
        rgbToggle.dataset.fxnBound = '1';
        const toggleRgb = async () => {
            const isRgb = rgbToggle.classList.contains('on') || rgbToggle.checked;
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
            const currentSettings = (await storage.get('foxenCursorFx')).foxenCursorFx || {};
            const newSettings = { ...currentSettings, rgb: isRgb };
            await storage.set({ foxenCursorFx: newSettings });
            cursorFx.updateConfig(newSettings);
        };
        rgbToggle.addEventListener('change', toggleRgb);
        rgbToggle.addEventListener('click', () => setTimeout(toggleRgb, 20));
    }

    // 4. Cursor FX Enable switch
    const cursorFxEnabledCheckbox = document.getElementById('cursorFxEnabled');
    const cursorFxControls = document.getElementById('cursorFxControls');
    if (cursorFxEnabledCheckbox && !cursorFxEnabledCheckbox.dataset.fxnBound) {
        cursorFxEnabledCheckbox.dataset.fxnBound = '1';
        const updateFxControls = async () => {
            const on = cursorFxEnabledCheckbox.classList.contains('on') || cursorFxEnabledCheckbox.checked;
            if (cursorFxControls) cursorFxControls.style.display = on ? 'flex' : 'none';
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
            const currentSettings = (await storage.get('foxenCursorFx')).foxenCursorFx || {};
            const newSettings = { ...currentSettings, enabled: on };
            await storage.set({ foxenCursorFx: newSettings });
            cursorFx.updateConfig(newSettings);
        };
        cursorFxEnabledCheckbox.addEventListener('change', updateFxControls);
        cursorFxEnabledCheckbox.addEventListener('click', () => setTimeout(updateFxControls, 20));
        const on = cursorFxEnabledCheckbox.classList.contains('on') || cursorFxEnabledCheckbox.checked;
        if (cursorFxControls) cursorFxControls.style.display = on ? 'flex' : 'none';
    }

    const pEnabledCheckbox = document.getElementById('foxenParticleEnabled');
    const pControls = document.getElementById('foxenParticleControls');
    if (pEnabledCheckbox) {
        const updatePControls = () => {
            const on = pEnabledCheckbox.classList.contains('on') || pEnabledCheckbox.checked;
            if (pControls) pControls.style.display = on ? 'flex' : 'none';
        };
        pEnabledCheckbox.addEventListener('change', updatePControls);
        pEnabledCheckbox.addEventListener('click', () => setTimeout(updatePControls, 20));
        updatePControls();
    }

    const pCountSlider = document.getElementById('foxenParticleCount');
    if (pCountSlider) {
        const valEl = document.getElementById('foxenParticleCountValue');
        pCountSlider.addEventListener('input', (e) => {
            if (valEl) valEl.textContent = e.target.value;
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticleCount: Number(e.target.value) });
        });
    }
    const pSpeedSlider = document.getElementById('foxenParticleSpeed');
    if (pSpeedSlider) {
        const valEl = document.getElementById('foxenParticleSpeedValue');
        pSpeedSlider.addEventListener('input', (e) => {
            if (valEl) valEl.textContent = `${e.target.value}x`;
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticleSpeed: Number(e.target.value) });
        });
    }
    const pPresetSelect = document.getElementById('foxenParticlePreset');
    if (pPresetSelect) {
        pPresetSelect.addEventListener('change', (e) => {
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticlePreset: e.target.value });
        });
    }
    
    const customCursorEnabledCheckbox = document.getElementById('customCursorEnabled');
    const customCursorControls = document.getElementById('customCursorControls');

    if (customCursorEnabledCheckbox) {
        const updateCurControls = () => {
            const enabled = customCursorEnabledCheckbox.classList.contains('on') || customCursorEnabledCheckbox.checked;
            if (customCursorControls) customCursorControls.style.display = enabled ? 'flex' : 'none';
        };
        customCursorEnabledCheckbox.addEventListener('change', async (e) => {
            const enabled = e.target.checked ?? customCursorEnabledCheckbox.classList.contains('on');
            updateCurControls();
            
            const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
            const newSettings = { ...settings, enabled };
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        });
        customCursorEnabledCheckbox.addEventListener('click', () => setTimeout(updateCurControls, 20));
        updateCurControls();
    }

    const customCursorUrlInput = document.getElementById('customCursorUrl');
    if (customCursorUrlInput) {
        const applyUrl = async () => {
            const url = customCursorUrlInput.value.trim();
            const preview = document.getElementById('cursor-image-preview');
            if (!url) {
                if (preview) {
                    preview.style.backgroundImage = 'none';
                    preview.textContent = 'Нет';
                }
                const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
                const newSettings = { ...settings, image: null };
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
                cursorFx.updateCustomCursor(newSettings);
                return;
            }

            if (preview) {
                preview.style.backgroundImage = `url("${url}")`;
                preview.textContent = '';
            }
            const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
            const newSettings = { ...settings, image: url };
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        };

        customCursorUrlInput.addEventListener('change', applyUrl);
    }

    const uploadCursorBtn = document.getElementById('uploadCursorImageBtn');
    const cursorInput = document.getElementById('cursorImageInput');
    if (uploadCursorBtn && cursorInput) {
        uploadCursorBtn.addEventListener('click', () => {
            cursorInput.click();
        });
    }

    if (cursorInput) {
        cursorInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (readEvent) => {
                const imageDataUrl = readEvent.target.result;
                const preview = document.getElementById('cursor-image-preview');
                if (preview) {
                    preview.style.backgroundImage = `url("${imageDataUrl}")`;
                    preview.textContent = '';
                }

                const curUrlInput = document.getElementById('customCursorUrl');
                if (curUrlInput) curUrlInput.value = '';

                const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
                const newSettings = { ...settings, image: imageDataUrl };
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
                cursorFx.updateCustomCursor(newSettings);
            };
            reader.readAsDataURL(file);
        });
    }
    
    const removeCursorBtn = document.getElementById('removeCursorImageBtn');
    if (removeCursorBtn) {
        removeCursorBtn.addEventListener('click', async () => {
            const preview = document.getElementById('cursor-image-preview');
            if (preview) {
                preview.style.backgroundImage = 'none';
                preview.textContent = 'Нет';
            }
            const curUrlInput = document.getElementById('customCursorUrl');
            if (curUrlInput) curUrlInput.value = '';
            const curFileInput = document.getElementById('cursorImageInput');
            if (curFileInput) curFileInput.value = '';

            const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
            const newSettings = { ...settings, image: null };
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        });
    }

    const hideSysCursor = document.getElementById('hideSystemCursor');
    if (hideSysCursor) {
        hideSysCursor.addEventListener('change', async (e) => {
            const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
            const newSettings = { ...settings, hideSystem: e.target.checked ?? hideSysCursor.classList.contains('on') };
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        });
    }

    ['customCursorSize', 'customCursorOpacity'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', async (e) => {
            const settings = (await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenCustomCursor')).foxenCustomCursor || {};
            let newSettings;

            if (id === 'customCursorSize') {
                const valEl = document.getElementById('customCursorSizeValue');
                if (valEl) valEl.textContent = `${e.target.value}px`;
                newSettings = { ...settings, size: parseInt(e.target.value, 10) };
            } else {
                const valEl = document.getElementById('customCursorOpacityValue');
                if (valEl) valEl.textContent = `${e.target.value}%`;
                newSettings = { ...settings, opacity: parseInt(e.target.value, 10) };
            }
            
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        });
    });
}