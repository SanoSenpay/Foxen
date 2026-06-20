function getModalOverlaysHTML() {
    return `
        <div class="fp-tools-modal-overlay" id="autobump-category-modal-overlay" style="display: none;"><div class="fp-tools-modal-content"><div class="fp-tools-modal-header"><h3>Выберите категории для поднятия</h3><button class="fp-tools-modal-close">&times;</button></div><div class="fp-tools-modal-body"><div class="autobump-modal-controls"><input type="text" id="autobump-category-search" placeholder="Поиск по категориям..."><button id="autobump-select-all" class="btn btn-default" style="padding: 6px 12px; font-size: 13px;">Выбрать всё</button></div><div id="autobump-category-list" class="autobump-category-list"></div></div><div class="fp-tools-modal-footer"><button id="autobump-category-save" class="btn">Сохранить</button></div></div></div>

        <div class="fp-tools-modal-overlay" id="lot-io-export-modal" style="display: none;">
            <div class="fp-tools-modal-content">
                <div class="fp-tools-modal-header">
                    <h3>Экспорт лотов</h3>
                    <button class="fp-tools-modal-close">&times;</button>
                </div>
                <div class="fp-tools-modal-body">
                    <p class="template-info">Выберите категории, лоты из которых вы хотите экспортировать в файл.</p>
                    <div class="autobump-modal-controls">
                        <button id="lot-io-select-all" class="btn btn-default" style="padding: 6px 12px; font-size: 13px; flex-grow:1;">Выбрать/снять все</button>
                    </div>
                    <div class="lot-io-category-list"></div>
                    <div class="lot-io-warning">
                        <span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span>
                        <span><b>Внимание!</b> Не закрывайте и не перезагружайте эту вкладку до завершения процесса экспорта.</span>
                    </div>
                </div>
                <div class="fp-tools-modal-footer">
                    <button id="lot-io-export-confirm" class="btn">Экспортировать</button>
                </div>
            </div>
        </div>
        <div class="fp-tools-modal-overlay" id="lot-io-import-progress-modal" style="display: none;">
            <div class="fp-tools-modal-content">
                <div class="fp-tools-modal-header">
                    <h3>Прогресс импорта</h3>
                </div>
                <div class="fp-tools-modal-body">
                    <div id="lot-io-progress-summary">Подготовка...</div>
                    <div class="lot-io-progress-list"></div>
                </div>
                <div class="fp-tools-modal-footer">
                    <button id="lot-io-continue-btn" class="btn" style="display:none;">Продолжить</button>
                    <button id="lot-io-cancel-btn" class="btn btn-default">Отменить</button>
                    <div id="lot-io-postpone-controls">
                        <p>Отложите прогресс на завтра, если сейчас не работает.</p>
                        <button id="lot-io-postpone-btn" class="btn btn-default">Отложить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


function getMainPopupHTML() {
    return `
        <div class="fp-tools-header">
            <h2 class="fp-header-title">Foxen</h2>
            <button class="fp-theme-btn" id="fpThemeToggleBtn" aria-label="Переключить тему" title="Тёмная / Светлая тема"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
            <button class="close-btn" aria-label="Закрыть"></button>
        </div>
        <div class="fp-tools-body">
            <nav class="fp-tools-nav">
                <ul>
                    <li class="fp-nav-divider">Основное</li>
                    <li data-page="general" class="active"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span><span>Общие</span></a></li>
                    <li data-page="accounts"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></span><span>Аккаунты</span></a></li>
                    <li class="fp-nav-divider">Чат и продажи</li>
                    <li data-page="templates"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span><span>Шаблоны</span></a></li>
                    <li data-page="auto_review"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg></span><span>Авто-ответы</span></a></li>
                    <li data-page="auto_delivery"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span>Авто-выдача</span></a></li>
                    <li class="fp-nav-divider">Торговля</li>
                    <li data-page="lot_io"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span><span>Лоты</span></a></li>
                    <li data-page="autobump"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg></span><span>Авто-поднятие</span></a></li>
                    <li data-page="ai_audit"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span><span>ИИ-аудит</span></a></li>
                    <li data-page="blacklist"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></span><span>Чёрный список</span></a></li>
                    <li class="fp-nav-divider">Финансы</li>
                    <li data-page="piggy_banks"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 018 8c0 3-1.5 5.5-4 7v2H8v-2c-2.5-1.5-4-4-4-7a8 8 0 018-8z"/><line x1="9" y1="22" x2="15" y2="22"/><line x1="12" y1="6" x2="12" y2="10"/><line x1="10" y1="8" x2="14" y2="8"/></svg></span><span>Копилки</span></a></li>
                    <li data-page="calculator"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg></span><span>Калькулятор</span></a></li>
                    <li data-page="currency_calc"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></span><span>Валюты</span></a></li>
                    <li class="fp-nav-divider">Интерфейс</li>
                    <li data-page="theme"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 20c-6 0-8-4-8-4s2-4 8-4 8 4 8 4-2 4-8 4z"/></svg></span><span>Кастомизация</span></a></li>
                    <li data-page="effects"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span>Эффекты</span></a></li>
                    <li class="fp-nav-divider">Прочее</li>
                    <li data-page="notes"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span><span>Заметки</span></a></li>
                    <li data-page="overview"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span><span>Обзор</span></a></li>
                    <li data-page="settings_io"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span><span>Настройки</span></a></li>
                    <li data-page="tickets"><a><span class="nav-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6"/><path d="M2 15a3 3 0 000 6h20a3 3 0 000-6"/><path d="M6 9v6"/><path d="M18 9v6"/></svg></span><span>Тикеты</span></a></li>
                </ul>
            </nav>
            <main class="fp-tools-content">
                <div class="fp-tools-page-content active" data-page="general">
                    <h3>Общие настройки</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="showSalesStatsCheckbox"><span>Статистика продаж в "Продажи"</span></label>
                    <label class="checkbox-label-inline"><input type="checkbox" id="hideBalanceCheckbox"><span>Скрыть баланс</span></label>
                    <label class="checkbox-label-inline"><input type="checkbox" id="viewSellersPromoCheckbox"><span>Отображение иконок промо-лотов</span></label>
                    
                    <h3>Звук уведомления</h3>
                    <div class="fp-tools-radio-group" id="notificationSoundGroup">
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="default" checked><span>Стандартный</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="vk"><span>VK</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="tg"><span>Telegram</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="iphone"><span>iPhone</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="discord"><span>Discord</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="whatsapp"><span>WhatsApp</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="custom"><span>Свой (файл)</span></label>
                    </div>
                    <div id="notificationCustomSoundBlock" style="margin-top: 10px; display: none;">
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button id="testNotificationSoundBtn" class="btn btn-default" type="button" style="flex:1;">
                                <span class="material-icons" style="font-size: 18px;">volume_up</span>Тест
                            </button>
                            <button id="clearNotificationSoundUrlBtn" class="btn btn-default" type="button" style="flex:1;">
                                <span class="material-icons" style="font-size: 18px;">backspace</span>Очистить
                            </button>
                        </div>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button id="uploadNotificationSoundBtn" class="btn btn-default" type="button" style="flex:1;">
                                <span class="material-icons" style="font-size: 18px;">upload_file</span>Загрузить файл
                            </button>
                            <input type="file" id="notificationSoundFileInput" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" style="display:none;">
                        </div>
                        <p class="template-info" style="margin-top:10px;">
                            Нажмите «Загрузить файл» и выберите скачанный звук (<code>.mp3</code>/<code>.ogg</code>/<code>.wav</code>, до 500 КБ).
                            Рекомендуемые источники: <a href="https://pixabay.com/sound-effects/search/notification/" target="_blank">Pixabay</a>
                        </p>
                    </div>

                    <h3 style="margin-top: 40px;">Уведомления в Discord</h3>
                     <label class="checkbox-label-inline"><input type="checkbox" id="discordLogEnabled"><span>Включить уведомления о новых сообщениях</span></label>
                    <div id="discordSettingsContainer">
                        <label for="discordWebhookUrl" style="margin-top: 10px;">Webhook URL:</label>
                        <input type="text" id="discordWebhookUrl" class="template-input" placeholder="Вставьте ссылку на вебхук вашего Discord канала">
                        <div class="checkbox-label-inline" style="margin-top:10px;"><input type="checkbox" id="discordPingEveryone"><label for="discordPingEveryone" style="margin-bottom:0;"><span>Пинговать @everyone</span></label></div>
                        <label class="checkbox-label-inline"><input type="checkbox" id="discordPingHere"><span>Пинговать @here</span></label>
                    </div>

                    <div class="support-promo">
                        <span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span> Спасибо за использование этого <a href="https://addons.mozilla.org/ru/firefox/addon/foxen/" target="_blank">расширения</a>!</span>
                    </div>
                    <h3 style="margin-top: 30px;">Заказы и статистика</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="fpToolsShowPaymentType" checked><span>Показывать тип оплаты в списке заказов (Сделка / Обычный)</span></label>
                    <label class="checkbox-label-inline"><input type="checkbox" id="fpToolsBuyerHistory" checked><span>Показывать историю покупок в чате</span></label>
                    <label class="checkbox-label-inline"><input type="checkbox" id="fpToolsShowUnconfirmed" checked><span>Показывать сумму неподтверждённых заказов</span></label>

                    <h3 style="margin-top: 30px;">Идентификатор FPT</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="fptIdentifierEnabled" checked><span>Показывать метку «Foxen» рядом с ником собеседника</span></label>
                    <p class="template-info">При включении к исходящим сообщениям добавляется невидимый символ. Если собеседник тоже использует FPT — рядом с его ником появится пометка. Символ не виден обычным пользователям. Не добавляется в ссылки и скопированный текст.</p>

                    <div class="support-promo" style="background: rgba(107, 102, 255, 0.1); border-color: rgba(107, 102, 255, 0.3); margin-top: 15px;">
                        <span class="nav-icon" style="color: #6B66FF;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span></span>
                        <span>Данное расширение было создано на основе расширения <a href="https://funpay.tools" target="_blank" style="color:inherit;text-decoration:underline;font-weight:bold;">Foxen</a></span>
                    </div>
                </div>
                <div class="fp-tools-page-content" data-page="accounts">
                    <h3>Управление аккаунтами</h3>
                    <p class="template-info">Добавьте текущий аккаунт в список, чтобы быстро переключаться между профилями без ввода пароля.</p>
                    <div class="support-promo" style="background: rgba(107,102,255,0.08); border-color: rgba(107,102,255,0.25); margin-bottom: 20px;">
                        <span class="nav-icon" style="color: #6B66FF;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span></span>
                        <span>Нажмите «+ Добавить текущий аккаунт» для каждого профиля. Переключение происходит мгновенно без ввода паролей.</span>
                    </div>
                    <button id="addCurrentAccountBtn" class="btn">+ Добавить текущий аккаунт</button>
                    <h4 style="margin-top: 30px;">Сохраненные аккаунты:</h4>
                    <div id="fpToolsAccountsList"></div>
                </div>
                <div class="fp-tools-page-content" data-page="templates">
                    <h3>Настройки шаблонов</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="sendTemplatesImmediately"><span>Отправлять шаблоны сразу по клику</span></label>
                    <label>Расположение кнопок:</label>
                    <div class="fp-tools-radio-group">
                        <label class="fp-tools-radio-option"><input type="radio" name="templatePos" value="bottom" checked><span>Под полем ввода</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="templatePos" value="sidebar"><span>В правой панели</span></label>
                    </div>
                    <h3>Редактор шаблонов</h3>
                     <p class="template-info">Кликните на название или текст шаблона, чтобы его изменить. Все изменения сохраняются автоматически.</p>
                     
                     <div class="template-variables-guide">
                        <h5>Справка по переменным</h5>
                        <ul class="variables-list">
                            <li><span class="variable-code">{buyername}</span> — Имя покупателя в текущем чате.</li>
                            <li><span class="variable-code">{lotname}</span> — Название товара, который обсуждается в чате.</li>
                            <li><span class="variable-code">{welcome}</span> — "Доброе утро!", "Добрый день!" или "Добрый вечер!" в зависимости от времени.</li>
                            <li><span class="variable-code">{date}</span> — Текущая дата и время (например, 25.12.2025 14:30).</li>
                            <li><span class="variable-code">{bal}</span> — Ваш текущий баланс на FunPay.</li>
                            <li><span class="variable-code">{activesells}</span> — Количество ваших активных продаж.</li>
                            <li><span class="variable-code">{ai: ваш запрос}</span> — Вставляет текст, сгенерированный ИИ на основе вашего запроса. 
                                <br><em>Пример: <code>{ai: вежливо поблагодари за покупку}</code></em>
                            </li>
                            <li><span class="variable-code">{orderlink}</span> — Ссылка на последний заказ с этим покупателем. <em>Пример: Подтвердите заказ: {orderlink}</em></li>
                            <li><span class="variable-code">{date}</span> — Текущая дата и время.</li>
                            <li><span class="variable-code">{welcome}</span> — Приветствие по времени суток.</li>
                        </ul>
                     </div>
                     
                     <div class="template-info image-upload-warning">
                        <span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></span></span>
                        <span><b>Изображения в шаблонах:</b> Используйте кнопку <span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></span>, чтобы добавить картинку с компьютера. Она будет вставлена как код. При отправке шаблона картинка будет отправлена в чат, как будто вы её скопировали и вставили.</span>
                     </div>

                    <div id="template-settings-container" class="template-settings-list"></div>
                    <button id="addCustomTemplateBtn" class="btn" style="margin-top: 10px;">+ Добавить свой шаблон</button>
                </div>

                <div class="fp-tools-page-content" data-page="auto_review">
                    <h3>Ответы на отзывы</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="autoReviewEnabled"><span>Включить автоматический ответ на отзывы</span></label>
                    <p class="template-info">Расширение будет автоматически отвечать на новые отзывы, используя заданные шаблоны. Ответ не будет отправлен, если вы уже ответили вручную.</p>
                    <div class="template-variables-guide" style="margin-bottom: 15px;">
                        <h5>Переменные в ответах на отзывы</h5>
                        <ul class="variables-list">
                            <li><span class="variable-code">{buyername}</span> — Имя покупателя.</li>
                            <li><span class="variable-code">{lotname}</span> — Название купленного товара.</li>
                            <li><span class="variable-code">{orderid}</span> — Номер заказа.</li>
                            <li><span class="variable-code">{orderlink}</span> — Ссылка на заказ.</li>
                            <li><span class="variable-code">{date}</span> — Текущая дата.</li>
                            <li><span class="variable-code">{welcome}</span> — Приветствие по времени суток.</li>
                        </ul>
                    </div>
                    <div class="review-templates-grid">
                        <div class="template-container">
                            <label for="fpt-review-5">⭐⭐⭐⭐⭐</label>
                            <textarea id="fpt-review-5" class="template-input" placeholder="Шаблон для 5 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-4">⭐⭐⭐⭐</label>
                            <textarea id="fpt-review-4" class="template-input" placeholder="Шаблон для 4 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-3">⭐⭐⭐</label>
                            <textarea id="fpt-review-3" class="template-input" placeholder="Шаблон для 3 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-2">⭐⭐</label>
                            <textarea id="fpt-review-2" class="template-input" placeholder="Шаблон для 2 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-1">⭐</label>
                            <textarea id="fpt-review-1" class="template-input" placeholder="Шаблон для 1 звезды"></textarea>
                        </div>
                    </div>
                    
                    <h3>Бонус за отзыв</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="bonusForReviewEnabled"><span>Отправлять бонус в чат за отзыв 5 ★</span></label>
                    <p class="template-info">Если покупатель оставит отзыв 5 звёзд, ему в чат будет автоматически отправлено сообщение с бонусом. Ничего не будет отправлено за оценки ниже 5 звёзд.</p>
                    <div class="fp-tools-radio-group" id="bonusModeSelector">
                        <label class="fp-tools-radio-option"><input type="radio" name="bonusMode" value="single" checked><span>Один бонус</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="bonusMode" value="random"><span>Случайный из списка</span></label>
                    </div>
                    <div id="singleBonusContainer" class="template-container">
                        <textarea id="singleBonusText" class="template-input" placeholder="Текст вашего бонуса..."></textarea>
                    </div>
                    <div id="randomBonusContainer" class="template-container" style="display: none;">
                        <div id="bonus-list-container" class="bonus-list"></div>
                        <div class="bonus-add-form">
                            <textarea id="newBonusText" placeholder="Текст нового бонуса для списка..."></textarea>
                            <button id="addBonusBtn" class="btn btn-default">Добавить бонус в список</button>
                        </div>
                    </div>

                    <h3>Автоответчик в чате</h3>
                     <div class="template-container">
                        <label class="checkbox-label-inline"><input type="checkbox" id="greetingEnabled"><span>Авто-приветствие для новых покупателей</span></label>
                        <textarea id="greetingText" class="template-input" placeholder="Текст приветствия... Переменные: {buyername}, $chat_name"></textarea>

                        <div style="margin-top:10px;">
                            <label class="checkbox-label-inline"><input type="checkbox" id="onlyNewChats"><span>Только совсем новые чаты</span></label>
                            <label class="checkbox-label-inline"><input type="checkbox" id="ignoreSystemMessages"><span>Не приветствовать при системных сообщениях (заказы, отзывы)</span></label>
                            <label style="font-size:12px;color:#5a5f7a;margin-top:6px;display:block;">Кулдаун повторного приветствия (дней, 0 = без кулдауна):</label>
                            <input type="number" id="greetingCooldownDays" min="0" max="365" value="0" class="template-input" style="width:80px;" placeholder="0">
                        </div>
                    </div>
                    <h3>Ответ на новый заказ</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="newOrderReplyEnabled"><span>Отправлять сообщение при новом заказе</span></label>
                    <p class="template-info">Отправляется когда покупатель оплачивает заказ. Переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{orderlink}</code>.</p>
                    <textarea id="newOrderReplyText" class="template-input" placeholder="Спасибо за заказ, {buyername}! Ваш заказ: {orderlink}"></textarea>

                    <h3 style="margin-top:20px;">Ответ при подтверждении заказа</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="orderConfirmReplyEnabled"><span>Отправлять сообщение при подтверждении заказа покупателем</span></label>
                    <p class="template-info">Переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{lotname}</code>, <code>{orderlink}</code>.</p>
                    <textarea id="orderConfirmReplyText" class="template-input" placeholder="{buyername}, спасибо за подтверждение заказа {orderid}! Если не сложно, оставь, пожалуйста, отзыв!"></textarea>

                    <h3 style="margin-top:20px;">Дополнительно</h3>
                    <div class="template-container">
                        <label class="checkbox-label-inline"><input type="checkbox" id="keywordsEnabled"><span>Авто-ответы по ключевым словам</span></label>
                        <div id="keywords-list-container" class="keywords-list"></div>
                        <div class="keyword-add-form">
                            <input type="text" id="newKeyword" placeholder="Ключевое слово или фраза">
                            <div class="fp-tools-radio-group" style="margin: 6px 0;">
                                <label class="fp-tools-radio-option"><input type="radio" name="newKeywordMatchMode" value="exact" checked><span>Точное совпадение</span></label>
                                <label class="fp-tools-radio-option"><input type="radio" name="newKeywordMatchMode" value="contains"><span>Содержит</span></label>
                            </div>
                            <textarea id="newKeywordResponse" placeholder="Текст ответа (можно использовать {buyername})"></textarea>
                            <button id="addKeywordBtn" class="btn btn-default">Добавить правило</button>
                        </div>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="lot_io">
                    <h3>Управление лотами</h3>
                    <div class="template-info" style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <p style="margin-top:0;">Здесь собраны инструменты для массовой работы с вашими лотами.</p>
                        <ul style="padding-left: 20px; margin-bottom: 0;">
                            <li><strong>Экспорт/Импорт:</strong> Сохраняйте все свои лоты в файл и восстанавливайте их на любом аккаунте.</li>
                            <li><strong>Массовое управление:</strong> На странице вашего профиля (<code>funpay.com/users/ID</code>) или в категории с вашими лотами появится кнопка "Выбрать" для массового удаления, дублирования или изменения цен.</li>
                            <li><strong>Продвинутое клонирование:</strong> На странице редактирования лота кнопка "Копировать" позволяет создавать копии в разных категориях (например, на разных серверах).</li>
                            <li><strong>Авто-поднятие:</strong> Настройте автоматическое поднятие лотов по таймеру. <a href="#" onclick="document.querySelector('.fp-tools-nav li[data-page=autobump] a').click(); return false;">Перейти к настройке</a>.</li>
                        </ul>
                    </div>
                    
                    <h4 style="margin-top: 30px;">Экспорт и импорт лотов</h4>
                    <p class="template-info">Создайте полную резервную копию всех ваших лотов в файл JSON. Этот файл можно использовать для переноса лотов на другой аккаунт или для восстановления.</p>
                    <div class="lot-io-buttons">
                        <button id="lot-io-export-btn" class="btn"><span class="material-icons">file_upload</span>Экспорт</button>
                        <button id="lot-io-import-btn" class="btn btn-default"><span class="material-icons">file_download</span>Импорт</button>
                        <input type="file" id="lot-io-import-file" accept=".json" style="display: none;">
                    </div>
                    <h4 style="margin-top: 30px;">Массовое редактирование</h4>
                    <p class="template-info">Измените название, описание или сообщение покупателю сразу у нескольких лотов.</p>
                    <button id="fp-bulk-edit-btn" class="btn btn-default" style="width:auto;padding:8px 16px;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span> Массово изменить лоты</button>

                    <a href="#" id="convert-cardinal-lots-btn" style="display: block; text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: #a0a0a0; text-decoration: underline;">Конвертер Cardinal-лотов в наш формат</a>

                    <h4 style="margin-top: 30px;">Незавершённые импорты</h4>
                    <div id="lot-io-pending-imports-list">
                        <p class="template-info">Здесь будут отображаться отложенные процессы импорта.</p>
                    </div>
                </div>
                <div class="fp-tools-page-content" data-page="piggy_banks">
                    <h3>Управление копилками</h3>
                    <p class="template-info">Создавайте копилки для отслеживания прогресса к вашим финансовым целям. Основная копилка будет отображаться при наведении на баланс в шапке сайта.</p>
                    <button id="create-piggy-bank-btn" class="btn">+ Создать новую копилку</button>
                    <div id="piggy-banks-list-container" class="piggy-banks-list-container"></div>
                </div>
                <div class="fp-tools-page-content" data-page="theme">
                    <h3>Кастомизация темы</h3>
                    <div class="checkbox-label-inline" style="margin-bottom:15px;"><input type="checkbox" id="enableCustomThemeCheckbox"><label for="enableCustomThemeCheckbox" style="margin-bottom:0;"><span>Включить кастомную тему</span></label></div>
                    <div id="foxen-theme-gallery-mount" style="margin-bottom: 12px;"></div>
                    <div class="template-container">
                        <label>Фоновое изображение:</label>
                        <div id="bg-image-preview" style="width:100%; height:60px; background-color:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; margin-bottom:10px; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color: #888; font-size:12px;">Нет изображения</div>
                        <button id="uploadBgImageBtn" class="btn" title="Можно загружать анимированные GIF">Загрузить</button>
                        <button id="removeBgImageBtn" class="btn btn-default" style="margin-left: 10px;">Удалить</button>
                        <input type="file" id="bgImageInput" accept="image/*,image/gif" style="display: none;">
                        <div class="bg-image-info"><span id="bgImageInfoToggle" class="info-toggle">Откуда брать анимации? ⓘ</span><div id="bgImageInfoContent" class="info-content"><p>Вы можете загрузать анимированные GIF. Примеры сайтов, где можно найти подходящие фоны:</p><ul><li><a href="https://www.behance.net/gallery/35096329/Ambient-animations" target="_blank" rel="noopener noreferrer">Behance - Ambient Animations</a></li><li><a href="https://tenor.com/ru/search/looping-gifs-anime-aesthetic-gifs" target="_blank" rel="noopener noreferrer">Tenor - Looping Aesthetic Gifs</a></li><li><a href="https://www.pinterest.com/pin/678565868836311444/" target="_blank" rel="noopener noreferrer">Pinterest - Pixel Art</a></li><li><a href="https://tenor.com/ru/search/anime-rain-wallpaper-gifs" target="_blank" rel="noopener noreferrer">Tenor - Anime Rain Wallpaper</a></li></ul></div></div>
                    </div>
                    <div class="template-container color-input-grid">
                        <div><label for="themeColor1">Основной цвет:</label><input type="color" id="themeColor1" class="theme-color-input"></div>
                        <div><label for="themeColor2">Акцентный цвет:</label><input type="color" id="themeColor2" class="theme-color-input"></div>
                        <div><label for="themeContainerBgColor">Фон блоков:</label><input type="color" id="themeContainerBgColor" class="theme-color-input"></div>
                        <div><label for="themeTextColor">Цвет текста:</label><input type="color" id="themeTextColor" class="theme-color-input"></div>
                        <div><label for="themeLinkColor">Цвет ссылок:</label><input type="color" id="themeLinkColor" class="theme-color-input"></div>
                    </div>
                    <div class="template-container"><div class="range-label"><label for="themeFontSelect">Шрифт:</label></div><select id="themeFontSelect"></select></div>
                    <div class="template-container"><div class="range-label"><label for="themeBgBlur">Размытие фона:</label><span id="themeBgBlurValue">0px</span></div><input type="range" id="themeBgBlur" min="0" max="20" step="1"></div>
                    <div class="template-container"><div class="range-label"><label for="themeBgBrightness">Яркость фона:</label><span id="themeBgBrightnessValue">100%</span></div><input type="range" id="themeBgBrightness" min="20" max="150" step="1"></div>
                    <div class="template-container"><div class="range-label"><label for="themeBorderRadius">Закругление углов:</label><span id="themeBorderRadiusValue">8px</span></div><input type="range" id="themeBorderRadius" min="0" max="30" step="1"></div>
                    <div class="setting-group"><div class="checkbox-label-inline"><input type="checkbox" id="enableGlassmorphism"><label for="enableGlassmorphism">Эффект "матового стекла"</label></div><div id="glassmorphismControls" style="display:none;"><div class="template-container"><div class="range-label"><label for="themeContainerBgOpacity">Прозрачность блоков:</label><span id="themeContainerBgOpacityValue">100%</span></div><input type="range" id="themeContainerBgOpacity" min="0" max="100" step="1"></div><div class="template-container"><div class="range-label"><label for="glassmorphismBlur">Размытие стекла:</label><span id="glassmorphismBlurValue">10px</span></div><input type="range" id="glassmorphismBlur" min="0" max="30" step="1"></div></div></div>
                    <div class="setting-group"><div class="checkbox-label-inline"><input type="checkbox" id="enableCustomScrollbar"><label for="enableCustomScrollbar">Кастомный скроллбар</label></div><div id="customScrollbarControls" style="display:none;"><div class="template-container color-input-grid"><div><label for="scrollbarThumbColor">Цвет ползунка:</label><input type="color" id="scrollbarThumbColor" class="theme-color-input"></div><div><label for="scrollbarTrackColor">Цвет фона:</label><input type="color" id="scrollbarTrackColor" class="theme-color-input"></div></div><div class="template-container"><div class="range-label"><label for="scrollbarWidth">Ширина:</label><span id="scrollbarWidthValue">8px</span></div><input type="range" id="scrollbarWidth" min="2" max="20" step="1"></div></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Кругляшки</h4><div class="template-container"><label>Предпросмотр:</label><div style="display: flex; justify-content: center; align-items: center; height: 150px; background: rgba(0,0,0,0.2); border-radius: 10px; overflow: hidden; margin-bottom: 15px;"><div id="circlePreviewContainer" style="transition: opacity 0.3s ease;"><div id="circlePreview" style="position: relative; width: 140px; height: 140px; transform-origin: center center; transition: transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease;"><img src="https://funpay.com/img/circles/funpay_poke.jpg" alt="" style="width: 100%; height: 100%; border-radius: 50%;"><svg viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"><defs><path id="text_path_preview" d="M 10, 100 a 90,90 0 1,0 180,0 a 90,90 0 1,0 -180,0"></path></defs><g fill="white" font-size="14px"><text text-anchor="end"><textPath xlink:href="#text_path_preview" startOffset="100%">Example</textPath></text></g></svg></div></div></div></div><label class="checkbox-label-inline"><input type="checkbox" id="enableCircleCustomization"><span>Включить кастомизацию</span></label><div id="circleCustomizationControls" style="display: none;"><label class="checkbox-label-inline"><input type="checkbox" id="showCircles"><span>Отображать</span></label><div class="template-container"><div class="range-label"><label for="circleSize">Размер:</label><span id="circleSizeValue">100%</span></div><input type="range" id="circleSize" min="50" max="150" step="1"></div><div class="template-container"><div class="range-label"><label for="circleOpacity">Прозрачность:</label><span id="circleOpacityValue">100%</span></div><input type="range" id="circleOpacity" min="0" max="100" step="1"></div><div class="template-container"><div class="range-label"><label for="circleBlur">Размытие:</label><span id="circleBlurValue">0px</span></div><input type="range" id="circleBlur" min="0" max="50" step="1"></div></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Разделители</h4><label class="checkbox-label-inline"><input type="checkbox" id="enableImprovedSeparators"><span>Включить улучшенные</span></label></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Главная страница</h4><label class="checkbox-label-inline"><input type="checkbox" id="enableRedesignedHomepage"><span>Включить улучшенную</span></label><small style="font-size: 12px; opacity: 0.7; display: block; margin-top: -10px;">Заменяет главную страницу на более современный вид с поиском. Требуется перезагрузка.</small></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Расположение</h4><div class="template-container"><div class="range-label"><label for="headerPositionSelect">Верхняя панель:</label></div><select id="headerPositionSelect"><option value="top">Вверх (по умолчанию)</option><option value="bottom">Вниз</option></select></div></div>
                    <div class="theme-actions-grid"><button id="enableMagicStickBtn" class="btn" style="grid-column: 1 / -1;"><span class="material-icons">auto_fix_normal</span><span>Включить режим редактора</span></button><button id="generatePaletteBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">auto_fix_high</span>цвета фона</button><button id="randomizeThemeBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">casino</span>рандом</button><button id="shareThemeBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">share</span>Поделиться темой</button><button id="exportThemeBtn" class="btn btn-default" title="Сохранить текущие настройки темы в файл (.fptheme)">Экспорт</button><button id="importThemeBtn" class="btn btn-default" title="Загрузить настройки темы из файла (.fptheme)">Импорт</button><input type="file" id="importThemeInput" accept=".fptheme" style="display: none;"><button id="resetThemeBtn" class="btn btn-default">СБРОСИТЬ ТЕМУ</button></div>
                </div>
                <div class="fp-tools-page-content" data-page="autobump">
                    <h3>Авто-поднятие лотов</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="autoBumpEnabled"><span>Включить авто-поднятие</span></label>
                    <div class="template-container"><label for="autoBumpCooldown">Интервал поднятия (минуты):</label><input type="number" id="autoBumpCooldown" class="template-input" min="5" placeholder="Например: 245"><small style="font-size: 12px; opacity: 0.7;">Минимум 5 минут. FunPay позволяет поднимать раз в 4 часа (240 минут).</small></div>
                    
                    <label class="checkbox-label-inline"><input type="checkbox" id="selectiveBumpEnabled"><span>Поднимать только выбранные категории</span></label>
                    <button id="configureSelectiveBumpBtn" class="btn btn-default" style="width: auto; padding: 8px 16px; font-size: 14px;">выбрать...</button>
                    
                    <div class="checkbox-label-inline" style="margin-top: 15px;"><input type="checkbox" id="bumpOnlyAutoDelivery"><label for="bumpOnlyAutoDelivery" style="margin-bottom:0;"><span>Поднимать только категории с автовыдачей</span></label></div>
                    <small style="font-size: 12px; opacity: 0.7; display: block; margin-top: -10px; margin-left: 30px;">Будут подняты только те категории, в которых есть хотя бы один лот с иконкой автовыдачи (<span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span>).</small>

                    <label style="margin-top: 20px;">Консоль логов:</label>
                    <div id="autoBumpConsole" class="fp-tools-console"></div>
                </div>
                <div class="fp-tools-page-content" data-page="notes">
                    <h3>Заметки</h3>
                    <p class="template-info">Это ваш личный блокнот. Текст сохраняется автоматически при вводе и доступен между сессиями браузера.</p>
                    <textarea id="fpToolsNotesArea" class="template-input" style="height: 80%; resize: none; min-height: 400px;" placeholder="Запишите сюда что-нибудь важное: список дел, временные данные для покупателя, идеи для новых лотов..."></textarea>
                </div>
                <div class="fp-tools-page-content" data-page="calculator">
                    <h3>Калькулятор</h3>
                    <div class="calculator-container"><div class="calculator-display"><span id="calcDisplay">0</span></div><div class="calculator-buttons"><button class="calc-btn calc-btn-light" data-action="clear">AC</button><button class="calc-btn calc-btn-light" data-action="toggle-sign">+/-</button><button class="calc-btn calc-btn-light" data-action="percentage">%</button><button class="calc-btn calc-btn-operator" data-action="divide">÷</button><button class="calc-btn" data-key="7">7</button><button class="calc-btn" data-key="8">8</button><button class="calc-btn" data-key="9">9</button><button class="calc-btn calc-btn-operator" data-action="multiply">×</button><button class="calc-btn" data-key="4">4</button><button class="calc-btn" data-key="5">5</button><button class="calc-btn" data-key="6">6</button><button class="calc-btn calc-btn-operator" data-action="subtract">−</button><button class="calc-btn" data-key="1">1</button><button class="calc-btn" data-key="2">2</button><button class="calc-btn" data-key="3">3</button><button class="calc-btn calc-btn-operator" data-action="add">+</button><button class="calc-btn calc-btn-zero" data-key="0">0</button><button class="calc-btn" data-action="decimal">.</button><button class="calc-btn calc-btn-operator" data-action="calculate">=</button></div></div>
                </div>
                <div class="fp-tools-page-content" data-page="currency_calc">
                    <h3>Калькулятор валют</h3>
                    <p class="template-info">Курсы обновляются раз в день. Используется открытый API.</p>
                    <div class="currency-converter-container"><div class="currency-input-group"><input type="number" id="currencyAmountFrom" class="template-input currency-input" value="100"><select id="currencySelectFrom" class="template-input currency-select"></select></div><div class="currency-swap-container"><button id="currencySwapBtn" class="currency-swap-btn">⇅</button><div id="currencyRateDisplay" class="currency-rate-display"></div></div><div class="currency-input-group"><input type="text" id="currencyAmountTo" class="template-input currency-input" readonly><select id="currencySelectTo" class="template-input currency-select"></select></div></div><div id="currency-error-display" class="currency-error"></div>
                </div>
                <div class="fp-tools-page-content" data-page="effects">
                    <h3>Эффекты частиц</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="cursorFxEnabled"><span>Включить эффекты частиц</span></label>
                    <div class="template-container"><label for="cursorFxType">Тип эффекта:</label><select id="cursorFxType"><option value="sparkle">Искры</option><option value="trail">След</option><option value="snow">Снег</option><option value="blood">Кровь</option></select></div>
                    <div class="template-container color-input-grid"><div><label for="cursorFxColor1">Цвет 1:</label><input type="color" id="cursorFxColor1" class="theme-color-input"></div><div><label for="cursorFxColor2">Цвет 2 (градиент):</label><input type="color" id="cursorFxColor2" class="theme-color-input"></div></div>
                    <label class="checkbox-label-inline"><input type="checkbox" id="cursorFxRgb"><span>Радужный (RGB)</span></label>
                    <div class="template-container"><div class="range-label"><label for="cursorFxCount">Интенсивность:</label><span id="cursorFxCountValue">50%</span></div><input type="range" id="cursorFxCount" min="0" max="100" step="1"></div>
                    <div style="margin-top: 20px;"><button id="resetCursorFxBtn" class="btn btn-default">Сбросить эффекты</button></div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 25px 0;"></div>
                    <h3>Пользовательский курсор</h3>
                    <label class="checkbox-label-inline"><input type="checkbox" id="customCursorEnabled"><span>Включить свой курсор</span></label>
                    <div id="customCursorControls" style="display: none;"><div class="template-container"><label>Изображение курсора:</label><div id="cursor-image-preview" style="width:64px; height:64px; background-color:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; margin-bottom:10px; background-size:contain; background-position:center; background-repeat: no-repeat; display:flex; align-items:center; justify-content:center; color: #888; font-size:12px;">Нет</div><button id="uploadCursorImageBtn" class="btn">Загрузить</button><button id="removeCursorImageBtn" class="btn btn-default" style="margin-left: 10px;">Удалить</button><input type="file" id="cursorImageInput" accept="image/*" style="display: none;"></div><label class="checkbox-label-inline"><input type="checkbox" id="hideSystemCursor" checked><span>Скрыть системный курсор</span></label><div class="template-container"><div class="range-label"><label for="customCursorSize">Размер:</label><span id="customCursorSizeValue">32px</span></div><input type="range" id="customCursorSize" min="16" max="128" step="1" value="32"></div><div class="template-container"><div class="range-label"><label for="customCursorOpacity">Прозрачность:</label><span id="customCursorOpacityValue">100%</span></div><input type="range" id="customCursorOpacity" min="0" max="100" step="1" value="100"></div></div>
                </div>
                <div class="fp-tools-page-content" data-page="overview">
                    <div class="overview-container"><h3 style="border:none">Видео-обзор функций</h3><p class="template-info">Посмотрите короткий кинематографический ролик, демонстрирующий все возможности Foxen в действии. Откройте для себя инструменты, о которых вы могли не знать!</p><div class="overview-promo-art"></div><button id="start-overview-tour-btn" class="btn"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></span> Начать обзор</button></div>
                    <div class="feature-list-container"><h3>Справочник по функциям</h3><div class="feature-item"><div class="feature-title"><span class="material-icons">smart_toy</span>ИИ-Ассистент в чате</div><div class="feature-location"><strong>Где найти:</strong> В любом чате, кнопка "AI" рядом с полем ввода.</div><div class="feature-desc">Улучшает ваш текст, делая его вежливым и профессиональным. Активируйте режим и нажмите Enter для обработки. Также предупреждает о грубости.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">auto_fix_high</span>AI-Генератор лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице создания/редактирования лота.</div><div class="feature-desc">Создает название и описание для лота на основе ваших идей, анализируя и копируя стиль ваших существующих предложений.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">add_photo_alternate</span>AI-Генератор изображений</div><div class="feature-location"><strong>Где найти:</strong> На странице создания/редактирования лота, в разделе "Изображения".</div><div class="feature-desc">Создавайте уникальные и стильные превью для ваших предложений с помощью встроенного генератора, в том числе по текстовому запросу.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">palette</span>Полная кастомизация</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Кастомизация".</div><div class="feature-desc">Измените внешний вид FunPay: установите анимированный фон, настройте цвета, шрифты, прозрачность блоков и даже расположение верхней панели.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">auto_fix_normal</span>"Кастомизатор (режим редактора)</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Кастомизация".</div><div class="feature-desc">Редактируйте любой элемент сайта в реальном времени. Меняйте цвета, размеры или скрывайте ненужное, сохраняя стили навсегда.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">description</span>Шаблоны и AI-переменные</div><div class="feature-location"><strong>Где найти:</strong> Под полем ввода в чате. Настраиваются во вкладке "Шаблоны".</div><div class="feature-desc">Быстрая вставка готовых сообщений. Поддерживают переменные {buyername}, {date} и даже генерацию текста через {ai:ваш запрос}.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">checklist</span>Управление лотами и ценами</div><div class="feature-location"><strong>Где найти:</strong> На странице вашего профиля (funpay.com/users/...).</div><div class="feature-desc">Кнопка "Выбрать" позволяет выделить несколько лотов для массового удаления, дублирования, отключения или редактирования цен.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">control_point_duplicate</span>Клонирование лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице редактирования любого вашего лота.</div><div class="feature-desc">Кнопка "Копировать" позволяет создать точную копию лота или массово размножить его по разным категориям (например, по разным серверам).</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">public</span>Глобальный импорт лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице редактирования лота, кнопка "Импорт".</div><div class="feature-desc">Импортируйте название и описание любого лота с FunPay, чтобы анализировать конкурентов или использовать как основу.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">sort_by_alpha</span>Сортировка по отзывам</div><div class="feature-location"><strong>Где найти:</strong> На любой странице со списком лотов.</div><div class="feature-desc">Кликните на заголовок "Продавец" в таблице, чтобы отсортировать все предложения по количеству отзывов у продавцов.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">label</span>Пометки для пользователей</div><div class="feature-location"><strong>Где найти:</strong> В выпадающем меню в заголовке чата с человеком.</div><div class="feature-desc">Устанавливайте настраиваемые цветные метки для пользователей, которые будут видны в вашем списке контактов.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">rocket_launch</span>Авто-поднятие лотов</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Авто-поднятие".</div><div class="feature-desc">Настройте автоматическое поднятие лотов по таймеру. Можно выбрать для поднятия только определенные категории.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">monitoring</span>Статистика</div><div class="feature-location"><strong>Где найти:</strong> Страница "Продажи" - статистика продаж, кнопка "Аналитика рынка" на странице игры.</div><div class="feature-desc">Получайте детальную статистику по своим продажам и анализируйте рыночную ситуацию в любой категории.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">savings</span>Финансовые копилки</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Копилки" и иконка в шапке сайта.</div><div class="feature-desc">Устанавливайте финансовые цели и отслеживайте их достижение. Копилка синхронизируется с балансом FunPay.</div></div></div>
                </div>
                <div class="fp-tools-page-content" data-page="ai_audit">
                    <h3>ИИ-аудит лотов</h3>

                    <!-- START STATE -->
                    <div id="fp-audit-start-wrap">
                        <p class="template-info">ИИ прочитает все ваши лоты и последние 30 отзывов, сгенерирует ~40 вопросов и на основе ваших ответов выдаст конкретные рекомендации.</p>
                        <div class="support-promo" style="background:rgba(107,102,255,0.07);border-color:rgba(107,102,255,0.2);margin-bottom:16px;">
                            <span><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .34 2.02 1 2.8.76.76 1.23 1.52 1.41 2.5"></path><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="8" x2="12" y2="10"></line></svg></span></span>
                            <span>Вопросы будут именно о ваших лотах — ИИ внимательно их изучит перед генерацией.</span>
                        </div>
                        <button id="fp-audit-start-btn" class="btn" style="width:100%;padding:12px;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span> Начать аудит</button>
                        <p id="fp-audit-cooldown-msg" style="display:none;text-align:center;font-size:12px;color:#5a5f7a;margin-top:8px;"></p>
                    </div>

                    <!-- LOADING STATE -->
                    <div id="fp-audit-loading" style="display:none;font-size:13px;color:#5a5f7a;margin-top:10px;white-space:pre-line;text-align:center;line-height:1.7;padding:20px 0;"></div>

                    <!-- SURVEY STATE -->
                    <div id="fp-audit-survey" style="display:none;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span id="fp-audit-q-num" style="font-size:12px;color:#5a5f7a;"></span>
                            <span id="fp-audit-skip" style="font-size:11px;color:#3a3d52;cursor:pointer;" onclick="document.getElementById('fp-audit-next-btn')?.click()">Пропустить →</span>
                        </div>
                        <div style="height:4px;background:#1e2030;border-radius:2px;margin-bottom:16px;overflow:hidden;">
                            <div id="fp-audit-progress-bar" style="height:100%;background:#6B66FF;width:0;transition:width .3s;border-radius:2px;"></div>
                        </div>
                        <div id="fp-audit-q-container" style="min-height:120px;"></div>
                        <div style="display:flex;gap:8px;margin-top:16px;">
                            <button id="fp-audit-prev-btn" class="btn btn-default" style="flex:1;">← Назад</button>
                            <button id="fp-audit-next-btn" class="btn" style="flex:2;">Далее →</button>
                        </div>
                    </div>

                    <!-- PROCESSING STATE -->
                    <div id="fp-audit-processing" style="display:none;text-align:center;padding:30px 0;color:#5a5f7a;font-size:13px;">
                        <span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg></span> ИИ анализирует ваши ответы и готовит рекомендации...
                    </div>

                    <!-- RESULTS STATE -->
                    <div id="fp-audit-results" style="display:none;overflow-y:auto;max-height:460px;padding-right:4px;"></div>
                </div>

                <div class="fp-tools-page-content" data-page="settings_io">
                    <h3>Импорт и экспорт настроек</h3>
                    <p class="template-info">Сохраните все настройки Foxen в файл и восстановите на другом устройстве или аккаунте.</p>
                    <div style="display:flex;gap:12px;margin-bottom:10px;">
                        <button id="fp-settings-export-btn" class="btn btn-default" style="flex:1;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></span> Экспортировать настройки</button>
                        <button id="fp-settings-import-btn" class="btn btn-default" style="flex:1;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></span> Импортировать настройки</button>
                        <input type="file" id="fp-settings-import-input" accept=".fpconfig,.json" style="display:none;">
                    </div>
                    <button id="fp-settings-export-all-btn" class="btn" style="width:100%;margin-bottom:20px;display:flex;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span> Экспортировать ВСЁ</button>
                    <p class="template-info">Файл сохраняется с расширением <code>.fpconfig</code>. Импорт перезагрузит страницу.</p>
                    <p class="template-info" style="margin-top:-10px;">Экспорт “ВСЁ” не включает чувствительные данные (сессии/куки/аккаунты) и технические/временные данные (тэги, обработанные ID, кэш статистики).</p>

                    <h3 style="margin-top:24px;">Сброс данных</h3>
                    <p class="template-info">Удалить только определённые данные, не затрагивая остальные настройки.</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button id="fp-reset-autoresponder-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить данные автоответчика (обработанные ID)</button>
                        <button id="fp-reset-pinned-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Очистить закреплённые лоты</button>
                        <button id="fp-reset-greeted-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить список поприветствованных чатов</button>
                        <button id="fp-reset-april-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить счётчик даты</button>
                    </div>
                    <div style="margin-top:24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
                        <a href="https://funpay.tools" target="_blank" class="fp-site-footer-link"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></span> funpay.tools</a>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="blacklist">
                    <h3>Чёрный список покупателей</h3>
                    <p class="template-info">Добавьте ненадёжных покупателей. Вы сможете заблокировать на них автоматизаию и уведомления.</p>
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                        <input type="text" id="fp-bl-name-input" placeholder="Имя пользователя FunPay" style="background:#0e0f16;border:1px solid #22253a;border-radius:6px;padding:8px;color:#d8dae8;font-size:13px;outline:none;">
                        <input type="text" id="fp-bl-note-input" placeholder="Причина (необязательно)" style="background:#0e0f16;border:1px solid #22253a;border-radius:6px;padding:8px;color:#d8dae8;font-size:13px;outline:none;">
                        <button id="fp-bl-add-btn" class="btn btn-default">+ Добавить в ЧС</button>
                    </div>
                    <div id="fp-bl-list"></div>
                </div>

                <div class="fp-tools-page-content" data-page="auto_delivery">
                    <h3>Авто-выдача товаров</h3>
                    <p class="template-info">При новом заказе расширение автоматически отправит покупателю товар. Укажите что именно отправлять для каждого лота, или используйте поле «Секреты» лота как источник.</p>
                    <div class="support-promo" style="background:rgba(107,102,255,0.07);border-color:rgba(107,102,255,0.2);margin-bottom:16px;">
                        <span><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .34 2.02 1 2.8.76.76 1.23 1.52 1.41 2.5"></path><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="8" x2="12" y2="10"></line></svg></span></span>
                        <span>Используйте переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{orderlink}</code>, <code>$username</code>, <code>$order_link</code>, <code>$order_id</code>, <code>$sleep=3</code> (пауза в секундах).</span>
                    </div>

                    <div class="checkbox-label-inline" style="margin-bottom:12px;">
                        <input type="checkbox" id="fpAutoRestoreEnabled">
                        <label for="fpAutoRestoreEnabled" style="margin-bottom:0;"><span>Авто-восстановление лотов после деактивации</span></label>
                    </div>
                    <div class="checkbox-label-inline" style="margin-bottom:16px;">
                        <input type="checkbox" id="fpAutoDisableEnabled">
                        <label for="fpAutoDisableEnabled" style="margin-bottom:0;"><span>Авто-деактивация лотов при пустом складе</span></label>
                    </div>

                    <h4>Настройка авто-выдачи по лотам</h4>
                    <p class="template-info">Выберите лот для настройки авто-выдачи. Если лот не настроен — отправляется содержимое поля «Секреты» автоматически.</p>
                    <button id="fp-load-delivery-lots-btn" class="btn btn-default" style="margin-bottom:12px;">Загрузить список лотов</button>
                    <div id="fp-delivery-lots-list"></div>
                </div>

                <div class="fp-tools-page-content" data-page="tickets" style="position:relative;">
                    <style>
                        #fp-tickets-list::-webkit-scrollbar{width:4px}
                        #fp-tickets-list::-webkit-scrollbar-track{background:transparent}
                        #fp-tickets-list::-webkit-scrollbar-thumb{background:#2a2d44;border-radius:4px}
                        #fp-ticket-confirm-text::-webkit-scrollbar{width:4px}
                        #fp-ticket-confirm-text::-webkit-scrollbar-thumb{background:#2a2d44;border-radius:4px}
                        #fp-ticket-age-hours::-webkit-inner-spin-button,#fp-ticket-age-hours::-webkit-outer-spin-button,
                        #fp-ticket-max-orders::-webkit-inner-spin-button,#fp-ticket-max-orders::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
                        #fp-ticket-age-hours,#fp-ticket-max-orders{-moz-appearance:textfield}
                        .fp-tkt-card{background:#0d0e18;border:1px solid #1a1c2e;border-radius:8px;padding:10px 12px;cursor:pointer;transition:border-color .15s,background .15s;}
                        .fp-tkt-card:hover{border-color:#6B66FF;background:#11122a;}
                        .fp-tkt-status{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.3px;}
                        #fp-new-ticket-fields::-webkit-scrollbar{width:4px}
                        #fp-new-ticket-fields::-webkit-scrollbar-track{background:transparent}
                        #fp-new-ticket-fields::-webkit-scrollbar-thumb{background:#2a2d44;border-radius:4px}
                        .fp-field-input{width:100%;background:#0d0e18;border:1px solid #1a1c2e;border-radius:6px;color:#d8dae8;padding:7px 10px;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .15s;}
                        .fp-field-input:focus{border-color:#6B66FF;}
                        .fp-field-input option{background:#0d0e18;color:#d8dae8;}
                    </style>

                    <!-- Header -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <h3 style="margin:0;font-size:15px;">Техподдержка FunPay</h3>
                        <button id="fp-ticket-refresh-btn" title="Обновить" style="background:none;border:none;color:#5a5f7a;cursor:pointer;font-size:16px;padding:2px 6px;transition:color .15s;" onmouseover="this.style.color='#d8dae8'" onmouseout="this.style.color='#5a5f7a'">↻</button>
                    </div>

                    <!-- Auto ticket block -->
                    <div style="background:rgba(107,102,255,0.06);border:1px solid rgba(107,102,255,0.18);border-radius:8px;padding:11px 12px;margin-bottom:12px;">
                        <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#c8c4ff;"><span class="nav-icon" style="display:inline-flex;margin:0 6px 0 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span> Подтверждение заказов</div>
                        <p style="font-size:12px;color:#6a7090;margin:0 0 10px;line-height:1.5;">FunPay не всегда подтверждает заказы автоматически. Кнопка ниже соберёт все ваши неподтверждённые заказы и отправит заявку в ТП с просьбой их подтвердить — вручную делать не надо.</p>
                        <div style="display:flex;gap:10px;margin-bottom:10px;">
                            <label style="font-size:11px;color:#6a7090;display:flex;flex-direction:column;gap:3px;flex:1;">
                                Возраст заказа (ч)
                                <input type="number" id="fp-ticket-age-hours" min="1" max="168" value="24" class="fp-field-input" style="padding:5px 8px;font-size:12px;">
                            </label>
                            <label style="font-size:11px;color:#6a7090;display:flex;flex-direction:column;gap:3px;flex:1;">
                                Заказов в заявке (макс)
                                <input type="number" id="fp-ticket-max-orders" min="1" max="20" value="5" class="fp-field-input" style="padding:5px 8px;font-size:12px;">
                            </label>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button id="fp-send-auto-ticket-btn" class="btn" style="padding:6px 14px;font-size:12px;">Отправить заявку в ТП</button>
                            <span id="fp-auto-ticket-status" style="font-size:11px;color:#5a5f7a;"></span>
                        </div>
                    </div>

                    <!-- Tickets list header -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-size:11px;font-weight:600;color:#3a3d52;text-transform:uppercase;letter-spacing:.5px;">Ваши заявки</span>
                        <button id="fp-create-ticket-btn" class="btn btn-default" style="padding:3px 10px;font-size:11px;">+ Создать заявку</button>
                    </div>

                    <!-- List -->
                    <div id="fp-tickets-list" style="display:flex;flex-direction:column;gap:5px;max-height:240px;overflow-y:auto;"></div>
                    <div id="fp-tickets-empty" style="display:none;text-align:center;color:#3a3d52;font-size:13px;padding:18px 0;">Заявок нет</div>
                    <div id="fp-tickets-loading" style="text-align:center;color:#3a3d52;font-size:12px;padding:14px 0;">Загрузка...</div>

                    <!-- Ticket detail panel -->
                    <div id="fp-ticket-detail-panel" style="display:none;position:absolute;inset:0;background:#111318;z-index:20;box-sizing:border-box;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                        <style>
                            #fp-tdm::-webkit-scrollbar{width:3px}
                            #fp-tdm::-webkit-scrollbar-thumb{background:#2a2d3a;border-radius:3px}
                            #fp-tri{outline:none;caret-color:#6B66FF;background:#23243a !important;border:none !important;box-shadow:none !important;border-radius:0 !important;padding:0 !important;margin:0 !important;}
                            #fp-tri::-webkit-scrollbar{width:2px}
                            #fp-tri::-webkit-scrollbar-thumb{background:#2a2d3a;}
                            .fp-msg-img{max-width:100%;border-radius:8px;margin-top:4px;display:block;cursor:pointer;}
                        </style>
                        <!-- Top bar -->
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#1a1b22;flex-shrink:0;border-bottom:1px solid #0d0e14;">
                            <button id="fp-ticket-detail-back" style="all:unset;position:relative;overflow:hidden;color:#6B66FF;cursor:pointer;font-size:22px;line-height:1;padding:2px 6px 2px 0;flex-shrink:0;">&#8249;</button>
                            <div id="fp-tkt-av" style="width:32px;height:32px;border-radius:50%;background:#23243a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#6B66FF;overflow:hidden;"></div>
                            <div style="flex:1;min-width:0;">
                                <div id="fp-ticket-detail-title" style="font-size:14px;font-weight:600;color:#e8eaf0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;"></div>
                                <div id="fp-ticket-detail-status" style="font-size:11px;margin-top:1px;line-height:1;"></div>
                            </div>
                        </div>
                        <!-- Messages -->
                        <div id="fp-tdm" style="flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:3px;background:#111318;"></div>
                        <!-- Attach preview -->
                        <div id="fp-tapr" style="display:none;flex-shrink:0;padding:6px 12px 0;background:#1a1b22;">
                            <div style="position:relative;display:inline-block;">
                                <img id="fp-tath" style="height:48px;border-radius:6px;border:1px solid #2a2d3a;display:block;" src="" alt="">
                                <button id="fp-tarm" style="all:unset;position:absolute;top:-5px;right:-5px;background:#2a2d3a;border-radius:50%;width:16px;height:16px;color:#9099b8;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">&#x2715;</button>
                            </div>
                        </div>
                        <!-- Input bar -->
                        <div id="fp-tria" style="display:none;flex-shrink:0;align-items:flex-end;gap:6px;padding:6px 10px 8px;background:#111318;">
                            <label id="fp-attach-lbl" style="all:unset;display:flex;align-items:center;justify-content:center;width:34px;height:34px;cursor:pointer;color:#4a4f6a;flex-shrink:0;" title="Прикрепить">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                <input type="file" id="fp-ticket-attach-input" accept="image/*" style="display:none;">
                            </label>
                            <div style="flex:1;background:#23243a;border-radius:20px;padding:7px 14px;display:flex;align-items:flex-end;min-height:36px;box-sizing:border-box;">
                                <textarea id="fp-tri" placeholder="Сообщение..." style="all:unset;-webkit-appearance:none;appearance:none;width:100%;color:#e8eaf0;font-size:13px;line-height:1.45;height:20px;max-height:90px;overflow-y:hidden;font-family:inherit;display:block;resize:none;background:#23243a !important;" rows="1"></textarea>
                            </div>
                            <button id="fp-ticket-reply-btn" style="all:unset;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#6B66FF;cursor:pointer;flex-shrink:0;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" style="margin-left:2px;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                    </div>
                    <!-- Confirm overlay -->
                    <div id="fp-ticket-confirm-overlay" style="display:none;position:absolute;inset:0;background:rgba(5,6,12,0.96);z-index:10;border-radius:8px;padding:18px;box-sizing:border-box;flex-direction:column;gap:10px;">
                        <div style="font-weight:600;font-size:14px;">Проверьте заявку перед отправкой</div>
                        <div style="font-size:11px;color:#6a7090;">Именно это будет отправлено в техподдержку FunPay:</div>
                        <div id="fp-ticket-confirm-text" style="background:#0d0e18;border:1px solid #1a1c2e;border-radius:6px;padding:10px;font-size:12px;color:#c8cadc;white-space:pre-wrap;flex:1;overflow-y:auto;min-height:80px;max-height:180px;line-height:1.5;"></div>
                        <div style="display:flex;gap:8px;margin-top:2px;">
                            <button id="fp-ticket-confirm-yes" class="btn" style="flex:1;font-size:13px;">Отправить</button>
                            <button id="fp-ticket-confirm-no" class="btn btn-default" style="flex:1;font-size:13px;">Отмена</button>
                        </div>
                    </div>

                    <!-- New ticket panel (slides in from bottom) -->
                    <div id="fp-new-ticket-panel" style="display:none;position:absolute;inset:0;background:#0a0b14;z-index:20;border-radius:0;box-sizing:border-box;flex-direction:column;overflow:hidden;">
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;border-bottom:1px solid #1a1c2e;flex-shrink:0;">
                            <span style="font-weight:600;font-size:14px;">Новая заявка</span>
                            <button id="fp-new-ticket-close" style="background:none;border:none;color:#5a5f7a;cursor:pointer;font-size:18px;padding:0 4px;line-height:1;" onmouseover="this.style.color='#d8dae8'" onmouseout="this.style.color='#5a5f7a'">✕</button>
                        </div>
                        <div id="fp-new-ticket-fields" style="display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto;padding:10px 14px;"></div>
                        <div style="flex-shrink:0;padding:8px 14px 12px;border-top:1px solid #1a1c2e;background:#0a0b14;">
                            <button id="fp-new-ticket-submit" class="btn" style="width:100%;font-size:13px;">Далее →</button>
                        </div>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="support" style="padding:0;">
                    <div style="padding:20px;background:linear-gradient(180deg, rgba(30,34,53,0.8) 0%, rgba(20,22,35,0.4) 100%);border-bottom:1px solid rgba(255,255,255,0.05);">
                        <h3 style="margin:0 0 12px;font-size:18px;display:flex;align-items:center;gap:8px;">
                            О расширении Foxen <span class="material-symbols-rounded" style="color:#f4c84a;">star</span>
                        </h3>
                        <p style="font-size:13px;line-height:1.5;margin:0 0 16px;color:#b4b8cc;">Это <strong>самый важный</strong> вклад, который вы можете сделать. Хорошие оценки и звёзды на GitHub — лучшее топливо для новых обновлений и мотивация для разработчика. Пожалуйста, уделите всего минуту!</p>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <a href="https://addons.mozilla.org/ru/firefox/addon/foxen/" target="_blank" class="btn" style="background:#ff7139;color:#fff;border:none;justify-content:center;padding:10px;font-weight:600;"><span class="material-icons" style="font-size:20px;margin-right:8px;">rate_review</span>Оставить отзыв в Mozilla Add-ons</a>
                            <a href="https://github.com/SanoSenpay/Foxen" target="_blank" class="btn btn-default" style="justify-content:center;padding:10px;font-weight:600;"><span class="material-icons" style="font-size:20px;margin-right:8px;color:#f4c84a;">star_rate</span>Поставить звезду на GitHub</a>
                        </div>
                    </div>
                    
                    <div style="padding:20px;">
                        <h4 style="margin:0 0 10px;font-size:14px;color:#8a8e9f;display:flex;align-items:center;gap:6px;">
                            <span class="material-icons" style="font-size:16px;">handshake</span> Благодарность оригиналу
                        </h4>
                        <p style="font-size:12px;line-height:1.5;margin:0 0 14px;color:#7a7e8f;">Foxen является форком невероятного расширения <strong>FunPay Tools</strong> (создано <strong>XaviersDev</strong>, лицензия MIT). В знак благодарности, пожалуйста, оставьте хороший отзыв оригинальному расширению в Chrome Web Store!</p>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <a href="https://chromewebstore.google.com/detail/funpay-tools/pibmnjjfpojnakckilflcboodkndkibb/reviews" target="_blank" class="btn btn-default" style="font-size:12px;padding:8px 12px;justify-content:flex-start;"><span class="material-icons" style="font-size:16px;margin-right:8px;color:#4caf50;">thumb_up</span>Отзыв для FunPay Tools в Chrome Store</a>
                            <a href="https://github.com/XaviersDev/FunPay-Tools" target="_blank" class="btn btn-default" style="font-size:12px;padding:8px 12px;justify-content:flex-start;"><span class="material-icons" style="font-size:16px;margin-right:8px;">code</span>Оригинальный репозиторий GitHub</a>
                            <a href="https://funpay.tools" target="_blank" class="btn btn-default" style="font-size:12px;padding:8px 12px;justify-content:flex-start;"><span class="material-icons" style="font-size:16px;margin-right:8px;">language</span>Официальный сайт funpay.tools</a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div class="fp-tools-footer">
            <button id="saveSettings" class="btn">Сохранить</button>
        </div>
    `;
}
