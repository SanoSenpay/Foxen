// content/features/nickname_fx_renderer.js
// =============================================================================
// FOXEN - ULTRA-PERFORMANCE CANVAS NICKNAME EFFECTS RENDERER FOR FUNPAY
//  • Synchronizes user's own nickname effect and other Foxen users' effects
//  • Renders 17 custom Canvas 2D effects directly over FunPay usernames
//  • Uses a single master RAF loop + IntersectionObserver (30 FPS viewport only)
// =============================================================================

(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.location.hostname.includes('funpay.com')) return;

    // --- State & Memory Cache ---
    const userEffectsCache = new Map(); // username.toLowerCase() -> effectPayload
    const activeCanvases = new Set();
    let isMasterLoopRunning = false;
    let lastFrameTime = 0;
    const TARGET_INTERVAL = 1000 / 30; // Smooth 30 FPS for FunPay UI
    let fxObserver = null;
    let myFoxenEffect = null;
    let myFoxenEmoji = null;
    let myUsername = null;

    // Helper: Attach custom emoji badge (emoji.gg / GIF / PNG) next to nickname
    function attachCustomEmojiBadge(targetEl, emojiUrl) {
        if (!targetEl || !emojiUrl) return;
        const parent = targetEl.parentNode || targetEl;
        let existing = parent.querySelector('.fxn-custom-emoji-img') || targetEl.querySelector('.fxn-custom-emoji-img');
        if (existing) {
            if (existing.src !== emojiUrl) existing.src = emojiUrl;
            return;
        }

        const img = document.createElement('img');
        img.className = 'fxn-custom-emoji-img';
        img.src = emojiUrl;
        img.alt = 'emoji';
        img.title = 'Foxen Premium Status';
        img.style.cssText = 'display: inline-block !important; width: 1.25em !important; height: 1.25em !important; vertical-align: -0.2em !important; margin-left: 6px !important; margin-right: 2px !important; object-fit: contain !important; border-radius: 4px !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)) !important; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important; cursor: pointer; position: relative !important; z-index: 10 !important;';
        img.onmouseenter = () => { img.style.transform = 'scale(1.35) rotate(4deg)'; };
        img.onmouseleave = () => { img.style.transform = 'scale(1) rotate(0deg)'; };

        if (targetEl.nextSibling) {
            parent.insertBefore(img, targetEl.nextSibling);
        } else {
            parent.appendChild(img);
        }
    }

    // Helper: Hex to RGB
    function hexToRgb(hex) {
        let clean = (hex || '#ffffff').replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        const num = parseInt(clean, 16) || 0;
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    const lerp = (a, b, t) => a + (b - a) * t;

    // Helper: Exact Font matching for FunPay elements
    function fontFor(h, textLength = 5, customFont = null) {
        if (customFont) return customFont;
        const factor = textLength > 12 ? 0.62 : (textLength > 8 ? 0.72 : 0.82);
        return `800 ${Math.round(h * factor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    }

    function drawTextSolid(ctx, w, h, text, color, customFont = null) {
        ctx.fillStyle = color;
        ctx.font = customFont || ctx.__customFont || fontFor(h, text.length);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
    }

    function maskToText(ctx, w, h, text, customFont = null) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = '#fff';
        ctx.font = customFont || ctx.__customFont || fontFor(h, text.length);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
        ctx.globalCompositeOperation = 'source-over';
    }

    function initParticles(state, key, count, w, h, cfg) {
        if (state[key]) return state[key];
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin),
                phase: Math.random() * Math.PI * 2,
                vx: (Math.random() - 0.5) * cfg.speed,
                vy: (Math.random() - 0.5) * cfg.speed - (cfg.rise || 0),
            });
        }
        state[key] = arr;
        return arr;
    }

    // --- 17 Math Renderers (True Original Visuals with Deep Black Base) ---
    const EFFECTS = {
        // 1: Жидкое золото
        liquidGold(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#0a0a0c');
            ctx.globalCompositeOperation = 'source-atop';
            const blobs = [
                { x: .32, y: .5, r: .65, c: '#ecd08a' },
                { x: .62, y: .42, r: .55, c: '#c9a24b' },
                { x: .5, y: .66, r: .48, c: '#8a6a2c' },
            ];
            blobs.forEach((b, i) => {
                const bx = w * (b.x + 0.16 * Math.sin(t * 0.0005 + i * 2.1));
                const by = h * (b.y + 0.22 * Math.cos(t * 0.0006 + i * 1.4));
                const r = h * b.r;
                const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
                g.addColorStop(0, b.c);
                g.addColorStop(0.8, '#c9a24b');
                g.addColorStop(1, '#0a0a0c');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(bx, by, r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        },

        // 2: Дымная вуаль
        smokeVeil(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#0a0a0e');
            ctx.globalCompositeOperation = 'source-atop';
            for (let i = 0; i < 5; i++) {
                const x = w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.00025 + i * 1.7)));
                const y = h * (0.2 + 0.6 * (0.5 + 0.5 * Math.cos(t * 0.0003 + i * 2.3)));
                const r = h * (0.55 + 0.25 * Math.sin(t * 0.00035 + i));
                const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, 'rgba(240,240,248,0.95)');
                g.addColorStop(0.5, 'rgba(160,165,180,0.6)');
                g.addColorStop(1, 'rgba(10,10,14,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        },

        // 3: Плазменные нити
        plasmaThreads(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ffffff');
            ctx.globalCompositeOperation = 'source-atop';
            for (let i = 0; i < 5; i++) {
                const p0 = { x: 0, y: h * Math.abs(Math.sin(i * 1.3)) };
                const p1 = { x: w * 0.33, y: h * (0.5 + 0.45 * Math.sin(t * 0.002 + i)) };
                const p2 = { x: w * 0.66, y: h * (0.5 + 0.45 * Math.cos(t * 0.0025 + i * 1.6)) };
                const p3 = { x: w, y: h * Math.abs(Math.cos(i * 1.1)) };
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                ctx.strokeStyle = i % 2 === 0 ? '#050508' : '#1a1a24';
                ctx.lineWidth = 2.4;
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        },

        // 4: Северное сияние
        auroraFlow(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#080d12');
            ctx.globalCompositeOperation = 'source-atop';
            const bands = [
                { c: 'rgba(63,180,130,0.9)', sp: 0.0016, amp: .18, off: 0 },
                { c: 'rgba(90,160,230,0.85)', sp: 0.0021, amp: .22, off: 2 },
                { c: 'rgba(230,180,80,0.85)', sp: 0.0013, amp: .14, off: 4 },
            ];
            bands.forEach(b => {
                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let x = 0; x <= w; x += 6) {
                    const y = h * 0.5 + Math.sin(x * 0.03 + t * b.sp + b.off) * h * b.amp;
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(w, h); ctx.closePath();
                ctx.fillStyle = b.c;
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        },

        // 5: Водная рябь
        rippleReflection(ctx, w, h, t, state, text) {
            if (!state.off || state.cachedText !== text || state.cachedFont !== ctx.__customFont) {
                const off = document.createElement('canvas');
                off.width = w; off.height = h;
                const octx = off.getContext('2d');
                octx.fillStyle = '#ecd08a';
                octx.font = ctx.__customFont || fontFor(h, text.length);
                octx.textAlign = 'center'; octx.textBaseline = 'middle';
                octx.fillText(text, w / 2, h * 0.42);
                state.off = off;
                state.textY = h * 0.42;
                state.cachedText = text;
                state.cachedFont = ctx.__customFont;
            }
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(state.off, 0, 0);
            const reflectTop = state.textY + 6;
            const reflectH = h - reflectTop;
            for (let y = 0; y < reflectH; y += 2) {
                const srcY = state.textY - y;
                if (srcY < 0) break;
                const offsetX = Math.sin(t * 0.0032 + y * 0.2) * 2.5;
                const alpha = Math.max(0, 0.45 * (1 - y / reflectH));
                ctx.globalAlpha = alpha;
                ctx.drawImage(state.off, 0, srcY, w, 2, offsetX, reflectTop + y, w, 2);
            }
            ctx.globalAlpha = 1;
        },

        // 6: Золотые листья
        fallingLeaves(ctx, w, h, t, state, text) {
            const p = initParticles(state, 'p', 8, w, h, { rMin: 1.5, rMax: 2.5, speed: 0 });
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ece7da');
            p.forEach((pt, i) => {
                pt.y = (pt.y + 0.15 + i % 2 * 0.03) % (h * 0.85);
                const sway = Math.sin(t * 0.0016 + pt.phase) * 5;
                const x = pt.x + sway;
                ctx.save();
                ctx.translate(x, pt.y);
                ctx.rotate(t * 0.001 + pt.phase);
                ctx.fillStyle = 'rgba(201,162,75,0.92)';
                ctx.beginPath();
                ctx.moveTo(0, -pt.r * 1.6);
                ctx.lineTo(pt.r, 0);
                ctx.lineTo(0, pt.r * 1.6);
                ctx.lineTo(-pt.r, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        },

        // 7: Магнитный блик
        magneticSheen(ctx, w, h, t, state, text, colors) {
            ctx.clearRect(0, 0, w, h);
            const userColor = colors?.single || '#ecd08a';
            const rgb = hexToRgb(userColor);
            drawTextSolid(ctx, w, h, text, `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`);
            const mx = w / 2 + Math.sin(t * 0.001) * w * 0.32;
            const my = h / 2 + Math.cos(t * 0.0012) * h * 0.25;
            ctx.globalCompositeOperation = 'source-atop';
            const g = ctx.createRadialGradient(mx, my, 0, mx, my, w * 0.35);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`);
            g.addColorStop(1, '#08080a');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        },

        // 8: Ртутный металл
        silverMercury(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#0a0b0e');
            ctx.globalCompositeOperation = 'source-atop';
            for (let i = 0; i < 3; i++) {
                const bx = w * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.0008 + i * 2.1)));
                const by = h * (0.3 + 0.4 * (0.5 + 0.5 * Math.cos(t * 0.001 + i * 1.4)));
                const r = h * 0.8;
                const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.4, '#d8dce6');
                g.addColorStop(0.8, '#64748b');
                g.addColorStop(1, '#0a0b0e');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(bx, by, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        },

        // 9: Кольцо гало
        haloRing(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ece7da');
            ctx.globalCompositeOperation = 'lighter';
            const cx = w / 2, cy = h / 2;
            const rx = Math.max(w * 0.26 + 12, h * 0.75);
            const ry = rx * 0.42;
            const a = t * 0.0014;
            const g = ctx.createLinearGradient(
                cx + Math.cos(a) * rx,
                cy + Math.sin(a) * ry,
                cx + Math.cos(a + 2.2) * rx,
                cy + Math.sin(a + 2.2) * ry
            );
            g.addColorStop(0, 'rgba(236,208,138,0)');
            g.addColorStop(0.5, 'rgba(236,208,138,0.95)');
            g.addColorStop(1, 'rgba(236,208,138,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        },

        // 10: Шёлковая лента
        auroraRibbon(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ffffff');
            ctx.globalCompositeOperation = 'source-atop';
            const ribbonColors = ['rgba(240,240,245,0.85)', 'rgba(140,140,150,0.7)', '#0a0a0e'];
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                for (let x = 0; x <= w; x += 6) {
                    const y = h / 2 + Math.sin(x * 0.05 + t * 0.0025 + k * 1.4) * h * 0.28 * (1 - k * 0.2);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = ribbonColors[k];
                ctx.lineWidth = 5.5 - k * 1.2;
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        },

        // 11: Ртутная капля
        mercuryChase(ctx, w, h, t, state, text) {
            if (!state.x) { state.x = w / 2; state.y = h / 2; }
            const tx = w / 2 + Math.sin(t * 0.001) * w * 0.32;
            const ty = h / 2 + Math.cos(t * 0.0012) * h * 0.22;
            state.x = lerp(state.x, tx, 0.08);
            state.y = lerp(state.y, ty, 0.08);
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#0a0b0e');
            ctx.globalCompositeOperation = 'source-atop';
            const g = ctx.createRadialGradient(state.x, state.y, 0, state.x, state.y, w * 0.32);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, '#cbd5e1');
            g.addColorStop(0.7, '#475569');
            g.addColorStop(1, '#0a0b0e');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        },

        // 12: Гравитационные вихри
        gravityWells(ctx, w, h, t, state, text) {
            const p = initParticles(state, 'p', 18, w, h, { rMin: .8, rMax: 1.5, speed: 0 });
            const c1 = { x: w * (0.35 + 0.1 * Math.sin(t * 0.0006)), y: h * (0.5 + 0.15 * Math.cos(t * 0.0008)) };
            const c2 = { x: w * (0.65 + 0.1 * Math.cos(t * 0.0007)), y: h * (0.5 + 0.15 * Math.sin(t * 0.0009)) };
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ece7da');
            ctx.globalCompositeOperation = 'lighter';
            p.forEach((pt, i) => {
                const target = i % 2 === 0 ? c1 : c2;
                const dx = target.x - pt.x, dy = target.y - pt.y;
                pt.x += dx * 0.01 + (dy) * 0.01;
                pt.y += dy * 0.01 - (dx) * 0.01;
                ctx.fillStyle = '#ecd08a';
                ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        },

        // 13: Интерференция волн
        waveInterference(ctx, w, h, t, state, text, colors) {
            ctx.clearRect(0, 0, w, h);
            const userColor = colors?.single || '#c9a24b';
            const rgb = hexToRgb(userColor);
            drawTextSolid(ctx, w, h, text, '#0a0a0c');
            ctx.globalCompositeOperation = 'source-atop';
            const g = ctx.createLinearGradient(0, 0, w, 0);
            const shift = (t * 0.0015) % 1;
            for (let i = 0; i <= 6; i++) {
                const pos = ((i / 6) + shift) % 1;
                g.addColorStop(pos, i % 2 === 0 ? `rgba(${rgb.r},${rgb.g},${rgb.b},1)` : '#0a0a0c');
            }
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        },

        // 14: Хромовый блик
        chromeSweep(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#8f8f95'); g.addColorStop(0.5, '#e7e7ea'); g.addColorStop(1, '#5a5a60');
            drawTextSolid(ctx, w, h, text, g);
            ctx.globalCompositeOperation = 'source-atop';
            const cycle = 2600;
            const bx = -w * 0.4 + (w * 1.8) * (((t % cycle) / cycle));
            ctx.save();
            ctx.translate(bx, 0); ctx.rotate(-0.35);
            const bg = ctx.createLinearGradient(-14, 0, 14, 0);
            bg.addColorStop(0, 'rgba(255,255,255,0)');
            bg.addColorStop(0.5, 'rgba(255,255,255,0.98)');
            bg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = bg;
            ctx.fillRect(-14, -h * 2, 28, h * 5);
            ctx.restore();
            ctx.globalCompositeOperation = 'source-over';
        },

        // 15: Бегущая искра
        typewriterCaret(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#0a0a0e');
            ctx.globalCompositeOperation = 'source-atop';
            const cycle = 2200;
            const x = w * ((t % cycle) / cycle);
            const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
            g.addColorStop(0, 'rgba(236,208,138,0)');
            g.addColorStop(0.5, '#ffffff');
            g.addColorStop(1, 'rgba(236,208,138,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 14, 0, 28, h);
            ctx.globalCompositeOperation = 'source-over';
        },

        // 16: Орбитальные кольца
        orbitRings(ctx, w, h, t, state, text) {
            ctx.clearRect(0, 0, w, h);
            drawTextSolid(ctx, w, h, text, '#ece7da');
            ctx.globalCompositeOperation = 'lighter';
            const cx = w / 2, cy = h / 2;
            const baseR = Math.max(w * 0.45, h * 0.65);
            
            [0, 1, 2].forEach(i => {
                const rx = baseR * (0.85 + i * 0.22);
                const ry = (baseR * 0.38) * (0.85 + i * 0.2);
                const rot = t * 0.0007 * (i % 2 === 0 ? 1 : -1) + (i * 0.9);
                
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(rot);
                
                ctx.strokeStyle = `rgba(236,208,138,${0.6 - i * 0.12})`;
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                const ea = t * 0.0022 + i * 2.1;
                const px = Math.cos(ea) * rx;
                const py = Math.sin(ea) * ry;
                
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(255,255,255,0.9)';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(px, py, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                ctx.restore();
            });
            ctx.globalCompositeOperation = 'source-over';
        },

        // 17: Масляная плёнка
        oilSlick(ctx, w, h, t, state, text, colors) {
            ctx.clearRect(0, 0, w, h);
            const cx = w / 2, cy = h / 2;
            const cols = colors?.gradient || ['#38bdf8', '#c084fc', '#f59e0b'];
            drawTextSolid(ctx, w, h, text, '#0a0a0c');
            ctx.globalCompositeOperation = 'source-atop';
            cols.forEach((hex, i) => {
                const rgb = hexToRgb(hex);
                const a = (t * 0.0006 + i * 2.1);
                const x = cx + Math.cos(a) * w * 0.28;
                const y = cy + Math.sin(a) * h * 0.28;
                const g = ctx.createRadialGradient(x, y, 0, x, y, h * 0.85);
                g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);
                g.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`);
                g.addColorStop(1, '#0a0a0c');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x, y, h * 0.85, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    // --- Overlay Canvas Class ---
    // --- Wrap Text Node Specifically To Guarantee Pixel-Perfect Overlay ---
    function wrapTextNodeForNicknameFX(el, targetUsername) {
        if (!el) return null;
        if (el.classList.contains('fxn-nick-target')) return el;

        const existing = el.querySelector('.fxn-nick-target');
        if (existing) return existing;

        const targetLower = targetUsername.toLowerCase();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let textNode = null;

        while (walker.nextNode()) {
            const val = walker.currentNode.nodeValue.trim();
            if (val.toLowerCase() === targetLower || val.toLowerCase().includes(targetLower)) {
                textNode = walker.currentNode;
                break;
            }
        }

        if (textNode && textNode.parentNode) {
            const span = document.createElement('span');
            span.className = 'fxn-nick-target';
            span.style.cssText = 'position: relative !important; display: inline-block !important; vertical-align: baseline !important; line-height: inherit !important; color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important;';
            span.textContent = textNode.nodeValue;
            textNode.parentNode.replaceChild(span, textNode);
            return span;
        }

        return el;
    }

    // --- Canvas Overlay Element Wrapper ---
    class NicknameOverlayCanvas {
        constructor(hostEl, username, effectPayload) {
            this.hostEl = hostEl;
            this.username = username;
            this.effectPayload = effectPayload;
            this.effectId = effectPayload?.id || 'liquidGold';
            this.colors = effectPayload?.colors || {};
            this.state = {};
            this.isVisible = true;

            this.canvas = document.createElement('canvas');
            this.canvas.className = 'fxn-nick-overlay-canvas';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '3';
            this.ctx = this.canvas.getContext('2d', { alpha: true });

            this.hostEl.classList.add('fxn-nick-decorated');

            // Wrap text transparently
            this.measureAndAttach();

            if (fxObserver) {
                fxObserver.observe(this.canvas);
            }
        }

        measureAndAttach() {
            const computed = window.getComputedStyle(this.hostEl);
            const rect = this.hostEl.getBoundingClientRect();
            const fontSize = parseFloat(computed.fontSize) || 14;
            const fontWeight = computed.fontWeight || '700';
            const fontFamily = computed.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            
            // Generous boundary padding for orbital rings & halos so they never get clipped
            const padX = 24;
            const padY = 14;
            const textW = Math.max(20, Math.round(rect.width || (this.username.length * fontSize * 0.65)));
            const textH = Math.max(16, Math.round(rect.height || (fontSize * 1.35)));

            const w = textW + padX * 2;
            const h = textH + padY * 2;

            this.w = w;
            this.h = h;
            this.dpr = dpr;
            this.customFont = `${fontWeight} ${Math.round(fontSize)}px ${fontFamily}`;
            this.state.customFont = this.customFont;
            this.ctx.__customFont = this.customFont;

            this.canvas.width = Math.round(w * dpr);
            this.canvas.height = Math.round(h * dpr);
            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = `-${padY}px`;
            this.canvas.style.left = `-${padX}px`;

            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            this.hostEl.style.setProperty('color', 'transparent', 'important');
            this.hostEl.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
            this.hostEl.style.setProperty('text-shadow', 'none', 'important');

            if (!this.canvas.parentNode) {
                this.hostEl.appendChild(this.canvas);
            }
        }

        tick(timestamp) {
            if (!this.isVisible || !this.canvas.parentNode) return;
            const fn = EFFECTS[this.effectId];
            if (fn) {
                try {
                    this.state.customFont = this.customFont;
                    this.ctx.__customFont = this.customFont;
                    fn(this.ctx, this.w, this.h, timestamp, this.state, this.username, this.colors);
                } catch(e) {}
            }
        }

        destroy() {
            if (fxObserver) fxObserver.unobserve(this.canvas);
            if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
            this.hostEl.style.color = '';
            this.hostEl.style.webkitTextFillColor = '';
            this.hostEl.style.textShadow = '';
            this.hostEl.classList.remove('fxn-nick-decorated');
        }
    }

    // --- Master Animation Loop (30 FPS Throttled & Window Focus Aware) ---
    function masterLoop(timestamp) {
        if (!isMasterLoopRunning) return;

        // Auto-pause if window is not focused or tab is hidden
        if (document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
            isMasterLoopRunning = false;
            return;
        }

        const elapsed = timestamp - lastFrameTime;
        if (elapsed >= TARGET_INTERVAL) {
            lastFrameTime = timestamp - (elapsed % TARGET_INTERVAL);
            activeCanvases.forEach(item => {
                if (item.isVisible) item.tick(timestamp);
            });
        }

        requestAnimationFrame(masterLoop);
    }

    function startLoop() {
        if (document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
            return;
        }
        if (!isMasterLoopRunning && activeCanvases.size > 0) {
            isMasterLoopRunning = true;
            lastFrameTime = performance.now();
            requestAnimationFrame(masterLoop);
        }
    }

    function stopLoop() {
        isMasterLoopRunning = false;
    }

    // --- Intersection Observer (0% CPU/GPU for off-screen nicknames) ---
    function setupObserver() {
        if (typeof IntersectionObserver !== 'undefined' && !fxObserver) {
            fxObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const canvas = entry.target;
                    const isVisible = entry.isIntersecting;
                    for (const item of activeCanvases) {
                        if (item.canvas === canvas) {
                            item.isVisible = isVisible;
                            break;
                        }
                    }
                });
            }, {
                root: null,
                rootMargin: '120px',
                threshold: 0.05
            });
        }
    }

    // --- Reliable Logged In Username Detection ---
    function getMyFunPayUsername() {
        // 1. From body dataset (official FunPay data)
        try {
            if (document.body && document.body.dataset && document.body.dataset.appData) {
                const parsed = JSON.parse(document.body.dataset.appData);
                const data = Array.isArray(parsed) ? parsed[0] : parsed;
                const name = data?.userName || data?.username || data?.user?.name;
                if (name && typeof name === 'string' && name.trim()) return name.trim();
            }
        } catch(e) {}

        // 2. From top navbar user link (specifically in header dropdown)
        const navNameEl = document.querySelector('.navbar-right a.user-link-dropdown .user-link-name') ||
                          document.querySelector('.nav-profile a.user-link-dropdown .user-link-name') ||
                          document.querySelector('a.user-link-dropdown .user-link-name') ||
                          document.querySelector('.navbar .user-link-dropdown .user-link-name');
        if (navNameEl && navNameEl.textContent.trim()) {
            return navNameEl.textContent.trim();
        }

        return myUsername || null;
    }

    // Helper: Clean Nickname Extraction (Zero DOM clone, No network trigger for avatars)
    const NICK_IGNORED_CLASSES = [
        'badge', 'rating', 'avatar', 'media-user', 'fxn-custom-emoji-img', 
        'online-status', 'pull-right', 'text-muted', 'time', 'date', 
        'contact-item-time', 'media-user-status', 'user-status', 
        'foxen-user-status', 'chat-msg-time', 'text-nowrap'
    ];

    function getCleanNicknameText(el) {
        if (!el) return '';
        if (el.tagName === 'IMG' || el.classList.contains('avatar') || el.classList.contains('media-user')) return '';

        let text = '';
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (!['svg', 'canvas', 'img', 'button', 'script', 'style'].includes(tag)) {
                    const isIgnored = NICK_IGNORED_CLASSES.some(cls => node.classList.contains(cls));
                    if (!isIgnored) {
                        text += node.textContent;
                    }
                }
            }
        }
        return (text || '').trim();
    }

    const SUPABASE_REST_URL = 'https://api.foxen.site';
    const SUPABASE_FALLBACK_URL = 'https://yoacfrbedwksnfksjjmv.supabase.co';
    const SUPABASE_REST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';

    async function proxiedSupabaseFetch(url, options = {}) {
        const fetchOptions = {
            credentials: 'omit',
            ...options,
            headers: {
                ...(options.headers || {})
            }
        };

        const doFetch = (targetUrl) => new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'fxnFetchProxy', url: targetUrl, options: fetchOptions }, (res) => {
                    if (chrome.runtime.lastError || !res) {
                        fetch(targetUrl, fetchOptions).then(resolve).catch(() => resolve({ ok: false }));
                        return;
                    }
                    if (res && res.ok && res.text) {
                        try {
                            const data = JSON.parse(res.text);
                            resolve({ ok: true, json: async () => data });
                            return;
                        } catch(e) {}
                    }
                    // Fallback to direct fetch
                    fetch(targetUrl, fetchOptions).then(resolve).catch(() => resolve({ ok: false }));
                });
            } else {
                fetch(targetUrl, fetchOptions).then(resolve).catch(() => resolve({ ok: false }));
            }
        });

        let res = await doFetch(url);
        // Если api.foxen.site временно недоступен или вернул ошибку, пробуем прямой URL Supabase
        if ((!res || !res.ok) && url.includes('api.foxen.site')) {
            const fallbackUrl = url.replace('https://api.foxen.site', SUPABASE_FALLBACK_URL);
            const fbRes = await doFetch(fallbackUrl);
            if (fbRes && fbRes.ok) return fbRes;
        }
        return res;
    }

    // --- Batch User Effects Fetching & Cache ---
    let pendingLookupTimer = null;
    const pendingUsernames = new Set();
    const inFlightUsernames = new Set();
    let inFlightProfileId = null;

    async function fetchNicknameEffectsForUsers(usernames) {
        usernames.forEach(u => {
            if (u) {
                const lower = u.trim().toLowerCase();
                if (!userEffectsCache.has(lower) && !inFlightUsernames.has(lower)) {
                    pendingUsernames.add(u.trim());
                }
            }
        });

        // Also check if on a user profile page, lookup by fp_user_id
        const profileIdMatch = window.location.pathname.match(/\/users\/(\d+)/);
        const profileId = profileIdMatch ? profileIdMatch[1] : null;
        const needsProfileLookup = profileId && !userEffectsCache.has(profileId) && inFlightProfileId !== profileId;

        if (pendingLookupTimer || (pendingUsernames.size === 0 && !needsProfileLookup)) return;

        pendingLookupTimer = setTimeout(async () => {
            pendingLookupTimer = null;

            const batch = Array.from(pendingUsernames).slice(0, 30);
            batch.forEach(u => {
                pendingUsernames.delete(u);
                inFlightUsernames.add(u.toLowerCase());
            });

            const currentProfileLookup = needsProfileLookup ? profileId : null;
            if (currentProfileLookup) {
                inFlightProfileId = currentProfileLookup;
            }

            let newlyDiscovered = false;

            // 1. Direct Supabase REST Batch Query (Fast, reliable, real-time via Background Proxy)
            // 1. Direct Supabase REST Batch Query (Fast, reliable, real-time via Background Proxy)
            try {
                let queryParts = [];
                if (batch.length > 0) {
                    const uniqueNames = new Set();
                    batch.forEach(n => {
                        if (n) {
                            uniqueNames.add(n.trim());
                            uniqueNames.add(cleanUser(n));
                        }
                    });
                    const names = Array.from(uniqueNames).map(n => `"${n.replace(/"/g, '')}"`).join(',');
                    queryParts.push(`fp_user.in.(${names})`);
                    queryParts.push(`nickname_effect->>username.in.(${names})`);
                }
                if (currentProfileLookup) {
                    queryParts.push(`fp_user_id.eq.${encodeURIComponent(currentProfileLookup)}`);
                    queryParts.push(`nickname_effect->>fp_user_id.eq.${encodeURIComponent(currentProfileLookup)}`);
                }

                if (queryParts.length > 0) {
                    const sbUrl = `${SUPABASE_REST_URL}/rest/v1/profiles?select=id,fp_user,fp_user_id,foxen_id,nickname_effect,custom_emoji,is_premium&or=(${queryParts.join(',')})`;
                    const sbRes = await proxiedSupabaseFetch(sbUrl, {
                        headers: {
                            'apikey': SUPABASE_REST_KEY,
                            'Authorization': `Bearer ${SUPABASE_REST_KEY}`
                        }
                    });

                    if (sbRes.ok) {
                        const rows = await sbRes.json();
                        if (Array.isArray(rows)) {
                            rows.forEach(r => {
                                if (r) {
                                    // Проверка активной подписки пользователя
                                    let isUserPrem = Boolean(r.is_premium ?? r.has_premium);
                                    const adminIds = ['FX-000000', 'FX-000001', 'FX-774724', 'FX-15508026'];
                                    const adminUsers = ['vireonshop', 'sano'];
                                    const effUser = r.fp_user || r.nickname_effect?.username || null;
                                    const effUserId = r.fp_user_id || r.nickname_effect?.fp_user_id || null;

                                    if (adminIds.includes(String(r.foxen_id || '').toUpperCase()) || (effUser && adminUsers.includes(effUser.toLowerCase()))) {
                                        isUserPrem = true;
                                    } else if (Array.isArray(r.subscriptions) && r.subscriptions.length > 0) {
                                        const now = new Date();
                                        const activeSub = r.subscriptions.find(s => s.status === 'active' && (s.is_lifetime || !s.expires_at || new Date(s.expires_at) > now));
                                        isUserPrem = Boolean(activeSub);
                                    }

                                    const eff = (isUserPrem && r.nickname_effect && r.nickname_effect.id) ? r.nickname_effect : null;
                                    const emoji = (isUserPrem && r.custom_emoji) ? r.custom_emoji : null;
                                    const userPayload = (eff || emoji) ? { effect: eff, emoji: emoji } : null;

                                    if (effUser) {
                                        const low = effUser.toLowerCase();
                                        const cln = cleanUser(effUser);
                                        userEffectsCache.set(low, userPayload);
                                        userEffectsCache.set(cln, userPayload);
                                        if (myUsername && cleanUser(myUsername) === cln) {
                                            if (emoji) myFoxenEmoji = emoji;
                                            if (eff) myFoxenEffect = eff;
                                        }
                                    }
                                    if (effUserId) {
                                        userEffectsCache.set(String(effUserId), userPayload);
                                    }
                                    if (userPayload) newlyDiscovered = true;
                                }
                            });
                        }
                    }
                }
            } catch (sbErr) {
                console.warn('[Foxen Nickname FX] Supabase lookup error:', sbErr);
            } finally {
                // Release in-flight lock and mark missing as null so we don't spam
                batch.forEach(u => {
                    const lower = u.toLowerCase();
                    const cln = cleanUser(u);
                    inFlightUsernames.delete(lower);
                    if (!userEffectsCache.has(lower) && !userEffectsCache.has(cln)) {
                        userEffectsCache.set(lower, null);
                        userEffectsCache.set(cln, null);
                    }
                });
                if (currentProfileLookup) {
                    inFlightProfileId = null;
                    if (!userEffectsCache.has(currentProfileLookup)) {
                        userEffectsCache.set(currentProfileLookup, null);
                    }
                }
            }

            if (newlyDiscovered) {
                reapplyAllEffects();
            }

            if (pendingUsernames.size > 0) {
                fetchNicknameEffectsForUsers([]);
            }
        }, 120);
    }

    // --- Re-apply All Canvases and Emoji on Update ---
    function reapplyAllEffects() {
        activeCanvases.forEach(item => item.destroy());
        activeCanvases.clear();
        document.querySelectorAll('.fxn-custom-emoji-img').forEach(el => el.remove());
        document.querySelectorAll('.fxn-nick-decorated').forEach(el => {
            el.classList.remove('fxn-nick-decorated');
            el.style.color = '';
        });
        document.querySelectorAll('.fxn-nick-target').forEach(span => {
            span.style.color = '';
            span.querySelectorAll('canvas').forEach(c => c.remove());
        });
        scanAndApplyNicknameEffects();
    }

    const cleanUser = (u) => String(u || '').toLowerCase().replace(/[\s_-]+/g, '');

    // --- Scan & Decorate FunPay DOM Nicknames ---
    function scanAndApplyNicknameEffects() {
        if (document.hidden) return;

        const currentMe = getMyFunPayUsername();
        if (currentMe) myUsername = currentMe;

        // Selectors across FunPay (specific nickname elements only, avoid duplicate parent containers)
        const selectors = [
            '.fxn-profile-name',
            '.profile-header .mr4',
            '.profile .mr4',
            '.media-body > h1 .mr4',
            '.mr4',
            '.contact-item .media-user-name',
            '.chat .media-user-name',
            '.media-user-name',
            '.chat-header .media-user-name a',
            '.chat-header .media-user-name',
            '.chat-message .chat-msg-author a',
            '.chat-message .chat-msg-author',
            '.chat-msg-author',
            '.user-link-name',
            '.tc-user .media-user-name',
            '.order-desc .media-user-name',
            'a[href*="/users/"]:not(.avatar):not(.media-user):not([class*="avatar"])',
            '.fxn-spm-username',
            '#fxnSpmUsername'
        ];

        const rawElements = document.querySelectorAll(selectors.join(', '));
        const usernamesToLookup = [];

        rawElements.forEach(rawEl => {
            if (!rawEl) return;

            // Skip elements that are explicitly hidden
            const computed = window.getComputedStyle(rawEl);
            if (computed.display === 'none' || computed.visibility === 'hidden') return;

            // Никогда не применять эффекты ника или кастом эмодзи внутри меню профиля, кроме самого ника (#fxnSpmUsername)
            if (rawEl.closest('#fxnSidebarProfileModal, #fxnSpmStatsCard, .fxn-spm-grid-stats, .fxn-spm-card, #foxenMainPopup, .fxn-popup') && rawEl.id !== 'fxnSpmUsername') {
                return;
            }

            // Prevent decorating if already currently decorated with an active canvas
            if (rawEl.classList.contains('fxn-nick-decorated') || 
                rawEl.closest('.fxn-nick-decorated') || 
                rawEl.querySelector('.fxn-nick-overlay-canvas')) {
                return;
            }

            const text = getCleanNicknameText(rawEl);
            if (!text || text.length > 30 || text.includes('\n')) return;

            const lower = text.toLowerCase();
            const clean = cleanUser(text);

            // 1. Check local user effects / emoji cache
            const profileIdMatch = window.location.pathname.match(/\/users\/(\d+)/);
            const currentUrlProfileId = profileIdMatch ? profileIdMatch[1] : null;

            // Check if element is or is contained in an explicit user link
            const userLink = rawEl.tagName === 'A' ? rawEl : rawEl.closest('a[href*="/users/"]');
            const userHrefMatch = userLink ? userLink.getAttribute('href')?.match(/\/users\/(\d+)/) : null;
            const elUserId = userHrefMatch ? userHrefMatch[1] : null;

            // Determine if rawEl is specifically the profile header of the current profile page
            const isProfileHeader = Boolean(
                currentUrlProfileId &&
                rawEl.closest('.profile-header, .media-body > h1, .profile > .media-body') && 
                !rawEl.closest('.review-item, .review, .rating, .reviews, .order-desc, .tc-item')
            );

            // 1a. Cache lookup by username
            let data = userEffectsCache.get(lower) || userEffectsCache.get(clean);

            // 1b. Cache lookup by specific element user ID if linking to a user
            if (!data && elUserId) {
                data = userEffectsCache.get(elUserId);
            }

            // 1c. ONLY apply current profile ID effect if the element IS the profile header or explicitly links to this profile owner
            if (!data && currentUrlProfileId && (isProfileHeader || elUserId === currentUrlProfileId)) {
                data = userEffectsCache.get(currentUrlProfileId);
            }

            if (data) {
                const eff = data.effect || (data.id ? data : null);
                const emoji = data.emoji || null;

                let targetEl = rawEl;
                if (eff && eff.id && !rawEl.classList.contains('fxn-nick-decorated')) {
                    targetEl = wrapTextNodeForNicknameFX(rawEl, text);
                    if (targetEl && !targetEl.classList.contains('fxn-nick-decorated')) {
                        const overlay = new NicknameOverlayCanvas(targetEl, text, eff);
                        activeCanvases.add(overlay);
                    }
                }
                if (emoji) {
                    attachCustomEmojiBadge(targetEl || rawEl, emoji);
                }
                return;
            }

            // 2. Check if this is the currently authenticated Foxen user with bound effect / emoji
            const effObj = (myFoxenEffect && typeof myFoxenEffect === 'string') ? { id: myFoxenEffect } : myFoxenEffect;
            const isMe = (myUsername && (lower === myUsername.toLowerCase() || clean === cleanUser(myUsername))) || 
                         rawEl.id === 'fxnSpmUsername' || rawEl.classList.contains('fxn-spm-username');

            if (isMe && (effObj?.id || myFoxenEmoji)) {
                let targetEl = rawEl;
                if (effObj?.id && !rawEl.classList.contains('fxn-nick-decorated')) {
                    targetEl = wrapTextNodeForNicknameFX(rawEl, text);
                    if (targetEl && !targetEl.classList.contains('fxn-nick-decorated')) {
                        const overlay = new NicknameOverlayCanvas(targetEl, text, effObj);
                        activeCanvases.add(overlay);
                    }
                }
                if (myFoxenEmoji) {
                    attachCustomEmojiBadge(targetEl || rawEl, myFoxenEmoji);
                }
                return;
            }

            if (rawEl.classList.contains('fxn-nick-decorated')) return;

            // 3. Otherwise queue for server lookup
            usernamesToLookup.push(text);
        });

        if (activeCanvases.size > 0) {
            startLoop();
        }

        if (usernamesToLookup.length > 0) {
            fetchNicknameEffectsForUsers(usernamesToLookup);
        }
    }

    // --- Live Verification of Current User Premium Status ---
    const ADMIN_IDS = ['FX-000000', 'FX-000001', 'FX-774724', 'FX-15508026'];
    const ADMIN_USERS = ['vireonshop', 'sano'];

    async function verifyLiveUserSubscriptionAndSync() {
        try {
            const uName = getMyFunPayUsername() || myUsername;
            if (!uName) return;
            myUsername = uName;
            const uClean = cleanUser(uName);

            let isPremium = ADMIN_USERS.includes(uName.toLowerCase());

            // 1. Check if profile in chrome.storage already has confirmed premium or admin ID
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const localData = await new Promise(r => chrome.storage.local.get([
                    'foxen_user_profile', 'foxenUserProfile', 
                    'fxn_my_custom_emoji', 'fxn_my_nickname_effect',
                    `fxn_custom_emoji_${uClean}`, `fxn_effect_${uClean}`
                ], r));
                const prof = localData?.foxen_user_profile || localData?.foxenUserProfile;
                const profUser = (prof?.fp_user || prof?.username || '').toLowerCase();
                const isCurrentProfile = Boolean(profUser && cleanUser(profUser) === uClean);

                if (isCurrentProfile && prof) {
                    const foxenId = String(prof.foxen_id || '').toUpperCase();
                    if (ADMIN_IDS.includes(foxenId) || prof.has_premium || prof.is_premium || prof.subscription_status === 'active') {
                        isPremium = true;
                    }
                }
                const cachedUserEmoji = localData?.[`fxn_custom_emoji_${uClean}`] || (isCurrentProfile ? (prof?.custom_emoji || localData?.fxn_my_custom_emoji) : null);
                const cachedUserEffect = localData?.[`fxn_effect_${uClean}`] || (isCurrentProfile ? (prof?.nickname_effect || localData?.fxn_my_nickname_effect) : null);

                myFoxenEmoji = cachedUserEmoji || null;
                myFoxenEffect = cachedUserEffect || null;
            }

            // 2. Always sync latest effect & custom emoji from profiles table for this account
            let changed = false;
            try {
                const profUrl = `${SUPABASE_REST_URL}/rest/v1/profiles?fp_user=ilike.${encodeURIComponent(uName)}&select=foxen_id,is_premium,custom_emoji,nickname_effect&limit=1`;
                const profRes = await proxiedSupabaseFetch(profUrl, {
                    headers: {
                        'apikey': SUPABASE_REST_KEY,
                        'Authorization': `Bearer ${SUPABASE_REST_KEY}`
                    }
                });
                if (profRes.ok) {
                    const profs = await profRes.json();
                    if (Array.isArray(profs) && profs.length > 0) {
                        const p = profs[0];
                        if (ADMIN_USERS.includes(uName.toLowerCase()) || p?.is_premium || p?.has_premium || ADMIN_IDS.includes(String(p?.foxen_id || '').toUpperCase())) {
                            isPremium = true;
                        } else {
                            isPremium = false;
                        }
                        const serverEmoji = (isPremium && p?.custom_emoji) ? p.custom_emoji : null;
                        const serverEffect = (isPremium && p?.nickname_effect && p?.nickname_effect?.id) ? p.nickname_effect : null;

                        if (myFoxenEmoji !== serverEmoji) {
                            myFoxenEmoji = serverEmoji;
                            changed = true;
                        }
                        if (JSON.stringify(myFoxenEffect) !== JSON.stringify(serverEffect)) {
                            myFoxenEffect = serverEffect;
                            changed = true;
                        }
                    } else {
                        // User not found in profiles or has no profile
                        if (!ADMIN_USERS.includes(uName.toLowerCase())) {
                            isPremium = false;
                            if (myFoxenEmoji !== null) { myFoxenEmoji = null; changed = true; }
                            if (myFoxenEffect !== null) { myFoxenEffect = null; changed = true; }
                        }
                    }
                }
            } catch(e) {}

            const low = uName.toLowerCase();
            const cln = cleanUser(uName);
            userEffectsCache.set(low, { effect: myFoxenEffect, emoji: myFoxenEmoji });
            userEffectsCache.set(cln, { effect: myFoxenEffect, emoji: myFoxenEmoji });
            if (changed) {
                reapplyAllEffects();
            }

            if (!isPremium) {
                console.log('[Foxen Nickname FX] Подписка Premium не активна для текущего аккаунта FunPay:', uName);
            }
        } catch(err) {
            console.warn('[Foxen Nickname FX] Error checking live subscription:', err);
        }
    }

    // --- Initialize ---
    async function initNicknameFX() {
        setupObserver();

        const currentMe = getMyFunPayUsername();
        if (currentMe) myUsername = currentMe;

        // 1. Load current user's effect and custom emoji from chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['fxn_my_nickname_effect', 'fxn_my_custom_emoji', 'foxen_user_profile', 'fpCurrentUserInfo', 'foxenUserProfile'], (res) => {
                const activeUser = myUsername || res?.fpCurrentUserInfo?.username || res?.foxenUserProfile?.username || null;
                myUsername = activeUser;
                const cleanActive = cleanUser(activeUser);

                const prof = res?.foxen_user_profile || res?.foxenUserProfile;
                const profUser = (prof?.fp_user || prof?.username || '').toLowerCase();
                const isProfileMatch = Boolean(cleanActive && profUser && (cleanUser(profUser) === cleanActive));

                const scopedEmoji = cleanActive ? res?.[`fxn_custom_emoji_${cleanActive}`] : null;
                const scopedEffect = cleanActive ? res?.[`fxn_effect_${cleanActive}`] : null;

                if (scopedEffect) {
                    myFoxenEffect = scopedEffect;
                } else if (isProfileMatch && prof?.nickname_effect) {
                    myFoxenEffect = prof.nickname_effect;
                } else {
                    myFoxenEffect = null;
                }

                if (scopedEmoji) {
                    myFoxenEmoji = scopedEmoji;
                } else if (isProfileMatch && prof?.custom_emoji) {
                    myFoxenEmoji = prof.custom_emoji;
                } else {
                    myFoxenEmoji = null;
                }

                scanAndApplyNicknameEffects();
                verifyLiveUserSubscriptionAndSync();
            });

            // 2. Storage Changed listener (instant real-time sync across tabs)
            if (chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName === 'local') {
                        const activeCln = cleanUser(myUsername);
                        if (activeCln && changes[`fxn_custom_emoji_${activeCln}`]) {
                            myFoxenEmoji = changes[`fxn_custom_emoji_${activeCln}`].newValue || null;
                            const prev = userEffectsCache.get(myUsername.toLowerCase()) || {};
                            userEffectsCache.set(myUsername.toLowerCase(), { ...prev, emoji: myFoxenEmoji });
                            reapplyAllEffects();
                        } else if (changes.fxn_my_custom_emoji && (!changes.fxn_my_active_user || changes.fxn_my_active_user.newValue === activeCln)) {
                            myFoxenEmoji = changes.fxn_my_custom_emoji.newValue || null;
                            if (myUsername) {
                                const lower = myUsername.toLowerCase();
                                const prev = userEffectsCache.get(lower) || {};
                                userEffectsCache.set(lower, { ...prev, emoji: myFoxenEmoji });
                            }
                            reapplyAllEffects();
                        }

                        if (activeCln && changes[`fxn_effect_${activeCln}`]) {
                            myFoxenEffect = changes[`fxn_effect_${activeCln}`].newValue || null;
                            const prev = userEffectsCache.get(myUsername.toLowerCase()) || {};
                            userEffectsCache.set(myUsername.toLowerCase(), { ...prev, effect: myFoxenEffect });
                            reapplyAllEffects();
                        } else if (changes.fxn_my_nickname_effect) {
                            const newEff = changes.fxn_my_nickname_effect.newValue;
                            if (!newEff?.username || cleanUser(newEff.username) === activeCln) {
                                myFoxenEffect = newEff || null;
                                if (myUsername) {
                                    const lower = myUsername.toLowerCase();
                                    const prev = userEffectsCache.get(lower) || {};
                                    userEffectsCache.set(lower, { ...prev, effect: myFoxenEffect });
                                }
                                reapplyAllEffects();
                            }
                        }

                        if (changes.fpCurrentUserInfo && changes.fpCurrentUserInfo.newValue?.username) {
                            myUsername = changes.fpCurrentUserInfo.newValue.username;
                            reapplyAllEffects();
                            verifyLiveUserSubscriptionAndSync();
                        }
                    }
                });
            }
        } else {
            verifyLiveUserSubscriptionAndSync();
        }

        // 3. Listen to window message bridge from website
        window.addEventListener('message', (event) => {
            if (event.data && (event.data.action === 'FOXEN_SYNC_NICKNAME_EFFECT' || event.data.type === 'FOXEN_SYNC_NICKNAME_EFFECT')) {
                const currentMe = getMyFunPayUsername() || myUsername;
                const targetUser = event.data.username ? event.data.username.toLowerCase() : null;
                const isForMe = !targetUser || !currentMe || targetUser === currentMe.toLowerCase();

                if (isForMe) {
                    myFoxenEffect = event.data.effect || null;
                    myFoxenEmoji = (typeof event.data.custom_emoji !== 'undefined') ? event.data.custom_emoji : null;
                }
                if (targetUser) {
                    userEffectsCache.set(targetUser, { effect: event.data.effect || null, emoji: event.data.custom_emoji || null });
                    userEffectsCache.set(cleanUser(targetUser), { effect: event.data.effect || null, emoji: event.data.custom_emoji || null });
                }
                reapplyAllEffects();
                verifyLiveUserSubscriptionAndSync();
            }
        });

        // 4. MutationObserver for dynamic chats, lot listings, orders (Debounced)
        let domMutationTimer = null;
        const domObserver = new MutationObserver(() => {
            if (domMutationTimer) return;
            domMutationTimer = setTimeout(() => {
                domMutationTimer = null;
                scanAndApplyNicknameEffects();
            }, 100);
        });

        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        scanAndApplyNicknameEffects();
    }

    // Window focus & Tab visibility handling (100% pause when another window is open or focused)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopLoop();
        } else {
            startLoop();
        }
    });

    window.addEventListener('blur', () => {
        stopLoop();
    });

    window.addEventListener('focus', () => {
        if (!document.hidden && activeCanvases.size > 0) {
            startLoop();
        }
    });

    window.addEventListener('pagehide', () => {
        stopLoop();
    });

    // Global access for Foxen UI / Profile Drawer
    window.__foxenGetMyNicknameEffect = () => myFoxenEffect;
    window.__foxenGetMyCustomEmoji = () => myFoxenEmoji;
    window.__foxenScanAndApplyNicknameEffects = scanAndApplyNicknameEffects;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNicknameFX);
    } else {
        initNicknameFX();
    }

})();
