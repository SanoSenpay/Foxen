// content/features/bulk_lot_editor.js - Foxen
// Массовое редактирование: название, описание, сообщение покупателю, цена, остаток (шт)
// Двухстрочный карточный интерфейс списка лотов для максимального удобства чтения длинных названий

function initBulkLotEditor() {
    const page = document.querySelector('.foxen-page-content[data-page="lot_io"]');
    if (!page || page.dataset.bulkEditorInit) return;
    page.dataset.bulkEditorInit = 'true';

    const btn = document.getElementById('fp-bulk-edit-btn');
    if (!btn) return;

    btn.addEventListener('click', openBulkEditor);

    // Кнопка «Открыть все заметки»
    const notesBtn = document.getElementById('fp-open-notes-btn');
    if (notesBtn) notesBtn.addEventListener('click', () => {
        if (window.FPTNotes) window.FPTNotes.openViewer();
        else showNotification('Модуль заметок не загрузился', true);
    });
}

function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(192, 38, 211, ${alpha})`;
    let c = String(hex).trim();
    if (c.startsWith('var(')) return c;
    if (c.startsWith('rgb')) {
        return c.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    if (c.startsWith('#')) {
        c = c.slice(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        if (!isNaN(num)) {
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return `rgba(192, 38, 211, ${alpha})`;
}

async function getUserAccentColor() {
    let accent = null;
    try {
        if (window.__fptUserAccent) {
            accent = window.__fptUserAccent;
        } else if (window._foxenThemeSettings && (window._foxenThemeSettings.bgColor2 || window._foxenThemeSettings.bgColor1)) {
            accent = window._foxenThemeSettings.bgColor2 || window._foxenThemeSettings.bgColor1;
        } else {
            const docAccent = getComputedStyle(document.documentElement).getPropertyValue('--fxn-accent').trim();
            if (docAccent && docAccent !== '#c026d3' && docAccent !== '#C026D3') {
                accent = docAccent;
            }
        }

        if (!accent) {
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
            const data = await new Promise(r => storage.get(['foxenAccentColor', 'foxenHeaderButtons', 'foxenTheme', 'themeSettings'], r));
            accent = data?.foxenAccentColor ||
                     data?.foxenHeaderButtons?.color ||
                     data?.foxenTheme?.bgColor2 ||
                     data?.foxenTheme?.bgColor1 ||
                     data?.themeSettings?.bgColor2 ||
                     data?.themeSettings?.bgColor1;
        }
    } catch (_) {}

    if (!accent || accent === 'default') {
        accent = '#c026d3';
    }
    return accent;
}

function injectBulkEditorStyles(accentColor = '#c026d3') {
    let style = document.getElementById('fp-bulk-editor-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'fp-bulk-editor-styles';
        document.head.appendChild(style);
    }

    const accent = accentColor || '#c026d3';
    const accentSoft = hexToRgba(accent, 0.16);
    const accentBorder = hexToRgba(accent, 0.38);
    const accentGlow = hexToRgba(accent, 0.28);

    style.textContent = `
        #fp-bulk-editor-overlay {
            --fxn-accent: ${accent} !important;
            --fxn-accent-soft: ${accentSoft} !important;
            --fxn-accent-border: ${accentBorder} !important;
            --fxn-accent-glow: ${accentGlow} !important;

            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            background: rgba(8, 9, 13, 0.78) !important;
            backdrop-filter: blur(8px) !important;
            z-index: 10050 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            color: #e2e8f0 !important;
            animation: fpBulkFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        @keyframes fpBulkFadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
        }

        .fp-bulk-modal-container {
            background: #141518 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 18px !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.15) !important;
            width: 94% !important;
            max-width: 820px !important;
            max-height: 90vh !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
        }

        .fp-bulk-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 16px 22px !important;
            background: #18191e !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            flex-shrink: 0 !important;
        }

        .fp-bulk-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
        }

        .fp-bulk-header-icon {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
            background: var(--fxn-accent-soft, ${accentSoft}) !important;
            border: 1px solid var(--fxn-accent-border, ${accentBorder}) !important;
            color: var(--fxn-accent, ${accent}) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 14px var(--fxn-accent-soft, ${accentSoft}) !important;
            flex-shrink: 0 !important;
        }

        .fp-bulk-header-title {
            margin: 0 !important;
            font-size: 16.5px !important;
            font-weight: 700 !important;
            color: #ffffff !important;
            letter-spacing: -0.2px !important;
            line-height: 1.2 !important;
        }

        .fp-bulk-header-sub {
            font-size: 12px !important;
            color: #94a3b8 !important;
            margin-top: 2px !important;
        }

        .fp-bulk-close-btn {
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #94a3b8 !important;
            font-size: 18px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.18s ease !important;
            line-height: 1 !important;
            padding: 0 !important;
        }

        .fp-bulk-close-btn:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: var(--fxn-accent-border, ${accentBorder}) !important;
            color: #ffffff !important;
            transform: scale(1.05) !important;
        }

        .fp-bulk-body {
            padding: 20px 22px !important;
            overflow-y: auto !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
            background: #141518 !important;
        }

        .fp-bulk-body::-webkit-scrollbar { width: 6px !important; }
        .fp-bulk-body::-webkit-scrollbar-track { background: transparent !important; }
        .fp-bulk-body::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12) !important;
            border-radius: 4px !important;
        }
        .fp-bulk-body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25) !important; }

        .fp-bulk-info-banner {
            display: flex !important;
            align-items: flex-start !important;
            gap: 10px !important;
            padding: 12px 14px !important;
            background: var(--fxn-accent-soft, ${accentSoft}) !important;
            border: 1px solid var(--fxn-accent-border, ${accentBorder}) !important;
            border-radius: 12px !important;
            font-size: 12.5px !important;
            color: #cbd5e1 !important;
            line-height: 1.45 !important;
        }

        .fp-bulk-info-banner code {
            background: var(--fxn-accent-soft, ${accentSoft}) !important;
            color: #ffffff !important;
            padding: 2px 6px !important;
            border-radius: 5px !important;
            font-family: monospace !important;
            font-size: 11.5px !important;
            border: 1px solid var(--fxn-accent-border, ${accentBorder}) !important;
        }

        .fp-bulk-card {
            background: #191a1f !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 14px !important;
            padding: 16px !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2) !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }

        .fp-bulk-card:hover {
            border-color: var(--fxn-accent-border, ${accentBorder}) !important;
        }

        .fp-bulk-card-header {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
            padding-bottom: 8px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        .fp-bulk-card-icon {
            color: var(--fxn-accent, ${accent}) !important;
            display: flex !important;
            align-items: center !important;
        }

        .fp-bulk-card-title {
            margin: 0 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            color: #f1f5f9 !important;
            letter-spacing: 0.5px !important;
            text-transform: uppercase !important;
        }

        .fp-bulk-field {
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
        }

        .fp-bulk-label {
            font-size: 11.5px !important;
            font-weight: 600 !important;
            color: #94a3b8 !important;
        }

        .fp-bulk-input, .fp-bulk-select, .fp-bulk-textarea {
            width: 100% !important;
            background: #0e0f14 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            color: #f1f5f9 !important;
            font-size: 13px !important;
            font-family: inherit !important;
            box-sizing: border-box !important;
            transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
        }

        .fp-bulk-input:hover, .fp-bulk-select:hover, .fp-bulk-textarea:hover {
            border-color: rgba(255, 255, 255, 0.18) !important;
        }

        .fp-bulk-input:focus, .fp-bulk-select:focus, .fp-bulk-textarea:focus {
            outline: none !important;
            border-color: var(--fxn-accent-border, ${accentBorder}) !important;
            box-shadow: 0 0 10px var(--fxn-accent-glow, ${accentGlow}) !important;
        }

        .fp-bulk-input:disabled, .fp-bulk-select:disabled {
            opacity: 0.4 !important;
            cursor: not-allowed !important;
            border-color: rgba(255, 255, 255, 0.05) !important;
        }

        .fp-bulk-chip-group {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            align-items: center !important;
        }

        .fp-bulk-chip {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 5px 10px !important;
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.07) !important;
            border-radius: 7px !important;
            font-size: 12px !important;
            color: #cbd5e1 !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: all 0.15s ease !important;
        }

        .fp-bulk-chip:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: var(--fxn-accent-border, ${accentBorder}) !important;
            color: #ffffff !important;
        }

        .fp-bulk-chip input[type="checkbox"] { margin: 0 !important; }

        #fp-bulk-editor-overlay input[type="checkbox"] {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            width: 17px !important;
            height: 17px !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
            border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 5px !important;
            background: #0e0f14 !important;
            cursor: pointer !important;
            position: relative !important;
            transition: background 0.15s ease, border-color 0.15s ease !important;
            vertical-align: middle !important;
        }

        #fp-bulk-editor-overlay input[type="checkbox"]:hover {
            border-color: var(--fxn-accent, ${accent}) !important;
        }

        #fp-bulk-editor-overlay input[type="checkbox"]:checked {
            background: var(--fxn-accent, ${accent}) !important;
            border-color: var(--fxn-accent, ${accent}) !important;
        }

        #fp-bulk-editor-overlay input[type="checkbox"]:checked::after {
            content: '' !important;
            position: absolute !important;
            left: 5px !important;
            top: 2px !important;
            width: 4px !important;
            height: 8px !important;
            border: solid #ffffff !important;
            border-width: 0 2px 2px 0 !important;
            transform: rotate(45deg) !important;
        }

        /* --- Lot list styling --- */
        .fp-bulk-lots-container {
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 12px !important;
            background: #0b0c10 !important;
            max-height: 250px !important;
            overflow-y: auto !important;
            padding: 8px !important;
        }

        .fp-bulk-lots-container::-webkit-scrollbar { width: 6px !important; }
        .fp-bulk-lots-container::-webkit-scrollbar-track { background: transparent !important; }
        .fp-bulk-lots-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.14) !important;
            border-radius: 4px !important;
        }
        .fp-bulk-lots-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25) !important;
        }

        .fp-bulk-lot-row {
            display: flex !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 10px 14px !important;
            margin-bottom: 6px !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-radius: 10px !important;
            background: #121318 !important;
            cursor: pointer !important;
            transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
            user-select: none !important;
        }

        .fp-bulk-lot-row:last-child { margin-bottom: 0 !important; }

        .fp-bulk-lot-row:hover {
            background: #181920 !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            transform: translateX(2px) !important;
        }

        .fp-bulk-lot-row.is-checked {
            background: var(--fxn-accent-soft, ${accentSoft}) !important;
            border-color: var(--fxn-accent-border, ${accentBorder}) !important;
            border-left: 3px solid var(--fxn-accent, ${accent}) !important;
        }

        .fp-bulk-lot-info {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
        }

        .fp-bulk-lot-title-text {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #f1f5f9 !important;
            line-height: 1.35 !important;
            word-break: break-word !important;
        }

        .fp-bulk-lot-meta {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
        }

        .fp-bulk-lot-id {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            color: #64748b !important;
            background: rgba(0, 0, 0, 0.4) !important;
            padding: 2px 7px !important;
            border-radius: 5px !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        .fp-bulk-category-tag {
            font-size: 11px !important;
            color: #94a3b8 !important;
            background: rgba(255, 255, 255, 0.05) !important;
            padding: 2px 8px !important;
            border-radius: 5px !important;
            border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }

        .fp-bulk-progress-box {
            background: rgba(0, 0, 0, 0.3) !important;
            border: 1px solid rgba(255, 255, 255, 0.07) !important;
            border-radius: 10px !important;
            padding: 12px 14px !important;
        }

        .fp-bulk-progress-bar-bg {
            height: 6px !important;
            background: rgba(255, 255, 255, 0.08) !important;
            border-radius: 3px !important;
            overflow: hidden !important;
        }

        .fp-bulk-progress-bar-fill {
            height: 100% !important;
            background: var(--fxn-accent, ${accent}) !important;
            width: 0% !important;
            transition: width 0.25s ease !important;
            border-radius: 3px !important;
        }

        .fp-bulk-log-box {
            font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
            font-size: 11.5px !important;
            color: #94a3b8 !important;
            margin-top: 8px !important;
            max-height: 95px !important;
            overflow-y: auto !important;
            line-height: 1.5 !important;
        }

        .fp-bulk-footer {
            padding: 16px 22px !important;
            display: flex !important;
            gap: 10px !important;
            align-items: center !important;
            background: #18191e !important;
            border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
            flex-shrink: 0 !important;
        }

        #fp-bulk-editor-overlay #fp-bulk-apply-btn,
        .fp-bulk-btn-primary {
            flex: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            background: var(--fxn-accent, ${accent}) !important;
            background-color: var(--fxn-accent, ${accent}) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 10px !important;
            padding: 10px 18px !important;
            font-size: 13.5px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.18s ease !important;
            box-shadow: 0 4px 14px var(--fxn-accent-glow, ${accentGlow}) !important;
        }

        #fp-bulk-editor-overlay #fp-bulk-apply-btn:hover,
        .fp-bulk-btn-primary:hover {
            filter: brightness(1.12) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 18px var(--fxn-accent-glow, ${accentGlow}) !important;
        }

        #fp-bulk-editor-overlay #fp-bulk-apply-btn:active,
        .fp-bulk-btn-primary:active { transform: translateY(0) !important; }
        #fp-bulk-editor-overlay #fp-bulk-apply-btn:disabled,
        .fp-bulk-btn-primary:disabled { opacity: 0.6 !important; cursor: not-allowed !important; transform: none !important; }

        .fp-bulk-btn-secondary {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            background: rgba(34, 197, 94, 0.12) !important;
            color: #4ade80 !important;
            border: 1px solid rgba(34, 197, 94, 0.25) !important;
            border-radius: 10px !important;
            padding: 10px 16px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.18s ease !important;
        }

        .fp-bulk-btn-secondary:hover {
            background: rgba(34, 197, 94, 0.22) !important;
            border-color: rgba(34, 197, 94, 0.4) !important;
            color: #86efac !important;
        }
        .fp-bulk-btn-secondary:disabled { opacity: 0.6 !important; cursor: not-allowed !important; }

        .fp-bulk-btn-ghost {
            background: rgba(255, 255, 255, 0.05) !important;
            color: #cbd5e1 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 10px !important;
            padding: 10px 16px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.18s ease !important;
        }

        .fp-bulk-btn-ghost:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
        }
    `;
}

async function openBulkEditor() {
    const existing = document.getElementById('fp-bulk-editor-overlay');
    if (existing) { existing.remove(); return; }

    // Refresh Theme Variables if engine is available
    if (typeof fxnApplyThemeVars === 'function') {
        try { fxnApplyThemeVars(); } catch (_) {}
    }

    // Fetch the user's custom accent color from storage / theme settings
    const userAccentColor = await getUserAccentColor();
    injectBulkEditorStyles(userAccentColor);

    // Show loading
    showNotification('Загружаем список лотов...');

    let lots = [];
    try {
        const appData = JSON.parse(document.body.dataset.appData || '{}');
        const d = Array.isArray(appData) ? appData[0] : appData;
        const userId = d.userId;
        if (!userId) throw new Error('Нет userId');

        lots = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'getUserLotsList', userId }, (res) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(res || []);
            });
        });
    } catch (e) {
        showNotification(`Ошибка: ${e.message}`, true);
        return;
    }

    if (!lots.length) {
        showNotification('Лоты не найдены', true);
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'fp-bulk-editor-overlay';

    overlay.innerHTML = `
        <div class="fp-bulk-modal-container">
            <!-- Header -->
            <div class="fp-bulk-header">
                <div class="fp-bulk-header-left">
                    <div class="fp-bulk-header-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="fp-bulk-header-title">Массовое редактирование лотов</h3>
                        <div class="fp-bulk-header-sub">Пакетное изменение заголовка, описания, цен и остатков товара</div>
                    </div>
                </div>
                <button class="fp-bulk-close-btn foxen-modal-close" title="Закрыть (Esc)">&times;</button>
            </div>

            <!-- Body -->
            <div class="fp-bulk-body">
                <!-- Info Banner -->
                <div class="fp-bulk-info-banner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fxn-accent, ${userAccentColor})" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <div>
                        Изменяются только выбранные и заполненные поля. Шаблонные переменные: <code>{current}</code> — текущее значение поля, <code>{lotname}</code> — название лота.
                    </div>
                </div>

                <!-- Section 1: Main Text Fields -->
                <div class="fp-bulk-card">
                    <div class="fp-bulk-card-header">
                        <span class="fp-bulk-card-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </span>
                        <h4 class="fp-bulk-card-title">Основные текстовые поля</h4>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div class="fp-bulk-field">
                            <label class="fp-bulk-label" for="fp-bulk-new-name">Новое название (пусто — не менять)</label>
                            <input type="text" id="fp-bulk-new-name" class="fp-bulk-input" placeholder="{current}">
                        </div>
                        <div class="fp-bulk-field">
                            <label class="fp-bulk-label" for="fp-bulk-new-msg">Сообщение покупателю (пусто — не менять)</label>
                            <input type="text" id="fp-bulk-new-msg" class="fp-bulk-input" placeholder="Не изменять">
                        </div>
                    </div>

                    <div class="fp-bulk-field">
                        <label class="fp-bulk-label" for="fp-bulk-new-desc">Новое описание (пусто — не менять)</label>
                        <textarea id="fp-bulk-new-desc" class="fp-bulk-textarea" placeholder="Не изменять" rows="2" style="resize:vertical;"></textarea>
                    </div>
                </div>

                <!-- Section 2: Find & Replace -->
                <div class="fp-bulk-card">
                    <div class="fp-bulk-card-header">
                        <span class="fp-bulk-card-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><path d="M11 8v6M8 11h6"></path></svg>
                        </span>
                        <h4 class="fp-bulk-card-title">Точечный поиск и замена текста</h4>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                        <input type="text" id="fp-bulk-find" class="fp-bulk-input" placeholder="Найти текст…">
                        <input type="text" id="fp-bulk-replace" class="fp-bulk-input" placeholder="Заменить на…">
                    </div>

                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div class="fp-bulk-chip-group">
                            <span style="font-size:11.5px;color:#64748b;font-weight:600;">Применять к:</span>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-name" checked> Названию</label>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-desc" checked> Описанию</label>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-msg"> Сообщению</label>
                        </div>
                        <div class="fp-bulk-chip-group">
                            <span style="font-size:11.5px;color:#64748b;font-weight:600;">Параметры:</span>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-regex"> RegEx</label>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-case"> Учитывать регистр</label>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-word"> Целые слова</label>
                            <label class="fp-bulk-chip"><input type="checkbox" id="fp-bulk-fr-all" checked> Все совпадения</label>
                        </div>
                        <div style="font-size:11px;color:#64748b;">При включенном RegEx в поле «Заменить на» можно использовать переменные <code>$1</code>, <code>$2</code> и т.д.</div>
                    </div>
                </div>

                <!-- Section 3: Price & Amount Cards Grid -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
                    <!-- Price Card -->
                    <div class="fp-bulk-card">
                        <div class="fp-bulk-card-header">
                            <span class="fp-bulk-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </span>
                            <h4 class="fp-bulk-card-title">Изменение цены</h4>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                            <select id="fp-bulk-price-mode" class="fp-bulk-select" style="flex:1;">
                                <option value="none">Не менять</option>
                                <option value="set">Установить =</option>
                                <option value="add">Прибавить +</option>
                                <option value="sub">Вычесть −</option>
                                <option value="pct_up">Поднять на %</option>
                                <option value="pct_down">Снизить на %</option>
                            </select>
                            <input type="number" id="fp-bulk-price-value" class="fp-bulk-input" step="0.01" placeholder="0" disabled style="flex:1;min-width:80px;">
                            <span id="fp-bulk-price-unit" style="font-size:12px;color:#94a3b8;min-width:14px;font-weight:600;"></span>
                        </div>
                        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                            <label class="fp-bulk-chip" style="padding:4px 8px;"><input type="checkbox" id="fp-bulk-price-round"> Округлять до целого</label>
                            <label style="font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
                                <span>Не ниже</span>
                                <input type="number" id="fp-bulk-price-min" class="fp-bulk-input" step="0.01" placeholder="0" style="width:70px;padding:4px 8px;font-size:12px;">
                                <span>₽</span>
                            </label>
                        </div>
                    </div>

                    <!-- Amount Card -->
                    <div class="fp-bulk-card">
                        <div class="fp-bulk-card-header">
                            <span class="fp-bulk-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            </span>
                            <h4 class="fp-bulk-card-title">Изменение остатка (шт.)</h4>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                            <select id="fp-bulk-amount-mode" class="fp-bulk-select" style="flex:1;">
                                <option value="none">Не менять</option>
                                <option value="set">Установить =</option>
                                <option value="add">Прибавить +</option>
                                <option value="sub">Вычесть −</option>
                                <option value="pct_up">Поднять на %</option>
                                <option value="pct_down">Снизить на %</option>
                            </select>
                            <input type="number" id="fp-bulk-amount-value" class="fp-bulk-input" step="1" min="0" placeholder="0" disabled style="flex:1;min-width:80px;">
                            <span id="fp-bulk-amount-unit" style="font-size:12px;color:#94a3b8;min-width:14px;font-weight:600;"></span>
                        </div>
                        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                            <label style="font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
                                <span>Не ниже</span>
                                <input type="number" id="fp-bulk-amount-min" class="fp-bulk-input" step="1" min="0" placeholder="0" style="width:70px;padding:4px 8px;font-size:12px;">
                                <span>шт.</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Lot Selection Table -->
                <div class="fp-bulk-card">
                    <div class="fp-bulk-card-header" style="border-bottom:none;margin-bottom:0;padding-bottom:0;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="fp-bulk-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            </span>
                            <h4 class="fp-bulk-card-title">Лоты (<span id="fp-bulk-count">${lots.length}</span>) • Выбрано: <span id="fp-bulk-selected-count" style="color:var(--fxn-accent, ${userAccentColor});font-weight:700;">0</span></h4>
                        </div>

                        <div style="display:flex;gap:8px;align-items:center;">
                            <input type="text" id="fp-bulk-filter" class="fp-bulk-input" placeholder="🔍 Поиск по названию..." style="width:170px;padding:5px 10px;font-size:12px;">
                            <button id="fp-bulk-select-all" class="fp-bulk-btn-ghost" style="padding:5px 12px;font-size:12px;">Выбрать все</button>
                        </div>
                    </div>

                    <div id="fp-bulk-lots-list" class="fp-bulk-lots-container" style="margin-top:12px;">
                        ${lots.map((lot) => `
                            <label class="fp-bulk-lot-row" data-search-title="${(lot.title || '').toLowerCase().replace(/"/g,'&quot;')}">
                                <input type="checkbox" class="fp-bulk-lot-check" data-offer-id="${lot.id}" data-node-id="${lot.nodeId}">
                                <div class="fp-bulk-lot-info">
                                    <div class="fp-bulk-lot-title-text">${lot.title}</div>
                                    <div class="fp-bulk-lot-meta">
                                        <span class="fp-bulk-lot-id">#${lot.id}</span>
                                        <span class="fp-bulk-category-tag">${lot.categoryName}</span>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>

                    <div id="fp-bulk-progress" class="fp-bulk-progress-box" style="display:none;margin-top:14px;">
                        <div class="fp-bulk-progress-bar-bg">
                            <div id="fp-bulk-progress-bar" class="fp-bulk-progress-bar-fill"></div>
                        </div>
                        <div id="fp-bulk-progress-text" style="font-size:12.5px;color:#e2e8f0;margin-top:8px;text-align:center;font-weight:500;"></div>
                        <div id="fp-bulk-log" class="fp-bulk-log-box"></div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="fp-bulk-footer">
                <button id="fp-bulk-apply-btn" class="fp-bulk-btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span>Применить изменения</span>
                </button>
                <button id="fp-bulk-activate-btn" class="fp-bulk-btn-secondary" title="Активировать выбранные лоты">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Активировать</span>
                </button>
                <button class="fp-bulk-btn-ghost foxen-modal-close">Отмена</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listener for closing modal
    const closeOverlay = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') closeOverlay();
    };
    document.addEventListener('keydown', onKeyDown);

    overlay.querySelectorAll('.foxen-modal-close').forEach(b =>
        b.addEventListener('click', closeOverlay)
    );
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });

    const $ = (id) => document.getElementById(id);

    // Live "selected" counter & row active state update
    const updateSelectedCount = () => {
        const checks = overlay.querySelectorAll('.fp-bulk-lot-check');
        let count = 0;
        checks.forEach(cb => {
            const row = cb.closest('.fp-bulk-lot-row');
            if (cb.checked) {
                count++;
                if (row) row.classList.add('is-checked');
            } else {
                if (row) row.classList.remove('is-checked');
            }
        });
        $('fp-bulk-selected-count').textContent = count;
    };

    overlay.addEventListener('change', (e) => {
        if (e.target.classList.contains('fp-bulk-lot-check')) updateSelectedCount();
    });

    // Filter the visible lot rows
    $('fp-bulk-filter').addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        overlay.querySelectorAll('.fp-bulk-lot-row').forEach(row => {
            row.style.display = (!q || (row.dataset.searchTitle || '').includes(q)) ? '' : 'none';
        });
    });

    // Price mode enables/disables the value field and shows the unit
    const priceMode = $('fp-bulk-price-mode');
    const priceVal  = $('fp-bulk-price-value');
    const priceUnit = $('fp-bulk-price-unit');
    priceMode.addEventListener('change', () => {
        const m = priceMode.value;
        priceVal.disabled = (m === 'none');
        if (m === 'none') { priceVal.value = ''; priceUnit.textContent = ''; }
        else if (m === 'pct_up' || m === 'pct_down') priceUnit.textContent = '%';
        else priceUnit.textContent = '₽';
    });

    // Amount mode enables/disables the value field and shows the unit
    const amountMode = $('fp-bulk-amount-mode');
    const amountVal  = $('fp-bulk-amount-value');
    const amountUnit = $('fp-bulk-amount-unit');
    amountMode.addEventListener('change', () => {
        const m = amountMode.value;
        amountVal.disabled = (m === 'none');
        if (m === 'none') { amountVal.value = ''; amountUnit.textContent = ''; }
        else if (m === 'pct_up' || m === 'pct_down') amountUnit.textContent = '%';
        else amountUnit.textContent = 'шт.';
    });

    // Select all toggle (only toggles currently visible rows)
    let allSelected = false;
    $('fp-bulk-select-all').addEventListener('click', () => {
        allSelected = !allSelected;
        overlay.querySelectorAll('.fp-bulk-lot-row').forEach(row => {
            if (row.style.display === 'none') return;
            const cb = row.querySelector('.fp-bulk-lot-check');
            if (cb) cb.checked = allSelected;
        });
        $('fp-bulk-select-all').textContent = allSelected ? 'Снять все' : 'Выбрать все';
        updateSelectedCount();
    });

    const log = (msg, isErr = false) => {
        const el = $('fp-bulk-log');
        if (!el) return;
        const line = document.createElement('div');
        line.textContent = msg;
        if (isErr) line.style.color = '#f87171';
        else line.style.color = '#4ade80';
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    };

    // Apply
    $('fp-bulk-apply-btn').addEventListener('click', async () => {
        const selected = Array.from(overlay.querySelectorAll('.fp-bulk-lot-check:checked'));
        if (!selected.length) {
            showNotification('Выберите хотя бы один лот', true);
            return;
        }

        const newName = $('fp-bulk-new-name').value.trim();
        const newDesc = $('fp-bulk-new-desc').value.trim();
        const newMsg  = $('fp-bulk-new-msg').value.trim();

        const pMode  = priceMode.value;
        const pVal   = parseFloat(priceVal.value);
        const pRound = $('fp-bulk-price-round').checked;
        const pMin   = parseFloat($('fp-bulk-price-min').value);
        const priceWanted = pMode !== 'none';

        const aMode  = amountMode.value;
        const aVal   = parseFloat(amountVal.value);
        const aMin   = parseInt($('fp-bulk-amount-min').value, 10);
        const amountWanted = aMode !== 'none';

        // Find & replace settings
        const frFind    = $('fp-bulk-find').value;
        const frReplace = $('fp-bulk-replace').value;
        const frActive  = frFind.length > 0;
        const frFields  = {
            name: $('fp-bulk-fr-name').checked,
            desc: $('fp-bulk-fr-desc').checked,
            msg:  $('fp-bulk-fr-msg').checked,
        };
        const frRegex = $('fp-bulk-fr-regex').checked;
        const frCase  = $('fp-bulk-fr-case').checked;
        const frWord  = $('fp-bulk-fr-word').checked;
        const frAll   = $('fp-bulk-fr-all').checked;

        let frRe = null;
        if (frActive) {
            try {
                let pattern = frRegex ? frFind : frFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (frWord) pattern = `\\b${pattern}\\b`;
                let flags = frAll ? 'g' : '';
                if (!frCase) flags += 'i';
                frRe = new RegExp(pattern, flags);
            } catch (e) {
                showNotification('Ошибка в регулярном выражении: ' + e.message, true);
                return;
            }
        }

        if (priceWanted && (isNaN(pVal) || pVal < 0)) {
            showNotification('Укажите корректное значение цены', true);
            return;
        }
        if (amountWanted && (isNaN(aVal) || aVal < 0)) {
            showNotification('Укажите корректное значение количества', true);
            return;
        }
        if (!newName && !newDesc && !newMsg && !priceWanted && !amountWanted && !frActive) {
            showNotification('Укажите хотя бы одно изменение', true);
            return;
        }

        const applyFindReplace = (text) => {
            if (!frActive || !frRe || text == null) return text;
            return text.replace(frRe, frReplace);
        };

        const applyBtn = $('fp-bulk-apply-btn');
        applyBtn.disabled = true;
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fp-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
            <span>Применяем изменения...</span>
        `;
        $('fp-bulk-progress').style.display = 'block';
        $('fp-bulk-log').innerHTML = '';

        let ok = 0, fail = 0;
        const total = selected.length;
        let processed = 0;

        const setField = (data, base, value) => {
            if (`fields[${base}][ru]` in data) data[`fields[${base}][ru]`] = value;
            else if (`fields[${base}]` in data) data[`fields[${base}]`] = value;
            else data[`fields[${base}][ru]`] = value;
        };
        const getField = (data, base) =>
            data[`fields[${base}][ru]`] ?? data[`fields[${base}]`] ?? '';

        const applyTemplate = (tpl, current, lotName) =>
            tpl.replace(/{current}/gi, current || '').replace(/{lotname}/gi, lotName || '');

        for (const cb of selected) {
            const offerId = cb.dataset.offerId;
            const nodeId  = cb.dataset.nodeId;
            const lotLabel = cb.closest('.fp-bulk-lot-row')?.querySelector('.fp-bulk-lot-title-text')?.textContent || offerId;

            $('fp-bulk-progress-text').textContent = `Обрабатываем ${processed + 1}/${total}: ${lotLabel}`;

            try {
                const editData = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { action: 'getLotForExport', nodeId, offerId },
                        (res) => {
                            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                            else if (res?.success) resolve(res.data);
                            else reject(new Error(res?.error || 'Ошибка загрузки лота'));
                        }
                    );
                });
                if (!editData || typeof editData !== 'object') throw new Error('Нет данных лота');

                const formData = { ...editData, offer_id: offerId };
                const currentTitle = getField(editData, 'summary');

                if (frActive) {
                    if (frFields.name) setField(formData, 'summary',     applyFindReplace(getField(editData, 'summary')));
                    if (frFields.desc) setField(formData, 'desc',        applyFindReplace(getField(editData, 'desc')));
                    if (frFields.msg)  setField(formData, 'payment_msg', applyFindReplace(getField(editData, 'payment_msg')));
                }

                if (newName) setField(formData, 'summary', applyTemplate(newName, getField(formData, 'summary'), currentTitle));
                if (newDesc) setField(formData, 'desc', applyTemplate(newDesc, getField(formData, 'desc'), currentTitle));
                if (newMsg)  setField(formData, 'payment_msg', applyTemplate(newMsg, getField(formData, 'payment_msg'), currentTitle));

                if (priceWanted) {
                    const cur = parseFloat(editData.price);
                    if (isNaN(cur) && (pMode === 'add' || pMode === 'sub' || pMode === 'pct_up' || pMode === 'pct_down')) {
                        throw new Error('не удалось прочитать текущую цену');
                    }
                    let np;
                    switch (pMode) {
                        case 'set':      np = pVal; break;
                        case 'add':      np = cur + pVal; break;
                        case 'sub':      np = cur - pVal; break;
                        case 'pct_up':   np = cur * (1 + pVal / 100); break;
                        case 'pct_down': np = cur * (1 - pVal / 100); break;
                    }
                    np = Math.max(0, np);
                    if (!isNaN(pMin)) np = Math.max(pMin, np);
                    np = pRound ? Math.round(np) : Math.round(np * 100) / 100;
                    formData.price = String(np);
                }

                if (amountWanted) {
                    const curAmt = parseInt(editData.amount, 10);
                    if (isNaN(curAmt) && (aMode === 'add' || aMode === 'sub' || aMode === 'pct_up' || aMode === 'pct_down')) {
                        throw new Error('не удалось прочитать текущее количество');
                    }
                    let na;
                    const curValidAmt = isNaN(curAmt) ? 0 : curAmt;
                    switch (aMode) {
                        case 'set':      na = aVal; break;
                        case 'add':      na = curValidAmt + aVal; break;
                        case 'sub':      na = curValidAmt - aVal; break;
                        case 'pct_up':   na = curValidAmt * (1 + aVal / 100); break;
                        case 'pct_down': na = curValidAmt * (1 - aVal / 100); break;
                    }
                    na = Math.round(na);
                    na = Math.max(0, na);
                    if (!isNaN(aMin)) na = Math.max(aMin, na);
                    formData.amount = String(na);
                }

                const saveRes = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'saveSingleLot', nodeId, data: formData }, (res) => {
                        if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
                        else resolve(res || { success: false, error: 'нет ответа' });
                    });
                });

                if (saveRes && saveRes.success) {
                    ok++;
                    log(`✓ ${lotLabel}`);
                } else {
                    fail++;
                    log(`✗ ${lotLabel}: ${saveRes?.error || 'ошибка сохранения'}`, true);
                }
            } catch (e) {
                fail++;
                log(`✗ ${lotLabel}: ${e.message}`, true);
            }

            processed++;
            $('fp-bulk-progress-bar').style.width = `${(processed / total) * 100}%`;
            await new Promise(r => setTimeout(r, 1200));
        }

        $('fp-bulk-progress-bar').style.width = '100%';
        $('fp-bulk-progress-bar').style.background = fail ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #22c55e, #16a34a)';
        $('fp-bulk-progress-text').textContent = `Готово. Успешно: ${ok}, ошибок: ${fail}, всего: ${total}.`;
        showNotification(`Изменено: ${ok}/${total}${fail ? `, ошибок: ${fail}` : ''}`, fail > 0);

        applyBtn.disabled = false;
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            <span>Применить изменения</span>
        `;
    });

    // Mass activation for selected lots
    $('fp-bulk-activate-btn').addEventListener('click', async () => {
        const selected = Array.from(overlay.querySelectorAll('.fp-bulk-lot-check:checked'));
        if (!selected.length) {
            showNotification('Выберите хотя бы один лот для активации', true);
            return;
        }
        const actBtn = $('fp-bulk-activate-btn');
        const applyBtn = $('fp-bulk-apply-btn');
        actBtn.disabled = true; applyBtn.disabled = true;
        actBtn.textContent = 'Активируем...';
        $('fp-bulk-progress').style.display = 'block';
        $('fp-bulk-log').innerHTML = '';

        let ok = 0, fail = 0, processed = 0;
        const total = selected.length;

        for (const cb of selected) {
            const offerId = cb.dataset.offerId;
            const nodeId  = cb.dataset.nodeId;
            const lotLabel = cb.closest('.fp-bulk-lot-row')?.querySelector('.fp-bulk-lot-title-text')?.textContent || offerId;
            $('fp-bulk-progress-text').textContent = `Активируем ${processed + 1}/${total}: ${lotLabel}`;

            try {
                const editData = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: 'getLotForExport', nodeId, offerId }, (res) => {
                        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                        else if (res?.success) resolve(res.data);
                        else reject(new Error(res?.error || 'Ошибка загрузки лота'));
                    });
                });
                if (!editData || typeof editData !== 'object') throw new Error('Нет данных лота');

                const formData = { ...editData, offer_id: offerId, active: 'on' };

                const saveRes = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'saveSingleLot', nodeId, data: formData }, (res) => {
                        if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
                        else resolve(res || { success: false, error: 'нет ответа' });
                    });
                });

                if (saveRes && saveRes.success) { ok++; log(`✓ ${lotLabel} — активирован`); }
                else { fail++; log(`✗ ${lotLabel}: ${saveRes?.error || 'ошибка'}`); }
            } catch (e) {
                fail++; log(`✗ ${lotLabel}: ${e.message}`, true);
            }

            processed++;
            $('fp-bulk-progress-bar').style.width = `${(processed / total) * 100}%`;
            await new Promise(r => setTimeout(r, 1200));
        }

        $('fp-bulk-progress-bar').style.width = '100%';
        $('fp-bulk-progress-bar').style.background = fail ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #22c55e, #16a34a)';
        $('fp-bulk-progress-text').textContent = `Готово. Активировано: ${ok}, ошибок: ${fail}, всего: ${total}.`;
        showNotification(`Активировано: ${ok}/${total}${fail ? `, ошибок: ${fail}` : ''}`, fail > 0);

        actBtn.disabled = false; applyBtn.disabled = false;
        actBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Активировать</span>
        `;
    });
}
