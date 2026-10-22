'use strict';

const FP_SUPPORT_BASE = 'https://support.funpay.com';
let _ticketsInited = false;
let _ticketCategories = [];
let _ticketPendingPayload = null;

// ── helpers ───────────────────────────────────────────────────────────────────

function _getUsername() {
    // Primary: DOM element always present when logged in
    const nameEl = document.querySelector('.user-link-name');
    if (nameEl?.textContent.trim()) return nameEl.textContent.trim();
    // Fallback: appData
    try {
        const d = JSON.parse(document.body.dataset.appData || '{}');
        const u = (Array.isArray(d) ? d[0] : d)?.userName;
        if (u) return u;
    } catch (_) {}
    // Fallback: header user link
    const userDropdown = document.querySelector('.user-link');
    if (userDropdown?.textContent.trim()) return userDropdown.textContent.trim();
    return '';
}

function _msg(action, extra = {}) {
    return new Promise((resolve, reject) => {
        const username = _getUsername();
        chrome.runtime.sendMessage({ action, currentUsername: username, ...extra }, r => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (r?.success === false) return reject(new Error(r.error || 'Ошибка'));
            resolve(r);
        });
    });
}

// ── tickets list ──────────────────────────────────────────────────────────────

// Кэш всех заявок (грузим один раз, фильтруем локально - как в мобильном SupportScreen).
let _allTickets = [];

