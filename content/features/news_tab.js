// content/features/news_tab.js
// =============================================================================
// Вкладка «Новости & Чейнджлог» — загрузка, отображение постов и фильтрация.
// =============================================================================

(function () {
  'use strict';

  let _newsCache = null;

  function getStorageApi() {
    return (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null);
  }

  async function storageGet(keys) {
    try {
      const api = getStorageApi();
      if (!api) return {};
      const p = api.get(keys);
      if (p && typeof p.then === 'function') return await p;
      return await new Promise((res) => api.get(keys, (r) => res(r || {})));
    } catch { return {}; }
  }

  async function storageSet(obj) {
    try {
      const api = getStorageApi();
      if (!api) return;
      const p = api.set(obj);
      if (p && typeof p.then === 'function') { await p; return; }
      await new Promise((res) => api.set(obj, () => res()));
    } catch {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Simple Markdown-like formatter for post body
  function formatContent(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    
    // Headers ### Title
    html = html.replace(/^### (.*$)/gim, '<h4 class="fpt-news-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="fpt-news-h3">$1</h3>');
    
    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // List items - item
    html = html.replace(/^- (.*$)/gim, '<li class="fpt-news-li">$1</li>');
    html = html.replace(/(<li class="fpt-news-li">.*<\/li>\n?)+/g, '<ul class="fpt-news-ul">$&</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n(?![^<]*>)/g, '<br>');
    return html;
  }

  const REMOTE_GITHUB_NEWS_URL = 'https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/news.json';
  const REMOTE_WORKER_NEWS_URL = 'https://foxen-profiles.sanosenpay.workers.dev/news';

  async function fetchNews() {
    const urls = [
      REMOTE_GITHUB_NEWS_URL,
      REMOTE_WORKER_NEWS_URL
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.posts)) return data;
        }
      } catch (_) {}
    }

    // Reserve fallback to local extension file
    try {
      const getUrl = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL)
        ? browser.runtime.getURL
        : (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL : null);
      if (getUrl) {
        const localUrl = getUrl('content/news.json');
        const res = await fetch(localUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.posts)) return data;
        }
      }
    } catch (e) {
      console.warn('[FPT News] Local fetch error:', e);
    }
    return null;
  }

  async function loadNewsData(forceRefresh) {
    if (!forceRefresh && _newsCache) return _newsCache;

    // 1. Try local storage cache first for instant load
    const stored = await storageGet(['fptNewsCache']);
    if (!forceRefresh && stored.fptNewsCache && Array.isArray(stored.fptNewsCache.posts)) {
      _newsCache = stored.fptNewsCache;
      // Fetch fresh from GitHub in background
      fetchNews().then(fresh => {
        if (fresh && Array.isArray(fresh.posts)) {
          _newsCache = fresh;
          storageSet({ fptNewsCache: fresh });
          renderNewsList();
          checkUnreadNews();
        }
      }).catch(() => {});
      return _newsCache;
    }

    // 2. Fetch news from GitHub
    const data = await fetchNews();
    if (data && Array.isArray(data.posts)) {
      _newsCache = data;
      await storageSet({ fptNewsCache: data });
      return _newsCache;
    }

    return { version: 1, posts: [] };
  }

  function renderNewsCards(posts) {
    if (!posts || !posts.length) {
      return '<div class="fpt-news-empty">Новостей пока нет.</div>';
    }

    return posts.map(post => {
      const badgeStyle = post.badgeColor ? `background-color: ${post.badgeColor}22; color: ${post.badgeColor}; border: 1px solid ${post.badgeColor}44;` : '';
      const imageHtml = post.image ? `<div class="fpt-news-media"><img src="${escapeHtml(post.image)}" alt="News image" loading="lazy"></div>` : '';
      const linkHtml = (post.link && post.linkText) ? `
        <div class="fpt-news-footer">
          <a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" class="btn fpt-news-btn">
            <span>${escapeHtml(post.linkText)}</span>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span>
          </a>
        </div>` : '';

      return `
        <article class="fpt-news-card" data-id="${escapeHtml(post.id)}">
          <header class="fpt-news-card-header">
            <div class="fpt-news-meta">
              ${post.badge ? `<span class="fpt-news-badge" style="${badgeStyle}">${escapeHtml(post.badge)}</span>` : ''}
              <span class="fpt-news-date">${escapeHtml(post.date || '')}</span>
            </div>
            <h3 class="fpt-news-title">${escapeHtml(post.title || '')}</h3>
          </header>
          ${imageHtml}
          <div class="fpt-news-body">
            ${formatContent(post.content || post.summary || '')}
          </div>
          ${linkHtml}
        </article>
      `;
    }).join('');
  }

  async function renderNewsList() {
    const listEl = document.getElementById('fptNewsList');
    if (!listEl) return;

    const data = await loadNewsData();
    const allPosts = data.posts || [];

    listEl.innerHTML = renderNewsCards(allPosts);
  }

  async function checkUnreadNews() {
    const data = await loadNewsData();
    const posts = data.posts || [];
    if (!posts.length) return;

    const latestId = posts[0].id;
    const stored = await storageGet(['fptLastReadNewsId']);
    const unread = stored.fptLastReadNewsId !== latestId;

    document.querySelectorAll('.fpt-news-unread-badge').forEach(el => {
      el.style.display = unread ? 'inline-block' : 'none';
    });
  }

  async function markNewsRead() {
    const data = await loadNewsData();
    const posts = data.posts || [];
    if (posts.length && posts[0].id) {
      await storageSet({ fptLastReadNewsId: posts[0].id });
      document.querySelectorAll('.fpt-news-unread-badge').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  async function initializeNewsTab() {
    const refreshBtn = document.getElementById('fptNewsRefreshBtn');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = '1';
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('fpt-spin');
        await loadNewsData(true);
        await renderNewsList();
        setTimeout(() => refreshBtn.classList.remove('fpt-spin'), 600);
      });
    }

    await renderNewsList();
    await markNewsRead();
  }

  // Auto check unread badge on boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(checkUnreadNews, 1000));
  } else {
    setTimeout(checkUnreadNews, 1000);
  }

  if (typeof window !== 'undefined') {
    window.initializeNewsTab = initializeNewsTab;
    window.checkUnreadNews = checkUnreadNews;
  }
})();
