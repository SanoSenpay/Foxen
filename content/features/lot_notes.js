// content/features/lot_notes.js
// Личные заметки к лотам (видны только тебе, хранятся локально).
// Глобальный объект window.FPTNotes:
//   await FPTNotes.get(offerId)            -> { text, lotTitle, updatedAt } | null
//   await FPTNotes.set(offerId, text, lotTitle)
//   await FPTNotes.delete(offerId)
//   await FPTNotes.all()                   -> { offerId: {...}, ... }
//   FPTNotes.openEditor(offerId, lotTitle) -> модалка редактирования заметки
//   FPTNotes.openViewer()                  -> модалка со всеми заметками
//
// Заметки хранятся в chrome.storage.local под ключом 'fxnLotNotes'. Лот может быть
// потом удалён с FunPay — заметка останется (показываем в общем списке).

(function (root) {
    'use strict';

    const KEY = 'fxnLotNotes';

    function _read() {
        return new Promise(resolve => {
            try {
                chrome.storage.local.get(KEY, (o) => resolve((o && o[KEY]) || {}));
            } catch (_) { resolve({}); }
        });
    }
    function _write(map) {
        return new Promise(resolve => {
            try { chrome.storage.local.set({ [KEY]: map }, () => resolve(true)); }
            catch (_) { resolve(false); }
        });
    }

    async function get(offerId) {
        if (!offerId) return null;
        const m = await _read();
        return m[String(offerId)] || null;
    }
    async function all() { return await _read(); }
    async function set(offerId, text, lotTitle) {
        if (!offerId) return false;
        const m = await _read();
        const id = String(offerId);
        const t = (text || '').trim();
        if (!t) { delete m[id]; }
        else {
            m[id] = { text: t, lotTitle: lotTitle || (m[id] && m[id].lotTitle) || '', updatedAt: Date.now() };
        }
        await _write(m);
        document.dispatchEvent(new CustomEvent('fxn-notes-changed', { detail: { offerId: id } }));
        return true;
    }
    async function del(offerId) { return await set(offerId, '', null); }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function ensureStyles() {
        if (document.getElementById('fxn-notes-styles')) return;
        const s = document.createElement('style');
        s.id = 'fxn-notes-styles';
        s.textContent = `
        .fxn-note-ov{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;
            background:var(--fxn-scrim-bg, rgba(8,9,14,0.65));backdrop-filter:blur(var(--fxn-scrim-blur, 10px));
            -webkit-backdrop-filter:blur(var(--fxn-scrim-blur, 10px));font-family:var(--fxn-font-sans);}
        .fxn-note-modal{width:min(540px,94vw);max-height:88vh;display:flex;flex-direction:column;
            background:var(--fxn-content-color,#141414);color:var(--fxn-text-main,#f4f4f3);
            border:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));border-radius:20px;
            box-shadow:var(--fxn-shadow, 0 24px 60px rgba(0,0,0,0.65));overflow:hidden;}
        .fxn-note-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 20px;
            background:var(--fxn-header-color, rgba(255,255,255,0.02));border-bottom:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));}
        .fxn-note-title{font-size:16px;font-weight:700;line-height:1.3;color:var(--fxn-text-main);}
        .fxn-note-sub{font-size:12px;color:var(--fxn-text-desc,#96969a);margin-top:3px;word-break:break-word;}
        .fxn-note-close{background:transparent;border:none;font-size:22px;line-height:1;cursor:pointer;color:var(--fxn-text-subtle,#5c5c60);
            width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;transition:all .15s ease;}
        .fxn-note-close:hover{background:var(--fxn-card-color-hover);color:var(--fxn-text-main);}
        .fxn-note-body{padding:16px 20px;overflow-y:auto;}
        .fxn-note-ta{width:100%;min-height:160px;resize:vertical;padding:12px 14px;border-radius:12px;
            border:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));background:var(--fxn-card-color,#1c1c1e);color:var(--fxn-text-main,#f4f4f3);
            font-size:13.5px;line-height:1.5;font-family:var(--fxn-font-sans);outline:none;box-sizing:border-box;transition:border-color .15s;}
        .fxn-note-ta:focus{border-color:var(--fxn-accent,#c026d3);box-shadow:0 0 0 3px var(--fxn-accent-soft, rgba(192,38,211,0.15));}
        .fxn-note-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;background:var(--fxn-header-color, transparent);border-top:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));}
        .fxn-note-btn{padding:9px 18px;border-radius:10px;border:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));
            background:var(--fxn-card-color,#1c1c1e);color:var(--fxn-text-main);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease;}
        .fxn-note-btn:hover{background:var(--fxn-card-color-hover);}
        .fxn-note-btn.primary{background:var(--fxn-text-main);border-color:var(--fxn-text-main);color:var(--fxn-bg-color);}
        .fxn-note-btn.primary:hover{filter:brightness(1.1);transform:translateY(-1px);}
        .fxn-note-btn.danger{color:#ef4444;border-color:rgba(239,68,68,.3);background:transparent;}
        .fxn-note-btn.danger:hover{background:rgba(239,68,68,.12);}
        .fxn-note-list{padding:10px 20px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;}
        .fxn-note-card{border:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));border-radius:12px;padding:12px 14px;
            background:var(--fxn-card-color,#1c1c1e);transition:all .15s ease;}
        .fxn-note-card:hover{background:var(--fxn-card-color-hover);border-color:var(--fxn-accent,#c026d3);}
        .fxn-note-card-title{font-size:13px;font-weight:700;margin-bottom:5px;color:var(--fxn-text-main);}
        .fxn-note-card-title a{color:inherit;text-decoration:none;}
        .fxn-note-card-title a:hover{color:var(--fxn-accent,#c026d3);text-decoration:underline;}
        .fxn-note-card-text{font-size:12.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:var(--fxn-text-desc,#96969a);}
        .fxn-note-card-meta{display:flex;gap:10px;align-items:center;margin-top:8px;}
        .fxn-note-card-date{font-size:11px;color:var(--fxn-text-subtle,#5c5c60);}
        .fxn-note-card-act{font-size:11.5px;color:var(--fxn-text-desc,#96969a);cursor:pointer;background:none;border:none;padding:3px 6px;border-radius:6px;transition:all .12s;}
        .fxn-note-card-act:hover{color:var(--fxn-accent,#c026d3);background:var(--fxn-card-color-hover);}
        .fxn-note-card-act.del:hover{color:#ef4444;background:rgba(239,68,68,.1);}
        .fxn-note-search{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--fxn-divider-color,rgba(255,255,255,0.08));
            background:var(--fxn-card-color,#1c1c1e);color:var(--fxn-text-main);font-size:13px;outline:none;box-sizing:border-box;margin:0 0 6px;}
        .fxn-note-search:focus{border-color:var(--fxn-accent,#c026d3);box-shadow:0 0 0 3px var(--fxn-accent-soft, rgba(192,38,211,0.15));}
        .fxn-note-empty{padding:28px;text-align:center;color:var(--fxn-text-desc,#96969a);font-size:13px;}
        `;
        document.head.appendChild(s);
    }

    function closeAll() { document.querySelectorAll('.fxn-note-ov').forEach(o => o.remove()); }

    async function openEditor(offerId, lotTitle) {
        if (!offerId) { showNotification?.('У этого лота нет ID — заметку не привязать.', true); return; }
        ensureStyles();
        closeAll();
        const existing = await get(offerId);
        const ov = document.createElement('div');
        ov.className = 'fxn-note-ov';
        ov.innerHTML = `
            <div class="fxn-note-modal">
                <div class="fxn-note-head">
                    <div>
                        <div class="fxn-note-title">📝 Заметка к лоту</div>
                        <div class="fxn-note-sub">${esc(lotTitle || (existing && existing.lotTitle) || ('Лот #' + offerId))}</div>
                    </div>
                    <button class="fxn-note-close" title="Закрыть">×</button>
                </div>
                <div class="fxn-note-body">
                    <textarea class="fxn-note-ta" placeholder="Личная заметка (видна только тебе): ссылки, инструкции, что угодно…">${esc(existing ? existing.text : '')}</textarea>
                </div>
                <div class="fxn-note-foot">
                    ${existing ? '<button class="fxn-note-btn danger" data-act="del">Удалить</button>' : ''}
                    <button class="fxn-note-btn" data-act="cancel">Отмена</button>
                    <button class="fxn-note-btn primary" data-act="save">Сохранить</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        const ta = ov.querySelector('.fxn-note-ta');
        ta.focus();
        const close = () => ov.remove();
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        ov.querySelector('.fxn-note-close').addEventListener('click', close);
        ov.querySelector('[data-act="cancel"]').addEventListener('click', close);
        ov.querySelector('[data-act="save"]').addEventListener('click', async () => {
            await set(offerId, ta.value, lotTitle || (existing && existing.lotTitle));
            showNotification?.('Заметка сохранена 📝', false);
            close();
        });
        const delBtn = ov.querySelector('[data-act="del"]');
        if (delBtn) delBtn.addEventListener('click', async () => {
            await del(offerId);
            showNotification?.('Заметка удалена', false);
            close();
        });
        document.addEventListener('keydown', function onEsc(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { ov.querySelector('[data-act="save"]').click(); document.removeEventListener('keydown', onEsc); }
        });
    }

    async function openViewer() {
        ensureStyles();
        closeAll();
        const map = await all();
        const entries = Object.entries(map).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
        const ov = document.createElement('div');
        ov.className = 'fxn-note-ov';
        ov.innerHTML = `
            <div class="fxn-note-modal">
                <div class="fxn-note-head">
                    <div><div class="fxn-note-title">📒 Мои заметки к лотам</div>
                    <div class="fxn-note-sub">${entries.length} заметок · видны только тебе</div></div>
                    <button class="fxn-note-close" title="Закрыть">×</button>
                </div>
                <div style="padding:12px 18px 0;display:flex;gap:8px;">
                    <input class="fxn-note-search" type="text" placeholder="Поиск по заметкам и названиям лотов…" style="margin:0;">
                    <button class="fxn-note-btn primary fxn-note-new" type="button" style="white-space:nowrap;">+ Новая</button>
                </div>
                <div class="fxn-note-list"></div>
            </div>`;
        document.body.appendChild(ov);
        const listEl = ov.querySelector('.fxn-note-list');
        const searchEl = ov.querySelector('.fxn-note-search');

        ov.querySelector('.fxn-note-new').addEventListener('click', () => {
            const raw = prompt('Ссылка на лот или его ID (offer id), к которому привязать заметку:');
            if (!raw) return;
            const m = String(raw).match(/(?:[?&](?:id|offer)=)?(\d{4,})/);
            const id = m ? m[1] : null;
            if (!id) { showNotification?.('Не удалось распознать ID лота.', true); return; }
            openEditor(id, '');
        });

        const render = () => {
            const q = searchEl.value.trim().toLowerCase();
            const filtered = entries.filter(([id, n]) =>
                !q || (n.text || '').toLowerCase().includes(q) || (n.lotTitle || '').toLowerCase().includes(q));
            if (!filtered.length) { listEl.innerHTML = `<div class="fxn-note-empty">${entries.length ? 'Ничего не найдено.' : 'Заметок пока нет. Кликни ПКМ по лоту → «Заметка».'}</div>`; return; }
            listEl.innerHTML = filtered.map(([id, n]) => {
                const d = n.updatedAt ? new Date(n.updatedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                const url = `https://funpay.com/lots/offer?id=${id}`;
                return `<div class="fxn-note-card" data-id="${esc(id)}">
                    <div class="fxn-note-card-title"><a href="${url}" target="_blank">${esc(n.lotTitle || ('Лот #' + id))}</a></div>
                    <div class="fxn-note-card-text">${esc(n.text)}</div>
                    <div class="fxn-note-card-meta">
                        <span class="fxn-note-card-date">${esc(d)}</span>
                        <button class="fxn-note-card-act edit" style="margin-left:auto;">Изменить</button>
                        <button class="fxn-note-card-act del">Удалить</button>
                    </div>
                </div>`;
            }).join('');
            listEl.querySelectorAll('.fxn-note-card').forEach(card => {
                const id = card.getAttribute('data-id');
                const n = map[id];
                card.querySelector('.edit').addEventListener('click', () => { openEditor(id, n.lotTitle); });
                card.querySelector('.del').addEventListener('click', async () => {
                    if (!confirm('Удалить заметку?')) return;
                    await del(id);
                    delete map[id];
                    const i = entries.findIndex(e => e[0] === id);
                    if (i >= 0) entries.splice(i, 1);
                    render();
                });
            });
        };
        render();
        searchEl.addEventListener('input', render);
        document.addEventListener('fxn-notes-changed', render);
        const close = () => { document.removeEventListener('fxn-notes-changed', render); ov.remove(); };
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        ov.querySelector('.fxn-note-close').addEventListener('click', close);
        document.addEventListener('keydown', function onEsc(e){ if(e.key==='Escape'){close();document.removeEventListener('keydown',onEsc);} });
    }

    root.FPTNotes = { get, set, delete: del, all, openEditor, openViewer };
})(typeof window !== 'undefined' ? window : this);
