// content/features/lot_io.js

const IMPORT_PROCESS_KEY = 'fpToolsLotImportProcess'; // <-- ДОБАВЛЕНА ЭТА СТРОКА

// --- Функции для управления UI прогресс-бара экспорта ---

function createExportProgressBar() {
    // Удаляем старый бар, если он вдруг остался
    document.getElementById('fp-tools-export-progress-bar')?.remove();

    const bar = createElement('div', { id: 'fp-tools-export-progress-bar' });
    bar.innerHTML = `
        <div class="progress-bar-fill"></div>
        <div class="progress-bar-text">Подготовка к экспорту...</div>
    `;
    document.body.appendChild(bar);

    // Небольшая задержка перед анимацией появления
    requestAnimationFrame(() => {
        bar.style.transform = 'translateY(0)';
    });
}

function updateExportProgressBar(current, total, lotTitle) {
    const bar = document.getElementById('fp-tools-export-progress-bar');
    if (!bar) return;

    const fill = bar.querySelector('.progress-bar-fill');
    const text = bar.querySelector('.progress-bar-text');
    const percentage = total > 0 ? (current / total) * 100 : 0;

    fill.style.width = `${percentage}%`;
    text.textContent = `Экспорт [${current}/${total}]: ${lotTitle}`;
}

function removeExportProgressBar() {
    const bar = document.getElementById('fp-tools-export-progress-bar');
    if (!bar) return;
    
    // Анимация исчезновения
    bar.style.transform = 'translateY(100%)';
    // Удаляем элемент из DOM после завершения анимации
    setTimeout(() => bar.remove(), 500);
}


function initializeLotIO() {
    // Проверяем, был ли уже инициализирован
    const page = document.querySelector('.fp-tools-page-content[data-page="lot_io"]');
    if (!page || page.dataset.initialized) return;

    const exportBtn = document.getElementById('lot-io-export-btn');
    const importBtn = document.getElementById('lot-io-import-btn');
    const hiddenFileInput = document.getElementById('lot-io-import-file');
    const convertBtn = document.getElementById('convert-cardinal-lots-btn');

    exportBtn.addEventListener('click', showExportModal);
    importBtn.addEventListener('click', () => hiddenFileInput.click());
    hiddenFileInput.addEventListener('change', handleFileImport);

    if (convertBtn) {
        convertBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(chrome.runtime.getURL('background/remake.html'));
        });
    }

    // Слушатель прогресса импорта от background.js
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'lotImportProgressUpdate') {
            updateImportProgressUI(request.data);
        }
    });

    renderPendingImports();

    page.dataset.initialized = 'true';
}

async function showExportModal() {
    const modal = document.getElementById('lot-io-export-modal');
    const listContainer = modal.querySelector('.lot-io-category-list');
    modal.style.display = 'flex';
    listContainer.innerHTML = '<div class="fp-import-loader"></div>';

    try {
        const response = await chrome.runtime.sendMessage({ action: 'getUserCategories' });
        if (!response.success) throw new Error(response.error);

        const categories = response.data;
        if (categories && categories.length > 0) {
            listContainer.innerHTML = categories.map(cat => `
                <label class="lot-io-category-item">
                    <input type="checkbox" data-id="${cat.id}">
                    <span>${cat.name} (${cat.lots.length} лотов)</span>
                </label>
            `).join('');

            modal.querySelector('#lot-io-select-all').onclick = () => {
                const firstCheckbox = listContainer.querySelector('input');
                if (!firstCheckbox) return;
                const isChecked = firstCheckbox.checked;
                listContainer.querySelectorAll('input').forEach(cb => cb.checked = !isChecked);
            };

            modal.querySelector('#lot-io-export-confirm').onclick = async () => {
                const selectedCategoryIds = Array.from(listContainer.querySelectorAll('input:checked')).map(cb => cb.dataset.id);
                if (selectedCategoryIds.length === 0) {
                    showNotification('Выберите хотя бы одну категорию для экспорта.', true);
                    return;
                }
                modal.style.display = 'none';
                await startExportProcess(categories, selectedCategoryIds);
            };

        } else {
            listContainer.innerHTML = '<div class="fp-import-empty">Не найдено категорий на вашем профиле.</div>';
        }
    } catch (error) {
        listContainer.innerHTML = `<div class="fp-import-empty">Ошибка загрузки категорий: ${error.message}</div>`;
    }

    modal.querySelector('.fp-tools-modal-close').onclick = () => modal.style.display = 'none';
}

