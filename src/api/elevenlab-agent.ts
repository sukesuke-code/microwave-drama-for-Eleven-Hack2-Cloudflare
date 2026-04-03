export interface AgentMessage {
  type: string;
  [key: string]: unknown;
}

export interface AudioMessage {
  type: 'audio';
  audio: {
    chunk: string;
  };
}

export interface UserTranscriptMessage {
  type: 'user_transcript';
  user_transcript: string;
}

export interface AgentTranscriptMessage {
  type: 'agent_transcript';
  agent_transcript: string;
}

export interface InterruptionMessage {
  type: 'interruption';
}

export interface PingMessage {
  type: 'ping';
}

export interface PongMessage {
  type: 'pong';
}

export type ElevenLabsEvent =
  | { type: 'audio'; data: string }
  | { type: 'user_transcript'; data: string }
  | { type: 'agent_transcript'; data: string }
  | { type: 'interruption' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error'; error: Error };

export class ElevenLabsAgent {
  private ws: WebSocket | null = null;
  private signedUrl: string;
  private listeners: Map<string, Set<(event: ElevenLabsEvent) => void>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(signedUrl: string) {
    this.signedUrl = signedUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.signedUrl);

        this.ws.onopen = () => {
          console.log('ElevenLabs agent connected');
          this.startPingInterval();
          this.emit({ type: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit({ type: 'error', error: new Error('WebSocket connection error') });
          reject(new Error('Failed to connect to ElevenLabs agent'));
        };

        this.ws.onclose = () => {
          console.log('ElevenLabs agent disconnected');
          this.stopPingInterval();
          this.emit({ type: 'disconnected' });
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: string | ArrayBuffer) {
    try {
      if (typeof data === 'string') {
        const message: AgentMessage = JSON.parse(data);
        this.processMessage(message);
      } else {
        const view = new Uint8Array(data as ArrayBuffer);
        const text = new TextDecoder().decode(view);
        const message: AgentMessage = JSON.parse(text);
        this.processMessage(message);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private processMessage(message: AgentMessage) {
    const type = message.type as string;

    switch (type) {
      case 'audio': {
        const audioMsg = message as unknown as AudioMessage;
        if (audioMsg.audio?.chunk) {
          this.emit({ type: 'audio', data: audioMsg.audio.chunk });
        }
        break;
      }
      case 'user_transcript': {
        const userMsg = message as unknown as UserTranscriptMessage;
        if (userMsg.user_transcript) {
          this.emit({ type: 'user_transcript', data: userMsg.user_transcript });
        }
        break;
      }
      case 'agent_transcript': {
        const agentMsg = message as unknown as AgentTranscriptMessage;
        if (agentMsg.agent_transcript) {
          this.emit({ type: 'agent_transcript', data: agentMsg.agent_transcript });
        }
        break;
      }
      case 'interruption': {
        this.emit({ type: 'interruption' });
        break;
      }
      case 'pong': {
        break;
      }
    }
  }

  send(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    const message = {
      type: 'user_input',
      user_input: text,
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(eventType: string, handler: (event: ElevenLabsEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  private emit(event: ElevenLabsEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const ping: PingMessage = { type: 'ping' };
        this.ws.send(JSON.stringify(ping));
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
