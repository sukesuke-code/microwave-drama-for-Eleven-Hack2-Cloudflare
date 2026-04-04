export interface Env {
  AI: any;
  MICROWAVE_SESSION: DurableObjectNamespace;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_AGENT_ID: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export { MicrowaveSession } from "./MicrowaveSession";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === "/api/get-signed-url" && request.method === "GET") {
        return await handleGetSignedUrl(env);
      }

      if (url.pathname === "/api/session/start" && request.method === "POST") {
        return await handleStartSession(request, env);
      }

      if (url.pathname.startsWith("/api/session/ws/")) {
        return await handleSessionWebSocket(request, env);
      }

      return new Response(JSON.stringify({ error: "Not Found", path: url.pathname }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        message: err.message,
        stack: err.stack 
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  },
};

async function handleGetSignedUrl(env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) {
    return new Response(JSON.stringify({ error: "Missing ElevenLabs credentials on server." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${env.ELEVENLABS_AGENT_ID}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("ElevenLabs API error:", text);
    return new Response(JSON.stringify({ error: "Failed to get signed URL from ElevenLabs" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const data = await res.json() as any;
  // Make sure it returns { signedUrl: 'wss://...' } based on the frontend logic
  return new Response(JSON.stringify({ ok: true, signedUrl: data.signed_url }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function handleStartSession(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as any;
  const { dishName, style, durationSeconds } = body;

  // Enhance the narration instruction using Workers AI!
  let aiEnhancedInstruction = "";
  if (env.AI) {
    try {
      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "You are an assistant that creates very short (1 sentence) dramatic acting instructions for sports/movie commentators. Reply ONLY with the instruction." },
          { role: "user", content: `I am microwaving ${dishName} for ${durationSeconds} seconds in a ${style} style. Give me a 1 sentence acting direction for the narrator.` }
        ]
      }) as any;
      aiEnhancedInstruction = aiResponse.response || "";
    } catch (e) {
      console.error("Workers AI failed:", e);
    }
  }

  // Create or get a Durable Object for this session
  // For simplicity and multiplayer demo, we can just create a random ID
  const sessionId = crypto.randomUUID();
  const id = env.MICROWAVE_SESSION.idFromName(sessionId);
  const stub = env.MICROWAVE_SESSION.get(id);

  // Initialize the DO with the details
  await stub.fetch(new Request("http://do/init", {
    method: "POST",
    body: JSON.stringify({ dishName, style, durationSeconds, aiEnhancedInstruction })
  }));

  return new Response(JSON.stringify({ sessionId, aiEnhancedInstruction }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function handleSessionWebSocket(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.pathname.split("/").pop();
  if (!sessionId) {
    return new Response("Missing Session ID", { status: 400 });
  }

  // Upgrade header check
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  // Forward to Durable Object
  const id = env.MICROWAVE_SESSION.idFromName(sessionId);
  const stub = env.MICROWAVE_SESSION.get(id);

  return stub.fetch(request);
}
