import { Bell, BellOff, ExternalLink } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import {
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
} from "../../lib/notifications";
import { SecondaryButton } from "../forms/FormField";

const MAC_NOTIFICATIONS_SETTINGS =
  "x-apple.systempreferences:com.apple.Notifications-Settings.extension";

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(notificationsEnabled());
  const [status, setStatus] = useState("");

  const toggle = async () => {
    if (enabled) {
      setNotificationsEnabled(false);
      setEnabled(false);
      setStatus("Notifications disabled.");
      return;
    }

    const result = await requestNotificationPermission();
    if (result === "granted") {
      setEnabled(true);
      setStatus("Notifications enabled — reminders for standups and weekly reviews.");
      return;
    }

    setEnabled(false);
    if (result === "unsupported") {
      setStatus("Notifications are not available in this environment.");
      return;
    }

    setStatus(
      "Permission denied. Open macOS System Settings → Notifications, find Foundry Engagement Kit, and allow alerts. Then click Enable again.",
    );
  };

  const openMacNotificationSettings = async () => {
    try {
      await api.openUrl(MAC_NOTIFICATIONS_SETTINGS);
    } catch {
      setStatus("Open System Settings → Notifications and enable Foundry Engagement Kit.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-body">
        Desktop reminders when standups or weekly reviews are overdue (checks every 30 minutes).
      </p>
      <p className="text-xs text-fg-muted">
        If you run from <code className="text-brand-300">npm run tauri dev</code>, macOS may list
        the app under your terminal (Cursor, iTerm, etc.) until you use the built{" "}
        <code className="text-brand-300">.app</code> from{" "}
        <code className="text-brand-300">npm run tauri:build</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={toggle}>
          <span className="inline-flex items-center gap-2">
            {enabled ? <Bell size={14} /> : <BellOff size={14} />}
            {enabled ? "Disable notifications" : "Enable notifications"}
          </span>
        </SecondaryButton>
        <SecondaryButton onClick={openMacNotificationSettings}>
          <span className="inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Open macOS notification settings
          </span>
        </SecondaryButton>
      </div>
      {status && <p className="text-sm text-fg-muted">{status}</p>}
    </div>
  );
}
