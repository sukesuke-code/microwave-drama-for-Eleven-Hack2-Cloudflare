import { NarrationStyle } from '../types';

export const API_BASE = 'https://microwave-show-api.lolololololol.workers.dev';

type ApiNarrationStyle = 'sports' | 'horror' | 'documentary' | 'anime';

export type CountdownPhase = 'opening' | 'quarter' | 'middle' | 'final' | 'done';

interface StartSessionPayload {
  foodName: string;
  totalTime: number;
  style: ApiNarrationStyle;
}

interface StartSessionResponse {
  sessionId: string;
}

interface SignedUrlResponse {
  signedUrl: string;
  url?: string;
}

export interface SessionSnapshot {
  sessionId: string;
  foodName?: string;
  totalTime?: number;
  remainingTime?: number;
  style?: ApiNarrationStyle;
  phase?: CountdownPhase;
}

function mapStyleToApi(style: NarrationStyle): ApiNarrationStyle {
  if (style === 'nature') return 'documentary';
  if (style === 'movie') return 'anime';
  return style;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json() as unknown;

  if (!response.ok) {
    const errorMessage = typeof data === 'object' && data !== null && 'error' in data
      ? String((data as Record<string, unknown>).error)
      : `API request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export async function startSession(foodName: string, totalTime: number, style: NarrationStyle): Promise<string> {
  const mappedStyle = mapStyleToApi(style);
  const payload: StartSessionPayload = {
    foodName,
    totalTime,
    style: mappedStyle,
  };

  console.log('[startSession] API_BASE:', API_BASE);
  console.log('[startSession] payload:', payload);

  try {
    const data = await requestJson<StartSessionResponse>(`${API_BASE}/api/session/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[startSession] response:', data);

    if (!data.sessionId) {
      throw new Error('Session ID missing from response');
    }

    return data.sessionId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[startSession] error:', errorMessage);
    throw error;
  }
}

export async function getSignedUrl(): Promise<string> {
  try {
    const data = await requestJson<SignedUrlResponse>(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    console.log('[getSignedUrl] response:', data);

    const signedUrl = data.signedUrl ?? data.url;
    if (!signedUrl) throw new Error('Signed URL missing from response');
    return signedUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[getSignedUrl] error:', errorMessage);
    throw error;
  }
}

export async function updatePhase(sessionId: string, remainingTime: number): Promise<void> {
  await requestJson(`${API_BASE}/api/session/tick`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, remainingTime }),
  });
}

export async function saveNarration(sessionId: string, text: string): Promise<void> {
  await requestJson(`${API_BASE}/api/session/narration`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, text }),
  });
}

export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  return requestJson<SessionSnapshot>(`${API_BASE}/api/session?sessionId=${encodeURIComponent(sessionId)}`);
}

export function getPhaseFromRemainingTime(remainingTime: number, totalTime: number): CountdownPhase {
  if (remainingTime <= 0) return 'done';
  const ratio = totalTime > 0 ? remainingTime / totalTime : 0;
  if (ratio > 0.75) return 'opening';
  if (ratio > 0.5) return 'quarter';
  if (ratio > 0.25) return 'middle';
  return 'final';
}
