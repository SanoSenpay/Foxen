// content/features/settings_io.js — Foxen 2.9
// Экспорт и импорт всех настроек Foxen в файл .fpconfig

const FP_CONFIG_VERSION  = 1;
const FP_CONFIG_MAGIC    = 'FPTCONFIG';
const FP_USERDATA_VERSION = 1;
const FP_USERDATA_MAGIC   = 'FPTUSERDATA';

// Ключи для экспорта/импорта (исключая сессионные данные)
const EXPORT_KEYS = [
    'fpToolsAutoReplies',
    'fpToolsCustomTheme',
    'enableCustomTheme',
    'enableRedesignedHomepage',
    'showSalesStats',
    'hideBalance',
    'viewSellersPromo',
    'notificationSound',
    'notificationSoundDataUrl',
    'fpToolsDiscord',
    'autoBumpEnabled',
    'autoBumpCooldown',
    'fpToolsSelectiveBumpEnabled',
    'fpToolsSelectedBumpCategories',
    'fpToolsBumpOnlyAutoDelivery',
    'fpToolsTemplates',
    'fpToolsCursorFx',
    'fpToolsCustomCursor',
    'sendTemplatesImmediately',
    'templatePos',
    'fpToolsPiggyBanks',
    'fpToolsNotes',
    'fpToolsPinnedLots',
    'fpToolsBlacklist',
    'fpToolsIdentifierEnabled',
    'fpToolsHeaderPosition',
    'fpToolsPopupPosition',
    'fpToolsPopupSize',
    'headerPositionSelect',
];

async function exportSettings() {
    try {
        const data = await browser.storage.local.get(EXPORT_KEYS);

        const exportObj = {
            _magic:   FP_CONFIG_MAGIC,
            _version: FP_CONFIG_VERSION,
            _date:    new Date().toISOString(),
            _extVer:  browser.runtime.getManifest().version,
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

        showNotification('Настройки экспортированы ✓');
    } catch (e) {
        showNotification(`Ошибка экспорта: ${e.message}`, true);
    }
}

async function importSettings(file) {
    try {
        const text = await file.text();
        const obj  = JSON.parse(text);

        if (obj._magic !== FP_CONFIG_MAGIC && obj._magic !== FP_USERDATA_MAGIC) {
            throw new Error('Неверный формат файла. Выберите файл .fpconfig от Foxen.');
        }

        if (!obj.settings || typeof obj.settings !== 'object') {
            throw new Error('Файл не содержит настроек.');
        }

        let safe = {};
        if (obj._magic === FP_CONFIG_MAGIC) {
            // Для файлов конфигурации очищаем неизвестные ключи в целях безопасности
            EXPORT_KEYS.forEach(k => {
                if (k in obj.settings) safe[k] = obj.settings[k];
            });
            // Для пользовательских данных импортируем все (они уже отфильтрованы при экспорте)
            safe = obj.settings;
        }

        await browser.storage.local.set(safe);

        const fromVer = obj._extVer ? ` (из v${obj._extVer})` : '';
        showNotification(`Настройки импортированы${fromVer} — перезагрузите страницу ✓`);

        // Перезагрузка через 1.5 сек
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        showNotification(`Ошибка импорта: ${e.message}`, true);
    }
}

async function exportAllUserData() {
    try {
        const all = await browser.storage.local.get(null);

        // Исключаем чувствительные / временные / кэшированные ключи
        const EXCLUDE_KEYS = new Set([
            // Чувствительные данные (аккаунты могут содержать golden_key)
            'fpToolsAccounts',

            // Временные маркеры выполнения
            'fpToolsAutoResponderTag',
            'fpToolsProcessedDiscordIds',
            'fpToolsUnreadCount',

            // Кэш и тяжелые данные
            'fpToolsSalesData',
            'fpToolsFirstOrderId',
            'fpToolsLastOrderId',
            'fpToolsSalesLastUpdate',

            // Процессы в процессе выполнения
            'fpToolsLotImportProcess',
        ]);

        const settings = {};
        Object.keys(all || {}).forEach(k => {
            if (EXCLUDE_KEYS.has(k)) return;
            // Также защитно пропускаем неизвестные огромные блоки данных
            const v = all[k];
            try {
                const approxSize = JSON.stringify(v || '').length;
                if (approxSize > 2_000_000) return; // ~2MB safety
            } catch (_) {
                return;
            }
            settings[k] = v;
        });

        const exportObj = {
            _magic:   FP_USERDATA_MAGIC,
            _version: FP_USERDATA_VERSION,
            _date:    new Date().toISOString(),
            _extVer:  browser.runtime.getManifest().version,
            settings
        };

        const json     = JSON.stringify(exportObj, null, 2);
        const blob     = new Blob([json], { type: 'application/json' });
        const url      = URL.createObjectURL(blob);
        const dateStr  = new Date().toISOString().slice(0, 10);
        const a        = document.createElement('a');
        a.href         = url;
        a.download     = `FunPayTools_userdata_${dateStr}.fpconfig`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showNotification('Данные экспортированы ✓');
    } catch (e) {
        showNotification(`Ошибка экспорта: ${e.message}`, true);
    }
}

function initializeSettingsIO() {
    const exportBtn = document.getElementById('fp-settings-export-btn');
    const exportAllBtn = document.getElementById('fp-settings-export-all-btn');
    const importBtn = document.getElementById('fp-settings-import-btn');
    const importInput = document.getElementById('fp-settings-import-input');

    if (!exportBtn) return;

    exportBtn.addEventListener('click', exportSettings);
    exportAllBtn?.addEventListener('click', exportAllUserData);

    importBtn?.addEventListener('click', () => importInput?.click());

    importInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importSettings(file);
        importInput.value = '';
    });
}
