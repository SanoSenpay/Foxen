// content/ui/main_popup.js
// =============================================================================
// Foxen Modern Redesign UI — Main Window & Navigation Controller
// =============================================================================

function injectFoxenFonts() {
    if (document.getElementById('foxen-fonts')) return;

    const fontPreconnect1 = document.createElement('link');
    fontPreconnect1.rel = 'preconnect';
    fontPreconnect1.href = 'https://fonts.googleapis.com';

    const fontPreconnect2 = document.createElement('link');
    fontPreconnect2.rel = 'preconnect';
    fontPreconnect2.href = 'https://fonts.gstatic.com';
    fontPreconnect2.crossOrigin = 'anonymous';

    const fontLink = document.createElement('link');
    fontLink.id = 'foxen-fonts';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Jim+Nightshade&family=Inter:wght@400;500;600;700&display=swap';

    (document.head || document.documentElement).appendChild(fontPreconnect1);
    (document.head || document.documentElement).appendChild(fontPreconnect2);
    (document.head || document.documentElement).appendChild(fontLink);
}

function getModalOverlaysHTML() {
    return `
        <div class="foxen-modal-overlay" id="autobump-category-modal-overlay" style="display: none; z-index: 20000000;">
            <div class="foxen-modal-content">
                <div class="foxen-modal-header">
                    <h3>Выберите категории для поднятия</h3>
                    <button class="foxen-modal-close" type="button">&times;</button>
                </div>
                <div class="foxen-modal-body">
                    <div class="autobump-modal-controls" style="display:flex;gap:8px;margin-bottom:12px;">
                        <input type="text" id="autobump-category-search" class="fxn-input" placeholder="Поиск по категориям..." style="flex:1;">
                        <button id="autobump-select-all" class="btn btn-ghost" type="button">Выбрать всё</button>
                    </div>
                    <div id="autobump-category-list" class="autobump-category-list" style="max-height:360px;overflow-y:auto;"></div>
                </div>
                <div class="foxen-modal-footer">
                    <button id="autobump-category-save" class="btn btn-solid" type="button">Сохранить</button>
                </div>
            </div>
        </div>

        <div class="foxen-modal-overlay" id="lot-io-export-modal" style="display: none; z-index: 20000000;">
            <div class="foxen-modal-content lot-io-modal-card">
                <div class="foxen-modal-header">
                    <div class="lot-io-modal-header-left">
                        <div class="lot-io-modal-header-icon">
                            <span class="material-symbols-rounded">upload_file</span>
                        </div>
                        <div class="lot-io-modal-header-text">
                            <h3>Экспорт лотов</h3>
                            <p>Резервное копирование в файл JSON</p>
                        </div>
                    </div>
                    <button class="foxen-modal-close" type="button" title="Закрыть">&times;</button>
                </div>
                <div class="foxen-modal-body">
                    <p style="margin-bottom:12px;color:var(--fxn-text-desc);font-size:12.5px;">Выберите категории, лоты из которых вы хотите экспортировать в файл:</p>
                    <div class="autobump-modal-controls" style="margin-bottom:12px;">
                        <button id="lot-io-select-all" class="btn btn-ghost" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;" type="button">
                            <span class="material-symbols-rounded" style="font-size:17px;">checklist</span>
                            <span>Выбрать / снять все</span>
                        </button>
                    </div>
                    <div class="lot-io-category-list" style="max-height:280px;overflow-y:auto;"></div>
                    <div class="lot-io-warning">
                        <span class="material-symbols-rounded">warning</span>
                        <span><b>Внимание!</b> Не закрывайте и не перезагружайте вкладку до завершения экспорта.</span>
                    </div>
                </div>
                <div class="foxen-modal-footer">
                    <button id="lot-io-export-confirm" class="btn btn-solid" style="display:flex;align-items:center;gap:6px;" type="button">
                        <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                        <span>Экспортировать</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="foxen-modal-overlay" id="lot-io-import-progress-modal" style="display: none; z-index: 20000000;">
            <div class="foxen-modal-content lot-io-modal-card">
                <div class="foxen-modal-header">
                    <div class="lot-io-modal-header-left">
                        <div class="lot-io-modal-header-icon">
                            <span class="material-symbols-rounded">cloud_sync</span>
                        </div>
                        <div class="lot-io-modal-header-text">
                            <h3>Импорт лотов</h3>
                            <p>Создание и публикация предложений на FunPay</p>
                        </div>
                    </div>
                    <button class="foxen-modal-close" id="lot-io-close-modal-btn" type="button" title="Закрыть">&times;</button>
                </div>
                <div class="foxen-modal-body">
                    <div id="lot-io-progress-summary"></div>
                    <div class="lot-io-progress-list"></div>
                </div>
                <div class="foxen-modal-footer">
                    <div id="lot-io-postpone-controls">
                        <button id="lot-io-postpone-btn" class="btn btn-ghost" type="button" style="display:flex;align-items:center;gap:6px;">
                            <span class="material-symbols-rounded" style="font-size:16px;">schedule</span>
                            <span>Отложить на 24 ч</span>
                        </button>
                    </div>
                    <div class="lot-io-footer-actions">
                        <button id="lot-io-continue-btn" class="btn btn-solid" style="display:none;align-items:center;gap:6px;" type="button">
                            <span class="material-symbols-rounded" style="font-size:16px;">play_arrow</span>
                            <span>Продолжить</span>
                        </button>
                        <button id="lot-io-cancel-btn" class="btn btn-ghost" type="button">Отменить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getFoxenLogoUrl(isLight = false) {
    const file = isLight ? 'icons/logo_dark.png' : 'icons/logo.png';
    return (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL(file)
        : file;
}

function createMainPopup() {
    injectFoxenFonts();

    // Clean up any stale/orphaned inspector modal outside .foxen-popup
    const staleInspector = document.getElementById('foxen-menu-settings-modal');
    if (staleInspector && staleInspector.parentElement && !staleInspector.closest('.foxen-popup')) {
        staleInspector.remove();
    }

    let popup = document.querySelector('.foxen-popup');
    if (popup) return popup;

    const logoUrl = getFoxenLogoUrl(false);

    const cachedScrim = (() => {
        try {
            return localStorage.getItem('foxenScrimEnabled') ?? sessionStorage.getItem('foxenScrimEnabled');
        } catch (_) { return null; }
    })();
    const isScrimDisabled = cachedScrim === 'false';

    popup = document.createElement('div');
    popup.id = 'foxenMainPopup';
    popup.className = 'foxen-popup fxn-popup' + (isScrimDisabled ? ' fxn-no-scrim' : '');
    popup.innerHTML = `
        <div class="scrim"></div>

        <div class="window">
            <div class="titlebar">
                <div class="titlebar-title"></div>
                <div class="titlebar-actions" style="display:flex;align-items:center;gap:8px;margin-left:auto;">
                    <div class="traffic">
                        <span class="traffic-min" title="Превратить в стильный Dockbar (вместо кнопки в меню)"></span>
                        <span class="traffic-max" title="Развернуть / Обычный размер"></span>
                        <span class="traffic-close fxn-popup-close" title="Закрыть (Esc)"></span>
                    </div>
                </div>
            </div>

            <div class="body">
                <!-- ================= SIDEBAR ================= -->
                <nav class="sidebar">
                    <div class="brand">
                        <img class="brand-logo" src="${logoUrl}" alt="Foxen Logo" onerror="this.src='https://funpay.com/img/layout/avatar.png'">
                        <div class="brand-name">
                            <div class="t1">FOXEN</div>
                            <div class="t2">Extension</div>
                        </div>
                    </div>

                    <div class="sidebar-divider"></div>

                    <div class="search">
                        <span class="material-symbols-rounded">search</span>
                        <input type="text" placeholder="Поиск настроек..." id="searchInput" autocomplete="off">
                    </div>

                    <!-- SIDEBAR NAVIGATION ACCORDION -->
                    <div class="nav" id="nav">
                        <!-- Group 1: Главная & Настройки -->
                        <div class="nav-group open" data-group="main">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">tune</span></div>
                                <div class="nav-text">Главная & Настройки</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem active" data-target="general"><span class="dot"></span>Общие настройки</div>
                                <div class="nav-subitem" data-target="accounts"><span class="dot"></span>Мульти-аккаунты</div>
                                <div class="nav-subitem" data-target="settings_io"><span class="dot"></span>Экспорт / Импорт</div>
                                <div class="nav-subitem" data-target="needs"><span class="dot"></span>Мастер настройки</div>
                            </div>
                        </div>

                        <!-- Group 2: Торговля & Лоты -->
                        <div class="nav-group" data-group="seller">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">storefront</span></div>
                                <div class="nav-text">Торговля & Лоты</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="lot_io"><span class="dot"></span>Управление лотами</div>
                                <div class="nav-subitem" data-target="autobump"><span class="dot"></span>Авто-поднятие</div>
                                <div class="nav-subitem" data-target="auto_delivery"><span class="dot"></span>Авто-выдача</div>
                            </div>
                        </div>

                        <!-- Group 3: Чат & Клиенты -->
                        <div class="nav-group" data-group="chat">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">forum</span></div>
                                <div class="nav-text">Чат & Клиенты</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="auto_review"><span class="dot"></span>Авто-ответчик & Отзывы</div>
                                <div class="nav-subitem" data-target="templates"><span class="dot"></span>Шаблоны ответов</div>
                                <div class="nav-subitem" data-target="slash_commands"><span class="dot"></span>Слэш-команды</div>
                                <div class="nav-subitem" data-target="blacklist"><span class="dot"></span>Чёрный список</div>
                            </div>
                        </div>

                        <!-- Group 4: Финансы & Инструменты -->
                        <div class="nav-group" data-group="tools">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">account_balance_wallet</span></div>
                                <div class="nav-text">Финансы & Расчёты</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="calculator"><span class="dot"></span>Калькулятор комиссий</div>
                                <div class="nav-subitem" data-target="currency_calc"><span class="dot"></span>Курсы валют</div>
                                <div class="nav-subitem" data-target="piggy_banks"><span class="dot"></span>Копилки целей</div>
                                <div class="nav-subitem" data-target="notes"><span class="dot"></span>Личные заметки</div>
                            </div>
                        </div>

                        <!-- Group 5: Интеграции & ИИ -->
                        <div class="nav-group" data-group="integrations">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">hub</span></div>
                                <div class="nav-text">Интеграции & ИИ</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="telegram"><span class="dot"></span>Telegram-бот</div>
                                <div class="nav-subitem" data-target="ai_settings"><span class="dot"></span>Нейросеть (ИИ)</div>
                                <div class="nav-subitem" data-target="tickets"><span class="dot"></span>Тикеты FunPay <span style="font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,0.08);color:#ffffff;border:1px solid rgba(255,255,255,0.18);margin-left:auto;letter-spacing:0.04em;">DEV</span></div>
                            </div>
                        </div>

                        <!-- Group 6: Кастомизация -->
                        <div class="nav-group" data-group="customization">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">palette</span></div>
                                <div class="nav-text">Кастомизация & Стиль</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="theme"><span class="dot"></span>Внешний вид</div>
                                <div class="nav-subitem" data-target="theme_gallery"><span class="dot"></span>Каталог тем <span style="font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,0.08);color:#ffffff;border:1px solid rgba(255,255,255,0.18);margin-left:auto;letter-spacing:0.04em;">DEV</span></div>
                                <div class="nav-subitem" data-target="effects"><span class="dot"></span>Эффекты & Курсор</div>
                            </div>
                        </div>

                        <!-- Group 7: Справка & О проекте -->
                        <div class="nav-group" data-group="help">
                            <div class="nav-item cat">
                                <div class="nav-icon"><span class="material-symbols-rounded">help</span></div>
                                <div class="nav-text">Справка & О проекте</div>
                                <div class="nav-chevron"></div>
                            </div>
                            <div class="nav-sub">
                                <div class="nav-subitem" data-target="overview"><span class="dot"></span>Обучение & Тур</div>
                                <div class="nav-subitem" data-target="support"><span class="dot"></span>Поддержка проекта</div>
                            </div>
                        </div>
                    </div>

                    <!-- Account status in footer -->
                    <div class="account">
                        <div class="account-row" id="fxnSidebarAccountWidget" title="Нажмите для просмотра полного профиля">
                            <div class="avatar"><img src="${logoUrl}" alt="Avatar" id="fxnSidebarAvatar"></div>
                            <div class="account-text">
                                <div class="name"><span id="fxnSidebarUsername">Foxen User</span> <span class="account-tag" id="fxnSidebarTag">PREMIUM</span></div>
                                <div class="sub" id="fxnSidebarSub">v3.4.0 active</div>
                            </div>
                            <div class="chevron"></div>
                        </div>
                    </div>

                    <!-- Sidebar Profile Modal (Strictly contained within sidebar) -->
                    <div class="fxn-sidebar-profile-modal" id="fxnSidebarProfileModal" aria-hidden="true">
                        <div class="fxn-spm-header">
                            <button type="button" class="fxn-spm-icon-btn" id="fxnSpmBackBtn" title="Назад (Esc)">
                                <span class="material-symbols-rounded">arrow_back</span>
                            </button>
                            <span class="fxn-spm-title">Профиль</span>
                            <button type="button" class="fxn-spm-icon-btn" id="fxnSpmRefreshBtn" title="Обновить данные из БД">
                                <span class="material-symbols-rounded">refresh</span>
                            </button>
                        </div>

                        <div class="fxn-spm-scroll">
                            <!-- Hero User Card -->
                            <div class="fxn-spm-card fxn-spm-hero-card">
                                <div class="fxn-spm-avatar-wrap">
                                    <img src="${logoUrl}" alt="Avatar" id="fxnSpmAvatar" class="fxn-spm-avatar">
                                    <span class="fxn-spm-online-dot" id="fxnSpmOnlineDot" title="Онлайн"></span>
                                </div>
                                <div class="fxn-spm-hero-info">
                                    <div class="fxn-spm-username-row">
                                        <span class="fxn-spm-username" id="fxnSpmUsername">Foxen User</span>
                                    </div>
                                    <div class="fxn-spm-id-row">
                                        <span class="fxn-spm-mono-tag" id="fxnSpmFoxenId">FX-000000</span>
                                        <button type="button" class="fxn-spm-copy-btn" id="fxnSpmCopyIdBtn" title="Скопировать Foxen ID">
                                            <span class="material-symbols-rounded">content_copy</span>
                                        </button>
                                    </div>
                                    <div class="fxn-spm-fpid-row">
                                        <a href="#" target="_blank" class="fxn-spm-link" id="fxnSpmFpUserLink">
                                            <span>FunPay ID: <b id="fxnSpmFpUserId">—</b></span>
                                            <span class="material-symbols-rounded">open_in_new</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- Subscription Card -->
                            <div class="fxn-spm-card">
                                <div class="fxn-spm-card-header">
                                    <div class="fxn-spm-card-title">
                                        <span class="material-symbols-rounded">military_tech</span>
                                        <span>Подписка Foxen</span>
                                    </div>
                                </div>
                                <div class="fxn-spm-meta-list">
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Тариф</span>
                                        <span class="fxn-spm-val fxn-spm-plan-smallcaps" id="fxnSpmSubPlan">PREMIUM</span>
                                    </div>
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Статус</span>
                                        <span class="fxn-spm-val fxn-spm-status-wrap">
                                            <span class="fxn-spm-status-dot active" id="fxnSpmStatusDot"></span>
                                            <span id="fxnSpmSubStatus">Активна</span>
                                        </span>
                                    </div>
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Действует до</span>
                                        <span class="fxn-spm-val" id="fxnSpmSubExpiry">Бессрочно</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Ecosystem & Integrations Card -->
                            <div class="fxn-spm-card">
                                <div class="fxn-spm-card-header">
                                    <div class="fxn-spm-card-title">
                                        <span class="material-symbols-rounded">hub</span>
                                        <span>Экосистема</span>
                                    </div>
                                </div>
                                <div class="fxn-spm-meta-list">
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Telegram</span>
                                        <span class="fxn-spm-val" id="fxnSpmTgUser">Не привязан</span>
                                    </div>
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Верификация</span>
                                        <span class="fxn-spm-val" id="fxnSpmVerifiedText">Базовая</span>
                                    </div>
                                    <div class="fxn-spm-meta-row fxn-spm-clickable-row" id="fxnSpmEffectRow" title="Нажмите, чтобы настроить эффекты в меню">
                                        <span class="fxn-spm-label">Эффект ника</span>
                                        <span class="fxn-spm-val" id="fxnSpmEffectVal">Стандарт</span>
                                    </div>
                                    <div class="fxn-spm-meta-row">
                                        <span class="fxn-spm-label">Регистрация</span>
                                        <span class="fxn-spm-val" id="fxnSpmCreatedAt">—</span>
                                    </div>
                                </div>
                            </div>

                            <!-- FunPay Stats Card -->
                            <div class="fxn-spm-card" id="fxnSpmStatsCard">
                                <div class="fxn-spm-card-header">
                                    <div class="fxn-spm-card-title">
                                        <span class="material-symbols-rounded">analytics</span>
                                        <span>FunPay статистика</span>
                                    </div>
                                    <button type="button" class="fxn-spm-icon-btn" id="fxnSpmStatsBtn" title="Открыть профиль на FunPay">
                                        <span class="material-symbols-rounded">open_in_new</span>
                                    </button>
                                </div>
                                <div class="fxn-spm-grid-stats">
                                    <div class="fxn-spm-stat-box" id="fxnSpmRatingBox" title="Рейтинг продавца на FunPay (нажмите для перехода)">
                                        <div class="fxn-spm-stat-val">
                                            <span class="fxn-spm-star">★</span>
                                            <span id="fxnSpmRatingVal">5.0</span>
                                        </div>
                                        <div class="fxn-spm-stat-lbl">Рейтинг</div>
                                    </div>
                                    <div class="fxn-spm-stat-box" id="fxnSpmReviewsBox" title="Отзывы покупателей на FunPay (нажмите для перехода)">
                                        <div class="fxn-spm-stat-val">
                                            <span class="material-symbols-rounded fxn-spm-reviews-icon">rate_review</span>
                                            <span id="fxnSpmReviewsVal">—</span>
                                        </div>
                                        <div class="fxn-spm-stat-lbl">Отзывы</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                <!-- ================= CONTENT PANELS ================= -->
                <div class="content fxn-content-area" id="fxn-content-area">

                    <!-- PANEL 1: ОБЩИЕ НАСТРОЙКИ (GENERAL) -->
                    <section class="panel active foxen-page-content" id="general" data-page="general">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">settings</span></div>
                                <div>
                                    <div class="crumb">Главная & Настройки</div>
                                    <h1>Общие настройки</h1>
                                    <p>Базовые параметры отображения и поведение расширения</p>
                                </div>
                                <div class="status-pill on"><span class="material-symbols-rounded">check_circle</span><span>АКТИВНО</span></div>
                            </div>

                            <div class="section-label">Интерфейс и статистика</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">bar_chart</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Статистика продаж</div>
                                        <div class="row-sub">Отображать подробные графики и статистику в разделе «Продажи»</div>
                                    </div>
                                    <button class="switch on" id="showSalesStatsCheckbox" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">account_balance</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Статистика финансов</div>
                                        <div class="row-sub">Отображать детальную статистику доходов и расходов в «Финансы»</div>
                                    </div>
                                    <button class="switch on" id="showFinanceStatsCheckbox" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">visibility_off</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Скрыть баланс</div>
                                        <div class="row-sub">Маскировать точную сумму баланса в шапке сайта для стримов и скриншотов</div>
                                    </div>
                                    <button class="switch" id="hideBalanceCheckbox" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">dashboard</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Кастомная главная страница</div>
                                        <div class="row-sub">Применить современную домашнюю страницу FunPay с улучшенным поиском</div>
                                    </div>
                                    <button class="switch on" id="enableRedesignedHomepageGeneral" data-toggle></button>
                                </div>
                            </div>

                            <div class="section-label">Торговля и автоматизация</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">autorenew</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Авто-восстановление лотов</div>
                                        <div class="row-sub">Автоматически возвращать деактивированные лоты при пополнении остатка</div>
                                    </div>
                                    <button class="switch on" id="fpAutoRestoreEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">pause_circle</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Авто-деактивация лотов</div>
                                        <div class="row-sub">Скрывать лоты при исчерпании остатка товара</div>
                                    </div>
                                    <button class="switch" id="fpAutoDisableEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">edit_note</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Быстрое редактирование цен</div>
                                        <div class="row-sub">Возможность менять цену прямо в таблице предложений без захода в лот</div>
                                    </div>
                                    <button class="switch on" id="foxenInlinePriceEditor" data-toggle></button>
                                </div>
                            </div>

                            <div class="section-label">Чат и общение</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">reply</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Быстрый ответ и цитирование</div>
                                        <div class="row-sub">Кнопка ответа на конкретные сообщения покупателя в чате</div>
                                    </div>
                                    <button class="switch on" id="foxenChatReply" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">sticky_note_2</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Заметки к лотам в чате</div>
                                        <div class="row-sub">Отображать ваши подсказки и заметки к товару прямо в диалоге</div>
                                    </div>
                                    <button class="switch on" id="foxenChatLotNotes" data-toggle></button>
                                </div>
                            </div>

                            <div class="section-label">Звуковые уведомления & аудио</div>
                            <div class="fxn-sound-section-card">
                                <div class="fxn-sound-header">
                                    <div class="fxn-sound-header-left">
                                        <div class="fxn-sound-header-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M12 3v18"></path>
                                                <path d="M8 8v8"></path>
                                                <path d="M4 11v2"></path>
                                                <path d="M16 6v12"></path>
                                                <path d="M20 10v4"></path>
                                            </svg>
                                        </div>
                                        <div class="fxn-sound-header-text">
                                            <div class="fxn-sound-crumb">ЗВУКОВЫЕ УВЕДОМЛЕНИЯ & АУДИО</div>
                                            <h2 class="fxn-sound-title">Звук уведомлений</h2>
                                            <p class="fxn-sound-desc">Сигнал при новых сообщениях и заказах</p>
                                        </div>
                                    </div>
                                    <button id="testNotificationSound" class="fxn-sound-preview-action-btn" type="button" title="Прослушать текущий выбранный звук">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="5 3 19 12 5 21 5 3"/>
                                        </svg>
                                        <span>Прослушать</span>
                                    </button>
                                </div>

                                <input type="hidden" id="notificationSound" value="default">

                                <div class="fxn-sound-grid-container">
                                    <div class="fxn-sound-chips-grid" id="fxnSoundChips">
                                        <!-- 1: Default -->
                                        <button type="button" class="fxn-vireon-sound-chip active" data-sound="default">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M4 4l3 8-4 5c0 0 5 3 9 3s9-3 9-3l-4-5 3-8-6 3-3-2-3 2-6-3z"/>
                                                    <circle cx="9" cy="13" r="1" fill="currentColor"/>
                                                    <circle cx="15" cy="13" r="1" fill="currentColor"/>
                                                    <path d="M12 16a1 1 0 0 0 0-2 1 1 0 0 0 0 2z" fill="currentColor"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">Default</span>
                                            </div>
                                        </button>

                                        <!-- 2: Telegram -->
                                        <button type="button" class="fxn-vireon-sound-chip" data-sound="tg">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">Telegram</span>
                                            </div>
                                        </button>

                                        <!-- 3: ВКонтакте -->
                                        <button type="button" class="fxn-vireon-sound-chip" data-sound="vk">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.405.894-1.182-.825-2.61-3.753-5.289-3.741-5.713.067-.424.965-1.282 2.833-3.924 1.848-2.609 2.088-4.175 1.258-4.175h-3.166c-.663 0-.965.311-1.222.954-.836 2.15-2.35 4.316-2.948 4.316-.222 0-.323-.102-.323-.662V7.126c0-.895-.262-1.126-.826-1.126h-4.966c-.516 0-.825.385-.825.75 0 .71.954.873 1.053 2.87v4.338c0 .951-.171 1.125-.547 1.125-.998 0-3.424-3.666-4.869-7.864-.277-.808-.557-1.137-1.37-1.137H2.47c-.83 0-.996.39-.996.822 0 .769.985 4.606 4.582 9.697 2.399 3.447 5.776 5.393 7.106 5.393z"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">ВКонтакте</span>
                                            </div>
                                        </button>

                                        <!-- 4: iPhone -->
                                        <button type="button" class="fxn-vireon-sound-chip" data-sound="iphone">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.92-2.84-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.71-.93 2.72.99.08 2.02-.48 2.64-1.23z"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">iPhone</span>
                                            </div>
                                        </button>

                                        <!-- 5: Discord -->
                                        <button type="button" class="fxn-vireon-sound-chip" data-sound="discord">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">Discord</span>
                                            </div>
                                        </button>

                                        <!-- 6: WhatsApp -->
                                        <button type="button" class="fxn-vireon-sound-chip" data-sound="whatsapp">
                                            <div class="fxn-sound-chip-lead">
                                                <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                                </svg>
                                                <span class="fxn-sound-chip-title">WhatsApp</span>
                                            </div>
                                        </button>
                                    </div>

                                    <!-- 7: Своя мелодия -->
                                    <button type="button" class="fxn-vireon-sound-chip fxn-vireon-sound-chip-full" data-sound="custom">
                                        <div class="fxn-sound-chip-lead">
                                            <svg class="fxn-sound-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M9 18V5l12-2v13"></path>
                                                <circle cx="6" cy="18" r="3"></circle>
                                                <circle cx="18" cy="16" r="3"></circle>
                                            </svg>
                                            <span class="fxn-sound-chip-title">Своя мелодия</span>
                                            <span class="fxn-sound-chip-badge">Пользовательский WAV</span>
                                        </div>
                                    </button>
                                </div>

                                <!-- Volume Slider Section -->
                                <div class="fxn-sound-volume-wrap">
                                    <div class="fxn-sound-volume-header">
                                        <div class="fxn-sound-volume-left">
                                            <svg class="fxn-sound-vol-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                            </svg>
                                            <span class="fxn-sound-vol-label">Громкость звука</span>
                                        </div>
                                        <span id="notificationVolumeValue" class="fxn-sound-vol-value">100%</span>
                                    </div>
                                    <input type="range" id="notificationVolume" min="0" max="100" value="100" class="fxn-vireon-slider">
                                </div>


                                <!-- Custom Sound Waveform Editor Container -->
                                <div id="fxnCustomSoundBlock" class="fxn-custom-sound-box fxn-hidden" style="display:none !important;">
                                    <div class="fxn-custom-sound-top">
                                        <div class="fxn-custom-sound-meta">
                                            <div class="fxn-custom-sound-title">Своя мелодия для уведомлений</div>
                                            <div class="fxn-custom-sound-file" id="fxnCustomSoundFileName">Файл не выбран</div>
                                        </div>
                                        <input type="file" id="fxnCustomSoundInput" accept="audio/*" style="display:none;">
                                        <button type="button" id="fxnCustomSoundUploadBtn" class="fxn-sound-btn-upload">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                <polyline points="17 8 12 3 7 8"/>
                                                <line x1="12" y1="3" x2="12" y2="15"/>
                                            </svg>
                                            <span>Загрузить аудиофайл</span>
                                        </button>
                                    </div>

                                    <div id="fxnCustomSoundEditor" style="display:none;">
                                        <div class="fxn-custom-sound-editor-header">
                                            <span class="fxn-custom-sound-range" id="fxnCustomSoundRange">0:00 - 0:05 (5.0 сек)</span>
                                            <span class="fxn-custom-sound-hint">Потяните за края для обрезки</span>
                                        </div>

                                        <div id="fxnWaveWrap" class="fxn-wave-wrapper">
                                            <canvas id="fxnWaveCanvas" class="fxn-wave-canvas"></canvas>
                                            <div id="fxnWaveSel" class="fxn-wave-selection"></div>
                                            <div id="fxnWaveSelHandleL" class="fxn-wave-handle handle-left" title="Начало отрезка"></div>
                                            <div id="fxnWaveSelHandleR" class="fxn-wave-handle handle-right" title="Конец отрезка"></div>
                                            <div id="fxnWavePlayhead" class="fxn-wave-playhead" style="display:none;"></div>
                                        </div>

                                        <div class="fxn-custom-sound-actions">
                                            <button type="button" id="fxnCustomSoundPreviewBtn" class="fxn-sound-action-subbtn">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                                </svg>
                                                <span>Прослушать отрезок</span>
                                            </button>
                                            <button type="button" id="fxnCustomSoundSaveBtn" class="fxn-sound-action-subbtn fxn-save-subbtn">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                                    <polyline points="17 21 17 13 7 13 7 21"/>
                                                    <polyline points="7 3 7 8 15 8"/>
                                                </svg>
                                                <span>Сохранить мелодию</span>
                                            </button>
                                        </div>

                                        <div id="fxnCustomSoundSaved" class="fxn-custom-sound-saved-alert" style="display:none;">
                                            ✓ Мелодия (<span id="fxnCustomSoundSavedLen">5.0</span> сек) сохранена и установлена
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="section-label">Discord Webhook логирование</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">notifications_active</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Отправка логов в Discord</div>
                                        <div class="row-sub">Уведомления о продажах, заказах и событиях в ваш Discord сервер</div>
                                    </div>
                                    <button class="switch" id="discordLogEnabled" data-toggle></button>
                                </div>
                            </div>
                            <div id="discordSettingsContainer" class="group" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                                <div>
                                    <label class="field-label">Discord Webhook URL</label>
                                    <input type="text" id="discordWebhookUrl" class="fxn-input" placeholder="https://discord.com/api/webhooks/..." style="width:100%;">
                                </div>
                                <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
                                    <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--fxn-text-main);">
                                        <button class="switch" id="discordPingEveryone" data-toggle type="button"></button>
                                        <span style="cursor:pointer;" onclick="document.getElementById('discordPingEveryone')?.click()">Пинг @everyone</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--fxn-text-main);">
                                        <button class="switch" id="discordPingHere" data-toggle type="button"></button>
                                        <span style="cursor:pointer;" onclick="document.getElementById('discordPingHere')?.click()">Пинг @here</span>
                                    </div>
                                </div>
                                <button id="testDiscordWebhookBtn" class="btn btn-ghost" type="button" style="align-self:flex-start;"><span class="material-symbols-rounded">send</span>Отправить тест в Discord</button>
                            </div>

                            <div class="section-label">Идентификация и приватность</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">fingerprint</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Идентификатор Foxen</div>
                                        <div class="row-sub">Отображать метку «Foxen» у собеседников, которые также пользуются расширением</div>
                                    </div>
                                    <button class="switch on" id="fxnIdentifierEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">bug_report</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Локальная телеметрия ошибок</div>
                                        <div class="row-sub">Автоматический сбор и исправление непредвиденных сбоев скрипта</div>
                                    </div>
                                    <button class="switch on" id="fxnTelemetryEnabled" data-toggle></button>
                                </div>
                            </div>

                        </div>
                    </section>

                    <!-- PANEL 2: ЧТО ТЕБЕ НУЖНО (NEEDS) -->
                    <section class="panel foxen-page-content" id="needs" data-page="needs">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">tune</span></div>
                                <div>
                                    <div class="crumb">Главная & Настройки</div>
                                    <h1>Что тебе нужно</h1>
                                    <p>Персональный конфигуратор функций: включите только необходимые инструменты</p>
                                </div>
                            </div>

                            <div id="fxn-needs-features-container"></div>
                        </div>
                    </section>

                    <!-- PANEL 3: АККАУНТЫ (ACCOUNTS) -->
                    <section class="panel foxen-page-content" id="accounts" data-page="accounts">
                        <div class="panel-body fxn-vireon-panel-body">
                            <button id="addCurrentAccountBtn" class="fxn-vireon-add-btn" type="button">
                                <div class="fxn-vireon-add-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </div>
                                <span>Добавить текущий аккаунт в список</span>
                            </button>

                            <div class="fxn-vireon-sec-label">СОХРАНЕННЫЕ ПРОФИЛИ</div>
                            <div id="foxenAccountsList" class="fxn-vireon-cards-list"></div>

                            <button id="foxenCleanLogoutBtn" class="fxn-vireon-logout-btn" type="button">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                </svg>
                                <span>Выйти из аккаунта FunPay (очистить куки)</span>
                            </button>
                        </div>
                    </section>

                    <!-- PANEL: СПРАВКА & ТУР (OVERVIEW) -->
                    <section class="panel foxen-page-content" id="overview" data-page="overview">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">info</span></div>
                                <div>
                                    <div class="crumb">Справка & О проекте</div>
                                    <h1>Справка & Видео-тур</h1>
                                    <p>Полный справочник по всем возможностям расширения Foxen</p>
                                </div>
                            </div>

                            <div class="preview-card" style="text-align:center;padding:48px 24px;">
                                <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:rgba(192,38,211,0.12);color:var(--fxn-primary-hover,#d946ef);margin-bottom:16px;">
                                    <span class="material-symbols-rounded" style="font-size:32px;">hourglass_top</span>
                                </div>
                                <div style="font-size:16px;font-weight:600;color:var(--fxn-text-main);margin-bottom:8px;">Готовим обзор...</div>
                                <p style="font-size:13px;color:var(--fxn-text-desc);max-width:440px;margin:0 auto;line-height:1.5;">Мы обновляем интерактивный тур и справочные материалы под новую версию Foxen. Скоро здесь появится актуальный обзор возможностей расширения.</p>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL 5: ПОДДЕРЖКА (SUPPORT) -->
                    <section class="panel foxen-page-content" id="support" data-page="support">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">favorite</span></div>
                                <div>
                                    <div class="crumb">Справка & О проекте</div>
                                    <h1>Поддержка проекта</h1>
                                    <p>Поставьте оценку или звезду на GitHub — это помогает развивать расширение!</p>
                                </div>
                            </div>

                            <div class="preview-card">
                                <div class="preview-label">ОТЗЫВ И ЗВЕЗДА</div>
                                <div style="font-size:14px;color:var(--fxn-text-main);font-weight:600;margin-bottom:6px;">Понравился Foxen?</div>
                                <p style="font-size:12.5px;color:var(--fxn-text-desc);margin-bottom:16px;">Ваш положительный отзыв в каталоге или звезда на GitHub — лучшая благодарность разработчику.</p>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <a href="https://addons.mozilla.org/ru/firefox/addon/foxen/" target="_blank" class="btn btn-solid" style="background:#ff7139;color:#fff;"><span class="material-symbols-rounded">rate_review</span>Отзыв в Mozilla Add-ons</a>
                                    <a href="https://github.com/SanoSenpay/Foxen" target="_blank" class="btn btn-ghost"><span class="material-symbols-rounded">star</span>Звезда на GitHub</a>
                                </div>
                            </div>

                            <div class="section-label">Благодарность оригиналу</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">handshake</span></div>
                                    <div class="row-text">
                                        <div class="row-title">FunPay Tools by XaviersDev</div>
                                        <div class="row-sub">Foxen основан на форке отличного проекта FunPay Tools (лицензия MIT).</div>
                                    </div>
                                    <a href="https://funpay.tools" target="_blank" class="btn btn-ghost">Сайт оригинала</a>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL 6: АВТО-ПОДНЯТИЕ (AUTOBUMP) -->
                    <section class="panel foxen-page-content" id="autobump" data-page="autobump">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">rocket_launch</span></div>
                                <div>
                                    <div class="crumb">Торговля & Лоты</div>
                                    <h1>Авто-Поднятие лотов</h1>
                                    <p>Автоматическое поднятие ваших предложений по настраиваемому таймеру</p>
                                </div>
                            </div>

                            <div class="section-label">Параметры автоподнятия</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">power_settings_new</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить авто-поднятие</div>
                                        <div class="row-sub">Автоматически поднимать лоты в фоне при открытом браузере</div>
                                    </div>
                                    <button class="switch" id="autoBumpEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">schedule</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Интервал поднятия (минуты)</div>
                                        <div class="row-sub">Минимум 5 мин. Рекомендуется 245 мин (раз в 4 часа + 5 мин запас)</div>
                                    </div>
                                    <input type="number" id="autoBumpCooldown" class="fxn-input" style="width:100px;text-align:right;" min="5" value="245">
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">checklist</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Выборочное поднятие категорий</div>
                                        <div class="row-sub">Поднимать только конкретно выбранные вами категории</div>
                                    </div>
                                    <button class="switch" id="selectiveBumpEnabled" data-toggle></button>
                                </div>
                                <div class="row" id="fxnSelectCategoriesRow">
                                    <div class="row-icon"><span class="material-symbols-rounded">category</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Список выбранных категорий</div>
                                        <div class="row-sub">Нажмите для выбора категорий для поднятия</div>
                                    </div>
                                    <button id="configureSelectiveBumpBtn" class="btn btn-ghost" type="button">Выбрать...</button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">bolt</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Только категории с автовыдачей</div>
                                        <div class="row-sub">Поднимать только разделы, где есть товары со значком молнии</div>
                                    </div>
                                    <button class="switch" id="bumpOnlyAutoDelivery" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">auto_awesome</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Умное авто-поднятие</div>
                                        <div class="row-sub">Рандомизация задержки (±1–4 мин) для естественного поведения</div>
                                    </div>
                                    <button class="switch on" id="foxenSmartBumpEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div class="section-label">Консоль событий</div>
                            <div id="autoBumpConsole" class="foxen-console">Ожидание запуска сервиса автоподнятия...</div>
                        </div>
                    </section>

                    <!-- PANEL 7: АВТО-ОТВЕТЫ (AUTO_REVIEW) -->
                    <section class="panel foxen-page-content" id="auto_review" data-page="auto_review">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">smart_toy</span></div>
                                <div>
                                    <div class="crumb">Чат & Клиенты</div>
                                    <h1>Авто-Ответы & Автоответчик</h1>
                                    <p>Автоматические ответы на отзывы 1–5 звезд, приветствия и новые заказы</p>
                                </div>
                            </div>

                            <div class="template-variables-guide" style="background:rgba(255,255,255,0.03);border:1px solid var(--fxn-divider-color);border-radius:12px;padding:14px 16px;margin:16px 0;">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                                    <div style="font-size:12.5px;font-weight:700;color:var(--fxn-text-main);">Переменные для автоответов:</div>
                                    <span style="font-size:11px;color:var(--fxn-text-subtle);">📋 Кликните на тег для копирования</span>
                                </div>
                                <div class="fxn-var-chips-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
                                    <div class="fxn-var-item" data-code="{buyername}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{buyername}</span>
                                        <span class="var-desc">Имя покупателя</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{sellername}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{sellername}</span>
                                        <span class="var-desc">Ваш ник продавца</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{lotname}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{lotname}</span>
                                        <span class="var-desc">Название товара / лота</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{category}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{category}</span>
                                        <span class="var-desc">Категория / игра</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{orderid}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{orderid}</span>
                                        <span class="var-desc">Номер заказа (#ABC12345)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{orderlink}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{orderlink}</span>
                                        <span class="var-desc">Ссылка на страницу заказа</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{date}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{date}</span>
                                        <span class="var-desc">Текущая дата</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{time}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{time}</span>
                                        <span class="var-desc">Текущее время</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{welcome}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{welcome}</span>
                                        <span class="var-desc">Приветствие («Доброе утро»)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{rating}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{rating}</span>
                                        <span class="var-desc">Оценка отзыва (звёзды ★)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{вариант 1|вариант 2|вариант 3}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{вариант 1|вариант 2}</span>
                                        <span class="var-desc">Случайный выбор (Spintax)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="section-label">Ответы на отзывы</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">reviews</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Авто-ответ на отзывы</div>
                                        <div class="row-sub">Мгновенный ответ покупателю в зависимости от оценки</div>
                                    </div>
                                    <button class="switch" id="autoReviewEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div class="group" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                                <div>
                                    <label class="field-label">⭐⭐⭐⭐⭐ (5 звёзд)</label>
                                    <textarea id="fxn-review-5" class="template-input" style="height:60px;resize:vertical;" placeholder="Спасибо за покупку, {buyername}! Будем рады видеть вас снова."></textarea>
                                </div>
                                <div>
                                    <label class="field-label">⭐⭐⭐⭐ (4 звезды)</label>
                                    <textarea id="fxn-review-4" class="template-input" style="height:60px;resize:vertical;" placeholder="Спасибо за отзыв! Напишите нам в чат, если возникли вопросы."></textarea>
                                </div>
                                <div>
                                    <label class="field-label">⭐⭐⭐ (3 звезды)</label>
                                    <textarea id="fxn-review-3" class="template-input" style="height:60px;resize:vertical;" placeholder="Здравствуйте! Что пошло не так? Напишите нам в чат, решим проблему."></textarea>
                                </div>
                                <div>
                                    <label class="field-label">⭐⭐ (2 звезды)</label>
                                    <textarea id="fxn-review-2" class="template-input" style="height:60px;resize:vertical;" placeholder="Здравствуйте! Свяжитесь с нами, поможем разобраться."></textarea>
                                </div>
                                <div>
                                    <label class="field-label">⭐ (1 звезда)</label>
                                    <textarea id="fxn-review-1" class="template-input" style="height:60px;resize:vertical;" placeholder="Здравствуйте! Напишите нам в личные сообщения для решения проблемы."></textarea>
                                </div>
                            </div>

                            <div class="section-label">Бонус за отзыв 5 ★</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">redeem</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Отправлять бонус в чат за 5 ★</div>
                                        <div class="row-sub">Автоматически присылать покупателю подарок или промокод после отличной оценки</div>
                                    </div>
                                    <button class="switch" id="bonusForReviewEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">tune</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Режим бонуса</div>
                                        <div class="row-sub">Один постоянный текст или случайный из списка</div>
                                    </div>
                                    <div style="display:flex;gap:12px;align-items:center;">
                                        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;">
                                            <input type="radio" name="bonusMode" value="single" checked> Одиночный
                                        </label>
                                        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;">
                                            <input type="radio" name="bonusMode" value="random"> Случайный
                                        </label>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">timer</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Задержка отправки бонуса (сек)</div>
                                        <div class="row-sub">Время перед отправкой сообщения в чат</div>
                                    </div>
                                    <input type="number" id="bonusForReviewDelaySec" class="fxn-input" style="width:80px;text-align:right;" min="0" max="60" value="4">
                                </div>
                            </div>

                            <div id="singleBonusContainer" class="group" style="padding:16px;">
                                <label class="field-label">Текст бонуса / промокод</label>
                                <textarea id="singleBonusText" class="template-input" style="height:70px;resize:vertical;" placeholder="Ваш промокод на следующую покупку: BONUS50"></textarea>
                            </div>

                            <div id="randomBonusContainer" class="group" style="padding:16px;display:none;">
                                <label class="field-label">Список случайных бонусов</label>
                                <div id="bonus-list-container" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>
                                <div style="display:flex;gap:8px;">
                                    <input type="text" id="newBonusText" class="fxn-input" placeholder="Новый текст бонуса...">
                                    <button id="addBonusBtn" class="btn btn-solid" type="button">Добавить</button>
                                </div>
                            </div>

                            <div class="section-label">Автоответчик в чате</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">waving_hand</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Авто-приветствие в новых чатах</div>
                                        <div class="row-sub">Приветствовать покупателя при открытии диалога</div>
                                    </div>
                                    <button class="switch" id="greetingEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">shopping_cart_checkout</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Ответ при новом заказе</div>
                                        <div class="row-sub">Отправлять мгновенное сообщение при оплате заказа покупателем</div>
                                    </div>
                                    <button class="switch" id="newOrderReplyEnabled" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">task_alt</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Ответ при подтверждении заказа</div>
                                        <div class="row-sub">Благодарить за закрытие заказа и напоминать об отзыве</div>
                                    </div>
                                    <button class="switch" id="orderConfirmReplyEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div class="group" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                                <div>
                                    <label class="field-label">Текст приветствия</label>
                                    <textarea id="greetingText" class="template-input" style="height:60px;resize:vertical;" placeholder="Здравствуйте! Чем могу помочь?"></textarea>
                                </div>
                                <div>
                                    <label class="field-label">Текст при новом заказе</label>
                                    <textarea id="newOrderReplyText" class="template-input" style="height:60px;resize:vertical;" placeholder="Спасибо за заказ! Сейчас всё подготовлю."></textarea>
                                </div>
                                <div>
                                    <label class="field-label">Текст при подтверждении заказа</label>
                                    <textarea id="orderConfirmReplyText" class="template-input" style="height:60px;resize:vertical;" placeholder="Спасибо за покупку! Буду благодарен за отзыв ⭐"></textarea>
                                </div>
                            </div>

                            <div class="section-label">Автоответ по ключевым словам</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">key</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить ответы по ключевым словам</div>
                                        <div class="row-sub">Автоматически отвечать при совпадении слов в сообщении</div>
                                    </div>
                                    <button class="switch" id="keywordsEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div class="group" style="padding:16px;">
                                <div id="keywords-list-container" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>
                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    <div style="display:flex;gap:8px;">
                                        <input type="text" id="newKeyword" class="fxn-input" placeholder="Ключевое слово (например, «наличие»)" style="flex:1;">
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--fxn-text-desc);">
                                                <input type="radio" name="newKeywordMatchMode" value="exact" checked> Точное
                                            </label>
                                            <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--fxn-text-desc);">
                                                <input type="radio" name="newKeywordMatchMode" value="contains"> Содержит
                                            </label>
                                        </div>
                                    </div>
                                    <div style="display:flex;gap:8px;">
                                        <input type="text" id="newKeywordResponse" class="fxn-input" placeholder="Текст ответа..." style="flex:1;">
                                        <button id="addKeywordBtn" class="btn btn-solid" type="button">Добавить правило</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: АВТО-ВЫДАЧА (AUTO_DELIVERY) -->
                    <section class="panel foxen-page-content" id="auto_delivery" data-page="auto_delivery">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">bolt</span></div>
                                <div>
                                    <div class="crumb">Торговля & Лоты</div>
                                    <h1>Авто-Выдача товаров</h1>
                                    <p>Мгновенная автоматическая доставка ключей, аккаунтов и файлов покупателям</p>
                                </div>
                                <div class="status-pill on" id="fxnAutoDeliveryStatusPill"><span class="material-symbols-rounded">bolt</span><span>СЛУЖБА АКТИВНА</span></div>
                            </div>

                            <div class="section-label">Основные параметры</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">power_settings_new</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить сервис автовыдачи</div>
                                        <div class="row-sub">Обрабатывать заказы и отправлять товар покупателю автоматически</div>
                                    </div>
                                    <button class="switch on" id="autoDeliveryEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div class="section-label">Правила и товары</div>
                            <div class="group" style="padding:16px;">
                                <div id="auto-delivery-rules-container">
                                    <p style="color:var(--fxn-text-desc);font-size:13px;margin-bottom:12px;">Создавайте правила привязки текстов выдачи и ключей к названиям лотов.</p>
                                    <button class="btn btn-solid" id="addAutoDeliveryRuleBtn" type="button"><span class="material-symbols-rounded">add</span>Добавить правило выдачи</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: УПРАВЛЕНИЕ ЛОТАМИ (LOT_IO) -->
                    <section class="panel foxen-page-content" id="lot_io" data-page="lot_io">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">inventory_2</span></div>
                                <div>
                                    <div class="crumb">Торговля & Лоты</div>
                                    <h1>Управление лотами</h1>
                                    <p>Резервное копирование предложений в JSON, массовое редактирование цен и перенос</p>
                                </div>
                            </div>

                            <div class="section-label">Резервная копия & Перенос</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">import_export</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Экспорт и импорт предложений</div>
                                        <div class="row-sub">Резервное копирование, восстановление и конвертер Cardinal перенесены в единый мастер «Экспорт / Импорт»</div>
                                    </div>
                                    <button id="lotIoGoMasterBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                        <span class="material-symbols-rounded" style="font-size:16px;">arrow_forward</span>
                                        <span>Перейти в мастер</span>
                                    </button>
                                </div>
                            </div>

                            <div class="section-label">Массовые операции</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">tune</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Массовый редактор лотов</div>
                                        <div class="row-sub">Быстрое изменение цен, описаний и валюты для множества лотов одновременно</div>
                                    </div>
                                    <button id="fp-bulk-edit-btn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                        <span class="material-symbols-rounded" style="font-size:16px;">edit_note</span>
                                        <span>Открыть</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: TELEGRAM БОТ (TELEGRAM) -->
                    <section class="panel foxen-page-content" id="telegram" data-page="telegram">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-icons">send</span></div>
                                <div>
                                    <div class="crumb">Интеграции & ИИ</div>
                                    <h1>Telegram Бот & Уведомления</h1>
                                    <p>Мгновенные уведомления о новых заказах, сообщениях и удалённое управление через личного бота</p>
                                </div>
                                <div class="status-pill" id="fxnTgStatusPill"><span class="material-icons" style="font-size:14px;">circle</span><span id="fxnTgStatusText">ОТКЛЮЧЕН</span></div>
                            </div>

                            <div class="section-label">Статус интеграции</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-icons">smart_toy</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить Telegram-бота</div>
                                        <div class="row-sub">Отправлять push-уведомления и принимать команды управления</div>
                                    </div>
                                    <button class="switch" id="fxnTgEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div id="fxnTgConfig" class="group" style="padding:16px;display:none;flex-direction:column;gap:14px;">
                                <div>
                                    <label class="field-label">Токен бота (от @BotFather)</label>
                                    <div style="display:flex;gap:8px;">
                                        <input type="password" id="fxnTgToken" class="fxn-input" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..." style="flex:1;">
                                        <button type="button" id="fxnTgToggleToken" class="btn btn-ghost" style="padding:0 12px;">
                                            <span class="material-icons">visibility</span>
                                        </button>
                                    </div>
                                    <div style="font-size:11.5px;color:var(--fxn-text-desc);margin-top:4px;">Создайте бота в Telegram через @BotFather и вставьте его токен сюда</div>
                                </div>

                                <div>
                                    <label class="field-label">Chat ID (ваш ID в Telegram)</label>
                                    <div style="display:flex;gap:8px;">
                                        <input type="text" id="fxnTgChatId" class="fxn-input" placeholder="Например: 123456789" style="flex:1;">
                                        <button type="button" id="fxnTgConnectBtn" class="btn btn-ghost"><span class="material-icons" style="font-size:16px;">autorenew</span>Подключить / Проверить</button>
                                        <button type="button" id="fxnTgTestBtn" class="btn btn-ghost"><span class="material-icons" style="font-size:16px;">send</span>Тест</button>
                                    </div>
                                    <div id="fxnTgStatus" style="font-size:12px;margin-top:4px;"></div>
                                </div>

                                <div style="border-top:1px solid var(--fxn-divider-color);padding-top:12px;display:flex;flex-direction:column;gap:8px;">
                                    <div style="font-size:12.5px;font-weight:600;color:var(--fxn-text-main);">Параметры уведомлений:</div>
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;">
                                        <span style="font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;" onclick="document.getElementById('fxnTgNotifyOrders')?.click()">Новые заказы и оплата</span>
                                        <button class="switch on" id="fxnTgNotifyOrders" data-toggle type="button"></button>
                                    </div>
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;">
                                        <span style="font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;" onclick="document.getElementById('fxnTgNotifyMessages')?.click()">Новые сообщения в чатах</span>
                                        <button class="switch on" id="fxnTgNotifyMessages" data-toggle type="button"></button>
                                    </div>
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;">
                                        <span style="font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;" onclick="document.getElementById('fxnTgAllowControl')?.click()">Разрешить команды (/bump, /stats, /orders)</span>
                                        <button class="switch on" id="fxnTgAllowControl" data-toggle type="button"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                    <!-- PANEL: СВОЙ API КЛЮЧ / ИИ (AI_SETTINGS) -->
                    <section class="panel foxen-page-content" id="ai_settings" data-page="ai_settings">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-icons">vpn_key</span></div>
                                <div>
                                    <div class="crumb">Интеграции & ИИ</div>
                                    <h1>Свой API ключ (ИИ)</h1>
                                    <p>Подключение персональных ключей Gemini, OpenAI или OpenRouter с автоматическим каскадом моделей при исчерпании лимитов</p>
                                </div>
                            </div>

                            <div class="section-label">Выберите провайдера</div>
                            <div class="group" style="padding:16px;display:flex;gap:10px;">
                                <button type="button" class="btn btn-ghost fxn-ai-provider-btn" data-provider="gemini" style="flex:1;">Google Gemini</button>
                                <button type="button" class="btn btn-ghost fxn-ai-provider-btn" data-provider="openai" style="flex:1;">OpenAI (ChatGPT)</button>
                                <button type="button" class="btn btn-ghost fxn-ai-provider-btn" data-provider="openrouter" style="flex:1;">OpenRouter</button>
                            </div>

                            <div class="section-label">Параметры подключения</div>
                            <div class="group" style="padding:16px;display:flex;flex-direction:column;gap:14px;">
                                <div>
                                    <label class="field-label">API Ключ</label>
                                    <div style="display:flex;gap:8px;">
                                        <input type="password" id="fxnAIApiKey" class="fxn-input" placeholder="Вставьте ваш API ключ..." style="flex:1;">
                                        <button type="button" id="fxnAIToggleKey" class="btn btn-ghost" style="padding:0 12px;">
                                            <span class="material-icons eye-open">visibility</span>
                                            <span class="material-icons eye-closed" style="display:none;">visibility_off</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="field-label">Модель (опционально)</label>
                                    <input type="text" id="fxnAIModel" class="fxn-input" placeholder="gemini-2.5-flash (авто-каскад при лимитах)" style="width:100%;">
                                    <div id="fxnAIModelHint" style="font-size:11.5px;color:var(--fxn-text-desc);margin-top:4px;"></div>
                                </div>

                                <div style="display:flex;gap:10px;align-items:center;margin-top:4px;">
                                    <button type="button" id="fxnAITestBtn" class="btn btn-ghost"><span class="material-icons" style="font-size:16px;">send</span>Проверить подключение</button>
                                    <button type="button" id="fxnAIClearBtn" class="btn btn-ghost" style="color:#ef4444;">Очистить ключ</button>
                                    <span id="fxnAITestStatus" style="font-size:12px;margin-left:auto;"></span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: ШАБЛОНЫ ОТВЕТОВ (TEMPLATES) -->
                    <section class="panel foxen-page-content" id="templates" data-page="templates">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">description</span></div>
                                <div>
                                    <div class="crumb">Чат & Клиенты</div>
                                    <h1>Шаблоны быстрых ответов</h1>
                                    <p>Кнопки готовых фраз в чате с поддержкой переменных {buyername}, {date}, картинок и ИИ</p>
                                </div>
                            </div>

                            <div class="section-label">Настройки кнопок</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">send</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Отправлять сразу по клику</div>
                                        <div class="row-sub">Если выключено — текст сначала вставляется в поле ввода для редактирования</div>
                                    </div>
                                    <button class="switch" id="sendTemplatesImmediately" data-toggle></button>
                                </div>
                            </div>

                            <div class="template-variables-guide" style="background:rgba(255,255,255,0.03);border:1px solid var(--fxn-divider-color);border-radius:12px;padding:14px 16px;margin:16px 0;">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                                    <div style="font-size:12.5px;font-weight:700;color:var(--fxn-text-main);">Переменные для подстановки:</div>
                                    <span style="font-size:11px;color:var(--fxn-text-subtle);">📋 Кликните на тег для копирования</span>
                                </div>
                                <div class="fxn-var-chips-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
                                    <div class="fxn-var-item" data-code="{buyername}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{buyername}</span>
                                        <span class="var-desc">Имя покупателя в чате</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{sellername}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{sellername}</span>
                                        <span class="var-desc">Ваш ник продавца</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{lotname}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{lotname}</span>
                                        <span class="var-desc">Название товара</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{category}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{category}</span>
                                        <span class="var-desc">Категория / игра</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{order_id}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{order_id}</span>
                                        <span class="var-desc">Номер заказа (#ABC12345)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{orderlink}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{orderlink}</span>
                                        <span class="var-desc">Ссылка на заказ</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{bal}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{bal}</span>
                                        <span class="var-desc">Баланс продавца</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{activesells}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{activesells}</span>
                                        <span class="var-desc">Активные продажи</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{date}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{date}</span>
                                        <span class="var-desc">Текущая дата</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{time}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{time}</span>
                                        <span class="var-desc">Текущее время</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{welcome}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{welcome}</span>
                                        <span class="var-desc">Приветствие («Доброе утро»)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{rating}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{rating}</span>
                                        <span class="var-desc">Оценка отзыва (звёзды ★)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{вариант 1|вариант 2|вариант 3}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{вариант 1|вариант 2}</span>
                                        <span class="var-desc">Случайный выбор (Spintax)</span>
                                    </div>
                                    <div class="fxn-var-item" data-code="{ai: ваш запрос}" title="Нажмите, чтобы скопировать">
                                        <span class="variable-code">{ai: ваш запрос}</span>
                                        <span class="var-desc">Ответ через ИИ</span>
                                    </div>
                                </div>
                            </div>

                            <div class="section-label">Список шаблонов</div>
                            <div id="template-settings-container" class="template-settings-list"></div>
                            
                            <div style="display:flex;gap:10px;margin-top:12px;">
                                <button id="addCustomTemplateBtn" class="btn btn-solid" type="button"><span class="material-symbols-rounded">add</span>Добавить шаблон</button>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: СЛЭШ-КОМАНДЫ (SLASH_COMMANDS) -->
                    <section class="panel foxen-page-content" id="slash_commands" data-page="slash_commands">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">terminal</span></div>
                                <div>
                                    <div class="crumb">Чат & Клиенты</div>
                                    <h1>Слэш-команды в чате</h1>
                                    <p>Быстрые команды и автодополнение в чатах FunPay (наберите «/» для вызова)</p>
                                </div>
                            </div>

                            <div class="section-label">Параметры слэш-команд</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">terminal</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить слэш-команды</div>
                                        <div class="row-sub">Активировать быстрое разворачивание команд при вводе в поле диалога</div>
                                    </div>
                                    <button class="switch on" id="fxnSlashEnabled" data-toggle></button>
                                </div>
                            </div>

                            <div id="fxnSlashConfig" style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">
                                <div class="group" style="padding:14px;display:flex;flex-direction:column;gap:10px;">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                                        <span style="font-size:12.5px;color:var(--fxn-text-main);cursor:pointer;" onclick="document.getElementById('fxnSlashAutocomplete')?.click()">Показывать подсказки при вводе «/»</span>
                                        <button class="switch on" id="fxnSlashAutocomplete" data-toggle type="button"></button>
                                    </div>
                                    <div style="font-size:12.5px;color:var(--fxn-text-desc);margin-top:4px;">Клавиша для разворачивания команды:</div>
                                    <div style="display:flex;gap:16px;font-size:12.5px;color:var(--fxn-text-main);">
                                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="fxnSlashKey" value="both" checked> Tab или Enter</label>
                                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="fxnSlashKey" value="tab"> Только Tab</label>
                                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="fxnSlashKey" value="enter"> Только Enter</label>
                                    </div>
                                </div>

                                <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                                    <span>Пользовательские команды</span>
                                    <button id="fxnSlashAddBtn" class="btn btn-solid" type="button" style="padding:6px 12px;font-size:12px;">
                                        <span class="material-symbols-rounded" style="font-size:15px;">add</span>Добавить команду
                                    </button>
                                </div>

                                <div id="fxnSlashList" style="display:flex;flex-direction:column;gap:8px;"></div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: ЧЁРНЫЙ СПИСОК (BLACKLIST) -->
                    <section class="panel foxen-page-content" id="blacklist" data-page="blacklist">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">block</span></div>
                                <div>
                                    <div class="crumb">Чат & Клиенты</div>
                                    <h1>Чёрный список покупателей</h1>
                                    <p>Блокировка нежелательных пользователей: скрытие их сообщений, отключение автоответов и выдачи</p>
                                </div>
                            </div>

                            <div class="group" style="padding:16px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;">
                                <input type="text" id="fp-bl-name-input" class="fxn-input" placeholder="Никнейм покупателя..." style="flex:1;min-width:180px;">
                                <input type="text" id="fp-bl-note-input" class="fxn-input" placeholder="Причина / заметка (необязательно)..." style="flex:1;min-width:180px;">
                                <button id="fp-bl-add-btn" class="btn btn-solid" type="button"><span class="material-symbols-rounded">person_add</span>Заблокировать</button>
                            </div>

                            <div class="section-label">Список заблокированных</div>
                            <div id="fp-bl-list" class="group" style="padding:16px;"></div>
                        </div>
                    </section>

                    <!-- PANEL: ТИКЕТЫ (TICKETS) -->
                    <section class="panel foxen-page-content" id="tickets" data-page="tickets" style="position:relative;">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-icons">support_agent</span></div>
                                <div>
                                    <div class="crumb">Интеграции & ИИ</div>
                                    <h1>Тикеты FunPay</h1>
                                    <p>Управление обращениями в службу поддержки без перехода на внешний сайт</p>
                                </div>
                                <div class="status-pill" style="color: #ffffff; border-color: rgba(255, 255, 255, 0.22); background: rgba(255, 255, 255, 0.06);">
                                    <span class="material-symbols-rounded" style="font-size: 14px; color: #ffffff;">construction</span>
                                    <span>В РАЗРАБОТКЕ</span>
                                </div>
                            </div>

                            <div class="group" style="padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.16); border-radius: 16px;">
                                <div style="width: 64px; height: 64px; border-radius: 18px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16); display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 0 24px rgba(255, 255, 255, 0.05);">
                                    <span class="material-symbols-rounded" style="font-size: 32px; color: #ffffff;">construction</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 6px; max-width: 480px;">
                                    <div style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">Временно недоступно: находится в разработке</div>
                                    <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); line-height: 1.55;">
                                        Мы полностью обновляем модуль тикетов для прямой интеграции со службой поддержки FunPay, добавления быстрых шаблонов ответов и автоматических уведомлений.
                                    </div>
                                </div>
                                <div style="display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14); color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 0.02em;">
                                    <span class="material-symbols-rounded" style="font-size: 16px; color: rgba(255, 255, 255, 0.8);">schedule</span>
                                    <span>Скоро появится в следующем обновлении</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: КАЛЬКУЛЯТОР (CALCULATOR) -->
                    <section class="panel foxen-page-content" id="calculator" data-page="calculator">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">calculate</span></div>
                                <div>
                                    <div class="crumb">Финансы & Расчёты</div>
                                    <h1>Калькулятор</h1>
                                    <p>Быстрый подсчет комиссии FunPay, стоимости товаров и прибыли</p>
                                </div>
                            </div>

                            <div class="calculator-container">
                                <div class="calculator-display"><span id="calcDisplay">0</span></div>
                                
                                <div class="fxn-calc-presets" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-bottom:12px;">
                                    <button class="btn btn-ghost fxn-calc-preset-btn" data-fee="3" type="button" title="Вычесть комиссию FunPay 3%">−3%</button>
                                    <button class="btn btn-ghost fxn-calc-preset-btn" data-fee="8" type="button" title="Вычесть комиссию FunPay 8%">−8%</button>
                                    <button class="btn btn-ghost fxn-calc-preset-btn" data-fee="10" type="button" title="Вычесть комиссию FunPay 10%">−10%</button>
                                    <button class="btn btn-ghost fxn-calc-preset-btn" data-fee="15" type="button" title="Вычесть комиссию FunPay 15%">−15%</button>
                                </div>

                                <div class="calculator-buttons">
                                    <button class="calc-btn" data-action="clear" type="button">AC</button>
                                    <button class="calc-btn" data-action="toggle-sign" type="button">+/-</button>
                                    <button class="calc-btn" data-action="percentage" type="button">%</button>
                                    <button class="calc-btn calc-btn-operator" data-action="divide" type="button">÷</button>
                                    <button class="calc-btn" data-key="7" type="button">7</button>
                                    <button class="calc-btn" data-key="8" type="button">8</button>
                                    <button class="calc-btn" data-key="9" type="button">9</button>
                                    <button class="calc-btn calc-btn-operator" data-action="multiply" type="button">×</button>
                                    <button class="calc-btn" data-key="4" type="button">4</button>
                                    <button class="calc-btn" data-key="5" type="button">5</button>
                                    <button class="calc-btn" data-key="6" type="button">6</button>
                                    <button class="calc-btn calc-btn-operator" data-action="subtract" type="button">−</button>
                                    <button class="calc-btn" data-key="1" type="button">1</button>
                                    <button class="calc-btn" data-key="2" type="button">2</button>
                                    <button class="calc-btn" data-key="3" type="button">3</button>
                                    <button class="calc-btn calc-btn-operator" data-action="add" type="button">+</button>
                                    <button class="calc-btn" data-key="0" style="grid-column: span 2;" type="button">0</button>
                                    <button class="calc-btn" data-action="decimal" type="button">.</button>
                                    <button class="calc-btn calc-btn-operator" data-action="calculate" type="button">=</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: ВАЛЮТЫ (CURRENCY_CALC) -->
                    <section class="panel foxen-page-content" id="currency_calc" data-page="currency_calc">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">currency_exchange</span></div>
                                <div>
                                    <div class="crumb">Финансы & Расчёты</div>
                                    <h1>Конвертер валют</h1>
                                    <p>Актуальные курсы валют в реальном времени для расчета сделок</p>
                                </div>
                            </div>

                            <div class="group" style="padding:20px;max-width:500px;margin:0 auto;">
                                <div style="display:grid;grid-template-columns:1fr 140px;gap:12px;margin-bottom:14px;">
                                    <input type="number" id="currencyAmountFrom" class="fxn-input" value="100" style="width:100% !important;box-sizing:border-box;">
                                    <select id="currencySelectFrom" class="fxn-select" style="width:100% !important;box-sizing:border-box;"></select>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:center;margin-bottom:14px;gap:12px;">
                                    <button id="currencySwapBtn" class="btn btn-ghost" type="button" style="width:36px;height:36px;padding:0;border-radius:50%;"><span class="material-symbols-rounded">swap_vert</span></button>
                                    <div id="currencyRateDisplay" style="font-family:var(--fxn-font-mono);font-size:12px;color:var(--fxn-text-desc);"></div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 140px;gap:12px;">
                                    <input type="text" id="currencyAmountTo" class="fxn-input" readonly style="width:100% !important;box-sizing:border-box;background:rgba(255,255,204,0.04);">
                                    <select id="currencySelectTo" class="fxn-select" style="width:100% !important;box-sizing:border-box;"></select>
                                </div>
                                <div id="currency-error-display" style="color:#ef4444;font-size:12px;margin-top:10px;text-align:center;"></div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: КОПИЛКИ (PIGGY_BANKS) -->
                    <section class="panel foxen-page-content" id="piggy_banks" data-page="piggy_banks">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">savings</span></div>
                                <div>
                                    <div class="crumb">Финансы & Расчёты</div>
                                    <h1>Финансовые копилки</h1>
                                    <p>Отслеживайте накопления на цели прямо от вашего баланса FunPay</p>
                                </div>
                            </div>

                            <div class="group" style="padding:16px;margin-bottom:16px;">
                                <button id="create-piggy-bank-btn" class="btn btn-solid" type="button" style="width:100%;padding:11px;"><span class="material-symbols-rounded">add</span>Создать новую копилку</button>
                            </div>

                            <div class="section-label">Ваши копилки</div>
                            <div id="piggy-banks-list-container" style="display:flex;flex-direction:column;gap:10px;"></div>
                        </div>
                    </section>

                    <!-- PANEL: ЗАМЕТКИ (NOTES) -->
                    <section class="panel foxen-page-content" id="notes" data-page="notes">
                        <div class="panel-body" style="display:flex;flex-direction:column;">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">edit_note</span></div>
                                <div>
                                    <div class="crumb">Финансы & Расчёты</div>
                                    <h1>Личные заметки</h1>
                                    <p>Блокнот с мгновенным автосохранением: сохраняйте важные данные, контакты и идеи</p>
                                </div>
                            </div>

                            <div class="group" style="flex:1;display:flex;flex-direction:column;padding:12px;margin-bottom:0;">
                                <textarea id="foxenNotesArea" class="fxn-input" style="flex:1;min-height:360px;resize:none;font-family:inherit;line-height:1.6;" placeholder="Начните писать здесь свои заметки..."></textarea>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: ЭКСПОРТ / ИМПОРТ (SETTINGS_IO MASTER HUB) -->
                    <section class="panel foxen-page-content" id="settings_io" data-page="settings_io">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">import_export</span></div>
                                <div>
                                    <div class="crumb">Главная & Настройки</div>
                                    <h1>Экспорт / Импорт</h1>
                                    <p>Единый мастер резервного копирования и переноса настроек, лотов, шаблонов и данных</p>
                                </div>
                            </div>

                            <!-- 1. НАСТРОЙКИ FOXEN -->
                            <div class="section-label">Настройки расширения</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">tune</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Резервная копия конфигурации Foxen</div>
                                        <div class="row-sub">Сохранение и перенос всех параметров, переключателей и режимов в файл JSON</div>
                                    </div>
                                </div>
                                <div class="lot-io-action-bar" style="padding:0 16px 14px 16px;margin-top:0;">
                                    <button id="fxnExportAllSettingsBtn" class="btn btn-solid" type="button">
                                        <span class="material-symbols-rounded">download</span>
                                        <span>Экспортировать всё в JSON</span>
                                    </button>
                                    <button id="fxnImportAllSettingsBtn" class="btn btn-ghost" type="button">
                                        <span class="material-symbols-rounded">upload</span>
                                        <span>Импортировать из файла</span>
                                    </button>
                                    <input type="file" id="fxnImportAllSettingsFile" accept=".json" style="display:none;">
                                </div>
                            </div>

                            <!-- 2. ЛОТЫ И ПРЕДЛОЖЕНИЯ FUNPAY -->
                            <div class="section-label">Лоты & Торговые предложения</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">inventory_2</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Экспорт и импорт лотов</div>
                                        <div class="row-sub">Сохранение предложений аккаунта в JSON-файл или восстановление / перенос базы лотов</div>
                                    </div>
                                </div>
                                <div class="lot-io-action-bar" style="padding:0 16px 14px 16px;margin-top:0;">
                                    <button id="lot-io-export-btn" class="btn btn-solid" type="button">
                                        <span class="material-symbols-rounded">download</span>
                                        <span>Экспорт лотов</span>
                                    </button>
                                    <button id="lot-io-import-btn" class="btn btn-ghost" type="button">
                                        <span class="material-symbols-rounded">upload</span>
                                        <span>Импорт лотов</span>
                                    </button>
                                    <input type="file" id="lot-io-import-file" accept=".json" style="display:none;">
                                </div>

                                <div class="row" style="border-top:1px solid var(--fxn-divider-color);margin-top:2px;">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Конвертер Cardinal</div>
                                        <div class="row-sub">Конвертация базы предложений из бота Cardinal в формат Foxen</div>
                                    </div>
                                    <button id="convert-cardinal-lots-btn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                        <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span>
                                        <span>Конвертер</span>
                                    </button>
                                </div>

                                <div id="lot-io-pending-imports-list" class="lot-io-pending-container" style="padding:0 16px 14px 16px;">
                                    <!-- Заполняется динамически через renderPendingImports() -->
                                </div>
                            </div>

                            <!-- 3. ШАБЛОНЫ И АВТООТВЕТ -->
                            <div class="section-label">Шаблоны & Автоответ</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">forum</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Шаблоны быстрых ответов</div>
                                        <div class="row-sub">Экспорт и восстановление базы готовых шаблонных сообщений для чатов (.fxnprst)</div>
                                    </div>
                                    <div style="display:flex;gap:8px;">
                                        <button id="fxnMasterExportTemplatesBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                                            <span>Экспорт</span>
                                        </button>
                                        <button id="fxnMasterImportTemplatesBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">upload</span>
                                            <span>Импорт</span>
                                        </button>
                                        <input type="file" id="fxnMasterImportTemplatesFile" accept=".fxnprst,.json" style="display:none;">
                                    </div>
                                </div>
                                <div class="row" style="border-top:1px solid var(--fxn-divider-color);margin-top:2px;">
                                    <div class="row-icon"><span class="material-symbols-rounded">smart_toy</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Правила автоответа</div>
                                        <div class="row-sub">Сохранение и перенос триггеров и ключевых слов автоответчика (.fxnar)</div>
                                    </div>
                                    <div style="display:flex;gap:8px;">
                                        <button id="fxnMasterExportAutoreplyBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                                            <span>Экспорт</span>
                                        </button>
                                        <button id="fxnMasterImportAutoreplyBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">upload</span>
                                            <span>Импорт</span>
                                        </button>
                                        <input type="file" id="fxnMasterImportAutoreplyFile" accept=".fxnar,.json" style="display:none;">
                                    </div>
                                </div>
                            </div>

                            <!-- 4. ОФОРМЛЕНИЕ И ТЕМЫ -->
                            <div class="section-label">Оформление & Темы</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">palette</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Кастомная тема Foxen</div>
                                        <div class="row-sub">Экспорт текущей цветовой палитры, эффектов и стилей в файл .fptheme</div>
                                    </div>
                                    <div style="display:flex;gap:8px;">
                                        <button id="fxnMasterExportThemeBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                                            <span>Экспорт темы</span>
                                        </button>
                                        <button id="fxnMasterImportThemeBtn" class="btn btn-ghost btn-sm" type="button" style="display:flex;align-items:center;gap:6px;">
                                            <span class="material-symbols-rounded" style="font-size:16px;">upload</span>
                                            <span>Импорт темы</span>
                                        </button>
                                        <input type="file" id="fxnMasterImportThemeFile" accept=".fptheme,.json" style="display:none;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: КАСТОМИЗАЦИЯ ТЕМЫ (THEME) -->
                    <section class="panel foxen-page-content" id="theme" data-page="theme">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">palette</span></div>
                                <div>
                                    <div class="crumb">Кастомизация & Стиль</div>
                                    <h1>Внешний вид &amp; Тема</h1>
                                    <p>Полная настройка визуального стиля: цвета, фоны, прозрачность, размытие и шрифты</p>
                                </div>
                            </div>

                            <!-- ═══ 1. ОСНОВНОЙ ПЕРЕКЛЮЧАТЕЛЬ ═══ -->
                            <div class="section-label">Кастомная тема</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">brush</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Включить кастомную тему</div>
                                        <div class="row-sub">Применить темную тему и пользовательские стили ко всем страницам FunPay</div>
                                    </div>
                                    <button class="switch on" id="enableCustomThemeCheckbox" data-toggle></button>
                                </div>
                            </div>

                            <!-- ═══ 2. ПАЛИТРА ЦВЕТОВ (ТОЧНО ПО СКРИНШОТУ) ═══ -->
                            <div class="section-label">Палитра цветов темы</div>
                            <div class="group" style="padding:18px 20px;">
                                <div class="fxn-color-bars-grid">
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Основной цвет:</label>
                                        <div class="fxn-color-bar-track" id="themeBgColor1Track" title="Выбрать основной цвет">
                                            <div id="themeBgColor1Swatch" class="fxn-color-bar-fill" style="background:#ff6d15;"></div>
                                        </div>
                                        <input type="hidden" id="themeBgColor1" value="#ff6d15">
                                    </div>
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Акцентный цвет:</label>
                                        <div class="fxn-color-bar-track" id="themeBgColor2Track" title="Выбрать акцентный цвет">
                                            <div id="themeBgColor2Swatch" class="fxn-color-bar-fill" style="background:#f4cf78;"></div>
                                        </div>
                                        <input type="hidden" id="themeBgColor2" value="#f4cf78">
                                    </div>
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Фон блоков:</label>
                                        <div class="fxn-color-bar-track" id="themeContainerBgColorTrack" title="Выбрать цвет фона блоков">
                                            <div id="themeContainerBgColorSwatch" class="fxn-color-bar-fill" style="background:#0b0b0b;"></div>
                                        </div>
                                        <input type="hidden" id="themeContainerBgColor" value="#0b0b0b">
                                    </div>
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Цвет текста:</label>
                                        <div class="fxn-color-bar-track" id="themeTextColorTrack" title="Выбрать цвет текста">
                                            <div id="themeTextColorSwatch" class="fxn-color-bar-fill" style="background:#f0f0f0;"></div>
                                        </div>
                                        <input type="hidden" id="themeTextColor" value="#f0f0f0">
                                    </div>
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Цвет ссылок:</label>
                                        <div class="fxn-color-bar-track" id="themeLinkColorTrack" title="Выбрать цвет ссылок">
                                            <div id="themeLinkColorSwatch" class="fxn-color-bar-fill" style="background:#2d6bb3;"></div>
                                        </div>
                                        <input type="hidden" id="themeLinkColor" value="#2d6bb3">
                                    </div>
                                    <div class="fxn-color-bar-item">
                                        <label class="fxn-color-bar-label">Шрифт интерфейса:</label>
                                        <select id="themeFont" class="fxn-input" style="width:100%;height:32px;font-size:12.5px;padding:4px 10px;">
                                            <option value="Helvetica Neue">Helvetica Neue (Системный)</option>
                                            <option value="Inter">Inter</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Montserrat">Montserrat</option>
                                            <option value="Open Sans">Open Sans</option>
                                            <option value="JetBrains Mono">JetBrains Mono</option>
                                            <option value="Fira Code">Fira Code</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ 3. ФОНОВОЕ ИЗОБРАЖЕНИЕ ═══ -->
                            <div class="section-label">Фоновое изображение / GIF</div>
                            <div class="group" style="padding:16px;">
                                <div id="bg-image-preview" style="width:100%;height:100px;background:rgba(0,0,0,0.3);border:1px solid var(--fxn-divider-color);border-radius:10px;margin-bottom:12px;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:var(--fxn-text-desc);font-size:12px;">Нет изображения</div>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <button id="uploadBgImageBtn" class="btn btn-ghost" type="button"><span class="material-symbols-rounded" style="font-size:16px;">upload</span>Загрузить фон</button>
                                    <button id="removeBgImageBtn" class="btn btn-ghost" type="button"><span class="material-symbols-rounded" style="font-size:16px;">delete</span>Удалить</button>
                                    <button id="generatePaletteBtn" class="btn btn-ghost" type="button"><span class="material-symbols-rounded" style="font-size:16px;">auto_awesome</span>Цвета из фона</button>
                                    <input type="file" id="bgImageInput" accept="image/*,image/gif" style="display:none;">
                                </div>
                            </div>

                            <!-- ═══ 4. ПАРАМЕТРЫ ОТОБРАЖЕНИЯ ═══ -->
                            <div class="section-label">Параметры отображения</div>
                            <div class="settings-grid">
                                <div class="fxn-slider-card">
                                    <div class="fxn-slider-header">
                                        <label class="field-label" for="themeBgBlur">
                                            <span class="material-symbols-rounded">blur_on</span>
                                            <span>Размытие фона</span>
                                        </label>
                                        <span class="slider-value" id="themeBgBlurValue">0px</span>
                                    </div>
                                    <div class="slider-wrap">
                                        <input type="range" id="themeBgBlur" min="0" max="20" step="1" value="0">
                                    </div>
                                </div>
                                <div class="fxn-slider-card">
                                    <div class="fxn-slider-header">
                                        <label class="field-label" for="themeBgBrightness">
                                            <span class="material-symbols-rounded">brightness_medium</span>
                                            <span>Яркость фона</span>
                                        </label>
                                        <span class="slider-value" id="themeBgBrightnessValue">100%</span>
                                    </div>
                                    <div class="slider-wrap">
                                        <input type="range" id="themeBgBrightness" min="20" max="150" step="1" value="100">
                                    </div>
                                </div>
                                <div class="fxn-slider-card">
                                    <div class="fxn-slider-header">
                                        <label class="field-label" for="themeContainerBgOpacity">
                                            <span class="material-symbols-rounded">opacity</span>
                                            <span>Прозрачность блоков</span>
                                        </label>
                                        <span class="slider-value" id="themeContainerBgOpacityValue">100%</span>
                                    </div>
                                    <div class="slider-wrap">
                                        <input type="range" id="themeContainerBgOpacity" min="0" max="100" step="1" value="100">
                                    </div>
                                </div>
                                <div class="fxn-slider-card">
                                    <div class="fxn-slider-header">
                                        <label class="field-label" for="themeBorderRadius">
                                            <span class="material-symbols-rounded">rounded_corner</span>
                                            <span>Закругление углов</span>
                                        </label>
                                        <span class="slider-value" id="themeBorderRadiusValue">8px</span>
                                    </div>
                                    <div class="slider-wrap">
                                        <input type="range" id="themeBorderRadius" min="0" max="30" step="1" value="8">
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ 5. УЛУЧШЕННЫЕ РАЗДЕЛИТЕЛИ ═══ -->
                            <div class="section-label">Разделители в таблицах</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                            <line x1="3" y1="12" x2="21" y2="12"></line>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Улучшенные разделители</div>
                                        <div class="row-sub">Светящиеся glow-разделители между строками предложений</div>
                                    </div>
                                    <button class="switch" id="enableImprovedSeparators" data-toggle></button>
                                </div>
                            </div>

                            <!-- ═══ 6. КРУГЛЯШКИ И АВАТАРЫ ═══ -->
                            <div class="section-label">Кругляшки на профилях</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="12" cy="12" r="9"></circle>
                                            <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Кастомизация кругляшек</div>
                                        <div class="row-sub">Изменить размер, прозрачность и размытие кругов на страницах FunPay</div>
                                    </div>
                                    <button class="switch" id="enableCircleCustomization" data-toggle></button>
                                </div>
                            </div>
                            <div id="circleCustomizationControls" class="group" style="display:none;padding:16px;">
                                <div style="display:flex;justify-content:center;align-items:center;height:120px;background:rgba(0,0,0,0.3);border-radius:12px;margin-bottom:14px;border:1px solid var(--fxn-divider-color);">
                                    <div id="circlePreviewContainer" style="transition:opacity 0.3s ease;">
                                        <div id="circlePreview" style="position:relative;width:90px;height:90px;transform-origin:center center;transition:transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease;">
                                            <img src="https://funpay.com/img/circles/funpay_poke.jpg" alt="" style="width:100%;height:100%;border-radius:50%;">
                                        </div>
                                    </div>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                                    <span style="font-size:13px;color:var(--fxn-text-main);font-weight:600;">Отображать кругляшки</span>
                                    <button class="switch on" id="showCircles" data-toggle></button>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:12px;">
                                    <div class="fxn-slider-card">
                                        <div class="fxn-slider-header">
                                            <label class="field-label" for="circleSize">
                                                <span class="material-symbols-rounded">circle</span>
                                                <span>Размер кругляшек</span>
                                            </label>
                                            <span class="slider-value" id="circleSizeValue">100%</span>
                                        </div>
                                        <div class="slider-wrap">
                                            <input type="range" id="circleSize" min="50" max="150" step="1" value="100">
                                        </div>
                                    </div>
                                    <div class="fxn-slider-card">
                                        <div class="fxn-slider-header">
                                            <label class="field-label" for="circleOpacity">
                                                <span class="material-symbols-rounded">opacity</span>
                                                <span>Прозрачность</span>
                                            </label>
                                            <span class="slider-value" id="circleOpacityValue">100%</span>
                                        </div>
                                        <div class="slider-wrap">
                                            <input type="range" id="circleOpacity" min="0" max="100" step="1" value="100">
                                        </div>
                                    </div>
                                    <div class="fxn-slider-card">
                                        <div class="fxn-slider-header">
                                            <label class="field-label" for="circleBlur">
                                                <span class="material-symbols-rounded">blur_on</span>
                                                <span>Размытие</span>
                                            </label>
                                            <span class="slider-value" id="circleBlurValue">0px</span>
                                        </div>
                                        <div class="slider-wrap">
                                            <input type="range" id="circleBlur" min="0" max="50" step="1" value="0">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ 7. ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ ═══ -->
                            <div class="section-label">Дополнительные эффекты</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">blur_on</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Эффект глассморфизма (Glass)</div>
                                        <div class="row-sub">Стеклянное размытие под блоками контента</div>
                                    </div>
                                    <button class="switch" id="enableGlassmorphism" type="button"></button>
                                </div>
                                <div id="glassmorphismControls" class="fxn-nested-block" style="display:none;padding:14px 16px;flex-direction:column;gap:12px;">
                                    <div class="fxn-slider-card">
                                        <div class="fxn-slider-header">
                                            <label class="field-label" for="glassmorphismBlur">
                                                <span class="material-symbols-rounded">lens_blur</span>
                                                <span>Сила размытия Glass</span>
                                            </label>
                                            <span class="slider-value" id="glassmorphismBlurValue">10px</span>
                                        </div>
                                        <div class="slider-wrap">
                                            <input type="range" id="glassmorphismBlur" min="0" max="30" step="1" value="10">
                                        </div>
                                    </div>
                                    <div class="fxn-slider-card">
                                        <div class="fxn-slider-header">
                                            <label class="field-label" for="glassContainerBgOpacity">
                                                <span class="material-symbols-rounded">opacity</span>
                                                <span>Прозрачность стеклянных блоков</span>
                                            </label>
                                            <span class="slider-value" id="glassContainerBgOpacityValue">75%</span>
                                        </div>
                                        <div class="slider-wrap">
                                            <input type="range" id="glassContainerBgOpacity" min="10" max="100" step="1" value="75">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="5" y="2" width="14" height="20" rx="3"></rect>
                                            <line x1="12" y1="6" x2="12" y2="12" stroke-width="2.5"></line>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Кастомный скроллбар</div>
                                        <div class="row-sub">Стилизованная тонкая полоса прокрутки</div>
                                    </div>
                                    <button class="switch" id="enableCustomScrollbar" data-toggle></button>
                                </div>
                                <div id="customScrollbarControls" class="fxn-nested-block" style="display:none;">
                                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:center;">
                                        <div>
                                            <label class="field-label" style="margin-bottom:6px;">Цвет ползунка</label>
                                            <input type="color" id="scrollbarThumbColor" value="#555555" class="fxn-input" style="width:100%;height:32px;padding:2px;cursor:pointer;">
                                        </div>
                                        <div>
                                            <label class="field-label" style="margin-bottom:6px;">Цвет трека</label>
                                            <input type="color" id="scrollbarTrackColor" value="#222222" class="fxn-input" style="width:100%;height:32px;padding:2px;cursor:pointer;">
                                        </div>
                                        <div class="fxn-slider-card" style="padding:8px 12px;">
                                            <div class="fxn-slider-header">
                                                <label class="field-label" for="scrollbarWidth" style="margin:0;">
                                                    <span class="material-symbols-rounded">straighten</span>
                                                    <span>Ширина</span>
                                                </label>
                                                <span class="slider-value" id="scrollbarWidthValue">8px</span>
                                            </div>
                                            <div class="slider-wrap" style="margin-top:4px;">
                                                <input type="range" id="scrollbarWidth" min="2" max="20" step="1" value="8">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="4" y1="20" x2="20" y2="20"></line>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="4" x2="12" y2="15"></line>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Положение шапки снизу</div>
                                        <div class="row-sub">Перенести навигационную панель в нижнюю часть экрана</div>
                                    </div>
                                    <button class="switch" id="headerPositionBottom" data-toggle></button>
                                </div>
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">dashboard</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Редизайн главной страницы</div>
                                        <div class="row-sub">Современный карточный макет вместо стандартной раскладки FunPay</div>
                                    </div>
                                    <button class="switch" id="enableRedesignedHomepage" data-toggle></button>
                                </div>
                            </div>

                            <!-- ═══ 8. ЗАТЕМНЕНИЕ СЗАДИ ОКНА FOXEN ═══ -->
                            <div class="section-label">
                                <span>Затемнение сзади окна Foxen</span>
                            </div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon"><span class="material-symbols-rounded">filter_drama</span></div>
                                    <div class="row-text">
                                        <div class="row-title">Тёмный туман (затемнение) сзади окна</div>
                                        <div class="row-sub">Включить затемняющую дымку на странице вокруг окна Foxen</div>
                                    </div>
                                    <button class="switch ${isScrimDisabled ? '' : 'on'}" id="fxnScrimEnabled" type="button"></button>
                                </div>
                            </div>

                            <!-- ═══ 9. ДЕЙСТВИЯ С ТЕМОЙ ═══ -->
                            <div class="section-label">
                                <span>Действия с темой</span>
                            </div>
                            <div class="group fxn-theme-actions-card">
                                <div class="fxn-theme-actions-grid">
                                    <button id="randomizeThemeBtn" class="fxn-theme-action-btn" type="button" title="Сгенерировать случайную гармоничную палитру цветов">
                                        <div class="fxn-theme-action-icon random">
                                            <span class="material-symbols-rounded">casino</span>
                                        </div>
                                        <div class="fxn-theme-action-text">
                                            <div class="fxn-theme-action-title">Случайная палитра</div>
                                            <div class="fxn-theme-action-desc">Сгенерировать цвета</div>
                                        </div>
                                    </button>

                                    <button id="shareThemeBtn" class="fxn-theme-action-btn" type="button" title="Поделиться темой в каталоге Foxen (web.foxen.site)">
                                        <div class="fxn-theme-action-icon share">
                                            <span class="material-symbols-rounded">share</span>
                                        </div>
                                        <div class="fxn-theme-action-text">
                                            <div class="fxn-theme-action-title">Поделиться темой</div>
                                            <div class="fxn-theme-action-desc">Каталог тем Foxen</div>
                                        </div>
                                    </button>
                                </div>

                                <div class="fxn-theme-actions-footer">
                                    <button id="resetThemeBtn" class="fxn-theme-reset-btn" type="button" title="Сбросить все цвета и фоновые настройки к исходным">
                                        <span class="material-symbols-rounded">restart_alt</span>
                                        <span>Сбросить оформление к стандартному</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: КАТАЛОГ ТЕМ (THEME_GALLERY) -->
                    <section class="panel foxen-page-content" id="theme_gallery" data-page="theme_gallery">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon"><span class="material-symbols-rounded">grid_view</span></div>
                                <div>
                                    <div class="crumb">Кастомизация & Стиль</div>
                                    <h1>Каталог тем</h1>
                                    <p>Подборка стильных тем и анимированных фонов сообщества</p>
                                </div>
                                <div class="status-pill" style="color: #ffffff; border-color: rgba(255, 255, 255, 0.22); background: rgba(255, 255, 255, 0.06);">
                                    <span class="material-symbols-rounded" style="font-size: 14px; color: #ffffff;">construction</span>
                                    <span>В РАЗРАБОТКЕ</span>
                                </div>
                            </div>

                            <div class="group" style="padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.16); border-radius: 16px;">
                                <div style="width: 64px; height: 64px; border-radius: 18px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16); display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 0 24px rgba(255, 255, 255, 0.05);">
                                    <span class="material-symbols-rounded" style="font-size: 32px; color: #ffffff;">construction</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 6px; max-width: 480px;">
                                    <div style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">Временно недоступно: находится в разработке</div>
                                    <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); line-height: 1.55;">
                                        Мы полностью обновляем каталог тем Foxen Hub, онлайн-галерею пресетов и облачную синхронизацию тем сообщества.
                                    </div>
                                </div>
                                <div style="display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14); color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 0.02em;">
                                    <span class="material-symbols-rounded" style="font-size: 16px; color: rgba(255, 255, 255, 0.8);">schedule</span>
                                    <span>Скоро появится в следующем обновлении</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- PANEL: ЭФФЕКТЫ (EFFECTS) -->
                    <section class="panel foxen-page-content" id="effects" data-page="effects">
                        <div class="panel-body">
                            <div class="panel-header">
                                <div class="panel-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
                                    </svg>
                                </div>
                                <div>
                                    <div class="crumb">Кастомизация & Стиль</div>
                                    <h1>Эффекты & Курсор</h1>
                                    <p>Атмосферные частицы на странице, анимации курсора и интерактивные эффекты</p>
                                </div>
                            </div>

                            <!-- ═══ 1. ЧАСТИЦЫ НА СТРАНИЦЕ (SCREEN PARTICLES) ═══ -->
                            <div class="section-label">Частицы на странице</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
                                            <line x1="8" y1="16" x2="8.01" y2="16"/>
                                            <line x1="8" y1="20" x2="8.01" y2="20"/>
                                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                                            <line x1="12" y1="22" x2="12.01" y2="22"/>
                                            <line x1="16" y1="16" x2="16.01" y2="16"/>
                                            <line x1="16" y1="20" x2="16.01" y2="20"/>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Анимированные частицы на странице</div>
                                        <div class="row-sub">Снегопад, сакура, дождь, осенние листья и другие атмосферные эффекты</div>
                                    </div>
                                    <button class="switch" id="foxenParticleEnabled" data-toggle></button>
                                </div>
                                <div id="foxenParticleControls" class="fxn-nested-block" style="display:none;flex-direction:column;gap:14px;padding:16px;">
                                    <div>
                                        <label class="field-label">Тема / Пресет частиц</label>
                                        <select id="foxenParticlePreset" class="fxn-select" style="width:100%;">
                                            <option value="snow">❄️ Снегопад (Snow)</option>
                                            <option value="sakura">🌸 Лепестки сакуры (Sakura)</option>
                                            <option value="rain">💧 Освежающий дождь (Rain)</option>
                                            <option value="autumn">🍂 Осенний листопад (Autumn Leaves)</option>
                                            <option value="stardust">✨ Звездная пыль (Stardust)</option>
                                            <option value="bubbles">🫧 Подводные пузырьки (Bubbles)</option>
                                        </select>
                                    </div>
                                    <div class="settings-grid" style="margin-bottom:0;border:none;padding:0;background:transparent;">
                                        <div>
                                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                                <label class="field-label" style="margin:0;">Количество частиц</label>
                                                <span class="slider-value" id="foxenParticleCountValue">40</span>
                                            </div>
                                            <input type="range" id="foxenParticleCount" min="10" max="120" step="5" value="40">
                                        </div>
                                        <div>
                                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                                <label class="field-label" style="margin:0;">Скорость движения</label>
                                                <span class="slider-value" id="foxenParticleSpeedValue">1.0x</span>
                                            </div>
                                            <input type="range" id="foxenParticleSpeed" min="0.2" max="3.0" step="0.1" value="1.0">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ 2. ЭФФЕКТЫ КУРСОРА (CURSOR FX) ═══ -->
                            <div class="section-label">Визуальные эффекты курсора</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Эффекты шлейфа курсора</div>
                                        <div class="row-sub">Стилизованные следы и геометрическая анимация мыши</div>
                                    </div>
                                    <button class="switch" id="cursorFxEnabled" data-toggle></button>
                                </div>
                                <div id="cursorFxControls" class="fxn-nested-block" style="display:none;flex-direction:column;gap:14px;padding:16px;">
                                    <!-- Visual Trail Style Selector Chips -->
                                    <div>
                                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                            <label class="field-label" style="margin:0;">Стиль шлейфа</label>
                                            <span id="cursorFxActiveTypeLabel" style="font-size:11px;color:var(--fxn-accent,#c026d3);font-weight:600;">Коса</span>
                                        </div>

                                        <select id="cursorFxType" style="display:none;">
                                            <option value="braid">Коса</option>
                                            <option value="coil">Пружина</option>
                                            <option value="circuit">Схема</option>
                                            <option value="rails">Рельсы</option>
                                            <option value="fan">Веер</option>
                                            <option value="chain">Цепь</option>
                                        </select>

                                        <div class="fxn-trail-grid" id="fxnTrailPresets">
                                            <button type="button" class="fxn-trail-chip active" data-type="braid" title="Двойное плетение нитей">
                                                <span class="material-symbols-rounded fxn-trail-icon">waves</span>
                                                <span class="fxn-trail-title">Коса</span>
                                            </button>
                                            <button type="button" class="fxn-trail-chip" data-type="coil" title="Спиральный шнур">
                                                <span class="material-symbols-rounded fxn-trail-icon">cyclone</span>
                                                <span class="fxn-trail-title">Пружина</span>
                                            </button>
                                            <button type="button" class="fxn-trail-chip" data-type="circuit" title="Кибер-микросхема">
                                                <span class="material-symbols-rounded fxn-trail-icon">memory</span>
                                                <span class="fxn-trail-title">Схема</span>
                                            </button>
                                            <button type="button" class="fxn-trail-chip" data-type="rails" title="Параллельные рельсы">
                                                <span class="material-symbols-rounded fxn-trail-icon">reorder</span>
                                                <span class="fxn-trail-title">Рельсы</span>
                                            </button>
                                            <button type="button" class="fxn-trail-chip" data-type="fan" title="Геометрический веер">
                                                <span class="material-symbols-rounded fxn-trail-icon">radar</span>
                                                <span class="fxn-trail-title">Веер</span>
                                            </button>
                                            <button type="button" class="fxn-trail-chip" data-type="chain" title="Неоновая цепь">
                                                <span class="material-symbols-rounded fxn-trail-icon">link</span>
                                                <span class="fxn-trail-title">Цепь</span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Unified Color & RGB Control Bar -->
                                    <div class="fxn-trail-color-bar" style="padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--fxn-divider-color);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                                        <div style="display:flex;align-items:center;gap:10px;">
                                            <label class="field-label" style="margin:0;font-size:12px;">Цвет эффекта</label>
                                            <div style="display:flex;align-items:center;gap:8px;">
                                                <input type="color" id="cursorFxColor1" value="#c026d3" class="fxn-color-picker-dot" title="Выбрать цвет">
                                                <div class="fxn-quick-swatches" id="cursorFxQuickSwatches">
                                                    <span class="fxn-mini-swatch active" data-color="#c026d3" style="background:#c026d3;" title="Неон"></span>
                                                    <span class="fxn-mini-swatch" data-color="#38bdf8" style="background:#38bdf8;" title="Голубой"></span>
                                                    <span class="fxn-mini-swatch" data-color="#22c55e" style="background:#22c55e;" title="Изумруд"></span>
                                                    <span class="fxn-mini-swatch" data-color="#f97316" style="background:#f97316;" title="Огонь"></span>
                                                    <span class="fxn-mini-swatch" data-color="#ffffff" style="background:#ffffff;" title="Белый"></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <span style="font-size:12px;color:var(--fxn-text-main);font-weight:500;">Радуга (RGB)</span>
                                            <button class="switch" id="cursorFxRgb" data-toggle></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ 3. КАСТОМНЫЙ КУРСОР (CUSTOM CURSOR) ═══ -->
                            <div class="section-label">Кастомный курсор</div>
                            <div class="group">
                                <div class="row">
                                    <div class="row-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polygon points="3 3 10.07 19.97 12.58 12.58 19.97 10.07 3 3"></polygon>
                                        </svg>
                                    </div>
                                    <div class="row-text">
                                        <div class="row-title">Включить кастомный курсор</div>
                                        <div class="row-sub">Заменить стандартный указатель мыши на стилизованный</div>
                                    </div>
                                    <button class="switch" id="customCursorEnabled" data-toggle></button>
                                </div>
                                <div id="customCursorControls" class="fxn-nested-block" style="display:none;flex-direction:column;gap:14px;padding:16px;">
                                    <div id="customCursorUploadWrap" style="padding:14px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid var(--fxn-divider-color);display:flex;flex-direction:column;gap:12px;">
                                        <div style="display:flex;gap:12px;align-items:center;">
                                            <div id="cursor-image-preview" style="width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.06);background-size:contain;background-position:center;background-repeat:no-repeat;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--fxn-text-desc);border:1px solid var(--fxn-divider-color);flex-shrink:0;">Нет</div>
                                            <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
                                                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                                    <input type="file" id="cursorImageInput" accept="image/*,.cur,.ico,.svg" style="display:none;">
                                                    <button type="button" id="uploadCursorImageBtn" class="btn btn-ghost btn-sm" style="display:flex;align-items:center;gap:6px;">
                                                        <span class="material-symbols-rounded" style="font-size:16px;">upload_file</span>
                                                        <span>Загрузить курсор</span>
                                                    </button>
                                                    <button type="button" id="removeCursorImageBtn" class="btn btn-ghost btn-sm" style="color:#ef4444;">Удалить</button>
                                                </div>
                                                <div style="font-size:11px;color:var(--fxn-text-desc);">PNG, SVG, WEBP, ICO или CUR</div>
                                            </div>
                                        </div>
                                        <input type="text" id="customCursorUrl" class="fxn-input" placeholder="Или вставьте прямую ссылку на изображение..." style="width:100%;">
                                    </div>

                                    <div class="settings-grid" style="margin-bottom:0;border:none;padding:0;background:transparent;">
                                        <div>
                                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                                <label class="field-label" style="margin:0;">Размер курсора</label>
                                                <span class="slider-value" id="customCursorSizeValue">32px</span>
                                            </div>
                                            <input type="range" id="customCursorSize" min="16" max="64" step="2" value="32">
                                        </div>
                                        <div>
                                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                                <label class="field-label" style="margin:0;">Прозрачность</label>
                                                <span class="slider-value" id="customCursorOpacityValue">100%</span>
                                            </div>
                                            <input type="range" id="customCursorOpacity" min="20" max="100" step="5" value="100">
                                        </div>
                                    </div>
                                    <div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--fxn-divider-color);">
                                        <span style="font-size:13px;color:var(--fxn-text-main);">Скрыть системный курсор</span>
                                        <button class="switch" id="hideSystemCursor" data-toggle></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <div class="fxn-window-resizer" title="Изменить размер окна"></div>
        </div>

    `;

    // Modal close & Scrim click handlers
    popup.querySelectorAll('.fxn-popup-close, .traffic-close').forEach(btn => {
        btn.addEventListener('click', () => {
            popup.classList.remove('active');
            if (typeof window.closeFoxenMenuSettings === 'function') {
                window.closeFoxenMenuSettings();
            }
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
        });
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup || e.target.classList.contains('scrim')) {
            popup.classList.remove('active');
            if (typeof window.closeFoxenMenuSettings === 'function') {
                window.closeFoxenMenuSettings();
            }
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
        }
    });

    initMainPopupEvents(popup);
    return popup;
}

function initMainPopupEvents(popup) {
    if (!popup) return;
    if (popup.dataset.fxnEventsInit === 'true') return;
    popup.dataset.fxnEventsInit = 'true';

    const windowEl = popup.querySelector('.window');

    // Helper to calculate and apply dynamic gradient progress fill (--slider-fill)
    const updateSliderFill = (slider) => {
        if (!slider || slider.type !== 'range') return;
        const min = parseFloat(slider.min) !== undefined && !isNaN(parseFloat(slider.min)) ? parseFloat(slider.min) : 0;
        const max = parseFloat(slider.max) !== undefined && !isNaN(parseFloat(slider.max)) ? parseFloat(slider.max) : 100;
        const val = parseFloat(slider.value) !== undefined && !isNaN(parseFloat(slider.value)) ? parseFloat(slider.value) : 0;
        const range = max - min;
        const percent = range > 0 ? Math.min(Math.max(((val - min) / range) * 100, 0), 100) : 0;
        slider.style.setProperty('--slider-fill', `${percent}%`);
    };

    const updateAllSliders = (container) => {
        const root = container || popup;
        if (!root) return;
        const sliders = root.querySelectorAll('input[type="range"]');
        sliders.forEach(updateSliderFill);
    };

    window.updateFoxenSliderFill = updateSliderFill;
    window.updateFoxenAllSliders = updateAllSliders;

    // Reactively update --slider-fill on ANY range slider change across popup & modals
    popup.addEventListener('input', (e) => {
        if (e.target && e.target.type === 'range') {
            updateSliderFill(e.target);
        }
    }, { passive: true });

    popup.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'range') {
            updateSliderFill(e.target);
        }
    }, { passive: true });

    setTimeout(() => updateAllSliders(popup), 60);

    const updateLogoTheme = (isLight) => {
        const logoImg = popup.querySelector('.brand-logo');
        if (logoImg) {
            logoImg.src = getFoxenLogoUrl(isLight);
        }
    };

    // Unified Popup Theme switcher (Dark / Light / Transparent)
    const applyPopupTheme = (theme) => {
        if (!windowEl) return;
        windowEl.classList.remove('light-theme', 'transparent-theme');
        popup.classList.remove('light-theme', 'fxn-menu-transparent', 'fxn-menu-blur');

        const blurVal = window.__foxenGlassBlur || 16;
        windowEl.style.setProperty('--fxn-glass-blur', `${blurVal}px`);
        popup.style.setProperty('--fxn-glass-blur', `${blurVal}px`);
        popup.style.setProperty('--fxn-menu-blur', `${blurVal}px`);

        const transpSw = popup.querySelector('#fxnMenuTransparentEnabled');
        const transpControls = popup.querySelector('#fxnMenuTransparentControls');

        if (theme === 'light') {
            windowEl.classList.add('light-theme');
            popup.classList.add('light-theme');
            updateLogoTheme(true);
            if (transpSw) transpSw.classList.remove('on');
            if (transpControls) transpControls.style.display = 'none';
        } else if (theme === 'transparent') {
            windowEl.classList.add('transparent-theme');
            popup.classList.add('fxn-menu-transparent', 'fxn-menu-blur');
            updateLogoTheme(false);
            if (transpSw) transpSw.classList.add('on');
            if (transpControls) transpControls.style.display = 'flex';
        } else {
            // dark default
            updateLogoTheme(false);
            if (transpSw) transpSw.classList.remove('on');
            if (transpControls) transpControls.style.display = 'none';
        }

        const root = document.documentElement;
        if (root) {
            root.setAttribute('data-fxn-popup-theme', theme);
            root.classList.toggle('fxn-popup-theme-light', theme === 'light');
            root.classList.toggle('fxn-popup-theme-dark', theme === 'dark');
            root.classList.toggle('fxn-popup-theme-transparent', theme === 'transparent');
        }

        const profileModal = popup.querySelector('#fxnSidebarProfileModal');
        if (profileModal) {
            profileModal.classList.toggle('transparent-theme', theme === 'transparent');
            profileModal.classList.toggle('light-theme', theme === 'light');
        }

        if (typeof $ !== 'undefined') {
            $('.actions').toggleClass('theme-light', theme === 'light');
            $('.actions').toggleClass('theme-transparent', theme === 'transparent');
        }
    };

    // Restore saved Popup Theme (Dark/Light/Transparent), Glassmorphism Blur, Scrim & Accent Color
    try {
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
        if (storage && storage.local) {
            storage.local.get(['foxenPopupTheme', 'foxenAccentColor', 'foxenGlassBlur', 'foxenScrimEnabled', 'fxnScrimEnabled', 'foxenTheme'], (res) => {
                if (res?.foxenGlassBlur) {
                    window.__foxenGlassBlur = parseInt(res.foxenGlassBlur, 10);
                }
                const savedTheme = res?.foxenPopupTheme || (res?.foxenTheme?.menuTransparent ? 'transparent' : null);
                if (savedTheme) {
                    applyPopupTheme(savedTheme);
                }
                const scrimVal = res?.foxenScrimEnabled ?? res?.fxnScrimEnabled;
                if (scrimVal !== undefined) {
                    const isScrimOn = !!scrimVal;
                    popup.classList.toggle('fxn-no-scrim', !isScrimOn);
                    const scrimSw = popup.querySelector('#fxnScrimEnabled');
                    if (scrimSw) scrimSw.classList.toggle('on', isScrimOn);
                    try {
                        localStorage.setItem('foxenScrimEnabled', isScrimOn ? 'true' : 'false');
                        sessionStorage.setItem('foxenScrimEnabled', isScrimOn ? 'true' : 'false');
                    } catch (_) {}
                }
                const col = res?.foxenAccentColor || (function() { try { return localStorage.getItem('foxen_accent_color') || sessionStorage.getItem('foxen_accent_color'); } catch (_) { return null; } })();
                if (col) {
                    window.__foxenAccentColor = col;
                    window.__fptUserAccent = col;
                    if (windowEl) {
                        windowEl.style.setProperty('--fxn-active', col);
                        windowEl.style.setProperty('--fxn-accent', col);
                    }
                    if (popup) {
                        popup.style.setProperty('--fxn-active', col);
                        popup.style.setProperty('--fxn-accent', col);
                    }
                    document.documentElement.style.setProperty('--fxn-active', col);
                    document.documentElement.style.setProperty('--fxn-accent', col);
                    document.documentElement.style.setProperty('--fxn-btn-color', col);
                    const headerBtn = document.getElementById('foxenButton');
                    if (headerBtn) {
                        headerBtn.style.setProperty('color', col, 'important');
                    }
                }
            });
        }
    } catch (_) {}

    // Restore saved Geometry (Position & Size)
    try {
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
        if (storage && storage.local) {
            storage.local.get(['foxenPopupPosition', 'foxenPopupSize', 'foxenPopupDragged'], (res) => {
                if (res?.foxenPopupDragged && res?.foxenPopupPosition && windowEl) {
                    let left = parseFloat(res.foxenPopupPosition.left);
                    let top = parseFloat(res.foxenPopupPosition.top);
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
                if (res?.foxenPopupSize && windowEl) {
                    const wVal = parseInt(res.foxenPopupSize.width, 10);
                    const hVal = parseInt(res.foxenPopupSize.height, 10);
                    if (!isNaN(wVal) && wVal >= 680) {
                        windowEl.style.setProperty('width', `${wVal}px`, 'important');
                    } else {
                        try { storage.local.remove('foxenPopupSize'); } catch (_) {}
                        windowEl.style.removeProperty('width');
                    }
                    if (!isNaN(hVal) && hVal >= 480) {
                        windowEl.style.setProperty('height', `${hVal}px`, 'important');
                    } else {
                        windowEl.style.removeProperty('height');
                    }
                }
            });
        }
    } catch (_) {}

    // Traffic buttons functionality
    // 1. Close button (Red)
    popup.querySelectorAll('.traffic-close, .fxn-popup-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            if (typeof window.closeFoxenMenuSettings === 'function') {
                window.closeFoxenMenuSettings();
            }
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
            if (windowEl) windowEl.classList.remove('fullscreen');
        });
    });

    // 2. Yellow button - Transforms navbar button into stylish Apple-style Dockbar
    popup.querySelectorAll('.traffic-min').forEach(btn => {
        btn.title = 'Превратить в стильный Dockbar (вместо кнопки в меню)';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            if (typeof window.closeFoxenMenuSettings === 'function') {
                window.closeFoxenMenuSettings();
            }
            if (typeof window.fxnSyncDockbarActive === 'function') {
                window.fxnSyncDockbarActive();
            }
            if (typeof window.fxnEnableDockbar === 'function') {
                window.fxnEnableDockbar(true);
            }
        });
    });

    // 3. Green button - Toggles Fullscreen / Standard window size (smooth bidirectional transition)
    popup.querySelectorAll('.traffic-max').forEach(btn => {
        btn.title = 'Развернуть на весь экран';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (windowEl) {
                windowEl.classList.toggle('fullscreen');
            }
        });
    });

    // Global Click-to-Copy handler for template variable tags
    popup.addEventListener('click', (e) => {
        const item = e.target.closest('.fxn-var-item, .variable-code');
        if (!item) return;
        const code = item.dataset.code || item.textContent.trim();
        if (code && code.startsWith('{')) {
            navigator.clipboard.writeText(code);
            if (typeof showNotification === 'function') {
                showNotification('Скопировано: ' + code);
            }
            item.classList.add('copied');
            setTimeout(() => item.classList.remove('copied'), 1200);
        }
    });

    const scrim = popup.querySelector('.scrim');
    if (scrim) {
        scrim.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    const getMenuSettingsModal = () => null;
    window.closeFoxenMenuSettings = () => {};

    // Dragging of Main Popup window by hovering and dragging .titlebar (GitHub-style makePopupInteractive)
    const initWindowDragging = () => {
        const titlebar = popup.querySelector('.titlebar');
        const win = popup.querySelector('.window');
        if (!titlebar || !win || titlebar.dataset.dragInit === 'true') return;
        titlebar.dataset.dragInit = 'true';

        let isDragging = false;
        let offset = { x: 0, y: 0 };

        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, .traffic, input, select, textarea, a, .fxn-titlebar-gear-btn, .close-btn')) return;
            if (e.button !== 0) return;

            isDragging = true;
            const rect = win.getBoundingClientRect();
            win.classList.add('no-transform');
            win.classList.add('fxn-dragged');
            win.classList.add('fxn-dragging');
            win.style.setProperty('position', 'fixed', 'important');
            win.style.setProperty('margin', '0', 'important');
            win.style.setProperty('left', `${rect.left}px`, 'important');
            win.style.setProperty('top', `${rect.top}px`, 'important');
            win.style.setProperty('right', 'auto', 'important');
            win.style.setProperty('bottom', 'auto', 'important');

            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;

            win.style.transition = 'none';
            document.body.style.userSelect = 'none';
            titlebar.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            let left = e.clientX - offset.x;
            let top = e.clientY - offset.y;

            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            const popupWidth = win.offsetWidth;
            const popupHeight = win.offsetHeight;

            left = Math.max(0, Math.min(left, winWidth - popupWidth));
            top = Math.max(0, Math.min(top, winHeight - popupHeight));

            win.style.setProperty('left', `${Math.round(left)}px`, 'important');
            win.style.setProperty('top', `${Math.round(top)}px`, 'important');

            const inspector = getMenuSettingsModal();
            if (inspector && (inspector.classList.contains('active') || (inspector.style.display !== 'none' && inspector.style.display !== ''))) {
                positionInspector(inspector);
            }
        });

        window.addEventListener('mouseup', async () => {
            if (isDragging) {
                isDragging = false;
                win.classList.remove('fxn-dragging');
                titlebar.style.cursor = '';
                document.body.style.userSelect = '';
                win.style.transition = '';
                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) {
                        await storage.local.set({ 
                            foxenPopupPosition: { top: win.style.top, left: win.style.left },
                            foxenPopupDragged: true 
                        });
                    }
                } catch (_) {}
            }
        });
    };
    initWindowDragging();

    // Resizing of Main Popup window (GitHub-style scaling & storage save)
    const initWindowResizing = () => {
        const win = popup.querySelector('.window');
        if (!win || win.dataset.resizeInit === 'true') return;
        win.dataset.resizeInit = 'true';

        // 1. Dedicated corner drag handle
        const resizer = win.querySelector('.fxn-window-resizer');
        if (resizer) {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const startW = win.offsetWidth;
                const startH = win.offsetHeight;
                const startX = e.clientX;
                const startY = e.clientY;
                document.body.style.userSelect = 'none';
                win.classList.add('fxn-resizing');
                win.style.transition = 'none';

                const onMouseMove = (moveEvt) => {
                    const newW = Math.max(680, Math.min(window.innerWidth - 20, startW + (moveEvt.clientX - startX)));
                    const newH = Math.max(480, Math.min(window.innerHeight - 20, startH + (moveEvt.clientY - startY)));
                    win.style.setProperty('width', `${Math.round(newW)}px`, 'important');
                    win.style.setProperty('height', `${Math.round(newH)}px`, 'important');

                    const inspector = getMenuSettingsModal();
                    if (inspector && (inspector.classList.contains('active') || (inspector.style.display !== 'none' && inspector.style.display !== ''))) {
                        positionInspector(inspector);
                    }
                };

                const onMouseUp = async () => {
                    document.body.style.userSelect = '';
                    win.classList.remove('fxn-resizing');
                    win.style.transition = '';
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    try {
                        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                        if (storage && storage.local) {
                            const curW = Math.max(680, win.offsetWidth);
                            const curH = Math.max(480, win.offsetHeight);
                            await storage.local.set({
                                foxenPopupSize: { width: `${curW}px`, height: `${curH}px` }
                            });
                        }
                    } catch (_) {}
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        // 2. ResizeObserver for repositioning inspector when window size changes
        const resizeObs = new ResizeObserver(() => {
            const inspector = getMenuSettingsModal();
            if (inspector && (inspector.classList.contains('active') || (inspector.style.display !== 'none' && inspector.style.display !== ''))) {
                positionInspector(inspector);
            }
        });
        resizeObs.observe(win);
    };
    initWindowResizing();

    // Universal Switch toggle wiring helper (strictly once per element)
    const wireUniversalSwitch = (sw) => {
        if (!sw || sw.dataset.switchWired === 'true') return;
        sw.dataset.switchWired = 'true';
        try {
            Object.defineProperty(sw, 'checked', {
                get() { return this.classList.contains('on'); },
                set(val) { this.classList.toggle('on', !!val); },
                configurable: true
            });
        } catch (_) {}

        sw.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sw.classList.toggle('on');
            const isOn = sw.classList.contains('on');

            sw.dispatchEvent(new CustomEvent('change', { detail: { checked: isOn }, bubbles: true }));

            // Direct sync with chrome.storage only for standard non-modal settings
            if (sw.id && !sw.id.startsWith('fxnModal') && !sw.closest('.fxn-menu-inspector')) {
                const map = {
                    'showSalesStatsCheckbox': 'showSalesStats',
                    'showFinanceStatsCheckbox': 'showFinanceStats',
                    'hideBalanceCheckbox': 'hideBalance',
                    'enableRedesignedHomepageGeneral': 'enableRedesignedHomepage',
                    'fxnIdentifierEnabled': 'foxenIdentifierEnabled',
                    'fxnTelemetryEnabled': 'fpt_telemetry_enabled',
                    'autoBumpEnabled': 'autoBumpEnabled',
                    'selectiveBumpEnabled': 'foxenSelectiveBumpEnabled',
                    'bumpOnlyAutoDelivery': 'foxenBumpOnlyAutoDelivery',
                    'autoReviewEnabled': 'autoReviewEnabled',
                    'bonusForReviewEnabled': 'bonusForReviewEnabled',
                    'greetingEnabled': 'greetingEnabled',
                    'newOrderReplyEnabled': 'newOrderReplyEnabled',
                    'orderConfirmReplyEnabled': 'orderConfirmReplyEnabled',
                    'autoDeliveryEnabled': 'autoDeliveryEnabled',
                    'sendTemplatesImmediately': 'sendTemplatesImmediately',
                    'enableCustomThemeCheckbox': 'enableCustomTheme',
                    'cursorFxEnabled': 'cursorFxEnabled',
                    'customCursorEnabled': 'customCursorEnabled',
                    'slashCommandsEnabled': 'slashCommandsEnabled'
                };
                const key = map[sw.id] || sw.id;
                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) {
                        storage.local.set({ [key]: isOn });
                    }
                } catch (_) {}
            }
        });
    };

    // Live Theme Controls & Real-Time Sync (Zero Reload Needed)
    const initLiveThemeControls = () => {
        if (typeof setupThemeCustomizationHandlers === 'function') {
            try { setupThemeCustomizationHandlers(); } catch (_) {}
        }
        if (typeof setupFptMenuTransparency === 'function') {
            try { setupFptMenuTransparency(); } catch (_) {}
        }
        if (typeof syncFptMenuControls === 'function') {
            try { syncFptMenuControls(); } catch (_) {}
        }

        // Live Scrim toggle (Тёмный туман сзади окна)
        const scrimToggle = popup.querySelector('#fxnScrimEnabled');
        if (scrimToggle && scrimToggle.dataset.scrimWired !== 'true') {
            scrimToggle.dataset.scrimWired = 'true';
            scrimToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrimToggle.classList.toggle('on');
                const isScrimOn = scrimToggle.classList.contains('on');
                popup.classList.toggle('fxn-no-scrim', !isScrimOn);
                try {
                    localStorage.setItem('foxenScrimEnabled', isScrimOn ? 'true' : 'false');
                    sessionStorage.setItem('foxenScrimEnabled', isScrimOn ? 'true' : 'false');
                } catch (_) {}
                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) {
                        storage.local.set({ 
                            foxenScrimEnabled: isScrimOn,
                            fxnScrimEnabled: isScrimOn 
                        });
                    }
                } catch (_) {}
            });
        }

        // Live Menu Transparent switch (Прозрачность окна Foxen)
        const menuTranspToggle = popup.querySelector('#fxnMenuTransparentEnabled');
        if (menuTranspToggle && menuTranspToggle.dataset.transpWired !== 'true') {
            menuTranspToggle.dataset.transpWired = 'true';
            menuTranspToggle.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                menuTranspToggle.classList.toggle('on');
                const isTransp = menuTranspToggle.classList.contains('on');
                applyPopupTheme(isTransp ? 'transparent' : 'dark');
                try {
                    const ext = typeof browser !== 'undefined' ? browser : chrome;
                    const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
                    await ext.storage.local.set({ 
                        foxenPopupTheme: isTransp ? 'transparent' : 'dark',
                        foxenTheme: { ...foxenTheme, menuTransparent: isTransp }
                    });
                } catch (_) {}
            });
        }

        // Live Glassmorphism Toggle & Sliders
        const glassToggle = popup.querySelector('#enableGlassmorphism');
        const glassControls = popup.querySelector('#glassmorphismControls');
        const glassBlurInput = popup.querySelector('#glassmorphismBlur');
        const glassBlurVal = popup.querySelector('#glassmorphismBlurValue');
        const glassOpacityInput = popup.querySelector('#glassContainerBgOpacity');
        const glassOpacityVal = popup.querySelector('#glassContainerBgOpacityValue');
        const themeOpacityInput = popup.querySelector('#themeContainerBgOpacity');
        const themeOpacityVal = popup.querySelector('#themeContainerBgOpacityValue');

        // Initial sync of Glassmorphism state from storage
        try {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            ext.storage.local.get('foxenTheme', (res) => {
                const ft = res?.foxenTheme || {};
                const isGlass = !!ft.enableGlassmorphism;
                if (glassToggle) glassToggle.classList.toggle('on', isGlass);
                if (glassControls) glassControls.style.display = isGlass ? 'flex' : 'none';
                if (ft.glassmorphismBlur !== undefined && glassBlurInput) {
                    glassBlurInput.value = ft.glassmorphismBlur;
                    if (glassBlurVal) glassBlurVal.textContent = `${ft.glassmorphismBlur}px`;
                }
                const op = ft.containerBgOpacity !== undefined ? Math.round(parseFloat(ft.containerBgOpacity) * 100) : (isGlass ? 75 : 100);
                if (glassOpacityInput) glassOpacityInput.value = op;
                if (glassOpacityVal) glassOpacityVal.textContent = `${op}%`;
                if (themeOpacityInput) themeOpacityInput.value = op;
                if (themeOpacityVal) themeOpacityVal.textContent = `${op}%`;
            });
        } catch (_) {}

        const updateGlassmorphism = async (patch = {}) => {
            try {
                const ext = typeof browser !== 'undefined' ? browser : chrome;
                const { foxenTheme = {} } = await ext.storage.local.get('foxenTheme');
                const defTheme = (typeof DEFAULT_THEME !== 'undefined') ? DEFAULT_THEME : { containerBgOpacity: 1, glassmorphismBlur: 10 };
                const nextTheme = { ...defTheme, ...foxenTheme, ...patch };
                delete nextTheme.bgImage;
                await ext.storage.local.set({ foxenTheme: nextTheme });
                if (typeof applyCustomTheme === 'function') {
                    await applyCustomTheme();
                } else if (typeof window.applyCustomTheme === 'function') {
                    await window.applyCustomTheme();
                }
            } catch (_) {}
        };

        if (glassToggle && glassToggle.dataset.glassWired !== 'true') {
            glassToggle.dataset.glassWired = 'true';
            glassToggle.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                glassToggle.classList.toggle('on');
                const isGlass = glassToggle.classList.contains('on');
                if (glassControls) glassControls.style.display = isGlass ? 'flex' : 'none';
                
                const patch = { enableGlassmorphism: isGlass };
                if (isGlass) {
                    const curOp = glassOpacityInput ? parseFloat(glassOpacityInput.value) : 75;
                    const normalizedOp = (curOp && curOp < 100) ? curOp / 100 : 0.75;
                    patch.containerBgOpacity = normalizedOp;
                    const percent = Math.round(normalizedOp * 100);
                    if (glassOpacityInput) glassOpacityInput.value = percent;
                    if (glassOpacityVal) glassOpacityVal.textContent = `${percent}%`;
                    if (themeOpacityInput) themeOpacityInput.value = percent;
                    if (themeOpacityVal) themeOpacityVal.textContent = `${percent}%`;
                }
                await updateGlassmorphism(patch);
            });
        }

        if (glassBlurInput && glassBlurInput.dataset.wired !== 'true') {
            glassBlurInput.dataset.wired = 'true';
            glassBlurInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (glassBlurVal) glassBlurVal.textContent = `${val}px`;
                document.documentElement.style.setProperty('--fxn-theme-glass-blur', `${val}px`);
                updateGlassmorphism({ glassmorphismBlur: val });
            });
        }

        const syncOpacity = (val) => {
            if (glassOpacityInput) glassOpacityInput.value = val;
            if (glassOpacityVal) glassOpacityVal.textContent = `${val}%`;
            if (themeOpacityInput) themeOpacityInput.value = val;
            if (themeOpacityVal) themeOpacityVal.textContent = `${val}%`;
            updateGlassmorphism({ containerBgOpacity: val / 100 });
        };

        if (glassOpacityInput && glassOpacityInput.dataset.wired !== 'true') {
            glassOpacityInput.dataset.wired = 'true';
            glassOpacityInput.addEventListener('input', (e) => {
                syncOpacity(parseInt(e.target.value, 10));
            });
        }

        if (themeOpacityInput && themeOpacityInput.dataset.wiredGlass !== 'true') {
            themeOpacityInput.dataset.wiredGlass = 'true';
            themeOpacityInput.addEventListener('input', (e) => {
                syncOpacity(parseInt(e.target.value, 10));
            });
        }

        // Live Section 8 Controls (Popup opacity, blur, tint)
        const menuOpacityInput = popup.querySelector('#fxnMenuOpacity');
        const menuOpacityVal = popup.querySelector('#fxnMenuOpacityValue');
        if (menuOpacityInput && menuOpacityInput.dataset.wired !== 'true') {
            menuOpacityInput.dataset.wired = 'true';
            menuOpacityInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (menuOpacityVal) menuOpacityVal.textContent = `${val}%`;
                const tint = popup.querySelector('#fxnMenuTintColor')?.value || '#2a1033';
                popup.style.setProperty('--fxn-menu-bg', hexToRgba(tint, val / 100));
                updateGlassmorphism({ menuOpacity: val });
            });
        }

        const menuBlurInput = popup.querySelector('#fxnMenuBlur');
        const menuBlurVal = popup.querySelector('#fxnMenuBlurValue');
        if (menuBlurInput && menuBlurInput.dataset.wired !== 'true') {
            menuBlurInput.dataset.wired = 'true';
            menuBlurInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (menuBlurVal) menuBlurVal.textContent = `${val}px`;
                popup.style.setProperty('--fxn-menu-blur', `${val}px`);
                windowEl?.style.setProperty('--fxn-glass-blur', `${val}px`);
                updateGlassmorphism({ menuBlur: val });
            });
        }

        const menuTintInput = popup.querySelector('#fxnMenuTintColor');
        if (menuTintInput && menuTintInput.dataset.wired !== 'true') {
            menuTintInput.dataset.wired = 'true';
            menuTintInput.addEventListener('input', (e) => {
                const tint = e.target.value;
                const op = menuOpacityInput ? parseFloat(menuOpacityInput.value) / 100 : 0.48;
                popup.style.setProperty('--fxn-menu-bg', hexToRgba(tint, op));
                updateGlassmorphism({ menuTintColor: tint });
            });
        }
    };
    initLiveThemeControls();

    // Close on Escape key
    if (!window.__fxnEscListenerAdded) {
        window.__fxnEscListenerAdded = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activePopup = document.querySelector('.foxen-popup.active');
                if (activePopup) {
                    activePopup.classList.remove('active');
                }
            }
        });
    }

    // Logo Brand Interactions:
    // LMB -> Cycle Theme: Dark -> Light -> Transparent -> Dark
    // RMB -> Open Accent Color Palette Popover with Glassmorphism Slider
    const brandEl = popup.querySelector('.brand');
    if (brandEl) {
        brandEl.style.cursor = 'pointer';
        brandEl.title = 'ЛКМ: Переключить тему (Тёмная / Светлая / Прозрачная) | ПКМ: Палитра & Glassmorphism';

        // LMB: Cycle 3 Themes
        brandEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (windowEl) {
                let currentTheme = 'dark';
                if (windowEl.classList.contains('light-theme')) {
                    currentTheme = 'light';
                } else if (windowEl.classList.contains('transparent-theme') || popup.classList.contains('fxn-menu-transparent')) {
                    currentTheme = 'transparent';
                }

                let nextTheme = 'light';
                if (currentTheme === 'dark') nextTheme = 'light';
                else if (currentTheme === 'light') nextTheme = 'transparent';
                else nextTheme = 'dark';

                applyPopupTheme(nextTheme);

                try {
                    const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                    if (storage && storage.local) {
                        storage.local.set({ foxenPopupTheme: nextTheme });
                    }
                } catch (_) {}

                const labels = {
                    'dark': 'Активирована тёмная тема',
                    'light': 'Активирована светлая тема',
                    'transparent': 'Активирована прозрачная тема (Glassmorphism)'
                };
                if (typeof showNotification === 'function') {
                    showNotification(labels[nextTheme] || 'Тема переключена', false);
                }
            }
        });

        // RMB: Open Accent Color Popover with Glassmorphism Slider
        brandEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const currentColor = window.__foxenAccentColor 
                || (function() { try { return localStorage.getItem('foxen_accent_color') || sessionStorage.getItem('foxen_accent_color'); } catch (_) { return null; } })()
                || '#c026d3';
            const curGlass = window.__foxenGlassBlur 
                || (function() { try { return parseInt(localStorage.getItem('foxen_glass_blur'), 10) || 16; } catch (_) { return 16; } })()
                || 16;
            if (typeof foxenOpenColorPicker === 'function') {
                foxenOpenColorPicker(brandEl, currentColor, (cleanHex) => {
                    window.__foxenAccentColor = cleanHex;
                    window.__fptUserAccent = cleanHex;
                    try {
                        localStorage.setItem('foxen_accent_color', cleanHex);
                        sessionStorage.setItem('foxen_accent_color', cleanHex);
                    } catch (_) {}
                    if (windowEl) {
                        windowEl.style.setProperty('--fxn-active', cleanHex);
                        windowEl.style.setProperty('--fxn-accent', cleanHex);
                    }
                    if (popup) {
                        popup.style.setProperty('--fxn-active', cleanHex);
                        popup.style.setProperty('--fxn-accent', cleanHex);
                    }
                    document.documentElement.style.setProperty('--fxn-active', cleanHex);
                    document.documentElement.style.setProperty('--fxn-accent', cleanHex);
                    document.documentElement.style.setProperty('--fxn-btn-color', cleanHex);
                    if (typeof applyButtonStyles === 'function') {
                        applyButtonStyles({ color: cleanHex });
                    }
                    const headerBtn = document.getElementById('foxenButton');
                    if (headerBtn) {
                        headerBtn.style.setProperty('color', cleanHex, 'important');
                    }

                    // Synchronize with "Акцентный цвет" in Appearance tab
                    const swatch2 = document.getElementById('themeBgColor2Swatch');
                    if (swatch2) swatch2.style.background = cleanHex;
                    const input2 = document.getElementById('themeBgColor2') || document.getElementById('themeColor2');
                    if (input2) input2.value = cleanHex;
                    if (typeof applyLiveThemeProperty === 'function') {
                        applyLiveThemeProperty('bgColor2', cleanHex);
                    }

                    try {
                        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                        if (storage && storage.local) {
                            storage.local.get('foxenTheme', (res) => {
                                const curTheme = res?.foxenTheme || {};
                                curTheme.bgColor2 = cleanHex;
                                storage.local.set({ 
                                    foxenAccentColor: cleanHex,
                                    foxenHeaderButtonStyles: { color: cleanHex },
                                    foxenTheme: curTheme
                                });
                            });
                        }
                    } catch (_) {}
                }, {
                    showGlassSlider: true,
                    initialGlass: curGlass,
                    onGlassChange: (val) => {
                        window.__foxenGlassBlur = val;
                        try {
                            localStorage.setItem('foxen_glass_blur', String(val));
                            sessionStorage.setItem('foxen_glass_blur', String(val));
                        } catch (_) {}
                        if (windowEl) {
                            windowEl.style.setProperty('--fxn-glass-blur', `${val}px`);
                        }
                        if (popup) {
                            popup.style.setProperty('--fxn-glass-blur', `${val}px`);
                            popup.style.setProperty('--fxn-menu-blur', `${val}px`);
                        }
                        document.documentElement.style.setProperty('--fxn-glass-blur', `${val}px`);
                        if (!windowEl?.classList.contains('transparent-theme')) {
                            applyPopupTheme('transparent');
                            try {
                                const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                                if (storage && storage.local) {
                                    storage.local.set({ foxenPopupTheme: 'transparent' });
                                }
                            } catch (_) {}
                        }
                        try {
                            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
                            if (storage && storage.local) {
                                storage.local.set({ foxenGlassBlur: val });
                            }
                        } catch (_) {}
                        const syncBlurInput = document.getElementById('fxnMenuBlur');
                        if (syncBlurInput) {
                            syncBlurInput.value = val;
                            const badge = document.getElementById('fxnMenuBlurValue');
                            if (badge) badge.textContent = `${val}px`;
                        }
                    }
                });
            }
        });
    }

    // Helper to switch active panel cleanly
    window.switchFoxenPanel = (targetId) => {
        const root = document.querySelector('.foxen-popup') || popup;
        if (!root) return;

        let effectiveId = targetId;
        let targetPanel = effectiveId ? (root.querySelector('#' + effectiveId) || root.querySelector(`[data-page="${effectiveId}"]`)) : null;

        // If targetId is unrecognized or missing, default to 'general'
        if (!targetPanel) {
            effectiveId = 'general';
            targetPanel = root.querySelector('#general') || root.querySelector('.panel');
        }

        const subitems = root.querySelectorAll('.nav-subitem');
        const panels = root.querySelectorAll('.panel');
        const groups = root.querySelectorAll('.nav-group');

        subitems.forEach(i => i.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        const targetSub = root.querySelector(`.nav-subitem[data-target="${effectiveId}"]`);
        if (targetSub) {
            targetSub.classList.add('active');
            const parentGroup = targetSub.closest('.nav-group');
            if (parentGroup) {
                groups.forEach(g => g.classList.remove('open'));
                parentGroup.classList.add('open');
            }
        }

        if (targetPanel) {
            targetPanel.classList.add('active');
            if (typeof updateAllSliders === 'function') {
                updateAllSliders(targetPanel);
            }
        }

        if (typeof window.fxnSyncDockbarActive === 'function') {
            window.fxnSyncDockbarActive();
        }

        // Trigger subtab initializers
        if (effectiveId === 'accounts' && typeof renderAccountsList === 'function') {
            renderAccountsList();
        } else if (effectiveId === 'tickets' && typeof initTicketsTab === 'function') {
            initTicketsTab();
        } else if (effectiveId === 'piggy_banks' && typeof initializePiggyBank === 'function') {
            initializePiggyBank();
        } else if (effectiveId === 'currency_calc' && typeof initializeCurrencyCalculator === 'function') {
            initializeCurrencyCalculator();
        } else if (effectiveId === 'calculator' && typeof initializeCalculatorLogic === 'function') {
            initializeCalculatorLogic();
        } else if (effectiveId === 'theme_gallery' && typeof loadThemeGallery === 'function') {
            loadThemeGallery();
        } else if (effectiveId === 'needs' && typeof initializeNeedsTab === 'function') {
            initializeNeedsTab();
        } else if (effectiveId === 'overview' && typeof initializeOverviewTour === 'function') {
            initializeOverviewTour();
        } else if (effectiveId === 'telegram' && typeof initializeTelegramUI === 'function') {
            initializeTelegramUI();
        } else if (effectiveId === 'slash_commands' && typeof initializeSlashCommandsUI === 'function') {
            initializeSlashCommandsUI();
        } else if (effectiveId === 'blacklist' && typeof initializeBlacklist === 'function') {
            initializeBlacklist();
        } else if (effectiveId === 'ai_settings' && typeof initializeAISettings === 'function') {
            initializeAISettings();
        } else if (effectiveId === 'lot_io' && typeof initializeLotIO === 'function') {
            initializeLotIO();
        } else if (effectiveId === 'notes' && typeof initializeNotes === 'function') {
            initializeNotes();
        } else if (effectiveId === 'settings_io') {
            if (typeof initializeSettingsIO === 'function') initializeSettingsIO();
            if (typeof initializeLotIO === 'function') initializeLotIO();
        } else if (effectiveId === 'theme' && typeof updateThemePreview === 'function') {
            updateThemePreview();
        } else if (effectiveId === 'effects' && typeof setupCursorFxHandlers === 'function') {
            setupCursorFxHandlers();
        }

        try {
            const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
            if (storage && storage.local) {
                storage.local.set({ foxenLastActivePage: effectiveId });
            }
        } catch (_) {}
    };

    // Accordion categories in sidebar
    const groups = popup.querySelectorAll('.nav-group');

    groups.forEach(group => {
        const header = group.querySelector('.nav-item.cat');
        if (header) {
            header.addEventListener('click', () => {
                const isCurrentlyOpen = group.classList.contains('open');
                groups.forEach(g => g.classList.remove('open'));
                if (!isCurrentlyOpen) {
                    group.classList.add('open');
                    const currentActiveSub = group.querySelector('.nav-subitem.active');
                    if (currentActiveSub) {
                        window.switchFoxenPanel(currentActiveSub.dataset.target);
                    } else {
                        const firstSub = group.querySelector('.nav-subitem');
                        if (firstSub) window.switchFoxenPanel(firstSub.dataset.target);
                    }
                }
            });
        }
    });

    // Subitem navigation
    const subitems = popup.querySelectorAll('.nav-subitem');
    subitems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            window.switchFoxenPanel(item.dataset.target);
        });
    });

    // Guarantee that at least one group is open and one panel is active
    const hasActivePanel = popup.querySelector('.panel.active');
    if (!hasActivePanel) {
        const firstGroup = popup.querySelector('.nav-group[data-group="main"]') || popup.querySelector('.nav-group');
        if (firstGroup) firstGroup.classList.add('open');
        const firstPanel = popup.querySelector('.panel#general') || popup.querySelector('.panel');
        if (firstPanel) firstPanel.classList.add('active');
        const firstSubitem = popup.querySelector('.nav-subitem[data-target="general"]') || popup.querySelector('.nav-subitem');
        if (firstSubitem) firstSubitem.classList.add('active');
    }

    // Redirect button in lot_io to master hub
    popup.querySelector('#lotIoGoMasterBtn')?.addEventListener('click', () => {
        window.switchFoxenPanel('settings_io');
    });

    // Universal Switch toggles (bidirectional sync with underlying controls & storage)
    popup.querySelectorAll('.switch[data-toggle]').forEach(wireUniversalSwitch);

    // Search filter across navigation items and panels
    const searchInput = popup.querySelector('#searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                subitems.forEach(si => si.style.display = '');
                groups.forEach(g => {
                    g.style.display = '';
                });
                return;
            }

            groups.forEach(g => {
                let anyVisible = false;
                g.querySelectorAll('.nav-subitem').forEach(si => {
                    const text = si.textContent.toLowerCase();
                    const match = text.includes(query);
                    si.style.display = match ? '' : 'none';
                    if (match) anyVisible = true;
                });
                g.style.display = anyVisible ? '' : 'none';
                if (anyVisible) {
                    g.classList.add('open');
                }
            });
        });
    }

    // Sidebar account status updater
    if (typeof fxnUpdateSidebarAccountWidget === 'function') {
        fxnUpdateSidebarAccountWidget(popup);
    }
}

// --- Foxen Nickname Effects Dictionary & Helpers ---
const NICKNAME_EFFECT_NAMES = {
    liquidGold: 'Жидкое золото',
    smokeVeil: 'Дымная вуаль',
    plasmaThreads: 'Плазменные нити',
    auroraFlow: 'Северное сияние',
    rippleReflection: 'Водная рябь',
    fallingLeaves: 'Золотые листья',
    magneticSheen: 'Магнитный блик',
    silverMercury: 'Ртутный металл',
    haloRing: 'Кольцо гало',
    auroraRibbon: 'Шёлковая лента',
    mercuryChase: 'Ртутная капля',
    gravityWells: 'Гравитационные вихри',
    waveInterference: 'Интерференция волн',
    chromeSweep: 'Хромовый блик',
    typewriterCaret: 'Бегущая искра',
    orbitRings: 'Орбитальные кольца',
    oilSlick: 'Масляная плёнка'
};

function fxnFormatNicknameEffectName(effect) {
    if (!effect) return 'Стандарт';
    let raw = effect;
    if (typeof raw === 'string') {
        try {
            if (raw.startsWith('{')) raw = JSON.parse(raw);
        } catch (_) {}
    }
    const id = (typeof raw === 'object' && raw) ? (raw.id || raw.effect || raw.name) : String(raw);
    if (!id || id === 'standard' || id === 'default' || id === 'none') {
        return 'Стандарт';
    }
    return NICKNAME_EFFECT_NAMES[id] || (typeof raw === 'object' && (raw.title || raw.name)) || id;
}

/**
 * Получение актуальной статистики FunPay (рейтинг и количество отзывов)
 */
async function fxnFetchFpUserStats(userId) {
    if (!userId) return null;
    try {
        // 1. Если пользователь находится на своей странице профиля, считываем напрямую из DOM
        if (window.location.pathname.startsWith(`/users/${userId}`)) {
            const rEl = document.querySelector('.rating .big, .user-profile-rating .big');
            const revEl = document.querySelector('.reviews-count, a[href*="/reviews"]');
            let rating = rEl ? rEl.textContent.trim().replace(/[^\d\.]/g, '') : null;
            let reviews = null;
            if (revEl) {
                const m = revEl.textContent.match(/(\d[\d\s]*)/);
                if (m) reviews = m[1].replace(/\s+/g, '');
            }
            if (rating || reviews) {
                const stats = { rating: rating || '5.0', reviewsCount: reviews || '0', ts: Date.now() };
                const api = typeof browser !== 'undefined' ? browser : chrome;
                api?.storage?.local?.set({ foxen_user_fp_stats: stats });
                return stats;
            }
        }

        // 2. Фоновый same-origin запрос к странице профиля FunPay
        const res = await fetch(`https://funpay.com/users/${encodeURIComponent(userId)}/`, {
            credentials: 'include',
            headers: { 'Accept': 'text/html' }
        });
        if (!res.ok) return null;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        let rating = null;
        const rEl = doc.querySelector('.rating .big, .user-profile-rating .big');
        if (rEl) rating = rEl.textContent.trim().replace(/[^\d\.]/g, '');
        if (!rating) {
            const m = html.match(/class=["'](?:rating-value|big)["']>([\d\.]+)</i);
            if (m) rating = m[1];
        }

        let reviews = null;
        const revEl = doc.querySelector('.reviews-count, a[href*="/reviews"], .user-profile-rating');
        if (revEl) {
            const m = revEl.textContent.match(/(\d[\d\s]*)\s*(?:отзыв|отзыва|отзывов|reviews)/i);
            if (m) reviews = m[1].replace(/\s+/g, '');
        }
        if (!reviews) {
            const m = html.match(/(\d[\d\s]*)\s*(?:отзыв|отзыва|отзывов)/i);
            if (m) reviews = m[1].replace(/\s+/g, '');
        }

        const stats = {
            rating: rating || '5.0',
            reviewsCount: reviews || '0',
            ts: Date.now()
        };
        const api = typeof browser !== 'undefined' ? browser : chrome;
        api?.storage?.local?.set({ foxen_user_fp_stats: stats });
        return stats;
    } catch (err) {
        console.warn('[Foxen Profile] Error fetching user stats from FunPay:', err);
        return null;
    }
}

