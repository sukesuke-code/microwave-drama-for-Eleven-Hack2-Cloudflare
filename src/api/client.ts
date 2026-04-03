import type { NarrationStyle } from "../types";

const API_BASE = "https://microwave-show-api.lolololololol.workers.dev";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://aaqahuauovsykozowifh.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcWFodWF1b3ZzeWtvem93aWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQzNTQsImV4cCI6MjA5MDczMDM1NH0.sjTM-7oGtRoRWv1pXPtQroeAR9ro1PxPMDJ6esW_3wk";
const ELEVENLABS_TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const AGENT_NARRATION_ENDPOINT = `${SUPABASE_URL}/functions/v1/agent-narration`;
const DEFAULT_TTS_TIMEOUT_MS = 30000;

let activeTtsAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let stopRequested = false;
let activeMeterCleanup: (() => void) | null = null;
let activeMusicAudio: HTMLAudioElement | null = null;
let activeMusicObjectUrl: string | null = null;
let activeSfxAudio: HTMLAudioElement | null = null;
let activeSfxObjectUrl: string | null = null;
let narrationPlaybackDepth = 0;
let currentMusicBaseVolume = 0.3;
let currentSfxBaseVolume = 0.55;

const MUSIC_BASE_VOLUME = 0.3;
const SFX_BASE_VOLUME = 0.55;
const DUCKED_MUSIC_VOLUME = 0.12;
const DUCKED_SFX_VOLUME = 0.25;

type TtsLevelListener = (level: number) => void;
type TtsMeterSnapshot = {
  level: number;
  spectrum: number[];
};

export interface AgentNarrationRequest {
  sessionId?: string;
  style: NarrationStyle;
  dishName: string;
  totalTime: number;
  remainingTime: number;
  phase: "opening" | "quarter" | "middle" | "final" | "done";
  locale: string;
  agentInstructionText?: string;
}

export interface AgentNarrationResponse {
  text: string;
  audioAvailable: boolean;
  fallbackReason: string | null;
  audioDurationMs: number | null;
  play: () => Promise<void>;
}

const ttsLevelListeners = new Set<TtsLevelListener>();
const ttsMeterListeners = new Set<(snapshot: TtsMeterSnapshot) => void>();

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

function subscribeTtsMeter(listener: (snapshot: TtsMeterSnapshot) => void): () => void {
  ttsMeterListeners.add(listener);
  return () => {
    ttsMeterListeners.delete(listener);
  };
}

function attachAudioMeter(audio: HTMLAudioElement): () => void {
  const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  const tick = () => {
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
    const spectrum = Array.from({ length: spectrumBins }, (_, index) => {
      const startRatio = index / spectrumBins;
      const endRatio = (index + 1) / spectrumBins;
      const startHz = Math.pow(10, logMin + (logMax - logMin) * startRatio);
      const endHz = Math.pow(10, logMin + (logMax - logMin) * endRatio);
      const startBin = Math.max(0, Math.floor((startHz / nyquist) * frequencyData.length));
      const endBin = Math.min(
        frequencyData.length,
        Math.max(startBin + 1, Math.ceil((endHz / nyquist) * frequencyData.length))
      );

      let sum = 0;
      for (let i = startBin; i < endBin; i += 1) {
        sum += frequencyData[i];
      }
      const avg = sum / Math.max(1, endBin - startBin);
      return Math.min(1, (avg / 255) * 2.2);
    });

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

function stopSfx(): void {
  if (activeSfxAudio) {
    activeSfxAudio.pause();
    activeSfxAudio.src = "";
    activeSfxAudio.load();
    activeSfxAudio = null;
  }
  if (activeSfxObjectUrl) {
    URL.revokeObjectURL(activeSfxObjectUrl);
    activeSfxObjectUrl = null;
  }
}

function applyNarrationDucking(): void {
  const shouldDuck = narrationPlaybackDepth > 0;
  if (activeMusicAudio) {
    activeMusicAudio.volume = shouldDuck
      ? Math.min(currentMusicBaseVolume, DUCKED_MUSIC_VOLUME)
      : currentMusicBaseVolume;
  }
  if (activeSfxAudio) {
    activeSfxAudio.volume = shouldDuck
      ? Math.min(currentSfxBaseVolume, DUCKED_SFX_VOLUME)
      : currentSfxBaseVolume;
  }
}

function beginNarrationPlayback(): void {
  narrationPlaybackDepth += 1;
  applyNarrationDucking();
}

function endNarrationPlayback(): void {
  narrationPlaybackDepth = Math.max(0, narrationPlaybackDepth - 1);
  applyNarrationDucking();
}

async function parseAudioBlob(res: Response): Promise<Blob> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as { audioBase64?: string; audio?: string; error?: string };
    const base64Audio = json.audioBase64 || json.audio;
    if (!base64Audio) {
      throw new Error(json.error || "Audio payload is missing");
    }
    const base64 = base64Audio.includes(",") ? base64Audio.split(",").pop() ?? "" : base64Audio;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/mpeg" });
  }

  return res.blob();
}

