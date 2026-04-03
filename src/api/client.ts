export interface Env {
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_AGENT_ID?: string;
  AI: Ai;
  TIMER_SESSION: DurableObjectNamespace;
  MICROWAVE_SESSION_AGENT: DurableObjectNamespace;
}

type NarrationStyle =
  | "sports"
  | "horror"
  | "documentary"
  | "anime"
  | "movie"
  | "nature";

type SessionPhase =
  | "opening"
  | "quarter"
  | "middle"
  | "final"
  | "done";

type SessionRecord = {
  sessionId: string;
  foodName: string;
  totalTime: number;
  remainingTime: number;
  style: NarrationStyle;
  phase: SessionPhase;
  isRunning: boolean;
  narrationText: string;
  createdAt: number;
  updatedAt: number;
};

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function corsHeaders(contentType = "application/json") {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders(),
  });
}

function badRequest(error: string) {
  return json({ ok: false, error }, 400);
}

function getPhaseFromRemainingTime(
  remainingTime: number,
  totalTime: number
): SessionPhase {
  if (remainingTime <= 0) return "done";

  const ratio = remainingTime / totalTime;

  if (ratio > 0.75) return "opening";
  if (ratio > 0.5) return "quarter";
  if (ratio > 0.25) return "middle";
  return "final";
}

function isValidStyle(style: unknown): style is NarrationStyle {
  return [
    "sports",
    "horror",
    "documentary",
    "anime",
    "movie",
    "nature",
  ].includes(String(style));
}

function makeSessionId() {
  return crypto.randomUUID();
}

async function getSessionStub(env: Env, sessionId: string) {
  return env.TIMER_SESSION.get(env.TIMER_SESSION.idFromName(sessionId));
}

/* =========================
   Durable Object: TimerSession
========================= */

export class TimerSession {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/internal/session/start" && request.method === "POST") {
      const body = (await request.json()) as {
        sessionId: string;
        foodName: string;
        totalTime: number;
        style: NarrationStyle;
      };

      const now = Date.now();

      const session: SessionRecord = {
        sessionId: body.sessionId,
        foodName: String(body.foodName || "").trim(),
        totalTime: Number(body.totalTime),
        remainingTime: Number(body.totalTime),
        style: body.style,
        phase: "opening",
        isRunning: true,
        narrationText: "",
        createdAt: now,
        updatedAt: now,
      };

      await this.state.storage.put("session", session);
      return json({ ok: true, session });
    }

    if (url.pathname === "/internal/session/get" && request.method === "GET") {
      const session = await this.state.storage.get<SessionRecord>("session");

      if (!session) {
        return json({ ok: false, error: "Session not found" }, 404);
      }

      return json({ ok: true, session });
    }

    if (url.pathname === "/internal/session/tick" && request.method === "POST") {
      const body = (await request.json()) as {
        remainingTime: number;
      };

      const session = await this.state.storage.get<SessionRecord>("session");

      if (!session) {
        return json({ ok: false, error: "Session not found" }, 404);
      }

      const nextRemainingTime = Math.max(0, Number(body.remainingTime));
      const nextPhase = getPhaseFromRemainingTime(
        nextRemainingTime,
        session.totalTime
      );

      const updated: SessionRecord = {
        ...session,
        remainingTime: nextRemainingTime,
        phase: nextPhase,
        isRunning: nextRemainingTime > 0,
        updatedAt: Date.now(),
      };

      await this.state.storage.put("session", updated);
      return json({ ok: true, session: updated });
    }

    if (
      url.pathname === "/internal/session/narration" &&
      request.method === "POST"
    ) {
      const body = (await request.json()) as {
        text: string;
      };

      const session = await this.state.storage.get<SessionRecord>("session");

      if (!session) {
        return json({ ok: false, error: "Session not found" }, 404);
      }

      const updated: SessionRecord = {
        ...session,
        narrationText: String(body.text || "").trim(),
        updatedAt: Date.now(),
      };

      await this.state.storage.put("session", updated);
      return json({ ok: true, session: updated });
    }

    return json({ ok: false, error: "Not found" }, 404);
  }
}

/* =========================
   Durable Object: MicrowaveSessionAgent
   残しておく用
========================= */

export class MicrowaveSessionAgent {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(): Promise<Response> {
    return json({ ok: true, durableObject: "MicrowaveSessionAgent" });
  }
}