async function fxnUpdateSidebarAccountWidget(popupEl) {
    if (!popupEl) return;

    // Инициализируем модалку и слушатели событий
    fxnInitSidebarProfileModal(popupEl);

    try {
        // 1. Быстрый сбор данных из DOM текущей страницы FunPay
        const usernameEl = document.querySelector('.user-link .user-link-name') || document.querySelector('.navbar-right .user-link');
        const domUsername = usernameEl ? usernameEl.textContent.trim() : null;
        
        let domAvatar = null;
        const avEl = document.querySelector('.user-link-dropdown .avatar-photo, .navbar-right .avatar-photo, .avatar-photo, .user-link img');
        if (avEl) {
            const bg = avEl.style?.backgroundImage || window.getComputedStyle(avEl).backgroundImage;
            if (bg && bg !== 'none') {
                const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (m) domAvatar = m[1];
            }
            if (!domAvatar && avEl.getAttribute('src')) domAvatar = avEl.getAttribute('src');
        }

        let domUserId = null;
        const userLinkEl = document.querySelector('.user-link[href*="/users/"], .navbar-right a[href*="/users/"]');
        if (userLinkEl) {
            const m = userLinkEl.getAttribute('href')?.match(/\/users\/(\d+)/);
            if (m) domUserId = m[1];
        }

        // 2. Чтение локального кэша для мгновенного отображения (0ms задержка)
        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
        let cached = null;
        let storeData = null;
        if (storage && storage.local) {
            storeData = await storage.local.get([
                'foxenUserProfileCache', 
                'foxenUserProfile', 
                'foxen_user_profile', 
                'fpCurrentUserInfo', 
                'fxn_my_nickname_effect', 
                'foxen_user_fp_stats'
            ]);
            cached = storeData?.foxenUserProfileCache?.data || storeData?.foxenUserProfile || storeData?.foxen_user_profile || null;
            if (!domUserId && storeData?.fpCurrentUserInfo?.userId) {
                domUserId = String(storeData.fpCurrentUserInfo.userId);
            }
        }

        // Определяем эффект ника из хранилища или runtime
        let myEff = null;
        if (typeof window.__foxenGetMyNicknameEffect === 'function') {
            myEff = window.__foxenGetMyNicknameEffect();
        }
        if (!myEff && storeData?.fxn_my_nickname_effect) {
            myEff = storeData.fxn_my_nickname_effect;
        }
        if (!myEff && storeData?.foxen_user_profile?.nickname_effect) {
            myEff = storeData.foxen_user_profile.nickname_effect;
        }
        if (!myEff && storeData?.foxenUserProfile?.nickname_effect) {
            myEff = storeData.foxenUserProfile.nickname_effect;
        }
        if (!myEff && cached?.nickname_effect) {
            myEff = cached.nickname_effect;
        }

        const cachedStats = storeData?.foxen_user_fp_stats || null;

        // Рендерим предварительные данные
        const initialData = {
            username: domUsername || cached?.fp_user || cached?.username || 'FunPay Seller',
            avatar: domAvatar || cached?.avatar_url || cached?.avatarUrl || null,
            userId: domUserId || cached?.fp_user_id || cached?.userId || null,
            foxenId: cached?.foxen_id || cached?.FOXEN_ID || (domUserId ? `FX-${domUserId}` : 'FX-000000'),
            subscription: cached?.subscription || (cached?.SUBSCRIPTION === 'free' ? { is_active: false } : { is_active: true, plan_id: cached?.SUBSCRIPTION || 'premium' }),
            tgUsername: cached?.tg_username || cached?.TG_USER || null,
            isVerified: Boolean(cached?.is_fp_verified),
            nicknameEffect: myEff,
            createdAt: cached?.created_at || cached?.CREATED_AT || null,
            rating: cachedStats?.rating || null,
            reviewsCount: cachedStats?.reviewsCount || null
        };

        fxnRenderSidebarProfileUI(popupEl, initialData);

        // 3. Фоновый запрос актуальных данных из БД (Supabase / Worker / FunPay)
        fxnRefreshSidebarProfileData(popupEl, false);
    } catch (err) {
        console.warn('[Foxen Profile] Error updating sidebar account:', err);
    }
}

