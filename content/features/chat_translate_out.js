// content/features/chat_translate_out.js
// Foxen Outgoing Message Translation for FunPay chat
// Перевод исходящих сообщений с переключением между Google Translate и ИИ Foxen Premium

(function () {
    'use strict';

    const SUPPORTED_LANGS = [
        { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
        { code: 'ru', name: 'Русский', native: 'Русский', flag: '🇷🇺' },
        { code: 'es', name: 'Español', native: 'Español', flag: '🇪🇸' },
        { code: 'de', name: 'Deutsch', native: 'Deutsch', flag: '🇩🇪' },
        { code: 'zh', name: '中文', native: '中文', flag: '🇨🇳' },
        { code: 'tr', name: 'Türkçe', native: 'Türkçe', flag: '🇹🇷' },
        { code: 'fr', name: 'Français', native: 'Français', flag: '🇫🇷' },
        { code: 'it', name: 'Italiano', native: 'Italiano', flag: '🇮🇹' },
        { code: 'pl', name: 'Polski', native: 'Polski', flag: '🇵🇱' },
        { code: 'uk', name: 'Українська', native: 'Українська', flag: '🇺🇦' },
        { code: 'pt', name: 'Português', native: 'Português', flag: '🇧🇷' },
        { code: 'ja', name: '日本語', native: '日本語', flag: '🇯🇵' }
    ];

    function getLangFlagSvg(code) {
        const c = String(code || '').toLowerCase();
        switch (c) {
            case 'en':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#fff" d="m75 0 245 180L565 0h75v60L435 240l205 180v60h-75L320 300 75 480H0v-60l205-180L0 60V0h75z"/><path fill="#c8102e" d="m424 288 216 156v36l-265-192h49zm-208-96L0 36V0l265 192h-49zM640 36 424 192h49L640 4v32zM0 444l216-156h-49L0 476v-32z"/><path fill="#fff" d="M240 0h160v480H240zM0 160h640v160H0z"/><path fill="#c8102e" d="M267 0h106v480H267zM0 187h640v106H0z"/></svg>';
            case 'ru':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#0039a6" d="M0 160h640v320H0z"/><path fill="#d52b1e" d="M0 320h640v160H0z"/></svg>';
            case 'es':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#aa151b" d="M0 0h640v480H0z"/><path fill="#f1bf00" d="M0 120h640v240H0z"/></svg>';
            case 'de':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#ffce00" d="M0 320h640v160H0z"/><path d="M0 0h640v160H0z"/><path fill="#d00" d="M0 160h640v160H0z"/></svg>';
            case 'zh':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#de2910" d="M0 0h640v480H0z"/><polygon fill="#ffde00" points="160,40 180,100 240,100 190,135 210,195 160,160 110,195 130,135 80,100 140,100"/></svg>';
            case 'tr':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#e30a17" d="M0 0h640v480H0z"/><circle cx="260" cy="240" r="120" fill="#fff"/><circle cx="290" cy="240" r="96" fill="#e30a17"/><polygon fill="#fff" points="360,240 410,256 390,208 390,272 410,224"/></svg>';
            case 'fr':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#002654" d="M0 0h213.3v480H0z"/><path fill="#ce1126" d="M426.7 0H640v480H426.7z"/></svg>';
            case 'it':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#009246" d="M0 0h213.3v480H0z"/><path fill="#ce2b37" d="M426.7 0H640v480H426.7z"/></svg>';
            case 'pl':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#dc143c" d="M0 240h640v240H0z"/></svg>';
            case 'uk':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#ffd700" d="M0 240h640v240H0z"/><path fill="#0057b7" d="M0 0h640v240H0z"/></svg>';
            case 'pt':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#009739" d="M0 0h640v480H0z"/><path fill="#fedf01" d="M320 60 560 240 320 420 80 240z"/><circle cx="320" cy="240" r="90" fill="#012169"/></svg>';
            case 'ja':
                return '<svg class="fxn-flag-svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><circle cx="320" cy="240" r="144" fill="#bc002d"/></svg>';
            default:
                return '🌐';
        }
    }

    let currentTargetLang = 'en';
    let currentTranslateMode = 'google'; // 'google' или 'ai'
    let originalMessageText = null;
    let isTranslating = false;

    // Загрузка сохранённого языка и режима
    try {
        const savedLang = localStorage.getItem('foxen_chat_target_lang');
        if (savedLang && SUPPORTED_LANGS.some(l => l.code === savedLang)) {
            currentTargetLang = savedLang;
        }
        const savedMode = localStorage.getItem('foxen_chat_translate_mode');
        if (savedMode === 'ai' || savedMode === 'google') {
            currentTranslateMode = savedMode;
        }
    } catch (_) {}

    function getChatInput() {
        return document.querySelector('.chat-form-input .form-control, .chat-form textarea[name="content"]');
    }

    function getChatForm() {
        const inp = getChatInput();
        return inp ? (inp.closest('form') || inp.closest('.chat-form')) : null;
    }

    // Проверка статуса подписки Foxen Premium
    async function isFoxenPremiumUser() {
        try {
            if (typeof fxnGetCachedProfile === 'function') {
                const p = await fxnGetCachedProfile();
                if (p && p.SUBSCRIPTION && p.SUBSCRIPTION !== 'free') return true;
            }
            const st = await (typeof browser !== 'undefined' ? browser : chrome).storage?.local?.get(['foxenUserProfileCache', 'foxen_user_profile', 'foxen_is_premium', 'cached_profile']);
            if (st) {
                const prof = st.foxenUserProfileCache?.data || st.foxen_user_profile || st.cached_profile;
                if (prof && prof.SUBSCRIPTION && prof.SUBSCRIPTION !== 'free') return true;
                if (st.foxen_is_premium) return true;
            }
        } catch (_) {}
        return false;
    }

    // Определение языка собеседника из карточки параметров FunPay
    function detectChatTargetLanguage() {
        const detailItems = document.querySelectorAll('.chat-detail-list .param-item, .chat-detail .param-item');
        for (const it of detailItems) {
            const h = it.querySelector('h5');
            if (h && /язык собеседника|интерфейс/i.test(h.textContent)) {
                const val = (it.querySelector('div')?.textContent || '').toLowerCase().trim();
                if (val.includes('english') || val.includes('англ')) return 'en';
                if (val.includes('espanol') || val.includes('испан')) return 'es';
                if (val.includes('deutsch') || val.includes('немец')) return 'de';
                if (val.includes('francais') || val.includes('франц')) return 'fr';
                if (val.includes('turk') || val.includes('турец')) return 'tr';
                if (val.includes('китай') || val.includes('chin') || val.includes('zh')) return 'zh';
                if (val.includes('украин') || val.includes('ukrain')) return 'uk';
                if (val.includes('русск') || val.includes('russ')) return 'ru';
            }
        }

        try {
            const saved = localStorage.getItem('foxen_chat_target_lang');
            if (saved && SUPPORTED_LANGS.some(l => l.code === saved)) {
                return saved;
            }
        } catch (_) {}

        return 'en';
    }

    // Выполнение перевода через многоуровневый отказоустойчивый движок (обход 429 и CORS)
    async function executeTranslation(text, targetLang, mode) {
        if (!text || !text.trim()) return { text: '', isAi: false };
        const isAiRequested = (mode === 'ai');

        // 1. Приоритетный путь: через универсальный движок Foxen (фоновый прокси + кэш)
        if (typeof window.fxnTranslateText === 'function') {
            try {
                const res = await window.fxnTranslateText(text, targetLang, { useAi: isAiRequested });
                if (res && res.text) {
                    if (isAiRequested && !res.isAi) {
                        showToastMessage('ИИ-перевод недоступен, применён обычный перевод');
                    }
                    return { text: res.text, isAi: Boolean(res.isAi) };
                }
            } catch (err) {
                console.warn('[Foxen Translate] fxnTranslateText error, falling back to direct multi-tier:', err);
            }
        }

        // 2. Автономный локальный fallback (Clients5 -> DJ -> GTX -> MyMemory)
        const clean = text.trim();
        const tl = encodeURIComponent(targetLang);
        const q = encodeURIComponent(clean);

        // Tier 1: Google Clients5 (официальный эндпойнт Chrome-расширения, редкий 429)
        try {
            const r = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${tl}&q=${q}`);
            if (r.ok) {
                const j = await r.json();
                const tr = Array.isArray(j) ? (Array.isArray(j[0]) ? j[0][0] : j[0]) : '';
                if (typeof tr === 'string' && tr.trim()) return { text: tr.trim(), isAi: false };
            }
        } catch (_) {}

        // Tier 2: Google translate.google.com (dj=1 sentences)
        try {
            const r = await fetch(`https://translate.google.com/translate_a/single?client=at&dt=t&dj=1&sl=auto&tl=${tl}&q=${q}`);
            if (r.ok) {
                const j = await r.json();
                const tr = (j.sentences || []).map(s => s.trans || '').join('');
                if (tr.trim()) return { text: tr.trim(), isAi: false };
            }
        } catch (_) {}

        // Tier 3: Google translate.googleapis.com (gtx)
        try {
            const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${q}`);
            if (r.ok) {
                const j = await r.json();
                const tr = (j[0] || []).map(c => c[0] || '').join('');
                if (tr.trim()) return { text: tr.trim(), isAi: false };
            }
        } catch (_) {}

        // Tier 4: MyMemory API (независимый резервный сервис)
        try {
            const r = await fetch(`https://api.mymemory.translated.net/get?q=${q}&langpair=autodetect|${tl}`);
            if (r.ok) {
                const j = await r.json();
                const tr = j?.responseData?.translatedText;
                if (typeof tr === 'string' && tr.trim() && !tr.includes('MYMEMORY WARNING')) {
                    return { text: tr.trim(), isAi: false };
                }
            }
        } catch (_) {}

        throw new Error('Все серверы перевода временно недоступны');
    }

    // Установка кнопки в панель чата
    function installChatTranslateButton() {
        const form = document.querySelector('.chat-form');
        if (!form) return;
        if (document.getElementById('fxn-chat-translate-btn')) return;

        const cell = document.createElement('div');
        cell.className = 'chat-form-attach fxn-chat-translate-cell';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'fxn-chat-translate-btn';
        btn.className = 'btn btn-default chat-btn-image fxn-chat-translate-btn';
        btn.title = 'Перевести сообщение (Alt+T)';
        btn.innerHTML = '<span class="material-symbols-rounded">translate</span>';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const existingPop = document.getElementById('fxn-chat-lang-popover');
            if (existingPop) {
                existingPop.remove();
                return;
            }

            const input = getChatInput();
            const currentText = input ? input.value.trim() : '';

            // Если поле ввода пустое — открываем меню выбора языка
            if (!currentText) {
                showLanguagePopover(btn);
                return;
            }

            handleTranslateAction();
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const existingPop = document.getElementById('fxn-chat-lang-popover');
            if (existingPop) {
                existingPop.remove();
            } else {
                showLanguagePopover(btn);
            }
        });

        cell.appendChild(btn);

        // Порядок кнопок: Скрепка -> AI Режим -> Переводчик -> Отправить
        const aiCell = form.querySelector('.fxn-ai-toggle-cell') || document.getElementById('aiModeToggleBtn');
        const attachWrap = form.querySelector('.chat-form-attach:not(.fxn-chat-translate-cell):not(.fxn-ai-toggle-cell)');

        if (aiCell && aiCell.parentNode) {
            aiCell.parentNode.insertBefore(cell, aiCell.nextSibling);
        } else if (attachWrap && attachWrap.parentNode) {
            attachWrap.parentNode.insertBefore(cell, attachWrap.nextSibling);
        } else {
            const sendBtn = form.querySelector('.chat-form-btn');
            if (sendBtn && sendBtn.parentNode) {
                sendBtn.parentNode.insertBefore(cell, sendBtn);
            } else {
                form.appendChild(cell);
            }
        }
    }

    // Действие по кнопке перевода / Alt+T
    async function handleTranslateAction() {
        if (isTranslating) return;

        const input = getChatInput();
        if (!input) return;

        const currentText = input.value.trim();
        if (!currentText) {
            showToastMessage('Введите сообщение для перевода');
            input.focus();
            return;
        }

        const btn = document.getElementById('fxn-chat-translate-btn');
        const iconSpan = btn ? btn.querySelector('.material-symbols-rounded') : null;

        try {
            isTranslating = true;
            if (iconSpan) {
                iconSpan.textContent = 'sync';
                iconSpan.classList.add('fxn-spin');
            }

            // Определяем язык если еще не был выбран
            const target = detectChatTargetLanguage();
            currentTargetLang = target;

            // Сохраняем оригинал перед первой заменой
            if (originalMessageText === null) {
                originalMessageText = input.value;
            }

            // Если выбран режим AI — проверяем подписку
            let activeMode = currentTranslateMode;
            if (activeMode === 'ai') {
                const hasPrem = await isFoxenPremiumUser();
                if (!hasPrem) {
                    activeMode = 'google';
                    currentTranslateMode = 'google';
                }
            }

            const result = await executeTranslation(originalMessageText, target, activeMode);
            if (!result || !result.text) throw new Error('Пустой ответ');

            // Заменяем текст в поле ввода
            window.__fptProgrammaticInput = true;
            input.value = result.text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            window.__fptProgrammaticInput = false;

            // Отображаем обновлённую плашку
            showTranslateBanner(target, result.isAi ? 'ai' : 'google');

        } catch (err) {
            console.error('[Foxen Translate Out] Error:', err);
            showToastMessage('Не удалось перевести сообщение');
        } finally {
            isTranslating = false;
            if (iconSpan) {
                iconSpan.textContent = 'translate';
                iconSpan.classList.remove('fxn-spin');
            }
        }
    }

    // Переперевод текущего сообщения (при переключении языка или режима Обычный/ИИ)
    async function retranslateCurrentText(forcedMode = null) {
        if (isTranslating) return;

        const input = getChatInput();
        if (!input) return;

        if (originalMessageText === null) {
            originalMessageText = input.value;
        }
        if (!originalMessageText || !originalMessageText.trim()) return;

        const targetMode = forcedMode || currentTranslateMode;

        const banner = document.getElementById('fxn-chat-translate-banner');
        if (banner) banner.classList.add('is-loading');

        try {
            isTranslating = true;
            const result = await executeTranslation(originalMessageText, currentTargetLang, targetMode);
            if (result && result.text) {
                window.__fptProgrammaticInput = true;
                input.value = result.text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                window.__fptProgrammaticInput = false;

                showTranslateBanner(currentTargetLang, result.isAi ? 'ai' : 'google');
            }
        } catch (err) {
            showToastMessage('Ошибка перевода сообщения');
        } finally {
            isTranslating = false;
            const b = document.getElementById('fxn-chat-translate-banner');
            if (b) b.classList.remove('is-loading');
        }
    }

    // Динамическая инъекция стилей плавающей pill-панели (гарантирует мгновенное применение без кэширования браузером)
    function injectTranslateStyles() {
        if (document.getElementById('fxn-chat-translate-styles')) return;
        const style = document.createElement('style');
        style.id = 'fxn-chat-translate-styles';
        style.textContent = `
            .fxn-chat-translate-wrap {
                display: flex !important;
                align-items: center !important;
                width: 100% !important;
                padding: 0 0 6px 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                animation: fxnBannerSlideDown 0.16s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .fxn-chat-translate-banner {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                width: 100% !important;
                box-sizing: border-box !important;
                height: 38px !important;
                min-height: 38px !important;
                padding: 0 10px !important;
                border-radius: var(--fxn-theme-border-radius, 10px) !important;
                background: var(--fxn-theme-container-bg, rgba(18, 20, 26, 0.84)) !important;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%),
                            var(--fxn-theme-container-bg, rgba(18, 20, 26, 0.84)) !important;
                backdrop-filter: blur(var(--fxn-theme-glass-blur, 18px)) saturate(160%) brightness(1.04) !important;
                -webkit-backdrop-filter: blur(var(--fxn-theme-glass-blur, 18px)) saturate(160%) brightness(1.04) !important;
                border: 1px solid color-mix(in srgb, var(--fxn-accent, #22c55e) 24%, rgba(255, 255, 255, 0.1)) !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.38),
                            inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
                box-sizing: border-box !important;
                user-select: none !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                color: var(--fxn-theme-text-color, #f1f2f6) !important;
                transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
            }
            html[data-theme="light"] .fxn-chat-translate-banner,
            body.theme-light .fxn-chat-translate-banner,
            .fxn-theme-light .fxn-chat-translate-banner {
                background: rgba(255, 255, 255, 0.92) !important;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 250, 0.88) 100%) !important;
                border: 1px solid rgba(0, 0, 0, 0.1) !important;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1) !important;
                color: #1e293b !important;
            }
            .fxn-chat-translate-banner.is-ai-mode {
                border-color: color-mix(in srgb, var(--fxn-accent, #22c55e) 45%, transparent) !important;
                box-shadow: 0 4px 20px color-mix(in srgb, var(--fxn-accent, #22c55e) 15%, transparent),
                            inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
            }
            .fxn-chat-translate-banner.is-loading {
                opacity: 0.65 !important;
                pointer-events: none !important;
            }
            @keyframes fxnBannerSlideDown {
                from { opacity: 0; transform: translateY(-4px) scale(0.99); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .fxn-tr-left {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            .fxn-tr-right {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
            }
            .fxn-tr-lang-btn {
                height: 26px !important;
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.09) !important;
                border-radius: 6px !important;
                padding: 0 8px 0 7px !important;
                color: var(--fxn-theme-text-color, #f1f2f6) !important;
                font-size: 11.5px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 5px !important;
                transition: all 0.14s ease !important;
                user-select: none !important;
                line-height: 1 !important;
                outline: none !important;
            }
            html[data-theme="light"] .fxn-tr-lang-btn,
            body.theme-light .fxn-tr-lang-btn {
                background: rgba(0, 0, 0, 0.04) !important;
                border-color: rgba(0, 0, 0, 0.08) !important;
                color: #1e293b !important;
            }
            .fxn-tr-lang-btn:hover {
                background: rgba(255, 255, 255, 0.12) !important;
                border-color: color-mix(in srgb, var(--fxn-accent, #22c55e) 40%, rgba(255, 255, 255, 0.2)) !important;
                color: #ffffff !important;
            }
            html[data-theme="light"] .fxn-tr-lang-btn:hover,
            body.theme-light .fxn-tr-lang-btn:hover {
                background: rgba(0, 0, 0, 0.08) !important;
                color: #0f172a !important;
            }
            .fxn-tr-lang-flag {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
            }
            .fxn-flag-svg {
                width: 16px !important;
                height: 12px !important;
                border-radius: 2px !important;
                flex-shrink: 0 !important;
                display: inline-block !important;
                vertical-align: middle !important;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25) !important;
                overflow: hidden !important;
            }
            .fxn-tr-lang-name {
                font-size: 11.5px !important;
                font-weight: 600 !important;
                letter-spacing: -0.1px !important;
            }
            .fxn-tr-lang-arrow {
                font-size: 16px !important;
                color: rgba(255, 255, 255, 0.5) !important;
                margin-left: -1px !important;
            }
            html[data-theme="light"] .fxn-tr-lang-arrow,
            body.theme-light .fxn-tr-lang-arrow {
                color: rgba(0, 0, 0, 0.45) !important;
            }
            .fxn-tr-divider {
                width: 1px !important;
                height: 16px !important;
                background: rgba(255, 255, 255, 0.1) !important;
                margin: 0 2px !important;
                flex-shrink: 0 !important;
            }
            html[data-theme="light"] .fxn-tr-divider,
            body.theme-light .fxn-tr-divider {
                background: rgba(0, 0, 0, 0.08) !important;
            }
            .fxn-tr-segmented {
                display: inline-flex !important;
                align-items: center !important;
                background: rgba(0, 0, 0, 0.28) !important;
                padding: 2px !important;
                border-radius: 6px !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                gap: 2px !important;
                height: 26px !important;
                box-sizing: border-box !important;
            }
            html[data-theme="light"] .fxn-tr-segmented,
            body.theme-light .fxn-tr-segmented {
                background: rgba(0, 0, 0, 0.04) !important;
                border-color: rgba(0, 0, 0, 0.06) !important;
            }
            .fxn-tr-seg-btn {
                background: transparent !important;
                border: none !important;
                border-radius: 4px !important;
                padding: 0 8px !important;
                height: 20px !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                color: rgba(255, 255, 255, 0.6) !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 4px !important;
                transition: all 0.14s ease !important;
                user-select: none !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                outline: none !important;
            }
            .fxn-tr-seg-btn .material-symbols-rounded {
                font-size: 13px !important;
                line-height: 1 !important;
            }
            .fxn-tr-seg-btn:hover {
                color: #ffffff !important;
            }
            html[data-theme="light"] .fxn-tr-seg-btn:hover,
            body.theme-light .fxn-tr-seg-btn:hover {
                color: #0f172a !important;
            }
            .fxn-tr-seg-btn.fxn-mode-google.is-active {
                background: rgba(255, 255, 255, 0.14) !important;
                color: #ffffff !important;
                font-weight: 600 !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
            }
            html[data-theme="light"] .fxn-tr-seg-btn.fxn-mode-google.is-active,
            body.theme-light .fxn-tr-seg-btn.fxn-mode-google.is-active {
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            }
            .fxn-tr-seg-btn.fxn-mode-ai.is-active {
                background: color-mix(in srgb, var(--fxn-accent, #22c55e) 22%, transparent) !important;
                border: 1px solid color-mix(in srgb, var(--fxn-accent, #22c55e) 40%, transparent) !important;
                color: #ffffff !important;
                font-weight: 600 !important;
                box-shadow: 0 1px 6px color-mix(in srgb, var(--fxn-accent, #22c55e) 25%, transparent) !important;
            }
            .fxn-tr-seg-btn.fxn-mode-ai.is-active .material-symbols-rounded {
                color: var(--fxn-accent, #22c55e) !important;
            }
            .fxn-tr-undo-btn {
                height: 26px !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                border-radius: 6px !important;
                padding: 0 8px 0 6px !important;
                color: rgba(255, 255, 255, 0.7) !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
                transition: all 0.14s ease !important;
                user-select: none !important;
                line-height: 1 !important;
                outline: none !important;
            }
            html[data-theme="light"] .fxn-tr-undo-btn,
            body.theme-light .fxn-tr-undo-btn {
                background: rgba(0, 0, 0, 0.03) !important;
                border-color: rgba(0, 0, 0, 0.08) !important;
                color: #475569 !important;
            }
            .fxn-tr-undo-btn .material-symbols-rounded {
                font-size: 14px !important;
            }
            .fxn-tr-undo-btn:hover {
                background: rgba(239, 68, 68, 0.12) !important;
                border-color: rgba(239, 68, 68, 0.3) !important;
                color: #fca5a5 !important;
            }
            html[data-theme="light"] .fxn-tr-undo-btn:hover,
            body.theme-light .fxn-tr-undo-btn:hover {
                background: rgba(239, 68, 68, 0.08) !important;
                border-color: rgba(239, 68, 68, 0.25) !important;
                color: #dc2626 !important;
            }
            .fxn-tr-close-btn {
                width: 26px !important;
                height: 26px !important;
                border-radius: 6px !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                color: rgba(255, 255, 255, 0.6) !important;
                font-size: 16px !important;
                cursor: pointer !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
                padding: 0 !important;
                transition: all 0.14s ease !important;
                outline: none !important;
            }
            html[data-theme="light"] .fxn-tr-close-btn,
            body.theme-light .fxn-tr-close-btn {
                background: rgba(0, 0, 0, 0.03) !important;
                border-color: rgba(0, 0, 0, 0.08) !important;
                color: #64748b !important;
            }
            .fxn-tr-close-btn:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.15) !important;
                color: #ffffff !important;
            }
            html[data-theme="light"] .fxn-tr-close-btn:hover,
            body.theme-light .fxn-tr-close-btn:hover {
                background: rgba(0, 0, 0, 0.06) !important;
                color: #0f172a !important;
            }

            /* ── Popover Language Menu with Glassmorphism & Theme Sync ── */
            .fxn-chat-lang-popover {
                position: fixed !important;
                z-index: 20000010 !important;
                width: 170px !important;
                max-width: calc(100vw - 20px) !important;
                padding: 4px !important;
                border-radius: var(--fxn-theme-border-radius, 8px) !important;
                background: var(--fxn-theme-container-bg, rgba(16, 18, 24, 0.96)) !important;
                backdrop-filter: blur(var(--fxn-theme-glass-blur, 16px)) saturate(150%) !important;
                -webkit-backdrop-filter: blur(var(--fxn-theme-glass-blur, 16px)) saturate(150%) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
                box-sizing: border-box !important;
                color: var(--fxn-theme-text-color, #ffffff) !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                animation: fxnPopoverIn 0.14s cubic-bezier(0.16, 1, 0.3, 1) !important;
                user-select: none !important;
            }
            html[data-theme="light"] .fxn-chat-lang-popover,
            body.theme-light .fxn-chat-lang-popover,
            .fxn-theme-light .fxn-chat-lang-popover {
                background: rgba(255, 255, 255, 0.96) !important;
                border: 1px solid rgba(0, 0, 0, 0.12) !important;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 1) !important;
                color: #111827 !important;
            }
            @keyframes fxnPopoverIn {
                from { opacity: 0; transform: translateY(4px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .fxn-chat-lang-list {
                max-height: 230px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 1px !important;
            }
            .fxn-chat-lang-list::-webkit-scrollbar {
                width: 3px !important;
            }
            .fxn-chat-lang-list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.16) !important;
                border-radius: 3px !important;
            }
            .fxn-chat-lang-list::-webkit-scrollbar-track {
                background: transparent !important;
            }
            .fxn-chat-lang-item {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                height: 28px !important;
                min-height: 28px !important;
                padding: 0 8px !important;
                border-radius: 5px !important;
                background: transparent !important;
                border: none !important;
                color: var(--fxn-theme-text-color, #e2e8f0) !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background 0.12s ease, color 0.12s ease !important;
                outline: none !important;
                width: 100% !important;
                box-sizing: border-box !important;
                line-height: 1 !important;
                user-select: none !important;
                text-align: left !important;
            }
            html[data-theme="light"] .fxn-chat-lang-item,
            body.theme-light .fxn-chat-lang-item {
                color: #334155 !important;
            }
            .fxn-chat-lang-item:hover {
                background: rgba(255, 255, 255, 0.08) !important;
                color: #ffffff !important;
            }
            html[data-theme="light"] .fxn-chat-lang-item:hover,
            body.theme-light .fxn-chat-lang-item:hover {
                background: rgba(0, 0, 0, 0.05) !important;
                color: #0f172a !important;
            }
            .fxn-chat-lang-item.is-active {
                background: color-mix(in srgb, var(--fxn-accent, #22c55e) 14%, transparent) !important;
                color: var(--fxn-accent, #22c55e) !important;
                font-weight: 600 !important;
            }
            html[data-theme="light"] .fxn-chat-lang-item.is-active,
            body.theme-light .fxn-chat-lang-item.is-active {
                background: color-mix(in srgb, var(--fxn-accent, #16a34a) 12%, transparent) !important;
                color: var(--fxn-accent, #16a34a) !important;
            }
            .fxn-chat-lang-item-left {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                min-width: 0 !important;
            }
            .fxn-chat-lang-name {
                font-size: 12px !important;
                letter-spacing: -0.1px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .fxn-chat-lang-check {
                font-size: 15px !important;
                font-weight: 700 !important;
                color: var(--fxn-accent, #22c55e) !important;
                line-height: 1 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-shrink: 0 !important;
            }
            html[data-theme="light"] .fxn-chat-lang-check,
            body.theme-light .fxn-chat-lang-check {
                color: var(--fxn-accent, #16a34a) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Плашка управления переводом над полем ввода
    function showTranslateBanner(langCode, activeMode = 'google') {
        removeTranslateBanner();
        injectTranslateStyles();

        const form = getChatForm();
        if (!form) return;

        const langObj = SUPPORTED_LANGS.find(l => l.code === langCode) || { name: langCode.toUpperCase(), flag: '🌐' };
        const isAi = (activeMode === 'ai');

        let wrap = document.getElementById('fxn-chat-translate-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'fxn-chat-translate-wrap';
            wrap.className = 'fxn-chat-translate-wrap';
            const anchor = form.closest('.chat-form') || form;
            anchor.parentNode.insertBefore(wrap, anchor);
        }

        const banner = document.createElement('div');
        banner.id = 'fxn-chat-translate-banner';
        banner.className = 'fxn-chat-translate-banner' + (isAi ? ' is-ai-mode' : '');
        banner.innerHTML = `
            <div class="fxn-tr-left">
                <!-- Селектор языка -->
                <button type="button" class="fxn-tr-lang-btn" title="Сменить язык перевода">
                    <span class="fxn-tr-lang-flag">${getLangFlagSvg(langObj.code)}</span>
                    <span class="fxn-tr-lang-name">${langObj.name}</span>
                    <span class="material-symbols-rounded fxn-tr-lang-arrow">expand_more</span>
                </button>

                <div class="fxn-tr-divider"></div>

                <!-- Переключатель режима: Google / ИИ (21st.dev Segmented tabs) -->
                <div class="fxn-tr-segmented" role="tablist">
                    <button type="button" class="fxn-tr-seg-btn fxn-mode-google ${!isAi ? 'is-active' : ''}" title="Обычный перевод через Google">
                        <span class="material-symbols-rounded">translate</span>
                        <span>Google</span>
                    </button>
                    <button type="button" class="fxn-tr-seg-btn fxn-mode-ai ${isAi ? 'is-active' : ''}" title="Нейросетевой перевод игровой терминологии (Foxen Premium)">
                        <span class="material-symbols-rounded">auto_awesome</span>
                        <span>ИИ</span>
                    </button>
                </div>
            </div>

            <div class="fxn-tr-right">
                <!-- Кнопка возврата оригинала -->
                <button type="button" class="fxn-tr-undo-btn" title="Вернуть исходный текст">
                    <span class="material-symbols-rounded">undo</span>
                    <span>Оригинал</span>
                </button>

                <!-- Закрыть плашку -->
                <button type="button" class="fxn-tr-close-btn" title="Скрыть панель перевода">&times;</button>
            </div>
        `;

        wrap.appendChild(banner);

        // Клик по переключателю: Обычный
        banner.querySelector('.fxn-mode-google').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (currentTranslateMode === 'google' && !isAi) return;
            currentTranslateMode = 'google';
            try { localStorage.setItem('foxen_chat_translate_mode', 'google'); } catch (_) {}
            await retranslateCurrentText('google');
        });

        // Клик по переключателю: ✨ ИИ
        banner.querySelector('.fxn-mode-ai').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (currentTranslateMode === 'ai' && isAi) return;

            // Проверка подписки Foxen Premium
            const hasPrem = await isFoxenPremiumUser();
            if (!hasPrem) {
                showToastMessage('✨ Нейросетевой перевод игровой терминологии доступен только в Foxen Premium');
                if (typeof showSubscriptionModal === 'function') {
                    showSubscriptionModal();
                }
                return;
            }

            currentTranslateMode = 'ai';
            try { localStorage.setItem('foxen_chat_translate_mode', 'ai'); } catch (_) {}
            await retranslateCurrentText('ai');
        });

        // Клик по выбору языка
        banner.querySelector('.fxn-tr-lang-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showLanguagePopover(e.currentTarget);
        });

        // Клик по возврату оригинала
        banner.querySelector('.fxn-tr-undo-btn').addEventListener('click', () => {
            restoreOriginalText();
        });

        // Закрытие плашки
        banner.querySelector('.fxn-tr-close-btn').addEventListener('click', () => {
            removeTranslateBanner();
            originalMessageText = null;
        });
    }

    function removeTranslateBanner() {
        document.getElementById('fxn-chat-translate-wrap')?.remove();
        document.getElementById('fxn-chat-translate-banner')?.remove();
    }

    function restoreOriginalText() {
        const input = getChatInput();
        if (input && originalMessageText !== null) {
            window.__fptProgrammaticInput = true;
            input.value = originalMessageText;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            window.__fptProgrammaticInput = false;
        }
        originalMessageText = null;
        removeTranslateBanner();
    }

    // Синхронизация переменных оформления с текущей темой Foxen
    function syncThemeVariables() {
        const root = document.documentElement;
        if (!root) return;
        let accent = root.style.getPropertyValue('--fxn-accent')?.trim()
                  || getComputedStyle(root).getPropertyValue('--fxn-accent')?.trim()
                  || getComputedStyle(document.body).getPropertyValue('--fxn-accent')?.trim();
        if (!accent) {
            try {
                accent = localStorage.getItem('foxen_accent_color') || sessionStorage.getItem('foxen_accent_color');
                if (!accent) {
                    const cache = JSON.parse(localStorage.getItem('foxen_theme_cache') || '{}');
                    accent = cache.bgColor2 || cache.accentColor || cache.primaryColor || cache.bgColor1;
                }
            } catch (_) {}
        }
        if (accent && accent.trim()) {
            root.style.setProperty('--fxn-accent', accent.trim());
        }
    }

    // Всплывающее меню выбора языка перевода с Glassmorphism, акцентной синхронизацией и минималистичным стилем
    async function showLanguagePopover(anchorEl) {
        syncThemeVariables();
        document.getElementById('fxn-chat-lang-popover')?.remove();

        const popover = document.createElement('div');
        popover.id = 'fxn-chat-lang-popover';
        popover.className = 'fxn-chat-lang-popover';

        const list = document.createElement('div');
        list.className = 'fxn-chat-lang-list custom-scroll';

        SUPPORTED_LANGS.forEach(lang => {
            const isActive = (lang.code === currentTargetLang);
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'fxn-chat-lang-item' + (isActive ? ' is-active' : '');
            item.innerHTML = `
                <div class="fxn-chat-lang-item-left">
                    <span class="fxn-tr-lang-flag">${getLangFlagSvg(lang.code)}</span>
                    <span class="fxn-chat-lang-name">${lang.name}</span>
                </div>
                ${isActive ? '<span class="material-symbols-rounded fxn-chat-lang-check">check</span>' : ''}
            `;
            item.addEventListener('click', async () => {
                currentTargetLang = lang.code;
                try {
                    localStorage.setItem('foxen_chat_target_lang', lang.code);
                } catch (_) {}
                popover.remove();

                // Если есть текст — сразу переводим на новый язык с текущим режимом
                const input = getChatInput();
                if (input && (originalMessageText || input.value.trim())) {
                    await retranslateCurrentText();
                } else {
                    showTranslateBanner(currentTargetLang, currentTranslateMode);
                }
            });
            list.appendChild(item);
        });

        popover.appendChild(list);
        document.body.appendChild(popover);

        // Позиционирование над anchorEl (кнопка или плашка)
        const rect = anchorEl.getBoundingClientRect();
        popover.style.position = 'fixed';
        popover.style.zIndex = '20000010';

        const banner = document.getElementById('fxn-chat-translate-banner') || anchorEl.closest('.fxn-chat-translate-banner');
        const bannerRect = banner ? banner.getBoundingClientRect() : null;
        const chatContainer = anchorEl.closest('.chat') || document.querySelector('.chat-full .chat, .chat');
        const chatRect = chatContainer ? chatContainer.getBoundingClientRect() : null;

        const popHeight = popover.offsetHeight || 240;
        const popWidth = popover.offsetWidth || 170;

        let top = rect.top - popHeight - 6;
        if (top < 10) {
            top = rect.bottom + 6;
        }

        // Выравниваем по левой границе кнопки выбора языка
        let left = rect.left;

        // Строго удерживаем внутри границ .fxn-chat-translate-banner и чата
        const minLeft = bannerRect ? bannerRect.left : (chatRect ? chatRect.left : 10);
        const maxRight = bannerRect ? bannerRect.right : (chatRect ? chatRect.right : window.innerWidth - 10);

        if (left < minLeft) {
            left = minLeft;
        }
        if (left + popWidth > maxRight) {
            left = maxRight - popWidth;
        }
        if (left < 10) left = 10;
        if (left + popWidth > window.innerWidth - 10) {
            left = window.innerWidth - popWidth - 10;
        }

        popover.style.top = `${Math.round(top)}px`;
        popover.style.left = `${Math.round(left)}px`;

        const outsideClickHandler = (e) => {
            if (!popover.contains(e.target) && !anchorEl.contains(e.target)) {
                popover.remove();
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', outsideClickHandler), 50);
    }

    function showToastMessage(msg) {
        if (typeof showNotification === 'function') {
            showNotification(msg, false);
            return;
        }
        let t = document.getElementById('fxn-chat-trans-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'fxn-chat-trans-toast';
            t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1f2028;color:#fff;padding:8px 16px;border-radius:20px;font-size:12.5px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.12);z-index:20000020;pointer-events:none;transition:opacity 0.2s;opacity:0;';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        setTimeout(() => { if (t) t.style.opacity = '0'; }, 2400);
    }

    function setupSubmitListener() {
        document.addEventListener('submit', (e) => {
            const form = e.target.closest && e.target.closest('.chat-form');
            if (form) {
                originalMessageText = null;
                removeTranslateBanner();
            }
        }, true);

        document.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('.chat-form-btn button[type="submit"], .chat-form button.btn-round');
            if (btn) {
                originalMessageText = null;
                removeTranslateBanner();
            }
        }, true);
    }

    function setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT')) {
                const input = getChatInput();
                if (input && (document.activeElement === input || input.value.trim())) {
                    e.preventDefault();
                    handleTranslateAction();
                }
            }
        });
    }

    function init() {
        injectTranslateStyles();
        installChatTranslateButton();
        setupSubmitListener();
        setupHotkeys();

        const observer = new MutationObserver(() => {
            if (document.querySelector('.chat-form-input') && !document.getElementById('fxn-chat-translate-btn')) {
                installChatTranslateButton();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
