// content/features/ai_lot_creator.js - Modern Material AI Lot Creator for Foxen

function createAIGeneratorUI() {
    const header = Array.from(document.querySelectorAll('h1.page-header, h1.page-header.page-header-no-hr'))
        .find(h1 => h1.textContent.includes('Добавление предложения') || h1.textContent.includes('Редактирование предложения'));

    if (!header) return;
    if (document.getElementById('foxen-ai-gen-btn')) return;

    let actionsContainer = document.querySelector('.foxen-lot-edit-actions-container');
    if (!actionsContainer) {
        actionsContainer = createElement('div', { class: 'foxen-lot-edit-actions-container' });
        header.parentNode.insertBefore(actionsContainer, header.nextSibling);
    }

    const button = createElement('button', { 
        class: 'btn btn-default foxen-ai-gen-btn', 
        id: 'foxen-ai-gen-btn' 
    }, {}, `
        <span class="material-symbols-rounded" style="font-size: 16px; margin-right: 4px; vertical-align: -3px; color: #60a5fa;">auto_awesome</span>
        ИИ-генерация
    `);

    actionsContainer.appendChild(button);

    const modal = createModal();
    document.body.appendChild(modal);

    setupAIGeneratorEventListeners(button, modal);
}

function createModal() {
    const modal = createElement('div', { class: 'foxen-ai-gen-modal', id: 'foxen-ai-gen-modal' });
    modal.innerHTML = `
        <div class="foxen-ai-gen-modal-content">
            <div class="foxen-ai-gen-modal-header">
                <div class="foxen-ai-header-title">
                    <div class="foxen-ai-header-icon-box">
                        <span class="material-symbols-rounded">auto_awesome</span>
                    </div>
                    <div>
                        <h3>ИИ-генератор лотов</h3>
                        <span class="foxen-ai-model-tag">
                            <span class="material-symbols-rounded">neurology</span>
                            Llama 3.3 70B Edge
                        </span>
                    </div>
                </div>
                <button class="close-btn" title="Закрыть (Esc)">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            
            <div class="foxen-ai-gen-modal-body">
                <!-- Быстрые пресеты категорий -->
                <div class="foxen-ai-presets-bar">
                    <span class="preset-label">Пресеты:</span>
                    <div class="preset-chips-scroll">
                        <button type="button" class="preset-chip" data-title="Игровой аккаунт" data-desc="Полный доступ, родная почта без привязок, гарантия, моментальная выдача">
                            <span class="material-symbols-rounded">person</span> Аккаунт
                        </button>
                        <button type="button" class="preset-chip" data-title="Внутриигровая валюта" data-desc="Быстрая передача, чистая валюта, без банов, работаем 24/7">
                            <span class="material-symbols-rounded">paid</span> Валюта
                        </button>
                        <button type="button" class="preset-chip" data-title="Пак файлов / Набор" data-desc="1000+ файлов в высоком качестве, ссылка на моментальный импорт, инструкция">
                            <span class="material-symbols-rounded">inventory_2</span> Набор / Пак
                        </button>
                        <button type="button" class="preset-chip" data-title="Услуга / Прокачка" data-desc="Быстрое выполнение, опытный игрок, полная безопасность и конфиденциальность">
                            <span class="material-symbols-rounded">bolt</span> Услуга
                        </button>
                    </div>
                </div>

                <!-- Поле названия -->
                <div class="foxen-ai-field-group">
                    <div class="field-label-row">
                        <label for="ai-prompt-title">
                            <span class="material-symbols-rounded">edit</span>
                            Что продаём? (Идея / Товар)
                        </label>
                        <span class="field-req">Обязательно</span>
                    </div>
                    <input type="text" id="ai-prompt-title" placeholder="Например: Пак эмодзи 1000+ штук или Аккаунт 50 LVL">
                </div>
                
                <!-- Поле описания -->
                <div class="foxen-ai-field-group">
                    <div class="field-label-row">
                        <label for="ai-prompt-desc">
                            <span class="material-symbols-rounded">description</span>
                            Детали и особенности товара
                        </label>
                        <span class="field-req">Обязательно</span>
                    </div>
                    <textarea id="ai-prompt-desc" rows="3" placeholder="Например: Мемы, реакции, анимированные, автовыдача, помощь в установке"></textarea>
                </div>

                <!-- Выбор ID пресета из каталога -->
                <div class="foxen-ai-field-group">
                    <div class="field-label-row">
                        <label for="ai-preset-id">
                            <span class="material-symbols-rounded">style</span>
                            ID пресета стиля (необязательно)
                        </label>
                        <a href="https://web.foxen.site/catalog.html" target="_blank" style="font-size: 11.5px; color: #60a5fa; text-decoration: none; display: inline-flex; align-items: center; gap: 2px;">
                            Каталог пресетов <span class="material-symbols-rounded" style="font-size: 13px;">open_in_new</span>
                        </a>
                    </div>
                    <input type="text" id="ai-preset-id" placeholder="Например: 101, 102 или выберите из каталога">
                </div>

                <!-- Настройки / Тогглы -->
                <div class="foxen-ai-options-card">
                    <label class="foxen-switch-row">
                        <div class="switch-info">
                            <span class="material-symbols-rounded switch-icon">mark_email_read</span>
                            <div>
                                <span class="switch-title">Сообщение покупателю</span>
                                <span class="switch-desc">Текст автовыдачи с инструкцией после оплаты</span>
                            </div>
                        </div>
                        <input type="checkbox" id="ai-gen-buyer-msg" checked>
                        <span class="switch-slider"></span>
                    </label>

                    <label class="foxen-switch-row">
                        <div class="switch-info">
                            <span class="material-symbols-rounded switch-icon">translate</span>
                            <div>
                                <span class="switch-title">Авто-перевод на английский</span>
                                <span class="switch-desc">Заполнить также английские вкладки лота</span>
                            </div>
                        </div>
                        <input type="checkbox" id="ai-gen-translate">
                        <span class="switch-slider"></span>
                    </label>
                </div>

                <!-- Встроенный интерактивный блок статусов и логов -->
                <div id="foxen-ai-status-panel" class="foxen-ai-status-panel" style="display: none;">
                    <div class="foxen-ai-status-header">
                        <span id="foxen-ai-status-icon" class="status-icon"></span>
                        <span id="foxen-ai-status-text" class="status-text">Готов к работе</span>
                    </div>
                    <div id="foxen-ai-status-details" class="foxen-ai-status-details"></div>
                </div>
            </div>

            <div class="foxen-ai-gen-modal-footer">
                <button type="button" class="foxen-btn-secondary close-btn-action">Отмена</button>
                <button id="ai-gen-submit-btn" class="foxen-btn-primary">
                    <span class="material-symbols-rounded btn-icon">auto_awesome</span>
                    <span class="btn-text">Сгенерировать лот</span>
                    <span class="btn-spinner"></span>
                </button>
            </div>
        </div>
    `;
    return modal;
}

