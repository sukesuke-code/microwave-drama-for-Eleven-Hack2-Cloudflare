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
}

interface NarrationResponse {
  ok: boolean;
  text: string;
  audio_base64?: string;
  error?: string;
}

const STYLE_PROMPTS: Record<string, { system: string; personality: string }> = {
  sports: {
    system: "You are an enthusiastic sports commentator providing live play-by-play narration for a microwave cooking timer.",
    personality: "energetic, excited, using sports terminology and dramatic pacing",
  },
  movie: {
    system: "You are a cinematic movie trailer narrator creating epic, dramatic narration for a microwave cooking timer.",
    personality: "deep, dramatic, using suspenseful language and building tension",
  },
  horror: {
    system: "You are a horror narrator creating ominous, unsettling narration for a microwave cooking timer.",
    personality: "dark, mysterious, foreboding, with subtle menace",
  },
  nature: {
    system: "You are a nature documentary narrator in the style of BBC's Planet Earth, providing calm, educational narration for a microwave cooking timer.",
    personality: "calm, soothing, observational, with reverence for the process",
  },
  documentary: {
    system: "You are a documentary narrator providing factual, informative narration for a microwave cooking timer.",
    personality: "clear, authoritative, educational, thoughtful",
  },
  anime: {
    system: "You are an anime narrator creating passionate, motivational narration for a microwave cooking timer.",
    personality: "passionate, inspiring, dramatic, with emotional intensity",
  },
};

function buildAgentPrompt(
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string
): { system: string; user: string } {
  const isJapanese = locale.includes("ja");
  const styleConfig = STYLE_PROMPTS[style] || STYLE_PROMPTS.sports;
  const timePercent = totalTime > 0 ? Math.round((remainingTime / totalTime) * 100) : 0;

  const languageInstruction = isJapanese
    ? "Respond ONLY in Japanese. Use natural, conversational Japanese appropriate for the style."
    : "Respond ONLY in English. Use natural, conversational English appropriate for the style.";

  const phaseContext = {
    opening: isJapanese
      ? `調理が始まったばかりです（残り${timePercent}%）`
      : `Cooking has just begun (${timePercent}% remaining)`,
    quarter: isJapanese
      ? `調理の序盤です（残り${timePercent}%）`
      : `Early stage of cooking (${timePercent}% remaining)`,
    middle: isJapanese
      ? `調理の中盤に達しました（残り${timePercent}%）`
      : `Midway through cooking (${timePercent}% remaining)`,
    final: isJapanese
      ? `もうすぐ完成です！（残り${timePercent}%）`
      : `Almost done! (${timePercent}% remaining)`,
    done: isJapanese
      ? "調理が完了しました！"
      : "Cooking is complete!",
  };

  const system = `${styleConfig.system}

Your narration style should be: ${styleConfig.personality}

${languageInstruction}

CRITICAL RULES:
1. Generate ONLY 1-2 short sentences (maximum 30 words total)
2. Make it engaging and match the ${style} style perfectly
3. Reference the dish name: "${dishName}"
4. Be creative and varied - avoid repetitive phrases
5. Match the phase energy: ${phase}
6. DO NOT use markdown, asterisks, or formatting
7. Output plain text only`;

  const user = `Create a ${style} narration for ${dishName}.

Phase: ${phaseContext[phase as keyof typeof phaseContext] || phaseContext.opening}
Remaining time: ${remainingTime} seconds out of ${totalTime} seconds total

Generate a creative, ${isJapanese ? "Japanese" : "English"} narration that captures this moment in the cooking process.`;

  return { system, user };
}

async function generateTextWithAgent(
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string
): Promise<string> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    throw new Error("AGENT_NARRATION_UNAVAILABLE");
  }

  const { system, user } = buildAgentPrompt(
    style,
    dishName,
    remainingTime,
    totalTime,
    phase,
    locale
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      temperature: 0.9,
      system,
      messages: [
        {
          role: "user",
          content: user,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Anthropic API error:", response.status, errorData);
    throw new Error("Failed to generate narration with Agent");
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  return text.trim();
}

async function generateSpeechFromElevenLabs(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<string> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured");
  }

  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(elevenLabsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("ElevenLabs API error:", response.status, errorData);
    throw new Error("Failed to generate speech");
  }

  const audioBuffer = await response.arrayBuffer();
  const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

  return audioBase64;
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

    let narrationText: string;

    try {
      narrationText = await generateTextWithAgent(
        style,
        dishName,
        remainingTime,
        totalTime,
        phase,
        locale
      );
    } catch (agentError) {
      if (agentError instanceof Error && agentError.message === "AGENT_NARRATION_UNAVAILABLE") {
        throw agentError;
      }
      console.error("Agent text generation failed:", agentError);
      throw new Error("Failed to generate narration text");
    }

    try {
      const audioBase64 = await generateSpeechFromElevenLabs(narrationText);

      return new Response(JSON.stringify({
        ok: true,
        text: narrationText,
        audio_base64: audioBase64,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (_audioError) {
      return new Response(JSON.stringify({
        ok: true,
        text: narrationText,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Error in agent-narration function:", error);

    if (error instanceof Error && error.message === "AGENT_NARRATION_UNAVAILABLE") {
      return new Response(JSON.stringify({
        ok: false,
        text: "",
        error: "AGENT_NARRATION_UNAVAILABLE",
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({
      ok: false,
      text: "",
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
