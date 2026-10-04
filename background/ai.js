const VERCEL_API_URL = 'https://ai.foxen.site/api/ai'; 
const API_SECRET_KEY = 'fptoolsdim';

const SYSTEM_PROMPT = 'Ты — профессиональный ИИ-ассистент и опытный копирайтер для продавцов на игровой торговой площадке FunPay. Ты создаешь лаконичные, живые, грамотные и продающие тексты без рекламных клише, водянистых вступлений и фальшивого пафоса. Твои ответы звучат естественно, по делу и вызывают доверие покупателей.';

/**
 * Удаляет сторонние контакты (Telegram юзернеймы/ссылки, Discord, VK, телефоны)
 * во избежание бана аккаунта пользователя на FunPay.
 */
function stripExternalContacts(t) {
    if (typeof t !== 'string') return t;
    return t
        // 1. Прямые ссылки t.me/..., telegram.me/..., tg://...
        .replace(/(?:https?:\/\/)?(?:t\.me|telegram\.me|tg:\/\/)[^\s\n]+/gi, '')
        // 2. Ссылки Discord, VK, WhatsApp, Viber
        .replace(/(?:https?:\/\/)?(?:discord\.(?:gg|com\/invite)|vk\.com|wa\.me|viber\:\/\/)[^\s\n]+/gi, '')
        // 3. Упоминания "тг/tg/telegram/дискорд/discord/вк/vk" с юзернеймом или телефоном
        .replace(/(?:связь|писать|пишите|мой|наш)?\s*(?:в|через|по)?\s*(?:тг|tg|telegram|дискорд|discord|вк|vk|вайбер|viber|ватсап|whatsapp)\s*[:\-=]?\s*@?[a-zA-Z0-9_\.]{3,}/gi, '')
        // 4. Юзернеймы Telegram вида @username (буквы, цифры, подчёркивание от 4 до 32 символов)
        .replace(/@([a-zA-Z0-9_]{4,32})/g, '')
        // 5. Повторные пустые пробелы
        .replace(/ {2,}/g, ' ')
        .trim();
}

/**
 * Нормализация текста от ИИ: вырезает сторонние контакты, удаляет лишние пустые строки и обрезает пробелы.
 */
function fxnNorm(t) {
    if (typeof t !== 'string') return t;
    const sanitized = stripExternalContacts(t);
    return sanitized
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Очистка сырой строки ответа ИИ от markdown-обёрток и лишнего текста вокруг JSON.
 */
function cleanJsonString(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let str = raw.trim();

    // 1. Убираем markdown code blocks (```json ... ``` или ``` ... ```)
    str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Если вокруг JSON есть сопроводительный текст, извлекаем границы {...} или [...]
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = str.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endIdx = str.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        str = str.slice(startIdx, endIdx + 1);
    }

    return str;
}

/**
 * Очистка и нормализация перевода: удаляет markdown-обёртки, случайные кавычки и вступительные фразы,
 * а также гарантирует безупречную капитализацию первых букв предложений и слов после знаков (. ! ? \n).
 */
function cleanTranslationOutput(text) {
    if (!text || typeof text !== 'string') return '';
    let res = text.trim();

    // 1. Убираем markdown code blocks (``` ... ```)
    res = res.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Убираем внешние кавычки вокруг всего текста, если ИИ обернул ответ
    if ((res.startsWith('"') && res.endsWith('"')) ||
        (res.startsWith("'") && res.endsWith("'")) ||
        (res.startsWith('«') && res.endsWith('»')) ||
        (res.startsWith('“') && res.endsWith('”'))) {
        res = res.slice(1, -1).trim();
    }

    // 3. Убираем случайные вступительные префиксы
    res = res.replace(/^(?:Translation|Перевод|Translated text|Output):\s*/i, '');

    // 4. Гарантируем заглавную букву в начале текста
    res = res.replace(/^[\s\p{P}]*[\p{Ll}]/u, m => m.toUpperCase());

    // 5. Гарантируем заглавную букву после знаков завершения мысли (. ! ? \n) с пробелом
    res = res.replace(/([.!?\n]\s+[^\p{L}\p{N}]*)([\p{Ll}])/gu, (m, p1, p2) => p1 + p2.toUpperCase());

    return res.trim();
}

/**
 * Экранирует недопустимые управляющие символы (0x00..0x1F, включая сырые переносы строк \n, \r, \t)
 * внутри строковых литералов JSON.
 */
function escapeControlCharsInJson(str) {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (escaped) {
                result += char;
                escaped = false;
            } else if (char === '\\') {
                result += char;
                escaped = true;
            } else if (char === '"') {
                inString = false;
                result += char;
            } else if (char === '\n') {
                result += '\\n';
            } else if (char === '\r') {
                if (i + 1 < str.length && str[i + 1] === '\n') {
                    continue; // Пропускаем \r в \r\n, \n будет экранирован следующим
                }
                result += '\\r';
            } else if (char === '\t') {
                result += '\\t';
            } else if (char.charCodeAt(0) < 0x20) {
                result += '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
            } else {
                result += char;
            }
        } else {
            if (char === '"') {
                inString = true;
            }
            result += char;
        }
    }
    return result;
}

/**
 * Удаляет висячие запятые перед закрывающими фигурными/квадратными скобками.
 */
function removeTrailingCommas(str) {
    return str.replace(/,\s*([\}\]])/g, '$1');
}

/**
 * Fallback-парсер для полей лота (title, description, buyerMessage) на случай,
 * если ИИ вернул текст с грубыми ошибками синтаксиса JSON (например, неэкранированные внутренние кавычки).
 */
