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

// ---------------------------------------------------------------------------
// USER PROVIDER: read settings from storage
// ---------------------------------------------------------------------------
async function getUserAIProvider() {
    const { foxenAIProvider = {} } = await (typeof browser !== 'undefined' ? browser : chrome).storage.local.get('foxenAIProvider');
    return foxenAIProvider;
}

// ---------------------------------------------------------------------------
// makeAIRequestViaUserKey — direct call to user's chosen provider
// Returns { success, data, source } or throws on network error
// ---------------------------------------------------------------------------
async function makeAIRequestViaUserKey(provider, apiKey, model, finalPrompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
        if (provider === 'gemini') {
            // Google Gemini — generativelanguage.googleapis.com
            const mdl = model || 'gemini-2.0-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`;
            const body = {
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            const json = await res.json();
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Gemini: пустой ответ');
            return { success: true, data: text.trim(), source: 'gemini' };

        } else if (provider === 'openai') {
            // OpenAI — api.openai.com
            const mdl = model || 'gpt-4o-mini';
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: mdl,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: finalPrompt.trim() }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                }),
                signal: controller.signal
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            const json = await res.json();
            const text = json?.choices?.[0]?.message?.content;
            if (!text) throw new Error('OpenAI: пустой ответ');
            return { success: true, data: text.trim(), source: 'openai' };

        } else if (provider === 'openrouter') {
            // OpenRouter — openrouter.ai (supports Gemini, Claude, Deepseek, etc.)
            const mdl = model || 'google/gemini-2.0-flash-exp:free';
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
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: finalPrompt.trim() }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                }),
                signal: controller.signal
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            const json = await res.json();
            const text = json?.choices?.[0]?.message?.content;
            if (!text) throw new Error('OpenRouter: пустой ответ');
            return { success: true, data: text.trim(), source: 'openrouter' };
        }

        throw new Error('Неизвестный провайдер: ' + provider);
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// makeAIRequest — main entry point. Tries user key first, falls back to Foxen
// ---------------------------------------------------------------------------
async function makeAIRequest(finalPrompt) {
    // 1. Try user's own API key if configured
    const userProv = await getUserAIProvider();
    if (userProv.provider && userProv.apiKey) {
        try {
            const result = await makeAIRequestViaUserKey(
                userProv.provider, userProv.apiKey, userProv.model || '', finalPrompt
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

    const payload = {
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: finalPrompt.trim() }],
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
            const details = errorData.error || errorData.details || `HTTP ${response.status} ${response.statusText}`;
            console.error(`AI Server Error: ${details}`);
            
            if (response.status >= 500) {
                 return { 
                    success: false, 
                    error: `Сервер ИИ временно перегружен (${details}). Попробуйте ещё раз через несколько секунд.` 
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
        finalPrompt = `Переведи следующий текст на русский язык. Верни ТОЛЬКО перевод, без пояснений и кавычек:\n\n${textForAI}`;

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

${styleExamples ? `--- УЧТИ СТИЛЬ ИЗ ПРОФИЛЯ ПРОДАВЦА ---\n${styleExamples}\n` : ''}

ОТВЕТЬ СТРОГО В ВАЛИДНОМ JSON БЕЗ ЛИШНЕГО ТЕКСТА ВОКРУГ:
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

    const parsedJson = safeParseAIJson(result.data);
    if (parsedJson) {
        return { success: true, data: _cleanGen(parsedJson), source: result.source };
    }

    return { 
        success: false, 
        error: `Не удалось прочитать ответ ИИ как JSON. Сырой ответ: ${result.data ? result.data.substring(0, 150) : 'пусто'}` 
    };
}

export async function fetchAITranslation(data) {
    const { title, description, buyerMessage } = data;
    
    const prompt = `
Translate the following Russian texts for a gaming marketplace into natural-sounding English. Preserve emojis and any special characters or symbols. Keep the exact same line structure as the input - do NOT add extra empty lines or blank lines between items.

Your response MUST be in JSON format only, with no extra text.

Input JSON:
{
  "title": "${title.replace(/"/g, '\\"')}",
  "description": "${description.replace(/"/g, '\\"')}",
  "buyerMessage": "${(buyerMessage || "").replace(/"/g, '\\"')}"
}

Output JSON:
`;

    const result = await makeAIRequest(prompt);
    if (!result.success) return result;

    const _clean = (obj) => {
        if (obj && typeof obj === 'object') {
            if (obj.title) obj.title = fxnNorm(obj.title);
            if (obj.description) obj.description = fxnNorm(obj.description);
            if (obj.buyerMessage) obj.buyerMessage = fxnNorm(obj.buyerMessage);
        }
        return obj;
    };

    const parsedJson = safeParseAIJson(result.data);
    if (parsedJson) {
        return { success: true, data: _clean(parsedJson), source: result.source };
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
        const aiJson = JSON.parse(result.data);
        return { success: true, data: aiJson, source: result.source };
    } catch (e) {
        const jsonMatch = result.data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const cleanedJson = JSON.parse(jsonMatch[0]);
                return { success: true, data: cleanedJson, source: result.source };
            } catch (e2) {
                return { success: false, error: `AI returned invalid JSON for image generation (cleaned): ${e2.message}` };
            }
        }
        return { success: false, error: `AI returned invalid JSON for image generation: ${e.message}` };
    }
}

// ---------------------------------------------------------------------------
// Test connectivity for a provider — used by the settings UI
// ---------------------------------------------------------------------------
export async function testAIProviderKey(provider, apiKey, model) {
    try {
        const result = await makeAIRequestViaUserKey(provider, apiKey, model, 'Reply with exactly: ok');
        if (result.success) return { success: true, source: result.source };
        return { success: false, error: result.error || 'Нет ответа' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}