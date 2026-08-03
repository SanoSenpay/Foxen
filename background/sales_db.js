/*
 * Foxen — хранилище заказов в IndexedDB.
 *
 * Зачем: раньше все заказы лежали одним объектом в chrome.storage.local,
 * который ограничен ~10 МБ. На ~18800 заказах квота кончалась
 * (Resource::kQuotaBytes quota exceeded) и сбор статистики падал.
 * IndexedDB такого лимита не имеет — туда влезают все 65к+ заказов.
 *
 * Экспортирует глобальный объект FPTSalesDB со следующим API:
 *   await FPTSalesDB.putOrders(arrayOfOrders)   — добавить/обновить заказы (ключ orderId)
 *   await FPTSalesDB.getAllAsMap()              — { orderId: order, ... } (как старый foxenSalesData)
 *   await FPTSalesDB.getAllAsArray()            — [order, ...]
 *   await FPTSalesDB.count()                    — число заказов
 *   await FPTSalesDB.getMeta(key)               — служебное значение (firstOrderId/lastOrderId/lastUpdate)
 *   await FPTSalesDB.setMeta(key, value)
 *   await FPTSalesDB.clearAll()                 — стереть всё
 *   await FPTSalesDB.migrateFromLocalStorage()  — однократный перенос старых данных из chrome.storage.local
 */
(function (root) {
    'use strict';

    const DB_NAME = 'fxn-sales-db';
    const DB_VERSION = 1;
    const STORE_ORDERS = 'orders';
    const STORE_META = 'meta';

    let _dbPromise = null;
    let _migrationAttempted = false;

    function openDB() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise((resolve, reject) => {
            let req;
            try {
                req = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (err) {
                _dbPromise = null;
                reject(err);
                return;
            }
            req.onupgradeneeded = () => {
                try {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(STORE_ORDERS)) {
                        const os = db.createObjectStore(STORE_ORDERS, { keyPath: 'orderId' });
                        os.createIndex('orderDate', 'orderDate', { unique: false });
                    }
                    if (!db.objectStoreNames.contains(STORE_META)) {
                        db.createObjectStore(STORE_META, { keyPath: 'k' });
                    }
                } catch (err) {
                    _dbPromise = null;
                    reject(err);
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => { db.close(); _dbPromise = null; };
                db.onclose = () => { _dbPromise = null; };
                resolve(db);
            };
            req.onerror = (ev) => {
                _dbPromise = null;
                reject((req && req.error) || (ev && ev.target && ev.target.error) || new Error('IndexedDB open error'));
            };
            req.onblocked = () => {
                _dbPromise = null;
                reject(new Error('IndexedDB open blocked'));
            };
        });
        _dbPromise.catch(() => { _dbPromise = null; });
        return _dbPromise;
    }

    function txDone(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onabort = () => reject(tx.error || new Error('tx aborted'));
            tx.onerror = () => reject(tx.error);
        });
    }

    async function putOrders(orders) {
        if (!orders || !orders.length) return;
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_ORDERS, 'readwrite');
            const store = tx.objectStore(STORE_ORDERS);
            for (const o of orders) {
                if (o && typeof o.orderId === 'string') store.put(o);
            }
            await txDone(tx);
        } catch (e) {
            console.warn('Foxen: putOrders error:', e && e.message);
        }
    }

    async function getAllAsArray() {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_ORDERS, 'readonly');
                const req = tx.objectStore(STORE_ORDERS).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error || new Error('getAll error'));
                tx.onerror = () => reject(tx.error || new Error('tx error'));
            });
        } catch (e) {
            console.warn('Foxen: getAllAsArray error:', e && e.message);
            return [];
        }
    }

    async function getAllAsMap() {
        const arr = await getAllAsArray();
        const map = {};
        for (const o of arr) map[o.orderId] = o;
        return map;
    }

    async function count() {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_ORDERS, 'readonly');
                const req = tx.objectStore(STORE_ORDERS).count();
                req.onsuccess = () => resolve(req.result || 0);
                req.onerror = () => reject(req.error || new Error('count error'));
                tx.onerror = () => reject(tx.error || new Error('tx error'));
            });
        } catch (e) {
            console.warn('Foxen: count error:', e && e.message);
            return 0;
        }
    }

    async function getMeta(key) {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_META, 'readonly');
                const req = tx.objectStore(STORE_META).get(key);
                req.onsuccess = () => resolve(req.result ? req.result.v : null);
                req.onerror = () => reject(req.error || new Error('getMeta error'));
                tx.onerror = () => reject(tx.error || new Error('tx error'));
            });
        } catch (e) {
            console.warn('Foxen: getMeta error:', e && e.message);
            return null;
        }
    }

    async function setMeta(key, value) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_META, 'readwrite');
            tx.objectStore(STORE_META).put({ k: key, v: value });
            await txDone(tx);
        } catch (e) {
            console.warn('Foxen: setMeta error:', e && e.message);
        }
    }

    async function clearAll() {
        try {
            const db = await openDB();
            const tx = db.transaction([STORE_ORDERS, STORE_META], 'readwrite');
            tx.objectStore(STORE_ORDERS).clear();
            tx.objectStore(STORE_META).clear();
            await txDone(tx);
        } catch (e) {
            console.warn('Foxen: clearAll error:', e && e.message);
        }
    }

    // Однократный перенос старых данных из chrome.storage.local в IndexedDB.
    // Возвращает число перенесённых заказов. Если в IndexedDB уже что-то есть
    // или мигрировать нечего — возвращает 0 и ничего не трогает.
    async function migrateFromLocalStorage() {
        if (_migrationAttempted) return 0;
        _migrationAttempted = true;

        try {
            const flag = await getMeta('migratedFromLocal');
            if (flag) return 0;

            const already = await count();
            if (already > 0) { await setMeta('migratedFromLocal', true); return 0; }

            const data = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get([
                'foxenSalesData', 'foxenFirstOrderId', 'foxenLastOrderId', 'foxenSalesLastUpdate'
            ]);
            const old = data.foxenSalesData;
            if (!old || typeof old !== 'object') { await setMeta('migratedFromLocal', true); return 0; }

            const orders = Object.values(old).filter(o => o && typeof o.orderId === 'string');
            if (orders.length) await putOrders(orders);

            if (data.foxenFirstOrderId) await setMeta('firstOrderId', data.foxenFirstOrderId);
            if (data.foxenLastOrderId) await setMeta('lastOrderId', data.foxenLastOrderId);
            if (data.foxenSalesLastUpdate) await setMeta('lastUpdate', data.foxenSalesLastUpdate);
            await setMeta('migratedFromLocal', true);

            // Освобождаем квоту: убираем гигантский объект из storage.local.
            // Оставляем lastUpdate как маленькое значение для обратной совместимости UI.
            try {
                await (typeof browser !== 'undefined' ? browser : chrome).storage.local.remove(['foxenSalesData', 'foxenFirstOrderId', 'foxenLastOrderId']);
            } catch (_) {}

            console.log(`Foxen: перенесено ${orders.length} заказов из storage.local в IndexedDB. Квота освобождена.`);
            return orders.length;
        } catch (e) {
            console.warn('Foxen: миграция заказов в IndexedDB не удалась:', e && e.message);
            return 0;
        }
    }

    const api = {
        putOrders,
        getAllAsArray,
        getAllAsMap,
        count,
        getMeta,
        setMeta,
        clearAll,
        migrateFromLocalStorage,
    };

    root.FXNSalesDB = api;
    root.FPTSalesDB = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
