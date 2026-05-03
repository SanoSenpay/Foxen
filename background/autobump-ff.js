// background/autobump-ff.js — Авто-поднятие лотов (адаптация для Firefox)

const BUMP_ALARM_NAME = 'fpToolsAutoBump';

async function logToConsole(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`[FP Tools AutoBump] ${logMessage}`);
    try {
        const tabs = await browser.tabs.query({ url: "*://funpay.com/*" });
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, {
                    action: 'logToAutoBumpConsole',
                    message: logMessage
                }).catch(e => {});
            });
        }
    } catch (error) {
        console.error("Error sending log message to content script:", error);
    }
}

// В Firefox DOMParser доступен прямо в фоне, поэтому offscreen-окно не требуется
function parseHtmlInBackground(html, action) {
    switch (action) {
        case 'parseUserCategories': return parseUserCategories(html);
        case 'parseSalesPage': return parseSalesPage(html);
        case 'parseChatList': return parseChatList(html);
        case 'parseUserLotsList': return parseUserLotsList(html);
        case 'parseGameSearchResults': return parseGameSearchResults(html);
        case 'parseCategoryPage': return parseCategoryPage(html);
        case 'parseLotListPage': return parseLotListPage(html);
        case 'parseLotEditPage': return parseLotEditPage(html);
        case 'parseOrderPageForReview': return parseOrderPageForReview(html);
        case 'parseUnconfirmedBalance': return parseUnconfirmedBalance(html);
        case 'parseBuyerHistory': return parseBuyerHistory(html);
        case 'parseOrderPageForDelivery': return parseOrderPageForDelivery(html);
        case 'parseSupportTickets': return parseSupportTickets(html);
        case 'parseSupportCategories': return parseSupportCategories(html);
        case 'parseSupportFields': return parseSupportFields(html);
        case 'parseSupportFormToken': return parseSupportFormToken(html);
        case 'parseOrdersPage': return parseOrdersPage(html);
        case 'parseTicketDetails': return parseTicketDetails(html);
        default: return null;
    }
}

async function getAuthDetails() {
    const goldenKeyCookie = await browser.cookies.get({ url: 'https://funpay.com', name: 'golden_key' });
    if (!goldenKeyCookie) throw new Error('Не удалось найти cookie "golden_key". Вы вошли в свой аккаунт FunPay?');
    const phpSessIdCookie = await browser.cookies.get({ url: 'https://funpay.com', name: 'PHPSESSID' });
    const phpsessidPart = phpSessIdCookie?.value ? `; PHPSESSID=${phpSessIdCookie.value}` : '';
    const cookies = `golden_key=${goldenKeyCookie.value}${phpsessidPart};`;

    const tabs = await browser.tabs.query({ url: "https://funpay.com/*" });
    if (tabs.length === 0) throw new Error("Не найдено открытых вкладок FunPay.");

    for (const tab of tabs) {
        try {
            const response = await browser.tabs.sendMessage(tab.id, { action: "getAppData" });
            if (response && response.success) {
                const parsedData = response.data;
                let appData;
                if (Array.isArray(parsedData) && parsedData.length > 0) appData = parsedData[0];
                else if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) appData = parsedData;
                else continue;

                const userId = appData.userId;
                const csrfToken = appData['csrf-token'];
                if (!userId || !csrfToken) continue;
                return { cookies, userId, csrfToken };
            }
        } catch (e) {
            console.warn(`Не удалось связаться с вкладкой ${tab.id}: ${e.message}`);
        }
    }
    throw new Error("Не удалось связаться ни с одной страницей FunPay.");
}

