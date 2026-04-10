import { useState } from "react";

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ position: "relative", margin: "10px 0 6px", borderRadius: 10, overflow: "hidden" }}>
      {lang && (
        <div style={{
          background: "#1e1e2e", color: "#6C7086",
          fontSize: 10.5, fontWeight: 600, padding: "5px 14px",
          textTransform: "uppercase", letterSpacing: "0.8px",
          fontFamily: "monospace", borderBottom: "1px solid #313244"
        }}>
          {lang}
        </div>
      )}
      <pre style={{
        background: "#1e1e2e", color: "#CDD6F4",
        padding: "14px 48px 14px 16px", fontSize: 12.5, lineHeight: 1.65,
        overflowX: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        margin: 0, whiteSpace: "pre",
      }}>
        <code>{code}</code>
      </pre>
      <button onClick={copy} style={{
        position: "absolute", top: lang ? 34 : 8, right: 8,
        background: copied ? "#A6E3A1" : "rgba(255,255,255,0.1)",
        color: copied ? "#1e1e2e" : "#CDD6F4",
        border: "none", borderRadius: 6,
        padding: "4px 10px", fontSize: 11, cursor: "pointer",
        fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit"
      }}>
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
