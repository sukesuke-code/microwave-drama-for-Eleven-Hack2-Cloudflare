/**
 * ElevenLabs Conversational AI – WebSocket client
 *
 * Protocol:
 *   wss://api.elevenlabs.io/v1/convai/conversation?agent_id=<id>
 *   OR with signed URL from backend
 *
 * Flow:
 *   1. Connect via WebSocket (signedUrl or agentId)
 *   2. Send conversation_initiation_client_data with dynamic variables
 *   3. Send user_message with situation text
 *   4. Receive agent_response (text) + audio chunks
 *   5. Play audio, display text
 */

const API_BASE =
  import.meta.env.VITE_API_BASE || "";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "";
const WS_BASE = "wss://api.elevenlabs.io/v1/convai/conversation";

type AgentStatus = "disconnected" | "connecting" | "connected" | "error";
type AgentMode = "idle" | "listening" | "speaking";

export interface AgentCallbacks {
  onStatusChange?: (status: AgentStatus) => void;
  onModeChange?: (mode: AgentMode) => void;
  onAgentText?: (text: string) => void;
  onAgentAudioChunk?: (audioBase64: string, sampleRate: number) => void;
  onAgentAudioDone?: () => void;
  onError?: (error: Error) => void;
}

export interface DynamicVars {
  dish_name?: string;
  style?: string;
  total_time?: string;
  remaining_time?: string;
  phase?: string;
  locale?: string;
  [key: string]: string | undefined;
}

// ---------- Audio playback from PCM chunks ----------

let audioContext: AudioContext | null = null;
let audioQueue: AudioBuffer[] = [];
let isPlaying = false;
let onDoneCallback: (() => void) | null = null;

// Meter data for AudioWaveVisualizer
type MeterSnapshot = { level: number; spectrum: number[] };
const meterListeners = new Set<(s: MeterSnapshot) => void>();
let analyserNode: AnalyserNode | null = null;

export function subscribeAgentMeter(
  listener: (s: MeterSnapshot) => void
): () => void {
  meterListeners.add(listener);
  return () => {
    meterListeners.delete(listener);
  };
}

function emitMeter(snapshot: MeterSnapshot) {
  meterListeners.forEach((fn) => fn(snapshot));
}

function emitZeroMeter() {
  emitMeter({ level: 0, spectrum: [] });
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const Impl =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new Impl!();
  }
  return audioContext;
}

function ensureAnalyser(): AnalyserNode {
  if (!analyserNode) {
    const ctx = getAudioContext();
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.8;
    analyserNode.connect(ctx.destination);
  }
  return analyserNode;
}

let meterRafId = 0;

function startMeterLoop() {
  const analyser = ensureAnalyser();
  const waveformData = new Uint8Array(analyser.fftSize);
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const ctx = getAudioContext();

  const tick = () => {
    analyser.getByteTimeDomainData(waveformData);
    analyser.getByteFrequencyData(frequencyData);

    let sumSq = 0;
    for (let i = 0; i < waveformData.length; i++) {
      const n = (waveformData[i] - 128) / 128;
      sumSq += n * n;
    }
    const rms = Math.sqrt(sumSq / waveformData.length);
    const level = Math.min(1, rms * 3.8);

    const bins = 16;
    const nyquist = ctx.sampleRate / 2;
    const logMin = Math.log10(90);
    const logMax = Math.log10(Math.min(9000, nyquist));
    const spectrum: number[] = [];

    for (let idx = 0; idx < bins; idx++) {
      const sRatio = idx / bins;
      const eRatio = (idx + 1) / bins;
      const sHz = Math.pow(10, logMin + (logMax - logMin) * sRatio);
      const eHz = Math.pow(10, logMin + (logMax - logMin) * eRatio);
      const sBin = Math.max(
        0,
        Math.floor((sHz / nyquist) * frequencyData.length)
      );
      const eBin = Math.min(
        frequencyData.length,
        Math.max(sBin + 1, Math.ceil((eHz / nyquist) * frequencyData.length))
      );
      let sum = 0;
      for (let i = sBin; i < eBin; i++) sum += frequencyData[i];
      const avg = sum / Math.max(1, eBin - sBin);
      spectrum.push(Math.min(1, (avg / 255) * 2.2));
    }

    emitMeter({ level, spectrum });
    meterRafId = requestAnimationFrame(tick);
  };
  meterRafId = requestAnimationFrame(tick);
}

function stopMeterLoop() {
  if (meterRafId) {
    cancelAnimationFrame(meterRafId);
    meterRafId = 0;
  }
  emitZeroMeter();
}

function decodePcmChunk(
  base64: string,
  sampleRate: number
): AudioBuffer | null {
  try {
    const ctx = getAudioContext();
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    // 16-bit PCM mono
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.getChannelData(0).set(float32);
    return buffer;
  } catch {
    return null;
  }
}

let nextStartTime = 0;

async function drainAudioQueue() {
  if (isPlaying) return;
  isPlaying = true;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const analyser = ensureAnalyser();
  startMeterLoop();

  nextStartTime = Math.max(ctx.currentTime, nextStartTime);

  while (audioQueue.length > 0) {
    const buffer = audioQueue.shift()!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.start(nextStartTime);
    nextStartTime += buffer.duration;

    // Wait until this chunk finishes
    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
      // Safety timeout
      setTimeout(resolve, buffer.duration * 1000 + 500);
    });
  }

  isPlaying = false;
  stopMeterLoop();
  onDoneCallback?.();
  onDoneCallback = null;
}

