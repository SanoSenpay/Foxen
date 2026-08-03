(function () {
    'use strict';

    let currentBuyerId = null;
    let currentBuyerUsername = null;

    function injectStyles() {
        if (document.getElementById('fxn-buyer-ratings-css')) return;
        const s = document.createElement('style');
        s.id = 'fxn-buyer-ratings-css';
        s.textContent = `
            /* Badge styles */
            .fxn-buyer-rating-badge {
                display: inline-block;
                position: relative;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                user-select: none;
                margin-left: 8px;
                transition: color 0.3s ease;
                vertical-align: middle;
                padding-bottom: 2px;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }
            .fxn-buyer-rating-badge::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 2px;
                transform: scaleX(0);
                transform-origin: right;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 2px;
            }
            .fxn-buyer-rating-badge:hover::before {
                transform: scaleX(1);
                transform-origin: left;
            }
            .fxn-rating-positive {
                color: #81c784 !important;
            }
            .fxn-rating-positive::before {
                background: #81c784 !important;
                box-shadow: 0 0 8px rgba(129, 199, 132, 0.6);
            }
            .fxn-rating-negative {
                color: #e57373 !important;
            }
            .fxn-rating-negative::before {
                background: #e57373 !important;
                box-shadow: 0 0 8px rgba(229, 115, 115, 0.6);
            }
            .fxn-rating-neutral {
                color: #b0bec5 !important;
            }
            .fxn-rating-neutral::before {
                background: #b0bec5 !important;
            }

            /* Modal layout */
            .foxen-modal-overlay {
                position: fixed !important;
                inset: 0 !important;
                background: rgba(0,0,0,0.7) !important;
                backdrop-filter: blur(4px) !important;
                z-index: 99999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .fxn-modal {
                background: linear-gradient(135deg, #16181f 0%, #0e1018 100%);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 16px;
                box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
                max-width: 560px;
                width: 90vw;
                max-height: 88vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: fxn-modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes fxn-modal-in {
                from { opacity: 0; transform: scale(0.94) translateY(8px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            .fxn-modal-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 22px 14px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                flex-shrink: 0;
            }
            .fxn-modal-head-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .fxn-modal-title {
                font-size: 16px;
                font-weight: 700;
                color: #e8eaf0;
                margin: 0;
            }
            .fxn-modal-subtitle {
                font-size: 12px;
                color: rgba(255,255,255,0.35);
            }
            .fxn-modal-close {
                width: 30px; height: 30px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.04);
                color: rgba(255,255,255,0.5);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.15s;
            }
            .fxn-modal-close:hover {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }
            .fxn-modal-body {
                overflow-y: auto;
                padding: 18px 22px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                flex: 1;
            }
            .fxn-modal-body::-webkit-scrollbar { width: 4px; }
            .fxn-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

            /* Reviews list */
            .fxn-reviews-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 230px;
                overflow-y: auto;
                padding-right: 4px;
            }
            .fxn-reviews-list::-webkit-scrollbar { width: 3px; }
            .fxn-reviews-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
            .fxn-reviews-empty {
                text-align: center;
                padding: 24px;
                color: rgba(255,255,255,0.3);
                font-size: 13px;
                border: 1px dashed rgba(255,255,255,0.07);
                border-radius: 10px;
            }
            .fxn-review-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                padding: 12px 14px;
            }
            .fxn-review-header {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: rgba(255,255,255,0.35);
                margin-bottom: 6px;
            }
            .fxn-review-body {
                font-size: 13px;
                line-height: 1.5;
                word-break: break-word;
                color: rgba(255,255,255,0.75);
                margin-bottom: 8px;
            }
            .fxn-review-proof {
                width: 80px; height: 52px;
                border-radius: 6px;
                object-fit: cover;
                cursor: zoom-in;
                border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.2s;
            }
            .fxn-review-proof:hover { transform: scale(1.06); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }

            /* Zoom overlay */
            .fxn-img-zoom-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.88);
                backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                z-index: 100001;
                cursor: zoom-out;
            }
            .fxn-img-zoom-overlay img {
                max-width: 90%; max-height: 90%;
                border-radius: 10px;
                box-shadow: 0 16px 48px rgba(0,0,0,0.6);
            }

            /* Form divider */
            .fxn-form-divider {
                height: 1px;
                background: rgba(255,255,255,0.06);
            }

            /* Section label */
            .fxn-form-label {
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.6px;
                text-transform: uppercase;
                color: rgba(255,255,255,0.3);
                margin-bottom: 8px;
            }

            /* Tone buttons */
            .fxn-tone-group {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .fxn-tone-btn {
                padding: 10px 12px;
                border-radius: 10px;
                border: 1.5px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.03);
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.18s;
                display: flex; align-items: center; justify-content: center; gap: 6px;
            }
            .fxn-tone-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
            .fxn-tone-btn.active-pos {
                background: rgba(46,125,50,0.18);
                border-color: rgba(129,199,132,0.45);
                color: #81c784;
            }
            .fxn-tone-btn.active-neg {
                background: rgba(198,40,40,0.18);
                border-color: rgba(229,115,115,0.45);
                color: #e57373;
            }

            /* Textarea */
            .fxn-textarea {
                width: 100%;
                min-height: 80px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                color: #d8dae8;
                font-size: 13px;
                line-height: 1.5;
                padding: 10px 12px;
                resize: none;
                outline: none;
                transition: border-color 0.18s;
                box-sizing: border-box;
                font-family: inherit;
            }
            .fxn-textarea:focus { border-color: rgba(192,38,211,0.4); }
            .fxn-textarea::placeholder { color: rgba(255,255,255,0.2); }

            /* Paste zone (multi) */
            .fxn-paste-zone {
                border: 1.5px dashed rgba(255,255,255,0.12);
                border-radius: 10px;
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                color: rgba(255,255,255,0.3);
                font-size: 12px;
                position: relative;
                overflow: hidden;
                min-height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 12px;
            }
            .fxn-paste-zone:hover {
                border-color: rgba(192,38,211,0.35);
                background: rgba(192,38,211,0.04);
            }
            .fxn-paste-zone.drag-over {
                border-color: rgba(192,38,211,0.6);
                background: rgba(192,38,211,0.08);
            }
            .fxn-paste-zone-icon { font-size: 22px; opacity: 0.5; }
            /* Multi-image grid */
            .fxn-img-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                gap: 8px;
                width: 100%;
            }
            .fxn-img-thumb {
                position: relative;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid rgba(129,199,132,0.25);
                background: rgba(0,0,0,0.3);
                aspect-ratio: 4/3;
                cursor: zoom-in;
            }
            .fxn-img-thumb img {
                width: 100%; height: 100%;
                object-fit: cover;
                display: block;
                transition: opacity 0.15s;
            }
            .fxn-img-thumb:hover img { opacity: 0.8; }
            .fxn-img-thumb-rm {
                position: absolute; top: 4px; right: 4px;
                width: 20px; height: 20px;
                border-radius: 5px;
                background: rgba(0,0,0,0.7);
                border: none;
                color: rgba(255,255,255,0.8);
                font-size: 13px;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                opacity: 0;
                transition: opacity 0.15s;
            }
            .fxn-img-thumb:hover .fxn-img-thumb-rm { opacity: 1; }
            .fxn-img-thumb-rm:hover { background: rgba(220,50,50,0.8); color: #fff; }
            .fxn-img-add-btn {
                border-radius: 8px;
                border: 1.5px dashed rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.03);
                color: rgba(255,255,255,0.3);
                aspect-ratio: 4/3;
                display: flex; align-items: center; justify-content: center;
                flex-direction: column;
                gap: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.15s;
            }
            .fxn-img-add-btn:hover {
                border-color: rgba(192,38,211,0.4);
                background: rgba(192,38,211,0.05);
                color: rgba(255,255,255,0.5);
            }
            .fxn-img-add-icon { font-size: 20px; opacity: 0.5; }

            /* Submit button */
            .fxn-submit-btn {
                width: 100%;
                padding: 12px;
                border-radius: 10px;
                border: none;
                background: linear-gradient(135deg, #6d28d9, #c026d3);
                color: #fff;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 16px rgba(192,38,211,0.3);
                letter-spacing: 0.3px;
            }
            .fxn-submit-btn:hover { filter: brightness(1.1); box-shadow: 0 6px 20px rgba(192,38,211,0.4); }
            .fxn-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }

            /* Not verified banner */
            .fxn-not-verified {
                padding: 14px 16px;
                background: rgba(239,68,68,0.07);
                border: 1px solid rgba(239,68,68,0.18);
                border-radius: 10px;
                font-size: 12px;
                color: rgba(255,255,255,0.55);
                text-align: center;
                line-height: 1.5;
            }

            /* Delete review button */
            .fxn-rev-del-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                color: rgba(255,255,255,0.4);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                border-radius: 5px;
                line-height: 1;
                flex-shrink: 0;
            }
            .fxn-rev-del-btn:hover {
                background: rgba(239,68,68,0.15);
                color: #ef4444;
            }
            .fxn-rev-del-btn:disabled { cursor: default; opacity: 0.3; }

            /* Anonymous toggle container */
            .fxn-anon-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 4px 0 16px;
                padding: 10px 12px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
            }
            .fxn-anon-label {
                font-size: 13px;
                color: rgba(255,255,255,0.7);
            }
            .fxn-switch {
                position: relative;
                display: inline-block;
                width: 38px;
                height: 20px;
                flex-shrink: 0;
            }
            .fxn-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .fxn-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(255,255,255,0.12);
                transition: .3s;
                border-radius: 20px;
            }
            .fxn-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background-color: rgba(255,255,255,0.7);
                transition: .3s;
                border-radius: 50%;
            }
            .fxn-switch input:checked + .fxn-slider {
                background-color: #c026d3;
            }
            .fxn-switch input:checked + .fxn-slider:before {
                transform: translateX(18px);
                background-color: #fff;
            }
        `;
        document.head.appendChild(s);
    }

    // --- Отображение красивого счетчика рейтинга рядом с ником ---
    async function loadAndInjectRatingBadge() {
        // Проверяем отключена ли фича в реестре настроек
        if (window.foxenDisabledFeatures && window.foxenDisabledFeatures.includes('buyer_ratings_supabase')) {
            return;
        }

        // 1. Поиск никнейма в шапке чата
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            let buyerId = '';
            const userLink = chatHeader.querySelector(".media-user-name a[href*=\"/users/\"]");
            if (userLink) {
                const href = userLink.getAttribute('href') || '';
                const match = href.match(/\/users\/(\d+)\/?/);
                if (match && match[1]) {
                    buyerId = match[1];
                }
            }

            // Проверяем, есть ли старый бейдж от другого диалога
            const existingBadge = chatHeader.querySelector('.fxn-buyer-rating-badge');
            if (existingBadge && existingBadge.dataset.userId !== String(buyerId)) {
                existingBadge.remove();
            }

            // Рендерим новый бейдж, если его ещё нет
            if (buyerId && !chatHeader.querySelector('.fxn-buyer-rating-badge')) {
                const nameEl = chatHeader.querySelector('.media-user-name');
                if (nameEl && userLink) {
                    const buyerUsername = userLink.textContent.trim();
                    createAndInjectBadge(buyerId, buyerUsername, nameEl);
                }
            }
        }

        // 2. Поиск никнейма на странице профиля
        const path = window.location.pathname;
        if (path.startsWith('/users/') && !path.includes('/settings')) {
            const match = path.match(/\/users\/(\d+)\/?/);
            const profileNameEl = document.querySelector('.header-descr-title') || document.querySelector('h1');
            if (match && profileNameEl) {
                const buyerId = match[1];

                // Проверяем, есть ли старый бейдж от другого профиля
                const existingBadge = profileNameEl.querySelector('.fxn-buyer-rating-badge');
                if (existingBadge && existingBadge.dataset.userId !== String(buyerId)) {
                    existingBadge.remove();
                }

                // Рендерим бейдж, если его нет
                if (!profileNameEl.querySelector('.fxn-buyer-rating-badge')) {
                    const buyerUsername = profileNameEl.textContent.trim();
                    createAndInjectBadge(buyerId, buyerUsername, profileNameEl);
                }
            }
        }
    }

    function createAndInjectBadge(buyerId, buyerUsername, targetEl) {
        if (targetEl.querySelector('.fxn-buyer-rating-badge')) return;

        // Создаем компактный красивый бейдж
        const badge = document.createElement('span');
        badge.className = 'fxn-buyer-rating-badge fxn-rating-neutral';
        badge.style.display = 'inline-flex';
        badge.textContent = '...';
        badge.dataset.userId = String(buyerId);
        targetEl.appendChild(badge);

        chrome.runtime.sendMessage({ action: 'supabaseGetRating', buyerId }, (res) => {
            if (!res || !res.success) {
                badge.textContent = '?';
                badge.title = res?.error || 'Не удалось загрузить данные Supabase';
                return;
            }

            const rating = res.rating || 0;
            badge.classList.remove('fxn-rating-neutral');
            if (rating > 0) {
                badge.classList.add('fxn-rating-positive');
                badge.textContent = `+${rating}`;
            } else if (rating < 0) {
                badge.classList.add('fxn-rating-negative');
                badge.textContent = `${rating}`;
            } else {
                badge.classList.add('fxn-rating-neutral');
                badge.textContent = '0';
            }

            badge.title = `Рейтинг покупателя: ${rating > 0 ? '+' : ''}${rating} (кликните для просмотра отзывов)`;

            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Получаем currentUserId через supabaseGetStatus
                chrome.runtime.sendMessage({ action: 'supabaseGetStatus' }, (statusRes) => {
                    const currentUserId = String(statusRes?.userId || '');
                    console.log('[Foxen] openReviewsModal currentUserId:', currentUserId, '| isAdmin:', currentUserId === ADMIN_USER_ID);
                    openReviewsModal(buyerId, buyerUsername, rating, res.reviews || [], currentUserId);
                });
            });
        });
    }

    // --- Окно просмотра и добавления отзывов ---
    const ADMIN_USER_ID = '15508026';
    function openReviewsModal(buyerId, buyerUsername, totalRating, reviews, currentUserId = '') {
        document.getElementById('fxn-buyer-reviews-modal')?.remove();

        // Блокируем нативную кнопку прикрепления фото в чате FunPay
        const chatFileBtn = document.querySelector('.chat-form-btn .btn-file, .chat-file-input-btn, [class*="chat"] input[type="file"]');
        if (chatFileBtn) chatFileBtn.style.pointerEvents = 'none';

        const overlay = document.createElement('div');
        overlay.id = 'fxn-buyer-reviews-modal';
        overlay.className = 'foxen-modal-overlay';

        let ratingLabel = '0';
        let ratingColor = '#b0bec5';
        if (totalRating > 0) { ratingLabel = `+${totalRating}`; ratingColor = '#81c784'; }
        else if (totalRating < 0) { ratingLabel = String(totalRating); ratingColor = '#e57373'; }

        const modal = document.createElement('div');
        modal.className = 'fxn-modal';
        modal.innerHTML = `
            <div class="fxn-modal-head">
                <div class="fxn-modal-head-info">
                    <div class="fxn-modal-title">${esc(buyerUsername)}</div>
                    <div class="fxn-modal-subtitle">Рейтинг покупателя: <span style="color:${ratingColor};font-weight:700;">${ratingLabel}</span></div>
                </div>
                <button class="fxn-modal-close" title="Закрыть">✕</button>
            </div>
            <div class="fxn-modal-body">
                <div id="fxn-reviews-list-wrap"></div>
                <div id="fxn-review-form-wrap"></div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Закрыть
        let removeDragBlocksFn = null; // будет заполнен из формы
        const closeModal = () => {
            overlay.remove();
            if (chatFileBtn) chatFileBtn.style.pointerEvents = '';
            window.removeEventListener('paste', pasteHandler, true);
            if (removeDragBlocksFn) removeDragBlocksFn();
        };
        modal.querySelector('.fxn-modal-close').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); }, { once: true });

        // 1. Список отзывов
        const listWrap = modal.querySelector('#fxn-reviews-list-wrap');
        const isAdmin = currentUserId === ADMIN_USER_ID;

        function renderReviewsList(reviewsArr) {
            listWrap.innerHTML = '';
            if (!reviewsArr || reviewsArr.length === 0) {
                listWrap.innerHTML = '<div class="fxn-reviews-empty">✦ Отзывов об этом покупателе ещё нет. Будьте первым!</div>';
                return;
            }
            const list = document.createElement('div');
            list.className = 'fxn-reviews-list';
            reviewsArr.forEach(rev => {
                const card = document.createElement('div');
                card.className = 'fxn-review-card';
                const date = new Date(rev.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                const isPos = rev.rating_change > 0;
                const badge = isPos
                    ? `<span style="background:rgba(46,125,50,0.18);color:#81c784;border:1px solid rgba(129,199,132,0.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;">👍 Положительный</span>`
                    : `<span style="background:rgba(198,40,40,0.18);color:#e57373;border:1px solid rgba(229,115,115,0.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;">👎 Негативный</span>`;

                // Поддержка анонимных отзывов
                const isAnon = !!rev.is_anonymous;
                const showAuthor = !isAnon || isAdmin || (currentUserId && String(rev.seller_id) === currentUserId);
                const authorName = showAuthor ? esc(rev.seller_username) : 'Анонимный продавец';
                const authorSuffix = (isAnon && showAuthor) ? ' <span style="opacity:0.4; font-size:10px; font-weight:normal;">(анонимно)</span>' : '';

                // Кнопка удаления — видна админу или автору отзыва
                const canDelete = isAdmin || (currentUserId && String(rev.seller_id) === currentUserId);
                const deleteBtn = canDelete ? `<button class="fxn-rev-del-btn" data-id="${rev.id}" title="Удалить отзыв"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : '';

                card.innerHTML = `
                    <div class="fxn-review-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; width:100%;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            ${badge}
                            <span style="font-weight:600;">${authorName}${authorSuffix}</span>
                            <span style="opacity:0.4; font-size:11px;">${date}</span>
                        </div>
                        ${deleteBtn}
                    </div>
                    <div class="fxn-review-body">${esc(rev.comment)}</div>
                `;

                // Добавляем скриншоты (поддержка массива proof_image_urls и обратная совместимость с одиночным proof_image_url)
                const urls = Array.isArray(rev.proof_image_urls) && rev.proof_image_urls.length > 0
                    ? rev.proof_image_urls
                    : (rev.proof_image_url ? [rev.proof_image_url] : []);

                if (urls.length > 0) {
                    const proofsWrap = document.createElement('div');
                    proofsWrap.style.display = 'flex';
                    proofsWrap.style.gap = '8px';
                    proofsWrap.style.marginTop = '8px';
                    proofsWrap.style.flexWrap = 'wrap';

                    urls.forEach(url => {
                        const img = document.createElement('img');
                        img.className = 'fxn-review-proof';
                        img.src = url;
                        img.title = 'Просмотреть скриншот';
                        img.onclick = () => openImageZoom(url);
                        proofsWrap.appendChild(img);
                    });
                    card.appendChild(proofsWrap);
                }

                // Обработчик удаления
                if (canDelete) {
                    const delBtn = card.querySelector('.fxn-rev-del-btn');
                    if (delBtn) {
                        delBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (!confirm('Удалить этот отзыв? Действие необратимо.')) return;
                            const originalContent = delBtn.innerHTML;
                            delBtn.innerHTML = '⏳';
                            delBtn.disabled = true;
                            chrome.runtime.sendMessage({ action: 'supabaseDeleteReview', reviewId: rev.id }, (delRes) => {
                                if (!delRes || !delRes.success) {
                                    delBtn.innerHTML = originalContent;
                                    delBtn.disabled = false;
                                    if (typeof showNotification === 'function') showNotification(delRes?.error || 'Не удалось удалить', true);
                                    return;
                                }
                                card.style.transition = 'opacity 0.25s';
                                card.style.opacity = '0';
                                setTimeout(() => card.remove(), 260);
                                if (typeof showNotification === 'function') showNotification('Отзыв удалён');
                            });
                        };
                    }
                }

                list.appendChild(card);
            });
            listWrap.appendChild(list);
        }

        renderReviewsList(reviews);

        // 2. Форма отзыва
        const formWrap = modal.querySelector('#fxn-review-form-wrap');
        let pasteHandler = () => {};
        let capturedFiles = []; // массив { file, url }

        chrome.runtime.sendMessage({ action: 'supabaseGetStatus' }, (statusRes) => {
            if (!statusRes || !statusRes.isVerified) {
                formWrap.innerHTML = `<div class="fxn-not-verified">🔐 Вы не можете оставить отзыв. Пожалуйста, пройдите однократную <strong>верификацию</strong> в настройках Foxen → «База отзывов».</div>`;
                return;
            }

            let selectedRating = 1;

            formWrap.innerHTML = `
                <div class="fxn-form-divider"></div>
                <div>
                    <div class="fxn-form-label">Оценка</div>
                    <div class="fxn-tone-group">
                        <button type="button" class="fxn-tone-btn active-pos" id="fxn-btn-pos">👍 Положительный</button>
                        <button type="button" class="fxn-tone-btn" id="fxn-btn-neg">👎 Отрицательный</button>
                    </div>
                </div>
                <div>
                    <div class="fxn-form-label">Комментарий</div>
                    <textarea class="fxn-textarea" id="fxn-review-comment" placeholder="Опишите детали сделки — что пошло не так или почему покупатель отличный (мин. 10 символов)…"></textarea>
                </div>
                <div>
                    <div class="fxn-form-label" id="fxn-screen-label">Скриншоты-доказательства (обязательно, до 5 шт.)</div>
                    <div class="fxn-paste-zone" id="fxn-paste-zone">
                        <div class="fxn-paste-zone-icon">🖼</div>
                        <div>Вставьте изображение <strong style="color:rgba(255,255,255,0.5);">Ctrl+V</strong> или перетащите сюда</div>
                        <div style="font-size:11px;opacity:0.4;">PNG, JPG, WebP · до 5 скриншотов</div>
                    </div>
                </div>
                <div class="fxn-anon-row">
                    <span class="fxn-anon-label">Опубликовать анонимно</span>
                    <label class="fxn-switch">
                        <input type="checkbox" id="fxn-review-anon">
                        <span class="fxn-slider"></span>
                    </label>
                </div>
                <button type="button" id="fxn-btn-submit-review" class="fxn-submit-btn">Отправить отзыв</button>
            `;

            const btnPos = formWrap.querySelector('#fxn-btn-pos');
            const btnNeg = formWrap.querySelector('#fxn-btn-neg');
            const pasteZone = formWrap.querySelector('#fxn-paste-zone');
            const submitBtn = formWrap.querySelector('#fxn-btn-submit-review');

            // btnPos/btnNeg - обработчики после объявления функций
            btnPos.onclick = () => {
                selectedRating = 1;
                btnPos.classList.add('active-pos');
                btnNeg.classList.remove('active-neg');
            };
            btnNeg.onclick = () => {
                selectedRating = -1;
                btnNeg.classList.add('active-neg');
                btnPos.classList.remove('active-pos');
            };

            // --- Обновляем сетку превью ---
            function refreshGrid() {
                const pasteZone = formWrap.querySelector('#fxn-paste-zone');
                if (!pasteZone) return;

                if (capturedFiles.length === 0) {
                    pasteZone.innerHTML = `
                        <div class="fxn-paste-zone-icon">🖼</div>
                        <div>Вставьте изображение <strong style="color:rgba(255,255,255,0.5);">Ctrl+V</strong> или перетащите сюда</div>
                        <div style="font-size:11px;opacity:0.4;">PNG, JPG, WebP · до 5 скриншотов</div>
                    `;
                    pasteZone.style.padding = '16px';
                    pasteZone.style.cursor = 'pointer';
                    pasteZone.onclick = pickFile;
                } else {
                    pasteZone.style.padding = '10px';
                    pasteZone.style.cursor = 'default';
                    pasteZone.onclick = null;

                    const grid = document.createElement('div');
                    grid.className = 'fxn-img-grid';

                    capturedFiles.forEach((entry, idx) => {
                        const thumb = document.createElement('div');
                        thumb.className = 'fxn-img-thumb';
                        const img = document.createElement('img');
                        img.src = entry.url;
                        img.onclick = () => openImageZoom(entry.url);
                        const rmBtn = document.createElement('button');
                        rmBtn.className = 'fxn-img-thumb-rm';
                        rmBtn.title = 'Удалить';
                        rmBtn.textContent = '✕';
                        rmBtn.onclick = (e) => {
                            e.stopPropagation();
                            URL.revokeObjectURL(capturedFiles[idx].url);
                            capturedFiles.splice(idx, 1);
                            refreshGrid();
                        };
                        thumb.appendChild(img);
                        thumb.appendChild(rmBtn);
                        grid.appendChild(thumb);
                    });

                    // Кнопка «Добавить ещё» (если < 5)
                    if (capturedFiles.length < 5) {
                        const addBtn = document.createElement('div');
                        addBtn.className = 'fxn-img-add-btn';
                        addBtn.innerHTML = '<div class="fxn-img-add-icon">＋</div><div>Добавить</div>';
                        addBtn.onclick = pickFile;
                        grid.appendChild(addBtn);
                    }

                    pasteZone.innerHTML = '';
                    pasteZone.appendChild(grid);
                }
            }

            // --- Добавить файл в коллекцию ---
            function addFile(file) {
                if (!file || !file.type.startsWith('image/')) return;
                if (capturedFiles.length >= 5) return;
                const url = URL.createObjectURL(file);
                capturedFiles.push({ file, url });
                refreshGrid();
            }

            function pickFile() {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
                input.onchange = () => { Array.from(input.files).forEach(addFile); };
                input.click();
            }

            // Инициализируем зону (переменная уже объявлена выше)
            pasteZone.onclick = pickFile;

            // Ctrl+V — перехватываем в capture-фазе, ДО чата FunPay
            pasteHandler = (e) => {
                if (!document.getElementById('fxn-buyer-reviews-modal')) return;
                const items = e.clipboardData?.items;
                if (!items) return;
                let hasImage = false;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        hasImage = true;
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        addFile(item.getAsFile());
                        break;
                    }
                }
            };
            window.addEventListener('paste', pasteHandler, true);

            // Drag & Drop — тоже перехватываем глобально чтобы чат не получил
            const _blockDragForChat = (e) => {
                if (document.getElementById('fxn-buyer-reviews-modal')) e.stopImmediatePropagation();
            };
            document.addEventListener('dragover', _blockDragForChat, true);
            document.addEventListener('drop', _blockDragForChat, true);

            // _removeDragBlocks — снимаем глобальные drag-перехватчики при закрытии
            const _removeDragBlocks = () => {
                document.removeEventListener('dragover', _blockDragForChat, true);
                document.removeEventListener('drop', _blockDragForChat, true);
            };
            removeDragBlocksFn = _removeDragBlocks;

            pasteZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); pasteZone.classList.add('drag-over'); });
            pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('drag-over'));
            pasteZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                pasteZone.classList.remove('drag-over');
                Array.from(e.dataTransfer?.files || []).forEach(addFile);
            });

            // --- Склейка всех изображений в одно через Canvas ---
            async function compositeImages() {
                if (capturedFiles.length === 1) {
                    return await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(capturedFiles[0].file);
                    });
                }

                // Загружаем все картинки
                const imgs = await Promise.all(capturedFiles.map(entry =>
                    new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = entry.url;
                    })
                ));

                const padding = 8;
                const maxW = Math.max(...imgs.map(i => i.naturalWidth));
                const totalH = imgs.reduce((s, i) => s + i.naturalHeight, 0) + padding * (imgs.length - 1);

                const canvas = document.createElement('canvas');
                canvas.width = maxW;
                canvas.height = totalH;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#0d0e14';
                ctx.fillRect(0, 0, maxW, totalH);

                let y = 0;
                for (const img of imgs) {
                    ctx.drawImage(img, 0, y, img.naturalWidth, img.naturalHeight);
                    y += img.naturalHeight + padding;
                }

                return canvas.toDataURL('image/jpeg', 0.9);
            }

            // Отправка
            submitBtn.onclick = async () => {
                const comment = formWrap.querySelector('#fxn-review-comment').value.trim();
                const isAnonymous = formWrap.querySelector('#fxn-review-anon')?.checked || false;
                if (comment.length < 10) {
                    if (typeof showNotification === 'function') showNotification('Комментарий должен быть длиннее 10 символов', true);
                    return;
                }
                if (capturedFiles.length === 0) {
                    if (typeof showNotification === 'function') showNotification('Необходимо прикрепить хотя бы один скриншот!', true);
                    return;
                }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Подготовка…';

                // Конвертируем каждый файл в base64
                const imagesBase64 = await Promise.all(capturedFiles.map(entry =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(entry.file);
                    })
                ));

                submitBtn.textContent = 'Публикация…';
                chrome.runtime.sendMessage({
                    action: 'supabaseSubmitReview',
                    buyerId, buyerUsername,
                    ratingChange: selectedRating,
                    comment,
                    imageBinaryBase64: imagesBase64[0],       // первый — основной
                    imagesBase64,                              // все остальные
                    isAnonymous
                }, (submitRes) => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Отправить отзыв';
                    if (!submitRes || !submitRes.success) {
                        if (typeof showNotification === 'function') showNotification(submitRes?.error || 'Не удалось отправить отзыв', true);
                        return;
                    }
                    if (typeof showNotification === 'function') showNotification('Отзыв успешно добавлен!');
                    closeModal();
                    document.querySelectorAll('.fxn-buyer-rating-badge').forEach(b => b.remove());
                    loadAndInjectRatingBadge();
                });
            }; // end submitBtn.onclick
        }); // end supabaseGetStatus
    }

    // Полноэкранный зум картинок пруфов
    function openImageZoom(src) {
        const overlay = document.createElement('div');
        overlay.className = 'fxn-img-zoom-overlay';
        const img = document.createElement('img');
        img.src = src;
        overlay.appendChild(img);
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- Инжекция настроек Supabase на вкладку settings_io ---
    async function injectSupabaseSettings(container) {
        if (!container) return;
        if (container.querySelector('#fxn-supabase-settings')) return;

        const sbDiv = document.createElement('div');
        sbDiv.id = 'fxn-supabase-settings';
        sbDiv.style.marginTop = '24px';
        sbDiv.style.borderTop = '1px solid rgba(255,255,255,0.06)';
        sbDiv.style.paddingTop = '16px';

        sbDiv.innerHTML = `
            <h3>База отзывов о покупателях</h3>
            <p class="template-info">Вы можете подтвердить свой никнейм на FunPay, чтобы получить доступ к публикации отзывов и добавлению скриншотов сделок.</p>
            <div id="fxn-sb-status-container" style="padding:12px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:13px; margin-bottom:15px;">
                Загрузка статуса...
            </div>
        `;

        container.appendChild(sbDiv);
        const statusContainer = sbDiv.querySelector('#fxn-sb-status-container');

        // Рендерим статус верификации
        updateVerificationStatusUI(statusContainer);
    }

    function getLocalUserData() {
        let userId = '';
        let username = '';

        // 1. Пробуем получить из data-app-data
        try {
            const body = document.body;
            if (body && body.dataset && body.dataset.appData) {
                const appData = JSON.parse(body.dataset.appData);
                const userData = Array.isArray(appData) ? appData[0] : appData;
                if (userData) {
                    if (userData.userId) userId = String(userData.userId);
                    if (userData.userName || userData.username) {
                        username = String(userData.userName || userData.username);
                    }
                }
            }
        } catch (e) {
            console.warn("Foxen: failed to parse local appData", e);
        }

        // 2. Пробуем получить имя из шапки сайта (.user-link-name)
        if (!username) {
            const nameEl = document.querySelector('.user-link-name');
            if (nameEl) {
                username = nameEl.textContent.trim();
            }
        }

        // 3. Пробуем получить userId из ссылок на профиль в шапке
        if (!userId) {
            const userLinks = document.querySelectorAll('a[href*="/users/"]');
            for (const link of userLinks) {
                const href = link.getAttribute('href') || '';
                const match = href.match(/\/users\/(\d+)\/?/);
                if (match && match[1]) {
                    if (href.includes('/users/settings')) continue;
                    userId = match[1];
                    break;
                }
            }
        }

        if (userId && username) {
            return { userId, username };
        }
        return null;
    }

    function updateVerificationStatusUI(container) {
        const storageApi = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
        storageApi.get('foxenSupabaseJwt', (storeData) => {
            const isVerified = !!storeData.foxenSupabaseJwt;
            const userData = getLocalUserData();

            if (isVerified) {
                const displayUser = userData ? userData.username : 'аккаунт подтвержден';
                container.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#81c784; font-weight:bold;">🟢 Верифицирован (аккаунт: ${displayUser})</span>
                        <button type="button" id="fxn-sb-reset-verify" class="btn btn-default" style="padding:4px 8px; font-size:11px;">Сбросить</button>
                    </div>
                `;
                container.querySelector('#fxn-sb-reset-verify').onclick = async () => {
                    await storageApi.remove('foxenSupabaseJwt');
                    if (typeof showNotification === 'function') showNotification('Верификация сброшена.');
                    updateVerificationStatusUI(container);
                };
            } else {
                if (!userData) {
                    container.innerHTML = `
                        <div>
                            <div style="color:#e57373; font-weight:bold; margin-bottom:8px;">🔴 Не верифицирован</div>
                            <p style="font-size:11px; color:#e57373; margin-bottom:0;">Пожалуйста, авторизуйтесь на FunPay, чтобы активировать базу отзывов.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = `
                    <div>
                        <div style="color:#e57373; font-weight:bold; margin-bottom:8px;">🔴 Не верифицирован</div>
                        <button type="button" id="fxn-sb-verify-btn" class="btn btn-primary" style="width:100%;">Активировать базу отзывов</button>
                    </div>
                `;

                const verifyBtn = container.querySelector('#fxn-sb-verify-btn');
                verifyBtn.onclick = () => {
                    verifyBtn.disabled = true;
                    verifyBtn.textContent = 'Активация...';

                    chrome.runtime.sendMessage({
                        action: 'supabaseVerifySeller',
                        userId: userData.userId,
                        username: userData.username
                    }, (verifyRes) => {
                        verifyBtn.disabled = false;
                        verifyBtn.textContent = 'Активировать базу отзывов';

                        if (!verifyRes || !verifyRes.success) {
                            if (typeof showNotification === 'function') {
                                showNotification(verifyRes?.error || 'Не удалось активировать базу отзывов.', true);
                            }
                            return;
                        }

                        if (typeof showNotification === 'function') showNotification('База отзывов успешно активирована!');
                        updateVerificationStatusUI(container);
                    });
                };
            }
        });
    }

    function init() {
        injectStyles();

        // 1. Проверяем наличие блока "Дата регистрации" для бейджа
        loadAndInjectRatingBadge();

        // 2. Проверяем настройки
        const settingsContainer = document.querySelector('.foxen-page-content[data-page="settings_io"]');
        if (settingsContainer) injectSupabaseSettings(settingsContainer);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Наблюдатель MutationObserver для всего body (чтобы перехватывать рендеринг настроек и чата)
    new MutationObserver(() => {
        // Поиск и инжекция рейтинга рядом с датой регистрации
        loadAndInjectRatingBadge();

        // Настройки
        const settingsContainer = document.querySelector('.foxen-page-content[data-page="settings_io"]');
        if (settingsContainer && !settingsContainer.querySelector('#fxn-supabase-settings')) {
            injectSupabaseSettings(settingsContainer);
        }
    }).observe(document.body, { childList: true, subtree: true });

})();
