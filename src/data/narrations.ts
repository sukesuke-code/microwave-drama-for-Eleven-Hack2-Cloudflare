import { NarrationCue, NarrationStyle, StyleConfig } from '../types';

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

export function getNarrationCues(
  style: NarrationStyle,
  dishName: string
): NarrationCue[] {
  const d = dishName || '謎の食べ物';

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

  return cues[style];
}

export function getCurrentNarration(
  timeLeft: number,
  totalTime: number,
  style: NarrationStyle,
  dishName: string
): string {
  const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const cues = getNarrationCues(style, dishName);

  const matching = cues.filter(
    (c) => percent >= c.minPercent && percent < c.maxPercent
  );

  if (matching.length === 0) {
    const last = cues[cues.length - 1];
    return last.lines[0];
  }

  const cue = matching[0];
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

export function getFinishLine(style: NarrationStyle, dishName: string): string {
  return FINISH_LINES[style].replace(/\$\{d\}/g, dishName || '謎の食べ物');
}
