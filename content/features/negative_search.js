// content/features/negative_search.js
// Добавляет инпут "Негативный поиск" на страницы категорий игр для скрытия лотов с определенными словами.

(function () {
    'use strict';

    let _negativeInput = null;

    function runNegativeFilter() {
        if (!_negativeInput) return;
        const raw = _negativeInput.value.trim().toLowerCase();
        const words = raw.split(/[\s,]+/).filter(w => w.length > 0);

        document.querySelectorAll('.tc-item').forEach(item => {
            if (words.length === 0) {
                if (item.dataset.negativeHidden) {
                    item.style.display = '';
                    delete item.dataset.negativeHidden;
                }
                return;
            }
            const text = item.textContent.toLowerCase();
            const shouldHide = words.some(w => text.includes(w));
            if (shouldHide) {
                item.style.display = 'none';
                item.dataset.negativeHidden = 'true';
            } else if (item.dataset.negativeHidden) {
                item.style.display = '';
                delete item.dataset.negativeHidden;
            }
        });
    }

    function buildNegativeSearchBar() {
        if (document.querySelector('#fp-negative-search-wrapper')) return;

        const targetInput = document.querySelector('.showcase-filter-input.showcase-filter-text')
                         || document.querySelector('input[name="query"]');
        if (!targetInput) return;

        const searchGroup = targetInput.parentElement;

        // ── Строим негативный блок вручную, без клонирования ──
        // Это исключает проблемы с позиционированием лупы.

        // Обёртка-контейнер для негативного поля + иконки лупы
        const negGroup = document.createElement('div');
        negGroup.style.cssText = 'position: relative; display: inline-flex; align-items: center;';

        // Сам инпут — те же классы что у оригинала
        const bar = document.createElement('input');
        bar.type = 'text';
        bar.id = 'fp-negative-search-input';
        bar.className = targetInput.className;
        bar.placeholder = 'Исключить слова…';
        bar.autocomplete = 'off';
        bar.style.cssText = 'border-color: #fca5a5 !important; padding-right: 28px;';
        negGroup.appendChild(bar);
        _negativeInput = bar;

        // Иконка лупы — позиционируется абсолютно справа внутри negGroup
        const lupaIcon = document.createElement('span');
        lupaIcon.className = 'glyphicon glyphicon-search';
        lupaIcon.style.cssText = [
            'position: absolute',
            'right: 10px',
            'top: 50%',
            'transform: translateY(-50%)',
            'pointer-events: none',
            'opacity: 0.5',
            'font-size: 13px',
        ].join(';');
        negGroup.appendChild(lupaIcon);

        // ── Кастомный тултип для "?" (быстрее нативного title) ──
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Негативный поиск — скрывает лоты, в описании которых есть хотя бы одно из введённых слов. Слова разделяй пробелом или запятой. Пример: «авто бот» скроет все лоты с этими словами.';
        tooltip.style.cssText = [
            'position: absolute',
            'bottom: calc(100% + 6px)',
            'right: 0',
            'width: 220px',
            'background: rgba(30,30,40,0.97)',
            'color: #e0e0e0',
            'font-size: 12px',
            'line-height: 1.5',
            'padding: 8px 10px',
            'border-radius: 8px',
            'box-shadow: 0 4px 16px rgba(0,0,0,0.5)',
            'pointer-events: none',
            'opacity: 0',
            'transition: opacity 0.1s ease',
            'z-index: 9999',
            'white-space: normal',
        ].join(';');

        // Иконка "?"
        const helpWrap = document.createElement('div');
        helpWrap.style.cssText = 'position: relative; display: inline-flex; align-items: center; flex-shrink: 0;';

        const helpIcon = document.createElement('span');
        helpIcon.textContent = '?';
        helpIcon.style.cssText = [
            'display: inline-flex',
            'align-items: center',
            'justify-content: center',
            'width: 17px',
            'height: 17px',
            'border-radius: 50%',
            'background: rgba(255,255,255,0.15)',
            'color: #bbb',
            'font-size: 11px',
            'font-weight: bold',
            'cursor: help',
            'user-select: none',
            'position: relative',
            'top: -2px',
        ].join(';');

        helpIcon.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; });
        helpIcon.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

        helpWrap.appendChild(helpIcon);
        helpWrap.appendChild(tooltip);

        // ── Общая обёртка: держит searchGroup + negGroup + helpIcon в одном ряду ──
        const wrapper = document.createElement('div');
        wrapper.id = 'fp-negative-search-wrapper';
        wrapper.style.cssText = 'display: inline-flex; gap: 6px; align-items: center;';

        searchGroup.parentElement.insertBefore(wrapper, searchGroup);
        wrapper.appendChild(searchGroup);
        wrapper.appendChild(negGroup);
        wrapper.appendChild(helpWrap);

        // ── Слушатели ──
        bar.addEventListener('input', () => {
            clearTimeout(bar._timeout);
            bar._timeout = setTimeout(runNegativeFilter, 150);
        });

        // Перезапускаем фильтр при подгрузке новых лотов
        const observer = new MutationObserver(() => {
            if (_negativeInput && _negativeInput.value.trim()) {
                clearTimeout(_negativeInput._timeout);
                _negativeInput._timeout = setTimeout(runNegativeFilter, 150);
            }
        });
        const containerToObserve = document.querySelector('.tc-item')?.parentElement || document.body;
        observer.observe(containerToObserve, { childList: true, subtree: true });
    }

    function init() {
        buildNegativeSearchBar();

        const initObserver = new MutationObserver(() => {
            if (document.querySelector('.showcase-filter-input.showcase-filter-text') || document.querySelector('input[name="query"]')) {
                buildNegativeSearchBar();
            }
        });
        initObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
