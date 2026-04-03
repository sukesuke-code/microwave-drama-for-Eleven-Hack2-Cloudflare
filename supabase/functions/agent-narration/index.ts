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

  const agentId = "BkGJhwzCyPIMVKJPQa0T";
  const isJapanese = locale.includes("ja");
  const timePercent = Math.round((remainingTime / totalTime) * 100);

  const styleDescriptions: Record<string, string> = {
    sports: isJapanese
      ? "スポーツ実況風のエネルギッシュで熱い解説"
      : "Sports commentary style with energetic and passionate narration",
    horror: isJapanese
      ? "ホラー風の不気味で暗い雰囲気の解説"
      : "Horror style with eerie and dark atmosphere",
    documentary: isJapanese
      ? "ドキュメンタリー風の落ち着いた知的な解説"
      : "Documentary style with calm and intellectual narration",
    anime: isJapanese
      ? "アニメ風の熱血でドラマチックな解説"
      : "Anime style with passionate and dramatic narration",
    movie: isJapanese
      ? "映画予告風の壮大でドラマチックな解説"
      : "Movie trailer style with epic and dramatic narration",
    nature: isJapanese
      ? "自然番組風の穏やかで神秘的な解説"
      : "Nature documentary style with calm and mysterious narration",
  };

  const phaseDescriptions: Record<string, string> = {
    opening: isJapanese ? "開始時" : "at the start",
    quarter: isJapanese ? `進行${timePercent}%時点` : `at ${timePercent}% progress`,
    middle: isJapanese ? "中盤" : "at midpoint",
    final: isJapanese ? "最終段階" : "at final stage",
    done: isJapanese ? "完成時" : "at completion",
  };

  const promptText = isJapanese
    ? `「${dishName}」の調理を${styleDescriptions[style] || styleDescriptions.sports}で実況してください。現在は${phaseDescriptions[phase] || phaseDescriptions.done}です。1〜2文で簡潔に。`
    : `Please narrate the cooking of "${dishName}" in ${styleDescriptions[style] || styleDescriptions.sports}. Currently ${phaseDescriptions[phase] || phaseDescriptions.done}. Keep it to 1-2 sentences.`;

  const conversationConfig = {
    agent: {
      prompt: {
        prompt: promptText,
      },
      first_message: "",
      language: isJapanese ? "ja" : "en",
    },
  };

  const agentUrl = `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

  const startResponse = await fetch(agentUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      conversation_config_override: conversationConfig,
    }),
  });

  if (!startResponse.ok) {
    const errorData = await startResponse.text();
    logSafeError("elevenlabs_agent_start_error", { status: startResponse.status, error: errorData });
    throw new Error("Failed to start agent conversation");
  }

  const startData = await startResponse.json() as { conversation_id?: string };
  const conversationId = startData.conversation_id;

  if (!conversationId) {
    throw new Error("No conversation ID returned from agent");
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const audioChunks: Uint8Array[] = [];
  let fullText = "";
  let hasReceivedAudio = false;

  const getAudioUrl = `https://api.elevenlabs.io/v1/convai/conversation/${conversationId}?output_format=mp3_44100_128`;

  const audioResponse = await fetch(getAudioUrl, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!audioResponse.ok) {
    logSafeError("elevenlabs_agent_audio_error", { status: audioResponse.status });
    throw new Error("Failed to get agent audio");
  }

  const reader = audioResponse.body?.getReader();
  if (!reader) {
    throw new Error("No audio stream available");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    hasReceivedAudio = true;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim() || !line.startsWith("data: ")) continue;

      try {
        const jsonStr = line.slice(6);
        const data = JSON.parse(jsonStr) as {
          type?: string;
          audio_event?: { audio_base_64?: string };
          agent_response_event?: { agent_response?: string };
        };

        if (data.type === "audio" && data.audio_event?.audio_base_64) {
          const audioData = Uint8Array.from(
            atob(data.audio_event.audio_base_64),
            c => c.charCodeAt(0)
          );
          audioChunks.push(audioData);
        }

        if (data.type === "agent_response" && data.agent_response_event?.agent_response) {
          fullText = data.agent_response_event.agent_response;
        }
      } catch (e) {
        console.error("Error parsing SSE line:", e);
      }
    }
  }

  if (!hasReceivedAudio || audioChunks.length === 0) {
    throw new Error("No audio received from agent");
  }

  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedAudio = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    combinedAudio.set(chunk, offset);
    offset += chunk.length;
  }

  const audioBase64 = btoa(String.fromCharCode(...combinedAudio));

  return {
    text: fullText || promptText,
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