async function startExportProcess(allCategories, selectedCategoryIds) {
    const lotsToExport = [];
    allCategories.forEach(cat => {
        if (selectedCategoryIds.includes(cat.id)) {
            lotsToExport.push(...cat.lots);
        }
    });
    
    if (lotsToExport.length === 0) {
        showNotification('В выбранных категориях нет лотов для экспорта.', true);
        return;
    }

    createExportProgressBar();

    const exportedData = [];
    let processedCount = 0;
    const totalLots = lotsToExport.length;

    try {
        for (const lot of lotsToExport) {
            processedCount++;
            updateExportProgressBar(processedCount, totalLots, lot.title);

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'getLotForExport',
                    offerId: lot.id,
                    nodeId: lot.nodeId
                });
                if (response.success) {
                    exportedData.push({
                        sourceTitle: lot.title,
                        sourceCategory: lot.categoryName,
                        data: response.data
                    });
                } else {
                    throw new Error(response.error);
                }
            } catch (e) {
                console.error(`Ошибка при экспорте лота "${lot.title}": ${e.message}`);
                // Можно добавить маркер ошибки в UI, если нужно
            }
            await new Promise(resolve => setTimeout(resolve, 300)); // Задержка между запросами
        }

        if (exportedData.length > 0) {
            const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `funpay_lots_export_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification(`Экспорт ${exportedData.length} лотов завершен!`, false);
        } else {
            showNotification('Не удалось экспортировать ни одного лота.', true);
        }
    } finally {
        removeExportProgressBar();
    }
}


function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const lots = JSON.parse(e.target.result);
            if (!Array.isArray(lots) || lots.length === 0) {
                throw new Error("Файл пуст или имеет неверный формат.");
            }
            if (confirm(`Вы уверены, что хотите импортировать ${lots.length} лотов? Это действие создаст новые предложения на вашем аккаунте.`)) {
                await chrome.runtime.sendMessage({ action: 'startLotImport', lots: lots, fileName: file.name });
            }
        } catch (error) {
            showNotification(`Ошибка чтения файла: ${error.message}`, true);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Сбрасываем input
}

function updateImportProgressUI(processData) {
    const modal = document.getElementById('lot-io-import-progress-modal');
    modal.style.display = 'flex';

    const listContainer = modal.querySelector('.lot-io-progress-list');
    const summary = modal.querySelector('#lot-io-progress-summary');
    const continueBtn = modal.querySelector('#lot-io-continue-btn');
    const cancelBtn = modal.querySelector('#lot-io-cancel-btn');
    const postponeControls = modal.querySelector('#lot-io-postpone-controls');

    let html = '';
    let successCount = 0;
    let pendingCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    processData.lots.forEach((lot, index) => {
        let statusClass = '';
        let statusText = '';
        let skipButton = '';
        switch (lot.status) {
            case 'success':
                statusClass = 'status-success';
                statusText = 'Готово';
                successCount++;
                break;
            case 'pending':
                statusClass = 'status-pending';
                statusText = `В очереди (попытка ${lot.retries})...`;
                pendingCount++;
                skipButton = `<button class="btn btn-default skip-lot-btn" data-index="${index}">↪</button>`;
                break;
            case 'error':
                statusClass = 'status-error';
                statusText = `Ошибка: ${lot.error}`;
                errorCount++;
                skipButton = `<button class="btn btn-default skip-lot-btn" data-index="${index}">Пропустить</button>`;
                break;
            case 'skipped':
                statusClass = 'status-skipped';
                statusText = 'Пропущено';
                skippedCount++;
                break;
        }

        html += `
            <div class="lot-io-progress-item ${statusClass}">
                <span class="progress-item-title">${lot.sourceTitle || 'Лот без названия'}</span>
                <div class="progress-item-status-wrapper">
                    <span class="progress-item-status">${statusText}</span>
                    ${skipButton}
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;

    summary.textContent = `Готово: ${successCount} | В очереди: ${pendingCount} | Ошибки: ${errorCount} | Пропущено: ${skippedCount} | Всего: ${processData.lots.length}`;
    
    if (errorCount > 0 && pendingCount === 0 && !processData.finished) {
        continueBtn.style.display = 'inline-block';
    } else {
        continueBtn.style.display = 'none';
    }
    
    if (processData.state === 'postponed' || processData.finished) {
        postponeControls.style.display = 'none';
    } else {
        postponeControls.style.display = 'block';
    }

    if (processData.finished) {
        summary.textContent = `Импорт завершен! Успешно: ${successCount}, ошибки: ${errorCount}, пропущено: ${skippedCount}.`;
        continueBtn.style.display = 'none';
        cancelBtn.textContent = 'Закрыть';
        cancelBtn.onclick = () => modal.style.display = 'none';
    } else {
        cancelBtn.textContent = 'Отменить';
        cancelBtn.onclick = () => {
            if (confirm('Вы уверены, что хотите отменить импорт? Уже созданные лоты останутся.')) {
                chrome.runtime.sendMessage({ action: 'cancelLotImport' });
                modal.style.display = 'none';
            }
        };
        continueBtn.onclick = () => {
            chrome.runtime.sendMessage({ action: 'resumeLotImport' });
            continueBtn.style.display = 'none';
        };
    }

    // Обработчики для новых кнопок
    listContainer.querySelectorAll('.skip-lot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index, 10);
            chrome.runtime.sendMessage({ action: 'skipLotImportItem', index });
        });
    });

    const postponeBtn = document.getElementById('lot-io-postpone-btn');
    if (postponeBtn) {
        postponeBtn.onclick = () => {
            if (confirm('Если процесс импорта завис на 5-й попытке, возможно, FunPay выдал лимит на создание лотов. Отложить импорт на 24 часа?')) {
                chrome.runtime.sendMessage({ action: 'postponeLotImport' }).then(() => {
                    modal.style.display = 'none';
                    showNotification('Импорт отложен. Вы можете возобновить его на этой же вкладке.', false);
                    renderPendingImports(); // Обновляем список отложенных
                });
            }
        };
    }
}

async function renderPendingImports() {
    const container = document.getElementById('lot-io-pending-imports-list');
    if (!container) return;

    try {
        const { [IMPORT_PROCESS_KEY]: process } = await chrome.storage.local.get(IMPORT_PROCESS_KEY);

        if (process && process.state === 'postponed') {
            container.innerHTML = `
                <div class="pending-import-item">
                    <span class="pending-import-name">${process.name}</span>
                    <div class="pending-import-actions">
                        <button class="btn resume-import-btn">Продолжить</button>
                        <button class="btn btn-default delete-import-btn">Удалить</button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="template-info">Здесь будут отображаться отложенные процессы импорта.</p>';
        }
        
        container.querySelector('.resume-import-btn')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'resumeLotImport' });
            container.innerHTML = '<p class="template-info">Возобновление...</p>';
        });
        
        container.querySelector('.delete-import-btn')?.addEventListener('click', () => {
            if(confirm('Удалить этот отложенный импорт?')) {
                chrome.runtime.sendMessage({ action: 'cancelLotImport' });
                renderPendingImports();
            }
        });

    } catch (error) {
        container.innerHTML = `<p class="template-info" style="color: #ff6b6b;">Ошибка загрузки отложенных импортов: ${error.message}</p>`;
    }
}