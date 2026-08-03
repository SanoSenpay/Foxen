// content/features/slash_telegram_ui.js
// Настройки страниц «Слэш-команды» и «Telegram» в попапе Foxen.
// Сохранение в chrome.storage.local (foxenSlashCommands / foxenTelegram).

// ─────────────────────────────────────────────────────────────────────────────
//  СЛЭШ-КОМАНДЫ
// ─────────────────────────────────────────────────────────────────────────────
const FPT_SLASH_KEY = 'foxenSlashCommands';
const FPT_SLASH_DEFAULTS = { enabled: true, expandKey: 'both', autocomplete: true, commands: [] };
let _fxnSlashCfg = null;

async function fxnSlashLoad() {
    const r = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(FPT_SLASH_KEY);
    _fxnSlashCfg = Object.assign({}, FPT_SLASH_DEFAULTS, r[FPT_SLASH_KEY] || {});
    if (!Array.isArray(_fxnSlashCfg.commands)) _fxnSlashCfg.commands = [];
    return _fxnSlashCfg;
}
async function fxnSlashSave() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [FPT_SLASH_KEY]: _fxnSlashCfg });
}

function fxnSlashRenderList() {
    const list = document.getElementById('fxnSlashList');
    if (!list) return;
    if (!_fxnSlashCfg.commands.length) {
        list.innerHTML = '<p class="template-info">Пока нет команд. Нажмите «+ Добавить команду».</p>';
        return;
    }
    list.innerHTML = _fxnSlashCfg.commands.map((c, i) => `
        <div class="fxn-slash-row" data-i="${i}" style="background:#0e0f16;border:1px solid #1e2030;border-radius:8px;padding:10px;margin-bottom:8px;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                <input type="text" class="fxn-slash-trigger template-input" data-i="${i}" value="${fxnSlashEsc(c.trigger || '')}" placeholder="/привет" style="flex:0 0 150px;margin:0;">
                <span style="color:#5a5f7a;font-size:12px;">→</span>
                <button class="fxn-slash-del btn btn-default" data-i="${i}" title="Удалить" style="margin-left:auto;padding:4px 10px;">🗑️</button>
            </div>
            <textarea class="fxn-slash-response template-input" data-i="${i}" rows="2" placeholder="Текст-ответ. Напр.: Привет, я тут. Какие вопросы?" style="margin:0;resize:vertical;">${fxnSlashEsc(c.response || '')}</textarea>
        </div>
    `).join('');
}

function fxnSlashEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function fxnSlashNormalizeTrigger(t) {
    t = (t || '').trim().replace(/\s+/g, '');
    if (!t) return '';
    if (!t.startsWith('/')) t = '/' + t;
    return t;
}

