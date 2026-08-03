// content/features/user_notes.js
// Метки пользователей + закрепление чатов.
// Переработано: редактирование меток вынесено в отдельное окно,
// добавлено наведённое меню (троеточие) и закрепление чатов наверх списка.

let userStatuses = {};               // { userId: { name, color } }
let pinnedChats = {};                // { userId: timestampWhenPinned }
let foxenCustomLabels = [
    { id: 'default-1', name: 'Мошенник',  color: '#f44336' },
    { id: 'default-2', name: 'Постоянный', color: '#4caf50' }
];

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function getContrastColor(hexColor) {
    if (!hexColor) return '#FFFFFF';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

// Берёт фон/текст у самой страницы, чтобы окна совпадали с темой FunPay
// (в т.ч. кастомной или светлой). Ищет ближайший непрозрачный фон.
function fxnPageSurface() {
    const candidates = [
        document.querySelector('.chat-contacts'),
        document.querySelector('.chat'),
        document.querySelector('.content-with-cd-wide'),
        document.body
    ].filter(Boolean);
    let bg = '', color = '';
    for (const el of candidates) {
        const cs = getComputedStyle(el);
        if (!color) color = cs.color;
        const b = cs.backgroundColor;
        if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { bg = b; break; }
    }
    if (!bg) bg = getComputedStyle(document.body).backgroundColor || '#1e1e1e';
    if (!color) color = getComputedStyle(document.body).color || '#e0e0e0';
    return { bg, color };
}
function fxnApplyThemeSurface(el) {
    if (!el) return;
    const { bg, color } = fxnPageSurface();
    el.style.backgroundColor = bg;
    el.style.color = color;
}

async function saveUserStatuses() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenUserStatuses: userStatuses });
}
async function savePinnedChats() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenPinnedChats: pinnedChats });
}
async function saveLabels() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenCustomLabels });
}

/* ------------------------------------------------------------------ */
/* Применение / снятие метки                                           */
/* ------------------------------------------------------------------ */

function paintStatusElement(statusElement, statusObject) {
    if (statusObject && statusObject.color) {
        const contrastColor = getContrastColor(statusObject.color);
        statusElement.style.backgroundColor = statusObject.color;
        statusElement.style.setProperty('--tooltip-bg-color', statusObject.color);
        statusElement.style.setProperty('--tooltip-text-color', contrastColor);
        statusElement.setAttribute('data-fp-tooltip', statusObject.name);
        statusElement.classList.add('fp-tooltip-host');
    } else {
        statusElement.style.backgroundColor = 'transparent';
        statusElement.removeAttribute('data-fp-tooltip');
        statusElement.classList.remove('fp-tooltip-host');
        statusElement.style.removeProperty('--tooltip-bg-color');
        statusElement.style.removeProperty('--tooltip-text-color');
    }
}

function setUserStatus(userId, statusObject) {
    if (!userId) return;
    document.querySelectorAll(`.contact-item[data-id="${userId}"]`).forEach(contactItem => {
        let statusElement = contactItem.querySelector('.foxen-user-status');
        if (!statusElement) {
            statusElement = createElement('span', { class: 'foxen-user-status' });
            const userNameElement = contactItem.querySelector('.media-user-name');
            if (userNameElement) userNameElement.prepend(statusElement);
        }
        paintStatusElement(statusElement, statusObject);
    });

    if (statusObject && statusObject.color) userStatuses[userId] = statusObject;
    else delete userStatuses[userId];

    saveUserStatuses();
}

function applyAllUserStatuses() {
    document.querySelectorAll('a.contact-item').forEach(item => {
        const userId = item.dataset.id;
        const status = userStatuses[userId];
        if (!userId || !status) return;
        let statusElement = item.querySelector('.foxen-user-status');
        if (!statusElement) {
            statusElement = createElement('span', { class: 'foxen-user-status' });
            const userNameElement = item.querySelector('.media-user-name');
            if (userNameElement) userNameElement.prepend(statusElement);
        }
        paintStatusElement(statusElement, status);
    });
}

/* ------------------------------------------------------------------ */
/* Закрепление чатов                                                   */
/* ------------------------------------------------------------------ */

function isPinned(userId) {
    return Object.prototype.hasOwnProperty.call(pinnedChats, userId);
}

async function togglePin(userId) {
    if (!userId) return;
    if (isPinned(userId)) delete pinnedChats[userId];
    else pinnedChats[userId] = Date.now();
    await savePinnedChats();
    applyPinnedChats();
}

