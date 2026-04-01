import { lazy, Suspense, useEffect, useState } from 'react';
import { AppScreen, Locale, Settings, ThemeMode } from './types';

const TopPage = lazy(() => import('./pages/TopPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CountdownPage = lazy(() => import('./pages/CountdownPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('top');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('ching-drama-locale');
    return saved === 'en' || saved === 'ja' ? saved : 'ja';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ching-drama-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ching-drama-locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('ching-drama-theme', themeMode);
  }, [themeMode]);

  const handleStartSettings = () => setScreen('settings');

  const handleStartCountdown = (s: Settings) => {
    setSettings(s);
    setScreen('countdown');
  };

  const handleFinish = () => setScreen('result');

  const handleReplay = () => {
    if (settings) setScreen('countdown');
  };

  const handleHome = () => setScreen('top');

  return (
    <div className="font-sans">
      <Suspense fallback={<div className="min-h-screen bg-[#00031a]" />}>
        {screen === 'top' && (
          <TopPage
            onStart={handleStartSettings}
            locale={locale}
            themeMode={themeMode}
            onLocaleChange={setLocale}
            onThemeModeChange={setThemeMode}
          />
        )}
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
