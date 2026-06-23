export type SessionType = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export interface FocusSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

export interface FocusTimerState {
  sessionType: SessionType;
  status: TimerStatus;
  secondsRemaining: number;
  completedFocusSessions: number;
  projectSlug: string;
  startedAt: number | null;
}

export interface FocusSessionLog {
  id: string;
  type: SessionType;
  durationMinutes: number;
  projectSlug: string;
  completedAt: string;
}

const SETTINGS_KEY = "fek-focus-settings";
const STATE_KEY = "fek-focus-state";
const LOG_KEY = "fek-focus-log";

export const DEFAULT_SETTINGS: FocusSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
};

export function loadSettings(): FocusSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: FocusSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadTimerState(): FocusTimerState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FocusTimerState;
  } catch {
    return null;
  }
}

export function saveTimerState(state: FocusTimerState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearTimerState() {
  localStorage.removeItem(STATE_KEY);
}

export function sessionDurationSeconds(type: SessionType, settings: FocusSettings): number {
  const mins =
    type === "focus"
      ? settings.focusMinutes
      : type === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return mins * 60;
}

export function nextSessionType(
  current: SessionType,
  completedFocusSessions: number,
  settings: FocusSettings,
): SessionType {
  if (current === "focus") {
    const nextCount = completedFocusSessions + 1;
    if (nextCount > 0 && nextCount % settings.sessionsUntilLongBreak === 0) {
      return "longBreak";
    }
    return "shortBreak";
  }
  return "focus";
}

export function logSession(entry: Omit<FocusSessionLog, "id">) {
  const logs = loadSessionLog();
  logs.unshift({ ...entry, id: `${Date.now()}` });
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 100)));
}

export function loadSessionLog(): FocusSessionLog[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as FocusSessionLog[]) : [];
  } catch {
    return [];
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function playCompletionChime(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    /* ignore */
  }
}

export function notifySessionComplete(type: SessionType) {
  const label =
    type === "focus" ? "Focus session complete — time for a break" : "Break over — ready to focus";
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Foundry Engagement Kit", { body: label });
  }
}
