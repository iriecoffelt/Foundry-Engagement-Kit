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
import type { Section } from "../types";
import { AppBrand } from "./AppBrand";
import { ShortcutKbd } from "./ShortcutKbd";
import { Tooltip } from "./Tooltip";

interface SidebarProps {
  section: Section;
  onSectionChange: (section: Section) => void;
  workspaceRoot: string;
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

export function Sidebar({
  section,
  onSectionChange,
  workspaceRoot,
  onRefresh,
  onOpenCommandPalette,
}: SidebarProps) {
  const shortRoot = workspaceRoot.split(/[/\\]/).filter(Boolean).slice(-2).join("/");

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