function fallbackExtractLotFields(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const res = {};

    const titleMatch = raw.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (titleMatch) {
        res.title = titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    const bmMatch = raw.match(/"buyerMessage"\s*:\s*"([\s\S]*?)"\s*[\},]/);
    if (bmMatch) {
        res.buyerMessage = bmMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
        res.buyerMessage = '';
    }

    const descToBmMatch = raw.match(/"description"\s*:\s*"([\s\S]*?)"\s*,\s*"buyerMessage"/);
    if (descToBmMatch) {
        res.description = descToBmMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
        const descGeneralMatch = raw.match(/"description"\s*:\s*"([\s\S]*?)"\s*[\},]/);
        if (descGeneralMatch) {
            res.description = descGeneralMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    }

    if (res.title || res.description) {
        return res;
    }
    return null;
}

/**
 * Надёжный парсер JSON от ИИ с последовательным устранением типичных проблем:
 * 1. Очистка от markdown
 * 2. Экранирование сырых control characters (переносов строк \n в строках)
 * 3. Удаление висячих запятых
 * 4. Fallback-извлечение полей
 */
export function parseAIJson(rawText, fallbackFieldExtractor = null) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Пустой ответ от ИИ');
    }

    const cleaned = cleanJsonString(rawText);

    // Попытка 1: стандартный парсинг очищенной строки
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // Попытка 2: экранирование управляющих символов и сырых переводов строк
    const escaped = escapeControlCharsInJson(cleaned);
    try {
        return JSON.parse(escaped);
    } catch (_) {}

    // Попытка 3: удаление висячих запятых
    const noTrailing = removeTrailingCommas(escaped);
    try {
        return JSON.parse(noTrailing);
    } catch (e) {
        // Попытка 4: fallback extractor
        if (typeof fallbackFieldExtractor === 'function') {
            const fallbackResult = fallbackFieldExtractor(rawText);
            if (fallbackResult) {
                return fallbackResult;
            }
        }
        throw e;
    }
}

// ---------------------------------------------------------------------------
// USER PROVIDER: read settings from storage
// ---------------------------------------------------------------------------
async function getUserAIProvider() {
    const { foxenAIProvider = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAIProvider');
    return foxenAIProvider;
}

// ---------------------------------------------------------------------------
// makeAIRequestViaUserKey — direct call to user's chosen provider
// ---------------------------------------------------------------------------
// SMART MODEL CASCADE & RATE-LIMIT COOLDOWN SYSTEM
// ---------------------------------------------------------------------------

const GEMINI_CASCADE_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-flash-latest',
    'gemini-2.5-pro'
];

const OPENROUTER_CASCADE_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-2.5-flash:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'google/gemini-flash-1.5:free'
];

const OPENAI_CASCADE_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'chatgpt-4o-latest'
];

// In-memory model cooldown tracking (resets per browser session / expires on TTL)
// Key: `${provider}:${model}`, Value: { expiresAt: number, reason: string }
const _modelCooldowns = new Map();

function getModelCooldownKey(provider, model) {
    return `${provider}:${model}`.toLowerCase();
}

function isModelOnCooldown(provider, model) {
    const key = getModelCooldownKey(provider, model);
    const entry = _modelCooldowns.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
        _modelCooldowns.delete(key);
        return false;
    }
    return true;
}

function setModelCooldown(provider, model, errorMsg = '') {
    const key = getModelCooldownKey(provider, model);
    const msg = String(errorMsg || '').toLowerCase();
    const isDaily = msg.includes('daily') || msg.includes('per day') || msg.includes('rpd');
    const isOverload = msg.includes('overload') || msg.includes('503') || msg.includes('temporarily');
    const isNotFound = msg.includes('not found') || msg.includes('404') || msg.includes('is not supported');

    // Кулдаун для предотвращения спама в модель с исчерпанными лимитами:
    // • Суточный лимит (RPD): 20 минут паузы
    // • Модель не найдена / устарела (404): 12 часов
    // • Перегрузка серверов Google (503): 20 секунд
    // • Минутный лимит (RPM 429): 60 секунд (период сброса квоты Google AI Studio)
    const durationMs = isNotFound ? 12 * 60 * 60 * 1000 : (isDaily ? 20 * 60 * 1000 : (isOverload ? 20 * 1000 : 60 * 1000));
    _modelCooldowns.set(key, {
        expiresAt: Date.now() + durationMs,
        reason: isDaily ? 'daily_quota' : (isNotFound ? 'unsupported' : (isOverload ? 'overload' : 'rate_limit'))
    });
    console.warn(`[Foxen AI] Модель ${provider}/${model} временно на паузе (${Math.round(durationMs / 1000)}с). Причина: ${errorMsg}`);
}

function clearModelCooldown(provider, model) {
    _modelCooldowns.delete(getModelCooldownKey(provider, model));
}

/**
 * Извлечение чистого текста из ответа Gemini API с фильтрацией внутренних мыслей (thought)
 * в моделях линейки Gemini 2.0 / 2.5 / 3.x
 */
function extractGeminiText(json) {
    const candidate = json?.candidates?.[0];
    if (!candidate?.content?.parts) return null;
    const parts = candidate.content.parts;

    // 1. Отбираем части ответа, не являющиеся скрытыми мыслями рассуждения
    const nonThoughtParts = parts
        .filter(p => !p.thought && typeof p.text === 'string')
        .map(p => p.text.trim())
        .filter(Boolean);

    if (nonThoughtParts.length > 0) {
        return nonThoughtParts.join('\n');
    }

    // 2. Резервный сбор любого текста из parts
    const allParts = parts
        .filter(p => typeof p.text === 'string')
        .map(p => p.text.trim())
        .filter(Boolean);

    return allParts.join('\n') || null;
}

