// content/features/needs_tab.js
// =============================================================================
// Вкладка «Что тебе нужно».
//  • Свободный ввод → ИИ сопоставляет с реестром форс-элементов → карточки с галочками.
//  • Полный список форс-элементов с галочками (вкл/выкл) и встроенным предпросмотром.
//  • Чекбоксы → АВТОСОХРАНЕНИЕ в foxenDisabledFeatures при каждом изменении (скрытие живое).
// Заблокированные (locked) элементы выключать нельзя.
// =============================================================================

let __fptNeedsInited = false;

function fxnNeedsRegistry() {
    return (typeof FPT_FEATURE_REGISTRY !== 'undefined' && FPT_FEATURE_REGISTRY) ||
           (typeof window !== 'undefined' && window.FPT_FEATURE_REGISTRY) || [];
}

function fxnEscapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Inline preview markup - a faithful mini visual copy of the real element.
// Not escaped: the registry author controls this html (trusted, no user input).
// {{MAGIC_ICON}} is replaced with the real path to icons/magic.png so the AI
// button preview uses the exact same icon as the live button.
function fxnNeedsPreviewHtml(entry) {
    const p = entry.preview;
    if (p && p.kind === 'html') {
        let html = p.html;
        if (html.indexOf('{{MAGIC_ICON}}') !== -1) {
            let url = 'icons/magic.png';
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                    url = chrome.runtime.getURL('icons/magic.png');
                }
            } catch (_) {}
            html = html.split('{{MAGIC_ICON}}').join(url);
        }
        return `<div class="fxn-pv-stage">${html}</div>`;
    }
    return `<div class="fxn-pv-stage fxn-pv-none">Нет предпросмотра</div>`;
}

// Render the full feature list grouped by `group`.
async function fxnRenderNeedsList(filterText) {
    const list = document.getElementById('fxnNeedsList');
    if (!list) return;
    const reg = fxnNeedsRegistry();
    const { foxenDisabledFeatures = [] } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
    const disabled = new Set(Array.isArray(foxenDisabledFeatures) ? foxenDisabledFeatures : []);

    const q = (filterText || '').trim().toLowerCase();
    const groups = {};
    reg.forEach(entry => {
        if (q && !(`${entry.label} ${entry.desc}`.toLowerCase().includes(q))) return;
        (groups[entry.group] = groups[entry.group] || []).push(entry);
    });

    const groupNames = Object.keys(groups);
    if (!groupNames.length) {
        list.innerHTML = `<p class="template-info" style="text-align:center;">Ничего не найдено.</p>`;
        return;
    }

    list.innerHTML = groupNames.map(g => {
        const items = groups[g].map(entry => {
            const on = !disabled.has(entry.id);
            const locked = !!entry.locked;
            const control = locked
                ? `<span class="fxn-needs-lock" title="Эту функцию нельзя отключить - иначе пропадёт доступ к расширению"><span class="material-symbols-rounded">lock</span></span>`
                : `<input type="checkbox" class="fxn-needs-cb" data-id="${entry.id}" ${on ? 'checked' : ''}>`;
            return `
            <div class="fxn-needs-item${locked ? ' fxn-needs-locked' : ''}" data-id="${entry.id}">
                <label class="fxn-needs-check">
                    ${control}
                    <span class="fxn-needs-item-text">
                        <span class="fxn-needs-item-label">${fxnEscapeHtml(entry.label)}</span>
                        <span class="fxn-needs-item-desc">${fxnEscapeHtml(entry.desc)}</span>
                    </span>
                </label>
            </div>`;
        }).join('');
        return `
            <div class="fxn-needs-group">
                <div class="fxn-needs-group-title">${fxnEscapeHtml(g)}</div>
                ${items}
            </div>`;
    }).join('');
}

