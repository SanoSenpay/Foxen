// content/ui/settings_loader.js

let foxenAccounts = [];
let aiModeActive = false;

async function renderTemplateSettings() {
    const container = document.getElementById('template-settings-container');
    if (!container) return;
    container.innerHTML = '';

    const createItem = (key, config, isCustom = false) => {
        const item = createElement('div', { class: 'template-item' });
        if (!config.enabled) item.classList.add('disabled-in-settings');
        
        const colorPickerHtml = `<input type="color" class="template-color-picker" value="${config.color || '#C026D3'}" data-key="${key}" data-custom="${isCustom}">`;
        const deleteBtnHtml = isCustom ? `<button class="delete-custom-template-btn" data-id="${config.id}" title="Удалить"><span class="material-symbols-rounded">delete</span></button>` : '';

        // === ИЗМЕНЕНИЕ ЗДЕСЬ ===
        item.innerHTML = `
            <div class="template-item-header">
                <input type="checkbox" class="template-toggle" data-key="${key}" data-custom="${isCustom}" ${config.enabled ? 'checked' : ''}>
                ${colorPickerHtml}
                <span class="template-label" contenteditable="true" data-key="${key}" data-custom="${isCustom}">${config.label}</span>
                ${deleteBtnHtml}
            </div>
            <div class="textarea-with-controls">
                <textarea class="template-input template-text" data-key="${key}" data-custom="${isCustom}" placeholder="Текст шаблона...">${config.text}</textarea>
                <button class="btn add-image-btn fxn-img-btn" title="Добавить изображение"><span class="material-symbols-rounded">image</span></button>
            </div>
        `;
        // === КОНЕЦ ИЗМЕНЕНИЯ ===
        container.appendChild(item);

        // restore previously-attached images as chips (separate from text)
        const ta = item.querySelector('textarea.template-text');
        if (ta) {
            // restore send order BEFORE rendering chips so the mini-preview is correct
            if (typeof fxnSetSendOrder === 'function') {
                fxnSetSendOrder(ta, config.sendOrder === 'image_first' ? 'image_first' : 'text_first');
            }
            if (Array.isArray(config.images) && config.images.length) {
                const arr = config.images.map(d => ({ id: Math.random().toString(36).slice(2, 8), dataUrl: d }));
                __fptAttachments.set(ta, arr);
                ta.dataset.fxnImages = JSON.stringify(config.images);
                if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(ta);
            }
        }
    };

    for (const key in templateSettings.standard) {
        createItem(key, templateSettings.standard[key], false);
    }
    
    templateSettings.custom.forEach(config => {
        createItem(config.id, config, true);
    });
}

