import { useCallback, useEffect, useRef, useState } from "react";
import {
  type FocusSettings,
  type FocusTimerState,
  type SessionType,
  loadSettings,
  loadTimerState,
  logSession,
  nextSessionType,
  notifySessionComplete,
  playCompletionChime,
  saveSettings,
  saveTimerState,
  sessionDurationSeconds,
} from "../lib/focusTimer";

function initialState(settings: FocusSettings): FocusTimerState {
  const saved = loadTimerState();
  if (saved && saved.status !== "idle") return saved;
  return {
    sessionType: "focus",
    status: "idle",
    secondsRemaining: sessionDurationSeconds("focus", settings),
    completedFocusSessions: saved?.completedFocusSessions ?? 0,
    projectSlug: saved?.projectSlug ?? "",
    startedAt: null,
  };
}

const DISK_SAVE_INTERVAL_MS = 10_000;

export function useFocusTimer() {
  const [settings, setSettings] = useState<FocusSettings>(loadSettings);
  const [state, setState] = useState<FocusTimerState>(() => initialState(loadSettings()));
  const [completedFlash, setCompletedFlash] = useState<string | null>(null);
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const lastDiskSaveRef = useRef(0);
  stateRef.current = state;
  settingsRef.current = settings;

  const persistToDisk = useCallback((next: FocusTimerState, force = false) => {
    const now = Date.now();
    if (!force && now - lastDiskSaveRef.current < DISK_SAVE_INTERVAL_MS) return;
    saveTimerState(next);
    lastDiskSaveRef.current = now;
  }, []);

  const persist = useCallback(
    (next: FocusTimerState, forceDisk = false) => {
      stateRef.current = next;
      setState(next);
      persistToDisk(next, forceDisk);
    },
    [persistToDisk],
  );

  useEffect(() => {
    return () => {
      saveTimerState(stateRef.current);
    };
  }, []);

  const completeSession = useCallback(() => {
    const current = stateRef.current;
    const cfg = settingsRef.current;
    const finishedType = current.sessionType;
    const durationMins =
      finishedType === "focus"
        ? cfg.focusMinutes
        : finishedType === "shortBreak"
          ? cfg.shortBreakMinutes
          : cfg.longBreakMinutes;

    if (finishedType === "focus") {
      logSession({
        type: "focus",
        durationMinutes: durationMins,
        projectSlug: current.projectSlug,
        completedAt: new Date().toISOString(),
      });
    }

    playCompletionChime(cfg.soundEnabled);
    notifySessionComplete(finishedType);
    setCompletedFlash(
      finishedType === "focus" ? "Great work — take a break" : "Break complete — let's focus",
    );
    setTimeout(() => setCompletedFlash(null), 4000);

    const newCompleted =
      finishedType === "focus" ? current.completedFocusSessions + 1 : current.completedFocusSessions;
    const nextType = nextSessionType(finishedType, current.completedFocusSessions, cfg);
    const nextSeconds = sessionDurationSeconds(nextType, cfg);
    const autoStart =
      (finishedType === "focus" && cfg.autoStartBreaks) ||
      (finishedType !== "focus" && cfg.autoStartFocus);

    persist(
      {
        sessionType: nextType,
        status: autoStart ? "running" : "idle",
        secondsRemaining: nextSeconds,
        completedFocusSessions: newCompleted,
        projectSlug: current.projectSlug,
        startedAt: autoStart ? Date.now() : null,
      },
      true,
    );
  }, [persist]);

  useEffect(() => {
    if (state.status !== "running") return;

    const id = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status !== "running") return;

      if (current.secondsRemaining <= 1) {
        completeSession();
        return;
      }

      persist({ ...current, secondsRemaining: current.secondsRemaining - 1 });
    }, 1000);

    return () => clearInterval(id);
  }, [state.status, completeSession, persist]);

  const start = useCallback(() => {
    const current = stateRef.current;
    const cfg = settingsRef.current;
    persist(
      {
        ...current,
        status: "running",
        startedAt: Date.now(),
        secondsRemaining:
          current.status === "idle"
            ? sessionDurationSeconds(current.sessionType, cfg)
            : current.secondsRemaining,
      },
      true,
    );
  }, [persist]);

  const pause = useCallback(() => {
    persist({ ...stateRef.current, status: "paused", startedAt: null }, true);
  }, [persist]);

  const reset = useCallback(() => {
    const current = stateRef.current;
    persist(
      {
        ...current,
        status: "idle",
        secondsRemaining: sessionDurationSeconds(current.sessionType, settingsRef.current),
        startedAt: null,
      },
      true,
    );
  }, [persist]);

  const skip = useCallback(() => {
    completeSession();
  }, [completeSession]);

  const setSessionType = useCallback(
    (type: SessionType) => {
      const current = stateRef.current;
      persist(
        {
          sessionType: type,
          status: "idle",
          secondsRemaining: sessionDurationSeconds(type, settingsRef.current),
          completedFocusSessions: current.completedFocusSessions,
          projectSlug: current.projectSlug,
          startedAt: null,
        },
        true,
      );
    },
    [persist],
  );

  const setProjectSlug = useCallback(
    (slug: string) => {
      persist({ ...stateRef.current, projectSlug: slug }, true);
    },
    [persist],
  );

  const updateSettings = useCallback((partial: Partial<FocusSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  const isActive = state.status === "running" || state.status === "paused";
  const totalSeconds = sessionDurationSeconds(state.sessionType, settings);
  const progress = totalSeconds > 0 ? 1 - state.secondsRemaining / totalSeconds : 0;

  return {
    settings,
    state,
    completedFlash,
    isActive,
    progress,
    totalSeconds,
    start,
    pause,
    reset,
    skip,
    setSessionType,
    setProjectSlug,
    updateSettings,
    requestNotificationPermission,
  };
}
