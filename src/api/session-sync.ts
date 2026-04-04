const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

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
    const wsUrl = API_BASE.replace(/^http/, "ws") + `/api/session/ws/${this.sessionId}`;
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
