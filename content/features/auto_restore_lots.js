let _isCheckingRestoreLots = false;

async function checkAndRestoreLots() {
    if (_isCheckingRestoreLots) return;
    _isCheckingRestoreLots = true;

    try {
        const { foxenAutoRestoreEnabled, foxenAutoDisableEnabled } =
            await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get(['foxenAutoRestoreEnabled', 'foxenAutoDisableEnabled']);

        if (!foxenAutoRestoreEnabled && !foxenAutoDisableEnabled) return;

        const appData = JSON.parse(document.body?.dataset?.appData || '{}');
        const d = Array.isArray(appData) ? appData[0] : appData;
        const userId = d.userId;
        if (!userId) return;

        const profileRes = await fetch(`https://funpay.com/users/${userId}/`, { credentials: 'include' });
        if (!profileRes.ok) return;
        const profileHtml = await profileRes.text();

        const lots = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getUserLotsList', userId }, (res) => {
                resolve(res || []);
            });
        });

        if (!lots.length) return;

        const { foxenAutoDeliveryLots = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAutoDeliveryLots');

        // Parse HTML ONCE outside the loop to prevent allocating thousands of DOM Document trees in memory
        const lotDoc = new DOMParser().parseFromString(profileHtml, 'text/html');
        const lotStatusMap = new Map();
        lotDoc.querySelectorAll('a.tc-item[href*="id="]').forEach(lotEl => {
            const href = lotEl.getAttribute('href') || '';
            const m = href.match(/id=(\d+)/);
            if (!m) return;
            const isActive = !lotEl.closest('.offer')?.classList.contains('deactivated') &&
                             !lotEl.style.opacity?.includes('0.5');
            lotStatusMap.set(m[1], isActive);
        });

        for (const lot of lots) {
            const deliveryConfig = foxenAutoDeliveryLots[String(lot.id)];
            const isActive = lotStatusMap.get(String(lot.id));
            if (isActive === undefined) continue;

            if (deliveryConfig) {
                const productCount = deliveryConfig.productCount ?? Infinity;

                if (foxenAutoDisableEnabled && productCount === 0 && isActive &&
                    deliveryConfig.autoDisableEnabled !== false) {
                    await toggleLotActive(lot.id, lot.nodeId, false, d['csrf-token']);
                    showNotification(`Лот "${lot.title}" деактивирован: товары закончились`, false);
                    console.log(`Foxen AutoDisable: деактивирован лот ${lot.id}`);
                }

                if (foxenAutoRestoreEnabled && productCount > 0 && !isActive &&
                    deliveryConfig.autoRestoreEnabled !== false) {
                    await toggleLotActive(lot.id, lot.nodeId, true, d['csrf-token']);
                    showNotification(`Лот "${lot.title}" восстановлен: товары пополнены`, false);
                    console.log(`Foxen AutoRestore: восстановлен лот ${lot.id}`);
                }
            } else if (foxenAutoRestoreEnabled && !isActive) {
                await toggleLotActive(lot.id, lot.nodeId, true, d['csrf-token']);
                console.log(`Foxen AutoRestore: глобальное восстановление лота ${lot.id}`);
            }
        }
    } catch (e) {
        console.error('Foxen AutoRestore: ошибка', e.message);
    } finally {
        _isCheckingRestoreLots = false;
    }
}

async function toggleLotActive(offerId, nodeId, active, csrfToken) {
    const goldenKeyRes = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getGoldenKey' });
    if (!goldenKeyRes?.success) throw new Error('Нет golden_key');

    const editRes = await (typeof browser !== 'undefined' ? browser : chrome).runtime.sendMessage({ action: 'getLotForExport', nodeId, offerId: String(offerId) });
    if (!editRes?.success) throw new Error('Не удалось загрузить данные лота');

    const formData = new URLSearchParams(editRes.data);
    if (active) formData.set('active', 'on');
    else        formData.delete('active');
    formData.set('offer_id', String(offerId));
    formData.set('csrf_token', csrfToken);

    const res = await fetch('https://funpay.com/lots/offerSave', {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        credentials: 'include',
        body: formData
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.error !== 0 && result.error !== false) {
        throw new Error(result.msg || 'Ошибка API');
    }
}
