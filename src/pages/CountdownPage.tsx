import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Locale, Settings, ThemeMode } from '../types';
import { getCurrentNarration, getFinishLine } from '../data/narrations';
import { UI_TEXT } from '../i18n';

interface Props {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onFinish: () => void;
}

export default function CountdownPage({ locale, settings, themeMode, onThemeModeChange, onBack, onFinish }: Props) {
  const { totalSeconds, style, dishName } = settings;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';

  useEffect(() => {
    if (paused || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [paused, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      const id = setTimeout(onFinish, 2000);
      return () => clearTimeout(id);
    }
  }, [timeLeft, onFinish]);

  const narration = useMemo(() => {
    if (timeLeft === 0) return getFinishLine(style, dishName, locale);
    return getCurrentNarration(timeLeft, totalSeconds, style, dishName, locale);
  }, [timeLeft, totalSeconds, style, dishName, locale]);

  return (
    <View style={[st.page, { backgroundColor: isLight ? '#f8fafc' : '#020617' }]}>
      <View style={st.top}><Pressable onPress={onBack}><Text style={st.orange}>←</Text></Pressable><Text style={st.orange}>{dishName}</Text><Pressable onPress={() => onThemeModeChange(isLight ? 'dark' : 'light')}><Text style={st.orange}>{isLight ? '🌙' : '☀️'}</Text></Pressable></View>
      <Text style={[st.timer, { color: timeLeft <= 10 ? '#ef4444' : isLight ? '#0f172a' : '#fff' }]}>{timeLeft}</Text>
      <Text style={[st.narration, { color: isLight ? '#334155' : '#cbd5e1' }]}>{narration}</Text>
      <Pressable onPress={() => setPaused((p) => !p)} style={st.pause}><Text style={{ color: 'white' }}>{paused ? t.resume : t.pause}</Text></Pressable>
    </View>
  );
}
const st = StyleSheet.create({ page: { flex: 1, padding: 20, justifyContent: 'center', gap: 20 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, orange: { color: '#f97316', fontWeight: '700' }, timer: { fontSize: 92, textAlign: 'center', fontWeight: '900' }, narration: { textAlign: 'center', fontSize: 16 }, pause: { alignSelf: 'center', backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 } });