// Применяет поиск + фильтр статуса + сортировку к кэшу и рендерит.
// Повторяет логику applyFilters() из Kotlin: статусы all/active/solved,
// сортировки newest_first/oldest_first/last_answered.
function _applyTicketFilters() {
    const list  = document.getElementById('fp-tickets-list');
    const empty = document.getElementById('fp-tickets-empty');
    const countEl = document.getElementById('fp-tickets-count');
    if (!list) return;

    const query  = (document.getElementById('fp-tickets-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('fp-tickets-status-filter')?.value || 'all';
    const sort   = document.getElementById('fp-tickets-sort')?.value || 'newest_first';

    let result = _allTickets.slice();

    // поиск по заголовку и id
    if (query) {
        result = result.filter(t =>
            (t.title || '').toLowerCase().includes(query) ||
            String(t.id || '').toLowerCase().includes(query)
        );
    }

    // фильтр статуса. Сопоставляем по ОСНОВЕ слова, чтобы любые формы
    // («Открыт», «Открыта», «В ожидании», «Решена», «Решено», «Закрыт», «Закрыта»)
    // корректно попадали в active/solved независимо от склонения и источника
    // (CSS-класс badge или его текст).
    const isActiveStatus = (s) => {
        const t = (s || '').toLowerCase();
        return t.startsWith('откр') || t.includes('ожид');
    };
    const isSolvedStatus = (s) => {
        const t = (s || '').toLowerCase();
        return t.startsWith('закр') || t.startsWith('реш');
    };
    if (status === 'active') {
        result = result.filter(t => isActiveStatus(t.status));
    } else if (status === 'solved') {
        result = result.filter(t => isSolvedStatus(t.status));
    }

    // сортировка
    const keyOf = t => (t.sortKey != null ? t.sortKey : parseInt(t.id) || 0);
    if (sort === 'newest_first') {
        result.sort((a, b) => keyOf(b) - keyOf(a));
    } else if (sort === 'oldest_first') {
        result.sort((a, b) => keyOf(a) - keyOf(b));
    } // last_answered - порядок как пришёл с сервера (по последнему ответу)

    if (countEl) countEl.textContent = `Показано: ${result.length} из ${_allTickets.length}`;

    const totalValEl = document.getElementById('fp-tkt-metric-total');
    const activeValEl = document.getElementById('fp-tkt-metric-active');
    const solvedValEl = document.getElementById('fp-tkt-metric-solved');
    if (totalValEl) totalValEl.textContent = _allTickets.length;
    if (activeValEl) activeValEl.textContent = _allTickets.filter(t => isActiveStatus(t.status)).length;
    if (solvedValEl) solvedValEl.textContent = _allTickets.filter(t => isSolvedStatus(t.status)).length;

    list.innerHTML = '';
    if (!result.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    const statusStyle = {
        'Открыт':      { bg: 'rgba(224,82,82,.15)',  color: '#e05252' },
        'В ожидании':  { bg: 'rgba(240,160,64,.15)', color: '#f0a040' },
        'Решена':      { bg: 'rgba(76,175,130,.15)', color: '#4caf82' },
        'Закрыт':      { bg: 'rgba(58,61,82,.3)',    color: '#5a5f7a' },
    };
    // подбор стиля по основе слова (статус с сайта может быть «Открыта»/«Закрыта» и т.п.)
    const styleFor = (s) => {
        const t = (s || '').toLowerCase();
        if (t.startsWith('откр')) return statusStyle['Открыт'];
        if (t.includes('ожид'))   return statusStyle['В ожидании'];
        if (t.startsWith('реш'))  return statusStyle['Решена'];
        if (t.startsWith('закр')) return statusStyle['Закрыт'];
        return { bg: 'rgba(58,61,82,.3)', color: '#5a5f7a' };
    };
    // «закрываемые» = активные (открыт/в ожидании)
    const isCloseable = (s) => {
        const t = (s || '').toLowerCase();
        return t.startsWith('откр') || t.includes('ожид');
    };

    result.forEach(t => {
        const ss = styleFor(t.status);
        const card = document.createElement('div');
        card.className = 'fp-tkt-card';

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;';

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-size:13px;font-weight:600;flex:1;line-height:1.4;color:var(--fxn-text-main, #ffffff);';
        titleSpan.textContent = t.title || 'Заявка #' + t.id;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'fp-tkt-status';
        statusSpan.style.cssText = `background:${ss.bg};color:${ss.color};border:1px solid ${ss.color}33;`;
        statusSpan.textContent = t.status;

        topRow.appendChild(titleSpan);
        topRow.appendChild(statusSpan);

        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:11.5px;color:var(--fxn-text-desc, #96969a);margin-top:6px;display:flex;align-items:center;justify-content:space-between;';

        const metaText = document.createElement('span');
        metaText.textContent = `#${t.id}${t.lastUpdate ? ' · ' + t.lastUpdate : ''}`;
        meta.appendChild(metaText);

        if (isCloseable(t.status)) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-ghost';
            closeBtn.textContent = 'Закрыть';
            closeBtn.style.cssText = 'font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid rgba(224,82,82,.4);background:rgba(224,82,82,.08);color:#e05252;cursor:pointer;flex-shrink:0;';
            closeBtn.addEventListener('click', async e => {
                e.stopPropagation();
                closeBtn.disabled = true;
                closeBtn.textContent = '...';
                try {
                    const r = await _msg('supportCloseTicket', { ticketId: t.id });
                    if (r?.success) { 
                        if (typeof showNotification === 'function') showNotification('Заявка #' + t.id + ' закрыта');
                        _loadTickets(); 
                    }
                    else { closeBtn.textContent = 'Ошибка'; closeBtn.disabled = false; }
                } catch(_) { closeBtn.textContent = 'Ошибка'; closeBtn.disabled = false; }
            });
            meta.appendChild(closeBtn);
        }

        card.appendChild(topRow);
        card.appendChild(meta);
        card.addEventListener('click', () => _openTicket(t.id));
        list.appendChild(card);
    });
}

// Привязка фильтров (один раз). Изменение любого фильтра только перерисовывает
// из кэша, без перезапроса к серверу.
let _ticketFiltersBound = false;
function _bindTicketFilters() {
    if (_ticketFiltersBound) return;
    const search = document.getElementById('fp-tickets-search');
    const statusF = document.getElementById('fp-tickets-status-filter');
    const sortF = document.getElementById('fp-tickets-sort');
    if (!search && !statusF && !sortF) return;
    _ticketFiltersBound = true;
    search?.addEventListener('input', _applyTicketFilters);
    statusF?.addEventListener('change', _applyTicketFilters);
    sortF?.addEventListener('change', _applyTicketFilters);
}

async function _loadTickets() {
    const list    = document.getElementById('fp-tickets-list');
    const loading = document.getElementById('fp-tickets-loading');
    const empty   = document.getElementById('fp-tickets-empty');
    if (!list) return;

    _bindTicketFilters();

    list.innerHTML = '';
    empty.style.display = 'none';
    loading.style.display = 'block';

    try {
        const { tickets } = await _msg('supportGetTickets');
        loading.style.display = 'none';

        // Грузим ВСЕ заявки в кэш, дальше фильтруем/сортируем локально.
        _allTickets = Array.isArray(tickets) ? tickets : [];

        if (!_allTickets.length) {
            const countEl = document.getElementById('fp-tickets-count');
            if (countEl) countEl.textContent = '';
            empty.style.display = 'block';
            return;
        }

        _applyTicketFilters();
    } catch (e) {
        loading.style.display = 'none';
        list.innerHTML = `<div style="color:#e05252;font-size:12px;padding:8px;">${e.message}</div>`;
    }
}

// ── new ticket form ───────────────────────────────────────────────────────────

function _openNewTicketPanel() {
    const panel = document.getElementById('fp-new-ticket-panel');
    if (!panel) return;
    // Move panel to foxen-body so it covers the full popup content, not just the page div
    const body = document.querySelector('.foxen-body');
    if (body && panel.parentElement !== body) body.appendChild(panel);
    panel.style.display = 'flex';
    _loadCategoriesForForm();
}

function _closeNewTicketPanel() {
    const panel = document.getElementById('fp-new-ticket-panel');
    if (panel) panel.style.display = 'none';
}

async function _loadCategoriesForForm() {
    const fieldsDiv = document.getElementById('fp-new-ticket-fields');
    const submitBtn = document.getElementById('fp-new-ticket-submit');
    if (!fieldsDiv) return;
    fieldsDiv.innerHTML = '<div style="color:#3a3d52;font-size:12px;">Загрузка категорий...</div>';
    if (submitBtn) submitBtn.style.display = 'none';

    try {
        const { categories } = await _msg('supportGetCategories');
        _ticketCategories = categories;
        _renderCategorySelect(fieldsDiv, submitBtn);
    } catch (e) {
        fieldsDiv.innerHTML = `<div style="color:#e05252;font-size:12px;">${e.message}</div>`;
    }
}

function _renderCategorySelect(fieldsDiv, submitBtn) {
    fieldsDiv.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:11px;color:#6a7090;';
    lbl.textContent = 'Тип обращения';
    wrap.appendChild(lbl);

    const sel = document.createElement('select');
    sel.id = 'fp-ticket-cat-select';
    sel.className = 'fp-field-input';

    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'Выберите...';
    sel.appendChild(ph);

    _ticketCategories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name;
        sel.appendChild(opt);
    });
    wrap.appendChild(sel);
    fieldsDiv.appendChild(wrap);

    sel.addEventListener('change', async () => {
        // Remove old fields
        fieldsDiv.querySelectorAll('.fp-tkt-field').forEach(r => r.remove());
        if (submitBtn) submitBtn.style.display = 'none';
        if (!sel.value) return;

        const spinner = document.createElement('div');
        spinner.className = 'fp-tkt-field';
        spinner.style.cssText = 'font-size:12px;color:#3a3d52;padding:4px 0;';
        spinner.textContent = 'Загрузка полей...';
        fieldsDiv.appendChild(spinner);

        try {
            const { fields } = await _msg('supportGetFields', { categoryId: sel.value });
            spinner.remove();
            _renderFields(fields, fieldsDiv);
            if (submitBtn) submitBtn.style.display = 'block';
        } catch (e) {
            spinner.textContent = '❌ ' + e.message;
        }
    });
}

function _evaluateCondition(condition, fieldValues) {
    if (!condition) return true;
    try {
        const c = JSON.parse(condition);
        const targetName = `ticket[fields][${c.fieldId}]`;
        const cur = fieldValues[targetName] || '';
        if (c.type === 'equals') return cur === String(c.value) || parseInt(cur) === c.value;
    } catch (_) {}
    return false;
}

function _getFieldValues(container) {
    const fv = {};
    container.querySelectorAll('[data-field-id]').forEach(el => {
        if (el.dataset.fieldType === 'radio-group') {
            const checked = el.querySelector('input[type=radio]:checked');
            if (checked) fv[el.dataset.fieldId] = checked.value;
        } else if (el.value) {
            fv[el.dataset.fieldId] = el.value;
        }
    });
    return fv;
}

function _updateConditions(fieldsContainer, allFields) {
    const fv = _getFieldValues(fieldsContainer);
    allFields.forEach(f => {
        if (!f.condition) return;
        const wrap = fieldsContainer.querySelector(`[data-wrap-for="${CSS.escape(f.id)}"]`);
        if (!wrap) return;
        const show = _evaluateCondition(f.condition, fv);
        wrap.style.display = show ? 'flex' : 'none';
    });
}

function _renderFields(fields, container) {
    const username = _getUsername();

    fields.forEach(f => {
        const wrap = document.createElement('div');
        wrap.className = 'fp-tkt-field';
        wrap.dataset.wrapFor = f.id;
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
        if (f.condition) wrap.style.display = 'none'; // скрыто до оценки условия

        const lbl = document.createElement('label');
        lbl.style.cssText = 'font-size:10px;color:#6a7090;';
        lbl.textContent = f.name + (f.required ? ' *' : '');
        wrap.appendChild(lbl);

        const lname = f.name.toLowerCase();
        const autoVal = (lname.includes('ник') || lname.includes('логин') || lname.includes('login') || lname.includes('nickname')) ? username : (f.defaultValue || '');
        let input;

        if (f.type === 'select' || f.type === 'radio') {
            // Точно как в Android: Column с border, каждый option - Row с RadioButton + Text
            const col = document.createElement('div');
            col.style.cssText = 'display:flex;flex-direction:column;border:1px solid rgba(106,112,144,0.3);border-radius:4px;overflow:hidden;';
            col.dataset.fieldId = f.id;
            col.dataset.fieldType = 'radio-group';

            let currentVal = autoVal || '';

            function updateRows() {
                col.querySelectorAll('.fp-radio-row').forEach(row => {
                    const r = row.querySelector('input[type=radio]');
                    const selected = r.value === currentVal;
                    r.checked = selected;
                    row.style.background = selected ? 'rgba(100,102,200,0.2)' : 'transparent';
                });
            }

            (f.options || []).forEach(o => {
                const row = document.createElement('div');
                row.className = 'fp-radio-row';
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px;cursor:pointer;';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = f.id;
                radio.value = o.value;
                radio.style.cssText = 'accent-color:#6466b4;cursor:pointer;width:16px;height:16px;flex-shrink:0;';

                const txt = document.createElement('span');
                txt.textContent = o.text;
                txt.style.cssText = 'font-size:13px;color:#c8cadc;';

                row.appendChild(radio);
                row.appendChild(txt);

                row.addEventListener('click', () => {
                    currentVal = o.value;
                    updateRows();
                    _updateConditions(container, fields);
                });

                col.appendChild(row);
            });

            updateRows();
            wrap.appendChild(col);
            container.appendChild(wrap);
            return;
        } else if (f.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'fp-field-input';
            input.style.cssText = 'resize:vertical;min-height:48px;padding:3px 7px;font-size:12px;';
            input.value = autoVal;
            input.placeholder = f.name;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'fp-field-input';
            input.style.padding = '3px 7px';
            input.value = autoVal;
            input.placeholder = f.name;
        }

        input.dataset.fieldId = f.id;
        input.dataset.fieldName = f.name;
        input.addEventListener('change', () => _updateConditions(container, fields));
        wrap.appendChild(input);
        container.appendChild(wrap);
    });

    // Оцениваем условия сразу после рендера
    _updateConditions(container, fields);
}

// ── confirm ───────────────────────────────────────────────────────────────────

function _showConfirm(previewText, payload) {
    _ticketPendingPayload = payload;
    const overlay = document.getElementById('fp-ticket-confirm-overlay');
    const textEl  = document.getElementById('fp-ticket-confirm-text');
    if (!overlay || !textEl) return;
    if (textEl.tagName === 'TEXTAREA' || textEl.tagName === 'INPUT') {
        textEl.value = previewText;
    } else {
        textEl.textContent = previewText;
    }
    overlay.style.display = 'flex';
}

async function _sendPendingTicket() {
    const btn = document.getElementById('fp-ticket-confirm-yes');
    const textEl = document.getElementById('fp-ticket-confirm-text');
    if (!_ticketPendingPayload || !btn) return;
    btn.disabled = true; btn.textContent = 'Отправка...';
    const { categoryId, fieldValues } = _ticketPendingPayload;
    
    // Подхватываем отредактированный пользователем текст из textarea
    let message = _ticketPendingPayload.message;
    if (textEl && (textEl.tagName === 'TEXTAREA' || textEl.tagName === 'INPUT')) {
        const edited = textEl.value.trim();
        if (edited) message = edited;
    }

    try {
        const res = await _msg('supportCreateTicket', { categoryId, fieldValues, message });
        document.getElementById('fp-ticket-confirm-overlay').style.display = 'none';
        _ticketPendingPayload = null;
        if (typeof showNotification === 'function') showNotification('Заявка отправлена' + (res.ticketId ? ' #' + res.ticketId : '') + ' ✓');
        _loadTickets();
    } catch (e) {
        btn.disabled = false; btn.textContent = 'Отправить в ТП';
        if (typeof showNotification === 'function') showNotification('❌ ' + e.message, true);
    }
}

function _buildPreviewFromForm() {
    const catId   = document.getElementById('fp-ticket-cat-select')?.value;
    const catName = _ticketCategories.find(c => c.id === catId)?.name || catId;
    const lines   = [`Категория: ${catName}`];
    const fv      = {};
    document.querySelectorAll('#fp-new-ticket-fields [data-field-id]').forEach(el => {
        // radio-group: читаем выбранный radio внутри
        if (el.dataset.fieldType === 'radio-group') {
            const checked = el.querySelector('input[type=radio]:checked');
            if (checked) {
                fv[el.dataset.fieldId] = checked.value;
                const label = el.querySelector(`label[for="${checked.id}"] span`)?.textContent || checked.value;
                lines.push(`  ${el.dataset.fieldId}: ${label}`);
            }
            return;
        }
        if (el.value) {
            fv[el.dataset.fieldId] = el.value;
            lines.push(`  ${el.dataset.fieldName || el.dataset.fieldId}: ${el.value}`);
        }
    });
    const msgEl = document.querySelector('#fp-new-ticket-fields textarea[data-field-id]');
    const msg   = msgEl?.value?.trim() || '';
    lines.push('', 'Сообщение:', msg);
    return { preview: lines.join('\n'), fieldValues: fv, message: msg, categoryId: catId };
}

// ── auto ticket ───────────────────────────────────────────────────────────────

const DEFAULT_AUTO_TICKET_TEMPLATE = `Здравствуйте, служба поддержки FunPay!

Прошу вас подтвердить следующие выполненные заказы, так как покупатели не нажимают подтверждение более {hours} ч. и не выходят на связь:
{orders_bullet}

Все обязательства по заказам с моей стороны выполнены полностью и вовремя, претензий или жалоб от покупателей в диалогах не поступало.

Заранее спасибо за помощь!
С уважением, {username}.`;

function _renderTicketTemplate(templateText, selectedIds, ageHours, username) {
    const rawTpl = (templateText && templateText.trim()) ? templateText : DEFAULT_AUTO_TICKET_TEMPLATE;
    const ordersStr = selectedIds.map(id => `#${id}`).join(', ');
    const bulletList = selectedIds.map(id => `• Заказ #${id}: товар передан, претензий от покупателя нет.`).join('\n');
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU');
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return rawTpl
        .replace(/\{orders_bullet\}/gi, bulletList)
        .replace(/\{orders\}/gi, ordersStr)
        .replace(/\{hours\}/gi, String(ageHours))
        .replace(/\{username\}/gi, username)
        .replace(/\{count\}/gi, String(selectedIds.length))
        .replace(/\{date\}/gi, dateStr)
        .replace(/\{time\}/gi, timeStr);
}

let _lastFoundOrders = [];

function _prepareAutoTicketPreview() {
    const checkedBoxes = document.querySelectorAll('#fp-auto-ticket-orders-list input[type="checkbox"]:checked');
    let selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    if (!selectedIds.length) {
        selectedIds = _lastFoundOrders.slice(0, 5);
    }
    if (!selectedIds.length) return;

    const ageHours  = parseInt(document.getElementById('fp-ticket-age-hours')?.value  || '24', 10);
    const customTpl = document.getElementById('fp-ticket-custom-template')?.value || '';
    const username  = _getUsername();
    const idsStr    = selectedIds.join(', ');

    const message = _renderTicketTemplate(customTpl, selectedIds, ageHours, username);

    const fv = {
        'ticket[fields][1]': username,
        'ticket[fields][2]': idsStr,
        'ticket[fields][3]': '2',
        'ticket[fields][5]': '201'
    };

    _showConfirm(message, { categoryId: '1', fieldValues: fv, message });
}

async function _buildAndConfirmAutoTicket() {
    const statusEl = document.getElementById('fp-auto-ticket-status');
    const btn      = document.getElementById('fp-send-auto-ticket-btn');
    const ageHours  = parseInt(document.getElementById('fp-ticket-age-hours')?.value  || '24', 10);
    const maxOrders = parseInt(document.getElementById('fp-ticket-max-orders')?.value || '5', 10);

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-rounded" style="animation:fxnSpin 1s linear infinite;">sync</span><span>Сбор заказов...</span>';
    if (statusEl) statusEl.textContent = 'Сканирование оплаченных сделок...';

    const ordersLabel = document.getElementById('fp-auto-orders-label');

    try {
        const { orderIds } = await _msg('getUnconfirmedOrders', { ageHours, maxOrders });
        if (!orderIds || !orderIds.length) {
            if (statusEl) statusEl.textContent = 'Нет неподтверждённых заказов за выбранный период';
            const ordersBox = document.getElementById('fp-auto-ticket-orders-box');
            if (ordersBox) ordersBox.style.display = 'none';
            if (ordersLabel) ordersLabel.style.display = 'none';
            return;
        }

        _lastFoundOrders = orderIds;
        const ordersBox = document.getElementById('fp-auto-ticket-orders-box');
        const ordersListEl = document.getElementById('fp-auto-ticket-orders-list');
        if (ordersBox && ordersListEl) {
            ordersListEl.innerHTML = '';
            orderIds.forEach(id => {
                const item = document.createElement('label');
                item.className = 'fxn-auto-order-item';
                item.innerHTML = `
                    <input type="checkbox" value="${id}" checked style="accent-color:var(--fxn-accent); width:16px; height:16px; cursor:pointer;">
                    <span style="font-weight:600; color:var(--fxn-text-main); font-size:13px; font-family:var(--fxn-font-mono);">#${id}</span>
                    <span style="font-size:11.5px; color:var(--fxn-text-desc); margin-left:auto;">Ожидает подтверждения</span>
                `;
                ordersListEl.appendChild(item);
            });
            ordersBox.style.display = 'flex';
            if (ordersLabel) ordersLabel.style.display = 'flex';
        }

        _prepareAutoTicketPreview();
    } catch (e) {
        if (statusEl) statusEl.textContent = '❌ ' + e.message;
        if (ordersLabel) ordersLabel.style.display = 'none';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-rounded">search_check</span><span>Собрать и подготовить</span>';
    }
}


// ── ticket detail ─────────────────────────────────────────────────────────────

let _currentTicketId = null;
let _currentReplyToken = null;

function _cleanTicketHtml(rawHtml) {
    if (!rawHtml) return '';
    try {
        const doc = new DOMParser().parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        const root = doc.body.firstElementChild || doc.body;
        root.querySelectorAll('style, script, link, iframe').forEach(el => el.remove());
        root.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
            el.removeAttribute('style');
            el.removeAttribute('color');
            el.removeAttribute('bgcolor');
        });
        return root.innerHTML;
    } catch (_) {
        return rawHtml;
    }
}