/**
 * Инициализация обработчиков интерактивности модального окна профиля внутри сайдбара
 */
function fxnInitSidebarProfileModal(popupEl) {
    if (!popupEl || popupEl._fxnSpmInitialized) return;
    popupEl._fxnSpmInitialized = true;

    const widget = popupEl.querySelector('#fxnSidebarAccountWidget');
    const modal = popupEl.querySelector('#fxnSidebarProfileModal');
    const backBtn = popupEl.querySelector('#fxnSpmBackBtn');
    const refreshBtn = popupEl.querySelector('#fxnSpmRefreshBtn');
    const copyIdBtn = popupEl.querySelector('#fxnSpmCopyIdBtn');
    const effectRow = popupEl.querySelector('#fxnSpmEffectRow');
    const ratingBox = popupEl.querySelector('#fxnSpmRatingBox');
    const reviewsBox = popupEl.querySelector('#fxnSpmReviewsBox');
    const statsBtn = popupEl.querySelector('#fxnSpmStatsBtn') || popupEl.querySelector('#fxnSpmStatsLink');
    const sidebar = popupEl.querySelector('.sidebar');
    const accountRow = popupEl.querySelector('.account');

    if (!modal) return;

    const openModal = () => {
        const isTransparent = popupEl.classList.contains('fxn-menu-transparent') ||
            popupEl.querySelector('.window')?.classList.contains('transparent-theme') ||
            document.documentElement?.classList.contains('fxn-popup-theme-transparent') ||
            document.documentElement?.getAttribute('data-fxn-popup-theme') === 'transparent';
        modal.classList.toggle('transparent-theme', Boolean(isTransparent));
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        if (sidebar) {
            sidebar.classList.add('has-profile-modal-open');
            // Скрываем все соседние элементы сайдбара (категории, поиск, бренд, аккаунт), чтобы прозрачность не мешала чтению
            sidebar.querySelectorAll('.brand, .sidebar-divider, .search, .nav, .account').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        }
        fxnRefreshSidebarProfileData(popupEl, false);
        // Запуск перерисовки эффекта ника на отображаемом имени в профиле
        if (typeof window.__foxenScanAndApplyNicknameEffects === 'function') {
            setTimeout(() => window.__foxenScanAndApplyNicknameEffects(), 60);
        }
    };

    const closeModal = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        if (sidebar) {
            sidebar.classList.remove('has-profile-modal-open');
            // Восстанавливаем видимость элементов сайдбара
            sidebar.querySelectorAll('.brand, .sidebar-divider, .search, .nav, .account').forEach(el => {
                el.style.removeProperty('display');
            });
        }
    };

    // Открытие по клику на плашку профиля в футере сайдбара
    if (widget) {
        widget.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modal.classList.contains('open')) {
                closeModal();
            } else {
                openModal();
            }
        });
    }

    // Закрытие по кнопке «Назад»
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
        });
    }

    // Принудительное обновление данных из БД
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fxnRefreshSidebarProfileData(popupEl, true);
        });
    }

    // Копирование Foxen ID в буфер обмена с тактильной обратной связью
    if (copyIdBtn) {
        copyIdBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const idTag = popupEl.querySelector('#fxnSpmFoxenId');
            const idText = idTag ? idTag.textContent.trim() : '';
            if (!idText) return;

            try {
                await navigator.clipboard.writeText(idText);
                const icon = copyIdBtn.querySelector('.material-symbols-rounded');
                if (icon) {
                    const prev = icon.textContent;
                    icon.textContent = 'check';
                    copyIdBtn.style.color = '#10b981';
                    setTimeout(() => {
                        icon.textContent = prev;
                        copyIdBtn.style.color = '';
                    }, 1800);
                }
            } catch (_) {}
        });
    }

    // Интерактивный переход к странице эффектов при клике на строку «Эффект ника»
    if (effectRow) {
        effectRow.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
            const effectsItem = popupEl.querySelector('.nav-subitem[data-target="effects"]');
            if (effectsItem) {
                effectsItem.click();
            }
        });
    }

    // Интерактивный переход в профиль/отзывы при клике на плашки статистики
    const getResolvedUserId = () => {
        if (popupEl._fxnSpmCurrentUserId && popupEl._fxnSpmCurrentUserId !== '—') {
            return String(popupEl._fxnSpmCurrentUserId);
        }
        const text = popupEl.querySelector('#fxnSpmFpUserId')?.textContent?.trim();
        if (text && text !== '—' && text !== '') {
            return text;
        }
        const linkHref = popupEl.querySelector('#fxnSpmFpUserLink')?.getAttribute('href');
        const mHref = linkHref?.match(/\/users\/(\d+)/);
        if (mHref) return mHref[1];
        const domLink = document.querySelector('.user-link[href*="/users/"], .navbar-right a[href*="/users/"]');
        const mDom = domLink?.getAttribute('href')?.match(/\/users\/(\d+)/);
        if (mDom) return mDom[1];
        const mPath = window.location.pathname.match(/\/users\/(\d+)/);
        if (mPath) return mPath[1];
        return null;
    };

    const openUserReviews = (hash = '') => {
        const userId = getResolvedUserId();
        const targetHash = hash ? (hash.startsWith('#') ? hash : '#' + hash) : '';
        if (userId) {
            // Если пользователь уже находится на своей странице профиля, скроллим к отзывам
            if (window.location.pathname.startsWith(`/users/${userId}`) && targetHash) {
                const el = document.querySelector(targetHash) || document.querySelector('.reviews, .review-list, .user-profile-reviews');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    window.location.hash = targetHash.replace(/^#/, '');
                    return;
                }
            }
            const url = `https://funpay.com/users/${encodeURIComponent(userId)}/${targetHash}`;
            window.open(url, '_blank');
        } else {
            if (targetHash) {
                const el = document.querySelector(targetHash) || document.querySelector('.reviews, .review-list, .user-profile-reviews');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    window.location.hash = targetHash.replace(/^#/, '');
                }
            }
        }
    };

    if (ratingBox) ratingBox.addEventListener('click', () => openUserReviews('#reviews'));
    if (reviewsBox) reviewsBox.addEventListener('click', () => openUserReviews('#reviews'));
    if (statsBtn) statsBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openUserReviews(''); });

    // Закрытие по нажатию клавиши Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });
}

