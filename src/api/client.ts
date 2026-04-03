const API_BASE = "https://microwave-show-api.lolololololol.workers.dev";

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

  if (!res.ok) {
    let err: { error?: string } = {};
    try {
      err = (await res.json()) as { error?: string };
    } catch {
      // Ignore invalid/non-JSON error body.
    }
    throw new Error(err?.error || "TTS failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  try {
    const audio = new Audio(url);
    audio.muted = false;
    audio.volume = 1;
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export const api = {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  playTts,
  API_BASE,
};
