const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignedUrlResponse {
  signedUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // For now, return a placeholder signed URL
    // In production, this would generate a real signed URL for ElevenLabs WebSocket connection
    const signedUrl = "wss://elevenlabs-proxy.example.com/websocket";

    const response: SignedUrlResponse = {
      signedUrl,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[elevenlabs-signed-url] Error:", errorMessage);

    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
