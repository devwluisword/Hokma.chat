import type { Provider, Agent } from "./types";

export const PROVIDERS: Provider[] = [
  {
    id: "hokclaw",
    name: "HokClaw",
    icon: "H",
    color: "#0F62FE",
    freeNote: "Orquestrador Local · Go · Privado",
    apiUrl: "http://10.118.44.210:18800/v1/chat/completions",
    noKey: true,
    models: [
      { id: "hokma-coder-v1", label: "Hokmá Coder v1" },
      { id: "hokma-general-v2", label: "Hokmá Geral v2" },
      { id: "custom", label: "Modelo personalizado..." },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "G",
    color: "#F55036",
    freeNote: "Gratuito · Rápido · Nuvem",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Rápido" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "R",
    color: "#16A34A",
    freeNote: "100+ modelos · Gratuito",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyPlaceholder: "sk-or-v1-...",
    keyLink: "https://openrouter.ai/keys",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
      { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (Free)" },
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Free)" },
      { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
      { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235B (Free)" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "G",
    color: "#1A73E8",
    freeNote: "Gratuito · Google AI",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    icon: "O",
    color: "#059669",
    freeNote: "Local · Sem limites · Offline",
    apiUrl: "http://localhost:11434/v1/chat/completions",
    noKey: true,
    models: [
      { id: "qwen2.5-coder:7b", label: "Qwen2.5 Coder 7B" },
      { id: "llama3.2:3b", label: "Llama 3.2 3B" },
      { id: "mistral:7b", label: "Mistral 7B" },
      { id: "deepseek-coder:6.7b", label: "DeepSeek Coder 6.7B" },
      { id: "custom", label: "Modelo personalizado..." },
    ],
  },
];

export const AGENTS: Agent[] = [
  {
    id: "general",
    icon: "◈",
    name: "Geral",
    prompt: "Você é Hokmá AI, assistente inteligente e direto do ecossistema Hokmá. Responda em português brasileiro.",
    tips: ["O que é inteligência artificial?", "Explique machine learning de forma simples", "Tendências de IA em 2025"],
  },
  {
    id: "programmer",
    icon: "◧",
    name: "Código",
    prompt: "Você é engenheiro de software sênior do ecossistema Hokmá. Escreva código limpo, moderno e bem estruturado. Explique decisões técnicas. Responda em português brasileiro.",
    tips: ["FastAPI + SQLite: estrutura básica", "Como usar asyncio em Python?", "Docker multi-stage build otimizado"],
  },
  {
    id: "arquiteto",
    icon: "◫",
    name: "Arquiteto",
    prompt: "Você é Arquiteto de Software sênior no ecossistema Hokmá. Projete sistemas escaláveis. Use diagramas ASCII quando útil. Responda em português brasileiro.",
    tips: ["Arquitetura para assistente IA local", "Explique padrão RAG com exemplos", "Microsserviços vs monolito: quando usar?"],
  },
  {
    id: "devops",
    icon: "◪",
    name: "DevOps",
    prompt: "Você é engenheiro DevOps expert em Linux, Docker, CI/CD, Kubernetes e Ollama. Forneça comandos prontos para uso. Responda em português brasileiro.",
    tips: ["Instalar e configurar Ollama no Linux", "Dockerfile otimizado para FastAPI", "Configurar GPU no Docker para IA"],
  },
  {
    id: "writer",
    icon: "◩",
    name: "Escritor",
    prompt: "Você é escritor criativo e profissional. Crie textos envolventes, refinados e com boa estrutura. Responda em português brasileiro.",
    tips: ["Abertura impactante para artigo técnico", "Como estruturar documentação clara?", "Post técnico para LinkedIn sobre IA"],
  },
];

export const STORE_KEY = "hokma_v2_config";

export const loadConfig = (): Partial<{ providerId: string; modelId: string; apiKeys: Record<string, string> }> => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveConfig = (cfg: object) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
  } catch {}
};
