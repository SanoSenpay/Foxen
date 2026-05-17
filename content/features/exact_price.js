// content/features/exact_price.js

function initializeExactPrice() {
    const header = document.querySelector('h1.page-header');
    if (!header || !(header.textContent.includes('Редактирование предложения') || header.textContent.includes('Добавление предложения'))) {
        return;
    }

    if (document.getElementById('fp-buyer-price-input')) {
        return;
    }

    const inputPrice = document.querySelector('input[name="price"]');
    if (!inputPrice) {
        return;
    }

    const originalFormGroup = inputPrice.closest('.form-group');
    if (!originalFormGroup) return;

    // Изменяем оригинальный лейбл
    const originalLabel = originalFormGroup.querySelector('.control-label');
    if (originalLabel) {
        originalLabel.textContent = 'ЦЕНА ЗА 1 ШТ. (ДЛЯ ПРОДАВЦА)';
        originalLabel.style.textTransform = 'uppercase';
        originalLabel.style.fontSize = '11px';
        originalLabel.style.color = '#737373';
        originalLabel.style.fontWeight = 'bold';
    }

    // Создаем блок для цены покупателя
    const buyerPriceGroup = document.createElement('div');
    buyerPriceGroup.className = 'form-group';
    buyerPriceGroup.innerHTML = `
        <label class="control-label" style="text-transform:uppercase; font-size:11px; color:#737373; font-weight:bold;">ЦЕНА ЗА 1 ШТ. (ДЛЯ ПОКУПАТЕЛЯ)</label>
        <div class="input-group">
            <input type="number" step="0.01" class="form-control" id="fp-buyer-price-input" placeholder="Введите цену для покупателя">
            <span class="input-group-addon">₽</span>
        </div>
        <small class="help-block" style="display:none; color:#e05252;" id="fp-buyer-price-error"></small>
    `;

    // Вставляем сразу после блока оригинальной цены
    originalFormGroup.parentNode.insertBefore(buyerPriceGroup, originalFormGroup.nextSibling);

    const buyerInput = buyerPriceGroup.querySelector('#fp-buyer-price-input');
    const errorMsg = buyerPriceGroup.querySelector('#fp-buyer-price-error');

    let _calcTimeout = null;

    buyerInput.addEventListener('input', () => {
        clearTimeout(_calcTimeout);
        errorMsg.style.display = 'none';

        const desiredAmount = parseFloat(buyerInput.value);
        if (isNaN(desiredAmount) || desiredAmount <= 0) {
            return;
        }

        _calcTimeout = setTimeout(() => {
            const currentPrice = parseFloat(inputPrice.value) || 100;
            let tempPrice = currentPrice;

            // Если поле пустое или равно 0, временно ставим 100 для расчетов
            if (isNaN(parseFloat(inputPrice.value)) || parseFloat(inputPrice.value) <= 0) {
                tempPrice = 100;
                inputPrice.value = tempPrice;
                inputPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Ждем обновления таблицы расчетов FunPay (она обновляется асинхронно)
            setTimeout(() => {
                const calcTableBody = document.querySelector(".js-calc-table-body");
                if (!calcTableBody) {
                    errorMsg.textContent = 'Не найдена таблица расчетов.';
                    errorMsg.style.display = 'block';
                    return;
                }

                const lastBuyerPriceRow = calcTableBody.querySelector('tr:last-child td:last-child');
                if (!lastBuyerPriceRow) {
                    errorMsg.textContent = 'Не удалось найти цену покупателя.';
                    errorMsg.style.display = 'block';
                    return;
                }

                const buyerPaysPrice = parseFloat(lastBuyerPriceRow.textContent.replace(/ /g, ''));
                if (isNaN(buyerPaysPrice)) {
                    errorMsg.textContent = 'Не удалось прочитать цену.';
                    errorMsg.style.display = 'block';
                    return;
                }

                const priceRatio = tempPrice / buyerPaysPrice;
                const finalPriceToSet = desiredAmount * priceRatio;

                inputPrice.value = finalPriceToSet.toFixed(2);
                inputPrice.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Делаем легкую визуальную подсветку оригинального поля
                inputPrice.style.transition = 'background-color 0.3s';
                inputPrice.style.backgroundColor = 'rgba(107, 102, 255, 0.2)';
                setTimeout(() => { inputPrice.style.backgroundColor = ''; }, 500);

            }, 250); // Ждем 250мс пока скрипт фанпея обновит таблицу
        }, 800); // Debounce
    });
}