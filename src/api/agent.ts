import { NarrationStyle, Locale } from '../types';

const API_BASE = "https://microwave-show-api.lolololololol.workers.dev";

export type AgentPhase = 'opening' | 'quarter' | 'middle' | 'final' | 'done';

export interface AgentSituation {
  foodName: string;
  totalTime: number;
  remainingTime: number;
  phase: AgentPhase;
  style: NarrationStyle;
  locale: Locale;
}

export interface AgentNarrationResult {
  text: string;
  audioBlob: Blob;
}

async function parseAgentAudioBlob(res: Response): Promise<{ text: string; audioBlob: Blob }> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as {
      text?: string;
      agentResponse?: string;
      audioBase64?: string;
      audio?: string;
      error?: string;
    };

    const text = json.text ?? json.agentResponse ?? "";
    const base64Audio = json.audioBase64 ?? json.audio ?? "";

    if (!base64Audio) {
      throw new Error(json.error ?? "Audio payload missing from agent response");
    }

    const base64 = base64Audio.includes(",") ? base64Audio.split(",").pop() ?? "" : base64Audio;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: "audio/mpeg" });
    return { text, audioBlob };
  }

  throw new Error("Unexpected content-type from agent narrate endpoint");
}

export async function agentNarrate(situation: AgentSituation): Promise<AgentNarrationResult> {
  const res = await fetch(`${API_BASE}/api/agent-narrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      foodName: situation.foodName || (situation.locale === 'ja' ? '謎の食べ物' : 'mystery dish'),
      totalTime: situation.totalTime,
      remainingTime: situation.remainingTime,
      phase: situation.phase,
      style: situation.style,
      locale: situation.locale,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Agent narrate failed");
  }

  const { text, audioBlob } = await parseAgentAudioBlob(res);
  return { text, audioBlob };
}
