import { Locale, NarrationCue, NarrationStyle, StyleConfig } from '../types';
import { STYLE_LABELS } from '../i18n';

export const STYLE_CONFIGS: StyleConfig[] = [
  {
    id: 'sports',
    label: 'スポーツ実況',
    emoji: '🏟️',
    accentColor: '#f97316',
    glowClass: 'text-shadow-glow-orange',
    bgGradient: 'from-orange-950/40 via-stone-950 to-stone-950',
    textShadowClass: 'text-orange-400',
    boxNeonClass: 'box-neon-orange',
  },
  {
    id: 'movie',
    label: '映画予告編',
    emoji: '🎬',
    accentColor: '#f59e0b',
    glowClass: 'text-shadow-glow-yellow',
    bgGradient: 'from-yellow-950/40 via-stone-950 to-stone-950',
    textShadowClass: 'text-yellow-400',
    boxNeonClass: 'box-neon-yellow',
  },
  {
    id: 'horror',
    label: 'ホラー',
    emoji: '😱',
    accentColor: '#dc2626',
    glowClass: 'text-shadow-glow-red',
    bgGradient: 'from-red-950/40 via-stone-950 to-stone-950',
    textShadowClass: 'text-red-400',
    boxNeonClass: 'box-neon-red',
  },
  {
    id: 'nature',
    label: '自然ドキュメンタリー',
    emoji: '🌍',
    accentColor: '#10b981',
    glowClass: 'text-shadow-glow-green',
    bgGradient: 'from-emerald-950/40 via-stone-950 to-stone-950',
    textShadowClass: 'text-emerald-400',
    boxNeonClass: 'box-neon-green',
  },
];

const STYLE_CONFIGS_CACHE: Record<Locale, ReadonlyArray<StyleConfig>> = {
  ja: Object.freeze(STYLE_CONFIGS.map((config) => Object.freeze({ ...config, label: STYLE_LABELS.ja[config.id] }))),
  en: Object.freeze(STYLE_CONFIGS.map((config) => Object.freeze({ ...config, label: STYLE_LABELS.en[config.id] }))),
};

export function getStyleConfigs(locale: Locale): StyleConfig[] {
  return STYLE_CONFIGS_CACHE[locale] as StyleConfig[];
}

const narrationCuesCache = new Map<string, NarrationCue[]>();
const NARRATION_CACHE_MAX = 120;

function setNarrationCache(key: string, value: NarrationCue[]) {
  if (narrationCuesCache.size >= NARRATION_CACHE_MAX) {
    const oldestKey = narrationCuesCache.keys().next().value;
    if (oldestKey) narrationCuesCache.delete(oldestKey);
  }
  narrationCuesCache.set(key, value);
}

