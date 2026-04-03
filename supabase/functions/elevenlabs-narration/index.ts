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

    const narrationText = generateNarrationText(
      style,
      dishName,
      remainingTime,
      totalTime,
      phase,
      locale
    );

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
