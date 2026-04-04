const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://microwave-show-api-v2.lolololololol.workers.dev";

const DEFAULT_AUDIO_TIMEOUT_MS = 30000;
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_RETRY_COUNT = 1;
const AUDIO_METER_FPS = 30;
const IS_DEV = import.meta.env.DEV;

let activeTtsAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let stopRequested = false;
let activeMeterCleanup: (() => void) | null = null;

let activeMusicAudio: HTMLAudioElement | null = null;
let activeMusicObjectUrl: string | null = null;

function logDebug(...args: unknown[]): void {
  if (IS_DEV) {
    console.debug(...args);
  }
}

function withTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= DEFAULT_RETRY_COUNT; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        signal:
          init?.signal ??
          withTimeoutSignal(
            init?.method === "GET" ? DEFAULT_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS + 3000
          ),
      });

      const data = (await res.json()) as T;
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= DEFAULT_RETRY_COUNT) {
        break;
      }

      const backoffMs = 250 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError ?? new Error("REQUEST_FAILED");
}

type TtsLevelListener = (level: number) => void;

type TtsMeterSnapshot = {
  level: number;
  spectrum: number[];
};

const ttsLevelListeners = new Set<TtsLevelListener>();
const ttsMeterListeners = new Set<(snapshot: TtsMeterSnapshot) => void>();

export type NarrationStyle =
  | "sports"
  | "horror"
  | "documentary"
  | "anime"
  | "movie"
  | "nature";

export type SessionPhase =
  | "opening"
  | "quarter"
  | "middle"
  | "final"
  | "done";

export interface Session {
  foodName: string;
  totalTime: number;
  remainingTime: number;
  style: NarrationStyle;
  phase: SessionPhase;
  isRunning: boolean;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface StartSessionPayload {
  foodName: string;
  totalTime: number;
  style: NarrationStyle;
}

export interface BuildNarrationCueInput {
  foodName: string;
  style: NarrationStyle;
  phase: SessionPhase;
  totalTime: number;
  remainingTime: number;
  exampleTone?: string;
}

export interface AgentNarrationRequest {
  sessionId?: string;
  style: NarrationStyle;
  dishName: string;
  totalTime: number;
  remainingTime: number;
  phase: SessionPhase;
  locale?: string;
}

export interface AgentNarrationResponse {
  text: string;
  play: () => Promise<void>;
}

function emitTtsLevel(level: number): void {
  ttsLevelListeners.forEach((listener) => {
    listener(level);
  });
}

function subscribeTtsLevel(listener: TtsLevelListener): () => void {
  ttsLevelListeners.add(listener);
  return () => {
    ttsLevelListeners.delete(listener);
  };
}

function subscribeTtsMeter(
  listener: (snapshot: TtsMeterSnapshot) => void
): () => void {
  ttsMeterListeners.add(listener);
  return () => {
    ttsMeterListeners.delete(listener);
  };
}

function attachAudioMeter(audio: HTMLAudioElement): () => void {
  const AudioContextImpl =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextImpl) {
    return () => {};
  }

  const audioContext = new AudioContextImpl();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;

  const waveformData = new Uint8Array(analyser.fftSize);
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);

  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  let frameId = 0;
  const minFrameIntervalMs = 1000 / AUDIO_METER_FPS;
  let lastFrameAt = 0;

  const tick = (now: number) => {
    if (now - lastFrameAt < minFrameIntervalMs) {
      frameId = window.requestAnimationFrame(tick);
      return;
    }
    lastFrameAt = now;

    analyser.getByteTimeDomainData(waveformData);
    analyser.getByteFrequencyData(frequencyData);

    let sumSquares = 0;
    for (let i = 0; i < waveformData.length; i += 1) {
      const normalized = (waveformData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / waveformData.length);
    const level = Math.min(1, rms * 3.8);

    const spectrumBins = 16;
    const nyquist = audioContext.sampleRate / 2;
    const minHz = 90;
    const maxHz = Math.min(9000, nyquist);
    const logMin = Math.log10(minHz);
    const logMax = Math.log10(maxHz);

    const spectrum = new Array<number>(spectrumBins);
    for (let index = 0; index < spectrumBins; index += 1) {
      const startRatio = index / spectrumBins;
      const endRatio = (index + 1) / spectrumBins;

      const startHz = Math.pow(
        10,
        logMin + (logMax - logMin) * startRatio
      );
      const endHz = Math.pow(
        10,
        logMin + (logMax - logMin) * endRatio
      );

      const startBin = Math.max(
        0,
        Math.floor((startHz / nyquist) * frequencyData.length)
      );

      const endBin = Math.min(
        frequencyData.length,
        Math.max(
          startBin + 1,
          Math.ceil((endHz / nyquist) * frequencyData.length)
        )
      );

      let sum = 0;
      for (let i = startBin; i < endBin; i += 1) {
        sum += frequencyData[i];
      }

      const avg = sum / Math.max(1, endBin - startBin);
      spectrum[index] = Math.min(1, (avg / 255) * 2.2);
    }

    emitTtsLevel(level);

    ttsMeterListeners.forEach((listener) => {
      listener({
        level,
        spectrum,
      });
    });

    frameId = window.requestAnimationFrame(tick);
  };

  frameId = window.requestAnimationFrame(tick);

  return () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }

    source.disconnect();
    analyser.disconnect();

    emitTtsLevel(0);
    ttsMeterListeners.forEach((listener) => {
      listener({ level: 0, spectrum: [] });
    });

    void audioContext.close();
  };
}