// Save the current checkbox state immediately (autosave). Called on every
// checkbox change - there is no separate "apply" button anymore.
async function fxnApplyNeedsSelection() {
    const list = document.getElementById('fxnNeedsList');
    const status = document.getElementById('fxnNeedsStatus');
    if (!list) return;
    const reg = fxnNeedsRegistry();
    const lockedIds = new Set(reg.filter(e => e.locked).map(e => e.id));
    // Only ids that exist in the CURRENT registry are valid. Anything else in
    // storage is stale (left over from an old version / removed feature) and must
    // never be counted or kept - that was the cause of the bogus "Отключено: 10".
    const knownIds = new Set(reg.map(e => e.id));

    // Start from the previously-saved set so features filtered out of the current
    // view (by search) keep their state, then update from visible checkboxes.
    let prev = [];
    try {
        const data = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
        prev = Array.isArray(data.foxenDisabledFeatures) ? data.foxenDisabledFeatures : [];
    } catch (_) { prev = []; }
    // keep only valid, non-locked, currently-known ids → prunes stale garbage
    const disabledSet = new Set(prev.filter(id => knownIds.has(id) && !lockedIds.has(id)));

    list.querySelectorAll('.fxn-needs-cb').forEach(cb => {
        if (lockedIds.has(cb.dataset.id) || !knownIds.has(cb.dataset.id)) return;
        if (cb.checked) disabledSet.delete(cb.dataset.id);
        else disabledSet.add(cb.dataset.id);
    });

    const disabled = Array.from(disabledSet);

    try {
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenDisabledFeatures: disabled });
        // refresh live CSS hiding immediately
        if (typeof window !== 'undefined' && typeof window.fxnApplyDisabledFeatures === 'function') {
            await window.fxnApplyDisabledFeatures(disabled);
        }
        if (status) {
            status.textContent = disabled.length
                ? `Сохранено · отключено: ${disabled.length}`
                : 'Сохранено · все элементы включены';
            status.classList.remove('fxn-needs-status-err');
            status.classList.add('fxn-needs-status-ok');
            clearTimeout(fxnApplyNeedsSelection._t);
            fxnApplyNeedsSelection._t = setTimeout(() => {
                if (status) status.classList.remove('fxn-needs-status-ok');
            }, 1400);
        }
    } catch (e) {
        console.error('Foxen: ошибка автосохранения needs', e);
        if (status) {
            status.textContent = 'Ошибка сохранения: ' + (e && e.message ? e.message : 'неизвестно');
            status.classList.remove('fxn-needs-status-ok');
            status.classList.add('fxn-needs-status-err');
        }
        if (typeof showNotification === 'function') showNotification('Не удалось сохранить настройки.', true);
    }
}

