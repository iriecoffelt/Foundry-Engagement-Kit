import {
  BookOpen,
  Calendar,
  CalendarDays,
  FolderKanban,
  Home,
  RefreshCw,
  Settings,
  Timer,
} from "lucide-react";
import type { Section } from "../types";

interface SidebarProps {
  section: Section;
  onSectionChange: (section: Section) => void;
  workspaceRoot: string;
  onRefresh: () => void;
}

const navItems: { id: Section; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "daily", label: "Daily", icon: Calendar },
  { id: "weekly", label: "Weekly", icon: CalendarDays },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ section, onSectionChange, workspaceRoot, onRefresh }: SidebarProps) {
  const shortRoot = workspaceRoot.split("/").slice(-2).join("/");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80">
      <div className="border-b border-slate-800 px-4 py-5">
        <h1 className="text-base font-bold leading-snug text-white">
          Foundry Engagement Kit
        </h1>
        <p className="mt-1 truncate text-xs text-slate-500" title={workspaceRoot}>
          {shortRoot}
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSectionChange(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              section === id
                ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          onClick={onRefresh}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
    </aside>
  );
}
