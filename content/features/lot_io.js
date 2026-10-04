// content/features/lot_io.js

const IMPORT_PROCESS_KEY = 'foxenLotImportProcess'; // <-- ДОБАВЛЕНА ЭТА СТРОКА

// --- Функции для управления UI прогресс-бара экспорта ---

function createExportProgressBar() {
    // Удаляем старый бар, если он вдруг остался
    document.getElementById('foxen-export-progress-bar')?.remove();

    const bar = createElement('div', { id: 'foxen-export-progress-bar' });
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
    const bar = document.getElementById('foxen-export-progress-bar');
    if (!bar) return;

    const fill = bar.querySelector('.progress-bar-fill');
    const text = bar.querySelector('.progress-bar-text');
    const percentage = total > 0 ? (current / total) * 100 : 0;

    fill.style.width = `${percentage}%`;
    text.textContent = `Экспорт [${current}/${total}]: ${lotTitle}`;
}

function removeExportProgressBar() {
    const bar = document.getElementById('foxen-export-progress-bar');
    if (!bar) return;
    
    // Анимация исчезновения
    bar.style.transform = 'translateY(100%)';
    // Удаляем элемент из DOM после завершения анимации
    setTimeout(() => bar.remove(), 500);
}


function initializeLotIO() {
    // Проверяем наличие страницы Экспорт / Импорт или Управление лотами
    const page = document.querySelector('.foxen-page-content[data-page="settings_io"]') || document.querySelector('.foxen-page-content[data-page="lot_io"]');
    if (!page || page.dataset.lotIoInitialized) return;

    const exportBtn = document.getElementById('lot-io-export-btn');
    const importBtn = document.getElementById('lot-io-import-btn');
    const hiddenFileInput = document.getElementById('lot-io-import-file');
    const convertBtn = document.getElementById('convert-cardinal-lots-btn');

    if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.dataset.bound = '1';
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showExportModal();
        });
    }
    if (importBtn && !importBtn.dataset.bound) {
        importBtn.dataset.bound = '1';
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hiddenFileInput?.click();
        });
    }
    if (hiddenFileInput && !hiddenFileInput.dataset.bound) {
        hiddenFileInput.dataset.bound = '1';
        hiddenFileInput.addEventListener('change', handleFileImport);
    }

    if (convertBtn && !convertBtn.dataset.bound) {
        convertBtn.dataset.bound = '1';
        convertBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(chrome.runtime.getURL('background/remake.html'));
        });
    }

    page.dataset.lotIoInitialized = 'true';

    // Слушатель событий импорта от background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'lotImportProgressUpdate') {
            updateImportProgressUI(request.data);
            return;
        }
        if (request.action === 'foxenProxyFetch') {
            (async () => {
                try {
                    const init = {
                        method: request.options?.method || 'GET',
                        credentials: 'include'
                    };
                    if (request.options?.headers) {
                        init.headers = request.options.headers;
                    }
                    if (request.options?.body) {
                        init.body = request.options.body;
                    }
                    const res = await fetch(request.url, init);
                    const text = await res.text();
                    sendResponse({ success: true, status: res.status, text, ok: res.ok });
                } catch (err) {
                    sendResponse({ success: false, error: err.message });
                }
            })();
            return true;
        }
    });

    // Восстанавливаем окно прогресса, если процесс импорта уже выполняется в фоне
    (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(IMPORT_PROCESS_KEY, (res) => {
        const proc = res && res[IMPORT_PROCESS_KEY];
        if (proc && proc.state === 'running' && !proc.finished) {
            updateImportProgressUI(proc);
        }
    });

    renderPendingImports();

    page.dataset.initialized = 'true';
}