function stopTtsPlayback(): void {
  stopRequested = true;

  if (activeMeterCleanup) {
    activeMeterCleanup();
    activeMeterCleanup = null;
  }

  if (activeTtsAudio) {
    activeTtsAudio.pause();
    activeTtsAudio.src = "";
    activeTtsAudio.load();
    activeTtsAudio = null;
  }

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function stopMusic(): void {
  if (activeMusicAudio) {
    activeMusicAudio.pause();
    activeMusicAudio.src = "";
    activeMusicAudio.load();
    activeMusicAudio = null;
  }

  if (activeMusicObjectUrl) {
    URL.revokeObjectURL(activeMusicObjectUrl);
    activeMusicObjectUrl = null;
  }
}

async function parseAudioBlob(res: Response): Promise<Blob> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as {
      audioBase64?: string;
      audio?: string;
      error?: string;
    };

    const base64Audio = json.audioBase64 || json.audio;

    if (!base64Audio) {
      throw new Error(json.error || "Audio payload is missing");
    }

    const base64 = base64Audio.includes(",")
      ? base64Audio.split(",").pop() ?? ""
      : base64Audio;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: "audio/mpeg" });
  }

  return res.blob();
}

async function playAudioBlob(
  blob: Blob,
  options?: {
    loop?: boolean;
    volume?: number;
    isMusic?: boolean;
  }
): Promise<void> {
  const loop = options?.loop ?? false;
  const volume = options?.volume ?? 1;
  const isMusic = options?.isMusic ?? false;

  stopRequested = false;

  const url = URL.createObjectURL(blob);
  const audio = new Audio();

  audio.preload = "auto";
  audio.src = url;
  audio.loop = loop;
  audio.volume = volume;
  audio.muted = false;
  audio.setAttribute("playsinline", "true");

  if (isMusic) {
    stopMusic();
    activeMusicAudio = audio;
    activeMusicObjectUrl = url;
  } else {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }

    activeTtsAudio = audio;
    activeObjectUrl = url;
    activeMeterCleanup = attachAudioMeter(audio);
  }

  await audio.play();

  if (loop) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let completed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (completed) return;
      completed = true;
      cleanup();
      reject(new Error("Audio playback timed out"));
    }, DEFAULT_AUDIO_TIMEOUT_MS);

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    audio.onpause = () => {
      if (audio.ended || completed) return;

      if (stopRequested) {
        completed = true;
        cleanup();
        reject(new Error("Audio playback stopped"));
        return;
      }

      void audio.play().catch((err) => {
        if (completed) return;
        completed = true;
        cleanup();
        reject(err);
      });
    };

    audio.onended = () => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve();
    };

    audio.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      reject(audio.error ?? new Error("Unknown audio playback error"));
    };
  });

  if (isMusic) {
    if (activeMusicObjectUrl === url) {
      URL.revokeObjectURL(url);
      activeMusicObjectUrl = null;
    }
    if (activeMusicAudio) {
      activeMusicAudio.src = "";
      activeMusicAudio.load();
      activeMusicAudio = null;
    }
  } else {
    if (activeObjectUrl === url) {
      URL.revokeObjectURL(url);
      activeObjectUrl = null;
    }
    if (activeTtsAudio) {
      activeTtsAudio.src = "";
      activeTtsAudio.load();
      activeTtsAudio = null;
    }
    if (activeMeterCleanup) {
      activeMeterCleanup();
      activeMeterCleanup = null;
    }
  }
}

