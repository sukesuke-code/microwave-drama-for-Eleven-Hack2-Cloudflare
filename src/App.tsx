import { useState } from 'react';
import { AppScreen, Settings } from './types';
import TopPage from './pages/TopPage';
import SettingsPage from './pages/SettingsPage';
import CountdownPage from './pages/CountdownPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('top');
  const [settings, setSettings] = useState<Settings | null>(null);

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
      {screen === 'top' && <TopPage onStart={handleStartSettings} />}
      {screen === 'settings' && (
        <SettingsPage
          onBack={() => setScreen('top')}
          onStart={handleStartCountdown}
        />
      )}
      {screen === 'countdown' && settings && (
        <CountdownPage
          settings={settings}
          onFinish={handleFinish}
        />
      )}
      {screen === 'result' && settings && (
        <ResultPage
          settings={settings}
          onReplay={handleReplay}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