/**
 * Формирует упорядоченный список моделей для каскада:
 * Сначала модели без активного кулдауна, затем (если все исчерпаны) с наименьшим оставшимся временем кулдауна.
 */
function buildOrderedModelCascade(provider, userPreferredModel) {
    let baseList = [];
    if (provider === 'gemini') baseList = GEMINI_CASCADE_MODELS;
    else if (provider === 'openrouter') baseList = OPENROUTER_CASCADE_MODELS;
    else if (provider === 'openai') baseList = OPENAI_CASCADE_MODELS;

    const candidates = [];
    const preferred = (userPreferredModel || '').trim();
    if (preferred) {
        candidates.push(preferred);
    }
    for (const m of baseList) {
        if (!candidates.includes(m)) {
            candidates.push(m);
        }
    }

    // Разделяем на доступные и те, у которых сейчас активен Rate Limit / Cooldown
    const available = candidates.filter(m => !isModelOnCooldown(provider, m));
    const onCooldown = candidates.filter(m => isModelOnCooldown(provider, m)).sort((a, b) => {
        const tA = _modelCooldowns.get(getModelCooldownKey(provider, a))?.expiresAt || 0;
        const tB = _modelCooldowns.get(getModelCooldownKey(provider, b))?.expiresAt || 0;
        return tA - tB;
    });

    return [...available, ...onCooldown];
}

