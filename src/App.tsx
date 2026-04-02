import { lazy, Suspense, useEffect, useState } from 'react';
import { AppScreen, Locale, Settings, ThemeMode } from './types';
import TopPage from './pages/TopPage';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CountdownPage = lazy(() => import('./pages/CountdownPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

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

function isValidScreen(value: string | null): value is AppScreen {
  return value === 'top' || value === 'settings' || value === 'countdown' || value === 'result';
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
  const [screen, setScreen] = useState<AppScreen>(() => {
    const saved = readStorage('ching-drama-screen');
    if (!isValidScreen(saved)) return 'settings';
    if ((saved === 'countdown' || saved === 'result') && !readSettings()) return 'settings';
    return saved;
  });
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = readStorage('ching-drama-locale');
    return saved === 'en' || saved === 'ja' ? saved : 'ja';
  });
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
          />
        )}
      </Suspense>
    </div>
  );
}
