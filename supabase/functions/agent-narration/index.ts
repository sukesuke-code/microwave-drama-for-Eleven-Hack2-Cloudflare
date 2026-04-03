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

  const voiceIds: Record<string, string> = {
    sports: "cgSgspJ2msLzdYWZ5kZo",
    horror: "cgSgspJ2msLzdYWZ5kZo",
    documentary: "cgSgspJ2msLzdYWZ5kZo",
    anime: "cgSgspJ2msLzdYWZ5kZo",
    movie: "cgSgspJ2msLzdYWZ5kZo",
    nature: "cgSgspJ2msLzdYWZ5kZo",
  };

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

  let narrationText: string;
  if (isJapanese) {
    narrationText = `「${dishName}」の調理を${styleDescriptions[style] || styleDescriptions.sports}で実況します。現在は${phaseDescriptions[phase] || phaseDescriptions.done}です。`;
  } else {
    narrationText = `Narrating the cooking of "${dishName}" in ${styleDescriptions[style] || styleDescriptions.sports}. Currently ${phaseDescriptions[phase] || phaseDescriptions.done}.`;
  }

  const voiceId = voiceIds[style] || "cgSgspJ2msLzdYWZ5kZo";

  console.log("ElevenLabs TTS Request:", { voiceId, textLength: narrationText.length, language: isJapanese ? "ja" : "en" });

  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: narrationText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  console.log("ElevenLabs Response Status:", ttsResponse.status);

  if (!ttsResponse.ok) {
    const errorData = await ttsResponse.text();
    console.error("ElevenLabs Error Response:", errorData);
    logSafeError("elevenlabs_tts_error", { status: ttsResponse.status, error: errorData });
    throw new Error("Failed to generate narration audio");
  }

  const audioBuffer = await ttsResponse.arrayBuffer();
  console.log("Audio Buffer Size:", audioBuffer.byteLength);

  const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

  return {
    text: narrationText,
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