// ---------------------------------------------------------------------------
// makeAIRequestViaUserKey — direct call to user's chosen provider with SMART CASCADE
// Returns { success, data, source, usedModel } or throws on fatal error
// ---------------------------------------------------------------------------
async function makeAIRequestViaUserKey(provider, apiKey, model, finalPrompt, customSystemPrompt = null) {
    const sysPrompt = customSystemPrompt || SYSTEM_PROMPT;
    const modelsToTry = buildOrderedModelCascade(provider, model);
    const errorsCollected = [];

    // --- 1. GOOGLE GEMINI CASCADE ---
    if (provider === 'gemini') {
        for (const mdl of modelsToTry) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`;
                const body = {
                    system_instruction: { parts: [{ text: sysPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: finalPrompt.trim() }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
                    const errStatus = errJson?.error?.status || '';

                    // Фатальная ошибка: недействительный API-ключ Gemini (смена модели не поможет)
                    if (
                        res.status === 400 &&
                        (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID') || errStatus === 'INVALID_ARGUMENT') &&
                        !errMsg.includes('model')
                    ) {
                        throw new Error(`Недействительный API-ключ Gemini: ${errMsg}`);
                    }
                    if (res.status === 403 && (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('key has expired'))) {
                        throw new Error(`Доступ запрещен для API-ключа Gemini: ${errMsg}`);
                    }

                    // Лимит исчерпан (429 / RESOURCE_EXHAUSTED), модель перегружена (503) или недоступна (404/500):
                    // Ставим модель на кулдаун и мгновенно переключаемся на следующую модель в каскаде!
                    setModelCooldown('gemini', mdl, errMsg);
                    errorsCollected.push(`${mdl} (${res.status}): ${errMsg}`);
                    console.info(`[Foxen AI] Модель ${mdl} исчерпала лимиты или недоступна (${res.status}). Умное переключение на следующую модель...`);
                    continue;
                }

                const json = await res.json();
                const text = extractGeminiText(json);
                if (!text) {
                    errorsCollected.push(`${mdl}: пустой ответ`);
                    setModelCooldown('gemini', mdl, 'пустой ответ');
                    continue;
                }

                // Успех! Очищаем кулдаун и возвращаем результат с указанием рабочей модели
                clearModelCooldown('gemini', mdl);
                return { success: true, data: text.trim(), source: 'gemini', usedModel: mdl };

            } catch (err) {
                if (err.name === 'AbortError') {
                    errorsCollected.push(`${mdl}: таймаут (25с)`);
                    setModelCooldown('gemini', mdl, 'таймаут 25с');
                    continue;
                }
                if (err.message && (err.message.includes('Недействительный API-ключ') || err.message.includes('Доступ запрещен'))) {
                    throw err;
                }
                errorsCollected.push(`${mdl}: ${err.message}`);
                setModelCooldown('gemini', mdl, err.message);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        throw new Error(`Все модели Gemini исчерпали лимиты или временно недоступны [${errorsCollected.join(' | ')}]`);
    }

    // --- 2. OPENROUTER CASCADE ---
    if (provider === 'openrouter') {
        for (const mdl of modelsToTry) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            try {
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://funpay.com',
                        'X-Title': 'Foxen Extension'
                    },
                    body: JSON.stringify({
                        model: mdl,
                        messages: [
                            { role: 'system', content: sysPrompt },
                            { role: 'user', content: finalPrompt.trim() }
                        ],
                        temperature: 0.7,
                        max_tokens: 2048
                    }),
                    signal: controller.signal
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    const errMsg = err?.error?.message || `HTTP ${res.status}`;

                    if (res.status === 401) {
                        throw new Error(`Недействительный API-ключ OpenRouter: ${errMsg}`);
                    }

                    // Rate limit (429) или ошибка провайдера бесплатной модели -> переключаемся на следующую
                    setModelCooldown('openrouter', mdl, errMsg);
                    errorsCollected.push(`${mdl} (${res.status}): ${errMsg}`);
                    console.info(`[Foxen AI] OpenRouter модель ${mdl} исчерпала лимиты. Пробую следующую модель в каскаде...`);
                    continue;
                }

                const json = await res.json();
                const text = json?.choices?.[0]?.message?.content;
                if (!text) {
                    errorsCollected.push(`${mdl}: пустой ответ`);
                    continue;
                }

                clearModelCooldown('openrouter', mdl);
                return { success: true, data: text.trim(), source: 'openrouter', usedModel: mdl };

            } catch (err) {
                if (err.name === 'AbortError') {
                    errorsCollected.push(`${mdl}: таймаут (25с)`);
                    setModelCooldown('openrouter', mdl, 'таймаут 25с');
                    continue;
                }
                if (err.message && err.message.includes('Недействительный API-ключ')) {
                    throw err;
                }
                errorsCollected.push(`${mdl}: ${err.message}`);
                setModelCooldown('openrouter', mdl, err.message);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        throw new Error(`Все модели OpenRouter исчерпали лимиты [${errorsCollected.join(' | ')}]`);
    }

    // --- 3. OPENAI CASCADE ---
    if (provider === 'openai') {
        for (const mdl of modelsToTry) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: mdl,
                        messages: [
                            { role: 'system', content: sysPrompt },
                            { role: 'user', content: finalPrompt.trim() }
                        ],
                        temperature: 0.7,
                        max_tokens: 2048
                    }),
                    signal: controller.signal
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    const errMsg = err?.error?.message || `HTTP ${res.status}`;

                    if (res.status === 401) {
                        throw new Error(`Недействительный API-ключ OpenAI: ${errMsg}`);
                    }

                    setModelCooldown('openai', mdl, errMsg);
                    errorsCollected.push(`${mdl} (${res.status}): ${errMsg}`);
                    console.info(`[Foxen AI] OpenAI модель ${mdl} вернула ошибку. Пробую следующую...`);
                    continue;
                }

                const json = await res.json();
                const text = json?.choices?.[0]?.message?.content;
                if (!text) {
                    errorsCollected.push(`${mdl}: пустой ответ`);
                    continue;
                }

                clearModelCooldown('openai', mdl);
                return { success: true, data: text.trim(), source: 'openai', usedModel: mdl };

            } catch (err) {
                if (err.name === 'AbortError') {
                    errorsCollected.push(`${mdl}: таймаут (25с)`);
                    setModelCooldown('openai', mdl, 'таймаут 25с');
                    continue;
                }
                if (err.message && err.message.includes('Недействительный API-ключ')) {
                    throw err;
                }
                errorsCollected.push(`${mdl}: ${err.message}`);
                setModelCooldown('openai', mdl, err.message);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        throw new Error(`Все модели OpenAI исчерпали квоту или лимиты [${errorsCollected.join(' | ')}]`);
    }

    throw new Error('Неизвестный провайдер: ' + provider);
}

// ---------------------------------------------------------------------------
// makeAIRequest — main entry point. Tries user key first, falls back to Foxen
// ---------------------------------------------------------------------------
async function makeAIRequest(finalPrompt, customSystemPrompt = null) {
    // 1. Try user's own API key if configured
    const userProv = await getUserAIProvider();
    if (userProv.provider && userProv.apiKey) {
        try {
            const result = await makeAIRequestViaUserKey(
                userProv.provider, userProv.apiKey, userProv.model || '', finalPrompt, customSystemPrompt
            );
            return result; // { success, data, source: 'gemini'/'openai'/'openrouter' }
        } catch (e) {
            console.warn(`Foxen AI: ошибка провайдера ${userProv.provider}: ${e.message}. Переключаюсь на Foxen-сервер.`);
            // fall through to Foxen server
        }
    }

    // 2. Fallback: Foxen server (current behaviour)
    if (VERCEL_API_URL.includes('YOUR_VERCEL_PROJECT_NAME')) {
        return { success: false, error: "URL сервера не настроен в background/ai.js" };
    }

    const sysPrompt = customSystemPrompt || SYSTEM_PROMPT;

    const payload = {
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: finalPrompt.trim() }],
        modelName: "ChatGPT 4o",
        currentPagePath: "/chatgpt-4o"
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        let response;
        try {
            response = await fetch(VERCEL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_SECRET_KEY}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const rawDetails = errorData.details || errorData.error || '';
            const details = errorData.error || errorData.details || `HTTP ${response.status} ${response.statusText}`;
            console.error(`AI Server Error:`, errorData);

            if (String(rawDetails).includes('daily free allocation') || response.status === 503) {
                return {
                    success: false,
                    error: `Дневной лимит общего сервера ИИ временно исчерпан. Подключите свой бесплатный ключ Gemini или OpenRouter в Настройках Foxen (раздел «ИИ / API ключи»), чтобы ИИ работал всегда и без ограничений.`
                };
            }
            
            if (response.status >= 500) {
                 return { 
                    success: false, 
                    error: `Сервер ИИ временно перегружен (${details}). Вы можете указать свой ключ в Настройках Foxen → ИИ.` 
                };
            }
            return { success: false, error: `Ошибка ИИ: ${details}` };
        }

        const result = await response.json();
        
        if (result && result.response) {
            return { success: true, data: result.response.trim(), source: 'foxen' };
        } else {
            return { success: false, error: 'AI response format is incorrect or empty.' };
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('AI request timed out');
            return { success: false, error: 'ИИ не ответил вовремя (таймаут). Попробуйте ещё раз.' };
        }
        console.error(`Network error during AI request: ${error.message}`);
        return { success: false, error: `Сетевая ошибка: ${error.message}. Проверьте подключение к интернету.` };
    }
}

// ---------------------------------------------------------------------------
// Public API — unchanged signatures, source field added to return value
// ---------------------------------------------------------------------------

export async function fetchAIResponse(textForAI, context, myUsername, type = "rewrite") {
    let finalPrompt;

    if (type === 'time_calc') {
        // Token-light: краткий промпт, краткий ответ. Подаётся как «калькулятор».
        finalPrompt = `Реши задачу на расчёт времени. Сложи/вычти интервалы по описанию и дай короткий понятный ответ на русском (1-3 предложения, без лишних слов, без markdown). Если есть диапазон - укажи диапазон.\n\nЗадача: ${textForAI}`;

    } else if (type === 'review_reply') {
        const lotName = textForAI;
        const reviewText = context;

        finalPrompt = `
Ты — вежливый, позитивный продавец "${myUsername}" на бирже FunPay. Покупатель оставил отзыв.
Товар: ${lotName}
Отзыв покупателя: "${reviewText}"

Напиши короткий, теплый и искренний ответ на отзыв (ровно 1-2 коротких предложения).
ПРАВИЛА:
1. Поблагодари за покупку и доверие.
2. Пожелай приятной игры / удачного использования.
3. Добавь 1-2 уместных эмодзи (🎮, ✨, 😊, 👍).
4. Обязательно упомяни название товара: ${lotName}
5. Без клише вроде "Спасибо за покупку нашего товара", пиши живо и по-человечески.
6. Без Markdown, без кавычек, без лишних вступлений.

ГОТОВЫЙ ТЕКСТ:`;

    } else if (type === 'feature_match') {
        // textForAI = freeform user request ("что мне не нужно")
        // context   = JSON string array of { id, label, desc }
        finalPrompt = `
Ты - помощник внутри браузерного расширения Foxen. Пользователь описывает своими словами, какие функции/кнопки расширения ему НЕ нужны и он хочет их отключить.

Вот полный список доступных функций (JSON, поля: id, label, desc):
${context}

Запрос пользователя: "${textForAI}"

Твоя задача: определить, какие функции из списка пользователь, вероятно, хочет ОТКЛЮЧИТЬ, исходя из его запроса. Сопоставляй по смыслу (label + desc), а не только по точным словам.

Верни СТРОГО валидный JSON-массив объектов, без какого-либо текста вокруг, без Markdown, без \`\`\`. Формат каждого объекта:
{"id": "<id функции из списка>", "confidence": <число 0..1>, "reason": "<очень короткое пояснение на русском, почему подходит>"}

Правила:
1. Включай только функции, которые реально соответствуют запросу. Если пользователь явно назвал что-то - confidence ближе к 1. Если только косвенно подразумевается - ниже.
2. Не выдумывай id, которых нет в списке.
3. Если ничего не подходит - верни пустой массив [].
4. Никаких комментариев, только JSON-массив.

JSON:`;

    } else if (type === 'translate_to_russian') {
        const translateSysPrompt = `Ты — профессиональный лингвист и игровой переводчик для торговой биржи FunPay. Твоя задача: делать безупречный, живой, вежливый и грамматически точный перевод на русский язык с соблюдением правил пунктуации и регистра (заглавные буквы в начале предложений и после знаков . ! ?).`;
        finalPrompt = `Переведи следующий текст на русский язык.

ПРАВИЛА КАЧЕСТВА:
1. ПУНКТУАЦИЯ И РЕГИСТР: Каждое предложение ОБЯЗАТЕЛЬНО начинай с заглавной буквы. После знаков завершения мысли (. ! ?) следующее слово ВСЕГДА пиши с заглавной буквы (например: "Привет! как твои дела?" -> "Привет! Как твои дела?"). Исправляй небрежный строчный регистр оригинала при необходимости.
2. ЕСТЕСТВЕННЫЙ ЖИВОЙ ТОН: Перевод должен звучать органично и вежливо для общения покупателя и продавца на торговой бирже FunPay.
3. ИГРОВОЙ КОНТЕКСТ: Сохраняй игровую терминологию, сленг, эмодзи, ссылки, теги, числа и переносы строк.
4. ЧИСТЫЙ ВЫВОД: Верни ТОЛЬКО готовый переведённый текст без каких-либо вводных слов, пояснений, кавычек или markdown-блоков.

Оригинальный текст:
${textForAI}`;

        const res = await makeAIRequest(finalPrompt, translateSysPrompt);
        if (res && res.success && typeof res.data === 'string') {
            res.data = cleanTranslationOutput(res.data);
        }
        return res;

    } else if (type === 'translate') {
        const targetLangCode = (context || 'en').toLowerCase().trim();
        const LANG_NAMES = {
            'en': 'английский (English)',
            'ru': 'русский (Russian)',
            'es': 'испанский (Español)',
            'de': 'немецкий (Deutsch)',
            'zh': 'китайский (Chinese)',
            'tr': 'турецкий (Türkçe)',
            'fr': 'французский (Français)',
            'it': 'итальянский (Italiano)',
            'pl': 'польский (Polski)',
            'uk': 'украинский (Ukrainian)',
            'pt': 'португальский (Português)',
            'ja': 'японский (Japanese)'
        };
        const langName = LANG_NAMES[targetLangCode] || targetLangCode;
        const translateSysPrompt = `Ты — высококлассный профессиональный переводчик для международной торговой биржи FunPay. Твоя цель — делать живой, естественный, вежливый и грамматически безупречный перевод на ${langName}. Ты строго соблюдаешь типографику и правила пунктуации целевого языка (заглавные буквы в начале предложений и после знаков . ! ?), даже если в исходном сообщении пользователя были опечатки или строчный регистр.`;

        finalPrompt = `Переведи следующее сообщение на язык: ${langName}.

СТРОГИЕ ПРАВИЛА КАЧЕСТВА:
1. ПУНКТУАЦИЯ И РЕГИСТР: Каждое новое предложение ОБЯЗАНО начинаться с заглавной буквы. После знаков завершения мысли (. ! ?) следующее предложение ВСЕГДА начинается с заглавной буквы (строгий пример: "Привет! как твои дела?" -> "Hi! How are you?", а НЕ "Hi! how are you?"). Автоматически исправляй небрежный строчный регистр оригинала.
2. ЕСТЕСТВЕННЫЙ СТИЛЬ: Перевод должен звучать естественно, чисто и вежливо для носителя языка, избегай топорного машинного подстрочника.
3. ИГРОВОЙ КОНТЕКСТ: Сохраняй терминологию биржи FunPay (аккаунт, логин, пароль, почта, привязка/перепривязка, код подтверждения, гарантия, передача товара, лот, подтверждение заказа, отзыв и т.д.).
4. СОХРАННОСТЬ ДАННЫХ: Не изменяй эмодзи, ссылки, спецсимволы, цены, числа, коды и структуру переносов строк.
5. ТОЛЬКО ГОТОВЫЙ ТЕКСТ: Верни ИСКЛЮЧИТЕЛЬНО переведённый текст. Категорически запрещены любые вступительные фразы ("Перевод:", "Translation:"), комментарии, кавычки вокруг текста и markdown-блоки.

Оригинальный текст:
${textForAI}`;

        const res = await makeAIRequest(finalPrompt, translateSysPrompt);
        if (res && res.success && typeof res.data === 'string') {
            res.data = cleanTranslationOutput(res.data);
        }
        return res;

    } else if (type === 'lot_audit_raw') {
        // Pass the full constructed prompt directly - no wrapping
        finalPrompt = textForAI;

    } else if (type === 'lot_audit') {
        // For lot_audit, context contains the full system prompt, textForAI is the user message
        // Build multi-turn conversation from context
        finalPrompt = `${context}\n\nСообщение продавца: ${textForAI}\n\nОтветь на русском языке кратко и по существу.`;

    } else { // Логика по умолчанию для переписывания текста в чате
        finalPrompt = `
Ты — опытный продавец "${myUsername}" на игровой бирже FunPay. Твоя задача — улучшить черновик сообщения продавца, сделав его грамотным, вежливым, уверенным и кристально понятным покупателю.

--- ПРАВИЛА УЛУЧШЕНИЯ ---
1. СОХРАНЯЙ СМЫСЛ: Передай ровно ту мысль и факты, которые написал продавец. Не придумывай ничего от себя.
2. ЕСТЕСТВЕННЫЙ ЖИВОЙ ТОН: Забудь роботизированные фразы ("Уведомляю вас", "Доброго времени суток", "В ответ на ваше обращение"). Пиши как реальный вежливый человек.
3. ЛАКОНИЧНОСТЬ: Если черновик короткий — ответ должен быть коротким. Не лей воду.
4. ЭМОДЗИ: Добавь 1 уместный эмодзи (👍, 🤝, 😊, ⚡) для дружелюбия, если уместно.
5. БЕЗ ЛИШНЕГО: Не добавляй стандартные прощания "С уважением" или "Если будут вопросы", если их не было в черновике.
6. ТОЛЬКО ГОТОВЫЙ ТЕКСТ: Никаких кавычек, пояснений, вариантов. Только готовое сообщение для чата.

Контекст переписки:
${context || 'Начало диалога'}

Черновик продавца (${myUsername}): "${textForAI}"

ГОТОВЫЙ ТЕКСТ:`;
    }

    return makeAIRequest(finalPrompt);
}

