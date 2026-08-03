// content/features/particle_fx.js
// =============================================================================
// FOXEN FULL-PAGE PARTICLE ENGINE (HIGH PERFORMANCE)
//  • Presets: Snow (❄️), Rain (💧), Sakura (🌸), Autumn Leaves (🍂), Stardust (✨), Bubbles (🫧)
//  • Optimization: Auto-pauses on document.hidden (0 CPU/GPU when tab inactive).
//  • Live Scale, Speed, and Density Controls with Canvas2D.
// =============================================================================

(function () {
    'use strict';

    class FPTFullPageParticles {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.animFrameId = null;
            this.isRunning = false;
            this.particles = [];

            this.enabled = false;
            this.preset = 'snow';
            this.count = 40;
            this.speed = 1.0;
            this.scale = 1.0;

            this.width = 0;
            this.height = 0;
            this.dpr = 1;

            this.bindEvents();
            this.loadSettings();
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                if (this.canvas) this.resizeCanvas();
            });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopLoop();
                } else if (this.enabled) {
                    this.startLoop();
                }
            });

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener((changes, area) => {
                    if (area !== 'local') return;
                    let shouldReinit = false;
                    if (changes.foxenParticleEnabled !== undefined) {
                        this.enabled = changes.foxenParticleEnabled.newValue === true;
                        shouldReinit = true;
                    }
                    if (changes.foxenParticlePreset !== undefined) {
                        this.preset = changes.foxenParticlePreset.newValue || 'snow';
                        shouldReinit = true;
                    }
                    if (changes.foxenParticleCount !== undefined) {
                        this.count = Number(changes.foxenParticleCount.newValue) || 40;
                        shouldReinit = true;
                    }
                    if (changes.foxenParticleSpeed !== undefined) {
                        this.speed = Number(changes.foxenParticleSpeed.newValue) || 1.0;
                    }
                    if (changes.foxenParticleScale !== undefined) {
                        this.scale = Number(changes.foxenParticleScale.newValue) || 1.0;
                    }

                    if (shouldReinit) {
                        this.applyState();
                    }
                });
            }
        }

        async loadSettings() {
            try {
                const st = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
                    'foxenParticleEnabled',
                    'foxenParticlePreset',
                    'foxenParticleCount',
                    'foxenParticleSpeed',
                    'foxenParticleScale'
                ]);

                this.enabled = st.foxenParticleEnabled === true;
                this.preset = st.foxenParticlePreset || 'snow';
                this.count = Number(st.foxenParticleCount) || 40;
                this.speed = Number(st.foxenParticleSpeed) || 1.0;
                this.scale = Number(st.foxenParticleScale) || 1.0;

                this.applyState();
            } catch (_) {}
        }

        applyState() {
            if (this.enabled) {
                this.ensureCanvas();
                this.initParticles();
                this.startLoop();
            } else {
                this.stopLoop();
                this.removeCanvas();
            }
        }

        ensureCanvas() {
            if (this.canvas) return;
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'fxn-fullpage-particles-canvas';
            Object.assign(this.canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: '999990',
                opacity: '0.9'
            });

            this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: false });
            (document.body || document.documentElement).appendChild(this.canvas);
            this.resizeCanvas();
        }

        removeCanvas() {
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
            this.canvas = null;
            this.ctx = null;
        }

        resizeCanvas() {
            if (!this.canvas) return;
            this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);
            if (this.ctx) this.ctx.scale(this.dpr, this.dpr);
        }

        initParticles() {
            this.particles = [];
            for (let i = 0; i < this.count; i++) {
                this.particles.push(this.createParticle(true));
            }
        }

        createParticle(randomY = false) {
            const p = {
                x: Math.random() * this.width,
                y: randomY ? Math.random() * this.height : -20,
                baseSize: 3,
                speedY: (1 + Math.random() * 1.8),
                speedX: (Math.random() - 0.5) * 0.8,
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.04,
                opacity: 0.3 + Math.random() * 0.6,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03
            };

            switch (this.preset) {
                case 'snow':
                    p.baseSize = 2 + Math.random() * 5;
                    p.speedY = 0.8 + Math.random() * 1.5;
                    p.speedX = (Math.random() - 0.5) * 0.5;
                    break;
                case 'rain':
                    p.baseSize = 12 + Math.random() * 18;
                    p.speedY = 12 + Math.random() * 10;
                    p.speedX = -1.5 - Math.random() * 1;
                    p.opacity = 0.25 + Math.random() * 0.4;
                    break;
                case 'sakura':
                    p.baseSize = 6 + Math.random() * 7;
                    p.speedY = 1.2 + Math.random() * 1.8;
                    p.speedX = 0.6 + Math.random() * 1.2;
                    p.color = Math.random() > 0.3 ? '#ffb7c5' : '#ff8da1';
                    break;
                case 'autumn':
                    p.baseSize = 7 + Math.random() * 8;
                    p.speedY = 1.0 + Math.random() * 1.6;
                    p.speedX = -0.5 + Math.random() * 1.2;
                    const colors = ['#e67e22', '#d35400', '#c0392b', '#f1c40f', '#e74c3c'];
                    p.color = colors[Math.floor(Math.random() * colors.length)];
                    break;
                case 'stardust':
                    p.baseSize = 1.5 + Math.random() * 3;
                    p.speedY = -(0.5 + Math.random() * 1.2);
                    p.speedX = (Math.random() - 0.5) * 0.4;
                    p.y = randomY ? Math.random() * this.height : this.height + 10;
                    p.color = Math.random() > 0.5 ? '#e9a8ff' : '#64b5f6';
                    break;
                case 'bubbles':
                    p.baseSize = 4 + Math.random() * 10;
                    p.speedY = -(0.8 + Math.random() * 1.4);
                    p.speedX = (Math.random() - 0.5) * 0.6;
                    p.y = randomY ? Math.random() * this.height : this.height + 15;
                    p.opacity = 0.15 + Math.random() * 0.35;
                    break;
            }

            return p;
        }

        startLoop() {
            if (this.isRunning) return;
            this.isRunning = true;
            let lastTime = performance.now();

            const loop = (now) => {
                if (!this.isRunning) return;
                const dt = Math.min((now - lastTime) / 1000, 0.1);
                lastTime = now;

                this.update(dt);
                this.draw();

                this.animFrameId = requestAnimationFrame(loop);
            };

            this.animFrameId = requestAnimationFrame(loop);
        }

        stopLoop() {
            this.isRunning = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        update(dt) {
            const spd = this.speed;

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.wobble += p.wobbleSpeed;
                p.angle += p.rotationSpeed * spd;

                if (this.preset === 'snow') {
                    p.y += p.speedY * spd;
                    p.x += (p.speedX + Math.sin(p.wobble) * 0.6) * spd;

                    if (p.y > this.height + 10) {
                        this.particles[i] = this.createParticle(false);
                    }
                } else if (this.preset === 'rain') {
                    p.y += p.speedY * spd;
                    p.x += p.speedX * spd;

                    if (p.y > this.height || p.x < -20) {
                        this.particles[i] = this.createParticle(false);
                    }
                } else if (this.preset === 'sakura' || this.preset === 'autumn') {
                    p.y += p.speedY * spd;
                    p.x += (p.speedX + Math.sin(p.wobble) * 0.8) * spd;

                    if (p.y > this.height + 15) {
                        this.particles[i] = this.createParticle(false);
                    }
                } else if (this.preset === 'stardust' || this.preset === 'bubbles') {
                    p.y += p.speedY * spd;
                    p.x += Math.sin(p.wobble) * 0.5 * spd;

                    if (p.y < -20) {
                        this.particles[i] = this.createParticle(false);
                        this.particles[i].y = this.height + 10;
                    }
                }
            }
        }

        draw() {
            if (!this.ctx) return;
            this.ctx.clearRect(0, 0, this.width, this.height);

            for (const p of this.particles) {
                this.ctx.save();
                this.ctx.globalAlpha = p.opacity;

                switch (this.preset) {
                    case 'snow':
                        this.drawSnowflake(p);
                        break;
                    case 'rain':
                        this.drawRaindrop(p);
                        break;
                    case 'sakura':
                        this.drawSakuraPetal(p);
                        break;
                    case 'autumn':
                        this.drawAutumnLeaf(p);
                        break;
                    case 'stardust':
                        this.drawStardust(p);
                        break;
                    case 'bubbles':
                        this.drawBubble(p);
                        break;
                }

                this.ctx.restore();
            }
        }

        drawSnowflake(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 4) * this.scale;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        drawRaindrop(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 15) * this.scale;
            ctx.strokeStyle = 'rgba(120, 180, 255, 0.65)';
            ctx.lineWidth = Math.max(1, 1.2 * this.scale);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.speedX * 1.5, p.y + sz);
            ctx.stroke();
        }

        drawSakuraPetal(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 7) * this.scale;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            ctx.fillStyle = p.color || '#ffb7c5';
            ctx.beginPath();
            ctx.moveTo(0, -sz);
            ctx.bezierCurveTo(sz * 0.8, -sz * 0.5, sz * 0.8, sz * 0.5, 0, sz);
            ctx.bezierCurveTo(-sz * 0.8, sz * 0.5, -sz * 0.8, -sz * 0.5, 0, -sz);
            ctx.fill();
        }

        drawAutumnLeaf(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 8) * this.scale;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            ctx.fillStyle = p.color || '#e67e22';
            ctx.beginPath();
            ctx.moveTo(0, -sz * 1.2);
            ctx.quadraticCurveTo(sz * 0.9, -sz * 0.2, sz * 0.4, sz * 0.8);
            ctx.quadraticCurveTo(0, sz * 1.1, -sz * 0.4, sz * 0.8);
            ctx.quadraticCurveTo(-sz * 0.9, -sz * 0.2, 0, -sz * 1.2);
            ctx.fill();
        }

        drawStardust(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 2.5) * this.scale;
            ctx.fillStyle = p.color || '#e9a8ff';
            ctx.shadowColor = p.color || '#e9a8ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        drawBubble(p) {
            const ctx = this.ctx;
            const sz = (p.baseSize || 6) * this.scale;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = Math.max(0.8, 1 * this.scale);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Highlight arc
            ctx.beginPath();
            ctx.arc(p.x - sz * 0.3, p.y - sz * 0.3, sz * 0.3, Math.PI * 1.2, Math.PI * 1.7);
            ctx.stroke();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.__fptParticlesEngine = new FPTFullPageParticles();
        });
    } else {
        window.__fptParticlesEngine = new FPTFullPageParticles();
    }
})();
