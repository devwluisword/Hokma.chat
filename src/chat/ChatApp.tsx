import { useState, useRef, useEffect, useCallback } from "react";
import { PROVIDERS, AGENTS, loadConfig, saveConfig, DEFAULT_OPENCLAW_URL, DEFAULT_GEMINI_API_KEY } from "./config";
import { ProviderPanel } from "./components/ProviderPanel";
import { MessageContent } from "./components/MessageContent";
import { SkillsPanel } from "./components/SkillsPanel";
import { useGemini } from "./hooks/useGemini";
import { useOpenClaw } from "./hooks/useOpenClaw";
import type { Message, Skill } from "./types";

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#8B5CF6",
          animation: "hk-bounce 1.2s infinite ease-in-out",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function ChatApp() {
  const cfg = loadConfig();
  const [providerId, setProviderId] = useState<string>(cfg.providerId || "openclaw");
  const [modelId, setModelId] = useState<string>(cfg.modelId || "gemini-2.0-flash");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(cfg.apiKeys || { gemini: DEFAULT_GEMINI_API_KEY });
  const [serverUrls, setServerUrls] = useState<Record<string, string>>(cfg.serverUrls || {});
  const [agentId, setAgentId] = useState("programmer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "ok" | "err">("unknown");
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [openClawSkills, setOpenClawSkills] = useState<Skill[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const provider = PROVIDERS.find(p => p.id === providerId)!;
  const agent = AGENTS.find(a => a.id === agentId)!;

  const { sendMessage: sendGemini } = useGemini();
  const { sendMessage: sendOpenClaw, checkHealth: checkOpenClawHealth } = useOpenClaw();

  useEffect(() => {
    saveConfig({ providerId, modelId, apiKeys, serverUrls });
  }, [providerId, modelId, apiKeys, serverUrls]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const txt = (overrideText ?? input).trim();
    if (!txt || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "46px";

    const userMsg: Message = { id: Date.now(), role: "user", content: txt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const aiId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiId, role: "ai", content: "", agentId, streaming: true, skillUsed: activeSkillId || undefined }]);

    abortRef.current = new AbortController();

    const historyMessages = messages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

    let systemPrompt = agent.prompt;
    if (activeSkillId && providerId === "openclaw") {
      const skill = openClawSkills.find(s => s.id === activeSkillId);
      if (skill) {
        systemPrompt = `${agent.prompt}\n\nSkill ativa: ${skill.name} — ${skill.description}`;
      }
    }

    const allMessages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMessages,
      { role: "user" as const, content: txt },
    ];

    try {
      let accumulated = "";

      if (providerId === "openclaw") {
        accumulated = await sendOpenClaw(
          allMessages.map(m => ({ role: m.role === "system" ? "user" : m.role, content: m.content } as any)),
          modelId,
          (chunk) => {
            accumulated += chunk;
            setMessages(prev =>
              prev.map(m => m.id === aiId ? { ...m, content: accumulated } : m)
            );
            if (!loading && accumulated.length > 0) {
              setConnectionStatus("ok");
              if (navigator.vibrate) navigator.vibrate(8);
            }
          },
          abortRef.current.signal,
          activeSkillId || undefined
        );
      } else {
        accumulated = await sendGemini(
          allMessages,
          modelId,
          (chunk) => {
            accumulated += chunk;
            setMessages(prev =>
              prev.map(m => m.id === aiId ? { ...m, content: accumulated } : m)
            );
            if (!loading && accumulated.length > 0) {
              setConnectionStatus("ok");
              if (navigator.vibrate) navigator.vibrate(8);
            }
          },
          abortRef.current.signal
        );
      }

      if (!accumulated) {
        setMessages(prev =>
          prev.map(m => m.id === aiId
            ? { ...m, content: "Sem resposta do modelo. Tente novamente.", error: true }
            : m
          )
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, content: m.content || "[Cancelado]", streaming: false } : m)
        );
        return;
      }
      setConnectionStatus("err");
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? {
                ...m,
                content: `Erro de conexao com ${provider.name}.\n\n${errMsg}`,
                error: true,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m));
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, loading, providerId, modelId, agent, agentId, provider, messages, activeSkillId, openClawSkills, sendOpenClaw, sendGemini]);

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const startListening = () => {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      setInput(e.results[0][0].transcript);
      if (navigator.vibrate) navigator.vibrate(40);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const applyConfig = (cfg: { providerId: string; modelId: string; keys: Record<string, string>; serverUrls: Record<string, string> }) => {
    setProviderId(cfg.providerId);
    setModelId(cfg.modelId);
    setApiKeys(prev => ({ ...prev, ...cfg.keys, gemini: DEFAULT_GEMINI_API_KEY }));
    setServerUrls(prev => ({ ...prev, ...cfg.serverUrls }));
    setConnectionStatus("unknown");
  };

  const isEmpty = messages.length === 0 && !loading;
  const modelLabel = provider.models.find(m => m.id === modelId)?.label || modelId;
  const showSkills = providerId === "openclaw" && openClawSkills.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; overflow: hidden; background: #F8F9FA; }
        @keyframes hk-bounce {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes hk-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes hk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes hk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .hk-msg { animation: hk-fadeUp 0.2s ease; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
        #hk-agent-bar::-webkit-scrollbar { display: none; }
        #hk-skills-bar::-webkit-scrollbar { display: none; }
        .hk-agent-btn { transition: all 0.15s ease; }
        .hk-agent-btn:active { transform: scale(0.96); }
        .hk-tip-btn:hover { background: #F5F3FF !important; border-color: #DDD6FE !important; }
        .hk-send-btn:not(:disabled):active { transform: scale(0.94); }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100dvh", width: "100vw",
        background: "#F8F9FA",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#111827", overflow: "hidden",
        position: "fixed", top: 0, left: 0,
      }}>

        {/* HEADER */}
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          padding: `calc(10px + env(safe-area-inset-top)) 16px 10px`,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3" />
                <line x1="12" y1="12" x2="20" y2="7.5" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <line x1="12" y1="12" x2="4" y2="7.5" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                Hokma <span style={{ color: "#8B5CF6" }}>AI</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#9CA3AF", fontWeight: 500, letterSpacing: "0.2px" }}>
                {agent.name} · {modelLabel.replace(" (Free)", "").replace(" Rapido", "")}
              </div>
            </div>
          </div>

          <button onClick={() => setShowPanel(true)} style={{
            display: "flex", alignItems: "center", gap: 7,
            background: provider.color + "12",
            color: provider.color,
            padding: "7px 12px 7px 10px", borderRadius: 9999,
            fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${provider.color}30`,
            cursor: "pointer", fontFamily: "inherit",
            maxWidth: 200, overflow: "hidden",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: provider.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>
              {provider.icon}
            </div>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {provider.name}
            </span>
            {activeSkillId && providerId === "openclaw" && (
              <span style={{
                background: "#8B5CF6", color: "#fff",
                fontSize: 9, fontWeight: 800, padding: "1px 5px",
                borderRadius: 4, letterSpacing: "0.3px", flexShrink: 0,
              }}>
                SKILL
              </span>
            )}
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: connectionStatus === "ok" ? "#16A34A" : connectionStatus === "err" ? "#DC2626" : "#D97706",
              animation: connectionStatus === "unknown" ? "hk-pulse 2s infinite" : "none",
            }} />
          </button>
        </div>

        {/* AGENT BAR */}
        <div id="hk-agent-bar" style={{
          background: "#fff",
          borderBottom: showSkills ? "none" : "1px solid #E5E7EB",
          padding: "8px 16px",
          display: "flex", alignItems: "center", gap: 6,
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.8px",
            marginRight: 4, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            Agente
          </span>
          {AGENTS.map(a => (
            <button
              key={a.id}
              className="hk-agent-btn"
              onClick={() => { setAgentId(a.id); textareaRef.current?.focus(); }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 9999,
                border: `1.5px solid ${a.id === agentId ? "#111827" : "#E5E7EB"}`,
                background: a.id === agentId ? "#111827" : "#fff",
                color: a.id === agentId ? "#fff" : "#6B7280",
                fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                flexShrink: 0, fontFamily: "inherit",
              }}>
              <span style={{ fontSize: 11 }}>{a.icon}</span>
              {a.name}
            </button>
          ))}
        </div>

        {/* SKILLS BAR */}
        {showSkills && (
          <div id="hk-skills-bar" style={{
            background: "#fff",
            borderBottom: "1px solid #E5E7EB",
            padding: "6px 16px 8px",
            flexShrink: 0,
          }}>
            <SkillsPanel
              skills={openClawSkills}
              activeSkillId={activeSkillId}
              onSelectSkill={setActiveSkillId}
            />
          </div>
        )}

        {/* CHAT AREA */}
        <div ref={chatRef} style={{
          flex: 1, overflowY: "auto",
          padding: "20px 16px",
          display: "flex", flexDirection: "column", gap: 8,
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
          overscrollBehavior: "contain",
        }}>

          {isEmpty && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 16, textAlign: "center",
              padding: "40px 20px", animation: "hk-fadeUp 0.35s ease",
              minHeight: "60vh",
            }}>
              <div style={{
                width: 60, height: 60,
                background: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
                borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3" />
                  <line x1="12" y1="12" x2="20" y2="7.5" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <line x1="12" y1="12" x2="4" y2="7.5" />
                </svg>
              </div>

              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
                  Como posso ajudar?
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.5, maxWidth: 320 }}>
                  {agent.name} com{" "}
                  <span style={{
                    color: "#8B5CF6", fontWeight: 700,
                    background: "#F5F3FF",
                    padding: "1px 7px", borderRadius: 5,
                  }}>
                    {provider.name}
                  </span>
                  {" "}+ Gemini
                </p>
                {activeSkillId && (
                  <div style={{
                    marginTop: 8, fontSize: 12, color: "#8B5CF6",
                    fontWeight: 600, background: "#F5F3FF",
                    padding: "4px 12px", borderRadius: 20, display: "inline-block",
                  }}>
                    Skill: {openClawSkills.find(s => s.id === activeSkillId)?.name}
                  </div>
                )}
              </div>

              <div style={{
                display: "flex", flexDirection: "column", gap: 8,
                width: "100%", maxWidth: 340,
              }}>
                {agent.tips.map((tip, i) => (
                  <button
                    key={i}
                    className="hk-tip-btn"
                    onClick={() => sendMessage(tip)}
                    style={{
                      padding: "11px 16px",
                      background: "#fff",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 10,
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: 13.5, color: "#374151",
                      cursor: "pointer", fontWeight: 500, lineHeight: 1.4,
                      transition: "all 0.15s",
                    }}>
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className="hk-msg" style={{
              display: "flex", flexDirection: "column", gap: 3,
              maxWidth: "86%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "ai" && (
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: "#9CA3AF",
                  letterSpacing: "0.5px", paddingLeft: 6,
                  textTransform: "uppercase",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>{AGENTS.find(a => a.id === msg.agentId)?.icon}</span>
                  <span>{AGENTS.find(a => a.id === msg.agentId)?.name}</span>
                  {msg.skillUsed && (
                    <span style={{
                      background: "#F5F3FF", color: "#8B5CF6",
                      fontSize: 9, fontWeight: 800, padding: "1px 5px",
                      borderRadius: 4, letterSpacing: "0.3px",
                    }}>
                      {openClawSkills.find(s => s.id === msg.skillUsed)?.name || msg.skillUsed}
                    </span>
                  )}
                  {msg.streaming && (
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#8B5CF6",
                      animation: "hk-pulse 1s infinite",
                      marginLeft: 2,
                    }} />
                  )}
                </div>
              )}
              <div style={{
                padding: "11px 15px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #111827, #1F2937)"
                  : msg.error ? "#FEF2F2" : "#fff",
                color: msg.role === "user" ? "#fff" : msg.error ? "#DC2626" : "#111827",
                border: msg.role === "ai" ? `1px solid ${msg.error ? "#FECACA" : "#E5E7EB"}` : "none",
                boxShadow: msg.role === "ai"
                  ? "0 1px 4px rgba(0,0,0,0.05)"
                  : "0 1px 4px rgba(0,0,0,0.12)",
                fontSize: 14.5, lineHeight: 1.65,
                wordBreak: "break-word",
              }}>
                {msg.role === "ai" ? (
                  msg.content === "" && loading
                    ? <ThinkingDots />
                    : <MessageContent text={msg.content} />
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* INPUT AREA */}
        <div style={{
          background: "#fff",
          borderTop: "1px solid #E5E7EB",
          padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
          display: "flex", gap: 8, alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <button
            onClick={startListening}
            title="Reconhecimento de voz"
            style={{
              width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0,
              background: isListening ? "#EF4444" : "#F3F4F6",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              animation: isListening ? "hk-pulse 1s infinite" : "none",
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={isListening ? "#fff" : "#6B7280"} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          <div style={{
            flex: 1,
            background: "#F9FAFB",
            border: `1.5px solid ${activeSkillId ? "#DDD6FE" : "#E5E7EB"}`,
            borderRadius: 14,
            display: "flex", alignItems: "center",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                isListening
                  ? "Ouvindo..."
                  : activeSkillId
                  ? `Skill: ${openClawSkills.find(s => s.id === activeSkillId)?.name || activeSkillId}...`
                  : "Mensagem..."
              }
              rows={1}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{
                flex: 1, padding: "12px 14px",
                border: "none", background: "transparent",
                fontFamily: "inherit", fontSize: 15,
                color: "#111827", outline: "none",
                resize: "none", minHeight: 44, maxHeight: 128,
                overflowY: "auto", lineHeight: 1.45,
              }}
            />
          </div>

          {loading ? (
            <button
              onClick={stopGeneration}
              title="Parar geracao"
              style={{
                width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0,
                background: "#EF4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="hk-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              style={{
                width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0,
                background: input.trim() ? (activeSkillId ? "#8B5CF6" : "#111827") : "#E5E7EB",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: input.trim() ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>

        {/* STATUS BAR */}
        <div style={{
          background: "#FAFAFA",
          borderTop: "1px solid #E5E7EB",
          padding: "5px 16px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 10.5, fontWeight: 600, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: connectionStatus === "ok"
                ? "#16A34A"
                : connectionStatus === "err"
                ? "#DC2626"
                : "#D97706",
            }} />
            {provider.name} · {modelLabel.replace(" (Free)", "").replace(" Rapido", "")}
            {activeSkillId && (
              <span style={{ color: "#8B5CF6" }}>
                · {openClawSkills.find(s => s.id === activeSkillId)?.name || activeSkillId}
              </span>
            )}
          </div>
          <button
            onClick={() => setMessages([])}
            style={{
              background: "none", border: "none",
              fontSize: 10.5, fontWeight: 600, color: "#9CA3AF",
              cursor: "pointer", padding: "2px 6px", borderRadius: 5,
              textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: "inherit",
            }}>
            Limpar
          </button>
        </div>
      </div>

      {showPanel && (
        <ProviderPanel
          providerId={providerId}
          modelId={modelId}
          keys={apiKeys}
          serverUrls={serverUrls}
          onClose={() => setShowPanel(false)}
          onChange={applyConfig}
        />
      )}
    </>
  );
}