// Помечает закреплённые чаты иконкой и поднимает их наверх списка.
function applyPinnedChats() {
    const list = document.querySelector('.contact-list');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('a.contact-item'));
    items.forEach(item => {
        const userId = item.dataset.id;
        const pinned = isPinned(userId);
        item.classList.toggle('foxen-pinned', pinned);

        let pinIcon = item.querySelector('.foxen-pin-icon');
        if (pinned) {
            if (!pinIcon) {
                pinIcon = createElement('span', {
                    class: 'foxen-pin-icon material-icons',
                    title: 'Закреплено'
                });
                pinIcon.textContent = 'push_pin';
                item.appendChild(pinIcon);
            }
        } else if (pinIcon) {
            pinIcon.remove();
        }
    });

    // Закреплённые - наверх, по времени закрепа (раньше закреплённые выше).
    const pinnedItems = items
        .filter(i => isPinned(i.dataset.id))
        .sort((a, b) => (pinnedChats[a.dataset.id] || 0) - (pinnedChats[b.dataset.id] || 0));

    // Поднимаем закреплённые наверх, сохраняя их относительный порядок.
    pinnedItems.reverse().forEach(item => {
        if (list.firstElementChild !== item) list.prepend(item);
    });
}

/* ------------------------------------------------------------------ */
/* Наведённое меню (троеточие) на каждом чате                          */
/* ------------------------------------------------------------------ */

let activePopover = null;

function closePopover() {
    if (activePopover) {
        activePopover.remove();
        activePopover = null;
    }
    document.removeEventListener('click', onDocClickClosePopover, true);
    window.removeEventListener('scroll', closePopover, true);
}

function onDocClickClosePopover(e) {
    if (activePopover && !activePopover.contains(e.target) &&
        !e.target.classList.contains('foxen-chat-dots')) {
        closePopover();
    }
}

function openChatPopover(contactItem, anchorBtn) {
    closePopover();
    const userId = contactItem.dataset.id;
    if (!userId) return;

    const pop = createElement('div', { class: 'foxen-chat-popover' });

    // --- Раздел: метки ---
    const labelsHeader = createElement('div', { class: 'foxen-pop-header' });
    labelsHeader.textContent = 'Метка';
    pop.appendChild(labelsHeader);

    foxenCustomLabels.forEach(label => {
        const row = createElement('div', { class: 'foxen-pop-item' });
        const dot = createElement('span', { class: 'foxen-pop-dot' });
        dot.style.backgroundColor = label.color;
        const txt = createElement('span', { class: 'foxen-pop-text' });
        txt.textContent = label.name;
        row.appendChild(dot);
        row.appendChild(txt);
        const cur = userStatuses[userId];
        if (cur && cur.name === label.name && cur.color === label.color) {
            const check = createElement('span', { class: 'foxen-pop-check material-icons' });
            check.textContent = 'check';
            row.appendChild(check);
        }
        row.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setUserStatus(userId, { name: label.name, color: label.color });
            closePopover();
        });
        pop.appendChild(row);
    });

    if (userStatuses[userId]) {
        const removeRow = createElement('div', { class: 'foxen-pop-item foxen-pop-muted' });
        const ic = createElement('span', { class: 'foxen-pop-icon material-icons' });
        ic.textContent = 'label_off';
        const t = createElement('span', { class: 'foxen-pop-text' });
        t.textContent = 'Убрать метку';
        removeRow.appendChild(ic);
        removeRow.appendChild(t);
        removeRow.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            setUserStatus(userId, null);
            closePopover();
        });
        pop.appendChild(removeRow);
    }

    // Управление метками
    const manageRow = createElement('div', { class: 'foxen-pop-item foxen-pop-muted' });
    const mIc = createElement('span', { class: 'foxen-pop-icon material-icons' });
    mIc.textContent = 'settings';
    const mT = createElement('span', { class: 'foxen-pop-text' });
    mT.textContent = 'Управление метками';
    manageRow.appendChild(mIc);
    manageRow.appendChild(mT);
    manageRow.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        closePopover();
        openLabelManager();
    });
    pop.appendChild(manageRow);

    pop.appendChild(createElement('div', { class: 'foxen-pop-divider' }));

    // --- Раздел: закрепление ---
    const pinRow = createElement('div', { class: 'foxen-pop-item' });
    const pIc = createElement('span', { class: 'foxen-pop-icon material-icons' });
    pIc.textContent = 'push_pin';
    const pT = createElement('span', { class: 'foxen-pop-text' });
    pT.textContent = isPinned(userId) ? 'Открепить чат' : 'Закрепить чат';
    pinRow.appendChild(pIc);
    pinRow.appendChild(pT);
    pinRow.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        togglePin(userId);
        closePopover();
    });
    pop.appendChild(pinRow);

    document.body.appendChild(pop);
    fxnApplyThemeSurface(pop);
    activePopover = pop;

    // Позиционирование возле кнопки
    const rect = anchorBtn.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.right - popRect.width;
    if (left < 8) left = 8;
    if (top + popRect.height > window.innerHeight - 8) {
        top = rect.top - popRect.height - 4;
    }
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    setTimeout(() => {
        document.addEventListener('click', onDocClickClosePopover, true);
        window.addEventListener('scroll', closePopover, true);
    }, 0);
}