async function startSession(
  foodName: string,
  totalTime: number,
  style: NarrationStyle
): Promise<Session> {
  const payload: StartSessionPayload = {
    foodName: String(foodName || "").trim(),
    totalTime: Number(totalTime),
    style,
  };

  const data = await requestJson<{
    ok?: boolean;
    session?: Session;
    error?: string;
  }>("/api/session/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  logDebug("startSession response", data);

  if (!data.ok || !data.session?.sessionId) {
    throw new Error(data?.error || "Failed to start session");
  }

  return data.session;
}

async function getSession(sessionId: string): Promise<Session> {
  const data = await requestJson<{
    ok?: boolean;
    session?: Session;
    error?: string;
  }>(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  logDebug("getSession response", data);

  if (!data.ok || !data.session) {
    throw new Error(data?.error || "Failed to get session");
  }

  return data.session;
}

async function tickSession(
  sessionId: string,
  remainingTime: number
): Promise<void> {
  const payload = {
    sessionId,
    remainingTime: Number(remainingTime),
  };

  const data = await requestJson<{
    ok?: boolean;
    error?: string;
  }>("/api/session/tick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  logDebug("tickSession response", data);

  if (!data.ok) {
    throw new Error(data?.error || "Failed to tick session");
  }
}

async function saveNarration(sessionId: string, text: string): Promise<void> {
  const payload = {
    sessionId,
    text: String(text || "").trim(),
  };

  const data = await requestJson<{
    ok?: boolean;
    error?: string;
  }>("/api/session/narration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  logDebug("saveNarration response", data);

  if (!data.ok) {
    throw new Error(data?.error || "Failed to save narration");
  }
}

async function getSignedUrl(): Promise<string> {
  const data = await requestJson<{
    ok?: boolean;
    signedUrl?: string;
    agentId?: string;
    error?: string;
  }>("/api/get-signed-url", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  logDebug("getSignedUrl response", data);

  if (!data.ok || !data.signedUrl) {
    throw new Error(data?.error || "Failed to get signed URL");
  }

  return data.signedUrl;
}

function buildNarrationCue(input: BuildNarrationCueInput): string {
  const {
    foodName,
    style,
    phase,
    totalTime,
    remainingTime,
    exampleTone = "short vivid narration",
  } = input;

  return `Create exactly one short live narration line for the current moment.

foodName: ${foodName}
style: ${style}
phase: ${phase}
totalTime: ${totalTime}
remainingTime: ${remainingTime}
exampleTone: ${exampleTone}

Constraints:
- Output only one short narration line
- No greeting
- No questions
- No explanations
- Stay fully in character
- Match style and phase strongly
- Make it suitable for both subtitle and voice

Sound direction:
- Always assume this moment requires background music
- Always assume this moment requires a sound effect accent
- Match sound design to style and phase`;
}

async function requestAgentNarration(
  request: AgentNarrationRequest
): Promise<AgentNarrationResponse> {
  const data = await requestJson<{
    ok?: boolean;
    text?: string;
    error?: string;
  }>("/api/agent/narration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  logDebug("requestAgentNarration response", data);

  if (!data.ok || !data.text) {
    throw new Error(data.error || "Agent narration failed");
  }

  return {
    text: data.text,
    play: async () => {
      return;
    },
  };
}

async function playSfx(prompt: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/generate-sfx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
    signal: withTimeoutSignal(DEFAULT_REQUEST_TIMEOUT_MS + 5000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "SFX generation failed");
  }

  const blob = await parseAudioBlob(res);
  await playAudioBlob(blob, { loop: false, volume: 0.55, isMusic: false });
}

async function playMusic(prompt: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/generate-music`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
    signal: withTimeoutSignal(DEFAULT_REQUEST_TIMEOUT_MS + 5000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Music generation failed");
  }

  const blob = await parseAudioBlob(res);
  await playAudioBlob(blob, { loop: true, volume: 0.3, isMusic: true });
}

async function playTtsFromBlob(blob: Blob): Promise<void> {
  await playAudioBlob(blob, { loop: false, volume: 1, isMusic: false });
}

export {
  API_BASE,
  startSession,
  getSession,
  tickSession,
  saveNarration,
  getSignedUrl,
  buildNarrationCue,
  requestAgentNarration,
  playSfx,
  playMusic,
  stopMusic,
  stopTtsPlayback,
  subscribeTtsLevel,
  subscribeTtsMeter,
  playTtsFromBlob,
};

export const api = {
  API_BASE,
  startSession,
  getSession,
  tickSession,
  saveNarration,
  getSignedUrl,
  buildNarrationCue,
  requestAgentNarration,
  playSfx,
  playMusic,
  stopMusic,
  stopTtsPlayback,
  subscribeTtsLevel,
  subscribeTtsMeter,
  playTtsFromBlob,
};