function _renderBubble(c, myUsername) {
    const myLower = (myUsername || '').trim().toLowerCase();
    const authorLower = (c.author || '').trim().toLowerCase();
    const isMe = authorLower && myLower && (authorLower === myLower || authorLower.includes(myLower) || myLower.includes(authorLower));
    
    const wrap = document.createElement('div');
    wrap.className = 'fp-bubble-row ' + (isMe ? 'fp-bubble-me' : 'fp-bubble-other');
    wrap.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:10px;margin-bottom:8px;width:100%;box-sizing:border-box;`;

    // Avatar (for support agents / others)
    if (!isMe) {
        const av = document.createElement('div');
        av.style.cssText = `width:32px;height:32px;border-radius:50%;flex-shrink:0;background:var(--fxn-accent-soft, rgba(192, 38, 211, 0.16));border:1px solid var(--fxn-accent-border, rgba(192, 38, 211, 0.3));font-size:12px;font-weight:700;color:var(--fxn-accent, #c026d3);display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,0.2);`;
        if (c.avatarUrl) {
            av.style.backgroundImage = `url('${c.avatarUrl}')`;
            av.style.backgroundSize = 'cover';
            av.style.backgroundPosition = 'center';
            av.textContent = '';
        } else {
            av.textContent = (c.author || '?')[0].toUpperCase();
        }
        wrap.appendChild(av);
    }

    const col = document.createElement('div');
    col.style.cssText = `display:flex;flex-direction:column;gap:4px;max-width:85%;align-items:${isMe ? 'flex-end' : 'flex-start'};`;

    // Name + time
    const meta = document.createElement('div');
    meta.style.cssText = `font-size:11px;color:var(--fxn-text-desc, #96969a);padding:0 4px;font-weight:500;`;
    meta.textContent = (!isMe ? c.author + '  ·  ' : '') + (c.timestamp || '');
    col.appendChild(meta);

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = `fp-tkt-bubble ${isMe ? 'is-me' : 'is-other'}`;
    bubble.style.cssText = isMe 
        ? 'border-radius:14px 14px 2px 14px;padding:12px 16px;font-size:13.5px;line-height:1.55;word-break:break-word;box-sizing:border-box;'
        : 'border-radius:14px 14px 14px 2px;padding:12px 16px;font-size:13.5px;line-height:1.55;word-break:break-word;box-sizing:border-box;';

    // Clean HTML content
    const tmp = document.createElement('div');
    tmp.style.cssText = 'background:transparent !important;color:inherit !important;';
    tmp.innerHTML = _cleanTicketHtml(c.text || '');

    // Strip any lingering background / color from all descendant nodes
    tmp.querySelectorAll('*').forEach(el => {
        el.removeAttribute('class');
        el.removeAttribute('style');
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('color', 'inherit', 'important');
    });

    // Make images real img tags with click-to-open
    tmp.querySelectorAll('img').forEach(img => {
        img.className = 'fp-msg-img';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.cursor = 'pointer';
        img.style.marginTop = '6px';
        img.addEventListener('click', () => window.open(img.src, '_blank'));
    });
    // Make links open in new tab
    tmp.querySelectorAll('a').forEach(a => {
        a.target = '_blank';
        a.style.color = 'var(--fxn-accent, #c026d3)';
        a.style.textDecoration = 'underline';
    });

    bubble.appendChild(tmp);
    col.appendChild(bubble);
    wrap.appendChild(col);
    return wrap;
}

