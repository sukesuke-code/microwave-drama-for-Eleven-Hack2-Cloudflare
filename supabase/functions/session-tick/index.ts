import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SessionTickRequest {
  sessionId: string;
  remainingTime: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SessionTickRequest = await req.json();

    if (!body.sessionId || body.remainingTime === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sessionId, remainingTime" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isCompleted = body.remainingTime <= 0;

    const { error } = await supabase
      .from("sessions")
      .update({
        remaining_time: body.remainingTime,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.sessionId);

    if (error) {
      console.error("[session-tick] Database error:", error);
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[session-tick] Error:", errorMessage);

    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
