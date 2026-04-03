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

  const isJapanese = locale.includes("ja");
  const timePercent = Math.round((remainingTime / totalTime) * 100);

  const voiceId = "cgSgspJ2msLzdYWZ5kZo";

  const styleDescriptions: Record<string, string> = {
    sports: isJapanese
      ? "スポーツ実況風のエネルギッシュで熱い解説"
      : "Sports commentary style, energetic and passionate",
    horror: isJapanese
      ? "ホラー風の不気味で暗い雰囲気の解説"
      : "Horror style, eerie and dark atmosphere",
    documentary: isJapanese
      ? "ドキュメンタリー風の落ち着いた知的な解説"
      : "Documentary style, calm and intellectual",
    anime: isJapanese
      ? "アニメ風の熱血でドラマチックな解説"
      : "Anime style, passionate and dramatic",
    movie: isJapanese
      ? "映画予告風の壮大でドラマチックな解説"
      : "Movie trailer style, epic and dramatic",
    nature: isJapanese
      ? "自然番組風の穏やかで神秘的な解説"
      : "Nature documentary style, calm and mysterious",
  };

  const phaseDescriptions: Record<string, string> = {
    opening: isJapanese ? "開始時" : "at the start",
    quarter: isJapanese ? `進行${timePercent}%時点` : `at ${timePercent}% progress`,
    middle: isJapanese ? "中盤" : "at midpoint",
    final: isJapanese ? "最終段階" : "at final stage",
    done: isJapanese ? "完成時" : "at completion",
  };

  const systemPrompt = isJapanese
    ? `あなたはマイクロウェーブ料理番組のナレーターです。${styleDescriptions[style] || styleDescriptions.sports}でナレーションを提供してください。短く、洞察に富み、エネルギッシュなコメントを作成してください。${agentInstructionText ? `ユーザーの指示: ${agentInstructionText}` : ""}`
    : `You are a microwave cooking show narrator. Provide narration in ${styleDescriptions[style] || styleDescriptions.sports}. Create short, insightful, and energetic commentary. Keep responses brief and engaging. ${agentInstructionText ? `User instructions: ${agentInstructionText}` : ""}`;

  let userMessage: string;
  if (isJapanese) {
    userMessage = `「${dishName}」を調理中。${phaseDescriptions[phase] || phaseDescriptions.done}です。短いナレーションを提供してください。`;
  } else {
    userMessage = `Currently cooking "${dishName}". ${phaseDescriptions[phase] || phaseDescriptions.done}. Provide brief narration.`;
  }

  console.log("ElevenLabs Agent Request:", { voiceId, phase, language: isJapanese ? "ja" : "en" });

  const agentResponse = await fetch("https://api.elevenlabs.io/v1/convai/conversation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      agent_id: voiceId,
      user_message: userMessage,
      conversation_history: [
        {
          role: "system",
          message: systemPrompt,
        },
      ],
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

  console.log("Agent Narration Generated:", { textLength: text.length, hasAudio: Boolean(audioBase64) });

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