// Ask the AI which features the user wants to disable, then show confirm cards.
async function fxnNeedsAskAI() {
    const input = document.getElementById('fxnNeedsInput');
    const resultBox = document.getElementById('fxnNeedsAiResult');
    const askBtn = document.getElementById('fxnNeedsAskBtn');
    if (!input || !resultBox) return;

    const text = input.value.trim();
    if (!text) {
        if (typeof showNotification === 'function') showNotification('Напишите, что вы хотите отключить.', true);
        return;
    }

    const reg = fxnNeedsRegistry();
    // exclude locked entries from what the AI may suggest
    const offerable = reg.filter(e => !e.locked);
    const compact = JSON.stringify(offerable.map(e => ({ id: e.id, label: e.label, desc: e.desc })));

    askBtn.disabled = true;
    askBtn.classList.add('fxn-needs-loading');
    resultBox.style.display = 'block';
    resultBox.innerHTML = `<div class="fxn-needs-ai-loading"><span class="material-symbols-rounded fxn-spin">progress_activity</span> ИИ анализирует ваш запрос…</div>`;

    let matches = [];
    try {
        const resp = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
            action: 'getAIProcessedText',
            text: text,
            context: compact,
            myUsername: '',
            type: 'feature_match'
        });
        if (resp && resp.success) {
            let raw = (resp.data || '').trim();
            raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
            matches = JSON.parse(raw);
            if (!Array.isArray(matches)) matches = [];
        } else {
            throw new Error(resp ? resp.error : 'нет ответа');
        }
    } catch (e) {
        console.error('Foxen needs AI error:', e);
        resultBox.innerHTML = `<div class="fxn-needs-ai-error"><span class="material-symbols-rounded">error</span> Не удалось разобрать ответ ИИ. Переформулируйте запрос или отметьте элементы вручную ниже.</div>`;
        askBtn.disabled = false;
        askBtn.classList.remove('fxn-needs-loading');
        return;
    }

    const byId = {};
    offerable.forEach(e => { byId[e.id] = e; });
    matches = matches.filter(m => m && byId[m.id]);

    if (!matches.length) {
        resultBox.innerHTML = `<div class="fxn-needs-ai-empty"><span class="material-symbols-rounded">info</span> ИИ не нашёл подходящих элементов. Опишите иначе или отметьте вручную ниже.</div>`;
        askBtn.disabled = false;
        askBtn.classList.remove('fxn-needs-loading');
        return;
    }

    resultBox.innerHTML = `
        <div class="fxn-needs-ai-head">
            <span class="material-symbols-rounded">auto_awesome</span>
            ИИ предлагает отключить это. Отметьте, что действительно выключить:
        </div>
        <div class="fxn-needs-ai-cards">
            ${matches.map(m => {
                const e = byId[m.id];
                const conf = Math.round((m.confidence || 0) * 100);
                return `
                <div class="fxn-needs-ai-card">
                    <label class="fxn-needs-ai-card-main">
                        <input type="checkbox" class="fxn-needs-ai-pick" data-id="${e.id}" checked>
                        <span>
                            <span class="fxn-needs-ai-card-label">${fxnEscapeHtml(e.label)}</span>
                            <span class="fxn-needs-ai-card-reason">${fxnEscapeHtml(m.reason || e.desc)}</span>
                        </span>
                    </label>
                    <span class="fxn-needs-ai-conf" title="Уверенность ИИ">${conf}%</span>
                </div>`;
            }).join('')}
        </div>
        <button id="fxnNeedsAiConfirm" class="btn">Отключить выбранное</button>`;

    askBtn.disabled = false;
    askBtn.classList.remove('fxn-needs-loading');
}

// Wire all event handlers (idempotent).
function initializeNeedsTab() {
    fxnRenderNeedsList('');

    if (__fptNeedsInited) return;
    __fptNeedsInited = true;

    const page = document.querySelector('.foxen-page-content[data-page="needs"]');
    if (!page) return;

    const askBtn = document.getElementById('fxnNeedsAskBtn');
    if (askBtn) askBtn.addEventListener('click', fxnNeedsAskAI);

    const filter = document.getElementById('fxnNeedsFilter');
    if (filter) filter.addEventListener('input', () => fxnRenderNeedsList(filter.value));

    // AUTOSAVE: every checkbox toggle in the list saves instantly (no apply button).
    page.addEventListener('change', (e) => {
        if (e.target.classList && e.target.classList.contains('fxn-needs-cb')) {
            fxnApplyNeedsSelection();
        }
    });

    // delegated clicks: AI confirm
    page.addEventListener('click', async (e) => {
        if (e.target.closest('#fxnNeedsAiConfirm')) {
            const resultBox = document.getElementById('fxnNeedsAiResult');
            const picks = resultBox.querySelectorAll('.fxn-needs-ai-pick');
            const toDisable = new Set();
            picks.forEach(cb => { if (cb.checked) toDisable.add(cb.dataset.id); });
            // reflect into main list checkboxes (uncheck = disable) → autosave
            document.querySelectorAll('.fxn-needs-cb').forEach(cb => {
                if (toDisable.has(cb.dataset.id)) cb.checked = false;
            });
            await fxnApplyNeedsSelection();
            const confirmBtn = resultBox.querySelector('#fxnNeedsAiConfirm');
            if (confirmBtn) confirmBtn.textContent = 'Отключено ✓';
        }
    });
}

if (typeof window !== 'undefined') {
    window.initializeNeedsTab = initializeNeedsTab;
}
