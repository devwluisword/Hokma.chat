import { useState, useEffect } from "react";
import { PROVIDERS, DEFAULT_HOKCLAW_URL } from "../config";

interface Props {
  providerId: string;
  modelId: string;
  keys: Record<string, string>;
  serverUrls: Record<string, string>;
  onClose: () => void;
  onChange: (cfg: { providerId: string; modelId: string; keys: Record<string, string>; serverUrls: Record<string, string> }) => void;
}

type StatusKey = "testing" | "ok" | "err" | "nokey" | "discovering";

const STATUS_MAP: Record<StatusKey, { bg: string; color: string; text: string }> = {
  testing:     { bg: "#FFF9E6", color: "#D97706",  text: "Testando conexao..." },
  discovering: { bg: "#EFF6FF", color: "#0F62FE",  text: "Descobrindo modelos e skills..." },
  ok:          { bg: "#F0FDF4", color: "#16A34A",  text: "Conexao OK" },
  err:         { bg: "#FEF2F2", color: "#DC2626",  text: "Falha — verifique URL ou modelo" },
  nokey:       { bg: "#FEF2F2", color: "#DC2626",  text: "Insira a chave API primeiro" },
};

export function ProviderPanel({ providerId, modelId, keys, serverUrls, onClose, onChange }: Props) {
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({ ...keys });
  const [localServerUrls, setLocalServerUrls] = useState<Record<string, string>>({ ...serverUrls });
  const [localModel, setLocalModel] = useState(modelId);
  const [localProvider, setLocalProvider] = useState(providerId);
  const [customModel, setCustomModel] = useState("");
  const [status, setStatus] = useState<StatusKey | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; label: string }[]>([]);

  const prov = PROVIDERS.find(p => p.id === localProvider)!;
  const hokClawUrl = localServerUrls["hokclaw"] || DEFAULT_HOKCLAW_URL;

  const getApiUrl = () => {
    if (localProvider === "hokclaw") {
      return `${hokClawUrl.replace(/\/$/, "")}/v1/chat/completions`;
    }
    return prov.apiUrl;
  };

  const fetchModels = async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || data.models || []).map(
        (m: { id?: string; name?: string }) => ({
          id: m.id || m.name || "",
          label: m.id || m.name || "",
        })
      );
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (localProvider === "hokclaw") {
      fetchModels(hokClawUrl).then(list => {
        if (list.length > 0) setDiscoveredModels(list);
      });
    }
  }, [localProvider, hokClawUrl]);

  const test = async () => {
    setStatus("testing");
    const key = prov.noKey ? "local" : (localKeys[localProvider] || "");
    if (!key && !prov.noKey) { setStatus("nokey"); return; }

    const apiUrl = getApiUrl();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!prov.noKey) headers["Authorization"] = `Bearer ${key}`;
      if (localProvider === "openrouter") {
        headers["HTTP-Referer"] = "hokma-ai";
        headers["X-Title"] = "Hokma AI";
      }
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: localModel === "custom" ? customModel : localModel,
          messages: [{ role: "user", content: "OK" }],
          max_tokens: 5,
        }),
      });
      const d = await res.json();
      if (d.choices?.[0]?.message?.content) {
        setStatus("ok");
        if (localProvider === "hokclaw") {
          setStatus("discovering");
          const models = await fetchModels(hokClawUrl);
          if (models.length > 0) setDiscoveredModels(models);
          setStatus("ok");
        }
      } else {
        setStatus("err");
      }
    } catch {
      setStatus("err");
    }
  };

  const apply = () => {
    const finalModel = localModel === "custom" ? customModel : localModel;
    const updatedServerUrls = { ...localServerUrls };
    if (localProvider === "hokclaw") {
      updatedServerUrls["hokclaw"] = hokClawUrl;
    }
    onChange({ providerId: localProvider, modelId: finalModel, keys: localKeys, serverUrls: updatedServerUrls });
    onClose();
  };

  const allModels = localProvider === "hokclaw" && discoveredModels.length > 0
    ? [
        ...discoveredModels,
        ...prov.models.filter(m => m.id === "custom" && !discoveredModels.find(d => d.id === "custom")),
      ]
    : prov.models;

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
              onClick={() => { setLocalProvider(p.id); setLocalModel(p.models[0].id); setStatus(null); setDiscoveredModels([]); }}
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
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 13, color: "#374151", marginBottom: 10,
              background: "#EFF6FF", padding: "10px 14px",
              borderRadius: 10, lineHeight: 1.6,
              border: "1px solid #BFDBFE",
            }}>
              <strong style={{ color: "#0F62FE" }}>HokClaw v2</strong> — Orquestrador IA local em Go.<br />
              Suporta <strong>skills</strong>, descoberta de modelos e execucao privada.
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              URL do Servidor
            </div>
            <input
              type="text"
              value={localServerUrls["hokclaw"] || DEFAULT_HOKCLAW_URL}
              onChange={e => setLocalServerUrls(prev => ({ ...prev, hokclaw: e.target.value }))}
              placeholder={DEFAULT_HOKCLAW_URL}
              style={{
                width: "100%", padding: "11px 14px",
                border: "1.5px solid #BFDBFE", borderRadius: 10,
                fontFamily: "monospace", fontSize: 13, outline: "none",
                background: "#F0F9FF", color: "#111",
              }}
            />
            {discoveredModels.length > 0 && (
              <div style={{
                marginTop: 8, fontSize: 11.5, color: "#16A34A",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {discoveredModels.length} modelo(s) descoberto(s) do servidor
              </div>
            )}
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
            {allModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
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
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {status === "testing" || status === "discovering" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "hk-spin 1s linear infinite", flexShrink: 0 }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : null}
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
