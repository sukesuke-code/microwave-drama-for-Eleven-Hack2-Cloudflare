export interface Env {
  AI: any;
  ELEVENLABS_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/api/agent/narration") {
        return await handleAgentNarration(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/tts") {
        return await handleTts(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/generate-sfx") {
        return await handleGenerateSfx(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/generate-music") {
        return await handleGenerateMusic(request, env);
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/session/")) {
        // Mock session endpoints for compatibility
        return new Response(JSON.stringify({ ok: true, session: { sessionId: `session-${Date.now()}` } }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  },
};

async function handleAgentNarration(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const { dishName, style, phase, remainingTime, totalTime, locale } = body;

  const maxDurationSeconds = totalTime - 1;
  const isEnglish = locale === 'en';

  const languageNote = isEnglish
    ? "Generate the narration ONLY in English."
    : "Generate the narration ONLY in Japanese.";

  const styleDescriptions: Record<string, { en: string; ja: string }> = {
    sports: { en: 'sports commentator', ja: 'スポーツ実況者' },
    movie: { en: 'movie trailer announcer', ja: '映画予告編アナウンサー' },
    horror: { en: 'horror narrator', ja: 'ホラーナレーター' },
    nature: { en: 'BBC nature documentary narrator', ja: 'BBC自然ドキュメンタリーナレーター' },
    documentary: { en: 'historical documentarian', ja: '歴史ドキュメンタリストの語り口' },
    anime: { en: 'anime narrator with passion', ja: '熱血アニメナレーター' },
  };

  const styleDesc = styleDescriptions[style]?.[isEnglish ? 'en' : 'ja'] || style;

  const prompt = isEnglish
    ? `Create EXACTLY ONE short dramatic live narration line for a microwave cooking show narrated by a ${styleDesc}. No greeting, no explanation. Just one sentence.

CRITICAL: The narration MUST be short enough to be spoken in ${maxDurationSeconds} seconds or less when read aloud at normal speaking pace (approximately ${Math.floor(maxDurationSeconds * 2.5)} words maximum).

Dish: ${dishName}
Style: ${style}
Phase: ${phase}
Remaining Time: ${remainingTime}/${totalTime} seconds.
Maximum narration duration: ${maxDurationSeconds} seconds.

${languageNote}
Keep it punchy and concise - the AI voice must finish speaking within ${maxDurationSeconds} seconds!`
    : `マイクロウェーブ調理番組の${styleDesc}による短い劇的なライブナレーション行を1つ作成してください。挨拶なし、説明なし。1文だけです。

重要：ナレーションは通常の話すペース（約${Math.floor(maxDurationSeconds * 2.5)}語の最大値）で朗読する場合、${maxDurationSeconds}秒以内の長さである必要があります。

料理名: ${dishName}
スタイル: ${style}
フェーズ: ${phase}
残り時間: ${remainingTime}/${totalTime}秒
最大ナレーション時間: ${maxDurationSeconds}秒

${languageNote}
簡潔にしてください - AI音声は${maxDurationSeconds}秒以内に話し終わる必要があります！`;

  let narrationText = "";

  if (env.GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.8 },
        }),
      });
      if (res.ok) {
        const json: any = await res.json();
        narrationText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (e) {
      console.error("Gemini errored", e);
    }
  }

  // Fallback to Cloudflare AI if Gemini fails or is not available
  if (!narrationText && env.AI) {
    try {
      const aiResponse: any = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "user", content: prompt }]
      });
      narrationText = aiResponse.response || "";
    } catch (e) {
      console.error("Workers AI errored", e);
    }
  }

  if (!narrationText) {
    narrationText = `おおっと！${dishName}の調理が白熱しているぞ！残り${remainingTime}秒だー！`;
  }

  narrationText = narrationText.replace(/[\r\n]+/g, " ").replace(/"/g, "").trim();

  return new Response(JSON.stringify({ ok: true, text: narrationText }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function handleTts(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body: any = await request.json();
  const text = body.text;
  const locale = body.locale || 'ja';

  const voiceId = locale === 'en' ? '5pPXnKrQTMV5dNWwILnl' : 'JBFqnCBsd6RMkjVDRZzb';

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "unknown");
    throw new Error(`ElevenLabs TTS HTTP Error: ${res.status} - ${errorBody}`);
  }

  // Forward the audio binary directly to the frontend, along with CORS
  const newResponse = new Response(res.body, res);
  // Important: apply CORS headers to the audio response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => {
    newResponse.headers.set(k, v);
  });
  return newResponse;
}

async function handleGenerateSfx(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body: any = await request.json();
  const prompt = body.prompt;

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: 4,
      prompt_influence: 0.3
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs SFX HTTP Error: ${res.status}`);
  }

  const newResponse = new Response(res.body, res);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  return newResponse;
}

async function handleGenerateMusic(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body: any = await request.json();
  const prompt = body.prompt;

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: prompt + ", cinematic background music loop, no voice",
      duration_seconds: 10,
      prompt_influence: 0.3
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs Music HTTP Error: ${res.status}`);
  }

  const newResponse = new Response(res.body, res);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  return newResponse;
}
