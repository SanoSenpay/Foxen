// background/telegram.js
// =============================================================================
// Управление Foxen из Telegram + уведомления.
//
// ВАЖНО (Chrome Web Store): мы используем ТОЛЬКО официальный Telegram Bot API по
// HTTPS (api.telegram.org). Это передача данных, а не загрузка/исполнение
// удалённого кода (RHC), поэтому политика CWS это допускает - точно так же, как
// уже работающие в расширении вебхуки Discord. Никакой код не подгружается извне.
//
// Хранилище: chrome.storage.local.foxenTelegram = {
//   enabled: bool,
//   token: '<bot token>',
//   chatId: '<resolved chat id>',     // куда слать уведомления / кого слушать
//   notifyMessages: bool,             // новые сообщения в чатах
//   notifyOrders: bool,               // новые заказы
//   allowControl: bool,               // разрешить команды управления из бота
//   lastUpdateId: number              // offset для getUpdates (long-poll)
// }
//
// Экспортирует функции, которые вызываются из background.js (alarms + onChanged).
// Реальную выборку чатов/заказов и поднятие лотов выполняет background.js -
// чтобы не дублировать auth/runner-логику, telegram.js дергает переданные
// колбэки (deps).
// =============================================================================

const TELEGRAM_ALARM = 'foxenTelegramPoll';
const TG_STORE = 'foxenTelegram';
const TG_PROCESSED = 'foxenTelegramProcessedIds';
const TG_MSG_MAP = 'foxenTelegramMessageMap';

let _deps = null; // { getAuth, getChatList, getOrders, runBump, getProfileInfo, sendChatMessage, keepOnline, getSalesSummary }
let _pollingLock = false;
let _pollLoopRunning = false;
let _pollAbortController = null;

const TG_DEFAULTS = {
    enabled: false,
    token: '',
    chatId: '',
    notifyMessages: true,
    notifyOrders: true,
    notifyErrors: true,
    allowControl: true,
    pollInterval: 1,
    lastUpdateId: 0
};

// Главная постоянная клавиатура управления
const TG_MAIN_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Статус' }, { text: '💬 Чаты' }],
        [{ text: '🚀 Поднять лоты' }, { text: '💰 Продажи' }]
    ],
    resize_keyboard: true,
    is_persistent: true
};

async function tgGet() {
    const r = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(TG_STORE);
    return Object.assign({}, TG_DEFAULTS, r[TG_STORE] || {});
}
async function tgSet(patch) {
    const cur = await tgGet();
    const next = Object.assign({}, cur, patch);
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [TG_STORE]: next });
    return next;
}

function tgApi(token, method, params, signal) {
    const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`;
    const opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
    };
    if (signal) opts.signal = signal;
    return fetch(url, opts).then(r => r.json());
}

function tgEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgSendMessage(text, extra) {
    const cfg = await tgGet();
    if (!cfg.token || !cfg.chatId) return { ok: false, error: 'no token/chatId' };
    return tgApi(cfg.token, 'sendMessage', Object.assign({
        chat_id: cfg.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    }, extra || {}));
}

// Получение актуальной версии Foxen из AMO (Mozilla Add-ons) с кэшированием
async function getLatestAmoVersion() {
    try {
        const { foxenAmoVersion, foxenAmoVersionTime } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenAmoVersion', 'foxenAmoVersionTime']);
        if (foxenAmoVersion && foxenAmoVersionTime && (Date.now() - foxenAmoVersionTime < 3600000)) {
            return foxenAmoVersion;
        }
        const res = await fetch('https://addons.mozilla.org/api/v5/addons/addon/foxen/', { cache: 'no-cache' });
        if (res.ok) {
            const data = await res.json();
            const ver = data?.current_version?.version;
            if (ver) {
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
                    foxenAmoVersion: ver,
                    foxenAmoVersionTime: Date.now()
                });
                return ver;
            }
        }
    } catch (e) {
        console.warn('Foxen TG: Не удалось получить версию из AMO:', e.message);
    }
    const manifestVer = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '3.3.3';
    return manifestVer;
}

// Синхронизация описания бота и поля "what can this bot do?" в Telegram
async function tgSyncBotInfo(token) {
    if (!token) return false;
    try {
        const version = await getLatestAmoVersion();
        const shortDesc = `🦊 Создано с помощью расширения Foxen\n🌐 Website: https://web.foxen.site`;
        const fullDesc = `Foxen • v${version}\n` +
            `• Минимальное управление\n` +
            `• Уведомления из FunPay\n` +
            `• Ответы на полученные сообщения\n` +
            `• Просмотр статистики аккаунта\n` +
            `• Поднятие активных лотов по одному клику\n` +
            `• Другие удобные функции...\n` +
            `https://web.foxen.site/`;

        const { foxenLastSyncedBotInfo } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenLastSyncedBotInfo');
        if (foxenLastSyncedBotInfo === `${token}:${version}`) {
            return true;
        }

        // 1. Описание бота в профиле (setMyShortDescription)
        await tgApi(token, 'setMyShortDescription', { short_description: shortDesc });
        await tgApi(token, 'setMyShortDescription', { short_description: shortDesc, language_code: 'ru' });

        // 2. Поле "what can this bot do?" (setMyDescription)
        await tgApi(token, 'setMyDescription', { description: fullDesc });
        await tgApi(token, 'setMyDescription', { description: fullDesc, language_code: 'ru' });

        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({
            foxenLastSyncedBotInfo: `${token}:${version}`
        });
        console.log(`Foxen TG: Информация о боте синхронизирована (v${version})`);
        return true;
    } catch (e) {
        console.warn('Foxen TG: Ошибка при синхронизации информации о боте:', e.message);
        return false;
    }
}

