interface StoredAppState {
  dishName: string;
  style: string;
  durationSeconds: number;
  timeLeft: number;
  aiEnhancedInstruction: string;
  isPaused: boolean;
}

type SessionControlMessage = { type: "pause" | "resume" };

export class MicrowaveSession {
  state: DurableObjectState;
  sessions: Set<WebSocket>;
  
  // App state
  dishName: string = "";
  style: string = "";
  durationSeconds: number = 0;
  timeLeft: number = 0;
  aiEnhancedInstruction: string = "";
  timerInterval: ReturnType<typeof setInterval> | null = null;
  isPaused: boolean = false;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();

    // Recover state if woke up from hibernation
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<StoredAppState>("appState");
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

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const body = await request.json() as StoredAppState;
      this.dishName = body.dishName;
      this.style = body.style;
      this.durationSeconds = body.durationSeconds;
      this.timeLeft = body.durationSeconds;
      this.aiEnhancedInstruction = body.aiEnhancedInstruction;
      this.isPaused = false;
      
      await this.saveState();
      return new Response("OK");
    }

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      
      this.state.acceptWebSocket(server);
      this.sessions.add(server);

      // Send initial state to the newly connected client
      server.send(JSON.stringify({
        type: "init",
        state: this.getPublicState()
      }));

      // Start the global timer if this is the first client and it's not started
      if (this.sessions.size === 1 && !this.timerInterval && !this.isPaused && this.timeLeft > 0) {
        this.startTimer();
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Not found", { status: 404 });
  }

  startTimer() {
    if (this.timerInterval) return;
    
    // In Durable Objects, setTimeout/setInterval can be used if kept alive,
    // or Alarms for guaranteed awakening. We use setInterval for simplicity here.
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
      
      // Save state every few seconds to limit IO
      if (this.timeLeft % 5 === 0 || this.timeLeft <= 0) {
        void this.saveState();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async webSocketMessage(_ws: WebSocket, msg: string | ArrayBuffer) {
    if (typeof msg !== "string") return;
    try {
      const data = JSON.parse(msg) as SessionControlMessage;
      
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
      
    } catch {
      // ignore bad msg
    }
  }

  webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    // If everyone left, maybe pause the timer to save resources
    if (this.sessions.size === 0) {
      this.stopTimer();
    }
  }

  webSocketError(ws: WebSocket) {
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

  broadcast(message: unknown) {
    const msgString = JSON.stringify(message);
    const disconnected: WebSocket[] = [];
    
    this.sessions.forEach((session) => {
      try {
        session.send(msgString);
      } catch {
        disconnected.push(session);
      }
    });

    disconnected.forEach((ws) => this.sessions.delete(ws));
  }
}
