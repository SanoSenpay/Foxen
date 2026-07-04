// content/features/exact_price.js

function initializeExactPrice() {
    const header = document.querySelector('h1.page-header');
    if (!header || !(header.textContent.includes('Редактирование предложения') || header.textContent.includes('Добавление предложения'))) {
        return;
    }

    if (document.querySelector('.fp-tools-buyer-price-container')) {
        return;
    }

    const inputPrice = document.querySelector('input[name="price"]');
    if (!inputPrice) {
        return;
    }

    // Hide old button if it exists
    const oldBtn = document.querySelector('.set-exact-price');
    if (oldBtn) oldBtn.style.display = 'none';

    const priceFormGroup = inputPrice.closest('.form-group');
    if (!priceFormGroup) return;

    // Clone the native FunPay price field
    const buyerFormGroup = priceFormGroup.cloneNode(true);
    buyerFormGroup.classList.add('fp-tools-buyer-price-container');
    
    // Update the label
    const label = buyerFormGroup.querySelector('label');
    if (label) {
        label.textContent = 'ЦЕНА ДЛЯ ПОКУПАТЕЛЯ';
    }

    // Prepare the new input
    const inputBuyer = buyerFormGroup.querySelector('input');
    inputBuyer.value = '';
    inputBuyer.name = 'fpt_buyer_price';
    inputBuyer.placeholder = 'Например, 100';
    inputBuyer.removeAttribute('id');

    // Add status text — wrap the input itself so position:relative is isolated
    // from Bootstrap's flex on .input-group, which breaks absolute positioning.
    const statusText = document.createElement('span');
    Object.assign(statusText.style, {
        fontSize: '11px',
        color: 'var(--fpt-text-main, #888)',
        position: 'absolute',
        right: '40px',
        top: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        lineHeight: '1',
        pointerEvents: 'none',
        opacity: '0.7',
        zIndex: '1'
    });

    // Wrap just the input in a relative container so our span is positioned against it.
    const inputWrap = document.createElement('div');
    inputWrap.style.position = 'relative';
    inputWrap.style.flex = '1'; // keep Bootstrap input-group layout intact
    inputBuyer.parentNode.insertBefore(inputWrap, inputBuyer);
    inputWrap.appendChild(inputBuyer);
    inputWrap.appendChild(statusText);

    priceFormGroup.parentNode.insertBefore(buyerFormGroup, priceFormGroup.nextSibling);

    const readBuyerPriceRub = () => {
        const body = document.querySelector('.js-calc-table-body');
        if (!body) return null;
        const vals = [];
        body.querySelectorAll('tr').forEach(tr => {
            const cell = tr.querySelector('td:last-child');
            if (!cell) return;
            const txt = cell.textContent;
            if (!/[₽]|руб/i.test(txt)) return;
            const n = parseFloat(txt.replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(n) && n > 0) vals.push(n);
        });
        if (!vals.length) return null;
        return Math.min(...vals);
    };

    const setSellerPrice = (v) => {
        inputPrice.value = (Math.round(v * 100) / 100).toString();
        inputPrice.dispatchEvent(new Event('input', { bubbles: true }));
        inputPrice.dispatchEvent(new Event('keyup', { bubbles: true }));
    };

    const waitRecalc = (prevBuyer) => new Promise(resolve => {
        let tries = 0;
        const tick = () => {
            const b = readBuyerPriceRub();
            if ((b !== null && b !== prevBuyer) || tries > 25) { resolve(b); return; }
            tries++;
            setTimeout(tick, 40);
        };
        tick();
    });

    // When typing in the BUYER input, calculate and update SELLER input
    let typingTimer;
    inputBuyer.addEventListener('input', () => {
        clearTimeout(typingTimer);
        const desiredAmount = parseFloat((inputBuyer.value || '').replace(',', '.'));

        if (isNaN(desiredAmount) || desiredAmount <= 0) {
            statusText.textContent = '';
            return;
        }

        statusText.textContent = 'Считаю...';

        typingTimer = setTimeout(async () => {
            try {
                // Step 1: get initial commission coefficient using current seller price as a probe.
                // If the seller field is empty, use desiredAmount as the starting probe.
                let currentSeller = parseFloat((inputPrice.value || '').replace(',', '.'));
                if (isNaN(currentSeller) || currentSeller <= 0) {
                    currentSeller = desiredAmount;
                }

                const prevBuyer = readBuyerPriceRub();
                setSellerPrice(currentSeller);
                let buyerAfter = await waitRecalc(prevBuyer);

                if (buyerAfter === null || buyerAfter <= 0) {
                    statusText.textContent = 'Ошибка: нет таблицы комиссий';
                    return;
                }

                // Step 2: compute initial estimate and apply it.
                let coeff = buyerAfter / currentSeller;
                if (!isFinite(coeff) || coeff <= 0) {
                    statusText.textContent = 'Ошибка расчета';
                    return;
                }
                let sellerGuess = desiredAmount / coeff;
                setSellerPrice(sellerGuess);
                buyerAfter = await waitRecalc(buyerAfter);

                // Step 3: correction loop — keep nudging seller price until buyer price
                // matches exactly, or until we run out of attempts.
                // FunPay's commission is applied in discrete steps (rounding) so one
                // division is rarely enough; a few micro-corrections always converge.
                const MAX_ITER = 8;
                const TOLERANCE = 0.005; // less than half a kopeck
                for (let i = 0; i < MAX_ITER; i++) {
                    if (buyerAfter === null) break;
                    const diff = buyerAfter - desiredAmount; // positive → buyer sees too much
                    if (Math.abs(diff) <= TOLERANCE) break;  // close enough, done

                    // Re-derive coefficient from the CURRENT seller price we set,
                    // then compute a corrected seller price.
                    coeff = buyerAfter / sellerGuess;
                    if (!isFinite(coeff) || coeff <= 0) break;
                    const prevGuess = sellerGuess;
                    sellerGuess = desiredAmount / coeff;

                    // Safety: if the correction is negligibly small, stop to avoid infinite loop.
                    if (Math.abs(sellerGuess - prevGuess) < 0.001) break;

                    setSellerPrice(sellerGuess);
                    buyerAfter = await waitRecalc(buyerAfter);
                }

                statusText.textContent = '✓ Рассчитано';
                setTimeout(() => { if (statusText.textContent === '✓ Рассчитано') statusText.textContent = ''; }, 2000);
            } catch (e) {
                statusText.textContent = 'Ошибка';
            }
        }, 500); // 500ms debounce
    });
}