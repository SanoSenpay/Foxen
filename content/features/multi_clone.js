// content/features/multi_clone.js
// На странице ЧУЖОГО профиля позволяет экспортировать выбранные лоты в JSON файл.
// Вызывается из плавающего меню действий (.actions) при клике на кнопку «Экспорт (JSON)».

(function () {
    'use strict';

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

    async function runExportSelectedLots(ids, updateLog, toggleActions) {
        if (!ids || !ids.length) return;
        if (!confirm(`Экспортировать ${ids.length} лот(ов) в JSON для последующего импорта?`)) return;

        if (typeof toggleActions === 'function') toggleActions(true);
        let ok = 0, fail = 0;
        const exportedData = [];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            if (typeof updateLog === 'function') updateLog(`Экспорт ${i + 1}/${ids.length} (#${id})…`);
            
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
                        if (typeof updateLog === 'function') updateLog(`⚠ #${id}: Лимит 429. Ждём 10 сек...`, true);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        if (attempts === 2) {
                            fail++;
                        }
                    } else {
                        fail++;
                        if (typeof updateLog === 'function') updateLog(`✗ #${id}: ${e.message}`, true);
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
        
        const summaryMsg = `Экспорт завершен: ${ok} экспортировано, ${fail} с ошибкой.`;
        if (typeof updateLog === 'function') updateLog(summaryMsg, fail > 0);
        if (typeof showNotification === 'function') showNotification(summaryMsg, fail > 0);
        if (typeof toggleActions === 'function') toggleActions(false);
    }

    window.fptRunExportSelectedLots = runExportSelectedLots;
})();
