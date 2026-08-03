// content/features/profile_raise_all.js
// Кнопка «Поднять все лоты» на своём профиле — клон кнопки «Выбрать», стоит перед ней.

(function () {
  'use strict';

  function getMyUserId() {
    try {
      const a = document.querySelector('.user-link a[href*="/users/"]') ||
                document.querySelector('.user-link-dropdown[href*="/users/"]') ||
                document.querySelector('a.menu-item[href*="/users/"]');
      if (a) { const m = a.getAttribute('href').match(/\/users\/(\d+)\//); if (m) return m[1]; }
    } catch {}
    const appData = document.body && document.body.dataset && document.body.dataset.appData;
    if (appData) { try { const j = JSON.parse(appData); if (j && j.userId) return String(j.userId); } catch {} }
    return null;
  }

  function profileIdFromUrl() {
    const m = location.pathname.match(/\/users\/(\d+)\//);
    return m ? m[1] : null;
  }

  let loggerPanel = null;

  function run(btn) {
    if (btn.getAttribute('data-busy') === '1') return;
    btn.setAttribute('data-busy', '1');
    const orig = btn.textContent;
    btn.textContent = 'Поднимаю…';
    btn.classList.add('disabled');

    if (!loggerPanel) {
        loggerPanel = document.createElement('div');
        loggerPanel.className = 'fxn-raise-logger';
        loggerPanel.style.cssText = 'margin: 16px 0 24px 0; padding: 12px; background: rgba(15, 15, 15, 0.5); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; font-size: 13px; color: #eee; max-height: 200px; overflow-y: auto; text-align: left; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); display: none; width: 100%; box-sizing: border-box; text-shadow: 0 1px 2px rgba(0,0,0,0.8); font-family: monospace; line-height: 1.5;';
        // Append after the parent wrapper if possible, or append to parent
        btn.parentElement.parentElement.insertBefore(loggerPanel, btn.parentElement.nextSibling);
    }
    
    loggerPanel.innerHTML = '<div style="color: #fbbf24; font-weight: 700; margin-bottom: 8px; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Старт автоподнятия...</div>';
    loggerPanel.style.display = 'block';

    const logListener = (request) => {
        if (request && request.action === 'logToAutoBumpConsole' && request.message) {
            const line = document.createElement('div');
            line.style.cssText = 'margin-bottom: 4px; word-break: break-word;';
            line.textContent = request.message.replace(/\[Foxen AutoBump\]\s*/i, '');
            loggerPanel.appendChild(line);
            loggerPanel.scrollTop = loggerPanel.scrollHeight;
        }
    };
    chrome.runtime.onMessage.addListener(logListener);

    chrome.runtime.sendMessage({ action: 'fxnRaiseAllNow' }, (res) => {
      chrome.runtime.onMessage.removeListener(logListener);
      btn.removeAttribute('data-busy');
      btn.classList.remove('disabled');
      btn.textContent = orig;
      
      const finishLine = document.createElement('div');
      finishLine.style.cssText = 'margin-top: 8px; color: #22c55e; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;';

      let msg;
      if (chrome.runtime.lastError) msg = 'Ошибка связи с расширением';
      else if (!res || !res.ok) msg = 'Не удалось: ' + ((res && res.error) || 'ошибка');
      else {
        const s = res.summary || {};
        msg = 'Поднято: ' + (s.raised || 0);
        if (s.skipped) msg += ', пропущено: ' + s.skipped;
        if (s.errors) msg += ', ошибок: ' + s.errors;
      }
      
      finishLine.textContent = msg;
      loggerPanel.appendChild(finishLine);
      loggerPanel.scrollTop = loggerPanel.scrollHeight;

      if (typeof showNotification === 'function') { try { showNotification(msg, false); } catch {} }
      
      // Auto-hide after 15 seconds
      setTimeout(() => { 
        if (loggerPanel && btn.getAttribute('data-busy') !== '1') {
            loggerPanel.style.display = 'none';
        }
      }, 15000);
    });
  }

  function tryMount() {
    const pid = profileIdFromUrl();
    if (!pid) return false;
    const myId = getMyUserId();
    if (!myId || myId !== pid) return true; // не свой профиль — больше не пытаться
    if (document.getElementById('fxn-raise-all-btn')) return true; // уже стоит

    // Ждём, пока появится кнопка «Выбрать» от lot_management — клонируем её стиль и место.
    const selectBtn = document.getElementById('foxen-select-lots-btn');
    if (!selectBtn) return false; // ещё не создана — попробуем позже
    if (!selectBtn.parentElement) return false;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'fxn-raise-all-btn';
    btn.className = selectBtn.className; // тот же вид
    btn.textContent = 'Поднять все лоты';
    btn.style.marginRight = '6px';
    btn.addEventListener('click', () => run(btn));

    // Вставляем ПЕРЕД «Выбрать», не трогая саму кнопку.
    selectBtn.parentElement.insertBefore(btn, selectBtn);
    return true;
  }

  function boot() {
    if (tryMount()) return;
    // ждём появления кнопки «Выбрать», максимум ~15 сек
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (tryMount() || tries > 60) clearInterval(iv);
    }, 250);
    // на смену страницы — перезапуск
    let last = location.pathname;
    setInterval(() => {
      if (location.pathname !== last) {
        last = location.pathname;
        let t = 0;
        const iv2 = setInterval(() => { t++; if (tryMount() || t > 60) clearInterval(iv2); }, 250);
      }
    }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
