const API_BASE = "https://microwave-show-api.lolololololol.workers.dev";
const DEFAULT_TTS_TIMEOUT_MS = 30000;

let activeTtsAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let stopRequested = false;
let activeMeterCleanup: (() => void) | null = null;

type TtsLevelListener = (level: number) => void;
type TtsMeterSnapshot = {
  level: number;
  spectrum: number[];
};
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
  console.log("startSession response", res.status, data);

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
  console.log("getSession response", res.status, data);

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
  console.log("tickSession response", res.status, data);

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
  console.log("saveNarration response", res.status, data);

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || "Failed to save narration");
  }
}

async function playTts(text: string): Promise<void> {
  stopRequested = false;
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    }),
  });

  console.log("playTts status", res.status);
  console.log("playTts content-type", res.headers.get("content-type"));

  if (!res.ok) {
    const errText = await res.text();
    console.error("playTts error response", errText);
    throw new Error("TTS failed");
  }

  const blob = await res.blob();
  console.log("playTts blob", {
    type: blob.type,
    size: blob.size,
  });

  const url = URL.createObjectURL(blob);
  console.log("playTts object url", url);

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

    audio.onloadedmetadata = () => {
      console.log("audio loadedmetadata");
    };

    audio.oncanplay = () => {
      console.log("audio canplay");
    };

    audio.oncanplaythrough = () => {
      console.log("audio canplaythrough");
    };

    audio.onerror = () => {
      console.error("audio element error", audio.error);
    };

    await audio.play();
    console.log("audio playback success");

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

      audio.onstalled = () => {
        console.warn("audio playback stalled");
      };

      audio.onwaiting = () => {
        console.warn("audio playback waiting for data");
      };

      audio.onpause = () => {
        if (audio.ended || completed) return;
        if (stopRequested) {
          completed = true;
          cleanup();
          reject(new Error("Audio playback stopped"));
          return;
        }
        console.warn("audio unexpectedly paused before completion; retrying play()");
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
        console.log("audio playback ended");
        resolve();
      };

      audio.onerror = () => {
        if (completed) return;
        completed = true;
        cleanup();
        reject(audio.error ?? new Error("Unknown audio playback error"));
      };
    });
  } catch (error) {
    console.error("audio playback failed", error);
    throw error;
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
}

export const api = {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  playTts,
  stopTtsPlayback,
  subscribeTtsLevel,
  subscribeTtsMeter,
  API_BASE,
};
