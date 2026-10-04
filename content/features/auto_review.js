// content/features/auto_review.js

/**
 * Инициализирует UI для всех функций авто-ответов в настройках Foxen
 */
async function initializeAutoReviewUI() {
    const page = document.querySelector('.foxen-page-content[data-page="auto_review"]');
    if (!page || page.dataset.initialized) return;

    const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
    
    const settings = {
        autoReviewEnabled: foxenAutoReplies.autoReviewEnabled || false,
        reviewTemplates: foxenAutoReplies.reviewTemplates || {},
        greetingEnabled: foxenAutoReplies.greetingEnabled || false,
        greetingText: foxenAutoReplies.greetingText || 'Здравствуйте! Чем могу помочь?',
        keywordsEnabled: foxenAutoReplies.keywordsEnabled || false,
        keywords: foxenAutoReplies.keywords || [],
        bonusForReviewEnabled: foxenAutoReplies.bonusForReviewEnabled || false,
        bonusMode: foxenAutoReplies.bonusMode || 'single',
        singleBonusText: foxenAutoReplies.singleBonusText || '',
        randomBonuses: foxenAutoReplies.randomBonuses || [],
        bonusForReviewDelaySec: (foxenAutoReplies.bonusForReviewDelaySec ?? 4),
        newOrderReplyEnabled: foxenAutoReplies.newOrderReplyEnabled || false,
        newOrderReplyText: foxenAutoReplies.newOrderReplyText || '',
        orderConfirmReplyEnabled: foxenAutoReplies.orderConfirmReplyEnabled || false,
        orderConfirmReplyText: foxenAutoReplies.orderConfirmReplyText || '',
        typingDelay: foxenAutoReplies.typingDelay || false,
        onlyNewChats: foxenAutoReplies.onlyNewChats || false,
        ignoreSystemMessages: foxenAutoReplies.ignoreSystemMessages || false,
        greetingCooldownDays: foxenAutoReplies.greetingCooldownDays ?? 0
    };

    const bonusChk = document.getElementById('bonusForReviewEnabled');
    if (bonusChk) bonusChk.checked = !!settings.bonusForReviewEnabled;
    const bonusModeRadio = document.querySelector(`input[name="bonusMode"][value="${settings.bonusMode}"]`);
    if (bonusModeRadio) bonusModeRadio.checked = true;
    const singleBonusInput = document.getElementById('singleBonusText');
    if (singleBonusInput) singleBonusInput.value = settings.singleBonusText || '';
    const _d = document.getElementById('bonusForReviewDelaySec');
    if (_d) _d.value = settings.bonusForReviewDelaySec ?? 4;
    
    const singleBonusContainer = document.getElementById('singleBonusContainer');
    const randomBonusContainer = document.getElementById('randomBonusContainer');
    
    const toggleBonusContainers = () => {
        const checkedRadio = document.querySelector('input[name="bonusMode"]:checked');
        const mode = checkedRadio ? checkedRadio.value : (settings.bonusMode || 'single');
        if (singleBonusContainer) singleBonusContainer.style.display = mode === 'single' ? 'block' : 'none';
        if (randomBonusContainer) randomBonusContainer.style.display = mode === 'random' ? 'block' : 'none';
    };
    
    document.querySelectorAll('input[name="bonusMode"]').forEach(radio => {
        radio.addEventListener('change', toggleBonusContainers);
    });
    
    toggleBonusContainers();
    if (typeof renderBonusesList === 'function') renderBonusesList(settings.randomBonuses);

    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    const setVal   = (id, val) => { const el = document.getElementById(id); if (el) el.value  = val || ''; };

    setCheck('autoReviewEnabled', settings.autoReviewEnabled);
    for (let i = 1; i <= 5; i++) setVal(`fxn-review-${i}`, settings.reviewTemplates?.[i]);
    setCheck('greetingEnabled',       settings.greetingEnabled);
    setVal('greetingText',            settings.greetingText || 'Здравствуйте! Чем могу помочь?');
    setCheck('onlyNewChats',          settings.onlyNewChats);
    setCheck('ignoreSystemMessages',  settings.ignoreSystemMessages);
    setVal('greetingCooldownDays',    settings.greetingCooldownDays ?? 0);
    setCheck('keywordsEnabled',       settings.keywordsEnabled);
    setCheck('newOrderReplyEnabled',     settings.newOrderReplyEnabled);
    setVal('newOrderReplyText',          settings.newOrderReplyText);
    setCheck('orderConfirmReplyEnabled', settings.orderConfirmReplyEnabled);
    setVal('orderConfirmReplyText',      settings.orderConfirmReplyText);
    setCheck('typingDelay',              settings.typingDelay);
    
    renderKeywordsList(settings.keywords);

    let saveTimeout;
    const saveOnChange = async () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const storedData = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            const currentSettings = storedData.foxenAutoReplies || {};
            
            const getChecked = id => document.getElementById(id)?.checked ?? false;
            const getVal = id => document.getElementById(id)?.value || '';

            const readImgs = (id) => {
                const el = document.getElementById(id);
                if (!el || !el.dataset.fxnImages) return [];
                try { return JSON.parse(el.dataset.fxnImages) || []; } catch (_) { return []; }
            };
            const readOrder = (id) => {
                const el = document.getElementById(id);
                return (el && el.dataset.fxnSendOrder === 'image_first') ? 'image_first' : 'text_first';
            };

            const newSettings = {
                ...currentSettings,
                // Review replies
                autoReviewEnabled: getChecked('autoReviewEnabled'),
                reviewTemplates: {
                    '5': getVal('fxn-review-5'),
                    '4': getVal('fxn-review-4'),
                    '3': getVal('fxn-review-3'),
                    '2': getVal('fxn-review-2'),
                    '1': getVal('fxn-review-1')
                },
                reviewTemplateImages: {
                    '5': readImgs('fxn-review-5'),
                    '4': readImgs('fxn-review-4'),
                    '3': readImgs('fxn-review-3'),
                    '2': readImgs('fxn-review-2'),
                    '1': readImgs('fxn-review-1')
                },
                // Greeting
                greetingEnabled:       getChecked('greetingEnabled'),
                greetingText:          getVal('greetingText'),
                greetingImages:        readImgs('greetingText'),
                greetingSendOrder:     readOrder('greetingText'),
                onlyNewChats:          getChecked('onlyNewChats'),
                ignoreSystemMessages:  getChecked('ignoreSystemMessages'),
                greetingCooldownDays:  parseFloat(getVal('greetingCooldownDays') || '0'),
                // Keywords
                keywordsEnabled: getChecked('keywordsEnabled'),
                // Bonus
                bonusForReviewEnabled: getChecked('bonusForReviewEnabled'),
                bonusMode:             document.querySelector('input[name="bonusMode"]:checked')?.value || 'single',
                singleBonusText:       getVal('singleBonusText'),
                bonusForReviewDelaySec: Math.max(0, Math.min(60, parseFloat(getVal('bonusForReviewDelaySec') || '4') || 0)),
                // New order / confirm replies
                newOrderReplyEnabled:       getChecked('newOrderReplyEnabled'),
                newOrderReplyText:          getVal('newOrderReplyText'),
                newOrderReplyImages:        readImgs('newOrderReplyText'),
                newOrderReplySendOrder:     readOrder('newOrderReplyText'),
                orderConfirmReplyEnabled:   getChecked('orderConfirmReplyEnabled'),
                orderConfirmReplyText:      getVal('orderConfirmReplyText'),
                orderConfirmReplyImages:    readImgs('orderConfirmReplyText'),
                orderConfirmReplySendOrder: readOrder('orderConfirmReplyText'),
                typingDelay:                getChecked('typingDelay')
            };
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies: newSettings });
            console.log("Foxen: Auto-reply settings saved.");
        }, 500);
    };

    page.querySelectorAll('input[type="checkbox"], textarea, input[name="bonusMode"]').forEach(el => {
        el.addEventListener('change', saveOnChange);
        el.addEventListener('input', saveOnChange);
    });

    // === НОВАЯ ЛОГИКА ДЛЯ КНОПОК ИЗОБРАЖЕНИЙ ===
    page.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-image-btn')) {
            const textarea = e.target.previousElementSibling;
            if (textarea && textarea.tagName === 'TEXTAREA') {
                handleImageAddClick(textarea);
            }
        }
    });
    // === КОНЕЦ НОВОЙ ЛОГИКИ ===

    // === ЭКСПОРТ И ИМПОРТ ЗАГОТОВЛЕННЫХ ТЕКСТОВ И ПРАВИЛ АВТО-ОТВЕТОВ ===
    const exportAutoBtn = document.getElementById('fxnMasterExportAutoreplyBtn') || document.getElementById('fxn-export-autoreply-btn');
    if (exportAutoBtn && !exportAutoBtn.dataset.bound) {
        exportAutoBtn.dataset.bound = '1';
        exportAutoBtn.onclick = async () => {
            const api = (typeof browser !== 'undefined' ? browser : chrome);
            const storedData = await api.storage.local.get('foxenAutoReplies');
            const currentSettings = storedData.foxenAutoReplies || {};

            const readImgs = (id) => {
                const el = document.getElementById(id);
                if (!el || !el.dataset.fxnImages) return [];
                try { return JSON.parse(el.dataset.fxnImages) || []; } catch (_) { return []; }
            };
            const readOrder = (id) => {
                const el = document.getElementById(id);
                return (el && el.dataset.fxnSendOrder === 'image_first') ? 'image_first' : 'text_first';
            };

            const greetingText = document.getElementById('greetingText')?.value || '';
            const newOrderReplyText = document.getElementById('newOrderReplyText')?.value || '';
            const orderConfirmReplyText = document.getElementById('orderConfirmReplyText')?.value || '';
            const singleBonusText = document.getElementById('singleBonusText')?.value || '';
            const reviewTemplates = {
                '1': document.getElementById('fxn-review-1')?.value || '',
                '2': document.getElementById('fxn-review-2')?.value || '',
                '3': document.getElementById('fxn-review-3')?.value || '',
                '4': document.getElementById('fxn-review-4')?.value || '',
                '5': document.getElementById('fxn-review-5')?.value || ''
            };
            const reviewTemplateImages = {
                '1': readImgs('fxn-review-1'),
                '2': readImgs('fxn-review-2'),
                '3': readImgs('fxn-review-3'),
                '4': readImgs('fxn-review-4'),
                '5': readImgs('fxn-review-5')
            };

            const dataToExport = {
                version: 2,
                exportedAt: new Date().toISOString(),
                type: 'foxen_autoreply',
                texts: {
                    greetingText,
                    greetingImages: readImgs('greetingText'),
                    greetingSendOrder: readOrder('greetingText'),
                    newOrderReplyText,
                    newOrderReplyImages: readImgs('newOrderReplyText'),
                    newOrderReplySendOrder: readOrder('newOrderReplyText'),
                    orderConfirmReplyText,
                    orderConfirmReplyImages: readImgs('orderConfirmReplyText'),
                    orderConfirmReplySendOrder: readOrder('orderConfirmReplyText'),
                    singleBonusText,
                    randomBonuses: Array.isArray(currentSettings.randomBonuses) ? currentSettings.randomBonuses : [],
                    reviewTemplates,
                    reviewTemplateImages,
                    keywords: Array.isArray(currentSettings.keywords) ? currentSettings.keywords : []
                }
            };

            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `foxen_autoreply_${Date.now()}.fxnar`;
            a.click();
            URL.revokeObjectURL(url);
            if (typeof showNotification === 'function') {
                showNotification('Авто-ответы успешно экспортированы (.fxnar)!');
            } else {
                alert('Авто-ответы успешно экспортированы (.fxnar)!');
            }
        };
    }

    const importAutoBtn = document.getElementById('fxnMasterImportAutoreplyBtn') || document.getElementById('fxn-import-autoreply-btn');
    const importAutoFileInput = document.getElementById('fxnMasterImportAutoreplyFile') || document.getElementById('fxn-import-autoreply-file');
    if (importAutoBtn && importAutoFileInput && !importAutoBtn.dataset.bound) {
        importAutoBtn.dataset.bound = '1';
        importAutoBtn.onclick = () => importAutoFileInput.click();
        importAutoFileInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const fileText = await file.text();
                const json = JSON.parse(fileText);
                const texts = json.texts || json;

                const api = (typeof browser !== 'undefined' ? browser : chrome);
                const storedData = await api.storage.local.get('foxenAutoReplies');
                const autoReplies = storedData.foxenAutoReplies || {};

                // 1. Приветствие
                if (typeof texts.greetingText === 'string') {
                    setVal('greetingText', texts.greetingText);
                    autoReplies.greetingText = texts.greetingText;
                }
                if (Array.isArray(texts.greetingImages)) {
                    const el = document.getElementById('greetingText');
                    if (el) {
                        el.dataset.fxnImages = JSON.stringify(texts.greetingImages);
                        if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(el);
                    }
                    autoReplies.greetingImages = texts.greetingImages;
                }
                if (texts.greetingSendOrder) {
                    const el = document.getElementById('greetingText');
                    if (el && typeof fxnSetSendOrder === 'function') fxnSetSendOrder(el, texts.greetingSendOrder);
                    autoReplies.greetingSendOrder = texts.greetingSendOrder;
                }

                // 2. Новый заказ
                if (typeof texts.newOrderReplyText === 'string') {
                    setVal('newOrderReplyText', texts.newOrderReplyText);
                    autoReplies.newOrderReplyText = texts.newOrderReplyText;
                }
                if (Array.isArray(texts.newOrderReplyImages)) {
                    const el = document.getElementById('newOrderReplyText');
                    if (el) {
                        el.dataset.fxnImages = JSON.stringify(texts.newOrderReplyImages);
                        if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(el);
                    }
                    autoReplies.newOrderReplyImages = texts.newOrderReplyImages;
                }
                if (texts.newOrderReplySendOrder) {
                    const el = document.getElementById('newOrderReplyText');
                    if (el && typeof fxnSetSendOrder === 'function') fxnSetSendOrder(el, texts.newOrderReplySendOrder);
                    autoReplies.newOrderReplySendOrder = texts.newOrderReplySendOrder;
                }

                // 3. Подтверждение заказа
                if (typeof texts.orderConfirmReplyText === 'string') {
                    setVal('orderConfirmReplyText', texts.orderConfirmReplyText);
                    autoReplies.orderConfirmReplyText = texts.orderConfirmReplyText;
                }
                if (Array.isArray(texts.orderConfirmReplyImages)) {
                    const el = document.getElementById('orderConfirmReplyText');
                    if (el) {
                        el.dataset.fxnImages = JSON.stringify(texts.orderConfirmReplyImages);
                        if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(el);
                    }
                    autoReplies.orderConfirmReplyImages = texts.orderConfirmReplyImages;
                }
                if (texts.orderConfirmReplySendOrder) {
                    const el = document.getElementById('orderConfirmReplyText');
                    if (el && typeof fxnSetSendOrder === 'function') fxnSetSendOrder(el, texts.orderConfirmReplySendOrder);
                    autoReplies.orderConfirmReplySendOrder = texts.orderConfirmReplySendOrder;
                }

                // 4. Бонусы
                if (typeof texts.singleBonusText === 'string') {
                    setVal('singleBonusText', texts.singleBonusText);
                    autoReplies.singleBonusText = texts.singleBonusText;
                }
                if (Array.isArray(texts.randomBonuses)) {
                    autoReplies.randomBonuses = texts.randomBonuses;
                    if (typeof renderBonusesList === 'function') renderBonusesList(autoReplies.randomBonuses);
                }

                // 5. Шаблоны отзывов
                if (texts.reviewTemplates && typeof texts.reviewTemplates === 'object') {
                    autoReplies.reviewTemplates = autoReplies.reviewTemplates || {};
                    for (let i = 1; i <= 5; i++) {
                        if (typeof texts.reviewTemplates[i] === 'string') {
                            setVal(`fxn-review-${i}`, texts.reviewTemplates[i]);
                            autoReplies.reviewTemplates[String(i)] = texts.reviewTemplates[i];
                        }
                    }
                }
                if (texts.reviewTemplateImages && typeof texts.reviewTemplateImages === 'object') {
                    autoReplies.reviewTemplateImages = autoReplies.reviewTemplateImages || {};
                    for (let i = 1; i <= 5; i++) {
                        if (Array.isArray(texts.reviewTemplateImages[i])) {
                            const el = document.getElementById(`fxn-review-${i}`);
                            if (el) {
                                el.dataset.fxnImages = JSON.stringify(texts.reviewTemplateImages[i]);
                                if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(el);
                            }
                            autoReplies.reviewTemplateImages[String(i)] = texts.reviewTemplateImages[i];
                        }
                    }
                }

                // 6. Ключевые слова
                if (Array.isArray(texts.keywords)) {
                    autoReplies.keywords = texts.keywords;
                    renderKeywordsList(autoReplies.keywords);
                }

                // Немедленное синхронное сохранение в storage без задержки таймера
                await api.storage.local.set({ foxenAutoReplies: autoReplies });

                if (typeof showNotification === 'function') {
                    showNotification('Авто-ответы успешно импортированы (.fxnar)!');
                } else {
                    alert('Авто-ответы успешно импортированы (.fxnar)!');
                }
            } catch (err) {
                alert('Ошибка импорта авто-ответов: ' + err.message);
            } finally {
                importAutoFileInput.value = '';
            }
        };
    }
    // === КОНЕЦ ЭКСПОРТА/ИМПОРТА ===

    // Edit state: which existing rule (if any) the add-form is currently editing.
    let editingKeywordIndex = -1;
    const addKeywordBtn = document.getElementById('addKeywordBtn');
    const kwInput = document.getElementById('newKeyword');
    const kwResponse = document.getElementById('newKeywordResponse');

    const resetKeywordForm = () => {
        editingKeywordIndex = -1;
        kwInput.value = '';
        kwResponse.value = '';
        const exactRadio = document.querySelector('input[name="newKeywordMatchMode"][value="exact"]');
        if (exactRadio) exactRadio.checked = true;
        addKeywordBtn.textContent = 'Добавить правило';
        addKeywordBtn.classList.remove('fxn-editing-rule');
        // clear any attached image from the response field
        if (typeof __fptAttachments !== 'undefined') __fptAttachments.delete(kwResponse);
        delete kwResponse.dataset.fxnImages;
        delete kwResponse.dataset.fxnSendOrder;
        if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(kwResponse);
    };

    if (addKeywordBtn && kwInput && kwResponse) {
        addKeywordBtn.addEventListener('click', async () => {
            const keyword = kwInput.value.trim().toLowerCase();
            const response = kwResponse.value.trim();
            const matchModeEl = document.querySelector('input[name="newKeywordMatchMode"]:checked');
            const matchMode = matchModeEl ? matchModeEl.value : 'exact';

            // read any image attached to the response field
            let images = [];
            if (kwResponse.dataset.fxnImages) { try { images = JSON.parse(kwResponse.dataset.fxnImages); } catch(_){} }
            const sendOrder = kwResponse.dataset.fxnSendOrder === 'image_first' ? 'image_first' : 'text_first';

            if (!keyword || (!response && !images.length)) {
                showNotification('Заполните ключевое слово и ответ (текст или картинку).', true);
                return;
            }

            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            const keywords = foxenAutoReplies.keywords || [];
            const rule = { keyword, response, matchMode };
            if (images.length) rule.images = images;
            if (images.length) rule.sendOrder = sendOrder;

            if (editingKeywordIndex >= 0 && editingKeywordIndex < keywords.length) {
                keywords[editingKeywordIndex] = rule;   // overwrite existing rule
                showNotification('Правило обновлено!');
            } else {
                keywords.push(rule);                     // add new rule
            }
            foxenAutoReplies.keywords = keywords;

            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
            renderKeywordsList(keywords);
            resetKeywordForm();
        });
    }
    
    const addBonusBtnEl = document.getElementById('addBonusBtn');
    if (addBonusBtnEl) {
        addBonusBtnEl.addEventListener('click', async () => {
            const inputEl = document.getElementById('newBonusText');
            const bonusText = inputEl ? inputEl.value.trim() : '';
            if (!bonusText) {
                showNotification('Текст бонуса не может быть пустым.', true);
                return;
            }
            
            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            const bonuses = foxenAutoReplies.randomBonuses || [];
            bonuses.push(bonusText);
            foxenAutoReplies.randomBonuses = bonuses;

            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
            renderBonusesList(bonuses);
            if (inputEl) inputEl.value = '';
        });
    }

    const bonusListContainer = document.getElementById('bonus-list-container');
    if (bonusListContainer) {
        bonusListContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-bonus-btn')) {
                const index = parseInt(e.target.dataset.index, 10);
                const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
                const bonuses = foxenAutoReplies.randomBonuses || [];
                bonuses.splice(index, 1);
                foxenAutoReplies.randomBonuses = bonuses;
                
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
                renderBonusesList(bonuses);
            }
        });
    }

    const kwListContainer = document.getElementById('keywords-list-container');
    if (kwListContainer) {
        kwListContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.fxn-edit-keyword-btn');
        if (editBtn) {
            const index = parseInt(editBtn.dataset.index, 10);
            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            const keywords = foxenAutoReplies.keywords || [];
            const rule = keywords[index];
            if (!rule) return;

            // load the rule into the add-form for editing
            editingKeywordIndex = index;
            kwInput.value = rule.keyword || '';
            kwResponse.value = rule.response || '';
            const modeRadio = document.querySelector(`input[name="newKeywordMatchMode"][value="${rule.matchMode || 'exact'}"]`);
            if (modeRadio) modeRadio.checked = true;

            // restore attached image (if any) onto the response field
            if (typeof __fptAttachments !== 'undefined') __fptAttachments.delete(kwResponse);
            delete kwResponse.dataset.fxnImages;
            delete kwResponse.dataset.fxnSendOrder;
            if (Array.isArray(rule.images) && rule.images.length) {
                const arr = rule.images.map(d => ({ id: Math.random().toString(36).slice(2, 8), dataUrl: d }));
                if (typeof __fptAttachments !== 'undefined') __fptAttachments.set(kwResponse, arr);
                kwResponse.dataset.fxnImages = JSON.stringify(rule.images);
                if (rule.sendOrder) kwResponse.dataset.fxnSendOrder = rule.sendOrder;
            }
            if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(kwResponse);

            addKeywordBtn.textContent = 'Сохранить изменения';
            addKeywordBtn.classList.add('fxn-editing-rule');
            // highlight the row being edited
            document.querySelectorAll('.keyword-item.fxn-editing').forEach(el => el.classList.remove('fxn-editing'));
            editBtn.closest('.keyword-item')?.classList.add('fxn-editing');
            kwInput.focus();
            kwInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const delBtn = e.target.closest('.delete-keyword-btn');
        if (delBtn) {
            const index = parseInt(delBtn.dataset.index, 10);
            const { foxenAutoReplies = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoReplies');
            const keywords = foxenAutoReplies.keywords || [];
            keywords.splice(index, 1);
            foxenAutoReplies.keywords = keywords;
            
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAutoReplies });
            renderKeywordsList(keywords);
            // if we were editing the deleted (or a shifted) rule, reset the form
            if (editingKeywordIndex === index) resetKeywordForm();
        }
    });
    }

    page.dataset.initialized = 'true';
}