// Вешает кнопку-троеточие на контакт.
function ensureDotsButton(contactItem) {
    if (contactItem.querySelector('.foxen-chat-dots')) return;
    const btn = createElement('button', {
        class: 'foxen-chat-dots material-icons',
        type: 'button',
        title: 'Действия'
    });
    btn.textContent = 'more_vert';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activePopover) { closePopover(); return; }
        openChatPopover(contactItem, btn);
    });
    contactItem.appendChild(btn);
}

function applyDotsButtons() {
    document.querySelectorAll('a.contact-item').forEach(ensureDotsButton);
}

/* ------------------------------------------------------------------ */
/* Отдельное окно управления метками                                   */
/* ------------------------------------------------------------------ */

function openLabelManager() {
    document.querySelector('.foxen-label-overlay')?.remove();

    const overlay = createElement('div', { class: 'foxen-label-overlay' });
    const modal = createElement('div', { class: 'foxen-label-modal' });

    const head = createElement('div', { class: 'foxen-label-head' });
    const title = createElement('h3', {});
    title.textContent = 'Управление метками';
    const closeBtn = createElement('button', { class: 'foxen-label-close material-icons', type: 'button' });
    closeBtn.textContent = 'close';
    head.appendChild(title);
    head.appendChild(closeBtn);
    modal.appendChild(head);

    const hint = createElement('div', { class: 'foxen-label-hint' });
    hint.textContent = 'Здесь создаются и редактируются метки. Чтобы повесить метку на чат - наведите на него в списке и нажмите ⋮.';
    modal.appendChild(hint);

    const listWrap = createElement('div', { class: 'foxen-label-list' });
    modal.appendChild(listWrap);

    const addBtn = createElement('button', { class: 'foxen-label-add', type: 'button' });
    addBtn.textContent = '+ Добавить метку';
    modal.appendChild(addBtn);

    const renderRows = () => {
        listWrap.innerHTML = '';
        if (!foxenCustomLabels.length) {
            const empty = createElement('div', { class: 'foxen-label-empty' });
            empty.textContent = 'Меток пока нет. Добавьте первую.';
            listWrap.appendChild(empty);
        }
        foxenCustomLabels.forEach(label => {
            const row = createElement('div', { class: 'foxen-label-row' });

            const color = createElement('input', {
                type: 'color', value: label.color, class: 'foxen-label-color'
            });
            color.addEventListener('input', () => {
                label.color = color.value;
                saveLabels();
                applyAllUserStatuses();
            });

            const name = createElement('input', {
                type: 'text', value: label.name, class: 'foxen-label-name',
                placeholder: 'Название метки'
            });
            const commitName = () => {
                const newName = name.value.trim() || 'Без названия';
                name.value = newName;
                label.name = newName;
                saveLabels();
                applyAllUserStatuses();
            };
            name.addEventListener('blur', commitName);
            name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });

            const del = createElement('button', { class: 'foxen-label-del material-icons', type: 'button', title: 'Удалить' });
            del.textContent = 'delete';
            del.addEventListener('click', () => {
                foxenCustomLabels = foxenCustomLabels.filter(l => l.id !== label.id);
                saveLabels();
                renderRows();
            });

            row.appendChild(color);
            row.appendChild(name);
            row.appendChild(del);
            listWrap.appendChild(row);
        });
    };

    addBtn.addEventListener('click', () => {
        foxenCustomLabels.push({ id: Date.now().toString(), name: 'Новая метка', color: '#ff9800' });
        saveLabels();
        renderRows();
        const inputs = listWrap.querySelectorAll('.foxen-label-name');
        const last = inputs[inputs.length - 1];
        if (last) { last.focus(); last.select(); }
    });

    const close = () => overlay.remove();
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    renderRows();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    fxnApplyThemeSurface(modal);
}

