// content/features/open_lot_button.js
// Незаметные, но заметные кнопки-иконки «открыть лот» (ведут на /lots/offer?id=N,
// а не на редактирование). На странице «Ваши предложения», на странице
// редактирования (рядом с заголовком) и во вкладке «Что тебе нужно».

(function () {
  'use strict';

  const ICON = 'open_in_new'; // material-symbols, как у остальной части FPT

  function injectStyles() {
    if (document.getElementById('fxn-openlot-style')) return;
    const s = document.createElement('style');
    s.id = 'fxn-openlot-style';
    s.textContent = [
      '.fxn-open-lot{display:inline-flex;align-items:center;justify-content:center;',
      'width:24px;height:24px;border-radius:6px;cursor:pointer;text-decoration:none;',
      'color:var(--fxn-text-muted,#9099b8);opacity:.55;transition:opacity .15s,background .15s,color .15s;',
      'font-size:16px;line-height:1;vertical-align:middle;}',
      '.fxn-open-lot:hover{opacity:1;background:rgba(127,127,127,.15);color:var(--fxn-accent,#2563eb);}',
      '.fxn-open-lot .material-symbols-rounded,.fxn-open-lot .material-symbols-outlined{font-size:16px;}',
      // в таблице лотов — клик по иконке не должен открывать редактирование (родительская ссылка)
      '.tc-price .fxn-open-lot{margin-left:6px;}',
      // кликабельный заголовок «Редактирование предложения»
      '.fxn-head-link{cursor:pointer;transition:color .15s;}',
      '.fxn-head-link:hover{color:var(--fxn-accent,#2563eb);}',
    ].join('');
    document.head.appendChild(s);
  }

  function iconEl() {
    const i = document.createElement('span');
    i.className = 'material-symbols-rounded';
    i.textContent = ICON;
    return i;
  }

  function makeOpenBtn(lotId, title) {
    const a = document.createElement('a');
    a.className = 'fxn-open-lot';
    a.href = 'https://funpay.com/lots/offer?id=' + encodeURIComponent(lotId);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = title || 'Открыть лот';
    a.appendChild(iconEl());
    // не давать клику всплыть к строке-ссылке (которая ведёт на редактирование)
    a.addEventListener('click', (e) => { e.stopPropagation(); });
    return a;
  }

  // 1) Страница «Ваши предложения» — иконка в каждой строке лота
  function mountOnOffersTable() {
    const rows = document.querySelectorAll('a.tc-item[data-offer]');
    rows.forEach((row) => {
      if (row.querySelector('.fxn-open-lot')) return;
      const id = row.getAttribute('data-offer');
      if (!id) return;
      const priceEl = row.querySelector('.tc-price') || row;
      const btn = makeOpenBtn(id, 'Открыть лот в новой вкладке');
      // кладём в правый край ячейки цены
      const iconsBox = priceEl.querySelector('.sc-offer-icons');
      if (iconsBox) iconsBox.appendChild(btn);
      else priceEl.appendChild(btn);
    });
  }

  // 2) Страница редактирования лота — иконка после заголовка + кликабельный заголовок
  function mountOnEditPage() {
    const h = document.querySelector('h1.page-header');
    if (!h) return;
    if (!/Редактирование предложения/.test(h.textContent)) return;
    if (h.querySelector('.fxn-open-lot')) return;
    const m = location.search.match(/offer=(\d+)/);
    if (!m) return;
    const id = m[1];

    // заголовок кликабельный (цвет только при наведении)
    h.classList.add('fxn-head-link');
    h.addEventListener('click', (e) => {
      // клик по самой иконке обрабатывается отдельно
      if (e.target.closest('.fxn-open-lot')) return;
      window.open('https://funpay.com/lots/offer?id=' + id, '_blank', 'noopener');
    });

    const btn = makeOpenBtn(id, 'Открыть этот лот');
    btn.style.marginLeft = '10px';
    h.appendChild(btn);
  }

  // 3) Вкладка «Что тебе нужно» (needs) — если там есть карточки лотов
  function mountOnNeeds() {
    // карточки в needs-вкладке тоже имеют ссылки на offerEdit или data-offer
    const cards = document.querySelectorAll('[data-fxn-need-offer], a.tc-item[data-offer]');
    cards.forEach((c) => {
      if (c.querySelector && c.querySelector('.fxn-open-lot')) return;
      const id = c.getAttribute('data-fxn-need-offer') || c.getAttribute('data-offer');
      if (!id) return;
      const btn = makeOpenBtn(id, 'Открыть лот');
      c.appendChild(btn);
    });
  }

  function run() {
    injectStyles();
    mountOnOffersTable();
    mountOnEditPage();
    mountOnNeeds();
  }

  let scheduled = false;
  function scheduleRun() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; run(); }, 200);
  }

  function boot() {
    run();
    const obs = new MutationObserver(() => { scheduleRun(); });
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch {}
    let last = location.href;
    setInterval(() => { if (location.href !== last) { last = location.href; run(); } }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
