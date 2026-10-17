// content/features/review_screenshot.js
// =============================================================================
// Foxen — «Сделать скриншот» к каждому отзыву
//
// Генерирует стилизованное брендированное изображение отзыва на основе шаблона
// reviewtemplateclear.png в разрешении 1671x941:
//   • Аватарка покупателя (с круглой обрезкой и fallback-иконкой)
//   • Никнейм покупателя и номер заказа (#ORDERID)
//   • Точная дата отзыва и относительное время («3 года назад»)
//   • Название игры / лота и сумма заказа («Valorant, 200 ₽»)
//   • Звезды рейтинга (1–5)
//   • Текст отзыва рядом с кавычкой
//
// Позволяет моментально скопировать готовое изображение в буфер обмена
// (для отправки в Telegram/Discord/VK) или скачать как PNG.
// =============================================================================

(function () {
    'use strict';

    const TEMPLATE_WIDTH = 1671;
    const TEMPLATE_HEIGHT = 941;
    let _cachedClearBg = null;
    let _cachedDefaultAvatar = null;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. УТИЛИТЫ И ОБРАБОТКА ДАТ
    // ─────────────────────────────────────────────────────────────────────────

    function plural(n, one, two, five) {
        n = Math.abs(n) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    }

    function calcRelativeTime(dateMs) {
        if (!dateMs || isNaN(dateMs)) return '';
        const now = Date.now();
        const diff = Math.max(0, now - dateMs);
        const sec = Math.floor(diff / 1000);
        const min = Math.floor(sec / 60);
        const hours = Math.floor(min / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30.4);
        const years = Math.floor(days / 365.25);

        if (years >= 1) return years + ' ' + plural(years, 'год', 'года', 'лет') + ' назад';
        if (months >= 1) return months + ' ' + plural(months, 'месяц', 'месяца', 'месяцев') + ' назад';
        if (weeks >= 1) return weeks + ' ' + plural(weeks, 'неделю', 'недели', 'недель') + ' назад';
        if (days >= 2) return days + ' ' + plural(days, 'день', 'дня', 'дней') + ' назад';
        if (days === 1) return 'вчера';
        if (hours >= 1) return hours + ' ' + plural(hours, 'час', 'часа', 'часов') + ' назад';
        if (min >= 1) return min + ' ' + plural(min, 'минуту', 'минуты', 'минут') + ' назад';
        return 'только что';
    }

    const RU_MONTHS = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    function parseReviewDate(rawText, titleAttr) {
        let fullDate = '';
        let relDate = '';
        const text = (rawText || '').trim();
        const title = (titleAttr || '').trim();

        // 1. Проверяем title на точную дату (на FunPay в title часто лежит полный timestamp)
        const combined = `${title} ${text}`.trim();

        // Ищем явное относительное время
        const relMatch = combined.match(/(\d+\s*(?:год\w*|лет|мес\w*|недел\w*|дн\w*|день|дня|час\w*|мин\w*)\s*назад|вчера|сегодня|только\s+что)/i);
        if (relMatch) {
            relDate = relMatch[1].trim();
        }

        // Ищем полную текстовую дату: "17 сентября 2023 в 21:32" или "17 сен. 2023, 21:32"
        const fullMatch = combined.match(/(\d{1,2}\s+[а-яёa-z.]+(?:\s+\d{4})?(?:\s*г\.?)?(?:[,\s]+(?:в\s+|at\s+)?\d{1,2}:\d{2})?)/i);
        if (fullMatch) {
            fullDate = fullMatch[1].trim();
        }

        // Ищем цифровую дату: "17.09.2023 21:32"
        if (!fullDate) {
            const numMatch = combined.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:[,\s]+(\d{1,2}:\d{2}))?/);
            if (numMatch) {
                const day = parseInt(numMatch[1], 10);
                const mIdx = parseInt(numMatch[2], 10) - 1;
                const year = numMatch[3].length === 2 ? 2000 + parseInt(numMatch[3], 10) : parseInt(numMatch[3], 10);
                const time = numMatch[4] ? ' в ' + numMatch[4] : '';
                if (mIdx >= 0 && mIdx < 12) {
                    fullDate = `${day} ${RU_MONTHS[mIdx]} ${year}${time}`;
                    if (!relDate) {
                        const parsedMs = new Date(year, mIdx, day).getTime();
                        relDate = calcRelativeTime(parsedMs);
                    }
                }
            }
        }

        // Если есть полная дата с годом, но нет relDate — вычисляем relDate
        if (fullDate && !relDate) {
            const yMatch = fullDate.match(/(\d{4})/);
            const dMatch = fullDate.match(/^(\d{1,2})\s+([а-яё]+)/i);
            if (yMatch && dMatch) {
                const y = parseInt(yMatch[1], 10);
                const mName = dMatch[2].toLowerCase();
                const mIdx = RU_MONTHS.findIndex(m => mName.startsWith(m.slice(0, 3)));
                const d = parseInt(dMatch[1], 10);
                if (mIdx !== -1) {
                    const parsedMs = new Date(y, mIdx, d).getTime();
                    relDate = calcRelativeTime(parsedMs);
                }
            }
        }

        // Резервные значения
        if (!fullDate && text) {
            fullDate = text;
        }
        if (!fullDate) {
            const now = new Date();
            fullDate = `${now.getDate()} ${RU_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
        }
        if (!relDate) {
            relDate = 'недавно';
        }

        return { fullDate, relDate };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ ЭЛЕМЕНТА ОТЗЫВА
    // ─────────────────────────────────────────────────────────────────────────

    function extractReviewData(reviewEl) {
        if (!reviewEl) return null;

        // 1. Покупатель (никнейм)
        let buyerName = '';
        const nameLink = reviewEl.querySelector('.media-user-name a, .review-item-user a, .review-item-head a[href*="/users/"], a[href*="/users/"]');
        if (nameLink && nameLink.textContent) {
            buyerName = nameLink.textContent.trim().split(/\s+/)[0];
        }
        if (!buyerName) {
            const anyName = reviewEl.querySelector('.media-user-name, .user-name');
            if (anyName) buyerName = anyName.textContent.trim().split(/\s+/)[0];
        }
        if (!buyerName) buyerName = 'Покупатель';

        // 2. Аватарка
        let avatarUrl = '';
        const avatarImg = reviewEl.querySelector('.avatar-photo img, .avatar img, .media-user img, .media-user-name img, img[src*="avatar"]');
        if (avatarImg && avatarImg.src) {
            avatarUrl = avatarImg.src;
        } else {
            const bgEl = reviewEl.querySelector('.avatar-photo, .avatar, [style*="background-image"]');
            if (bgEl && bgEl.style.backgroundImage) {
                const m = bgEl.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                if (m) avatarUrl = m[1];
            }
        }
        if (avatarUrl && avatarUrl.startsWith('/')) {
            avatarUrl = 'https://funpay.com' + avatarUrl;
        }

        // 3. Номер заказа
        let orderId = '';
        const orderLink = reviewEl.querySelector('a[href*="/orders/"]');
        if (orderLink) {
            const m = (orderLink.getAttribute('href') || '').match(/\/orders\/([A-Z0-9]+)/i);
            if (m) orderId = m[1];
        }
        if (!orderId) {
            const textContent = reviewEl.textContent || '';
            const om = textContent.match(/(?:#|№|\b)([A-Z0-9]{8})\b/i);
            if (om) orderId = om[1];
        }
        if (!orderId && reviewEl.dataset.order) {
            orderId = reviewEl.dataset.order;
        }
        if (!orderId && /^\/orders\/([A-Z0-9]+)/i.test(window.location.pathname)) {
            const pm = window.location.pathname.match(/\/orders\/([A-Z0-9]+)/i);
            if (pm) orderId = pm[1];
        }
        if (!orderId) {
            orderId = 'FunPay';
        }

        // 4. Дата и относительное время
        const dateEl = reviewEl.querySelector('.review-item-date, .review-item-user .text-muted, .review-item-head .text-muted, .text-muted, [title*="20"]');
        let rawDate = '';
        let rawTitle = '';
        if (dateEl) {
            const clone = dateEl.cloneNode(true);
            clone.querySelectorAll('.fxn-review-screenshot-btn, .fxn-review-screenshot-cell').forEach(el => el.remove());
            rawDate = clone.textContent.trim();
            rawTitle = dateEl.getAttribute('title') || '';
        }
        const { fullDate, relDate } = parseReviewDate(rawDate, rawTitle);

        // 5. Товар / Игра и цена
        let lotAndPrice = '';
        const detailEl = reviewEl.querySelector('.review-item-detail, .review-item-lot, .review-lot-title, .order-desc-title');
        if (detailEl && detailEl.textContent) {
            lotAndPrice = detailEl.textContent.trim().replace(/\s+/g, ' ');
        }
        if (!lotAndPrice) {
            // Если на странице заказа (/orders/...)
            const gameTitle = document.querySelector('.param-list .param-item div.text-bold a, .param-list .param-item div.text-bold');
            const priceEl = document.querySelector('.order-header .text-bold, .param-item:has(h5:contains("Сумма")) div.text-bold');
            if (gameTitle) {
                lotAndPrice = gameTitle.textContent.trim();
                if (priceEl) lotAndPrice += ', ' + priceEl.textContent.trim();
            }
        }
        if (!lotAndPrice) {
            lotAndPrice = 'FunPay Заказ';
        }

        // 6. Рейтинг (звезды 1-5)
        let rating = 5;
        const ratingContainer = reviewEl.querySelector('.review-item-rating, .rating, [class*="rating"]') || reviewEl;
        const allRatingNodes = [ratingContainer, ...ratingContainer.querySelectorAll('*')];
        for (const node of allRatingNodes) {
            const cls = (node.className && typeof node.className === 'string') ? node.className : '';
            if (cls) {
                // FunPay классы: rating1..5, rating-1..5, stars1..5, stars-1..5
                const m = cls.match(/(?:^|\s)(?:rating|stars|star)[-_]?([1-5])(?:\s|$)/i);
                if (m) {
                    rating = parseInt(m[1], 10);
                    break;
                }
            }
            const dataVal = node.dataset?.rating || node.dataset?.stars || node.dataset?.value;
            if (dataVal && !isNaN(parseInt(dataVal, 10))) {
                const parsed = parseInt(dataVal, 10);
                if (parsed >= 1 && parsed <= 5) {
                    rating = parsed;
                    break;
                }
            }
            const title = node.getAttribute('title') || '';
            const tm = title.match(/([1-5])\s*(?:звезд|star)/i);
            if (tm) {
                rating = parseInt(tm[1], 10);
                break;
            }
        }
        if (!rating || rating < 1 || rating > 5) rating = 5;

        // 7. Текст отзыва
        let reviewText = '';
        const textEl = reviewEl.querySelector('.review-item-text, .review-text, blockquote');
        if (textEl) {
            reviewText = textEl.textContent.trim();
        }
        if (!reviewText) {
            reviewText = 'Отличный продавец, сделка прошла быстро и успешно!';
        }

        return {
            buyerName,
            avatarUrl,
            orderId,
            fullDate,
            relDate,
            lotAndPrice,
            rating,
            reviewText
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ОТРИСОВКА СКРИНШОТА НА CANVAS (1671 x 941)
    // ─────────────────────────────────────────────────────────────────────────

    function loadImageAsync(src) {
        return new Promise((resolve) => {
            if (!src) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async function fetchImageSafe(url) {
        if (!url) return null;
        try {
            const res = await new Promise((resolve) => {
                const ext = typeof browser !== 'undefined' ? browser : chrome;
                ext.runtime.sendMessage({ action: 'fxnFetchImageDataUrl', url }, resolve);
            });
            if (res && res.ok && res.dataUrl) {
                return await loadImageAsync(res.dataUrl);
            }
        } catch (_) {}
        return await loadImageAsync(url);
    }

    function drawVectorStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    function wrapCanvasText(ctx, text, maxWidth) {
        const paragraphs = text.split('\n');
        const lines = [];

        paragraphs.forEach(para => {
            const words = para.split(/\s+/).filter(Boolean);
            if (words.length === 0) {
                lines.push('');
                return;
            }
            let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
                const testLine = currentLine + ' ' + words[i];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);
        });

        return lines;
    }

    async function renderReviewScreenshotCanvas(data) {
        const canvas = document.createElement('canvas');
        canvas.width = TEMPLATE_WIDTH;
        canvas.height = TEMPLATE_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Рисуем чистый фоновый шаблон reviewtemplateclear.png
        if (!_cachedClearBg) {
            const ext = typeof browser !== 'undefined' ? browser : chrome;
            _cachedClearBg = await loadImageAsync(ext.runtime.getURL('icons/reviewtemplateclear.png'));
        }
        if (_cachedClearBg) {
            ctx.drawImage(_cachedClearBg, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
        } else {
            // Резервный белый фон
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
        }

        // 2. Аватарка покупателя (круг: центр 273, 269, диаметр 174, радиус 87)
        let avatarImg = null;
        if (data.avatarUrl) {
            avatarImg = await fetchImageSafe(data.avatarUrl);
        }
        if (!avatarImg) {
            if (!_cachedDefaultAvatar) {
                const ext = typeof browser !== 'undefined' ? browser : chrome;
                _cachedDefaultAvatar = await loadImageAsync(ext.runtime.getURL('icons/default_review_avatar.png'));
            }
            avatarImg = _cachedDefaultAvatar;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(273, 269, 87, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (avatarImg) {
            ctx.drawImage(avatarImg, 273 - 87, 269 - 87, 174, 174);
        } else {
            ctx.fillStyle = '#111111';
            ctx.fillRect(273 - 87, 269 - 87, 174, 174);
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 72px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((data.buyerName || 'F')[0].toUpperCase(), 273, 269);
        }
        ctx.restore();

        // 3. Никнейм покупателя
        ctx.fillStyle = '#0f0f10';
        ctx.font = '700 48px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(data.buyerName || 'Покупатель', 415, 215);

        // 4. Номер заказа
        const orderLabel = (data.orderId || '').startsWith('#') ? data.orderId : '#' + (data.orderId || 'FunPay');
        ctx.fillStyle = '#71717a';
        ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Заказ ' + orderLabel, 415, 268);

        // 5. Дата и относительное время (правый верхний угол, x=1535)
        ctx.textAlign = 'right';
        if (data.fullDate) {
            ctx.fillStyle = '#71717a';
            ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';
            ctx.fillText(data.fullDate, 1535, 208);
        }
        if (data.relDate) {
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '500 27px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';
            ctx.fillText(data.relDate, 1535, 252);
        }

        // 6. Игра / Лот и сумма заказа
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f0f10';
        ctx.font = '500 35px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';
        ctx.fillText(data.lotAndPrice || 'FunPay', 184, 405);

        // 7. Звезды рейтинга (центры: 205, 275, 345, 415, 485, cy = 464)
        const ratingVal = Math.min(5, Math.max(1, parseInt(data.rating, 10) || 5));
        for (let i = 0; i < 5; i++) {
            const starCx = 205 + i * 70;
            const starCy = 464;
            drawVectorStar(ctx, starCx, starCy, 5, 21, 9);
            ctx.fillStyle = (i < ratingVal) ? '#111111' : '#d4d4d8';
            ctx.fill();
        }

        // 8. Текст отзыва (начинается у кавычки: x=312, y=620)
        const maxWidth = 1220; // 1532 - 312
        let fontSize = 46;
        let lineHeight = 62;
        ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif`;

        let lines = wrapCanvasText(ctx, data.reviewText || '', maxWidth);

        // Динамическое масштабирование шрифта под длину текста
        if (lines.length > 3) {
            fontSize = lines.length > 5 ? 34 : 40;
            lineHeight = lines.length > 5 ? 46 : 54;
            ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif`;
            lines = wrapCanvasText(ctx, data.reviewText || '', maxWidth);
        }

        ctx.fillStyle = '#18181b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        const startY = 620;
        lines.forEach((line, idx) => {
            // Ограничиваем, чтобы не перекрывать нижний копирайт
            const y = startY + idx * lineHeight;
            if (y < 830) {
                ctx.fillText(line, 312, y);
            }
        });

        return canvas;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ПРОВЕРКА ПОДПИСКИ FOXEN PREMIUM
    // ─────────────────────────────────────────────────────────────────────────

    async function isFoxenPremiumUser() {
        if (typeof window.isFoxenPremiumUser === 'function') {
            return await window.isFoxenPremiumUser();
        }
        try {
            if (typeof fxnGetCachedProfile === 'function') {
                const p = await fxnGetCachedProfile();
                if (p) {
                    if (p.is_premium || p.has_premium) return true;
                    if (p.SUBSCRIPTION && p.SUBSCRIPTION !== 'free') return true;
                    if (p.subscription?.is_active) {
                        if (p.subscription.expires_at && new Date(p.subscription.expires_at).getTime() <= Date.now()) {
                            // Истекла
                        } else {
                            return true;
                        }
                    }
                }
            }
            const st = await (typeof browser !== 'undefined' ? browser : chrome).storage?.local?.get(['foxenUserProfileCache', 'foxen_user_profile', 'cached_profile', 'foxen_is_premium']);
            if (st) {
                if (st.foxen_is_premium) return true;
                const prof = st.foxenUserProfileCache?.data || st.foxen_user_profile || st.cached_profile;
                if (prof) {
                    if (prof.is_premium || prof.has_premium) return true;
                    if (prof.SUBSCRIPTION && prof.SUBSCRIPTION !== 'free') return true;
                    if (prof.subscription_status === 'active') return true;
                    const sub = prof.subscription;
                    if (sub && (sub.is_active || sub.is_lifetime || (sub.plan_id && sub.plan_id !== 'free'))) {
                        if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) {
                            return false;
                        }
                        return true;
                    }
                }
            }
        } catch (_) {}
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. МОДАЛЬНОЕ ОКНО ПРОСМОТРА И ЭКСПОРТА (APPLE GLASSMORPHISM)
    // ─────────────────────────────────────────────────────────────────────────

    async function openReviewScreenshotModal(initialData) {
        // Удаляем старое окно если открыто
        const oldModal = document.getElementById('fxn-review-screenshot-modal');
        if (oldModal) oldModal.remove();

        const isPremium = await isFoxenPremiumUser();
        let data = { ...initialData };

        const overlay = document.createElement('div');
        overlay.id = 'fxn-review-screenshot-modal';
        overlay.className = 'fxn-review-modal-scrim';

        overlay.innerHTML = `
            <div class="fxn-review-modal-card">
                <div class="fxn-review-modal-head">
                    <div class="fxn-review-modal-title-col">
                        <div class="fxn-review-modal-icon">
                            <span class="material-symbols-rounded">photo_camera</span>
                        </div>
                        <div>
                            <div class="fxn-review-modal-title">Скриншот отзыва</div>
                            <div class="fxn-review-modal-sub">${escapeHtml(data.buyerName)} — ${escapeHtml(data.orderId.startsWith('#') ? data.orderId : '#' + data.orderId)}</div>
                        </div>
                    </div>
                    <div class="fxn-review-modal-head-actions">
                        <button type="button" class="fxn-review-tool-btn fxn-toggle-edit-btn ${!isPremium ? 'fxn-btn-locked' : ''}" title="${isPremium ? 'Редактировать поля перед экспортом' : 'Редактирование доступно только с Foxen Premium'}">
                            <span class="material-symbols-rounded">${isPremium ? 'edit' : 'lock'}</span>
                            <span>Редактировать</span>
                            ${!isPremium ? '<span class="fxn-premium-badge">👑 PRO</span>' : ''}
                        </button>
                        <button type="button" class="fxn-review-close-btn" title="Закрыть (Esc)">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>

                <!-- Выдвижная панель ручного редактирования -->
                <div class="fxn-review-edit-panel" style="display:none;">
                    <div class="fxn-review-edit-grid">
                        <div>
                            <label class="fxn-review-edit-label">Покупатель</label>
                            <input type="text" class="fxn-review-edit-input" id="fxnEditBuyer" value="${escapeHtml(data.buyerName)}">
                        </div>
                        <div>
                            <label class="fxn-review-edit-label">Номер заказа</label>
                            <input type="text" class="fxn-review-edit-input" id="fxnEditOrder" value="${escapeHtml(data.orderId)}">
                        </div>
                        <div>
                            <label class="fxn-review-edit-label">Товар и цена</label>
                            <input type="text" class="fxn-review-edit-input" id="fxnEditLot" value="${escapeHtml(data.lotAndPrice)}">
                        </div>
                        <div>
                            <label class="fxn-review-edit-label">Дата</label>
                            <input type="text" class="fxn-review-edit-input" id="fxnEditDate" value="${escapeHtml(data.fullDate)}">
                        </div>
                        <div>
                            <label class="fxn-review-edit-label">Относительное время</label>
                            <input type="text" class="fxn-review-edit-input" id="fxnEditRelDate" value="${escapeHtml(data.relDate)}">
                        </div>
                        <div>
                            <label class="fxn-review-edit-label">Рейтинг (звёзды 1-5)</label>
                            <select class="fxn-review-edit-input" id="fxnEditRating">
                                <option value="5" ${data.rating === 5 ? 'selected' : ''}>★★★★★ (5 звёзд)</option>
                                <option value="4" ${data.rating === 4 ? 'selected' : ''}>★★★★☆ (4 звезды)</option>
                                <option value="3" ${data.rating === 3 ? 'selected' : ''}>★★★☆☆ (3 звезды)</option>
                                <option value="2" ${data.rating === 2 ? 'selected' : ''}>★★☆☆☆ (2 звезды)</option>
                                <option value="1" ${data.rating === 1 ? 'selected' : ''}>★☆☆☆☆ (1 звезда)</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top: 8px;">
                        <label class="fxn-review-edit-label">Текст отзыва</label>
                        <textarea class="fxn-review-edit-input fxn-review-edit-textarea" id="fxnEditText" rows="2">${escapeHtml(data.reviewText)}</textarea>
                    </div>
                </div>

                <div class="fxn-review-preview-wrap">
                    <div class="fxn-review-spinner-wrap">
                        <span class="material-symbols-rounded fxn-review-spin">progress_activity</span>
                        <span>Генерация изображения...</span>
                    </div>
                    <img class="fxn-review-preview-img" style="display:none;" alt="Скриншот отзыва">
                </div>

                <div class="fxn-review-modal-footer">
                    <div class="fxn-review-footer-hint">1671 × 941 px • Высокое качество PNG</div>
                    <div class="fxn-review-footer-buttons">
                        <button type="button" class="btn btn-secondary fxn-copy-review-img-btn">
                            <span class="material-symbols-rounded">content_copy</span>
                            <span>Скопировать картинку</span>
                        </button>
                        <button type="button" class="btn btn-primary fxn-download-review-img-btn">
                            <span class="material-symbols-rounded">download</span>
                            <span>Скачать PNG</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const previewImg = overlay.querySelector('.fxn-review-preview-img');
        const spinner = overlay.querySelector('.fxn-review-spinner-wrap');
        const copyBtn = overlay.querySelector('.fxn-copy-review-img-btn');
        const downloadBtn = overlay.querySelector('.fxn-download-review-img-btn');
        const toggleEditBtn = overlay.querySelector('.fxn-toggle-edit-btn');
        const editPanel = overlay.querySelector('.fxn-review-edit-panel');

        let currentCanvas = null;
        let currentBlob = null;
        let currentDataUrl = null;

        const hideSpinner = () => {
            spinner.classList.add('fxn-hidden');
            spinner.style.setProperty('display', 'none', 'important');
            previewImg.classList.remove('fxn-hidden');
            previewImg.style.setProperty('display', 'block', 'important');
        };

        const showSpinner = () => {
            spinner.classList.remove('fxn-hidden');
            spinner.style.setProperty('display', 'flex', 'important');
            previewImg.classList.add('fxn-hidden');
            previewImg.style.setProperty('display', 'none', 'important');
        };

        const updateImage = async () => {
            showSpinner();

            currentCanvas = await renderReviewScreenshotCanvas(data);
            if (!currentCanvas) {
                spinner.textContent = 'Ошибка рендера';
                return;
            }

            currentDataUrl = currentCanvas.toDataURL('image/png');
            previewImg.onload = () => {
                hideSpinner();
            };
            previewImg.onerror = () => {
                hideSpinner();
            };
            previewImg.src = currentDataUrl;
            if (previewImg.complete && previewImg.naturalWidth > 0) {
                hideSpinner();
            }

            currentCanvas.toBlob((blob) => {
                currentBlob = blob;
            }, 'image/png');
        };

        updateImage();

        // Переключение панели редактирования (только для Premium)
        toggleEditBtn.addEventListener('click', () => {
            if (!isPremium) {
                if (typeof showNotification === 'function') {
                    showNotification('👑 Редактирование скриншота доступно только с подпиской Foxen Premium', true);
                } else {
                    alert('Редактирование полей скриншота доступно только пользователям Foxen Premium.');
                }
                return;
            }
            const isVisible = editPanel.style.display !== 'none';
            editPanel.style.display = isVisible ? 'none' : 'block';
            toggleEditBtn.classList.toggle('active', !isVisible);
        });

        const footerHint = overlay.querySelector('.fxn-review-footer-hint');
        let editDebounceTimer = null;

        const scheduleUpdateImage = () => {
            if (editDebounceTimer) {
                clearTimeout(editDebounceTimer);
                editDebounceTimer = null;
            }
            if (footerHint) {
                footerHint.textContent = '⏳ Генерация через 3 сек (ожидание ввода)...';
            }
            editDebounceTimer = setTimeout(async () => {
                editDebounceTimer = null;
                await updateImage();
                if (footerHint) {
                    footerHint.textContent = '1671 × 941 px • Высокое качество PNG';
                }
            }, 3000);
        };

        const flushPendingUpdate = async () => {
            if (editDebounceTimer) {
                clearTimeout(editDebounceTimer);
                editDebounceTimer = null;
                await updateImage();
                if (footerHint) {
                    footerHint.textContent = '1671 × 941 px • Высокое качество PNG';
                }
            }
        };

        // Реактивное обновление при редактировании (с 3-секундной задержкой после каждого изменения)
        const bindInput = (id, prop) => {
            const el = overlay.querySelector('#' + id);
            if (!el) return;
            const handler = () => {
                data[prop] = id === 'fxnEditRating' ? parseInt(el.value, 10) : el.value;
                scheduleUpdateImage();
            };
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        };
        bindInput('fxnEditBuyer', 'buyerName');
        bindInput('fxnEditOrder', 'orderId');
        bindInput('fxnEditLot', 'lotAndPrice');
        bindInput('fxnEditDate', 'fullDate');
        bindInput('fxnEditRelDate', 'relDate');
        bindInput('fxnEditRating', 'rating');
        bindInput('fxnEditText', 'reviewText');

        // Копирование картинки в буфер обмена
        copyBtn.addEventListener('click', async () => {
            try {
                await flushPendingUpdate();
                if (!currentBlob && currentCanvas) {
                    currentBlob = await new Promise(r => currentCanvas.toBlob(r, 'image/png'));
                }
                if (currentBlob && typeof ClipboardItem !== 'undefined') {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': currentBlob })
                    ]);
                    const originalHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span class="material-symbols-rounded" style="color:#4ade80;">check</span><span style="color:#4ade80;">Скопировано!</span>';
                    if (typeof showNotification === 'function') {
                        showNotification('Картинка отзыва скопирована в буфер обмена!', false);
                    }
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHtml;
                    }, 2200);
                } else {
                    throw new Error('ClipboardItem недоступен');
                }
            } catch (err) {
                console.warn('Clipboard write image failed, fallback to download:', err);
                downloadImage();
            }
        });

        // Скачивание файла
        const downloadImage = async () => {
            await flushPendingUpdate();
            if (!currentDataUrl && currentCanvas) {
                currentDataUrl = currentCanvas.toDataURL('image/png');
            }
            if (!currentDataUrl) return;

            const safeBuyer = (data.buyerName || 'Buyer').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
            const safeOrder = (data.orderId || 'Order').replace(/[^a-zA-Z0-9_-]/g, '');
            const filename = `Foxen_Review_${safeBuyer}_${safeOrder}.png`;

            const a = document.createElement('a');
            a.href = currentDataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            if (typeof showNotification === 'function') {
                showNotification(`Скриншот сохранён: ${filename}`, false);
            }
        };

        downloadBtn.addEventListener('click', downloadImage);

        // Закрытие модального окна
        const closeModal = () => {
            overlay.remove();
        };

        overlay.querySelector('.fxn-review-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                window.removeEventListener('keydown', onKeyDown);
            }
        };
        window.addEventListener('keydown', onKeyDown);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. ПРОВЕРКА ВЛАДЕЛЬЦА ОТЗЫВА И ИНТЕГРАЦИЯ КНОПКИ В ОТЗЫВ (.review-item)
    // ─────────────────────────────────────────────────────────────────────────

    let _cachedCurrentUserInfo = null;
    try {
        const ext = typeof browser !== 'undefined' ? browser : chrome;
        ext.storage?.local?.get(['fpCurrentUserInfo'], res => {
            if (res?.fpCurrentUserInfo) {
                _cachedCurrentUserInfo = res.fpCurrentUserInfo;
            }
        });
    } catch (_) {}

    function getCurrentUserInfo() {
        let userId = _cachedCurrentUserInfo?.userId || null;
        let username = _cachedCurrentUserInfo?.username || '';

        try {
            const appDataRaw = document.body.getAttribute('data-app-data');
            if (appDataRaw) {
                const appData = JSON.parse(appDataRaw);
                if (appData.userId) userId = String(appData.userId);
                if (appData.userName || appData.username) username = String(appData.userName || appData.username);
            }
        } catch (_) {}

        if (!userId) {
            const userLink = document.querySelector('.user-link-dropdown[href*="/users/"], .navbar-right a[href*="/users/"], a.user-link[href*="/users/"]');
            if (userLink) {
                const m = (userLink.getAttribute('href') || '').match(/\/users\/(\d+)/);
                if (m) userId = m[1];
            }
        }

        if (!username) {
            const nameEl = document.querySelector('.user-link-name, .navbar-right .user-link-name, a.user-link-dropdown .user-link-name');
            if (nameEl) username = nameEl.textContent.trim();
        }

        return { userId, username };
    }

    function isReviewEligibleForScreenshot(reviewEl) {
        const { userId, username } = getCurrentUserInfo();

        // 1. Чужой профиль пользователя (/users/...)
        if (window.location.pathname.startsWith('/users/')) {
            const m = window.location.pathname.match(/\/users\/(\d+)/);
            if (m) {
                const profileUserId = m[1];
                if (userId && profileUserId !== userId) {
                    return false;
                }
            }
            // Кнопка чата с продавцом ("Написать") есть только на ЧУЖОМ профиле
            if (document.querySelector('a[href*="/chat/?node="], .user-profile a[href*="/chat/"]')) {
                return false;
            }
            // Кнопка жалобы на пользователя ("Пожаловаться") есть только на ЧУЖОМ профиле
            if (document.querySelector('a[href*="/report/"], .user-profile a[href*="/report/"]')) {
                return false;
            }
        }

        // 2. Страница лота / оформления заказа (/lots/offer, /lots/...)
        if (window.location.pathname.startsWith('/lots/') || document.querySelector('form[action$="/orders/new"], form[action*="/orders/"]')) {
            const sellerLink = document.querySelector('.chat-header .media-user-name a[href*="/users/"]') ||
                               document.querySelector('.lot-seller .media-user-name a[href*="/users/"]') ||
                               document.querySelector('.media.media-user a[href*="/users/"]') ||
                               document.querySelector('.param-item a[href*="/users/"]');
            if (sellerLink) {
                const sellerName = sellerLink.textContent.trim().split(/\s+/)[0];
                const sellerIdMatch = (sellerLink.getAttribute('href') || '').match(/\/users\/(\d+)/);
                const sellerId = sellerIdMatch ? sellerIdMatch[1] : '';

                if (userId && sellerId && String(userId) !== String(sellerId)) {
                    return false;
                }
                if (username && sellerName && username.toLowerCase() !== sellerName.toLowerCase()) {
                    return false;
                }
            }
            const chatNodeLink = document.querySelector('.chat-header-controls a[href*="node=users-"]');
            if (chatNodeLink) {
                const nodeMatch = (chatNodeLink.getAttribute('href') || '').match(/node=users-(\d+)-(\d+)/);
                if (nodeMatch) {
                    const sellerNodeId = nodeMatch[1];
                    if (userId && sellerNodeId && String(userId) !== String(sellerNodeId)) {
                        return false;
                    }
                }
            }
        }

        // 3. Страница заказа (/orders/...)
        if (window.location.pathname.startsWith('/orders/')) {
            const params = Array.from(document.querySelectorAll('.param-item'));
            const sellerParam = params.find(p => /продавец/i.test(p.querySelector('h5')?.textContent || ''));
            if (sellerParam) {
                const sellerLink = sellerParam.querySelector('a[href*="/users/"]');
                const sellerName = sellerLink ? sellerLink.textContent.trim().split(/\s+/)[0] : '';
                const sellerIdMatch = sellerLink ? (sellerLink.getAttribute('href') || '').match(/\/users\/(\d+)/) : null;
                const sellerId = sellerIdMatch ? sellerIdMatch[1] : '';

                if (userId && sellerId && userId !== sellerId) return false;
                if (username && sellerName && username.toLowerCase() !== sellerName.toLowerCase()) return false;
            }
        }

        // 3. Если отзыв оставлен САМИМ пользователем (он автор, а не получатель)
        if (reviewEl) {
            const authorLink = reviewEl.querySelector('.media-user-name a, .review-item-user a, a[href*="/users/"]');
            if (authorLink) {
                const authorName = authorLink.textContent.trim().split(/\s+/)[0];
                const authorIdMatch = (authorLink.getAttribute('href') || '').match(/\/users\/(\d+)/);
                const authorId = authorIdMatch ? authorIdMatch[1] : '';

                if (userId && authorId && userId === authorId) return false;
                if (username && authorName && username.toLowerCase() === authorName.toLowerCase()) return false;
            }
        }

        return true;
    }

    function attachScreenshotButtonToReview(reviewEl) {
        if (!reviewEl || reviewEl.querySelector('.fxn-review-screenshot-btn')) return;
        if (!isReviewEligibleForScreenshot(reviewEl)) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fxn-review-screenshot-btn';
        btn.title = 'Создать брендированный скриншот отзыва Foxen';
        btn.innerHTML = `
            <span class="material-symbols-rounded">photo_camera</span>
            <span>Скриншот</span>
        `;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const data = extractReviewData(reviewEl);
            if (!data) return;

            // Анимация нажатия
            btn.classList.add('loading');
            const icon = btn.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'progress_activity';

            setTimeout(async () => {
                await openReviewScreenshotModal(data);
                btn.classList.remove('loading');
                if (icon) icon.textContent = 'photo_camera';
            }, 50);
        });

        // 1. В FunPay стандартный блок автора и даты — .review-item-user
        // В FunPay: .review-item-user > div { display: inline-block; vertical-align: top; margin-right: 7px; margin-bottom: 3px; }
        const userBlock = reviewEl.querySelector('.review-item-user');
        if (userBlock) {
            const cell = document.createElement('div');
            cell.className = 'fxn-review-screenshot-cell';
            cell.appendChild(btn);
            userBlock.appendChild(cell);
            return;
        }

        // 2. В заголовок отзыва (.review-item-head) если есть
        const head = reviewEl.querySelector('.review-item-head');
        if (head) {
            head.appendChild(btn);
            return;
        }

        // 3. В блок даты
        const dateEl = reviewEl.querySelector('.review-item-date');
        if (dateEl && dateEl.parentElement) {
            dateEl.parentElement.insertBefore(btn, dateEl.nextSibling);
            return;
        }

        // 4. В блок рейтинга (.review-item-rating)
        const ratingEl = reviewEl.querySelector('.review-item-rating');
        if (ratingEl && ratingEl.parentElement) {
            ratingEl.parentElement.insertBefore(btn, ratingEl);
            return;
        }

        // 5. Fallback: в главный контейнер
        const main = reviewEl.querySelector('.review-item-main') || reviewEl;
        main.appendChild(btn);
    }

    function scanAndAttachButtons() {
        if (!isReviewEligibleForScreenshot()) return;

        const reviewSelectors = [
            '.review-item',
            '.review-list .review-item',
            '.reviews-list .review-item',
            '.order-review',
            '.feedback-item'
        ];
        const reviews = document.querySelectorAll(reviewSelectors.join(', '));
        reviews.forEach(attachScreenshotButtonToReview);
    }

    function injectReviewStyles() {
        if (document.getElementById('fxn-review-screenshot-styles')) return;
        const style = document.createElement('style');
        style.id = 'fxn-review-screenshot-styles';
        style.textContent = `
            /* Кнопка "Сделать скриншот" в карточке отзыва (вписывается в стиль FunPay) */
            .fxn-review-screenshot-cell {
                display: inline-block !important;
                vertical-align: top !important;
                margin-right: 7px !important;
                margin-bottom: 3px !important;
            }
            .fxn-review-screenshot-btn {
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
                padding: 1px 7px !important;
                height: 20px !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                border-radius: 4px !important;
                color: var(--fxn-text-muted, #94a3b8) !important;
                background: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.09) !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
                user-select: none !important;
                line-height: 1 !important;
                box-sizing: border-box !important;
                font-family: inherit !important;
                vertical-align: middle !important;
            }
            .fxn-review-screenshot-btn:hover {
                background: rgba(255, 255, 255, 0.12) !important;
                border-color: rgba(255, 255, 255, 0.22) !important;
                color: #ffffff !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
            }
            .fxn-review-screenshot-btn.loading {
                opacity: 0.6 !important;
                pointer-events: none !important;
            }
            .fxn-review-screenshot-btn .material-symbols-rounded {
                font-size: 13px !important;
                color: var(--fxn-text-muted, #94a3b8) !important;
                transition: color 0.15s ease !important;
                line-height: 1 !important;
            }
            .fxn-review-screenshot-btn:hover .material-symbols-rounded {
                color: #ffffff !important;
            }
            .fxn-review-screenshot-btn.loading .material-symbols-rounded {
                animation: fxnSpin 0.8s linear infinite !important;
            }

            /* Модальное окно скриншота отзыва */
            .fxn-review-modal-scrim {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.72) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 24px !important;
                box-sizing: border-box !important;
                animation: fxnFadeIn 0.2s ease forwards !important;
            }
            .fxn-review-modal-card {
                background: #121216 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 20px !important;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
                width: 100% !important;
                max-width: 960px !important;
                max-height: 94vh !important;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
                font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
                color: #f1f5f9 !important;
                animation: fxnPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            }
            .fxn-review-modal-head {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 16px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                background: rgba(255, 255, 255, 0.02) !important;
            }
            .fxn-review-modal-title-col {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
            }
            .fxn-review-modal-icon {
                width: 38px !important;
                height: 38px !important;
                border-radius: 10px !important;
                background: var(--fxn-accent-soft, rgba(192, 38, 211, 0.18)) !important;
                border: 1px solid var(--fxn-accent-border, rgba(192, 38, 211, 0.3)) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-review-modal-icon span {
                font-size: 20px !important;
            }
            .fxn-review-modal-title {
                font-size: 15px !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                letter-spacing: -0.2px !important;
            }
            .fxn-review-modal-sub {
                font-size: 12px !important;
                color: #94a3b8 !important;
                margin-top: 2px !important;
            }
            .fxn-review-modal-head-actions {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            .fxn-review-tool-btn {
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 6px 12px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                border-radius: 8px !important;
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #cbd5e1 !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
            }
            .fxn-review-tool-btn:hover,
            .fxn-review-tool-btn.active {
                background: rgba(255, 255, 255, 0.12) !important;
                border-color: rgba(255, 255, 255, 0.22) !important;
                color: #ffffff !important;
            }
            .fxn-review-tool-btn.active {
                border-color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-review-tool-btn.fxn-btn-locked {
                border-color: rgba(245, 158, 11, 0.35) !important;
                background: rgba(245, 158, 11, 0.08) !important;
            }
            .fxn-review-tool-btn.fxn-btn-locked:hover {
                background: rgba(245, 158, 11, 0.16) !important;
                border-color: rgba(245, 158, 11, 0.55) !important;
            }
            .fxn-premium-badge {
                font-size: 10px !important;
                font-weight: 700 !important;
                color: #f59e0b !important;
                background: rgba(245, 158, 11, 0.18) !important;
                border: 1px solid rgba(245, 158, 11, 0.3) !important;
                border-radius: 4px !important;
                padding: 1px 5px !important;
                margin-left: 4px !important;
                line-height: 1.2 !important;
                letter-spacing: 0.2px !important;
            }
            .fxn-review-tool-btn span {
                font-size: 15px !important;
            }
            .fxn-review-close-btn {
                background: transparent !important;
                border: none !important;
                color: #94a3b8 !important;
                cursor: pointer !important;
                padding: 6px !important;
                border-radius: 8px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: color 0.15s ease, background 0.15s ease !important;
            }
            .fxn-review-close-btn:hover {
                color: #ffffff !important;
                background: rgba(255, 255, 255, 0.1) !important;
            }
            .fxn-review-close-btn span {
                font-size: 20px !important;
            }

            /* Панель редактирования */
            .fxn-review-edit-panel {
                padding: 14px 20px !important;
                background: rgba(0, 0, 0, 0.3) !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            .fxn-review-edit-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
                gap: 10px !important;
            }
            .fxn-review-edit-label {
                display: block !important;
                font-size: 10.5px !important;
                font-weight: 700 !important;
                color: #94a3b8 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.4px !important;
                margin-bottom: 4px !important;
            }
            .fxn-review-edit-input {
                width: 100% !important;
                background: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                padding: 6px 10px !important;
                color: #ffffff !important;
                font-size: 12.5px !important;
                font-family: inherit !important;
                outline: none !important;
                box-sizing: border-box !important;
                transition: border-color 0.15s ease !important;
            }
            .fxn-review-edit-input:focus {
                border-color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-review-edit-textarea {
                resize: vertical !important;
                min-height: 48px !important;
            }

            /* Превью изображения */
            .fxn-review-preview-wrap {
                flex: 1 1 auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 20px !important;
                background: #09090b !important;
                overflow: auto !important;
                min-height: 340px !important;
                position: relative !important;
            }
            .fxn-review-spinner-wrap {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 10px !important;
                color: #94a3b8 !important;
                font-size: 13px !important;
                z-index: 5 !important;
                pointer-events: none !important;
            }
            .fxn-review-spinner-wrap.fxn-hidden {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            .fxn-review-preview-img.fxn-hidden {
                display: none !important;
            }
            .fxn-review-spin {
                animation: fxnSpin 0.9s linear infinite !important;
                font-size: 28px !important;
                color: var(--fxn-accent, #c026d3) !important;
            }
            .fxn-review-preview-img {
                max-width: 100% !important;
                max-height: 60vh !important;
                height: auto !important;
                border-radius: 12px !important;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
                object-fit: contain !important;
            }

            /* Подвал модального окна */
            .fxn-review-modal-footer {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 14px 20px !important;
                border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                background: rgba(255, 255, 255, 0.02) !important;
                flex-wrap: wrap !important;
                gap: 12px !important;
            }
            .fxn-review-footer-hint {
                font-size: 11.5px !important;
                color: #64748b !important;
            }
            .fxn-review-footer-buttons {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            .fxn-copy-review-img-btn,
            .fxn-download-review-img-btn {
                display: inline-flex !important;
                align-items: center !important;
                gap: 7px !important;
                padding: 8px 16px !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                border-radius: 9px !important;
                cursor: pointer !important;
                transition: all 0.18s ease !important;
                font-family: inherit !important;
                text-decoration: none !important;
            }
            .fxn-copy-review-img-btn {
                background: rgba(255, 255, 255, 0.07) !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
                color: #ffffff !important;
            }
            .fxn-copy-review-img-btn:hover {
                background: rgba(255, 255, 255, 0.14) !important;
                border-color: rgba(255, 255, 255, 0.25) !important;
                transform: translateY(-1px) !important;
            }
            .fxn-download-review-img-btn {
                background: var(--fxn-accent, #c026d3) !important;
                border: 1px solid transparent !important;
                color: #ffffff !important;
                box-shadow: 0 4px 14px var(--fxn-accent-soft, rgba(192, 38, 211, 0.35)) !important;
            }
            .fxn-download-review-img-btn:hover {
                filter: brightness(1.12) !important;
                box-shadow: 0 6px 18px var(--fxn-accent-soft, rgba(192, 38, 211, 0.5)) !important;
                transform: translateY(-1px) !important;
            }

            @keyframes fxnSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes fxnFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fxnPopIn {
                from { opacity: 0; transform: scale(0.96) translateY(8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. ИНИЦИАЛИЗАЦИЯ И НАБЛЮДЕНИЕ ЗА DOM
    // ─────────────────────────────────────────────────────────────────────────

    let _scanTimer = null;
    function scheduleScan() {
        if (_scanTimer) return;
        _scanTimer = setTimeout(() => {
            _scanTimer = null;
            scanAndAttachButtons();
        }, 150);
    }

    function init() {
        injectReviewStyles();
        scanAndAttachButtons();

        // Отслеживаем динамическую подгрузку отзывов (пагинация/AJAX)
        const root = document.getElementById('content') || document.body;
        if (!root) return;

        const observer = new MutationObserver((mutations) => {
            const hasReviews = mutations.some(m => {
                if (m.target && m.target.closest && m.target.closest('.review-item, .reviews-list, .review-list, .order-review')) {
                    return true;
                }
                return Array.from(m.addedNodes).some(n => n.nodeType === 1 && (
                    n.matches?.('.review-item, .order-review') ||
                    n.querySelector?.('.review-item, .order-review')
                ));
            });
            if (hasReviews) {
                scheduleScan();
            }
        });

        observer.observe(root, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