async function _openTicket(ticketId) {
    _currentTicketId = ticketId;

    const panel = document.getElementById('fp-ticket-detail-panel');
    if (!panel) return;
    panel.style.display = 'flex';

    document.getElementById('fp-ticket-detail-title').textContent = 'Заявка #' + ticketId;
    document.getElementById('fp-ticket-detail-status').textContent = '';
    document.getElementById('fp-tria').style.display = 'none';
    const msgs = document.getElementById('fp-tdm');
    msgs.innerHTML = '<div style="text-align:center;color:var(--fxn-text-desc);font-size:13px;padding:40px 0;">Загрузка диалога...</div>';

    try {
        const res = await _msg('supportGetTicketDetails', { ticketId });
        _currentReplyToken = res.token || null;
        const myUsername = _getUsername();

        const titleStr = res.title || ('Заявка #' + ticketId);
        document.getElementById('fp-ticket-detail-title').textContent = titleStr;
        const statusEl = document.getElementById('fp-ticket-detail-status');
        const statusColor = { 'Открыт': '#4caf82', 'В ожидании': '#f0a040', 'Решена': '#4caf82', 'Закрыт': '#5a5f7a' };
        statusEl.style.color = statusColor[res.status] || 'var(--fxn-text-desc)';
        statusEl.textContent = res.status || '';
        const avEl = document.getElementById('fp-tkt-av');
        if (avEl) avEl.textContent = titleStr[0]?.toUpperCase() || 'Т';

        msgs.innerHTML = '';
        if (!(res.comments || []).length) {
            msgs.innerHTML = '<div style="text-align:center;color:var(--fxn-text-desc);font-size:12px;padding:30px 0;">Нет сообщений</div>';
        } else {
            (res.comments || []).forEach(c => msgs.appendChild(_renderBubble(c, myUsername)));
            msgs.scrollTop = msgs.scrollHeight;
        }

        if (res.canReply && _currentReplyToken) {
            document.getElementById('fp-tria').style.display = 'flex';
            const inp = document.getElementById('fp-tri');
            if (inp) { inp.value = ''; inp.style.height = 'auto'; }
        }
    } catch (e) {
        msgs.innerHTML = `<div style="color:#e05252;font-size:13px;padding:16px;">${e.message}</div>`;
    }
}

