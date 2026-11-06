// background/offscreen_helper.js - Foxen Cross-Browser Offscreen & Parser Helper
// Works in both Chrome MV3 Service Worker and Firefox Event/Background Page contexts.

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';
let _offscreenCreating = null;

export async function ensureOffscreenDocument() {
    const b = (typeof browser !== 'undefined' && browser.offscreen) ? browser : (typeof chrome !== 'undefined' ? chrome : null);
    if (!b || !b.offscreen || typeof b.offscreen.createDocument !== 'function') return;

    if (typeof b.offscreen.hasDocument === 'function') {
        const hasDoc = await b.offscreen.hasDocument();
        if (hasDoc) return;
    }

    if (_offscreenCreating) {
        await _offscreenCreating;
        return;
    }

    _offscreenCreating = b.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['DOM_PARSER'],
        justification: 'Foxen engine keepalive ping and DOM parsing'
    }).catch(err => {
        // Suppress benign concurrent creation error
        if (!err?.message?.includes('single offscreen document')) {
            console.error('Foxen: error creating offscreen document:', err);
        }
    }).finally(() => {
        _offscreenCreating = null;
    });

    await _offscreenCreating;
}

export async function parseHtmlViaOffscreen(html, action, extra = {}) {
    // 1. If running in an environment with the parser function loaded (e.g. Firefox background page / module)
    const scope = (typeof globalThis !== 'undefined' && typeof globalThis[action] === 'function')
        ? globalThis
        : ((typeof window !== 'undefined' && typeof window[action] === 'function') ? window : null);

    if (scope) {
        if (action === 'parseSellerLotPrice') {
            return scope[action](html, extra.offerId);
        } else if (action === 'solveCloneForm') {
            return scope[action](html, extra.attributes, extra.attributePairs);
        } else if (action === 'parseBuyerHistory') {
            return scope[action](html, extra.buyerUserId);
        } else {
            return scope[action](html);
        }
    }

    // 2. Chrome MV3 Service Worker: delegate to offscreen document
    await ensureOffscreenDocument();

    return new Promise((resolve, reject) => {
        const msgApi = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;
        msgApi.runtime.sendMessage({
            target: 'offscreen',
            action,
            html,
            ...extra
        }, response => {
            const err = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime.lastError : null;
            if (err) {
                return reject(new Error(err.message));
            }
            resolve(response);
        });
    });
}
