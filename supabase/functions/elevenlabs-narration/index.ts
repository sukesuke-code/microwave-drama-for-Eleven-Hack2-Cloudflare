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

function sanitizeAgentInstructionText(input?: string): string {
  if (!input) return "";
  const withoutControlChars = Array.from(input, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");

  return withoutControlChars
    .replace(/[<>{}`$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AGENT_INSTRUCTION_MAX_LENGTH);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, text: "", error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const currentUrl = new URL(req.url);
  const targetUrl = `${currentUrl.origin}/functions/v1/agent-narration`;

  try {
    const requestBody = (await req.json()) as NarrationRequest;
    const promptText = sanitizeAgentInstructionText(requestBody.agentInstructionText);
    const sanitizedBody: NarrationRequest = {
      ...requestBody,
      agentInstructionText: promptText,
    };

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(sanitizedBody),
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        text: "",
        error: error instanceof Error ? error.message : "Failed to proxy to agent-narration",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
