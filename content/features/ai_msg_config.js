// content/features/ai_msg_config.js
// =============================================================================
// Foxen AI Messages Setup Hub (ИИ Настройка сообщений)
// =============================================================================
// Позволяет за 1 минуту автоматически сгенерировать и настроить все сообщения:
//  • Ответы на отзывы 1–5 звезд
//  • Автоответчик в чате (Приветствие, Новый заказ, Закрытие заказа)
//  • Бонус за отзыв 5 звезд
//  • Быстрые шаблоны чата (стандартные + практичные дополнительные)
//  • Кнопка запроса отзыва в карточке заказа
//
// Выборочное применение, дневной лимит без КД, кулдаун (с бонусом для Premium),
// гибкое управление эмодзи и защита от шаблонных нелепых шуток.
// =============================================================================

(function() {
    'use strict';

    let __aiMsgConfigInited = false;
    let __lastGeneratedData = null;
    let __cooldownTimerInterval = null;

    // Пресеты стиля с инструкциями тональности для ИИ (без жесткого ограничения эмодзи в тексте пресета)
    const STYLE_PRESETS = {
        polite_brief: {
            title: 'Вежливо, коротко и по делу',
            icon: 'verified',
            prompt: 'Вежливо, лаконично и по делу. Уважительное обращение на «Вы», максимальная конкретика без воды и лишних предисловий. Чёткие формулировки, быстрое решение любых вопросов.'
        },
        friendly_creative: {
            title: 'Дружелюбно и с заботой',
            icon: 'waving_hand',
            prompt: 'Шутливо, приветливо и дружелюбно. Лёгкий позитивный юмор, вежливое общение, искреннее гостеприимство.'
        },
        premium_care: {
            title: 'Премиум-сервис',
            icon: 'star',
            prompt: 'Премиальный уровень сервиса и максимальная забота о клиенте. Подчёркнутая вежливость, ощущение безопасности и надёжности сделки. Готовность помочь по первому слову.'
        },
        turbo_speed: {
            title: 'Быстрый продавец (турбо)',
            icon: 'bolt',
            prompt: 'Стиль ультра-быстрого продавца. Короткие динамичные фразы, фокус на моментальной выдаче товара, проверке данных и подтверждении заказа.'
        },
        gamer_vibe: {
            title: 'Игровой стиль',
            icon: 'auto_awesome',
            prompt: 'Атмосферный игровой стиль без лишней формальности. Живое общение, аккуратный игровой сленг без перегибов, пожелания приятной игры и побед.'
        },
        trust_warranty: {
            title: 'Надёжность и гарантия',
            icon: 'verified_user',
            prompt: 'Спокойный, основательный тон надёжного продавца. Акцент на 100% гарантии, прозрачности сделки, строгой безопасности и долгосрочном доверии.'
        }
    };

    /**
     * Проверка статуса Foxen Premium пользователя
     */
    async function checkIsPremium() {
        try {
            if (typeof window.isFoxenPremiumUser === 'function') {
                return await Promise.race([
                    window.isFoxenPremiumUser(),
                    new Promise(r => setTimeout(() => r(false), 500))
                ]);
            }
        } catch (_) {}
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const st = await ext.storage?.local?.get(['foxenUserProfileCache', 'foxen_user_profile', 'foxen_is_premium', 'cached_profile']);
            const prof = st?.foxenUserProfileCache?.data || st?.foxen_user_profile || st?.cached_profile;
            return Boolean(prof?.is_premium || (prof?.SUBSCRIPTION && prof?.SUBSCRIPTION !== 'free') || st?.foxen_is_premium);
        } catch (_) {}
        return false;
    }

    /**
     * Возвращает текущий день в локальном формате YYYY-MM-DD
     */
    function getTodayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Загружает статистику генераций за текущий день
     */
    async function getDailyGenStats() {
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        const res = await ext.storage?.local?.get('foxenAiMsgDailyStats');
        const today = getTodayKey();
        const stats = res?.foxenAiMsgDailyStats || {};
        if (stats.date !== today) {
            return { date: today, count: 0, lastGenTime: 0 };
        }
        return {
            date: today,
            count: Number(stats.count) || 0,
            lastGenTime: Number(stats.lastGenTime) || 0
        };
    }

    /**
     * Сохраняет статистику генераций за текущий день
     */
    async function saveDailyGenStats(stats) {
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        await ext.storage?.local?.set({ foxenAiMsgDailyStats: stats });
    }

    /**
     * Обновляет плашку кулдауна и блокировку кнопки генерации
     */
    function updateCooldownUI(stats, isPremium, generateBtn, badgeEl) {
        if (!badgeEl || !generateBtn) return;

        if (__cooldownTimerInterval) {
            clearInterval(__cooldownTimerInterval);
            __cooldownTimerInterval = null;
        }

        const cdDurationMs = isPremium ? 30000 : 60000;
        const now = Date.now();
        const elapsed = now - (stats.lastGenTime || 0);
        const remainingMs = cdDurationMs - elapsed;

        // Первые 3 генерации в день без кулдауна
        if (stats.count < 3) {
            badgeEl.style.display = 'inline-flex';
            badgeEl.className = 'fxn-aimsg-cd-badge';
            const left = 3 - stats.count;
            badgeEl.innerHTML = `
                <span class="material-symbols-rounded">bolt</span>
                <span>${left}/3 генераций без КД${isPremium ? ' • PRO' : ''}</span>
            `;
            generateBtn.disabled = false;
            return;
        }

        // Начиная с 4-й генерации — действует КД (60с стандарт, 30с Premium)
        if (remainingMs > 0) {
            generateBtn.disabled = true;
            badgeEl.style.display = 'inline-flex';
            badgeEl.className = 'fxn-aimsg-cd-badge active-cooldown';

            const tick = () => {
                const curRemaining = cdDurationMs - (Date.now() - (stats.lastGenTime || 0));
                if (curRemaining <= 0) {
                    clearInterval(__cooldownTimerInterval);
                    __cooldownTimerInterval = null;
                    generateBtn.disabled = false;
                    badgeEl.className = 'fxn-aimsg-cd-badge';
                    badgeEl.innerHTML = `
                        <span class="material-symbols-rounded">check_circle</span>
                        <span>Готово к генерации (КД ${isPremium ? '30с' : '60с'})</span>
                    `;
                } else {
                    const sec = Math.ceil(curRemaining / 1000);
                    badgeEl.innerHTML = `
                        <span class="material-symbols-rounded">timer</span>
                        <span>Кулдаун: ${sec} сек (${isPremium ? 'PRO 30с' : '60с'})</span>
                    `;
                }
            };

            tick();
            __cooldownTimerInterval = setInterval(tick, 1000);
        } else {
            generateBtn.disabled = false;
            badgeEl.style.display = 'inline-flex';
            badgeEl.className = 'fxn-aimsg-cd-badge';
            badgeEl.innerHTML = `
                <span class="material-symbols-rounded">check_circle</span>
                <span>Готово к генерации (КД ${isPremium ? '30с' : '60с'})</span>
            `;
        }
    }

    /**
     * Возвращает имя текущего продавца из доступных источников Foxen
     */
    function getSellerUsername() {
        let name = '';
        const popupName = document.querySelector('#fxnSidebarUsername')?.textContent?.trim();
        if (popupName && popupName !== 'Загрузка...' && popupName !== 'Foxen User') {
            name = popupName;
        }
        if (!name) {
            const navName = document.querySelector('.navbar .user-link-dropdown .user-link-name, .navbar-right .user-link-name, .nav-profile .user-link-name');
            if (navName?.textContent?.trim()) name = navName.textContent.trim();
        }
        if (!name) {
            try {
                const d = JSON.parse(document.body.dataset.appData || '{}');
                const un = (Array.isArray(d) ? d[0] : d)?.userName;
                if (un) name = un;
            } catch (_) {}
        }
        return name || 'Продавец';
    }

    /**
     * Парсер JSON с защитой от markdown-обёрток и случайного текста
     */
    function safeParseJson(raw) {
        if (!raw) return null;
        if (typeof raw === 'object') return raw;
        let str = String(raw).trim();
        str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        try {
            return JSON.parse(str);
        } catch (_) {}

        const firstBrace = str.indexOf('{');
        const lastBrace = str.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
                return JSON.parse(str.slice(firstBrace, lastBrace + 1));
            } catch (_) {}
        }
        return null;
    }

    /**
     * Локальный fallback-генератор в минималистичном стиле без эмодзи
     */
    function generateFallbackConfig(styleKey, customText, { useVars = true, noEmoji = true, useSpintax = false } = {}) {
        const isFriendly = styleKey === 'friendly_creative' || /шутлив|юмор|креатив|весел/i.test(customText);
        const isPremium = styleKey === 'premium_care' || /премиум|забот|сервис|vip/i.test(customText);
        const isTurbo = styleKey === 'turbo_speed' || /быстр|скорост|турбо|момент/i.test(customText);
        const isGamer = styleKey === 'gamer_vibe' || /геймер|игр|скилл|фарм/i.test(customText);

        const filterText = (str) => {
            if (!str) return str;
            let t = str;
            if (!useVars) {
                t = t.replace(/\{welcome\},\s*\{buyername\}!/gi, 'Здравствуйте!')
                     .replace(/\{welcome\}!/gi, 'Здравствуйте!')
                     .replace(/\{welcome\}/gi, 'Здравствуйте')
                     .replace(/,\s*\{buyername\}!/gi, '!')
                     .replace(/\{buyername\}!/gi, '!')
                     .replace(/\{buyername\}/gi, 'покупатель')
                     .replace(/#{orderid}/gi, 'заказа')
                     .replace(/\{orderid\}/gi, 'заказа')
                     .replace(/\{lotname\}/gi, 'товару')
                     .replace(/\{orderlink\}/gi, 'на странице заказа')
                     .replace(/\{date\}/gi, '')
                     .replace(/\s{2,}/g, ' ')
                     .replace(/\s+([.,!?])/g, '$1')
                     .trim();
            }
            if (useSpintax) {
                t = t.replace(/^Спасибо за заказ/i, '{Спасибо за покупку|Благодарим за заказ}')
                     .replace(/^Спасибо за отзыв/i, '{Спасибо за отзыв|Благодарим за оценку}')
                     .replace(/^Спасибо за покупку/i, '{Спасибо за покупку|Благодарю за выбор}')
                     .replace(/^Здравствуйте/i, '{Здравствуйте|Приветствую|Добрый день}');
            }
            if (!noEmoji) {
                if (/спасибо|благодар/i.test(t) && !/[👍⭐🤝✨📦]/.test(t)) {
                    t += ' 👍';
                }
            }
            return t;
        };

        const res = {
            reviews: {
                '5': filterText(isFriendly
                    ? `Спасибо за отличную оценку, {buyername}! Было приятно иметь дело, обращайтесь снова.`
                    : isPremium
                    ? `Благодарим за доверие и высшую оценку, {buyername}! Всегда рады предоставить сервис лучшего качества.`
                    : isTurbo
                    ? `Спасибо за заказ, {buyername}! Быстро подтвердили, обращайтесь снова.`
                    : isGamer
                    ? `Спасибо за оценку, {buyername}! Приятной игры и легких побед.`
                    : `Спасибо за покупку и отзыв, {buyername}! Будем рады видеть вас снова.`),
                '4': filterText(isFriendly
                    ? `Спасибо за отзыв, {buyername}! Если возникнут вопросы или пожелания, напишите нам в чат.`
                    : isPremium
                    ? `Благодарим за отзыв, {buyername}! Напишите нам в чат, если мы можем сделать сервис ещё лучше.`
                    : isTurbo
                    ? `Спасибо за отзыв! На связи в чате по любым вопросам.`
                    : isGamer
                    ? `Спасибо за оценку! Если есть вопросы или идеи, всегда на связи в чате.`
                    : `Спасибо за отзыв, {buyername}! Напишите нам в чат, если возникли вопросы.`),
                '3': filterText(isFriendly
                    ? `Здравствуйте, {buyername}! Напишите нам в чат заказа, подскажите подробности — оперативно во всем разберемся.`
                    : isPremium
                    ? `Здравствуйте, {buyername}! Мы ценим каждого клиента. Пожалуйста, напишите в чат — решим любую проблему.`
                    : isTurbo
                    ? `Здравствуйте! Напишите в чат, что пошло не так — оперативно всё исправим.`
                    : isGamer
                    ? `Привет, {buyername}! Что-то пошло не так? Напиши в чат заказа, быстро разберёмся.`
                    : `Здравствуйте, {buyername}! Подскажите, что пошло не так? Напишите нам в чат, решим проблему.`),
                '2': `Здравствуйте, {buyername}! Приносим искренние извинения за неудобства. Пожалуйста, напишите нам в чат заказа — мы оперативно во всем разберемся, сделаем замену или полный возврат средств.`,
                '1': `Здравствуйте, {buyername}! Нам очень жаль, что вы столкнулись с проблемой. Напишите нам в чат заказа — мы на связи и сразу же решим вопрос либо оформим полный возврат.`
            },
            bonus: {
                singleBonusText: isFriendly
                    ? `Спасибо за отзыв, {buyername}! Ваш промокод на бонус к следующему заказу: BONUS50.`
                    : isPremium
                    ? `Благодарим за великолепную оценку, {buyername}! В знак признательности дарим персональную скидку на следующую покупку: BONUS50.`
                    : `Спасибо за отзыв! Ваш промокод на скидку к следующей покупке: BONUS50.`
            },
            autoReplies: {
                greetingText: filterText(isFriendly
                    ? `{welcome}, {buyername}! Рад приветствовать вас. Чем могу помочь по товару {lotname}?`
                    : isPremium
                    ? `{welcome}, {buyername}! Рады приветствовать вас. Готовы ответить на любые вопросы по лоту {lotname}.`
                    : isTurbo
                    ? `{welcome}, {buyername}! На связи. Готов оперативно выдать {lotname}.`
                    : `{welcome}, {buyername}! Чем могу помочь?`),
                newOrderReplyText: filterText(isFriendly
                    ? `Заказ #{orderid} оплачен. Спасибо, {buyername}! Приступаю к выдаче, скоро всё будет готово.`
                    : isPremium
                    ? `Благодарим за оплату заказа #{orderid}, уважаемый {buyername}! Заказ принят в работу, начинаем выдачу.`
                    : isTurbo
                    ? `Заказ #{orderid} получен. Начинаю выдачу, пожалуйста, оставайтесь в чате.`
                    : `Спасибо за покупку, {buyername}! Заказ #{orderid} принят в работу, сейчас всё подготовлю.`),
                orderConfirmReplyText: isFriendly
                    ? `Сделка успешно завершена. Спасибо за покупку, {buyername}! Буду благодарен за отзыв о заказе. Приятного дня!`
                    : isPremium
                    ? `Благодарим за подтверждение заказа, {buyername}! Будем искренне признательны за ваш честный отзыв.`
                    : isTurbo
                    ? `Спасибо за подтверждение заказа! Буду благодарен за отзыв. Обращайтесь снова.`
                    : `Спасибо за подтверждение заказа, {buyername}! Буду благодарен за честный отзыв о сделке.`
            },
            templates: {
                greeting: filterText(`{welcome}, {buyername}! Чем могу помочь вам?`),
                completed: filterText(`Заказ выполнен. Пожалуйста, подтвердите выполнение на странице заказа: {orderlink}. Спасибо!`),
                review: filterText(`Спасибо за покупку, {buyername}! Буду признателен, если вы оставите отзыв о сделке.`),
                thanks: filterText(`Спасибо за заказ, {buyername}! Будем рады видеть вас снова. {date}`),
                custom: [
                    {
                        label: 'Инструкция',
                        text: `Инструкция по получению: 1) Перейдите по ссылке заказа; 2) Активируйте данные; 3) Проверьте получение. В случае вопросов пишите в чат.`
                    },
                    {
                        label: 'Ожидание',
                        text: `Ваш заказ находится в обработке, передача займет от 2 до 5 минут. Пожалуйста, оставайтесь в чате.`
                    },
                    {
                        label: 'Гарантия',
                        text: `На все товары предоставляется полная гарантия продавца. Если возникнут вопросы — напишите в чат, оперативно поможем.`
                    }
                ]
            },
            reviewRequest: `Здравствуйте, {buyername}! Заказ выполнен. Буду искренне благодарен за отзыв о сделке. Спасибо за покупку!`
        };

        return res;
    }

    /**
     * Инициализация вкладки ИИ Настройки сообщений
     */
    function initializeAIMsgConfigTab() {
        const page = document.querySelector('.foxen-page-content[data-page="ai_msg_config"]');
        if (!page) return;
        if (page.querySelector('.fxn-empty-dev-card')) return;

        // 1. Элементы пресетов стиля
        const presetContainer = page.querySelector('#fxnAiMsgPresets');
        const customStyleInput = page.querySelector('#fxnAiMsgCustomStyle');

        function syncCustomStyleField() {
            if (!customStyleInput) return;
            const activePresetBtn = presetContainer?.querySelector('.fxn-aimsg-preset-pill.active');
            const key = activePresetBtn?.dataset.preset || 'polite_brief';
            if (!customStyleInput.value.trim() && STYLE_PRESETS[key]) {
                customStyleInput.value = STYLE_PRESETS[key].prompt;
            }
        }

        if (page.dataset.initialized === 'true') {
            syncCustomStyleField();
            return;
        }
        page.dataset.initialized = 'true';

        if (presetContainer && customStyleInput) {
            presetContainer.querySelectorAll('.fxn-aimsg-preset-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    presetContainer.querySelectorAll('.fxn-aimsg-preset-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const key = btn.dataset.preset;
                    if (STYLE_PRESETS[key]) {
                        customStyleInput.value = STYLE_PRESETS[key].prompt;
                        customStyleInput.focus();
                    }
                });
            });

            syncCustomStyleField();
        }

        // 2.5 Восстановление состояния тумблеров параметров (Переменные, Эмодзи, Spintax)
        const paramIds = ['fxnAiOptionVars', 'fxnAiOptionNoEmoji', 'fxnAiOptionSpintax'];
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        if (ext && ext.storage && ext.storage.local) {
            ext.storage.local.get(paramIds, (res) => {
                if (!res) return;
                paramIds.forEach(id => {
                    if (res[id] !== undefined) {
                        page.querySelector('#' + id)?.classList.toggle('on', Boolean(res[id]));
                    }
                });
            });
        }

        // При переключении тумблера «Без эмодзи» — очищаем устаревший жесткий запрет из поля ввода, если пользователь разрешает смайлы
        const noEmojiSw = page.querySelector('#fxnAiOptionNoEmoji');
        if (noEmojiSw) {
            noEmojiSw.addEventListener('change', (e) => {
                const isNoEmoji = e.detail ? e.detail.checked : noEmojiSw.classList.contains('on');
                if (!isNoEmoji && customStyleInput) {
                    customStyleInput.value = customStyleInput.value
                        .replace(/строго\s+без\s+эмодзи[.,!]?/gi, '')
                        .replace(/без\s+эмодзи[.,!]?/gi, '')
                        .trim();
                }
            });
        }

        // 2. Обработка карточек разделов: выбор чекбоксов и раскрытие подразделов
        function setCardSelection(card, isChecked) {
            const cb = card.querySelector('.fxn-aimsg-native-cb');
            if (cb) cb.checked = isChecked;
            card.classList.toggle('selected', isChecked);
        }

        page.querySelectorAll('.fxn-aimsg-block-card').forEach(card => {
            const nativeCb = card.querySelector('.fxn-aimsg-native-cb');
            const headContent = card.querySelector('.fxn-aimsg-head-content');
            const sublist = card.querySelector('.fxn-aimsg-sublist');

            // Изменение нативного чекбокса — мгновенное переключение подсветки карточки
            if (nativeCb) {
                nativeCb.addEventListener('change', () => {
                    card.classList.toggle('selected', nativeCb.checked);
                });
            }

            // Клик по тексту карточки или стрелке — раскрытие/закрытие списка полей
            if (headContent) {
                headContent.addEventListener('click', (e) => {
                    // Если клик по ссылке, инпуту или контейнеру чекбокса — не перехватываем
                    if (e.target.closest('input') || e.target.closest('label') || e.target.closest('.fxn-aimsg-checkbox-container')) return;
                    const willExpand = !card.classList.contains('is-expanded');
                    card.classList.toggle('is-expanded', willExpand);
                    if (sublist) {
                        sublist.style.setProperty('display', willExpand ? 'flex' : 'none', 'important');
                    }
                });
            }
        });

        // Кнопки «Выбрать все» / «Снять все» блоков
        page.querySelector('#fxnAiSelectAllBlocksBtn')?.addEventListener('click', () => {
            page.querySelectorAll('.fxn-aimsg-block-card').forEach(card => setCardSelection(card, true));
        });
        page.querySelector('#fxnAiDeselectAllBlocksBtn')?.addEventListener('click', () => {
            page.querySelectorAll('.fxn-aimsg-block-card').forEach(card => setCardSelection(card, false));
        });

        // 3. Кнопка «Сгенерировать сообщения через ИИ»
        const generateBtn = page.querySelector('#fxnAiMsgGenerateBtn');
        const cooldownBadge = page.querySelector('#fxnAiGenCooldownBadge');
        const statusBox = page.querySelector('#fxnAiMsgStatus');
        const resultsBox = page.querySelector('#fxnAiMsgResults');
        const resultsCardsContainer = page.querySelector('#fxnAiMsgResultsCards');
        const successBanner = page.querySelector('#fxnAiMsgSuccessBanner');

        // Инициализация отображения кулдауна при открытии страницы
        (async () => {
            try {
                const isPrem = await checkIsPremium();
                const stats = await getDailyGenStats();
                if (generateBtn && cooldownBadge) {
                    updateCooldownUI(stats, isPrem, generateBtn, cooldownBadge);
                }
            } catch (_) {}
        })();

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                // Проверка кулдауна
                const isPremium = await checkIsPremium();
                const stats = await getDailyGenStats();
                const cdDurationMs = isPremium ? 30000 : 60000;
                const elapsed = Date.now() - (stats.lastGenTime || 0);
                const remainingMs = cdDurationMs - elapsed;

                if (stats.count >= 3 && remainingMs > 0) {
                    const sec = Math.ceil(remainingMs / 1000);
                    const msg = `Пожалуйста, подождите ${sec} сек перед следующей генерацией (КД: ${isPremium ? 'PRO 30с' : '60с'})`;
                    if (typeof showNotification === 'function') {
                        showNotification(msg, true);
                    } else {
                        alert(msg);
                    }
                    return;
                }

                const blockReviews = !!page.querySelector('#fxnAiBlockReviews')?.checked;
                const blockChatAr = !!page.querySelector('#fxnAiBlockChatAr')?.checked;
                const blockBonus = !!page.querySelector('#fxnAiBlockBonus')?.checked;
                const blockTemplates = !!page.querySelector('#fxnAiBlockTemplates')?.checked;
                const blockReviewReq = !!page.querySelector('#fxnAiBlockReviewReq')?.checked;

                if (!blockReviews && !blockChatAr && !blockBonus && !blockTemplates && !blockReviewReq) {
                    if (typeof showNotification === 'function') {
                        showNotification('Пожалуйста, отметьте хотя бы один блок для настройки', true);
                    } else {
                        alert('Пожалуйста, отметьте хотя бы один блок для настройки');
                    }
                    return;
                }

                const activePresetKey = presetContainer?.querySelector('.fxn-aimsg-preset-pill.active')?.dataset.preset || 'polite_brief';
                const customStyleText = (customStyleInput?.value || '').trim() || STYLE_PRESETS[activePresetKey]?.prompt || 'Вежливо, коротко и по делу';
                const varsSw = page.querySelector('#fxnAiOptionVars');
                const noEmojiSw = page.querySelector('#fxnAiOptionNoEmoji');
                const spintaxSw = page.querySelector('#fxnAiOptionSpintax');

                const useVars = varsSw ? varsSw.classList.contains('on') : true;
                const noEmoji = noEmojiSw ? noEmojiSw.classList.contains('on') : true;
                const useSpintax = spintaxSw ? spintaxSw.classList.contains('on') : false;
                const sellerName = getSellerUsername();

                // Корректируем инструкцию стиля с учётом тумблера эмодзи
                let effectiveStyleText = customStyleText;
                if (!noEmoji) {
                    effectiveStyleText = effectiveStyleText
                        .replace(/строго\s+без\s+эмодзи[.,!]?/gi, '')
                        .replace(/без\s+эмодзи[.,!]?/gi, '')
                        .trim();
                    if (!/эмодзи/i.test(effectiveStyleText)) {
                        effectiveStyleText += ' Используй уместные эмодзи.';
                    }
                } else {
                    effectiveStyleText = effectiveStyleText.replace(/используй\s+уместные\s+эмодзи[^.]*[.]?/gi, '').trim();
                    if (!/без\s+эмодзи/i.test(effectiveStyleText)) {
                        effectiveStyleText += ' Строго без эмодзи.';
                    }
                }

                const blocksList = [];
                if (blockReviews) blocksList.push('Ответы на отзывы (1-5 звезд)');
                if (blockChatAr) blocksList.push('Автоответчик в чате (приветствие, новый заказ, подтверждение заказа)');
                if (blockBonus) blocksList.push('Бонус и промокод за 5 звезд');
                if (blockTemplates) blocksList.push('Шаблоны ответов (приветствие, заказ выполнен, отзыв, спасибо + доп. шаблоны)');
                if (blockReviewReq) blocksList.push('Текст запроса отзыва в заказе');

                const emojiStatus = noEmoji ? 'без эмодзи' : 'с эмодзи';
                const varsStatus = useVars ? 'с переменными' : 'без переменных';
                const spintaxStatus = useSpintax ? 'со Spintax' : 'без Spintax';
                const statusDetails = `Форматирование: ${emojiStatus} • ${varsStatus} • ${spintaxStatus}`;

                generateBtn.disabled = true;
                generateBtn.classList.add('fxn-aimsg-loading');
                if (statusBox) {
                    statusBox.style.display = 'block';
                    statusBox.innerHTML = `
                        <div class="fxn-aimsg-spinner-wrap">
                            <span class="material-symbols-rounded fxn-spin">autorenew</span>
                            <div>
                                <div style="font-weight:600;font-size:13px;color:var(--fxn-text-main);">ИИ генерирует сообщения...</div>
                                <div style="font-size:11.5px;color:var(--fxn-text-subtle);margin-top:2px;">${statusDetails}</div>
                            </div>
                        </div>`;
                }
                if (successBanner) successBanner.style.display = 'none';

                let generatedData = null;
                let requestError = null;

                try {
                    const reqContext = JSON.stringify({
                        blocks: blocksList,
                        sellerName: sellerName,
                        useEmoji: !noEmoji,
                        noEmoji: noEmoji,
                        useVars: useVars,
                        useSpintax: useSpintax
                    });

                    const resp = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({
                        action: 'getAIProcessedText',
                        text: effectiveStyleText,
                        context: reqContext,
                        myUsername: sellerName,
                        type: 'generate_messages_config'
                    });

                    if (resp && resp.success && resp.data) {
                        generatedData = safeParseJson(resp.data);
                    } else if (resp && resp.error) {
                        requestError = resp.error;
                        console.warn('Foxen AI message generation error from server:', resp.error);
                    }
                } catch (e) {
                    requestError = e?.message || String(e);
                    console.warn('Foxen AI message generation warning, using fallback:', e);
                }

                const isRealAI = !!(generatedData && typeof generatedData === 'object');

                if (!isRealAI) {
                    generatedData = generateFallbackConfig(activePresetKey, effectiveStyleText, { useVars, noEmoji, useSpintax });
                }

                // Фиксация генерации в суточной статистике и запуск кулдауна
                stats.count += 1;
                stats.lastGenTime = Date.now();
                await saveDailyGenStats(stats);
                updateCooldownUI(stats, isPremium, generateBtn, cooldownBadge);

                __lastGeneratedData = generatedData;

                renderGeneratedPreviewCards(generatedData, {
                    reviews: blockReviews,
                    chatAr: blockChatAr,
                    bonus: blockBonus,
                    templates: blockTemplates,
                    reviewReq: blockReviewReq
                });

                generateBtn.classList.remove('fxn-aimsg-loading');
                if (statusBox) statusBox.style.display = 'none';

                if (resultsBox) {
                    resultsBox.style.display = 'block';
                    resultsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                if (typeof showNotification === 'function') {
                    if (isRealAI) {
                        showNotification('Сообщения успешно сгенерированы нейросетью. Выберите нужные и примените их ниже.');
                    } else {
                        const errMsg = requestError ? ` (${requestError})` : '';
                        showNotification(`ИИ недоступен${errMsg}. Применен локальный генератор.`, 'warning');
                    }
                }
            });
        }

        // 4. Кнопки «Вставить выбранные и сохранить»
        const applySelectedFn = async () => {
            const container = page.querySelector('#fxnAiMsgResultsCards');
            if (!container) return;
            const checkedCbs = Array.from(container.querySelectorAll('.fxn-aimsg-card-cb:checked'));
            if (checkedCbs.length === 0) {
                if (typeof showNotification === 'function') {
                    showNotification('Не выбрано ни одно сообщение для вставки', true);
                } else {
                    alert('Не выбрано ни одно сообщение для вставки');
                }
                return;
            }
            const fieldIds = checkedCbs.map(cb => cb.dataset.fieldId).filter(Boolean);
            const success = await applyGeneratedConfigToFields(fieldIds);
            if (success) {
                if (successBanner) {
                    successBanner.style.display = 'block';
                    successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                if (typeof showNotification === 'function') {
                    showNotification(`Выбранные сообщения (${fieldIds.length}) успешно сохранены и применены.`);
                }
            }
        };

        page.querySelector('#fxnAiMsgApplyAllBtn')?.addEventListener('click', applySelectedFn);
        page.querySelector('#fxnAiMsgApplyAllBottomBtn')?.addEventListener('click', applySelectedFn);

        // 5. Кнопки перехода в разделы
        page.querySelector('#fxnAiJumpAutoReviewBtn')?.addEventListener('click', () => {
            if (typeof window.switchFoxenPanel === 'function') {
                window.switchFoxenPanel('auto_review');
            }
        });
        page.querySelector('#fxnAiJumpTemplatesBtn')?.addEventListener('click', () => {
            if (typeof window.switchFoxenPanel === 'function') {
                window.switchFoxenPanel('templates');
            }
        });
    }

    /**
     * Рендерит карточки предпросмотра сгенерированных сообщений с чекбоксами выбора и кнопками вставки
     */
    function renderGeneratedPreviewCards(data, activeBlocks) {
        const container = document.getElementById('fxnAiMsgResultsCards');
        if (!container) return;

        let html = '';

        const makeCard = (id, label, icon, text, desc = '') => {
            const escaped = (text || '').replace(/"/g, '&quot;');
            return `
                <div class="fxn-aimsg-result-card" data-field-id="${id}">
                    <div class="fxn-aimsg-card-head">
                        <label class="fxn-aimsg-card-select-label" title="Отметить для вставки">
                            <input type="checkbox" class="fxn-aimsg-card-cb" data-field-id="${id}" checked />
                            <div class="fxn-aimsg-card-title">
                                <span class="material-symbols-rounded">${icon}</span>
                                <span>${label}</span>
                            </div>
                        </label>
                        <div class="fxn-aimsg-card-actions">
                            <button type="button" class="fxn-aimsg-card-apply-single-btn" data-target-input="${id}" title="Применить только это сообщение">
                                <span class="material-symbols-rounded">check</span>
                                <span>Вставить</span>
                            </button>
                            <button type="button" class="fxn-aimsg-card-copy-btn" data-target-input="${id}" title="Скопировать текст">
                                <span class="material-symbols-rounded">content_copy</span>
                            </button>
                        </div>
                    </div>
                    ${desc ? `<div class="fxn-aimsg-card-desc">${desc}</div>` : ''}
                    <textarea class="template-input fxn-aimsg-edit-area" id="fxn_pv_${id}" rows="2">${escaped}</textarea>
                </div>
            `;
        };

        // 1. Ответы на отзывы
        if (activeBlocks.reviews && data.reviews) {
            html += `
                <div class="fxn-aimsg-results-group">
                    <div class="fxn-aimsg-group-title">
                        <span class="material-symbols-rounded">reviews</span>
                        <span>Ответы на отзывы (1–5 звезд)</span>
                    </div>
                    <div class="fxn-aimsg-cards-grid">
                        ${makeCard('review_5', '5 звезд (Высший балл)', 'star', data.reviews['5'] || '', 'Благодарность за покупку и приглашение вернуться')}
                        ${makeCard('review_4', '4 звезды (Хороший отзыв)', 'star', data.reviews['4'] || '', 'Спасибо за отзыв и готовность помочь')}
                        ${makeCard('review_3', '3 звезды (Нейтральный)', 'star', data.reviews['3'] || '', 'Выяснение вопроса и предложение помощи')}
                        ${makeCard('review_2', '2 звезды (Проблема)', 'warning', data.reviews['2'] || '', 'Извинения и оперативная замена/возврат')}
                        ${makeCard('review_1', '1 звезда (Негативный)', 'error', data.reviews['1'] || '', 'Срочное решение вопроса в личных сообщениях')}
                    </div>
                </div>
            `;
        }

        // 2. Автоответчик в чате
        if (activeBlocks.chatAr && data.autoReplies) {
            html += `
                <div class="fxn-aimsg-results-group">
                    <div class="fxn-aimsg-group-title">
                        <span class="material-symbols-rounded">forum</span>
                        <span>Автоответчик в чате</span>
                    </div>
                    <div class="fxn-aimsg-cards-grid">
                        ${makeCard('chat_greeting', 'Приветствие в новом чате', 'chat', data.autoReplies.greetingText || '', 'Отправляется покупателю при открытии диалога')}
                        ${makeCard('chat_new_order', 'При новом заказе', 'shopping_cart_checkout', data.autoReplies.newOrderReplyText || '', 'Мгновенное сообщение после оплаты заказа')}
                        ${makeCard('chat_confirm', 'При подтверждении заказа', 'task_alt', data.autoReplies.orderConfirmReplyText || '', 'Благодарность за закрытие сделки и просьба отзыва')}
                    </div>
                </div>
            `;
        }

        // 3. Бонус за отзыв 5 звезд
        if (activeBlocks.bonus && data.bonus) {
            html += `
                <div class="fxn-aimsg-results-group">
                    <div class="fxn-aimsg-group-title">
                        <span class="material-symbols-rounded">redeem</span>
                        <span>Бонус за отзыв 5 звезд</span>
                    </div>
                    <div class="fxn-aimsg-cards-grid">
                        ${makeCard('single_bonus', 'Текст бонуса / промокод', 'redeem', data.bonus.singleBonusText || '', 'Автоматически присылается в чат после оценки 5 звезд')}
                    </div>
                </div>
            `;
        }

        // 4. Шаблоны быстрых ответов
        if (activeBlocks.templates && data.templates) {
            let tplCards = '';
            if (data.templates.greeting) {
                tplCards += makeCard('tpl_greeting', 'Шаблон: Приветствие', 'chat', data.templates.greeting);
            }
            if (data.templates.completed) {
                tplCards += makeCard('tpl_completed', 'Шаблон: Заказ выполнен', 'check_circle', data.templates.completed);
            }
            if (data.templates.review) {
                tplCards += makeCard('tpl_review', 'Шаблон: Попросить отзыв', 'rate_review', data.templates.review);
            }
            if (data.templates.thanks) {
                tplCards += makeCard('tpl_thanks', 'Шаблон: Спасибо за заказ', 'favorite', data.templates.thanks);
            }

            if (Array.isArray(data.templates.custom)) {
                data.templates.custom.forEach((ct, idx) => {
                    tplCards += makeCard(`tpl_custom_${idx}`, `Шаблон: ${ct.label || 'Дополнительный'}`, 'description', ct.text || '');
                });
            }

            html += `
                <div class="fxn-aimsg-results-group">
                    <div class="fxn-aimsg-group-title">
                        <span class="material-symbols-rounded">description</span>
                        <span>Шаблоны быстрых ответов</span>
                    </div>
                    <div class="fxn-aimsg-cards-grid">
                        ${tplCards}
                    </div>
                </div>
            `;
        }

        // 5. Кнопка запроса отзыва в заказе
        if (activeBlocks.reviewReq && (data.reviewRequest || data.foxenReviewRequestTemplate)) {
            const reqText = data.reviewRequest || data.foxenReviewRequestTemplate || '';
            html += `
                <div class="fxn-aimsg-results-group">
                    <div class="fxn-aimsg-group-title">
                        <span class="material-symbols-rounded">rate_review</span>
                        <span>Кнопка запроса отзыва в заказе</span>
                    </div>
                    <div class="fxn-aimsg-cards-grid">
                        ${makeCard('review_req_btn', 'Текст запроса отзыва в карточке сделки', 'send', reqText, 'Вставляется по клику на кнопку «Попросить отзыв» в заказе')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        const page = document.querySelector('.foxen-page-content[data-page="ai_msg_config"]');

        const updateSelectionSummary = () => {
            const allCbs = container.querySelectorAll('.fxn-aimsg-card-cb');
            const total = allCbs.length;
            const checked = container.querySelectorAll('.fxn-aimsg-card-cb:checked').length;
            const topText = page?.querySelector('#fxnAiApplyBtnText');
            const btmText = page?.querySelector('#fxnAiApplyBottomBtnText');
            const applyAllBtn = page?.querySelector('#fxnAiMsgApplyAllBtn');
            const applyBtmBtn = page?.querySelector('#fxnAiMsgApplyAllBottomBtn');

            let txt = '';
            if (checked === 0) {
                txt = 'Ничего не выбрано';
                if (applyAllBtn) applyAllBtn.disabled = true;
                if (applyBtmBtn) applyBtmBtn.disabled = true;
            } else if (checked === total) {
                txt = `Вставить все (${total}) и сохранить`;
                if (applyAllBtn) applyAllBtn.disabled = false;
                if (applyBtmBtn) applyBtmBtn.disabled = false;
            } else {
                txt = `Вставить выбранные (${checked} из ${total}) и сохранить`;
                if (applyAllBtn) applyAllBtn.disabled = false;
                if (applyBtmBtn) applyBtmBtn.disabled = false;
            }

            if (topText) topText.textContent = txt;
            if (btmText) btmText.textContent = txt;
        };

        // Чекбоксы на карточках — переключение подсветки и пересчет счетчика
        container.querySelectorAll('.fxn-aimsg-card-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const card = cb.closest('.fxn-aimsg-result-card');
                if (card) {
                    card.classList.toggle('deselected', !cb.checked);
                }
                updateSelectionSummary();
            });
        });

        // Кнопки одиночной вставки на карточках
        container.querySelectorAll('.fxn-aimsg-card-apply-single-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetId = btn.dataset.targetInput;
                if (!targetId) return;
                btn.disabled = true;
                const origHtml = btn.innerHTML;
                const success = await applyGeneratedConfigToFields([targetId]);
                if (success) {
                    btn.classList.add('applied');
                    btn.innerHTML = '<span class="material-symbols-rounded">done_all</span><span>Вставлено</span>';
                    setTimeout(() => {
                        btn.classList.remove('applied');
                        btn.innerHTML = origHtml;
                        btn.disabled = false;
                    }, 2000);
                    if (typeof showNotification === 'function') {
                        showNotification('Сообщение успешно применено и сохранено');
                    }
                } else {
                    btn.disabled = false;
                }
            });
        });

        // Кнопки копирования
        container.querySelectorAll('.fxn-aimsg-card-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.targetInput;
                const area = container.querySelector(`#fxn_pv_${targetId}`);
                if (area && area.value) {
                    navigator.clipboard.writeText(area.value).then(() => {
                        btn.style.color = 'var(--fxn-accent, #ffffff)';
                        setTimeout(() => { btn.style.color = ''; }, 1200);
                        if (typeof showNotification === 'function') {
                            showNotification('Текст скопирован в буфер обмена');
                        }
                    }).catch(() => {});
                }
            });
        });

        // Кнопки «Выбрать все» / «Снять все» в карточках результатов
        page?.querySelector('#fxnAiResultsSelectAllBtn')?.addEventListener('click', () => {
            container.querySelectorAll('.fxn-aimsg-card-cb').forEach(cb => {
                cb.checked = true;
                cb.closest('.fxn-aimsg-result-card')?.classList.remove('deselected');
            });
            updateSelectionSummary();
        });

        page?.querySelector('#fxnAiResultsDeselectAllBtn')?.addEventListener('click', () => {
            container.querySelectorAll('.fxn-aimsg-card-cb').forEach(cb => {
                cb.checked = false;
                cb.closest('.fxn-aimsg-result-card')?.classList.add('deselected');
            });
            updateSelectionSummary();
        });

        updateSelectionSummary();
    }

    /**
     * Вставляет выбранные сгенерированные тексты в живые поля DOM и в chrome.storage.local
     * @param {string[]|null} fieldIdsFilter - Массив ID полей для сохранения, либо null для всех
     */
    async function applyGeneratedConfigToFields(fieldIdsFilter = null) {
        const shouldApply = (id) => {
            if (!fieldIdsFilter) return true;
            return fieldIdsFilter.includes(id);
        };

        const getVal = (id) => {
            const area = document.getElementById(`fxn_pv_${id}`);
            return area ? area.value.trim() : null;
        };

        const updateInput = (domId, newVal) => {
            if (newVal == null) return;
            const el = document.getElementById(domId);
            if (el) {
                el.value = newVal;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;

        const [storedAR, storedTpl] = await Promise.all([
            storage.get('foxenAutoReplies'),
            storage.get('foxenTemplateSettings')
        ]);

        const curAR = storedAR?.foxenAutoReplies || {};
        const curTpl = storedTpl?.foxenTemplateSettings || {};

        // 1. Авто-ответы на отзывы
        for (let i = 5; i >= 1; i--) {
            const fieldId = `review_${i}`;
            if (shouldApply(fieldId)) {
                const val = getVal(fieldId);
                if (val !== null) {
                    updateInput(`fxn-review-${i}`, val);
                    curAR.reviewTemplates = curAR.reviewTemplates || {};
                    curAR.reviewTemplates[String(i)] = val;
                }
            }
        }

        // 2. Автоответчик в чате
        if (shouldApply('chat_greeting')) {
            const val = getVal('chat_greeting');
            if (val !== null) {
                updateInput('greetingText', val);
                curAR.greetingText = val;
            }
        }
        if (shouldApply('chat_new_order')) {
            const val = getVal('chat_new_order');
            if (val !== null) {
                updateInput('newOrderReplyText', val);
                curAR.newOrderReplyText = val;
            }
        }
        if (shouldApply('chat_confirm')) {
            const val = getVal('chat_confirm');
            if (val !== null) {
                updateInput('orderConfirmReplyText', val);
                curAR.orderConfirmReplyText = val;
            }
        }

        // 3. Бонус за 5 звезд
        if (shouldApply('single_bonus')) {
            const val = getVal('single_bonus');
            if (val !== null) {
                updateInput('singleBonusText', val);
                curAR.singleBonusText = val;
            }
        }

        // 4. Запрос отзыва в заказе
        let reviewReqVal = null;
        if (shouldApply('review_req_btn')) {
            reviewReqVal = getVal('review_req_btn');
            if (reviewReqVal !== null) {
                updateInput('reviewRequestTemplate', reviewReqVal);
                curAR.reviewRequestTemplate = reviewReqVal;
            }
        }

        // 5. Шаблоны чата
        curTpl.standard = curTpl.standard || {};
        if (shouldApply('tpl_greeting')) {
            const val = getVal('tpl_greeting');
            if (val !== null) {
                curTpl.standard.greeting = curTpl.standard.greeting || { enabled: true, label: 'Приветствие', color: '#C026D3' };
                curTpl.standard.greeting.text = val;
            }
        }
        if (shouldApply('tpl_completed')) {
            const val = getVal('tpl_completed');
            if (val !== null) {
                curTpl.standard.completed = curTpl.standard.completed || { enabled: true, label: 'Заказ выполнен', color: '#C026D3' };
                curTpl.standard.completed.text = val;
            }
        }
        if (shouldApply('tpl_review')) {
            const val = getVal('tpl_review');
            if (val !== null) {
                curTpl.standard.review = curTpl.standard.review || { enabled: true, label: 'Попросить отзыв', color: '#FF6B6B' };
                curTpl.standard.review.text = val;
            }
        }
        if (shouldApply('tpl_thanks')) {
            const val = getVal('tpl_thanks');
            if (val !== null) {
                curTpl.standard.thanks = curTpl.standard.thanks || { enabled: true, label: 'Спасибо за заказ', color: '#FF6B6B' };
                curTpl.standard.thanks.text = val;
            }
        }

        if (__lastGeneratedData?.templates?.custom && Array.isArray(__lastGeneratedData.templates.custom)) {
            curTpl.custom = curTpl.custom || [];
            __lastGeneratedData.templates.custom.forEach((ct, idx) => {
                const fieldId = `tpl_custom_${idx}`;
                if (shouldApply(fieldId)) {
                    const customText = getVal(fieldId);
                    if (customText) {
                        const label = ct.label || `Шаблон ${idx + 1}`;
                        const existing = curTpl.custom.find(c => c.label === label);
                        if (existing) {
                            existing.text = customText;
                        } else {
                            curTpl.custom.push({
                                id: `fxn_ai_tpl_${Date.now()}_${idx}`,
                                label: label,
                                text: customText,
                                color: '#ffffff',
                                enabled: true
                            });
                        }
                    }
                }
            });
        }

        const savePromises = [
            storage.set({ foxenAutoReplies: curAR }),
            storage.set({ foxenTemplateSettings: curTpl })
        ];
        if (reviewReqVal !== null) {
            savePromises.push(storage.set({ foxenReviewRequestTemplate: reviewReqVal }));
        }

        await Promise.all(savePromises);

        if (typeof templateSettings !== 'undefined' && templateSettings) {
            Object.assign(templateSettings, curTpl);
        }

        if (typeof renderTemplateSettings === 'function') {
            try { renderTemplateSettings(); } catch (_) {}
        }
        if (typeof addChatTemplateButtons === 'function') {
            try { addChatTemplateButtons(); } catch (_) {}
        }

        return true;
    }

    // Экспорт в глобальное пространство
    window.initializeAIMsgConfigTab = initializeAIMsgConfigTab;
    window.initAIMsgConfigTab = initializeAIMsgConfigTab;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const page = document.querySelector('.foxen-page-content[data-page="ai_msg_config"]');
            if (page) initializeAIMsgConfigTab();
        });
    } else {
        setTimeout(() => {
            const page = document.querySelector('.foxen-page-content[data-page="ai_msg_config"]');
            if (page) initializeAIMsgConfigTab();
        }, 150);
    }

})();
