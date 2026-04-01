import { useEffect, useState } from 'react';
import { AppScreen, Locale, Settings, ThemeMode } from './types';
import TopPage from './pages/TopPage';
import SettingsPage from './pages/SettingsPage';
import CountdownPage from './pages/CountdownPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('top');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('ching-drama-locale');
    return saved === 'en' || saved === 'ja' ? saved : 'ja';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    localStorage.setItem('ching-drama-locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

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
          onBack={() => setScreen('top')}
          onStart={handleStartCountdown}
        />
      )}
      {screen === 'countdown' && settings && (
        <CountdownPage
          locale={locale}
          settings={settings}
          onFinish={handleFinish}
        />
      )}
      {screen === 'result' && settings && (
        <ResultPage
          locale={locale}
          settings={settings}
          onReplay={handleReplay}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
