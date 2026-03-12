import { LoadingState } from "@/components/ui/loading-state";

function LoadingSkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted/70" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <LoadingState
        title="Charting your next route"
        description="Loading dashboards, masters, and tour operations."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/70" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LoadingSkeletonCard />
        <LoadingSkeletonCard />
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 h-10 w-full animate-pulse rounded bg-muted/80" />
        <div className="space-y-3">
          <div className="h-12 w-full animate-pulse rounded bg-muted/70" />
          <div className="h-12 w-full animate-pulse rounded bg-muted/60" />
          <div className="h-12 w-full animate-pulse rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
