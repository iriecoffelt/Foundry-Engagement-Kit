import { createContext, useContext, type ReactNode } from "react";
import { useFocusTimer } from "../hooks/useFocusTimer";

type FocusTimerContextValue = ReturnType<typeof useFocusTimer>;

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const value = useFocusTimer();
  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimerContext() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error("useFocusTimerContext must be used within FocusTimerProvider");
  return ctx;
}
