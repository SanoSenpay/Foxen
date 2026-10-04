// background/remake.js - Foxen 3.4 Mind-Blowing Converter Engine
// Cardinal Bot JSON → Foxen Native Schema

(function () {
    'use strict';

    // ── DOM References ────────────────────────────────────────────────────────
    const dropZone          = document.getElementById('drop-zone');
    const fileInput         = document.getElementById('file-input');
    const logElement        = document.getElementById('log');
    const downloadBtn       = document.getElementById('download-btn');
    const copyBtn           = document.getElementById('copy-btn');
    const copyBtnText       = document.getElementById('copy-btn-text');
    const clearBtn          = document.getElementById('clear-btn');
    const clearLogBtn       = document.getElementById('clear-log-btn');
    const dropIcon          = document.getElementById('drop-icon');

    // Stats
    const statFilesEl       = document.getElementById('stat-files');
    const statLotsEl        = document.getElementById('stat-lots');
    const statSecretsEl     = document.getElementById('stat-secrets');
    const statMsgsEl        = document.getElementById('stat-msgs');
    const previewCountBadge = document.getElementById('preview-count-badge');

    // Tabs & Views
    const tabBtnConsole     = document.getElementById('tab-btn-console');
    const tabBtnPreview     = document.getElementById('tab-btn-preview');
    const consoleView       = document.getElementById('console-view');
    const previewView       = document.getElementById('preview-view');
    const previewSearch     = document.getElementById('preview-search');
    const previewList       = document.getElementById('preview-list');

    // 3D Card & FX
    const tiltWrapper       = document.getElementById('tiltWrapper');
    const mainCard          = document.getElementById('mainCard');
    const soundToggleBtn    = document.getElementById('sound-toggle-btn');
    const soundIcon         = document.getElementById('sound-icon');

    // State
    let allConvertedLots    = [];
    let processedFilesCount = 0;
    let audioCtx            = null;
    let soundEnabled        = localStorage.getItem('foxenConverterSound') !== 'off';

    // ── Audio FX (Web Audio API Synthesizer) ──────────────────────────────────
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (type === 'hover') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(420, now);
                osc.frequency.exponentialRampToValueAtTime(840, now + 0.05);
                gain.gain.setValueAtTime(0.015, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'drop') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'success') {
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.06);
                    gain.gain.setValueAtTime(0.035, now + i * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.06);
                    osc.stop(now + i * 0.06 + 0.25);
                });
            }
        } catch (_) {}
    }

    function updateSoundIcon() {
        if (soundIcon) {
            soundIcon.textContent = soundEnabled ? 'volume_up' : 'volume_off';
            soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.6';
        }
    }
    updateSoundIcon();

    soundToggleBtn?.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('foxenConverterSound', soundEnabled ? 'on' : 'off');
        updateSoundIcon();
        if (soundEnabled) playSound('hover');
    });

    // ── Logging System ────────────────────────────────────────────────────────
    function log(message, type = 'info') {
        if (!logElement) return;
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;

        const timeStr = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg">${escapeHtml(message)}</span>`;

        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    clearLogBtn?.addEventListener('click', () => {
        if (logElement) logElement.innerHTML = '';
        log('Лог очищен.', 'info');
    });

    // ── Counter Animations ───────────────────────────────────────────────────
    function animateCounter(element, targetVal, duration = 600) {
        if (!element) return;
        const startVal = parseInt(element.textContent.replace(/\D/g, '') || '0', 10);
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.round(startVal + (targetVal - startVal) * easeProgress);
            element.textContent = currentVal.toLocaleString('ru-RU');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = targetVal.toLocaleString('ru-RU');
            }
        }
        requestAnimationFrame(update);
    }

    function updateStats() {
        const totalLots = allConvertedLots.length;
        let withSecrets = 0;
        let withOrderMsg = 0;

        for (const lot of allConvertedLots) {
            const d = lot.data || {};
            if (d.auto_delivery === 'on' || (Array.isArray(d.secrets) && d.secrets.length > 0)) {
                withSecrets++;
            }
            if (d.order_msg && String(d.order_msg).trim()) {
                withOrderMsg++;
            }
        }

        animateCounter(statFilesEl, processedFilesCount);
        animateCounter(statLotsEl, totalLots);
        animateCounter(statSecretsEl, withSecrets);
        animateCounter(statMsgsEl, withOrderMsg);

        if (previewCountBadge) {
            previewCountBadge.textContent = totalLots;
        }

        renderPreviewList();
    }

    // ── Preview Drawer / List ─────────────────────────────────────────────────
    function renderPreviewList() {
        if (!previewList) return;
        if (!allConvertedLots.length) {
            previewList.innerHTML = `<div class="preview-empty-state">Загрузите JSON-файлы для просмотра списка предложений</div>`;
            return;
        }

        const query = (previewSearch?.value || '').toLowerCase().trim();
        const filtered = allConvertedLots.filter(item => {
            if (!query) return true;
            const title = (item.sourceTitle || '').toLowerCase();
            const cat = String(item.sourceCategory || '').toLowerCase();
            return title.includes(query) || cat.includes(query);
        });

        if (!filtered.length) {
            previewList.innerHTML = `<div class="preview-empty-state">Ничего не найдено по запросу "${escapeHtml(query)}"</div>`;
            return;
        }

        let html = '';
        // Render up to 100 items for performance
        const displayItems = filtered.slice(0, 100);

        displayItems.forEach((lot, i) => {
            const title = lot.sourceTitle || 'Лот без названия';
            const cat = lot.sourceCategory ? `Категория: ${lot.sourceCategory}` : 'Категория не указана';
            const data = lot.data || {};
            const secretsCount = Array.isArray(data.secrets) ? data.secrets.length : 0;
            const hasMsg = Boolean(data.order_msg && String(data.order_msg).trim());

            html += `
                <div class="preview-item-card">
                    <div class="preview-item-title-col">
                        <div class="preview-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                        <div class="preview-item-badges">
                            <span class="preview-badge">${escapeHtml(cat)}</span>
                            ${secretsCount > 0 ? `<span class="preview-badge delivery">⚡ Авто-выдача (${secretsCount})</span>` : ''}
                            ${hasMsg ? `<span class="preview-badge reply">💬 Текст после оплаты</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        if (filtered.length > 100) {
            html += `<div style="text-align:center;padding:10px;font-size:11.5px;color:var(--fx-text-muted);">И ещё ${filtered.length - 100} предложений в базе...</div>`;
        }

        previewList.innerHTML = html;
    }

    previewSearch?.addEventListener('input', () => {
        renderPreviewList();
    });

    // ── Tab Navigation ────────────────────────────────────────────────────────
    function switchTab(target) {
        if (target === 'console') {
            tabBtnConsole?.classList.add('active');
            tabBtnPreview?.classList.remove('active');
            if (consoleView) consoleView.style.display = 'block';
            if (previewView) previewView.style.display = 'none';
        } else {
            tabBtnConsole?.classList.remove('active');
            tabBtnPreview?.classList.add('active');
            if (consoleView) consoleView.style.display = 'none';
            if (previewView) previewView.style.display = 'block';
            renderPreviewList();
        }
        playSound('hover');
    }

    tabBtnConsole?.addEventListener('click', () => switchTab('console'));
    tabBtnPreview?.addEventListener('click', () => switchTab('preview'));

    // ── Reset System ──────────────────────────────────────────────────────────
    function resetState() {
        allConvertedLots = [];
        processedFilesCount = 0;
        if (logElement) logElement.innerHTML = '';
        if (downloadBtn) downloadBtn.disabled = true;
        if (copyBtn) copyBtn.disabled = true;
        if (fileInput) fileInput.value = '';
        if (previewSearch) previewSearch.value = '';

        updateStats();
        switchTab('console');
        log('Система готова к приёму файлов Cardinal Bot...', 'info');
        playSound('hover');
    }
    clearBtn?.addEventListener('click', resetState);

    // ── File Drop & Handling ──────────────────────────────────────────────────
    dropZone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => handleFiles(fileInput.files));

    dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone?.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    });

    async function handleFiles(files) {
        if (!files || !files.length) return;
        playSound('drop');

        log(`Получено ${files.length} файл(ов). Запуск анализа структуры...`, 'info');

        const fileArray = Array.from(files);
        const results = await Promise.all(fileArray.map(file => new Promise(resolve => {
            if (!file.name.toLowerCase().endsWith('.json')) {
                log(`Файл "${file.name}" пропущен: поддерживается только .json`, 'warn');
                resolve([]);
                return;
            }

            const reader = new FileReader();
            reader.onerror = () => {
                log(`Ошибка чтения файла "${file.name}"`, 'error');
                resolve([]);
            };

            reader.onload = (e) => {
                try {
                    let rawText = e.target.result || '';
                    // Удаляем UTF-8 BOM если есть
                    rawText = rawText.replace(/^\uFEFF/, '').trim();
                    let raw = JSON.parse(rawText);

                    // Распознаём массив, либо вложенные поля: lots, data, items, либо одиночный объект
                    if (!Array.isArray(raw)) {
                        raw = raw?.lots || raw?.data || raw?.items || (raw?.offer_id !== undefined ? [raw] : null);
                        if (!raw) throw new Error('Неизвестная структура JSON. Ожидается массив предложений Cardinal.');
                    }

                    if (!raw.length) {
                        log(`В файле "${file.name}" не обнаружено лотов.`, 'warn');
                        resolve([]);
                        return;
                    }

                    const converted = convertFormat(raw);
                    log(`✓ Успешно обработан: "${file.name}" — найдено ${converted.length} лот(ов).`, 'success');
                    processedFilesCount++;
                    resolve(converted);
                } catch (err) {
                    log(`Ошибка в "${file.name}": ${err.message}`, 'error');
                    resolve([]);
                }
            };

            reader.readAsText(file, 'utf-8');
        })));

        const newLots = results.flat();
        if (newLots.length > 0) {
            allConvertedLots = allConvertedLots.concat(newLots);
            log(`Завершено! Всего сконвертировано: ${allConvertedLots.length} предложений. Готово к импорту в Foxen.`, 'success');
            
            if (downloadBtn) downloadBtn.disabled = false;
            if (copyBtn) copyBtn.disabled = false;
            
            updateStats();
            playSound('success');
            triggerConfetti();
        } else {
            log('Подходящих данных для конвертации не найдено.', 'error');
            if (allConvertedLots.length === 0) {
                if (downloadBtn) downloadBtn.disabled = true;
                if (copyBtn) copyBtn.disabled = true;
            }
        }
    }

    // ── Cardinal → Foxen Conversion Logic ─────────────────────────────────────
    function convertFormat(cardinalLots) {
        const metaKeys = ['query', 'location'];
        return cardinalLots.map((lot, idx) => {
            const data = {};
            for (const key in lot) {
                if (!metaKeys.includes(key)) data[key] = lot[key];
            }

            // Сбрасываем offer_id, чтобы FunPay создавал новый лот
            if (data.offer_id !== undefined) data.offer_id = '0';

            // Авто-выдача и авто-ответ:
            // secrets = массив товаров авто-выдачи → сохраняем как secrets
            // answer = сообщение покупателю после оплаты → переносим в order_msg
            const hasSecrets = Array.isArray(data.secrets) && data.secrets.length > 0;
            const hasAnswer = typeof data.answer === 'string' && data.answer.trim() !== '';

            data.auto_delivery = hasSecrets ? 'on' : '';

            if (hasAnswer) {
                if (!data.order_msg) data.order_msg = data.answer;
                delete data.answer;
            }

            const title =
                data['fields[summary][ru]'] ||
                data['fields[summary][en]'] ||
                data.title ||
                `Лот #${idx + 1}`;

            return {
                sourceTitle: title,
                sourceCategory: data.nodeId ? String(data.nodeId) : '',
                data
            };
        });
    }

    // ── Download Action ───────────────────────────────────────────────────────
    downloadBtn?.addEventListener('click', () => {
        if (!allConvertedLots.length) {
            log('Нет данных для выгрузки.', 'error');
            return;
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `Foxen_Lots_Import_${dateStr}.json`;
        const blob = new Blob([JSON.stringify(allConvertedLots, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        log(`Файл "${fileName}" успешно выгружен! Теперь вы можете загрузить его в разделе «Экспорт / Импорт» в Foxen.`, 'success');
        playSound('success');
    });

    // ── Copy to Clipboard ─────────────────────────────────────────────────────
    copyBtn?.addEventListener('click', async () => {
        if (!allConvertedLots.length) return;
        try {
            const jsonText = JSON.stringify(allConvertedLots, null, 2);
            await navigator.clipboard.writeText(jsonText);
            
            const originalText = copyBtnText.textContent;
            copyBtnText.textContent = 'Скопировано!';
            copyBtn.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            playSound('success');

            setTimeout(() => {
                copyBtnText.textContent = originalText;
                copyBtn.style.borderColor = '';
            }, 2000);
        } catch (err) {
            log(`Не удалось скопировать: ${err.message}`, 'error');
        }
    });

    // ── Interactive Tilt & Spotlight (Desktop only, 100% Crisp Vector Text) ──
    if (tiltWrapper && mainCard) {
        let isHovered = false;

        tiltWrapper.addEventListener('mouseenter', () => {
            if (window.innerWidth <= 768 || (window.matchMedia && window.matchMedia('(hover: none)').matches)) return;
            isHovered = true;
            mainCard.style.transition = 'none';
        });

        tiltWrapper.addEventListener('mousemove', (e) => {
            if (!isHovered || window.innerWidth <= 768 || (window.matchMedia && window.matchMedia('(hover: none)').matches)) return;
            const rect = tiltWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Ultra-subtle tilt (max 1.2 deg) without translateZ prevents texture resampling and blurry text
            const rotateX = ((y - centerY) / centerY) * -1.2;
            const rotateY = ((x - centerX) / centerX) * 1.2;

            mainCard.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
            mainCard.style.setProperty('--mouse-x', `${(x / rect.width * 100).toFixed(1)}%`);
            mainCard.style.setProperty('--mouse-y', `${(y / rect.height * 100).toFixed(1)}%`);
        });

        tiltWrapper.addEventListener('mouseleave', () => {
            isHovered = false;
            mainCard.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            mainCard.style.transform = 'rotateX(0deg) rotateY(0deg)';
        });
    }

    // ── Ambient Constellation Canvas Background (Strictly Monochrome) ─────────
    const ambientCanvas = document.getElementById('ambient-canvas');
    if (ambientCanvas) {
        const ctx = ambientCanvas.getContext('2d');
        let width = ambientCanvas.width = window.innerWidth;
        let height = ambientCanvas.height = window.innerHeight;
        let animId = null;

        const particles = [];
        const PARTICLE_COUNT = Math.min(Math.floor((width * height) / 20000), 65);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 1.5 + 0.8,
                color: Math.random() > 0.5 ? 'rgba(255, 255, 255,' : 'rgba(212, 212, 216,'
            });
        }

        let mouseX = -1000;
        let mouseY = -1000;

        window.addEventListener('mousemove', (e) => {
            if (window.innerWidth <= 768) return;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateAmbient() {
            // Lightweight mobile guard: disable continuous canvas redraw on mobile screens
            if (window.innerWidth <= 768) {
                ctx.clearRect(0, 0, width, height);
                animId = null;
                return;
            }

            ctx.clearRect(0, 0, width, height);

            // Update & draw monochrome particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Mouse interaction
                const dxm = mouseX - p.x;
                const dym = mouseY - p.y;
                const distMouse = Math.sqrt(dxm * dxm + dym * dym);
                if (distMouse < 130) {
                    const angle = Math.atan2(dym, dxm);
                    const force = (130 - distMouse) / 130;
                    p.x -= Math.cos(angle) * force * 1.4;
                    p.y -= Math.sin(angle) * force * 1.4;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color + ' 0.5)';
                ctx.fill();

                // Connect nearby particles with subtle white lines
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 105) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        const alpha = (1 - dist / 105) * 0.12;
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = 0.65;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(animateAmbient);
        }

        window.addEventListener('resize', () => {
            width = ambientCanvas.width = window.innerWidth;
            height = ambientCanvas.height = window.innerHeight;
            if (window.innerWidth <= 768) {
                if (animId) {
                    cancelAnimationFrame(animId);
                    animId = null;
                }
                ctx.clearRect(0, 0, width, height);
            } else if (!animId) {
                animateAmbient();
            }
        });

        if (window.innerWidth > 768) {
            animateAmbient();
        }
    }

    // ── Confetti Particle Burst (Pure Monochrome) ─────────────────────────────
    function triggerConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = window.innerWidth;
        const height = canvas.height = window.innerHeight;

        const isMobile = window.innerWidth <= 768;
        const colors = ['#ffffff', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a'];
        const particles = [];
        const count = isMobile ? 28 : 80;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: width / 2,
                y: height * 0.36,
                vx: (Math.random() - 0.5) * (isMobile ? 10 : 15),
                vy: (Math.random() - 0.75) * (isMobile ? 12 : 16),
                size: Math.random() * 5 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                life: 1,
                decay: Math.random() * 0.016 + 0.012
            });
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            let active = false;

            for (const p of particles) {
                if (p.life <= 0) continue;
                active = true;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.42;
                p.vx *= 0.98;
                p.rotation += p.rotationSpeed;
                p.life -= p.decay;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }

            if (active) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, width, height);
            }
        }
        animate();
    }

    // Initialize state
    resetState();

})();