function setupAIGeneratorEventListeners(button, modal) {
    button.addEventListener('click', () => {
        modal.classList.add('active');
        const statusPanel = modal.querySelector('#foxen-ai-status-panel');
        if (statusPanel) statusPanel.style.display = 'none';
        modal.querySelector('#ai-prompt-title').focus();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    modal.querySelectorAll('.close-btn, .close-btn-action').forEach(btn => {
        btn.addEventListener('click', () => modal.classList.remove('active'));
    });

    // Esc key close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });

    // Обработчик чипов пресетов
    modal.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const titleInput = modal.querySelector('#ai-prompt-title');
            const descInput = modal.querySelector('#ai-prompt-desc');
            titleInput.value = chip.dataset.title || '';
            descInput.value = chip.dataset.desc || '';
            titleInput.focus();
        });
    });

    modal.querySelector('#ai-gen-submit-btn').addEventListener('click', handleAIGeneration);
}

function setModalStatus(type, text, details = '') {
    const panel = document.getElementById('foxen-ai-status-panel');
    const icon = document.getElementById('foxen-ai-status-icon');
    const textEl = document.getElementById('foxen-ai-status-text');
    const detailsEl = document.getElementById('foxen-ai-status-details');

    if (!panel) return;
    panel.style.display = 'block';
    panel.className = `foxen-ai-status-panel status-${type}`;

    if (type === 'loading') {
        icon.innerHTML = '<span class="material-symbols-rounded spinning">sync</span>';
        textEl.textContent = text;
        detailsEl.innerHTML = details ? `<div class="status-log-text">${details}</div>` : '';
    } else if (type === 'success') {
        icon.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
        textEl.textContent = text;
        detailsEl.innerHTML = details ? `<div class="status-success-box">${details}</div>` : '';
    } else if (type === 'error') {
        icon.innerHTML = '<span class="material-symbols-rounded">error</span>';
        textEl.textContent = text;
        detailsEl.innerHTML = details ? `<div class="status-error-box">${details}</div>` : '';
    }
}

