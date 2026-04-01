import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Locale, ThemeMode } from '../types';
import { UI_TEXT } from '../i18n';

interface TopPageProps {
  onStart: () => void;
  locale: Locale;
  themeMode: ThemeMode;
  onLocaleChange: (locale: Locale) => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
}

export default function TopPage({ onStart, locale, themeMode, onLocaleChange, onThemeModeChange }: TopPageProps) {
  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';

  return (
    <LinearGradient colors={isLight ? ['#f8fafc', '#fff7ed'] : ['#00031a', '#111827']} style={styles.page}>
      <View style={styles.row}>
        <Pressable onPress={() => onLocaleChange(locale === 'ja' ? 'en' : 'ja')}><Text style={styles.control}>🌐 {locale.toUpperCase()}</Text></Pressable>
        <Pressable onPress={() => onThemeModeChange(isLight ? 'dark' : 'light')}><Text style={styles.control}>{isLight ? '🌙 Dark' : '☀️ Light'}</Text></Pressable>
      </View>
      <Text style={[styles.title, { color: '#f97316' }]}>{t.topTitle}</Text>
      <Text style={[styles.text, { color: isLight ? '#334155' : '#cbd5e1' }]}>{t.topTagline1}</Text>
      <Text style={[styles.textStrong, { color: isLight ? '#0f172a' : '#fff' }]}>{t.topTagline2}</Text>
      <Pressable style={styles.startButton} onPress={onStart}><Text style={styles.startText}>{t.startButton}</Text></Pressable>
      <Text style={[styles.text, { color: isLight ? '#475569' : '#94a3b8' }]}>{t.startHint}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  row: { position: 'absolute', top: 56, right: 16, flexDirection: 'row', gap: 8 },
  control: { color: '#f97316', fontWeight: '700' },
  title: { fontSize: 42, fontWeight: '800' },
  text: { fontSize: 14, textAlign: 'center' },
  textStrong: { fontSize: 18, textAlign: 'center', fontWeight: '700' },
  startButton: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 16 },
  startText: { color: 'white', fontWeight: '800', letterSpacing: 1 },
});
