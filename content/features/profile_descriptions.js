(function () {
  'use strict';

  const SERVER = 'https://foxen-profiles.sanosenpay.workers.dev';
  const SHARED_KEY = 'fptoolsdim';
  const VERIFY_NODE_ID = '2046';
  const VERIFY_TITLE = 'FPT Verify';
  const VERIFY_PRICE = '1000';
  const DESCRIPTION_MAX = 600;
  const MAX_LINES = 4;
  const ROOT = 'fxn-pd';
  const ROW = 'fxn-pd-row';
  const CARD = 'fxn-profile-card';
  const META = 'fxn-profile-meta';
  const IDENTITY = 'fxn-profile-identity';
  const TEXT = 'fxn-pd-text';
  const EDIT = 'fxn-pd-edit';
  const SESSION_KEY = 'fxnProfileSession';
  const CACHE_KEY = 'fxnProfileDescrCache';
  const CLIENT_CACHE_TTL = 60 * 60 * 1000;
  const PROFILE_RE = /^\/users\/(\d+)\/?$/;

  function getAppData() {
    try {
      const raw = document.body?.dataset?.appData || document.body?.getAttribute('data-app-data');
      if (!raw) return null;
      const d = JSON.parse(raw);
      return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  }
  function getCsrf() { return getAppData()?.['csrf-token'] || ''; }
  function getMyUserId() {
    const v = Number(getAppData()?.userId);
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  function profileIdFromUrl() {
    const m = location.pathname.match(PROFILE_RE);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function toast(msg, isError) {
    if (typeof showNotification === 'function') showNotification(msg, !!isError);
  }

  function waitFor(selector, timeout) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      let done = false;
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el && !done) { done = true; obs.disconnect(); resolve(el); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { if (!done) { done = true; obs.disconnect(); resolve(document.querySelector(selector)); } }, timeout || 10000);
    });
  }

  function withTimeout(promise, ms, fallback) {
    return Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise((res) => setTimeout(() => res(fallback), ms)),
    ]);
  }
  async function storageGet(keys) {
    try {
      const p = chrome.storage.local.get(keys);
      if (p && typeof p.then === 'function') return (await withTimeout(p, 2000, {})) || {};
      return await new Promise((res) => chrome.storage.local.get(keys, (r) => res(r || {})));
    } catch { return {}; }
  }
  async function storageSet(obj) {
    try {
      const p = chrome.storage.local.set(obj);
      if (p && typeof p.then === 'function') { await withTimeout(p, 2000, null); return; }
      await new Promise((res) => chrome.storage.local.set(obj, () => res()));
    } catch {}
  }
  function sessionKeyFor(id) { return SESSION_KEY + '_' + id; }
  async function loadSession(id) {
    const k = sessionKeyFor(id);
    const s = (await storageGet([k]))[k];
    if (s) return s;
    const legacy = (await storageGet([SESSION_KEY]))[SESSION_KEY];
    if (legacy && legacy.funpayUserId === id) return legacy;
    return null;
  }
  async function saveSession(s) { await storageSet({ [sessionKeyFor(s.funpayUserId)]: s }); }
  async function cacheRead(id) {
    const all = (await storageGet([CACHE_KEY]))[CACHE_KEY] || {};
    const e = all[id];
    if (e && Date.now() - e.t < CLIENT_CACHE_TTL && e.lastDescUpdate !== undefined) return e;
    return null;
  }
  async function cacheWrite(id, profile) {
    const all = (await storageGet([CACHE_KEY]))[CACHE_KEY] || {};
    all[id] = {
      description: profile && profile.description != null ? profile.description : null,
      bannerId: profile && profile.bannerId != null ? profile.bannerId : null,
      lastDescUpdate: profile && profile.lastDescUpdate || 0,
      lastBannerUpdate: profile && profile.lastBannerUpdate || 0,
      t: Date.now(),
    };
    const keys = Object.keys(all);
    if (keys.length > 300) {
      keys.sort((a, b) => all[a].t - all[b].t).slice(0, keys.length - 300).forEach((k) => delete all[k]);
    }
    await storageSet({ [CACHE_KEY]: all });
  }

  async function proxiedFetch(url, options = {}) {
    if (!url.startsWith(SERVER)) return fetch(url, options);
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fxnFetchProxy', url, options }, (res) => {
        if (!res || chrome.runtime.lastError) return reject(new Error('Proxy connection error'));
        if (res.error) return reject(new Error(res.error));
        resolve({
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          headers: new Headers(res.headers || {}),
          text: async () => res.text,
          json: async () => JSON.parse(res.text)
        });
      });
    });
  }

  async function serverGetProfile(id) {
    const r = await proxiedFetch(SERVER + '/funpay/users/' + id + '/profile', {
      method: 'GET', cache: 'no-store',
    });
    if (!r.ok) return { description: null, bannerId: null, lastDescUpdate: 0, lastBannerUpdate: 0 };
    const j = await r.json();
    return {
      description: j && j.description != null ? j.description : null,
      bannerId: j && j.bannerId != null ? j.bannerId : null,
      lastDescUpdate: j && j.lastDescUpdate || 0,
      lastBannerUpdate: j && j.lastBannerUpdate || 0,
    };
  }
  async function serverLinkStart(id) {
    const r = await proxiedFetch(SERVER + '/me/funpay/link/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY },
      body: JSON.stringify({ funpayUserId: id }),
    });
    if (!r.ok) throw new Error(await safeErr(r));
    return r.json();
  }
  async function serverSaveDescription(session, description) {
    const r = await proxiedFetch(SERVER + '/me/funpay/description', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY, Authorization: 'Bearer ' + session },
      body: JSON.stringify({ description }),
    });
    if (!r.ok) { const c = await safeErr(r); const e = new Error(c); e.httpStatus = r.status; throw e; }
    const j = await r.json();
    return {
      description: j && j.description != null ? j.description : null,
      lastDescUpdate: j && j.lastDescUpdate || 0,
    };
  }
  async function serverSaveBanner(session, bannerId) {
    const r = await proxiedFetch(SERVER + '/me/funpay/banner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY, Authorization: 'Bearer ' + session },
      body: JSON.stringify({ bannerId }),
    });
    if (!r.ok) { const c = await safeErr(r); const e = new Error(c); e.httpStatus = r.status; throw e; }
    const j = await r.json();
    return { lastBannerUpdate: j && j.lastBannerUpdate || 0 };
  }

  let _catalog = null;
  const CATALOG_CACHE_KEY = 'fxnBannersCatalogCache';
  const CATALOG_CACHE_TTL = 30 * 60 * 1000; // 30 минут

  /**
   * Загрузка свежего каталога баннеров с удаленного сервера
   */
  async function fetchServerCatalog() {
    // 1. Попытка загрузки актуального каталога с GitHub Raw
    const ghUrls = [
      'https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners-catalog.json',
      'https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/banners-catalog.json',
      'https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners.json'
    ];
    for (const url of ghUrls) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (data && Array.isArray(data.banners) && data.banners.length > 0) {
            _catalog = data;
            await storageSet({ [CATALOG_CACHE_KEY]: { catalog: data, t: Date.now() } });
            return _catalog;
          }
        }
      } catch (_) {}
    }

    // 2. Воркер в качестве резерва (при наличии развернутого эндпоинта)
    try {
      const r = await proxiedFetch(SERVER + '/banners/catalog', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'X-FPT-Key': SHARED_KEY }
      });
      if (r.ok) {
        const data = await r.json();
        if (data && Array.isArray(data.banners) && data.banners.length > 0) {
          _catalog = data;
          await storageSet({ [CATALOG_CACHE_KEY]: { catalog: data, t: Date.now() } });
          return _catalog;
        }
      }
    } catch (_) {}

    return null;
  }

  /**
   * Фоновое обновление каталога баннеров
   */
  function refreshCatalogBackground() {
    fetchServerCatalog().catch(() => {});
  }

  /**
   * Полный цикл получения каталога (Локальный кэш -> Сервер -> Резервный файл расширения)
   */
  async function loadCatalog() {
    if (_catalog && Array.isArray(_catalog.banners) && _catalog.banners.length > 0) return _catalog;

    // 1. Быстрое чтение из локального кэша для моментального отображения
    try {
      const cached = (await storageGet([CATALOG_CACHE_KEY]))[CATALOG_CACHE_KEY];
      if (cached && cached.catalog && Array.isArray(cached.catalog.banners) && cached.catalog.banners.length > 0) {
        _catalog = cached.catalog;
        if (Date.now() - (cached.t || 0) > CATALOG_CACHE_TTL) {
          refreshCatalogBackground();
        }
        return _catalog;
      }
    } catch (e) {}

    // 2. Запрос актуального каталога с бэкенда
    const fetched = await fetchServerCatalog();
    if (fetched) return fetched;

    // 3. Запасной вариант: локальный встроенный файл
    try {
      const u = chrome.runtime.getURL('content/banners-catalog.json');
      const r = await fetch(u);
      _catalog = await r.json();
      return _catalog;
    } catch (e) {
      console.error('[Foxen PD] Ошибка загрузки резервного каталога:', e);
      return { version: 1, categories: [], banners: [] };
    }
  }

  function getBannerUrl(bannerId) {
    if (!bannerId || !_catalog) return null;
    const b = _catalog.banners.find(x => x.id === bannerId);
    return b ? b.url : null;
  }

  async function safeErr(res) {
    try {
      const j = await res.json();
      if (j && j.error) {
        if (j.error.code === 'DESCRIPTION_SPAM' && j.error.message) {
          return 'DESCRIPTION_SPAM:' + j.error.message;
        }
        return j.error.code;
      }
      return 'HTTP_' + res.status;
    } catch { return 'HTTP_' + res.status; }
  }

  function collectForm(doc) {
    const out = {};
    doc.querySelectorAll('form input[name]').forEach((n) => {
      const t = (n.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') { if (n.checked) out[n.name] = n.value || 'on'; }
      else out[n.name] = n.value == null ? '' : n.value;
    });
    doc.querySelectorAll('form textarea[name]').forEach((n) => { out[n.name] = n.value == null ? '' : n.value; });
    doc.querySelectorAll('form select[name]').forEach((n) => {
      const opt = n.querySelector('option[selected]');
      let val = opt ? opt.value : (n.value == null ? '' : n.value);
      if (!val) {
        const first = Array.from(n.querySelectorAll('option')).find((o) => o.value.trim() !== '');
        if (first) val = first.value;
      }
      out[n.name] = val;
    });
    return out;
  }
  function pickOfferId(obj) {
    const cand = [obj && obj.id, obj && obj.offer_id, obj && obj.offerId];
    for (let i = 0; i < cand.length; i++) {
      const v = Number(cand[i]); if (Number.isFinite(v) && v > 0) return v;
    }
    if (obj && typeof obj.url === 'string') { const m = obj.url.match(/[?&]id=(\d+)/); if (m) return Number(m[1]); }
    return null;
  }
  async function findLotByCode(code) {
    try {
      const r = await fetch(location.origin + '/lots/' + VERIFY_NODE_ID + '/trade', { credentials: 'same-origin', headers: { accept: 'text/html' } });
      if (!r.ok) return null;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const ids = Array.from(doc.querySelectorAll('a.tc-item[data-offer]'))
        .filter((el) => { const t = el.querySelector('.tc-desc-text'); return (t ? t.textContent : '').includes(VERIFY_TITLE); })
        .map((el) => Number(el.getAttribute('data-offer')))
        .filter((n) => Number.isFinite(n) && n > 0);
      for (const id of ids.slice(0, 10)) {
        try {
          const a = await fetch(location.origin + '/lots/offer?id=' + id, { credentials: 'same-origin', headers: { accept: 'text/html' } });
          if (a.ok && (await a.text()).includes(code)) return id;
        } catch {}
      }
      if (ids.length === 1) return ids[0];
    } catch {}
    return null;
  }
  async function createVerificationLot(code) {
    const formRes = await fetch(location.origin + '/lots/offerEdit?node=' + VERIFY_NODE_ID, {
      credentials: 'same-origin', headers: { accept: 'text/html' },
    });
    if (!formRes.ok) throw new Error('FUNPAY_FORM_' + formRes.status);
    const doc = new DOMParser().parseFromString(await formRes.text(), 'text/html');
    const f = collectForm(doc);
    f.csrf_token = f.csrf_token || getCsrf();
    f.node_id = f.node_id || VERIFY_NODE_ID;
    f.offer_id = f.offer_id || '0';
    f.location = 'trade';
    if ('fields[summary][ru]' in f) f['fields[summary][ru]'] = VERIFY_TITLE + ' ' + code;
    if ('fields[summary][en]' in f) f['fields[summary][en]'] = VERIFY_TITLE + ' ' + code;
    f['fields[desc][ru]'] = code;
    f['fields[desc][en]'] = code;
    f.price = VERIFY_PRICE;
    f.active = 'on';
    if ('amount' in f) f.amount = f.amount || '1';
    const body = new URLSearchParams();
    for (const k in f) body.append(k, f[k] == null ? '' : f[k]);
    const saveRes = await fetch(location.origin + '/lots/offerSave', {
      method: 'POST', credentials: 'same-origin',
      headers: { accept: '*/*', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
      body,
    });
    if (!saveRes.ok) throw new Error('FUNPAY_SAVE_' + saveRes.status);
    const json = await saveRes.json().catch(() => ({}));
    console.log('[Foxen PD] offerSave response:', json);
    if (json && json.error) {
      const e = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      throw new Error('FUNPAY_SAVE_ERROR: ' + e);
    }
    const offerId = pickOfferId(json) || (await findLotByCode(code));
    if (!offerId) throw new Error('OFFER_ID_NOT_FOUND');
    return offerId;
  }
  async function deleteVerificationLot(offerId, csrfToken) {
    let token = csrfToken || getCsrf();
    
    async function attemptDelete(t) {
      if (!t) throw new Error('NO_CSRF_TOKEN');
      const body = new URLSearchParams();
      body.append('offer_id', String(offerId));
      body.append('node_id', VERIFY_NODE_ID);
      body.append('deleted', '1');
      body.append('csrf_token', t);
      const res = await fetch(location.origin + '/lots/offerSave', {
        method: 'POST', credentials: 'same-origin',
        headers: { accept: '*/*', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
        body,
      });
      if (!res.ok) throw new Error('FUNPAY_DELETE_' + res.status);
      const json = await res.json().catch(() => ({}));
      if (json && json.error) throw new Error(typeof json.error === 'string' ? json.error : JSON.stringify(json.error));
      return true;
    }

    try {
      await attemptDelete(token);
    } catch (e) {
      console.warn('[Foxen PD] Ошибка при удалении лота:', e.message, 'Пробуем получить свежий CSRF токен...');
      try {
        const pageRes = await fetch(location.origin + '/lots/offerEdit?node=' + VERIFY_NODE_ID);
        if (pageRes.ok) {
           const html = await pageRes.text();
           const doc = new DOMParser().parseFromString(html, 'text/html');
           const raw = doc.body?.getAttribute('data-app-data');
           if (raw) {
              const d = JSON.parse(raw);
              const freshToken = Array.isArray(d) ? d[0]['csrf-token'] : d['csrf-token'];
              if (freshToken) {
                 console.log('[Foxen PD] Свежий CSRF получен, пробуем удалить...');
                 await attemptDelete(freshToken);
                 return;
              }
           }
        }
      } catch (e2) {
        console.error('[Foxen PD] Ошибка получения свежего CSRF токена:', e2.message);
      }
      throw e;
    }
  };
  async function pollConfirm(id, offerId, maxMs) {
    const deadline = Date.now() + (maxMs || 90000);
    while (Date.now() < deadline) {
      const r = await proxiedFetch(SERVER + '/me/funpay/link/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY },
        body: JSON.stringify({ funpayUserId: id, offerId }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok && j.session) return j;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
    throw new Error('VERIFY_TIMEOUT');
  }

  async function runVerification(id) {
    const lastVerify = Number((await storageGet(['fxnLastVerifyAt']))['fxnLastVerifyAt'] || 0);
    if (lastVerify && Date.now() - lastVerify < 60 * 1000) {
      const e = new Error('VERIFY_COOLDOWN');
      e.retryInSec = Math.ceil((60 * 1000 - (Date.now() - lastVerify)) / 1000);
      throw e;
    }
    await storageSet({ fxnLastVerifyAt: Date.now() });

    const start = await serverLinkStart(id);
    let offerId = null;
    try {
      offerId = await createVerificationLot(start.code);
      console.log('[Foxen PD] lot created, offerId=', offerId, '- ждём проверку сервером…');
      const conf = await pollConfirm(id, offerId, 90000);
      console.log('[Foxen PD] confirmed by server');
      const session = { token: conf.session, funpayUserId: id, funpayUsername: conf.funpayUsername };
      await saveSession(session);
      return session;
    } finally {
      if (offerId !== null) {
        deleteVerificationLot(offerId).catch(e => console.error('[Foxen PD] Ошибка при удалении проверочного лота:', e));
      }
    }
  }

  function injectStyles() {
    if (document.getElementById('fxn-pd-styles')) return;
    const s = document.createElement('style');
    s.id = 'fxn-pd-styles';
    s.textContent =
      '.' + CARD + '{background:rgba(18,18,18,0.4);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:16px;overflow:hidden;margin-bottom:24px;box-shadow:0 12px 40px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.06);position:relative;}' +
      '.' + CARD + ' .profile.fxn-profile-body{padding:80px 28px 32px;text-align:center;background:transparent;position:relative;}' +
      '.' + CARD + ' .profile > h1.mb40{display:none !important;}' +
      '.' + IDENTITY + '{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;}' +
      '.fxn-profile-name{font-size:26px;font-weight:700;color:#fff;line-height:1.2;}' +
      '.fxn-profile-status{font-size:14px;font-weight:500;color:#888;line-height:1.2;}' +
      '.fxn-profile-status.fxn-online{color:#22c55e;}' +
      '.' + IDENTITY + ' .user-badges{margin:0;}' +
      '.fxn-profile-rating{display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:24px;cursor:pointer;position:relative;z-index:20;}' +
      '.fxn-stars-wrapper{position:relative;display:inline-flex;}' +
      '.fxn-stars-bg, .fxn-stars-fg{display:flex;gap:4px;}' +
      '.fxn-stars-bg{color:#d1d5db;}' +
      '.fxn-stars-fg{color:#fbbf24;position:absolute;top:0;left:0;overflow:hidden;width:var(--rating-pct);}' +
      '.fxn-stars-wrapper svg{width:22px;height:22px;flex-shrink:0;}' +
      '.fxn-profile-rating .fxn-count{color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;transition:color 0.2s;margin:0;}' +
      '.fxn-profile-rating:hover .fxn-count{color:#fff;}' +
      '.' + META + '{display:flex;justify-content:center;align-items:flex-start;gap:40px;flex-wrap:wrap;max-width:760px;margin:0 auto;text-align:center;}' +
      '.' + META + ' .profile-header-cols{display:block;flex:1 1 50%;min-width:200px;max-width:320px;text-align:center;}' +
      '.' + META + ' .param-item{margin:0;}' +
      '.' + META + ' .param-item h5,.fxn-profile-meta .' + ROOT + ' h5{margin:0 0 8px;text-transform:uppercase;font-size:11px;letter-spacing:.06em;color:#888;font-weight:600;}' +
      '.' + META + ' .param-item h5.text-bold{font-weight:600;}' +
      '.' + META + ' .param-item .text-nowrap,.fxn-profile-meta .' + ROOT + ' .' + TEXT + '{color:#fff;font-size:14px;line-height:1.5;}' +
      '.' + META + ' .param-item .text-nowrap{font-weight:400;}' +
      '.' + ROW + '{display:flex;align-items:flex-start;gap:40px;flex-wrap:wrap;}' +
      '.' + ROW + ' > .profile-header-cols{flex:0 0 auto;}' +
      '.' + ROOT + '{flex:1 1 50%;min-width:200px;max-width:320px;text-align:center;}' +
      '.' + ROOT + ' h5.fxn-pd-h{font-weight:600;}' +
      '.' + TEXT + '{white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + MAX_LINES + ';line-clamp:' + MAX_LINES + ';overflow:hidden;}' +
      '.' + EDIT + '{border:0;background:transparent;color:var(--fxn-pd-primary,#f59e0b);cursor:pointer;font-size:12px;font-weight:600;padding:0;margin-top:6px;}' +
      '.' + EDIT + ':hover{color:var(--fxn-pd-primary-hover,var(--fxn-pd-primary,#f59e0b));text-decoration:underline;}' +
      '.' + ROOT + ' textarea{width:100%;max-width:520px;box-sizing:border-box;resize:none;margin-top:4px;padding:6px 8px;border:1px solid rgba(127,127,127,.35);border-radius:4px;background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:1.45;}' +
      '.' + ROOT + ' .fxn-pd-actions{display:flex;gap:8px;align-items:center;max-width:520px;margin-top:8px;}' +
      '.' + ROOT + ' .fxn-pd-counter{margin-left:auto;font-size:11px;opacity:.6;}' +
      '.' + ROOT + ' .btn{min-width:90px;}' +
      '.fxn-pd-dots{display:inline-block;line-height:1;}' +
      '.fxn-pd-dots > span{display:inline-block;width:5px;height:5px;margin:0 2px;border-radius:50%;background:currentColor;opacity:.35;animation:fxn-pd-bounce 1.2s infinite ease-in-out;}' +
      '.fxn-pd-dots > span:nth-child(2){animation-delay:.15s;}' +
      '.fxn-pd-dots > span:nth-child(3){animation-delay:.3s;}' +
      '@keyframes fxn-pd-bounce{0%,80%,100%{opacity:.25;transform:translateY(0);}40%{opacity:.9;transform:translateY(-4px);}}' +
      '.' + CARD + ' .profile-cover.fxn-cover-host{position:relative !important;overflow:visible !important;min-height:350px !important;height:350px !important;border-radius:0 !important;background:#0d1321 !important;}' +
      '.' + CARD + ' .profile-cover{position:relative !important;overflow:visible !important;min-height:350px !important;height:350px !important;background:#0d1321 !important;}' +
      '.' + CARD + ' .profile-cover.fxn-cover-host .profile-cover-container{display:none !important;}' +
      '.' + CARD + ' .profile-cover:not(.fxn-cover-host) .profile-cover-container{position:absolute !important;inset:0 !important;height:350px !important;overflow:hidden !important;}' +
      '.' + CARD + ' .profile-cover:not(.fxn-cover-host) .profile-cover-img{height:350px !important;background-size:cover !important;background-position:center center !important;}' +
      '.' + CARD + ' .profile-cover-img.fxn-cover{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:350px !important;overflow:hidden !important;border-radius:0 !important;z-index:0 !important;}' +
      '.' + CARD + ' .fxn-cover-host,' + '.' + CARD + ' .fxn-cover-host .profile-cover-img,' + '.' + CARD + ' .profile-cover-img.fxn-cover,' + '.' + CARD + ' .profile-cover-img.fxn-cover .fxn-cover-pic,' + '.' + CARD + ' .profile-cover-img.fxn-cover .fxn-cover-gtop,' + '.' + CARD + ' .profile-cover-img.fxn-cover .fxn-cover-gbottom,' + '.' + CARD + ' .profile-cover-img.fxn-cover .fxn-cover-gdark{transform:none !important;filter:none !important;opacity:1 !important;}' +
      '.container.profile-header:not(.' + CARD + ') .fxn-cover-host{position:relative !important;overflow:hidden !important;min-height:350px !important;border-radius:0 0 40px 40px !important;background:#0d1321 !important;}' +
      '.container.profile-header:not(.' + CARD + ') .profile-cover-img.fxn-cover{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;overflow:hidden !important;border-radius:0 0 40px 40px !important;z-index:0 !important;}' +
      '.fxn-cover-pic{position:absolute !important;inset:0 !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;z-index:0 !important;}' +
      '.fxn-cover-gtop{position:absolute !important;inset:0 !important;background:linear-gradient(180deg,rgba(13,19,33,.15) 0%,transparent 25%,transparent 100%) !important;z-index:1 !important;pointer-events:none;}' +
      '.fxn-cover-gbottom{display:none !important;}' +
      '.fxn-cover-gdark{display:none !important;}' +
      '.' + CARD + ' .avatar{position:absolute !important;bottom:-25px !important;left:50% !important;transform:translate(-50%,50%) !important;margin:0 !important;z-index:10 !important;}' +
      '.' + CARD + ' .avatar-photo{border:1.5px solid rgba(255,255,255,0.15);box-shadow:0 8px 24px rgba(0,0,0,0.5);}' +
      '.container.profile-header:not(.' + CARD + ') .fxn-cover-host .avatar,.container.profile-header:not(.' + CARD + ') .profile-cover-img.fxn-cover .avatar{position:relative !important;z-index:10 !important;margin-top:60px !important;transform:none !important;}' +
      '.fxn-banner-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);opacity:0;transition:opacity .18s ease,background .18s ease;cursor:pointer;z-index:5;}' +
      '.profile-cover-img.fxn-cover:hover .fxn-banner-overlay{opacity:1;background:rgba(0,0,0,.45);}' +
      '.fxn-banner-pencil{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;}' +
      '.fxn-banner-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);transition:background .4s ease;}' +
      '.fxn-banner-modal.fxn-preview-mode{background:rgba(0,0,0,.12);}' +
      '.fxn-banner-box{background:#fff;color:#1a1a1a;width:min(620px,94vw);border-radius:14px;padding:30px 30px 26px;box-shadow:0 20px 60px rgba(0,0,0,.45);transition:transform .55s cubic-bezier(.22,1,.36,1),box-shadow .4s ease;will-change:transform;}' +
      '.fxn-preview-mode .fxn-banner-box{transform:translateY(24vh);box-shadow:0 28px 70px rgba(0,0,0,.5);}' +
      '.fxn-banner-box h5{margin:0 0 18px;font-size:20px;font-weight:700;color:#1a1a1a;}' +
      '.fxn-banner-input{width:100%;box-sizing:border-box;padding:14px 16px;border:1.5px solid #d5d7db;border-radius:9px;background:#fff;color:#1a1a1a;font-size:15px;outline:none;transition:border-color .15s ease;}' +
      '.fxn-banner-input:focus{border-color:var(--fxn-pd-primary,#f59e0b);}' +
      '.fxn-banner-input::placeholder{color:#9aa0a6;}' +
      '.fxn-banner-hint{font-size:13px;color:#6b7280;margin-top:14px;line-height:1.5;min-height:20px;}' +
      '.fxn-banner-hint.fxn-bad{color:#dc2626;}' +
      '.fxn-banner-help{margin-top:14px;padding:14px 16px;background:#f4f6f8;border-radius:10px;border:1px solid #e6e9ee;}' +
      '.fxn-help-title{font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;}' +
      '.fxn-help-step{font-size:12.5px;color:#4b5563;line-height:1.55;margin-bottom:4px;}' +
      '.fxn-help-note{font-size:12px;color:#9ca3af;line-height:1.5;margin-top:8px;}' +
      '.fxn-banner-help b{color:#111827;}' +
      '.fxn-banner-actions{display:flex;gap:10px;margin-top:28px;}' +
      '.fxn-banner-actions .btn{min-width:120px;padding:10px 18px;font-size:14px;}' +
      '.fxn-banner-actions .btn[disabled]{opacity:.6;cursor:default;}' +
      '.fxn-btn-dots{display:inline-block;}' +
      '.fxn-btn-dots > i{display:inline-block;width:5px;height:5px;margin:0 1.5px;border-radius:50%;background:currentColor;opacity:.4;animation:fxn-pd-bounce 1.2s infinite ease-in-out;}' +
      '.fxn-btn-dots > i:nth-child(2){animation-delay:.15s;}' +
      '.fxn-btn-dots > i:nth-child(3){animation-delay:.3s;}' +
      '.fxn-banner-vignette{position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0;transition:opacity .35s ease;box-shadow:inset 0 0 120px 30px rgba(0,0,0,.28);display:flex;align-items:flex-end;justify-content:center;}' +
      '.fxn-banner-vignette.show{opacity:1;}' +
      '.fxn-banner-vignette span{margin-bottom:26px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;padding:6px 12px;border-radius:20px;}';
    document.head.appendChild(s);
  }

  function applyPrimaryColor(el) {
    try {
      const probe = document.createElement('a');
      probe.className = 'btn btn-primary';
      probe.style.cssText = 'position:absolute;left:-9999px;visibility:hidden;';
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).backgroundColor;
      probe.remove();
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') el.style.setProperty('--fxn-pd-primary', c);
    } catch {}
  }

  function parseProfileStatus(h1, statusEl) {
    if (h1 && h1.classList.contains('online')) return { text: 'Онлайн', online: true };
    if (!statusEl) return { text: '', online: false };
    const raw = statusEl.textContent.replace(/\s+/g, ' ').trim();
    const paren = raw.match(/\(([^)]+)\)/);
    if (paren) return { text: paren[1].trim(), online: false };
    const first = raw.split(/\n/)[0].trim();
    if (/^онлайн$/i.test(first)) return { text: 'Онлайн', online: true };
    return { text: first, online: false };
  }

  function ensureProfileLayout(descRoot) {
    const card = document.querySelector('.container.profile-header');
    const profile = card && card.querySelector(':scope > .profile');
    if (!card || !profile) return null;

    card.classList.add(CARD);
    profile.classList.add('fxn-profile-body');

    if (!profile.querySelector('.' + IDENTITY)) {
      const h1 = profile.querySelector('h1.mb40');
      if (h1) {
        const identity = document.createElement('div');
        identity.className = IDENTITY;

        const nameSrc = h1.querySelector('.mr4') || h1.querySelector('a');
        if (nameSrc) {
          const name = document.createElement('span');
          name.className = 'fxn-profile-name';
          name.textContent = nameSrc.textContent.trim();
          identity.appendChild(name);
        }

        const badges = h1.querySelector('.user-badges');
        if (badges) identity.appendChild(badges.cloneNode(true));

        const statusEl = h1.querySelector('.media-user-status');
        const st = parseProfileStatus(h1, statusEl);
        if (st.text) {
          const status = document.createElement('span');
          status.className = 'fxn-profile-status' + (st.online ? ' fxn-online' : '');
          status.textContent = st.text;
          identity.appendChild(status);
        }

        profile.insertBefore(identity, h1);
      }
    }

    const identity = profile.querySelector('.' + IDENTITY);
    if (identity && !profile.querySelector('.fxn-profile-rating')) {
      const ratingCol = profile.querySelector('.profile-header-col-rating');
      if (ratingCol) {
        const txt = ratingCol.textContent;
        const scoreMatch = txt.match(/(\d+(?:\.\d+)?)\s*из\s*\d+/i) || txt.match(/(\d+(?:\.\d+)?)/);
        const score = scoreMatch ? scoreMatch[1] : '';
        const countMatch = txt.match(/(?:Всего\s+)?(\d+)\s*отзыв/i);
        const count = countMatch ? countMatch[1] : '';

        let numScore = parseFloat(score.replace(',', '.'));
        if (isNaN(numScore)) numScore = 0;
        let pct = (numScore / 5) * 100;
        if (pct > 100) pct = 100;

        if (score || count) {
          const rBlock = document.createElement('a');
          rBlock.href = '#reviews';
          rBlock.className = 'fxn-profile-rating';
          rBlock.style.textDecoration = 'none';
          rBlock.title = 'Нажмите, чтобы прочитать отзывы';
          
          const starSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>';
          const fiveStars = starSvg.repeat(5);

          rBlock.innerHTML = 
            '<div class="fxn-stars-wrapper" style="--rating-pct: ' + pct + '%;">' +
               '<div class="fxn-stars-bg">' + fiveStars + '</div>' +
               '<div class="fxn-stars-fg">' + fiveStars + '</div>' +
            '</div>' +
            '<span class="fxn-count">' + count + ' отзывов</span>';

          identity.after(rBlock);
          ratingCol.style.display = 'none';
        }
      }
    }

    let meta = profile.querySelector('.' + META);
    if (!meta) {
      meta = document.createElement('div');
      meta.className = META;
      const cols = profile.querySelector('.profile-header-cols');
      if (cols) {
        profile.insertBefore(meta, cols);
        meta.appendChild(cols);
      } else {
        profile.appendChild(meta);
      }
    }

    const cols = profile.querySelector('.profile-header-cols');
    if (cols && cols.parentElement !== meta) meta.appendChild(cols);

    const legacyRow = profile.querySelector('.' + ROW);
    if (legacyRow) {
      legacyRow.querySelectorAll('.profile-header-cols, .' + ROOT).forEach((el) => {
        if (el.parentElement !== meta) meta.appendChild(el);
      });
      legacyRow.remove();
    }

    if (descRoot && descRoot.parentElement !== meta) meta.appendChild(descRoot);
    return meta;
  }

  function buildRoot(anchor) {
    const root = document.createElement('div');
    root.className = 'param-item ' + ROOT;
    applyPrimaryColor(root);
    const meta = ensureProfileLayout(root);
    if (meta) return root;
    if (anchor.classList.contains('profile-header-cols') && anchor.parentElement) {
      const row = document.createElement('div');
      row.className = ROW;
      anchor.parentElement.insertBefore(row, anchor);
      row.appendChild(anchor);
      row.appendChild(root);
      return root;
    }
    anchor.after(root);
    return root;
  }

  function renderLoading(root) {
    root.innerHTML = '';
    const h = document.createElement('h5');
    h.className = 'fxn-pd-h';
    h.textContent = 'Описание';
    root.appendChild(h);
    const dots = document.createElement('div');
    dots.className = 'fxn-pd-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    root.appendChild(dots);
  }

  function renderView(root, state) {
    root.innerHTML = '';
    const h = document.createElement('h5');
    h.className = 'fxn-pd-h';
    h.style.display = 'flex';
    h.style.alignItems = 'center';
    h.style.justifyContent = 'center';
    h.style.gap = '8px';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Описание';
    h.appendChild(titleSpan);

    if (state.isOwn) {
      const editIcon = document.createElement('i');
      editIcon.className = 'fa fa-pen';
      editIcon.style.cursor = 'pointer';
      editIcon.style.color = 'rgba(255,255,255,0.6)';
      editIcon.style.fontSize = '11px';
      editIcon.style.transition = 'color 0.2s';
      editIcon.title = state.description ? 'Редактировать описание' : 'Добавить описание';
      editIcon.onmouseover = () => editIcon.style.color = '#fff';
      editIcon.onmouseout = () => editIcon.style.color = 'rgba(255,255,255,0.6)';
      editIcon.addEventListener('click', () => renderEditor(root, state));
      h.appendChild(editIcon);
    }
    
    root.appendChild(h);
    
    if (state.description) {
      const d = document.createElement('div');
      d.className = TEXT;
      d.textContent = state.description;
      root.appendChild(d);
    }
  }

  function renderEditor(root, state) {
    root.innerHTML = '';
    const h = document.createElement('h5');
    h.className = 'fxn-pd-h';
    h.textContent = 'Описание';
    root.appendChild(h);
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.maxLength = DESCRIPTION_MAX;
    ta.value = state.description || '';
    ta.placeholder = 'Расскажите о себе - это описание видят все пользователи расширения.';
    root.appendChild(ta);
    const actions = document.createElement('div');
    actions.className = 'fxn-pd-actions';
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'btn btn-primary'; save.textContent = 'Сохранить';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-gray'; cancel.textContent = 'Отмена';
    const counter = document.createElement('span');
    counter.className = 'fxn-pd-counter';
    const upd = () => { counter.textContent = ta.value.length + ' / ' + DESCRIPTION_MAX; };
    upd();
    ta.addEventListener('input', upd);
    actions.appendChild(save); actions.appendChild(cancel); actions.appendChild(counter);
    root.appendChild(actions);
    cancel.addEventListener('click', () => renderView(root, state));
    save.addEventListener('click', async () => {
      const text = ta.value;
      if (text === state.description) { renderView(root, state); return; }
      
      const now = Date.now();
      const lastUpdate = state.lastDescUpdate || 0;
      const timePassed = now - lastUpdate;
      const cooldownMs = 24 * 60 * 60 * 1000;
      if (timePassed < cooldownMs) {
        const remaining = cooldownMs - timePassed;
        const h = Math.floor(remaining / (60 * 60 * 1000));
        const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        toast(`Описание можно менять раз в 24 часа. Осталось: ${h} ч. ${m} мин.`, true);
        return;
      }

      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.zIndex = '10000';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.background = 'rgba(0,0,0,0.4)';
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s ease';
      
      modal.innerHTML = `
        <div style="background: rgba(20, 20, 20, 0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 16px; max-width: 340px; text-align: center; color: #fff; box-shadow: 0 16px 40px rgba(0,0,0,0.5); transform: translateY(10px); transition: transform 0.2s ease;">
          <h5 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px;">Сохранить описание?</h5>
          <p style="margin: 0 0 24px; font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5;">Вы уверены? После сохранения вам придётся подождать 24 часа перед внесением следующего изменения.</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button type="button" class="btn btn-primary fxn-confirm-yes" style="flex: 1; border-radius: 8px; font-weight: 500;">Сохранить</button>
            <button type="button" class="btn btn-gray fxn-confirm-no" style="flex: 1; border-radius: 8px; font-weight: 500; background: rgba(255,255,255,0.1); color: #fff; border: none;">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Animate in
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.firstElementChild.style.transform = 'translateY(0)';
      });

      const closeModal = () => {
        modal.style.opacity = '0';
        modal.firstElementChild.style.transform = 'translateY(10px)';
        setTimeout(() => modal.remove(), 200);
      };

      modal.querySelector('.fxn-confirm-no').addEventListener('click', closeModal);
      modal.querySelector('.fxn-confirm-yes').addEventListener('click', async () => {
        closeModal();
        save.disabled = true; cancel.disabled = true;
        try {
          let session = state.session || (await loadSession(state.funpayUserId));
          if (!session || session.funpayUserId !== state.funpayUserId) {
            console.log('[Foxen PD] no session, starting verification for', state.funpayUserId);
            toast('Подтверждаем владение аккаунтом…', false);
            session = await runVerification(state.funpayUserId);
            console.log('[Foxen PD] verification OK, got session');
          }
          let res;
          try { res = await serverSaveDescription(session.token, text); }
          catch (e) {
            if (e.httpStatus === 401) {
              console.log('[Foxen PD] session expired, re-verifying');
              session = await runVerification(state.funpayUserId);
              
              // Cloudflare KV might take a moment to propagate the new session
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  res = await serverSaveDescription(session.token, text);
                  break; // success
                } catch (e2) {
                  if (e2.httpStatus === 401 && attempt < 3) {
                    console.log('[Foxen PD] KV не синхронизировался, ждём 2сек...', attempt);
                    await new Promise(r => setTimeout(r, 2000));
                  } else {
                    throw e2;
                  }
                }
              }
            }
            else throw e;
          }
          console.log('[Foxen PD] saved:', res);
          const newDesc = res && res.description != null ? res.description : text;
          const newUpdate = res && res.lastDescUpdate || Date.now();
          const newState = Object.assign({}, state, { description: newDesc, session, lastDescUpdate: newUpdate });
          await cacheWrite(state.funpayUserId, { description: newDesc, bannerUrl: state.bannerUrl, lastDescUpdate: newUpdate });
          renderView(root, newState);
          toast('Описание сохранено', false);
        } catch (e) {
          console.error('[Foxen PD] save error:', e);
          toast(humanError(e && e.message), true);
          save.disabled = false; cancel.disabled = false;
        }
      });
    });
    ta.focus();
  }

  function humanError(code) {
    if (typeof code === 'string') {
      if (code.startsWith('DESCRIPTION_SPAM:')) return 'Модерация отклонила текст: ' + code.substring(17);
      if (code.includes('"NO_SESSION"')) return 'Ваша сессия FunPay истекла. Пожалуйста, обновите страницу (F5).';
    }
    switch (code) {
      case 'DESCRIPTION_SPAM': return 'Описание содержит запрещённые слова или контакты.';
      case 'VERIFY_TIMEOUT': return 'Проверка заняла слишком долго. Попробуйте ещё раз через минуту.';
      case 'VERIFY_COOLDOWN': return 'Подождите минуту перед повторной попыткой.';
      case 'WRITE_COOLDOWN': return 'Описание можно менять раз в 24 часа.';
      case 'BANNER_COOLDOWN': return 'Баннер можно менять раз в 15 минут.';
      case 'BANNER_URL_INVALID': return 'Ссылка должна начинаться с https://';
      case 'RATE_LIMITED': return 'Слишком много попыток. Подождите немного.';
      case 'BAD_KEY': return 'Ошибка доступа к серверу.';
      default:
        if (/^FUNPAY_SAVE_ERROR/.test(code)) return 'FunPay отклонил создание тестового лота: ' + code;
        return 'Не удалось сохранить (' + code + ')';
    }
  }

  function findCover() {
    let cover = document.querySelector('.profile-cover');
    if (!cover) {
      const header = document.querySelector('.profile-header-cols') || document.querySelector('.profile-header');
      if (header && header.parentNode) {
        cover = document.createElement('div');
        cover.className = 'profile-cover';
        header.parentNode.insertBefore(cover, header);
      }
    }
    return cover;
  }


  // Грузит картинку с прогрессом. onProgress(percentOrNull).
  // Долгий таймаут (90с) — большие гифки на слабом инете успеют.
  function preloadImage(url, onProgress) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok, reason) => { if (!done) { done = true; resolve({ ok, reason }); } };

      // Сначала пробуем XHR (даёт проценты загрузки)
      let gotXhr = false;
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.timeout = 160000;
        xhr.onprogress = (e) => {
          gotXhr = true;
          if (onProgress) {
            if (e.lengthComputable && e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100));
            else onProgress(null);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 400 && xhr.response && /^image\//.test(xhr.response.type || '')) {
            finish(true, null);
          } else if (xhr.status >= 200 && xhr.status < 400 && xhr.response) {
            // сервер не дал content-type image — проверим через <img>
            verifyViaImg();
          } else {
            verifyViaImg();
          }
        };
        xhr.onerror = () => { verifyViaImg(); };      // CORS/hotlink — падаем на <img>
        xhr.ontimeout = () => finish(false, 'timeout');
        xhr.send();
      } catch {
        verifyViaImg();
      }

      // Фолбэк: обычная <img> загрузка (работает даже при CORS-запрете на XHR)
      function verifyViaImg() {
        if (done) return;
        if (onProgress) onProgress(null);
        const img = new Image();
        img.onload = () => finish(true, null);
        img.onerror = () => finish(false, 'load');
        img.src = url;
        // запасной таймаут именно для img-пути
        setTimeout(() => finish(false, 'timeout'), 160000);
      }
    });
  }

  let bannerWatch = null;
  let activeBannerUrl = null;
  let editorMount = null;

  function reattachEditor() {
    if (!editorMount) return;
    const cover = findCover();
    if (!cover) return;
    const img = cover.querySelector(':scope > .profile-cover-img.fxn-cover');
    if (img && !img.querySelector('.fxn-banner-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'fxn-banner-overlay';
      overlay.innerHTML = '<span class="fxn-banner-pencil"><i class="fa fa-pen"></i></span>';
      img.appendChild(overlay);
      overlay.addEventListener('click', () => openBannerCatalog(cover, editorMount.profileId, editorMount.state));
    }
  }

  function buildCoverBanner(cover, url) {
    const avatar = cover.querySelector('.avatar');
    let img = cover.querySelector(':scope > .profile-cover-img.fxn-cover');
    if (!img) {
      Array.from(cover.querySelectorAll(':scope > .profile-cover-img, :scope > .profile-cover-container'))
        .forEach((el) => { if (!el.classList.contains('fxn-cover')) el.style.display = 'none'; });
      img = document.createElement('div');
      img.className = 'profile-cover-img fxn-cover';
      cover.insertBefore(img, cover.firstChild);
    }
    img.innerHTML = '';

    const pic = document.createElement('div');
    pic.className = 'fxn-cover-pic';
    if (url) pic.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';

    const gTop = document.createElement('div'); gTop.className = 'fxn-cover-gtop';
    const gBottom = document.createElement('div'); gBottom.className = 'fxn-cover-gbottom';
    const gDark = document.createElement('div'); gDark.className = 'fxn-cover-gdark';

    img.appendChild(pic);
    img.appendChild(gTop);
    img.appendChild(gBottom);
    img.appendChild(gDark);

    if (avatar && avatar.parentElement !== cover) cover.appendChild(avatar);
    cover.setAttribute('data-fxn-banner', url || '');
    cover.classList.add('fxn-cover-host');
    return { img, pic };
  }

  function guardBanner() {
    if (bannerWatch) return;
    bannerWatch = new MutationObserver(() => {
      if (!activeBannerUrl) return;
      const cover = findCover();
      if (!cover) return;
      const pic = cover.querySelector(':scope > .profile-cover-img.fxn-cover .fxn-cover-pic');
      if (!pic || cover.getAttribute('data-fxn-banner') !== activeBannerUrl) {
        buildCoverBanner(cover, activeBannerUrl);
        reattachEditor();
      }
    });
    bannerWatch.observe(document.body, { childList: true, subtree: true });
  }

  function applyBanner(url) {
    if (!url) return;
    activeBannerUrl = url;
    guardBanner();
    const cover = findCover();
    if (!cover) return;
    const pic = cover.querySelector(':scope > .profile-cover-img.fxn-cover .fxn-cover-pic');
    if (pic && cover.getAttribute('data-fxn-banner') === url) return;
    buildCoverBanner(cover, url);
    reattachEditor();
    console.log('[Foxen PD] banner applied');
  }

  function mountBannerEditor(profileId, session, currentBanner) {
    let state = { banner: currentBanner || null, session };
    editorMount = { profileId, state };
    
    const tryMount = () => {
      const cover = findCover();
      if (!cover) return;

      let img = cover.querySelector(':scope > .profile-cover-img.fxn-cover');
      if (!img) {
        const r = buildCoverBanner(cover, activeBannerUrl || '');
        img = r.img;
      }

      if (!img.querySelector('.fxn-banner-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'fxn-banner-overlay';
        overlay.innerHTML = '<span class="fxn-banner-pencil"><i class="fa fa-pen"></i></span>';
        img.appendChild(overlay);
        overlay.addEventListener('click', () => openBannerCatalog(cover, profileId, state));
        console.log('[Foxen PD] banner editor mounted');
      }
    };

    if (findCover()) tryMount();
    else {
      // Use observer to wait for cover
      const obs = new MutationObserver(() => {
        if (findCover()) { tryMount(); obs.disconnect(); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  async function openBannerCatalog(cover, profileId, state) {
    if (document.querySelector('.fxn-banner-catalog')) return;

    const catalog = await loadCatalog();

    const modal = document.createElement('div');
    modal.className = 'fxn-banner-catalog';
    modal.style.position = 'fixed';
    modal.style.bottom = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'flex-end';
    modal.style.alignItems = 'center';
    modal.style.pointerEvents = 'none'; // allow clicking through empty space
    modal.style.background = 'transparent';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.35s ease';

    let html = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,600&family=Inter:wght@400;500;600&display=swap');
        
        .fxn-banner-catalog {
          --black: #0a0a0b;
          --white: #ffffff;
          --ink-70: rgba(255,255,255,0.7);
          --ink-45: rgba(255,255,255,0.45);
          --glass-fill: rgba(255,255,255,0.06);
          --glass-fill-hover: rgba(255,255,255,0.10);
          --glass-border: rgba(255,255,255,0.14);
          --glass-border-strong: rgba(255,255,255,0.30);
          --radius-lg: 22px;
          --radius-md: 14px;
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--white);
        }
        .fxn-bottom-sheet {
          width: 100%; max-width: 1000px; height: 450px; max-height: 60vh;
          margin: 0 20px 20px 20px;
          background: linear-gradient(180deg, rgba(20,20,22,0.9), rgba(8,8,9,0.95));
          border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
          backdrop-filter: blur(28px) saturate(140%); -webkit-backdrop-filter: blur(28px) saturate(140%);
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15);
          display: flex; flex-direction: column; overflow: hidden;
          pointer-events: auto;
          animation: fxn-slide-up .5s cubic-bezier(.19,1,.22,1);
        }
        @keyframes fxn-slide-up { from{ opacity:0; transform: translateY(40px);} to{ opacity:1; transform:translateY(0);} }

        .fxn-sheet-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .fxn-sheet-header-left { display: flex; align-items: center; gap: 16px; }
        .fxn-sheet-header h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 20px; letter-spacing: -0.01em; margin: 0; color: #fff; }
        
        .fxn-sheet-actions { display: flex; align-items: center; gap: 12px; }
        .fxn-catalog-hint { font-size: 13px; color: #ff4d4d; margin-right: 8px; }
        .fxn-catalog-hint-info { color: var(--ink-70); }

        .fxn-btn-ghost {
          font-size: 13px; background: transparent; color: var(--ink-70);
          border: 1px solid var(--glass-border); padding: 8px 16px; border-radius: 100px; cursor: pointer;
          transition: all .2s ease;
        }
        .fxn-btn-ghost:hover { border-color: var(--glass-border-strong); color: var(--white); }
        .fxn-btn-primary {
          font-size: 13px; background: var(--white); color: var(--black); border: none;
          padding: 8px 20px; border-radius: 100px; cursor: pointer; font-weight: 500;
          transition: transform .2s ease, opacity .2s ease;
        }
        .fxn-btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .fxn-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .fxn-filters { display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto; padding: 16px 24px; flex-shrink: 0; scrollbar-width: none; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .fxn-filters::-webkit-scrollbar { display: none; }
        .fxn-chip {
          font-size: 13px; letter-spacing: 0.02em; padding: 6px 14px; border-radius: 100px;
          background: transparent; border: 1px solid var(--glass-border); color: var(--ink-70);
          cursor: pointer; transition: all .2s ease; white-space: nowrap;
        }
        .fxn-chip:hover { border-color: var(--glass-border-strong); color: var(--white); }
        .fxn-chip.active { background: var(--white); color: var(--black); border-color: var(--white); font-weight: 500; }

        .fxn-sheet-body { padding: 20px 24px; overflow-y: auto; flex-grow: 1; }
        .fxn-sheet-body::-webkit-scrollbar { width: 6px; }
        .fxn-sheet-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

        .fxn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .fxn-swatch {
          position: relative; aspect-ratio: 16 / 7; border-radius: 12px;
          border: 1.5px solid var(--glass-border); cursor: pointer; overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: card-in .4s cubic-bezier(.19,1,.22,1) forwards;
          transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
          background-color: #111;
        }
        .fxn-swatch:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -10px rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.5); }
        .fxn-swatch.selected { border-color: var(--white); box-shadow: 0 0 0 2px rgba(255,255,255,0.18); }
        @keyframes card-in { to{ opacity:1; transform:translateY(0);} }

        .fxn-swatch .check {
          position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%;
          background: var(--white); color: var(--black);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(0.6); transition: all .2s cubic-bezier(.34,1.56,.64,1);
        }
        .fxn-swatch.selected .check { opacity: 1; transform: scale(1); }
        .fxn-swatch .check svg { width: 10px; height: 10px; }

        .fxn-swatch .label {
          position: absolute; left: 8px; bottom: 6px; font-size: 11px; font-weight: 500;
          color: rgba(255,255,255,0.95); background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          padding: 4px 10px; border-radius: 100px; opacity: 0; transition: opacity .2s ease; pointer-events: none;
        }
        .fxn-swatch:hover .label, .fxn-swatch.selected .label { opacity: 1; }

      </style>
      <div class="fxn-bottom-sheet" role="dialog" aria-modal="true" aria-label="Выбор баннера профиля">
        <div class="fxn-sheet-header">
          <div class="fxn-sheet-header-left">
            <h1>Баннер профиля</h1>
          </div>
          <div class="fxn-sheet-actions">
            <span class="fxn-catalog-hint"></span>
            <button class="fxn-btn-ghost fxn-catalog-cancel">Отмена</button>
            <button class="fxn-btn-primary fxn-catalog-save" disabled>Сохранить баннер</button>
          </div>
        </div>

        <div class="fxn-filters">
          <button class="fxn-chip active fxn-cat-btn" data-cat="all">Все</button>
          ${catalog.categories.map(c => `<button class="fxn-chip fxn-cat-btn" data-cat="${c}">${c}</button>`).join('')}
          <button class="fxn-chip fxn-custom-banner-btn" style="border-color: rgba(168,85,247,0.6); color: #c084fc;">✨ Примерить свой файл/URL</button>
        </div>

        <div class="fxn-sheet-body">
          <div id="fxn-custom-banner-panel" style="display:none; padding:16px; background:rgba(255,255,255,0.04); border-radius:12px; margin-bottom:16px; border:1px dashed rgba(168,85,247,0.4);">
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <input type="file" id="fxn-custom-file-input" accept="image/png,image/jpeg,image/gif,video/mp4" style="display:none;">
              <button class="fxn-btn-ghost" id="fxn-pick-file-btn" style="border-color:#a855f7; color:#e9d5ff; padding:8px 16px;">📁 Загрузить файл с ПК</button>
              <span style="font-size:12px; color:rgba(255,255,255,0.4);">или</span>
              <input type="text" id="fxn-custom-url-input" placeholder="Вставьте прямую ссылку на .gif / .png / .jpg" class="fxn-banner-input" style="flex:1; min-width:220px; background:rgba(0,0,0,0.4); border-color:rgba(255,255,255,0.15); color:#fff; font-size:13px; padding:8px 14px; border-radius:8px;">
            </div>
            <div style="font-size:12.5px; color:#c084fc; margin-top:10px; display:flex; align-items:center; gap:6px;">
              <span>👁 <b>Интерактивная примерка:</b> выбранное изображение сразу подставляется в вашу шапку на странице.</span>
            </div>
          </div>

          <div class="fxn-grid">
            ${catalog.banners.map((b, i) => `
              <div class="fxn-swatch fxn-banner-item ${state.bannerId === b.id ? 'selected' : ''}" style="animation-delay: ${i*0.02}s;" data-id="${b.id}" data-cat="${b.category}" data-url="${b.url}" data-name="${b.title}">
                <div style="position: absolute; inset: 0; background-image: url('${b.url}'); background-size: cover; background-position: center; pointer-events: none;"></div>
                <span class="label">${b.title}</span>
                <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg></span>
              </div>
            `).join('')}
            ${catalog.banners.length === 0 ? '<div style="grid-column: 1 / -1; text-align: center; color: var(--ink-45); padding: 40px;">Каталог пуст</div>' : ''}
          </div>
        </div>
      </div>
    `;
    modal.innerHTML = html;
    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
    });

    const closeBtn = modal.querySelector('.fxn-catalog-close');
    const cancelBtn = modal.querySelector('.fxn-catalog-cancel');
    const saveBtn = modal.querySelector('.fxn-catalog-save');
    const hint = modal.querySelector('.fxn-catalog-hint');
    const catBtns = modal.querySelectorAll('.fxn-cat-btn');
    const items = modal.querySelectorAll('.fxn-banner-item');

    let selectedId = null;
    let selectedUrl = null;

    // Check cooldown on open
    const now = Date.now();
    const lastUpdate = state.lastBannerUpdate || 0;
    const cooldownMs = 30 * 60 * 1000;
    const timePassed = now - lastUpdate;
    let isOnCooldown = timePassed < cooldownMs;
    
    if (isOnCooldown) {
      const remaining = cooldownMs - timePassed;
      const m = Math.ceil(remaining / (60 * 1000));
      hint.textContent = `Баннер можно менять раз в 30 минут. Осталось: ${m} мин.`;
    }

    function getPic() {
      const cv = findCover();
      if (!cv) return null;
      let img = cv.querySelector(':scope > .profile-cover-img.fxn-cover');
      if (!img) { const r = buildCoverBanner(cv, getBannerUrl(state.bannerId) || ''); img = r.img; }
      return img.querySelector('.fxn-cover-pic');
    }

    function showPreview(url) {
      const pic = getPic();
      if (pic) {
        if (pic.getAttribute('data-prevbackup') == null) {
          pic.setAttribute('data-prevbackup', pic.style.backgroundImage || '');
        }
        pic.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      }
    }

    function clearPreview() {
      const cv = findCover();
      const pic = cv && cv.querySelector(':scope > .profile-cover-img.fxn-cover .fxn-cover-pic');
      if (pic && pic.getAttribute('data-prevbackup') != null) {
        pic.style.backgroundImage = pic.getAttribute('data-prevbackup');
        pic.removeAttribute('data-prevbackup');
      }
    }
    
    // Initialize preview
    clearPreview();

    function closeModal() {
      modal.style.opacity = '0';
      modal.children[0].style.transform = 'translateY(10px)';
      setTimeout(() => modal.remove(), 350);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Categories
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        if (customBtn) customBtn.classList.remove('active');
        if (customPanel) customPanel.style.display = 'none';
        btn.classList.add('active');
        
        const cat = btn.getAttribute('data-cat');
        items.forEach(item => {
          if (cat === 'all' || item.getAttribute('data-cat') === cat) item.style.display = 'block';
          else item.style.display = 'none';
        });
      });
    });

    const customBtn = modal.querySelector('.fxn-custom-banner-btn');
    const customPanel = modal.querySelector('#fxn-custom-banner-panel');
    const customFileInput = modal.querySelector('#fxn-custom-file-input');
    const pickFileBtn = modal.querySelector('#fxn-pick-file-btn');
    const customUrlInput = modal.querySelector('#fxn-custom-url-input');

    if (customBtn && customPanel) {
      customBtn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        customBtn.classList.add('active');
        items.forEach(item => item.style.display = 'none');
        customPanel.style.display = 'block';
      });
    }

    if (pickFileBtn && customFileInput) {
      pickFileBtn.addEventListener('click', () => customFileInput.click());
      customFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const blobUrl = URL.createObjectURL(file);
          showPreview(blobUrl);
          hint.innerHTML = '<span class="fxn-catalog-hint-info">👁 Примерка файла: ' + file.name + '</span>';
        }
      });
    }

    if (customUrlInput) {
      customUrlInput.addEventListener('input', () => {
        const val = customUrlInput.value.trim();
        if (val) {
          showPreview(val);
          hint.innerHTML = '<span class="fxn-catalog-hint-info">👁 Примерка ссылки</span>';
        }
      });
    }

    // Items
    items.forEach(item => {
      item.addEventListener('click', () => {
        const warning = document.querySelector('.fxn-warning-modal');
        if (warning) {
          warning.style.opacity = '0';
          warning.style.transform = 'translateY(10px)';
          setTimeout(() => warning.remove(), 300);
        }

        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedId = item.getAttribute('data-id');
        selectedUrl = item.getAttribute('data-url');
        saveBtn.disabled = isOnCooldown || selectedId === state.bannerId;
        showPreview(selectedUrl);
        hint.innerHTML = '<span class="fxn-catalog-hint-info">Выбрано: ' + item.getAttribute('data-name') + '</span>';
      });
    });

    saveBtn.addEventListener('click', async () => {
      if (!selectedId) return;

      if (document.querySelector('.fxn-warning-modal')) return;

      const warning = document.createElement('div');
      warning.className = 'fxn-warning-modal';
      warning.style.width = '100%';
      warning.style.maxWidth = '1000px';
      warning.style.height = '150px';
      warning.style.margin = '0 20px 10px 20px';
      warning.style.background = 'linear-gradient(180deg, rgba(20,20,22,0.95), rgba(8,8,9,0.98))';
      warning.style.border = '1px solid rgba(255,255,255,0.14)';
      warning.style.borderRadius = '22px';
      warning.style.backdropFilter = 'blur(28px) saturate(140%)';
      warning.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
      warning.style.display = 'flex';
      warning.style.flexDirection = 'column';
      warning.style.justifyContent = 'center';
      warning.style.alignItems = 'center';
      warning.style.color = '#fff';
      warning.style.pointerEvents = 'auto';
      warning.style.opacity = '0';
      warning.style.transform = 'translateY(10px)';
      warning.style.transition = 'all 0.3s ease';

      warning.innerHTML = `
        <div style="font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; margin-bottom: 8px;">Сохранить баннер?</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 16px;">Новый баннер будет виден всем посетителям вашего профиля.</div>
        <div style="display: flex; gap: 12px;">
          <button class="fxn-btn-ghost fxn-warn-cancel">Отмена</button>
          <button class="fxn-btn-primary fxn-warn-confirm">Да, сохранить</button>
        </div>
      `;

      modal.insertBefore(warning, modal.children[0]);

      requestAnimationFrame(() => {
        warning.style.opacity = '1';
        warning.style.transform = 'translateY(0)';
      });

      const wCancel = warning.querySelector('.fxn-warn-cancel');
      const wConfirm = warning.querySelector('.fxn-warn-confirm');

      wCancel.addEventListener('click', () => {
        warning.style.opacity = '0';
        warning.style.transform = 'translateY(10px)';
        setTimeout(() => warning.remove(), 300);
      });

      wConfirm.addEventListener('click', async () => {
        warning.style.opacity = '0';
        setTimeout(() => warning.remove(), 300);

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="fxn-btn-dots"><i></i><i></i><i></i></span>';
        
        try {
          let session = state.session || (await loadSession(profileId));
          if (!session || session.funpayUserId !== profileId) {
            hint.textContent = 'Подтверждаем аккаунт...';
            session = await runVerification(profileId);
            state.session = session;
          }
          hint.textContent = 'Сохраняем...';
          
          let res;
          try {
            res = await serverSaveBanner(session.token, selectedId);
          } catch (e) {
            if (e.httpStatus === 401) {
              console.log('[Foxen PD] Banner session expired, re-verifying...');
              hint.textContent = 'Подтверждаем владение аккаунтом...';
              session = await runVerification(profileId);
              state.session = session;
              
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  res = await serverSaveBanner(session.token, selectedId);
                  break;
                } catch (e2) {
                  if (e2.httpStatus === 401 && attempt < 3) {
                    await new Promise(r => setTimeout(r, 2000));
                  } else {
                    throw e2;
                  }
                }
              }
            } else {
              throw e;
            }
          }

          clearPreview();
          applyBanner(selectedUrl);
          state.bannerId = selectedId;
          state.lastBannerUpdate = res.lastBannerUpdate || Date.now();
          
          const cur = await cacheRead(profileId);
          await cacheWrite(profileId, Object.assign({}, cur, { bannerId: selectedId, lastBannerUpdate: state.lastBannerUpdate }));
          
          toast('Баннер успешно обновлён', false);
          closeModal();
        } catch (e) {
          console.error('[Foxen PD] banner save failed:', e);
          hint.textContent = humanError(e && e.message);
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Сохранить';
        }
      });
    });
  }

  let mounted = false;

  async function isProfileDisabled() {
    try {
      const data = await storageGet(['foxenDisabledFeatures']);
      const list = Array.isArray(data.foxenDisabledFeatures) ? data.foxenDisabledFeatures : [];
      return list.includes('profile_descriptions');
    } catch {
      return false;
    }
  }

  function unmount() {
    mounted = false;

    if (bannerWatch) {
      bannerWatch.disconnect();
      bannerWatch = null;
    }
    activeBannerUrl = null;
    editorMount = null;

    const cover = findCover();
    if (cover) {
      cover.classList.remove('fxn-cover-host');
      cover.removeAttribute('data-fxn-banner');

      const customCoverImg = cover.querySelector(':scope > .profile-cover-img.fxn-cover');
      if (customCoverImg) customCoverImg.remove();

      const overlay = cover.querySelector('.fxn-banner-overlay');
      if (overlay) overlay.remove();

      Array.from(cover.querySelectorAll(':scope > .profile-cover-img, :scope > .profile-cover-container'))
        .forEach((el) => {
          if (!el.classList.contains('fxn-cover')) el.style.display = '';
        });
    }

    document.querySelector('.fxn-banner-catalog')?.remove();
    document.querySelector('.fxn-banner-vignette')?.remove();
    document.querySelector('.fxn-banner-modal')?.remove();

    const card = document.querySelector('.container.profile-header');
    const profile = card && card.querySelector(':scope > .profile');

    if (card) {
      card.classList.remove(CARD);
    }

    if (profile) {
      profile.classList.remove('fxn-profile-body');

      const identity = profile.querySelector('.' + IDENTITY);
      if (identity) identity.remove();

      const rBlock = profile.querySelector('.fxn-profile-rating');
      if (rBlock) rBlock.remove();

      const ratingCol = profile.querySelector('.profile-header-col-rating');
      if (ratingCol) ratingCol.style.display = '';

      const meta = profile.querySelector('.' + META);
      if (meta) {
        const cols = meta.querySelector('.profile-header-cols');
        if (cols) profile.appendChild(cols);
        meta.remove();
      }

      const legacyRow = profile.querySelector('.' + ROW);
      if (legacyRow) legacyRow.remove();
    }

    const pdRoot = document.querySelector('.' + ROOT);
    if (pdRoot) pdRoot.remove();

    const styles = document.getElementById('fxn-pd-styles');
    if (styles) styles.remove();
  }

  async function mount() {
    const profileId = profileIdFromUrl();
    if (profileId === null) return;
    if (await isProfileDisabled()) {
      unmount();
      return;
    }
    if (mounted) return;
    if (document.querySelector('.' + ROOT)) {
      mounted = true;
      ensureProfileLayout(document.querySelector('.' + ROOT));
      return;
    }

    console.log('[Foxen PD] mount() start, waiting for anchor…');
    const anchor = (await waitFor('.profile-header-cols', 10000))
      || document.querySelector('.profile-header')
      || document.querySelector('.profile-data-container');
    console.log('[Foxen PD] anchor found:', !!anchor, anchor && anchor.className);
    if (!anchor) return;
    if (profileIdFromUrl() !== profileId) return;
    if (document.querySelector('.' + ROOT)) {
      mounted = true;
      ensureProfileLayout(document.querySelector('.' + ROOT));
      return;
    }

    injectStyles();
    mounted = true;
    const root = buildRoot(anchor);
    renderLoading(root);
    console.log('[Foxen PD] mounted, profileId=', profileId);

    const myId = getMyUserId();
    const isOwn = myId !== null && myId === profileId;
    console.log('[Foxen PD] myId=', myId, 'isOwn=', isOwn);

    // Preload catalog early
    await loadCatalog();

    let description = null;
    let bannerId = null;
    let lastDescUpdate = 0;
    let lastBannerUpdate = 0;
    const cached = await cacheRead(profileId);
    console.log('[Foxen PD] cache:', cached);
    if (cached) { 
      description = cached.description; 
      bannerId = cached.bannerId; 
      lastDescUpdate = cached.lastDescUpdate || 0;
      lastBannerUpdate = cached.lastBannerUpdate || 0;
    } else {
      console.log('[Foxen PD] fetching from server…');
      const prof = await withTimeout(serverGetProfile(profileId), 8000, { description: null, bannerId: null, lastDescUpdate: 0, lastBannerUpdate: 0 });
      description = prof.description;
      bannerId = prof.bannerId;
      lastDescUpdate = prof.lastDescUpdate || 0;
      lastBannerUpdate = prof.lastBannerUpdate || 0;
      console.log('[Foxen PD] server profile:', prof);
      await cacheWrite(profileId, prof);
    }

    const session = await loadSession(profileId);

    const bannerUrl = getBannerUrl(bannerId);

    if (bannerUrl) applyBanner(bannerUrl);
    if (isOwn) mountBannerEditor(profileId, session, bannerId);

    if (!description && !isOwn) {
      console.log('[Foxen PD] empty + not own → removing block');
      ensureProfileLayout(null);
      root.remove();
      return;
    }
    console.log('[Foxen PD] rendering view, isOwn=', isOwn);
    renderView(root, { funpayUserId: profileId, isOwn, description, bannerId, lastBannerUpdate, session, lastDescUpdate });
  }

  function checkNav(getLast, setLast) {
    if (location.pathname !== getLast()) { setLast(location.pathname); mounted = false; mount(); }
  }

  async function earlyBanner() {
    if (await isProfileDisabled()) return;
    const profileId = profileIdFromUrl();
    if (profileId === null) return;
    const cached = await cacheRead(profileId);
    if (cached && cached.bannerId) {
      await loadCatalog();
      const bannerUrl = getBannerUrl(cached.bannerId);
      if (!bannerUrl) return;
      if (await isProfileDisabled()) return;
      injectStyles();
      const tryApply = async (n) => {
        if (await isProfileDisabled()) { unmount(); return; }
        const cover = findCover();
        if (cover) {
          cover.classList.add('fxn-cover-host');
          applyBanner(bannerUrl);
          ensureProfileLayout(null);
          return;
        }
        if (n > 0) setTimeout(() => tryApply(n - 1), 40);
      };
      tryApply(120);
    }
  }

  function boot() {
    console.log('[Foxen PD] feature loaded, path=', location.pathname);
    earlyBanner();
    mount();
    let lastPath = location.pathname;
    const get = () => lastPath, set = (p) => { lastPath = p; };
    setInterval(() => checkNav(get, set), 700);
    document.addEventListener('click', () => setTimeout(() => checkNav(get, set), 300), true);

    const storageApi = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);
    if (storageApi && storageApi.onChanged) {
      storageApi.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.foxenDisabledFeatures) return;
        const disabled = Array.isArray(changes.foxenDisabledFeatures.newValue)
          ? changes.foxenDisabledFeatures.newValue : [];
        if (disabled.includes('profile_descriptions')) {
          unmount();
        } else {
          mounted = false;
          mount();
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
