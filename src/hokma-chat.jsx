import { useState, useRef, useEffect, useCallback } from "react";

// ─── PROVIDERS CONFIG ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    color: "#F55036",
    freeNote: "Gratuito · Rápido",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile",   label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant",      label: "Llama 3.1 8B (Rápido)" },
      { id: "gemma2-9b-it",              label: "Gemma 2 9B" },
      { id: "mixtral-8x7b-32768",        label: "Mixtral 8x7B" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🔀",
    color: "#7C3AED",
    freeNote: "100+ modelos gratuitos",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyPlaceholder: "sk-or-v1-...",
    keyLink: "https://openrouter.ai/keys",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free",     label: "Llama 3.3 70B (Free)" },
      { id: "google/gemma-3-27b-it:free",                 label: "Gemma 3 27B (Free)" },
      { id: "mistralai/mistral-7b-instruct:free",         label: "Mistral 7B (Free)" },
      { id: "deepseek/deepseek-r1:free",                  label: "DeepSeek R1 (Free)" },
      { id: "qwen/qwen3-235b-a22b:free",                  label: "Qwen3 235B (Free)" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "✦",
    color: "#1A73E8",
    freeNote: "Gratuito · Google",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.0-flash",       label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash",       label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b",    label: "Gemini 1.5 Flash 8B" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    icon: "🦙",
    color: "#059669",
    freeNote: "Local · Sem limites",
    apiUrl: "http://localhost:11434/v1/chat/completions",
    keyPlaceholder: "ollama (sem chave)",
    keyLink: "https://ollama.com/library",
    models: [
      { id: "qwen2.5-coder:7b",  label: "Qwen2.5 Coder 7B" },
      { id: "llama3.2:3b",       label: "Llama 3.2 3B" },
      { id: "mistral:7b",        label: "Mistral 7B" },
      { id: "deepseek-coder:6.7b", label: "DeepSeek Coder 6.7B" },
      { id: "custom",            label: "Modelo personalizado..." },
    ],
  },
];

// ─── AGENTS ──────────────────────────────────────────────────────────────────
const AGENTS = [
  { id: "general",    icon: "🧠", name: "Geral",
    prompt: "Você é Hokmá AI, assistente inteligente e direto do ecossistema Hokmá. Responda em português brasileiro.",
    tips: ["O que é inteligência artificial?", "Explique machine learning", "Tendências de IA em 2025"] },
  { id: "programmer", icon: "💻", name: "Programador",
    prompt: "Você é engenheiro de software sênior do ecossistema Hokmá. Escreva código limpo, moderno, comentado. Explique decisões técnicas. Responda em português brasileiro.",
    tips: ["FastAPI + SQLite: estrutura básica", "Como usar asyncio em Python?", "Docker multi-stage build"] },
  { id: "writer",     icon: "✍️", name: "Escritor",
    prompt: "Você é escritor criativo e profissional. Textos envolventes e refinados. Responda em português brasileiro.",
    tips: ["Abertura impactante para artigo", "Como estruturar um bom texto?", "Post técnico para LinkedIn"] },
  { id: "arquiteto",  icon: "🏗️", name: "Arquiteto",
    prompt: "Você é Arquiteto de Software sênior no ecossistema Hokmá. Projete sistemas escaláveis. Use diagramas ASCII quando útil. Responda em português brasileiro.",
    tips: ["Arquitetura para assistente IA local", "Explique padrão RAG", "Microsserviços vs monolito"] },
  { id: "devops",     icon: "⚙️", name: "DevOps",
    prompt: "Você é engenheiro DevOps expert em Linux, Docker, CI/CD, Ollama. Comandos prontos para uso. Responda em português brasileiro.",
    tips: ["Instalar Ollama no Linux", "Dockerfile para FastAPI", "Configurar GPU no Docker"] },
];

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
const STORE_KEY = "hokma_config_v1";
const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};
const saveConfig = (cfg) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch {}
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", margin: "10px 0 6px" }}>
      <pre style={{
        background: "#16161A", color: "#E2E0DB", borderRadius: 10,
        padding: "14px 44px 14px 14px", fontSize: 12.5, lineHeight: 1.6,
        overflowX: "auto", fontFamily: "monospace", margin: 0, whiteSpace: "pre"
      }}><code>{code}</code></pre>
      <button onClick={() => {
        navigator.clipboard.writeText(code).catch(() => {});
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      }} style={{
        position: "absolute", top: 8, right: 8,
        background: copied ? "#16A34A" : "rgba(255,255,255,0.14)",
        color: "#fff", border: "none", borderRadius: 5,
        padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600
      }}>{copied ? "✓" : "Copiar"}</button>
    </div>
  );
}

