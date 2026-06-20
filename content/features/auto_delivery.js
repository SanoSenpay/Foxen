// content/features/auto_delivery.js

async function initializeAutoDeliveryManager() {
    if (document.getElementById('ad-manager-placeholder')) return;

    const autoDeliveryBox = document.querySelector('.auto-delivery-box');
    const secretsTextarea = autoDeliveryBox?.querySelector('textarea.textarea-lot-secrets');
    const amountInput = document.querySelector('input[name="amount"]');
    if (!autoDeliveryBox || !secretsTextarea || !amountInput) return;

    const ITEM_CHAR_LIMIT = 140;

    // --- 1. Создаем основной контейнер на странице ---
    const placeholder = createElement('div', { id: 'ad-manager-placeholder' });
    placeholder.innerHTML = `
        <div class="ad-controls-wrapper">
            <button type="button" id="ad-open-manager-btn" class="btn btn-primary">Управлять товарами</button>
            <label id="ad-legacy-mode-toggle" class="fp-tools-chat-toggle fp-tooltip-host" data-fp-tooltip="Включить стандартный режим автовыдачи">
                <input type="checkbox" id="ad-legacy-mode-checkbox">
                <span class="fp-tools-chat-toggle-slider">
                    <span class="material-icons">edit_document</span>
                </span>
            </label>
        </div>
        <span id="ad-item-count-display"></span>
        <div id="ad-reload-notice" style="display: none;">Перезагрузите страницу, чтобы снова включить улучшенный менеджер.</div>
    `;
    
    const originalHelpBlock = secretsTextarea.nextElementSibling;
    if(originalHelpBlock) originalHelpBlock.style.display = 'none';
    autoDeliveryBox.appendChild(placeholder);

    // --- 2. Получаем ссылки на все элементы ---
    const openBtn = document.getElementById('ad-open-manager-btn');
    const toggle = document.getElementById('ad-legacy-mode-checkbox');
    const reloadNotice = document.getElementById('ad-reload-notice');
    const countDisplay = document.getElementById('ad-item-count-display');

    // --- 3. Привязываем обработчик к переключателю ---
    toggle.addEventListener('change', async (e) => {
        const isLegacy = e.target.checked;
        await chrome.storage.local.set({ fpToolsLegacyADModeEnabled: isLegacy });

        if (isLegacy) {
            openBtn.style.display = 'none';
            countDisplay.style.display = 'none';
            secretsTextarea.style.display = 'block';
            reloadNotice.style.display = 'none';
        } else {
            // Если выключили стандартный режим, показываем уведомление
            openBtn.style.display = 'none'; // Кнопка все равно не будет работать до перезагрузки
            countDisplay.style.display = 'none';
            secretsTextarea.style.display = 'none';
            reloadNotice.style.display = 'block';
        }
    });
    
    // --- 4. Проверяем сохраненный режим и настраиваем UI ---
    const { fpToolsLegacyADModeEnabled } = await chrome.storage.local.get('fpToolsLegacyADModeEnabled');

    if (fpToolsLegacyADModeEnabled) {
        // РЕЖИМ СТАНДАРТНОЙ АВТОВЫДАЧИ
        secretsTextarea.style.display = 'block';
        openBtn.style.display = 'none';
        countDisplay.style.display = 'none';
        toggle.checked = true;
    } else {
        // РЕЖИМ УЛУЧШЕННОГО МЕНЕДЖЕРА
        secretsTextarea.style.display = 'none';
        openBtn.style.display = 'block';
        countDisplay.style.display = 'block';
        toggle.checked = false;
        
        // --- 5. Создаем модальное окно и всю его логику ТОЛЬКО если активен улучшенный режим ---
        const managerPopup = createAdvancedManagerModal();

        openBtn.addEventListener('click', () => {
            populatePopupFromOriginal();
            managerPopup.style.display = 'flex';
        });

        const popupItemList = managerPopup.querySelector('#ad-items-list-popup');
        const popupItemCount = managerPopup.querySelector('#ad-item-count');

        const updateItemCount = () => {
            const count = popupItemList.children.length;
            popupItemCount.textContent = `Товаров: ${count}`;
        };

        const createItemRow = (content = '') => {
            const row = createElement('div', { class: 'ad-item-row' });
            const input = createElement('textarea', { class: 'ad-item-input', rows: '1' });
            input.value = content;
            const autoResize = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; };
            input.addEventListener('input', () => { autoResize(); updateCharCounter(input, counter); });
            const controls = createElement('div', { class: 'ad-item-controls' });
            const counter = createElement('div', { class: 'ad-char-counter' });
            const removeBtn = createElement('button', { type: 'button', class: 'ad-remove-item-btn', title: 'Удалить' }, {}, '×');
            removeBtn.addEventListener('click', () => { row.remove(); updateItemCount(); });
            controls.append(removeBtn, counter);
            row.append(input, controls);
            popupItemList.appendChild(row);
            autoResize();
            updateCharCounter(input, counter);
        };

        const updateCharCounter = (inputEl, counterEl) => {
            const len = inputEl.value.replace(/\n/g, '\\n').length;
            counterEl.textContent = `${len}/${ITEM_CHAR_LIMIT}`;
            counterEl.classList.toggle('limit-exceeded', len > ITEM_CHAR_LIMIT);
        };

        const populatePopupFromOriginal = () => {
            popupItemList.innerHTML = '';
            const rawValue = secretsTextarea.value.trim();
            if (rawValue) {
                const items = rawValue.split('\n').filter(line => line.trim() !== '');
                items.forEach(item => createItemRow(item.replace(/\\n/g, '\n')));
            }
            updateItemCount();
        };

        const closeWithoutSaving = () => managerPopup.style.display = 'none';

        const saveAndCloseManager = () => {
            const itemInputs = popupItemList.querySelectorAll('.ad-item-input');
            const values = Array.from(itemInputs).map(input => input.value.replace(/\n/g, '\\n'));
            secretsTextarea.value = values.join('\n');
            amountInput.value = values.length;
            countDisplay.textContent = `Загружено товаров: ${values.length}`;
            secretsTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            closeWithoutSaving();
            showNotification('Товары обновлены. Не забудьте сохранить сам лот.', false);
        };

        // --- ИСПРАВЛЕНИЕ: ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА ---
        managerPopup.querySelector('#ad-add-item-btn').addEventListener('click', () => { createItemRow(); updateItemCount(); });
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
        
        managerPopup.querySelector('#ad-manager-close-btn').addEventListener('click', saveAndCloseManager);
        managerPopup.querySelector('#ad-manager-save-btn').addEventListener('click', saveAndCloseManager);
        managerPopup.querySelector('#ad-manager-cancel-btn').addEventListener('click', closeWithoutSaving);
        
        managerPopup.querySelector('#ad-clear-all-btn').addEventListener('click', () => { if (confirm('Удалить все товары?')) { popupItemList.innerHTML = ''; updateItemCount(); }});
        
        const massAddPopup = document.getElementById('ad-mass-add-popup');
        const duplicatePopup = document.getElementById('ad-duplicate-popup');
        const showPopup = (popupEl) => popupEl.style.display = 'block';
        const hidePopup = (popupEl) => popupEl.style.display = 'none';

        managerPopup.querySelector('#ad-mass-add-btn').addEventListener('click', () => showPopup(massAddPopup));
        document.getElementById('ad-mass-add-cancel').addEventListener('click', () => hidePopup(massAddPopup));
        document.getElementById('ad-mass-add-confirm').addEventListener('click', () => {
            const textarea = document.getElementById('ad-mass-add-textarea');
            textarea.value.trim().split('\n').filter(Boolean).forEach(createItemRow);
            updateItemCount();
            textarea.value = '';
            hidePopup(massAddPopup);
        });

        managerPopup.querySelector('#ad-duplicate-btn').addEventListener('click', () => showPopup(duplicatePopup));
        document.getElementById('ad-duplicate-cancel').addEventListener('click', () => hidePopup(duplicatePopup));
        document.getElementById('ad-duplicate-confirm').addEventListener('click', () => {
            const textarea = document.getElementById('ad-duplicate-textarea');
            const amount = parseInt(document.getElementById('ad-duplicate-amount').value, 10);
            if (textarea.value && amount > 0) { for (let i = 0; i < amount; i++) createItemRow(textarea.value); updateItemCount(); }
            textarea.value = '';
            hidePopup(duplicatePopup);
        });
    }

    // --- 6. Обновляем счетчик на странице в любом случае ---
    const updateInitialCount = () => {
        const lines = secretsTextarea.value.trim().split('\n').filter(Boolean);
        countDisplay.textContent = `Загружено товаров: ${lines.length}`;
    };
    updateInitialCount();
    secretsTextarea.addEventListener('input', updateInitialCount); // Обновляем счетчик при ручном вводе в стандартном режиме
}

