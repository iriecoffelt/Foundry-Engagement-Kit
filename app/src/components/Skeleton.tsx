interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-surface-elevated ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className = "", lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-xl border border-surface-border bg-surface-input p-3 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function DeliveryBoardSkeleton() {
  const columns = 5;
  const cardsPerColumn = [2, 3, 2, 1, 2];

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-44 rounded-xl" />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-5">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="flex min-h-[12rem] flex-col rounded-2xl border border-surface-border bg-surface-base/40 p-3 ring-1 ring-[rgb(var(--ring-subtle)/0.03)]"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <div className="flex min-h-[8rem] flex-1 flex-col gap-2.5">
                  {Array.from({ length: cardsPerColumn[colIndex] }).map((_, cardIndex) => (
                    <SkeletonCard key={cardIndex} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 card-kit p-4">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 flex-1 min-w-[12rem] rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-kit p-3 text-center">
              <Skeleton className="mx-auto h-8 w-8 mb-2" />
              <Skeleton className="mx-auto h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-2">
          <Skeleton className="h-6 w-36 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-kit flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1 text-right">
                  <Skeleton className="ml-auto h-3 w-20" />
                  <Skeleton className="ml-auto h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
