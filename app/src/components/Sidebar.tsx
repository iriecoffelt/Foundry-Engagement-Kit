import {
  BarChart3,
  Calendar,
  CalendarDays,
  FolderKanban,
  Home,
  Library,
  RefreshCw,
  Search,
  Settings,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Section } from "../types";
import { loadFoundryConnection } from "../lib/foundryConnection";
import { AppBrand } from "./AppBrand";
import { ShortcutKbd } from "./ShortcutKbd";
import { Tooltip } from "./Tooltip";

interface SidebarProps {
  section: Section;
  onSectionChange: (section: Section) => void;
  workspaceRoot: string;
  projectPath?: string;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
}

type NavItem = { id: Section; label: string; icon: LucideIcon };

const workNav: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "portfolio", label: "Portfolio", icon: BarChart3 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "daily", label: "Daily", icon: Calendar },
  { id: "weekly", label: "Weekly", icon: CalendarDays },
];

const toolsNav: NavItem[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "search", label: "Search", icon: Search },
  { id: "focus", label: "Focus", icon: Timer },
];

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (id: Section) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}
    >
      <Icon size={18} strokeWidth={active ? 2.25 : 2} />
      {item.label}
    </button>
  );
}

function truncateStackName(stackUrl: string, maxLength = 24): string {
  try {
    const url = new URL(stackUrl);
    const hostname = url.hostname;
    if (hostname.length <= maxLength) return hostname;
    return hostname.slice(0, maxLength - 1) + "…";
  } catch {
    if (stackUrl.length <= maxLength) return stackUrl;
    return stackUrl.slice(0, maxLength - 1) + "…";
  }
}

export function Sidebar({
  section,
  onSectionChange,
  workspaceRoot,
  projectPath,
  onRefresh,
  onOpenCommandPalette,
}: SidebarProps) {
  const shortRoot = workspaceRoot.split(/[/\\]/).filter(Boolean).slice(-2).join("/");
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    stackName: string;
  }>({ connected: false, stackName: "" });

  useEffect(() => {
    if (!projectPath) {
      setConnectionStatus({ connected: false, stackName: "" });
      return;
    }

    let cancelled = false;

    async function checkConnection() {
      try {
        const conn = await loadFoundryConnection(projectPath!);
        if (cancelled) return;
        if (conn?.stackUrl && conn?.token) {
          setConnectionStatus({
            connected: true,
            stackName: truncateStackName(conn.stackUrl),
          });
        } else {
          setConnectionStatus({ connected: false, stackName: "" });
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus({ connected: false, stackName: "" });
        }
      }
    }

    void checkConnection();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  return (
    <aside className="app-sidebar">
      <div className="border-b border-surface-border px-4 pb-4 pt-5">
        <AppBrand />

        {workspaceRoot && (
          <div className="mt-4">
            <p className="app-workspace-label">Workspace</p>
            <div className="app-workspace-chip">
              <p
                className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-secondary"
                title={workspaceRoot}
              >
                {shortRoot}
              </p>
              <button
                onClick={onRefresh}
                title="Refresh workspace"
                className="shrink-0 rounded-md p-1 text-fg-muted transition hover:bg-surface-elevated hover:text-fg-body"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}

        {projectPath && (
          <div className="mt-3">
            <Tooltip
              content={
                connectionStatus.connected
                  ? `Connected to Foundry stack: ${connectionStatus.stackName}`
                  : "Not connected to Foundry — configure in project settings"
              }
              position="right"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    connectionStatus.connected
                      ? "bg-green-400"
                      : "bg-surface-border"
                  }`}
                />
                <span
                  className={`truncate ${
                    connectionStatus.connected
                      ? "text-green-400"
                      : "text-fg-muted"
                  }`}
                >
                  {connectionStatus.connected
                    ? connectionStatus.stackName
                    : "Not connected"}
                </span>
              </div>
            </Tooltip>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="nav-section-label">Work</p>
        {workNav.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={section === item.id}
            onSelect={onSectionChange}
          />
        ))}

        <p className="nav-section-label">Tools</p>
        {toolsNav.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={section === item.id}
            onSelect={onSectionChange}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-surface-border p-3">
        <Tooltip content="Search projects, files, and quick actions" position="right">
          <button
            onClick={onOpenCommandPalette}
            className="nav-item nav-item-inactive justify-between"
          >
            <span className="flex items-center gap-3">
              <Search size={18} />
              Quick search
            </span>
            <ShortcutKbd keys="K" />
          </button>
        </Tooltip>
        <button
          onClick={() => onSectionChange("settings")}
          className={`nav-item ${section === "settings" ? "nav-item-active" : "nav-item-inactive"}`}
        >
          <Settings size={18} strokeWidth={section === "settings" ? 2.25 : 2} />
          Settings
        </button>
      </div>
    </aside>
  );
}
