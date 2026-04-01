import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScreen, Locale, Settings, ThemeMode } from './types';
import TopPage from './pages/TopPage';
import SettingsPage from './pages/SettingsPage';
import CountdownPage from './pages/CountdownPage';
import ResultPage from './pages/ResultPage';

const memoryStorage = new Map<string, string>();

async function readStorage(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

async function writeStorage(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('top');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locale, setLocale] = useState<Locale>('ja');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    (async () => {
      const savedLocale = await readStorage('ching-drama-locale');
      const savedTheme = await readStorage('ching-drama-theme');
      if (savedLocale === 'ja' || savedLocale === 'en') setLocale(savedLocale);
      if (savedTheme === 'dark' || savedTheme === 'light') setThemeMode(savedTheme);
    })();
  }, []);

  useEffect(() => {
    void writeStorage('ching-drama-locale', locale);
  }, [locale]);

  useEffect(() => {
    void writeStorage('ching-drama-theme', themeMode);
  }, [themeMode]);

  return (
    <View style={{ flex: 1 }}>
      {screen === 'top' && (
        <TopPage
          onStart={() => setScreen('settings')}
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
          onStart={(next) => {
            setSettings(next);
            setScreen('countdown');
          }}
        />
      )}
      {screen === 'countdown' && settings && (
        <CountdownPage
          locale={locale}
          settings={settings}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onBack={() => setScreen('settings')}
          onFinish={() => setScreen('result')}
        />
      )}
      {screen === 'result' && settings && (
        <ResultPage
          locale={locale}
          settings={settings}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onReplay={() => setScreen('countdown')}
          onHome={() => setScreen('settings')}
        />
      )}
    </View>
  );
}
