// content/features/piggy_bank.js
'use strict';

let piggyBanks = [];
let currentBalance = 0;

function getCurrentBalance() {
    const balanceElement = document.querySelector('.badge-balance');
    if (!balanceElement) return 0;

    // Убираем все, кроме цифр и десятичной точки/запятой
    const balanceText = balanceElement.textContent.replace(/[^\d.,]/g, '').replace(',', '.');
    const balance = parseFloat(balanceText);
    
    return isNaN(balance) ? 0 : balance;
}

async function loadPiggyBanks() {
    const data = await browser.storage.local.get('fpToolsPiggyBanks');
    piggyBanks = data.fpToolsPiggyBanks || [];
    currentBalance = getCurrentBalance();
    // Обновляем текущую сумму для всех копилок, так как она общая
    piggyBanks.forEach(pb => {
        pb.currentAmount = currentBalance;
    });
}

async function savePiggyBanks() {
    // Сохраняем только структуру, а не текущий баланс
    const banksToSave = piggyBanks.map(({ id, name, goalAmount, isMain }) => ({ id, name, goalAmount, isMain }));
    await browser.storage.local.set({ fpToolsPiggyBanks: banksToSave });
    
    // Перезагружаем и рендерим все заново, чтобы обеспечить консистентность
    await loadPiggyBanks();
    renderNavbarIcon();
    renderPiggyBankSettings();
}

function renderNavbarIcon() {
    const financeLink = document.querySelector('.menu-item-balance');
    if (!financeLink) return;

    let piggyBankLi = document.getElementById('fp-tools-piggy-bank-icon-li');
    if (piggyBankLi) piggyBankLi.remove();
    
    if (piggyBanks.length === 0) return;

    piggyBankLi = createElement('li', { id: 'fp-tools-piggy-bank-icon-li', class: 'dropdown' });

    let dropdownContent = '';
    piggyBanks.forEach(pb => {
        const remaining = Math.max(0, pb.goalAmount - pb.currentAmount);
        const percentage = pb.goalAmount > 0 ? (pb.currentAmount / pb.goalAmount) * 100 : 0;
        const clampedPercentage = Math.min(100, percentage);
        
        dropdownContent += `
            <div class="pb-dropdown-item ${pb.isMain ? 'main' : ''}">
                <div class="pb-dropdown-header">
                    <span class="pb-dropdown-title">${pb.isMain ? '⭐' : ''} ${pb.name}</span>
                    <span class="pb-dropdown-percentage">${percentage.toFixed(1)}%</span>
                </div>
                <div class="pb-dropdown-progress-bar">
                    <div class="pb-dropdown-progress-fill" style="width: ${clampedPercentage}%;"></div>
                </div>
                <div class="pb-dropdown-info">
                    Осталось: ${remaining.toLocaleString('ru-RU')} ₽
                </div>
            </div>
        `;
    });
    
    piggyBankLi.innerHTML = `
        <a>🐷</a>
        <div class="fp-tools-piggy-bank-dropdown">
            ${dropdownContent}
            <div class="pb-dropdown-footer">
                <a href="#" id="manage-piggy-banks-link">Управлять копилками</a>
            </div>
        </div>
    `;

    financeLink.parentElement.insertAdjacentElement('afterend', piggyBankLi);

    document.getElementById('manage-piggy-banks-link').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.fp-tools-nav li[data-page="piggy_banks"] a')?.click();
        document.querySelector('.fp-tools-popup')?.classList.add('active');
    });
}

function renderPiggyBankSettings() {
    const container = document.getElementById('piggy-banks-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (piggyBanks.length === 0) {
        container.innerHTML = `<p class="template-info" style="text-align: center;">У вас пока нет копилок. Нажмите кнопку выше, чтобы создать первую!</p>`;
        return;
    }

    piggyBanks.forEach(pb => {
        const remaining = Math.max(0, pb.goalAmount - pb.currentAmount);
        const percentage = pb.goalAmount > 0 ? (pb.currentAmount / pb.goalAmount) * 100 : 0;
        const clampedPercentage = Math.min(100, percentage);

        const item = createElement('div', { class: 'piggy-bank-item' + (pb.isMain ? ' main-piggy-bank' : ''), 'data-id': pb.id });
        item.innerHTML = `
            <div class="piggy-bank-item-header">
                <span class="piggy-bank-item-name">${pb.name}</span>
                ${pb.isMain ? '<span class="piggy-bank-item-main-badge">Основная</span>' : ''}
                <div class="piggy-bank-item-actions">
                    <button class="btn btn-default btn-sm edit-btn" title="Редактировать">✏️</button>
                    <button class="btn btn-default btn-sm delete-btn" title="Удалить">🗑️</button>
                    ${!pb.isMain ? '<button class="btn btn-default btn-sm set-main-btn" title="Сделать основной">⭐</button>' : ''}
                </div>
            </div>
            <div class="piggy-bank-progress-info">
                <span>Собрано: <b>${pb.currentAmount.toLocaleString('ru-RU')} ₽</b></span>
                <span>Цель: <b>${pb.goalAmount.toLocaleString('ru-RU')} ₽</b></span>
            </div>
            <div class="piggy-bank-progress-bar">
                <div class="piggy-bank-progress-fill" style="width: ${clampedPercentage}%;"></div>
            </div>
            <div class="piggy-bank-percentage" style="text-align: right; font-size: 13px; color: #aaa;">
                Осталось: ${remaining.toLocaleString('ru-RU')} ₽ (${percentage.toFixed(1)}%)
            </div>
        `;
        container.appendChild(item);
    });
}

