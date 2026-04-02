export type AgentStatus = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'error';

interface ConnectHandlers {
  onOpen?: () => void;
  onSpeaking?: () => void;
  onText?: (text: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export interface AgentConnection {
  sendText: (text: string) => void;
  disconnect: () => void;
}

export function connectAgent(signedUrl: string, handlers: ConnectHandlers): AgentConnection {
  const ws = new WebSocket(signedUrl);

  ws.onopen = () => {
    handlers.onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(typeof event.data === 'string' ? event.data : '{}') as Record<string, unknown>;
      const text = typeof parsed.text === 'string'
        ? parsed.text
        : typeof parsed.transcript === 'string'
          ? parsed.transcript
          : '';

      if (text) {
        handlers.onText?.(text);
      }

      const type = typeof parsed.type === 'string' ? parsed.type : '';
      if (type.includes('speak') || type.includes('audio') || type.includes('response')) {
        handlers.onSpeaking?.();
      }
    } catch {
      // ignore unsupported payload format
    }
  };

  ws.onclose = () => {
    handlers.onClose?.();
  };

  ws.onerror = () => {
    handlers.onError?.(new Error('Agent connection error'));
  };

  const sendText = (text: string) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    const payloads = [
      { type: 'user_message', text },
      { type: 'message', text },
      { text },
    ];

    for (const payload of payloads) {
      ws.send(JSON.stringify(payload));
    }
  };

  return {
    sendText,
    disconnect: () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}
