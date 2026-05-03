document.addEventListener('DOMContentLoaded', async function () {

    // ─── Версия ───────────────────────────────────────────────────
    const manifest = browser.runtime.getManifest();
    const version = manifest.version;
    const versionEl = document.getElementById('version-display');
    const footerVerEl = document.getElementById('footer-version');
    if (versionEl)   versionEl.textContent   = `v${version}`;
    if (footerVerEl) footerVerEl.textContent  = version;

    // ─── Статус: проверка открытой вкладки FunPay + авторизации ───
    const statusDot = document.getElementById('status-dot');
    browser.tabs.query({ url: 'https://funpay.com/*' }, (tabs) => {
        if (tabs.length > 0) {
            statusDot.classList.add('online');
            statusDot.title = 'FunPay открыт';
        } else {
            statusDot.classList.add('offline');
            statusDot.title = 'FunPay не открыт';
        }
    });

    // ─── Краткая статистика ───────────────────────────────────────
    browser.storage.local.get(['fpToolsAutoReplies', 'autoBumpEnabled'], (data) => {
        const autoReplies = data.fpToolsAutoReplies || {};
        const anyAR = autoReplies.greetingEnabled
            || autoReplies.keywordsEnabled
            || autoReplies.autoReviewEnabled
            || autoReplies.bonusForReviewEnabled;

        const statsSection = document.getElementById('quickStats');
        const arEl  = document.getElementById('statAutoReply');
        const abEl  = document.getElementById('statAutoBump');

        if (statsSection) statsSection.style.display = 'flex';

        if (arEl) {
            arEl.textContent = anyAR ? 'Включены' : 'Выключены';
            arEl.className   = 'stat-value ' + (anyAR ? 'on' : 'off');
        }
        if (abEl) {
            abEl.textContent = data.autoBumpEnabled ? 'Включено' : 'Выключено';
            abEl.className   = 'stat-value ' + (data.autoBumpEnabled ? 'on' : 'off');
        }
    });

    // ─── Кнопка перехода на FunPay ────────────────────────────────
    document.getElementById('goToFunPayBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        browser.tabs.query({ url: 'https://funpay.com/*' }, (tabs) => {
            if (tabs.length > 0) {
                browser.tabs.update(tabs[0].id, { active: true });
                browser.windows.update(tabs[0].windowId, { focused: true });
            } else {
                browser.tabs.create({ url: 'https://funpay.com/' });
            }
            window.close();
        });
    });

    // ─── Ссылка на GitHub ─────────────────────────────────────────
    document.getElementById('forkBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        browser.tabs.create({ url: 'https://github.com/SanoSenpay' });
        window.close();
    });

    // ─── Панель списка изменений ──────────────────────────────────
    const changelogPanel = document.getElementById('changelog-panel');
    document.getElementById('changelogBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (changelogPanel) {
            const isVisible = changelogPanel.style.display !== 'none';
            changelogPanel.style.display = isVisible ? 'none' : 'block';
        }
    });

    document.getElementById('changelog-close')?.addEventListener('click', () => {
        if (changelogPanel) changelogPanel.style.display = 'none';
    });

    // Автоматический показ списка изменений при обновлении версии
    browser.storage.local.get('fpToolsLastSeenVersion', ({ fpToolsLastSeenVersion }) => {
        if (fpToolsLastSeenVersion !== version) {
            if (changelogPanel) changelogPanel.style.display = 'block';
            browser.storage.local.set({ fpToolsLastSeenVersion: version });
        }
    });
});