function MsgContent({ text }) {
  const parts = [];
  const re = /```(?:\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: "text", v: text.slice(last, m.index) });
    parts.push({ t: "code", v: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });
  return (
    <div>
      {parts.map((p, i) => p.t === "code"
        ? <CodeBlock key={i} code={p.v} />
        : <span key={i} style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{
            __html: p.v
              .replace(/`([^`\n]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:4px;font-size:0.88em;font-family:monospace">$1</code>')
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          }} />
      )}
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#9B9890",
          animation: "bounce 1.2s infinite", animationDelay: `${i*0.18}s`
        }} />
      ))}
    </div>
  );
}

// ─── PROVIDER PANEL ──────────────────────────────────────────────────────────
function ProviderPanel({ providerId, modelId, keys, onClose, onChange }) {
  const [localKeys, setLocalKeys] = useState({ ...keys });
  const [localModel, setLocalModel] = useState(modelId);
  const [localProvider, setLocalProvider] = useState(providerId);
  const [customModel, setCustomModel] = useState("");
  const [status, setStatus] = useState(null);

  const prov = PROVIDERS.find(p => p.id === localProvider);

  const test = async () => {
    setStatus("testing");
    const key = localProvider === "ollama" ? "ollama" : (localKeys[localProvider] || "");
    if (!key && localProvider !== "ollama") { setStatus("nokey"); return; }
    try {
      const res = await fetch(prov.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          ...(localProvider === "openrouter" ? { "HTTP-Referer": "hokma-ai", "X-Title": "Hokmá AI" } : {}),
        },
        body: JSON.stringify({
          model: localModel === "custom" ? customModel : localModel,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
          max_tokens: 10,
        })
      });
      const d = await res.json();
      if (d.choices?.[0]?.message?.content) setStatus("ok");
      else setStatus("err");
    } catch { setStatus("err"); }
  };

  const apply = () => {
    const finalModel = localModel === "custom" ? customModel : localModel;
    onChange({ providerId: localProvider, modelId: finalModel, keys: localKeys });
    onClose();
  };

  const statusMap = {
    testing: { bg: "#FFFBEB", color: "#D97706", text: "Testando…" },
    ok:      { bg: "#F0FDF4", color: "#16A34A", text: "✓ Conexão OK" },
    err:     { bg: "#FEF2F2", color: "#DC2626", text: "✕ Falha — verifique chave/modelo" },
    nokey:   { bg: "#FEF2F2", color: "#DC2626", text: "✕ Insira a chave API" },
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100, padding: 0
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: "18px 18px 0 0",
        width: "100%", maxWidth: 520, padding: "24px 20px 32px",
        animation: "slideUp 0.25s ease"
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#E8E6E0", borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Configurar Provedor</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9B9890", lineHeight: 1
          }}>×</button>
        </div>

        {/* Provider tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setLocalProvider(p.id); setLocalModel(p.models[0].id); setStatus(null); }}
              style={{
                padding: "7px 13px", borderRadius: 9999, border: `1.5px solid ${localProvider === p.id ? p.color : "#E8E6E0"}`,
                background: localProvider === p.id ? p.color + "18" : "#fff",
                color: localProvider === p.id ? p.color : "#6B6860",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "inherit"
              }}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        {/* Free note */}
        <div style={{ fontSize: 11.5, color: prov.color, fontWeight: 600, marginBottom: 12,
          background: prov.color + "14", padding: "5px 10px", borderRadius: 6, display: "inline-block" }}>
          {prov.freeNote}
        </div>

        {/* API Key */}
        {localProvider !== "ollama" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9890", textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 5 }}>
              Chave API — <a href={prov.keyLink} target="_blank" rel="noreferrer"
                style={{ color: prov.color, textDecoration: "none" }}>obter grátis ↗</a>
            </div>
            <input
              type="password"
              value={localKeys[localProvider] || ""}
              onChange={e => setLocalKeys(k => ({ ...k, [localProvider]: e.target.value }))}
              placeholder={prov.keyPlaceholder}
              style={{
                width: "100%", padding: "10px 12px",
                border: "1.5px solid #E8E6E0", borderRadius: 8,
                fontFamily: "monospace", fontSize: 13, outline: "none",
                background: "#FAFAF8", color: "#1A1916"
              }}
            />
          </div>
        )}

        {localProvider === "ollama" && (
          <div style={{ fontSize: 12.5, color: "#6B6860", marginBottom: 12,
            background: "#F0FDF4", padding: "8px 12px", borderRadius: 8, lineHeight: 1.5 }}>
            🦙 <strong>Ollama local</strong> — Certifique-se que o Ollama está rodando:<br />
            <code style={{ fontSize: 11.5 }}>ollama serve</code> · acessa em <code style={{ fontSize: 11.5 }}>localhost:11434</code>
          </div>
        )}

        {/* Model select */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9890",
            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Modelo</div>
          <select value={localModel}
            onChange={e => setLocalModel(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px",
              border: "1.5px solid #E8E6E0", borderRadius: 8,
              fontSize: 13, outline: "none", background: "#FAFAF8",
              color: "#1A1916", fontFamily: "inherit", cursor: "pointer"
            }}>
            {prov.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {localModel === "custom" && (
            <input value={customModel} onChange={e => setCustomModel(e.target.value)}
              placeholder="ex: hokma-coder:latest"
              style={{
                width: "100%", marginTop: 8, padding: "10px 12px",
                border: "1.5px solid #E8E6E0", borderRadius: 8,
                fontSize: 13, outline: "none", background: "#FAFAF8",
                color: "#1A1916", fontFamily: "monospace"
              }} />
          )}
        </div>

        {status && (
          <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 14, fontSize: 13,
            background: statusMap[status].bg, color: statusMap[status].color, fontWeight: 600 }}>
            {statusMap[status].text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={test} style={{
            flex: 1, padding: "11px 0",
            border: "1.5px solid #E8E6E0", borderRadius: 9, background: "#fff",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            color: "#1A1916"
          }}>Testar conexão</button>
          <button onClick={apply} style={{
            flex: 2, padding: "11px 0",
            border: "none", borderRadius: 9, background: "#1A1916",
            color: "#fff", fontSize: 13.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit"
          }}>Aplicar e fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function HokmaChat() {
  const cfg = loadConfig();
  const [providerId, setProviderId] = useState(cfg.providerId || "groq");
  const [modelId,    setModelId]    = useState(cfg.modelId    || "llama-3.3-70b-versatile");
  const [apiKeys,    setApiKeys]    = useState(cfg.apiKeys    || {});
  const [agentId,    setAgentId]    = useState("programmer");
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showPanel,  setShowPanel]  = useState(false);

  const chatRef     = useRef(null);
  const textareaRef = useRef(null);

  const provider = PROVIDERS.find(p => p.id === providerId);
  const agent    = AGENTS.find(a => a.id === agentId);

  useEffect(() => {
    saveConfig({ providerId, modelId, apiKeys });
  }, [providerId, modelId, apiKeys]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const adjustTA = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const sendMessage = useCallback(async (text) => {
    const txt = (text ?? input).trim();
    if (!txt || loading) return;
    setInput(""); if (textareaRef.current) textareaRef.current.style.height = "46px";

    const key = providerId === "ollama" ? "ollama" : (apiKeys[providerId] || "");
    if (!key && providerId !== "ollama") {
      setShowPanel(true); return;
    }

    setMessages(prev => [...prev, { role: "user", content: txt, id: Date.now() }]);
    setLoading(true);

    try {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      };
      if (providerId === "openrouter") {
        headers["HTTP-Referer"] = "hokma-ai";
        headers["X-Title"] = "Hokmá AI";
      }
      if (providerId === "gemini") {
        headers["Authorization"] = `Bearer ${key}`;
      }

      const res = await fetch(provider.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: agent.prompt },
            { role: "user",   content: txt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content
        || data.error?.message
        || JSON.stringify(data);
      setMessages(prev => [...prev, { role: "ai", content: reply, agentId, id: Date.now()+1 }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "ai", agentId,
        content: `⚠️ Erro: ${err.message}\n\nDica: Se usar Ollama, certifique que \`ollama serve\` está ativo no terminal.`,
        id: Date.now()+1
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, loading, providerId, modelId, apiKeys, agent, agentId, provider]);

  const applyConfig = ({ providerId: pid, modelId: mid, keys }) => {
    setProviderId(pid); setModelId(mid);
    setApiKeys(prev => ({ ...prev, ...keys }));
  };

  const isEmpty = messages.length === 0 && !loading;
  const currentModel = provider?.models.find(m => m.id === modelId)?.label || modelId;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .msg-in{animation:fadeUp 0.22s ease}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#D6D3CB;border-radius:10px}
        select option{font-family:inherit}
      `}</style>

      <div style={{
        display:"flex", flexDirection:"column",
        height:"100dvh", background:"#F5F4F0",
        fontFamily:"'DM Sans',sans-serif", color:"#1A1916", overflow:"hidden"
      }}>

        {/* HEADER */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #E8E6E0",
          padding:"0 18px", height:60,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0, gap:10
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:"#1A1916", borderRadius:9,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <span style={{ fontWeight:700, fontSize:16, letterSpacing:-0.3 }}>
              Hokmá <span style={{ color:"#2563EB" }}>AI</span>
            </span>
          </div>

          {/* Provider badge — tap to configure */}
          <button onClick={() => setShowPanel(true)} style={{
            display:"flex", alignItems:"center", gap:6,
            background: provider.color + "18",
            color: provider.color,
            padding:"5px 10px 5px 8px", borderRadius:9999,
            fontSize:12, fontWeight:700,
            border:`1.5px solid ${provider.color}44`,
            cursor:"pointer", fontFamily:"inherit",
            maxWidth: 180, overflow:"hidden"
          }}>
            <span style={{ fontSize:14 }}>{provider.icon}</span>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {provider.name} · {currentModel.replace(" (Free)","").replace(" (Rápido)","")}
            </span>
            <span style={{ opacity:0.6, fontSize:10 }}>▾</span>
          </button>
        </div>

        {/* AGENT BAR */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #E8E6E0",
          padding:"0 18px", height:52,
          display:"flex", alignItems:"center", gap:6,
          overflowX:"auto", flexShrink:0, scrollbarWidth:"none"
        }}>
          <span style={{
            fontSize:11, fontWeight:600, color:"#9B9890",
            textTransform:"uppercase", letterSpacing:"0.6px",
            marginRight:6, whiteSpace:"nowrap", flexShrink:0
          }}>Agente</span>
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => { setAgentId(a.id); textareaRef.current?.focus(); }}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 14px", borderRadius:9999,
                border:`1.5px solid ${a.id===agentId ? "#1A1916" : "#E8E6E0"}`,
                background: a.id===agentId ? "#1A1916" : "#fff",
                color: a.id===agentId ? "#fff" : "#6B6860",
                fontFamily:"'DM Sans',sans-serif",
                fontSize:13, fontWeight:600, cursor:"pointer",
                whiteSpace:"nowrap", flexShrink:0, transition:"all 0.18s"
              }}>
              <span>{a.icon}</span>{a.name}
            </button>
          ))}
        </div>

        {/* CHAT */}
        <div ref={chatRef} style={{
          flex:1, overflowY:"auto", padding:"22px 18px",
          display:"flex", flexDirection:"column", gap:6
        }}>

          {isEmpty && (
            <div style={{
              flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
              gap:14, textAlign:"center", padding:"30px 20px",
              animation:"fadeUp 0.35s ease"
            }}>
              <div style={{ width:52, height:52, background:"#1A1916", borderRadius:14,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700, letterSpacing:-0.3 }}>Como posso ajudar?</h2>
                <p style={{ fontSize:13, color:"#9B9890", marginTop:5, lineHeight:1.5 }}>
                  {agent.icon} {agent.name} · {provider.icon} {provider.name}
                </p>
              </div>

              {/* API key warning */}
              {providerId !== "ollama" && !apiKeys[providerId] && (
                <button onClick={() => setShowPanel(true)} style={{
                  padding:"10px 16px", borderRadius:9,
                  border:`1.5px solid ${provider.color}66`,
                  background: provider.color + "10", color: provider.color,
                  fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit"
                }}>
                  {provider.icon} Configurar chave {provider.name} →
                </button>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:7, width:"100%", maxWidth:340 }}>
                {agent.tips.map((tip,i) => (
                  <button key={i} onClick={() => sendMessage(tip)} style={{
                    padding:"10px 14px", background:"#fff",
                    border:"1.5px solid #E8E6E0", borderRadius:8,
                    textAlign:"left", fontFamily:"'DM Sans',sans-serif",
                    fontSize:13, color:"#6B6860", cursor:"pointer",
                    fontWeight:500, lineHeight:1.4
                  }}>{tip}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className="msg-in" style={{
              display:"flex", flexDirection:"column", gap:3,
              maxWidth:"83%",
              alignSelf: msg.role==="user" ? "flex-end" : "flex-start",
              alignItems: msg.role==="user" ? "flex-end" : "flex-start"
            }}>
              {msg.role==="ai" && (
                <div style={{
                  fontSize:11, fontWeight:600, color:"#9B9890",
                  letterSpacing:"0.4px", paddingLeft:4, textTransform:"uppercase"
                }}>
                  {AGENTS.find(a=>a.id===msg.agentId)?.icon}{" "}
                  {AGENTS.find(a=>a.id===msg.agentId)?.name}
                </div>
              )}
              <div style={{
                padding:"11px 15px",
                borderRadius: msg.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role==="user" ? "#1A1916" : "#fff",
                color: msg.role==="user" ? "#fff" : "#1A1916",
                border: msg.role==="ai" ? "1px solid #E8E6E0" : "none",
                boxShadow: msg.role==="ai" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                fontSize:14, lineHeight:1.6
              }}>
                {msg.role==="ai"
                  ? <MsgContent text={msg.content} />
                  : <span style={{ whiteSpace:"pre-wrap" }}>{msg.content}</span>
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg-in" style={{ alignSelf:"flex-start", display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#9B9890",
                letterSpacing:"0.4px", paddingLeft:4, textTransform:"uppercase" }}>
                {agent.icon} {agent.name}
              </div>
              <div style={{ padding:"11px 15px", borderRadius:"16px 16px 16px 4px",
                background:"#fff", border:"1px solid #E8E6E0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <Dots />
              </div>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div style={{
          background:"#fff", borderTop:"1px solid #E8E6E0",
          padding:"12px 18px", display:"flex", gap:10,
          alignItems:"flex-end", flexShrink:0
        }}>
          <div style={{
            flex:1, background:"#FAFAF8",
            border:"1.5px solid #E8E6E0", borderRadius:12,
            display:"flex", alignItems:"center"
          }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); adjustTA(); }}
              onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } }}
              placeholder="Digite sua mensagem…"
              rows={1}
              style={{
                flex:1, padding:"12px 14px", border:"none",
                background:"transparent", fontFamily:"'DM Sans',sans-serif",
                fontSize:14, color:"#1A1916", outline:"none",
                resize:"none", minHeight:46, maxHeight:120,
                overflowY:"auto", lineHeight:1.5
              }} />
          </div>
          <button onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width:46, height:46, borderRadius:9,
              background: loading || !input.trim() ? "#D6D3CB" : "#1A1916",
              color:"#fff", border:"none",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, transition:"background 0.15s"
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* STATUS BAR */}
        <div style={{
          background:"#FAFAF8", borderTop:"1px solid #E8E6E0",
          padding:"5px 18px", display:"flex", alignItems:"center",
          justifyContent:"space-between", flexShrink:0
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:5,
            fontSize:11, fontWeight:600, color:"#9B9890",
            textTransform:"uppercase", letterSpacing:"0.5px" }}>
            <div style={{ width:5, height:5, borderRadius:"50%",
              background: apiKeys[providerId] || providerId==="ollama" ? "#16A34A" : "#D97706" }} />
            {provider.icon} {provider.name} · {currentModel.replace(" (Free)","").replace(" (Rápido)","")}
          </div>
          <button onClick={() => setMessages([])} style={{
            background:"none", border:"none", fontSize:11, fontWeight:600,
            color:"#9B9890", cursor:"pointer", padding:"2px 6px",
            borderRadius:5, textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:"inherit"
          }}>Limpar</button>
        </div>
      </div>

      {/* PROVIDER PANEL MODAL */}
      {showPanel && (
        <ProviderPanel
          providerId={providerId}
          modelId={modelId}
          keys={apiKeys}
          onClose={() => setShowPanel(false)}
          onChange={applyConfig}
        />
      )}
    </>
  );
}
