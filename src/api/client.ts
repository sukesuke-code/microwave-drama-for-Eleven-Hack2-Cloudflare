const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://microwave-show-api-v2.lolololololol.workers.dev";

const DEFAULT_AUDIO_TIMEOUT_MS = 60000;
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_RETRY_COUNT = 1;
const AUDIO_METER_FPS = 30;
const IS_DEV = import.meta.env.DEV;
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_TEXT_PAYLOAD_LENGTH = 280;
const MAX_DISH_NAME_LENGTH = 100;
const EFFECT_RATE_LIMIT_MS = 1500;

// Audio Constants for Ducking and Theatre Mode Volume
export const DUCKING_LEVEL = 0.15; 
export const NORMAL_MUSIC_LEVEL = 0.65; 
export const SFX_DEFAULT_VOLUME = 0.85; 

let activeTtsAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let stopRequested = false;
let activeMeterCleanup: (() => void) | null = null;
let speechMeterIntervalId: ReturnType<typeof setInterval> | null = null;

let activeMusicAudio: HTMLAudioElement | null = null;
let activeMusicObjectUrl: string | null = null;
let activeSfxAudio: HTMLAudioElement | null = null;
let activeSfxObjectUrl: string | null = null;
let localMusicContext: AudioContext | null = null;
let localMusicNodes: Array<{ stop: () => void }> = [];
const lastEffectRequestAt = new Map<string, number>();

function normalizeTextInput(input: string, maxLen: number): string {
  let output = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    const isControl = code < 32 || code === 127;
    output += isControl ? " " : char;
  }
  return output.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function ensureSafeApiBase(): void {
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API_BASE);
  const isHttps = API_BASE.startsWith("https://");
  if (!isHttps && !isLocalhost) {
    throw new Error("VITE_API_BASE must use HTTPS outside localhost.");
  }
}

