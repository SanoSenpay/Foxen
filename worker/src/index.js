/**
 * Cloudflare Worker API бэкенд для профилей и баннеров Foxen
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- Обработка CORS preflight запросов ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-FPT-Key",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
      "Content-Type": "application/json",
    };

    try {
      // --- Публичный эндпоинт: Получение профиля пользователя ---
      const profileMatch = url.pathname.match(/^\/funpay\/users\/(\d+)\/profile$/);
      if (request.method === "GET" && profileMatch) {
        const userId = profileMatch[1];
        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : { description: null, bannerId: null };
        return new Response(JSON.stringify(profile), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Динамический каталог баннеров ---
      if (request.method === "GET" && url.pathname === "/banners/catalog") {
        // 1. Проверка пользовательского каталога из KV-хранилища
        const kvCatalogStr = await env.FPT_PROFILES.get("catalog:banners");
        if (kvCatalogStr) {
          return new Response(kvCatalogStr, { headers: corsHeaders });
        }

        // 2. Загрузка живого каталога из GitHub Raw репозитория (корень или папка banners)
        try {
          let ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners-catalog.json", {
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (!ghRes.ok) {
            ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/banners-catalog.json", {
              cf: { cacheTtl: 300, cacheEverything: true }
            });
          }
          if (ghRes.ok) {
            const ghText = await ghRes.text();
            return new Response(ghText, { headers: corsHeaders });
          }
        } catch (e) {
          console.error("Ошибка загрузки каталога с GitHub:", e);
        }

        // 3. Базовый каталог по умолчанию (резервный)
        const defaultCatalog = {
          version: 1,
          categories: ["Аниме", "Игры", "Природа", "Космос", "Разное"],
          banners: [
            {
              id: "foxen_blackhole",
              category: "Космос",
              title: "Черная дыра",
              url: "https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/foxen_blackhole.gif"
            },
            {
              id: "foxen_blackhole2",
              category: "Космос",
              title: "Черная дыра 2",
              url: "https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/foxen_blackhole2.gif"
            }
          ]
        };
        return new Response(JSON.stringify(defaultCatalog), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Динамические новости и чейнджлог ---
      if (request.method === "GET" && (url.pathname === "/news" || url.pathname === "/news.json")) {
        try {
          const ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/Foxen/main/content/news.json", {
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (ghRes.ok) {
            const text = await ghRes.text();
            return new Response(text, { headers: corsHeaders });
          }
        } catch (e) {
          console.error("Ошибка загрузки новостей с GitHub:", e);
        }
        return new Response(JSON.stringify({ version: 1, posts: [] }), { headers: corsHeaders });
      }

      // --- Проверка общего ключа авторизации API ---
      const fxnKey = request.headers.get("X-FPT-Key");
      if (!fxnKey || fxnKey !== "fptoolsdim") {
        return new Response(JSON.stringify({ error: { code: "BAD_KEY" } }), { status: 403, headers: corsHeaders });
      }

      // --- Защищенный эндпоинт: Старт привязки аккаунта ---
      if (request.method === "POST" && url.pathname === "/me/funpay/link/start") {
        const body = await request.json();
        const userId = body.funpayUserId;
        if (!userId) return new Response("Bad Request", { status: 400 });

        const code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        await env.FPT_PROFILES.put(`link_start:${userId}`, JSON.stringify({ code }), { expirationTtl: 300 });
        
        return new Response(JSON.stringify({ ok: true, code }), { headers: corsHeaders });
      }

      // --- Защищенный эндпоинт: Подтверждение привязки аккаунта ---
      if (request.method === "POST" && url.pathname === "/me/funpay/link/confirm") {
        const body = await request.json();
        const userId = body.funpayUserId;
        const offerId = body.offerId;
        if (!userId || !offerId) return new Response("Bad Request", { status: 400 });

        const startDataStr = await env.FPT_PROFILES.get(`link_start:${userId}`);
        if (!startDataStr) {
          return new Response(JSON.stringify({ error: { code: "VERIFY_TIMEOUT" } }), { status: 400, headers: corsHeaders });
        }
        const { code } = JSON.parse(startDataStr);

        const fpRes = await fetch(`https://funpay.com/lots/offer?id=${offerId}`);
        if (!fpRes.ok) {
           return new Response(JSON.stringify({ error: { code: "VERIFY_FAILED" } }), { status: 400, headers: corsHeaders });
        }
        const html = await fpRes.text();

        const userLink = `https://funpay.com/users/${userId}/`;
        if (!html.includes(userLink) || !html.includes(code)) {
           return new Response(JSON.stringify({ error: { code: "VERIFY_FAILED" } }), { status: 400, headers: corsHeaders });
        }

        await env.FPT_PROFILES.delete(`link_start:${userId}`);
        const sessionToken = crypto.randomUUID();
        await env.FPT_PROFILES.put(`session:${sessionToken}`, JSON.stringify({ userId }), { expirationTtl: 365 * 24 * 60 * 60 });
        
        return new Response(JSON.stringify({ ok: true, session: sessionToken, funpayUsername: "VerifiedUser" }), { headers: corsHeaders });
      }

      // Вспомогательная функция проверки авторизации по сессионному токену
      const getSessionUser = async (req) => {
        const auth = req.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) return null;
        const token = auth.replace("Bearer ", "");
        const sessStr = await env.FPT_PROFILES.get(`session:${token}`);
        if (!sessStr) return null;
        return JSON.parse(sessStr).userId;
      };

      // --- Защищенный эндпоинт: Обновление описания профиля ---
      if (request.method === "PUT" && url.pathname === "/me/funpay/description") {
        const userId = await getSessionUser(request);
        if (!userId) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401, headers: corsHeaders });

        const body = await request.json();
        const description = body.description || "";

        // ИИ-модерация на отсутствие сторонних контактов
        if (description.length > 0) {
          const aiPrompt = `Task: Analyze the text for prohibited contact info.
Prohibited: Phone numbers (e.g. +7..., 89...), Telegram/Discord/VK tags or links, WhatsApp, emails, or asking to contact outside the platform.
Return ONLY valid JSON. If prohibited info is found, set "ok" to false and provide a "reason" in Russian. If the text is clean, set "ok" to true.
Text: "${description}"`;

          try {
            const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
              messages: [
                { role: "system", content: "You are a strict JSON-only AI moderator. Output nothing but JSON. Example: {\"ok\": false, \"reason\": \"Найден номер телефона\"}" },
                { role: "user", content: aiPrompt }
              ]
            });
            
            let jsonStr = aiResponse.response;
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (match) jsonStr = match[0];
            
            const result = JSON.parse(jsonStr);
            if (result.ok === false || result.ok === "false") {
               return new Response(JSON.stringify({ error: { code: "DESCRIPTION_SPAM", message: result.reason || "Запрещено правилами" } }), { status: 400, headers: corsHeaders });
            }
          } catch (e) {
            console.error("Ошибка AI модерации:", e);
            return new Response(JSON.stringify({ error: { code: "DESCRIPTION_SPAM", message: "Ошибка AI модерации: " + String(e) } }), { status: 400, headers: corsHeaders });
          }
        }

        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : {};

        const now = Date.now();
        const lastUpdate = profile.lastDescUpdate || 0;
        if (now - lastUpdate < 24 * 60 * 60 * 1000) {
           return new Response(JSON.stringify({ error: { code: "WRITE_COOLDOWN" } }), { status: 429, headers: corsHeaders });
        }

        profile.description = description;
        profile.lastDescUpdate = now;
        await env.FPT_PROFILES.put(`profile:${userId}`, JSON.stringify(profile));

        return new Response(JSON.stringify({ ok: true, description, lastDescUpdate: now }), { headers: corsHeaders });
      }

      // --- Защищенный эндпоинт: Обновление баннера профиля ---
      if (request.method === "PUT" && url.pathname === "/me/funpay/banner") {
        const userId = await getSessionUser(request);
        if (!userId) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401, headers: corsHeaders });

        const body = await request.json();
        const bannerId = body.bannerId;

        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : {};

        const now = Date.now();
        const lastUpdate = profile.lastBannerUpdate || 0;
        if (now - lastUpdate < 30 * 60 * 1000) {
           return new Response(JSON.stringify({ error: { code: "BANNER_COOLDOWN" } }), { status: 429, headers: corsHeaders });
        }

        profile.bannerId = bannerId || null;
        profile.lastBannerUpdate = now;
        await env.FPT_PROFILES.put(`profile:${userId}`, JSON.stringify(profile));

        return new Response(JSON.stringify({ ok: true, lastBannerUpdate: now }), { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
    }
  }
};
