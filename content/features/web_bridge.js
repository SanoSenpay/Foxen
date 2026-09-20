/**
 * Foxen Web Bridge Protocol (Monochrome Edition)
 * Listens for 1-Click theme/sound installation requests from web.foxen.site and localhost.
 * Shows a sleek monochrome modal confirmation window on FunPay / Website to apply theme or sound.
 */

(function () {
    'use strict';

    console.log('[Foxen Bridge] Web-to-Extension Bridge loaded on', window.location.href);

    // Listen for postMessage from website
    async function fetchFunPayProfileInfo() {
        console.log('[Foxen Bridge] Запрос свежих данных профиля FunPay из активной вкладки...');
        try {
            const api = typeof browser !== 'undefined' ? browser : chrome;

            // Запрашиваем background.js для прямого парсинга активной вкладки FunPay
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                console.log('[Foxen Bridge] Отправка запроса в background.js (FOXEN_GET_FUNPAY_PROFILE)...');
                const bgRes = await new Promise((resolve) => {
                    const timer = setTimeout(() => {
                        console.warn('[Foxen Bridge] Таймаут ответа от background.js');
                        resolve(null);
                    }, 5000);
                    chrome.runtime.sendMessage({ action: 'FOXEN_GET_FUNPAY_PROFILE', parseActiveTab: true }, (res) => {
                        clearTimeout(timer);
                        if (chrome.runtime.lastError || !res) {
                            console.warn('[Foxen Bridge] Runtime error или пустой ответ:', chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            resolve(res);
                        }
                    });
                });

                if (bgRes && bgRes.ok && bgRes.profile && bgRes.profile.userId) {
                    console.log('[Foxen Bridge] Успешно спарсен профиль из активной вкладки:', bgRes.profile.username, `(#${bgRes.profile.userId})`, 'источник:', bgRes.profile.source);
                    // Синхронизируем актуальные данные в storage для остальных компонентов
                    try {
                        await api.storage.local.set({ 
                            foxenUserProfile: bgRes.profile,
                            fpCurrentUserInfo: { userId: String(bgRes.profile.userId), username: bgRes.profile.username }
                        });
                    } catch(e) {}
                    return bgRes.profile;
                } else if (bgRes && bgRes.error) {
                    console.warn('[Foxen Bridge] Ошибка background.js:', bgRes.error);
                }
            }

            console.warn('[Foxen Bridge] Не удалось спарсить профиль FunPay из активной вкладки');
            return null;
        } catch (e) {
            console.error('[Foxen Bridge] Ошибка извлечения профиля FunPay:', e);
            return null;
        }
    }

    /**
     * Слушает postMessage от сайта foxen
     */
    window.addEventListener('message', async (event) => {
        if (!event.data || event.data.source !== 'foxen-web-hub') return;

        const { action, theme, sound, themeName, soundName } = event.data;

        if (action === 'FOXEN_PING') {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenBookmarkedThemeIds = [] } = await api.storage.local.get('foxenBookmarkedThemeIds');
            window.postMessage({ source: 'foxen-extension', action: 'FOXEN_PONG', version: '3.3.0', bookmarks: foxenBookmarkedThemeIds }, '*');
            return;
        }

        if (action === 'FOXEN_REQUEST_USER_PROFILE') {
            const profile = await fetchFunPayProfileInfo();
            window.postMessage({
                source: 'foxen-extension',
                action: 'FOXEN_USER_PROFILE_RESPONSE',
                profile: profile
            }, '*');
            return;
        }

        if (action === 'FOXEN_REQUEST_EXPORT' || action === 'FOXEN_REQUEST_SETTINGS_EXPORT' || event.data.type === 'FOXEN_REQUEST_SETTINGS_EXPORT') {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            const allSettings = await api.storage.local.get(null);
            const categories = event.data.categories || null;
            
            const cleanedData = cleanAndFilterFoxenData(allSettings, categories);

            window.postMessage({
                source: 'foxen-extension',
                action: 'FOXEN_SETTINGS_EXPORT_RESPONSE',
                type: 'FOXEN_SETTINGS_EXPORT_RESPONSE',
                payload: cleanedData
            }, '*');
            return;
        }
        if (action === 'FOXEN_SYNC_BOOKMARKS' && Array.isArray(event.data.bookmarks)) {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            await api.storage.local.set({ foxenBookmarkedThemeIds: event.data.bookmarks });
            window.postMessage({ source: 'foxen-extension', action: 'FOXEN_BOOKMARKS_SYNCED' }, '*');
            return;
        }

        if (action === 'FOXEN_INSTALL_THEME' && theme) {
            handleThemeInstallRequest(theme, themeName || theme.name || 'Кастомная тема');
        }

        if (action === 'FOXEN_INSTALL_TEMPLATE_PRESET' && event.data.preset) {
            handleTemplatePresetInstallRequest(event.data.preset, event.data.presetName || event.data.preset.title || 'Пресет шаблонов');
        }

        if (action === 'FOXEN_INSTALL_AUTO_REPLY_PRESET' && event.data.preset) {
            handleAutoReplyPresetInstallRequest(event.data.preset, event.data.presetName || event.data.preset.title || 'Пресет авто-ответов');
        }

        if (action === 'FOXEN_SYNC_NICKNAME_EFFECT') {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            try {
                const toSet = {};
                if (event.data.effect) {
                    toSet.fxn_my_nickname_effect = event.data.effect;
                }
                if (typeof event.data.custom_emoji !== 'undefined') {
                    toSet.fxn_my_custom_emoji = event.data.custom_emoji;
                }
                if (event.data.username) {
                    const u = event.data.username.toLowerCase();
                    const clean = u.replace(/[\s_-]+/g, '');
                    if (event.data.effect) {
                        toSet[`fxn_effect_${u}`] = event.data.effect;
                        toSet[`fxn_effect_${clean}`] = event.data.effect;
                    }
                    if (typeof event.data.custom_emoji !== 'undefined') {
                        toSet[`fxn_custom_emoji_${u}`] = event.data.custom_emoji;
                        toSet[`fxn_custom_emoji_${clean}`] = event.data.custom_emoji;
                    }
                }
                await api.storage.local.set(toSet);
                console.log('[Foxen Bridge] Synchronized nickname effect & custom emoji to extension storage:', toSet);
            } catch(e) {
                console.error('[Foxen Bridge] Storage sync error:', e);
            }
        }
    });

    /**
     * Очищает storage от ВСЕХ кэшей, банеров, новостей, логов и выгружает 100% настроек пользователя
     */
    function cleanAndFilterFoxenData(rawStorage, selectedCategories) {
        if (!rawStorage || typeof rawStorage !== 'object') return {};

        let inputObj = rawStorage;
        if (rawStorage.settings && typeof rawStorage.settings === 'object') {
            inputObj = rawStorage.settings;
        }

        // Список выражений для 100% ИСКЛЮЧЕНИЯ кэшей, рантайм-маркеров и мусора
        const JUNK_PATTERNS = [
            /donat/i, /sponsor/i, /account/i, /session/i, /salesData/i, /purchasesData/i, /financeData/i,
            /userInfo/i, /Cache/i, /Logs/i, /Seeded/i, /banner/i, /news/i, /announcement/i, /telemetry/i,
            /wallpaper/i, /imageStore/i, /canvas/i, /history/i, /unread/i, /heartbeat/i, /poll/i, /processed/i,
            /collecting/i, /lastUpdate/i, /token/i, /auth_code/i, /tg_owner/i, /profile:/i, /DescrCache/i,
            /greetedUsers/i, /lastReadNews/i, /fxnLastReadNewsId/i
        ];

        const isJunk = (key) => {
            if (!key || typeof key !== 'string') return true;
            return JUNK_PATTERNS.some(rgx => rgx.test(key));
        };

        // Паттерны для ИСКЛЮЧЕНИЯ если снята соответствующая галочка в модальном окне
        const EXCLUDE_IF_DESELECTED = {
            general_settings: [/autobump/i, /bump/i, /ai/i, /disabler/i, /sound/i, /misc/i],
            message_templates: [/template/i, /reply/i, /replies/i, /delivery/i, /message/i, /quick/i, /greeting/i, /review/i],
            themes_and_styles: [/theme/i, /style/i, /css/i, /font/i, /color/i, /accent/i],
            user_notes_and_crm: [/note/i, /buyer/i, /blacklist/i, /crm/i, /tag/i],
            lot_presets: [/preset/i, /lot/i, /description/i, /draft/i]
        };

        const activeCats = (selectedCategories && Array.isArray(selectedCategories) && selectedCategories.length > 0)
            ? new Set(selectedCategories)
            : null;

        const cleaned = {};
        for (let [k, v] of Object.entries(inputObj)) {
            if (isJunk(k)) continue;

            // Если указан выбор категорий, отсекаем только отключенные пользователем разделы
            if (activeCats) {
                let shouldExclude = false;
                for (const [catName, patterns] of Object.entries(EXCLUDE_IF_DESELECTED)) {
                    if (!activeCats.has(catName)) {
                        if (patterns.some(rgx => rgx.test(k))) {
                            shouldExclude = true;
                            break;
                        }
                    }
                }
                if (shouldExclude) continue;
            }

            // Очищаем рантайм-маркеры отправленных приветствий из foxenAutoReplies
            if (k === 'foxenAutoReplies' && v && typeof v === 'object') {
                v = { ...v };
                delete v.greetedUsers;
                delete v.autoResponderSeeded;
                delete v.lastSeenMsgIds;
                delete v.processedMessageIds;
                delete v.selfInitiatedChats;
            }

            cleaned[k] = v;
        }

        // Дедупликация старых рутовых ключей при наличии foxenAutoReplies
        if (cleaned.foxenAutoReplies) {
            delete cleaned.greetingText;
            delete cleaned.greetingEnabled;
            delete cleaned.greetingSendOrder;
            delete cleaned.greetingImages;
            delete cleaned.reviewTemplates;
            delete cleaned.reviewTemplateImages;
            delete cleaned.keywordsEnabled;
        }

        return cleaned;
    }

    // Notify web page immediately that extension is ready
    window.postMessage({ source: 'foxen-extension', action: 'FOXEN_PONG', version: '3.3.0' }, '*');

    /**
     * Shows modal on page confirming Theme Installation (Monochrome Dark Style)
     */
    async function handleThemeInstallRequest(themeData, name) {
        document.getElementById('foxen-theme-install-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'foxen-theme-install-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            color: #ffffff;
        `;

        modal.innerHTML = `
            <div style="background: #09090b; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 18px; padding: 28px; max-width: 460px; width: 90%; box-shadow: 0 25px 60px rgba(0,0,0,0.9); text-align: center;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-symbols-outlined" style="font-size: 28px; color: #ffffff;">palette</span>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #ffffff;">Установить тему в Foxen?</h3>
                <p style="font-size: 0.9rem; color: #a1a1aa; margin-bottom: 20px; line-height: 1.5;">Вы собираетесь применить тему <b style="color: #ffffff;">«${escapeHtml(name)}»</b> к вашему интерфейсу FunPay.</p>
                
                <div style="background: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-around;">
                    <div>
                        <div style="font-size: 0.75rem; color: #71717a; font-weight: 600;">ФОН</div>
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${themeData.bgColor1 || '#000'}; border: 1px solid #444; margin: 4px auto 0;"></div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #71717a; font-weight: 600;">КОНТЕЙНЕР</div>
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${themeData.containerBgColor || '#111'}; border: 1px solid #444; margin: 4px auto 0;"></div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #71717a; font-weight: 600;">АКЦЕНТ</div>
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${themeData.linkColor || '#ffffff'}; border: 1px solid #444; margin: 4px auto 0;"></div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-theme-install" style="flex: 1; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; font-weight: 600; cursor: pointer; transition: 0.2s;">Отмена</button>
                    <button id="btn-confirm-theme-install" style="flex: 1; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid #ffffff; color: #000000; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(255,255,255,0.2); display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #000000;">download</span>
                        Установить тему
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-cancel-theme-install').onclick = () => modal.remove();

        modal.querySelector('#btn-confirm-theme-install').onclick = async () => {
            try {
                themeData.name = name;
                
                const api = typeof browser !== 'undefined' ? browser : chrome;
                await api.storage.local.set({ foxenTheme: themeData });

                if (typeof applyCustomTheme === 'function') {
                    await applyCustomTheme();
                }

                modal.remove();
                
                window.postMessage({ source: 'foxen-extension', action: 'FOXEN_THEME_INSTALLED_SUCCESS', themeName: name }, '*');

                showBridgeNotification(`Тема «${name}» успешно привязана к Foxen!`);
            } catch (err) {
                alert('Ошибка сохранения темы: ' + err.message);
            }
        };
    }

    /**
     * Shows modal confirming Template Preset Installation (1-Click)
     */
    async function handleTemplatePresetInstallRequest(presetData, name) {
        document.getElementById('foxen-template-preset-modal')?.remove();

        const templatesCount = Array.isArray(presetData.templates) ? presetData.templates.length : 0;

        const modal = document.createElement('div');
        modal.id = 'foxen-template-preset-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            color: #ffffff;
        `;

        modal.innerHTML = `
            <div style="background: #09090b; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 18px; padding: 28px; max-width: 460px; width: 90%; box-shadow: 0 25px 60px rgba(0,0,0,0.9); text-align: center;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-symbols-outlined" style="font-size: 28px; color: #60a5fa;">description</span>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #ffffff;">Добавить шаблоны в Foxen?</h3>
                <p style="font-size: 0.9rem; color: #a1a1aa; margin-bottom: 16px; line-height: 1.5;">Вы собираетесь добавить набор шаблонов ответов <b style="color: #ffffff;">«${escapeHtml(name)}»</b> (${templatesCount} шт.) в расширение Foxen.</p>

                <div style="background: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; margin-bottom: 24px; text-align: left; max-height: 140px; overflow-y: auto;">
                    ${Array.isArray(presetData.templates) ? presetData.templates.map(t => `
                        <div style="font-size: 0.82rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${t.color || '#3b82f6'}; display: inline-block;"></span>
                            <b>${escapeHtml(t.label)}:</b> <span style="color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(t.text)}</span>
                        </div>
                    `).join('') : ''}
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-tpl-install" style="flex: 1; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; font-weight: 600; cursor: pointer;">Отмена</button>
                    <button id="btn-confirm-tpl-install" style="flex: 1; padding: 12px; border-radius: 10px; background: #3b82f6; border: 1px solid #3b82f6; color: #ffffff; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">add_circle</span>
                        Добавить шаблоны
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-cancel-tpl-install').onclick = () => modal.remove();

        modal.querySelector('#btn-confirm-tpl-install').onclick = async () => {
            try {
                const api = typeof browser !== 'undefined' ? browser : chrome;
                const { foxenTemplateSettings = {} } = await api.storage.local.get('foxenTemplateSettings');
                const custom = Array.isArray(foxenTemplateSettings.custom) ? [...foxenTemplateSettings.custom] : [];

                const list = Array.isArray(presetData.custom) ? presetData.custom : (Array.isArray(presetData.templates) ? presetData.templates : []);
                for (const t of list) {
                    if (t.isStandard) continue;
                    const exists = custom.some(c => c.text === t.text);
                    if (!exists && (t.text || t.label)) {
                        custom.push({
                            id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            label: t.label || 'Шаблон',
                            text: t.text || '',
                            color: t.color || '#3B82F6',
                            enabled: t.enabled !== false,
                            images: Array.isArray(t.images) ? t.images : [],
                            sendOrder: t.sendOrder || 'text_first'
                        });
                    }
                }

                foxenTemplateSettings.custom = custom;
                await api.storage.local.set({ foxenTemplateSettings });

                modal.remove();
                window.postMessage({ source: 'foxen-extension', action: 'FOXEN_TEMPLATE_INSTALLED_SUCCESS', presetName: name }, '*');
                showBridgeNotification(`Шаблоны «${name}» успешно добавлены в Foxen!`);
            } catch (err) {
                alert('Ошибка установки шаблонов: ' + err.message);
            }
        };
    }

    /**
     * Shows modal confirming Auto-Reply Preset Installation (Texts Only)
     */
    async function handleAutoReplyPresetInstallRequest(presetData, name) {
        document.getElementById('foxen-autoreply-preset-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'foxen-autoreply-preset-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            color: #ffffff;
        `;

        modal.innerHTML = `
            <div style="background: #09090b; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 18px; padding: 28px; max-width: 480px; width: 90%; box-shadow: 0 25px 60px rgba(0,0,0,0.9); text-align: center;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-symbols-outlined" style="font-size: 28px; color: #10b981;">smart_toy</span>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #ffffff;">Применить тексты авто-ответов?</h3>
                <p style="font-size: 0.9rem; color: #a1a1aa; margin-bottom: 12px; line-height: 1.5;">Вы собираетесь применить заготовленные тексты авто-ответов <b style="color: #ffffff;">«${escapeHtml(name)}»</b>.</p>

                <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 10px; padding: 10px 12px; font-size: 0.82rem; color: #93c5fd; text-align: left; margin-bottom: 20px; line-height: 1.45;">
                    ℹ️ <b>Обратите внимание:</b> Применяются только заготовленные тексты сообщений (приветствие, новый заказ, подтверждение, отзывы). Триггеры и правила включения настраиваются индивидуально в расширении.
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-reply-install" style="flex: 1; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; font-weight: 600; cursor: pointer;">Отмена</button>
                    <button id="btn-confirm-reply-install" style="flex: 1; padding: 12px; border-radius: 10px; background: #10b981; border: 1px solid #10b981; color: #ffffff; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">done_all</span>
                        Применить тексты
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-cancel-reply-install').onclick = () => modal.remove();

        modal.querySelector('#btn-confirm-reply-install').onclick = async () => {
            try {
                const api = typeof browser !== 'undefined' ? browser : chrome;
                const { foxenAutoReplies = {} } = await api.storage.local.get('foxenAutoReplies');
                const texts = presetData.texts || presetData || {};
                if (typeof texts.greetingText === 'string') foxenAutoReplies.greetingText = texts.greetingText;
                if (Array.isArray(texts.greetingImages)) foxenAutoReplies.greetingImages = texts.greetingImages;
                if (texts.greetingSendOrder) foxenAutoReplies.greetingSendOrder = texts.greetingSendOrder;

                if (typeof texts.newOrderReplyText === 'string') foxenAutoReplies.newOrderReplyText = texts.newOrderReplyText;
                if (Array.isArray(texts.newOrderReplyImages)) foxenAutoReplies.newOrderReplyImages = texts.newOrderReplyImages;
                if (texts.newOrderReplySendOrder) foxenAutoReplies.newOrderReplySendOrder = texts.newOrderReplySendOrder;

                if (typeof texts.orderConfirmReplyText === 'string') foxenAutoReplies.orderConfirmReplyText = texts.orderConfirmReplyText;
                if (Array.isArray(texts.orderConfirmReplyImages)) foxenAutoReplies.orderConfirmReplyImages = texts.orderConfirmReplyImages;
                if (texts.orderConfirmReplySendOrder) foxenAutoReplies.orderConfirmReplySendOrder = texts.orderConfirmReplySendOrder;

                if (typeof texts.singleBonusText === 'string') foxenAutoReplies.singleBonusText = texts.singleBonusText;
                if (Array.isArray(texts.randomBonuses)) foxenAutoReplies.randomBonuses = texts.randomBonuses;
                if (texts.reviewTemplates && typeof texts.reviewTemplates === 'object') {
                    foxenAutoReplies.reviewTemplates = { ...(foxenAutoReplies.reviewTemplates || {}), ...texts.reviewTemplates };
                }
                if (texts.reviewTemplateImages && typeof texts.reviewTemplateImages === 'object') {
                    foxenAutoReplies.reviewTemplateImages = { ...(foxenAutoReplies.reviewTemplateImages || {}), ...texts.reviewTemplateImages };
                }
                if (Array.isArray(texts.keywords)) {
                    foxenAutoReplies.keywords = texts.keywords;
                }

                await api.storage.local.set({ foxenAutoReplies });

                modal.remove();
                window.postMessage({ source: 'foxen-extension', action: 'FOXEN_AUTO_REPLY_INSTALLED_SUCCESS', presetName: name }, '*');
                showBridgeNotification(`Тексты авто-ответов «${name}» успешно применены!`);
            } catch (err) {
                alert('Ошибка сохранения авто-ответов: ' + err.message);
            }
        };
    }

    function showBridgeNotification(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px;
            background: #ffffff; color: #000000;
            padding: 14px 22px; border-radius: 10px; font-weight: 700;
            font-size: 0.92rem; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            z-index: 1000000; font-family: sans-serif;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

})();
