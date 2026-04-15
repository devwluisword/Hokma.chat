export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
}

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
  supportsSkills?: boolean;
  supportsModelDiscovery?: boolean;
  isOrchestrator?: boolean;
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
  skillUsed?: string;
}

export interface AppConfig {
  providerId: string;
  modelId: string;
  apiKeys: Record<string, string>;
  serverUrls?: Record<string, string>;
}

export interface HokClawStatus {
  online: boolean;
  version?: string;
  models?: string[];
  skills?: Skill[];
}