async function _sendTicketReply() {
    const btn   = document.getElementById('fp-ticket-reply-btn');
    const input = document.getElementById('fp-tri');
    const text  = input?.value.trim();
    if (!text || !_currentTicketId) return;
    btn.disabled = true;
    try {
        await _msg('supportAddComment', { ticketId: _currentTicketId, message: text, token: _currentReplyToken });
        // Append message visually - no reload
        const msgs = document.getElementById('fp-tdm');
        const username = _getUsername();
        const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const syntheticComment = { author: username, text: text.replace(/\n/g, '<br>'), timestamp: now, avatarUrl: '' };
        msgs.appendChild(_renderBubble(syntheticComment, username));
        msgs.scrollTop = msgs.scrollHeight;
        input.value = '';
        input.style.height = 'auto';
        btn.disabled = false;
        
        // Hide attach preview if attached
        const preview = document.getElementById('fp-tapr');
        const thumb = document.getElementById('fp-tath');
        if (preview && thumb) { preview.style.display = 'none'; thumb.src = ''; }
    } catch (e) {
        if (typeof showNotification === 'function') showNotification('❌ ' + e.message, true);
        btn.disabled = false;
    }
}

function _attachImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('fp-tapr');
        const thumb = document.getElementById('fp-tath');
        if (preview && thumb) { thumb.src = e.target.result; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
}