let _fxnSlashUiBound = false;
async function initializeSlashCommandsUI() {
    const page = document.querySelector('.foxen-page-content[data-page="slash_commands"]');
    if (!page) return;
    await fxnSlashLoad();

    const enabledEl = document.getElementById('fxnSlashEnabled');
    const autoEl = document.getElementById('fxnSlashAutocomplete');
    const configEl = document.getElementById('fxnSlashConfig');
    const keyRadios = page.querySelectorAll('input[name="fxnSlashKey"]');

    if (enabledEl) enabledEl.checked = _fxnSlashCfg.enabled !== false;
    if (autoEl) autoEl.checked = _fxnSlashCfg.autocomplete !== false;
    keyRadios.forEach(r => { r.checked = (r.value === (_fxnSlashCfg.expandKey || 'both')); });
    if (configEl) configEl.style.display = (_fxnSlashCfg.enabled === false) ? 'none' : '';

    fxnSlashRenderList();

    if (_fxnSlashUiBound) return;
    _fxnSlashUiBound = true;

    enabledEl && enabledEl.addEventListener('change', async () => {
        _fxnSlashCfg.enabled = enabledEl.checked;
        if (configEl) configEl.style.display = enabledEl.checked ? '' : 'none';
        await fxnSlashSave();
    });
    autoEl && autoEl.addEventListener('change', async () => {
        _fxnSlashCfg.autocomplete = autoEl.checked;
        await fxnSlashSave();
    });
    keyRadios.forEach(r => r.addEventListener('change', async () => {
        if (r.checked) { _fxnSlashCfg.expandKey = r.value; await fxnSlashSave(); }
    }));

    const addBtn = document.getElementById('fxnSlashAddBtn');
    addBtn && addBtn.addEventListener('click', async () => {
        _fxnSlashCfg.commands.push({ id: Date.now().toString(), trigger: '/', response: '' });
        await fxnSlashSave();
        fxnSlashRenderList();
    });

    const list = document.getElementById('fxnSlashList');
    if (list && !list.dataset.bound) {
        list.dataset.bound = '1';
        let saveT = null;
        const scheduleSave = () => { clearTimeout(saveT); saveT = setTimeout(fxnSlashSave, 350); };

        list.addEventListener('input', (e) => {
            const i = parseInt(e.target.dataset.i, 10);
            if (isNaN(i) || !_fxnSlashCfg.commands[i]) return;
            if (e.target.classList.contains('fxn-slash-trigger')) {
                _fxnSlashCfg.commands[i].trigger = e.target.value; // нормализуем при blur
            } else if (e.target.classList.contains('fxn-slash-response')) {
                _fxnSlashCfg.commands[i].response = e.target.value;
            }
            scheduleSave();
        });
        list.addEventListener('focusout', async (e) => {
            if (e.target.classList.contains('fxn-slash-trigger')) {
                const i = parseInt(e.target.dataset.i, 10);
                if (!isNaN(i) && _fxnSlashCfg.commands[i]) {
                    _fxnSlashCfg.commands[i].trigger = fxnSlashNormalizeTrigger(e.target.value);
                    e.target.value = _fxnSlashCfg.commands[i].trigger;
                    await fxnSlashSave();
                }
            }
        });
        list.addEventListener('click', async (e) => {
            const del = e.target.closest('.fxn-slash-del');
            if (!del) return;
            const i = parseInt(del.dataset.i, 10);
            if (isNaN(i)) return;
            _fxnSlashCfg.commands.splice(i, 1);
            await fxnSlashSave();
            fxnSlashRenderList();
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TELEGRAM
// ─────────────────────────────────────────────────────────────────────────────
const FXN_TG_KEY = 'foxenTelegram';
const FPT_TG_KEY = 'foxenTelegram';
const FPT_TG_DEFAULTS = {
    enabled: false, token: '', chatId: '',
    notifyMessages: true, notifyOrders: true, allowControl: true, pollInterval: 1, lastUpdateId: 0
};
let _fxnTgCfg = null;

async function fxnTgLoad() {
    const r = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([FXN_TG_KEY, FPT_TG_KEY]);
    _fxnTgCfg = Object.assign({}, FPT_TG_DEFAULTS, r[FXN_TG_KEY] || r[FPT_TG_KEY] || {});
    return _fxnTgCfg;
}
async function fxnTgSave() {
    await (typeof browser !== 'undefined' ? browser : chrome).storage.local.set({ [FXN_TG_KEY]: _fxnTgCfg });
}

function fxnTgSetStatus(text, kind) {
    const el = document.getElementById('fxnTgStatus') || document.getElementById('fxnTgStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = kind === 'ok' ? '#4caf82' : kind === 'err' ? '#ff6b6b' : '#9099b8';
}

let _fxnTgUiBound = false;
async function initializeTelegramUI() {
    const page = document.querySelector('.foxen-page-content[data-page="telegram"]') || document.querySelector('.foxen-page-content[data-page="telegram"]');
    if (!page) return;
    await fxnTgLoad();

    const enabledEl = document.getElementById('fxnTgEnabled') || document.getElementById('fxnTgEnabled');
    const configEl = document.getElementById('fxnTgConfig') || document.getElementById('fxnTgConfig');
    const tokenEl = document.getElementById('fxnTgToken') || document.getElementById('fxnTgToken');
    const chatIdEl = document.getElementById('fxnTgChatId') || document.getElementById('fxnTgChatId');
    const notifyOrdersEl = document.getElementById('fxnTgNotifyOrders') || document.getElementById('fxnTgNotifyOrders');
    const notifyMsgEl = document.getElementById('fxnTgNotifyMessages') || document.getElementById('fxnTgNotifyMessages');
    const allowControlEl = document.getElementById('fxnTgAllowControl') || document.getElementById('fxnTgAllowControl');

    if (enabledEl) enabledEl.checked = !!_fxnTgCfg.enabled;
    if (configEl) configEl.style.display = _fxnTgCfg.enabled ? '' : 'none';
    if (tokenEl) tokenEl.value = _fxnTgCfg.token || '';
    if (chatIdEl) chatIdEl.value = _fxnTgCfg.chatId || '';
    if (notifyOrdersEl) notifyOrdersEl.checked = _fxnTgCfg.notifyOrders !== false;
    if (notifyMsgEl) notifyMsgEl.checked = _fxnTgCfg.notifyMessages !== false;
    if (allowControlEl) allowControlEl.checked = _fxnTgCfg.allowControl !== false;

    if (_fxnTgCfg.token && _fxnTgCfg.chatId) {
        fxnTgSetStatus('Подключено. Chat ID: ' + _fxnTgCfg.chatId, 'ok');
    } else {
        fxnTgSetStatus('');
    }

    if (_fxnTgUiBound) return;
    _fxnTgUiBound = true;

    enabledEl && enabledEl.addEventListener('change', async () => {
        _fxnTgCfg.enabled = enabledEl.checked;
        if (configEl) configEl.style.display = enabledEl.checked ? '' : 'none';
        if (enabledEl.checked && (!_fxnTgCfg.token || !_fxnTgCfg.chatId)) {
            fxnTgSetStatus('Введите токен и нажмите «Подключить», иначе уведомления не будут приходить.', 'err');
        }
        await fxnTgSave();
    });

    [['fxnTgNotifyOrders', 'notifyOrders'], ['fxnTgNotifyMessages', 'notifyMessages'], ['fxnTgAllowControl', 'allowControl'], ['fxnTgNotifyOrders', 'notifyOrders'], ['fxnTgNotifyMessages', 'notifyMessages'], ['fxnTgAllowControl', 'allowControl']]
        .forEach(([id, key]) => {
            const el = document.getElementById(id);
            el && el.addEventListener('change', async () => { _fxnTgCfg[key] = el.checked; await fxnTgSave(); });
        });

    chatIdEl && chatIdEl.addEventListener('change', async () => {
        _fxnTgCfg.chatId = chatIdEl.value.trim();
        await fxnTgSave();
    });

    const connectBtn = document.getElementById('fxnTgConnectBtn') || document.getElementById('fxnTgConnectBtn');
    connectBtn && connectBtn.addEventListener('click', async () => {
        const token = (tokenEl.value || '').trim();
        if (!token) { fxnTgSetStatus('Введите токен бота.', 'err'); return; }
        connectBtn.disabled = true;
        fxnTgSetStatus('Проверяю токен…');
        try {
            const res = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'telegramValidate', token });
            if (!res || !res.ok) {
                fxnTgSetStatus('Ошибка: ' + (res && res.error ? res.error : 'неверный токен'), 'err');
                connectBtn.disabled = false;
                return;
            }
            _fxnTgCfg.token = token;
            if (res.chatId) {
                _fxnTgCfg.chatId = res.chatId;
                if (chatIdEl) chatIdEl.value = res.chatId;
            }
            // включаем интеграцию автоматически при успешном подключении
            _fxnTgCfg.enabled = true;
            if (enabledEl) enabledEl.checked = true;
            if (configEl) configEl.style.display = '';
            await fxnTgSave();

            if (res.chatId) {
                fxnTgSetStatus(`Готово! Бот ${res.botName}. Chat ID: ${res.chatId}.`, 'ok');
            } else {
                fxnTgSetStatus(`Бот ${res.botName} найден, но не удалось определить чат. Напишите боту любое сообщение в Telegram и нажмите «Подключить» ещё раз.`, 'err');
            }
        } catch (e) {
            fxnTgSetStatus('Ошибка: ' + e.message, 'err');
        } finally {
            connectBtn.disabled = false;
        }
    });

    const testBtn = document.getElementById('fxnTgTestBtn') || document.getElementById('fxnTgTestBtn');
    testBtn && testBtn.addEventListener('click', async () => {
        if (!_fxnTgCfg.token || !_fxnTgCfg.chatId) {
            fxnTgSetStatus('Сначала подключите бота (токен + chat id).', 'err');
            return;
        }
        testBtn.disabled = true;
        fxnTgSetStatus('Отправляю тестовое сообщение…');
        try {
            const res = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'telegramTest' });
            if (res && res.ok) fxnTgSetStatus('Тестовое сообщение отправлено в Telegram ✅', 'ok');
            else fxnTgSetStatus('Не удалось отправить: ' + (res && res.error ? res.error : 'ошибка'), 'err');
        } catch (e) {
            fxnTgSetStatus('Ошибка: ' + e.message, 'err');
        } finally {
            testBtn.disabled = false;
        }
    });
}

// expose
if (typeof window !== 'undefined') {
    window.initializeSlashCommandsUI = initializeSlashCommandsUI;
    window.initializeTelegramUI = initializeTelegramUI;
}
