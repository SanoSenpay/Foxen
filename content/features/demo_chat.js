// demo_chat.js — Premium Modal UI
'use strict';
(function () {

    const B = 'ТестПокупатель', OID = 'DEMO0001';
    let msgs = [], state = 'idle', selStars = 5;

    const t = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    function v(s) {
        const now = new Date();
        const h = now.getHours();
        const gr = h < 12 ? 'Доброе утро!' : h < 18 ? 'Добрый день!' : 'Добрый вечер!';
        const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        return (s || '')
            .replace(/{buyername}/gi, B)
            .replace(/{lotname}/gi, 'Тестовый товар')
            .replace(/{orderid}/gi, OID)
            .replace(/{welcome}/gi, gr)
            .replace(/{date}/gi, dateStr)
            .replace(/{bal}/gi, '120 000 ₽')
            .replace(/{activesells}/gi, '42')
            .replace(/{orderlink}/gi, 'https://funpay.com/orders/DEMO0001/')
            .replace(/\$username/g, B)
            .replace(/\$order_id/g, OID);
    }

    /* ── auto-responder ── */
    async function respond(ev, arg) {
        const { fpToolsAutoReplies: s = {} } = await browser.storage.local.get('fpToolsAutoReplies');
        let textToType = null;
        let hit = false;

        if (ev === 'NEW_ORDER' && s.newOrderReplyEnabled && s.newOrderReplyText) {
            textToType = v(s.newOrderReplyText); hit = true;
        } else if (ev === 'CONFIRMED' && s.orderConfirmReplyEnabled && s.orderConfirmReplyText) {
            textToType = v(s.orderConfirmReplyText); hit = true;
        } else if (ev === 'REVIEW') {
            if (s.autoReviewEnabled && s.reviewTemplates?.[arg]?.trim()) {
                textToType = v(s.reviewTemplates[arg]); hit = true;
            }
            if (arg === '5' && s.bonusForReviewEnabled) {
                const bArr = s.randomBonuses || [];
                const b = s.bonusMode === 'random' && bArr.length ? bArr[Math.floor(Math.random() * bArr.length)] : s.singleBonusText;
                if (b) {
                    textToType = textToType ? textToType + '\n' + v(b) : v(b);
                    hit = true;
                }
            }
        } else if (ev === 'MSG') {
            if (s.greetingEnabled && s.greetingText) { textToType = v(s.greetingText); hit = true; }
            if (!hit && s.keywordsEnabled) {
                const low = (arg || '').toLowerCase();
                for (const kw of (s.keywords || [])) {
                    const m = kw.matchMode === 'contains' ? low.includes(kw.keyword.toLowerCase()) : low === kw.keyword.toLowerCase();
                    if (m) { textToType = v(kw.response); hit = true; break; }
                }
            }
        }

        if (textToType) {
            const inp = document.getElementById('fpdm-input');
            if (inp) {
                inp.value = textToType;
                inp.focus();
            }
        } else if (!hit && ev !== 'MSG') {
            sys(`Авто-ответ для «${ev}» не настроен (проверьте настройки)`);
        }
    }

    function msgToHTML(m) {
        if (m.type === 'sys') return `<div class="fpdm-msg-item sys"><div class="fpdm-msg-bubble">${m.text}</div></div>`;
        if (m.type === 'me') return `<div class="fpdm-msg-item me"><div class="fpdm-msg-meta">Вы · ${m.t}</div><div class="fpdm-msg-bubble">${m.text.replace(/\n/g, '<br>')}</div></div>`;
        return `<div class="fpdm-msg-item other"><div class="fpdm-msg-meta">${B} · ${m.t}</div><div class="fpdm-msg-bubble">${m.text.replace(/\n/g, '<br>')}</div></div>`;
    }

    function render() {
        const el = document.getElementById('fpdm-list');
        if (!el) return;
        el.innerHTML = msgs.map(msgToHTML).join('');
        el.scrollTop = el.scrollHeight;
    }
    function addMsg(text, type = 'other') { msgs.push({ text, type, t: t() }); render(); }
    function sys(text) { addMsg(text, 'sys'); }

    /* ── Order Overlay ── */
    function openOrder() {
        if (document.getElementById('fpdm-order')) return;
        const stl = state === 'paid' ? 'Оплачен' : state === 'done' ? 'Выполнен' : 'Ожидает';
        const cls = state === 'paid' ? 'fpdm-status-paid' : state === 'done' ? 'fpdm-status-done' : 'fpdm-status-idle';
        const d = new Date(); const ds = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
        const ov = document.createElement('div');
        ov.id = 'fpdm-order'; ov.className = 'fpdm-overlay';
        ov.innerHTML = `
<div class="fpdm-order-window">
  <div class="fpdm-order-header">
    <h2>Заказ #${OID}</h2>
    <button class="fpdm-close-btn" id="fpdm-ord-back">✕</button>
  </div>
  <div class="fpdm-order-body">
    <div class="fpdm-flex-row">
      <div class="fpdm-flex-col" style="flex: 2;">
        <div class="fpdm-card" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="fpdm-status-badge ${cls}">${stl}</span>
          <span style="color:#5a5f7a; font-size:12px">Дата: ${ds}</span>
        </div>
        <div class="fpdm-card">
          <div class="fpdm-card-title">Покупатель</div>
          <div class="fpdm-buyer-info">
            <div class="fpdm-buyer-ava">👤</div>
            <div>
              <div class="fpdm-buyer-name">${B}</div>
              <div class="fpdm-buyer-sub">ID: 9999999 · DEMO-аккаунт</div>
            </div>
          </div>
        </div>
        <div class="fpdm-card">
          <div class="fpdm-card-title">Товар / Услуга</div>
          <div style="color:#c8cae0; font-size:14px; margin-bottom:8px">Тестовый товар — FP Tools Demo</div>
          <div style="color:#5a5f7a; font-size:12px">Категория: Демо · Количество: 1 шт.</div>
        </div>
      </div>
      <div class="fpdm-flex-col" style="flex: 1;">
        <div class="fpdm-card" style="text-align:center;">
          <div class="fpdm-card-title">Итого</div>
          <p class="fpdm-price">100 ₽</p>
          <div style="color:#5a5f7a; font-size:11px; margin-top:8px">Обычная сделка</div>
        </div>
        <div class="fpdm-card">
          <div class="fpdm-card-title">Действия</div>
          <div class="fpdm-actions">
            ${state === 'paid' ? `<button class="fpdm-btn success" id="fpdm-confirm" style="width:100%">✅ Подтвердить</button><button class="fpdm-btn ghost" id="fpdm-refund" style="width:100%">↩ Вернуть</button>` : ''}
            ${state === 'done' ? `<button class="fpdm-btn primary" id="fpdm-review" style="width:100%">⭐ Отзыв</button>` : ''}
            <button class="fpdm-btn ghost" id="fpdm-ord-chat" style="width:100%">💬 В чат</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
        document.body.appendChild(ov);
        const close = () => ov.remove();
        document.getElementById('fpdm-ord-back').onclick = close; document.getElementById('fpdm-ord-chat').onclick = close;
        document.getElementById('fpdm-confirm')?.addEventListener('click', () => { state = 'done'; close(); sys(`✅ ${B} подтвердил выполнение заказа #${OID} &nbsp;<a href="#" class="fpdm-ordlink" style="color:#6B66FF;text-decoration:underline">Открыть заказ</a>`); respond('CONFIRMED'); });
        document.getElementById('fpdm-refund')?.addEventListener('click', () => { state = 'idle'; close(); sys(`↩ Средства возвращены покупателю`); });
        document.getElementById('fpdm-review')?.addEventListener('click', () => { close(); openReview(); });
    }

    /* ── Review Modal ── */
    function openReview() {
        if (document.getElementById('fpdm-review-modal')) return;
        selStars = 5;
        const m = document.createElement('div');
        m.id = 'fpdm-review-modal'; m.className = 'fpdm-overlay';
        m.innerHTML = `
<div class="fpdm-review-box">
  <h3>Оставить отзыв</h3>
  <div class="fpdm-stars" id="fpdm-stars">${[1, 2, 3, 4, 5].map(n => `<span class="fpdm-star" data-n="${n}">★</span>`).join('')}</div>
  <textarea id="fpdm-rev-txt" class="fpdm-textarea" style="width:100%; margin-bottom:20px;" rows="3" placeholder="Напишите отзыв..."></textarea>
  <div class="fpdm-rev-actions">
    <button class="fpdm-btn ghost" id="fpdm-rev-cancel">Отмена</button>
    <button class="fpdm-btn primary" id="fpdm-rev-ok">Опубликовать</button>
  </div>
</div>`;
        document.body.appendChild(m);
        const close = () => m.remove();
        document.getElementById('fpdm-rev-cancel').onclick = close;
        m.querySelectorAll('.fpdm-star').forEach(s => {
            s.onclick = () => { selStars = +s.dataset.n; m.querySelectorAll('.fpdm-star').forEach(x => x.style.color = +x.dataset.n <= selStars ? '#ff9800' : '#444'); };
        });
        document.getElementById('fpdm-rev-ok').onclick = () => {
            const txt = document.getElementById('fpdm-rev-txt').value.trim() || 'Отличный продавец!';
            close(); sys(`${B} оставил отзыв ${'★'.repeat(selStars) + '☆'.repeat(5 - selStars)}: «${txt}»`); respond('REVIEW', String(selStars));
        };
    }

    /* ── Inject Custom Templates into Fake Chat ── */
    async function loadAndInjectTemplates(isSidebar) {
        const { fpToolsTemplateSettings: settings = {} } = await browser.storage.local.get('fpToolsTemplateSettings');
        const container = document.getElementById('fpdm-templates-container');
        if (!container) return;

        container.innerHTML = '';

        const DEFAULT_STANDARD_TEMPLATES = {
            greeting: { enabled: true, label: 'Приветствие', color: '#6B66FF', text: '{welcome}, {buyername}! Чем могу помочь?' },
            completed: { enabled: true, label: 'Заказ выполнен', color: '#6B66FF', text: 'Заказ выполнен. Пожалуйста, зайдите в раздел «Покупки», выберите его в списке и нажмите кнопку «Подтвердить выполнение заказа».' },
            review: { enabled: true, label: 'Попросить отзыв', color: '#FF6B6B', text: 'Спасибо за покупку! Буду очень благодарен, если вы оставите отзыв о сделке.' },
            thanks: { enabled: true, label: 'Спасибо за заказ', color: '#FF6B6B', text: 'Спасибо за заказ, {buyername}! Обращайтесь еще. {date}' }
        };

        const std = settings.standard && Object.keys(settings.standard).length > 0 ? settings.standard : DEFAULT_STANDARD_TEMPLATES;

        // Стили кнопок меняются в зависимости от того, сайдбар это или горизонтальный ряд
        const btnStyle = isSidebar
            ? "padding: 8px 12px; border: none; border-radius: 6px; color: white; font-size: 13px; cursor: pointer; text-align: left; width: 100%; box-sizing: border-box;"
            : "padding: 6px 12px; border: none; border-radius: 6px; color: white; font-size: 12px; cursor: pointer; white-space: nowrap;";

        Object.values(std).forEach(tmpl => {
            if (tmpl.enabled && tmpl.text) {
                const btn = document.createElement('button');
                btn.style.cssText = btnStyle + `background-color: ${tmpl.color || '#6B66FF'};`;
                btn.textContent = tmpl.label || 'Шаблон';
                btn.onclick = () => {
                    const inp = document.getElementById('fpdm-input');
                    if (inp) {
                        inp.value = v(tmpl.text);
                        inp.focus();
                    }
                };
                container.appendChild(btn);
            }
        });

        if (settings.custom) {
            settings.custom.forEach(tmpl => {
                if (tmpl.enabled && tmpl.text) {
                    const btn = document.createElement('button');
                    btn.style.cssText = btnStyle + `background-color: ${tmpl.color || '#4caf82'};`;
                    btn.textContent = tmpl.label || 'Шаблон';
                    btn.onclick = () => {
                        const inp = document.getElementById('fpdm-input');
                        if (inp) {
                            inp.value = v(tmpl.text);
                            inp.focus();
                        }
                    };
                    container.appendChild(btn);
                }
            });
        }
    }

    /* ── Main Chat Modal ── */
    async function showChat() {
        if (document.getElementById('fpdm-main-modal')) return;

        const { fpToolsTemplateSettings: settings = {} } = await browser.storage.local.get('fpToolsTemplateSettings');
        const isSidebar = settings.buttonPosition === 'sidebar';

        const ov = document.createElement('div');
        ov.id = 'fpdm-main-modal';
        ov.className = 'fpdm-overlay';

        const chatContentHtml = `
        <div class="fpdm-chat-header">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6B66FF,#4caf82);display:flex;align-items:center;justify-content:center;font-size:20px;">🧪</div>
                <div>
                    <div style="font-weight:700; color:#fff; font-size:15px;">FP Tools — Тестовый чат</div>
                    <div style="color:#7a7f9a; font-size:12px; margin-top:2px;">Симуляция: Заказ #${OID} · ${B}</div>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                ${!isSidebar ? `<button class="fpdm-btn ghost" id="fpdm-opn-order">📋 Заказ</button>` : ''}
                <button class="fpdm-close-btn" id="fpdm-close">✕</button>
            </div>
        </div>
        
        ${!isSidebar ? `
        <div class="fpdm-tools-bar">
            <button class="fpdm-btn ghost" id="fpdm-btn-order" style="padding:6px 10px; font-size:12px">🛒 Новый заказ</button>
            <button class="fpdm-btn success" id="fpdm-btn-confirm" style="padding:6px 10px; font-size:12px">✅ Подтвердить</button>
            <button class="fpdm-btn ghost" id="fpdm-btn-review" style="padding:6px 10px; font-size:12px; color:#ff9800">⭐ Отзыв</button>
            <button class="fpdm-btn primary" id="fpdm-btn-msg" style="padding:6px 10px; font-size:12px">💬 Сообщение</button>
            <button class="fpdm-btn danger" id="fpdm-btn-reset" style="padding:6px 10px; font-size:12px">🗑 Очистить</button>
        </div>` : ''}

        <div class="fpdm-msg-list" id="fpdm-list"></div>

        ${!isSidebar ? `
        <div id="fpdm-templates-container" style="display:flex; flex-wrap:wrap; gap:6px; padding:12px 24px 0 24px; overflow-x:auto;"></div>
        ` : ''}

        <div class="fpdm-input-area" style="box-sizing: border-box; width: 100%;">
            <textarea id="fpdm-input" class="fpdm-textarea" placeholder="Написать от имени продавца… (Ctrl+Enter)"></textarea>
        </div>
    `;

        const sidebarHtml = `
        <div class="fpdm-sidebar">
            <div class="fpdm-sidebar-title">Действия с заказом</div>
            <div class="fpdm-sidebar-tools">
                <button class="fpdm-btn ghost" id="fpdm-opn-order" style="width:100%; justify-content:flex-start;">📋 Открыть заказ</button>
                <button class="fpdm-btn ghost" id="fpdm-btn-order" style="width:100%; justify-content:flex-start;">🛒 Новый заказ</button>
                <button class="fpdm-btn success" id="fpdm-btn-confirm" style="width:100%; justify-content:flex-start;">✅ Подтвердить</button>
                <button class="fpdm-btn ghost" id="fpdm-btn-review" style="width:100%; justify-content:flex-start; color:#ff9800">⭐ Отзыв</button>
                <button class="fpdm-btn primary" id="fpdm-btn-msg" style="width:100%; justify-content:flex-start;">💬 Сообщение</button>
                <button class="fpdm-btn danger" id="fpdm-btn-reset" style="width:100%; justify-content:flex-start;">🗑 Очистить чат</button>
            </div>
            
            <div class="fpdm-sidebar-title" style="margin-top:24px;">Шаблоны</div>
            <div id="fpdm-templates-container" class="fpdm-sidebar-templates"></div>
        </div>
    `;

        ov.innerHTML = `
    <div class="fpdm-chat-window" style="flex-direction: row; ${isSidebar ? 'width: 1000px;' : 'width: 800px;'}">
        <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; min-width: 0;">
            ${chatContentHtml}
        </div>
        ${isSidebar ? sidebarHtml : ''}
    </div>`;

        document.body.appendChild(ov);

        document.getElementById('fpdm-close').onclick = () => ov.remove();
        document.getElementById('fpdm-opn-order').onclick = openOrder;
        document.getElementById('fpdm-list').addEventListener('click', e => { const a = e.target.closest('.fpdm-ordlink'); if (a) { e.preventDefault(); openOrder(); } });

        const rnd = ['Привет, есть в наличии?', 'Когда будет готово?', 'Спасибо!', 'Можно побыстрее?', 'Добрый день!'];
        document.getElementById('fpdm-btn-order').onclick = async () => { state = 'paid'; sys(`🛒 ${B} оплатил заказ #${OID} &nbsp;<a href="#" class="fpdm-ordlink" style="color:#6B66FF;text-decoration:underline">Открыть заказ</a>`); await respond('NEW_ORDER'); };
        document.getElementById('fpdm-btn-confirm').onclick = async () => { if (state !== 'paid') { sys('⚠ Сначала создайте заказ'); return; } state = 'done'; sys(`✅ ${B} подтвердил выполнение заказа #${OID} &nbsp;<a href="#" class="fpdm-ordlink" style="color:#6B66FF;text-decoration:underline">Заказ</a>`); await respond('CONFIRMED'); };
        document.getElementById('fpdm-btn-review').onclick = () => { if (state !== 'done') { sys('⚠ Сначала подтвердите заказ'); return; } openReview(); };
        document.getElementById('fpdm-btn-msg').onclick = async () => { const t = rnd[Math.floor(Math.random() * rnd.length)]; addMsg(t, 'other'); await respond('MSG', t); };
        document.getElementById('fpdm-btn-reset').onclick = () => { msgs = []; state = 'idle'; document.getElementById('fpdm-list').innerHTML = msgToHTML({ type: 'sys', text: '🗑 Чат очищен.' }); };

        const inp = document.getElementById('fpdm-input');
        const doSend = async () => { const txt = inp.value.trim(); if (!txt) return; inp.value = ''; addMsg(txt, 'me'); };
        inp.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doSend(); } });

        loadAndInjectTemplates(isSidebar);

        msgs = []; state = 'idle';
        sys('👋 Добро пожаловать в Тестовый чат! Здесь вы можете протестировать функционал Foxen, не затрагивая реальные заказы и чаты. <br><br>⚠️ Внимание: Этот чат всё ещё находится на стадии разработки, поэтому возможны некоторые неточности в работе.');
    }

    /* ── Injection Logic ── */
    function injectEntry() {
        const list = document.querySelector('.contact-list');
        if (!list || document.getElementById('fpdm-entry')) return;

        // Пытаемся клонировать существующий элемент контакта для идеального сохранения вёрстки
        const realContact = list.querySelector('.contact-item:not(#fpdm-entry)');
        let a;

        if (realContact) {
            a = realContact.cloneNode(true);
            a.id = 'fpdm-entry';
            a.classList.remove('active', 'unread');

            // Очищаем лишний текст и оставляем только нужный
            const nameEl = a.querySelector('.media-user-name');
            if (nameEl) nameEl.innerHTML = 'FP Tools — Тест <span style="font-size:10px;background:#6B66FF;color:#fff;border-radius:4px;padding:2px 5px;margin-left:4px">DEMO</span>';

            const msgEl = a.querySelector('.contact-item-message');
            if (msgEl) msgEl.textContent = 'Тестовый чат, нажмите что бы открыть. Здесь вы можете протестировать функционал расширения, включая функцию Автоответчика, а также протестировать другие функции.';

            const avaParent = a.querySelector('.media-user') || a.querySelector('.avatar-photo')?.parentElement;
            if (avaParent) {
                avaParent.style.flexShrink = '0';
            }

            const avaEl = a.querySelector('.avatar-photo');
            if (avaEl) {
                avaEl.style.cssText = 'background:linear-gradient(135deg,#6B66FF,#4caf82); display:flex; align-items:center; justify-content:center; font-size:35px; color:#fff; width:100%; height:100%; border-radius:50%; flex-shrink:0;';
                avaEl.innerHTML = '🧪';
            }
        } else {
            // Фоллбэк если чатов нет
            a = document.createElement('a');
            a.id = 'fpdm-entry';
            a.className = 'contact-item';
            a.innerHTML = `
          <div class="media-user style-circle">
            <div class="avatar-photo" style="background:linear-gradient(135deg,#6B66FF,#4caf82);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff">🧪</div>
          </div>
          <div class="contact-item-info">
            <div class="media-user-name">FP Tools — Тест <span style="font-size:10px;background:#6B66FF;color:#fff;border-radius:4px;padding:2px 5px;margin-left:4px">DEMO</span></div>
            <div class="contact-item-message">Тестовый чат, нажмите что бы открыть. </div>
          </div>`;
        }

        a.addEventListener('click', e => { e.preventDefault(); showChat(); });
        list.insertBefore(a, list.firstChild);
    }

    function init() {
        injectEntry();
        new MutationObserver(() => { if (!document.getElementById('fpdm-entry')) injectEntry(); })
            .observe(document.getElementById('content') || document.body, { childList: true, subtree: true });
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
