"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RavenMark from "./RavenMark";
import { useCinemaMode } from "./providers/CinemaModeProvider";

interface NavItem {
  href: string;
  label: string;
  icon: JSX.Element;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const icon = {
  home: (
    <path d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
  ),
  library: (
    <>
      <rect x="3" y="4" width="6" height="16" rx="1.5" />
      <rect x="11" y="4" width="6" height="16" rx="1.5" />
      <path d="M19 7.5 22 8l-2 12-3-.5" />
    </>
  ),
  literary: <path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />,
  emotion: <path d="M20.5 8.5c0 5-8.5 10.5-8.5 10.5S3.5 13.5 3.5 8.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z" />,
  storyboard: (
    <>
      <rect x="2.5" y="5" width="8" height="6" rx="1" />
      <rect x="13" y="5" width="8" height="6" rx="1" />
      <rect x="2.5" y="13" width="8" height="6" rx="1" />
      <rect x="13" y="13" width="8" height="6" rx="1" />
    </>
  ),
  director: (
    <>
      <path d="M3 7.5 8 10v4l-5 2.5v-9Z" />
      <rect x="8" y="6" width="13" height="12" rx="1.5" />
    </>
  ),
  prompt: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  production: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.2 2" /></>,
  timeline: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M8 6v12M16 6v12" /></>,
  assets: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <circle cx="8.3" cy="9.5" r="1.6" />
      <path d="m4 17 5-5 3.5 3.5L17 10l4 4.5" />
    </>
  ),
  quality: <><path d="M12 3 3.5 6.5v6c0 4.5 3.5 7.5 8.5 9 5-1.5 8.5-4.5 8.5-9v-6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  audience: <><path d="M8 10a4 4 0 1 1 8 0c0 2-1 3-2 4H10c-1-1-2-2-2-4Z" /><path d="M10 17.5h4M11 20.5h2" /></>,
  export: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  projects: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>,
  character: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
  world: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.8 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.8-3.5-9s1-6.5 3.5-9Z" /></>,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2.1 2.1 0 1 1-2.96 2.96l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.55v.17a2.1 2.1 0 1 1-4.2 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2.1 2.1 0 1 1-2.96-2.96l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.03H4.6a2.1 2.1 0 1 1 0-4.2h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.1 2.1 0 1 1 2.96-2.96l.06.06a1.7 1.7 0 0 0 1.87.34h.09A1.7 1.7 0 0 0 12 2.6v-.1a2.1 2.1 0 1 1 4.2 0v.09a1.7 1.7 0 0 0 1.03 1.55h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2.1 2.1 0 1 1 2.96 2.96l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1.03h.17a2.1 2.1 0 1 1 0 4.2h-.09a1.7 1.7 0 0 0-1.55 1.1Z" />
    </>
  ),
};

const groups: NavGroup[] = [
  {
    title: "Estúdio",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: icon.home },
      { href: "/projects", label: "Projetos", icon: icon.projects },
      { href: "/library", label: "Biblioteca", icon: icon.library },
    ],
  },
  {
    title: "Direção Criativa",
    items: [
      { href: "/literary-director", label: "Literary Director", icon: icon.literary },
      { href: "/emotion-engine", label: "Emotion Engine", icon: icon.emotion },
      { href: "/character-engine", label: "Character Engine", icon: icon.character },
      { href: "/world-builder", label: "World Builder", icon: icon.world },
      { href: "/storyboard", label: "Storyboard", icon: icon.storyboard },
      { href: "/director", label: "Director Engine", icon: icon.director },
      { href: "/prompt-builder", label: "Prompt Builder", icon: icon.prompt },
    ],
  },
  {
    title: "Produção",
    items: [
      { href: "/production", label: "Produção", icon: icon.production },
      { href: "/timeline", label: "Timeline", icon: icon.timeline },
      { href: "/assets", label: "Assets", icon: icon.assets },
      { href: "/quality-director", label: "AZ Quality Director", icon: icon.quality },
      { href: "/audience-intelligence", label: "Audience Intelligence", icon: icon.audience },
      { href: "/export", label: "Exportação", icon: icon.export },
    ],
  },
  {
    title: "Sistema",
    items: [{ href: "/settings", label: "Configurações", icon: icon.settings }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, cinemaMode } = useCinemaMode();

  return (
    <aside
      className={[
        "sticky top-0 flex h-screen flex-col border-r border-border bg-gradient-to-b from-panel to-[#12161d]",
        "transition-[width,opacity] duration-200 ease-az",
        sidebarCollapsed ? "w-[76px]" : "w-[252px]",
        cinemaMode ? "opacity-60 hover:opacity-100" : "opacity-100",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-[22px]">
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-accentSoftStrong bg-gradient-to-br from-[#1c2230] to-[#11141a]">
          <RavenMark className="h-[19px] w-[19px]" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <div className="text-[15px] font-bold tracking-wide text-white">AZ RAVEN</div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-textSecondary">
              Toda arte busca a perfeição
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {groups.map((group) => (
          <div key={group.title}>
            {!sidebarCollapsed && (
              <div className="px-3 pb-2 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-textTertiary">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "mb-0.5 flex items-center gap-3 rounded-sm border px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 ease-az",
                    active
                      ? "border-[rgba(212,175,55,0.22)] bg-accentSoft text-accent"
                      : "border-transparent text-textSecondary hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={["h-[18px] w-[18px] flex-none", active ? "opacity-100" : "opacity-85"].join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.icon}
                  </svg>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 pb-4">
        <div className="flex items-center gap-2.5 rounded-sm border border-border bg-white/[0.03] px-2.5 py-2.5">
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#8a6f22] text-xs font-bold text-[#181008]">
            CM
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="text-[12.5px] font-semibold text-white">Cauê Martins</div>
              <div className="text-[10.5px] text-textTertiary">Diretor Criativo</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