// Установка аватара Telegram-бота из фото профиля FunPay
async function tgSetBotProfilePhoto(token, avatarUrl) {
    if (!token || !avatarUrl) return false;
    if (/avatar\.png|default-avatar/i.test(avatarUrl)) return false;

    const { foxenLastBotAvatar } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenLastBotAvatar');
    if (foxenLastBotAvatar === avatarUrl) return true;

    try {
        console.log('Foxen TG: Загрузка аватара FunPay для установки в бота...', avatarUrl);
        const imgRes = await fetch(avatarUrl);
        if (!imgRes.ok) return false;
        const rawBlob = await imgRes.blob();
        if (!rawBlob || rawBlob.size < 200) return false;

        // Конвертируем в чистый JPEG для 100% совместимости с Telegram InputProfilePhotoStatic
        let jpegBlob = rawBlob;
        try {
            if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function') {
                const bmp = await createImageBitmap(rawBlob);
                const canvas = new OffscreenCanvas(bmp.width, bmp.height);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, bmp.width, bmp.height);
                ctx.drawImage(bmp, 0, 0);
                jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
            }
        } catch (_) {}

        const fd = new FormData();
        fd.append('photo_file', jpegBlob, 'avatar.jpg');
        fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://photo_file' }));

        const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/setMyProfilePhoto`, {
            method: 'POST',
            body: fd
        });
        const json = await res.json().catch(() => null);
        if (json && json.ok) {
            console.log('Foxen TG: Аватар бота успешно обновлен!');
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenLastBotAvatar: avatarUrl });
            return true;
        } else {
            console.warn('Foxen TG: setMyProfilePhoto вернул ошибку:', json?.description);
        }
    } catch (e) {
        console.warn('Foxen TG: ошибка при установке аватара бота:', e.message);
    }
    return false;
}

// Отправка фото с подписью (HTML caption) в оригинальном максимальном качестве
async function tgSendPhoto(caption, photoUrl, extra = {}) {
    const cfg = await tgGet();
    if (!cfg.token || !cfg.chatId) return { ok: false, error: 'no token/chatId' };

    if (photoUrl && !/avatar\.png|default-avatar/i.test(photoUrl)) {
        // 1. Пробуем передать прямой URL изображения в Telegram Bot API (как в FoxenBot) —
        // Telegram напрямую скачивает оригинальный полноразмерный файл с CDN FunPay без потерь качества
        try {
            const payload = {
                chat_id: cfg.chatId,
                photo: photoUrl,
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: extra.reply_markup,
                reply_to_message_id: extra.reply_to_message_id
            };
            const json = await tgApi(cfg.token, 'sendPhoto', payload);
            if (json && json.ok) return json;
            console.warn('Foxen TG: sendPhoto by URL error:', json?.description);
        } catch (e) {
            console.warn('Foxen TG: sendPhoto by URL failed:', e.message);
        }

        // 2. Резервный вариант: скачиваем оригинальный файл и загружаем как multipart без изменения качества
        try {
            const imgRes = await fetch(photoUrl);
            if (imgRes.ok) {
                const rawBlob = await imgRes.blob();
                if (rawBlob && rawBlob.size > 200) {
                    const fd = new FormData();
                    fd.append('chat_id', cfg.chatId);
                    fd.append('photo', rawBlob, 'profile.jpg');
                    if (caption) fd.append('caption', caption);
                    fd.append('parse_mode', 'HTML');
                    if (extra.reply_markup) {
                        fd.append('reply_markup', JSON.stringify(extra.reply_markup));
                    }
                    if (extra.reply_to_message_id) {
                        fd.append('reply_to_message_id', String(extra.reply_to_message_id));
                    }
                    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/sendPhoto`, {
                        method: 'POST',
                        body: fd
                    });
                    const json = await res.json().catch(() => null);
                    if (json && json.ok) return json;
                }
            }
        } catch (e) {
            console.warn('Foxen TG: sendPhoto multipart fallback failed:', e.message);
        }
    }

    // 3. Если картинки нет или отправка не удалась — отправляем обычным сообщением
    return tgSendMessage(caption, extra);
}

