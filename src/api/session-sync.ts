const API_BASE = import.meta.env.VITE_API_BASE || "";
const WS_PROTOCOL_RE = /^wss?:$/i;

function buildWsUrl(sessionId: string): string {
  const trimmedSessionId = String(sessionId ?? "").trim();
  if (!trimmedSessionId) {
    throw new Error("Session ID is required.");
  }

  if (!API_BASE) {
    if (typeof window === "undefined") {
      throw new Error("VITE_API_BASE is required outside the browser.");
    }
    const fallback = new URL(`/api/session/ws/${encodeURIComponent(trimmedSessionId)}`, window.location.origin);
    fallback.protocol = fallback.protocol === "https:" ? "wss:" : "ws:";
    return fallback.toString();
  }

  const base = new URL(API_BASE);
  if (!/^https?:$/i.test(base.protocol)) {
    throw new Error("VITE_API_BASE must use http or https.");
  }
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = `/api/session/ws/${encodeURIComponent(trimmedSessionId)}`;
  base.search = "";
  base.hash = "";

  if (!WS_PROTOCOL_RE.test(base.protocol)) {
    throw new Error("Failed to construct websocket URL.");
  }

  return base.toString();
}

type SessionState = {
  dishName: string;
  style: string;
  durationSeconds: number;
  timeLeft: number;
  aiEnhancedInstruction: string;
  isPaused: boolean;
};

export class SessionSyncClient {
  ws: WebSocket | null = null;
  sessionId: string;
  onStateChange: (state: SessionState) => void;
  onTick: (timeLeft: number) => void;

  constructor(sessionId: string, onStateChange: (s: SessionState) => void, onTick: (t: number) => void) {
    this.sessionId = sessionId;
    this.onStateChange = onStateChange;
    this.onTick = onTick;
  }

  connect() {
    const wsUrl = buildWsUrl(this.sessionId);
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "init" || data.type === "state_changed") {
          this.onStateChange(data.state);
        } else if (data.type === "tick") {
          this.onTick(data.timeLeft);
        }
      } catch (e) {
        console.error("Failed to parse DO message", e);
      }
    };

    this.ws.onclose = () => {
      console.log("Session WebSocket closed");
    };
  }

  pause() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "pause" }));
    }
  }

  resume() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "resume" }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export async function startMultiplayerSession(dishName: string, durationSeconds: number, style: string) {
  const url = `${API_BASE}/api/session/start`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dishName, durationSeconds, style })
  });
  if (!res.ok) throw new Error("Failed to start session on backend");
  return await res.json() as { sessionId: string, aiEnhancedInstruction: string };
}
