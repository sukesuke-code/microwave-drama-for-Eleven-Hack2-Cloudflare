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

const generateNarrationText = (
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string
): string => {
  const isJapanese = locale.includes("ja");
  const timePercent = (remainingTime / totalTime) * 100;

  const styleContexts: Record<string, Record<string, string>> = {
    sports: {
      opening: isJapanese
        ? `${dishName}の調理がスタート！タイムを切って、ゴーゴーゴー！`
        : `Starting ${dishName}! Time is ticking! Let's go go go!`,
      quarter: isJapanese
        ? `${Math.round(timePercent)}%まで進みました！ペースを保ちましょう！`
        : `We're at ${Math.round(timePercent)}%! Keep up the pace!`,
      middle: isJapanese
        ? `中盤です！${dishName}、順調に進んでいますね！`
        : `Halfway there! ${dishName} is cooking great!`,
      final: isJapanese
        ? `ラストスパート！あと少しで完成です！`
        : `Final stretch! Almost done! Push harder!`,
      done: isJapanese
        ? `完成！${dishName}の調理が終わりました！`
        : `Done! ${dishName} is ready to serve!`,
    },
    horror: {
      opening: isJapanese
        ? `${dishName}の調理が始まる...この瞬間を逃すな...`
        : `${dishName} cooking begins... do not miss this moment...`,
      quarter: isJapanese
        ? `${Math.round(timePercent)}%...時間は無情に進む...`
        : `${Math.round(timePercent)}%... time moves mercilessly...`,
      middle: isJapanese
        ? `中盤...何か危険な予感が...`
        : `Midway... something ominous approaches...`,
      final: isJapanese
        ? `終焉へ向かって...もう戻ることはできない...`
        : `Approaching the end... no turning back now...`,
      done: isJapanese
        ? `${dishName}...完成だ...全てが終わった...`
        : `${dishName}... it is done... everything is over...`,
    },
    documentary: {
      opening: isJapanese
        ? `${dishName}の調理プロセスについて、詳しく見ていきましょう。`
        : `Let us examine the cooking process of ${dishName} in detail.`,
      quarter: isJapanese
        ? `現在、調理は${Math.round(timePercent)}%の進行状況です。`
        : `Currently, the cooking process is at ${Math.round(timePercent)}% completion.`,
      middle: isJapanese
        ? `中盤に達しました。${dishName}の変化を観察してください。`
        : `We have reached the midpoint. Observe the transformation of ${dishName}.`,
      final: isJapanese
        ? `最終段階です。完成まで、もう少しの時間が必要です。`
        : `We are in the final stage. Just a little more time until completion.`,
      done: isJapanese
        ? `${dishName}の調理は完了しました。`
        : `The cooking of ${dishName} has been completed.`,
    },
    anime: {
      opening: isJapanese
        ? `${dishName}の調理...それは始まりの物語！`
        : `${dishName} cooking... and so the story begins!`,
      quarter: isJapanese
        ? `${Math.round(timePercent)}%！諦めずに進もう！`
        : `${Math.round(timePercent)}%! Do not give up!`,
      middle: isJapanese
        ? `ここが勝負どころだ！${dishName}よ、輝け！`
        : `This is the critical moment! Shine, ${dishName}!`,
      final: isJapanese
        ? `最後の力を振り絞って...完成へ！`
        : `Give it your all... towards completion!`,
      done: isJapanese
        ? `${dishName}...完成した！この輝きを見よ！`
        : `${dishName}... is complete! Behold this brilliance!`,
    },
  };

  const context = styleContexts[style] || styleContexts.sports;
  return context[phase as keyof typeof context] || context.done;
};

async function generateAgentResponse(
  style: string,
  dishName: string,
  remainingTime: number,
  totalTime: number,
  phase: string,
  locale: string,
  sessionId?: string
): Promise<{ text: string; audio_base64: string }> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured");
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
    console.error("ElevenLabs Agent start error:", startResponse.status, errorData);
    throw new Error("Failed to start agent conversation");
  }

  const startData = await startResponse.json();
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
        const data = JSON.parse(jsonStr);

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
    audio_base64: audioBase64,
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

    const { sessionId, style, dishName, totalTime, remainingTime, phase, locale } = body;

    try {
      const agentResult = await generateAgentResponse(
        style,
        dishName,
        remainingTime,
        totalTime,
        phase,
        locale,
        sessionId
      );

      return new Response(JSON.stringify({
        ok: true,
        text: agentResult.text,
        audio_base64: agentResult.audio_base64,
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (agentError) {
      console.error("Agent generation failed, falling back to template:", agentError);

      const narrationText = generateNarrationText(
        style,
        dishName,
        remainingTime,
        totalTime,
        phase,
        locale
      );

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
    console.error("Error in elevenlabs-narration function:", error);
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