/* ------------------------------------------------------------------ */
/* Пункты в выпадающем меню заголовка чата                             */
/* (компактные: один клик = действие, без встроенного редактора)       */
/* ------------------------------------------------------------------ */

function buildChatHeaderMenu() {
    const observer = new MutationObserver(() => {
        const chatMenu = document.querySelector('.chat-header .dropdown-menu');
        if (chatMenu && !chatMenu.dataset.foxenStatusMenu) {
            chatMenu.dataset.foxenStatusMenu = 'true';
            renderHeaderMenu(chatMenu);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function renderHeaderMenu(chatMenu) {
    chatMenu.querySelectorAll('.foxen-status-item, .divider.foxen-divider').forEach(el => el.remove());

    const getUserId = () => document.querySelector('.contact-item.active')?.dataset.id;

    chatMenu.insertAdjacentHTML('beforeend', '<li class="divider foxen-divider"></li>');

    foxenCustomLabels.forEach(label => {
        const li = createElement('li', { class: 'foxen-status-item' });
        const a = createElement('a', { href: '#' });
        const dot = createElement('span', { class: 'foxen-status-circle' });
        dot.style.backgroundColor = label.color;
        const span = createElement('span', { class: 'foxen-status-name' });
        span.textContent = label.name;
        a.appendChild(dot);
        a.appendChild(span);
        a.addEventListener('click', (e) => {
            e.preventDefault();
            setUserStatus(getUserId(), { name: label.name, color: label.color });
        });
        li.appendChild(a);
        chatMenu.appendChild(li);
    });

    const removeLi = createElement('li', { class: 'foxen-status-item' });
    const removeA = createElement('a', { href: '#' });
    removeA.textContent = 'Убрать метку';
    removeA.addEventListener('click', (e) => {
        e.preventDefault();
        setUserStatus(getUserId(), null);
        removeLi.style.display = 'none';
    });
    removeLi.appendChild(removeA);
    chatMenu.appendChild(removeLi);

    const pinLi = createElement('li', { class: 'foxen-status-item' });
    const pinA = createElement('a', { href: '#' });
    const syncPinText = () => { pinA.textContent = isPinned(getUserId()) ? '📌 Открепить чат' : '📌 Закрепить чат'; };
    syncPinText();
    pinA.addEventListener('click', (e) => {
        e.preventDefault();
        togglePin(getUserId());
        syncPinText();
    });
    pinLi.appendChild(pinA);
    chatMenu.appendChild(pinLi);

    // Меню в шапке кэшируется, а активный чат меняется - поэтому
    // пересинхронизируем «Убрать метку» и текст закрепа при каждом открытии.
    const syncDynamicItems = () => {
        const uid = getUserId();
        removeLi.style.display = (uid && userStatuses[uid]) ? '' : 'none';
        syncPinText();
    };
    syncDynamicItems();

    const toggleBtn = chatMenu.closest('.dropdown')?.querySelector('[data-toggle="dropdown"]');
    if (toggleBtn && !toggleBtn.dataset.fxnSyncBound) {
        toggleBtn.dataset.fxnSyncBound = '1';
        toggleBtn.addEventListener('click', () => setTimeout(syncDynamicItems, 0));
    }

    const manageLi = createElement('li', { class: 'foxen-status-item' });
    const manageA = createElement('a', { href: '#' });
    manageA.textContent = '⚙️ Управление метками';
    manageA.addEventListener('click', (e) => {
        e.preventDefault();
        openLabelManager();
    });
    manageLi.appendChild(manageA);
    chatMenu.appendChild(manageLi);
}

/* ------------------------------------------------------------------ */
/* Инициализация                                                       */
/* ------------------------------------------------------------------ */

async function initializeUserNotes() {
    const data = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
        'foxenUserStatuses', 'foxenPinnedChats', 'foxenCustomLabels'
    ]);
    userStatuses = data.foxenUserStatuses || {};
    pinnedChats  = data.foxenPinnedChats || {};
    if (Array.isArray(data.foxenCustomLabels)) foxenCustomLabels = data.foxenCustomLabels;

    applyAllUserStatuses();
    applyDotsButtons();
    applyPinnedChats();
    buildChatHeaderMenu();

    // Следим за обновлением списка контактов (поиск, новые сообщения, подгрузка).
    const contactsNode = document.querySelector('.chat-contacts') || document.body;
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            applyAllUserStatuses();
            applyDotsButtons();
            applyPinnedChats();
        });
    });
    observer.observe(contactsNode, { childList: true, subtree: true });
}
