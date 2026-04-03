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

export type SignedUrlResponse = {
  ok: boolean;
  signedUrl?: string;
  agentId?: string;
  error?: string;
};

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

async function getSignedUrl(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
    method: "POST",
  });

  const data = (await res.json()) as SignedUrlResponse;
  console.log("getSignedUrl response", res.status, data);

  if (!res.ok || !data.ok || !data.signedUrl) {
    throw new Error(data.error || "Failed to get signed URL");
  }

  return data.signedUrl;
}

function buildNarrationCue(params: {
  foodName: string;
  style: string;
  phase: string;
  totalTime: number;
  remainingTime: number;
  exampleTone: string;
}) {
  const {
    foodName,
    style,
    phase,
    totalTime,
    remainingTime,
    exampleTone,
  } = params;

  return `Create exactly one short live narration line.

foodName: ${foodName}
style: ${style}
phase: ${phase}
totalTime: ${totalTime}
remainingTime: ${remainingTime}
exampleTone: ${exampleTone}

Rules:
- Output only one short narration line
- No greeting
- No questions
- No explanation
- Stay in character`;
}

export const api = {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  getSignedUrl,
  buildNarrationCue,
  API_BASE,
};

export {
  startSession,
  getSession,
  tickSession,
  saveNarration,
  getSignedUrl,
  buildNarrationCue,
  API_BASE,
};