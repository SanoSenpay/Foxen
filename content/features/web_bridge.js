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

            // Фоллбэк: если активная вкладка не ответила, читаем сохранённый профиль из локального хранилища
            const stored = await api.storage.local.get(['foxenUserProfile', 'foxen_user_profile', 'fpCurrentUserInfo']);
            const prof = stored?.foxenUserProfile || stored?.foxen_user_profile;
            if (prof && prof.userId) {
                console.log('[Foxen Bridge] Использован кэшированный профиль FunPay из storage:', prof.username, `(#${prof.userId})`);
                return prof;
            }
            if (stored?.fpCurrentUserInfo && stored.fpCurrentUserInfo.userId) {
                return {
                    userId: String(stored.fpCurrentUserInfo.userId),
                    username: stored.fpCurrentUserInfo.username || `User #${stored.fpCurrentUserInfo.userId}`,
                    avatarUrl: '',
                    bannerUrl: '',
                    source: 'storage_basic'
                };
            }

            console.warn('[Foxen Bridge] Не удалось получить профиль FunPay ни из вкладки, ни из storage');
            return null;
        } catch (e) {
            console.error('[Foxen Bridge] Ошибка извлечения профиля FunPay:', e);
            return null;
        }
    }

    /**
     * Слушает postMessage от сайта foxen
     */
    function getExtensionVersion() {
        try {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            if (api && api.runtime && typeof api.runtime.getManifest === 'function') {
                const manifest = api.runtime.getManifest();
                if (manifest && manifest.version) return manifest.version;
            }
        } catch (_) {}
        return '4.0.0';
    }

    window.addEventListener('message', async (event) => {
        if (!event.data) return;
        const validSources = ['foxen-web-hub', 'foxen-web', 'foxen-web-app', 'foxen-website', 'foxen-web-catalog', 'foxen-themes'];
        const isFromWeb = validSources.includes(event.data.source) || event.data.target === 'foxen-extension' || (typeof event.data.action === 'string' && event.data.action.startsWith('FOXEN_'));
        if (!isFromWeb) return;

        const action = event.data.action || event.data.type;
        if (!action) return;
        const { theme, sound, themeName, soundName } = event.data;

        if (action === 'FOXEN_PING') {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenBookmarkedThemeIds = [] } = await api.storage.local.get('foxenBookmarkedThemeIds');
            window.postMessage({ source: 'foxen-extension', action: 'FOXEN_PONG', version: getExtensionVersion(), bookmarks: foxenBookmarkedThemeIds }, '*');
            return;
        }

        if (action === 'FOXEN_GET_STATUS' || action === 'FOXEN_STATUS') {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            const data = await api.storage.local.get(['foxenTheme', 'foxenBookmarkedThemeIds', 'foxenUserProfile']);
            window.postMessage({
                source: 'foxen-extension',
                action: 'FOXEN_STATUS_RESPONSE',
                theme: data.foxenTheme || null,
                bookmarks: data.foxenBookmarkedThemeIds || [],
                profile: data.foxenUserProfile || null,
                version: getExtensionVersion()
            }, '*');
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

        if ((action === 'FOXEN_INSTALL_THEME' || action === 'INSTALL_THEME' || action === 'FOXEN_APPLY_THEME') && (theme || event.data.themeData || event.data.data || event.data.fileUrl)) {
            const tData = theme || event.data.themeData || event.data.data || {
                fileUrl: event.data.fileUrl,
                previewUrl: event.data.previewUrl,
                bannerUrl: event.data.bannerUrl,
                id: event.data.themeId,
                name: event.data.themeName,
                author: event.data.author,
                description: event.data.description
            };
            if (event.data.fileUrl && !tData.fileUrl) tData.fileUrl = event.data.fileUrl;
            if (event.data.previewUrl && !tData.previewUrl) tData.previewUrl = event.data.previewUrl;
            if (event.data.bannerUrl && !tData.bannerUrl) tData.bannerUrl = event.data.bannerUrl;
            const tName = themeName || event.data.themeName || event.data.name || tData.name || 'Кастомная тема';
            handleThemeInstallRequest(tData, tName);
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
                const u = event.data.username ? event.data.username.toLowerCase() : null;
                const clean = u ? u.replace(/[\s_-]+/g, '') : null;

                if (typeof event.data.effect !== 'undefined') {
                    toSet.fxn_my_nickname_effect = event.data.effect || null;
                    if (u && clean) {
                        toSet[`fxn_effect_${u}`] = event.data.effect || null;
                        toSet[`fxn_effect_${clean}`] = event.data.effect || null;
                    }
                }
                if (typeof event.data.custom_emoji !== 'undefined') {
                    toSet.fxn_my_custom_emoji = event.data.custom_emoji || null;
                    if (u && clean) {
                        toSet[`fxn_custom_emoji_${u}`] = event.data.custom_emoji || null;
                        toSet[`fxn_custom_emoji_${clean}`] = event.data.custom_emoji || null;
                    }
                }
                if (clean) {
                    toSet.fxn_my_active_user = clean;
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
    window.postMessage({ source: 'foxen-extension', action: 'FOXEN_PONG', version: getExtensionVersion() }, '*');

    let _catalogThemesCache = null;

    async function fetchThemesCatalogForBridge() {
        if (_catalogThemesCache && _catalogThemesCache.length > 0) return _catalogThemesCache;
        try {
            let resp = await fetch('https://cdn.foxen.site/download/Catalog/Themes/index.json').catch(() => null);
            if (!resp || !resp.ok) {
                resp = await fetch('https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/index.json').catch(() => null);
            }
            if (resp && resp.ok) {
                const data = await resp.json();
                _catalogThemesCache = Array.isArray(data) ? data : (data.themes || []);
                return _catalogThemesCache;
            }
        } catch (_) {}
        return [];
    }

    function resolveBridgeThemeUrl(url) {
        if (!url || typeof url !== 'string') return null;
        let trimmed = url.trim();
        if (!trimmed) return null;
        if (trimmed.includes('cdn.foxen.site/download/Catalog/Themes/themes/')) {
            trimmed = trimmed.replace('cdn.foxen.site/download/Catalog/Themes/themes/', 'cdn.foxen.site/download/Catalog/Themes/');
        }
        if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('previews/')) {
            return `https://cdn.foxen.site/download/Catalog/Themes/${trimmed}`;
        }
        if (trimmed.startsWith('themes/')) {
            return `https://cdn.foxen.site/download/Catalog/Themes/${trimmed.replace(/^themes\//, '')}`;
        }
        if (trimmed.endsWith('.fptheme')) {
            return `https://cdn.foxen.site/download/Catalog/Themes/${trimmed}`;
        }
        return `https://cdn.foxen.site/download/Catalog/Themes/previews/${trimmed.replace(/^\/+/, '')}`;
    }

    function checkIsAnimatedBg(url) {
        if (!url) return false;
        const s = String(url).toLowerCase();
        return s.startsWith('data:image/gif') ||
               s.includes('.gif') ||
               s.includes('image/gif') ||
               s.includes('.webp') ||
               s.includes('tenor.com') ||
               s.includes('giphy.com');
    }

    /**
     * Shows modal on page confirming Theme Installation (with HD Preview Banner, High Contrast & Real-Time Sync)
     */
    async function handleThemeInstallRequest(themeData, name) {
        const isFunPay = window.location.hostname.includes('funpay.com');
        if (!isFunPay) {
            // На веб-сайте модалку НЕ открываем - перенаправляем запрос во вкладку FunPay
            console.log('[Foxen Bridge] Запрос на установку темы получен на веб-сайте, перенаправляем во вкладку FunPay...');
            const runtimeApi = typeof browser !== 'undefined' && browser.runtime ? browser : (typeof chrome !== 'undefined' ? chrome : null);
            if (runtimeApi && runtimeApi.runtime && runtimeApi.runtime.sendMessage) {
                try {
                    const sendPromise = runtimeApi.runtime.sendMessage({
                        action: 'FOXEN_FORWARD_THEME_INSTALL_TO_FUNPAY',
                        theme: themeData,
                        themeName: name
                    }, (res) => {
                        if (res && res.ok) {
                            showBridgeNotification('Открыта страница FunPay для подтверждения установки темы');
                        }
                    });
                    if (sendPromise && typeof sendPromise.then === 'function') {
                        sendPromise.then(res => {
                            if (res && res.ok) {
                                showBridgeNotification('Открыта страница FunPay для подтверждения установки темы');
                            }
                        }).catch(() => {});
                    }
                } catch(e) {
                    console.error('[Foxen Bridge] Error sending forward message:', e);
                }
            }
            return;
        }

        if (!themeData) return;

        document.getElementById('foxen-theme-install-modal')?.remove();

        const finalName = name || themeData.name || themeData.title || 'Кастомная тема';

        // Разрешаем базовые цвета из переданных данных мгновенно (без ожидания сети)
        const tColors = themeData.colors || {};
        let colorBg1 = themeData.bgColor1 || tColors.bgColor1 || '#0a0a0c';
        let colorBg2 = themeData.bgColor2 || tColors.bgColor2 || '#141418';
        let colorContainer = themeData.containerBgColor || tColors.containerBgColor || '#111216';
        let colorText = themeData.textColor || tColors.textColor || '#ffffff';
        let colorLink = themeData.linkColor || tColors.linkColor || '#3b82f6';

        // Разрешаем баннер/превью для карточки в модальном окне
        let rawBanner = themeData.bannerUrl || themeData.previewUrl || themeData.banner || themeData.preview ||
            themeData.previewImage || null;
        let bannerUrl = resolveBridgeThemeUrl(rawBanner);

        // ВНИМАНИЕ: Задний фон страницы (обои) берётся ТОЛЬКО из реальной темы, если пользователь его установил!
        // Ни в коем случае НЕ делаем обоями превью-баннер карточки (bannerUrl)!
        let rawBg = (themeData.bgImage && themeData.bgImage !== bannerUrl && themeData.bgImage !== themeData.previewUrl) ? themeData.bgImage : null;
        let realBgImage = rawBg ? resolveBridgeThemeUrl(rawBg) : null;

        const themeDesc = themeData.description || themeData.desc || '';

        // Определяем ссылку на скачивание исходного .fptheme с cdn.foxen.site
        let fileUrl = themeData.fileUrl || themeData.downloadUrl || themeData.githubRawUrl || themeData.url || null;
        if (!fileUrl && themeData.file) {
            fileUrl = resolveBridgeThemeUrl(themeData.file);
        }
        if (!fileUrl && themeData.filename) {
            fileUrl = `https://cdn.foxen.site/download/Catalog/Themes/${themeData.filename.replace(/^themes\//, '')}`;
        }
        if (!fileUrl && (themeData.id || themeData.canonicalId || themeData.slug)) {
            const rawId = (themeData.id || themeData.canonicalId || themeData.slug);
            fileUrl = `https://cdn.foxen.site/download/Catalog/Themes/${rawId}.fptheme`;
        }
        if (fileUrl) {
            fileUrl = resolveBridgeThemeUrl(fileUrl);
        }

        let actualTheme = {};
        let themeDownloadPromise = null;

        // Запускаем фоновое скачивание оригинального .fptheme (без блокировки показа окна)
        if (fileUrl) {
            themeDownloadPromise = (async () => {
                try {
                    const resolvedFileUrl = resolveBridgeThemeUrl(fileUrl);
                    const res = await fetch(resolvedFileUrl, { cache: 'no-cache' });
                    if (res.ok) {
                        const downloaded = await res.json();
                        actualTheme = downloaded;
                        console.log('[Foxen Bridge] Успешно скачан оригинальный .fptheme с cdn:', downloaded);

                        const dColors = downloaded.colors || {};
                        if (downloaded.bgColor1 || dColors.bgColor1) colorBg1 = downloaded.bgColor1 || dColors.bgColor1;
                        if (downloaded.bgColor2 || dColors.bgColor2) colorBg2 = downloaded.bgColor2 || dColors.bgColor2;
                        if (downloaded.containerBgColor || dColors.containerBgColor) colorContainer = downloaded.containerBgColor || dColors.containerBgColor;
                        if (downloaded.textColor || dColors.textColor) colorText = downloaded.textColor || dColors.textColor;
                        if (downloaded.linkColor || dColors.linkColor) colorLink = downloaded.linkColor || dColors.linkColor;

                        if (downloaded.bgImage) {
                            realBgImage = resolveBridgeThemeUrl(downloaded.bgImage);
                        }

                        // Обновляем палитру в уже открытом окне, если цвета уточнились
                        const m = document.getElementById('foxen-theme-install-modal');
                        if (m) {
                            const c1 = m.querySelector('#modal-theme-color-bg1');
                            const c2 = m.querySelector('#modal-theme-color-container');
                            const c3 = m.querySelector('#modal-theme-color-link');
                            const c4 = m.querySelector('#modal-theme-color-text');
                            if (c1) { c1.style.background = colorBg1; c1.nextElementSibling.textContent = colorBg1; }
                            if (c2) { c2.style.background = colorContainer; c2.nextElementSibling.textContent = colorContainer; }
                            if (c3) { c3.style.background = colorLink; c3.nextElementSibling.textContent = colorLink; }
                            if (c4) { c4.style.background = colorText; c4.nextElementSibling.textContent = colorText; }
                        }
                    }
                } catch (err) {
                    console.warn('[Foxen Bridge] Ошибка фонового скачивания .fptheme:', err);
                }
            })();
        }

        const modal = document.createElement('div');
        modal.id = 'foxen-theme-install-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #ffffff;
            box-sizing: border-box;
            padding: 16px;
        `;

        modal.innerHTML = `
            <div class="foxen-modal-content" style="
                background: linear-gradient(180deg, #181a22 0%, #0f1015 100%);
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 22px;
                padding: 26px;
                max-width: 520px;
                width: 95%;
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05);
                text-align: center;
                box-sizing: border-box;
                position: relative;
            ">
                <!-- Preview Banner Frame -->
                <div style="width: 100%; height: 180px; border-radius: 14px; overflow: hidden; margin-bottom: 20px; border: 1px solid rgba(255, 255, 255, 0.14); position: relative; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6); background: #0a0b0e;">
                    ${bannerUrl ? `
                        <img src="${escapeHtml(bannerUrl)}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
                    ` : ''}
                    <div style="display: ${bannerUrl ? 'none' : 'flex'}; position: absolute; inset: 0; background: linear-gradient(135deg, ${colorBg1}, ${colorBg2}); align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 52px; color: ${colorLink}; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">palette</span>
                    </div>
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15, 16, 21, 0.85) 0%, transparent 60%); pointer-events: none;"></div>
                </div>

                <!-- Title & Descriptions -->
                <h3 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 10px 0; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                    Вы хотите установить тему «${escapeHtml(finalName)}»?
                </h3>

                ${themeDesc ? `
                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 13.5px; color: #cbd5e1; line-height: 1.5; font-style: italic;">
                        «${escapeHtml(themeDesc)}»
                    </div>
                ` : ''}

                <p style="font-size: 13.5px; color: #e2e8f0; margin: 0 0 20px 0; line-height: 1.6;">
                    При нажатии на «Подтвердить» будут применены обои, эффекты стекломорфизма и прозрачность блоков FunPay, а параметры темы мгновенно синхронизируются во всех активных вкладках Foxen.
                </p>

                <!-- Color Swatches Palette -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 12px 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-around;">
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.04em;">ФОН</div>
                        <div id="modal-theme-color-bg1" style="width: 24px; height: 24px; border-radius: 50%; background: ${colorBg1}; border: 2px solid rgba(255,255,255,0.25); margin: 6px auto 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
                        <div style="font-size: 11px; color: #cbd5e1; font-family: monospace;">${colorBg1}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.04em;">БЛОКИ</div>
                        <div id="modal-theme-color-container" style="width: 24px; height: 24px; border-radius: 50%; background: ${colorContainer}; border: 2px solid rgba(255,255,255,0.25); margin: 6px auto 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
                        <div style="font-size: 11px; color: #cbd5e1; font-family: monospace;">${colorContainer}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.04em;">АКЦЕНТ</div>
                        <div id="modal-theme-color-link" style="width: 24px; height: 24px; border-radius: 50%; background: ${colorLink}; border: 2px solid rgba(255,255,255,0.25); margin: 6px auto 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
                        <div style="font-size: 11px; color: #cbd5e1; font-family: monospace;">${colorLink}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.04em;">ТЕКСТ</div>
                        <div id="modal-theme-color-text" style="width: 24px; height: 24px; border-radius: 50%; background: ${colorText}; border: 2px solid rgba(255,255,255,0.25); margin: 6px auto 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
                        <div style="font-size: 11px; color: #cbd5e1; font-family: monospace;">${colorText}</div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-theme-install" type="button" style="flex: 1; padding: 13px; border-radius: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); color: #f1f5f9; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">
                        Отмена
                    </button>
                    <button id="btn-confirm-theme-install" type="button" style="flex: 1.2; padding: 13px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: #ffffff; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 18px rgba(37,99,235,0.45); transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 19px; color: inherit;">check</span>
                        Подтвердить
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-cancel-theme-install').onclick = () => modal.remove();

        modal.querySelector('#btn-confirm-theme-install').onclick = async () => {
            const btn = modal.querySelector('#btn-confirm-theme-install');
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 19px;">sync</span> Установка...`;

            try {
                // Если скачивание темы еще идет, подождем его до 2 секунд
                if (themeDownloadPromise) {
                    try { await Promise.race([themeDownloadPromise, new Promise(r => setTimeout(r, 2000))]); } catch(_) {}
                }

                // Подготавливаем объект темы и передаём напрямую в стандартный модуль импорта тем Foxen (theme.js)
                const themeToImport = {
                    ...actualTheme,
                    name: finalName,
                    title: finalName,
                    bgColor1: colorBg1,
                    bgColor2: colorBg2,
                    containerBgColor: colorContainer,
                    textColor: colorText,
                    linkColor: colorLink,
                    enableGlassmorphism: true,
                    containerBgOpacity: actualTheme.containerBgOpacity !== undefined ? actualTheme.containerBgOpacity : 0.75,
                    glassmorphismBlur: actualTheme.glassmorphismBlur !== undefined ? actualTheme.glassmorphismBlur : 14,
                    borderRadius: actualTheme.borderRadius !== undefined ? actualTheme.borderRadius : 10
                };

                if (realBgImage) {
                    themeToImport.bgImage = realBgImage;
                }

                if (typeof window.foxenImportTheme === 'function') {
                    await window.foxenImportTheme(themeToImport);
                } else if (typeof window.foxenImportThemeObject === 'function') {
                    await window.foxenImportThemeObject(themeToImport);
                } else if (typeof importThemeObject === 'function') {
                    await importThemeObject(themeToImport);
                } else {
                    window.postMessage({ source: 'foxen-bridge', action: 'FOXEN_EXEC_THEME_IMPORT', theme: themeToImport }, '*');
                }

                modal.remove();

                window.postMessage({
                    source: 'foxen-extension',
                    action: 'FOXEN_THEME_INSTALLED_SUCCESS',
                    themeName: finalName
                }, '*');

                showBridgeNotification(`Тема «${finalName}» успешно установлена!`);
            } catch (err) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 19px;">check</span> Подтвердить`;
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
            background: var(--fxn-scrim, rgba(0, 0, 0, 0.7));
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--fxn-font-sans, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif);
            color: var(--fxn-text-main, #ffffff);
        `;

        modal.innerHTML = `
            <div class="foxen-modal-content" style="background: var(--fxn-content-color, #121316); backdrop-filter: blur(var(--fxn-glass-blur, 16px)) saturate(160%); -webkit-backdrop-filter: blur(var(--fxn-glass-blur, 16px)) saturate(160%); border: 1px solid var(--fxn-border-color, rgba(255, 255, 255, 0.08)); border-radius: var(--fxn-radius-lg, 18px); padding: 28px; max-width: 460px; width: 90%; box-shadow: var(--fxn-shadow, 0 25px 60px rgba(0,0,0,0.7)); text-align: center;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--fxn-card-color, rgba(255, 255, 255, 0.05)); border: 1px solid var(--fxn-card-border, rgba(255, 255, 255, 0.1)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-symbols-outlined" style="font-size: 24px; color: var(--fxn-text-main, #ffffff);">description</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 600; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--fxn-text-main, #ffffff);">Добавить шаблоны в Foxen?</h3>
                <p style="font-size: 0.88rem; color: var(--fxn-text-desc, rgba(255,255,255,0.6)); margin-bottom: 16px; line-height: 1.5;">Вы собираетесь добавить набор шаблонов ответов <b style="color: var(--fxn-text-main, #ffffff);">«${escapeHtml(name)}»</b> (${templatesCount} шт.) в расширение Foxen.</p>

                <div style="background: var(--fxn-card-color, rgba(255,255,255,0.03)); border: 1px solid var(--fxn-card-border, rgba(255,255,255,0.07)); border-radius: var(--fxn-radius-md, 12px); padding: 12px; margin-bottom: 24px; text-align: left; max-height: 140px; overflow-y: auto;">
                    ${Array.isArray(presetData.templates) ? presetData.templates.map(t => `
                        <div style="font-size: 0.82rem; padding: 5px 0; border-bottom: 1px solid var(--fxn-divider-color, rgba(255,255,255,0.05)); color: var(--fxn-text-main, #cbd5e1); display: flex; align-items: center; gap: 8px;">
                            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${t.color || 'var(--fxn-accent, #ffffff)'}; display: inline-block; flex-shrink: 0;"></span>
                            <b style="color: var(--fxn-text-main, #ffffff);">${escapeHtml(t.label)}:</b> <span style="color: var(--fxn-text-desc, #94a3b8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(t.text)}</span>
                        </div>
                    `).join('') : ''}
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-tpl-install" style="flex: 1; padding: 11px; border-radius: var(--fxn-radius-md, 12px); background: var(--fxn-card-color, rgba(255,255,255,0.05)); border: 1px solid var(--fxn-card-border, rgba(255,255,255,0.1)); color: var(--fxn-text-main, #ffffff); font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);">Отмена</button>
                    <button id="btn-confirm-tpl-install" style="flex: 1; padding: 11px; border-radius: var(--fxn-radius-md, 12px); background: var(--fxn-text-main, #ffffff); border: none; color: var(--fxn-bg-color, #0a0a0a); font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: inherit;">add_circle</span>
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
            background: var(--fxn-scrim, rgba(0, 0, 0, 0.7));
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--fxn-font-sans, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif);
            color: var(--fxn-text-main, #ffffff);
        `;

        modal.innerHTML = `
            <div class="foxen-modal-content" style="background: var(--fxn-content-color, #121316); backdrop-filter: blur(var(--fxn-glass-blur, 16px)) saturate(160%); -webkit-backdrop-filter: blur(var(--fxn-glass-blur, 16px)) saturate(160%); border: 1px solid var(--fxn-border-color, rgba(255, 255, 255, 0.08)); border-radius: var(--fxn-radius-lg, 18px); padding: 28px; max-width: 480px; width: 90%; box-shadow: var(--fxn-shadow, 0 25px 60px rgba(0,0,0,0.7)); text-align: center;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--fxn-card-color, rgba(255, 255, 255, 0.05)); border: 1px solid var(--fxn-card-border, rgba(255, 255, 255, 0.1)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <span class="material-symbols-outlined" style="font-size: 24px; color: var(--fxn-text-main, #ffffff);">smart_toy</span>
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 600; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--fxn-text-main, #ffffff);">Применить тексты авто-ответов?</h3>
                <p style="font-size: 0.88rem; color: var(--fxn-text-desc, rgba(255,255,255,0.6)); margin-bottom: 14px; line-height: 1.5;">Вы собираетесь применить заготовленные тексты авто-ответов <b style="color: var(--fxn-text-main, #ffffff);">«${escapeHtml(name)}»</b>.</p>

                <div style="background: var(--fxn-card-color, rgba(255,255,255,0.03)); border: 1px solid var(--fxn-card-border, rgba(255,255,255,0.08)); border-radius: var(--fxn-radius-md, 12px); padding: 12px 14px; font-size: 0.82rem; color: var(--fxn-text-desc, rgba(255,255,255,0.7)); text-align: left; margin-bottom: 22px; line-height: 1.45;">
                    ℹ️ <b>Обратите внимание:</b> Применяются только заготовленные тексты сообщений (приветствие, новый заказ, подтверждение, отзывы). Триггеры и правила включения настраиваются индивидуально в расширении.
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="btn-cancel-reply-install" style="flex: 1; padding: 11px; border-radius: var(--fxn-radius-md, 12px); background: var(--fxn-card-color, rgba(255,255,255,0.05)); border: 1px solid var(--fxn-card-border, rgba(255,255,255,0.1)); color: var(--fxn-text-main, #ffffff); font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);">Отмена</button>
                    <button id="btn-confirm-reply-install" style="flex: 1; padding: 11px; border-radius: var(--fxn-radius-md, 12px); background: var(--fxn-text-main, #ffffff); border: none; color: var(--fxn-bg-color, #0a0a0a); font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: inherit;">done_all</span>
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
            background: var(--fxn-content-color, #121316);
            color: var(--fxn-text-main, #ffffff);
            border: 1px solid var(--fxn-border-color, rgba(255,255,255,0.1));
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 12px 20px; border-radius: var(--fxn-radius-full, 9999px);
            font-weight: 500; font-size: 0.88rem;
            box-shadow: var(--fxn-shadow, 0 10px 30px rgba(0,0,0,0.5));
            z-index: 1000000;
            font-family: var(--fxn-font-sans, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif);
            animation: fxn-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // Слушатель для показа модалки установки темы прямо на FunPay
    const runtimeApi = typeof browser !== 'undefined' && browser.runtime ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
    if (runtimeApi && runtimeApi.onMessage) {
        runtimeApi.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg && msg.action === 'FOXEN_SHOW_THEME_INSTALL_MODAL') {
                handleThemeInstallRequest(msg.theme, msg.themeName || msg.theme?.name || 'Кастомная тема');
                if (typeof sendResponse === 'function') sendResponse({ ok: true });
            }
        });
    }

    // Проверка отложенного запроса установки темы при открытии/загрузке FunPay
    if (window.location.hostname.includes('funpay.com')) {
        const api = typeof browser !== 'undefined' ? browser : chrome;
        if (api && api.storage && api.storage.local) {
            let handled = false;
            const handlePending = (res) => {
                if (handled) return;
                if (res && res.pendingThemeInstallModal) {
                    handled = true;
                    const { theme, themeName, timestamp } = res.pendingThemeInstallModal;
                    if (timestamp && (Date.now() - timestamp < 120000)) {
                        api.storage.local.remove('pendingThemeInstallModal');
                        setTimeout(() => {
                            handleThemeInstallRequest(theme, themeName);
                        }, 500);
                    } else {
                        api.storage.local.remove('pendingThemeInstallModal');
                    }
                }
            };

            try {
                const getResult = api.storage.local.get('pendingThemeInstallModal', handlePending);
                if (getResult && typeof getResult.then === 'function') {
                    getResult.then(handlePending).catch(console.error);
                }
            } catch (err) {
                console.error('[Foxen Bridge] Failed checking pendingThemeInstallModal:', err);
            }
        }
    }

})();