async function setupTemplateSettingsHandlers() {
    await loadTemplateSettings();
    await renderTemplateSettings();

    const container = document.getElementById('template-settings-container');
    const templatesPage = document.querySelector('.foxen-page-content[data-page="templates"]');
    if (!container || !templatesPage) return;
    
    const posRadio = templatesPage.querySelector(`input[name="templatePos"][value="${templateSettings.buttonPosition}"]`);
    if(posRadio) posRadio.checked = true;

    // Popover hint visible only when the «popover» layout is selected.
    const popoverHint = document.getElementById('fxn-popover-hint');
    const isSidebarPos = () => templateSettings.buttonPosition === 'sidebar_top' || templateSettings.buttonPosition === 'sidebar_bottom';
    const syncPopoverHint = () => {
        if (popoverHint) popoverHint.style.display = (templateSettings.buttonPosition === 'popover') ? 'block' : 'none';
    };
    // Sidebar-only settings block appears (not just dims) when a sidebar position is chosen.
    const sidebarExtra = document.getElementById('fxn-sidebar-extra');
    const syncSidebarExtra = () => {
        if (sidebarExtra) sidebarExtra.style.display = isSidebarPos() ? '' : 'none';
    };
    syncPopoverHint();
    syncSidebarExtra();

    // Master enable toggle - hides the whole config block when off.
    const enabledChk = document.getElementById('templatesEnabled');
    const configBlock = document.getElementById('fxn-templates-config');
    const syncEnabled = () => {
        if (configBlock) configBlock.style.display = (templateSettings.enabled === false) ? 'none' : '';
    };
    if (enabledChk) {
        enabledChk.checked = templateSettings.enabled !== false;
        enabledChk.onchange = async (e) => {
            templateSettings.enabled = e.target.checked;
            syncEnabled();
            await saveTemplateSettings();
            await addChatTemplateButtons();
        };
    }
    syncEnabled();

    document.getElementById('sendTemplatesImmediately').checked = templateSettings.sendTemplatesImmediately;

    // 3.0: debounce to stop per-keystroke lag. Previously every character typed triggered a
    // full settings save AND a full rebuild of all chat template buttons in the DOM, which made
    // editing names/colors extremely laggy. Now we update the in-memory model instantly, but
    // defer the expensive save + button rebuild until typing pauses.
    let saveDebounce = null;
    const scheduleSave = () => {
        if (saveDebounce) clearTimeout(saveDebounce);
        saveDebounce = setTimeout(async () => {
            await saveTemplateSettings();
            await addChatTemplateButtons();
        }, 400);
    };

    const handleInput = async (e) => {
        const target = e.target;
        const isCustom = target.dataset.custom === 'true';
        const key = target.dataset.key;

        if (isCustom) {
            const template = templateSettings.custom.find(t => t.id === key);
            if (!template) return;
            if (target.classList.contains('template-toggle')) template.enabled = target.checked;
            if (target.classList.contains('template-color-picker')) template.color = target.value;
            if (target.classList.contains('template-label')) template.label = target.textContent;
            if (target.classList.contains('template-text')) {
                template.text = target.value;
                if (target.dataset.fxnImages) { try { template.images = JSON.parse(target.dataset.fxnImages); } catch(_){} }
            }
            // send order travels on the textarea dataset (set by the chip picker)
            const ta = target.classList.contains('template-text') ? target
                     : target.closest('.template-item')?.querySelector('textarea.template-text');
            if (ta && ta.dataset.fxnSendOrder) template.sendOrder = ta.dataset.fxnSendOrder;
        } else {
            const template = templateSettings.standard[key];
            if (!template) return;
            if (target.classList.contains('template-toggle')) template.enabled = target.checked;
            if (target.classList.contains('template-color-picker')) template.color = target.value;
            if (target.classList.contains('template-label')) template.label = target.textContent;
            if (target.classList.contains('template-text')) {
                template.text = target.value;
                if (target.dataset.fxnImages) { try { template.images = JSON.parse(target.dataset.fxnImages); } catch(_){} }
            }
            const ta = target.classList.contains('template-text') ? target
                     : target.closest('.template-item')?.querySelector('textarea.template-text');
            if (ta && ta.dataset.fxnSendOrder) template.sendOrder = ta.dataset.fxnSendOrder;
        }

        if (target.classList.contains('template-toggle')) {
            target.closest('.template-item').classList.toggle('disabled-in-settings', !target.checked);
            // toggles are cheap & discrete - save immediately
            await saveTemplateSettings();
            await addChatTemplateButtons();
            return;
        }

        scheduleSave();
    };

    // Guard against attaching listeners twice (this function is called repeatedly).
    if (!container.dataset.fxnHandlersAttached) {
        container.dataset.fxnHandlersAttached = '1';
        container.addEventListener('input', handleInput);
        container.addEventListener('change', handleInput);
        container.addEventListener('fxn-attachment-changed', handleInput);
        container.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('template-label')) handleInput(e);
        });

        container.addEventListener('click', async (e) => {
            const delBtn = e.target.closest('.delete-custom-template-btn');
            if (delBtn) {
                const id = delBtn.dataset.id;
                templateSettings.custom = templateSettings.custom.filter(t => t.id !== id);
                await saveTemplateSettings();
                await renderTemplateSettings();
                await addChatTemplateButtons();
                return;
            }
            const imgBtn = e.target.closest('.add-image-btn');
            if (imgBtn) {
                // find the textarea in the same template row (robust to icon-span markup)
                const row = imgBtn.closest('.template-item') || imgBtn.parentElement;
                const textarea = row && row.querySelector('textarea.template-text, textarea');
                if (textarea) handleImageAddClick(textarea);
            }
        });
    } // end attach-once guard

    document.getElementById('addCustomTemplateBtn').onclick = async () => {
        templateSettings.custom.push({
            id: Date.now().toString(),
            label: 'Новый шаблон',
            text: '',
            color: '#A21CAF',
            enabled: true
        });
        await saveTemplateSettings();
        await renderTemplateSettings(); // Re-render to add the new item (delegation handles events)
    };

    templatesPage.querySelectorAll('input[name="templatePos"]').forEach(radio => {
        radio.onchange = async (e) => {
            templateSettings.buttonPosition = e.target.value;
            syncPopoverHint();
            syncSidebarExtra();
            await saveTemplateSettings();
            await addChatTemplateButtons();
        };
    });

    document.getElementById('sendTemplatesImmediately').onchange = async (e) => {
        templateSettings.sendTemplatesImmediately = e.target.checked;
        await saveTemplateSettings();
    };

    // ── Button appearance ─────────────────────────────────────────────────────
    const appx = templatesPage.querySelector('.fxn-appx');
    const dispRef = () => (templateSettings.display = templateSettings.display || { ...DEFAULT_TEMPLATE_DISPLAY });

    const writePreviewAttrs = () => {
        const preview = document.getElementById('fxn-appearance-preview');
        if (!preview) return;
        const disp = dispRef();
        preview.setAttribute('data-fxn-shape', disp.shape);
        preview.setAttribute('data-fxn-size', disp.size);
        preview.setAttribute('data-fxn-fill', disp.fill);
        preview.setAttribute('data-fxn-align', disp.align);
        preview.setAttribute('data-fxn-fullwidth', disp.fullWidth ? '1' : '0');
        preview.setAttribute('data-fxn-uppercase', disp.uppercase ? '1' : '0');
        preview.setAttribute('data-fxn-compact', disp.compact ? '1' : '0');
    };

    const syncAppxUI = () => {
        if (!appx) return;
        const disp = dispRef();
        appx.querySelectorAll('.fxn-seg').forEach(seg => {
            const opt = seg.dataset.fxnOpt;
            seg.querySelectorAll('button').forEach(b =>
                b.classList.toggle('active', b.dataset.val === String(disp[opt])));
        });
        appx.querySelectorAll('.fxn-chip-toggle').forEach(chip =>
            chip.classList.toggle('active', !!disp[chip.dataset.fxnToggle]));
        // Alignment only matters when buttons span the full width - otherwise they're
        // content-sized and alignment is invisible. Hide the control unless fullWidth.
        const alignBlock = document.getElementById('fxn-align-block');
        if (alignBlock) alignBlock.classList.toggle('fxn-disabled', !disp.fullWidth);
        writePreviewAttrs();
    };

    if (appx && !appx.dataset.fxnBound) {
        appx.dataset.fxnBound = '1';
        const persist = async () => {
            await saveTemplateSettings();
            await addChatTemplateButtons();
        };
        appx.querySelectorAll('.fxn-seg').forEach(seg => {
            const opt = seg.dataset.fxnOpt;
            seg.addEventListener('click', async (e) => {
                const btn = e.target.closest('button[data-val]');
                if (!btn) return;
                dispRef()[opt] = btn.dataset.val;
                syncAppxUI();
                await persist();
            });
        });
        appx.querySelectorAll('.fxn-chip-toggle').forEach(chip => {
            chip.addEventListener('click', async () => {
                const key = chip.dataset.fxnToggle;
                dispRef()[key] = !dispRef()[key];
                syncAppxUI();
                await persist();
            });
        });
    }
    syncAppxUI();
}


