export function SectionFallback() {
  return (
    <div className="flex h-full min-h-[200px] flex-col gap-3 p-8">
      <div className="h-4 w-40 animate-pulse rounded-lg bg-surface-elevated/80" />
      <div className="h-3 w-64 animate-pulse rounded bg-surface-elevated/60" />
      <div className="mt-4 space-y-2">
        <div className="h-10 animate-pulse rounded-xl bg-surface-elevated/50" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-elevated/40" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-elevated/30" />
      </div>
    </div>
  );
}
