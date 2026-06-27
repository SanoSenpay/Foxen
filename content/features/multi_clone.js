// content/features/multi_clone.js
// На странице ЧУЖОГО профиля позволяет экспортировать выбранные лоты в JSON файл.
<<<<<<< HEAD
// Интегрировано в режим выбора ("Выбрать") и всплывающую панель действий (.actions).
=======
// Вызывается из плавающего меню действий (.actions) при клике на кнопку «Экспорт (JSON)».
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387

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

<<<<<<< HEAD
=======
    function offerIdOf(a) {
        const m = (a.getAttribute('href') || '').match(/[?&]id=(\d+)/);
        return m ? m[1] : null;
    }

    const selected = new Set();

    function ensureStyles() {
        if (document.getElementById('fpt-mclone-styles')) return;
        const s = document.createElement('style');
        s.id = 'fpt-mclone-styles';
        s.textContent = `
        .fpt-mc-chk{margin-right:8px;width:16px;height:16px;cursor:pointer;vertical-align:middle;accent-color:#7c5cff;flex:0 0 auto;}
        .fpt-mc-bar{position:sticky;top:0;z-index:50;display:flex;gap:10px;align-items:center;flex-wrap:wrap;
            background:var(--fpt-surface,#fff);border:1px solid var(--fpt-border,#e3e3ea);border-radius:12px;
            padding:10px 14px;margin:0 0 12px;font-family:Inter,'Segoe UI',sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.06);}
        .fpt-mc-bar b{font-size:13px;}
        .fpt-mc-btn{padding:7px 14px;border-radius:9px;border:1px solid var(--fpt-border,#dadbe2);background:var(--fpt-surface-2,#fff);
            color:inherit;font-size:13px;font-weight:600;cursor:pointer;}
        .fpt-mc-btn.primary{background:#7c5cff;border-color:#7c5cff;color:#fff;}
        .fpt-mc-btn.primary:disabled{opacity:.5;cursor:default;}
        .fpt-mc-btn:hover:not(:disabled){border-color:#7c5cff;}
        .fpt-mc-count{font-size:12px;color:var(--fpt-text-muted,#8a8a94);}
        .fpt-mc-log{max-height:160px;overflow:auto;font-size:12px;line-height:1.5;width:100%;margin-top:4px;
            border-top:1px solid var(--fpt-border,#ececf0);padding-top:8px;display:none;}
        .fpt-mc-log .ok{color:#16a34a;} .fpt-mc-log .err{color:#ef4444;}
        `;
        document.head.appendChild(s);
    }

    function updateBar() {
        const bar = document.getElementById('fpt-mc-bar');
        if (!bar) return;
        const cnt = bar.querySelector('.fpt-mc-count');
        const btn = bar.querySelector('.fpt-mc-go');
        cnt.textContent = selected.size ? `Выбрано: ${selected.size}` : 'Отметьте лоты галочками';
        btn.disabled = selected.size === 0;
    }

    function addCheckboxes() {
        document.querySelectorAll('a.tc-item[href*="lots/offer?id="]').forEach(a => {
            if (a.dataset.fptMc) return;
            const offerId = offerIdOf(a);
            if (!offerId) return;
            a.dataset.fptMc = '1';
            a.classList.add('fpt-mc-row');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'fpt-mc-chk';
            chk.title = 'Выбрать для копирования';
            chk.style.cssText = 'margin-right:10px; cursor:pointer; width:14px; height:14px; display:inline-block; vertical-align:middle;';
            chk.addEventListener('click', e => {
                e.stopPropagation();
                if (chk.checked) selected.add(offerId); else selected.delete(offerId);
                updateBar();
            });
            const firstCell = a.firstElementChild;
            if (firstCell) {
                firstCell.insertBefore(chk, firstCell.firstChild);
            }
        });
    }

    function buildBar() {
        if (document.getElementById('fpt-mc-bar')) return;
        const firstOffer = document.querySelector('.offer');
        if (!firstOffer) return;
        ensureStyles();
        const bar = document.createElement('div');
        bar.id = 'fpt-mc-bar';
        bar.className = 'fpt-mc-bar';
        bar.innerHTML = `
            <b>📋 Экспорт копий лотов</b>
            <span class="fpt-mc-count">Отметьте лоты галочками</span>
            <button class="fpt-mc-btn fpt-mc-all" type="button" style="margin-left:auto;">Выбрать все</button>
            <button class="fpt-mc-btn fpt-mc-none" type="button">Снять все</button>
            <button class="fpt-mc-btn primary fpt-mc-go" type="button" disabled>Экспорт (JSON)</button>
            <div class="fpt-mc-log"></div>`;
        firstOffer.parentElement.insertBefore(bar, firstOffer);

        bar.querySelector('.fpt-mc-all').addEventListener('click', () => {
            document.querySelectorAll('.fpt-mc-chk').forEach(c => {
                if (!c.checked) { c.checked = true; const a = c.closest('a.tc-item'); const id = offerIdOf(a); if (id) selected.add(id); }
            });
            updateBar();
        });
        bar.querySelector('.fpt-mc-none').addEventListener('click', () => {
            document.querySelectorAll('.fpt-mc-chk').forEach(c => c.checked = false);
            selected.clear(); updateBar();
        });
        bar.querySelector('.fpt-mc-go').addEventListener('click', runExportSelectedLots;
        updateBar();
    }
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
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

<<<<<<< HEAD
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
=======
    async function runExportSelectedLots(ids, updateLog, toggleActions) {
        if (!ids || !ids.length) return;
        if (!confirm(`Экспортировать ${ids.length} лот(ов) в JSON для последующего импорта?`)) return;

        if (typeof toggleActions === 'function') toggleActions(true);
        let ok = 0, fail = 0;

        const log = (html, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight; };
        if (typeof toggleActions === 'function') toggleActions(true);
        let ok = 0, fail = 0;
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
        const exportedData = [];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
<<<<<<< HEAD
            updateLog(`Экспорт ${i + 1}/${ids.length} (#${id})…`);
=======
            log(`(${i + 1}/${ids.length}) Экспорт #${id}…`);
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
            
            let attempts = 0;
            let success = false;
            
            while (attempts < 2 && !success) {
                attempts++;
                try {
                    const data = await getExportDataOne(id);
                    exportedData.push(data);
                    ok++;
                    success = true;
<<<<<<< HEAD
                } catch (e) {
                    if (e.message.includes('429')) {
                        updateLog(`⚠ #${id}: Слишком много запросов (429). Ждём 10 сек...`, true);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        if (attempts === 2) {
                            fail++;
                        }
                    } else {
                        fail++;
=======
                    log(`✓ #${id} → считан`, 'ok');
                } catch (e) {
                    if (e.message.includes('429')) {
                        log(`⚠ #${id}: Слишком много запросов (429). Ждём 10 секунд...`, 'err');
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        if (attempts === 2) {
                            fail++;
                            log(`✗ #${id}: Пропущен после ошибки 429`, 'err');
                        }
                    } else {
                        fail++;
                        log(`✗ #${id}: ${e.message}`, 'err');
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
                        break;
                    }
                }
            }
            
<<<<<<< HEAD
=======
            // Задержка между лотами, чтобы избежать 429 в будущем
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
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
        
<<<<<<< HEAD
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
=======
        log(`<b>Готово: ${ok} экспортировано, ${fail} с ошибкой.</b>`);
        if (typeof showNotification === 'function') showNotification(`Экспорт завершен: ${ok} ок, ${fail} ошибок`, fail > 0);
        if (typeof toggleActions === 'function') toggleActions(false);
    }

    window.fptRunExportSelectedLots = runExportSelectedLots;
>>>>>>> 8d69b2878acfe0dfe794386150062e62d9eee387
})();
