import { PanelLeft, PanelLeftClose } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SlideOverBackdrop } from "../SlideOverBackdrop";

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
  /** Sidebar visibility — drawer on mobile; also hides on desktop when collapsibleOnDesktop. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Allow collapsing the sidebar on lg+ screens (Documents tab). */
  collapsibleOnDesktop?: boolean;
}

export function HubSidebar({
  title,
  subtitle,
  actions,
  footer,
  children,
  open = true,
  onOpenChange,
  collapsibleOnDesktop = false,
}: HubSidebarProps) {
  const drawer = onOpenChange !== undefined;
  const showMobileDrawer = drawer && open;

  return (
    <>
      {showMobileDrawer && <SlideOverBackdrop onClose={() => onOpenChange(false)} />}
      <aside
        className={`hub-sidebar ${drawer ? "hub-sidebar-drawer" : ""} ${
          drawer && !open ? "hub-sidebar-drawer-closed" : ""
        } ${collapsibleOnDesktop && !open ? "hub-sidebar-desktop-collapsed" : ""}`}
      >
        <div className="hub-sidebar-header">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
            </div>
            {collapsibleOnDesktop && onOpenChange && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="hidden shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-surface-elevated hover:text-fg-primary lg:inline-flex"
                title="Hide sidebar"
                aria-label="Hide sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
          {actions && <div className="mt-3">{actions}</div>}
        </div>
        <div className="hub-sidebar-body">{children}</div>
        {footer && <div className="hub-sidebar-footer">{footer}</div>}
      </aside>
    </>
  );
}

export function HubSidebarToggle({
  onClick,
  showOnDesktop = false,
}: {
  onClick: () => void;
  showOnDesktop?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border border-surface-border-strong p-2 text-fg-secondary hover:text-fg-primary ${
        showOnDesktop ? "" : "lg:hidden"
      }`}
      title="Show sidebar"
      aria-label="Show sidebar"
    >
      <PanelLeft size={16} />
    </button>
  );
}

interface HubMainProps {
  header?: ReactNode;
  children: ReactNode;
  onOpenSidebar?: () => void;
  /** Show sidebar toggle on desktop when the sidebar is collapsed. */
  sidebarToggleOnDesktop?: boolean;
}

export function HubMain({ header, children, onOpenSidebar, sidebarToggleOnDesktop }: HubMainProps) {
  const showBar = Boolean(header || onOpenSidebar);

  return (
    <div className="hub-main">
      {showBar && (
        <div className="hub-main-header">
          {onOpenSidebar && (
            <HubSidebarToggle
              onClick={onOpenSidebar}
              showOnDesktop={sidebarToggleOnDesktop}
            />
          )}
          {header}
        </div>
      )}
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
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg-primary">{title}</p>
        {subtitle && <p className="truncate text-xs text-fg-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