function safeParseAIJson(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return null;
    let text = rawStr.trim();
    
    // Срезаем markdown-обёртку ```json ... ``` если модель её вернула
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 1. Попытка стандартного парсинга
    try {
        return JSON.parse(text);
    } catch (e) {}

    // 2. Извлечение JSON объекта подстрокой
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {}

        // 3. Исправление неэкранированных переносов строк внутри строковых литералов
        try {
            const sanitized = match[0].replace(/"((?:[^"\\]|\\.)*)"/gs, (m, p1) => {
                return '"' + p1.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t') + '"';
            });
            return JSON.parse(sanitized);
        } catch (e) {}
    }

    // 4. Резервное извлечение по регулярным выражениям
    try {
        const extractField = (name) => {
            const r = new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
            const m = text.match(r);
            if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            return null;
        };

        const title = extractField('title');
        const description = extractField('description');
        const buyerMessage = extractField('buyerMessage');

        if (title || description) {
            return {
                title: title || '',
                description: description || '',
                buyerMessage: buyerMessage || ''
            };
        }
    } catch (e) {}

    return null;
}

let _cachedLotPresets = null;

async function getLotPresetById(presetId) {
    if (!presetId) return null;
    const targetId = String(presetId).trim();

    // 1. Попытка загрузить из кэша
    if (_cachedLotPresets && Array.isArray(_cachedLotPresets)) {
        const found = _cachedLotPresets.find(p => String(p.id) === targetId);
        if (found) return found;
    }

    // 2. Попытка загрузить свежий каталог с сервера / GitHub
    try {
        const res = await fetch('https://api.foxen.site/catalog/lot-presets', { cache: 'no-cache' });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.presets)) {
                _cachedLotPresets = data.presets;
                const found = data.presets.find(p => String(p.id) === targetId);
                if (found) return found;
            }
        }
    } catch (e) {}

    // 3. Резервный файл из локального пакета расширения
    try {
        const url = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL('content/lot-presets-catalog.json');
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.presets)) {
                _cachedLotPresets = data.presets;
                return data.presets.find(p => String(p.id) === targetId) || null;
            }
        }
    } catch (e) {}

    return null;
}

