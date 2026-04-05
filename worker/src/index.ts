export interface Env {
  AI: {
    run: (model: string, input: { messages: Array<{ role: string; content: string }> }) => Promise<{ response?: string }>;
  };
  ELEVENLABS_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ENGLISH_WORDS_PER_SECOND = 2.4;
const JAPANESE_CHARS_PER_SECOND = 5.2;
const EXTERNAL_FETCH_TIMEOUT_MS = 12000;
const EXTERNAL_FETCH_RETRIES = 2;
const MAX_TEXT_LENGTH = 280;
const MAX_DISH_NAME_LENGTH = 100;
const MAX_STYLE_LENGTH = 24;
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function normalizeNarrationText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/"/g, "").replace(/\s+/g, " ").trim();
}

function sanitizeInput(value: string, maxLength: number): string {
  let normalized = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isControl = code < 32 || code === 127;
    normalized += isControl ? " " : char;
  }
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength);
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= EXTERNAL_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal ?? controller.signal,
      });

      if (response.ok) return response;

      if ((response.status === 429 || response.status >= 500) && attempt < EXTERNAL_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < EXTERNAL_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        continue;
      }
      break;
    } finally {
      clearTimeout(timerId);
    }
  }

  throw lastError ?? new Error("EXTERNAL_FETCH_FAILED");
}

function estimateNarrationDurationSeconds(text: string, isEnglish: boolean): number {
  if (!text) return 0;
  if (isEnglish) {
    const words = text.split(/\s+/).filter(Boolean).length;
    return words / ENGLISH_WORDS_PER_SECOND;
  }
  return text.replace(/\s+/g, "").length / JAPANESE_CHARS_PER_SECOND;
}

