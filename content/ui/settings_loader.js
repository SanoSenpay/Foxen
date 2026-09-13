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
                <span class="template-label" contenteditable="true" data-key="${key}" data-custom="${isCustom}"></span>
                ${deleteBtnHtml}
            </div>
            <div class="textarea-with-controls">
                <textarea class="template-input template-text" data-key="${key}" data-custom="${isCustom}" placeholder="Текст шаблона..."></textarea>
                <button class="btn add-image-btn fxn-img-btn" title="Добавить изображение"><span class="material-symbols-rounded">image</span></button>
            </div>
        `;
        // === КОНЕЦ ИЗМЕНЕНИЯ ===
        container.appendChild(item);

        const lbl = item.querySelector('.template-label');
        if (lbl) lbl.textContent = config.label || '';
        const ta = item.querySelector('textarea.template-text');
        if (ta) ta.value = config.text || '';
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

    const syncTemplatesFromDOM = () => {
        const listContainer = document.getElementById('template-settings-container');
        if (!listContainer) return;
        const items = listContainer.querySelectorAll('.template-item');
        items.forEach(item => {
            const ta = item.querySelector('textarea.template-text');
            if (!ta) return;
            const isCustom = ta.dataset.custom === 'true';
            const key = ta.dataset.key;
            const toggle = item.querySelector('.template-toggle');
            const colorPicker = item.querySelector('.template-color-picker');
            const label = item.querySelector('.template-label');

            let images = [];
            if (ta.dataset.fxnImages) {
                try { images = JSON.parse(ta.dataset.fxnImages) || []; } catch (_) {}
            }
            const sendOrder = ta.dataset.fxnSendOrder === 'image_first' ? 'image_first' : 'text_first';

            if (isCustom) {
                const t = templateSettings.custom.find(x => String(x.id) === String(key));
                if (t) {
                    t.text = ta.value;
                    if (label && label.textContent) t.label = label.textContent.trim();
                    if (colorPicker) t.color = colorPicker.value;
                    if (toggle) t.enabled = toggle.checked;
                    t.images = images;
                    t.sendOrder = sendOrder;
                }
            } else {
                if (templateSettings.standard && templateSettings.standard[key]) {
                    const t = templateSettings.standard[key];
                    t.text = ta.value;
                    if (label && label.textContent) t.label = label.textContent.trim();
                    if (colorPicker) t.color = colorPicker.value;
                    if (toggle) t.enabled = toggle.checked;
                    t.images = images;
                    t.sendOrder = sendOrder;
                }
            }
        });
    };

    const handleInput = async (e) => {
        const target = e.target;
        const isCustom = target.dataset.custom === 'true';
        const key = target.dataset.key;

        if (isCustom) {
            const template = templateSettings.custom.find(t => String(t.id) === String(key));
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
                templateSettings.custom = templateSettings.custom.filter(t => String(t.id) !== String(id));
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

    const addBtn = document.getElementById('addCustomTemplateBtn');
    if (addBtn) {
        addBtn.onclick = async () => {
            syncTemplatesFromDOM();
            templateSettings.custom.push({
                id: Date.now().toString(),
                label: 'Новый шаблон',
                text: '',
                color: '#A21CAF',
                enabled: true
            });
            await saveTemplateSettings();
            await renderTemplateSettings();
        };
    }

    // Экспорт шаблонов в формат .fxnprst
    const exportBtn = document.getElementById('fxn-export-templates-btn');
    if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.dataset.bound = '1';
        exportBtn.onclick = async () => {
            syncTemplatesFromDOM();
            await saveTemplateSettings();

            const standardObj = {};
            for (const k in templateSettings.standard) {
                const s = templateSettings.standard[k];
                standardObj[k] = {
                    key: k,
                    label: s.label || '',
                    text: (typeof s.text === 'string') ? s.text : '',
                    color: s.color || '#C026D3',
                    enabled: s.enabled !== false,
                    images: Array.isArray(s.images) ? s.images : [],
                    sendOrder: s.sendOrder || 'text_first'
                };
            }

            const customList = (templateSettings.custom || []).map(t => ({
                id: String(t.id || Date.now()),
                label: t.label || 'Шаблон',
                text: (typeof t.text === 'string') ? t.text : '',
                color: t.color || '#3B82F6',
                enabled: t.enabled !== false,
                images: Array.isArray(t.images) ? t.images : [],
                sendOrder: t.sendOrder || 'text_first'
            }));

            // В массив templates включаем все шаблоны (и стандартные, и пользовательские) с сохранением сообщений
            const allTemplatesList = [
                ...Object.values(standardObj).map(s => ({ ...s, isStandard: true })),
                ...customList
            ];

            const dataToExport = {
                version: 2,
                exportedAt: new Date().toISOString(),
                type: 'foxen_message_templates',
                standard: standardObj,
                custom: customList,
                templates: allTemplatesList
            };

            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `foxen_templates_${Date.now()}.fxnprst`;
            a.click();
            URL.revokeObjectURL(url);
            if (typeof showNotification === 'function') {
                showNotification('Шаблоны сообщений успешно экспортированы (.fxnprst)!');
            } else {
                alert('Шаблоны сообщений успешно экспортированы (.fxnprst)!');
            }
        };
    }

    // Импорт шаблонов из файлов .fxnprst / .json
    const importBtn = document.getElementById('fxn-import-templates-btn');
    const importFileInput = document.getElementById('fxn-import-templates-file');
    if (importBtn && importFileInput && !importBtn.dataset.bound) {
        importBtn.dataset.bound = '1';
        importBtn.onclick = () => importFileInput.click();
        importFileInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const json = JSON.parse(text);

                let addedCount = 0;
                let updatedStandardCount = 0;

                // 1. Восстанавливаем стандартные шаблоны, если они присутствуют
                if (json.standard && typeof json.standard === 'object') {
                    for (const key in json.standard) {
                        if (templateSettings.standard && templateSettings.standard[key]) {
                            const src = json.standard[key];
                            if (src.label) templateSettings.standard[key].label = src.label;
                            if (typeof src.text === 'string') templateSettings.standard[key].text = src.text;
                            if (src.color) templateSettings.standard[key].color = src.color;
                            if (typeof src.enabled === 'boolean') templateSettings.standard[key].enabled = src.enabled;
                            if (Array.isArray(src.images)) templateSettings.standard[key].images = src.images;
                            if (src.sendOrder) templateSettings.standard[key].sendOrder = src.sendOrder;
                            updatedStandardCount++;
                        }
                    }
                }

                // 2. Извлекаем список пользовательских шаблонов
                let customList = [];
                if (Array.isArray(json.custom)) {
                    customList = json.custom;
                } else if (Array.isArray(json.templates)) {
                    customList = json.templates.filter(t => {
                        const key = t.key || t.id;
                        if ((t.isStandard || (key && key in (templateSettings.standard || {}))) && !json.standard) {
                            if (templateSettings.standard && templateSettings.standard[key]) {
                                if (t.label) templateSettings.standard[key].label = t.label;
                                if (typeof t.text === 'string') templateSettings.standard[key].text = t.text;
                                if (t.color) templateSettings.standard[key].color = t.color;
                                if (typeof t.enabled === 'boolean') templateSettings.standard[key].enabled = t.enabled;
                                if (Array.isArray(t.images)) templateSettings.standard[key].images = t.images;
                                if (t.sendOrder) templateSettings.standard[key].sendOrder = t.sendOrder;
                                updatedStandardCount++;
                                return false;
                            }
                        }
                        return !t.isStandard;
                    });
                } else if (Array.isArray(json)) {
                    customList = json;
                }

                templateSettings.custom = templateSettings.custom || [];
                for (const t of customList) {
                    if (t.text || t.label) {
                        templateSettings.custom.push({
                            id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            label: t.label || 'Шаблон',
                            text: (typeof t.text === 'string') ? t.text : '',
                            color: t.color || '#3B82F6',
                            enabled: t.enabled !== false,
                            images: Array.isArray(t.images) ? t.images : [],
                            sendOrder: t.sendOrder || 'text_first'
                        });
                        addedCount++;
                    }
                }

                if (addedCount === 0 && updatedStandardCount === 0) {
                    alert('В файле не найдено шаблонов сообщений.');
                    return;
                }

                await saveTemplateSettings();
                await renderTemplateSettings();
                await addChatTemplateButtons();

                const total = addedCount + updatedStandardCount;
                if (typeof showNotification === 'function') {
                    showNotification(`Импортировано шаблонов: ${total}!`);
                } else {
                    alert(`Импортировано шаблонов: ${total}!`);
                }
            } catch (err) {
                alert('Ошибка чтения файла: ' + err.message);
            } finally {
                importFileInput.value = '';
            }
        };
    }

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
    const windowEl = toolsPopup?.querySelector('.window') || toolsPopup;
    if (windowEl) {
        if (settings.foxenPopupDragged && settings.foxenPopupPosition) {
            let left = parseFloat(settings.foxenPopupPosition.left);
            let top = parseFloat(settings.foxenPopupPosition.top);
            if (!isNaN(left) && !isNaN(top)) {
                left = Math.max(0, Math.min(left, window.innerWidth - 680));
                top = Math.max(0, Math.min(top, window.innerHeight - 480));
                windowEl.classList.add('no-transform');
                windowEl.classList.add('fxn-dragged');
                windowEl.style.setProperty('position', 'fixed', 'important');
                windowEl.style.setProperty('margin', '0', 'important');
                windowEl.style.setProperty('left', `${Math.round(left)}px`, 'important');
                windowEl.style.setProperty('top', `${Math.round(top)}px`, 'important');
            }
        }
        if (settings.foxenPopupSize) {
            const wVal = parseInt(settings.foxenPopupSize.width, 10);
            const hVal = parseInt(settings.foxenPopupSize.height, 10);
            if (!isNaN(wVal) && wVal >= 680) {
                windowEl.style.setProperty('width', `${wVal}px`, 'important');
            } else {
                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) storage.local.remove('foxenPopupSize');
                } catch (_) {}
                windowEl.style.removeProperty('width');
            }
            if (!isNaN(hVal) && hVal >= 480) {
                windowEl.style.setProperty('height', `${hVal}px`, 'important');
            } else {
                windowEl.style.removeProperty('height');
            }
        }
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

    function fxnSetCheck(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        if ('checked' in el) el.checked = !!val;
        if (el.classList.contains('switch') || el.hasAttribute('data-toggle')) {
            el.classList.toggle('on', !!val);
        }
    }

    const enableCustomThemeCheckboxEl = document.getElementById('enableCustomThemeCheckbox');
    const isThemeEnabled = settings.enableCustomTheme !== false;
    if(enableCustomThemeCheckboxEl) {
        fxnSetCheck('enableCustomThemeCheckbox', isThemeEnabled);
        toggleThemeControls(!isThemeEnabled);
    }
    updateThemePreview();

    fxnSetCheck('autoBumpEnabled', settings.autoBumpEnabled === true);
    const bumpCd = document.getElementById('autoBumpCooldown');
    if (bumpCd) bumpCd.value = settings.autoBumpCooldown || 245;
    fxnSetCheck('selectiveBumpEnabled', settings.foxenSelectiveBumpEnabled === true);
    fxnSetCheck('bumpOnlyAutoDelivery', settings.foxenBumpOnlyAutoDelivery === true);
    fxnSetCheck('foxenSmartBumpEnabled', settings.foxenSmartBumpEnabled === true);

    const isHpRedesignEnabled = settings.enableRedesignedHomepage !== false;
    fxnSetCheck('enableRedesignedHomepage', isHpRedesignEnabled);
    fxnSetCheck('enableRedesignedHomepageGeneral', isHpRedesignEnabled);
    const hpGenEl = document.getElementById('enableRedesignedHomepageGeneral');
    if (hpGenEl) {
        hpGenEl.onchange = async (e) => {
            const checked = e.detail?.checked ?? e.target.checked ?? hpGenEl.classList.contains('on');
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ enableRedesignedHomepage: checked });
            fxnSetCheck('enableRedesignedHomepage', checked);
            if (typeof showNotification === 'function') {
                showNotification('Настройка сохранена. Страница будет перезагружена.', false);
            }
            setTimeout(() => window.location.reload(), 1200);
        };
    }

    const enableCustomProfileCheckboxEl = document.getElementById('enableCustomProfileCheckbox');
    if (enableCustomProfileCheckboxEl) {
        const dfData = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
        const disabled = Array.isArray(dfData.foxenDisabledFeatures) ? dfData.foxenDisabledFeatures : [];
        fxnSetCheck('enableCustomProfileCheckbox', !disabled.includes('profile_descriptions'));

        enableCustomProfileCheckboxEl.addEventListener('change', async (e) => {
            const checked = e.detail?.checked ?? e.target.checked ?? enableCustomProfileCheckboxEl.classList.contains('on');
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
                fxnSetCheck('enableCustomProfileCheckbox', !newDisabled.includes('profile_descriptions'));
            });
        }
    }

    const cursorFxSettings = settings.foxenCursorFx || {};
    const cursorFxDefaults = { enabled: false, type: 'sparkle', color1: '#FF6B6B', color2: '#C026D3', rgb: false, count: 50 };
    const finalCursorFxSettings = { ...cursorFxDefaults, ...cursorFxSettings };

    fxnSetCheck('cursorFxEnabled', finalCursorFxSettings.enabled);
    const fxControls = document.getElementById('cursorFxControls');
    if (fxControls) fxControls.style.display = finalCursorFxSettings.enabled ? 'flex' : 'none';

    const fxType = document.getElementById('cursorFxType'); if (fxType) fxType.value = finalCursorFxSettings.type;
    const fxC1 = document.getElementById('cursorFxColor1'); if (fxC1) fxC1.value = finalCursorFxSettings.color1;
    const fxC2 = document.getElementById('cursorFxColor2'); if (fxC2) fxC2.value = finalCursorFxSettings.color2;
    const fxC1Sw = document.getElementById('cursorFxColor1Swatch'); if (fxC1Sw) fxC1Sw.style.background = finalCursorFxSettings.color1;
    const fxC2Sw = document.getElementById('cursorFxColor2Swatch'); if (fxC2Sw) fxC2Sw.style.background = finalCursorFxSettings.color2;
    fxnSetCheck('cursorFxRgb', finalCursorFxSettings.rgb);
    const fxCount = document.getElementById('cursorFxCount'); if (fxCount) fxCount.value = finalCursorFxSettings.count;
    const fxCountVal = document.getElementById('cursorFxCountValue'); if (fxCountVal) fxCountVal.textContent = `${finalCursorFxSettings.count}%`;
    cursorFx.updateConfig(finalCursorFxSettings);
    
    // Screen Particles
    const pSt = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
        'foxenParticleEnabled', 'foxenParticlePreset', 'foxenParticleCount', 'foxenParticleSpeed'
    ]);
    fxnSetCheck('foxenParticleEnabled', pSt.foxenParticleEnabled === true);
    const pControls = document.getElementById('foxenParticleControls');
    if (pControls) pControls.style.display = pSt.foxenParticleEnabled === true ? 'flex' : 'none';

    const pPreset = document.getElementById('foxenParticlePreset');
    if (pPreset) pPreset.value = pSt.foxenParticlePreset || 'snow';
    const pCount = document.getElementById('foxenParticleCount');
    if (pCount) pCount.value = pSt.foxenParticleCount || 40;
    const pCountVal = document.getElementById('foxenParticleCountValue');
    if (pCountVal) pCountVal.textContent = pSt.foxenParticleCount || 40;

    const pSpeed = document.getElementById('foxenParticleSpeed');
    if (pSpeed) pSpeed.value = pSt.foxenParticleSpeed || 1.0;
    const pSpeedVal = document.getElementById('foxenParticleSpeedValue');
    if (pSpeedVal) pSpeedVal.textContent = `${pSt.foxenParticleSpeed || 1.0}x`;

    const bindParticleInputs = () => {
        const pEnEl = document.getElementById('foxenParticleEnabled');
        if (pEnEl && !pEnEl.dataset.fxnBound) {
            pEnEl.dataset.fxnBound = '1';
            const handleParticleToggle = () => {
                const en = pEnEl.classList.contains('on') || pEnEl.checked;
                if (pControls) pControls.style.display = en ? 'flex' : 'none';
                (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticleEnabled: en });
            };
            pEnEl.addEventListener('change', handleParticleToggle);
            pEnEl.addEventListener('click', () => setTimeout(handleParticleToggle, 20));
        }
        if (pPreset && !pPreset.dataset.fxnBound) {
            pPreset.dataset.fxnBound = '1';
            pPreset.addEventListener('change', () => {
                (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticlePreset: pPreset.value });
            });
        }
        if (pCount && !pCount.dataset.fxnBound) {
            pCount.dataset.fxnBound = '1';
            pCount.addEventListener('input', () => {
                if (pCountVal) pCountVal.textContent = pCount.value;
                (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticleCount: Number(pCount.value) });
            });
        }
        if (pSpeed && !pSpeed.dataset.fxnBound) {
            pSpeed.dataset.fxnBound = '1';
            pSpeed.addEventListener('input', () => {
                if (pSpeedVal) pSpeedVal.textContent = `${pSpeed.value}x`;
                (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenParticleSpeed: Number(pSpeed.value) });
            });
        }
    };
    bindParticleInputs();

    const customCursorSettings = settings.foxenCustomCursor || {};
    const customCursorDefaults = { enabled: false, image: null, size: 32, opacity: 100, hideSystem: true, preset: 'default' };
    const finalCustomCursorSettings = { ...customCursorDefaults, ...customCursorSettings };

    fxnSetCheck('customCursorEnabled', finalCustomCursorSettings.enabled);
    const controlsDiv = document.getElementById('customCursorControls');
    if (controlsDiv) controlsDiv.style.display = finalCustomCursorSettings.enabled ? 'flex' : 'none';
    
    fxnSetCheck('hideSystemCursor', finalCustomCursorSettings.hideSystem);
    
    const curSize = document.getElementById('customCursorSize'); if (curSize) curSize.value = finalCustomCursorSettings.size;
    const curSizeVal = document.getElementById('customCursorSizeValue'); if (curSizeVal) curSizeVal.textContent = `${finalCustomCursorSettings.size}px`;
    const curOp = document.getElementById('customCursorOpacity'); if (curOp) curOp.value = finalCustomCursorSettings.opacity;
    const curOpVal = document.getElementById('customCursorOpacityValue'); if (curOpVal) curOpVal.textContent = `${finalCustomCursorSettings.opacity}%`;
    
    const preview = document.getElementById('cursor-image-preview');
    if (preview) {
        if (finalCustomCursorSettings.image) {
            preview.style.backgroundImage = `url(${finalCustomCursorSettings.image})`;
            preview.textContent = '';
        } else {
            preview.style.backgroundImage = 'none';
            preview.textContent = 'Нет';
        }
    }

    if (finalCustomCursorSettings.preset) {
        const activeCard = document.querySelector(`#fxnCursorPresets .fxn-cursor-card[data-cursor="${finalCustomCursorSettings.preset}"]`);
        if (activeCard) {
            document.querySelectorAll('#fxnCursorPresets .fxn-cursor-card').forEach(c => c.classList.remove('active'));
            activeCard.classList.add('active');
        }
        const uploadWrap = document.getElementById('customCursorUploadWrap');
        if (uploadWrap) uploadWrap.style.display = finalCustomCursorSettings.preset === 'custom' ? 'block' : 'none';
    }

    cursorFx.updateCustomCursor(finalCustomCursorSettings);

    fxnSetCheck('showSalesStatsCheckbox', settings.showSalesStats !== false);
    fxnSetCheck('showFinanceStatsCheckbox', settings.showFinanceStats !== false);
    fxnSetCheck('hideBalanceCheckbox', settings.hideBalance === true);
    fxnSetCheck('fxnIdentifierEnabled', settings.foxenIdentifierEnabled !== false);

    // Telemetry & Error Tracker settings restore & event handlers
    const telemetryEnabledEl = document.getElementById('fxnTelemetryEnabled');
    if (telemetryEnabledEl) {
        fxnSetCheck('fxnTelemetryEnabled', settings.fpt_telemetry_enabled !== false);
        telemetryEnabledEl.addEventListener('change', () => {
            const isChecked = telemetryEnabledEl.classList.contains('on') || telemetryEnabledEl.checked;
            (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ fpt_telemetry_enabled: isChecked });
        });
    }

    // 2.9 & 3.0: Full feature checkboxes restore
    fxnSetCheck('foxenShowUnconfirmed', settings.foxenShowUnconfirmed !== false);
    fxnSetCheck('fpAutoRestoreEnabled', settings.foxenAutoRestoreEnabled === true);
    fxnSetCheck('fpAutoDisableEnabled', settings.foxenAutoDisableEnabled === true);
    fxnSetCheck('foxenInlinePriceEditor', settings.foxenInlinePriceEditor !== false);
    fxnSetCheck('foxenChatReply', settings.foxenChatReply !== false);
    fxnSetCheck('foxenChatLotNotes', settings.foxenChatLotNotes !== false);

    const reviewTplEl = document.getElementById('reviewRequestTemplate');
    if (reviewTplEl) reviewTplEl.value = settings.foxenReviewRequestTemplate || '';

    // 3.0: Extended autoresponder
    chrome.storage.local.get('foxenAutoReplies', ({ foxenAutoReplies: ar = {} }) => {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        fxnSetCheck('newOrderReplyEnabled', ar.newOrderReplyEnabled);
        fxnSetCheck('orderConfirmReplyEnabled', ar.orderConfirmReplyEnabled);
        fxnSetCheck('onlyNewChats', ar.onlyNewChats);
        fxnSetCheck('ignoreSystemMessages', ar.ignoreSystemMessages);
        setVal('newOrderReplyText', ar.newOrderReplyText);
        setVal('orderConfirmReplyText', ar.orderConfirmReplyText);
        setVal('greetingCooldownDays', ar.greetingCooldownDays ?? 0);

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
    const soundInput = document.getElementById('notificationSound');
    if (soundInput) {
        soundInput.value = savedSound;
    }
    const soundChips = document.querySelectorAll('.fxn-sound-chip, .fxn-vireon-sound-chip');
    const customSoundBlock = document.getElementById('fxnCustomSoundBlock');
    soundChips.forEach(chip => {
        const isSel = chip.dataset.sound === savedSound;
        chip.classList.toggle('active', isSel);
        if (!chip.dataset.fxnBound) {
            chip.dataset.fxnBound = '1';
            chip.addEventListener('click', async () => {
                soundChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const val = chip.dataset.sound;
                if (soundInput) soundInput.value = val;
                if (customSoundBlock) {
                    const isCustom = (val === 'custom');
                    customSoundBlock.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
                    customSoundBlock.classList.toggle('fxn-hidden', !isCustom);
                }
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ notificationSound: val });
            });
        }
    });
    if (customSoundBlock) {
        const isCustom = (savedSound === 'custom');
        customSoundBlock.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        customSoundBlock.classList.toggle('fxn-hidden', !isCustom);
    }

    // Initialize "Что тебе нужно" modular feature catalog
    if (typeof initializeNeedsUI === 'function') {
        initializeNeedsUI();
    }

    // Initialize Telegram UI
    if (typeof initializeTelegramUI === 'function') {
        initializeTelegramUI();
    }

    // Notification volume slider + preview
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
            volSlider.addEventListener('change', async () => {
                const volFraction = parseInt(volSlider.value, 10) / 100;
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ notificationVolume: volFraction });
            });
        }
    }

    const testSoundHandler = (e) => {
        if (e) e.preventDefault();
        const activeChip = document.querySelector('.fxn-vireon-sound-chip.active, .fxn-sound-chip.active');
        const snd = activeChip?.dataset.sound || (soundInput && soundInput.value) || (typeof soundSelect !== 'undefined' && soundSelect ? soundSelect.value : 'default');
        const vol = volSlider ? (parseInt(volSlider.value, 10) / 100) : 1;
        if (typeof playCustomAudio === 'function') {
            playCustomAudio(snd, vol);
        } else if (typeof previewNotificationSound === 'function') {
            previewNotificationSound(snd, vol);
        }
    };

    const testSoundBtn = document.getElementById('testNotificationSound');
    if (testSoundBtn && !testSoundBtn.dataset.fxnBound) {
        testSoundBtn.dataset.fxnBound = '1';
        testSoundBtn.addEventListener('click', testSoundHandler);
    }
    const previewBtn = document.getElementById('previewNotificationBtn');
    if (previewBtn && !previewBtn.dataset.fxnBound) {
        previewBtn.dataset.fxnBound = '1';
        previewBtn.addEventListener('click', testSoundHandler);
    }

    const openSoundEditor = document.getElementById('openCustomSoundEditorBtn');
    if (openSoundEditor && !openSoundEditor.dataset.fxnBound) {
        openSoundEditor.dataset.fxnBound = '1';
        openSoundEditor.addEventListener('click', () => {
            if (typeof openCustomSoundEditor === 'function') {
                openCustomSoundEditor();
            } else if (typeof initializeCustomSoundEditor === 'function') {
                initializeCustomSoundEditor();
            }
        });
    }

    // Discord test webhook button
    const testDiscordBtn = document.getElementById('testDiscordWebhookBtn');
    if (testDiscordBtn && !testDiscordBtn.dataset.fxnBound) {
        testDiscordBtn.dataset.fxnBound = '1';
        testDiscordBtn.addEventListener('click', async () => {
            const url = document.getElementById('discordWebhookUrl')?.value?.trim();
            if (!url) {
                if (typeof showNotification === 'function') showNotification('Введите Webhook URL!', true);
                return;
            }
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: '🦊 **Foxen Extension** — Тестовое уведомление успешно доставлено!',
                        embeds: [{
                            title: 'Тест Webhook',
                            description: 'Связь с FunPay установлена и работает корректно.',
                            color: 0xc026d3,
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
                if (typeof showNotification === 'function') showNotification('Тест успешно отправлен в Discord!');
            } catch (e) {
                if (typeof showNotification === 'function') showNotification('Ошибка отправки: ' + e.message, true);
            }
        });
    }

    // Clean logout
    const cleanLogoutBtn = document.getElementById('foxenCleanLogoutBtn');
    if (cleanLogoutBtn && !cleanLogoutBtn.dataset.fxnBound) {
        cleanLogoutBtn.dataset.fxnBound = '1';
        cleanLogoutBtn.addEventListener('click', () => {
            if (confirm('Вы действительно хотите выйти из аккаунта и очистить куки FunPay?')) {
                chrome.runtime.sendMessage({ action: 'deleteCookiesAndReload' });
            }
        });
    }
}

