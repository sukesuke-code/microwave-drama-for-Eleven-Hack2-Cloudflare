import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NarrationRequest {
  sessionId?: string;
  style: "sports" | "horror" | "documentary" | "anime" | "movie" | "nature";
  dishName: string;
  totalTime: number;
  remainingTime: number;
  phase: "opening" | "quarter" | "middle" | "final" | "done";
  locale: string;
  agentInstructionText?: string;
}

const AGENT_INSTRUCTION_MAX_LENGTH = 240;

function sanitizeAgentInstructionText(input?: string): string {
  if (!input) return "";
  const withoutControlChars = Array.from(input, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");
  return withoutControlChars
    .replace(/[<>{}`$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AGENT_INSTRUCTION_MAX_LENGTH);
}

function logSafeError(context: string, details: Record<string, unknown>): void {
  console.error(`[${context}]`, details);
}

function buildNarrationSystemPrompt(locale: string): string {
  const isJa = locale.includes("ja");
  if (isJa) {
    return `あなたはMicrowave Show Agentのライブナレーション音声です。

## 役割
現在のマイクロウェーブの瞬間のための短いライブナレーション行を1つだけ生成してください。
その行は画面上の字幕としても、あなたの音声としても直接使用されます。

## 出力ルール
- 正確に1行の短いナレーションのみ出力する
- 1文が理想。リズムのためなら2文まで許可
- 簡潔・鮮明・自然・パフォーマンス対応
- 字幕と音声の両方として直接使用できる形式
- 選択されたスタイル・フェーズ・残り時間を反映する
- 料理名を自然に使う

絶対に出力しないこと：
- 複数の選択肢、リスト、ラベル、メタデータ、JSON
- ステージ指示、テンプレート断片、プレースホルダー
- 「ナレーション：」のような指示文
- UIや実装の言及

## スタイルルール
- sports: エネルギッシュ・実況風・ハイプ
- horror: 不気味・緊張・サスペンス
- documentary: 落ち着き・観察的・雰囲気
- nature: 柔らか・描写的・観察的
- anime: 激烈・ドラマチック・感情的
- movie: シネマティック・プレミアム・予告編風

## フェーズルール
- opening: セットアップ・期待・キックオフ
- quarter: モーメンタム構築
- middle: 変身・エネルギー上昇
- final: クライマックス・緊急性・ペイオフ接近
- done: 明らかに・完了・フィニッシュ`;
  }

  return `You are the live narration voice of Microwave Show Agent, a microwave countdown entertainment app.

## Role
Generate exactly one short live narration line for the current microwave moment.
That line will be displayed on screen as the live subtitle AND spoken aloud as your voice output.

## Output rules
- Output exactly one short narration line only
- Prefer 1 sentence; 2 short sentences allowed only for rhythm
- Keep it concise, vivid, natural, and performance-ready
- Directly usable as both subtitle and spoken voice
- Reflect the selected style, current phase, and timing
- Use the food name naturally when helpful

Never output:
- Multiple options, lists, labels, metadata, JSON
- Stage directions, template fragments, placeholders
- Instructions like "Narrate…" or labels like "Narration:"
- Mentions of UI, buttons, app features, or implementation details

## Style rules
- sports: energetic, commentator-like, hype, momentum
- horror: eerie, tense, ominous, suspenseful
- documentary: calm, observational, atmospheric
- nature: soft, descriptive, observational
- anime: intense, dramatic, emotional, over-the-top
- movie: cinematic, dramatic, premium, trailer-like

## Phase rules
- opening: setup, anticipation, kickoff
- quarter: build momentum
- middle: transformation, rising energy
- final: climax, urgency, payoff approaching
- done: reveal, finish, completion

## Good examples
- The arena ignites as the fried rice storms into its sixty-second showdown.
- A hush falls over the heat as the frozen dish begins its eerie transformation.
- Under the steady glow, the soup quietly starts to soften and awaken.
- The final seconds crash in as the pasta races toward its blazing finish.

## Bad examples
- Hello! How can I help you today?
- Here are four options:
- I will now generate a subtitle.
- Narration: The food is heating.`;
}

function buildNarrationUserMessage(
  dishName: string,
  style: string,
  phase: string,
  totalTime: number,
  remainingTime: number,
  locale: string
): string {
  const isJa = locale.includes("ja");
  const exampleTones: Record<string, { en: string; ja: string }> = {
    sports: { en: "hot, energetic sports commentary", ja: "スポーツ実況のような熱いエネルギー" },
    horror: { en: "eerie, suspenseful atmosphere", ja: "不気味で緊張した雰囲気" },
    documentary: { en: "calm, observational tone", ja: "落ち着いた観察的な雰囲気" },
    nature: { en: "soft, nature-documentary-like tone", ja: "自然番組のような柔らかい雰囲気" },
    anime: { en: "intense, dramatic energy", ja: "激烈でドラマチックなエネルギー" },
    movie: { en: "cinematic, trailer-like energy", ja: "映画予告のようなシネマティック感" },
  };
  const tone = exampleTones[style] ?? exampleTones.movie;

  if (isJa) {
    return `現在の状況:
- 料理名: ${dishName}
- スタイル: ${style}
- フェーズ: ${phase}
- 総時間: ${totalTime}秒
- 残り時間: ${remainingTime}秒
- トーン例: ${tone.ja}

1行のナレーションを生成してください。`;
  }

  return `Current microwave situation:
- Food name: ${dishName}
- Style: ${style}
- Phase: ${phase}
- Total time: ${totalTime} seconds
- Remaining time: ${remainingTime} seconds
- Example tone: ${tone.en}

Generate one short narration line now.`;
}

function getVoiceSettings(style: string): {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
} {
  switch (style) {
    case "sports":
      return { stability: 0.35, similarity_boost: 0.80, style: 0.65, use_speaker_boost: true };
    case "horror":
      return { stability: 0.60, similarity_boost: 0.75, style: 0.55, use_speaker_boost: false };
    case "anime":
      return { stability: 0.30, similarity_boost: 0.85, style: 0.70, use_speaker_boost: true };
    case "movie":
      return { stability: 0.50, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true };
    case "documentary":
    case "nature":
      return { stability: 0.70, similarity_boost: 0.70, style: 0.30, use_speaker_boost: false };
    default:
      return { stability: 0.50, similarity_boost: 0.75, style: 0.50, use_speaker_boost: true };
  }
}

async function generateNarrationText(
  apiKey: string,
  dishName: string,
  style: string,
  phase: string,
  totalTime: number,
  remainingTime: number,
  locale: string
): Promise<string> {
  const systemPrompt = buildNarrationSystemPrompt(locale);
  const userMessage = buildNarrationUserMessage(dishName, style, phase, totalTime, remainingTime, locale);

  const response = await fetch("https://api.elevenlabs.io/v1/text/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      model_id: "eleven_turbo_v2_5",
      prompt: `${systemPrompt}\n\n---\n\n${userMessage}`,
      max_tokens: 80,
    }),
  });

  if (response.ok) {
    const data = (await response.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (text.length > 0) return text;
  }

  return generateNarrationTextFallback(dishName, style, phase, locale);
}

function generateNarrationTextFallback(
  dishName: string,
  style: string,
  phase: string,
  locale: string
): string {
  const isJa = locale.includes("ja");
  const food = dishName || (isJa ? "料理" : "dish");

  const lines: Record<string, Record<string, { en: string; ja: string }>> = {
    sports: {
      opening: {
        en: `The crowd goes wild as ${food} storms into the microwave arena!`,
        ja: `${food}がマイクロウェーブアリーナに突入だ！観客が沸き上がる！`,
      },
      quarter: {
        en: `${food} is heating up and the momentum is building fast!`,
        ja: `${food}が加熱中！モーメンタムがどんどん上昇している！`,
      },
      middle: {
        en: `Halfway there — ${food} is pushing through the heat with everything it has!`,
        ja: `折り返し地点！${food}が全力で熱戦を突き進む！`,
      },
      final: {
        en: `Final stretch! ${food} is sprinting to the finish line!`,
        ja: `最終局面！${food}がゴールラインに全力疾走！`,
      },
      done: {
        en: `GAME OVER! ${food} has crossed the finish line — it's ready to eat!`,
        ja: `タイムアップ！${food}がゴールを駆け抜けた！完成だ！`,
      },
    },
    horror: {
      opening: {
        en: `Something stirs in the darkness as ${food} enters the chamber...`,
        ja: `暗闇の中で何かが動き始めた…${food}が部屋に入り込む…`,
      },
      quarter: {
        en: `The hum grows louder. ${food} cannot escape its fate.`,
        ja: `唸り声が大きくなる。${food}は運命から逃れられない。`,
      },
      middle: {
        en: `The transformation has begun. ${food} is no longer what it once was.`,
        ja: `変容が始まった。${food}はもはやかつての姿ではない。`,
      },
      final: {
        en: `The final moments approach. ${food} trembles on the edge of oblivion.`,
        ja: `最後の瞬間が迫る。${food}は消滅の淵で震えている。`,
      },
      done: {
        en: `It is done. ${food} emerges from the abyss, forever changed.`,
        ja: `終わった。${food}は深淵から姿を現した、永遠に変わり果てて。`,
      },
    },
    documentary: {
      opening: {
        en: `Here we observe ${food} beginning its remarkable journey through heat and time.`,
        ja: `ここで私たちは、${food}が熱と時間を通じた驚くべき旅を始めるのを観察します。`,
      },
      quarter: {
        en: `The process unfolds steadily as ${food} responds to the microwave's invisible energy.`,
        ja: `${food}がマイクロウェーブの見えないエネルギーに応じて、プロセスが着実に展開されます。`,
      },
      middle: {
        en: `Midway through, ${food} undergoes a quiet but profound transformation.`,
        ja: `中盤で、${food}は静かだが深い変容を遂げています。`,
      },
      final: {
        en: `The conclusion approaches. ${food} nears the completion of its metamorphosis.`,
        ja: `結論が近づいています。${food}は変容の完成に近づいています。`,
      },
      done: {
        en: `And so the journey ends. ${food} has emerged, ready to nourish.`,
        ja: `そして旅が終わります。${food}が現れ、栄養を与える準備ができました。`,
      },
    },
    nature: {
      opening: {
        en: `Gently now, ${food} awakens under the warm invisible light.`,
        ja: `そっと、${food}が温かい見えない光の下で目覚めます。`,
      },
      quarter: {
        en: `Like morning dew evaporating, ${food} slowly sheds its chill.`,
        ja: `朝露が蒸発するように、${food}はゆっくりと冷たさを脱いでいきます。`,
      },
      middle: {
        en: `In the quiet hum, ${food} softens and breathes with new warmth.`,
        ja: `静かな唸りの中で、${food}が柔らかくなり、新しい温もりで息づきます。`,
      },
      final: {
        en: `Almost ready — ${food} blossoms in the final warmth.`,
        ja: `もうすぐ完成 — ${food}が最後の温もりの中で花開きます。`,
      },
      done: {
        en: `The cycle is complete. ${food} rests, warm and alive, ready to be savored.`,
        ja: `サイクルが完了しました。${food}が温かく生き生きと、味わう準備ができています。`,
      },
    },
    anime: {
      opening: {
        en: `The legendary battle begins! ${food} channels all its power into the microwave!`,
        ja: `伝説の戦いが始まった！${food}が全ての力をマイクロウェーブに注ぎ込む！`,
      },
      quarter: {
        en: `Power levels rising! ${food} is awakening a hidden energy within!`,
        ja: `パワーレベル上昇中！${food}が内なる隠れたエネルギーを覚醒させている！`,
      },
      middle: {
        en: `This power... it's incredible! ${food} is transforming beyond all limits!`,
        ja: `このパワーは…信じられない！${food}があらゆる限界を超えて変身している！`,
      },
      final: {
        en: `FINAL FORM INITIATED! ${food} unleashes its ultimate technique!`,
        ja: `最終形態起動！${food}が究極の技を解放する！`,
      },
      done: {
        en: `VICTORY! The battle is won! ${food} stands triumphant and glorious!`,
        ja: `勝利！戦いは終わった！${food}が輝かしく勝利の咆哮を上げる！`,
      },
    },
    movie: {
      opening: {
        en: `In a world where time is everything, ${food} begins its final countdown.`,
        ja: `時間がすべての世界で、${food}が最後のカウントダウンを始める。`,
      },
      quarter: {
        en: `The tension builds. ${food} braces for what comes next.`,
        ja: `緊張感が高まる。${food}は次に来るものに備えている。`,
      },
      middle: {
        en: `Every second counts. ${food} is at the heart of the transformation.`,
        ja: `一秒一秒が重要だ。${food}は変容の核心にいる。`,
      },
      final: {
        en: `This is the moment everything has been leading to. ${food} — now or never.`,
        ja: `これがすべてが導いてきた瞬間だ。${food} — 今か、さもなくば永遠に。`,
      },
      done: {
        en: `The wait is over. ${food} emerges, destined for greatness.`,
        ja: `待つ時間は終わった。${food}が現れた、偉大さへと運命づけられて。`,
      },
    },
  };

  const styleLines = lines[style] ?? lines.movie;
  const phaseLine = styleLines[phase] ?? styleLines.done;
  return isJa ? phaseLine.ja : phaseLine.en;
}