function enforceEffectRateLimit(effectKey: "sfx" | "music"): void {
  const now = Date.now();
  const lastAt = lastEffectRequestAt.get(effectKey) ?? 0;
  if (now - lastAt < EFFECT_RATE_LIMIT_MS) {
    throw new Error("EFFECT_RATE_LIMITED");
  }
  lastEffectRequestAt.set(effectKey, now);
}

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
  ensureSafeApiBase();
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

      if (!res.ok) {
        const shouldRetry = RETRYABLE_HTTP_STATUS.has(res.status);
        throw new Error(`HTTP_${res.status}:${shouldRetry ? "RETRYABLE" : "FINAL"}`);
      }

      const data = (await res.json()) as T;
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryableHttp = /HTTP_\d+:RETRYABLE/.test(lastError.message);
      const isAbortError = lastError.name === "AbortError";
      const isNetworkLike = /Failed to fetch|NetworkError|Load failed/i.test(lastError.message);
      const canRetry = isRetryableHttp || isAbortError || isNetworkLike;

      if (attempt >= DEFAULT_RETRY_COUNT || !canRetry) {
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
  availableSeconds?: number;
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
    // Prevent noise by clearing listeners before stopping
    activeTtsAudio.onended = null;
    activeTtsAudio.onerror = null;
    activeTtsAudio.onpause = null;
    
    activeTtsAudio.pause();
    try {
      activeTtsAudio.src = ""; // Revert to empty string to avoid CSP/media-src violations
      activeTtsAudio.removeAttribute('src'); // Better cleanup
      activeTtsAudio.load();
    } catch {
      // ignore
    }
    activeTtsAudio = null;
  }

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }

  if (speechMeterIntervalId) {
    clearInterval(speechMeterIntervalId);
    speechMeterIntervalId = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  emitTtsLevel(0);
  ttsMeterListeners.forEach((listener) => {
    listener({ level: 0, spectrum: [] });
  });
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

  localMusicNodes.forEach((node) => node.stop());
  localMusicNodes = [];

  if (localMusicContext) {
    void localMusicContext.close();
    localMusicContext = null;
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
  if (!blob || blob.size === 0) {
    console.warn("playAudioBlob: Received empty or undefined blob. Skipping playback.");
    if (options?.onStart) options.onStart();
    return;
  }

  const loop = options?.loop ?? false;
  const isMusic = options?.isMusic ?? false;
  const isSfx = options?.isSfx ?? false;
  const volume = options?.volume ?? (isSfx ? SFX_DEFAULT_VOLUME : 1);
  const onStart = options?.onStart;

  const isNarration = !isMusic && !isSfx;

  stopRequested = false;

  let url = "";
  try {
    url = URL.createObjectURL(blob);
  } catch (e) {
    console.error("playAudioBlob: Failed to create object URL", e);
    if (onStart) onStart();
    return;
  }

  const audio = new Audio();
  
  const applyDucking = () => {
    if (isNarration && activeMusicAudio) {
      activeMusicAudio.volume = DUCKING_LEVEL;
    }
  };

  const releaseDucking = () => {
    if (isNarration && activeMusicAudio) {
      activeMusicAudio.volume = NORMAL_MUSIC_LEVEL;
    }
  };

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
  } else if (isSfx) {
    if (activeSfxAudio) {
      activeSfxAudio.pause();
      activeSfxAudio.src = "";
    }
    if (activeSfxObjectUrl) {
      const oldUrl = activeSfxObjectUrl;
      setTimeout(() => URL.revokeObjectURL(oldUrl), 5000);
    }
    activeSfxAudio = audio;
    activeSfxObjectUrl = url;
  } else {
    // Narration Slot
    if (activeTtsAudio) {
      activeTtsAudio.pause();
      activeTtsAudio.src = "";
    }
  } else {
    if (activeObjectUrl) {
      const oldUrl = activeObjectUrl;
      setTimeout(() => URL.revokeObjectURL(oldUrl), 5000);
    }

    activeTtsAudio = audio;
    activeObjectUrl = url;
    activeMeterCleanup = attachAudioMeter(audio);
  }

  try {
    // Wait for the browser to at least be able to play some of it
    await new Promise((resolve, reject) => {
      const onCanPlay = () => {
        cleanup();
        resolve(null);
      };
      const onErr = () => {
        cleanup();
        reject(audio.error || new Error("Failed to load audio source"));
      };
      const cleanup = () => {
        audio.removeEventListener("canplaythrough", onCanPlay);
        audio.removeEventListener("error", onErr);
      };
      audio.addEventListener("canplaythrough", onCanPlay);
      audio.addEventListener("error", onErr);
      
      // No longer revoking here blindly; revocation is handled by onended and onerror
      setTimeout(() => {
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          cleanup();
          resolve(null);
        }
      }, 5000); // Increased timeout for slower connections/devices
    });

    applyDucking();
    try {
      await audio.play();
    } catch (firstPlayErr: unknown) {
      // Automatic Retry for 'Empty src' or 'Interrupted' errors
      console.warn("Audio play failed, retrying once...", firstPlayErr instanceof Error ? firstPlayErr.message : firstPlayErr);
      audio.load();
      await new Promise(r => setTimeout(r, 150));
      await audio.play();
    }
    if (onStart) onStart();
  } catch (err) {
    releaseDucking();
    const isInterrupted = err instanceof Error && (err.message.includes("stopped") || err.message.includes("interrupted"));
    const isCode4 = (err as Record<string, unknown>)?.code === 4; // Ignore Empty src attribute errors caused by stopping
    
    if (!isInterrupted && !isCode4) {
      console.warn("Audio playback completely failed after retry:", err);
    }
    throw err;
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
      releaseDucking();
      cleanup();
      resolve();
    };

    audio.onerror = () => {
      if (completed) return;
      completed = true;
      releaseDucking();
      cleanup();

      const error = audio.error;
      const isExpectedStop = stopRequested || !audio.src || audio.src === "" || audio.src === window.location.href;
      if (isExpectedStop || (error && error.code === 4)) {
        // Treat as normal stop/cancel
        resolve();
        return;
      }

      reject(error ?? new Error("Unknown audio playback error"));
    };
  });

  if (isMusic) {
    if (activeMusicObjectUrl === url) {
      activeMusicObjectUrl = null;
    }
    if (activeMusicAudio === audio) {
       activeMusicAudio = null;
    }
  } else if (isSfx) {
    if (activeSfxObjectUrl === url) {
      activeSfxObjectUrl = null;
    }
    if (activeSfxAudio === audio) {
       activeSfxAudio = null;
    }
    if (activeMusicAudio) {
      activeMusicAudio.src = "";
      activeMusicAudio.load();
      activeMusicAudio = null;
    }
  } else {
    if (activeObjectUrl === url) {
      activeObjectUrl = null;
    }
    if (activeTtsAudio === audio) {
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

function stopAllAudio(): void {
  stopRequested = true;
  
  // 1. Stop TTS
  stopTtsPlayback();

  // 2. Stop Music
  if (activeMusicAudio) {
    activeMusicAudio.pause();
    activeMusicAudio.src = "";
    activeMusicAudio.removeAttribute('src');
    activeMusicAudio.load();
    activeMusicAudio = null;
  }
  if (activeMusicObjectUrl) {
    URL.revokeObjectURL(activeMusicObjectUrl);
    activeMusicObjectUrl = null;
  }

  // 3. Stop SFX
  if (activeSfxAudio) {
    activeSfxAudio.pause();
    activeSfxAudio.src = "";
    activeSfxAudio.removeAttribute('src');
    activeSfxAudio.load();
    activeSfxAudio = null;
  }
  if (activeSfxObjectUrl) {
    URL.revokeObjectURL(activeSfxObjectUrl);
    activeSfxObjectUrl = null;
  }
}

async function startSession(
  foodName: string,
  totalTime: number,
  style: NarrationStyle
): Promise<Session> {
  const sanitizedFoodName = normalizeTextInput(String(foodName || ""), MAX_DISH_NAME_LENGTH);
  const normalizedTotalTime = Number.isFinite(totalTime) ? Math.max(1, Math.min(600, Math.floor(totalTime))) : 60;
  const payload: StartSessionPayload = {
    foodName: sanitizedFoodName,
    totalTime: normalizedTotalTime,
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
    sessionId: normalizeTextInput(sessionId, 120),
    remainingTime: Number.isFinite(remainingTime)
      ? Math.max(0, Math.min(600, Math.floor(remainingTime)))
      : 0,
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
    sessionId: normalizeTextInput(sessionId, 120),
    text: normalizeTextInput(String(text || ""), MAX_TEXT_PAYLOAD_LENGTH),
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
  const sanitizedRequest: AgentNarrationRequest = {
    ...request,
    sessionId: request.sessionId ? normalizeTextInput(request.sessionId, 120) : undefined,
    dishName: normalizeTextInput(request.dishName, MAX_DISH_NAME_LENGTH),
    totalTime: Math.max(1, Math.min(600, Math.floor(request.totalTime))),
    remainingTime: Math.max(0, Math.min(600, Math.floor(request.remainingTime))),
  };

  let data: {
    ok?: boolean;
    text?: string;
    error?: string;
  };
  try {
    data = await requestJson<{
      ok?: boolean;
      text?: string;
      error?: string;
    }>("/api/agent/narration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedRequest),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/HTTP_5\d{2}|Failed to fetch|NetworkError|Load failed|AbortError/i.test(message)) {
      throw new Error("AGENT_NARRATION_UNAVAILABLE");
    }
    throw error;
  }

  logDebug("requestAgentNarration response", data);

  if (!data.ok || !data.text) {
    throw new Error(data.error || "AGENT_NARRATION_UNAVAILABLE");
  }

  return {
    text: data.text,
    play: async () => {
      return;
    },
  };
}

async function playLocalNarration(text: string, locale = "ja"): Promise<void> {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }

  stopTtsPlayback();
  const sanitizedText = normalizeTextInput(text, MAX_TEXT_PAYLOAD_LENGTH);
  const utterance = new SpeechSynthesisUtterance(sanitizedText);
  utterance.rate = locale.startsWith("ja") ? 1.02 : 1.0;
  utterance.pitch = locale.startsWith("ja") ? 1.03 : 1.0;
  utterance.volume = 1;
  utterance.lang = locale.startsWith("ja") ? "ja-JP" : "en-US";

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => voice.lang.startsWith(utterance.lang));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechMeterIntervalId = setInterval(() => {
    const level = 0.25 + Math.random() * 0.6;
    const spectrum = Array.from({ length: 16 }, () => 0.2 + Math.random() * 0.8);
    emitTtsLevel(level);
    ttsMeterListeners.forEach((listener) => {
      listener({ level, spectrum });
    });
  }, 70);
  // Guard: Never play local TTS if AI audio is already active or being loaded
  if (activeTtsAudio && !activeTtsAudio.paused) {
    console.log("playLocalNarration: AI audio is already active, skipping local fallback");
    return Promise.resolve();
  }
  await new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve(); // Normal behavior during phase transitions
      } else {
        reject(new Error("LOCAL_TTS_FAILED"));
      }
    };
    window.speechSynthesis.speak(utterance);
  }).finally(() => {
    if (speechMeterIntervalId) {
      clearInterval(speechMeterIntervalId);
      speechMeterIntervalId = null;
    }
    emitTtsLevel(0);
    ttsMeterListeners.forEach((listener) => {
      listener({ level: 0, spectrum: [] });
    });
  });
}

