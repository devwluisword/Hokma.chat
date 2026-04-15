import { useCallback } from "react";
import { DEFAULT_GEMINI_API_KEY } from "../config";

interface GeminiMessage {
  role: "user" | "assistant";
  content: string;
}

export function useGemini() {
  const sendMessage = useCallback(
    async (
      messages: GeminiMessage[],
      model: string,
      onChunk: (chunk: string) => void,
      signal?: AbortSignal
    ): Promise<string> => {
      const apiKey = DEFAULT_GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;

      const body = JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${err.slice(0, 120)}`);
      }

      if (!response.body) throw new Error("No response body from Gemini");

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

  return { sendMessage };
}