function showPiggyBankModal(piggyBank = null) {
    // ИЗМЕНЕНО: Проверка, не открыто ли уже модальное окно
    if (document.querySelector('.piggy-bank-modal-overlay')) return;

    const isEditing = !!piggyBank;
    const overlay = createElement('div', { class: 'piggy-bank-modal-overlay' });
    overlay.innerHTML = `
        <div class="piggy-bank-modal">
            <h4>${isEditing ? 'Редактировать копилку' : 'Новая копилка'}</h4>
            <div class="form-group">
                <label for="pb-name">Название</label>
                <input type="text" id="pb-name" class="template-input" value="${piggyBank?.name || ''}">
            </div>
            <div class="form-group">
                <label for="pb-goal">Цель (₽)</label>
                <input type="number" id="pb-goal" class="template-input" value="${piggyBank?.goalAmount || ''}">
            </div>
            <div class="piggy-bank-modal-actions">
                <button class="btn btn-default cancel-btn">Отмена</button>
                <button class="btn save-btn">Сохранить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    overlay.querySelector('.cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    overlay.querySelector('.save-btn').addEventListener('click', () => {
        const nameInput = overlay.querySelector('#pb-name');
        const goalInput = overlay.querySelector('#pb-goal');
        
        const name = nameInput.value.trim();
        const goal = parseFloat(goalInput.value) || 0;
        
        if (!name) {
            showNotification('Название не может быть пустым', true);
            return;
        }

        if (isEditing) {
            const index = piggyBanks.findIndex(pb => pb.id === piggyBank.id);
            if (index !== -1) {
                piggyBanks[index].name = name;
                piggyBanks[index].goalAmount = goal;
            }
        } else {
            piggyBanks.push({
                id: Date.now(),
                name,
                goalAmount: goal,
                currentAmount: currentBalance, // Устанавливаем текущий баланс при создании
                isMain: piggyBanks.length === 0 // Первая копилка становится основной
            });
        }
        savePiggyBanks();
        closeModal();
    });
}

function initializePiggyBank() {
    // ИЗМЕНЕНО: Защита от повторной инициализации
    if (document.body.dataset.piggyBankInitialized) return;
    document.body.dataset.piggyBankInitialized = 'true';

    loadPiggyBanks().then(() => {
        renderNavbarIcon();
        renderPiggyBankSettings();
    });

    document.addEventListener('click', e => {
        const createBtn = e.target.closest('#create-piggy-bank-btn');
        if (createBtn) {
            showPiggyBankModal();
            return;
        }

        const item = e.target.closest('.piggy-bank-item');
        if (!item) return;

        const id = parseInt(item.dataset.id, 10);
        const pb = piggyBanks.find(p => p.id === id);
        if (!pb) return;

        if (e.target.closest('.edit-btn')) showPiggyBankModal(pb);
        
        if (e.target.closest('.delete-btn')) {
            if (confirm(`Вы уверены, что хотите удалить копилку "${pb.name}"?`)) {
                piggyBanks = piggyBanks.filter(p => p.id !== id);
                if (pb.isMain && piggyBanks.length > 0) {
                    piggyBanks[0].isMain = true; // Назначаем новую основную, если удалили старую
                }
                savePiggyBanks();
            }
        }
        if (e.target.closest('.set-main-btn')) {
            piggyBanks.forEach(p => p.isMain = false);
            const index = piggyBanks.findIndex(p => p.id === id);
            if (index !== -1) piggyBanks[index].isMain = true;
            savePiggyBanks();
        }
    });
}