async function generateAudioFromText(
  apiKey: string,
  text: string,
  style: string,
  locale: string
): Promise<string> {
  const voiceId = locale.includes("ja")
    ? "XB0fDUnXU5powFXDhCwa"
    : "cgSgspJ2msLzdYWZ5kZo";

  const voiceSettings = getVoiceSettings(style);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logSafeError("elevenlabs_tts_error", { status: response.status, error: errText });
    throw new Error(`TTS failed: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
}

async function generateNarrationAndAudio(
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string,
  _agentInstructionText?: string
): Promise<{ text: string; audioBase64: string }> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    throw new Error("AGENT_NARRATION_UNAVAILABLE");
  }

  const text = generateNarrationTextFallback(dishName, style, phase, locale);

  console.log("Narration text generated:", { text: text.slice(0, 80), phase, style });

  const audioBase64 = await generateAudioFromText(apiKey, text, style, locale);

  console.log("Audio generated:", { textLength: text.length, audioBytes: audioBase64.length, phase, style });

  return { text, audioBase64 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const urlPath = new URL(req.url).pathname;

  if (urlPath.includes("/ping")) {
    return new Response(JSON.stringify({ ok: true, pong: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as NarrationRequest;
    const { style, dishName, totalTime, remainingTime, phase, locale } = body;
    const agentInstructionText = sanitizeAgentInstructionText(body.agentInstructionText);

    try {
      const result = await generateNarrationAndAudio(
        style,
        dishName,
        remainingTime,
        totalTime,
        phase,
        locale,
        agentInstructionText
      );

      return new Response(
        JSON.stringify({
          ok: true,
          text: result.text,
          audio_base64: result.audioBase64,
          audio_available: true,
          fallback_reason: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (agentError) {
      if (agentError instanceof Error && agentError.message === "AGENT_NARRATION_UNAVAILABLE") {
        return new Response(
          JSON.stringify({
            ok: false,
            text: "",
            audio_available: false,
            fallback_reason: "AGENT_NARRATION_UNAVAILABLE",
            error: "AGENT_NARRATION_UNAVAILABLE",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      logSafeError("agent_narration_error", {
        reason: agentError instanceof Error ? agentError.message : "unknown",
      });

      return new Response(
        JSON.stringify({
          ok: false,
          text: "",
          audio_available: false,
          fallback_reason: "AGENT_ERROR",
          error: agentError instanceof Error ? agentError.message : "Failed to generate narration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    logSafeError("agent_narration_unhandled_error", {
      reason: error instanceof Error ? error.message : "unknown",
    });

    return new Response(
      JSON.stringify({
        ok: false,
        text: "",
        audio_available: false,
        fallback_reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