// Форматирование детализированного статуса
function formatStatusMessage(info) {
    let t = '';

    const name = tgEscape(info.username || 'Пользователь');
    const userUrl = info.userId ? `https://funpay.com/users/${info.userId}/` : null;
    const nameHeader = userUrl ? `<a href="${userUrl}">${name}</a>` : name;
    t += `👑 <b>FunPay: ${nameHeader}</b>\n\n`;

    const cleanBalance = (info.balance || '0 ₽').replace(/^(?:Финансы|Finance)\s*/i, '').trim();
    t += `💰 <b>Баланс:</b> <code>${tgEscape(cleanBalance || '0 ₽')}</code>\n`;

    if (info.rating || info.reviewsCount) {
        const rVal = info.rating ? `★ ${tgEscape(info.rating)}` : '★ 5.0';
        const rCount = info.reviewsCount ? ` (${info.reviewsCount} отз.)` : '';
        t += `⭐️ <b>Отзывы:</b> <b>${rVal}</b>${rCount}\n`;
    }

    const statusParts = [];
    if (info.yearsOnSite) statusParts.push(tgEscape(info.yearsOnSite));
    if (info.onlineStatus) statusParts.push(tgEscape(info.onlineStatus));
    if (statusParts.length) {
        t += `⏱ <b>Статус:</b> ${statusParts.join(' · ')}\n`;
    }
    t += `\n`;

    t += `📦 <b>Активность:</b>\n`;
    if (info.lotsCount != null) {
        const catStr = info.categoriesCount ? ` в <b>${info.categoriesCount}</b> разд.` : '';
        t += `• Лотов на продаже: <b>${info.lotsCount}</b>${catStr}\n`;
    }
    const ordersText = (info.activeOrders > 0)
        ? `<b>${info.activeOrders}</b> ⚠️ <i>(требуют выдачи)</i>`
        : `<b>0</b>`;
    t += `• Заказов в работе: ${ordersText}\n`;
    const unreadText = (info.unreadChats > 0)
        ? `<b>${info.unreadChats}</b> 💬 <i>(есть новые)</i>`
        : `<b>0</b>`;
    t += `• Непрочитанных чатов: ${unreadText}\n\n`;

    if (info.sales) {
        t += `📈 <b>Продажи:</b>\n`;
        t += `• Сегодня: <b>${info.sales.today.count} зак.</b> (${tgEscape(info.sales.today.revenue)})\n`;
        t += `• За 7 дней: <b>${info.sales.week.count} зак.</b> (${tgEscape(info.sales.week.revenue)})\n`;
        if (info.sales.all && info.sales.all.count > 0) {
            t += `• Всего: <b>${info.sales.all.count} зак.</b> (${tgEscape(info.sales.all.revenue)})\n`;
        }
        t += `\n`;
    }

    t += `⚡️ <b>Модули Foxen:</b>\n`;
    const bumpIco = info.modules?.autobump ? '🟢' : '⚪️';
    const bumpText = info.modules?.autobump ? 'Включено' : 'Выключено';
    t += `• Авто-поднятие: ${bumpIco} <i>${bumpText}</i>\n`;

    const arIco = info.modules?.autoresponder ? '🟢' : '⚪️';
    const arText = info.modules?.autoresponder ? 'Включено' : 'Выключено';
    t += `• Авто-ответчик: ${arIco} <i>${arText}</i>\n`;

    const tgIco = info.modules?.tgControl ? '🟢' : '⚪️';
    const tgText = info.modules?.tgControl ? 'Активно' : 'Ограничено';
    t += `• Управление ботом: ${tgIco} <i>${tgText}</i>`;

    return t;
}

