// content/features/multi_clone.js
// Позволяет экспортировать выбранные лоты в JSON файл с поддержкой повторного открытия окна логов, выбора сбойных лотов и монохромным glassmorphism дизайном.
// Интегрировано в режим выбора ("Выбрать") и всплывающую панель действий (.actions).

(function () {
    'use strict';

    let activeExportLogger = null;
    let isExportRunning = false;

    function ownUserId() {
        const a = document.querySelector('.user-link-dropdown[href*="/users/"]');
        const m = a?.getAttribute('href')?.match(/\/users\/(\d+)/);
        if (m) return m[1];
        try {
            const raw = document.body?.dataset?.appData;
            if (raw) { const d = JSON.parse(raw); return String((Array.isArray(d) ? d[0] : d)?.userId || '') || null; }
        } catch (_) {}
        return null;
    }
    function profileUserId() {
        const m = window.location.pathname.match(/\/users\/(\d+)/);
        return m ? m[1] : null;
    }
    function isForeignProfile() {
        const pid = profileUserId();
        if (!pid) return false;
        const own = ownUserId();
        return own && pid !== own;
    }

    function sendMessageWithTimeout(message, timeoutMs = 45000) {
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                timer = null;
                reject(new Error('Превышено время ожидания ответа от расширения (45 сек).'));
            }, timeoutMs);

            const api = (typeof browser !== 'undefined' ? browser : chrome);
            api.runtime.sendMessage(message, (response) => {
                if (!timer) return; // уже сработал таймаут
                clearTimeout(timer);
                if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message || 'Ошибка передачи сообщения расширения.'));
                } else {
                    resolve(response);
                }
            });
        });
    }

    function selectLotsByIds(ids) {
        if (!ids || !ids.length) return;
        
        // Сначала снимаем отметки со всех лотов
        const allChecked = document.querySelectorAll('.tc-item .lot-box input:checked');
        allChecked.forEach(chk => {
            chk.checked = false;
            chk.dispatchEvent(new Event('change', { bubbles: true }));
        });

        let selectedCount = 0;
        const targetSet = new Set(ids);
        const allItems = document.querySelectorAll('a.tc-item');
        allItems.forEach(a => {
            const href = a.getAttribute('href') || '';
            const m = href.match(/[?&]id=(\d+)/) || href.match(/offer=(\d+)/) || (a.getAttribute('data-offer') ? [null, a.getAttribute('data-offer')] : null);
            if (m && m[1] && targetSet.has(m[1])) {
                const chk = a.querySelector('.lot-box input');
                if (chk) {
                    chk.checked = true;
                    chk.dispatchEvent(new Event('change', { bubbles: true }));
                    selectedCount++;
                }
            }
        });

        const msg = `Отмечено ${selectedCount} из ${ids.length} сбойных лот(ов) на странице.`;
        if (typeof showNotification === 'function') showNotification(msg);
    }

    function getOrCreateLogModal() {
        if (activeExportLogger) {
            activeExportLogger.show();
            return activeExportLogger;
        }

        let modal = document.getElementById('fp-export-log-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'fp-export-log-modal';
        modal.className = 'fxn-modal-overlay';
        modal.innerHTML = `
            <div class="fxn-modal-card">
                <div class="fxn-modal-header">
                    <div class="fxn-modal-title">
                        <span class="fxn-modal-icon">📦</span>
                        <span>Экспорт лотов в JSON</span>
                    </div>
                    <button type="button" class="fxn-modal-close" id="fp-export-log-close">✕</button>
                </div>
                <div class="fxn-modal-body">
                    <div class="fxn-progress-container">
                        <div class="fxn-progress-info">
                            <span id="fp-export-status-text">Инициализация...</span>
                            <span id="fp-export-counter-text">0 / 0</span>
                        </div>
                        <div class="fxn-progress-bar-track">
                            <div class="fxn-progress-bar-fill" id="fp-export-progress-fill" style="width: 0%;"></div>
                        </div>
                    </div>
                    <div class="fxn-log-stream" id="fp-export-log-stream"></div>
                </div>
                <div class="fxn-modal-footer" id="fp-export-modal-footer" style="display:none;">
                    <div id="fp-export-footer-buttons" style="display:flex; gap:10px; align-items:center;">
                        <button type="button" class="fxn-btn-primary" id="fp-export-done-btn">Готово</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        let reopenBtn = document.getElementById('fp-export-reopen-btn');
        if (!reopenBtn) {
            reopenBtn = document.createElement('button');
            reopenBtn.id = 'fp-export-reopen-btn';
            reopenBtn.className = 'fxn-reopen-btn';
            reopenBtn.style.display = 'none';
            reopenBtn.innerHTML = `📋 Лог экспорта`;
            document.body.appendChild(reopenBtn);
            reopenBtn.onclick = () => {
                modal.classList.remove('fxn-hidden');
                modal.setAttribute('style', 'display: flex !important;');
                reopenBtn.style.display = 'none';
            };
        }

        const closeBtn = modal.querySelector('#fp-export-log-close');
        const doneBtn = modal.querySelector('#fp-export-done-btn');
        
        const hideModal = (e) => {
            if (e) e.stopPropagation();
            modal.classList.add('fxn-hidden');
            modal.setAttribute('style', 'display: none !important;');
            reopenBtn.style.display = 'inline-flex';
        };

        closeBtn.onclick = hideModal;
        doneBtn.onclick = hideModal;
        modal.onclick = (e) => {
            if (e.target === modal) hideModal(e);
        };

        activeExportLogger = {
            modal,
            reopenBtn,
            show() {
                modal.classList.remove('fxn-hidden');
                modal.setAttribute('style', 'display: flex !important;');
                reopenBtn.style.display = 'none';
            },
            updateProgress(current, total, statusText) {
                const pct = total > 0 ? Math.round((current / total) * 100) : 0;
                modal.querySelector('#fp-export-progress-fill').style.width = `${pct}%`;
                modal.querySelector('#fp-export-counter-text').textContent = `${current} / ${total} (${pct}%)`;
                if (statusText) modal.querySelector('#fp-export-status-text').textContent = statusText;
            },
            addLog(msg, type = 'info') {
                const stream = modal.querySelector('#fp-export-log-stream');
                const item = document.createElement('div');
                item.className = `fxn-log-item ${type}`;
                
                const badgeMap = {
                    success: '✓',
                    warning: '⚠',
                    error: '✗',
                    info: 'ℹ'
                };
                
                item.innerHTML = `
                    <span class="fxn-log-badge">${badgeMap[type] || 'ℹ'}</span>
                    <span class="fxn-log-msg">${msg}</span>
                `;
                stream.appendChild(item);
                stream.scrollTop = stream.scrollHeight;
            },
            finish(summaryText, failedLotIds = []) {
                modal.querySelector('#fp-export-progress-fill').style.width = '100%';
                modal.querySelector('#fp-export-status-text').textContent = summaryText;
                
                const btnContainer = modal.querySelector('#fp-export-footer-buttons');
                btnContainer.innerHTML = '';
                
                if (failedLotIds && failedLotIds.length > 0) {
                    const reselectBtn = document.createElement('button');
                    reselectBtn.type = 'button';
                    reselectBtn.className = 'fxn-btn-secondary';
                    reselectBtn.id = 'fp-export-reselect-btn';
                    reselectBtn.textContent = `Выбрать неэкспортированные (${failedLotIds.length})`;
                    reselectBtn.onclick = (e) => {
                        selectLotsByIds(failedLotIds);
                        hideModal(e);
                    };
                    btnContainer.appendChild(reselectBtn);
                }

                const doneBtnNew = document.createElement('button');
                doneBtnNew.type = 'button';
                doneBtnNew.className = 'fxn-btn-primary';
                doneBtnNew.id = 'fp-export-done-btn';
                doneBtnNew.textContent = 'Готово';
                doneBtnNew.onclick = hideModal;
                btnContainer.appendChild(doneBtnNew);

                modal.querySelector('#fp-export-modal-footer').style.display = 'flex';
            },
            reset() {
                modal.querySelector('#fp-export-log-stream').innerHTML = '';
                modal.querySelector('#fp-export-progress-fill').style.width = '0%';
                modal.querySelector('#fp-export-modal-footer').style.display = 'none';
                reopenBtn.style.display = 'none';
                this.show();
            }
        };

        return activeExportLogger;
    }

    async function getExportDataOne(offerId, fallbackCategory = '') {
        // 1) читаем источник + решённые поля с таймаутом 45 сек
        const src = await sendMessageWithTimeout({ action: 'cloneGetSource', offerId, batch: true }, 45000);
        if (!src || !src.success) {
            const errStr = [src?.error, src?.formError].filter(Boolean).join(' - ');
            throw new Error(errStr || 'не удалось прочитать лот');
        }
        if (src.source?.isChips) throw new Error('лот из раздела валюты — пропущен');
        if (!src.fields) throw new Error(src.formError || 'не удалось подобрать поля категории');

        const s = src.source;
        const fields = { ...src.fields };
        fields['offer_id'] = '0';
        if (s.nodeId) fields['node_id'] = String(s.nodeId);
        fields['fields[summary][ru]'] = s.summary_ru || s.summary || fields['fields[summary][ru]'] || '';
        fields['fields[desc][ru]'] = s.desc_ru || s.description || fields['fields[desc][ru]'] || '';
        // EN: только если реально отличается, иначе оставляем пустым
        fields['fields[summary][en]'] = (s.enDiffers && s.summary_en) ? s.summary_en : (fields['fields[summary][en]'] || '');
        fields['fields[desc][en]'] = (s.enDiffers && s.desc_en) ? s.desc_en : (fields['fields[desc][en]'] || '');
        if (s.payment_msg_ru) fields['fields[payment_msg][ru]'] = s.payment_msg_ru;
        if (s.payment_msg_en) fields['fields[payment_msg][en]'] = s.payment_msg_en;
        if (s.secrets) fields['secrets'] = s.secrets;
        if (s.finalPrice != null && !Number.isNaN(s.finalPrice) && s.finalPrice > 0) fields['price'] = String(s.finalPrice);
        else if (s.rawPrice) fields['price'] = String(s.rawPrice);
        fields['amount'] = (s.amount && /^\d+$/.test(s.amount)) ? s.amount : (fields['amount'] || '1');
        fields['active'] = 'on';
        fields['secrets'] = fields['secrets'] || '';
        fields['location'] = 'trade';
        delete fields['csrf_token'];
        delete fields['csrf'];
        delete fields['categoryName'];

        return {
            sourceTitle: s.summary_ru || s.summary || `Лот #${offerId}`,
            sourceCategory: s.categoryName || fallbackCategory || 'Неизвестная категория',
            data: fields
        };
    }

    async function runBatchExport() {
        if (isExportRunning) {
            if (activeExportLogger) activeExportLogger.show();
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.tc-item .lot-box input:checked');
        const items = [];
        const seenLotIds = new Set();
        selectedCheckboxes.forEach(chk => {
            const a = chk.closest('a.tc-item');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            const m = href.match(/[?&]id=(\d+)/) || href.match(/offer=(\d+)/) || (a.getAttribute('data-offer') ? [null, a.getAttribute('data-offer')] : null);
            if (!m || !m[1]) return;
            const lotId = String(m[1]);
            if (seenLotIds.has(lotId)) return;
            seenLotIds.add(lotId);
            const title = a.querySelector('.tc-title')?.textContent?.trim() || `Лот #${lotId}`;
            const categoryEl = a.closest('.table-lots, .show-more')?.previousElementSibling 
                || a.closest('.mb20, .table-container, .table-wrapper')?.querySelector('h2, h3, .block-title, .table-header');
            const categoryName = categoryEl?.textContent?.trim() || '';
            items.push({ id: lotId, title, categoryName });
        });

        const logEl = document.querySelector('.actions .log');
        const actionButtons = document.querySelectorAll('.actions .action-lot');

        const updateLog = (msg, isErr = false) => {
            if (logEl) {
                logEl.textContent = msg;
                logEl.style.color = isErr ? '#ff6b6b' : '#ccc';
            }
        };

        const toggleActions = (disabled) => {
            actionButtons.forEach(btn => btn.disabled = disabled);
            const actionsBar = document.querySelector('.actions');
            if (actionsBar) actionsBar.style.cursor = disabled ? 'wait' : 'default';
        };

        if (!items.length) {
            updateLog('Не выбрано ни одного лота.', true);
            return;
        }

        isExportRunning = true;
        toggleActions(true);

        const shouldExport = confirm(`Экспортировать ${items.length} лот(ов) в JSON для последующего импорта?`);
        if (!shouldExport) {
            isExportRunning = false;
            toggleActions(false);
            return;
        }

        let logger = activeExportLogger;
        if (!logger) {
            logger = getOrCreateLogModal();
        } else {
            logger.reset();
        }

        logger.updateProgress(0, items.length, 'Запуск экспорта...');
        logger.addLog(`Выбрано лотов для экспорта: ${items.length}`, 'info');

        let ok = 0, fail = 0;
        const exportedData = [];
        const exportedLotIds = new Set();
        const failedLotIds = [];
        let lotCooldownMs = 400; // Быстрый и безопасный интервал (~0.4 сек вместо 5.5 сек)

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const id = String(item.id);
                if (exportedLotIds.has(id)) continue;

                logger.updateProgress(i, items.length, `Обработка лота ${i + 1} из ${items.length}...`);
                updateLog(`Экспорт ${i + 1}/${items.length} (#${id})…`);
                
                let attempts = 0;
                let success = false;
                
                while (attempts < 2 && !success) {
                    attempts++;
                    try {
                        const data = await getExportDataOne(id, item.categoryName);
                        if (!exportedLotIds.has(id)) {
                            exportedLotIds.add(id);
                            exportedData.push(data);
                        }
                        ok++;
                        success = true;
                        logger.addLog(`Лот #${id} (${item.title}): обработан успешно`, 'success');
                    } catch (e) {
                        console.error(`[Foxen Batch Export Error] Lot #${id}:`, e);
                        const errMsg = String(e.message || e);
                        const isNetworkErr = errMsg.includes('NetworkError') || errMsg.includes('Failed to fetch') || errMsg.includes('Network request failed') || errMsg.includes('Превышено время ожидания');
                        
                        if (errMsg.includes('429')) {
                            lotCooldownMs = 1200; // адаптивно увеличиваем задержку при 429
                            logger.addLog(`Лот #${id}: Лимит запросов (429). Ждём 10 секунд перед повтором...`, 'warning');
                            updateLog(`⚠ #${id}: Слишком много запросов (429). Ждём 10 сек...`, true);
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            if (attempts === 2) {
                                fail++;
                                failedLotIds.push(id);
                                logger.addLog(`Лот #${id}: Пропущен из-за превышения лимита 429`, 'error');
                            }
                        } else if (isNetworkErr) {
                            if (attempts < 2) {
                                logger.addLog(`Лот #${id}: ${errMsg.includes('Превышено') ? 'Таймаут ожидания (45с)' : 'Сетевой сбой'}. Повторная попытка через 5 сек...`, 'warning');
                                await new Promise(resolve => setTimeout(resolve, 5000));
                            } else {
                                fail++;
                                failedLotIds.push(id);
                                logger.addLog(`Лот #${id} (${item.title}): Не удалось получить данные (${errMsg})`, 'error');
                            }
                        } else {
                            fail++;
                            failedLotIds.push(id);
                            logger.addLog(`Лот #${id} (${item.title}): ${errMsg}`, 'error');
                            break;
                        }
                    }
                }
                
                logger.updateProgress(i + 1, items.length, `Обработано ${i + 1} из ${items.length}`);

                if (i < items.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, lotCooldownMs));
                }
            }
            
            if (exportedData.length > 0) {
                logger.addLog(`Формирование JSON файла...`, 'info');
                const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `funpay_lots_cloned_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                logger.addLog(`Файл экспорта сохранён в загрузки!`, 'success');
            }
            
            const finalText = `Экспорт завершён: ${ok} экспортировано, ${fail} с ошибкой.`;
            updateLog(finalText, fail > 0);
            logger.finish(finalText, failedLotIds);
            if (typeof showNotification === 'function') showNotification(finalText, fail > 0);
        } finally {
            isExportRunning = false;
            toggleActions(false);
        }
    }

    function init() {
        if (window.__foxenBatchExportInit) return;
        window.__foxenBatchExportInit = true;

        // Навешиваем обработчик на клик по кнопке .export-lots в панели действий
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.actions .export-lots');
            if (btn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                runBatchExport();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
