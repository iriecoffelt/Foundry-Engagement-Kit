import { Timer } from "lucide-react";
import { formatTime } from "../../lib/focusTimer";
import { useFocusTimerContext } from "../../context/FocusTimerContext";

interface FocusFloatingPillProps {
  onOpen: () => void;
}

export function FocusFloatingPill({ onOpen }: FocusFloatingPillProps) {
  const { state, isActive } = useFocusTimerContext();

  if (!isActive) return null;

  const isBreak = state.sessionType !== "focus";

  return (
    <button
      onClick={onOpen}
      className={`focus-floating-pill fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border px-5 py-3 shadow-xl backdrop-blur-md transition hover:scale-105 ${
        isBreak
          ? "border-emerald-600/40 bg-emerald-950/80 text-emerald-200"
          : "border-brand-600/40 bg-slate-900/90 text-brand-200"
      }`}
    >
      <Timer size={18} className={state.status === "running" ? "focus-pill-pulse" : ""} />
      <span className="font-mono text-lg">{formatTime(state.secondsRemaining)}</span>
      <span className="text-xs opacity-70">
        {state.status === "paused" ? "Paused" : isBreak ? "Break" : "Focus"}
      </span>
    </button>
  );
}
