import { useState } from "react";
import { PROVIDERS } from "../config";

interface Props {
  providerId: string;
  modelId: string;
  keys: Record<string, string>;
  onClose: () => void;
  onChange: (cfg: { providerId: string; modelId: string; keys: Record<string, string> }) => void;
}

type StatusKey = "testing" | "ok" | "err" | "nokey";

const STATUS_MAP: Record<StatusKey, { bg: string; color: string; text: string }> = {
  testing: { bg: "#FFF9E6", color: "#D97706", text: "Testando conexao..." },
  ok:      { bg: "#F0FDF4", color: "#16A34A", text: "Conexao OK" },
  err:     { bg: "#FEF2F2", color: "#DC2626", text: "Falha — verifique chave ou modelo" },
  nokey:   { bg: "#FEF2F2", color: "#DC2626", text: "Insira a chave API primeiro" },
};

export function ProviderPanel({ providerId, modelId, keys, onClose, onChange }: Props) {
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({ ...keys });
  const [localModel, setLocalModel] = useState(modelId);
  const [localProvider, setLocalProvider] = useState(providerId);
  const [customModel, setCustomModel] = useState("");
  const [status, setStatus] = useState<StatusKey | null>(null);

  const prov = PROVIDERS.find(p => p.id === localProvider)!;

  const test = async () => {
    setStatus("testing");
    const key = prov.noKey ? "local" : (localKeys[localProvider] || "");
    if (!key && !prov.noKey) { setStatus("nokey"); return; }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!prov.noKey) headers["Authorization"] = `Bearer ${key}`;
      if (localProvider === "openrouter") {
        headers["HTTP-Referer"] = "hokma-ai";
        headers["X-Title"] = "Hokma AI";
      }
      const res = await fetch(prov.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: localModel === "custom" ? customModel : localModel,
          messages: [{ role: "user", content: "OK" }],
          max_tokens: 5,
        }),
      });
      const d = await res.json();
      setStatus(d.choices?.[0]?.message?.content ? "ok" : "err");
    } catch {
      setStatus("err");
    }
  };

  const apply = () => {
    const finalModel = localModel === "custom" ? customModel : localModel;
    onChange({ providerId: localProvider, modelId: finalModel, keys: localKeys });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 200,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 560,
        padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        maxHeight: "90dvh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 18px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 17, color: "#111" }}>Configurar Provedor</h3>
          <button onClick={onClose} style={{
            background: "#F3F4F6", border: "none", borderRadius: "50%",
            width: 30, height: 30, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#6B7280"
          }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
          {PROVIDERS.map(p => (
            <button key={p.id}
              onClick={() => { setLocalProvider(p.id); setLocalModel(p.models[0].id); setStatus(null); }}
              style={{
                padding: "7px 14px", borderRadius: 9999,
                border: `1.5px solid ${localProvider === p.id ? p.color : "#E5E7EB"}`,
                background: localProvider === p.id ? p.color + "15" : "#fff",
                color: localProvider === p.id ? p.color : "#6B7280",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
              {p.name}
            </button>
          ))}
        </div>

        <div style={{
          fontSize: 11.5, color: prov.color, fontWeight: 700, marginBottom: 14,
          background: prov.color + "12", padding: "6px 11px",
          borderRadius: 7, display: "inline-block",
        }}>
          {prov.freeNote}
        </div>

        {prov.id === "hokclaw" && (
          <div style={{
            fontSize: 13, color: "#374151", marginBottom: 14,
            background: "#EFF6FF", padding: "10px 14px",
            borderRadius: 10, lineHeight: 1.6,
            border: "1px solid #BFDBFE",
          }}>
            <strong style={{ color: "#0F62FE" }}>HokClaw</strong> — Orquestrador local rodando no seu celular.<br />
            Conectado em: <code style={{ fontSize: 12, background: "#DBEAFE", padding: "1px 6px", borderRadius: 4 }}>
              {prov.apiUrl}
            </code>
          </div>
        )}

        {prov.id === "ollama" && (
          <div style={{
            fontSize: 13, color: "#374151", marginBottom: 14,
            background: "#ECFDF5", padding: "10px 14px",
            borderRadius: 10, lineHeight: 1.6, border: "1px solid #A7F3D0",
          }}>
            Execute <code style={{ fontSize: 12 }}>ollama serve</code> no terminal antes de conectar.
          </div>
        )}

        {!prov.noKey && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              Chave API{" "}
              {prov.keyLink && (
                <a href={prov.keyLink} target="_blank" rel="noreferrer" style={{ color: prov.color, textDecoration: "none" }}>
                  — obter gratis
                </a>
              )}
            </div>
            <input
              type="password"
              value={localKeys[localProvider] || ""}
              onChange={e => setLocalKeys(k => ({ ...k, [localProvider]: e.target.value }))}
              placeholder={prov.keyPlaceholder}
              style={{
                width: "100%", padding: "11px 14px",
                border: "1.5px solid #E5E7EB", borderRadius: 10,
                fontFamily: "monospace", fontSize: 13, outline: "none",
                background: "#FAFAFA", color: "#111",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            Modelo
          </div>
          <select
            value={localModel}
            onChange={e => setLocalModel(e.target.value)}
            style={{
              width: "100%", padding: "11px 14px",
              border: "1.5px solid #E5E7EB", borderRadius: 10,
              fontSize: 13, outline: "none",
              background: "#FAFAFA", color: "#111",
              fontFamily: "inherit", cursor: "pointer",
            }}>
            {prov.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {localModel === "custom" && (
            <input
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder="ex: hokma-coder:latest"
              style={{
                width: "100%", marginTop: 8, padding: "11px 14px",
                border: "1.5px solid #E5E7EB", borderRadius: 10,
                fontSize: 13, outline: "none",
                background: "#FAFAFA", color: "#111", fontFamily: "monospace",
              }}
            />
          )}
        </div>

        {status && (
          <div style={{
            padding: "10px 14px", borderRadius: 9, marginBottom: 14, fontSize: 13,
            background: STATUS_MAP[status].bg, color: STATUS_MAP[status].color, fontWeight: 700,
          }}>
            {STATUS_MAP[status].text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={test} style={{
            flex: 1, padding: "12px 0",
            border: "1.5px solid #E5E7EB", borderRadius: 10,
            background: "#fff", fontSize: 13.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", color: "#374151",
          }}>
            Testar
          </button>
          <button onClick={apply} style={{
            flex: 2, padding: "12px 0",
            border: "none", borderRadius: 10,
            background: "#111827", color: "#fff",
            fontSize: 13.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