export function getNarrationCues(
  style: NarrationStyle,
  dishName: string,
  locale: Locale = 'ja'
): NarrationCue[] {
  const d = dishName || (locale === 'ja' ? '謎の食べ物' : 'mystery dish');
  const cacheKey = `${locale}:${style}:${d}`;
  const cached = narrationCuesCache.get(cacheKey);
  if (cached) return cached;

  let result: NarrationCue[];
  if (locale === 'en') {
    switch (style) {
      case 'sports':
        result = [
        { minPercent: 90, maxPercent: 100, lines: [`And we are live! ${d} enters the arena!`] },
        { minPercent: 70, maxPercent: 90, lines: [`Strong opening pace. ${d} looks focused.`] },
        { minPercent: 50, maxPercent: 70, lines: [`Halfway mark! Momentum is building.`] },
        { minPercent: 25, maxPercent: 50, lines: [`Final quarter. The heat is rising fast!`] },
        { minPercent: 10, maxPercent: 25, lines: [`Last sprint! This is championship territory.`] },
        { minPercent: 0, maxPercent: 10, lines: [`Final countdown—hold your breath!`] },
        ];
        break;
      case 'movie':
        result = [
        { minPercent: 90, maxPercent: 100, lines: [`This summer, one dish changes everything: "${d}"`] },
        { minPercent: 70, maxPercent: 90, lines: [`The door is closed. Fate starts to move.`] },
        { minPercent: 50, maxPercent: 70, lines: [`No turning back now. The plot thickens.`] },
        { minPercent: 25, maxPercent: 50, lines: [`Time is running out. Climax incoming.`] },
        { minPercent: 10, maxPercent: 25, lines: [`Almost there... everything converges.`] },
        { minPercent: 0, maxPercent: 10, lines: [`In theaters soon. One final sound remains.`] },
        ];
        break;
      case 'horror':
        result = [
        { minPercent: 90, maxPercent: 100, lines: [`You put ${d} inside... and something woke up.`] },
        { minPercent: 70, maxPercent: 90, lines: [`The light flickers. Something feels wrong.`] },
        { minPercent: 50, maxPercent: 70, lines: [`Midpoint. Few have returned from here.`] },
        { minPercent: 25, maxPercent: 50, lines: [`Run. Right now. If you still can.`] },
        { minPercent: 10, maxPercent: 25, lines: [`Too late. The countdown has chosen you.`] },
        { minPercent: 0, maxPercent: 10, lines: [`The ding draws near. No one is coming.`] },
        ];
        break;
      case 'nature':
        result = [
        { minPercent: 90, maxPercent: 100, lines: [`In the microwave wilds, ${d}'s journey begins.`] },
        { minPercent: 70, maxPercent: 90, lines: [`Microwaves stir each molecule with precision.`] },
        { minPercent: 50, maxPercent: 70, lines: [`Transformation accelerates deep within.`] },
        { minPercent: 25, maxPercent: 50, lines: [`A critical threshold is near.`] },
        { minPercent: 10, maxPercent: 25, lines: [`Only moments remain in this thermal dance.`] },
        { minPercent: 0, maxPercent: 10, lines: [`The journey reaches its natural climax.`] },
        ];
        break;
    }
    setNarrationCache(cacheKey, result);
    return result;
  }

  const cues: Record<NarrationStyle, NarrationCue[]> = {
    sports: [
      {
        minPercent: 90,
        maxPercent: 100,
        lines: [
          `さあ！スタートの合図とともに、${d}が電子レンジに投入された！観衆が息をのむ！`,
          `本日のメインイベント！${d}vs電子レンジ、伝説の戦いが今始まる！！`,
        ],
      },
      {
        minPercent: 70,
        maxPercent: 90,
        lines: [
          `序盤戦、${d}は順調なペースを刻んでいます！しかし油断は禁物！`,
          `まだ始まったばかり！しかし${d}のポテンシャルは計り知れない！！`,
        ],
      },
      {
        minPercent: 50,
        maxPercent: 70,
        lines: [
          `折り返し地点を通過！${d}、ここから真の実力を見せろ！！`,
          `中盤！電波が${d}の深部に到達し始めた！これぞまさに正念場！`,
        ],
      },
      {
        minPercent: 25,
        maxPercent: 50,
        lines: [
          `残り4分の1！${d}よ、諦めるな！観客は君を見ている！！`,
          `終盤戦に突入！熱量が最高潮に達しようとしている！！`,
        ],
      },
      {
        minPercent: 10,
        maxPercent: 25,
        lines: [
          `もうすぐだ！${d}が全力疾走している！誰も止められない！！！`,
          `ラストスパート！歴史が今、まさに作られようとしている！！！`,
        ],
      },
      {
        minPercent: 0,
        maxPercent: 10,
        lines: [
          `最終カウントダウン！！全てはこの瞬間のため！${d}よ、飛べ！！！`,
          `ゴールまであと数秒！！心臓が止まりそうだ！！！！`,
        ],
      },
    ],
    movie: [
      {
        minPercent: 90,
        maxPercent: 100,
        lines: [
          `この夏、一つの料理が世界を変える…\n\n「${d}」`,
          `運命は、すでに動き始めていた…`,
        ],
      },
      {
        minPercent: 70,
        maxPercent: 90,
        lines: [
          `「${d}…それは、ただの食事ではない」`,
          `電子レンジが唸りを上げる。扉の向こうで、何かが変わろうとしていた。`,
        ],
      },
      {
        minPercent: 50,
        maxPercent: 70,
        lines: [
          `「もう引き返せない」\n\n熱が、全てを変えていく。`,
          `ドラマは、いつも日常の中に潜んでいる。`,
        ],
      },
      {
        minPercent: 25,
        maxPercent: 50,
        lines: [
          `タイムリミットが迫る…\n\n「${d}、準備はいいか」`,
          `全ての伏線が、ここで回収される。`,
        ],
      },
      {
        minPercent: 10,
        maxPercent: 25,
        lines: [
          `「もうすぐだ…全てが、終わる」\n\nそして、新たな始まりが訪れる。`,
          `クライマックスが近づいている。`,
        ],
      },
      {
        minPercent: 0,
        maxPercent: 10,
        lines: [
          `全ての人間に、等しく与えられた\n運命の瞬間…`,
          `「${d}…ありがとう。」\n\n今秋、全国公開。`,
        ],
      },
    ],
    horror: [
      {
        minPercent: 90,
        maxPercent: 100,
        lines: [
          `なぜ…なぜあなたはそれを中に入れてしまったのか…\n\n${d}が、目覚める。`,
          `扉が閉まった。\n\n逃げ場は、もうない。`,
        ],
      },
      {
        minPercent: 70,
        maxPercent: 90,
        lines: [
          `電子レンジの光が、ゆっくりと${d}を照らす…\n\n何かが、おかしい。`,
          `「聞こえるか…？」\n\n${d}は、確かに動いた。`,
        ],
      },
      {
        minPercent: 50,
        maxPercent: 70,
        lines: [
          `中間地点。\n\nここから先に戻った者はいない…`,
          `熱が、内側から${d}を侵食していく…\n\nじわり、じわりと。`,
        ],
      },
      {
        minPercent: 25,
        maxPercent: 50,
        lines: [
          `逃げて。\n\n今すぐ逃げて。\n\nまだ間に合う…`,
          `${d}の変容が加速する。\n\n取り返しのつかない何かが、始まっていた。`,
        ],
      },
      {
        minPercent: 10,
        maxPercent: 25,
        lines: [
          `もう…遅い。\n\n全ては決まっていた。`,
          `カウントダウンが、始まった。\n\n${d}の、最後の時間が。`,
        ],
      },
      {
        minPercent: 0,
        maxPercent: 10,
        lines: [
          `…\n\n…聞こえるか？\n\n「チーン」の音が近づいてくる。`,
          `最後の数秒。\n\n誰も助けには来ない。`,
        ],
      },
    ],
    nature: [
      {
        minPercent: 90,
        maxPercent: 100,
        lines: [
          `電子レンジの荒野に、${d}の旅が始まった。\n\nマイクロ波は沈黙の中で目覚める。`,
          `数十億年の進化が、この瞬間に集約されている。\n\n${d}もまた、その歴史の一部だ。`,
        ],
      },
      {
        minPercent: 70,
        maxPercent: 90,
        lines: [
          `マイクロ波は静かに、しかし確実に、${d}の分子を揺さぶる。\n\nこれが、熱の誕生だ。`,
          `序盤の穏やかな時間。\n\nだが自然に「穏やか」などというものはない。全ては変化の予兆だ。`,
        ],
      },
      {
        minPercent: 50,
        maxPercent: 70,
        lines: [
          `熱は内部から外部へと伝播する。\n\n生存とは、変化に適応することである。`,
          `${d}は今、最も劇的な変容の中にある。\n\nこれが食物連鎖の頂点だ。`,
        ],
      },
      {
        minPercent: 25,
        maxPercent: 50,
        lines: [
          `変容の瞬間が近づいている。\n\n${d}は、もう後戻りできない境界線を越えた。`,
          `熱量が臨界点に達しつつある。\n\nこれぞ自然の摂理。`,
        ],
      },
      {
        minPercent: 10,
        maxPercent: 25,
        lines: [
          `あと僅か。\n\n${d}の分子は今、最速のダンスを踊っている。`,
          `完成の瞬間が迫る。\n\n自然は、常に最適解へと向かう。`,
        ],
      },
      {
        minPercent: 0,
        maxPercent: 10,
        lines: [
          `最後の秒が刻まれる。\n\n${d}の旅は、今まさにクライマックスを迎えようとしている。`,
          `全ての生命は、この瞬間のために存在する。\n\n準備は、できている。`,
        ],
      },
    ],
  };

  result = cues[style];
  setNarrationCache(cacheKey, result);
  return result;
}