/**
 * Отрисовка данных профиля в сайдбар и в модальное окно
 */
function fxnRenderSidebarProfileUI(popupEl, data) {
    if (!popupEl || !data) return;

    const username = data.username || 'FunPay Seller';
    const avatar = data.avatar || (typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/icon48.png') : 'https://funpay.com/img/layout/avatar.png');
    const foxenId = data.foxenId || 'FX-000000';
    const userId = data.userId || null;
    if (userId) {
        popupEl._fxnSpmCurrentUserId = userId;
    }
    const sub = data.subscription || {};

    const isLifetime = Boolean(sub.is_lifetime || sub.plan_id === 'lifetime' || (!sub.expires_at && (sub.is_active || data.is_premium)));
    const isActive = Boolean(sub.is_active || isLifetime || data.is_premium || data.isPremium || (data.subscription && (data.subscription === 'premium' || data.subscription.is_active)));
    
    const tagText = isActive ? 'PREMIUM' : 'FREE';
    const planName = isActive ? 'PREMIUM' : 'FREE';

    // 1. Обновляем плашку в сайдбаре
    const sbName = popupEl.querySelector('#fxnSidebarUsername');
    if (sbName) sbName.textContent = username;

    const sbAvatar = popupEl.querySelector('#fxnSidebarAvatar');
    if (sbAvatar && avatar) sbAvatar.src = avatar;

    const sbTag = popupEl.querySelector('#fxnSidebarTag');
    if (sbTag) {
        sbTag.textContent = tagText;
        if (isActive) {
            sbTag.style.background = 'var(--fxn-text-main)';
            sbTag.style.color = 'var(--fxn-sidebar-color)';
            sbTag.style.borderColor = 'var(--fxn-text-main)';
        } else {
            sbTag.style.background = 'transparent';
            sbTag.style.color = 'var(--fxn-text-subtle)';
            sbTag.style.borderColor = 'var(--fxn-divider-color)';
        }
    }

    const sbSub = popupEl.querySelector('#fxnSidebarSub');
    if (sbSub) {
        sbSub.textContent = foxenId !== 'FX-000000' ? foxenId : 'Foxen active';
    }

    // 2. Обновляем модальное окно
    const spmAvatar = popupEl.querySelector('#fxnSpmAvatar');
    if (spmAvatar && avatar) spmAvatar.src = avatar;

    const spmName = popupEl.querySelector('#fxnSpmUsername');
    if (spmName) {
        spmName.textContent = username;
        if (typeof window.__foxenScanAndApplyNicknameEffects === 'function') {
            setTimeout(() => window.__foxenScanAndApplyNicknameEffects(), 50);
        }
    }

    const spmId = popupEl.querySelector('#fxnSpmFoxenId');
    if (spmId) spmId.textContent = foxenId;

    const spmFpUserId = popupEl.querySelector('#fxnSpmFpUserId');
    const spmFpLink = popupEl.querySelector('#fxnSpmFpUserLink');
    if (spmFpUserId && userId) {
        spmFpUserId.textContent = userId;
        if (spmFpLink) {
            spmFpLink.href = `https://funpay.com/users/${encodeURIComponent(userId)}/`;
            spmFpLink.style.display = 'inline-flex';
        }
    } else if (spmFpLink) {
        spmFpLink.style.display = 'none';
    }

    // Подписка: тариф и статус (одно упоминание тарифа, без слова Foxen, стиль small caps + shimmer)
    const spmSubPlan = popupEl.querySelector('#fxnSpmSubPlan');
    if (spmSubPlan) {
        spmSubPlan.textContent = planName;
        spmSubPlan.classList.toggle('fxn-premium-shimmer', isActive);
    }

    const spmSubStatus = popupEl.querySelector('#fxnSpmSubStatus');
    const spmStatusDot = popupEl.querySelector('#fxnSpmStatusDot');
    if (spmSubStatus) {
        spmSubStatus.textContent = isActive ? 'Активна' : 'Не активна';
    }
    if (spmStatusDot) {
        spmStatusDot.className = `fxn-spm-status-dot ${isActive ? 'active' : ''}`;
    }

    // Срок действия
    const spmSubExpiry = popupEl.querySelector('#fxnSpmSubExpiry');
    if (spmSubExpiry) {
        if (!isActive) {
            spmSubExpiry.textContent = '—';
        } else if (isLifetime || !sub.expires_at) {
            spmSubExpiry.textContent = 'Бессрочно';
        } else if (sub.expires_at) {
            try {
                spmSubExpiry.textContent = new Date(sub.expires_at).toLocaleDateString('ru-RU');
            } catch (_) {
                spmSubExpiry.textContent = String(sub.expires_at);
            }
        } else {
            spmSubExpiry.textContent = 'Бессрочно';
        }
    }

    // Экосистема: Telegram (простой текст без ссылок)
    const spmTgUser = popupEl.querySelector('#fxnSpmTgUser');
    if (spmTgUser) {
        if (data.tgUsername) {
            const cleanTg = String(data.tgUsername).replace(/^@+/, '').trim();
            spmTgUser.textContent = cleanTg ? `@${cleanTg}` : 'Не привязан';
        } else {
            spmTgUser.textContent = 'Не привязан';
        }
    }

    const spmVerifiedText = popupEl.querySelector('#fxnSpmVerifiedText');
    if (spmVerifiedText) {
        spmVerifiedText.textContent = data.isVerified ? 'Подтверждён' : 'Базовая';
    }

    // Эффект ника: простое текстовое название эффекта без плашек и иконок
    const spmEffect = popupEl.querySelector('#fxnSpmEffectVal');
    if (spmEffect) {
        const effectName = fxnFormatNicknameEffectName(data.nicknameEffect);
        spmEffect.textContent = effectName || 'Стандарт';
    }

    const spmCreated = popupEl.querySelector('#fxnSpmCreatedAt');
    if (spmCreated) {
        if (data.createdAt) {
            try {
                spmCreated.textContent = new Date(data.createdAt).toLocaleDateString('ru-RU');
            } catch (_) {
                spmCreated.textContent = String(data.createdAt).slice(0, 10);
            }
        } else {
            spmCreated.textContent = '—';
        }
    }

    // FunPay статистика: Рейтинг и Отзывы
    const ratingVal = popupEl.querySelector('#fxnSpmRatingVal');
    if (ratingVal) {
        ratingVal.textContent = data.rating ? String(data.rating) : '5.0';
    }

    const reviewsVal = popupEl.querySelector('#fxnSpmReviewsVal');
    if (reviewsVal) {
        reviewsVal.textContent = data.reviewsCount !== null && data.reviewsCount !== undefined ? String(data.reviewsCount) : '—';
    }
}

/**
 * Запрос свежих данных профиля из БД через api.foxen.site / Worker / Supabase + FunPay Live Stats
 */
async function fxnRefreshSidebarProfileData(popupEl, isManual = false) {
    if (!popupEl) return;

    const refreshBtn = popupEl.querySelector('#fxnSpmRefreshBtn');
    if (isManual && refreshBtn) {
        refreshBtn.classList.add('fxn-spm-spinning');
    }

    try {
        // Определяем идентификатор пользователя (fp_user_id, username или Foxen ID)
        const usernameEl = document.querySelector('.user-link .user-link-name') || document.querySelector('.navbar-right .user-link');
        const username = usernameEl ? usernameEl.textContent.trim() : null;

        let domAvatar = null;
        const avEl = document.querySelector('.user-link-dropdown .avatar-photo, .navbar-right .avatar-photo, .avatar-photo, .user-link img');
        if (avEl) {
            const bg = avEl.style?.backgroundImage || window.getComputedStyle(avEl).backgroundImage;
            if (bg && bg !== 'none') {
                const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (m) domAvatar = m[1];
            }
            if (!domAvatar && avEl.getAttribute('src')) domAvatar = avEl.getAttribute('src');
        }

        const userLinkEl = document.querySelector('.user-link[href*="/users/"], .navbar-right a[href*="/users/"]');
        if (userLinkEl) {
            const m = userLinkEl.getAttribute('href')?.match(/\/users\/(\d+)/);
            if (m) userId = m[1];
        }

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
        let cached = null;
        let storeData = null;
        if (storage && storage.local) {
            storeData = await storage.local.get([
                'foxenUserProfileCache', 
                'foxenUserProfile', 
                'foxen_user_profile', 
                'fpCurrentUserInfo', 
                'fxn_my_nickname_effect', 
                'foxen_user_fp_stats'
            ]);
            cached = storeData?.foxenUserProfileCache?.data || storeData?.foxenUserProfile || storeData?.foxen_user_profile || null;
            if (!userId && storeData?.fpCurrentUserInfo?.userId) {
                userId = String(storeData.fpCurrentUserInfo.userId);
            }
        }

        const identifier = userId || username || cached?.fp_user || cached?.username || cached?.foxen_id;
        if (!identifier) {
            if (isManual && refreshBtn) refreshBtn.classList.remove('fxn-spm-spinning');
            return;
        }

        // Параллельно запрашиваем живую статистику FunPay (рейтинг и отзывы)
        let liveStats = storeData?.foxen_user_fp_stats || null;
        const statsPromise = userId ? fxnFetchFpUserStats(userId) : Promise.resolve(null);

        let freshProfile = null;

        // 1. Пробуем функцию из supabase_client.js
        if (typeof fxnFetchProfileByFpUser === 'function') {
            try {
                freshProfile = await fxnFetchProfileByFpUser(identifier);
            } catch (_) {}
        }

        // 2. Фоллбэк к Worker API
        if (!freshProfile) {
            try {
                const apiRes = await fetch(`https://api.foxen.site/api/users/${encodeURIComponent(identifier)}`, {
                    credentials: 'omit',
                    headers: { 'Accept': 'application/json' }
                });
                if (apiRes.ok) {
                    const json = await apiRes.json();
                    if (json && json.ok && json.profile) {
                        const p = json.profile;
                        freshProfile = {
                            FP_USER: p.fp_user || username,
                            FP_USER_ID: p.fp_user_id || userId,
                            FOXEN_ID: p.foxen_id,
                            TG_USER: p.tg_username,
                            SUBSCRIPTION: p.subscription,
                            avatar_url: p.avatar_url,
                            is_fp_verified: p.is_fp_verified,
                            nickname_effect: p.nickname_effect,
                            CREATED_AT: p.created_at,
                            is_premium: Boolean(p.is_premium || p.subscription?.is_active)
                        };
                    }
                }
            } catch (_) {}
        }

        // 3. Прямой запрос к Supabase profiles
        const supabaseUrl = 'https://yoacfrbedwksnfksjjmv.supabase.co';
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ';
        if (!freshProfile || (!freshProfile.subscription?.is_active && !freshProfile.is_premium)) {
            try {
                const target = encodeURIComponent(identifier);
                const q = `or=(foxen_id.eq.${target},fp_user.ilike.${target},fp_user_id.eq.${target})`;
                const sbRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${q}&select=*&limit=1`, {
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (sbRes.ok) {
                    const sbList = await sbRes.json();
                    if (sbList && sbList.length > 0) {
                        const sbProf = sbList[0];
                        if (!freshProfile) {
                            freshProfile = {
                                FP_USER: sbProf.fp_user || username,
                                FP_USER_ID: sbProf.fp_user_id || userId,
                                FOXEN_ID: sbProf.foxen_id,
                                TG_USER: sbProf.tg_username,
                                avatar_url: sbProf.avatar_url,
                                is_fp_verified: sbProf.is_fp_verified,
                                nickname_effect: sbProf.nickname_effect,
                                CREATED_AT: sbProf.created_at,
                                is_premium: sbProf.is_premium
                            };
                        }
                        if (sbProf.is_premium) {
                            freshProfile.is_premium = true;
                            if (!freshProfile.subscription || !freshProfile.subscription.is_active) {
                                freshProfile.subscription = {
                                    is_active: true,
                                    is_lifetime: true,
                                    plan_id: 'premium',
                                    status: 'active',
                                    expires_at: null
                                };
                            }
                        }
                        if (sbProf.foxen_id) freshProfile.FOXEN_ID = sbProf.foxen_id;
                        if (sbProf.nickname_effect) freshProfile.nickname_effect = sbProf.nickname_effect;
                    }
                }
            } catch (_) {}
        }

        // 4. Запрос к таблице subscriptions для получения срока действия
        const activeFid = freshProfile?.FOXEN_ID || freshProfile?.foxen_id;
        if (activeFid) {
            try {
                const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?foxen_id=eq.${encodeURIComponent(activeFid)}&select=*&limit=1`, {
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (subRes.ok) {
                    const sList = await subRes.json();
                    if (sList && sList.length > 0) {
                        const s = sList[0];
                        const isSActive = s.status === 'active' || s.is_lifetime || (s.expires_at && new Date(s.expires_at) > new Date());
                        if (isSActive) {
                            freshProfile.subscription = {
                                is_active: true,
                                is_lifetime: Boolean(s.is_lifetime || s.plan_id === 'lifetime'),
                                plan_id: 'premium',
                                status: s.status || 'active',
                                starts_at: s.starts_at,
                                expires_at: s.expires_at
                            };
                            freshProfile.is_premium = true;
                        }
                    }
                }
            } catch (_) {}
        }

        // Ждем результат запроса статистики FunPay
        const fetchedStats = await statsPromise;
        if (fetchedStats) {
            liveStats = fetchedStats;
        }

        // Определяем актуальный эффект ника
        let myEff = freshProfile?.nickname_effect;
        if (!myEff && typeof window.__foxenGetMyNicknameEffect === 'function') {
            myEff = window.__foxenGetMyNicknameEffect();
        }
        if (!myEff && storeData?.fxn_my_nickname_effect) {
            myEff = storeData.fxn_my_nickname_effect;
        }
        if (!myEff && storeData?.foxen_user_profile?.nickname_effect) {
            myEff = storeData.foxen_user_profile.nickname_effect;
        }

        if (freshProfile) {
            const rawSub = freshProfile.subscription || {};
            const isPrem = Boolean(freshProfile.is_premium || rawSub.is_active || rawSub.is_lifetime);
            const isLife = Boolean(rawSub.is_lifetime || rawSub.plan_id === 'lifetime' || !rawSub.expires_at);

            const normalizedSub = {
                is_active: isPrem,
                is_lifetime: isLife,
                plan_id: 'premium',
                status: isPrem ? 'active' : 'inactive',
                starts_at: rawSub.starts_at || null,
                expires_at: rawSub.expires_at || null
            };

            const normalized = {
                username: freshProfile.FP_USER || freshProfile.fp_user || username,
                avatar: freshProfile.avatar_url || null,
                userId: freshProfile.FP_USER_ID || freshProfile.fp_user_id || userId,
                foxenId: freshProfile.FOXEN_ID || freshProfile.foxen_id || (userId ? `FX-${userId}` : 'FX-000000'),
                subscription: normalizedSub,
                is_premium: isPrem,
                tgUsername: freshProfile.TG_USER || freshProfile.tg_username || null,
                isVerified: Boolean(freshProfile.is_fp_verified),
                nicknameEffect: myEff || freshProfile.nickname_effect || null,
                createdAt: freshProfile.CREATED_AT || freshProfile.created_at || null,
                rating: liveStats?.rating || null,
                reviewsCount: liveStats?.reviewsCount || null
            };

            if (domAvatar && domAvatar.startsWith('http') && !domAvatar.includes('layout/avatar.png')) {
                if (freshProfile && freshProfile.avatar_url !== domAvatar) {
                    freshProfile.avatar_url = domAvatar;
                    normalized.avatar = domAvatar;
                }
                // Асинхронно синхронизируем свежую аватарку с Supabase profiles для сайта
                (async () => {
                    try {
                        const qTarget = encodeURIComponent(identifier);
                        const patchFilter = `or=(foxen_id.eq.${qTarget},fp_user.ilike.${qTarget},fp_user_id.eq.${qTarget})`;
                        await fetch(`${supabaseUrl}/rest/v1/profiles?${patchFilter}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify({
                                avatar_url: domAvatar,
                                updated_at: new Date().toISOString()
                            })
                        });
                        console.log('[Foxen Profile] Synchronized updated avatar_url to Supabase profiles:', domAvatar);
                    } catch(err) {
                        console.warn('[Foxen Profile] Failed to sync avatar to Supabase:', err);
                    }
                })();
            }

            fxnRenderSidebarProfileUI(popupEl, normalized);

            // Кэшируем в local storage
            if (storage && storage.local) {
                storage.local.set({
                    foxenUserProfileCache: { data: freshProfile, ts: Date.now() }
                });
            }
        } else if (liveStats) {
            // Если профиль в БД не найден, но обновилась статистика FunPay
            const rVal = popupEl.querySelector('#fxnSpmRatingVal');
            if (rVal && liveStats.rating) rVal.textContent = String(liveStats.rating);
            const rvVal = popupEl.querySelector('#fxnSpmReviewsVal');
            if (rvVal && liveStats.reviewsCount) rvVal.textContent = String(liveStats.reviewsCount);
        }
    } catch (e) {
        console.warn('[Foxen Profile] Error refreshing data:', e);
    } finally {
        if (refreshBtn) {
            setTimeout(() => {
                refreshBtn.classList.remove('fxn-spm-spinning');
            }, 300);
        }
    }
}

function makePopupInteractive(popup) {
    if (popup) initMainPopupEvents(popup);
}

async function loadLastActivePage() {
    try {
        const popup = document.querySelector('.foxen-popup');
        if (!popup) return;

        const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;
        let lastPage = null;
        if (storage && storage.local) {
            const data = await storage.local.get('foxenLastActivePage');
            lastPage = data?.foxenLastActivePage;
        }

        if (lastPage && typeof window.switchFoxenPanel === 'function') {
            window.switchFoxenPanel(lastPage);
            return;
        }

        if (typeof window.switchFoxenPanel === 'function') {
            window.switchFoxenPanel('general');
        }
    } catch (_) {}
}

// Pre-load fonts eagerly
injectFoxenFonts();

function fxnToggleFloatingHUD(forceShow) {
    let hud = document.getElementById('fxn-floating-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'fxn-floating-hud';
        hud.className = 'fxn-floating-hud';
        const logoUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL('icons/icon48.png') : '';
        hud.innerHTML = `
            <div class="fxn-hud-brand">
                <img src="${logoUrl}" class="fxn-hud-logo" alt="Foxen">
                <span class="fxn-hud-title">FOXEN</span>
            </div>
            <div class="fxn-hud-actions">
                <button type="button" id="fxnHudBumpBtn" class="fxn-hud-btn" title="Авто-поднятие лотов">
                    <span class="material-icons" style="font-size:16px;">upgrade</span>
                </button>
                <button type="button" id="fxnHudReviewBtn" class="fxn-hud-btn" title="Авто-ответы">
                    <span class="material-icons" style="font-size:16px;">rate_review</span>
                </button>
                <button type="button" id="fxnHudRestoreBtn" class="fxn-hud-btn fxn-hud-btn-accent" title="Развернуть окно Foxen">
                    <span class="material-icons" style="font-size:16px;">open_in_full</span>
                </button>
                <button type="button" id="fxnHudCloseBtn" class="fxn-hud-btn fxn-hud-btn-close" title="Закрыть виджет">
                    <span class="material-icons" style="font-size:16px;">close</span>
                </button>
            </div>
        `;
        document.body.appendChild(hud);

        const updateHudStates = async () => {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const data = await ext.storage.local.get(['foxenAutoBumpRunning', 'foxenAutoReplies']);
            const bumpBtn = hud.querySelector('#fxnHudBumpBtn');
            if (bumpBtn) bumpBtn.classList.toggle('on', !!data.foxenAutoBumpRunning);
            const reviewBtn = hud.querySelector('#fxnHudReviewBtn');
            if (reviewBtn) reviewBtn.classList.toggle('on', !!data.foxenAutoReplies?.enabled);
        };
        updateHudStates();

        hud.querySelector('#fxnHudBumpBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenAutoBumpRunning } = await ext.storage.local.get('foxenAutoBumpRunning');
            const newState = !foxenAutoBumpRunning;
            if (newState) {
                if (typeof startAutoBump === 'function') startAutoBump(245);
                else ext.runtime.sendMessage({ action: 'startAutoBump', cooldownMinutes: 245 });
            } else {
                if (typeof stopAutoBump === 'function') stopAutoBump();
                else ext.runtime.sendMessage({ action: 'stopAutoBump' });
            }
            hud.querySelector('#fxnHudBumpBtn')?.classList.toggle('on', newState);
            if (typeof showNotification === 'function') showNotification(newState ? 'Авто-поднятие запущено' : 'Авто-поднятие остановлено');
        });

        hud.querySelector('#fxnHudReviewBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            const { foxenAutoReplies = {} } = await ext.storage.local.get('foxenAutoReplies');
            foxenAutoReplies.enabled = !foxenAutoReplies.enabled;
            await ext.storage.local.set({ foxenAutoReplies });
            hud.querySelector('#fxnHudReviewBtn')?.classList.toggle('on', foxenAutoReplies.enabled);
            if (typeof showNotification === 'function') showNotification(foxenAutoReplies.enabled ? 'Авто-ответы включены' : 'Авто-ответы выключены');
        });

        hud.querySelector('#fxnHudRestoreBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            hud.style.display = 'none';
            const popup = document.getElementById('foxenMainPopup');
            if (popup) popup.classList.add('active');
        });

        hud.querySelector('#fxnHudCloseBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            hud.style.display = 'none';
        });
    }

    if (forceShow !== undefined) {
        hud.style.display = forceShow ? 'flex' : 'none';
    } else {
        hud.style.display = (hud.style.display === 'none' || !hud.style.display) ? 'flex' : 'none';
    }
}

if (typeof window !== 'undefined') {
    window.createMainPopup = createMainPopup;
}