function renderKeywordsList(keywords) {
    const listContainer = document.getElementById('keywords-list-container');
    if (!listContainer) return;
    
    if (keywords.length === 0) {
        listContainer.innerHTML = '<p class="template-info" style="text-align:center;">Нет правил для ключевых слов.</p>';
        return;
    }

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    listContainer.innerHTML = keywords.map((item, index) => {
        const modeBadge = item.matchMode === 'contains'
            ? '<span style="font-size:10px;background:#1e2030;padding:1px 5px;border-radius:3px;color:#7a7f9a;margin-left:4px;">содержит</span>'
            : '<span style="font-size:10px;background:#1e2030;padding:1px 5px;border-radius:3px;color:#7a7f9a;margin-left:4px;">точно</span>';
        // show a small icon if the rule has an attached image
        const imgMarker = (Array.isArray(item.images) && item.images.length)
            ? '<span class="material-symbols-rounded fxn-kw-img-marker" title="К правилу прикреплено изображение">image</span>'
            : '';
        return `
        <div class="keyword-item" data-index="${index}">
            <div class="keyword-pair">
                <span class="keyword-key">${esc(item.keyword)}</span>${modeBadge}
                <span class="keyword-arrow">→</span>
                <span class="keyword-value">${esc(item.response)}</span>${imgMarker}
            </div>
            <div class="fxn-kw-actions">
                <button class="fxn-edit-keyword-btn" data-index="${index}" title="Редактировать"><span class="material-symbols-rounded">edit</span></button>
                <button class="btn btn-default delete-keyword-btn" data-index="${index}">Удалить</button>
            </div>
        </div>`;
    }).join('');
}

function renderBonusesList(bonuses) {
    const listContainer = document.getElementById('bonus-list-container');
    if (!listContainer) return;
    
    if (!bonuses || bonuses.length === 0) {
        listContainer.innerHTML = '<p class="template-info" style="text-align:center;">Добавьте хотя бы один бонус.</p>';
        return;
    }

    listContainer.innerHTML = bonuses.map((text, index) => `
        <div class="bonus-item">
            <span class="bonus-text">${text}</span>
            <button class="btn btn-default delete-bonus-btn" data-index="${index}">Удалить</button>
        </div>
    `).join('');
}

async function initializeAutoReview() {
    // This function is no longer needed as all logic is in background.js
}
