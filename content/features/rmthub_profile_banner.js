(function initRMTHubProfileBanner() {
    'use strict';

    function injectStyles() {
        if (document.getElementById('fxn-rmthub-profile-css')) return;
        const s = document.createElement('style');
        s.id = 'fxn-rmthub-profile-css';
        s.textContent = `
            .fxn-rmth-banner {
                margin-top: 15px;
                margin-bottom: 15px;
                background: rgba(20, 20, 30, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                overflow: hidden;
                backdrop-filter: blur(8px);
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .fxn-rmth-banner:hover {
                border-color: rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            .fxn-rmth-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 12px 16px;
                background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
                color: #dddddd;
                font-weight: 600;
                font-size: 14px;
                border: none;
                outline: none;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
            }
            .fxn-rmth-btn:hover {
                background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
                color: #ffffff;
            }
            .fxn-rmth-content {
                display: none;
                padding: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
            .fxn-rmth-content.active {
                display: block;
                animation: fxn-rmth-fade 0.3s ease;
            }
            @keyframes fxn-rmth-fade {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Stats Grid */
            .fxn-rmth-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            .fxn-rmth-stat {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                transition: transform 0.2s;
            }
            .fxn-rmth-stat:hover {
                transform: translateY(-2px);
                background: rgba(255,255,255,0.06);
            }
            .fxn-rmth-sval { font-size: 18px; font-weight: 800; color: #E9A8FF; margin-bottom: 4px; line-height: 1.1; }
            .fxn-rmth-slbl { font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.5px; }
            
            /* Top Games */
            .fxn-rmth-glbl { font-size: 10px; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .fxn-rmth-grow { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; }
            .fxn-rmth-grow:last-child { border-bottom: none; }
            .fxn-rmth-gname { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
            .fxn-rmth-gpct { font-size: 11px; opacity: 0.4; margin: 0 8px; flex-shrink: 0; }
            .fxn-rmth-grev { font-size: 12px; font-weight: 700; color: #E9A8FF; flex-shrink: 0; }
            
            /* Loading state */
            .fxn-rmth-loading {
                display: inline-block;
                width: 14px; height: 14px;
                border: 2px solid rgba(233,168,255,0.3);
                border-top-color: #E9A8FF;
                border-radius: 50%;
                animation: fxn-rmth-spin 0.8s linear infinite;
            }
            @keyframes fxn-rmth-spin { to { transform: rotate(360deg); } }
            
            .fxn-rmth-error {
                text-align: center;
                padding: 10px;
                color: #ff5c5c;
                font-size: 12px;
                background: rgba(255,92,92,0.1);
                border-radius: 6px;
            }
        `;
        document.head.appendChild(s);
    }

    function buildBanner(username) {
        const container = document.createElement('div');
        container.className = 'fxn-rmth-banner';

        const btn = document.createElement('button');
        btn.className = 'fxn-rmth-btn';
        btn.innerHTML = `<span>📊</span> Статистика RMT Hub`;
        
        const content = document.createElement('div');
        content.className = 'fxn-rmth-content';
        
        container.appendChild(btn);
        container.appendChild(content);

        let loaded = false;
        let isExpanded = false;

        btn.addEventListener('click', async () => {
            if (loaded) {
                isExpanded = !isExpanded;
                content.classList.toggle('active', isExpanded);
                btn.innerHTML = isExpanded 
                    ? `<span>📊</span> Скрыть статистику RMT Hub`
                    : `<span>📊</span> Статистика RMT Hub`;
                return;
            }
            
            // Start loading
            btn.innerHTML = `<span class="fxn-rmth-loading"></span> Загрузка...`;
            content.classList.add('active');
            isExpanded = true;
            content.innerHTML = `<div style="text-align:center; padding:10px; opacity:0.5;">Получение данных с rmthub.ru...</div>`;
            
            try {
                const result = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'rmthubFetch', username }, resolve);
                });

                if (!result || !result.ok || result.notFound) {
                    btn.innerHTML = `<span>📊</span> Статистика RMT Hub`;
                    content.innerHTML = `<div class="fxn-rmth-error">Пользователь «${esc(username)}» не найден на RMT Hub.</div>`;
                    loaded = false;
                    return;
                }

                loaded = true;
                btn.innerHTML = `<span>📊</span> Скрыть статистику RMT Hub`;
                renderContent(content, result.data);
            } catch (err) {
                btn.innerHTML = `<span>📊</span> Статистика RMT Hub`;
                content.innerHTML = `<div class="fxn-rmth-error">Ошибка связи с RMT Hub.</div>`;
                loaded = false;
            }
        });

        return container;
    }

    function renderContent(container, data) {
        const st = data.stats || {};
        const total  = st.totalAmount       || 0;
        const reviews = st.totalReviews     || 0;
        const avg    = st.averagePerReview  || 0;
        const games  = st.gamesPlayed       || 0;
        const top3   = (st.byGameWithPercentage || [])
            .filter(g => g.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);
            
        let html = `
            <div class="fxn-rmth-grid">
                <div class="fxn-rmth-stat"><div class="fxn-rmth-sval">$${fmt(total)}</div><div class="fxn-rmth-slbl">Выручка</div></div>
                <div class="fxn-rmth-stat"><div class="fxn-rmth-sval">${fmt(reviews,0)}</div><div class="fxn-rmth-slbl">Отзывы</div></div>
                <div class="fxn-rmth-stat"><div class="fxn-rmth-sval">$${fmt(avg)}</div><div class="fxn-rmth-slbl">Ср. чек</div></div>
                <div class="fxn-rmth-stat"><div class="fxn-rmth-sval">${games}</div><div class="fxn-rmth-slbl">Игр</div></div>
            </div>
        `;
        
        if (top3.length) {
            html += `<div class="fxn-rmth-glbl">ТОП ИГРЫ</div>`;
            top3.forEach(g => {
                html += `<div class="fxn-rmth-grow"><span class="fxn-rmth-gname">${esc(g.game)}</span><span class="fxn-rmth-gpct">${g.percentage}%</span><span class="fxn-rmth-grev">$${fmt(g.amount)}</span></div>`;
            });
        }
        
        html += `<div style="text-align:center; margin-top:12px; font-size:10px; opacity:0.3;">Данные: rmthub.ru</div>`;
        container.innerHTML = html;
    }

    function esc(s) {
        return String(s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmt(n, d = 0) {
        return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function mount() {
        if (!window.location.pathname.includes('/users/')) return;
        if (document.querySelector('.fxn-rmth-banner')) return; 
        
        const nameEl = document.querySelector('.media-user-name, .profile-header h1, .profile-user-name');
        
        // Парсинг никнейма из заголовка страницы (Title)
        let username = document.title
            .replace(/ \/ FunPay$/i, '')
            .replace(/ - FunPay$/i, '')
            .replace(/^Пользователь\s+/i, '')
            .replace(/^User\s+/i, '')
            .trim();
        
        // Fallback
        if (!username || username === 'FunPay') {
            if (nameEl) username = nameEl.textContent.trim();
        }
        if (!username) return;

        // Ищем безопасное место для плашки (под никнеймом или в левой колонке)
        const anchor = nameEl ? (nameEl.closest('.media, .profile-header, .profile') || nameEl.parentElement) : null;
        if (!anchor) {
            setTimeout(mount, 500);
            return;
        }

        injectStyles();
        
        const banner = buildBanner(username);
        
        // Вставляем плашку аккуратно после блока с никнеймом/аватаркой
        if (anchor.nextSibling) {
            anchor.parentNode.insertBefore(banner, anchor.nextSibling);
        } else {
            anchor.parentNode.appendChild(banner);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
    setTimeout(mount, 1000); 
    setTimeout(mount, 3000); // Extended fallback for slow networks

    window.initRMTHubProfileBanner = mount;
})();
