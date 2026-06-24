import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useFocusTimer } from "../hooks/useFocusTimer";

type FocusTimerApi = ReturnType<typeof useFocusTimer>;

interface FocusTimerStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
  getApi(): FocusTimerApi;
  _assign(next: FocusTimerApi): void;
  _publish(next: FocusTimerApi): void;
}

function createStore(): FocusTimerStore {
  let version = 0;
  const listeners = new Set<() => void>();
  let api = null as unknown as FocusTimerApi;

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return version;
    },
    getApi() {
      return api;
    },
    _assign(next) {
      api = next;
    },
    _publish(next) {
      api = next;
      version += 1;
      listeners.forEach((l) => l());
    },
  };
}

const FocusTimerContext = createContext<FocusTimerStore | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const timer = useFocusTimer();
  const storeRef = useRef<FocusTimerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStore();
  }

  storeRef.current._assign(timer);

  useLayoutEffect(() => {
    storeRef.current!._publish(timer);
  }, [
    timer.state.secondsRemaining,
    timer.state.status,
    timer.state.sessionType,
    timer.isActive,
    timer.progress,
    timer.completedFlash,
  ]);

  return (
    <FocusTimerContext.Provider value={storeRef.current}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimerContext(): FocusTimerApi {
  const store = useContext(FocusTimerContext);
  if (!store) throw new Error("useFocusTimerContext must be used within FocusTimerProvider");
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  return store.getApi();
}
