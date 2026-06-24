import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import {
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
} from "../../lib/notifications";
import { SecondaryButton } from "../forms/FormField";

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
    const ok = await requestNotificationPermission();
    setEnabled(ok);
    setStatus(
      ok
        ? "Notifications enabled — you'll get reminders for standups and weekly reviews."
        : "Permission denied. Enable notifications in System Settings.",
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-body">
        Desktop reminders when standups or weekly reviews are overdue (checks every 30 minutes).
      </p>
      <SecondaryButton onClick={toggle}>
        <span className="inline-flex items-center gap-2">
          {enabled ? <Bell size={14} /> : <BellOff size={14} />}
          {enabled ? "Disable notifications" : "Enable notifications"}
        </span>
      </SecondaryButton>
      {status && <p className="text-sm text-fg-muted">{status}</p>}
    </div>
  );
}