// Сохранение соответствия Telegram message_id -> FunPay chat node id
async function saveTelegramMessageMapping(tgMessageId, chatId, chatName, userId = null) {
    try {
        const { [TG_MSG_MAP]: map = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(TG_MSG_MAP);
        map[String(tgMessageId)] = {
            chatId: String(chatId),
            chatName: chatName || 'Покупатель',
            userId: userId ? String(userId) : null,
            time: Date.now()
        };
        const keys = Object.keys(map);
        if (keys.length > 100) {
            const sorted = keys.sort((a, b) => (map[a]?.time || 0) - (map[b]?.time || 0));
            while (sorted.length > 80) {
                delete map[sorted.shift()];
            }
        }
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [TG_MSG_MAP]: map });
    } catch (_) {}
}

// Обработка прямого ответа покупателю через Telegram Reply на уведомление
async function handleReplyToFunPayChat(msg, cfg) {
    const replyId = msg.reply_to_message?.message_id;
    if (!replyId) return false;

    const { [TG_MSG_MAP]: map = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(TG_MSG_MAP);
    const target = map[String(replyId)];
    if (!target || !target.chatId) return false;

    const replyText = (msg.text || '').trim();
    if (!replyText) return false;

    if (!cfg.allowControl) {
        await tgSendMessage('⚠️ Управление через бота отключено в настройках Foxen.', { reply_markup: TG_MAIN_KEYBOARD });
        return true;
    }

    if (!_deps || !_deps.sendChatMessage) {
        await tgSendMessage('❌ Ошибка: модуль отправки сообщений FunPay недоступен в расширении.', { reply_markup: TG_MAIN_KEYBOARD });
        return true;
    }

    try {
        const res = await _deps.sendChatMessage(target.chatId, replyText, target.userId);
        if (res && res.ok) {
            await tgSendMessage(
                `✅ <b>Отправлено покупателю</b> • ${tgEscape(target.chatName)}\n\n` +
                `<blockquote>${tgEscape(replyText)}</blockquote>\n\n`,
                { reply_to_message_id: msg.message_id, reply_markup: TG_MAIN_KEYBOARD }
            );
        } else {
            await tgSendMessage(
                `❌ <b>Не удалось доставить</b>\n\n` +
                `Причина: ${tgEscape(res?.error || 'ошибка ответа FunPay runner')}`,
                { reply_to_message_id: msg.message_id, reply_markup: TG_MAIN_KEYBOARD }
            );
        }
    } catch (e) {
        await tgSendMessage(
            `❌ Ошибка отправки: ${tgEscape(e.message)}`,
            { reply_to_message_id: msg.message_id, reply_markup: TG_MAIN_KEYBOARD }
        );
    }
    return true;
}

// Проверка токена + (опц.) автоопределение chatId через getUpdates.
// Возвращает { ok, botName, chatId } или { ok:false, error }.
async function telegramValidateAndResolve(token) {
    try {
        const me = await tgApi(token, 'getMe', {});
        if (!me.ok) return { ok: false, error: me.description || 'Неверный токен бота.' };
        const botName = me.result.username ? '@' + me.result.username : me.result.first_name;

        // Синхронизируем описание бота и поле "what can this bot do?" в Telegram при валидации/активации
        tgSyncBotInfo(token).catch(() => {});

        // Если этот бот уже был подключен ранее — сохраняем существующий chatId
        const curCfg = await tgGet();
        let chatId = (curCfg && curCfg.token === token && curCfg.chatId) ? String(curCfg.chatId) : '';

        // Пытаемся найти свежий chatId из последних апдейтов (если пользователь только что написал боту)
        const upd = await tgApi(token, 'getUpdates', { timeout: 0, limit: 20 });
        if (upd.ok && Array.isArray(upd.result) && upd.result.length > 0) {
            for (let i = upd.result.length - 1; i >= 0; i--) {
                const m = upd.result[i].message || upd.result[i].edited_message || upd.result[i].callback_query?.message;
                if (m && m.chat && m.chat.id) {
                    chatId = String(m.chat.id);
                    break;
                }
            }
        }
        return { ok: true, botName, chatId };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── Обработка сообщений и команд из Telegram ─────────────────────────────────
async function handleTelegramMessage(msg, cfg) {
    if (!msg || !msg.text) return;
    const rawText = msg.text.trim();

    // 1. Проверяем нативный Reply на уведомление о диалоге
    if (msg.reply_to_message) {
        const handled = await handleReplyToFunPayChat(msg, cfg);
        if (handled) return;
    }

    // 2. Распознавание команд и кнопок меню
    let cmd = rawText.split(/\s+/)[0].replace(/@\w+$/, '').toLowerCase();
    if (rawText.startsWith('📊') || rawText.toLowerCase().includes('статус')) cmd = '/status';
    else if (rawText.startsWith('💬') || rawText.toLowerCase().includes('чаты')) cmd = '/chats';
    else if (rawText.startsWith('🚀') || rawText.toLowerCase().includes('поднять')) cmd = '/bump';
    else if (rawText.startsWith('💰') || rawText.toLowerCase().includes('продажи')) cmd = '/sales';

    if (cmd === '/start' || cmd === '/help') {
        if (cfg.token) tgSyncBotInfo(cfg.token).catch(() => {});
        await tgSendMessage(
            `<b>Foxen Bot</b> • Панель управления\n\n` +
            `Используйте кнопки меню или команды:\n` +
            `• <code>/status</code> — баланс, онлайн и активные заказы\n` +
            `• <code>/chats</code> — список непрочитанных диалогов\n` +
            `• <code>/bump</code> — поднять лоты во всех разделах\n` +
            `• <code>/sales</code> — сводка продаж (день / неделя / месяц)\n` +
            `• <code>/online</code> — поддержать статус «Онлайн»\n\n` +
            `<i>💡 Чтобы ответить покупателю в чат FunPay, просто сделайте «Ответить» (Reply) на сообщение бота с уведомлением.</i>`,
            { reply_markup: TG_MAIN_KEYBOARD }
        );
        return;
    }

    if (!cfg.allowControl) {
        if (cmd.startsWith('/')) {
            await tgSendMessage('⚠️ Управление через бота отключено в настройках расширения Foxen.', { reply_markup: TG_MAIN_KEYBOARD });
        }
        return;
    }

    try {
        if (cmd === '/status') {
            const info = _deps && _deps.getProfileInfo ? await _deps.getProfileInfo() : null;
            if (info) {
                // Если у пользователя есть аватар на FunPay — обновляем аватар самого бота в Telegram
                if (info.avatar && cfg.token) {
                    tgSetBotProfilePhoto(cfg.token, info.avatar).catch(() => {});
                }

                const caption = formatStatusMessage(info);
                if (info.avatar) {
                    await tgSendPhoto(caption, info.avatar, { reply_markup: TG_MAIN_KEYBOARD });
                } else {
                    await tgSendMessage(caption, { reply_markup: TG_MAIN_KEYBOARD });
                }
            } else {
                await tgSendMessage('⚠️ Не удалось получить статус. Убедитесь, что в браузере выполнен вход на FunPay.', { reply_markup: TG_MAIN_KEYBOARD });
            }
            return;
        }

        if (cmd === '/chats') {
            const chats = _deps && _deps.getChatList ? await _deps.getChatList() : null;
            if (chats && chats.length) {
                const unread = chats.filter(c => c.isUnread || (c.nodeMsg != null && c.userMsg != null && c.nodeMsg > c.userMsg));
                if (!unread.length) {
                    await tgSendMessage('✨ Непрочитанных чатов нет.', { reply_markup: TG_MAIN_KEYBOARD });
                    return;
                }
                const body = unread.slice(0, 8).map((c, i) =>
                    `<b>${i + 1}. ${tgEscape(c.chatName || 'Чат')}</b>\n<blockquote>${tgEscape((c.messageText || '').slice(0, 100))}</blockquote>\n\n`
                ).join('');
                await tgSendMessage(
                    `💬 <b>Непрочитанные чаты (${unread.length})</b>\n\n${body}`,
                    { reply_markup: TG_MAIN_KEYBOARD }
                );
            } else {
                await tgSendMessage('⚠️ Чаты не найдены или сессия FunPay не активна.', { reply_markup: TG_MAIN_KEYBOARD });
            }
            return;
        }

        if (cmd === '/bump') {
            if (!_deps || !_deps.runBump) {
                await tgSendMessage('⚠️ Модуль поднятия лотов недоступен.', { reply_markup: TG_MAIN_KEYBOARD });
                return;
            }
            await tgSendMessage('⏳ <b>Запущено поднятие лотов на FunPay...</b>\n<i>Процесс выполняется в фоне, отчет будет прислан по завершении.</i>', { reply_markup: TG_MAIN_KEYBOARD });

            // Запускаем в отдельном асинхронном контексте, чтобы 25-30s таймер long polling не сбрасывал цикл
            (async () => {
                try {
                    const res = await _deps.runBump();
                    if (res && (res.raised > 0 || res.skipped > 0 || res.errors > 0)) {
                        let report = `🚀 <b>Поднятие лотов завершено</b>\n\n`;
                        report += `• Успешно поднято: <b>${res.raised || 0}</b>\n`;
                        report += `• На кулдауне (пропущено): <b>${res.skipped || 0}</b>\n`;
                        if (res.errors > 0) report += `• Ошибок: <b>${res.errors}</b>\n`;

                        if (Array.isArray(res.raisedNames) && res.raisedNames.length > 0) {
                            report += `\n<b>Поднятые разделы:</b>\n` + res.raisedNames.map(n => `• ${tgEscape(n)}`).join('\n') + `\n`;
                        }
                        if (Array.isArray(res.skippedNames) && res.skippedNames.length > 0) {
                            report += `\n<b>На кулдауне:</b>\n` + res.skippedNames.slice(0, 12).map(n => `• ${tgEscape(n)}`).join('\n') + (res.skippedNames.length > 12 ? `\n...и ещё ${res.skippedNames.length - 12}` : '') + `\n`;
                        }
                        await tgSendMessage(report, { reply_markup: TG_MAIN_KEYBOARD });
                    } else if (res && res.errors > 0) {
                        await tgSendMessage(`⚠️ <b>Не удалось поднять лоты</b>\nОшибок: ${res.errors}. Проверьте авторизацию FunPay в браузере.`, { reply_markup: TG_MAIN_KEYBOARD });
                    } else {
                        await tgSendMessage('ℹ️ Все активные разделы уже подняты или находятся на кулдауне.', { reply_markup: TG_MAIN_KEYBOARD });
                    }
                } catch (err) {
                    await tgSendMessage(`❌ Ошибка в процессе поднятия лотов: ${tgEscape(err.message)}`, { reply_markup: TG_MAIN_KEYBOARD });
                }
            })();
            return;
        }

        if (cmd === '/sales') {
            const s = _deps && _deps.getSalesSummary ? await _deps.getSalesSummary() : null;
            if (s) {
                await tgSendMessage(
                    `💰 <b>Статистика продаж</b> • Foxen\n\n` +
                    `• Сегодня: <b>${tgEscape(String(s.today.count))} зак.</b> (${tgEscape(s.today.revenue)})\n` +
                    `• За 7 дней: <b>${tgEscape(String(s.week.count))} зак.</b> (${tgEscape(s.week.revenue)})\n` +
                    `• За 30 дней: <b>${tgEscape(String(s.month.count))} зак.</b> (${tgEscape(s.month.revenue)})\n` +
                    `• За всё время: <b>${tgEscape(String(s.all.count))} зак.</b> (${tgEscape(s.all.revenue)})`,
                    { reply_markup: TG_MAIN_KEYBOARD }
                );
            } else {
                await tgSendMessage('ℹ️ Нет данных о продажах. Откройте страницу «Мои продажи» на FunPay в браузере для обновления статистики.', { reply_markup: TG_MAIN_KEYBOARD });
            }
            return;
        }

        if (cmd === '/online') {
            let ok = false;
            if (_deps && _deps.keepOnline) ok = await _deps.keepOnline();
            await tgSendMessage(ok ? '✅ Онлайн подтверждён на FunPay.' : '⚠️ Не удалось обновить статус онлайна.', { reply_markup: TG_MAIN_KEYBOARD });
            return;
        }

        if (cmd.startsWith('/')) {
            await tgSendMessage('❓ Неизвестная команда. Введите <code>/help</code> для списка доступных команд.', { reply_markup: TG_MAIN_KEYBOARD });
        }
    } catch (e) {
        await tgSendMessage('❌ Ошибка выполнения команды: ' + tgEscape(e.message), { reply_markup: TG_MAIN_KEYBOARD });
    }
}

// ── Уведомления (новые сообщения и заказы) ────────────────────────────────────
async function telegramNotifyNewMessages(chats) {
    const cfg = await tgGet();
    if (!cfg.enabled || !cfg.notifyMessages || !cfg.token || !cfg.chatId) return;

    const { [TG_PROCESSED]: processedArr } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(TG_PROCESSED);
    const processed = new Set(processedArr || []);
    const seededKey = 'foxenTelegramSeeded';
    const { [seededKey]: seeded } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(seededKey);
    const firstRun = !seeded;

    let changed = false;
    for (const chat of chats || []) {
        const genuinelyNew = (chat.nodeMsg != null && chat.userMsg != null)
            ? (chat.nodeMsg > chat.userMsg) : chat.isUnread;
        if (!genuinelyNew) continue;
        const id = 'm' + chat.msgId;
        if (processed.has(id)) continue;

        if (!firstRun) {
            const sent = await tgSendMessage(
                `💬 <b>Новое сообщение</b> • FunPay\n` +
                `От: <b>${tgEscape(chat.chatName || 'Покупатель')}</b>\n\n` +
                `<blockquote>${tgEscape((chat.messageText || '').slice(0, 400))}</blockquote>\n\n` +
                `<i>💡 Ответьте на это сообщение в Telegram, чтобы отправить ответ в чат.</i>`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔗 Открыть чат на FunPay', url: `https://funpay.com/chat/?node=${chat.chatId}` }
                        ]]
                    }
                }
            );

            // Сохраняем маппинг Telegram message_id -> FunPay chat node id для нативных реплаев
            if (sent && sent.ok && sent.result && sent.result.message_id) {
                await saveTelegramMessageMapping(sent.result.message_id, chat.chatId, chat.chatName, chat.userId);
            }
        }
        processed.add(id);
        changed = true;
    }

    if (changed || firstRun) {
        let arr = Array.from(processed);
        if (arr.length > 300) arr = arr.slice(-300);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [TG_PROCESSED]: arr, [seededKey]: true });
    }
}

