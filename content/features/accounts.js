async function saveAccountsList() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAccounts: foxenAccounts });
    renderAccountsList();
}

const _fxnAccSnapCache = {}; // key -> { ts, snapshot }

async function fxnFetchAccountSnapshot(key) {
    try {
        const res = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getAccountSnapshot', key });
        if (res && res.ok) {
            _fxnAccSnapCache[key] = { ts: Date.now(), snapshot: res.snapshot || {} };
            return res.snapshot || {};
        }
    } catch (_) {}
    return null;
}

async function renderAccountsList() {
    const listContainer = document.getElementById('foxenAccountsList');
    if (!listContainer) return;

    const currentUsernameEl = document.querySelector('.user-link-name');
    const currentUsername = currentUsernameEl ? currentUsernameEl.textContent.trim() : null;

    listContainer.innerHTML = '';
    if (foxenAccounts.length === 0) {
        listContainer.innerHTML = '<p style="grid-column:1/-1;font-size:14px;color:var(--fxn-text-muted,#a0a0a0);text-align:center;padding:24px 0;">Нет сохраненных аккаунтов.</p>';
        return;
    }

    foxenAccounts.forEach((account, index) => {
        const isActive = account.name === currentUsername;
        if (isActive) {
            const livePhotoEl = document.querySelector('.user-link-photo, .avatar-photo');
            if (livePhotoEl) {
                const style = livePhotoEl.getAttribute('style') || livePhotoEl.style.backgroundImage || '';
                const m = style.match(/url\(['"]?(https?:\/\/[^'"")]+|\/[^'"")]+)['"]?\)/i);
                if (m && m[1]) {
                    account.avatar = m[1].startsWith('/') ? 'https://funpay.com' + m[1] : m[1];
                } else {
                    const img = livePhotoEl.querySelector('img');
                    if (img && img.src) account.avatar = img.src;
                }
            }
            const liveBalEl = document.querySelector('.badge-balance, .user-link-balance');
            if (liveBalEl) {
                const b = liveBalEl.textContent.replace(/\s+/g, ' ').trim();
                if (b) account.balance = b;
            }
        }
        const card = createElement('div', { class: `fxn-vireon-card ${isActive ? 'active' : ''}` });

        // Декоративный плавный световой блик из правого нижнего угла (точь-в-точь по макету)
        card.innerHTML = `
            <svg class="fxn-vireon-card-glare" viewBox="0 0 460 210" fill="none" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="fxnGlareGrad_${index}" x1="100%" y1="100%" x2="45%" y2="20%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10" />
                        <stop offset="35%" stop-color="#ffffff" stop-opacity="0.04" />
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="fxnStrokeGrad_${index}" x1="100%" y1="100%" x2="50%" y2="30%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
                        <stop offset="60%" stop-color="#ffffff" stop-opacity="0.08" />
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path d="M 180 210 C 260 200 360 150 460 70 L 460 210 Z" fill="url(#fxnGlareGrad_${index})" />
                <path d="M 180 210 C 260 200 360 150 460 70" stroke="url(#fxnStrokeGrad_${index})" stroke-width="1.2" fill="none" />
            </svg>
        `;

        // Верхняя часть карточки (Аватар + Инфо + Статус / ...)
        const topRow = createElement('div', { class: 'fxn-vireon-top-row' });

        // Аватарка
        const avatar = createElement('div', { class: 'fxn-vireon-avatar' });
        if (account.avatar) {
            avatar.style.backgroundImage = `url('${account.avatar}')`;
        } else {
            avatar.innerHTML = `
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#828699" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            `;
        }

        if (account.unread && account.unread > 0) {
            const unreadBadge = createElement('span', { class: 'fxn-vireon-unread' });
            unreadBadge.textContent = account.unread > 99 ? '99+' : String(account.unread);
            unreadBadge.title = `Непрочитанных сообщений: ${account.unread}`;
            avatar.appendChild(unreadBadge);
        }
        topRow.appendChild(avatar);

        // Блок информации (Имя + Финансы)
        const info = createElement('div', { class: 'fxn-vireon-info' });
        const nameEl = createElement('div', { class: 'fxn-vireon-name', title: account.name });
        nameEl.textContent = account.name;

        // Чистим баланс от повтора "Финансы" если он уже есть в строке
        let rawBalance = String(account.balance || '0 ₽').trim();
        rawBalance = rawBalance.replace(/^Финансы\s*:?\s*/i, '').trim() || '0 ₽';

        const balEl = createElement('div', { class: 'fxn-vireon-balance' });
        balEl.innerHTML = `
            <svg class="fxn-vireon-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <span>Финансы ${rawBalance}</span>
        `;
        info.append(nameEl, balEl);
        topRow.appendChild(info);

        // Правая часть (АКТИВЕН / ВОЙТИ + три точки)
        const topRight = createElement('div', { class: 'fxn-vireon-top-right' });

        if (isActive) {
            const statusBadge = createElement('div', { class: 'fxn-vireon-status-badge active' });
            statusBadge.innerHTML = '<span class="fxn-vireon-dot"></span><span>АКТИВЕН</span>';
            topRight.appendChild(statusBadge);
        } else {
            const loginBadge = createElement('button', { 
                class: 'fxn-vireon-status-badge login-btn', 
                type: 'button',
                title: 'Переключиться на этот аккаунт'
            });
            loginBadge.innerHTML = '<span class="fxn-vireon-dot inactive"></span><span>ВОЙТИ</span>';
            loginBadge.addEventListener('click', async (e) => {
                e.stopPropagation();
                loginBadge.disabled = true;
                loginBadge.innerHTML = `
                    <svg class="fxn-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                    <span>ВХОД...</span>
                `;
                showNotification(`Переключаюсь на аккаунт ${account.name}...`, false);
                try {
                    const res = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'setGoldenKey', key: account.key });
                    if (!res || !res.success) {
                        loginBadge.disabled = false;
                        loginBadge.innerHTML = '<span class="fxn-vireon-dot inactive"></span><span>ВОЙТИ</span>';
                        showNotification(`Не удалось войти: ${res && res.error ? res.error : 'неизвестная ошибка'}`, true);
                    }
                } catch (err) {
                    loginBadge.disabled = false;
                    loginBadge.innerHTML = '<span class="fxn-vireon-dot inactive"></span><span>ВОЙТИ</span>';
                    showNotification(`Ошибка переключения: ${err.message}`, true);
                }
            });
            topRight.appendChild(loginBadge);
        }

        const moreBtn = createElement('div', { class: 'fxn-vireon-more-btn', title: 'Действия' });
        moreBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
            </svg>
        `;
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isActive) {
                if (confirm(`Войти в аккаунт "${account.name}"?`)) {
                    (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'setGoldenKey', key: account.key });
                }
            } else {
                showNotification(`Аккаунт ${account.name} активен`);
            }
        });
        topRight.appendChild(moreBtn);

        topRow.appendChild(topRight);
        card.appendChild(topRow);

        // Тонкая горизонтальная линия разделителя внутри карточки
        const divider = createElement('div', { class: 'fxn-vireon-card-divider' });
        card.appendChild(divider);

        // Нижняя часть (Кнопки "Имя" и "Удалить")
        const bottomRow = createElement('div', { class: 'fxn-vireon-bottom-row' });

        const renameBtn = createElement('button', { 
            class: 'fxn-vireon-action-btn rename', 
            type: 'button'
        });
        renameBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
            <span>Имя</span>
        `;
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Если уже редактируется, не создаем повторно
            if (nameEl.querySelector('.fxn-vireon-name-input')) return;

            const currentVal = account.name;
            const input = createElement('input', {
                type: 'text',
                class: 'fxn-vireon-name-input',
                value: currentVal
            });

            nameEl.textContent = '';
            nameEl.appendChild(input);
            input.focus();
            input.select();

            let saved = false;
            const commit = async () => {
                if (saved) return;
                saved = true;
                const newName = input.value.trim();
                if (newName && newName !== currentVal) {
                    foxenAccounts[index].name = newName;
                    await saveAccountsList();
                } else {
                    nameEl.textContent = currentVal;
                }
            };

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    commit();
                } else if (ev.key === 'Escape') {
                    ev.preventDefault();
                    saved = true;
                    nameEl.textContent = currentVal;
                }
            });

            input.addEventListener('blur', () => {
                commit();
            });

            input.addEventListener('click', (ev) => ev.stopPropagation());
        });

        const deleteBtn = createElement('button', { 
            class: 'fxn-vireon-action-btn delete', 
            type: 'button'
        });
        deleteBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Удалить</span>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Вы уверены, что хотите удалить аккаунт "${account.name}"?`)) {
                foxenAccounts.splice(index, 1);
                saveAccountsList();
            }
        });

        bottomRow.append(renameBtn, deleteBtn);
        card.appendChild(bottomRow);

        listContainer.appendChild(card);
    });

    // авто-обновление снимков раз в ~55 минут (если давно не обновляли)
    maybeAutoRefreshAccounts();
}

// Автообновление аватар/баланс/непрочитанных не чаще раза в 55 минут.
let _fxnAccAutoRefreshing = false;
async function maybeAutoRefreshAccounts() {
    if (_fxnAccAutoRefreshing) return;
    const STALE = 55 * 60 * 1000;
    const now = Date.now();
    const needsUpdate = foxenAccounts.some(a => a.key && (!a._snapTs || (now - a._snapTs) > STALE || !a.avatar || !a.balance));
    if (!needsUpdate) return;
    _fxnAccAutoRefreshing = true;
    try {
        let changed = false;
        for (const account of foxenAccounts) {
            if (!account.key) continue;
            if (account._snapTs && account.avatar && account.balance && (now - account._snapTs) <= STALE) continue;
            const snap = await fxnFetchAccountSnapshot(account.key);
            if (snap) {
                let av = snap.avatar || snap.avatarUrl || account.avatar || '';
                if (av && av.startsWith('/')) av = 'https://funpay.com' + av;
                account.avatar = av;
                account.balance = snap.balance || account.balance || '';
                account.unread = typeof snap.unread === 'number' ? snap.unread : (account.unread || 0);
                account._snapTs = Date.now();
                changed = true;
            }
        }
        if (changed) await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAccounts });
        if (changed) renderAccountsList();
    } finally {
        _fxnAccAutoRefreshing = false;
    }
}

// Кнопка ручного обновления данных всех аккаунтов (аватар/баланс/непрочитанные).
async function fxnRefreshAllAccounts() {
    showNotification('Обновляю данные аккаунтов…');
    for (const account of foxenAccounts) {
        if (!account.key) continue;
        const snap = await fxnFetchAccountSnapshot(account.key);
        if (snap) {
            let av = snap.avatar || snap.avatarUrl || account.avatar || '';
            if (av && av.startsWith('/')) av = 'https://funpay.com' + av;
            account.avatar = av;
            account.balance = snap.balance || account.balance || '';
            account.unread = typeof snap.unread === 'number' ? snap.unread : (account.unread || 0);
            account._snapTs = Date.now();
        }
    }
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenAccounts });
    renderAccountsList();
    showNotification('Данные аккаунтов обновлены.');
}

function setupAccountManagementHandlers() {
    const addBtn = document.getElementById('addCurrentAccountBtn');
    // Проверяем, не был ли обработчик уже привязан
    if (!addBtn || addBtn.dataset.handlerAttached) return;

    addBtn.addEventListener('click', async () => {
        const currentUsernameEl = document.querySelector('.user-link-name');
        const currentUsername = currentUsernameEl ? currentUsernameEl.textContent.trim() : null;

        if (!currentUsername) {
            showNotification('Не удалось определить имя текущего пользователя.', true);
            return;
        }

        if (foxenAccounts.some(acc => acc.name === currentUsername)) {
            showNotification(`Аккаунт "${currentUsername}" уже добавлен.`, true);
            return;
        }
        
        try {
            const response = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getGoldenKey' });
            if (response && response.success) {
                let liveAvatar = '';
                const livePhotoEl = document.querySelector('.user-link-photo, .avatar-photo');
                if (livePhotoEl) {
                    const style = livePhotoEl.getAttribute('style') || livePhotoEl.style.backgroundImage || '';
                    const m = style.match(/url\(['"]?(https?:\/\/[^'"")]+|\/[^'"")]+)['"]?\)/i);
                    if (m && m[1]) {
                        liveAvatar = m[1].startsWith('/') ? 'https://funpay.com' + m[1] : m[1];
                    }
                    if (!liveAvatar) {
                        const img = livePhotoEl.querySelector('img');
                        if (img && img.src) liveAvatar = img.src;
                    }
                }
                const liveBalEl = document.querySelector('.badge-balance, .user-link-balance');
                let liveBalance = liveBalEl ? liveBalEl.textContent.replace(/\s+/g, ' ').trim() : '';

                foxenAccounts.push({
                    name: currentUsername,
                    key: response.key,
                    avatar: liveAvatar,
                    balance: liveBalance,
                    unread: 0,
                    _snapTs: Date.now()
                });
                await saveAccountsList();
                showNotification(`Аккаунт "${currentUsername}" успешно добавлен!`);
            } else {
                showNotification('Не удалось получить ключ сессии. Вы вошли в аккаунт?', true);
            }
        } catch (error) {
            showNotification(`Ошибка при добавлении аккаунта: ${error.message}`, true);
        }
    });

    // Помечаем, что обработчик привязан, чтобы избежать дублирования
    addBtn.dataset.handlerAttached = 'true';

    const refreshBtn = document.getElementById('fxnRefreshAccountsBtn');
    if (refreshBtn && !refreshBtn.dataset.handlerAttached) {
        refreshBtn.dataset.handlerAttached = 'true';
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            try { await fxnRefreshAllAccounts(); } finally { refreshBtn.disabled = false; }
        });
    }
}