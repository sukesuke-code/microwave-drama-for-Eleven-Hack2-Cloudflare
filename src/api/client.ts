const API_BASE = "https://microwave-show-api.lolololololol.workers.dev";
const DEFAULT_TTS_TIMEOUT_MS = 30000;

let activeTtsAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let stopRequested = false;

function stopTtsPlayback(): void {
  stopRequested = true;
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
  }
}

export const api = {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  playTts,
  stopTtsPlayback,
  API_BASE,
};
