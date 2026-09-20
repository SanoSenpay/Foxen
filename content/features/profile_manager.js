// content/features/profile_manager.js - Foxen Profiles & Subscriptions Manager

const SUBSCRIPTION_TIERS = {
    free: {
        id: 'free',
        name: 'Free (Базовый)',
        badge: 'FREE',
        badgeColor: '#6B7280',
        badgeBg: 'rgba(107, 114, 128, 0.15)',
        badgeBorder: 'rgba(107, 114, 128, 0.3)',
        aiDailyLimit: 20,
        autobumpSlots: 3,
        features: [
            'Базовое авто-поднятие (до 3 лотов)',
            'Лимит ИИ: 20 запросов/день',
            'Обычные уведомления'
        ]
    },
    pro: {
        id: 'pro',
        name: 'Foxen PRO',
        badge: 'PRO',
        badgeColor: '#C026D3',
        badgeBg: 'rgba(192, 38, 211, 0.15)',
        badgeBorder: 'rgba(192, 38, 211, 0.4)',
        aiDailyLimit: 500,
        autobumpSlots: 50,
        features: [
            'Приоритетное авто-поднятие лотов',
            'Лимит ИИ: 500 запросов/день',
            'Авто-выдача и авто-ответы',
            'Уведомления в Telegram-бота'
        ]
    },
    vip: {
        id: 'vip',
        name: 'Foxen VIP',
        badge: 'VIP 👑',
        badgeColor: '#EAB308',
        badgeBg: 'rgba(234, 179, 8, 0.15)',
        badgeBorder: 'rgba(234, 179, 8, 0.4)',
        aiDailyLimit: 9999,
        autobumpSlots: 999,
        features: [
            'Безлимитный ИИ-помощник',
            'Неограниченное авто-поднятие',
            'Все кастомные темы и звуки',
            'Персональная поддержка 24/7'
        ]
    },
    lifetime: {
        id: 'lifetime',
        name: 'Foxen Lifetime',
        badge: 'LIFETIME ✨',
        badgeColor: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: 'rgba(16, 185, 129, 0.4)',
        aiDailyLimit: 9999,
        autobumpSlots: 999,
        features: [
            'Вечный доступ ко всем возможностям',
            'Все будущие обновления без ограничений',
            'Ранний доступ к новым функциям'
        ]
    }
};

let currentProfileData = null;
let currentPresets = [];
let activePresetId = 'default';

/**
 * Получить информацию о тарифе по ключу подписки
 */
function fxnGetTierInfo(tierKey) {
    if (!tierKey) return SUBSCRIPTION_TIERS.free;
    const key = String(tierKey).toLowerCase();
    if (key.includes('vip')) return SUBSCRIPTION_TIERS.vip;
    if (key.includes('pro')) return SUBSCRIPTION_TIERS.pro;
    if (key.includes('life')) return SUBSCRIPTION_TIERS.lifetime;
    return SUBSCRIPTION_TIERS.free;
}

/**
 * Рассчитать оставшееся время подписки
 */
function fxnCalculateRemainingTime(expiresAt) {
    if (!expiresAt) return { text: 'Бессрочно (Free)', expired: false, days: 9999 };
    
    const expTime = new Date(expiresAt).getTime();
    if (isNaN(expTime)) return { text: 'Бессрочно', expired: false, days: 9999 };

    const diff = expTime - Date.now();
    if (diff <= 0) {
        return { text: 'Истекла', expired: true, days: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return { text: `${days} дн. ${hours} ч.`, expired: false, days };
    }
    return { text: `${hours} ч.`, expired: false, days: 0 };
}

/**
 * Загрузить пресеты настроек из локального storage
 */
async function fxnLoadProfilePresets() {
    try {
        const res = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenPresets', 'foxenActivePresetId']);
        if (res.foxenPresets && Array.isArray(res.foxenPresets) && res.foxenPresets.length > 0) {
            currentPresets = res.foxenPresets;
        } else {
            // Пресеты по умолчанию
            currentPresets = [
                { id: 'default', name: 'Основной', icon: 'rocket_launch', color: '#C026D3', isDefault: true },
                { id: 'night', name: 'Ночной', icon: 'bedtime', color: '#6366F1', isDefault: false },
                { id: 'vacation', name: 'Отпуск', icon: 'beach_access', color: '#10B981', isDefault: false }
            ];
        }
        activePresetId = res.foxenActivePresetId || 'default';
    } catch (e) {
        console.error('Foxen Preset Load Error:', e);
    }
}

/**
 * Сохранить список пресетов
 */
async function fxnSaveProfilePresets(presets, activeId = null) {
    currentPresets = presets;
    if (activeId) activePresetId = activeId;
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
        foxenPresets: currentPresets,
        foxenActivePresetId: activePresetId
    });
}
