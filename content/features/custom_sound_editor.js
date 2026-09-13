// content/features/custom_sound_editor.js
// Загрузка своей мелодии для уведомлений + свободная обрезка отрезка (перетаскиваемые
// границы по волне, свободный выбор длительности, прослушивание, сохранение).
// Сохранённый отрезок кодируется в WAV (data URL) и хранится в chrome.storage.local.foxenCustomSoundData.

(function () {
    'use strict';

    const STORE_DATA = 'foxenCustomSoundData'; // data:audio/wav;base64,...
    const STORE_META = 'foxenCustomSoundMeta'; // { length }

    let audioCtx = null;
    let decodedBuffer = null;   // AudioBuffer всего загруженного файла
    let selStart = 0;           // секунда начала выделения
    let selEnd = 5;             // секунда конца выделения
    let previewSource = null;   // текущий проигрываемый источник
    let playRAF = null;

    function $(id) { return document.getElementById(id); }

    function getCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }

    function fmtTime(sec) {
        sec = Math.max(0, sec);
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 10);
        return `${m}:${String(s).padStart(2, '0')}.${ms}`;
    }

    // ── waveform ────────────────────────────────────────────────────────────────
    function drawWave() {
        const canvas = $('fxnWaveCanvas');
        if (!canvas || !decodedBuffer) return;
        const wrap = $('fxnWaveWrap');
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth, h = wrap.clientHeight;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const isLight = document.querySelector('.fxn-popup.light-theme, .foxen-popup.light-theme, .fxn-popup .window.light-theme, .foxen-popup .window.light-theme');
        const data = decodedBuffer.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / w));
        const mid = h / 2;

        ctx.strokeStyle = isLight ? 'rgba(39, 39, 42, 0.75)' : 'rgba(161, 161, 170, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
            let min = 1, max = -1;
            for (let j = 0; j < step; j++) {
                const v = data[x * step + j] || 0;
                if (v < min) min = v;
                if (v > max) max = v;
            }
            ctx.moveTo(x + 0.5, mid + min * mid * 0.9);
            ctx.lineTo(x + 0.5, mid + max * mid * 0.9);
        }
        ctx.stroke();
    }

    function updateSelectionUI() {
        const wrap = $('fxnWaveWrap');
        const sel = $('fxnWaveSel');
        const hL = $('fxnWaveSelHandleL');
        const hR = $('fxnWaveSelHandleR');
        const rangeEl = $('fxnCustomSoundRange');
        if (!wrap || !sel || !decodedBuffer) return;

        const dur = decodedBuffer.duration;
        selStart = Math.max(0, Math.min(selStart, dur - 0.2));
        selEnd = Math.max(selStart + 0.2, Math.min(selEnd, dur));
        const clip = selEnd - selStart;

        const w = wrap.clientWidth;
        const left = (selStart / dur) * w;
        const right = (selEnd / dur) * w;
        const width = Math.max(2, right - left);

        sel.style.left = left + 'px';
        sel.style.width = width + 'px';
        if (hL) hL.style.left = left + 'px';
        if (hR) hR.style.left = right + 'px';

        if (rangeEl) {
            rangeEl.textContent = `${fmtTime(selStart)} - ${fmtTime(selEnd)} (${clip.toFixed(1)} сек)`;
        }
    }

    // ── drag selection ──────────────────────────────────────────────────────────
    function bindDrag() {
        const wrap = $('fxnWaveWrap');
        const sel = $('fxnWaveSel');
        const hL = $('fxnWaveSelHandleL');
        const hR = $('fxnWaveSelHandleR');
        if (!wrap || wrap.dataset.dragBound) return;
        wrap.dataset.dragBound = '1';

        let dragMode = null; // 'left' | 'right' | 'move'
        let dragStartPosSec = 0;
        let origSelStart = 0;
        let origSelEnd = 0;

        const posToSec = (clientX) => {
            const rect = wrap.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            return (x / rect.width) * (decodedBuffer ? decodedBuffer.duration : 1);
        };

        const onStart = (e, mode) => {
            if (!decodedBuffer) return;
            e.preventDefault();
            e.stopPropagation();
            dragMode = mode;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            dragStartPosSec = posToSec(clientX);
            origSelStart = selStart;
            origSelEnd = selEnd;
            document.body.style.userSelect = 'none';
        };

        if (hL) {
            hL.addEventListener('mousedown', (e) => onStart(e, 'left'));
            hL.addEventListener('touchstart', (e) => onStart(e, 'left'), { passive: false });
        }
        if (hR) {
            hR.addEventListener('mousedown', (e) => onStart(e, 'right'));
            hR.addEventListener('touchstart', (e) => onStart(e, 'right'), { passive: false });
        }
        if (sel) {
            sel.addEventListener('mousedown', (e) => onStart(e, 'move'));
            sel.addEventListener('touchstart', (e) => onStart(e, 'move'), { passive: false });
        }

        // Клик по фону таймлайна
        wrap.addEventListener('mousedown', (e) => {
            if (e.target === hL || e.target === hR || e.target === sel) return;
            if (!decodedBuffer) return;
            e.preventDefault();
            const clientX = e.clientX;
            const clickSec = posToSec(clientX);
            const distL = Math.abs(clickSec - selStart);
            const distR = Math.abs(clickSec - selEnd);

            if (distL < 0.2) {
                onStart(e, 'left');
            } else if (distR < 0.2) {
                onStart(e, 'right');
            } else {
                // Центрируем выделение по точке клика
                const len = selEnd - selStart;
                let newStart = clickSec - len / 2;
                newStart = Math.max(0, Math.min(newStart, decodedBuffer.duration - len));
                selStart = newStart;
                selEnd = newStart + len;
                updateSelectionUI();
                onStart(e, 'move');
            }
        });

        const onMove = (e) => {
            if (!dragMode || !decodedBuffer) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const currentSec = posToSec(clientX);
            const dur = decodedBuffer.duration;

            if (dragMode === 'left') {
                selStart = Math.max(0, Math.min(currentSec, selEnd - 0.2));
            } else if (dragMode === 'right') {
                selEnd = Math.min(dur, Math.max(currentSec, selStart + 0.2));
            } else if (dragMode === 'move') {
                const len = origSelEnd - origSelStart;
                const delta = currentSec - dragStartPosSec;
                let newStart = origSelStart + delta;
                newStart = Math.max(0, Math.min(newStart, dur - len));
                selStart = newStart;
                selEnd = newStart + len;
            }
            updateSelectionUI();
        };

        const onEnd = () => {
            if (dragMode) {
                dragMode = null;
                document.body.style.userSelect = '';
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    }

    // ── preview selected clip ─────────────────────────────────────────────────────
    function stopPreview() {
        if (previewSource) { try { previewSource.stop(); } catch (_) {} previewSource = null; }
        if (playRAF) { cancelAnimationFrame(playRAF); playRAF = null; }
        const ph = $('fxnWavePlayhead');
        if (ph) ph.style.display = 'none';
    }

    async function previewSelection() {
        if (!decodedBuffer) return;
        stopPreview();
        const ctx = getCtx();
        if (ctx.state === 'suspended') await ctx.resume();

        const clip = Math.max(0.1, selEnd - selStart);
        const src = ctx.createBufferSource();
        src.buffer = decodedBuffer;

        const gain = ctx.createGain();
        const { notificationVolume } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('notificationVolume');
        gain.gain.value = (typeof notificationVolume === 'number') ? Math.max(0, Math.min(1, notificationVolume)) : 1;

        src.connect(gain).connect(ctx.destination);
        previewSource = src;
        src.start(0, selStart, clip);

        // playhead animation
        const wrap = $('fxnWaveWrap');
        const ph = $('fxnWavePlayhead');
        const startedAt = ctx.currentTime;
        if (ph && wrap) {
            ph.style.display = 'block';
            const dur = decodedBuffer.duration;
            const tick = () => {
                const elapsed = ctx.currentTime - startedAt;
                if (elapsed >= clip) { stopPreview(); return; }
                const sec = selStart + elapsed;
                ph.style.left = ((sec / dur) * wrap.clientWidth) + 'px';
                playRAF = requestAnimationFrame(tick);
            };
            playRAF = requestAnimationFrame(tick);
        }
        src.onended = () => stopPreview();
    }

    // ── encode selected clip to WAV ───────────────────────────────────────────────
    function sliceToWav() {
        const dur = decodedBuffer.duration;
        const clip = Math.max(0.1, selEnd - selStart);
        const rate = decodedBuffer.sampleRate;
        const startSample = Math.floor(selStart * rate);
        const clipSamples = Math.floor(clip * rate);
        const channels = Math.min(2, decodedBuffer.numberOfChannels);

        // собираем PCM 16-bit
        const chData = [];
        for (let c = 0; c < channels; c++) chData.push(decodedBuffer.getChannelData(c));

        const numSamples = clipSamples;
        const bytesPerSample = 2;
        const blockAlign = channels * bytesPerSample;
        const dataSize = numSamples * blockAlign;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);            // PCM
        view.setUint16(22, channels, true);
        view.setUint32(24, rate, true);
        view.setUint32(28, rate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            for (let c = 0; c < channels; c++) {
                let sample = chData[c][startSample + i] || 0;
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        // → base64 data URL
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return 'data:audio/wav;base64,' + btoa(binary);
    }

    // ── file load ─────────────────────────────────────────────────────────────────
    async function handleFile(file) {
        const nameEl = $('fxnCustomSoundFileName');
        if (nameEl) nameEl.textContent = file.name;
        const editor = $('fxnCustomSoundEditor');

        try {
            const arrBuf = await file.arrayBuffer();
            const ctx = getCtx();
            decodedBuffer = await ctx.decodeAudioData(arrBuf.slice(0));
            selStart = 0;
            selEnd = Math.min(5, decodedBuffer.duration);
            if (editor) editor.style.display = 'block';
            drawWave();
            updateSelectionUI();
            bindDrag();
        } catch (e) {
            if (typeof showNotification === 'function') showNotification('Не удалось прочитать аудиофайл: ' + e.message, true);
            if (editor) editor.style.display = 'none';
        }
    }

    async function saveClip() {
        if (!decodedBuffer) return;
        const saveBtn = $('fxnCustomSoundSaveBtn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохраняю…'; }
        try {
            const dataUrl = sliceToWav();
            const clip = Math.max(0.1, selEnd - selStart);
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
                [STORE_DATA]: dataUrl,
                [STORE_META]: { length: clip },
                notificationSound: 'custom'
            });
            // отметить кнопку «Своя мелодия»
            const customChip = document.querySelector('.fxn-vireon-sound-chip[data-sound="custom"], .fxn-sound-chip[data-sound="custom"]');
            if (customChip) {
                document.querySelectorAll('.fxn-sound-chip, .fxn-vireon-sound-chip').forEach(c => c.classList.remove('active'));
                customChip.classList.add('active');
            }
            const soundInput = document.getElementById('notificationSound');
            if (soundInput) soundInput.value = 'custom';

            const savedEl = $('fxnCustomSoundSaved');
            const lenEl = $('fxnCustomSoundSavedLen');
            if (lenEl) lenEl.textContent = clip.toFixed(1);
            if (savedEl) savedEl.style.display = 'block';
            if (typeof showNotification === 'function') showNotification('Своя мелодия сохранена!');
        } catch (e) {
            if (typeof showNotification === 'function') showNotification('Ошибка сохранения: ' + e.message, true);
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить мелодию'; }
        }
    }

    // ── visibility toggle (chip = custom) ─────────────────────────────────────────
    async function syncCustomBlockVisibility() {
        const block = $('fxnCustomSoundBlock');
        if (!block) return;
        const activeChip = document.querySelector('.fxn-vireon-sound-chip.active, .fxn-sound-chip.active');
        let isCustom = false;
        if (activeChip) {
            isCustom = (activeChip.dataset.sound === 'custom');
        } else {
            const { notificationSound } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('notificationSound');
            isCustom = (notificationSound === 'custom');
        }
        block.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        block.classList.toggle('fxn-hidden', !isCustom);

        // показать «сохранено», если уже есть сохранённый клип
        const { [STORE_META]: meta, [STORE_DATA]: data } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([STORE_META, STORE_DATA]);
        const savedEl = $('fxnCustomSoundSaved');
        const lenEl = $('fxnCustomSoundSavedLen');
        const nameEl = $('fxnCustomSoundFileName');
        if (savedEl) savedEl.style.display = (isCustom && data) ? 'block' : 'none';
        if (lenEl && meta && meta.length) lenEl.textContent = Number(meta.length).toFixed(1);
        // Если клип уже сохранён ранее - показываем это, а не «Файл не выбран».
        if (nameEl && !decodedBuffer) {
            if (data) {
                const len = (meta && meta.length) ? Number(meta.length).toFixed(1) : '5.0';
                nameEl.textContent = `Установлена своя мелодия (${len} сек). Выберите файл, чтобы заменить.`;
                nameEl.style.color = 'var(--fxn-text-desc, #71717a)';
            } else {
                nameEl.textContent = 'Файл не выбран';
                nameEl.style.color = '';
            }
        }
    }

    // публичная инициализация - вызывается при построении попапа
    function initializeCustomSoundEditor() {
        const block = $('fxnCustomSoundBlock');
        if (!block || block.dataset.init) {
            syncCustomBlockVisibility();
            return;
        }
        block.dataset.init = '1';

        // реагируем на выбор чипов/кнопок звука
        document.querySelectorAll('.fxn-vireon-sound-chip, .fxn-sound-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                setTimeout(syncCustomBlockVisibility, 0);
            });
        });

        const uploadBtn = $('fxnCustomSoundUploadBtn');
        const input = $('fxnCustomSoundInput');
        uploadBtn && uploadBtn.addEventListener('click', () => input && input.click());
        input && input.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) handleFile(f);
        });

        $('fxnCustomSoundPreviewBtn') && $('fxnCustomSoundPreviewBtn').addEventListener('click', previewSelection);
        $('fxnCustomSoundSaveBtn') && $('fxnCustomSoundSaveBtn').addEventListener('click', saveClip);

        window.addEventListener('resize', () => { if (decodedBuffer) { drawWave(); updateSelectionUI(); } });

        syncCustomBlockVisibility();
    }

    if (typeof window !== 'undefined') {
        window.initializeCustomSoundEditor = initializeCustomSoundEditor;
    }
})();