function trimNarrationToDuration(text: string, maxDurationSeconds: number, isEnglish: boolean): string {
  const normalized = normalizeNarrationText(text);
  const maxSeconds = Math.max(1, Math.floor(maxDurationSeconds));
  if (estimateNarrationDurationSeconds(normalized, isEnglish) <= maxSeconds) {
    return normalized;
  }

  if (isEnglish) {
    const words = normalized.split(/\s+/).filter(Boolean);
    const allowedWords = Math.max(3, Math.floor(maxSeconds * ENGLISH_WORDS_PER_SECOND));
    return words.slice(0, allowedWords).join(" ").trim();
  }

  const chars = Array.from(normalized.replace(/\s+/g, ""));
  const allowedChars = Math.max(6, Math.floor(maxSeconds * JAPANESE_CHARS_PER_SECOND));
  return chars.slice(0, allowedChars).join("").trim();
}

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
          headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json" }
        });
      }

      return new Response("Not Found", { status: 404, headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Cache-Control": "no-store" } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(err);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  },
};

async function handleAgentNarration(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    dishName: string;
    style: string;
    phase: string;
    remainingTime: number;
    totalTime: number;
    locale?: string;
    maxDuration?: number;
  };
  const dishName = sanitizeInput(body.dishName || "", MAX_DISH_NAME_LENGTH);
  const style = sanitizeInput(body.style || "", MAX_STYLE_LENGTH);
  const phase = sanitizeInput(body.phase || "opening", 24);
  const locale = body.locale === "en" ? "en" : "ja";
  const remainingTime = Number(body.remainingTime) || 0;
  const totalTime = Number(body.totalTime) || 1;
  const maxDuration = Number(body.maxDuration);

  const safeTotalTime = Math.max(1, Number(totalTime) || 1);
  const safeRemainingTime = Math.max(0, Number(remainingTime) || 0);
  const maxDurationSeconds = Math.max(
    1,
    Math.min(
      safeTotalTime - 1,
      safeRemainingTime - 1,
      Number(maxDuration) || safeRemainingTime - 1
    )
  );
  const isEnglish = locale === 'en';

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
    ? `Create EXACTLY ONE short dramatic live narration line for a microwave cooking show narrated by a ${styleDesc}. No greeting, no explanation. Just one sentence. Do NOT include any Japanese text, translations, or text in any language other than English.

CRITICAL: The narration MUST be short enough to be spoken in ${maxDurationSeconds} seconds or less when read aloud at normal speaking pace (approximately ${Math.floor(maxDurationSeconds * 2.5)} words maximum).

Dish: ${dishName}
Style: ${style}
Phase: ${phase}
Remaining Time: ${remainingTime}/${totalTime} seconds.
Maximum narration duration: ${maxDurationSeconds} seconds.

IMPORTANT: Output ONLY English text. No translations. No alternative languages. Pure English only.
Keep it punchy and concise - the AI voice must finish speaking within ${maxDurationSeconds} seconds!`
    : `マイクロウェーブ調理番組の${styleDesc}による短い劇的なライブナレーション行を1つ作成してください。挨拶なし、説明なし。1文だけです。英語やその他の言語のテキストは含めないでください。翻訳も含めないでください。

重要：ナレーションは通常の話すペース（約${Math.floor(maxDurationSeconds * 2.5)}語の最大値）で朗読する場合、${maxDurationSeconds}秒以内の長さである必要があります。

料理名: ${dishName}
スタイル: ${style}
フェーズ: ${phase}
残り時間: ${remainingTime}/${totalTime}秒
最大ナレーション時間: ${maxDurationSeconds}秒

重要：日本語のテキストのみを出力してください。翻訳なし。代替言語なし。純粋に日本語のみです。
簡潔にしてください - AI音声は${maxDurationSeconds}秒以内に話し終わる必要があります！`;

  let narrationText = "";

  if (env.GEMINI_API_KEY) {
    try {
      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.8 },
        }),
      }, EXTERNAL_FETCH_TIMEOUT_MS);
      if (res.ok) {
        const json = await res.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        narrationText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (e) {
      console.error("Gemini errored", e);
    }
  }

  // Fallback to Cloudflare AI if Gemini fails or is not available
  if (!narrationText && env.AI) {
    try {
      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "user", content: prompt }]
      });
      narrationText = aiResponse.response || "";
    } catch (e) {
      console.error("Workers AI errored", e);
    }
  }

  if (!narrationText) {
    narrationText = isEnglish
      ? `Intense cooking action happening! ${dishName} is approaching perfection with just ${remainingTime} seconds left!`
      : `おおっと！${dishName}の調理が白熱しているぞ！残り${remainingTime}秒だー！`;
  }

  narrationText = normalizeNarrationText(narrationText);

  // Remove any parenthetical translations or dual language content
  if (isEnglish) {
    // Remove Japanese text in parentheses or brackets
    narrationText = narrationText.replace(/[(（][^)）]*[）)]/g, " ");
    narrationText = narrationText.replace(/[[［][^\]］]*[\]］]/g, " ");
  } else {
    // Remove English text in parentheses or brackets
    narrationText = narrationText.replace(/[(（][^)）]*[）)]/g, " ");
    narrationText = narrationText.replace(/[[［][^\]］]*[\]］]/g, " ");
  }

  narrationText = trimNarrationToDuration(
    sanitizeInput(narrationText, MAX_TEXT_LENGTH),
    maxDurationSeconds,
    isEnglish
  );

  return new Response(JSON.stringify({ ok: true, text: narrationText }), {
    headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handleTts(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body = await request.json() as { text: string; locale?: string };
  const text = sanitizeInput(body.text || "", MAX_TEXT_LENGTH);
  const locale = body.locale === "en" ? "en" : "ja";
  if (!text) {
    return new Response(JSON.stringify({ ok: false, error: "text is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const voiceId = locale === 'en' ? '5pPXnKrQTMV5dNWwILnl' : 'JBFqnCBsd6RMkjVDRZzb';

  const res = await fetchWithRetry(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
  }, EXTERNAL_FETCH_TIMEOUT_MS + 6000);

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
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => {
    newResponse.headers.set(k, v);
  });
  return newResponse;
}

async function handleGenerateSfx(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body = await request.json() as { prompt: string };
  const prompt = sanitizeInput(body.prompt || "", MAX_TEXT_LENGTH);
  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "prompt is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const res = await fetchWithRetry("https://api.elevenlabs.io/v1/sound-generation", {
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
  }, EXTERNAL_FETCH_TIMEOUT_MS + 6000);

  if (!res.ok) {
    throw new Error(`ElevenLabs SFX HTTP Error: ${res.status}`);
  }

  const newResponse = new Response(res.body, res);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  return newResponse;
}

async function handleGenerateMusic(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "ELEVENLABS_API_KEY is not set" }), { status: 500, headers: CORS_HEADERS });
  }

  const apiKey = env.ELEVENLABS_API_KEY.trim();
  const body = await request.json() as { prompt: string };
  const prompt = sanitizeInput(body.prompt || "", MAX_TEXT_LENGTH);
  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "prompt is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const res = await fetchWithRetry("https://api.elevenlabs.io/v1/sound-generation", {
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
  }, EXTERNAL_FETCH_TIMEOUT_MS + 6000);

  if (!res.ok) {
    throw new Error(`ElevenLabs Music HTTP Error: ${res.status}`);
  }

  const newResponse = new Response(res.body, res);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));
  return newResponse;
}