function clearAudioQueue() {
  audioQueue = [];
  isPlaying = false;
  nextStartTime = 0;
  stopMeterLoop();
}

// ---------- WebSocket session ----------

let ws: WebSocket | null = null;
let currentCallbacks: AgentCallbacks = {};
let currentStatus: AgentStatus = "disconnected";
let pendingUserMessage: string | null = null;
let collectedAgentText = "";

function setStatus(status: AgentStatus) {
  currentStatus = status;
  currentCallbacks.onStatusChange?.(status);
}

function setMode(mode: AgentMode) {
  currentCallbacks.onModeChange?.(mode);
}

async function fetchSignedUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/get-signed-url`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`fetchSignedUrl failed with status ${res.status}:`, errorText);
      return null;
    }
    const data = (await res.json()) as {
      ok?: boolean;
      signedUrl?: string;
    };
    return data.signedUrl || null;
  } catch (err) {
    console.error("fetchSignedUrl threw an exception:", err);
    return null;
  }
}

export async function connectAgent(
  dynamicVars: DynamicVars,
  callbacks: AgentCallbacks
): Promise<void> {
  currentCallbacks = callbacks;

  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
  clearAudioQueue();
  collectedAgentText = "";

  setStatus("connecting");

  // Prioritize fetching a Signed URL from our Cloudflare backend
  let wsUrl: string;
  const signedUrl = await fetchSignedUrl();
  
  if (signedUrl) {
    wsUrl = signedUrl;
  } else if (AGENT_ID) {
    console.warn("Backend Signed URL failed. Falling back to direct AGENT_ID connection.");
    wsUrl = `${WS_BASE}?agent_id=${AGENT_ID}`;
  } else {
    setStatus("error");
    callbacks.onError?.(
      new Error(
        "Could not get Signed URL from backend, and no VITE_ELEVENLABS_AGENT_ID fallback provided."
      )
    );
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    ws = socket;

    socket.onopen = () => {
      // Send init with dynamic variables
      const initPayload: Record<string, unknown> = {
        type: "conversation_initiation_client_data",
        dynamic_variables: Object.fromEntries(
          Object.entries(dynamicVars).filter(([, v]) => v !== undefined)
        ),
        conversation_config_override: {},
      };
      socket.send(JSON.stringify(initPayload));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          [k: string]: unknown;
        };
        handleWsMessage(msg);
        if (msg.type === "conversation_initiation_metadata") {
          setStatus("connected");
          setMode("idle");

          // Send queued user message
          if (pendingUserMessage) {
            const toSend = pendingUserMessage;
            pendingUserMessage = null;
            sendUserMessage(toSend);
          }
          resolve();
        }
      } catch {
        /* malformed message */
      }
    };

    socket.onerror = () => {
      // Handshake failures usually don't provide event details to JS for security
      setStatus("error");
      const err = new Error("WebSocket connection error. Check if your ElevenLabs Agent is set to 'Public' and 'localhost:5173' is in Authorized Origins.");
      callbacks.onError?.(err);
      reject(err);
    };

    socket.onclose = () => {
      setStatus("disconnected");
      setMode("idle");
    };

    // Timeout
    setTimeout(() => {
      if (currentStatus === "connecting") {
        socket.close();
        setStatus("error");
        callbacks.onError?.(new Error("WebSocket connection timeout"));
        reject(new Error("Timeout"));
      }
    }, 15000);
  });
}

function handleWsMessage(msg: { type: string; [k: string]: unknown }) {
  switch (msg.type) {
    case "agent_response": {
      const text = (msg as { text?: string }).text || "";
      if (text) {
        collectedAgentText += text;
        currentCallbacks.onAgentText?.(collectedAgentText);
      }
      break;
    }

    case "audio": {
      setMode("speaking");
      const audioData = msg as {
        audio?: string;
        audio_event?: { audio_base_64?: string };
        sample_rate?: number;
      };
      const base64 =
        audioData.audio ||
        audioData.audio_event?.audio_base_64 ||
        "";
      const sr = audioData.sample_rate || 16000;
      if (base64) {
        currentCallbacks.onAgentAudioChunk?.(base64, sr);
        const buffer = decodePcmChunk(base64, sr);
        if (buffer) {
          audioQueue.push(buffer);
          void drainAudioQueue();
        }
      }
      break;
    }

    case "agent_response_correction": {
      const corrected = (msg as { text?: string }).text || "";
      if (corrected) {
        collectedAgentText = corrected;
        currentCallbacks.onAgentText?.(corrected);
      }
      break;
    }

    case "turn_end":
    case "interruption": {
      setMode("idle");
      currentCallbacks.onAgentAudioDone?.();
      collectedAgentText = "";
      break;
    }

    case "ping": {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pong" }));
      }
      break;
    }

    default:
      break;
  }
}

export function sendUserMessage(text: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    pendingUserMessage = text;
    return;
  }

  collectedAgentText = "";
  setMode("listening");

  ws.send(
    JSON.stringify({
      type: "user_message",
      text,
    })
  );
}

export function disconnectAgent(): void {
  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
  clearAudioQueue();
  setStatus("disconnected");
  setMode("idle");
  emitZeroMeter();
}

export function stopAgentAudio(): void {
  clearAudioQueue();
  emitZeroMeter();
}

export function isAgentConnected(): boolean {
  return currentStatus === "connected" && ws?.readyState === WebSocket.OPEN;
}

export function getAgentStatus(): AgentStatus {
  return currentStatus;
}
