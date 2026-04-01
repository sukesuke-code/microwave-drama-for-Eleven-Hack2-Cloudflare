import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Locale, NarrationStyle, Settings, ThemeMode } from '../types';
import { UI_TEXT } from '../i18n';

interface SettingsPageProps {
  locale: Locale;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onStart: (settings: Settings) => void;
}

const stylesList: NarrationStyle[] = ['sports', 'movie', 'horror', 'nature'];

export default function SettingsPage({ locale, themeMode, onThemeModeChange, onBack, onStart }: SettingsPageProps) {
  const t = UI_TEXT[locale];
  const [duration, setDuration] = useState(60);
  const [dishName, setDishName] = useState(locale === 'ja' ? '冷凍チャーハン' : '');
  const [style, setStyle] = useState<NarrationStyle>('sports');
  const isLight = themeMode === 'light';
  const minutes = useMemo(() => Math.floor(duration / 60), [duration]);
  const seconds = useMemo(() => duration % 60, [duration]);

  return (
    <ScrollView style={[s.page, { backgroundColor: isLight ? '#f8fafc' : '#020617' }]} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <View style={s.header}><Pressable onPress={onBack}><Text style={s.orange}>←</Text></Pressable><Text style={[s.h1, { color: isLight ? '#0f172a' : '#fff' }]}>{t.settings}</Text><Pressable onPress={() => onThemeModeChange(isLight ? 'dark' : 'light')}><Text style={s.orange}>{isLight ? '🌙' : '☀️'}</Text></Pressable></View>
      <Text style={s.label}>{t.timeSetting}</Text>
      <View style={s.row}><Pressable onPress={() => setDuration(Math.max(1, duration - 10))}><Text style={s.btn}>-10s</Text></Pressable><Text style={[s.time, { color: isLight ? '#0f172a' : '#fff' }]}>{minutes}:{String(seconds).padStart(2, '0')}</Text><Pressable onPress={() => setDuration(Math.min(600, duration + 10))}><Text style={s.btn}>+10s</Text></Pressable></View>
      <Text style={s.label}>{t.optionalDish}</Text>
      <TextInput value={dishName} onChangeText={setDishName} style={[s.input, { color: isLight ? '#0f172a' : '#fff' }]} placeholder={t.dishPlaceholder} placeholderTextColor="#64748b" />
      <Text style={s.label}>{t.style}</Text>
      <View style={s.grid}>{stylesList.map((v) => <Pressable key={v} style={[s.styleCard, style === v && s.selected]} onPress={() => setStyle(v)}><Text style={{ color: 'white', fontWeight: '700' }}>{v}</Text></Pressable>)}</View>
      <Pressable style={s.cta} onPress={() => onStart({ totalSeconds: duration, dishName: dishName || t.mysteryDish, style })}><Text style={s.ctaText}>{t.startNarration}</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '800' },
  orange: { color: '#f97316', fontSize: 20, fontWeight: '800' },
  label: { color: '#f97316', fontWeight: '700', marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { color: '#f97316', fontWeight: '700', fontSize: 18 },
  time: { fontSize: 34, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleCard: { width: '48%', borderRadius: 10, padding: 12, backgroundColor: '#1e293b' },
  selected: { borderWidth: 2, borderColor: '#f97316' },
  cta: { marginTop: 8, borderRadius: 12, padding: 14, backgroundColor: '#ea580c' },
  ctaText: { color: 'white', textAlign: 'center', fontWeight: '800' },
});
