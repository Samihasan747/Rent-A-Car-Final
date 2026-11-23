import { Skeleton } from '@/components/ui/skeleton'

export function CarCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm">
      {/* Upper image skeleton */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-muted/40 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex h-full items-center justify-center pt-2">
          <Skeleton className="h-20 w-44 rounded-xl" />
        </div>
      </div>

      {/* Header skeleton */}
      <div className="p-5 pb-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-2 h-5 w-36" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-5 pt-0 pb-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="mt-3 h-3 w-40" />
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-border/80 p-4 pt-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}