async function telegramNotifyNewOrders(orders) {
    const cfg = await tgGet();
    if (!cfg.enabled || !cfg.notifyOrders || !cfg.token || !cfg.chatId) return;

    const list = Array.isArray(orders) ? orders.filter(o => o && o.id) : [];
    if (!list.length) return;

    const key = 'foxenTelegramProcessedOrders';
    const seededKey = 'foxenTelegramOrdersSeeded';
    const { [key]: processedArr } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(key);
    const { [seededKey]: seeded } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(seededKey);
    const processed = new Set(processedArr || []);
    const firstRun = !seeded;

    let changed = false;
    for (const o of list) {
        if (processed.has(o.id)) continue;
        if (!firstRun) {
            await tgSendMessage(
                `🛒 <b>Новый заказ</b> • FunPay\n\n` +
                `<b>Товар:</b> ${tgEscape(o.title || '-')}\n` +
                `<b>Покупатель:</b> ${tgEscape(o.buyer || '-')}\n` +
                `<b>Сумма:</b> <code>${tgEscape(o.price || '-')}</code>`,
                o.link ? {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔗 Открыть заказ на FunPay', url: o.link }
                        ]]
                    }
                } : undefined
            );
        }
        processed.add(o.id);
        changed = true;
    }

    if (changed || firstRun) {
        let arr = Array.from(processed);
        if (arr.length > 300) arr = arr.slice(-300);
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [key]: arr, [seededKey]: true });
    }
}