export async function fetchAILotGeneration(data) {
    const { promptTitle, promptDesc, genBuyerMsg, styleExamples, gameCategory, presetId } = data;

    const matchedPreset = presetId ? await getLotPresetById(presetId) : null;

    let presetPromptSection = '';
    if (matchedPreset) {
        presetPromptSection = `
--- 🎯 ТЫ ОБЯЗАН СТРОГО СЛЕДОВАТЬ ШАБЛОНУ ПРЕСЕТА (ID: ${matchedPreset.id} - ${matchedPreset.title}) ---
ШАБЛОН ЗАГОЛОВКА:
${matchedPreset.title_template || matchedPreset.preview_title}

ШАБЛОН ОФОРМЛЕНИЯ ОПИСАНИЯ:
${matchedPreset.description_template}

${matchedPreset.buyer_message_template ? `ШАБЛОН СООБЩЕНИЯ АВТОВЫДАЧИ:\n${matchedPreset.buyer_message_template}\n` : ''}
Сформируй заголовок и описание лота точно по структуре, эмодзи, скобкам и маркерам этого пресета, подставив данные товара "${promptTitle}" и "${promptDesc}".
--------------------------------------------------------------------------------`;
    } else {
        presetPromptSection = `
--- 🎨 1. СТИЛЬ ЗАГОЛОВКА (КРАТКОЕ ОПИСАНИЕ) ---
- Сделай заголовок ярким, визуально заметным в таблице лотов.
- Используй красивые декоративные скобки: 〖 ... 〗, 【 ... 】, 〔 ... 〕 или [ ... ].
- Добавляй гармоничные тематические эмодзи в начале и в конце, подходящие под товар (например, для огня/доната: 🔥🧡, для скинов/рангов: 💎💙, для красной темы: ❤️🔴🧧, для Discord/Nitro: 🚀💜, для аниме: 🌸✨).
- Выделяй ключевые фичи КАПСОМ внутри скобок (например: 〖 АВТОВЫДАЧА 24/7 〗, 〖 1000+ ШТУК 〗, 〖 ПОЛНЫЙ ДОСТУП 〗, 〖 БЕЗ БАНА 〗).
- Длина: от 40 до 95 символов.
- Пример:
  ❤️🔴🧧〖 Готовый пак эмодзи 〗〖 +1000 штук 〗〖 АВТОВЫДАЧА 24/7 〗🧧🔴❤️

--- 📝 2. СТИЛЬ ПОДРОБНОГО ОПИСАНИЯ ---
- Никакого Markdown (запрещены ** и *, так как FunPay их не поддерживает).
- Оформляй смысловые блоки стильными маркерами-плашками:
  ⚡] или 📦] Информация о товаре / выдаче
  ❇️] или 📌] Что входит в покупку / Процесс получения
  🛡️] или 💎] Гарантии и качество
  ✅] или 🤝] Поддержка и готовность ответить на вопросы
- Обязательно разделяй блоки пустыми строками (\\n\\n).
- Используй списки через маркер • для легкого чтения.
- Текст должен быть живым, вежливым, уверенным и вызывать максимальное доверие.
`;
    }

    const finalPrompt = `
Ты — топовый креативный продавец и копирайтер на бирже FunPay. Твоя цель — создать яркий, стильный, сочный и привлекающий внимание лот (заголовок и описание), оформленный в лучших традициях топовых продавцов FunPay с использованием красивых Unicode-символов и тематических эмодзи.

Товар / идея: "${promptTitle}"
Детали и особенности: "${promptDesc}"
Категория: ${gameCategory || "Игры"}
${presetId ? `Выбранный пресет: ID ${presetId}` : ''}

${presetPromptSection}

--- ✉️ 3. СООБЩЕНИЕ ПОКУПАТЕЛЮ ПОСЛЕ ОПЛАТЫ ---
${genBuyerMsg ? 'Напиши стильное авто-сообщение покупателю с эмодзи, шаблоном [ДАННЫЕ ТОВАРА], краткой инструкцией и пожеланием приятной игры.' : 'Сообщение покупателю генерировать НЕ нужно (оставь строку пустой).'}

--- ОБЩИЕ ИНСТРУКЦИИ ---
1.  **Анализ стиля:** Внимательно изучи примеры названий и описаний лотов пользователя. Узнай его примерный стиль, его манеру оформления, используемые эмодзи, символы и разделители.
2.  Краткое описание: Создай яркий заголовок в стиле пользователя на основе идеи: "${promptTitle}".
3.  Подробное описание: Напиши подробное, структурированное описание на основе деталей: "${promptDesc}", следуя всем правилам "живого" стиля.
4.  Сообщение покупателю: ${genBuyerMsg ? 'Напиши короткое, дружелюбное сообщение для покупателя после оплаты в том же стиле.' : 'Сообщение покупателю генерировать НЕ нужно.'}
5.  Формат ответа: Твой ответ должен быть СТРОГО в формате валидного JSON. Без лишних слов, без markdown (без кодовых блоков). Все переносы строк внутри строковых значений обязательно экранируй как \\n.

--- ПРИМЕРЫ СТИЛЯ ПОЛЬЗОВАТЕЛЯ (для анализа) ---
${styleExamples}
--- КОНЕЦ ПРИМЕРОВ ---

ЗАПРОС ПОЛЬЗОВАТЕЛЯ:
- Идея для заголовка: "${promptTitle}"
- Детали для описания: "${promptDesc}"

Ожидаемый формат ответа (только валидный JSON, переносы строк внутри кавычек экранированы):

{
  "title": "Красивый заголовок с эмодзи и скобками",
  "description": "Стильное описание с плашками и переносами строк...",
  "buyerMessage": "${genBuyerMsg ? 'Сообщение покупателю с эмодзи...' : ''}"
}
`;
    const result = await makeAIRequest(finalPrompt);
    if (!result.success) return result;

    const _cleanGen = (obj) => {
        if (obj && typeof obj === 'object') {
            if (obj.title) obj.title = fxnNorm(obj.title);
            if (obj.description) obj.description = fxnNorm(obj.description);
            if (obj.buyerMessage) obj.buyerMessage = fxnNorm(obj.buyerMessage);
        }
        return obj;
    };

try {
    const parsed = parseAIJson(result.data, fallbackExtractLotFields);
    return { success: true, data: _cleanGen(parsed), source: result.source };
} catch (e) {
    return { success: false, error: `AI returned invalid JSON: ${e.message}` };

    }

    return { 
        success: false, 
        error: `Не удалось прочитать ответ ИИ как JSON. Сырой ответ: ${result.data ? result.data.substring(0, 150) : 'пусто'}` 
    };
}

