// ============================================================================
//  Foxen — Динамическая загрузка закладок из GitHub index.json (16:9 Aspect Ratio)
// ----------------------------------------------------------------------------
//  При сохранении темы на сайте отправляется её id. Расширение запрашивает
//  актуальный манифест index.json с GitHub, находит прямые ссылки на preview/file
//  и рендерит правильное изображение без обрезки и мыла.
//  Включает гибкое сопоставление matchThemeId для устранения расхождений в префиксах.
// ============================================================================

(() => {
    'use strict';

    const GH_USER   = 'SanoSenpay';
    const GH_REPO   = 'FoxenThemes';
    const GH_BRANCH = 'main';
    const RAW_BASE  = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}/`;
    const INDEX_URL = RAW_BASE + 'index.json';

    let _bookmarkIndex = 0;
    let _githubCatalogCache = null;

    function matchThemeId(id1, id2) {
        if (!id1 || !id2) return false;
        if (id1 === id2) return true;
        const clean1 = String(id1).toLowerCase().replace(/^the_/i, '').replace(/[\s_-]+/g, '');
        const clean2 = String(id2).toLowerCase().replace(/^the_/i, '').replace(/[\s_-]+/g, '');
        return clean1 === clean2;
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'class') el.className = v;
            else if (k === 'style') el.style.cssText = v;
            else el.setAttribute(k, v);
        }
        (Array.isArray(children) ? children : [children]).forEach(c => {
            if (typeof c === 'string') el.appendChild(document.createTextNode(c));
            else if (c) el.appendChild(c);
        });
        return el;
    }

    function ensureStyles() {
        if (document.getElementById('fxn-theme-gallery-styles')) return;
        const css = `
        #fxn-theme-gallery { margin: 14px 0 14px; }
        #fxn-theme-gallery .fptg-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        #fxn-theme-gallery .fptg-title { font-size:15px; font-weight:600; display:flex; align-items:center; gap:6px; color:#fff; }
        #fxn-theme-gallery .fptg-counter { font-size:12px; opacity:.6; font-family: monospace; }
        #fxn-theme-gallery .fptg-card {
            position:relative; border-radius:12px; overflow:hidden;
            background:rgba(20,22,35,0.6); border:1px solid rgba(255,255,255,.08);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        #fxn-theme-gallery .fptg-preview-container {
            position:relative; width:100%; aspect-ratio:16/9; background:#000000;
            overflow:hidden; border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        #fxn-theme-gallery .fptg-preview {
            width:100%; height:100%; object-fit:cover; object-position:top; display:block;
        }
        #fxn-theme-gallery .fptg-arrow { 
            position:absolute; top:50%; transform:translateY(-50%);
            background:rgba(0,0,0,.75); border:1px solid rgba(255,255,255,.2); color:#fff; font-size:22px;
            width:34px; height:34px; border-radius:50%; cursor:pointer; z-index:5;
            display:flex; align-items:center; justify-content:center; line-height:1;
            transition: background 0.2s, transform 0.1s; user-select:none;
        }
        #fxn-theme-gallery .fptg-arrow:hover { background:rgba(0,0,0,.95); transform:translateY(-50%) scale(1.05); }
        #fxn-theme-gallery .fptg-arrow:active { transform:translateY(-50%) scale(0.95); }
        #fxn-theme-gallery .fptg-prev-btn { left:8px; }
        #fxn-theme-gallery .fptg-next-btn { right:8px; }
        #fxn-theme-gallery .fptg-meta { padding:14px; display:flex; flex-direction:column; gap:6px; }
        #fxn-theme-gallery .fptg-name { font-size:16px; font-weight:600; margin:0; color:#fff; }
        #fxn-theme-gallery .fptg-desc { font-size:13px; color:#b4b8cc; margin:0; line-height:1.4; }
        #fxn-theme-gallery .fptg-author { font-size:12px; color:#7a7e8f; margin-bottom:6px; }
        #fxn-theme-gallery .fptg-apply { 
            width:100%; display:flex; align-items:center; justify-content:center; gap:8px; 
            padding:10px; font-size:14px; font-weight:600; border-radius:8px; border:none; cursor:pointer;
            background: #ffffff; color:#000000; transition: opacity 0.2s, transform 0.1s;
        }
        #fxn-theme-gallery .fptg-apply:hover { opacity: 0.9; transform: translateY(-1px); }
        #fxn-theme-gallery .fptg-apply:active { transform: translateY(1px); }
        #fxn-theme-gallery .fptg-state { font-size:13px; opacity:.7; padding:20px; text-align:center; }
        `;
        const tag = document.createElement('style');
        tag.id = 'fxn-theme-gallery-styles';
        tag.textContent = css;
        document.head.appendChild(tag);
    }

    // Fetches index.json directly from GitHub to get absolute URLs for files & previews
    async function fetchGithubIndex() {
        if (_githubCatalogCache) return _githubCatalogCache;
        try {
            const resp = await fetch(INDEX_URL, { cache: 'no-store' });
            if (resp.ok) {
                const data = await resp.json();
                const list = Array.isArray(data) ? data : (Array.isArray(data.themes) ? data.themes : []);
                _githubCatalogCache = list.map(t => ({
                    id: t.id || t.name,
                    name: t.name || 'Без названия',
                    desc: t.desc || t.description || '',
                    author: t.author || 'SanoSenpay',
                    fileUrl: /^https?:\/\//i.test(t.file) ? t.file : RAW_BASE + String(t.file || '').replace(/^\/+/, ''),
                    previewUrl: /^https?:\/\//i.test(t.preview) ? t.preview : RAW_BASE + String(t.preview || '').replace(/^\/+/, '')
                }));
                return _githubCatalogCache;
            }
        } catch (e) {
            console.warn('Foxen theme gallery: failed to fetch GitHub index.json', e);
        }

        // Fallback map matching GitHub repo structure
        return [
            { id: 'endless_void', name: 'Endless Void', desc: 'Темная космическая тема с матовым фоном.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/Endless_Void.fptheme', previewUrl: RAW_BASE + 'previews/Endless_void_preview.png' },
            { id: 'smile_of_the_abyss', name: 'Smile of the Abyss', desc: 'Багрово-темная тема с бордовыми акцентами.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/Smile_of_the_Abyss.fptheme', previewUrl: RAW_BASE + 'previews/Smile_of_the_Abyss_preview.png' },
            { id: 'gravitys_embrace', name: 'Gravity’s Embrace', desc: 'Элегантный тёмный стиль с золотыми ссылками.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/Gravitys_Embrace.fptheme', previewUrl: RAW_BASE + 'previews/gravitys_embrace_preview.png' },
            { id: 'midnight_bloom', name: 'Midnight Bloom', desc: 'Яркая фиолетовая неоновая тема в стиле Cyberpunk.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/Midnight_Bloom.fptheme', previewUrl: RAW_BASE + 'previews/midnight_bloom_preview.png' },
            { id: 'silent_peak', name: 'Silent Peak', desc: 'Нежный закатный градиент с пастельно-розовыми деталями.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/Silent_Peak.fptheme', previewUrl: RAW_BASE + 'previews/silentpeakpreview.png' },
            { id: 'lone_lanterns_haven', name: 'The Lone Lantern’s Haven', desc: 'Глубокая ночная синева со стеклянным размытием.', author: 'SanoSenpay', fileUrl: RAW_BASE + 'themes/The_Lone_Lanterns_Haven.fptheme', previewUrl: RAW_BASE + 'previews/the_lone_lanterns_haven_preview.png' }
        ];
    }

    // Находит вкладку «Кастомизация» и вставляет блок перехода в Foxen Hub и карусель закладок
    function mountContainer() {
        if (document.getElementById('fxn-theme-gallery')) return true;
        
        const mountTarget = document.getElementById('foxen-theme-gallery-mount');
        const grid = document.querySelector('.theme-actions-grid');
        if (!mountTarget && !grid) return false;

        ensureStyles();
        const box = createElement('div', { id: 'fxn-theme-gallery' });
        box.innerHTML = `
            <div class="fptg-head">
                <div class="fptg-title"><span class="material-icons" style="font-size:18px;">storefront</span>Каталог тем и звуков</div>
            </div>
            <div class="fptg-card" style="padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 13px; color: #b4b8cc; margin-bottom: 12px; line-height: 1.45;">
                    Официальный веб-каталог <b>Foxen Hub</b> предлагает HD-просмотр скриншотов, прослушивание звуков и моментальное добавление новых тем.
                </div>
                <button id="btn-open-foxen-web-hub" class="fptg-apply" style="background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2);">
                    <span class="material-icons" style="font-size:18px; color: #ffffff;">open_in_new</span>
                    Открыть Foxen Hub
                </button>
            </div>

            <!-- Bookmarked Themes Selective Carousel -->
            <div class="fptg-head">
                <div class="fptg-title"><span class="material-icons" style="font-size:18px;">bookmark</span>Мои Закладки</div>
                <div class="fptg-counter" id="fptg-counter"></div>
            </div>
            <div id="fptg-body">
                <div class="fptg-state">Загружаю закладки...</div>
            </div>
        `;
        
        if (mountTarget) {
            mountTarget.appendChild(box);
        } else if (grid) {
            grid.parentNode.insertBefore(box, grid);
        }

        box.querySelector('#btn-open-foxen-web-hub')?.addEventListener('click', () => {
            window.open('https://web.foxen.site/catalog.html', '_blank');
        });

        renderBookmarksInExtension(box);

        return true;
    }

    async function renderBookmarksInExtension(box) {
        const api = typeof browser !== 'undefined' ? browser : chrome;
        const { foxenBookmarkedThemeIds = [] } = await api.storage.local.get('foxenBookmarkedThemeIds');

        const catalog = await fetchGithubIndex();
        const savedThemes = catalog.filter(item => 
            foxenBookmarkedThemeIds.some(bId => matchThemeId(item.id, bId))
        );

        const bodyEl = box.querySelector('#fptg-body');
        const counterEl = box.querySelector('#fptg-counter');
        if (!bodyEl) return;

        if (savedThemes.length === 0) {
            if (counterEl) counterEl.textContent = '';
            bodyEl.innerHTML = `
                <div class="fptg-state">
                    Закладок пока нет.<br>Нажимайте <b style="color:#fff;">🔖</b> у тем на <b style="color:#fff;">web.foxen.site</b>, чтобы добавить их сюда!
                </div>
            `;
            return;
        }

        if (_bookmarkIndex >= savedThemes.length) _bookmarkIndex = 0;
        if (_bookmarkIndex < 0) _bookmarkIndex = savedThemes.length - 1;

        if (counterEl) counterEl.textContent = `${_bookmarkIndex + 1} / ${savedThemes.length}`;

        const t = savedThemes[_bookmarkIndex];
        const hasMultiple = savedThemes.length > 1;

        bodyEl.innerHTML = `
            <div class="fptg-card">
                <div class="fptg-preview-container">
                    <img class="fptg-preview" src="${t.previewUrl}" alt="${escapeHtml(t.name)}" onerror="this.src='https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/previews/Endless_void_preview.png'">
                    ${hasMultiple ? `
                        <button class="fptg-arrow fptg-prev-btn" id="fptg-prev">‹</button>
                        <button class="fptg-arrow fptg-next-btn" id="fptg-next">›</button>
                    ` : ''}
                </div>
                <div class="fptg-meta">
                    <div class="fptg-name">${escapeHtml(t.name)}</div>
                    <div class="fptg-desc">${escapeHtml(t.desc)}</div>
                    <div class="fptg-author">Автор: ${escapeHtml(t.author)}</div>
                    <button class="fptg-apply" id="fptg-apply-btn" data-url="${t.fileUrl}">
                        <span class="material-icons" style="font-size:18px; color:#000;">check_circle</span>Применить тему
                    </button>
                </div>
            </div>
        `;

        if (hasMultiple) {
            bodyEl.querySelector('#fptg-prev')?.addEventListener('click', () => {
                _bookmarkIndex--;
                renderBookmarksInExtension(box);
            });
            bodyEl.querySelector('#fptg-next')?.addEventListener('click', () => {
                _bookmarkIndex++;
                renderBookmarksInExtension(box);
            });
        }

        bodyEl.querySelector('#fptg-apply-btn')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const fileUrl = btn.dataset.url;
            btn.innerHTML = `<span class="material-icons" style="font-size:18px; color:#000;">sync</span> Применяю...`;
            btn.disabled = true;

            try {
                const res = await fetch(fileUrl);
                if (res.ok) {
                    const themeObj = await res.json();
                    await api.storage.local.set({ foxenTheme: themeObj });
                    if (typeof applyCustomTheme === 'function') await applyCustomTheme();
                    if (typeof showNotification === 'function') showNotification(`Тема «${t.name}» успешно применена!`);
                }
            } catch (err) {
                console.error('Foxen: Failed to apply theme from GitHub fileUrl', err);
            } finally {
                btn.innerHTML = `<span class="material-icons" style="font-size:18px; color:#000;">check_circle</span>Применить тему`;
                btn.disabled = false;
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function init() {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (mountContainer() || attempts > 30) clearInterval(timer);
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
