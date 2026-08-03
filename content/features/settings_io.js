// content/features/settings_io.js - Foxen 2.9
// Экспорт и импорт ВСЕХ настроек Foxen в файл .fpconfig
// Принцип: выгружаем всё из chrome.storage.local, КРОМЕ списка исключений
// (аккаунты, токены, кэши и временное рантайм-состояние). Так новые фичи
// попадают в бэкап автоматически, без правки списка.

const FP_CONFIG_VERSION  = 2;
const FP_CONFIG_MAGIC    = 'FPTCONFIG';

// Ключи, которые НЕ экспортируем.
// 1) Аккаунты и авторизация — по требованию исключаем.
// 2) Токены/секреты сторонних сервисов.
// 3) Большие кэши и временное состояние, которое только навредит на другом
//    устройстве (heartbeat, «seeded/processed/collecting», позиции окна и т.п.).
const EXCLUDE_KEYS = new Set([
    // --- Донатеры и спонсоры ---
    'foxenDonaters',
    'foxenDonatersCache',
    'foxenDonatersTs',
    'foxenSponsors',
    'donaters',
    'donators',
    // --- Аккаунты и авторизация (НИКОГДА не экспортируем/импортируем) ---
    'foxenAccounts',
    'foxenAccountsList',
    'fpCurrentUserInfo',
    // --- Токены/секреты ---
    'foxenGCToken',
    'foxenGCConfig',
    'foxenGCConfigTs',
    // --- Базы данных продаж, покупок и финансов ---
    'foxenSalesData',
    'foxenPurchasesData',
    'foxenFinanceData',
    'foxenSalesCollecting',
    'foxenPurchasesCollecting',
    'foxenFinanceCollecting',
    'foxenSalesLastUpdate',
    'foxenPurchasesLastUpdate',
    'foxenFinanceLastUpdate',
    'foxenFinanceCount',
    'foxenFirstOrderId',
    'foxenLastOrderId',
    // --- Рантайм/служебное состояние движков (per-device) ---
    'foxenEngineHeartbeat',
    'foxenSmartBumpState',
    'foxenSmartBumpRunning',
    'foxenAutoBumpRunning',
    'foxenLastAutoBumpTime',
    'foxenAutoResponderTag',
    'foxenTelegramPoll',
    'foxenTelegramSeeded',
    'foxenTelegramOrdersSeeded',
    'foxenTelegramProcessedIds',
    'foxenTelegramProcessedOrders',
    'foxenDiscordSeeded',
    'foxenDiscordCheck',
    'foxenProcessedDiscordIds',
    'fpt_telemetry_enabled',
    'foxenLastSeenVersion',
    'foxenLotImportProcess',
    'foxenCheckRestoreLots',
    'foxenBlacklistUpdated',
    'foxenUnreadCount',
    // --- Кэши (большие, легко перезапросятся) ---
    'foxenWallpaperCache',
    'foxenImageStore',
    'foxenImageCanvas',
    'foxenCustomSoundData',
    'foxenBuyerHistory',
    'foxenBuyerViewing',
    // --- Чисто UI-состояние текущей вкладки/окна (per-device) ---
    'foxenLastPage',
    'foxenPopupDragged',
]);

function isJunkKey(k) {
    if (!k || typeof k !== 'string') return true;
    if (EXCLUDE_KEYS.has(k)) return true;
    return /donat|sponsor|account|session|salesData|purchasesData|financeData|userInfo/i.test(k);
}

