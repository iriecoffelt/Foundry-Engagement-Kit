import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface HubLayoutProps {
  children: ReactNode;
}

export function HubLayout({ children }: HubLayoutProps) {
  return <div className="flex h-full min-h-0">{children}</div>;
}

interface HubSidebarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function HubSidebar({ title, subtitle, actions, footer, children }: HubSidebarProps) {
  return (
    <aside className="hub-sidebar">
      <div className="hub-sidebar-header">
        <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
        {actions && <div className="mt-3">{actions}</div>}
      </div>
      <div className="hub-sidebar-body">{children}</div>
      {footer && <div className="hub-sidebar-footer">{footer}</div>}
    </aside>
  );
}

interface HubMainProps {
  header?: ReactNode;
  children: ReactNode;
}

export function HubMain({ header, children }: HubMainProps) {
  return (
    <div className="hub-main">
      {header && <div className="hub-main-header">{header}</div>}
      <div className="hub-main-body">{children}</div>
    </div>
  );
}

interface HubSectionProps {
  label: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}

export function HubSection({ label, icon: Icon, action, children }: HubSectionProps) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="hub-section-label mb-0 flex items-center gap-1.5 px-0">
          {Icon && <Icon size={12} />}
          {label}
        </p>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface HubItemProps {
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function HubItem({ selected, onClick, children, className = "" }: HubItemProps) {
  return (
    <button
      onClick={onClick}
      className={`hub-item ${selected ? "hub-item-active" : "hub-item-inactive"} ${className}`}
    >
      {children}
    </button>
  );
}

interface HubEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function HubEmpty({ icon: Icon, title, description, action, compact }: HubEmptyProps) {
  return (
    <div className={compact ? "hub-empty-compact" : "hub-empty"}>
      <Icon size={compact ? 28 : 40} className="text-fg-faint" strokeWidth={1.5} />
      <div>
        <p className={`font-medium text-fg-secondary ${compact ? "text-sm" : ""}`}>{title}</p>
        {description && (
          <p className={`mt-1 text-fg-muted ${compact ? "text-xs" : "text-sm"}`}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface HubMainTitleProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function HubMainTitle({ title, subtitle, actions }: HubMainTitleProps) {
  return (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg-primary">{title}</p>
        {subtitle && <p className="truncate text-xs text-fg-muted">{subtitle}</p>}
      </div>
      {actions}
    </>
  );
}