export async function fetchAITranslation(data) {
    const { title, description, buyerMessage } = data;
    
    const inputPayload = JSON.stringify({
        title: title || "",
        description: description || "",
        buyerMessage: buyerMessage || ""
    }, null, 2);

    const prompt = `
Translate the following Russian texts for a gaming marketplace into natural-sounding, grammatically correct English.
Strictly ensure proper punctuation and capitalization (always begin sentences and words after sentence punctuation . ! ? with capital letters). Preserve emojis and any special characters or symbols. Keep the exact same line structure as the input - do NOT add extra empty lines or blank lines between items.

Your response MUST be strictly a valid JSON object matching the input structure, with no markdown code blocks and no surrounding text.
CRITICAL: All line breaks inside string values must be properly escaped as \\n (never use raw unescaped line breaks inside string literals).

Input JSON:
${inputPayload}

Output JSON:
`;

    const result = await makeAIRequest(prompt);
    if (!result.success) return result;

    const _clean = (obj) => {
        if (obj && typeof obj === 'object') {
            if (obj.title) obj.title = cleanTranslationOutput(fxnNorm(obj.title));
            if (obj.description) obj.description = cleanTranslationOutput(fxnNorm(obj.description));
            if (obj.buyerMessage) obj.buyerMessage = cleanTranslationOutput(fxnNorm(obj.buyerMessage));
        }
        return obj;
    };

try {
    const aiJson = parseAIJson(result.data, fallbackExtractLotFields);
    return { success: true, data: _clean(aiJson), source: result.source };
} catch (e) {
    return { success: false, error: `AI returned invalid JSON for translation: ${e.message}` };

    }

    return { 
        success: false, 
        error: `Не удалось прочитать перевод как JSON: ${result.data ? result.data.substring(0, 120) : 'пусто'}` 
    };
}