async function loadSavedSettings() {
    const settings = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
        'foxenTemplateSettings', 'enableCustomTheme', 'foxenTheme', 'aiModeActive',
        'autoBumpEnabled', 'autoBumpCooldown', 'foxenSmartBumpEnabled', 'foxenCursorFx', 'foxenCustomCursor',
        'foxenPopupPosition', 'foxenPopupSize', 'enableRedesignedHomepage', 'foxenPopupDragged',
        'foxenAccounts', 'showSalesStats', 'showFinanceStats', 'hideBalance', 'viewSellersPromo', 'notificationSound', 'notificationVolume',
        'foxenDiscord',
        'foxenSelectiveBumpEnabled', 'foxenSelectedBumpCategories', 'foxenBumpOnlyAutoDelivery',
        'autoReviewEnabled', 'reviewTemplates', 'greetingEnabled', 'greetingText', 'keywordsEnabled', 'keywords',
        'foxenIdentifierEnabled',
        'foxenBuyerHistory',
        'foxenShowUnconfirmed',
        'foxenAutoRestoreEnabled',
        'foxenAutoDisableEnabled',
        'foxenReviewRequestTemplate'
    ]);
    
    foxenAccounts = settings.foxenAccounts || [];
    renderAccountsList();

    const logoutLink = document.querySelector('.menu-item-logout');
    if(logoutLink && !document.querySelector('.foxen-logout-clean')) {
        const cleanLogoutItem = document.createElement('li');
        cleanLogoutItem.innerHTML = `<a href="#" class="foxen-logout-clean" style="color: #ff6b6b !important;">Выйти (очистить куки)</a>`;
        logoutLink.parentElement.insertAdjacentElement('afterend', cleanLogoutItem);
        cleanLogoutItem.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: 'deleteCookiesAndReload' });
        });
    }

    if (typeof initializePiggyBank === 'function') {
        initializePiggyBank();
    }
    
    const toolsPopup = document.querySelector('.foxen-popup');
    if (settings.foxenPopupDragged && settings.foxenPopupPosition) {
        toolsPopup.style.setProperty('left', settings.foxenPopupPosition.left, 'important');
        toolsPopup.style.setProperty('top', settings.foxenPopupPosition.top, 'important');
        toolsPopup.classList.add('no-transform');
    }
    if (settings.foxenPopupSize) {
        toolsPopup.style.width = settings.foxenPopupSize.width;
        toolsPopup.style.height = settings.foxenPopupSize.height;
    }

    const discordSettings = settings.foxenDiscord || { enabled: false, webhookUrl: '', pingEveryone: false, pingHere: false };
    const discordLogEnabledEl = document.getElementById('discordLogEnabled');
    const discordWebhookUrlEl = document.getElementById('discordWebhookUrl');
    const discordPingEveryoneEl = document.getElementById('discordPingEveryone');
    const discordPingHereEl = document.getElementById('discordPingHere');
    const discordSettingsContainer = document.getElementById('discordSettingsContainer');

    if (discordLogEnabledEl) discordLogEnabledEl.checked = discordSettings.enabled;
    if (discordWebhookUrlEl) discordWebhookUrlEl.value = discordSettings.webhookUrl;
    if (discordPingEveryoneEl) discordPingEveryoneEl.checked = discordSettings.pingEveryone;
    if (discordPingHereEl) discordPingHereEl.checked = discordSettings.pingHere;

    const toggleDiscordControls = () => {
        if (!discordLogEnabledEl) return;
        const enabled = discordLogEnabledEl.checked;
        if (discordSettingsContainer) discordSettingsContainer.style.display = enabled ? 'block' : 'none';
        if (discordPingEveryoneEl) discordPingEveryoneEl.disabled = !enabled;
        if (discordPingHereEl) discordPingHereEl.disabled = !enabled;
    };

    if (discordLogEnabledEl) {
        discordLogEnabledEl.addEventListener('change', toggleDiscordControls);
        toggleDiscordControls();
    }
    
    if (typeof initializeAutoReviewUI === 'function') {
        initializeAutoReviewUI(settings);
    }

    await setupTemplateSettingsHandlers();

    aiModeActive = settings.aiModeActive === true;
    const aiButton = document.getElementById('aiModeToggleBtn');
    if(aiButton) {
        aiButton.classList.toggle('active', aiModeActive);
        aiButton.title = aiModeActive ? 'AI Режим АКТИВЕН (Enter для генерации/отправки)' : 'AI Режим (Enter для генерации/отправки)';
    }

    const enableCustomThemeCheckboxEl = document.getElementById('enableCustomThemeCheckbox');
    const isThemeEnabled = settings.enableCustomTheme !== false;
    if(enableCustomThemeCheckboxEl) {
        enableCustomThemeCheckboxEl.checked = isThemeEnabled;
        toggleThemeControls(!isThemeEnabled);
    }
    updateThemePreview();

    document.getElementById('autoBumpEnabled').checked = settings.autoBumpEnabled === true;
    document.getElementById('autoBumpCooldown').value = settings.autoBumpCooldown || 245;
    document.getElementById('selectiveBumpEnabled').checked = settings.foxenSelectiveBumpEnabled === true;
    document.getElementById('bumpOnlyAutoDelivery').checked = settings.foxenBumpOnlyAutoDelivery === true;
    { const sb = document.getElementById('foxenSmartBumpEnabled'); if (sb) sb.checked = settings.foxenSmartBumpEnabled === true; }

    document.getElementById('enableRedesignedHomepage').checked = settings.enableRedesignedHomepage !== false;

    const enableCustomProfileCheckboxEl = document.getElementById('enableCustomProfileCheckbox');
    if (enableCustomProfileCheckboxEl) {
        const dfData = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
        const disabled = Array.isArray(dfData.foxenDisabledFeatures) ? dfData.foxenDisabledFeatures : [];
        enableCustomProfileCheckboxEl.checked = !disabled.includes('profile_descriptions');

        enableCustomProfileCheckboxEl.addEventListener('change', async (e) => {
            const checked = e.target.checked;
            const currentData = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
            let currentDisabled = Array.isArray(currentData.foxenDisabledFeatures) ? currentData.foxenDisabledFeatures : [];
            if (checked) {
                currentDisabled = currentDisabled.filter(id => id !== 'profile_descriptions');
            } else {
                if (!currentDisabled.includes('profile_descriptions')) {
                    currentDisabled.push('profile_descriptions');
                }
            }
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenDisabledFeatures: currentDisabled });
        });

        const storageApi = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);
        if (storageApi && storageApi.onChanged) {
            storageApi.onChanged.addListener((changes, area) => {
                if (area !== 'local' || !changes.foxenDisabledFeatures) return;
                const newDisabled = Array.isArray(changes.foxenDisabledFeatures.newValue)
                    ? changes.foxenDisabledFeatures.newValue : [];
                enableCustomProfileCheckboxEl.checked = !newDisabled.includes('profile_descriptions');
            });
        }
    }

    const cursorFxSettings = settings.foxenCursorFx || {};
    const cursorFxDefaults = { enabled: false, type: 'sparkle', color1: '#FF6B6B', color2: '#C026D3', rgb: false, count: 50 };
    const finalCursorFxSettings = { ...cursorFxDefaults, ...cursorFxSettings };

    document.getElementById('cursorFxEnabled').checked = finalCursorFxSettings.enabled;
    document.getElementById('cursorFxType').value = finalCursorFxSettings.type;
    document.getElementById('cursorFxColor1').value = finalCursorFxSettings.color1;
    document.getElementById('cursorFxColor2').value = finalCursorFxSettings.color2;
    document.getElementById('cursorFxRgb').checked = finalCursorFxSettings.rgb;
    document.getElementById('cursorFxCount').value = finalCursorFxSettings.count;
    document.getElementById('cursorFxCountValue').textContent = `${finalCursorFxSettings.count}%`;
    cursorFx.updateConfig(finalCursorFxSettings);
    
    const customCursorSettings = settings.foxenCustomCursor || {};
    const customCursorDefaults = { enabled: false, image: null, size: 32, opacity: 100, hideSystem: true };
    const finalCustomCursorSettings = { ...customCursorDefaults, ...customCursorSettings };

    document.getElementById('customCursorEnabled').checked = finalCustomCursorSettings.enabled;
    const controlsDiv = document.getElementById('customCursorControls');
    if (controlsDiv) controlsDiv.style.display = finalCustomCursorSettings.enabled ? 'block' : 'none';
    
    document.getElementById('hideSystemCursor').checked = finalCustomCursorSettings.hideSystem;
    
    document.getElementById('customCursorSize').value = finalCustomCursorSettings.size;
    document.getElementById('customCursorSizeValue').textContent = `${finalCustomCursorSettings.size}px`;
    document.getElementById('customCursorOpacity').value = finalCustomCursorSettings.opacity;
    document.getElementById('customCursorOpacityValue').textContent = `${finalCustomCursorSettings.opacity}%`;
    
    const preview = document.getElementById('cursor-image-preview');
    if (finalCustomCursorSettings.image) {
        preview.style.backgroundImage = `url(${finalCustomCursorSettings.image})`;
        preview.textContent = '';
    } else {
        preview.style.backgroundImage = 'none';
        preview.textContent = 'Нет';
    }
    cursorFx.updateCustomCursor(finalCustomCursorSettings);

    document.getElementById('showSalesStatsCheckbox').checked = settings.showSalesStats !== false;
    { const _fs=document.getElementById('showFinanceStatsCheckbox'); if(_fs) _fs.checked = settings.showFinanceStats !== false; }
    document.getElementById('hideBalanceCheckbox').checked = settings.hideBalance === true;
    document.getElementById('viewSellersPromoCheckbox').checked = settings.viewSellersPromo !== false;

    // 2.8: FPT identifier toggle (default: enabled)
    const identifierEl = document.getElementById('fxnIdentifierEnabled');
    if (identifierEl) {
        identifierEl.checked = settings.foxenIdentifierEnabled !== false;
    }

    // Telemetry & Error Tracker settings restore & event handlers
    const telemetryEnabledEl = document.getElementById('fxnTelemetryEnabled');
    if (telemetryEnabledEl) {
        telemetryEnabledEl.checked = settings.fpt_telemetry_enabled !== false;
        telemetryEnabledEl.addEventListener('change', () => {
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ fpt_telemetry_enabled: telemetryEnabledEl.checked });
        });
    }

    // 2.9: New settings toggles

    const buyerHistoryEl = document.getElementById('foxenBuyerHistory');
    if (buyerHistoryEl) buyerHistoryEl.checked = settings.foxenBuyerHistory !== false;

    const unconfirmedEl = document.getElementById('foxenShowUnconfirmed');
    if (unconfirmedEl) unconfirmedEl.checked = settings.foxenShowUnconfirmed !== false;

    // 3.0: Auto-restore/disable
    const autoRestoreEl = document.getElementById('fpAutoRestoreEnabled');
    if (autoRestoreEl) autoRestoreEl.checked = settings.foxenAutoRestoreEnabled === true;

    const autoDisableEl = document.getElementById('fpAutoDisableEnabled');
    if (autoDisableEl) autoDisableEl.checked = settings.foxenAutoDisableEnabled === true;

    const reviewTplEl = document.getElementById('reviewRequestTemplate');
    if (reviewTplEl) reviewTplEl.value = settings.foxenReviewRequestTemplate || '';

    // 3.0: Extended autoresponder
    chrome.storage.local.get('foxenAutoReplies', ({ foxenAutoReplies: ar = {} }) => {
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        const setVal   = (id, val) => { const el = document.getElementById(id); if (el) el.value  = val || ''; };
        setCheck('newOrderReplyEnabled',     ar.newOrderReplyEnabled);
        setCheck('orderConfirmReplyEnabled', ar.orderConfirmReplyEnabled);
        setCheck('typingDelay',              ar.typingDelay);
        setCheck('onlyNewChats',             ar.onlyNewChats);
        setCheck('ignoreSystemMessages',     ar.ignoreSystemMessages);
        setVal('newOrderReplyText',          ar.newOrderReplyText);
        setVal('orderConfirmReplyText',      ar.orderConfirmReplyText);
        setVal('greetingCooldownDays',       ar.greetingCooldownDays ?? 0);

        // restore image attachment chips (separate from text)
        const restoreImgs = (id, arr, order) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (order && typeof fxnSetSendOrder === 'function') fxnSetSendOrder(el, order);
            if (!Array.isArray(arr) || !arr.length) return;
            const list = arr.map(d => ({ id: Math.random().toString(36).slice(2, 8), dataUrl: d }));
            if (typeof __fptAttachments !== 'undefined') __fptAttachments.set(el, list);
            el.dataset.fxnImages = JSON.stringify(arr);
            if (typeof fxnRenderAttachments === 'function') fxnRenderAttachments(el);
        };
        restoreImgs('greetingText', ar.greetingImages, ar.greetingSendOrder);
        restoreImgs('newOrderReplyText', ar.newOrderReplyImages, ar.newOrderReplySendOrder);
        restoreImgs('orderConfirmReplyText', ar.orderConfirmReplyImages, ar.orderConfirmReplySendOrder);
        if (ar.reviewTemplateImages) {
            restoreImgs('fxn-review-5', ar.reviewTemplateImages['5']);
            restoreImgs('fxn-review-4', ar.reviewTemplateImages['4']);
            restoreImgs('fxn-review-3', ar.reviewTemplateImages['3']);
            restoreImgs('fxn-review-2', ar.reviewTemplateImages['2']);
            restoreImgs('fxn-review-1', ar.reviewTemplateImages['1']);
        }
    });

    // Review request template
    const rrTemplateEl = document.getElementById('fp-review-request-template');
    if (rrTemplateEl && settings.foxenAutoReplies?.reviewRequestTemplate !== undefined) {
        rrTemplateEl.value = settings.foxenAutoReplies.reviewRequestTemplate;
    }

    const savedSound = settings.notificationSound || 'default';
    const soundRadio = document.querySelector(`input[name="notificationSound"][value="${savedSound}"]`);
    if (soundRadio) {
        soundRadio.checked = true;
    }

    // 3.0: notification volume slider + preview
    const volSlider = document.getElementById('notificationVolume');
    const volValue = document.getElementById('notificationVolumeValue');
    if (volSlider) {
        const vol = (typeof settings.notificationVolume === 'number') ? settings.notificationVolume : 1;
        volSlider.value = Math.round(vol * 100);
        if (volValue) volValue.textContent = `${Math.round(vol * 100)}%`;
        if (!volSlider.dataset.fxnBound) {
            volSlider.dataset.fxnBound = '1';
            volSlider.addEventListener('input', () => {
                if (volValue) volValue.textContent = `${volSlider.value}%`;
            });
        }
    }
    const previewBtn = document.getElementById('previewNotificationBtn');
    if (previewBtn && !previewBtn.dataset.fxnBound) {
        previewBtn.dataset.fxnBound = '1';
        previewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const sel = document.querySelector('input[name="notificationSound"]:checked');
            const vol = volSlider ? (parseInt(volSlider.value, 10) / 100) : 1;
            if (typeof previewNotificationSound === 'function') {
                previewNotificationSound(sel ? sel.value : 'default', vol);
            }
        });
    }
}