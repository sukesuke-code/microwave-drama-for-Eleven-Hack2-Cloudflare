import { useMemo } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Locale, Settings, ThemeMode } from '../types';
import { RESULT_MESSAGES, UI_TEXT } from '../i18n';

interface Props {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onReplay: () => void;
  onHome: () => void;
}

export default function ResultPage({ locale, settings, themeMode, onThemeModeChange, onReplay, onHome }: Props) {
  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';
  const message = useMemo(() => {
    const messages = RESULT_MESSAGES[locale][settings.style];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [locale, settings.style]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `${settings.dishName}: ${message}` });
    } catch {
      Alert.alert('Share failed');
    }
  };

  return (
    <View style={[s.page, { backgroundColor: isLight ? '#f8fafc' : '#020617' }]}>
      <Pressable onPress={() => onThemeModeChange(isLight ? 'dark' : 'light')}><Text style={s.orange}>{isLight ? '🌙' : '☀️'}</Text></Pressable>
      <Text style={[s.title, { color: isLight ? '#0f172a' : '#fff' }]}>{t.dramaDone}</Text>
      <Text style={s.orange}>{settings.dishName}</Text>
      <Text style={[s.message, { color: isLight ? '#334155' : '#cbd5e1' }]}>{message}</Text>
      <Pressable style={s.button} onPress={onReplay}><Text style={s.buttonText}>{t.replay}</Text></Pressable>
      <Pressable style={s.buttonSecondary} onPress={handleShare}><Text>{t.share}</Text></Pressable>
      <Pressable onPress={onHome}><Text style={{ color: '#94a3b8' }}>{t.backTop}</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({ page: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 }, orange: { color: '#f97316', fontWeight: '800' }, title: { fontSize: 34, fontWeight: '800' }, message: { textAlign: 'center', fontStyle: 'italic' }, button: { borderRadius: 12, backgroundColor: '#ea580c', paddingHorizontal: 24, paddingVertical: 12 }, buttonText: { color: 'white', fontWeight: '700' }, buttonSecondary: { borderRadius: 12, backgroundColor: '#e2e8f0', paddingHorizontal: 24, paddingVertical: 12 } });