function playLocalSfx(prompt: string): Promise<void> {
  const AudioContextImpl =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextImpl) return Promise.resolve();

  const ctx = new AudioContextImpl();
  const now = ctx.currentTime;
  const isSoft = /soft|light|gentle|nature|forest/i.test(prompt);
  const baseFreq = isSoft ? 660 : 880;
  const gainPeak = isSoft ? 0.08 : 0.15;

  const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isSoft ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now + index * 0.09);
    gain.gain.setValueAtTime(0.0001, now + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + index * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + index * 0.09);
    osc.stop(now + index * 0.09 + 0.22);
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      void ctx.close();
      resolve();
    }, 500);
  });
}

async function playLocalMusic(prompt: string): Promise<void> {
  stopMusic();
  const AudioContextImpl =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextImpl) return;

  const ctx = new AudioContextImpl();
  localMusicContext = ctx;
  const isNature = /nature|calm|wind|birds/i.test(prompt);
  const root = isNature ? 220 : 110;
  const mode = isNature ? [1, 1.122, 1.334, 1.498] : [1, 1.189, 1.334, 1.587];

  mode.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isNature ? "sine" : "sawtooth";
    osc.frequency.value = root * ratio;
    gain.gain.value = isNature ? 0.01 : 0.018;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.08 + idx * 0.03;
    lfoGain.gain.value = 4 + idx;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    localMusicNodes.push({
      stop: () => {
        osc.stop();
        lfo.stop();
      },
    });
  });
}

