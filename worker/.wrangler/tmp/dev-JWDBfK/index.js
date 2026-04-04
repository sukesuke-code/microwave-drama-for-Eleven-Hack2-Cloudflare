var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-slZAh1/checked-fetch.js
var require_checked_fetch = __commonJS({
  ".wrangler/tmp/bundle-slZAh1/checked-fetch.js"() {
    "use strict";
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
  }
});

// .wrangler/tmp/bundle-slZAh1/middleware-loader.entry.ts
var import_checked_fetch8 = __toESM(require_checked_fetch());

// wrangler-modules-watch:wrangler:modules-watch
var import_checked_fetch = __toESM(require_checked_fetch());

// .wrangler/tmp/bundle-slZAh1/middleware-insertion-facade.js
var import_checked_fetch6 = __toESM(require_checked_fetch());

// src/index.ts
var import_checked_fetch3 = __toESM(require_checked_fetch());

// src/MicrowaveSession.ts
var import_checked_fetch2 = __toESM(require_checked_fetch());
var MicrowaveSession = class {
  static {
    __name(this, "MicrowaveSession");
  }
  state;
  sessions;
  // App state
  dishName = "";
  style = "";
  durationSeconds = 0;
  timeLeft = 0;
  aiEnhancedInstruction = "";
  timerInterval = null;
  isPaused = false;
  constructor(state, env) {
    this.state = state;
    this.sessions = /* @__PURE__ */ new Set();
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("appState");
      if (stored) {
        this.dishName = stored.dishName;
        this.style = stored.style;
        this.durationSeconds = stored.durationSeconds;
        this.timeLeft = stored.timeLeft;
        this.aiEnhancedInstruction = stored.aiEnhancedInstruction;
        this.isPaused = stored.isPaused || false;
      }
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init") {
      const body = await request.json();
      this.dishName = body.dishName;
      this.style = body.style;
      this.durationSeconds = body.durationSeconds;
      this.timeLeft = body.durationSeconds;
      this.aiEnhancedInstruction = body.aiEnhancedInstruction;
      this.isPaused = false;
      await this.saveState();
      return new Response("OK");
    }
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server);
      this.sessions.add(server);
      server.send(JSON.stringify({
        type: "init",
        state: this.getPublicState()
      }));
      if (this.sessions.size === 1 && !this.timerInterval && !this.isPaused && this.timeLeft > 0) {
        this.startTimer();
      }
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }
    return new Response("Not found", { status: 404 });
  }
  startTimer() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;
      this.timeLeft--;
      this.broadcast({
        type: "tick",
        timeLeft: this.timeLeft
      });
      if (this.timeLeft <= 0) {
        this.stopTimer();
      }
      if (this.timeLeft % 5 === 0 || this.timeLeft <= 0) {
        this.saveState();
      }
    }, 1e3);
  }
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string") return;
    try {
      const data = JSON.parse(msg);
      if (data.type === "pause") {
        this.isPaused = true;
        this.stopTimer();
        this.broadcast({ type: "state_changed", state: this.getPublicState() });
        await this.saveState();
      }
      if (data.type === "resume") {
        this.isPaused = false;
        this.startTimer();
        this.broadcast({ type: "state_changed", state: this.getPublicState() });
        await this.saveState();
      }
    } catch (e) {
    }
  }
  webSocketClose(ws, code, reason, wasClean) {
    this.sessions.delete(ws);
    if (this.sessions.size === 0) {
      this.stopTimer();
    }
  }
  webSocketError(ws, error) {
    this.sessions.delete(ws);
  }
  getPublicState() {
    return {
      dishName: this.dishName,
      style: this.style,
      durationSeconds: this.durationSeconds,
      timeLeft: this.timeLeft,
      aiEnhancedInstruction: this.aiEnhancedInstruction,
      isPaused: this.isPaused
    };
  }
  async saveState() {
    await this.state.storage.put("appState", this.getPublicState());
  }
  broadcast(message) {
    const msgString = JSON.stringify(message);
    let disconnected = [];
    this.sessions.forEach((session) => {
      try {
        session.send(msgString);
      } catch (err) {
        disconnected.push(session);
      }
    });
    disconnected.forEach((ws) => this.sessions.delete(ws));
  }
};

// src/index.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    try {
      if (url.pathname === "/api/get-signed-url" && request.method === "GET") {
        return await handleGetSignedUrl(env);
      }
      if (url.pathname === "/api/session/start" && request.method === "POST") {
        return await handleStartSession(request, env);
      }
      if (url.pathname.startsWith("/api/session/ws/")) {
        return await handleSessionWebSocket(request, env);
      }
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }
};
async function handleGetSignedUrl(env) {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) {
    return new Response(JSON.stringify({ error: "Missing ElevenLabs credentials on server." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${env.ELEVENLABS_AGENT_ID}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY
      }
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error("ElevenLabs API error:", text);
    return new Response(JSON.stringify({ error: "Failed to get signed URL from ElevenLabs" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, signedUrl: data.signed_url }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
__name(handleGetSignedUrl, "handleGetSignedUrl");
async function handleStartSession(request, env) {
  const body = await request.json();
  const { dishName, style, durationSeconds } = body;
  let aiEnhancedInstruction = "";
  if (env.AI) {
    try {
      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "You are an assistant that creates very short (1 sentence) dramatic acting instructions for sports/movie commentators. Reply ONLY with the instruction." },
          { role: "user", content: `I am microwaving ${dishName} for ${durationSeconds} seconds in a ${style} style. Give me a 1 sentence acting direction for the narrator.` }
        ]
      });
      aiEnhancedInstruction = aiResponse.response || "";
    } catch (e) {
      console.error("Workers AI failed:", e);
    }
  }
  const sessionId = crypto.randomUUID();
  const id = env.MICROWAVE_SESSION.idFromName(sessionId);
  const stub = env.MICROWAVE_SESSION.get(id);
  await stub.fetch(new Request("http://do/init", {
    method: "POST",
    body: JSON.stringify({ dishName, style, durationSeconds, aiEnhancedInstruction })
  }));
  return new Response(JSON.stringify({ sessionId, aiEnhancedInstruction }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
__name(handleStartSession, "handleStartSession");
async function handleSessionWebSocket(request, env) {
  const url = new URL(request.url);
  const sessionId = url.pathname.split("/").pop();
  if (!sessionId) {
    return new Response("Missing Session ID", { status: 400 });
  }
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }
  const id = env.MICROWAVE_SESSION.idFromName(sessionId);
  const stub = env.MICROWAVE_SESSION.get(id);
  return stub.fetch(request);
}
__name(handleSessionWebSocket, "handleSessionWebSocket");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var import_checked_fetch4 = __toESM(require_checked_fetch());
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

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
var import_checked_fetch5 = __toESM(require_checked_fetch());
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

// .wrangler/tmp/bundle-slZAh1/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var import_checked_fetch7 = __toESM(require_checked_fetch());
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

// .wrangler/tmp/bundle-slZAh1/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
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
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
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
  MicrowaveSession,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
