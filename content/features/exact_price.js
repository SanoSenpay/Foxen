// content/features/exact_price.js
// "Цена для покупателя" на странице создания/редактирования лота.
// • Автоопределяет валюту лота (₽ / $ / €).
// • Кастомный стеклянный дропдаун валюты (монохромный минимализм).
// • Плавные логи/статус расчёта ПОД полем ввода.
// • Точный итерационный расчёт (точность до 0.0001, напр. 1.0698).
// • 3-уровневый каскад (DOM Таблица -> API /lots/calc -> FPTCommission multiplier).

function initializeExactPrice() {
    const header = document.querySelector('h1.page-header');
    if (!header || !(
        header.textContent.includes('Редактирование предложения') ||
        header.textContent.includes('Добавление предложения')
    )) return;

    if (document.querySelector('.foxen-buyer-price-container')) return;

    const inputPrice = document.querySelector('input[name="price"]');
    if (!inputPrice) return;

    const oldBtn = document.querySelector('.set-exact-price');
    if (oldBtn) oldBtn.style.display = 'none';

    const priceFormGroup = inputPrice.closest('.form-group');
    if (!priceFormGroup) return;

    // ─── Автоопределение валюты лота ────────────────────────────────────────
    function detectLotCurrency() {
        const feedback = priceFormGroup.querySelector('.form-control-feedback');
        if (feedback) {
            const u = feedback.textContent.trim();
            if (u.includes('$')) return 'USD';
            if (u.includes('€')) return 'EUR';
            if (u.includes('₽') || /руб/i.test(u)) return 'RUB';
        }
        const group = inputPrice.closest('.input-group') || inputPrice.parentElement;
        if (group) {
            for (const el of group.querySelectorAll('.input-group-addon, .input-group-text, .add-on')) {
                const t = el.textContent.trim();
                if (t === '$') return 'USD';
                if (t === '€') return 'EUR';
                if (t === '₽') return 'RUB';
            }
        }
        const currSel = document.querySelector(
            'select[name="currency"], select[name="lot_currency"], select[name="currency_id"]'
        );
        if (currSel) {
            const v = (currSel.value || currSel.options?.[currSel.selectedIndex]?.text || '').trim();
            if (/USD|\$/i.test(v)) return 'USD';
            if (/EUR|€/i.test(v)) return 'EUR';
            return 'RUB';
        }
        const pg = priceFormGroup?.textContent || '';
        if (pg.includes('$') && !pg.includes('₽')) return 'USD';
        if (pg.includes('€') && !pg.includes('₽')) return 'EUR';
        return 'RUB';
    }

    let currentCurrency = detectLotCurrency();

    // ─── Клонируем form-group и ОЧИЩАЕМ от нативных элементов ───────────────
    const buyerFormGroup = priceFormGroup.cloneNode(true);
    buyerFormGroup.classList.add('foxen-buyer-price-container');
    buyerFormGroup.classList.remove('has-feedback');

    // Удаляем все клонированные иконки валют/аддоны FunPay
    buyerFormGroup.querySelectorAll('.form-control-feedback, .input-group-addon, .input-group-text, .add-on, .help-block').forEach(el => el.remove());

    const labelEl = buyerFormGroup.querySelector('label');
    if (labelEl) labelEl.textContent = 'ЦЕНА ДЛЯ ПОКУПАТЕЛЯ';

    const inputBuyer = buyerFormGroup.querySelector('input');
    if (!inputBuyer) return;
    inputBuyer.value = '';
    inputBuyer.name = 'fpt_buyer_price';
    inputBuyer.placeholder = 'Например, 100';
    inputBuyer.removeAttribute('id');

    // ─── Плавный статус/логи ПОД полем ввода ─────────────────────────────────
    const statusText = document.createElement('div');
    statusText.className = 'fxn-buyer-status';

    let hideTimer = null;
    function showStatus(msg, type = 'info') {
        clearTimeout(hideTimer);
        statusText.textContent = msg;
        statusText.className = 'fxn-buyer-status visible ' + type;
    }
    function hideStatus() {
        clearTimeout(hideTimer);
        statusText.className = 'fxn-buyer-status';
        hideTimer = setTimeout(() => {
            if (!statusText.classList.contains('visible')) {
                statusText.textContent = '';
            }
        }, 220);
    }

    // ─── Кастомный glassmorphism-дропдаун ───────────────────────────────────
    const CURRENCIES = [
        { code: 'RUB', symbol: '₽' },
        { code: 'USD', symbol: '$' },
        { code: 'EUR', symbol: '€' },
    ];
    const SYM = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]));

    const dropWrapper = document.createElement('div');
    dropWrapper.className = 'fxn-curr-wrap';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fxn-curr-trigger';
    trigger.title = 'Выбрать валюту покупателя';

    const trigLabel = document.createElement('span');
    trigLabel.className = 'fxn-curr-label';
    trigLabel.textContent = SYM[currentCurrency] ?? '₽';
    trigger.appendChild(trigLabel);

    const flyout = document.createElement('div');
    flyout.className = 'fxn-curr-flyout';
    flyout.hidden = true;

    CURRENCIES.forEach(({ code, symbol }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fxn-curr-opt' + (code === currentCurrency ? ' active' : '');
        btn.textContent = symbol;
        btn.dataset.code = code;
        btn.title = code;
        flyout.appendChild(btn);
    });

    dropWrapper.appendChild(trigger);
    dropWrapper.appendChild(flyout);

    // ─── Открытие/закрытие flyout ────────────────────────────────────────────
    let flyoutOpen = false;

    function openFlyout() {
        flyout.hidden = false;
        flyoutOpen = true;
        trigger.classList.add('open');
    }
    function closeFlyout() {
        flyout.hidden = true;
        flyoutOpen = false;
        trigger.classList.remove('open');
    }

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        flyoutOpen ? closeFlyout() : openFlyout();
    });

    flyout.addEventListener('click', e => {
        const btn = e.target.closest('.fxn-curr-opt');
        if (!btn) return;
        const code = btn.dataset.code;
        const sym = SYM[code];
        if (!sym) return;
        currentCurrency = code;
        trigLabel.textContent = sym;
        flyout.querySelectorAll('.fxn-curr-opt').forEach(b => b.classList.toggle('active', b === btn));
        closeFlyout();
        if (inputBuyer.value.trim()) runCalculation();
    });

    document.addEventListener('click', () => { if (flyoutOpen) closeFlyout(); });
    dropWrapper.addEventListener('click', e => e.stopPropagation());

    // ─── Сборка layout ───────────────────────────────────────────────────────
    const inputGroup = buyerFormGroup.querySelector('.input-group');
    if (inputGroup) {
        inputGroup.parentNode.insertBefore(inputBuyer, inputGroup);
        inputGroup.remove();
    }

    const inputWrap = document.createElement('div');
    inputWrap.className = 'fxn-input-wrap';
    inputWrap.style.cssText = 'position:relative;flex:1;min-width:0;';

    inputBuyer.parentNode.insertBefore(inputWrap, inputBuyer);
    inputWrap.appendChild(inputBuyer);

    const rowWrap = document.createElement('div');
    rowWrap.className = 'fxn-buyer-row';

    inputWrap.parentNode.insertBefore(rowWrap, inputWrap);
    rowWrap.appendChild(inputWrap);
    rowWrap.appendChild(dropWrapper);

    buyerFormGroup.appendChild(statusText);

    priceFormGroup.parentNode.insertBefore(buyerFormGroup, priceFormGroup.nextSibling);

    // ─── Утилиты расчёта ─────────────────────────────────────────────────────
    const CURRENCY_SYMS = {
        RUB: ['₽', 'руб', 'RUB'],
        USD: ['$', 'USD'],
        EUR: ['€', 'EUR'],
    };

    // Универсальный парсер DOM-таблицы комиссий FunPay
    function readTablePrice(currency) {
        const body = document.querySelector('.js-calc-table-body, .js-calc-table, .calc-table');
        if (!body) return null;
        const syms = CURRENCY_SYMS[currency] || CURRENCY_SYMS.RUB;
        const items = [];
        
        const rows = body.querySelectorAll('tr, .calc-row, div.row');
        const targets = rows.length ? Array.from(rows) : [body];

        targets.forEach(row => {
            const cells = row.querySelectorAll('td, .tc-price, div, span');
            cells.forEach(cell => {
                const txt = (cell.textContent || '').trim();
                if (/[0-9]/.test(txt) && /[₽$€]|руб|USD|EUR/i.test(txt)) {
                    const cleaned = txt.replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
                    const n = parseFloat(cleaned);
                    if (isFinite(n) && n > 0) {
                        items.push({ text: txt, price: n });
                    }
                }
            });
        });
        if (!items.length) return null;

        const matched = items.filter(x => syms.some(s => x.text.includes(s)));
        const pool = matched.length ? matched : items;
        const prices = pool.map(x => x.price).filter(n => isFinite(n) && n > 0);
        return prices.length ? Math.min(...prices) : null;
    }

    // Универсальный поиск nodeId
    function getNodeId() {
        const selectors = [
            'input[name="node_id"]',
            'select[name="node_id"]',
            'input[name="node"]',
            'select[name="node"]',
            'input[name="nodeId"]'
        ];
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && el.value) return el.value;
        }
        const m = location.search.match(/node=(\d+)/) || location.pathname.match(/\/lots\/(\d+)\//);
        if (m) return m[1];
        const back = document.querySelector('a[href*="/lots/"]');
        if (back) {
            const bm = back.getAttribute('href')?.match(/\/lots\/(\d+)\//);
            if (bm) return bm[1];
        }
        const form = document.querySelector('form.form-offer-editor');
        if (form) {
            const act = form.getAttribute('action') || '';
            const am = act.match(/\/lots\/(\d+)\//);
            if (am) return am[1];
        }
        return null;
    }

    // Фоллбэк 1: Запрос к API /lots/calc
    async function apiCalc(sellerPrice, currency) {
        const nodeId = getNodeId();
        if (!nodeId) return null;
        try {
            const body = new URLSearchParams();
            body.append('nodeId', String(nodeId));
            body.append('price', String(Math.round(sellerPrice * 10000) / 10000));
            const r = await fetch('/lots/calc', {
                method: 'POST', credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                }, body,
            });
            if (!r.ok) return null;
            const j = await r.json();
            const methods = Array.isArray(j.methods) ? j.methods : (Array.isArray(j) ? j : null);
            if (!methods || !methods.length) return null;

            const syms = CURRENCY_SYMS[currency] || CURRENCY_SYMS.RUB;
            let matched = methods.filter(x => {
                const u = String(x?.unit || '').trim();
                return syms.some(s => u.includes(s));
            });
            if (!matched.length) matched = methods;

            const prices = matched
                .map(x => parseFloat(String(x?.price ?? '').replace(/[^\d.,]/g, '').replace(',', '.')))
                .filter(n => isFinite(n) && n > 0);
            return prices.length ? Math.min(...prices) : null;
        } catch { return null; }
    }

    function setSellerPrice(v) {
        const val = String(Math.round(v * 10000) / 10000);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(inputPrice, val); else inputPrice.value = val;
        inputPrice.dispatchEvent(new Event('input',  { bubbles: true }));
        inputPrice.dispatchEvent(new Event('change', { bubbles: true }));
        inputPrice.dispatchEvent(new Event('keyup',  { bubbles: true }));
    }

    function waitTableUpdate(prevVal, currency, maxMs = 1200) {
        return new Promise(resolve => {
            const deadline = Date.now() + maxMs;
            setTimeout(() => {
                const tick = () => {
                    const cur = readTablePrice(currency);
                    if (cur !== null && prevVal !== null && Math.abs(cur - prevVal) > 0.0001) {
                        resolve(cur);
                        return;
                    }
                    if (Date.now() >= deadline) {
                        resolve(cur !== null ? cur : prevVal);
                        return;
                    }
                    setTimeout(tick, 30);
                };
                tick();
            }, 80);
        });
    }

    // 3-УРОВНЕВЫЙ КАСКАД: DOM Таблица -> API /lots/calc -> FPTCommission
    async function applyAndRead(sellerPrice, prevBuyer, currency, useTable) {
        setSellerPrice(sellerPrice);
        let val = null;
        if (useTable) {
            val = await waitTableUpdate(prevBuyer, currency);
        }
        if (!val || val <= 0) {
            val = await apiCalc(sellerPrice, currency);
        }
        return val;
    }

    // ─── Основной алгоритм ───────────────────────────────────────────────────
    let typingTimer;
    let running = false;

    async function runCalculation() {
        if (running) return;
        const rawInput = inputBuyer.value.trim().replace(',', '.');
        const desired = parseFloat(rawInput);
        const currency = currentCurrency;

        if (isNaN(desired) || desired <= 0) { hideStatus(); return; }

        running = true;
        showStatus('⏳ Считаю…', 'info');

        try {
            const useTable = !!document.querySelector('.js-calc-table-body, .js-calc-table, .calc-table');

            // Фаза 1: зондирующий прогон
            const currentSeller = parseFloat(inputPrice.value.replace(',', '.'));
            let probe = isFinite(currentSeller) && currentSeller > 0 ? currentSeller + 0.0001 : desired;

            let buyerVal = await applyAndRead(probe, readTablePrice(currency), currency, useTable);
            if (!buyerVal || buyerVal <= 0) { showStatus('⚠ Нет данных о комиссии', 'error'); return; }

            // Фаза 2: грубое приближение (14 итераций)
            let sellerGuess = probe;
            for (let i = 0; i < 14; i++) {
                const coeff = buyerVal / sellerGuess;
                if (!isFinite(coeff) || coeff <= 0) break;
                const prevGuess = sellerGuess;
                sellerGuess = Math.round((desired / coeff) * 10000) / 10000;
                if (sellerGuess <= 0) break;
                const prevBuyer = useTable ? readTablePrice(currency) : buyerVal;
                const newBuyer = await applyAndRead(sellerGuess, prevBuyer, currency, useTable);
                if (!newBuyer) break;
                buyerVal = newBuyer;
                if (Math.abs(buyerVal - desired) <= 0.001) break;
                if (Math.abs(sellerGuess - prevGuess) < 0.0001) break;
            }

            // Фаза 3: микро-тюнинг 0.0001 (до 300 шагов = ±0.0300)
            if (Math.abs(buyerVal - desired) > 0.0001) {
                const dir = buyerVal > desired ? -0.0001 : +0.0001;
                let fineGuess = sellerGuess;
                for (let j = 0; j < 300; j++) {
                    fineGuess = Math.round((fineGuess + dir) * 10000) / 10000;
                    if (fineGuess <= 0) break;
                    const prevF = useTable ? readTablePrice(currency) : buyerVal;
                    const nb = await applyAndRead(fineGuess, prevF, currency, useTable);
                    if (nb === null) break;
                    if (dir < 0) {
                        if (nb <= desired + 0.0001) { sellerGuess = fineGuess; buyerVal = nb; break; }
                    } else {
                        if (nb > desired + 0.0001) {
                            fineGuess = Math.round((fineGuess - 0.0001) * 10000) / 10000;
                            setSellerPrice(fineGuess);
                            sellerGuess = fineGuess;
                            break;
                        }
                        sellerGuess = fineGuess;
                        buyerVal = nb;
                    }
                }
            }

            showStatus('✓ Рассчитано', 'success');
            hideTimer = setTimeout(() => hideStatus(), 2500);
        } catch {
            showStatus('⚠ Ошибка расчёта', 'error');
        } finally {
            running = false;
        }
    }

    function scheduleCalc() {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(runCalculation, 500);
    }

    inputBuyer.addEventListener('input', scheduleCalc);
    inputBuyer.addEventListener('keyup', scheduleCalc);
}