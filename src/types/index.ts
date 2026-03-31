export type NarrationStyle = 'sports' | 'movie' | 'horror' | 'nature';

export type AppScreen = 'top' | 'settings' | 'countdown' | 'result';

export interface Settings {
  totalSeconds: number;
  dishName: string;
  style: NarrationStyle;
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
