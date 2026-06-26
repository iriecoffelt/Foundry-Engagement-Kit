import { useCallback, useEffect, useRef } from "react";
import { createDebouncedSaver, type DebouncedSaver } from "../lib/workspaceStore/debouncedSave";

export function useDebouncedPersist<T>(options: {
  delayMs?: number;
  save: (value: T) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
  onSaved?: (value: T) => void;
}) {
  const saveRef = useRef(options.save);
  const onSavingChangeRef = useRef(options.onSavingChange);
  const onSavedRef = useRef(options.onSaved);
  saveRef.current = options.save;
  onSavingChangeRef.current = options.onSavingChange;
  onSavedRef.current = options.onSaved;

  const saverRef = useRef<DebouncedSaver<T> | null>(null);
  if (!saverRef.current) {
    saverRef.current = createDebouncedSaver<T>({
      delayMs: options.delayMs,
      save: (value) => saveRef.current(value),
      onSavingChange: (saving) => onSavingChangeRef.current?.(saving),
      onSaved: (value) => onSavedRef.current?.(value),
    });
  }

  const schedule = useCallback((value: T) => {
    saverRef.current?.schedule(value);
  }, []);

  const flushNow = useCallback(async (value?: T) => {
    await saverRef.current?.flush(value);
  }, []);

  useEffect(() => {
    const saver = saverRef.current;
    return () => {
      void saver?.flush();
    };
  }, []);

  return { schedule, flushNow };
}