export interface Session {
  foodName: string;
  totalTime: number;
  remainingTime: number;
  style: "sports" | "horror" | "documentary" | "anime";
  phase: "opening" | "quarter" | "middle" | "final" | "done";
  isRunning: boolean;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface StartSessionPayload {
  foodName: string;
  totalTime: number;
  style: "sports" | "horror" | "documentary" | "anime";
}

async function startSession(
  foodName: string,
  totalTime: number,
  style: "sports" | "horror" | "documentary" | "anime"
): Promise<Session> {
  const payload: StartSessionPayload = {
    foodName: String(foodName || "").trim(),
    totalTime: Number(totalTime),
    style,
  };

  const res = await fetch(`${API_BASE}/api/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { ok?: boolean; session?: Session; error?: string };

  if (!res.ok || !data.ok || !data.session?.sessionId) {
    throw new Error(data?.error || "Failed to start session");
  }

  return data.session;
}

async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(
    `${API_BASE}/api/session?sessionId=${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = (await res.json()) as { ok?: boolean; session?: Session; error?: string };

  if (!res.ok || !data.ok || !data.session) {
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

  const res = await fetch(`${API_BASE}/api/session/tick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { ok?: boolean; error?: string };

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || "Failed to tick session");
  }
}

async function saveNarration(sessionId: string, text: string): Promise<void> {
  const payload = {
    sessionId,
    text: String(text || "").trim(),
  };

  const res = await fetch(`${API_BASE}/api/session/narration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { ok?: boolean; error?: string };

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || "Failed to save narration");
  }
}

async function playTts(text: string): Promise<void> {
  stopRequested = false;
  beginNarrationPlayback();
  try {
    const res = await fetch(ELEVENLABS_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text,
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("TTS failed:", errText);
      throw new Error("TTS failed");
    }

    const data = (await res.json()) as { audio_base64?: string; error?: string };
    if (!data.audio_base64) {
      throw new Error(data.error || "No audio returned from TTS");
    }

    const rawBase64 = data.audio_base64.includes(",") ? data.audio_base64.split(",").pop() ?? "" : data.audio_base64;
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }

    try {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      audio.muted = false;
      audio.volume = 1;
      audio.setAttribute("playsinline", "true");
      activeTtsAudio = audio;
      activeObjectUrl = url;
      activeMeterCleanup = attachAudioMeter(audio);

      audio.onerror = () => {
        console.error("audio element error", audio.error);
      };

      await audio.play();

      await new Promise<void>((resolve, reject) => {
        let completed = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          if (completed) return;
          completed = true;
          cleanup();
          reject(new Error("Audio playback timed out"));
        }, DEFAULT_TTS_TIMEOUT_MS);

        const cleanup = () => {
          audio.onended = null;
          audio.onerror = null;
          audio.onpause = null;
          audio.onstalled = null;
          audio.onwaiting = null;
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
    } finally {
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
  } finally {
    endNarrationPlayback();
  }
}

async function requestAgentNarration(request: AgentNarrationRequest): Promise<AgentNarrationResponse> {
  const payload = {
    sessionId: request.sessionId,
    style: request.style,
    dishName: request.dishName,
    totalTime: request.totalTime,
    remainingTime: request.remainingTime,
    phase: request.phase,
    locale: request.locale,
    agentInstructionText: request.agentInstructionText,
  };

  const res = await fetch(AGENT_NARRATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Narration generation failed");
  }

  const data = (await res.json()) as {
    ok?: boolean;
    text?: string;
    audio_base64?: string;
    audio_available?: boolean;
    fallback_reason?: string | null;
    error?: string;
  };

  const text = String(data.text || "").trim();
  if (!data.ok || !text) {
    throw new Error(data.error || "Narration response is missing");
  }

  const base64Audio = data.audio_base64;
  const audioAvailable = Boolean(data.audio_available && base64Audio);
  const fallbackReason = data.fallback_reason ?? null;

  if (!audioAvailable) {
    const warningContext = {
      component: "requestAgentNarration",
      event: "subtitle_only_mode",
      reason: fallbackReason ?? "AUDIO_MISSING",
      sessionId: request.sessionId ?? "unknown",
      phase: request.phase,
      style: request.style,
    };
    console.warn(`[narration-warning] ${JSON.stringify(warningContext)}`);
  }

  let audioDurationMs: number | null = null;
  if (audioAvailable && base64Audio) {
    try {
      const rawBase64Pre = base64Audio.includes(",") ? base64Audio.split(",").pop() ?? "" : base64Audio;
      const binaryPre = atob(rawBase64Pre);
      const bytesPre = new Uint8Array(binaryPre.length);
      for (let i = 0; i < binaryPre.length; i += 1) {
        bytesPre[i] = binaryPre.charCodeAt(i);
      }
      const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextImpl) {
        const tmpCtx = new AudioContextImpl();
        const audioBuffer = await tmpCtx.decodeAudioData(bytesPre.buffer);
        audioDurationMs = Math.round(audioBuffer.duration * 1000);
        await tmpCtx.close();
      }
    } catch {
      audioDurationMs = null;
    }
  }

  return {
    text,
    audioAvailable,
    fallbackReason,
    audioDurationMs,
    play: async () => {
      stopRequested = false;

      if (!audioAvailable || !base64Audio) {
        return;
      }

      try {
        beginNarrationPlayback();
        const rawBase64 = base64Audio.includes(",") ? base64Audio.split(",").pop() ?? "" : base64Audio;
        const binary = atob(rawBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        if (activeObjectUrl) {
          URL.revokeObjectURL(activeObjectUrl);
          activeObjectUrl = null;
        }

        try {
          const audio = new Audio();
          audio.preload = "auto";
          audio.src = url;
          audio.muted = false;
          audio.volume = 1;
          audio.setAttribute("playsinline", "true");
          activeTtsAudio = audio;
          activeObjectUrl = url;
          activeMeterCleanup = attachAudioMeter(audio);

          await audio.play();

          await new Promise<void>((resolve, reject) => {
            let completed = false;
            let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
              if (completed) return;
              completed = true;
              cleanup();
              reject(new Error("Audio playback timed out"));
            }, DEFAULT_TTS_TIMEOUT_MS);

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
        } finally {
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
      } catch (error) {
        console.error("Error playing narration audio:", error);
      } finally {
        endNarrationPlayback();
      }
    },
  };
}

async function playSfx(prompt: string): Promise<void> {
  // Playback rule: stop any previous phase SFX before starting a new one.
  stopSfx();

  const res = await fetch(`${API_BASE}/api/generate-sfx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "SFX generation failed");
  }

  const blob = await parseAudioBlob(res);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  currentSfxBaseVolume = SFX_BASE_VOLUME;
  audio.volume = currentSfxBaseVolume;
  audio.setAttribute("playsinline", "true");
  activeSfxAudio = audio;
  activeSfxObjectUrl = url;
  applyNarrationDucking();

  try {
    await audio.play();
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (activeSfxObjectUrl === url) {
          URL.revokeObjectURL(url);
          activeSfxObjectUrl = null;
        }
        if (activeSfxAudio === audio) {
          activeSfxAudio = null;
        }
        resolve();
      };
      audio.onerror = () => {
        if (activeSfxObjectUrl === url) {
          URL.revokeObjectURL(url);
          activeSfxObjectUrl = null;
        }
        if (activeSfxAudio === audio) {
          activeSfxAudio = null;
        }
        reject(audio.error ?? new Error("Unknown SFX playback error"));
      };
    });
  } catch (error) {
    if (activeSfxObjectUrl === url) {
      URL.revokeObjectURL(url);
      activeSfxObjectUrl = null;
    }
    if (activeSfxAudio === audio) {
      activeSfxAudio = null;
    }
    throw error;
  }
}

async function playMusic(prompt: string): Promise<void> {
  stopMusic();

  const res = await fetch(`${API_BASE}/api/generate-music`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Music generation failed");
  }

  const blob = await parseAudioBlob(res);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.loop = true;
  currentMusicBaseVolume = MUSIC_BASE_VOLUME;
  audio.volume = currentMusicBaseVolume;
  audio.setAttribute("playsinline", "true");

  activeMusicAudio = audio;
  activeMusicObjectUrl = url;
  applyNarrationDucking();
  await audio.play();
}

function getSignedUrl(url: string, expiresIn: number = 3600): string {
  if (!url) return "";
  const urlObj = new URL(url, "https://example.com");
  return urlObj.pathname + urlObj.search;
}

function buildNarrationCue(
  text: string,
  displayDuration: number = 3000
): { text: string; duration: number } {
  return {
    text: text.trim(),
    duration: displayDuration,
  };
}

export const api = {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  playTts,
  requestAgentNarration,
  playSfx,
  playMusic,
  stopMusic,
  stopSfx,
  stopTtsPlayback,
  subscribeTtsLevel,
  subscribeTtsMeter,
  getSignedUrl,
  buildNarrationCue,
  API_BASE,
};
