export interface Env {
  AI: any;
  ELEVENLABS_API_KEY?: string;
  GEMINI_API_KEY?: string;
  MICROWAVE_SESSION?: DurableObjectNamespace;
  ELEVENLABS_AGENT_ID?: string;
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
      
      // Compatibility with old session endpoints
      if (request.method === "POST" && (url.pathname === "/api/session/start" || url.pathname.startsWith("/api/session/"))) {
        return new Response(JSON.stringify({ 
          ok: true, 
          sessionId: `session-${Date.now()}`,
          aiEnhancedInstruction: "Get ready for a culinary explosion!" 
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/api/get-signed-url" && env.ELEVENLABS_AGENT_ID) {
        return await handleGetSignedUrl(env);
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
  const { dishName, style, phase, remainingTime, totalTime } = body;

  const prompt = `Create EXACTLY ONE short dramatic live narration line for a microwave cooking show. No greeting, no explanation. Just one sentence.
Dish: ${dishName}
Style: ${style}
Phase: ${phase}
Remaining Time: ${remainingTime}/${totalTime} seconds.`;

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
  const voiceId = "JBFqnCBsd6RMkjVDRZzb";

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

  const newResponse = new Response(res.body, res);
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

async function handleGetSignedUrl(env: Env): Promise<Response> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${env.ELEVENLABS_AGENT_ID}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY || "",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: "Failed to get signed URL" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const data = await res.json() as any;
  return new Response(JSON.stringify({ ok: true, signedUrl: data.signed_url }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