/* =========================
   Worker
========================= */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({
        ok: true,
        service: "microwave-show-api",
      });
    }

    /* -------------------------
       POST /api/session/start
    ------------------------- */
    if (url.pathname === "/api/session/start" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          foodName?: string;
          totalTime?: number;
          style?: NarrationStyle;
        };

        const foodName = String(body.foodName || "").trim();
        const totalTime = Number(body.totalTime);
        const style = body.style;

        if (!foodName) {
          return badRequest("foodName is required");
        }

        if (!Number.isFinite(totalTime) || totalTime <= 0) {
          return badRequest("totalTime must be a positive number");
        }

        if (!isValidStyle(style)) {
          return badRequest("style is invalid");
        }

        const sessionId = makeSessionId();
        const stub = await getSessionStub(env, sessionId);

        const startRes = await stub.fetch("https://do/internal/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            foodName,
            totalTime,
            style,
          }),
        });

        const data = (await startRes.json()) as {
          ok?: boolean;
          session?: SessionRecord;
          error?: string;
        };

        if (!startRes.ok || !data.ok || !data.session) {
          return json(
            { ok: false, error: data.error || "Failed to start session" },
            500
          );
        }

        return json({ ok: true, session: data.session });
      } catch (error) {
        return json(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

    /* -------------------------
       GET /api/session?sessionId=...
    ------------------------- */
    if (url.pathname === "/api/session" && request.method === "GET") {
      try {
        const sessionId = url.searchParams.get("sessionId") || "";

        if (!sessionId) {
          return badRequest("sessionId is required");
        }

        const stub = await getSessionStub(env, sessionId);
        const res = await stub.fetch("https://do/internal/session/get");

        const data = (await res.json()) as {
          ok?: boolean;
          session?: SessionRecord;
          error?: string;
        };

        if (!res.ok || !data.ok || !data.session) {
          return json(
            { ok: false, error: data.error || "Session not found" },
            res.status || 404
          );
        }

        return json({ ok: true, session: data.session });
      } catch (error) {
        return json(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

    /* -------------------------
       POST /api/session/tick
    ------------------------- */
    if (url.pathname === "/api/session/tick" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          sessionId?: string;
          remainingTime?: number;
        };

        const sessionId = String(body.sessionId || "");
        const remainingTime = Number(body.remainingTime);

        if (!sessionId) {
          return badRequest("sessionId is required");
        }

        if (!Number.isFinite(remainingTime) || remainingTime < 0) {
          return badRequest("remainingTime must be a non-negative number");
        }

        const stub = await getSessionStub(env, sessionId);

        const res = await stub.fetch("https://do/internal/session/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remainingTime }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          session?: SessionRecord;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          return json(
            { ok: false, error: data.error || "Failed to tick session" },
            res.status || 500
          );
        }

        return json({ ok: true, session: data.session });
      } catch (error) {
        return json(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

    /* -------------------------
       POST /api/session/narration
    ------------------------- */
    if (url.pathname === "/api/session/narration" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          sessionId?: string;
          text?: string;
        };

        const sessionId = String(body.sessionId || "");
        const text = String(body.text || "").trim();

        if (!sessionId) {
          return badRequest("sessionId is required");
        }

        if (!text) {
          return badRequest("text is required");
        }

        const stub = await getSessionStub(env, sessionId);

        const res = await stub.fetch("https://do/internal/session/narration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          session?: SessionRecord;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          return json(
            { ok: false, error: data.error || "Failed to save narration" },
            res.status || 500
          );
        }

        return json({ ok: true, session: data.session });
      } catch (error) {
        return json(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

    /* -------------------------
       GET /api/get-signed-url
    ------------------------- */
    if (url.pathname === "/api/get-signed-url" && request.method === "GET") {
      try {
        if (!env.ELEVENLABS_API_KEY) {
          return json({ ok: false, error: "Missing ELEVENLABS_API_KEY" }, 500);
        }

        if (!env.ELEVENLABS_AGENT_ID) {
          return json({ ok: false, error: "Missing ELEVENLABS_AGENT_ID" }, 500);
        }

        const res = await fetch(
          `${ELEVENLABS_BASE}/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
            env.ELEVENLABS_AGENT_ID
          )}`,
          {
            method: "GET",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
            },
          }
        );

        const text = await res.text();

        let data: unknown = text;
        try {
          data = JSON.parse(text);
        } catch {
          // raw text fallback
        }

        if (!res.ok) {
          return json(
            {
              ok: false,
              error: `Failed to get signed URL from ElevenLabs (${res.status})`,
              details: data,
            },
            500
          );
        }

        const signedUrl =
          (data as { signed_url?: string; signedUrl?: string })?.signed_url ||
          (data as { signed_url?: string; signedUrl?: string })?.signedUrl;

        if (!signedUrl) {
          return json(
            {
              ok: false,
              error: "Signed URL missing in ElevenLabs response",
              details: data,
            },
            500
          );
        }

        return json({
          ok: true,
          signedUrl,
          agentId: env.ELEVENLABS_AGENT_ID,
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500
        );
      }
    }

    return json({ ok: false, error: "Not found" }, 404);
  },
};