// ── Опрос Telegram (Long Polling с таймаутом 25 сек) ──────────────────────────
async function telegramPollOnce(isLongPoll = false) {
    if (_pollingLock) return;
    _pollingLock = true;

    _pollAbortController = new AbortController();
    // Локальная страховка от обрыва сети
    const timer = setTimeout(() => {
        try { _pollAbortController?.abort(); } catch (_) {}
    }, isLongPoll ? 30000 : 8000);

    try {
        const cfg = await tgGet();
        if (!cfg.enabled || !cfg.token || !cfg.allowControl) return;

        const timeoutSec = isLongPoll ? 25 : 0;
        const upd = await tgApi(cfg.token, 'getUpdates', {
            offset: (cfg.lastUpdateId || 0) + 1,
            timeout: timeoutSec,
            limit: 20,
            allowed_updates: ['message']
        }, _pollAbortController.signal);

        clearTimeout(timer);

        if (upd && upd.ok === false) {
            const code = upd.error_code;
            if (code === 401 || code === 404) {
                console.warn('Foxen: Telegram токен недействителен (', code, ') — опрос остановлен.');
                await tgSet({ enabled: false });
                stopTelegramPolling();
                return;
            }
            return;
        }

        if (!upd || !upd.ok || !Array.isArray(upd.result) || !upd.result.length) return;

        let maxId = cfg.lastUpdateId || 0;
        for (const u of upd.result) {
            if (u.update_id > maxId) maxId = u.update_id;
            const msg = u.message;
            if (!msg) continue;

            // Принимаем команды только из авторизованного chatId
            if (cfg.chatId && String(msg.chat.id) !== String(cfg.chatId)) {
                if (!cfg.chatId) await tgSet({ chatId: String(msg.chat.id) });
                else continue;
            }
            await handleTelegramMessage(msg, await tgGet());
        }
        await tgSet({ lastUpdateId: maxId });
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Foxen: Telegram poll error:', e.message);
        }
    } finally {
        clearTimeout(timer);
        _pollAbortController = null;
        _pollingLock = false;
    }
}

