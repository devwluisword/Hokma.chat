import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  text: string;
}

export function MessageContent({ text }: MessageContentProps) {
  const parts: { t: "text" | "code"; v: string; lang?: string }[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: "text", v: text.slice(last, m.index) });
    parts.push({ t: "code", v: m[2].trim(), lang: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });

  return (
    <div>
      {parts.map((p, i) =>
        p.t === "code" ? (
          <CodeBlock key={i} code={p.v} lang={p.lang} />
        ) : (
          <span
            key={i}
            style={{ whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{
              __html: p.v
                .replace(/`([^`\n]+)`/g, '<code style="background:rgba(15,98,254,0.08);color:#0F62FE;padding:1px 6px;border-radius:4px;font-size:0.87em;font-family:monospace">$1</code>')
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>"),
            }}
          />
        )
      )}
    </div>
  );
}
