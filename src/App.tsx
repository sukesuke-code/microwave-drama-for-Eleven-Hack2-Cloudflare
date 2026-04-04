import { lazy, Suspense, useEffect, useState } from 'react';
import { AppScreen, Locale, Settings, ThemeMode } from './types';
import TopPage from './pages/TopPage';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CountdownPage = lazy(() => import('./pages/CountdownPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

const DEFAULT_LOCALE: Locale = 'en';
const SUPPORTED_LOCALES: Locale[] = ['en', 'ja'];

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op: storage might be unavailable in private mode or restricted contexts
  }
}

function normalizeLocale(locale: string): Locale | null {
  const base = locale.toLowerCase().split('-')[0] as Locale;
  return SUPPORTED_LOCALES.includes(base) ? base : null;
}

function detectDeviceLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const candidates = [...(navigator.languages ?? []), navigator.language]
    .filter((lang): lang is string => Boolean(lang));

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
}

function readLocale(): Locale {
  const saved = readStorage('ching-drama-locale');
  if (saved) {
    const normalizedSaved = normalizeLocale(saved);
    if (normalizedSaved) return normalizedSaved;
  }

  return detectDeviceLocale();
}


function readSettings(): Settings | null {
  const raw = readStorage('ching-drama-settings');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (
      typeof parsed.totalSeconds === 'number' &&
      typeof parsed.dishName === 'string' &&
      (parsed.style === 'sports' || parsed.style === 'movie' || parsed.style === 'horror' || parsed.style === 'nature')
    ) {
      return {
        totalSeconds: parsed.totalSeconds,
        dishName: parsed.dishName,
        style: parsed.style,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(() => readSettings());
  const [screen, setScreen] = useState<AppScreen>('top');
  const [locale, setLocale] = useState<Locale>(() => readLocale());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = readStorage('ching-drama-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    writeStorage('ching-drama-locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    writeStorage('ching-drama-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    writeStorage('ching-drama-screen', screen);
  }, [screen]);

  useEffect(() => {
    if (!settings) return;
    writeStorage('ching-drama-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const preload = () => {
      void import('./pages/SettingsPage');
      void import('./pages/CountdownPage');
      void import('./pages/ResultPage');
    };

    const maybeWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof maybeWindow.requestIdleCallback === 'function') {
      const idleId = maybeWindow.requestIdleCallback(preload);
      return () => maybeWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(preload, 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleStartSettings = () => setScreen('settings');

  const handleStartCountdown = (s: Settings) => {
    setSettings(s);
    setScreen('countdown');
  };

  const handleFinish = () => setScreen('result');

  const handleReplay = () => {
    if (settings) setScreen('countdown');
  };

  const handleHome = () => setScreen('settings');
  const handleTop = () => setScreen('top');

  return (
    <div className="font-sans">
      {screen === 'top' && (
        <TopPage
          onStart={handleStartSettings}
          locale={locale}
          themeMode={themeMode}
          onLocaleChange={setLocale}
          onThemeModeChange={setThemeMode}
        />
      )}
      <Suspense fallback={<div className="min-h-screen bg-[#00031a]" />}>
        {screen === 'settings' && (
          <SettingsPage
            locale={locale}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            onBack={() => setScreen('top')}
            onStart={handleStartCountdown}
          />
        )}
        {screen === 'countdown' && settings && (
          <CountdownPage
            locale={locale}
            settings={settings}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            onBack={() => setScreen('settings')}
            onFinish={handleFinish}
          />
        )}
        {screen === 'result' && settings && (
          <ResultPage
            locale={locale}
            settings={settings}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            onReplay={handleReplay}
            onHome={handleHome}
            onTop={handleTop}
          />
        )}
      </Suspense>
    </div>
  );
}