// Вспомогательная функция, вынесена наружу
function createAdvancedManagerModal() {
    // Создаем модальные окна, только если их еще нет
    if (!document.getElementById('fp-tools-ad-manager-popup')) {
        const managerPopup = createElement('div', { id: 'fp-tools-ad-manager-popup' });
        managerPopup.innerHTML = `
            <div class="ad-manager-popup-header">
                <h3>Менеджер товаров</h3>
                <button type="button" class="close-btn" id="ad-manager-close-btn">×</button>
            </div>
            <div class="ad-manager-popup-body">
                <div class="ad-manager-toolbar">
                    <button type="button" id="ad-add-item-btn" class="btn">+ Добавить товар</button>
                    <button type="button" id="ad-mass-add-btn" class="btn">Массовое добавление</button>
                    <button type="button" id="ad-duplicate-btn" class="btn">Дублировать</button>
                    <button type="button" id="ad-clear-all-btn" class="btn btn-default">Очистить всё</button>
                    <span id="ad-item-count">Товаров: 0</span>
                </div>
                <div class="ad-items-list" id="ad-items-list-popup"></div>
            </div>
            <div class="ad-manager-popup-footer">
                <button type="button" id="ad-manager-cancel-btn" class="btn btn-default">Отмена</button>
                <button type="button" id="ad-manager-save-btn" class="btn btn-primary">Сохранить и закрыть</button>
            </div>`;
        document.body.appendChild(managerPopup);

        const massAddPopup = createElement('div', { id: 'ad-mass-add-popup', class: 'fp-tools-ad-popup' });
        massAddPopup.innerHTML = `<h4>Массовое добавление</h4><p style="font-size: 14px; color: #ccc; margin-top: -10px; margin-bottom: 15px;">Вставьте список товаров, каждый с новой строки.</p><textarea id="ad-mass-add-textarea" class="template-input" placeholder="Товар 1\nТовар 2\nТовар 3..."></textarea><div class="popup-actions"><button type="button" id="ad-mass-add-cancel" class="btn btn-default">Отмена</button><button type="button" id="ad-mass-add-confirm" class="btn">Добавить</button></div>`;
        document.body.appendChild(massAddPopup);

        const duplicatePopup = createElement('div', { id: 'ad-duplicate-popup', class: 'fp-tools-ad-popup' });
        duplicatePopup.innerHTML = `<h4>Дублирование товара</h4><p style="font-size: 14px; color: #ccc; margin-top: -10px; margin-bottom: 15px;">Введите текст товара (можно многострочный) и количество копий.</p><textarea id="ad-duplicate-textarea" class="template-input" placeholder="Текст товара..."></textarea><input type="number" id="ad-duplicate-amount" class="template-input" placeholder="Количество" min="1" value="10"><div class="popup-actions"><button type="button" id="ad-duplicate-cancel" class="btn btn-default">Отмена</button><button type="button" id="ad-duplicate-confirm" class="btn">Создать</button></div>`;
        document.body.appendChild(duplicatePopup);
    }
    return document.getElementById('fp-tools-ad-manager-popup');
}