export async function fetchAIImageGeneration(prompt) {
    const finalPrompt = `
You are a creative assistant that generates parameters for an image canvas based on a user's text description.
Your response MUST be a single, valid JSON object and nothing else.

--- JSON STRUCTURE ---
{
  "bgColor1": "#RRGGBB",
  "bgColor2": "#RRGGBB",
  "text1": "UPPERCASE TITLE",
  "text1Color": "#RRGGBB",
  "text1Size": 48,
  "text2": "Subtitle text",
  "text2Color": "#RRGGBB",
  "text2Size": 24,
  "text3": "Additional text",
  "text3Color": "#RRGGBB",
  "text3Size": 20,
  "icon": "icon_name",
  "iconColor": "#RRGGBB",
  "iconSize": 100
}

--- INSTRUCTIONS ---
1.  Analyze the user's prompt and creatively translate it into the JSON parameters.
2.  Choose contrasting and harmonious colors.
3.  Pick a suitable Google Material Icon if the prompt suggests one. If not, choose a relevant one or leave it as an empty string.
4.  Extract key text for text1, text2, and text3 fields. Keep them concise.
5.  Your entire response is ONLY the JSON object. No explanations, no markdown, no comments.

--- USER PROMPT ---
"${prompt}"

--- YOUR JSON OUTPUT ---
`;
    const result = await makeAIRequest(finalPrompt);
    if (!result.success) return result;

    try {
        const aiJson = parseAIJson(result.data);
        return { success: true, data: aiJson, source: result.source };
    } catch (e) {
        return { success: false, error: `AI returned invalid JSON for image generation: ${e.message}` };
    }
}

// ---------------------------------------------------------------------------
// Test connectivity for a provider — used by the settings UI
// ---------------------------------------------------------------------------
export async function testAIProviderKey(provider, apiKey, model) {
    try {
        const result = await makeAIRequestViaUserKey(provider, apiKey, model, 'Reply with exactly: ok');
        if (result.success) return { success: true, source: result.source, model: result.usedModel };
        return { success: false, error: result.error || 'Нет ответа' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}