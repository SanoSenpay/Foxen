var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-gQhCrn/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-gQhCrn/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-FPT-Key"
        }
      });
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
      "Content-Type": "application/json"
    };
    try {
      const profileMatch = url.pathname.match(/^\/funpay\/users\/(\d+)\/profile$/);
      if (request.method === "GET" && profileMatch) {
        const userId = profileMatch[1];
        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : { description: null, bannerId: null };
        return new Response(JSON.stringify(profile), { headers: corsHeaders });
      }
      const fxnKey = request.headers.get("X-FPT-Key");
      if (!fxnKey || fxnKey !== "fptoolsdim") {
        return new Response(JSON.stringify({ error: { code: "BAD_KEY" } }), { status: 403, headers: corsHeaders });
      }
      if (request.method === "POST" && url.pathname === "/me/funpay/link/start") {
        const body = await request.json();
        const userId = body.funpayUserId;
        if (!userId)
          return new Response("Bad Request", { status: 400 });
        const code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        await env.FPT_PROFILES.put(`link_start:${userId}`, JSON.stringify({ code }), { expirationTtl: 300 });
        return new Response(JSON.stringify({ ok: true, code }), { headers: corsHeaders });
      }
      if (request.method === "POST" && url.pathname === "/me/funpay/link/confirm") {
        const body = await request.json();
        const userId = body.funpayUserId;
        const offerId = body.offerId;
        if (!userId || !offerId)
          return new Response("Bad Request", { status: 400 });
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
      const getSessionUser = /* @__PURE__ */ __name(async (req) => {
        const auth = req.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer "))
          return null;
        const token = auth.replace("Bearer ", "");
        const sessStr = await env.FPT_PROFILES.get(`session:${token}`);
        if (!sessStr)
          return null;
        return JSON.parse(sessStr).userId;
      }, "getSessionUser");
      if (request.method === "PUT" && url.pathname === "/me/funpay/description") {
        const userId = await getSessionUser(request);
        if (!userId)
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401, headers: corsHeaders });
        const body = await request.json();
        const description = body.description || "";
        if (description.length > 0) {
          const aiPrompt = `Task: Analyze the text for prohibited contact info.
Prohibited: Phone numbers (e.g. +7..., 89...), Telegram/Discord/VK tags or links, WhatsApp, emails, or asking to contact outside the platform.
Return ONLY valid JSON. If prohibited info is found, set "ok" to false and provide a "reason" in Russian. If the text is clean, set "ok" to true.
Text: "${description}"`;
          try {
            const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
              messages: [
                { role: "system", content: 'You are a strict JSON-only AI moderator. Output nothing but JSON. Example: {"ok": false, "reason": "\u041D\u0430\u0439\u0434\u0435\u043D \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430"}' },
                { role: "user", content: aiPrompt }
              ]
            });
            let jsonStr = aiResponse.response;
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (match)
              jsonStr = match[0];
            const result = JSON.parse(jsonStr);
            if (result.ok === false || result.ok === "false") {
              return new Response(JSON.stringify({ error: { code: "DESCRIPTION_SPAM", message: result.reason || "\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C\u0438" } }), { status: 400, headers: corsHeaders });
            }
          } catch (e) {
            console.error("AI Moderation failed", e);
            return new Response(JSON.stringify({ error: { code: "DESCRIPTION_SPAM", message: "\u041E\u0448\u0438\u0431\u043A\u0430 AI \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438: " + String(e) } }), { status: 400, headers: corsHeaders });
          }
        }
        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : {};
        const now = Date.now();
        const lastUpdate = profile.lastDescUpdate || 0;
        if (now - lastUpdate < 24 * 60 * 60 * 1e3) {
          return new Response(JSON.stringify({ error: { code: "WRITE_COOLDOWN" } }), { status: 429, headers: corsHeaders });
        }
        profile.description = description;
        profile.lastDescUpdate = now;
        await env.FPT_PROFILES.put(`profile:${userId}`, JSON.stringify(profile));
        return new Response(JSON.stringify({ ok: true, description, lastDescUpdate: now }), { headers: corsHeaders });
      }
      if (request.method === "PUT" && url.pathname === "/me/funpay/banner") {
        const userId = await getSessionUser(request);
        if (!userId)
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401, headers: corsHeaders });
        const body = await request.json();
        const bannerId = body.bannerId;
        const profileStr = await env.FPT_PROFILES.get(`profile:${userId}`);
        let profile = profileStr ? JSON.parse(profileStr) : {};
        profile.bannerId = bannerId || null;
        await env.FPT_PROFILES.put(`profile:${userId}`, JSON.stringify(profile));
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: e.message } }), { status: 500, headers: corsHeaders });
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gQhCrn/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gQhCrn/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
