// content/features/multi_clone.js
// На странице ЧУЖОГО профиля позволяет экспортировать выбранные лоты в JSON файл.
// Интегрировано в режим выбора ("Выбрать") и всплывающую панель действий (.actions).

(function () {
    'use strict';

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

    async function getExportDataOne(offerId) {
        // 1) читаем источник + решённые поля
        const src = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'cloneGetSource', offerId, batch: true });
        if (!src || !src.success) {
            const errStr = [src?.error, src?.formError].filter(Boolean).join(' - ');
            throw new Error(errStr || 'не удалось прочитать лот');
        }
        if (src.source?.isChips) throw new Error('лот из раздела валюты — пропущен');
        if (!src.fields) throw new Error(src.formError || 'не удалось подобрать поля категории');

        const s = src.source;
        const fields = { ...src.fields };
        fields['offer_id'] = '0';
        fields['fields[summary][ru]'] = s.summary || '';
        fields['fields[desc][ru]'] = s.description || '';
        // EN: только если реально отличается, иначе оставляем пустым
        fields['fields[summary][en]'] = (s.enDiffers && s.summary_en) ? s.summary_en : '';
        fields['fields[desc][en]'] = (s.enDiffers && s.desc_en) ? s.desc_en : '';
        if (s.finalPrice != null && !Number.isNaN(s.finalPrice) && s.finalPrice > 0) fields['price'] = String(s.finalPrice);
        else if (s.rawPrice) fields['price'] = String(s.rawPrice);
        fields['amount'] = (s.amount && /^\d+$/.test(s.amount)) ? s.amount : (fields['amount'] || '1');
        fields['active'] = 'on';
        fields['secrets'] = fields['secrets'] || '';
        fields['fields[images]'] = fields['fields[images]'] || '';

        return {
            sourceTitle: s.summary || `Лот #${offerId}`,
            sourceCategory: s.categoryName || 'Неизвестная категория',
            data: fields
        };
    }

    async function runBatchExport() {
        const selectedCheckboxes = document.querySelectorAll('.tc-item .lot-box input:checked');
        const ids = [];
        selectedCheckboxes.forEach(chk => {
            const a = chk.closest('a.tc-item');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            const m = href.match(/[?&]id=(\d+)/) || href.match(/offer=(\d+)/) || (a.getAttribute('data-offer') ? [null, a.getAttribute('data-offer')] : null);
            if (m && m[1]) ids.push(m[1]);
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

        if (!ids.length) {
            updateLog('Не выбрано ни одного лота.', true);
            return;
        }

        if (!confirm(`Экспортировать ${ids.length} лот(ов) в JSON для последующего импорта?`)) return;

        toggleActions(true);
        let ok = 0, fail = 0;
        const exportedData = [];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            updateLog(`Экспорт ${i + 1}/${ids.length} (#${id})…`);
            
            let attempts = 0;
            let success = false;
            
            while (attempts < 2 && !success) {
                attempts++;
                try {
                    const data = await getExportDataOne(id);
                    exportedData.push(data);
                    ok++;
                    success = true;
                } catch (e) {
                    if (e.message.includes('429')) {
                        updateLog(`⚠ #${id}: Слишком много запросов (429). Ждём 10 сек...`, true);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        if (attempts === 2) {
                            fail++;
                        }
                    } else {
                        fail++;
                        break;
                    }
                }
            }
            
            if (i < ids.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        if (exportedData.length > 0) {
            const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `funpay_lots_cloned_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        const finalText = `Экспорт завершён: ${ok} экспортировано, ${fail} с ошибкой.`;
        updateLog(finalText, fail > 0);
        if (typeof showNotification === 'function') showNotification(finalText, fail > 0);
        toggleActions(false);
    }

    function init() {
        if (!isForeignProfile()) return;

        // Навешиваем обработчик на клик по кнопке .export-lots в панели действий
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.actions .export-lots');
            if (btn) {
                e.preventDefault();
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