async function handleAIGeneration() {
    const submitBtn = document.getElementById('ai-gen-submit-btn');
    const promptTitle = document.getElementById('ai-prompt-title').value.trim();
    const promptDesc = document.getElementById('ai-prompt-desc').value.trim();
    const genBuyerMsg = document.getElementById('ai-gen-buyer-msg').checked;
    const doTranslate = document.getElementById('ai-gen-translate').checked;

    if (!promptTitle || !promptDesc) {
        setModalStatus('error', 'Заполните обязательные поля', 'Укажите краткую идею и ключевые детали лота.');
        return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        setModalStatus('loading', 'Считывание стиля ваших лотов...', 'Анализ оформления и эмодзи из вашего профиля FunPay...');

        let styleExamples = "Стиль не найден, используй естественный лаконичный стиль с эмодзи.";
        try {
            const profileLinkEl = document.querySelector('.user-link-dropdown[href*="/users/"]');
            if (profileLinkEl) {
                const response = await fetch(profileLinkEl.href);
                if (response.ok) {
                    const profileHtml = await response.text();
                    const parser = new DOMParser();
                    const profileDoc = parser.parseFromString(profileHtml, 'text/html');
                    const lotTitles = Array.from(profileDoc.querySelectorAll('.tc-desc-text')).map(el => el.textContent.trim()).slice(0, 15);
                    if (lotTitles.length > 0) {
                        styleExamples = lotTitles.join('\n');
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch style examples:", e);
        }

        const gameCategory = document.querySelector('.back-link .inside')?.textContent.trim() || 'Игры';
        const presetId = document.getElementById('ai-preset-id')?.value.trim() || null;

        setModalStatus('loading', presetId ? `Применение пресета ID ${presetId}...` : 'Генерация лота нейросетью...', 'Формирование названия, структуры описания и условий...');

        const aiResult = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
            action: 'generateAILot',
            data: {
                promptTitle,
                promptDesc,
                genBuyerMsg,
                styleExamples,
                gameCategory,
                presetId
            }
        });

        if (!aiResult || !aiResult.success) {
            throw new Error(aiResult?.error || 'Не удалось получить ответ от сервера ИИ.');
        }

        const ruTitle = aiResult.data.title || '';
        const ruDesc = aiResult.data.description || '';
        const ruBuyerMsg = aiResult.data.buyerMessage || '';

        // Вставка в русские поля формы FunPay
        const setField = (sel, val) => {
            const el = document.querySelector(sel);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        setField('input[name="fields[summary][ru]"]', ruTitle);
        setField('textarea[name="fields[desc][ru]"]', ruDesc);
        if (genBuyerMsg) setField('textarea[name="fields[payment_msg][ru]"]', ruBuyerMsg);

        let translationNote = '';
        if (doTranslate) {
            setModalStatus('loading', 'Перевод на английский язык...', 'Перевод заголовка и описания...');
            try {
                const translationResult = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
                    action: 'translateLotText',
                    data: { title: ruTitle, description: ruDesc, buyerMessage: ruBuyerMsg }
                });
                if (translationResult && translationResult.success) {
                    setField('input[name="fields[summary][en]"]', translationResult.data.title || '');
                    setField('textarea[name="fields[desc][en]"]', translationResult.data.description || '');
                    if (genBuyerMsg) setField('textarea[name="fields[payment_msg][en]"]', translationResult.data.buyerMessage || '');
                    translationNote = '<div class="trans-ok"><span class="material-symbols-rounded">done</span> Английские поля также заполнены</div>';
                }
            } catch (trErr) {
                console.warn("Translation failed:", trErr);
                translationNote = '<div class="trans-fail"><span class="material-symbols-rounded">warning</span> Перевод не удался, русские поля сохранены</div>';
            }
        }

        setModalStatus('success', 'Лот успешно сформирован!', `
            <div class="result-preview">
                <span class="preview-label">Заголовок:</span>
                <span class="preview-text">${ruTitle}</span>
            </div>
            ${translationNote}
            <div class="result-actions">
                <button type="button" class="foxen-btn-apply" onclick="document.getElementById('foxen-ai-gen-modal').classList.remove('active')">
                    <span class="material-symbols-rounded">check</span>
                    Применить и закрыть
                </button>
            </div>
        `);

    } catch (error) {
        console.error("AI Lot Generation Error:", error);
        setModalStatus('error', 'Ошибка генерации', `
            <div class="error-msg">${error.message}</div>
            <button type="button" class="foxen-btn-retry" onclick="document.getElementById('ai-gen-submit-btn').click()">
                <span class="material-symbols-rounded">refresh</span>
                Повторить попытку
            </button>
        `);
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function addTranslateButton() {
    const enTabLink = document.querySelector('.lot-fields-multilingual .nav-tabs li[data-locale="en"] a');
    if (!enTabLink || document.getElementById('foxen-translate-btn')) {
        return;
    }

    const translateBtn = createElement('button', {
        type: 'button',
        id: 'foxen-translate-btn',
        title: 'Перевести'
    }, {}, `
        <span class="material-symbols-rounded" style="font-size: 13px; margin-right: 3px; vertical-align: -2px;">translate</span>
        Перевод
    `);

    enTabLink.parentNode.insertBefore(translateBtn, enTabLink.nextSibling);

    translateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        translateBtn.innerHTML = '<span class="material-symbols-rounded spinning" style="font-size: 13px; margin-right: 3px; vertical-align: -2px;">sync</span> Перевожу...';
        translateBtn.disabled = true;

        try {
            const val = (sel) => { const el = document.querySelector(sel); return el ? el.value : null; };
            const ruTitle = val('input[name="fields[summary][ru]"]');
            const ruDesc  = val('textarea[name="fields[desc][ru]"]');
            const ruMsg   = val('textarea[name="fields[payment_msg][ru]"]');

            if (ruTitle === null && ruDesc === null && ruMsg === null) {
                showNotification('Не найдены русские поля лота на странице. Откройте вкладку «Русский» и попробуйте снова.', true);
                return;
            }

            const data = {
                title: ruTitle || '',
                description: ruDesc || '',
                buyerMessage: ruMsg || ''
            };

            if (!data.title && !data.description) {
                showNotification('Нечего переводить. Заполните русские поля.', true);
                return;
            }

            const result = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'translateLotText', data: data });

            if (result && result.success) {
                const setVal = (sel, v) => { const el = document.querySelector(sel); if (el) el.value = v || ''; };
                setVal('input[name="fields[summary][en]"]',     result.data.title);
                setVal('textarea[name="fields[desc][en]"]',     result.data.description);
                setVal('textarea[name="fields[payment_msg][en]"]', result.data.buyerMessage);
                showNotification('Текст успешно переведен!', false);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка перевода.');
            }

        } catch (error) {
            showNotification(`Ошибка перевода: ${error.message}`, true);
        } finally {
            translateBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 13px; margin-right: 3px; vertical-align: -2px;">translate</span> Перевод';
            translateBtn.disabled = false;
        }
    });
}

createAIGeneratorUI();
addTranslateButton();
