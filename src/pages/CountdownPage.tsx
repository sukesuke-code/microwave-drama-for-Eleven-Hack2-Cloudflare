import { useEffect, useRef, useState } from "react";
import {
  getSignedUrl,
  buildNarrationCue,
  saveNarration,
} from "../lib/client";

type Session = {
  sessionId: string;
  foodName: string;
  style: "sports" | "horror" | "documentary" | "anime";
  phase: "opening" | "quarter" | "middle" | "final" | "done";
  totalTime: number;
  remainingTime: number;
};

type Props = {
  session: Session;
};

function getExampleTone(style: Session["style"]) {
  switch (style) {
    case "sports":
      return "energetic commentator line";
    case "horror":
      return "dark eerie whisper";
    case "anime":
      return "intense anime narration";
    case "documentary":
    default:
      return "calm documentary tone";
  }
}

function getPhaseLabel(phase: Session["phase"]) {
  switch (phase) {
    case "opening":
      return "OPENING";
    case "quarter":
      return "QUARTER";
    case "middle":
      return "MIDDLE";
    case "final":
      return "FINAL";
    case "done":
      return "DONE";
    default:
      return phase;
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function isTemplateLikeResponse(text: string) {
  const normalized = text.trim();
  if (!normalized) return true;

  return (
    normalized.includes("Narrate the microwave heating start of") ||
    normalized.includes("{foodName}") ||
    normalized.includes("{phase}") ||
    normalized.includes("{totalTime}") ||
    normalized.includes("in sports style") ||
    normalized.includes("in horror style") ||
    normalized.includes("movie-trailer style") ||
    normalized.includes("nature-documentary style")
  );
}

export default function CountdownPage({ session }: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectOnceRef = useRef(false);
  const lastCueKeyRef = useRef("");
  const [narration, setNarration] = useState("Waiting for narration...");
  const [status, setStatus] = useState("connecting");

  function applyNarration(text: string) {
    const cleaned = String(text ?? "").trim();
    if (!cleaned) return;

    if (isTemplateLikeResponse(cleaned)) {
      console.log("Skipped template-like narration:", cleaned);
      return;
    }

    setNarration(cleaned);
    void saveNarration(session.sessionId, cleaned).catch((err) => {
      console.error("Failed to save narration", err);
    });
  }

  useEffect(() => {
    if (connectOnceRef.current) return;
    connectOnceRef.current = true;

    let isMounted = true;

    async function connect() {
      try {
        const signedUrl = await getSignedUrl();
        console.log("Got signed URL:", signedUrl);

        const ws = new WebSocket(signedUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("ElevenLabs agent connected");
          if (!isMounted) return;
          setStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Agent message:", data);

            if (data.type === "agent_response") {
              const text = String(
                data?.agent_response_event?.agent_response ??
                  data?.agent_response_event?.text ??
                  ""
              ).trim();

              console.log("Parsed agent response text:", text);
              applyNarration(text);
              return;
            }

            if (data.type === "agent_response_correction") {
              const correctedText = String(
                data?.agent_response_correction_event?.corrected_agent_response ??
                  data?.agent_response_correction_event?.text ??
                  ""
              ).trim();

              console.log("Parsed corrected agent response text:", correctedText);
              applyNarration(correctedText);
              return;
            }

            if (data.type === "ping") {
              const eventId = data?.ping_event?.event_id;
              ws.send(
                JSON.stringify(
                  eventId
                    ? { type: "pong", event_id: eventId }
                    : { type: "pong" }
                )
              );
              console.log("pong sent", eventId ?? "");
              return;
            }
          } catch (err) {
            console.error("message parse error", err);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error", error, {
            readyState: ws.readyState,
            url: signedUrl,
            origin: window.location.origin,
          });
          if (isMounted) {
            setStatus("error");
          }
        };

        ws.onclose = (e) => {
          console.error("WebSocket closed", e);
          if (isMounted) {
            setStatus("disconnected");
          }
        };
      } catch (err) {
        console.error("Connection failed", err);
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void connect();

    return () => {
      isMounted = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [session.sessionId]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.readyState !== WebSocket.OPEN) return;

    const cueKey = `${session.phase}-${session.remainingTime}-${session.style}-${session.foodName}`;
    if (lastCueKeyRef.current === cueKey) return;
    lastCueKeyRef.current = cueKey;

    const message = buildNarrationCue({
      foodName: session.foodName,
      style: session.style,
      phase: session.phase,
      totalTime: session.totalTime,
      remainingTime: session.remainingTime,
      exampleTone: getExampleTone(session.style),
    });

    console.log("Sending phase cue:", message);

    ws.send(
      JSON.stringify({
        type: "user_message",
        message,
      })
    );
  }, [
    session.phase,
    session.remainingTime,
    session.style,
    session.foodName,
    session.totalTime,
  ]);

  const progressPercent =
    session.totalTime > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((session.totalTime - session.remainingTime) / session.totalTime) * 100
          )
        )
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,140,0,0.22), transparent 30%), linear-gradient(180deg, #0b0b12 0%, #141422 100%)",
        color: "white",
        padding: 24,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            MICROWAVE SHOW
          </div>

          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.05,
              margin: 0,
              fontWeight: 800,
            }}
          >
            {session.foodName}
          </h1>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                fontSize: 13,
              }}
            >
              STYLE: {session.style.toUpperCase()}
            </span>

            <span
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                fontSize: 13,
              }}
            >
              PHASE: {getPhaseLabel(session.phase)}
            </span>

            <span
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background:
                  status === "connected"
                    ? "rgba(0,255,120,0.16)"
                    : status === "error"
                    ? "rgba(255,60,60,0.16)"
                    : "rgba(255,255,255,0.08)",
                fontSize: 13,
              }}
            >
              AGENT: {status.toUpperCase()}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: -2,
              marginBottom: 12,
            }}
          >
            {formatTime(session.remainingTime)}
          </div>

          <div
            style={{
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #ff7b00 0%, #ffb347 50%, #ffe082 100%)",
                transition: "width 0.9s linear",
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 24,
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: 2,
              opacity: 0.7,
              marginBottom: 12,
            }}
          >
            LIVE NARRATION
          </div>

          <div
            style={{
              fontSize: 26,
              lineHeight: 1.5,
              fontWeight: 700,
            }}
          >
            {narration}
          </div>
        </div>
      </div>
    </div>
  );
}