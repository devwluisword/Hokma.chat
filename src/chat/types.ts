export interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  freeNote: string;
  apiUrl: string;
  keyPlaceholder?: string;
  keyLink?: string;
  noKey?: boolean;
  models: { id: string; label: string }[];
}

export interface Agent {
  id: string;
  icon: string;
  name: string;
  prompt: string;
  tips: string[];
}

export interface Message {
  id: number;
  role: "user" | "ai";
  content: string;
  agentId?: string;
  streaming?: boolean;
  error?: boolean;
}

export interface AppConfig {
  providerId: string;
  modelId: string;
  apiKeys: Record<string, string>;
}