async function initializeNeedsUI() {
    const container = document.getElementById('fxn-needs-features-container');
    if (!container) return;
    
    const reg = (typeof FPT_FEATURE_REGISTRY !== 'undefined' && Array.isArray(FPT_FEATURE_REGISTRY)) ? FPT_FEATURE_REGISTRY : [];
    if (!reg.length) return;

    const data = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
    const disabledArr = Array.isArray(data.foxenDisabledFeatures) ? data.foxenDisabledFeatures : [];
    const disabledSet = new Set(disabledArr);
    
    const groups = {};
    reg.forEach(item => {
        const g = item.group || 'Прочее';
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
    });
    
    let html = '';
    for (const [groupName, items] of Object.entries(groups)) {
        html += `<div class="section-label" style="margin-top:14px;">${groupName}</div><div class="group">`;
        items.forEach(item => {
            const isEnabled = !disabledSet.has(item.id);
            html += `
                <div class="row">
                    <div class="row-icon"><span class="material-icons">check_circle</span></div>
                    <div class="row-text">
                        <div class="row-title">${item.label}</div>
                        <div class="row-sub">${item.desc}</div>
                    </div>
                    <button class="switch ${isEnabled ? 'on' : ''}" data-feature-id="${item.id}" data-toggle type="button"></button>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.switch[data-feature-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.featureId;
            const isNowOn = btn.classList.toggle('on');
            
            const curData = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenDisabledFeatures');
            let curDisabled = Array.isArray(curData.foxenDisabledFeatures) ? [...curData.foxenDisabledFeatures] : [];
            if (isNowOn) {
                curDisabled = curDisabled.filter(x => x !== id);
            } else {
                if (!curDisabled.includes(id)) curDisabled.push(id);
            }
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenDisabledFeatures: curDisabled });
            if (typeof fxnApplyDisabledFeatures === 'function') {
                fxnApplyDisabledFeatures(curDisabled);
            }
        });
    });
    
    const applyPreset = async (activeIds) => {
        const allIds = reg.map(x => x.id);
        const newDisabled = allIds.filter(id => !activeIds.includes(id));
        await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ foxenDisabledFeatures: newDisabled });
        if (typeof fxnApplyDisabledFeatures === 'function') {
            fxnApplyDisabledFeatures(newDisabled);
        }
        await initializeNeedsUI();
        if (typeof showNotification === 'function') showNotification('Профиль настроек применён!');
    };
}