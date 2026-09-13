function getSupabaseKey(env) {
  if (typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' && env.SUPABASE_SERVICE_ROLE_KEY.length > 20) {
    return env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (typeof env.SUPABASE_ANON_KEY === 'string' && env.SUPABASE_ANON_KEY.length > 20) {
    return env.SUPABASE_ANON_KEY.trim();
  }
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWNmcmJlZHdrc25ma3Nqam12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDIyNDcsImV4cCI6MjEwMjIxODI0N30.c7NDg02pHiHB-BuMbtQ_C6L12kxjkKhp2VJqH2DbfNQ";
}

/**
 * Cloudflare Worker API бэкенд для профилей и баннеров Foxen
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const requestOrigin = request.headers.get("Origin") || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-FPT-Key",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json",
    };

    // --- Обработка CORS preflight запросов ---
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Проксирование Supabase API через api.foxen.site ---
    if (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/')) {
      const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
      const targetUrl = new URL(url.pathname + url.search, supabaseUrl);
      
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set('host', new URL(supabaseUrl).host);
      if (!proxyHeaders.has('apikey')) {
        proxyHeaders.set('apikey', getSupabaseKey(env));
      }

      const fetchOptions = {
        method: request.method,
        headers: proxyHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? await request.arrayBuffer() : undefined,
        redirect: 'follow'
      };

      try {
        const resp = await fetch(targetUrl.toString(), fetchOptions);
        const responseHeaders = new Headers(resp.headers);
        for (const [k, v] of Object.entries(corsHeaders)) {
          responseHeaders.set(k, v);
        }
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: responseHeaders
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: 'Supabase proxy error: ' + e.message }), {
          status: 502,
          headers: corsHeaders
        });
      }
    }

    // --- Проксирование Mozilla AMO через api.foxen.site ---
    if (request.method === "GET" && (url.pathname === "/api/addons/mozilla" || url.pathname === "/api/addons/amo")) {
      try {
        const amoRes = await fetch("https://addons.mozilla.org/api/v5/addons/addon/foxen/", {
          headers: { "User-Agent": "Foxen-Worker/1.0" }
        });
        const amoData = await amoRes.json();
        return new Response(JSON.stringify(amoData), {
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=3600"
          }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
      }
    }


    try {
      // --- Публичный эндпоинт: Конфигурация Supabase из Cloudflare Env ---
      if (request.method === "GET" && url.pathname === "/api/config") {
        return new Response(JSON.stringify({
          ok: true,
          supabaseUrl: "https://api.foxen.site",
          supabaseAnonKey: env.SUPABASE_ANON_KEY || null
        }), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Валидация промокода ---
      if (request.method === "POST" && (url.pathname === "/api/promo/validate" || url.pathname === "/api/promo/check")) {
        try {
          const body = await request.json();
          const { code, planId = '3_months' } = body || {};
          if (!code || typeof code !== 'string') {
            return new Response(JSON.stringify({ ok: false, error: "Введите промокод" }), { status: 400, headers: corsHeaders });
          }
          const cleanCode = code.trim().toUpperCase();
          if (cleanCode.length < 2) {
            return new Response(JSON.stringify({ ok: false, error: "Промокод слишком короткий" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          const sbRes = await fetch(`${supabaseUrl}/rest/v1/promo_codes?code=ilike.${encodeURIComponent(cleanCode)}&limit=1`, {
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });

          if (!sbRes.ok) {
            return new Response(JSON.stringify({ ok: false, error: "Ошибка базы данных" }), { status: 500, headers: corsHeaders });
          }

          const list = await sbRes.json();
          const promo = list && list[0];

          if (!promo) {
            return new Response(JSON.stringify({ ok: false, error: "Промокод не найден или недействителен" }), { status: 404, headers: corsHeaders });
          }

          if (promo.is_active === false) {
            return new Response(JSON.stringify({ ok: false, error: "Данный промокод деактивирован" }), { status: 400, headers: corsHeaders });
          }

          if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return new Response(JSON.stringify({ ok: false, error: "Срок действия промокода истёк" }), { status: 400, headers: corsHeaders });
          }

          if (promo.max_uses && Number(promo.times_used) >= Number(promo.max_uses)) {
            return new Response(JSON.stringify({ ok: false, error: "Лимит активаций этого промокода исчерпан" }), { status: 400, headers: corsHeaders });
          }

          const PLAN_PRICES = { '1_month': 200, '3_months': 449, 'lifetime': 699 };
          const basePrice = PLAN_PRICES[planId] || 200;
          let discountPercent = Number(promo.discount_percent || 0);
          let discountAmount = Number(promo.discount_amount || 0);
          let finalPrice = basePrice;
          let isFree = false;

          if (discountPercent > 0) {
            discountPercent = Math.min(100, Math.max(1, discountPercent));
            const disc = Math.round(basePrice * (discountPercent / 100));
            finalPrice = Math.max(1, basePrice - disc);
            discountAmount = disc;
          } else if (discountAmount > 0) {
            discountAmount = Math.min(basePrice, Math.max(1, discountAmount));
            finalPrice = Math.max(1, basePrice - discountAmount);
            discountPercent = Math.round((discountAmount / basePrice) * 100);
          } else if (Number(promo.duration_days) > 0 || Boolean(promo.is_lifetime)) {
            isFree = true;
            finalPrice = 0;
          }

          return new Response(JSON.stringify({
            ok: true,
            code: cleanCode,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            duration_days: promo.duration_days,
            is_lifetime: Boolean(promo.is_lifetime),
            isFree: isFree,
            basePrice: basePrice,
            finalPrice: finalPrice,
            description: promo.description || "Промокод успешно применён"
          }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт: Получение профиля пользователя ---
      const profileMatch = url.pathname.match(/^\/funpay\/users\/(\d+)\/profile$/);
      if (request.method === "GET" && profileMatch) {
        const userId = profileMatch[1];
        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : { description: null, bannerId: null };
        return new Response(JSON.stringify(profile), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Безопасное получение профиля Foxen через Edge API с фильтрацией ---
      const userProfileMatch = url.pathname.match(/^\/api\/users\/([A-Za-z0-9_\-\.\:\@]+)$/);
      if (request.method === "GET" && userProfileMatch) {
        const targetId = decodeURIComponent(userProfileMatch[1]).trim();
        const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
        const apiKey = getSupabaseKey(env);

        let profile = null;

        try {
          // Формируем запрос в Supabase REST API с выборкой ТОЛЬКО публичных безопасных колонок
          let queryParam = "";
          const upperTarget = targetId.toUpperCase();
          if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetId)) {
            queryParam = `or=(id.eq.${encodeURIComponent(targetId)},foxen_id.ilike.${encodeURIComponent(targetId)})`;
          } else if (upperTarget.startsWith("FX-")) {
            queryParam = `or=(foxen_id.ilike.${encodeURIComponent(targetId)},foxen_id.eq.${encodeURIComponent(upperTarget)})`;
          } else if (/^\d+$/.test(targetId)) {
            queryParam = `or=(fp_user_id.eq.${encodeURIComponent(targetId)},foxen_id.ilike.${encodeURIComponent(targetId)})`;
          } else {
            queryParam = `or=(fp_user.ilike.${encodeURIComponent(targetId)},foxen_id.ilike.${encodeURIComponent(targetId)})`;
          }

          const sbRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${queryParam}&select=id,foxen_id,fp_user,fp_user_id,tg_username,tg_id,avatar_url,is_fp_verified,nickname_effect,created_at`, {
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          });

          if (sbRes.ok) {
            const list = await sbRes.json();
            if (list && list.length > 0) {
              profile = list[0];
            }
          }

          // Если профиль не найден в profiles, проверяем subscriptions (пользователи из Telegram/админки)
          if (!profile) {
            let subQuery = "";
            if (upperTarget.startsWith("FX-") || targetId.includes("-")) {
              subQuery = `or=(foxen_id.ilike.${encodeURIComponent(targetId)},foxen_id.eq.${encodeURIComponent(upperTarget)})`;
            } else if (/^\d+$/.test(targetId)) {
              subQuery = `or=(tg_id.eq.${encodeURIComponent(targetId)},foxen_id.ilike.${encodeURIComponent(targetId)})`;
            } else {
              subQuery = `or=(fp_user.ilike.${encodeURIComponent(targetId)},tg_username.ilike.${encodeURIComponent(targetId)})`;
            }

            const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${subQuery}&select=*&limit=1`, {
              headers: {
                "apikey": apiKey,
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            });

            if (subRes.ok) {
              const subList = await subRes.json();
              if (subList && subList.length > 0) {
                const subItem = subList[0];
                profile = {
                  id: subItem.user_id || subItem.id,
                  foxen_id: subItem.foxen_id || upperTarget,
                  fp_user: (subItem.fp_user || "").trim() || null,
                  fp_user_id: null,
                  tg_username: subItem.tg_username ? `@${subItem.tg_username.replace(/^@/, '')}` : null,
                  tg_id: subItem.tg_id || null,
                  avatar_url: null,
                  is_fp_verified: Boolean(subItem.fp_user),
                  created_at: subItem.created_at || new Date().toISOString()
                };
              }
            }
          }
        } catch (e) {
          console.error("Worker Supabase fetch error:", e);
        }

        if (!profile) {
          return new Response(JSON.stringify({ ok: false, error: "Пользователь не найден" }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // Синхронизация постоянного Foxen ID через KV
        if (profile.fp_user_id) {
          try {
            if (upperTarget.startsWith("FX-") && upperTarget !== `FX-${profile.fp_user_id}`) {
              profile.foxen_id = upperTarget;
              await env.FPT_PROFILES.put(`user_foxen_id:${profile.fp_user_id}`, upperTarget);
            } else {
              const savedFoxenId = await env.FPT_PROFILES.get(`user_foxen_id:${profile.fp_user_id}`);
              if (savedFoxenId) {
                profile.foxen_id = savedFoxenId;
              }
            }
          } catch(e) {}
        }

        if (!profile.foxen_id) {
          if (Number(profile.fp_user_id) === 15508026 || profile.fp_user === "VireonShop") {
            profile.foxen_id = "FX-774724";
          } else {
            profile.foxen_id = targetId.toUpperCase().startsWith("FX-") ? targetId.toUpperCase() : `FX-${profile.fp_user_id || 'MEMBER'}`;
          }
        }

        // Авто-разрешение баннера из KV хранилища воркера
        if (profile.fp_user_id && (!profile.banner_url || profile.banner_url.includes('funpay.com/img/layout/profile-header.jpg'))) {
          try {
            const kvProfileStr = await env.FPT_PROFILES.get(`profile:${profile.fp_user_id}`);
            if (kvProfileStr) {
              const kvData = JSON.parse(kvProfileStr);
              if (kvData.bannerId) {
                const bId = String(kvData.bannerId).trim();
                if (bId.startsWith("http://") || bId.startsWith("https://")) {
                  profile.banner_url = bId;
                } else if (/\.(gif|png|jpg|jpeg|webp)$/i.test(bId)) {
                  profile.banner_url = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bId}`;
                } else if (["banner1", "banner2", "banner3", "foxen_blackhole", "foxen_blackhole2"].includes(bId) || bId.includes("anim") || bId.includes("gif")) {
                  profile.banner_url = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bId}.gif`;
                } else {
                  profile.banner_url = `https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/banners/${bId}.jpg`;
                }
              }
            }
          } catch(e) {}
        }

        // Проверка подписки пользователя напрямую через REST API
        let subscription = { is_active: false };
        try {
          let subQuery = "";
          if (profile.foxen_id && profile.fp_user) {
            subQuery = `or=(foxen_id.ilike.${encodeURIComponent(profile.foxen_id)},fp_user.ilike.${encodeURIComponent(profile.fp_user.trim())})`;
          } else if (profile.foxen_id) {
            subQuery = `foxen_id.ilike.${encodeURIComponent(profile.foxen_id)}`;
          } else if (profile.fp_user) {
            subQuery = `fp_user.ilike.${encodeURIComponent(profile.fp_user.trim())}`;
          }

          if (subQuery) {
            const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${subQuery}&select=*&limit=1`, {
              headers: {
                "apikey": apiKey,
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            });
            if (subRes.ok) {
              const subList = await subRes.json();
              if (subList && subList.length > 0) {
                const s = subList[0];
                const isActive = s.status === 'active' || s.is_lifetime || (s.expires_at && new Date(s.expires_at) > new Date());
                subscription = {
                  is_active: Boolean(isActive),
                  is_lifetime: Boolean(s.is_lifetime),
                  plan_id: s.plan_id || 'lifetime',
                  status: s.status || 'active',
                  starts_at: s.starts_at,
                  expires_at: s.expires_at
                };
              }
            }
          }
        } catch (e) {
          console.debug("[Foxen Sub Check Error]:", e);
        }

        // Загрузка избранных лотов витрины продавца из KV хранилища
        let featuredLots = [];
        if (profile.fp_user_id) {
          try {
            const lotsStr = await env.FPT_PROFILES.get(`featured_lots:${profile.fp_user_id}`);
            if (lotsStr) {
              featuredLots = JSON.parse(lotsStr);
            }
          } catch(e) {}
        }

        // Никнейм эффект (только если есть активная подписка Foxen Premium)
        let activeNicknameEffect = null;
        if (subscription && (subscription.is_active || subscription.plan_id)) {
          if (profile.nickname_effect) {
            activeNicknameEffect = typeof profile.nickname_effect === 'string' ? JSON.parse(profile.nickname_effect) : profile.nickname_effect;
          } else if (profile.fp_user_id) {
            try {
              const kvEff = await env.FPT_PROFILES.get(`nickname_effect:${profile.fp_user_id}`);
              if (kvEff) activeNicknameEffect = JSON.parse(kvEff);
            } catch(e) {}
          }
          if (!activeNicknameEffect && profile.fp_user) {
            try {
              const kvEff = await env.FPT_PROFILES.get(`nickname_effect:name:${profile.fp_user.toLowerCase()}`);
              if (kvEff) activeNicknameEffect = JSON.parse(kvEff);
            } catch(e) {}
          }
        }

        // Строгая фильтрация (Whitelist) публичных данных — никаких email, phone, паролей и токенов!
        const publicSafeProfile = {
          id: profile.id,
          foxen_id: profile.foxen_id,
          fp_user: profile.fp_user,
          fp_user_id: profile.fp_user_id,
          avatar_url: profile.avatar_url,
          banner_url: profile.banner_url,
          is_fp_verified: Boolean(profile.is_fp_verified),
          is_tg_linked: Boolean(profile.tg_id || profile.tg_username),
          tg_username: profile.tg_username || null,
          created_at: profile.created_at,
          subscription: subscription,
          featured_lots: featuredLots,
          nickname_effect: activeNicknameEffect
        };


        return new Response(JSON.stringify({ ok: true, profile: publicSafeProfile }), {
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=60, s-maxage=60"
          }
        });
      }

      // --- Публичный/Приватный эндпоинт: Получение/Сохранение эффекта никнейма ---
      if (request.method === "GET" && url.pathname === "/api/user/nickname-effect") {
        const username = url.searchParams.get("username") || url.searchParams.get("fp_user");
        const fpUserId = url.searchParams.get("fp_user_id");
        if (!username && !fpUserId) {
          return new Response(JSON.stringify({ ok: false, error: "username or fp_user_id required" }), { status: 400, headers: corsHeaders });
        }
        let effect = null;
        if (fpUserId) {
          const effStr = await env.FPT_PROFILES.get(`nickname_effect:${fpUserId}`);
          if (effStr) effect = JSON.parse(effStr);
        }
        if (!effect && username) {
          const effStr = await env.FPT_PROFILES.get(`nickname_effect:name:${username.toLowerCase()}`);
          if (effStr) effect = JSON.parse(effStr);
        }
        return new Response(JSON.stringify({ ok: true, effect }), { headers: corsHeaders });
      }

      if (request.method === "POST" && url.pathname === "/api/user/nickname-effect") {
        try {
          const body = await request.json();
          const { fp_user_id, username, foxen_id, effect } = body || {};

          if (!fp_user_id && !username) {
            return new Response(JSON.stringify({ ok: false, error: "fp_user_id or username required" }), { status: 400, headers: corsHeaders });
          }

          if (fp_user_id) {
            await env.FPT_PROFILES.put(`nickname_effect:${fp_user_id}`, JSON.stringify(effect || null));
          }
          if (username) {
            await env.FPT_PROFILES.put(`nickname_effect:name:${username.toLowerCase()}`, JSON.stringify(effect || null));
          }

          return new Response(JSON.stringify({ ok: true, effect }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт: Получение/Сохранение витрины лотов (Foxen Premium) ---
      if (request.method === "GET" && url.pathname === "/api/user/featured-lots") {
        const fpUserId = url.searchParams.get("fp_user_id");
        if (!fpUserId) {
          return new Response(JSON.stringify({ ok: false, error: "fp_user_id required" }), { status: 400, headers: corsHeaders });
        }
        const lotsStr = await env.FPT_PROFILES.get(`featured_lots:${fpUserId}`);
        const lots = lotsStr ? JSON.parse(lotsStr) : [];
        return new Response(JSON.stringify({ ok: true, lots }), { headers: corsHeaders });
      }

      if (request.method === "POST" && url.pathname === "/api/user/featured-lots") {
        try {
          const body = await request.json();
          const { fp_user_id, foxen_id, lots } = body || {};

          if (!fp_user_id) {
            return new Response(JSON.stringify({ ok: false, error: "fp_user_id required" }), { status: 400, headers: corsHeaders });
          }

          // Проверка подписки продавца в Supabase
          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          let isSubscribed = false;
          try {
            const subRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_user_subscription`, {
              method: "POST",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ p_foxen_id: foxen_id || null, p_fp_user: null })
            });
            if (subRes.ok) {
              const subData = await subRes.json();
              const activeSub = Array.isArray(subData) ? subData[0] : subData;
              if (activeSub && (activeSub.is_active || activeSub.plan_id)) isSubscribed = true;
            }
          } catch(e) {}

          // Сохраняем привязку Foxen ID к FunPay ID в KV
          if (foxen_id && String(foxen_id).toUpperCase().startsWith("FX-")) {
            try {
              await env.FPT_PROFILES.put(`user_foxen_id:${fp_user_id}`, String(foxen_id).toUpperCase());
            } catch(e) {}
          }

          if (!isSubscribed) {
            return new Response(JSON.stringify({ ok: false, error: "Витрина доступна только для обладателей подписки Foxen Premium" }), { status: 403, headers: corsHeaders });
          }

          // Парсинг переданных лотов (до 3 штук)
          const rawList = Array.isArray(lots) ? lots.slice(0, 3) : [];
          const parsedLots = [];

          for (const item of rawList) {
            if (!item) continue;
            let rawUrl = typeof item === 'string' ? item.trim() : (item.url || '').trim();
            if (!rawUrl) continue;

            // Извлечение ID лота
            let lotId = '';
            const matchId = rawUrl.match(/[?&]id=(\d+)/i) || rawUrl.match(/\/(\d+)(?:\/|\?|$)/) || rawUrl.match(/^(\d+)$/);
            if (matchId) {
              lotId = matchId[1];
            }

            if (!rawUrl.startsWith('http')) {
              rawUrl = `https://funpay.com/lots/offer?id=${lotId || rawUrl}`;
            }

            let lotInfo = {
              id: lotId || '',
              url: rawUrl,
              title: item.title || '',
              game: item.game || '',
              price: item.price || '',
              auto_delivery: Boolean(item.auto_delivery)
            };

            // Если не хватает деталей, пробуем распарсить страницу FunPay
            if (lotId && (!lotInfo.title || !lotInfo.price || !lotInfo.game)) {
              try {
                const fpLotRes = await fetch(`https://funpay.com/lots/offer?id=${lotId}`, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept-Language": "ru,en;q=0.9"
                  }
                });
                if (fpLotRes.ok) {
                  const html = await fpLotRes.text();
                  
                  // 1. Поиск описания лота (Краткое описание / Подробное описание)
                  let parsedTitle = '';
                  let detailedDesc = '';
                  const shortDescMatch = html.match(/<h5>\s*(?:Краткое\s+)?описание\s*<\/h5>\s*<div[^>]*>([\s\S]*?)<\/div>/i) ||
                                         html.match(/<div class=["']param-title["']>\s*(?:Краткое\s+)?описание\s*<\/div>\s*<div class=["']param-value["']>([\s\S]*?)<\/div>/i);
                  if (shortDescMatch) {
                    parsedTitle = shortDescMatch[1].replace(/<[^>]+>/g, '').trim();
                  }

                  const detailedDescMatch = html.match(/<h5>\s*Подробное\s+описание\s*<\/h5>\s*<div[^>]*>([\s\S]*?)<\/div>/i) ||
                                            html.match(/<div class=["']param-title["']>\s*Подробное\s+описание\s*<\/div>\s*<div class=["']param-value["']>([\s\S]*?)<\/div>/i);
                  if (detailedDescMatch) {
                    detailedDesc = detailedDescMatch[1]
                      .replace(/<br\s*\/?>/gi, '\n')
                      .replace(/<[^>]+>/g, '')
                      .replace(/\r\n/g, '\n')
                      .replace(/\n{3,}/g, '\n\n')
                      .trim();
                  }

                  if (!parsedTitle && detailedDesc) {
                    parsedTitle = detailedDesc.split('\n')[0];
                  }

                  if (!parsedTitle) {
                    const h1Match = html.match(/<div class=["']offer-header["']>[\s\S]*?<h1>([\s\S]*?)<\/h1>/i);
                    if (h1Match) {
                      const cleanH1 = h1Match[1].replace(/<[^>]+>/g, '').trim();
                      if (!cleanH1.includes('Оформление заказа')) {
                        parsedTitle = cleanH1.replace(/^Купить\s+/i, '').replace(/\s*(?:на\s+)?FunPay.*$/i, '').trim();
                      }
                    }
                  }

                  if (parsedTitle && !lotInfo.title) {
                    lotInfo.title = parsedTitle.replace(/\s+/g, ' ').substring(0, 140);
                  }

                  lotInfo.description = detailedDesc || lotInfo.title || '';

                  // 2. Парсинг игры / категории из ссылки на раздел (напр. /lots/924/ => Услуги Discord)
                  if (!lotInfo.game) {
                    const categoryMatch = html.match(/<a[^>]*href=["'](?:https?:\/\/[^\/]+)?\/(?:lots|chips)\/\d+\/?["'][^>]*>([\s\S]*?)<\/a>/i);
                    if (categoryMatch) {
                      const g = categoryMatch[1].replace(/<[^>]+>/g, '').trim();
                      if (g && !g.includes('FunPay') && !g.includes('Торговая площадка') && !g.includes('Главная')) {
                        lotInfo.game = g;
                      }
                    }
                  }

                  // 3. Парсинг цены (СБП, Рубли или общая)
                  if (!lotInfo.price) {
                    const rubMatch = html.match(/class=["']payment-value["'][^>]*>[\s\S]*?([\d\.,]+)\s*(?:₽|&#8381;|руб)/i) ||
                                     html.match(/([\d\.,]+)\s*₽/i);
                    if (rubMatch) {
                      lotInfo.price = rubMatch[1].trim() + ' ₽';
                    } else {
                      const anyPrice = html.match(/class=["']payment-value["'][^>]*>([\s\S]*?)<\/span>/i);
                      if (anyPrice) {
                        const cleanP = anyPrice[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                        if (cleanP) lotInfo.price = cleanP;
                      }
                    }
                  }

                  // 4. Автовыдача
                  if (html.includes('автоматически') || html.includes('auto-delivery') || html.includes('Автовыдача')) {
                    lotInfo.auto_delivery = true;
                  }
                }
              } catch(e) {}
            }

            // Fallback если парсинг заблокирован (без мусорных FunPay Торговая площадка):
            if (!lotInfo.title) lotInfo.title = item.title || `Лот #${lotId || ''}`;
            if (!lotInfo.price) lotInfo.price = item.price || 'В наличии';

            parsedLots.push(lotInfo);
          }

          // Сохраняем витрину в KV
          await env.FPT_PROFILES.put(`featured_lots:${fp_user_id}`, JSON.stringify(parsedLots));

          return new Response(JSON.stringify({ ok: true, lots: parsedLots }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Защищенный/Публичный эндпоинт: Включение/отключение автопродления подписки ---
      if (request.method === "POST" && url.pathname === "/api/subscription/toggle-autorenew") {
        try {
          const body = await request.json();
          const { foxen_id, fp_user, auto_renew } = body || {};
          const autoRenewVal = Boolean(auto_renew);

          if (!foxen_id && !fp_user) {
            return new Response(JSON.stringify({ ok: false, error: "Укажите foxen_id или fp_user" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          let queryParam = "";
          if (foxen_id) queryParam = `foxen_id=eq.${encodeURIComponent(foxen_id)}`;
          else if (fp_user) queryParam = `fp_user=eq.${encodeURIComponent(fp_user)}`;

          const patchRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?${queryParam}`, {
            method: "PATCH",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              auto_renew: autoRenewVal,
              updated_at: new Date().toISOString()
            })
          });

          return new Response(JSON.stringify({ ok: true, auto_renew: autoRenewVal }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // =========================================================================
      // --- СИСТЕМА ТИКЕТОВ СЛУЖБЫ ПОДДЕРЖКИ (SUPPORT TICKETS API) ---
      // =========================================================================

      const ADMIN_FOXEN_IDS = ['FX-000001', 'FX-774724', 'FX-15508026'];
      const ADMIN_USERNAMES = ['vireonshop', 'sano'];
      const ADMIN_EMAILS = ['sanosenpay@gmail.com'];
      const ADMIN_USER_IDS = ['4f74e46c-160b-4298-b7c2-a213faff52ff'];

      function isFoxenAdmin(foxenId, fpUser, email = null, userId = null) {
        if (foxenId && ADMIN_FOXEN_IDS.includes(String(foxenId).trim().toUpperCase())) return true;
        if (fpUser && ADMIN_USERNAMES.includes(String(fpUser).trim().toLowerCase())) return true;
        if (email && ADMIN_EMAILS.includes(String(email).trim().toLowerCase())) return true;
        if (userId && ADMIN_USER_IDS.includes(String(userId).trim())) return true;
        return false;
      }

      // 1. GET /api/tickets/stats - Статистика открытых тикетов для админа
      if (request.method === "GET" && url.pathname === "/api/tickets/stats") {
        try {
          const foxenId = url.searchParams.get("foxen_id");
          const fpUser = url.searchParams.get("fp_user");
          const userId = url.searchParams.get("user_id");
          const isAdmin = isFoxenAdmin(foxenId, fpUser, null, userId);

          if (!isAdmin) {
            return new Response(JSON.stringify({ ok: true, is_admin: false, open_count: 0 }), { headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          const statsRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets?or=(status.eq.open,status.eq.in_progress)&select=id`, {
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Range": "0-0",
              "Prefer": "count=exact"
            }
          });

          let openCount = 0;
          const contentRange = statsRes.headers.get("content-range");
          if (contentRange) {
            const parts = contentRange.split("/");
            if (parts.length === 2 && !isNaN(Number(parts[1]))) {
              openCount = parseInt(parts[1], 10);
            }
          } else if (statsRes.ok) {
            const list = await statsRes.json();
            openCount = Array.isArray(list) ? list.length : 0;
          }

          return new Response(JSON.stringify({ ok: true, is_admin: true, open_count: openCount }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, is_admin: false, open_count: 0 }), { headers: corsHeaders });
        }
      }

      // 2. GET /api/tickets - Список тикетов
      if (request.method === "GET" && url.pathname === "/api/tickets") {
        try {
          const foxenId = url.searchParams.get("foxen_id");
          const fpUser = url.searchParams.get("fp_user");
          const userId = url.searchParams.get("user_id");
          const statusFilter = url.searchParams.get("status");

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          const isAdmin = isFoxenAdmin(foxenId, fpUser, null, userId);

          let queryParams = [];
          if (!isAdmin) {
            const userFilters = [];
            if (foxenId) userFilters.push(`foxen_id.eq.${encodeURIComponent(foxenId)}`);
            if (fpUser) userFilters.push(`fp_user.ilike.${encodeURIComponent(fpUser)}`);
            if (userId) userFilters.push(`user_id.eq.${encodeURIComponent(userId)}`);
            if (userFilters.length === 0) {
              return new Response(JSON.stringify({ ok: true, tickets: [], is_admin: false }), { headers: corsHeaders });
            }
            queryParams.push(`or=(${userFilters.join(',')})`);
          }

          if (statusFilter && statusFilter !== 'all') {
            queryParams.push(`status=eq.${encodeURIComponent(statusFilter)}`);
          }

          queryParams.push(`order=updated_at.desc`);
          queryParams.push(`select=*`);

          const sbRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets?${queryParams.join('&')}`, {
            headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
          });

          if (!sbRes.ok) {
            const errText = await sbRes.text();
            console.error("Fetch tickets error:", errText);
            return new Response(JSON.stringify({ ok: true, tickets: [], is_admin: isAdmin }), { headers: corsHeaders });
          }

          const tickets = await sbRes.json();
          return new Response(JSON.stringify({ ok: true, tickets: Array.isArray(tickets) ? tickets : [], is_admin: isAdmin }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 3. POST /api/tickets/create - Создание нового тикета
      if (request.method === "POST" && url.pathname === "/api/tickets/create") {
        try {
          const body = await request.json();
          const {
            subject,
            category = 'other',
            priority = 'normal',
            message,
            foxen_id = null,
            fp_user = null,
            user_id = null,
            email = null,
            attachments = []
          } = body || {};

          if (isFoxenAdmin(foxen_id, fp_user)) {
            return new Response(JSON.stringify({ ok: false, error: "Администраторы не могут создавать тикеты. Обратитесь в панель поддержки." }), { status: 403, headers: corsHeaders });
          }

          if (!user_id && (!foxen_id || foxen_id === 'FX-GUEST' || foxen_id.startsWith('FX-......'))) {
            return new Response(JSON.stringify({ ok: false, error: "Для создания обращения необходимо войти в аккаунт Foxen" }), { status: 401, headers: corsHeaders });
          }

          if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
            return new Response(JSON.stringify({ ok: false, error: "Укажите тему обращения (от 3 символов)" }), { status: 400, headers: corsHeaders });
          }
          if (!message || typeof message !== 'string' || message.trim().length < 5) {
            return new Response(JSON.stringify({ ok: false, error: "Опишите подробнее вашу проблему (от 5 символов)" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          const now = new Date().toISOString();
          const ticketNumber = `TICKET-${Math.floor(1000 + Math.random() * 9000)}`;

          const newTicketPayload = {
            ticket_number: ticketNumber,
            user_id: user_id || null,
            foxen_id: foxen_id || null,
            fp_user: fpUserClean(fp_user) || null,
            email: email || null,
            subject: subject.trim().slice(0, 150),
            category: category || 'other',
            priority: priority || 'normal',
            status: 'open',
            last_message_preview: message.trim().slice(0, 150),
            admin_is_read: false,
            last_reply_by: 'user',
            last_reply_at: now,
            created_at: now,
            updated_at: now
          };

          function fpUserClean(u) {
            if (!u) return null;
            return String(u).trim();
          }

          // Создаем тикет в таблице support_tickets
          const createTicketRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets`, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify(newTicketPayload)
          });

          if (!createTicketRes.ok) {
            const errText = await createTicketRes.text();
            throw new Error(`Ошибка создания тикета в базе: ${errText}`);
          }

          const createdList = await createTicketRes.json();
          const ticket = createdList[0];

          // Создаем первое сообщение в support_ticket_messages
          const firstMessagePayload = {
            ticket_id: ticket.id,
            sender_id: user_id || null,
            sender_foxen_id: foxen_id || null,
            sender_role: 'user',
            sender_name: fp_user || foxen_id || 'Пользователь',
            message: message.trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
            created_at: now
          };

          await fetch(`${supabaseUrl}/rest/v1/support_ticket_messages`, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(firstMessagePayload)
          });

          return new Response(JSON.stringify({ ok: true, ticket: ticket }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 4. GET /api/tickets/attachment - Безопасный стриминг приватных вложений через Worker
      if (request.method === "GET" && url.pathname === "/api/tickets/attachment") {
        try {
          const filePath = url.searchParams.get("path");
          if (!filePath) {
            return new Response("Attachment path is required", { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // Пробуем authenticated endpoint
          let fileRes = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/support-attachments/${filePath}`, {
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`
            }
          });

          if (!fileRes.ok) {
            // Пробуем стандартный endpoint
            fileRes = await fetch(`${supabaseUrl}/storage/v1/object/support-attachments/${filePath}`, {
              headers: {
                "apikey": apiKey,
                "Authorization": `Bearer ${apiKey}`
              }
            });
          }

          if (!fileRes.ok) {
            return new Response("File not found or access denied", { status: 404, headers: corsHeaders });
          }

          const ext = filePath.split('.').pop().toLowerCase();
          const mimeTypes = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            gif: 'image/gif',
            pdf: 'application/pdf',
            txt: 'text/plain'
          };
          const contentType = mimeTypes[ext] || fileRes.headers.get("Content-Type") || "application/octet-stream";

          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set("Content-Type", contentType);
          responseHeaders.set("Cache-Control", "private, max-age=86400");

          return new Response(fileRes.body, { headers: responseHeaders });
        } catch(e) {
          return new Response("Error fetching attachment", { status: 500, headers: corsHeaders });
        }
      }

      // 5. GET /api/tickets/:id - Получение деталей тикета и переписки
      const ticketDetailsMatch = url.pathname.match(/^\/api\/tickets\/([0-9a-fA-F\-]+|[A-Za-z0-9_\-]+)$/);
      if (request.method === "GET" && ticketDetailsMatch && !url.pathname.endsWith("/create") && !url.pathname.endsWith("/stats") && !url.pathname.endsWith("/attachment") && !url.pathname.endsWith("/upload")) {
        try {
          const ticketId = ticketDetailsMatch[1];
          const foxenId = url.searchParams.get("foxen_id");
          const fpUser = url.searchParams.get("fp_user");
          const userId = url.searchParams.get("user_id");

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // Получаем тикет
          let ticketQuery = `id=eq.${ticketId}`;
          if (ticketId.startsWith("TICKET-") || ticketId.startsWith("FOX-")) {
            ticketQuery = `ticket_number=eq.${encodeURIComponent(ticketId)}`;
          }

          const tRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets?${ticketQuery}&limit=1`, {
            headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
          });

          if (!tRes.ok) {
            return new Response(JSON.stringify({ ok: false, error: "Тикет не найден" }), { status: 404, headers: corsHeaders });
          }

          const tList = await tRes.json();
          if (!tList || tList.length === 0) {
            return new Response(JSON.stringify({ ok: false, error: "Тикет не найден" }), { status: 404, headers: corsHeaders });
          }

          const ticket = tList[0];
          const isAdmin = isFoxenAdmin(foxenId, fpUser, null, userId);

          // Проверка прав доступа: автор тикета или админ
          if (!isAdmin && foxenId && ticket.foxen_id && ticket.foxen_id !== foxenId && fpUser && ticket.fp_user !== fpUser && (!userId || ticket.user_id !== userId)) {
            return new Response(JSON.stringify({ ok: false, error: "У вас нет доступа к этому тикету" }), { status: 403, headers: corsHeaders });
          }

          // Получаем автора тикета
          let authorProfile = null;
          try {
            let uFilter = "";
            if (ticket.user_id) {
              uFilter = `id=eq.${ticket.user_id}`;
            } else if (ticket.foxen_id) {
              uFilter = `foxen_id=eq.${encodeURIComponent(ticket.foxen_id)}`;
            } else if (ticket.fp_user) {
              uFilter = `fp_user=ilike.${encodeURIComponent(ticket.fp_user)}`;
            }

            if (uFilter) {
              const uRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${uFilter}&select=id,foxen_id,fp_user,fp_user_id,avatar_url,tg_username,is_fp_verified,created_at&limit=1`, {
                headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData && uData.length > 0) authorProfile = uData[0];
              }
            }
          } catch(e) {}

          // Если тикет открывает сам пользователь (не админ) — отмечаем сообщения поддержки как прочитанные
          if (!isAdmin) {
            const now = new Date().toISOString();
            await fetch(`${supabaseUrl}/rest/v1/support_ticket_messages?ticket_id=eq.${ticket.id}&sender_role=in.(support,admin)&is_read=eq.false`, {
              method: "PATCH",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ is_read: true, read_at: now })
            }).catch(() => {});

            await fetch(`${supabaseUrl}/rest/v1/support_tickets?id=eq.${ticket.id}`, {
              method: "PATCH",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ user_is_read: true, user_read_at: now })
            }).catch(() => {});

            ticket.user_is_read = true;
            ticket.user_read_at = now;
          }

          // Получаем сообщения тикета
          const mRes = await fetch(`${supabaseUrl}/rest/v1/support_ticket_messages?ticket_id=eq.${ticket.id}&order=created_at.asc`, {
            headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
          });

          const messages = mRes.ok ? await mRes.json() : [];

          return new Response(JSON.stringify({
            ok: true,
            ticket: ticket,
            messages: Array.isArray(messages) ? messages : [],
            author_profile: authorProfile,
            is_admin: isAdmin
          }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 6. POST /api/tickets/:id/reply - Отправка ответа в тикет
      const ticketReplyMatch = url.pathname.match(/^\/api\/tickets\/([0-9a-fA-F\-]+|[A-Za-z0-9_\-]+)\/reply$/);
      if (request.method === "POST" && ticketReplyMatch) {
        try {
          const ticketId = ticketReplyMatch[1];
          const body = await request.json();
          const {
            message,
            sender_id = null,
            sender_foxen_id = null,
            sender_fp_user = null,
            sender_role = null, // 'user' | 'support' | 'admin'
            attachments = []
          } = body || {};

          if ((!message || typeof message !== 'string' || message.trim().length === 0) && (!Array.isArray(attachments) || attachments.length === 0)) {
            return new Response(JSON.stringify({ ok: false, error: "Введите сообщение или прикрепите файл" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // Получаем тикет
          let ticketQuery = `id=eq.${ticketId}`;
          if (ticketId.startsWith("TICKET-") || ticketId.startsWith("FOX-")) {
            ticketQuery = `ticket_number=eq.${encodeURIComponent(ticketId)}`;
          }

          const tRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets?${ticketQuery}&limit=1`, {
            headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
          });

          if (!tRes.ok) {
            return new Response(JSON.stringify({ ok: false, error: "Тикет не найден" }), { status: 404, headers: corsHeaders });
          }

          const tList = await tRes.json();
          if (!tList || tList.length === 0) {
            return new Response(JSON.stringify({ ok: false, error: "Тикет не найден" }), { status: 404, headers: corsHeaders });
          }

          const ticket = tList[0];
          const isAdmin = isFoxenAdmin(sender_foxen_id, sender_fp_user, null, sender_id);

          const finalRole = isAdmin ? 'support' : 'user';
          const senderName = isAdmin ? 'Служба поддержки Foxen' : (sender_fp_user || sender_foxen_id || 'Пользователь');
          const now = new Date().toISOString();

          // Добавляем сообщение
          const msgPayload = {
            ticket_id: ticket.id,
            sender_id: sender_id || null,
            sender_foxen_id: sender_foxen_id || null,
            sender_role: finalRole,
            sender_name: senderName,
            message: (message || '').trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
            is_read: finalRole === 'user' ? true : false,
            read_at: finalRole === 'user' ? now : null,
            created_at: now
          };

          const msgRes = await fetch(`${supabaseUrl}/rest/v1/support_ticket_messages`, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify(msgPayload)
          });

          const createdMsgList = msgRes.ok ? await msgRes.json() : [msgPayload];

          // Обновляем статус и время последнего ответа в тикете
          const newStatus = isAdmin ? 'answered' : (ticket.status === 'closed' ? 'open' : 'in_progress');
          const lastMsgSnippet = (message || (Array.isArray(attachments) && attachments.length > 0 ? '📎 Вложение' : '')).trim().slice(0, 150);

          await fetch(`${supabaseUrl}/rest/v1/support_tickets?id=eq.${ticket.id}`, {
            method: "PATCH",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              status: newStatus,
              last_message_preview: lastMsgSnippet,
              admin_is_read: isAdmin ? true : false,
              user_is_read: isAdmin ? false : true,
              user_read_at: isAdmin ? null : now,
              last_reply_by: finalRole,
              last_reply_at: now,
              updated_at: now
            })
          });

          return new Response(JSON.stringify({
            ok: true,
            message: createdMsgList[0],
            new_status: newStatus
          }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 6. POST /api/tickets/:id/read - Отметка тикета как прочитанного админом
      const ticketReadMatch = url.pathname.match(/^\/api\/tickets\/([0-9a-fA-F\-]+|[A-Za-z0-9_\-]+)\/read$/);
      if (request.method === "POST" && ticketReadMatch) {
        try {
          const ticketId = ticketReadMatch[1];
          const body = await request.json().catch(() => ({}));
          const { sender_foxen_id, sender_fp_user, sender_id } = body || {};

          if (!isFoxenAdmin(sender_foxen_id, sender_fp_user, null, sender_id)) {
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          let ticketQuery = `id=eq.${ticketId}`;
          if (ticketId.startsWith("TICKET-") || ticketId.startsWith("FOX-")) {
            ticketQuery = `ticket_number=eq.${encodeURIComponent(ticketId)}`;
          }

          const now = new Date().toISOString();
          await fetch(`${supabaseUrl}/rest/v1/support_tickets?${ticketQuery}`, {
            method: "PATCH",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              admin_is_read: true,
              admin_read_at: now
            })
          });

          return new Response(JSON.stringify({ ok: true, admin_is_read: true }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }
      }

      // 7. POST /api/tickets/upload - Загрузка файлов/скриншотов в Supabase Storage Bucket
      if (request.method === "POST" && url.pathname === "/api/tickets/upload") {
        try {
          const body = await request.json();
          const { name, type, data, ticket_id = 'temp' } = body || {};

          if (!data || typeof data !== 'string') {
            return new Response(JSON.stringify({ ok: false, error: "Нет данных файла" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // Преобразуем base64 в ArrayBuffer
          const base64Data = data.includes(',') ? data.split(',')[1] : data;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const ext = (name || '').split('.').pop() || 'png';
          const cleanName = (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `${ticket_id}/${Date.now()}_${cleanName}`;
          const mimeType = type || 'image/png';

          const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/support-attachments/${filePath}`, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": mimeType
            },
            body: bytes
          });

          if (uploadRes.ok) {
            // Генерируем подписанную ссылку (Signed URL) на 7 дней для приватного бакета
            let fileUrl = "";
            try {
              const signRes = await fetch(`${supabaseUrl}/storage/v1/object/sign/support-attachments/${filePath}`, {
                method: "POST",
                headers: {
                  "apikey": apiKey,
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ expiresIn: 604800 })
              });
              if (signRes.ok) {
                const signData = await signRes.json();
                fileUrl = `${supabaseUrl}/storage/v1${signData.signedURL}`;
              }
            } catch(e) {}

            // Если не удалось подписать, используем защищенный API прокси воркера
            if (!fileUrl) {
              fileUrl = `https://api.foxen.site/api/tickets/attachment?path=${encodeURIComponent(filePath)}`;
            }

            return new Response(JSON.stringify({
              ok: true,
              url: fileUrl,
              path: filePath,
              name: name || cleanName,
              type: mimeType,
              size: bytes.length
            }), { headers: corsHeaders });
          } else {
            // Если bucket еще не создан, возвращаем base64
            return new Response(JSON.stringify({
              ok: true,
              data: data,
              name: name || 'file',
              type: mimeType,
              size: bytes.length
            }), { headers: corsHeaders });
          }
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 8. GET /api/tickets/attachment - Безопасный стриминг приватных вложений через Worker
      if (request.method === "GET" && url.pathname === "/api/tickets/attachment") {
        try {
          const filePath = url.searchParams.get("path");
          if (!filePath) {
            return new Response("Attachment path is required", { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // Получаем файл из приватного бакета с использованием service_role ключа
          const fileRes = await fetch(`${supabaseUrl}/storage/v1/object/support-attachments/${filePath}`, {
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`
            }
          });

          if (!fileRes.ok) {
            return new Response("File not found or access denied", { status: 404, headers: corsHeaders });
          }

          const mimeType = fileRes.headers.get("Content-Type") || "application/octet-stream";
          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set("Content-Type", mimeType);
          responseHeaders.set("Cache-Control", "private, max-age=86400");

          return new Response(fileRes.body, { headers: responseHeaders });
        } catch(e) {
          return new Response("Error fetching attachment", { status: 500, headers: corsHeaders });
        }
      }

      // 9. POST /api/tickets/:id/status - Изменение статуса тикета (закрытие/переоткрытие)
      const ticketStatusMatch = url.pathname.match(/^\/api\/tickets\/([0-9a-fA-F\-]+|[A-Za-z0-9_\-]+)\/status$/);
      if (request.method === "POST" && ticketStatusMatch) {
        try {
          const ticketId = ticketStatusMatch[1];
          const body = await request.json();
          const { status = 'closed', sender_foxen_id, sender_fp_user } = body || {};

          const validStatuses = ['open', 'in_progress', 'answered', 'closed'];
          if (!validStatuses.includes(status)) {
            return new Response(JSON.stringify({ ok: false, error: "Некорректный статус тикета" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          let ticketQuery = `id=eq.${ticketId}`;
          if (ticketId.startsWith("TICKET-") || ticketId.startsWith("FOX-")) {
            ticketQuery = `ticket_number=eq.${encodeURIComponent(ticketId)}`;
          }

          const now = new Date().toISOString();
          const patchRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets?${ticketQuery}`, {
            method: "PATCH",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              status: status,
              updated_at: now
            })
          });

          return new Response(JSON.stringify({ ok: true, status: status }), { headers: corsHeaders });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный/Приватный эндпоинт: Активация промокода (Foxen Premium) ---


      if (request.method === "POST" && url.pathname === "/api/promo/redeem") {
        try {
          const body = await request.json();
          const { code, user_id, foxen_id, fp_user } = body || {};

          if (!code || typeof code !== 'string') {
            return new Response(JSON.stringify({ ok: false, error: "Введите промокод" }), { status: 400, headers: corsHeaders });
          }

          const cleanCode = code.trim().toUpperCase();
          if (cleanCode.length < 3 || cleanCode.length > 50) {
            return new Response(JSON.stringify({ ok: false, error: "Некорректный формат промокода" }), { status: 400, headers: corsHeaders });
          }

          if (!user_id && !foxen_id && !fp_user) {
            return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация для активации промокода" }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = env.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
          const apiKey = getSupabaseKey(env);

          // 1. Пробуем вызов RPC-функции в Supabase
          try {
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/redeem_promo_code`, {
              method: "POST",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                p_code: cleanCode,
                p_user_id: user_id || null,
                p_foxen_id: foxen_id || null,
                p_fp_user: fp_user || null
              })
            });

            if (rpcRes.ok) {
              const rpcData = await rpcRes.json();
              if (rpcData && (rpcData.ok || rpcData.success)) {
                return new Response(JSON.stringify(rpcData), { headers: corsHeaders });
              }
              if (rpcData && rpcData.error) {
                return new Response(JSON.stringify({ ok: false, error: rpcData.error }), { status: 400, headers: corsHeaders });
              }
            }
          } catch(rpcErr) {
            console.warn("Worker Supabase RPC redeem error:", rpcErr);
          }

          // 2. Прямая обработка через Supabase REST API таблицы promo_codes & subscriptions
          try {
            const promoRes = await fetch(`${supabaseUrl}/rest/v1/promo_codes?code=eq.${encodeURIComponent(cleanCode)}&select=*`, {
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
            });

            if (promoRes.ok) {
              const promoRows = await promoRes.json();
              if (Array.isArray(promoRows) && promoRows.length > 0) {
                const promo = promoRows[0];

                // Проверка активности промокода
                if (promo.is_active === false) {
                  return new Response(JSON.stringify({ ok: false, error: "Данный промокод деактивирован" }), { status: 400, headers: corsHeaders });
                }

                // Проверка срока годности самого промокода
                if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                  return new Response(JSON.stringify({ ok: false, error: "Срок действия этого промокода истёк" }), { status: 400, headers: corsHeaders });
                }

                // Проверка лимита использований
                if (promo.max_uses && promo.times_used >= promo.max_uses) {
                  return new Response(JSON.stringify({ ok: false, error: "Лимит активаций этого промокода исчерпан" }), { status: 400, headers: corsHeaders });
                }

                // Проверка повторного использования данным пользователем
                const redemptionQuery = [];
                if (user_id) redemptionQuery.push(`user_id=eq.${user_id}`);
                if (foxen_id) redemptionQuery.push(`foxen_id=eq.${encodeURIComponent(foxen_id)}`);
                if (fp_user) redemptionQuery.push(`fp_user=eq.${encodeURIComponent(fp_user)}`);

                if (redemptionQuery.length > 0) {
                  const checkRedeemRes = await fetch(`${supabaseUrl}/rest/v1/promo_redemptions?code=eq.${encodeURIComponent(cleanCode)}&or=(${redemptionQuery.join(',')})&select=id`, {
                    headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
                  });
                  if (checkRedeemRes.ok) {
                    const redRows = await checkRedeemRes.json();
                    if (Array.isArray(redRows) && redRows.length > 0) {
                      return new Response(JSON.stringify({ ok: false, error: "Вы уже активировали данный промокод ранее" }), { status: 400, headers: corsHeaders });
                    }
                  }
                }

                // Расчет нового срока подписки
                const daysToAdd = promo.duration_days || 30;
                const isLifetime = Boolean(promo.is_lifetime || daysToAdd >= 9999);

                // Получаем текущую подписку пользователя
                let existingSub = null;
                const subLookups = [];
                if (user_id) subLookups.push(`user_id=eq.${user_id}`);
                if (foxen_id) subLookups.push(`foxen_id=eq.${encodeURIComponent(foxen_id)}`);
                if (fp_user) subLookups.push(`fp_user=eq.${encodeURIComponent(fp_user)}`);

                if (subLookups.length > 0) {
                  const curSubRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?or=(${subLookups.join(',')})&select=*&order=created_at.desc&limit=1`, {
                    headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
                  });
                  if (curSubRes.ok) {
                    const subList = await curSubRes.json();
                    if (Array.isArray(subList) && subList.length > 0) existingSub = subList[0];
                  }
                }

                let newExpiresAt = null;
                const now = new Date();

                if (!isLifetime) {
                  let baseDate = now;
                  if (existingSub && existingSub.expires_at) {
                    const curExp = new Date(existingSub.expires_at);
                    if (curExp > now) baseDate = curExp; // прибавляем к оставшемуся сроку!
                  }
                  const calculated = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                  newExpiresAt = calculated.toISOString();
                }

                // Обновляем/создаем подписку
                const subPayload = {
                  user_id: user_id || existingSub?.user_id || null,
                  foxen_id: foxen_id || existingSub?.foxen_id || null,
                  fp_user: fp_user || existingSub?.fp_user || null,
                  is_active: true,
                  is_lifetime: isLifetime,
                  plan_id: isLifetime ? 'lifetime' : `${daysToAdd}_days`,
                  expires_at: newExpiresAt,
                  updated_at: now.toISOString()
                };

                if (existingSub && existingSub.id) {
                  await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
                    method: "PATCH",
                    headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify(subPayload)
                  });
                } else {
                  subPayload.created_at = now.toISOString();
                  await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
                    method: "POST",
                    headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify(subPayload)
                  });
                }

                // Записываем погашение промокода
                await fetch(`${supabaseUrl}/rest/v1/promo_redemptions`, {
                  method: "POST",
                  headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    promo_code_id: promo.id,
                    code: cleanCode,
                    user_id: user_id || null,
                    foxen_id: foxen_id || null,
                    fp_user: fp_user || null,
                    redeemed_at: now.toISOString()
                  })
                });

                // Инкрементируем счетчик использований промокода
                await fetch(`${supabaseUrl}/rest/v1/promo_codes?id=eq.${promo.id}`, {
                  method: "PATCH",
                  headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    times_used: (promo.times_used || 0) + 1,
                    updated_at: now.toISOString()
                  })
                });

                return new Response(JSON.stringify({
                  ok: true,
                  code: cleanCode,
                  duration_days: daysToAdd,
                  is_lifetime: isLifetime,
                  expires_at: newExpiresAt,
                  message: isLifetime 
                    ? "Промокод успешно активирован! Вам предоставлен пожизненный доступ Foxen Premium 👑" 
                    : `Промокод успешно активирован! Добавлено ${daysToAdd} дн. подписки Foxen Premium`
                }), { headers: corsHeaders });
              }
            }
          } catch(sbErr) {
            console.warn("Worker Supabase direct redeem error:", sbErr);
          }

          // 3. Fallback: Edge KV Promos (для системных промокодов)
          const kvPromoStr = await env.FPT_PROFILES.get(`promo:${cleanCode}`);
          if (kvPromoStr) {
            const kvPromo = JSON.parse(kvPromoStr);
            const daysToAdd = kvPromo.duration_days || 7;
            const isLifetime = Boolean(kvPromo.is_lifetime);
            return new Response(JSON.stringify({
              ok: true,
              code: cleanCode,
              duration_days: daysToAdd,
              is_lifetime: isLifetime,
              message: `Промокод успешно активирован! Добавлено ${daysToAdd} дн. Foxen Premium`
            }), { headers: corsHeaders });
          }

          return new Response(JSON.stringify({ ok: false, error: "Промокод не найден или недействителен" }), { status: 404, headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message || "Ошибка активации промокода" }), { status: 500, headers: corsHeaders });
        }
      }

      // =========================================================================
      // --- ПЛАТЕЖНЫЙ ШЛЮЗ PLATEGA.IO API (Foxen Premium Checkout & Webhook) ---
      // =========================================================================

      // Helper: Получение конфигурации Platega (поддержка прямых env и Cloudflare Secrets Store)
      const getPlategaConfig = async (e) => {
        let merchantId = e.PLATEGA_MERCHANT_ID || null;
        if (merchantId && typeof merchantId.get === 'function') {
          try {
            merchantId = await merchantId.get();
          } catch(err) {
            console.error("Secrets Store merchantId get error:", err);
          }
        }
        let secret = e.PLATEGA_SECRET || null;
        if (secret && typeof secret.get === 'function') {
          try {
            secret = await secret.get();
          } catch(err) {
            console.error("Secrets Store secret get error:", err);
          }
        }
        return {
          merchantId: typeof merchantId === 'string' ? merchantId.trim() : (merchantId ? String(merchantId) : null),
          secret: typeof secret === 'string' ? secret.trim() : (secret ? String(secret) : null),
          apiBase: (e.PLATEGA_API_BASE || "https://app.platega.io").replace(/\/+$/, "")
        };
      };


      // Helper: Атомарная активация подписки пользователя по успешному платежу Platega
      async function activateSubscriptionFromPlatega(e, details) {
        const {
          transactionId,
          userId = null,
          foxenId = null,
          fpUser = null,
          planId = '1_month',
          amount = 0,
          currency = 'RUB',
          paymentMethod = null,
          payload = {}
        } = details;

        const supabaseUrl = e.SUPABASE_URL || "https://yoacfrbedwksnfksjjmv.supabase.co";
        const apiKey = getSupabaseKey(e);

        // Защита от дублирующей активации через KV
        if (transactionId && e.FPT_PROFILES) {
          try {
            const alreadyProcessed = await e.FPT_PROFILES.get(`platega_paid:${transactionId}`);
            if (alreadyProcessed) {
              return JSON.parse(alreadyProcessed);
            }
          } catch(kvErr) {}
        }

        // 1. Попытка через Supabase RPC функцию
        try {
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/process_platega_payment_success`, {
            method: "POST",
            headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              p_transaction_id: transactionId,
              p_user_id: userId,
              p_foxen_id: foxenId,
              p_fp_user: fpUser,
              p_plan_id: planId,
              p_amount: Number(amount) || 0,
              p_currency: currency,
              p_payment_method: paymentMethod ? String(paymentMethod) : null,
              p_payload: payload
            })
          });

          if (rpcRes.ok) {
            const rpcData = await rpcRes.json();
            if (rpcData && (rpcData.ok || rpcData.success)) {
              if (transactionId && e.FPT_PROFILES) {
                await e.FPT_PROFILES.put(`platega_paid:${transactionId}`, JSON.stringify(rpcData), { expirationTtl: 86400 * 60 });
              }
              return rpcData;
            }
          }
        } catch (rpcErr) {
          console.warn("[Platega Sync] RPC error, using fallback direct query:", rpcErr);
        }

        // 2. Fallback: Прямая работа с таблицами subscriptions & payments
        try {
          const cleanPlan = String(planId || '1_month').toLowerCase().trim();
          let daysToAdd = 30;
          let isLifetime = false;

          if (['lifetime', 'forever', 'unlimited'].includes(cleanPlan)) {
            isLifetime = true;
            daysToAdd = 9999;
          } else if (['3_months', '90_days', '3_month'].includes(cleanPlan)) {
            daysToAdd = 90;
          } else if (['6_months', '180_days'].includes(cleanPlan)) {
            daysToAdd = 180;
          } else if (['1_year', '365_days', 'year'].includes(cleanPlan)) {
            daysToAdd = 365;
          }

          // Ищем существующую подписку
          const subLookups = [];
          if (userId) subLookups.push(`user_id=eq.${userId}`);
          if (foxenId) subLookups.push(`foxen_id=eq.${encodeURIComponent(foxenId)}`);
          if (fpUser) subLookups.push(`fp_user=eq.${encodeURIComponent(fpUser)}`);

          let existingSub = null;
          if (subLookups.length > 0) {
            const curSubRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?or=(${subLookups.join(',')})&select=*&order=created_at.desc&limit=1`, {
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
            });
            if (curSubRes.ok) {
              const subList = await curSubRes.json();
              if (Array.isArray(subList) && subList.length > 0) existingSub = subList[0];
            }
          }

          let newExpiresAt = null;
          const now = new Date();

          if (!isLifetime) {
            let baseDate = now;
            if (existingSub && existingSub.expires_at) {
              const curExp = new Date(existingSub.expires_at);
              if (curExp > now) baseDate = curExp; // продлеваем от текущего срока окончания
            }
            newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
          }

          const subPayload = {
            user_id: userId || existingSub?.user_id || null,
            foxen_id: foxenId || existingSub?.foxen_id || null,
            fp_user: fpUser || existingSub?.fp_user || null,
            is_active: true,
            status: 'active',
            is_lifetime: isLifetime || Boolean(existingSub?.is_lifetime),
            auto_renew: isLifetime ? false : (details.autoRenew !== undefined ? Boolean(details.autoRenew) : Boolean(existingSub?.auto_renew)),
            plan_id: isLifetime ? 'lifetime' : `${daysToAdd}_days`,
            expires_at: isLifetime ? null : newExpiresAt,
            updated_at: now.toISOString()
          };

          if (existingSub && existingSub.id) {
            await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
              method: "PATCH",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(subPayload)
            });
          } else {
            subPayload.created_at = now.toISOString();
            await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
              method: "POST",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(subPayload)
            });
          }

          // Обновляем/добавляем запись в таблицу payments
          try {
            await fetch(`${supabaseUrl}/rest/v1/payments`, {
              method: "POST",
              headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
              body: JSON.stringify({
                transaction_id: transactionId,
                provider: 'platega',
                user_id: userId || null,
                foxen_id: foxenId || null,
                fp_user: fpUser || null,
                plan_id: planId,
                amount: Number(amount) || 0,
                currency: currency,
                status: 'paid',
                payment_method: paymentMethod ? String(paymentMethod) : null,
                payload: payload || {},
                updated_at: now.toISOString()
              })
            });
          } catch(payErr) {}

          const result = {
            ok: true,
            transaction_id: transactionId,
            plan_id: planId,
            duration_days: daysToAdd,
            is_lifetime: isLifetime,
            auto_renew: subPayload.auto_renew,
            expires_at: isLifetime ? null : newExpiresAt,
            message: isLifetime
              ? "Подписка Foxen Premium (Навсегда) успешно активирована!"
              : `Подписка Foxen Premium продлена на ${daysToAdd} дн.!`
          };

          if (transactionId && e.FPT_PROFILES) {
            await e.FPT_PROFILES.put(`platega_paid:${transactionId}`, JSON.stringify(result), { expirationTtl: 86400 * 60 });
          }

          return result;
        } catch (fbErr) {
          console.error("[Platega Sync] Direct update failed:", fbErr);
          return { ok: false, error: fbErr.message };
        }
      }

      // --- 1. POST /api/payment/platega/create - Создание платежа в Platega ---
      if (request.method === "POST" && url.pathname === "/api/payment/platega/create") {
        try {
          const body = await request.json();
          const {
            planId = "1_month",
            paymentMethod = null, // null/0: auto unified, 2: SBP, 10: Card RF, 12: Intl Card, 13: Crypto
            foxenId = null,
            fpUser = null,
            userId = null,
            email = null,
            autoRenew = false,
            returnUrl = null,
            failedUrl = null,
            customAmount = null
          } = body || {};

          const pConfig = await getPlategaConfig(env);
          if (!pConfig.merchantId || !pConfig.secret) {
            return new Response(JSON.stringify({
              ok: false,
              error: "Platega API не настроен на сервере. Укажите PLATEGA_MERCHANT_ID и PLATEGA_SECRET в настройках Cloudflare Worker."
            }), { status: 500, headers: corsHeaders });
          }

          // Определяем стоимость и название тарифа
          let amount = 200;
          let planTitle = "Foxen Premium (1 месяц)";
          const cleanPlan = String(planId).toLowerCase().trim();

          if (customAmount && Number(customAmount) > 0) {
            amount = Number(customAmount);
            planTitle = `Foxen Premium (${amount} ₽)`;
          } else if (['lifetime', 'forever', 'unlimited'].includes(cleanPlan)) {
            amount = 699;
            planTitle = "Foxen Premium (Навсегда, Lifetime)";
          } else if (['3_months', '90_days', '3_month'].includes(cleanPlan)) {
            amount = 449;
            planTitle = "Foxen Premium (3 месяца, скидка 25%)";
          } else {
            amount = 200;
            planTitle = "Foxen Premium (1 месяц)";
          }

          const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "127.0.0.1";
          const userIdentifier = foxenId || fpUser || (userId ? `ID-${userId.slice(0, 8)}` : "Пользователь");

          const payloadData = {
            foxenId: foxenId || null,
            fpUser: fpUser || null,
            planId: cleanPlan,
            amount: amount,
            currency: "RUB",
            autoRenew: Boolean(autoRenew),
            timestamp: Date.now()
          };



          const hostOrigin = requestOrigin !== "*" ? requestOrigin : "https://web.foxen.site";
          const finalReturnUrl = returnUrl || `${hostOrigin}/profile.html?payment=success`;
          const finalFailedUrl = failedUrl || `${hostOrigin}/profile.html?payment=fail`;

          const plategaHeaders = {
            "X-MerchantId": pConfig.merchantId,
            "X-Secret": pConfig.secret,
            "Content-Type": "application/json",
            "Accept": "application/json"
          };

          let plategaRes;
          let plategaData = null;
          let rawPlategaText = "";

          // 1. Попытка создания через метод /transaction/process (если указан paymentMethod)
          if (paymentMethod && Number(paymentMethod) > 0) {
            const methodNum = Number(paymentMethod);
            const requestBody = {
              paymentMethod: methodNum,
              paymentDetails: {
                amount: amount,
                currency: "RUB"
              },
              description: `Оплата ${planTitle} для ${userIdentifier}`,
              return: finalReturnUrl,
              failedUrl: finalFailedUrl,
              payload: JSON.stringify(payloadData),
              metadata: {
                userId: foxenId || userId || fpUser || "guest",
                userName: fpUser || foxenId || "Foxen User",
                clientIp: clientIp
              }
            };

            try {
              plategaRes = await fetch(`${pConfig.apiBase}/transaction/process`, {
                method: "POST",
                headers: plategaHeaders,
                body: JSON.stringify(requestBody)
              });
              rawPlategaText = await plategaRes.text();
              try {
                plategaData = JSON.parse(rawPlategaText);
              } catch(jsonE) {}
            } catch(fetchErr) {
              console.warn("[Platega /transaction/process error]:", fetchErr);
            }
          }

          // 2. Если конкретный метод не задан или вернул ошибку -> Fallback на универсальный v2/transaction/process
          if (!plategaData || (!plategaData.transactionId && !plategaData.id && !plategaData.redirect && !plategaData.url)) {
            const requestBodyV2 = {
              paymentDetails: {
                amount: amount,
                currency: "RUB"
              },
              description: `Оплата ${planTitle} для ${userIdentifier}`,
              return: finalReturnUrl,
              failedUrl: finalFailedUrl,
              payload: JSON.stringify(payloadData),
              metadata: {
                userId: foxenId || userId || fpUser || "guest",
                userName: fpUser || foxenId || "Foxen User",
                clientIp: clientIp
              }
            };

            if (paymentMethod && Number(paymentMethod) > 0) {
              requestBodyV2.paymentMethod = Number(paymentMethod);
            }

            try {
              plategaRes = await fetch(`${pConfig.apiBase}/v2/transaction/process`, {
                method: "POST",
                headers: plategaHeaders,
                body: JSON.stringify(requestBodyV2)
              });
              rawPlategaText = await plategaRes.text();
              try {
                plategaData = JSON.parse(rawPlategaText);
              } catch(jsonE) {}
            } catch(v2Err) {
              console.warn("[Platega /v2/transaction/process error]:", v2Err);
            }
          }

          if (!plategaData || (!plategaData.transactionId && !plategaData.id && !plategaData.redirect && !plategaData.url)) {
            const errMsg = plategaData?.message || plategaData?.error || (rawPlategaText ? `Platega: ${rawPlategaText.slice(0, 200)}` : `Ошибка Platega API (HTTP ${plategaRes?.status || 500})`);
            return new Response(JSON.stringify({ ok: false, error: errMsg, details: plategaData || rawPlategaText }), { status: 400, headers: corsHeaders });
          }

          const txId = plategaData.transactionId || plategaData.id;
          const payUrl = plategaData.url || plategaData.redirect || null;


          // Сохраняем черновик транзакции в KV для сопоставления при получении вебхука
          if (txId && env.FPT_PROFILES) {
            try {
              await env.FPT_PROFILES.put(`platega_tx:${txId}`, JSON.stringify({
                txId,
                payloadData,
                amount,
                planId: cleanPlan,
                paymentMethod: paymentMethod || null,
                createdAt: new Date().toISOString()
              }), { expirationTtl: 86400 * 3 });
            } catch(e) {}
          }

          return new Response(JSON.stringify({
            ok: true,
            transactionId: txId,
            payUrl: payUrl,
            redirect: payUrl,
            qr: plategaData.qr || null,
            status: plategaData.status || "PENDING",
            expiresIn: plategaData.expiresIn || "00:15:00",
            rate: plategaData.rate || plategaData.usdtRate || null,
            amount: amount,
            planId: cleanPlan
          }), { headers: corsHeaders });

        } catch (e) {
          console.error("[Platega Create Error]:", e);
          return new Response(JSON.stringify({ ok: false, error: e.message || "Внутренняя ошибка создания платежа" }), { status: 500, headers: corsHeaders });
        }
      }

      // --- 2. GET /api/payment/platega/status - Проверка статуса транзакции ---
      if (request.method === "GET" && (url.pathname === "/api/payment/platega/status" || url.pathname.startsWith("/api/payment/platega/status/"))) {
        try {
          const pathParts = url.pathname.split("/").filter(Boolean);
          const pathId = pathParts.length >= 5 ? pathParts[4] : null;
          const txId = url.searchParams.get("id") || url.searchParams.get("transactionId") || pathId;

          if (!txId) {
            return new Response(JSON.stringify({ ok: false, error: "Укажите id транзакции" }), { status: 400, headers: corsHeaders });
          }

          const pConfig = await getPlategaConfig(env);
          if (!pConfig.merchantId || !pConfig.secret) {
            return new Response(JSON.stringify({ ok: false, error: "Platega API не настроен" }), { status: 500, headers: corsHeaders });
          }

          const plategaRes = await fetch(`${pConfig.apiBase}/transaction/${encodeURIComponent(txId)}`, {
            method: "GET",
            headers: {
              "X-MerchantId": pConfig.merchantId,
              "X-Secret": pConfig.secret,
              "Accept": "application/json"
            }
          });

          if (!plategaRes.ok) {
            return new Response(JSON.stringify({ ok: false, error: `Транзакция не найдена в Platega (HTTP ${plategaRes.status})` }), { status: 404, headers: corsHeaders });
          }

          const txData = await plategaRes.json();
          const status = String(txData.status || "").toUpperCase();

          // Если статус CONFIRMED -> активируем подписку
          if (status === "CONFIRMED" || status === "PAID" || status === "SUCCESS") {
            let parsedPayload = {};
            if (txData.payload) {
              try {
                parsedPayload = typeof txData.payload === "string" ? JSON.parse(txData.payload) : txData.payload;
              } catch(e) {}
            }

            // Если в ответе Platega нет payload, пробуем достать из нашего KV
            if (!parsedPayload.foxenId && !parsedPayload.userId && env.FPT_PROFILES) {
              try {
                const cachedTxStr = await env.FPT_PROFILES.get(`platega_tx:${txId}`);
                if (cachedTxStr) {
                  const cachedTx = JSON.parse(cachedTxStr);
                  parsedPayload = { ...cachedTx.payloadData, ...parsedPayload };
                }
              } catch(e) {}
            }

            const activation = await activateSubscriptionFromPlatega(env, {
              transactionId: txId,
              userId: parsedPayload.userId || null,
              foxenId: parsedPayload.foxenId || null,
              fpUser: parsedPayload.fpUser || null,
              planId: parsedPayload.planId || "1_month",
              amount: txData.paymentDetails?.amount || txData.amount || parsedPayload.amount || 0,
              currency: txData.paymentDetails?.currency || txData.currency || "RUB",
              paymentMethod: txData.paymentMethod || null,
              payload: parsedPayload
            });

            return new Response(JSON.stringify({
              ok: true,
              paid: true,
              status: "CONFIRMED",
              transaction: txData,
              subscription: activation
            }), { headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            ok: true,
            paid: false,
            status: status || "PENDING",
            transaction: txData
          }), { headers: corsHeaders });

        } catch (e) {
          console.error("[Platega Status Error]:", e);
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- 3. POST /api/payment/platega/webhook - Обработчик Callback от Platega ---
      if (request.method === "POST" && (url.pathname === "/api/payment/platega/webhook" || url.pathname === "/api/webhook/platega")) {
        try {
          const pConfig = await getPlategaConfig(env);
          const headerMerchantId = request.headers.get("X-MerchantId");
          const headerSecret = request.headers.get("X-Secret");

          // Проверка безопасности: если секрет задан в env, сверяем
          if (pConfig.secret && headerSecret && pConfig.secret !== headerSecret) {
            console.warn("[Platega Webhook] Несовпадение X-Secret");
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
          }

          const callbackData = await request.json();
          console.log("[Platega Webhook Received]:", JSON.stringify(callbackData));

          const txId = callbackData.id || callbackData.transactionId;
          const status = String(callbackData.status || "").toUpperCase();

          if (txId && (status === "CONFIRMED" || status === "PAID" || status === "SUCCESS")) {
            let parsedPayload = {};
            if (callbackData.payload) {
              try {
                parsedPayload = typeof callbackData.payload === "string" ? JSON.parse(callbackData.payload) : callbackData.payload;
              } catch(e) {}
            }

            if (!parsedPayload.foxenId && !parsedPayload.userId && env.FPT_PROFILES) {
              try {
                const cachedTxStr = await env.FPT_PROFILES.get(`platega_tx:${txId}`);
                if (cachedTxStr) {
                  const cachedTx = JSON.parse(cachedTxStr);
                  parsedPayload = { ...cachedTx.payloadData, ...parsedPayload };
                }
              } catch(e) {}
            }

            await activateSubscriptionFromPlatega(env, {
              transactionId: txId,
              userId: parsedPayload.userId || null,
              foxenId: parsedPayload.foxenId || null,
              fpUser: parsedPayload.fpUser || null,
              planId: parsedPayload.planId || "1_month",
              amount: callbackData.amount || parsedPayload.amount || 0,
              currency: callbackData.currency || "RUB",
              paymentMethod: callbackData.paymentMethod || null,
              payload: parsedPayload
            });

            console.log(`[Platega Webhook Success]: Подписка выдана для ${parsedPayload.foxenId || parsedPayload.userId || txId}`);
          }

          // Platega ожидает HTTP 200 OK
          return new Response(JSON.stringify({ ok: true, status: "received" }), {
            status: 200,
            headers: corsHeaders
          });
        } catch (e) {
          console.error("[Platega Webhook Error]:", e);
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- 4. GET /api/payment/platega/balance - Балансы мерчанта Platega ---
      if (request.method === "GET" && url.pathname === "/api/payment/platega/balance") {
        try {
          const pConfig = await getPlategaConfig(env);
          if (!pConfig.merchantId || !pConfig.secret) {
            return new Response(JSON.stringify({ ok: false, error: "Platega API credentials not configured" }), { status: 500, headers: corsHeaders });
          }

          const balRes = await fetch(`${pConfig.apiBase}/balance/all`, {
            method: "GET",
            headers: {
              "X-MerchantId": pConfig.merchantId,
              "X-Secret": pConfig.secret,
              "Accept": "application/json"
            }
          });

          if (!balRes.ok) {
            return new Response(JSON.stringify({ ok: false, error: `Platega balance error (${balRes.status})` }), { status: balRes.status, headers: corsHeaders });
          }

          const balances = await balRes.json();
          return new Response(JSON.stringify({ ok: true, balances }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- 5. POST /api/payment/platega/cancel - Отмена транзакции ---
      if (request.method === "POST" && url.pathname === "/api/payment/platega/cancel") {
        try {
          const body = await request.json();
          const { id: txId } = body || {};

          if (!txId) {
            return new Response(JSON.stringify({ ok: false, error: "Укажите id транзакции" }), { status: 400, headers: corsHeaders });
          }

          const pConfig = await getPlategaConfig(env);
          const cancelRes = await fetch(`${pConfig.apiBase}/transaction/${encodeURIComponent(txId)}/cancel`, {
            method: "POST",
            headers: {
              "X-MerchantId": pConfig.merchantId,
              "X-Secret": pConfig.secret,
              "Accept": "application/json"
            }
          });

          const cancelData = await cancelRes.json().catch(() => ({}));
          return new Response(JSON.stringify({ ok: cancelRes.ok, data: cancelData }), { status: cancelRes.status, headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт: Динамический каталог пресетов лотов ---
      if (request.method === "GET" && (url.pathname === "/catalog/lot-presets" || url.pathname === "/lot-presets-catalog.json")) {

        const kvPresets = await env.FPT_PROFILES.get("catalog:lot_presets");
        if (kvPresets) return new Response(kvPresets, { headers: corsHeaders });

        try {
          let ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/lot-presets-catalog.json", {
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (ghRes.ok) {
            const text = await ghRes.text();
            return new Response(text, { headers: corsHeaders });
          }
        } catch (e) {
          console.error("Ошибка загрузки пресетов лотов с GitHub:", e);
        }

        const fallback = {
          version: 1,
          presets: [
            {
              id: "101",
              title: "Красная тематика (Эмодзи и паки)",
              category: "Наборы и паки",
              tags: ["красный", "паки", "эмодзи", "автовыдача"],
              preview_title: "❤️🔴🧧〖 Готовый пак эмодзи 〗〖 +1000 шт 〗〖 АВТОВЫДАЧА 24/7 〗🧧🔴❤️",
              title_template: "❤️🔴🧧〖 {TITLE} 〗〖 {KEY_FEATURE} 〗〖 АВТОВЫДАЧА 24/7 〗🧧🔴❤️",
              description_template: "⚡] Товар выдается автоматически — вы можете оформить покупку в любое время.\n\n❇️] Процесс получения товара:\n• Оплачиваете заказ.\n• Автоматически получаете ссылку для скачивания всех файлов.\n• Подтверждаете выполнение заказа.\n\n✅] Если у вас возникнут вопросы — с радостью отвечу в личных сообщениях!",
              buyer_message_template: "❤️🔴 Спасибо за покупку! [ДАННЫЕ ТОВАРА] Если возникнут вопросы — пишите в чат!"
            }
          ]
        };
        return new Response(JSON.stringify(fallback), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Динамический каталог шаблонов сообщений ---
      if (request.method === "GET" && (url.pathname === "/catalog/templates" || url.pathname === "/templates-catalog.json")) {
        const kvTemplates = await env.FPT_PROFILES.get("catalog:templates");
        if (kvTemplates) return new Response(kvTemplates, { headers: corsHeaders });

        try {
          let ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/templates-catalog.json", {
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (ghRes.ok) {
            const text = await ghRes.text();
            return new Response(text, { headers: corsHeaders });
          }
        } catch (e) {
          console.error("Ошибка загрузки шаблонов с GitHub:", e);
        }

        const fallback = { version: 1, presets: [] };
        return new Response(JSON.stringify(fallback), { headers: corsHeaders });
      }

      // --- Публичный эндпоинт: Динамический каталог пресетов авто-ответов ---
      if (request.method === "GET" && (url.pathname === "/catalog/autoreplies" || url.pathname === "/autoreplies-catalog.json")) {
        const kvReplies = await env.FPT_PROFILES.get("catalog:autoreplies");
        if (kvReplies) return new Response(kvReplies, { headers: corsHeaders });

        try {
          let ghRes = await fetch("https://raw.githubusercontent.com/SanoSenpay/FoxenThemes/main/autoreplies-catalog.json", {
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (ghRes.ok) {
            const text = await ghRes.text();
            return new Response(text, { headers: corsHeaders });
          }
        } catch (e) {
          console.error("Ошибка загрузки авто-ответов с GitHub:", e);
        }

        const fallback = { version: 1, presets: [] };
        return new Response(JSON.stringify(fallback), { headers: corsHeaders });
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

      // --- Эндпоинт авторизации Telegram: Проверка кода и создание профиля с контролем 1 TG = 1 FP ---
      if (url.searchParams.get("action") === "verify_code" || url.pathname === "/api/auth/verify") {
        const code = url.searchParams.get("code");
        const fpUser = url.searchParams.get("fp_user");

        if (!code || !fpUser) {
          return new Response(JSON.stringify({ success: false, error: "Укажите код авторизации и логин FunPay." }), { status: 400, headers: corsHeaders });
        }

        const codeDataStr = await env.FPT_PROFILES.get(`auth_code:${code}`);
        const codeData = codeDataStr ? JSON.parse(codeDataStr) : { tg_user: `@user_${code}` };
        const tgUser = codeData.tg_user;

        // Проверка уникальности привязки: один Telegram аккаунт не должен быть связан с другими аккаунтами FunPay
        const existingFp = await env.FPT_PROFILES.get(`tg_owner:${tgUser.toLowerCase()}`);
        if (existingFp && existingFp.toLowerCase() !== fpUser.toLowerCase()) {
          return new Response(JSON.stringify({
            success: false,
            error: `Данный Telegram аккаунт (${tgUser}) уже привязан к другому пользователю FunPay (${existingFp}).`
          }), { status: 400, headers: corsHeaders });
        }

        const profile = {
          FP_USER: fpUser,
          TG_USER: tgUser,
          SUBSCRIPTION: codeData.subscription || "free",
          USED_KEY: codeData.used_key || "FXN-FREE-DEFAULT",
          EXPIRES_AT: codeData.expires_at || null,
          CREATED_AT: new Date().toISOString()
        };

        await env.FPT_PROFILES.put(`profile:${fpUser.toLowerCase()}`, JSON.stringify(profile));
        await env.FPT_PROFILES.put(`tg_owner:${tgUser.toLowerCase()}`, fpUser);
        if (codeDataStr) await env.FPT_PROFILES.delete(`auth_code:${code}`);

        return new Response(JSON.stringify({ success: true, data: profile }), { headers: corsHeaders });
      }

      // --- Проверка общего ключа авторизации API (только для легаси /me/ роутов) ---
      if (url.pathname.startsWith("/me/")) {
        const fxnKey = request.headers.get("X-FPT-Key");
        if (!fxnKey || fxnKey !== "fptoolsdim") {
          return new Response(JSON.stringify({ error: { code: "BAD_KEY" } }), { status: 403, headers: corsHeaders });
        }
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

        // Модерация на отсутствие сторонних контактов
        if (description.length > 0) {
          // 1. Детерминированная проверка регулярными выражениями (быстро и 100% надёжно для стандартных юзернеймов/ссылок)
          const contactRegex = /@([a-zA-Z0-9_]{3,32})|(?:t\.me|telegram\.me|tg:\/\/|discord\.(?:gg|com\/invite)|vk\.com|wa\.me|viber\:\/\/)\/[^\s\n]+|\b(?:тг|tg|telegram|дискорд|discord|вк|vk|вайбер|viber|ватсап|whatsapp)\b|(?:\+?7|8)[\s\-\(]*\d{3}[\s\-\)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/i;
          if (contactRegex.test(description)) {
            return new Response(JSON.stringify({ error: { code: "DESCRIPTION_SPAM", message: "Обнаружены контакты (Telegram / ссылки / телефон). Указывать контакты запрещено." } }), { status: 400, headers: corsHeaders });
          }

          // 2. ИИ-модерация для завуалированных попыток обхода
          const aiPrompt = `Analyze the profile description for ANY prohibited external contact details.

PROHIBITED CONTACTS:
- Telegram handles or usernames (e.g. @username, tg: user, тг user)
- Links to Telegram, Discord, VK, WhatsApp or any external website (e.g., t.me/..., discord.gg/...)
- Phone numbers (+7..., 89...) or email addresses
- Requests to contact off-platform (e.g. "пишите в телегу", "связь в тг")

EXAMPLES OF PROHIBITED TEXT:
"Мой тг @user" -> {"ok": false, "reason": "Указан Telegram юзернейм"}
"Пишите в телеграм: user123" -> {"ok": false, "reason": "Указаны контакты Telegram"}
"t.me/channel" -> {"ok": false, "reason": "Указана ссылка на Telegram"}

Output ONLY valid JSON: {"ok": true} OR {"ok": false, "reason": "причина на русском"}.

TEXT TO ANALYZE:
"${description}"`;

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

      // =========================================================================
      // --- SUPABASE CLOUD BACKUP SLOTS API (До 2 слотов на пользователя) ---
      // =========================================================================
      
      const MAX_SLOTS = parseInt(env.MAX_SLOTS || "2", 10);

      // Вспомогательная функция валидации Supabase JWT пользователя
      const getSupabaseUser = async (req, env) => {
        const auth = req.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) return null;
        const token = auth.replace("Bearer ", "");

        const supabaseUrl = env.SUPABASE_URL;
        const anonKey = env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey || supabaseUrl.includes("your-project")) return null;

        try {
          const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${token}`
            }
          });
          if (!res.ok) return null;
          const user = await res.json();
          return { user, token };
        } catch (e) {
          return null;
        }
      };

      // 1. GET /api/cloud/backups — Список 2 слотов пользователя
      if (request.method === "GET" && url.pathname === "/api/cloud/backups") {
        const authData = await getSupabaseUser(request, env);
        if (!authData) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Необходима авторизация" } }), { status: 401, headers: corsHeaders });
        }

        const { user, token } = authData;
        const supabaseUrl = env.SUPABASE_URL;
        const anonKey = env.SUPABASE_ANON_KEY;

        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/backup_slots?user_id=eq.${user.id}&select=*`, {
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${token}`
            }
          });

          const dbSlots = res.ok ? await res.json() : [];

          const slots = [];
          for (let i = 1; i <= MAX_SLOTS; i++) {
            const existing = dbSlots.find(s => s.slot_number === i);
            slots.push({
              slot: i,
              is_used: Boolean(existing),
              slot_name: existing ? existing.slot_name : `Свободный слот ${i}`,
              file_size_bytes: existing ? existing.file_size_bytes : 0,
              updated_at: existing ? existing.updated_at : null
            });
          }

          return new Response(JSON.stringify({ ok: true, max_slots: MAX_SLOTS, used_slots: dbSlots.length, slots }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
        }
      }

      // 2. POST /api/cloud/backups/save — Сохранить бэкап в слот N (1..2)
      if (request.method === "POST" && url.pathname === "/api/cloud/backups/save") {
        const authData = await getSupabaseUser(request, env);
        if (!authData) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Необходима авторизация" } }), { status: 401, headers: corsHeaders });
        }

        const { user, token } = authData;
        const body = await request.json();
        const slotNumber = parseInt(body.slot, 10);
        const slotName = (body.slot_name || `Бэкап #${slotNumber}`).trim();
        const settingsData = body.settings_data;

        if (!slotNumber || slotNumber < 1 || slotNumber > MAX_SLOTS) {
          return new Response(JSON.stringify({ error: { code: "INVALID_SLOT", message: `Допустимы только слоты от 1 до ${MAX_SLOTS}` } }), { status: 400, headers: corsHeaders });
        }

        if (!settingsData) {
          return new Response(JSON.stringify({ error: { code: "EMPTY_DATA", message: "Переданы пустые настройки" } }), { status: 400, headers: corsHeaders });
        }

        const jsonString = JSON.stringify(settingsData);
        const fileSizeBytes = new TextEncoder().encode(jsonString).length;

        // Лимит размера: 2 МБ (2097152 байт)
        if (fileSizeBytes > 2097152) {
          return new Response(JSON.stringify({ error: { code: "PAYLOAD_TOO_LARGE", message: "Размер бэкапа превышает лимит 2 МБ" } }), { status: 413, headers: corsHeaders });
        }

        const supabaseUrl = env.SUPABASE_URL;
        const anonKey = env.SUPABASE_ANON_KEY;
        const authHeaderToken = (typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" && env.SUPABASE_SERVICE_ROLE_KEY.length > 20) ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : (token || anonKey);
        const filePath = `${user.id}/slot_${slotNumber}.json`;

        try {
          const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/user-backups/${filePath}`, {
            method: "POST",
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${authHeaderToken}`,
              "Content-Type": "application/json",
              "x-upsert": "true"
            },
            body: jsonString
          });

          if (!storageRes.ok) {
            const storageErr = await storageRes.text();
            throw new Error(`Storage upload failed: ${storageErr}`);
          }

          const now = new Date().toISOString();
          const dbRes = await fetch(`${supabaseUrl}/rest/v1/backup_slots`, {
            method: "POST",
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${authHeaderToken}`,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              user_id: user.id,
              slot_number: slotNumber,
              slot_name: slotName,
              file_path: filePath,
              file_size_bytes: fileSizeBytes,
              updated_at: now
            })
          });

          if (!dbRes.ok) {
            const dbErr = await dbRes.text();
            throw new Error(`Database upsert failed: ${dbErr}`);
          }

          return new Response(JSON.stringify({
            ok: true,
            slot: slotNumber,
            slot_name: slotName,
            file_size_bytes: fileSizeBytes,
            updated_at: now
          }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
        }
      }

      // 3. POST /api/cloud/backups/restore — Восстановить бэкап из слота N (1..2)
      if (request.method === "POST" && url.pathname === "/api/cloud/backups/restore") {
        const authData = await getSupabaseUser(request, env);
        if (!authData) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Необходима авторизация" } }), { status: 401, headers: corsHeaders });
        }

        const { user, token } = authData;
        const body = await request.json();
        const slotNumber = parseInt(body.slot, 10);

        if (!slotNumber || slotNumber < 1 || slotNumber > MAX_SLOTS) {
          return new Response(JSON.stringify({ error: { code: "INVALID_SLOT", message: `Допустимы только слоты от 1 до ${MAX_SLOTS}` } }), { status: 400, headers: corsHeaders });
        }

        const supabaseUrl = env.SUPABASE_URL;
        const anonKey = env.SUPABASE_ANON_KEY;
        const authHeaderToken = (typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" && env.SUPABASE_SERVICE_ROLE_KEY.length > 20) ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : (token || anonKey);
        const filePath = `${user.id}/slot_${slotNumber}.json`;

        try {
          const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/user-backups/${filePath}`, {
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${authHeaderToken}`
            }
          });

          if (!storageRes.ok) {
            return new Response(JSON.stringify({ error: { code: "SLOT_EMPTY", message: `Слот ${slotNumber} пуст` } }), { status: 404, headers: corsHeaders });
          }

          const settingsData = await storageRes.json();
          return new Response(JSON.stringify({ ok: true, slot: slotNumber, settings_data: settingsData }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
        }
      }

      // 4. DELETE /api/cloud/backups/delete — Удалить бэкап из слота N (1..2)
      if (request.method === "DELETE" && url.pathname === "/api/cloud/backups/delete") {
        const authData = await getSupabaseUser(request, env);
        if (!authData) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Необходима авторизация" } }), { status: 401, headers: corsHeaders });
        }

        const { user, token } = authData;
        const body = await request.json();
        const slotNumber = parseInt(body.slot, 10);

        if (!slotNumber || slotNumber < 1 || slotNumber > MAX_SLOTS) {
          return new Response(JSON.stringify({ error: { code: "INVALID_SLOT", message: `Допустимы только слоты от 1 до ${MAX_SLOTS}` } }), { status: 400, headers: corsHeaders });
        }

        const supabaseUrl = env.SUPABASE_URL;
        const anonKey = env.SUPABASE_ANON_KEY;
        const authHeaderToken = (typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" && env.SUPABASE_SERVICE_ROLE_KEY.length > 20) ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : (token || anonKey);
        const filePath = `${user.id}/slot_${slotNumber}.json`;

        try {
          await fetch(`${supabaseUrl}/storage/v1/object/user-backups/${filePath}`, {
            method: "DELETE",
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${authHeaderToken}`
            }
          });

          await fetch(`${supabaseUrl}/rest/v1/backup_slots?user_id=eq.${user.id}&slot_number=eq.${slotNumber}`, {
            method: "DELETE",
            headers: {
              "apikey": anonKey,
              "Authorization": `Bearer ${authHeaderToken}`
            }
          });

          return new Response(JSON.stringify({ ok: true, slot: slotNumber }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт телеметрии и отчетов об ошибках ---
      if (request.method === "POST" && (url.pathname === "/api/telemetry" || url.pathname === "/telemetry")) {
        try {
          const telemetryData = await request.json();
          const tgToken = env.TELEMETRY_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || env.TELEMETRY_BOT_TOKEN || env.BOT_TOKEN;
          const tgChatId = env.TELEGRAM_CHAT_ID || env.TELEMETRY_CHAT_ID || env.TELEMETRY_CHANNEL_ID;

          const TELEMETRY_TOPICS = {
            storage: 20, // 🗄️ База данных / Хранилище
            network: 6,  // 🌐 Сеть / API FunPay
            engine:  11, // 🤖 Движок / Автоматизация
            ai:      13, // 🧠 ИИ / Нейросети
            auth:    15, // 🔐 Авторизация / Сессии
            general: 31  // ⚠️ Общие ошибки
          };

          const text = telemetryData.formattedMessage || `🚨 Ошибка в Foxen v${telemetryData.version}: ${telemetryData.error?.message || "Неизвестная ошибка"}`;
          const category = telemetryData.category || "general";
          const threadId = telemetryData.messageThreadId || TELEMETRY_TOPICS[category] || TELEMETRY_TOPICS.general;

          if (tgToken && tgChatId) {
            const endpoint = `https://api.telegram.org/bot${encodeURIComponent(tgToken)}/sendMessage`;
            const tgPayload = {
              chat_id: tgChatId,
              text: text,
              parse_mode: "HTML",
              disable_web_page_preview: true
            };
            if (threadId) {
              tgPayload.message_thread_id = parseInt(threadId, 10);
            }
            await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(tgPayload)
            });
          }
          return new Response(JSON.stringify({ ok: true, success: true }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт: RMT Hub статистика продавца ---
      if (request.method === "GET" && url.pathname === "/api/rmthub") {
        const username = url.searchParams.get("username");
        if (!username) {
          return new Response(JSON.stringify({ ok: false, error: "Username is required" }), { status: 400, headers: corsHeaders });
        }
        try {
          const targetUrl = `https://fptools-ai-server.vercel.app/api/rmthub?username=${encodeURIComponent(username)}`;
          const res = await fetch(targetUrl, { headers: { "User-Agent": "Foxen-Worker/1.0" } });
          const data = await res.json();
          return new Response(JSON.stringify(data), { status: res.status, headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // --- Публичный эндпоинт: Аватар продавца FunPay ---
      if (request.method === "GET" && url.pathname === "/api/avatar") {
        const userId = url.searchParams.get("user_id");
        if (!userId) {
          return new Response(JSON.stringify({ ok: false, error: "user_id is required" }), { status: 400, headers: corsHeaders });
        }
        try {
          const targetUrl = `https://fptools-ai-server.vercel.app/api/avatar?user_id=${encodeURIComponent(userId)}`;
          const res = await fetch(targetUrl, { headers: { "User-Agent": "Foxen-Worker/1.0" } });
          const data = await res.json();
          return new Response(JSON.stringify(data), { status: res.status, headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
    }
  }
};
