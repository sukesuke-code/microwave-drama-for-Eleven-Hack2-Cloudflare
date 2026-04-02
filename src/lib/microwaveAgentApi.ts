import { NarrationStyle } from '../types';

type ApiNarrationStyle = 'sports' | 'horror' | 'documentary' | 'anime';

export type CountdownPhase = 'opening' | 'quarter' | 'middle' | 'final' | 'done';

export interface SessionSnapshot {
  sessionId: string;
  foodName?: string;
  totalTime?: number;
  remainingTime?: number;
  style?: ApiNarrationStyle;
  phase?: CountdownPhase;
}

const STORAGE_KEY = 'microwave_sessions';

interface StoredSession {
  id: string;
  foodName: string;
  totalTime: number;
  style: ApiNarrationStyle;
  remainingTime: number;
  createdAt: number;
  updatedAt: number;
  isCompleted: boolean;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getAllSessions(): Record<string, StoredSession> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[getAllSessions] Error reading from localStorage:', error);
    return {};
  }
}

function saveSession(session: StoredSession): void {
  try {
    const sessions = getAllSessions();
    sessions[session.id] = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('[saveSession] Error writing to localStorage:', error);
  }
}

function mapStyleToApi(style: NarrationStyle): ApiNarrationStyle {
  if (style === 'nature') return 'documentary';
  if (style === 'movie') return 'anime';
  return style;
}

export async function startSession(foodName: string, totalTime: number, style: NarrationStyle): Promise<string> {
  const mappedStyle = mapStyleToApi(style);
  const sessionId = generateSessionId();

  console.log('[startSession] Creating new session:', { sessionId, foodName, totalTime, style: mappedStyle });

  const session: StoredSession = {
    id: sessionId,
    foodName,
    totalTime,
    style: mappedStyle,
    remainingTime: totalTime,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isCompleted: false,
  };

  saveSession(session);

  return sessionId;
}

export async function getSignedUrl(): Promise<string> {
  console.log('[getSignedUrl] Returning placeholder signed URL');
  return 'wss://elevenlabs-proxy.example.com/websocket';
}

export async function updatePhase(sessionId: string, remainingTime: number): Promise<void> {
  console.log('[updatePhase] Updating session:', { sessionId, remainingTime });

  const sessions = getAllSessions();
  const session = sessions[sessionId];

  if (!session) {
    console.warn('[updatePhase] Session not found:', sessionId);
    return;
  }

  session.remainingTime = remainingTime;
  session.isCompleted = remainingTime <= 0;
  session.updatedAt = Date.now();

  saveSession(session);
}

export async function saveNarration(sessionId: string, text: string): Promise<void> {
  console.log('[saveNarration] Saving narration:', { sessionId, text });

  const sessions = getAllSessions();
  const session = sessions[sessionId];

  if (!session) {
    console.warn('[saveNarration] Session not found:', sessionId);
    return;
  }

  session.updatedAt = Date.now();
  saveSession(session);
}

export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  console.log('[getSession] Retrieving session:', sessionId);

  const sessions = getAllSessions();
  const session = sessions[sessionId];

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return {
    sessionId: session.id,
    foodName: session.foodName,
    totalTime: session.totalTime,
    remainingTime: session.remainingTime,
    style: session.style,
  };
}

export function getPhaseFromRemainingTime(remainingTime: number, totalTime: number): CountdownPhase {
  if (remainingTime <= 0) return 'done';
  const ratio = totalTime > 0 ? remainingTime / totalTime : 0;
  if (ratio > 0.75) return 'opening';
  if (ratio > 0.5) return 'quarter';
  if (ratio > 0.25) return 'middle';
  return 'final';
}