// Непрерывный цикл Long Polling (держит соединение и сразу же перезапускает)
async function startTelegramPollingLoop() {
    if (_pollLoopRunning) return;
    _pollLoopRunning = true;

    while (_pollLoopRunning) {
        const cfg = await tgGet();
        if (!cfg.enabled || !cfg.token || !cfg.allowControl) {
            _pollLoopRunning = false;
            break;
        }

        await telegramPollOnce(true);

        const nextCfg = await tgGet();
        if (!nextCfg.enabled || !nextCfg.token || !nextCfg.allowControl) {
            _pollLoopRunning = false;
            break;
        }

        // Микропауза 100мс перед открытием следующего соединения
        await new Promise(r => setTimeout(r, 100));
    }
}

function stopTelegramPolling() {
    _pollLoopRunning = false;
    if (_pollAbortController) {
        try { _pollAbortController.abort(); } catch (_) {}
        _pollAbortController = null;
    }
    try { chrome.alarms.clear(TELEGRAM_ALARM); } catch (_) {}
}

// ── Жизненный цикл ────────────────────────────────────────────────────────────
async function telegramSyncAlarm() {
    const cfg = await tgGet();
    const need = cfg.enabled && cfg.token;
    const alarm = await (typeof browser !== 'undefined' ? browser : chrome).alarms.get(TELEGRAM_ALARM);

    if (need) {
        // Резервный таймер каждые 30 секунд (на случай перезапуска Service Worker)
        if (!alarm) {
            chrome.alarms.create(TELEGRAM_ALARM, { delayInMinutes: 0.1, periodInMinutes: 0.5 });
        }
        // Синхронизируем описание бота и поле "what can this bot do?" в Telegram
        tgSyncBotInfo(cfg.token).catch(() => {});

        // Если доступен аватар FunPay — синхронизируем аватар бота
        if (_deps && _deps.getProfileInfo) {
            _deps.getProfileInfo().then(info => {
                if (info && info.avatar && cfg.token) {
                    tgSetBotProfilePhoto(cfg.token, info.avatar).catch(() => {});
                }
            }).catch(() => {});
        }

        // Запускаем моментальный Long Polling
        startTelegramPollingLoop();
    } else {
        stopTelegramPolling();
    }
}

function telegramInit(deps) {
    _deps = deps || {};
}

export {
    TELEGRAM_ALARM,
    telegramInit,
    telegramSyncAlarm,
    telegramPollOnce,
    startTelegramPollingLoop,
    telegramValidateAndResolve,
    telegramNotifyNewMessages,
    telegramNotifyNewOrders,
    tgSendMessage,
    tgSendPhoto,
    tgSetBotProfilePhoto,
    tgSyncBotInfo
};
