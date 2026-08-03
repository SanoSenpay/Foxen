/*
 * Foxen — хранилище заказов в IndexedDB.
 *
 * Зачем: раньше все заказы лежали одним объектом в chrome.storage.local,
 * который ограничен ~10 МБ. На ~18800 заказах квота кончалась
 * (Resource::kQuotaBytes quota exceeded) и сбор статистики падал.
 * IndexedDB такого лимита не имеет — туда влезают все 65к+ заказов.
 *
 * Экспортирует глобальный объект FPTFinanceDB со следующим API:
 *   await FPTFinanceDB.putOrders(arrayOfOrders)   — добавить/обновить заказы (ключ orderId)
 *   await FPTFinanceDB.getAllAsMap()              — { orderId: order, ... } (как старый foxenSalesData)
 *   await FPTFinanceDB.getAllAsArray()            — [order, ...]
 *   await FPTFinanceDB.count()                    — число заказов
 *   await FPTFinanceDB.getMeta(key)               — служебное значение (firstOrderId/lastOrderId/lastUpdate)
 *   await FPTFinanceDB.setMeta(key, value)
 *   await FPTFinanceDB.clearAll()                 — стереть всё
 *   (миграции нет — финансы раньше не хранились)
 */
(function (root) {
    'use strict';

    const DB_NAME = 'fxn-finance-db';
    const DB_VERSION = 1;
    const STORE_ORDERS = 'orders';
    const STORE_META = 'meta';

    let _dbPromise = null;

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
                        const os = db.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
                        os.createIndex('date', 'date', { unique: false });
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
                if (o && o.id != null) store.put(o);
            }
            await txDone(tx);
        } catch (e) {
            console.warn('Foxen: finance putOrders error:', e && e.message);
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
            console.warn('Foxen: finance getAllAsArray error:', e && e.message);
            return [];
        }
    }

    async function getAllAsMap() {
        const arr = await getAllAsArray();
        const map = {};
        for (const o of arr) map[o.id] = o;
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
            console.warn('Foxen: finance count error:', e && e.message);
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
            console.warn('Foxen: finance getMeta error:', e && e.message);
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
            console.warn('Foxen: finance setMeta error:', e && e.message);
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
            console.warn('Foxen: finance clearAll error:', e && e.message);
        }
    }

    async function migrateFromLocalStorage() {
        return 0;
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

    root.FXNFinanceDB = api;
    root.FPTFinanceDB = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