async function exportSettings() {
    try {
        // Берём ВСЁ хранилище и фильтруем исключения.
        const all = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(null);
        const data = {};
        for (const [k, v] of Object.entries(all)) {
            if (isJunkKey(k)) continue;
            data[k] = v;
        }

        // Очищаем рантайм-состояние автоответчика перед экспортом
        if (data.foxenAutoReplies && typeof data.foxenAutoReplies === 'object') {
            const ar = { ...data.foxenAutoReplies };
            delete ar.autoResponderSeeded;
            delete ar.lastSeenMsgIds;
            delete ar.lastHandledText;
            delete ar.selfInitiatedChats;
            delete ar.processedMessageIds;
            data.foxenAutoReplies = ar;
        }

        const exportObj = {
            _magic:   FP_CONFIG_MAGIC,
            _version: FP_CONFIG_VERSION,
            _date:    new Date().toISOString(),
            _extVer:  chrome.runtime.getManifest().version,
            settings: data
        };

        const json     = JSON.stringify(exportObj, null, 2);
        const blob     = new Blob([json], { type: 'application/json' });
        const url      = URL.createObjectURL(blob);
        const dateStr  = new Date().toISOString().slice(0, 10);
        const a        = document.createElement('a');
        a.href         = url;
        a.download     = `FunPayTools_config_${dateStr}.fpconfig`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        const cnt = Object.keys(data).length;
        showNotification(`Настройки экспортированы (${cnt} разделов) ✓`);
    } catch (e) {
        showNotification(`Ошибка экспорта: ${e.message}`, true);
    }
}

async function importSettings(file) {
    try {
        const text = await file.text();
        const obj  = JSON.parse(text);

        let settingsToImport = null;
        if (obj && typeof obj === 'object') {
            if (obj.settings && typeof obj.settings === 'object') {
                settingsToImport = obj.settings;
            } else if (obj._magic === FP_CONFIG_MAGIC && obj.settings) {
                settingsToImport = obj.settings;
            } else if (obj.foxenAutoReplies || obj.autoBumpEnabled || obj.foxenAccounts) {
                settingsToImport = obj;
            } else {
                settingsToImport = obj;
            }
        }

        if (!settingsToImport || typeof settingsToImport !== 'object' || !Object.keys(settingsToImport).length) {
            throw new Error('Файл не содержит валидных настроек.');
        }

        // На всякий случай НЕ применяем исключённые ключи, даже если они попали
        // в старый файл (например, аккаунты из бэкапа другой версии).
        const safe = {};
        for (const [k, v] of Object.entries(settingsToImport)) {
            if (isJunkKey(k)) continue;
            safe[k] = v;
        }

        // Обязательно очищаем рантайм-маркеры просмотренных сообщений автоответчика из импортируемого конфига,
        // чтобы при следующем цикле раннер прошёл посев (seeding) и НЕ рассылал приветствия по старым чатам!
        if (safe.foxenAutoReplies && typeof safe.foxenAutoReplies === 'object') {
            const ar = { ...safe.foxenAutoReplies };
            delete ar.autoResponderSeeded;
            delete ar.lastSeenMsgIds;
            delete ar.lastHandledText;
            delete ar.selfInitiatedChats;
            delete ar.processedMessageIds;
            safe.foxenAutoReplies = ar;
        }

        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set(safe);

        const cnt = Object.keys(safe).length;
        const fromVer = (obj && obj._extVer) ? ` из v${obj._extVer}` : '';
        if (typeof showNotification === 'function') {
            showNotification(`Импортировано ${cnt} разделов${fromVer} — перезагрузка... ✓`);
        }

        // Reload after 1.2s
        setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
        console.error('Foxen Settings Import Error:', e);
        if (typeof showNotification === 'function') {
            showNotification(`Ошибка импорта: ${e.message}`, true);
        } else {
            alert(`Ошибка импорта: ${e.message}`);
        }
    }
}

function initializeSettingsIO() {
    // Используем делегирование событий на document, чтобы кнопки экспорта/импорта
    // работали независимо от момента динамического рендеринга попапа/модального окна.
    document.addEventListener('click', (e) => {
        const exportBtn = e.target.closest('#fp-settings-export-btn');
        if (exportBtn) {
            e.preventDefault();
            exportSettings();
            return;
        }

        const importBtn = e.target.closest('#fp-settings-import-btn');
        if (importBtn) {
            e.preventDefault();
            let importInput = document.getElementById('fp-settings-import-input');
            if (!importInput) {
                importInput = document.createElement('input');
                importInput.type = 'file';
                importInput.id = 'fp-settings-import-input';
                importInput.accept = '.fpconfig,.json';
                importInput.style.display = 'none';
                document.body.appendChild(importInput);
            }
            importInput.click();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'fp-settings-import-input') {
            const file = e.target.files[0];
            if (file) {
                importSettings(file);
            }
            e.target.value = '';
        }
    });
}
