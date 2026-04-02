import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { narrations, NarrationStyle } from './src/narrations';

const presets = [30, 60, 90, 120];

export default function App() {
  const [seconds, setSeconds] = useState(60);
  const [dish, setDish] = useState('');
  const [style, setStyle] = useState<NarrationStyle>('sports');
  const [remaining, setRemaining] = useState<number | null>(null);

  const running = remaining !== null;
  const progress = useMemo(() => {
    if (remaining === null) return 0;
    return Math.max(0, Math.min(1, 1 - remaining / seconds));
  }, [remaining, seconds]);

  const stepIndex = useMemo(() => {
    if (remaining === null) return 0;
    const idx = Math.floor(progress * narrations[style].length);
    return Math.min(narrations[style].length - 1, idx);
  }, [progress, remaining, style]);

  const startCountdown = () => {
    if (seconds < 5) return;
    setRemaining(seconds);
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(seconds - elapsed, 0);
      setRemaining(next);
      if (next > 0) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  };

  const reset = () => setRemaining(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Microwave Show</Text>
      <Text style={styles.subtitle}>React Native (iOS / Android / Web) 版</Text>

      <View style={styles.card}>
        <Text style={styles.label}>料理名（任意）</Text>
        <TextInput
          placeholder="例: パスタ"
          placeholderTextColor="#7c8796"
          style={styles.input}
          value={dish}
          editable={!running}
          onChangeText={setDish}
        />

        <Text style={styles.label}>時間（秒）</Text>
        <View style={styles.row}>
          {presets.map((v) => (
            <Pressable
              key={v}
              style={[styles.preset, seconds === v && styles.presetActive]}
              onPress={() => setSeconds(v)}
              disabled={running}
            >
              <Text style={styles.presetText}>{v}s</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>実況スタイル</Text>
        <View style={styles.row}>
          {(Object.keys(narrations) as NarrationStyle[]).map((k) => (
            <Pressable
              key={k}
              style={[styles.preset, style === k && styles.presetActive]}
              onPress={() => setStyle(k)}
              disabled={running}
            >
              <Text style={styles.presetText}>{k}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.timerText}>{remaining ?? seconds}s</Text>
        <Text style={styles.narration}>{narrations[style][stepIndex]}</Text>
        {dish ? <Text style={styles.dish}>対象: {dish}</Text> : null}

        {!running ? (
          <Pressable style={styles.cta} onPress={startCountdown}>
            <Text style={styles.ctaText}>スタート</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.cta} onPress={reset}>
            <Text style={styles.ctaText}>リセット</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071022',
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    color: '#f5f7ff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    color: '#8ea0ba',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20
  },
  card: {
    backgroundColor: '#101c32',
    borderRadius: 18,
    padding: 16,
    gap: 10
  },
  label: {
    color: '#b4c4da',
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a3a56',
    backgroundColor: '#0a1428',
    color: '#f1f5ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  preset: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d3c57',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  presetActive: {
    backgroundColor: '#2c7ef8',
    borderColor: '#2c7ef8'
  },
  presetText: {
    color: '#f1f5ff',
    textTransform: 'capitalize'
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#0b1528',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#37d67a'
  },
  timerText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center'
  },
  narration: {
    color: '#dce8ff',
    textAlign: 'center',
    minHeight: 42
  },
  dish: {
    color: '#9db0cc',
    textAlign: 'center'
  },
  cta: {
    marginTop: 8,
    backgroundColor: '#2c7ef8',
    borderRadius: 12,
    paddingVertical: 12
  },
  ctaText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '800'
  }
});
