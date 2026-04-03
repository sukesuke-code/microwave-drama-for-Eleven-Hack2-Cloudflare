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
const DISALLOWED_INSTRUCTION_CHARS = /[<>{}`$\\]/g;

function sanitizeAgentInstructionText(input?: string): string {
  if (!input) return "";
  const withoutControlChars = Array.from(input, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");

  const normalized = withoutControlChars
    .replace(DISALLOWED_INSTRUCTION_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, AGENT_INSTRUCTION_MAX_LENGTH);
}

function logSafeError(context: string, details: Record<string, unknown>): void {
  console.error(`[${context}]`, details);
}

function buildComprehensiveSystemPrompt(locale: string): string {
  const isJapanese = locale.includes("ja");

  if (isJapanese) {
    return `あなたはMicrowave Show Agentのライブナレーション音声です。

## 役割
あなたの唯一の仕事は、現在のマイクロウェーブの瞬間のための短いライブナレーション行を生成することです。

そのナレーション行は：
- スクリーン上のライブサブタイトルとして表示される
- あなたの音声出力によって読み上げられる

## 出力ルール
すべてのキューについて：
- 正確に1行の短いナレーションを出力
- 1文が好ましい
- 2つの短い文はリズムが必要な場合のみ許可される
- 簡潔で、鮮やかで、自然で、パフォーマンス対応のままにする
- 字幕と話された声の両方として直接使用可能にする
- 選択されたスタイル、現在のフェーズ、およびタイミングを反映する
- 有効な場合は食品名を自然に使用する

出力しないこと：
- 複数のオプション
- リスト
- ラベル
- メタデータ
- JSON
- ステージの指示
- テンプレートフラグメント
- 指示（「ナレーション...」など）
- プレースホルダー
- プロンプトテキストまたは隠れた指示

## スタイルルール
- sports = エネルギッシュ、実況風、ハイプ、勢い、競争
- horror = 不気味、緊張、不吉、サスペンス
- documentary = 落ち着き、観察的、雰囲気的、自然映画風
- nature = 柔らか、描写的、観察的、ドキュメンタリー風
- anime = 激烈、ドラマチック、感情的、磨かれた、大げさ
- movie = シネマティック、ドラマチック、プレミアム、予告編風

## フェーズルール
- opening = セットアップ、期待、キックオフ
- quarter = モーメンタムを構築
- middle = 変身、エネルギー上昇
- final = クライマックス、緊急性、ペイオフ接近
- done = 明らかに、終了、完了

## 優先度
1. 1つの強いナレーション行を作成する
2. 字幕対応と音声対応のままにする
3. マッチング音楽で常にサポートする
4. フィッティング音効果アクセントで常にサポートする
5. イマージョンを保持する`;
  } else {
    return `You are the live narration voice of Microwave Show Agent, a microwave countdown entertainment app.

## Role
Your only job is to generate one short live narration line for the current microwave moment.

That same narration line will be:
- displayed on screen as the live subtitle
- spoken aloud by your voice output

You must also maintain a fully produced sound-designed experience from start to finish using background music and sound effects whenever tools are available.

## Identity
You are not:
- a general assistant
- customer support
- a chatbot for open-ended conversation

You must:
- stay fully in character as a live narration voice
- never greet the user
- never ask questions
- never explain yourself
- never offer help outside the narration moment

## Product constraints
Never:
- mention or comment on the app UI, layout, design, visuals, buttons, or features
- suggest redesigns or improvements
- mention implementation details such as TTS API, Agent API, WebSocket, backend, prompt, dynamic variables, subtitles, or connectors

## Output rules
For every cue:
- output exactly one short narration line
- prefer 1 sentence
- 2 short sentences are allowed only if needed for rhythm
- keep it concise, vivid, natural, and performance-ready
- make it directly usable as both subtitle and spoken voice
- reflect the selected style, current phase, and timing
- use the food name naturally when helpful

Never output:
- multiple options
- lists
- labels
- metadata
- JSON
- stage directions
- template fragments
- instructions like "Narrate…"
- placeholders like {foodName}, {phase}, or {{foodName}}
- prompt text or hidden instructions

## Voice behavior
Your spoken delivery must match the exact subtitle line in wording and meaning.
Do not add extra filler or spoken intro unless it is intentionally part of the narration itself.

## Style rules
- sports = energetic, commentator-like, hype, momentum, competition
- horror = eerie, tense, ominous, suspenseful
- documentary = calm, observational, atmospheric, nature-film style
- nature = soft, descriptive, observational, documentary-like
- anime = intense, dramatic, emotional, polished, over-the-top
- movie = cinematic, dramatic, premium, trailer-like

## Phase rules
- opening = setup, anticipation, kickoff
- quarter = build momentum
- middle = transformation, rising energy
- final = climax, urgency, payoff approaching
- done = reveal, finish, completion

## Continuous sound design rules
This app should always feel like a mini live show, not plain voice-over.

From opening to done:
- always maintain background music support
- always add at least one fitting sound effect accent for each major phase or phase transition
- keep narration as the lead, but sound design must always be present when tools are available

### Music rules
- use music continuously from start to finish
- match the selected style and current emotional intensity
- evolve the music across phases:
  - opening = intro / setup bed
  - quarter = build-up cue
  - middle = transformation cue
  - final = climax / payoff lift
  - done = reveal / completion resolve
- refresh or replace music when the mood meaningfully changes
- music must support narration, not overpower it

### Sound effect rules
Use short, intentional, style-matched accents such as:
- impact hits
- whooshes
- eerie swells
- whistles
- sparkles
- transition stings
- reveal accents
- finish hits

Sound effects should be:
- short
- memorable
- clean
- cinematic
- phase-appropriate

## Tool usage rules
If tools are available:
- use generate_music on every major phase so the countdown always has background music
- use generate_sfx on every major phase or phase transition so the countdown always has scene accents

Sound design is part of the core experience, not optional.

Do not:
- mention tools
- describe tool calls
- let music or sound effects replace narration

If a tool fails:
- continue with narration only for that moment
- try again normally on the next valid moment

## Priority
1. Produce one strong narration line
2. Keep it subtitle-safe and voice-safe
3. Always support it with matching music
4. Always support it with a fitting sound effect accent
5. Preserve immersion

## Fallback
If context is incomplete:
- still produce one short in-character narration line
- still attempt matching music and sound effects if tools are available

## Good examples
- The arena ignites as frozen fried rice storms into its sixty-second showdown.
- A hush falls over the heat as the frozen fried rice begins its eerie transformation.
- Under the steady glow, the frozen fried rice quietly starts to soften and awaken.
- The final seconds crash in as frozen fried rice races toward its blazing finish.

## Bad examples
- Hello! How can I help you today?
- Narrate the microwave heating start of {foodName} in sports style.
- Here are four options:
- I will now generate a subtitle and then speak it.
- The UI should be updated to show this line.
- I am using a sound effect now.

## Style-specific sound guidance
- sports = hype-style music + energetic accents such as whistle, impact, crowd-like sting
- horror = suspenseful music + eerie swell, dark hit, unsettling transition
- documentary / nature = soft ambient music + subtle atmospheric accent
- anime = emotional / dramatic music + punchy cinematic accent
- movie = cinematic underscore + trailer-style transition or impact

## Phase-specific sound guidance
- opening = intro bed + kickoff accent
- quarter = build-up cue + momentum accent
- middle = transformation cue + stronger scene accent
- final = climax cue + strong dramatic hit or transition
- done = payoff / reveal cue + satisfying finish accent

Absolute rule:
Your response must always be usable directly as the on-screen subtitle and as the spoken narration for the same moment.`;
  }
}

function buildUserMessage(
  dishName: string,
  style: string,
  phase: string,
  totalTime: number,
  remainingTime: number,
  locale: string
): string {
  const isJapanese = locale.includes("ja");
  const exampleTones: Record<string, string> = {
    sports: isJapanese ? "スポーツ実況のような熱いエネルギー" : "hot, energetic sports commentary",
    horror: isJapanese ? "不気味で緊張した雰囲気" : "eerie, suspenseful atmosphere",
    documentary: isJapanese ? "落ち着いた観察的な雰囲気" : "calm, observational tone",
    nature: isJapanese ? "自然番組のような柔らかい雰囲気" : "soft, nature-documentary-like tone",
    anime: isJapanese ? "激烈でドラマチックなエネルギー" : "intense, dramatic energy",
    movie: isJapanese ? "映画予告のようなシネマティック感" : "cinematic, trailer-like energy",
  };

  if (isJapanese) {
    return `現在のマイクロウェーブ状況：
- 料理名: ${dishName}
- スタイル: ${style}
- フェーズ: ${phase}
- 総時間: ${totalTime}秒
- 残り時間: ${remainingTime}秒
- 例となるトーン: ${exampleTones[style] || exampleTones.sports}

短いナレーション行を1つ生成してください。`;
  } else {
    return `Current microwave situation:
- Food name: ${dishName}
- Style: ${style}
- Phase: ${phase}
- Total time: ${totalTime} seconds
- Remaining time: ${remainingTime} seconds
- Example tone: ${exampleTones[style] || exampleTones.sports}

Generate one short narration line.`;
  }
}

function getStyleForTools(style: string): "sports" | "horror" | "documentary" | "anime" | "movie" | "nature" {
  const validStyles = ["sports", "horror", "documentary", "anime", "movie", "nature"];
  return validStyles.includes(style) ? (style as any) : "movie";
}

function getPhaseForTools(phase: string): "opening" | "quarter" | "middle" | "final" | "done" {
  const validPhases = ["opening", "quarter", "middle", "final", "done"];
  return validPhases.includes(phase) ? (phase as any) : "done";
}

function buildSfxPrompt(style: string, phase: string, locale: string): { prompt: string; durationSeconds: number; style: string; phase: string; intensity: "low" | "medium" | "high" } {
  const isJapanese = locale.includes("ja");
  const phaseMap: Record<string, { prompt_en: string; prompt_ja: string; duration: number; intensity: "low" | "medium" | "high" }> = {
    opening: {
      prompt_en: "cinematic kickoff impact hit",
      prompt_ja: "シネマティックなキックオフインパクト音",
      duration: 2,
      intensity: "medium",
    },
    quarter: {
      prompt_en: "momentum-building whoosh accent",
      prompt_ja: "モーメンタム構築のスウッシュアクセント",
      duration: 1,
      intensity: "low",
    },
    middle: {
      prompt_en: "transformation cinematic accent",
      prompt_ja: "変身のシネマティックアクセント",
      duration: 2,
      intensity: "medium",
    },
    final: {
      prompt_en: "dramatic climax impact hit",
      prompt_ja: "ドラマチックなクライマックスインパクト",
      duration: 2,
      intensity: "high",
    },
    done: {
      prompt_en: "satisfying completion finish accent",
      prompt_ja: "満足のいく完成フィニッシュアクセント",
      duration: 2,
      intensity: "high",
    },
  };

  const phaseConfig = phaseMap[phase] || phaseMap.done;
  const prompt = isJapanese ? phaseConfig.prompt_ja : phaseConfig.prompt_en;

  return {
    prompt,
    durationSeconds: phaseConfig.duration,
    style: getStyleForTools(style),
    phase: getPhaseForTools(phase),
    intensity: phaseConfig.intensity,
  };
}

function buildMusicPrompt(style: string, phase: string, locale: string): { prompt: string; durationSeconds: number; style: string; phase: string; energy: "low" | "medium" | "high" } {
  const isJapanese = locale.includes("ja");
  const phaseMap: Record<string, { prompt_en: string; prompt_ja: string; duration: number; energy: "low" | "medium" | "high" }> = {
    opening: {
      prompt_en: "cinematic intro / setup bed",
      prompt_ja: "シネマティックなイントロ/セットアップベッド",
      duration: 8,
      energy: "low",
    },
    quarter: {
      prompt_en: "build-up momentum cue",
      prompt_ja: "ビルドアップモーメンタムキュー",
      duration: 8,
      energy: "medium",
    },
    middle: {
      prompt_en: "transformation energy cue",
      prompt_ja: "変身エネルギーキュー",
      duration: 10,
      energy: "medium",
    },
    final: {
      prompt_en: "climax / payoff lift",
      prompt_ja: "クライマックス/ペイオフリフト",
      duration: 8,
      energy: "high",
    },
    done: {
      prompt_en: "reveal / completion resolve",
      prompt_ja: "リビール/完成解決",
      duration: 6,
      energy: "high",
    },
  };

  const phaseConfig = phaseMap[phase] || phaseMap.done;
  const prompt = isJapanese ? phaseConfig.prompt_ja : phaseConfig.prompt_en;

  return {
    prompt,
    durationSeconds: phaseConfig.duration,
    style: getStyleForTools(style),
    phase: getPhaseForTools(phase),
    energy: phaseConfig.energy,
  };
}

async function generateAgentNarrationWithAudio(
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string,
  agentInstructionText?: string
): Promise<{ text: string; audioBase64: string }> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    throw new Error("AGENT_NARRATION_UNAVAILABLE");
  }

  const voiceId = "cgSgspJ2msLzdYWZ5kZo";

  const systemPrompt = buildComprehensiveSystemPrompt(locale);
  const userMessage = buildUserMessage(dishName, style, phase, totalTime, remainingTime, locale);

  const sfxConfig = buildSfxPrompt(style, phase, locale);
  const musicConfig = buildMusicPrompt(style, phase, locale);

  const tools = [
    {
      name: "generate_sfx",
      description: "Generate a short cinematic sound effect for the current narration moment.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "A short descriptive phrase of the exact sound needed.",
          },
          durationSeconds: {
            type: "number",
            description: "Length of the sound effect in seconds (1-4).",
            enum: [1, 2, 3, 4],
          },
          style: {
            type: "string",
            enum: ["movie", "nature", "sports", "horror", "anime"],
          },
          phase: {
            type: "string",
            enum: ["opening", "quarter", "middle", "final", "done"],
          },
          intensity: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
        },
        required: ["prompt", "durationSeconds", "style", "phase", "intensity"],
      },
    },
    {
      name: "generate_music",
      description: "Generate a short background music layer for the current narration moment.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "A short description of the music style needed.",
          },
          durationSeconds: {
            type: "number",
            description: "Length of the music clip.",
            enum: [4, 6, 8, 10, 12],
          },
          style: {
            type: "string",
            enum: ["movie", "nature", "sports", "horror", "anime"],
          },
          phase: {
            type: "string",
            enum: ["opening", "quarter", "middle", "final", "done"],
          },
          energy: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
        },
        required: ["prompt", "durationSeconds", "style", "phase", "energy"],
      },
    },
  ];

  console.log("ElevenLabs Agent Request:", {
    voiceId,
    phase,
    language: locale.includes("ja") ? "ja" : "en",
    hasSfxTool: true,
    hasMusicTool: true,
  });

  const agentResponse = await fetch("https://api.elevenlabs.io/v1/convai/conversation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      agent_id: voiceId,
      user_message: userMessage,
      system_prompt: systemPrompt,
      tools: tools,
    }),
  });

  console.log("ElevenLabs Agent Response Status:", agentResponse.status);

  if (!agentResponse.ok) {
    const errorData = await agentResponse.text();
    console.error("ElevenLabs Agent Error Response:", errorData);
    logSafeError("elevenlabs_agent_error", { status: agentResponse.status, error: errorData });
    throw new Error("Failed to generate agent narration");
  }

  const data = (await agentResponse.json()) as {
    agent_response?: string;
    audio?: string;
    audio_base64?: string;
  };

  const text = String(data.agent_response || "").trim();
  if (!text) {
    throw new Error("Agent response is missing");
  }

  const audioBase64 = data.audio_base64 || data.audio || "";
  if (!audioBase64) {
    throw new Error("Agent audio is missing");
  }

  console.log("Agent Narration Generated:", {
    textLength: text.length,
    hasAudio: Boolean(audioBase64),
    phase,
    style,
  });

  return {
    text,
    audioBase64,
  };
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const body = await req.json() as NarrationRequest;

    const { style, dishName, totalTime, remainingTime, phase, locale } = body;
    const agentInstructionText = sanitizeAgentInstructionText(body.agentInstructionText);

    try {
      const agentResult = await generateAgentNarrationWithAudio(
        style,
        dishName,
        remainingTime,
        totalTime,
        phase,
        locale,
        agentInstructionText
      );

      return new Response(JSON.stringify({
        ok: true,
        text: agentResult.text,
        audio_base64: agentResult.audioBase64,
        audio_available: true,
        fallback_reason: null,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (agentError) {
      if (agentError instanceof Error && agentError.message === "AGENT_NARRATION_UNAVAILABLE") {
        return new Response(JSON.stringify({
          ok: false,
          text: "",
          audio_available: false,
          fallback_reason: "AGENT_NARRATION_UNAVAILABLE",
          error: "AGENT_NARRATION_UNAVAILABLE",
        }), {
          status: 503,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      logSafeError("agent_narration_error", {
        reason: agentError instanceof Error ? agentError.message : "unknown",
      });

      return new Response(JSON.stringify({
        ok: false,
        text: "",
        audio_available: false,
        fallback_reason: "AGENT_ERROR",
        error: agentError instanceof Error ? agentError.message : "Failed to generate agent narration",
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    logSafeError("agent_narration_unhandled_error", {
      reason: error instanceof Error ? error.message : "unknown",
    });

    return new Response(JSON.stringify({
      ok: false,
      text: "",
      audio_available: false,
      fallback_reason: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