async function showExportModal() {
    const modal = document.getElementById('lot-io-export-modal');
    const listContainer = modal.querySelector('.lot-io-category-list');
    modal.style.display = 'flex';
    modal.style.zIndex = '20000000';
    listContainer.innerHTML = '<div class="fp-import-loader"></div>';

    try {
        const response = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getUserCategories' });
        if (!response.success) throw new Error(response.error);

        const categories = response.data;
        if (categories && categories.length > 0) {
            listContainer.innerHTML = categories.map(cat => `
                <label class="lot-io-category-item">
                    <input type="checkbox" data-id="${cat.id}">
                    <span class="lot-io-cat-name">${cat.name}</span>
                    <span class="lot-io-cat-count">${cat.lots ? cat.lots.length : 0} лотов</span>
                </label>
            `).join('');

            modal.querySelector('#lot-io-select-all').onclick = () => {
                const firstCheckbox = listContainer.querySelector('input');
                if (!firstCheckbox) return;
                const isChecked = firstCheckbox.checked;
                listContainer.querySelectorAll('input').forEach(cb => cb.checked = !isChecked);
            };

            modal.querySelector('#lot-io-export-confirm').onclick = async () => {
                if (isLotIoExportRunning) {
                    showNotification('Экспорт лотов уже выполняется...', true);
                    return;
                }
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

    modal.querySelector('.foxen-modal-close').onclick = () => modal.style.display = 'none';
}

let isLotIoExportRunning = false;

async function startExportProcess(allCategories, selectedCategoryIds) {
    if (isLotIoExportRunning) {
        showNotification('Экспорт лотов уже выполняется...', true);
        return;
    }
    isLotIoExportRunning = true;

    try {
        const lotsToExport = [];
        const seenLotIds = new Set();
        allCategories.forEach(cat => {
            if (selectedCategoryIds.includes(String(cat.id))) {
                (cat.lots || []).forEach(lot => {
                    const lotIdStr = String(lot.id);
                    if (!seenLotIds.has(lotIdStr)) {
                        seenLotIds.add(lotIdStr);
                        lotsToExport.push(lot);
                    }
                });
            }
        });
        
        if (lotsToExport.length === 0) {
            showNotification('В выбранных категориях нет лотов для экспорта.', true);
            return;
        }

        createExportProgressBar();

        const exportedData = [];
        const exportedLotIds = new Set();
        let processedCount = 0;
        const totalLots = lotsToExport.length;

        for (const lot of lotsToExport) {
            const lotIdStr = String(lot.id);
            if (exportedLotIds.has(lotIdStr)) continue;

            processedCount++;
            updateExportProgressBar(processedCount, totalLots, lot.title);

            let attempts = 0;
            let success = false;
            while (attempts < 2 && !success) {
                attempts++;
                try {
                    const response = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
                        action: 'getLotForExport',
                        offerId: lot.id,
                        nodeId: lot.nodeId
                    });
                    if (response && response.success) {
                        if (!exportedLotIds.has(lotIdStr)) {
                            exportedLotIds.add(lotIdStr);
                            exportedData.push({
                                sourceTitle: lot.title,
                                sourceCategory: lot.categoryName || '',
                                data: response.data
                            });
                        }
                        success = true;
                    } else {
                        throw new Error(response?.error || 'Не удалось получить данные лота');
                    }
                } catch (e) {
                    if (String(e.message || e).includes('429')) {
                        console.warn(`[Lot IO Export] 429 rate limit on lot "${lot.title}", waiting 10s...`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    } else {
                        console.error(`Ошибка при экспорте лота "${lot.title}": ${e.message}`);
                        break;
                    }
                }
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
        isLotIoExportRunning = false;
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
                throw new Error("Файл пуст или имеет неверный формат (ожидается массив лотов).");
            }
            if (confirm(`Вы уверены, что хотите импортировать ${lots.length} лотов? Это действие создаст новые предложения на вашем аккаунте.`)) {
                // Сразу открываем модальное окно прогресса
                const initialProcess = {
                    name: file.name || `Импорт от ${new Date().toLocaleString()}`,
                    state: 'running',
                    lots: lots.map(lot => ({
                        sourceTitle: lot.sourceTitle || lot.title || (lot.data && (lot.data['fields[summary][ru]'] || lot.data['fields[name][ru]'])) || `Лот #${lot.id || ''}`,
                        status: 'pending',
                        retries: 0,
                        error: null
                    })),
                    currentIndex: 0
                };
                updateImportProgressUI(initialProcess);

                const resp = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
                    action: 'startLotImport',
                    lots: lots,
                    fileName: file.name
                });
                if (resp && !resp.success) {
                    throw new Error(resp.error || 'Не удалось запустить процесс импорта');
                }
            }
        } catch (error) {
            showNotification(`Ошибка импорта лотов: ${error.message}`, true);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Сбрасываем input
}

function updateImportProgressUI(processData) {
    if (!processData || !processData.lots) return;
    const modal = document.getElementById('lot-io-import-progress-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.style.zIndex = '20000000';

    const closeBtn = modal.querySelector('.foxen-modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (processData.finished || processData.state === 'postponed') {
                modal.style.display = 'none';
            } else if (confirm('Закрыть окно прогресса? Процесс импорта продолжит выполняться в фоне.')) {
                modal.style.display = 'none';
            }
        };
    }

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

    const escapeText = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    };

    processData.lots.forEach((lot, index) => {
        let statusClass = '';
        let statusBadgeText = '';
        let iconName = '';
        let skipButton = '';
        let errorDetail = '';

        switch (lot.status) {
            case 'success':
                statusClass = 'status-success';
                statusBadgeText = 'Готово';
                iconName = 'check_circle';
                successCount++;
                if (lot.newId) {
                    errorDetail = `<div class="progress-item-success-link" style="margin-top:3px;"><a href="https://funpay.com/lots/offerEdit?offer=${lot.newId}" target="_blank" style="color:var(--fxn-primary,#a855f7); font-size:11px; text-decoration:underline;">Лот #${lot.newId} ↗</a></div>`;
                }
                break;
            case 'pending':
                statusClass = 'status-pending';
                statusBadgeText = lot.retries > 0 ? `Попытка ${lot.retries}` : 'В очереди';
                iconName = 'hourglass_top';
                pendingCount++;
                if (lot.error) {
                    errorDetail = `<div class="progress-item-error-msg" style="color:var(--fxn-warning,#f59e0b); font-size:11px; margin-top:3px;" title="${escapeText(lot.error)}">${escapeText(lot.error)}</div>`;
                }
                skipButton = `<button class="btn-lot-skip skip-lot-btn" data-index="${index}" title="Пропустить этот лот" type="button"><span class="material-symbols-rounded">skip_next</span></button>`;
                break;
            case 'error':
                statusClass = 'status-error';
                statusBadgeText = 'Ошибка';
                iconName = 'error';
                errorCount++;
                errorDetail = `<div class="progress-item-error-msg" title="${escapeText(lot.error)}">${escapeText(lot.error)}</div>`;
                skipButton = `<button class="btn-lot-skip skip-lot-btn" data-index="${index}" title="Пропустить этот лот" type="button"><span class="material-symbols-rounded">skip_next</span></button>`;
                break;
            case 'skipped':
                statusClass = 'status-skipped';
                statusBadgeText = 'Пропущено';
                iconName = 'redo';
                skippedCount++;
                break;
        }

        const title = escapeText(lot.sourceTitle || 'Лот без названия');

        html += `
            <div class="lot-io-progress-item ${statusClass}">
                <div class="progress-item-icon ${statusClass}">
                    <span class="material-symbols-rounded">${iconName}</span>
                </div>
                <div class="progress-item-info">
                    <div class="progress-item-title" title="${title}">${title}</div>
                    ${errorDetail}
                </div>
                <div class="progress-item-status-wrapper">
                    <span class="progress-item-badge ${statusClass}">${statusBadgeText}</span>
                    ${skipButton}
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;

    const totalLots = processData.lots.length;
    const processedCount = successCount + errorCount + skippedCount;
    const progressPercent = totalLots > 0 ? Math.round((processedCount / totalLots) * 100) : 0;

    summary.innerHTML = `
        <div class="lot-io-progress-header">
            <div class="lot-io-progress-meta">
                <span class="lot-io-progress-title">${escapeText(processData.name || 'Импорт предложений')}</span>
                <span class="lot-io-progress-percent">${progressPercent}%</span>
            </div>
            <div class="lot-io-progress-track">
                <div class="lot-io-progress-bar" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="lot-io-stats-chips">
                <div class="lot-io-chip chip-success" title="Успешно создано">
                    <span class="material-symbols-rounded">check_circle</span>
                    <span>${successCount} Готово</span>
                </div>
                <div class="lot-io-chip chip-pending" title="В очереди">
                    <span class="material-symbols-rounded">hourglass_top</span>
                    <span>${pendingCount} В очереди</span>
                </div>
                <div class="lot-io-chip chip-error" title="Ошибки">
                    <span class="material-symbols-rounded">error</span>
                    <span>${errorCount} Ошибок</span>
                </div>
                <div class="lot-io-chip chip-skipped" title="Пропущено">
                    <span class="material-symbols-rounded">redo</span>
                    <span>${skippedCount} Пропущено</span>
                </div>
                <div class="lot-io-chip chip-total" title="Всего в файле">
                    <span class="material-symbols-rounded">inventory_2</span>
                    <span>${totalLots} Всего</span>
                </div>
            </div>
            ${processData.finished ? `
                <div class="lot-io-finish-banner">
                    <span class="material-symbols-rounded">task_alt</span>
                    <div>
                        <strong>Импорт успешно завершен!</strong>
                        <p>Успешно: ${successCount} · Ошибок: ${errorCount} · Пропущено: ${skippedCount}</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    if (errorCount > 0 && pendingCount === 0 && !processData.finished && processData.state !== 'running') {
        continueBtn.style.display = 'inline-flex';
    } else {
        continueBtn.style.display = 'none';
    }
    
    if (processData.state === 'postponed' || processData.finished) {
        postponeControls.style.display = 'none';
    } else {
        postponeControls.style.display = 'block';
    }

    if (processData.finished) {
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

    // Обработчики для кнопок пропуска
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
                const extApi = typeof browser !== 'undefined' ? browser : chrome;
                extApi.runtime.sendMessage({ action: 'postponeLotImport' }, () => {
                    modal.style.display = 'none';
                    showNotification('Импорт отложен. Вы можете возобновить его на этой же вкладке.', false);
                    renderPendingImports();
                });
            }
        };
    }
}

async function renderPendingImports() {
    const container = document.getElementById('lot-io-pending-imports-list');
    if (!container) return;

    try {
        const { [IMPORT_PROCESS_KEY]: process } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(IMPORT_PROCESS_KEY);

        if (process && process.state === 'postponed') {
            const pendingLots = (process.lots || []).filter(l => l.status === 'pending' || l.status === 'error').length;
            container.innerHTML = `
                <div class="lot-io-pending-card">
                    <div class="lot-io-pending-icon">
                        <span class="material-symbols-rounded">pause_circle</span>
                    </div>
                    <div class="lot-io-pending-details">
                        <div class="pending-import-name">${process.name || 'Отложенный импорт'}</div>
                        <div class="pending-import-sub">Осталось обработать: ${pendingLots} из ${process.lots?.length || 0} лотов. Процесс приостановлен из-за лимитов FunPay.</div>
                    </div>
                    <div class="pending-import-actions">
                        <button class="btn btn-solid btn-sm resume-import-btn" type="button">
                            <span class="material-symbols-rounded" style="font-size:16px;">play_arrow</span>
                            <span>Продолжить</span>
                        </button>
                        <button class="btn btn-ghost btn-sm delete-import-btn" type="button" title="Удалить отложенный импорт">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="lot-io-pending-empty">
                    <span class="material-symbols-rounded">schedule</span>
                    <span>Нет активных отложенных процессов импорта</span>
                </div>
            `;
        }
        
        container.querySelector('.resume-import-btn')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'resumeLotImport' });
            container.innerHTML = `
                <div class="lot-io-pending-empty">
                    <span class="material-symbols-rounded">autorenew</span>
                    <span>Возобновление процесса...</span>
                </div>
            `;
        });
        
        container.querySelector('.delete-import-btn')?.addEventListener('click', () => {
            if (confirm('Удалить этот отложенный импорт?')) {
                chrome.runtime.sendMessage({ action: 'cancelLotImport' });
                renderPendingImports();
            }
        });

    } catch (error) {
        container.innerHTML = `
            <div class="lot-io-pending-empty">
                <span class="material-symbols-rounded">error</span>
                <span>Ошибка загрузки отложенных импортов: ${error.message}</span>
            </div>
        `;
    }
}