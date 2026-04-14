import type { Skill } from "../types";

interface SkillsPanelProps {
  skills: Skill[];
  activeSkillId: string | null;
  onSelectSkill: (skillId: string | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  deploy: "#0F62FE",
  infra: "#059669",
  code: "#D97706",
  monitor: "#DC2626",
  default: "#6B7280",
};

const SKILL_ICONS: Record<string, string> = {
  deploy: "deploy",
  check_services: "check",
  build: "build",
  monitor: "monitor",
};

function SkillIcon({ skillId, size = 14 }: { skillId: string; size?: number }) {
  const type = SKILL_ICONS[skillId] || "skill";
  const icons: Record<string, JSX.Element> = {
    deploy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    build: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    monitor: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    skill: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93L4.93 19.07M4.93 4.93l14.14 14.14" />
      </svg>
    ),
  };
  return icons[type] || icons.skill;
}

export function SkillsPanel({ skills, activeSkillId, onSelectSkill }: SkillsPanelProps) {
  if (skills.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      overflowX: "auto", scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
      paddingBottom: 2,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: "#9CA3AF",
        textTransform: "uppercase", letterSpacing: "0.8px",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        Skills
      </span>

      <button
        onClick={() => onSelectSkill(null)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "5px 12px", borderRadius: 9999,
          border: `1.5px solid ${activeSkillId === null ? "#111827" : "#E5E7EB"}`,
          background: activeSkillId === null ? "#111827" : "#fff",
          color: activeSkillId === null ? "#fff" : "#6B7280",
          fontSize: 11.5, fontWeight: 600, cursor: "pointer",
          whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
          transition: "all 0.15s",
        }}>
        Livre
      </button>

      {skills.map(skill => {
        const color = CATEGORY_COLORS[skill.category || ""] || CATEGORY_COLORS.default;
        const isActive = activeSkillId === skill.id;
        return (
          <button
            key={skill.id}
            title={skill.description}
            onClick={() => onSelectSkill(isActive ? null : skill.id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 9999,
              border: `1.5px solid ${isActive ? color : "#E5E7EB"}`,
              background: isActive ? color + "15" : "#fff",
              color: isActive ? color : "#6B7280",
              fontSize: 11.5, fontWeight: 600, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
              transition: "all 0.15s",
            }}>
            <span style={{ color: isActive ? color : "#9CA3AF" }}>
              <SkillIcon skillId={skill.id} size={12} />
            </span>
            {skill.name}
          </button>
        );
      })}
    </div>
  );
}
