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

export function connectAgent(_signedUrl: string, handlers: ConnectHandlers): AgentConnection {
  let isConnected = false;
  let connectionTimeoutId: number | null = null;

  const openConnection = () => {
    isConnected = true;
    handlers.onOpen?.();
  };

  const closeConnection = () => {
    isConnected = false;
    handlers.onClose?.();
  };

  connectionTimeoutId = window.setTimeout(() => {
    openConnection();
  }, 300);

  const sendText = (text: string) => {
    if (!isConnected) return;

    handlers.onSpeaking?.();
    window.setTimeout(() => {
      handlers.onText?.(text);
    }, 100);
  };

  return {
    sendText,
    disconnect: () => {
      if (connectionTimeoutId !== null) {
        window.clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      closeConnection();
    },
  };
}
