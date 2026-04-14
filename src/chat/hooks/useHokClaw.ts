import { useState, useCallback, useRef } from "react";
import type { Skill, HokClawStatus } from "../types";
import { DEFAULT_HOKCLAW_URL } from "../config";

export function useHokClaw(serverUrl?: string) {
  const baseUrl = (serverUrl || DEFAULT_HOKCLAW_URL).replace(/\/$/, "");
  const [status, setStatus] = useState<HokClawStatus>({ online: false });
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; label: string }[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [checking, setChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const checkHealth = useCallback(async (): Promise<HokClawStatus> => {
    setChecking(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const s: HokClawStatus = { online: true, version: data.version };
        setStatus(s);
        setChecking(false);
        return s;
      }
    } catch {
      // fall through
    }

    try {
      const res = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const s: HokClawStatus = { online: true };
        setStatus(s);
        setChecking(false);
        return s;
      }
    } catch {
      // fall through
    }

    const s: HokClawStatus = { online: false };
    setStatus(s);
    setChecking(false);
    return s;
  }, [baseUrl]);

  const fetchModels = useCallback(async (): Promise<{ id: string; label: string }[]> => {
    try {
      const res = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list: { id: string; label: string }[] = (data.data || data.models || []).map(
        (m: { id?: string; name?: string }) => ({
          id: m.id || m.name || "",
          label: m.id || m.name || "",
        })
      );
      if (list.length > 0) {
        setDiscoveredModels(list);
        setStatus(prev => ({ ...prev, online: true, models: list.map(m => m.id) }));
      }
      return list;
    } catch {
      return [];
    }
  }, [baseUrl]);

  const fetchSkills = useCallback(async (): Promise<Skill[]> => {
    try {
      const res = await fetch(`${baseUrl}/v1/skills`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list: Skill[] = (data.skills || data.data || []).map(
        (s: { id?: string; name?: string; description?: string; icon?: string; category?: string }) => ({
          id: s.id || s.name || "",
          name: s.name || s.id || "",
          description: s.description || "",
          icon: s.icon,
          category: s.category,
        })
      );
      setSkills(list);
      return list;
    } catch {
      return [];
    }
  }, [baseUrl]);

  const probeAndLoad = useCallback(async () => {
    const s = await checkHealth();
    if (s.online) {
      await Promise.all([fetchModels(), fetchSkills()]);
    }
  }, [checkHealth, fetchModels, fetchSkills]);

  return {
    status,
    checking,
    discoveredModels,
    skills,
    checkHealth,
    fetchModels,
    fetchSkills,
    probeAndLoad,
  };
}