// ── init ──────────────────────────────────────────────────────────────────────

// Глобальная делегация кликов по сегментам («Мои обращения» / «Авто-подтверждение»)
if (!window._fxnTktGlobalSubtabDelegate) {
    window._fxnTktGlobalSubtabDelegate = true;
    document.addEventListener('click', (e) => {
        const segBtn = e.target.closest('.fxn-tkt-segment-btn');
        if (!segBtn) return;
        e.preventDefault();
        e.stopPropagation();
        const tab = segBtn.dataset.tktTab;
        const container = segBtn.closest('.foxen-page-content[data-page="tickets"]');
        if (!container) return;
        container.querySelectorAll('.fxn-tkt-segment-btn').forEach(b => b.classList.toggle('active', b === segBtn));
        container.querySelectorAll('.fxn-tkt-pane').forEach(p => p.classList.toggle('active', p.dataset.tktPane === tab));
    });
}

function initTicketsTab() {
    if (!document.getElementById('fp-tickets-list')) return;
    if (_ticketsInited) { _loadTickets(); return; }
    _ticketsInited = true;

    // Load saved settings for auto ticket
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['fpTicketAgeHours', 'fpTicketMaxOrders', 'fpTicketCustomTpl'], res => {
            if (res?.fpTicketAgeHours) {
                const ageInput = document.getElementById('fp-ticket-age-hours');
                if (ageInput) ageInput.value = res.fpTicketAgeHours;
            }
            if (res?.fpTicketMaxOrders) {
                const maxInput = document.getElementById('fp-ticket-max-orders');
                if (maxInput) maxInput.value = res.fpTicketMaxOrders;
            }
            const custArea = document.getElementById('fp-ticket-custom-template');
            if (custArea) {
                custArea.value = (typeof res?.fpTicketCustomTpl === 'string' && res.fpTicketCustomTpl.trim())
                    ? res.fpTicketCustomTpl
                    : DEFAULT_AUTO_TICKET_TEMPLATE;
            }
        });
    }

    const ageInput = document.getElementById('fp-ticket-age-hours');
    ageInput?.addEventListener('input', () => {
        try { chrome.storage?.local?.set({ fpTicketAgeHours: ageInput.value }); } catch(_) {}
    });

    const maxInput = document.getElementById('fp-ticket-max-orders');
    maxInput?.addEventListener('input', () => {
        try { chrome.storage?.local?.set({ fpTicketMaxOrders: maxInput.value }); } catch(_) {}
    });

    const custArea = document.getElementById('fp-ticket-custom-template');
    custArea?.addEventListener('input', () => {
        try { chrome.storage?.local?.set({ fpTicketCustomTpl: custArea.value }); } catch(_) {}
    });

    // Reset template button
    document.getElementById('fp-ticket-reset-template-btn')?.addEventListener('click', () => {
        if (custArea) {
            custArea.value = DEFAULT_AUTO_TICKET_TEMPLATE;
            try { chrome.storage?.local?.set({ fpTicketCustomTpl: DEFAULT_AUTO_TICKET_TEMPLATE }); } catch(_) {}
            if (typeof showNotification === 'function') {
                showNotification('Шаблон обращения сброшен по умолчанию');
            }
        }
    });

    // Variable chips insertion into template
    document.querySelectorAll('.fp-tkt-var').forEach(varItem => {
        varItem.addEventListener('click', (e) => {
            const code = varItem.dataset.code;
            if (!code || !custArea) return;
            const start = custArea.selectionStart ?? custArea.value.length;
            const end = custArea.selectionEnd ?? custArea.value.length;
            const val = custArea.value;
            custArea.value = val.substring(0, start) + code + val.substring(end);
            custArea.selectionStart = custArea.selectionEnd = start + code.length;
            custArea.focus();
            try { chrome.storage?.local?.set({ fpTicketCustomTpl: custArea.value }); } catch(_) {}
            if (typeof showNotification === 'function') {
                showNotification(`Вставлена переменная: ${code}`);
            }
        });
    });

    // Select all orders toggle
    document.getElementById('fp-auto-orders-select-all')?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#fp-auto-ticket-orders-list input[type="checkbox"]');
        const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
        checkboxes.forEach(cb => { cb.checked = anyUnchecked; });
    });

    // Button actions
    document.getElementById('fp-ticket-refresh-btn')   ?.addEventListener('click', _loadTickets);
    document.getElementById('fp-send-auto-ticket-btn') ?.addEventListener('click', _buildAndConfirmAutoTicket);
    document.getElementById('fp-create-ticket-btn')    ?.addEventListener('click', _openNewTicketPanel);
    document.getElementById('fp-new-ticket-close')     ?.addEventListener('click', _closeNewTicketPanel);
    document.getElementById('fp-ticket-confirm-no')    ?.addEventListener('click', () => {
        document.getElementById('fp-ticket-confirm-overlay').style.display = 'none';
        _ticketPendingPayload = null;
    });
    document.getElementById('fp-ticket-confirm-yes')?.addEventListener('click', _sendPendingTicket);
    document.getElementById('fp-new-ticket-submit')?.addEventListener('click', () => {
        const catId = document.getElementById('fp-ticket-cat-select')?.value;
        if (!catId) { if (typeof showNotification === 'function') showNotification('Выберите категорию', true); return; }
        const { preview, fieldValues, message, categoryId } = _buildPreviewFromForm();
        if (!message) { if (typeof showNotification === 'function') showNotification('Введите сообщение', true); return; }
        _closeNewTicketPanel();
        _showConfirm(preview, { categoryId, fieldValues, message });
    });

    document.getElementById('fp-ticket-detail-back')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = document.getElementById('fp-ticket-detail-panel');
        if (panel) panel.style.display = 'none';
        _currentTicketId = null;
    });

    // Close ticket from detail topbar
    document.getElementById('fp-ticket-detail-close-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!_currentTicketId) return;
        const btn = document.getElementById('fp-ticket-detail-close-btn');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try {
            const r = await _msg('supportCloseTicket', { ticketId: _currentTicketId });
            if (r?.success) {
                if (typeof showNotification === 'function') showNotification('Заявка #' + _currentTicketId + ' закрыта');
                const panel = document.getElementById('fp-ticket-detail-panel');
                if (panel) panel.style.display = 'none';
                _currentTicketId = null;
                _loadTickets();
            } else {
                if (typeof showNotification === 'function') showNotification('Ошибка закрытия', true);
            }
        } catch (_) {
            if (typeof showNotification === 'function') showNotification('Ошибка закрытия', true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:15px;">check_circle</span><span>Закрыть заявку</span>';
            }
        }
    });

    // Изоляция кликов внутри панели чата, чтобы клик не закрывал модалку
    document.getElementById('fp-ticket-detail-panel')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    document.getElementById('fp-ticket-reply-btn')?.addEventListener('click', _sendTicketReply);
    const replyInput = document.getElementById('fp-tri');

    replyInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendTicketReply(); }
    });
    replyInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        this.style.overflowY = this.scrollHeight > 100 ? 'auto' : 'hidden';
    });

    // Вставка скриншота из буфера обмена (Ctrl + V)
    replyInput?.addEventListener('paste', e => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    _attachImageFile(file);
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    // Image attach via input
    document.getElementById('fp-ticket-attach-input')?.addEventListener('change', function() {
        const file = this.files[0];
        if (file) _attachImageFile(file);
    });
    document.getElementById('fp-tarm')?.addEventListener('click', () => {
        document.getElementById('fp-tapr').style.display = 'none';
        document.getElementById('fp-tath').src = '';
        document.getElementById('fp-ticket-attach-input').value = '';
    });

    _loadTickets();
}