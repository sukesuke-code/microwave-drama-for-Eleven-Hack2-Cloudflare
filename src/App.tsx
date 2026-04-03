import { useEffect, useMemo, useRef, useState } from "react";
import CountdownPage from "./pages/CountdownPage";
import { startSession, tickSession } from "./lib/client";

type Session = {
  foodName: string;
  totalTime: number;
  remainingTime: number;
  style: "sports" | "horror" | "documentary" | "anime";
  phase: "opening" | "quarter" | "middle" | "final" | "done";
  isRunning: boolean;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
};

function getPhaseFromRemainingTime(
  remainingTime: number,
  totalTime: number
): "opening" | "quarter" | "middle" | "final" | "done" {
  if (remainingTime <= 0) return "done";

  const ratio = remainingTime / totalTime;

  if (ratio > 0.75) return "opening";
  if (ratio > 0.5) return "quarter";
  if (ratio > 0.25) return "middle";
  return "final";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const lastTickSentRef = useRef<number | null>(null);

  const sessionConfig = useMemo(
    () => ({
      foodName: "冷凍チャーハン",
      totalTime: 60,
      style: "sports" as const,
    }),
    []
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function boot() {
      try {
        setLoading(true);
        setError("");

        const startedSession = await startSession(
          sessionConfig.foodName,
          sessionConfig.totalTime,
          sessionConfig.style
        );

        setSession(startedSession);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void boot();
  }, [sessionConfig]);

  useEffect(() => {
    if (!session?.sessionId) return;
    if (!session.isRunning) return;
    if (session.phase === "done") return;
    if (intervalRef.current !== null) return;

    intervalRef.current = window.setInterval(() => {
      setSession((current) => {
        if (!current) return current;
        if (!current.isRunning) return current;
        if (current.remainingTime <= 0) return current;

        const nextRemainingTime = Math.max(0, current.remainingTime - 1);
        const nextPhase = getPhaseFromRemainingTime(
          nextRemainingTime,
          current.totalTime
        );

        return {
          ...current,
          remainingTime: nextRemainingTime,
          phase: nextPhase,
          isRunning: nextRemainingTime > 0,
          updatedAt: Date.now(),
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.sessionId, session?.isRunning, session?.phase]);

  useEffect(() => {
    if (!session?.sessionId) return;

    const currentRemaining = session.remainingTime;
    if (lastTickSentRef.current === currentRemaining) return;
    lastTickSentRef.current = currentRemaining;

    void tickSession(session.sessionId, currentRemaining).catch((err) => {
      console.error("tickSession failed", err);
    });

    if (currentRemaining <= 0 && intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [session?.sessionId, session?.remainingTime]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        Starting microwave session...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Failed to start session
          </div>
          <div style={{ opacity: 0.8 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return <CountdownPage session={session} />;
}