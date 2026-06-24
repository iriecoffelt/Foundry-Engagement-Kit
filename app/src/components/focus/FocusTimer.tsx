import {
  Coffee,
  Minimize2,
  Pause,
  RotateCcw,
  Settings2,
  SkipForward,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectMeta } from "../../types";
import { formatTime } from "../../lib/focusTimer";
import { useFocusTimerContext } from "../../context/FocusTimerContext";
import { SelectInput } from "../forms/FormField";

interface FocusTimerProps {
  projects: ProjectMeta[];
  onExit: () => void;
}

const SESSION_LABELS = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
} as const;

export function FocusTimer({ projects, onExit }: FocusTimerProps) {
  const {
    settings,
    state,
    completedFlash,
    progress,
    start,
    pause,
    reset,
    skip,
    setSessionType,
    setProjectSlug,
    updateSettings,
    requestNotificationPermission,
  } = useFocusTimerContext();

  const [showSettings, setShowSettings] = useState(false);
  const isBreak = state.sessionType !== "focus";
  const isRunning = state.status === "running";

  useEffect(() => {
    requestNotificationPermission();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " && !showSettings) {
        e.preventDefault();
        if (isRunning) pause();
        else start();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit, isRunning, pause, start, showSettings]);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className={`focus-timer-screen ${isBreak ? "focus-timer-break" : "focus-timer-focus"}`}
    >
      <div className="focus-timer-orb focus-timer-orb-1" />
      <div className="focus-timer-orb focus-timer-orb-2" />
      <div className="focus-timer-orb focus-timer-orb-3" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <Timer className="text-brand-400" size={22} />
          <span className="text-sm font-medium tracking-wide text-fg-secondary">Focus mode</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-2.5 text-fg-secondary transition hover:bg-white/5 hover:text-fg-primary"
            title="Settings"
          >
            <Settings2 size={20} />
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-secondary transition hover:bg-white/5 hover:text-fg-primary"
            title="Minimize (Esc)"
          >
            <Minimize2 size={18} />
            Minimize
          </button>
        </div>
      </header>

      {completedFlash && (
        <div className="focus-timer-flash relative z-20 mx-auto mt-4 w-fit rounded-full bg-brand-600/90 px-6 py-2 text-sm font-medium text-fg-on-accent shadow-lg shadow-brand-900/50">
          {completedFlash}
        </div>
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="mb-8 flex gap-2 rounded-full bg-surface-raised/60 p-1 backdrop-blur-sm">
          {(["focus", "shortBreak", "longBreak"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSessionType(type)}
              disabled={isRunning}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                state.sessionType === type
                  ? isBreak && type !== "focus"
                    ? "bg-emerald-600 text-fg-primary"
                    : "bg-brand-600 text-fg-on-accent"
                  : "text-fg-secondary hover:text-fg-primary disabled:opacity-40"
              }`}
            >
              {SESSION_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="focus-timer-ring-wrap relative">
          <svg className="focus-timer-ring -rotate-90" width="280" height="280" viewBox="0 0 280 280">
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-fg-faint/80"
            />
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`focus-timer-progress ${isBreak ? "text-emerald-400" : "text-brand-400"}`}
            />
          </svg>
          <div className="focus-timer-display absolute inset-0 flex flex-col items-center justify-center">
            <span className="focus-timer-digits font-mono text-7xl font-light tracking-tight text-fg-primary">
              {formatTime(state.secondsRemaining)}
            </span>
            <span className="mt-2 text-sm uppercase tracking-widest text-fg-muted">
              {SESSION_LABELS[state.sessionType]}
            </span>
            {state.status === "paused" && (
              <span className="mt-1 text-xs text-amber-400/90">Paused</span>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl border border-surface-border-strong/80 bg-surface-raised/50 p-4 text-fg-secondary transition hover:border-surface-border-strong hover:text-fg-primary"
            title="Reset"
          >
            <RotateCcw size={22} />
          </button>
          {isRunning ? (
            <button
              onClick={pause}
              className="focus-timer-main-btn flex items-center gap-3 rounded-2xl bg-brand-600 px-10 py-4 text-lg font-medium text-fg-on-accent shadow-lg shadow-brand-900/40 transition hover:bg-brand-500"
            >
              <Pause size={24} />
              Pause
            </button>
          ) : (
            <button
              onClick={start}
              className={`focus-timer-main-btn flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-medium text-fg-primary shadow-lg transition ${
                isBreak
                  ? "bg-emerald-600 shadow-emerald-900/40 hover:bg-emerald-500"
                  : "bg-brand-600 shadow-brand-900/40 hover:bg-brand-500"
              }`}
            >
              {isBreak ? <Coffee size={24} /> : <Zap size={24} />}
              {state.status === "paused" ? "Resume" : "Start"}
            </button>
          )}
          <button
            onClick={skip}
            className="rounded-xl border border-surface-border-strong/80 bg-surface-raised/50 p-4 text-fg-secondary transition hover:border-surface-border-strong hover:text-fg-primary"
            title="Skip to next session"
          >
            <SkipForward size={22} />
          </button>
        </div>

        <div className="mt-8 w-full max-w-xs">
          <label className="block text-center text-xs text-fg-muted">Working on (optional)</label>
          <SelectInput
            value={state.projectSlug}
            onChange={setProjectSlug}
            options={[
              { value: "", label: "No project linked" },
              ...projects.map((p) => ({
                value: p.slug,
                label: p.display_name,
              })),
            ]}
          />
        </div>

        <p className="mt-6 text-xs text-fg-faint">
          Session {state.completedFocusSessions} completed · Space to start/pause · Esc to minimize
        </p>
      </main>

      {showSettings && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-surface-border-strong bg-surface-raised p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fg-primary">Timer settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-fg-secondary hover:text-fg-primary">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <SettingRow
                label="Focus (minutes)"
                value={settings.focusMinutes}
                onChange={(v) => updateSettings({ focusMinutes: v })}
              />
              <SettingRow
                label="Short break (minutes)"
                value={settings.shortBreakMinutes}
                onChange={(v) => updateSettings({ shortBreakMinutes: v })}
              />
              <SettingRow
                label="Long break (minutes)"
                value={settings.longBreakMinutes}
                onChange={(v) => updateSettings({ longBreakMinutes: v })}
              />
              <SettingRow
                label="Sessions until long break"
                value={settings.sessionsUntilLongBreak}
                onChange={(v) => updateSettings({ sessionsUntilLongBreak: v })}
                min={2}
                max={8}
              />
              <ToggleRow
                label="Auto-start breaks"
                checked={settings.autoStartBreaks}
                onChange={(v) => updateSettings({ autoStartBreaks: v })}
              />
              <ToggleRow
                label="Auto-start focus after break"
                checked={settings.autoStartFocus}
                onChange={(v) => updateSettings({ autoStartFocus: v })}
              />
              <ToggleRow
                label="Sound on complete"
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  min = 1,
  max = 60,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-fg-body">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-lg border border-surface-border-strong bg-surface-base px-3 py-1.5 text-center text-fg-primary"
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm text-fg-body">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand-600" : "bg-surface-subtle"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
