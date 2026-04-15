import { useCallback } from "react";
import { DEFAULT_OPENCLAW_URL } from "../config";

interface OpenClawMessage {
  role: "user" | "assistant";
  content: string;
}

export function useOpenClaw() {
  const sendMessage = useCallback(
    async (
      messages: OpenClawMessage[],
      model: string,
      onChunk: (chunk: string) => void,
      signal?: AbortSignal,
      skill?: string
    ): Promise<string> => {
      const url = `${DEFAULT_OPENCLAW_URL.replace(/\/$/, "")}/v1/chat/completions`;

      const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      };

      if (skill) body.skill = skill;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenClaw error: ${response.status} - ${err.slice(0, 120)}`);
      }

      if (!response.body) throw new Error("No response body from OpenClaw");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || "";
            accumulated += delta;
            if (delta) onChunk(delta);
          } catch {}
        }
      }

      return accumulated;
    },
    []
  );

  const checkHealth = useCallback(async (baseUrl?: string): Promise<boolean> => {
    try {
      const url = `${(baseUrl || DEFAULT_OPENCLAW_URL).replace(/\/$/, "")}/health`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { sendMessage, checkHealth };
}
