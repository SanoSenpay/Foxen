(function () {
  'use strict';

  const SERVER = 'https://fpt-descs.starobinskiy01.workers.dev';
  const SHARED_KEY = 'fptoolsdim';
  const VERIFY_NODE_ID = '2046';
  const VERIFY_TITLE = 'FPT Verify';
  const VERIFY_PRICE = '1000';
  const DESCRIPTION_MAX = 600;
  const MAX_LINES = 4;
  const ROOT = 'fpt-pd';
  const ROW = 'fpt-pd-row';
  const CARD = 'fpt-profile-card';
  const META = 'fpt-profile-meta';
  const IDENTITY = 'fpt-profile-identity';
  const TEXT = 'fpt-pd-text';
  const EDIT = 'fpt-pd-edit';
  const SESSION_KEY = 'fptProfileSession';
  const CACHE_KEY = 'fptProfileDescrCache';
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
    if (e && Date.now() - e.t < CLIENT_CACHE_TTL) return e;
    return null;
  }
  async function cacheWrite(id, profile) {
    const all = (await storageGet([CACHE_KEY]))[CACHE_KEY] || {};
    all[id] = {
      description: profile && profile.description != null ? profile.description : null,
      bannerUrl: profile && profile.bannerUrl != null ? profile.bannerUrl : null,
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
      chrome.runtime.sendMessage({ action: 'fptFetchProxy', url, options }, (res) => {
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
    if (!r.ok) return { description: null, bannerUrl: null };
    const j = await r.json();
    return {
      description: j && j.description != null ? j.description : null,
      bannerUrl: j && j.bannerUrl != null ? j.bannerUrl : null,
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
    return r.json();
  }
  async function serverSaveBanner(session, bannerUrl) {
    const r = await proxiedFetch(SERVER + '/me/funpay/banner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY, Authorization: 'Bearer ' + session },
      body: JSON.stringify({ bannerUrl }),
    });
    if (!r.ok) { const c = await safeErr(r); const e = new Error(c); e.httpStatus = r.status; throw e; }
    return r.json();
  }
  async function safeErr(res) {
    try { const j = await res.json(); return (j && j.error && j.error.code) || ('HTTP_' + res.status); }
    catch { return 'HTTP_' + res.status; }
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
    console.log('[FPT PD] offerSave response:', json);
    if (json && json.error) {
      const e = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      throw new Error('FUNPAY_SAVE_ERROR: ' + e);
    }
    const offerId = pickOfferId(json) || (await findLotByCode(code));
    if (!offerId) throw new Error('OFFER_ID_NOT_FOUND');
    return offerId;
  }
  async function deleteVerificationLot(offerId) {
    const body = new URLSearchParams();
    body.append('offer_id', String(offerId));
    body.append('deleted', '1');
    body.append('csrf_token', getCsrf());
    const res = await fetch(location.origin + '/lots/offerSave', {
      method: 'POST', credentials: 'same-origin',
      headers: { accept: '*/*', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
      body,
    });
    if (!res.ok) throw new Error('FUNPAY_DELETE_' + res.status);
    const json = await res.json().catch(() => ({}));
    if (json && json.error) {
      const e = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      throw new Error('FUNPAY_DELETE_ERROR: ' + e);
    }
  }
  async function pollConfirm(id, maxMs) {
    const deadline = Date.now() + (maxMs || 90000);
    while (Date.now() < deadline) {
      const r = await proxiedFetch(SERVER + '/me/funpay/link/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FPT-Key': SHARED_KEY },
        body: JSON.stringify({ funpayUserId: id }),
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
    const lastVerify = Number((await storageGet(['fptLastVerifyAt']))['fptLastVerifyAt'] || 0);
    if (lastVerify && Date.now() - lastVerify < 60 * 1000) {
      const e = new Error('VERIFY_COOLDOWN');
      e.retryInSec = Math.ceil((60 * 1000 - (Date.now() - lastVerify)) / 1000);
      throw e;
    }
    await storageSet({ fptLastVerifyAt: Date.now() });

    const start = await serverLinkStart(id);
    let offerId = null;
    try {
      offerId = await createVerificationLot(start.code);
      console.log('[FPT PD] lot created, offerId=', offerId, '- ждём проверку сервером…');
      const conf = await pollConfirm(id, 90000);
      console.log('[FPT PD] confirmed by server');
      const session = { token: conf.session, funpayUserId: id, funpayUsername: conf.funpayUsername };
      await saveSession(session);
      return session;
    } finally {
      if (offerId !== null) deleteVerificationLot(offerId).catch(() => {});
    }
  }

  function injectStyles() {
    if (document.getElementById('fpt-pd-styles')) return;
    const s = document.createElement('style');
    s.id = 'fpt-pd-styles';
    s.textContent =
      '.' + CARD + '{background:rgba(18,18,18,0.4);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:16px;overflow:hidden;margin-bottom:24px;box-shadow:0 12px 40px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.06);position:relative;}' +
      '.' + CARD + ' .profile.fpt-profile-body{padding:80px 28px 32px;text-align:center;background:transparent;position:relative;}' +
      '.' + CARD + ' .profile > h1.mb40{display:none !important;}' +
      '.' + IDENTITY + '{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;}' +
      '.fpt-profile-name{font-size:26px;font-weight:700;color:#fff;line-height:1.2;}' +
      '.fpt-profile-status{font-size:14px;font-weight:500;color:#888;line-height:1.2;}' +
      '.fpt-profile-status.fpt-online{color:#22c55e;}' +
      '.' + IDENTITY + ' .user-badges{margin:0;}' +
      '.fpt-profile-rating{display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:24px;cursor:pointer;position:relative;z-index:20;}' +
      '.fpt-stars-wrapper{position:relative;display:inline-flex;}' +
      '.fpt-stars-bg, .fpt-stars-fg{display:flex;gap:4px;}' +
      '.fpt-stars-bg{color:#d1d5db;}' +
      '.fpt-stars-fg{color:#fbbf24;position:absolute;top:0;left:0;overflow:hidden;width:var(--rating-pct);}' +
      '.fpt-stars-wrapper svg{width:22px;height:22px;flex-shrink:0;}' +
      '.fpt-profile-rating .fpt-count{color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;transition:color 0.2s;margin:0;}' +
      '.fpt-profile-rating:hover .fpt-count{color:#fff;}' +
      '.' + META + '{display:flex;justify-content:center;align-items:flex-start;gap:40px;flex-wrap:wrap;max-width:760px;margin:0 auto;text-align:center;}' +
      '.' + META + ' .profile-header-cols{display:block;flex:1 1 50%;min-width:200px;max-width:320px;text-align:center;}' +
      '.' + META + ' .param-item{margin:0;}' +
      '.' + META + ' .param-item h5,.fpt-profile-meta .' + ROOT + ' h5{margin:0 0 8px;text-transform:uppercase;font-size:11px;letter-spacing:.06em;color:#888;font-weight:600;}' +
      '.' + META + ' .param-item h5.text-bold{font-weight:600;}' +
      '.' + META + ' .param-item .text-nowrap,.fpt-profile-meta .' + ROOT + ' .' + TEXT + '{color:#fff;font-size:14px;line-height:1.5;}' +
      '.' + META + ' .param-item .text-nowrap{font-weight:400;}' +
      '.' + ROW + '{display:flex;align-items:flex-start;gap:40px;flex-wrap:wrap;}' +
      '.' + ROW + ' > .profile-header-cols{flex:0 0 auto;}' +
      '.' + ROOT + '{flex:1 1 50%;min-width:200px;max-width:320px;text-align:center;}' +
      '.' + ROOT + ' h5.fpt-pd-h{font-weight:600;}' +
      '.' + TEXT + '{white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + MAX_LINES + ';line-clamp:' + MAX_LINES + ';overflow:hidden;}' +
      '.' + EDIT + '{border:0;background:transparent;color:var(--fpt-pd-primary,#f59e0b);cursor:pointer;font-size:12px;font-weight:600;padding:0;margin-top:6px;}' +
      '.' + EDIT + ':hover{color:var(--fpt-pd-primary-hover,var(--fpt-pd-primary,#f59e0b));text-decoration:underline;}' +
      '.' + ROOT + ' textarea{width:100%;max-width:520px;box-sizing:border-box;resize:none;margin-top:4px;padding:6px 8px;border:1px solid rgba(127,127,127,.35);border-radius:4px;background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:1.45;}' +
      '.' + ROOT + ' .fpt-pd-actions{display:flex;gap:8px;align-items:center;max-width:520px;margin-top:8px;}' +
      '.' + ROOT + ' .fpt-pd-counter{margin-left:auto;font-size:11px;opacity:.6;}' +
      '.' + ROOT + ' .btn{min-width:90px;}' +
      '.fpt-pd-dots{display:inline-block;line-height:1;}' +
      '.fpt-pd-dots > span{display:inline-block;width:5px;height:5px;margin:0 2px;border-radius:50%;background:currentColor;opacity:.35;animation:fpt-pd-bounce 1.2s infinite ease-in-out;}' +
      '.fpt-pd-dots > span:nth-child(2){animation-delay:.15s;}' +
      '.fpt-pd-dots > span:nth-child(3){animation-delay:.3s;}' +
      '@keyframes fpt-pd-bounce{0%,80%,100%{opacity:.25;transform:translateY(0);}40%{opacity:.9;transform:translateY(-4px);}}' +
      '.' + CARD + ' .profile-cover.fpt-cover-host{position:relative !important;overflow:visible !important;min-height:350px !important;height:350px !important;border-radius:0 !important;background:#0d1321 !important;}' +
      '.' + CARD + ' .profile-cover{position:relative !important;overflow:visible !important;min-height:350px !important;height:350px !important;background:#0d1321 !important;}' +
      '.' + CARD + ' .profile-cover.fpt-cover-host .profile-cover-container{display:none !important;}' +
      '.' + CARD + ' .profile-cover:not(.fpt-cover-host) .profile-cover-container{position:absolute !important;inset:0 !important;height:350px !important;overflow:hidden !important;}' +
      '.' + CARD + ' .profile-cover:not(.fpt-cover-host) .profile-cover-img{height:350px !important;background-size:cover !important;background-position:center 25% !important;}' +
      '.' + CARD + ' .profile-cover-img.fpt-cover{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:350px !important;overflow:hidden !important;border-radius:0 !important;z-index:0 !important;}' +
      '.' + CARD + ' .fpt-cover-host,' + '.' + CARD + ' .fpt-cover-host .profile-cover-img,' + '.' + CARD + ' .profile-cover-img.fpt-cover,' + '.' + CARD + ' .profile-cover-img.fpt-cover .fpt-cover-pic,' + '.' + CARD + ' .profile-cover-img.fpt-cover .fpt-cover-gtop,' + '.' + CARD + ' .profile-cover-img.fpt-cover .fpt-cover-gbottom,' + '.' + CARD + ' .profile-cover-img.fpt-cover .fpt-cover-gdark{transform:none !important;filter:none !important;opacity:1 !important;}' +
      '.container.profile-header:not(.' + CARD + ') .fpt-cover-host{position:relative !important;overflow:hidden !important;min-height:350px !important;border-radius:0 0 40px 40px !important;background:#0d1321 !important;}' +
      '.container.profile-header:not(.' + CARD + ') .profile-cover-img.fpt-cover{position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;overflow:hidden !important;border-radius:0 0 40px 40px !important;z-index:0 !important;}' +
      '.fpt-cover-pic{position:absolute !important;inset:0 !important;background-size:cover !important;background-position:center 25% !important;background-repeat:no-repeat !important;z-index:0 !important;}' +
      '.fpt-cover-gtop{position:absolute !important;inset:0 !important;background:linear-gradient(180deg,rgba(13,19,33,.15) 0%,transparent 25%,transparent 100%) !important;z-index:1 !important;pointer-events:none;}' +
      '.fpt-cover-gbottom{display:none !important;}' +
      '.fpt-cover-gdark{display:none !important;}' +
      '.' + CARD + ' .avatar{position:absolute !important;bottom:-25px !important;left:50% !important;transform:translate(-50%,50%) !important;margin:0 !important;z-index:10 !important;}' +
      '.' + CARD + ' .avatar-photo{border:1.5px solid rgba(255,255,255,0.15);box-shadow:0 8px 24px rgba(0,0,0,0.5);}' +
      '.container.profile-header:not(.' + CARD + ') .fpt-cover-host .avatar,.container.profile-header:not(.' + CARD + ') .profile-cover-img.fpt-cover .avatar{position:relative !important;z-index:10 !important;margin-top:60px !important;transform:none !important;}' +
      '.fpt-banner-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);opacity:0;transition:opacity .18s ease,background .18s ease;cursor:pointer;z-index:5;}' +
      '.profile-cover-img.fpt-cover:hover .fpt-banner-overlay{opacity:1;background:rgba(0,0,0,.45);}' +
      '.fpt-banner-pencil{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;}' +
      '.fpt-banner-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);transition:background .4s ease;}' +
      '.fpt-banner-modal.fpt-preview-mode{background:rgba(0,0,0,.12);}' +
      '.fpt-banner-box{background:#fff;color:#1a1a1a;width:min(620px,94vw);border-radius:14px;padding:30px 30px 26px;box-shadow:0 20px 60px rgba(0,0,0,.45);transition:transform .55s cubic-bezier(.22,1,.36,1),box-shadow .4s ease;will-change:transform;}' +
      '.fpt-preview-mode .fpt-banner-box{transform:translateY(24vh);box-shadow:0 28px 70px rgba(0,0,0,.5);}' +
      '.fpt-banner-box h5{margin:0 0 18px;font-size:20px;font-weight:700;color:#1a1a1a;}' +
      '.fpt-banner-input{width:100%;box-sizing:border-box;padding:14px 16px;border:1.5px solid #d5d7db;border-radius:9px;background:#fff;color:#1a1a1a;font-size:15px;outline:none;transition:border-color .15s ease;}' +
      '.fpt-banner-input:focus{border-color:var(--fpt-pd-primary,#f59e0b);}' +
      '.fpt-banner-input::placeholder{color:#9aa0a6;}' +
      '.fpt-banner-hint{font-size:13px;color:#6b7280;margin-top:14px;line-height:1.5;min-height:20px;}' +
      '.fpt-banner-hint.fpt-bad{color:#dc2626;}' +
      '.fpt-banner-help{margin-top:14px;padding:14px 16px;background:#f4f6f8;border-radius:10px;border:1px solid #e6e9ee;}' +
      '.fpt-help-title{font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;}' +
      '.fpt-help-step{font-size:12.5px;color:#4b5563;line-height:1.55;margin-bottom:4px;}' +
      '.fpt-help-note{font-size:12px;color:#9ca3af;line-height:1.5;margin-top:8px;}' +
      '.fpt-banner-help b{color:#111827;}' +
      '.fpt-banner-actions{display:flex;gap:10px;margin-top:28px;}' +
      '.fpt-banner-actions .btn{min-width:120px;padding:10px 18px;font-size:14px;}' +
      '.fpt-banner-actions .btn[disabled]{opacity:.6;cursor:default;}' +
      '.fpt-btn-dots{display:inline-block;}' +
      '.fpt-btn-dots > i{display:inline-block;width:5px;height:5px;margin:0 1.5px;border-radius:50%;background:currentColor;opacity:.4;animation:fpt-pd-bounce 1.2s infinite ease-in-out;}' +
      '.fpt-btn-dots > i:nth-child(2){animation-delay:.15s;}' +
      '.fpt-btn-dots > i:nth-child(3){animation-delay:.3s;}' +
      '.fpt-banner-vignette{position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0;transition:opacity .35s ease;box-shadow:inset 0 0 120px 30px rgba(0,0,0,.28);display:flex;align-items:flex-end;justify-content:center;}' +
      '.fpt-banner-vignette.show{opacity:1;}' +
      '.fpt-banner-vignette span{margin-bottom:26px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;padding:6px 12px;border-radius:20px;}';
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
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') el.style.setProperty('--fpt-pd-primary', c);
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
    profile.classList.add('fpt-profile-body');

    if (!profile.querySelector('.' + IDENTITY)) {
      const h1 = profile.querySelector('h1.mb40');
      if (h1) {
        const identity = document.createElement('div');
        identity.className = IDENTITY;

        const nameSrc = h1.querySelector('.mr4') || h1.querySelector('a');
        if (nameSrc) {
          const name = document.createElement('span');
          name.className = 'fpt-profile-name';
          name.textContent = nameSrc.textContent.trim();
          identity.appendChild(name);
        }

        const badges = h1.querySelector('.user-badges');
        if (badges) identity.appendChild(badges.cloneNode(true));

        const statusEl = h1.querySelector('.media-user-status');
        const st = parseProfileStatus(h1, statusEl);
        if (st.text) {
          const status = document.createElement('span');
          status.className = 'fpt-profile-status' + (st.online ? ' fpt-online' : '');
          status.textContent = st.text;
          identity.appendChild(status);
        }

        profile.insertBefore(identity, h1);
      }
    }

    const identity = profile.querySelector('.' + IDENTITY);
    if (identity && !profile.querySelector('.fpt-profile-rating')) {
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
          rBlock.className = 'fpt-profile-rating';
          rBlock.style.textDecoration = 'none';
          rBlock.title = 'Нажмите, чтобы прочитать отзывы';
          
          const starSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>';
          const fiveStars = starSvg.repeat(5);

          rBlock.innerHTML = 
            '<div class="fpt-stars-wrapper" style="--rating-pct: ' + pct + '%;">' +
               '<div class="fpt-stars-bg">' + fiveStars + '</div>' +
               '<div class="fpt-stars-fg">' + fiveStars + '</div>' +
            '</div>' +
            '<span class="fpt-count">' + count + ' отзывов</span>';

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
    h.className = 'fpt-pd-h';
    h.textContent = 'Описание';
    root.appendChild(h);
    const dots = document.createElement('div');
    dots.className = 'fpt-pd-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    root.appendChild(dots);
  }

  function renderView(root, state) {
    root.innerHTML = '';
    const h = document.createElement('h5');
    h.className = 'fpt-pd-h';
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
    h.className = 'fpt-pd-h';
    h.textContent = 'Описание';
    root.appendChild(h);
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.maxLength = DESCRIPTION_MAX;
    ta.value = state.description || '';
    ta.placeholder = 'Расскажите о себе - это описание видят все пользователи расширения.';
    root.appendChild(ta);
    const actions = document.createElement('div');
    actions.className = 'fpt-pd-actions';
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'btn btn-primary'; save.textContent = 'Сохранить';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-gray'; cancel.textContent = 'Отмена';
    const counter = document.createElement('span');
    counter.className = 'fpt-pd-counter';
    const upd = () => { counter.textContent = ta.value.length + ' / ' + DESCRIPTION_MAX; };
    upd();
    ta.addEventListener('input', upd);
    actions.appendChild(save); actions.appendChild(cancel); actions.appendChild(counter);
    root.appendChild(actions);
    cancel.addEventListener('click', () => renderView(root, state));
    save.addEventListener('click', async () => {
      save.disabled = true; cancel.disabled = true;
      const text = ta.value;
      try {
        let session = state.session || (await loadSession(state.funpayUserId));
        if (!session || session.funpayUserId !== state.funpayUserId) {
          console.log('[FPT PD] no session, starting verification for', state.funpayUserId);
          toast('Подтверждаем владение аккаунтом…', false);
          session = await runVerification(state.funpayUserId);
          console.log('[FPT PD] verification OK, got session');
        }
        let res;
        try { res = await serverSaveDescription(session.token, text); }
        catch (e) {
          if (e.httpStatus === 401) {
            console.log('[FPT PD] session expired, re-verifying');
            session = await runVerification(state.funpayUserId);
            res = await serverSaveDescription(session.token, text);
          }
          else throw e;
        }
        console.log('[FPT PD] saved:', res);
        const newDesc = res && res.description != null ? res.description : text;
        const newState = Object.assign({}, state, { description: newDesc, session });
        await cacheWrite(state.funpayUserId, { description: newDesc, bannerUrl: state.bannerUrl });
        renderView(root, newState);
        toast('Описание сохранено', false);
      } catch (e) {
        console.error('[FPT PD] save failed:', e && e.message, e);
        toast(humanError(e && e.message), true);
        save.disabled = false; cancel.disabled = false;
      }
    });
    ta.focus();
  }

  function humanError(code) {
    switch (code) {
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
    return document.querySelector('.profile-cover');
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
    const img = cover.querySelector(':scope > .profile-cover-img.fpt-cover');
    if (img && !img.querySelector('.fpt-banner-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'fpt-banner-overlay';
      overlay.innerHTML = '<span class="fpt-banner-pencil"><i class="fa fa-pen"></i></span>';
      img.appendChild(overlay);
      overlay.addEventListener('click', () => openBannerForm(cover, editorMount.profileId, editorMount.state));
    }
  }

  function buildCoverBanner(cover, url) {
    const avatar = cover.querySelector('.avatar');
    let img = cover.querySelector(':scope > .profile-cover-img.fpt-cover');
    if (!img) {
      Array.from(cover.querySelectorAll(':scope > .profile-cover-img, :scope > .profile-cover-container'))
        .forEach((el) => { if (!el.classList.contains('fpt-cover')) el.remove(); });
      img = document.createElement('div');
      img.className = 'profile-cover-img fpt-cover';
      cover.insertBefore(img, cover.firstChild);
    }
    img.innerHTML = '';

    const pic = document.createElement('div');
    pic.className = 'fpt-cover-pic';
    if (url) pic.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';

    const gTop = document.createElement('div'); gTop.className = 'fpt-cover-gtop';
    const gBottom = document.createElement('div'); gBottom.className = 'fpt-cover-gbottom';
    const gDark = document.createElement('div'); gDark.className = 'fpt-cover-gdark';

    img.appendChild(pic);
    img.appendChild(gTop);
    img.appendChild(gBottom);
    img.appendChild(gDark);

    if (avatar && avatar.parentElement !== cover) cover.appendChild(avatar);
    cover.setAttribute('data-fpt-banner', url || '');
    cover.classList.add('fpt-cover-host');
    return { img, pic };
  }

  function guardBanner() {
    if (bannerWatch) return;
    bannerWatch = new MutationObserver(() => {
      if (!activeBannerUrl) return;
      const cover = findCover();
      if (!cover) return;
      const pic = cover.querySelector(':scope > .profile-cover-img.fpt-cover .fpt-cover-pic');
      if (!pic || cover.getAttribute('data-fpt-banner') !== activeBannerUrl) {
        buildCoverBanner(cover, activeBannerUrl);
        reattachEditor();
      }
    });
    bannerWatch.observe(document.body, { childList: true, subtree: true });
  }

  function applyBanner(url) {
    const cover = findCover();
    if (!cover || !url) return;
    activeBannerUrl = url;
    const pic = cover.querySelector(':scope > .profile-cover-img.fpt-cover .fpt-cover-pic');
    if (pic && cover.getAttribute('data-fpt-banner') === url) { guardBanner(); return; }
    buildCoverBanner(cover, url);
    console.log('[FPT PD] banner applied');
    guardBanner();
  }

  function validateBannerUrl(url) {
    const u = (url || '').trim();
    if (!u) return { ok: false, msg: 'Вставьте ссылку на картинку.' };
    if (!/^https:\/\//i.test(u)) return { ok: false, msg: 'Ссылка должна начинаться с https://' };
    return { ok: true, url: u };
  }

  function checkImageSize(url, maxBytes) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.timeout = 8000;
        xhr.onreadystatechange = () => {
          if (xhr.readyState === xhr.HEADERS_RECEIVED) {
            const len = Number(xhr.getResponseHeader('Content-Length') || 0);
            if (len && len > maxBytes) return done({ ok: false, tooBig: true });
            done({ ok: true });
          }
        };
        xhr.onerror = () => done({ ok: true });
        xhr.ontimeout = () => done({ ok: true });
        xhr.send();
      } catch { done({ ok: true }); }
    });
  }

  function mountBannerEditor(profileId, session, currentBanner) {
    const cover = findCover();
    if (!cover) return;

    let img = cover.querySelector(':scope > .profile-cover-img.fpt-cover');
    if (!img) {
      const r = buildCoverBanner(cover, currentBanner || activeBannerUrl || '');
      img = r.img;
    }
    if (currentBanner) activeBannerUrl = currentBanner;

    if (!img.querySelector('.fpt-banner-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'fpt-banner-overlay';
      overlay.innerHTML = '<span class="fpt-banner-pencil"><i class="fa fa-pen"></i></span>';
      img.appendChild(overlay);
      let state = { banner: currentBanner || null, session };
      editorMount = { profileId, state };
      overlay.addEventListener('click', () => openBannerForm(cover, profileId, state));
      console.log('[FPT PD] banner editor mounted');
    }
  }

  function openBannerForm(cover, profileId, state) {
    if (document.querySelector('.fpt-banner-modal')) return;
    const MAX_BYTES = 30 * 1024 * 1024;

    const modal = document.createElement('div');
    modal.className = 'fpt-banner-modal';
    modal.innerHTML =
      '<div class="fpt-banner-box">' +
      '<h5 class="fpt-pd-h">Баннер профиля</h5>' +
      '<input type="text" class="fpt-banner-input" placeholder="https://i.ibb.co/.../kartinka.png" />' +
      '<div class="fpt-banner-hint">Нужна <b>прямая ссылка на картинку</b> (png, jpg, gif), до 30 МБ.</div>' +
      '<div class="fpt-banner-help">' +
      '<div class="fpt-help-title">Как получить прямую ссылку?</div>' +
      '<div class="fpt-help-step">1. Загрузите картинку на <b>postimages.org</b> или <b>imgbb.com</b> (без регистрации).</div>' +
      '<div class="fpt-help-step">2. Скопируйте поле <b>«Прямая ссылка»</b> / <b>«Direct link»</b>.</div>' +
      '<div class="fpt-help-step">Если такого поля нет - нажмите <b>правой кнопкой по картинке</b> и выберите <b>«Копировать ссылку на изображение»</b>.</div>' +
      '<div class="fpt-help-note">Ссылка на страницу сайта (например, на пост в VK или Pinterest) <b>не подойдёт</b> - нужна ссылка на саму картинку.</div>' +
      '</div>' +
      '<div class="fpt-banner-actions">' +
      '<button type="button" class="btn btn-gray fpt-banner-preview">Предпросмотр</button>' +
      '<button type="button" class="btn btn-primary fpt-banner-save">Сохранить</button>' +
      '<button type="button" class="btn btn-gray fpt-banner-cancel">Отмена</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    const input = modal.querySelector('.fpt-banner-input');
    const hint = modal.querySelector('.fpt-banner-hint');
    const btnPrev = modal.querySelector('.fpt-banner-preview');
    const btnSave = modal.querySelector('.fpt-banner-save');
    const btnCancel = modal.querySelector('.fpt-banner-cancel');
    if (state.banner) input.value = state.banner;

    const DOTS = '<span class="fpt-btn-dots"><i></i><i></i><i></i></span>';
    function btnLoading(btn, on) {
      if (on) {
        if (btn.getAttribute('data-label') == null) btn.setAttribute('data-label', btn.innerHTML);
        btn.innerHTML = DOTS;
        btn.disabled = true;
      } else {
        const lbl = btn.getAttribute('data-label');
        if (lbl != null) { btn.innerHTML = lbl; btn.removeAttribute('data-label'); }
        btn.disabled = false;
      }
    }
    function lockButtons(on) {
      [btnPrev, btnSave, btnCancel].forEach((b) => { b.disabled = on; });
    }

    let previewing = false;
    const setHint = (msg, bad) => { hint.textContent = msg; hint.classList.toggle('fpt-bad', !!bad); };

    function getPic() {
      const cv = findCover();
      if (!cv) return null;
      let img = cv.querySelector(':scope > .profile-cover-img.fpt-cover');
      if (!img) { const r = buildCoverBanner(cv, state.banner || ''); img = r.img; }
      return img.querySelector('.fpt-cover-pic');
    }
    function showPreview(url) {
      let vg = document.querySelector('.fpt-banner-vignette');
      if (!vg) {
        vg = document.createElement('div');
        vg.className = 'fpt-banner-vignette';
        vg.innerHTML = '<span>Предпросмотр - это видите только вы</span>';
        document.body.appendChild(vg);
        requestAnimationFrame(() => vg.classList.add('show'));
      }
      modal.classList.add('fpt-preview-mode');
      const pic = getPic();
      if (pic) {
        if (pic.getAttribute('data-prevbackup') == null) {
          pic.setAttribute('data-prevbackup', pic.style.backgroundImage || '');
        }
        pic.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      }
      previewing = true;
    }
    function clearPreview() {
      modal.classList.remove('fpt-preview-mode');
      const vg = document.querySelector('.fpt-banner-vignette');
      if (vg) { vg.classList.remove('show'); setTimeout(() => vg.remove(), 350); }
      const cv = findCover();
      const pic = cv && cv.querySelector(':scope > .profile-cover-img.fpt-cover .fpt-cover-pic');
      if (pic && pic.getAttribute('data-prevbackup') != null) {
        pic.style.backgroundImage = pic.getAttribute('data-prevbackup');
        pic.removeAttribute('data-prevbackup');
      }
      previewing = false;
    }

    function progressHint(prefix) {
      return (p) => {
        if (p == null) setHint(prefix + '… (это может занять время на большой картинке)', false);
        else setHint(prefix + '… ' + p + '%', false);
      };
    }

    btnPrev.addEventListener('click', async () => {
      const v = validateBannerUrl(input.value);
      if (!v.ok) { setHint(v.msg, true); return; }
      btnLoading(btnPrev, true); btnSave.disabled = true;
      setHint('Загружаю предпросмотр…', false);
      const pre = await preloadImage(v.url, progressHint('Загружаю предпросмотр'));
      btnLoading(btnPrev, false); btnSave.disabled = false;
      if (!pre.ok) {
        if (pre.reason === 'timeout') setHint('Картинка грузится слишком долго. Возможно, она очень большая или интернет медленный - попробуйте ещё раз или выберите картинку полегче.', true);
        else setHint('Это не похоже на прямую ссылку на картинку. Нужна ссылка, которая заканчивается прямо на изображении (см. подсказку ниже).', true);
        return;
      }
      setHint('Так баннер будет выглядеть. Нажмите «Сохранить», чтобы применить.', false);
      showPreview(v.url);
    });

    btnCancel.addEventListener('click', () => { clearPreview(); modal.remove(); });

    btnSave.addEventListener('click', async () => {
      const v = validateBannerUrl(input.value);
      if (!v.ok) { setHint(v.msg, true); return; }
      btnLoading(btnSave, true); btnPrev.disabled = true; btnCancel.disabled = true;
      setHint('Загружаю картинку…', false);
      const pre = await preloadImage(v.url, progressHint('Загружаю картинку'));
      if (!pre.ok) {
        if (pre.reason === 'timeout') setHint('Картинка грузится слишком долго. Возможно, она очень большая или интернет медленный - попробуйте ещё раз или выберите картинку полегче.', true);
        else setHint('Это не похоже на прямую ссылку на картинку. Нужна ссылка, которая заканчивается прямо на изображении (см. подсказку ниже).', true);
        btnLoading(btnSave, false); btnPrev.disabled = false; btnCancel.disabled = false; return;
      }
      try {
        let session = state.session || (await loadSession(profileId));
        if (!session || session.funpayUserId !== profileId) {
          setHint('Подтверждаем владение аккаунтом…', false);
          session = await runVerification(profileId);
          state.session = session;
        }
        setHint('Сохраняю ссылку…', false);
        try { await serverSaveBanner(session.token, v.url); }
        catch (e) {
          if (e.httpStatus === 401) { session = await runVerification(profileId); state.session = session; await serverSaveBanner(session.token, v.url); }
          else throw e;
        }
        setHint('Применяю баннер…', false);
        clearPreview();
        applyBanner(v.url);
        state.banner = v.url;
        const cur = await cacheRead(profileId);
        await cacheWrite(profileId, { description: cur ? cur.description : null, bannerUrl: v.url });
        toast('Баннер обновлён', false);
        modal.remove();
      } catch (e) {
        console.error('[FPT PD] banner save failed:', e && e.message, e);
        setHint(humanError(e && e.message), true);
        btnLoading(btnSave, false); btnPrev.disabled = false; btnCancel.disabled = false;
      }
    });

    input.focus();
  }

  let mounted = false;

  async function mount() {
    if (mounted) return;
    const profileId = profileIdFromUrl();
    if (profileId === null) return;
    if (document.querySelector('.' + ROOT)) {
      mounted = true;
      ensureProfileLayout(document.querySelector('.' + ROOT));
      return;
    }

    console.log('[FPT PD] mount() start, waiting for anchor…');
    const anchor = (await waitFor('.profile-header-cols', 10000))
      || document.querySelector('.profile-header')
      || document.querySelector('.profile-data-container');
    console.log('[FPT PD] anchor found:', !!anchor, anchor && anchor.className);
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
    console.log('[FPT PD] mounted, profileId=', profileId);

    const myId = getMyUserId();
    const isOwn = myId !== null && myId === profileId;
    console.log('[FPT PD] myId=', myId, 'isOwn=', isOwn);

    let description = null;
    let bannerUrl = null;
    const cached = await cacheRead(profileId);
    console.log('[FPT PD] cache:', cached);
    if (cached) { description = cached.description; bannerUrl = cached.bannerUrl; }
    else {
      console.log('[FPT PD] fetching from server…');
      const prof = await withTimeout(serverGetProfile(profileId), 8000, { description: null, bannerUrl: null });
      description = prof.description;
      bannerUrl = prof.bannerUrl;
      console.log('[FPT PD] server profile:', prof);
      await cacheWrite(profileId, prof);
    }

    const session = await loadSession(profileId);

    if (bannerUrl) applyBanner(bannerUrl);
    if (isOwn) mountBannerEditor(profileId, session, bannerUrl);

    if (!description && !isOwn) {
      console.log('[FPT PD] empty + not own → removing block');
      ensureProfileLayout(null);
      root.remove();
      return;
    }
    console.log('[FPT PD] rendering view, isOwn=', isOwn);
    renderView(root, { funpayUserId: profileId, isOwn, description, bannerUrl, session });
  }

  function checkNav(getLast, setLast) {
    if (location.pathname !== getLast()) { setLast(location.pathname); mounted = false; mount(); }
  }

  async function earlyBanner() {
    const profileId = profileIdFromUrl();
    if (profileId === null) return;
    const cached = await cacheRead(profileId);
    if (cached && cached.bannerUrl) {
      injectStyles();
      const tryApply = (n) => {
        const cover = findCover();
        if (cover) {
          cover.classList.add('fpt-cover-host');
          applyBanner(cached.bannerUrl);
          ensureProfileLayout(null);
          return;
        }
        if (n > 0) setTimeout(() => tryApply(n - 1), 40);
      };
      tryApply(120);
    }
  }

  function boot() {
    console.log('[FPT PD] feature loaded, path=', location.pathname);
    earlyBanner();
    mount();
    let lastPath = location.pathname;
    const get = () => lastPath, set = (p) => { lastPath = p; };
    setInterval(() => checkNav(get, set), 700);
    document.addEventListener('click', () => setTimeout(() => checkNav(get, set), 300), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
