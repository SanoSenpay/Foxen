

(function initRMTHubSearch() {
    'use strict';

    const DEF_AVA  = 'https://funpay.com/img/layout/avatar.png';
    const WRAP_ID  = 'fp-rmthub-form';
    const INPUT_ID = 'fp-rmthub-input';
    const DROP_ID  = 'fp-rmthub-drop';

    let debTimer = null;
    let busy     = false;

    // ── Extra styles only for the card dropdown ───────────────────────────────
    // The form itself reuses FunPay's own CSS classes (form-control, dropdown-menu, etc.)
    function injectStyles() {
        if (document.getElementById('fp-rmthub-css')) return;
        const s = document.createElement('style');
        s.id = 'fp-rmthub-css';
        s.textContent = `
        /* Form & Input Layout */
        .fp-rmthub-form {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin-top: 11px !important;
            margin-bottom: 11px !important;
            padding-left: 5px !important;
            padding-right: 5px !important;
            vertical-align: middle !important;
        }
        .fp-rmthub-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            margin-bottom: 0 !important;
        }
        #fp-rmthub-input {
            width: 118px !important;
            height: 34px !important;
            padding: 6px 26px 6px 14px !important;
            border-radius: 10px !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #f3f4f6 !important;
            box-sizing: border-box !important;
            transition: all 0.2s ease !important;
            outline: none !important;
        }
        #fp-rmthub-input:focus {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: var(--fxn-accent, var(--fxn-accent-color, #20ff00)) !important;
            box-shadow: 0 0 12px var(--fxn-accent-soft, rgba(32, 255, 0, 0.25)) !important;
        }

        /* Search button placed outside input */
        .fp-rmthub-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 34px !important;
            width: 34px !important;
            min-width: 34px !important;
            padding: 0 !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: var(--fxn-theme-text-color, #d1d5db) !important;
            transition: all 0.2s ease !important;
            flex-shrink: 0 !important;
            outline: none !important;
            box-sizing: border-box !important;
        }
        .fp-rmthub-btn:hover {
            border-color: var(--fxn-accent, var(--fxn-accent-color, #20ff00)) !important;
            color: var(--fxn-accent, var(--fxn-accent-color, #20ff00)) !important;
            background: rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 0 10px var(--fxn-accent-soft, rgba(32, 255, 0, 0.25)) !important;
        }
        .fp-rmthub-btn:active {
            transform: scale(0.95);
        }

        /* Spinner inside the input */
        #fp-rmthub-spin {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
            width: 13px;
            height: 13px;
            border: 2px solid rgba(160, 158, 248, .2);
            border-top-color: var(--fxn-accent, var(--fxn-accent-color, #E9A8FF));
            border-radius: 50%;
            animation: rmths .7s linear infinite;
            pointer-events: none;
            z-index: 10;
        }
        @keyframes rmths{to{transform:translateY(-50%) rotate(360deg)}}

        /* Dropdown Card & Glassmorphism */
        #fp-rmthub-drop,
        .fp-rmthub-drop {
            position: absolute !important;
            z-index: 999999 !important;
            min-width: 320px !important;
            max-width: 360px !important;
            padding: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            background: rgba(14, 16, 26, 0.75) !important;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%),
                        color-mix(in srgb, var(--fxn-theme-container-bg, rgba(14, 16, 26, 0.75)) 78%, transparent) !important;
            backdrop-filter: blur(18px) saturate(160%) brightness(1.04) !important;
            -webkit-backdrop-filter: blur(18px) saturate(160%) brightness(1.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            border-radius: var(--fxn-theme-border-radius, 12px) !important;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
            color: var(--fxn-theme-text-color, #e4e4e7) !important;
            transition: opacity 0.15s ease, transform 0.15s ease;
        }

        #fp-rmthub-drop.hidden,
        .fp-rmthub-drop.hidden {
            display: none !important;
        }

        /* Hint tooltip */
        #fp-rmthub-drop .rmth-hint {
            padding: 12px 14px;
            font-size: 11.5px;
            color: var(--fxn-theme-text-color, #d1d5db);
            text-align: center;
            letter-spacing: .2px;
            line-height: 1.45;
        }
        #fp-rmthub-drop .rmth-hint small {
            font-size: 10px;
            opacity: .65;
            display: block;
            margin-top: 3px;
        }

        /* Card styles inside the dropdown */
        .fp-rmthub-drop .rmth-card { padding: 14px; }
        .fp-rmthub-drop .rmth-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .fp-rmthub-drop .rmth-ava {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--fxn-accent, rgba(192, 38, 211, .6));
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.35);
            flex-shrink: 0;
            background: #1e2035;
        }
        .fp-rmthub-drop .rmth-uinfo { flex: 1; min-width: 0; }
        .fp-rmthub-drop .rmth-name { font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--fxn-theme-text-color, #fff); }
        .fp-rmthub-drop .rmth-uid { font-size: 11px; opacity: .55; margin-top: 2px; }
        .fp-rmthub-drop .rmth-banned { display: inline-block; background: rgba(255, 60, 60, .18); color: #ff5c5c; border: 1px solid rgba(255, 60, 60, .35); border-radius: 4px; font-size: 9px; font-weight: 700; padding: 1px 5px; margin-left: 5px; vertical-align: middle; }
        
        /* Stats Grid with Glass tiles */
        .fp-rmthub-drop .rmth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .fp-rmthub-drop .rmth-stat {
            background: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.09) !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            text-align: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.12) !important;
            transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .fp-rmthub-drop .rmth-stat:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.16) !important;
            transform: translateY(-1px);
        }
        .fp-rmthub-drop .rmth-sval { font-size: 15px; font-weight: 700; color: var(--fxn-accent, var(--fxn-accent-color, #E9A8FF)); line-height: 1; margin-bottom: 3px; }
        .fp-rmthub-drop .rmth-slbl { font-size: 9.5px; opacity: .5; text-transform: uppercase; letter-spacing: .5px; }

        /* Top Games */
        .fp-rmthub-drop .rmth-glbl { font-size: 9.5px; opacity: .45; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .fp-rmthub-drop .rmth-grow { display: flex; align-items: center; padding: 4px 6px; border-radius: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); font-size: 11.5px; transition: background 0.15s ease; }
        .fp-rmthub-drop .rmth-grow:hover { background: rgba(255, 255, 255, 0.04); }
        .fp-rmthub-drop .rmth-grow:last-child { border-bottom: none; }
        .fp-rmthub-drop .rmth-gname { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .fp-rmthub-drop .rmth-gpct { font-size: 10.5px; opacity: .45; margin: 0 6px; flex-shrink: 0; }
        .fp-rmthub-drop .rmth-grev { font-size: 11.5px; font-weight: 600; color: var(--fxn-accent, var(--fxn-accent-color, #E9A8FF)); flex-shrink: 0; }
        
        /* Glass Footer */
        .fp-rmthub-drop .rmth-foot {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 14px;
            background: rgba(0, 0, 0, 0.28) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        .fp-rmthub-drop .rmth-links { display: flex; gap: 10px; }
        .fp-rmthub-drop .rmth-links a { font-size: 11.5px; font-weight: 600; color: var(--fxn-accent, var(--fxn-accent-color, #E9A8FF)); text-decoration: none; opacity: .88; transition: opacity 0.15s; }
        .fp-rmthub-drop .rmth-links a:hover { opacity: 1; text-decoration: underline; }
        .fp-rmthub-drop .rmth-credit { font-size: 9.5px; opacity: .35; }
        .fp-rmthub-drop .rmth-state { padding: 18px 14px; text-align: center; opacity: .7; font-size: 12px; }
        `;
        document.head.appendChild(s);
    }

    // ── Build - uses EXACT same HTML structure as FunPay's game search ─────────
    function buildForm() {
        // Outer form - identical classes to .promo-games-filter
        const form  = document.createElement('form');
        form.id     = WRAP_ID;
        form.action = 'javascript:void(0)';
        form.className = 'navbar-form navbar-left dropdown fp-rmthub-form';
        form.setAttribute('autocomplete', 'off');

        const group = document.createElement('div');
        group.className = 'form-group fp-rmthub-wrap';

        // Input - identical classes to FunPay's game search input
        const input = document.createElement('input');
        input.id           = INPUT_ID;
        input.type         = 'text';
        input.name         = 'fp-rmthub-q';
        input.className    = 'form-control dropdown-toggle';
        input.placeholder  = 'Продавец';
        input.autocomplete = 'off';
        input.spellcheck   = false;
        input.setAttribute('role', 'searchbox');

        // Spinner
        const spin = document.createElement('div');
        spin.id = 'fp-rmthub-spin';

        // Dropdown - mounted to document.body to avoid stacking context & backdrop-filter clipping in #header
        let drop = document.getElementById(DROP_ID);
        if (drop && drop.parentElement !== document.body) {
            document.body.appendChild(drop);
        } else if (!drop) {
            drop = document.createElement('div');
            drop.id        = DROP_ID;
            drop.className = 'fp-rmthub-drop dropdown-menu hidden';
            (document.body || document.documentElement).appendChild(drop);
        }

        const btn = document.createElement('button');
        btn.type      = 'submit';
        btn.className = 'btn btn-default fp-rmthub-btn';
        btn.innerHTML = '<i class="fa fa-user"></i>';
        btn.title     = 'Найти продавца на RMTHub';

        group.appendChild(input);
        group.appendChild(spin);
        form.appendChild(group);
        form.appendChild(btn);

        // Events
        input.addEventListener('focus', () => showHint());
        input.addEventListener('input', onInput);
        input.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrop(); });
        form.addEventListener('submit', e => {
            e.preventDefault();
            const q = input.value.trim();
            if (q.length >= 2) {
                doSearch(q);
            } else {
                input.focus();
                showHint();
            }
        });
        document.addEventListener('click', e => {
            const currentDrop = document.getElementById(DROP_ID);
            if (form.contains(e.target) || (currentDrop && currentDrop.contains(e.target))) {
                return;
            }
            closeDrop();
        });
        return form;
    }

    function onInput(e) {
        const q = e.target.value.trim();
        clearTimeout(debTimer);
        if (q.length < 2) { closeDrop(); return; }
        showHint();
    }

    function showHint() {
        const drop = document.getElementById(DROP_ID);
        if (!drop) return;
        drop.innerHTML = `<div class="rmth-hint">Введите точный ник и нажмите Enter<small>RMTHub работает только с точными никами</small></div>`;
        openDrop(drop);
    }

    async function doSearch(username) {
        if (busy) return;
        busy = true;
        const spin = document.getElementById('fp-rmthub-spin');
        const drop = document.getElementById(DROP_ID);
        if (!drop) { busy = false; return; }
        if (spin) spin.style.display = 'block';
        showState(drop, 'Поиск…');

        try {
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'rmthubFetch', username }, resolve);
            });

            if (!result || !result.ok) {
                if (result?.notFound) {
                    showState(drop, `Пользователь «${esc(username)}» не найден.<br><small style="opacity:.5;font-size:10px;">Введите точный ник без пробелов</small>`);
                } else {
                    showState(drop, 'Ошибка запроса. Попробуйте ещё раз.');
                }
                return;
            }

            renderCard(drop, result.data, result.avatar || DEF_AVA);
        } catch (err) {
            showState(drop, 'Ошибка запроса. Попробуйте ещё раз.');
        } finally {
            busy = false;
            if (spin) spin.style.display = 'none';
        }
    }

    function renderCard(drop, data, ava) {
        const u  = data.user  || {};
        const st = data.stats || {};
        const uid    = String(u.id || '');
        const uname  = u.username || '-';
        const banned = u.banned;
        const total  = st.totalAmount       || 0;
        const reviews = st.totalReviews     || 0;
        const avg    = st.averagePerReview  || 0;
        const games  = st.gamesPlayed       || 0;
        const top3   = (st.byGameWithPercentage || [])
            .filter(g => g.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);
        const fpUrl  = `https://funpay.com/users/${uid}/`;
        const rmtUrl = `https://rmthub.com/ru/funpay/${uid}`;

        drop.innerHTML = `
        <div class="rmth-card">
            <div class="rmth-head">
                <img class="rmth-ava" src="${esc(ava)}" alt="">
                <div class="rmth-uinfo">
                    <div class="rmth-name">${esc(uname)}${banned ? '<span class="rmth-banned">БАН</span>' : ''}</div>
                    <div class="rmth-uid">#${esc(uid)}</div>
                </div>
            </div>
            <div class="rmth-grid">
                <div class="rmth-stat"><div class="rmth-sval">$${fmt(total)}</div><div class="rmth-slbl">Выручка</div></div>
                <div class="rmth-stat"><div class="rmth-sval">${fmt(reviews,0)}</div><div class="rmth-slbl">Отзывы</div></div>
                <div class="rmth-stat"><div class="rmth-sval">$${fmt(avg)}</div><div class="rmth-slbl">Ср. чек</div></div>
                <div class="rmth-stat"><div class="rmth-sval">${games}</div><div class="rmth-slbl">Игр</div></div>
            </div>
            ${top3.length ? `<div class="rmth-glbl">ТОП ИГРЫ</div>${top3.map(g=>`<div class="rmth-grow"><span class="rmth-gname">${esc(g.game)}</span><span class="rmth-gpct">${g.percentage}%</span><span class="rmth-grev">$${fmt(g.amount)}</span></div>`).join('')}` : ''}
        </div>
        <div class="rmth-foot">
            <div class="rmth-links">
                <a href="${esc(fpUrl)}" target="_blank">🔗 FunPay</a>
                <a href="${esc(rmtUrl)}" target="_blank">📊 RMTHub</a>
            </div>
            <span class="rmth-credit">Данные: RMTHub.com</span>
        </div>`;
        drop.querySelector('.rmth-ava')?.addEventListener('error', function() { this.src = DEF_AVA; });
        openDrop(drop);
    }

    function showState(drop, msg) {
        drop.innerHTML = `<div class="rmth-state">${msg}</div>`;
        openDrop(drop);
    }

    function positionDrop() {
        const drop = document.getElementById(DROP_ID);
        const input = document.getElementById(INPUT_ID);
        if (!drop || !input) return;

        const rect = input.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const header = document.getElementById('header');
        const isHeaderFixed = header && (
            window.getComputedStyle(header).position === 'fixed' ||
            header.classList.contains('navbar-fixed-bottom') ||
            header.classList.contains('navbar-fixed-top')
        );

        if (isHeaderFixed) {
            drop.style.position = 'fixed';
            drop.style.left = `${Math.round(rect.left)}px`;
            if (rect.top > window.innerHeight / 2) {
                drop.style.top = 'auto';
                drop.style.bottom = `${Math.round(window.innerHeight - rect.top + 6)}px`;
            } else {
                drop.style.bottom = 'auto';
                drop.style.top = `${Math.round(rect.bottom + 6)}px`;
            }
        } else {
            drop.style.position = 'absolute';
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            drop.style.left = `${Math.round(rect.left + scrollX)}px`;
            drop.style.bottom = 'auto';
            drop.style.top = `${Math.round(rect.bottom + scrollY + 6)}px`;
        }
        drop.style.zIndex = '999999';
    }

    function openDrop(d) {
        positionDrop();
        d.classList.remove('hidden');
        d.style.display = 'block';
    }

    function closeDrop() {
        const d = document.getElementById(DROP_ID);
        if (!d) return;
        d.classList.add('hidden');
        d.style.display = 'none';
        busy = false;
        clearTimeout(debTimer);
        const s = document.getElementById('fp-rmthub-spin');
        if (s) s.style.display = 'none';
    }

    function esc(s) {
        return String(s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmt(n, d = 0) {
        return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    // Dynamic repositioning on window scroll / resize while open
    window.addEventListener('scroll', () => {
        const drop = document.getElementById(DROP_ID);
        if (drop && !drop.classList.contains('hidden') && drop.style.display !== 'none') {
            positionDrop();
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        const drop = document.getElementById(DROP_ID);
        if (drop && !drop.classList.contains('hidden') && drop.style.display !== 'none') {
            positionDrop();
        }
    }, { passive: true });

    // ── Mount - insert after the game search form, with multiple fallbacks ─────
    function mount() {
        if (document.getElementById(WRAP_ID)) return;
        // Try multiple possible anchor points (FunPay occasionally changes their markup)
        const anchor =
            document.querySelector('form.navbar-form.promo-games-filter') ||
            document.querySelector('form.navbar-form.navbar-left') ||
            document.querySelector('.navbar-form') ||
            document.querySelector('.navbar-header') ||
            document.querySelector('.navbar-nav');
        if (!anchor) return;
        injectStyles();
        anchor.insertAdjacentElement('afterend', buildForm());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
    setTimeout(mount, 800);

    window.initRMTHubSearch = mount;
})();
