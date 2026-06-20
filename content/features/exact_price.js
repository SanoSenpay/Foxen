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

    // Add status text inside the input wrapper
    const statusText = createElement('span', {}, {
        fontSize: '11px',
        color: 'var(--fpt-text-main, #888)',
        position: 'absolute',
        right: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        opacity: '0.7'
    });

    // FunPay usually wraps the input in a .input-group with an addon for '₽'
    const inputWrapper = buyerFormGroup.querySelector('.input-group') || buyerFormGroup;
    inputWrapper.style.position = 'relative';
    inputWrapper.appendChild(statusText);

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
                // If the seller price field is empty, put desiredAmount as probe
                let currentSeller = parseFloat((inputPrice.value || '').replace(',', '.'));
                if (isNaN(currentSeller) || currentSeller <= 0) {
                    currentSeller = desiredAmount;
                }

                const prevBuyer = readBuyerPriceRub();
                setSellerPrice(currentSeller);
                let buyerForProbe = await waitRecalc(prevBuyer);

                if (buyerForProbe === null || buyerForProbe <= 0) {
                    statusText.textContent = 'Ошибка: нет таблицы комиссий';
                    return;
                }

                const k = buyerForProbe / currentSeller;
                if (!isFinite(k) || k <= 0) {
                    statusText.textContent = 'Ошибка расчета';
                    return;
                }

                const sellerPrice = desiredAmount / k;
                setSellerPrice(sellerPrice);

                const buyerNow = await waitRecalc(buyerForProbe);
                if (buyerNow && Math.abs(buyerNow - desiredAmount) > 0.02) {
                    const k2 = buyerNow / sellerPrice;
                    if (isFinite(k2) && k2 > 0) setSellerPrice(desiredAmount / k2);
                }

                statusText.textContent = '✓ Рассчитано';
                setTimeout(() => { if(statusText.textContent === '✓ Рассчитано') statusText.textContent = ''; }, 2000);
            } catch (e) {
                statusText.textContent = 'Ошибка';
            }
        }, 500); // 500ms debounce
    });
}