async function playSfx(prompt: string): Promise<void> {
  ensureSafeApiBase();
  enforceEffectRateLimit("sfx");
  try {
    const res = await fetch(`${API_BASE}/api/generate-sfx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: normalizeTextInput(prompt, MAX_TEXT_PAYLOAD_LENGTH) }),
      signal: withTimeoutSignal(DEFAULT_REQUEST_TIMEOUT_MS + 5000),
    });

    if (res.ok) {
      const blob = await parseAudioBlob(res);
      await playAudioBlob(blob, { loop: false, volume: 0.4, isSfx: true });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "SFX generation failed");
    }

    const blob = await parseAudioBlob(res);
    await playAudioBlob(blob, { loop: false, volume: 0.55, isMusic: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Failed to fetch|NetworkError|Load failed|HTTP_5\d{2}|timeout/i.test(message)) {
      await playLocalSfx(prompt);
      return;
    }
    throw error;
  }
}

async function playMusic(prompt: string): Promise<void> {
  ensureSafeApiBase();
  enforceEffectRateLimit("music");
  try {
    const res = await fetch(`${API_BASE}/api/generate-music`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: normalizeTextInput(prompt, MAX_TEXT_PAYLOAD_LENGTH) }),
      signal: withTimeoutSignal(DEFAULT_REQUEST_TIMEOUT_MS + 5000),
    });

    if (res.ok) {
      const blob = await parseAudioBlob(res);
      await playAudioBlob(blob, { loop: true, volume: 0.2, isMusic: true });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Music generation failed");
    }

    const blob = await parseAudioBlob(res);
    await playAudioBlob(blob, { loop: true, volume: 0.3, isMusic: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Failed to fetch|NetworkError|Load failed|HTTP_5\d{2}|timeout/i.test(message)) {
      await playLocalMusic(prompt);
      return;
    }
    throw error;
  }
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
  playLocalNarration,
  subscribeTtsLevel,
  subscribeTtsMeter,
  playTtsFromBlob,
  initSession,
  generateTtsBlob,
  generateSfxBlob,
  generateMusicBlob,
  prepareInitialAssets,
  playAudioBlob,
  stopAllAudio,
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
  playLocalNarration,
  subscribeTtsLevel,
  subscribeTtsMeter,
  playTtsFromBlob,
  initSession,
  generateTtsBlob,
  generateSfxBlob,
  generateMusicBlob,
  prepareInitialAssets,
  playAudioBlob,
  stopAllAudio,
};