export function getCurrentNarration(
  timeLeft: number,
  totalTime: number,
  style: NarrationStyle,
  dishName: string,
  locale: Locale = 'ja'
): string {
  const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const cues = getNarrationCues(style, dishName, locale);

  const cue = cues.find((c) => percent >= c.minPercent && percent < c.maxPercent) ?? cues[cues.length - 1];
  const idx = Math.floor((percent - cue.minPercent) / (cue.maxPercent - cue.minPercent) * cue.lines.length);
  return cue.lines[Math.min(idx, cue.lines.length - 1)];
}

export const FINISH_LINES: Record<NarrationStyle, string> = {
  sports:
    'フィニッシュ！！\n\n歴史的瞬間！！\n\n${d}、やりました！！\n\nチーーーーーーン！！！！',
  movie:
    '「チーン。」\n\n—— そして、物語は続く。',
  horror:
    '…\n\nチーン。\n\n…\n\n逃げなさい。',
  nature:
    '「チーン」\n\n生命の循環は続く。\n\n${d}は今、その使命を全うした。',
};

const FINISH_LINES_EN: Record<NarrationStyle, string> = {
  sports: 'FINISH!!\n\nHistoric moment!\n\n${d}, you did it!\n\nDIIIIING!!!!',
  movie: '"Ding."\n\n— And the story goes on.',
  horror: '...\n\nDing.\n\n...\n\nRun.',
  nature: '"Ding"\n\nThe cycle continues.\n\n${d} fulfilled its role.',
};

export function getFinishLine(style: NarrationStyle, dishName: string, locale: Locale = 'ja'): string {
  const source = locale === 'ja' ? FINISH_LINES : FINISH_LINES_EN;
  return source[style].replace(/\$\{d\}/g, dishName || (locale === 'ja' ? '謎の食べ物' : 'mystery dish'));
}
