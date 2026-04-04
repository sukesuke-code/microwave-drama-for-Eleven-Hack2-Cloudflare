export type NarrationStyle = 'sports' | 'movie' | 'horror' | 'nature' | 'documentary' | 'anime';
export type Locale = 'ja' | 'en';
export type ThemeMode = 'dark' | 'light';

export type AppScreen = 'top' | 'settings' | 'countdown' | 'result';

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

export interface Settings {
  totalSeconds: number;
  dishName: string;
  style: NarrationStyle;
}

export interface InitialAssets {
  session: Session;
  narrationText: string;
  narrationAudio: Blob;
  musicAudio?: Blob;
  sfxAudio?: Blob;
}

export interface NarrationCue {
  minPercent: number;
  maxPercent: number;
  lines: string[];
}

export interface StyleConfig {
  id: NarrationStyle;
  label: string;
  emoji: string;
  accentColor: string;
  glowClass: string;
  bgGradient: string;
  textShadowClass: string;
  boxNeonClass: string;
}
