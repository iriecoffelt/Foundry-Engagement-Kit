export interface DebouncedSaver<T> {
  schedule(value: T): void;
  flush(value?: T): Promise<void>;
  cancel(): void;
}

export function createDebouncedSaver<T>(options: {
  delayMs?: number;
  save: (value: T) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
  onSaved?: (value: T) => void;
}): DebouncedSaver<T> {
  const delayMs = options.delayMs ?? 400;
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;

  const runSave = async () => {
    if (pending === null) return;
    const value = pending;
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (saving) {
      timer = setTimeout(() => void runSave(), delayMs);
      return;
    }
    saving = true;
    options.onSavingChange?.(true);
    try {
      await options.save(value);
      options.onSaved?.(value);
    } finally {
      saving = false;
      options.onSavingChange?.(false);
      if (pending !== null) {
        timer = setTimeout(() => void runSave(), delayMs);
      }
    }
  };

  return {
    schedule(value: T) {
      pending = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void runSave(), delayMs);
    },
    async flush(value?: T) {
      if (value !== undefined) pending = value;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await runSave();
    },
    cancel() {
      pending = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