async function raiseCategory(categoryData, auth) {
    const { cookies, csrfToken } = auth;
    const { gameId, nodeId, categoryName } = categoryData;
    const initialData = new URLSearchParams({ game_id: gameId, node_id: nodeId });
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'X-Csrf-Token': csrfToken
    };
    let response = await fetch('https://funpay.com/lots/raise', { method: 'POST', headers, body: initialData.toString() });
    let responseText = await response.text();
    try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.modal) {
            const modalHtml = jsonResponse.modal;
            const checkboxRegex = /<div class="checkbox"[^>]*>.*?<input[^>]*value="(\d+)"/g;
            const nodeIds = Array.from(modalHtml.matchAll(checkboxRegex), match => match[1]);
            if (nodeIds.length > 0) {
                const multiRaiseData = new URLSearchParams();
                multiRaiseData.append('game_id', gameId);
                multiRaiseData.append('node_id', nodeId);
                nodeIds.forEach(id => multiRaiseData.append('node_ids[]', id));
                response = await fetch('https://funpay.com/lots/raise', { method: 'POST', headers, body: multiRaiseData.toString() });
                responseText = await response.text();
            } else {
                await logToConsole(`Не поднято: ${categoryName}. Причина: Нет подкатегорий.`);
                return false;
            }
        }
    } catch (e) {}
    if (responseText.includes('подняты') || responseText.includes('raised')) {
        await logToConsole(`Поднято: ${categoryName}`);
        return true;
    } else {
        let errorMsg = responseText;
        try { const errJson = JSON.parse(responseText); errorMsg = errJson.msg || JSON.stringify(errJson); }
        catch(e) { errorMsg = responseText.replace(/<[^>]*>/g, '').trim(); }
        await logToConsole(`Не поднято: ${categoryName}. Причина: ${errorMsg}`);
        return false;
    }
}

async function runBumpCycle() {
    try {
        const { fpToolsSelectiveBumpEnabled, fpToolsSelectedBumpCategories, fpToolsBumpOnlyAutoDelivery } =
            await browser.storage.local.get(['fpToolsSelectiveBumpEnabled', 'fpToolsSelectedBumpCategories', 'fpToolsBumpOnlyAutoDelivery']);
        const auth = await getAuthDetails();
        const userPageResponse = await fetch(`https://funpay.com/users/${auth.userId}/`, { headers: { 'Cookie': auth.cookies } });
        const userPageHtml = await userPageResponse.text();

        let categories = parseHtmlInBackground(userPageHtml, 'parseUserCategories');
        if (fpToolsBumpOnlyAutoDelivery) {
            await logToConsole(`Режим "Только автовыдача" активен.`);
            categories = categories.filter(cat => cat.hasAutoDelivery);
        }
        if (fpToolsSelectiveBumpEnabled && fpToolsSelectedBumpCategories && fpToolsSelectedBumpCategories.length > 0) {
            categories = categories.filter(cat => fpToolsSelectedBumpCategories.includes(cat.id));
        } else if (fpToolsSelectiveBumpEnabled) {
            await logToConsole("Выборочное поднятие включено, но категории не выбраны.");
            return;
        }
        let categoryUrls = categories.map(cat => new URL(cat.id, 'https://funpay.com/'));
        if (categoryUrls.length === 0) { await logToConsole("Нет категорий для поднятия."); return; }
        const categoryUrlHrefs = categoryUrls.map(url => url.href);
        for (const categoryUrl of categoryUrlHrefs) {
            const categoryPageResponse = await fetch(categoryUrl, { headers: { 'Cookie': auth.cookies } });
            const urlParts = categoryUrl.split('/');
            const guessedName = urlParts.length > 2 ? urlParts[urlParts.length - 2] : 'Неизвестная категория';
            if (!categoryPageResponse.ok) {
                await logToConsole(`Не поднято: ${guessedName}. Ошибка ${categoryPageResponse.status}.`);
                continue;
            }
            const categoryPageHtml = await categoryPageResponse.text();
            const categoryNameMatch = categoryPageHtml.match(/<span class="inside">([^<]+)<\/span>/);
            const categoryName = categoryNameMatch ? categoryNameMatch[1].trim() : guessedName;
            const raiseButtonRegex = /<button[^>]+class="[^"]*js-lot-raise[^"]*"[^>]*data-game="(\d+)"[^>]*data-node="([^"]+)"/;
            const raiseButtonMatch = categoryPageHtml.match(raiseButtonRegex);
            if (raiseButtonMatch) {
                await raiseCategory({ gameId: raiseButtonMatch[1], nodeId: raiseButtonMatch[2], categoryName }, auth);
            } else {
                await logToConsole(`Не поднято: ${categoryName}. Кнопка поднятия не найдена.`);
            }
            await new Promise(resolve => setTimeout(resolve, 4500));
        }
    } catch (error) {
        await logToConsole(`Ошибка: ${error.message}`);
    }
}

async function startAutoBump(cooldownMinutes) {
    await browser.alarms.create(BUMP_ALARM_NAME, { delayInMinutes: 1, periodInMinutes: parseInt(cooldownMinutes, 10) });
    await runBumpCycle();
}

async function stopAutoBump() {
    await browser.alarms.clear(BUMP_ALARM_NAME);
}
