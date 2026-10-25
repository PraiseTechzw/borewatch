import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

/** Consistent, accessible loading treatment for workspace bootstrap and data refreshes. */
export function WorkspaceLoading({ compact = false, label = "Loading your secure workspace" }: { compact?: boolean; label?: string }) {
  if (compact) {
    return (
      <Card role="status" aria-label={label} className="mb-4 gap-4 border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Spinner className="size-[18px]" /></span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-foreground">{label}</span><span className="hidden text-xs text-muted-foreground sm:inline">This usually takes a moment</span></div>
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[248px_minmax(0,1fr)]" role="status" aria-label={label}>
      <aside className="relative hidden border-r border-border/70 bg-card p-5 md:block">
        <div className="mb-8 flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-2 w-36" /></div></div>
        <div className="mb-7 space-y-2">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className={`h-10 rounded-lg ${index === 0 ? "bg-primary/10" : ""}`} />)}</div>
        <div className="absolute bottom-5 left-5 right-auto flex w-[205px] items-center gap-3"><Skeleton className="size-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-2 w-32" /></div></div>
      </aside>
      <main className="min-w-0 p-4 sm:p-7 lg:p-10">
        <div className="mb-9 flex items-center justify-between border-b border-border/60 pb-5"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-44" /></div><Skeleton className="h-9 w-28 rounded-lg" /></div>
        <div className="mb-5 flex items-end justify-between gap-4"><div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-3 w-72 max-w-full" /></div><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Spinner />{label}</span></div>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index} className="gap-4 border-border/80 p-5 shadow-sm"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-2 w-32" /></Card>)}</div>
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]"><Card className="gap-5 border-border/80 p-5 shadow-sm"><Skeleton className="h-4 w-40" /><Skeleton className="h-64 w-full rounded-xl" /></Card><Card className="gap-5 border-border/80 p-5 shadow-sm"><Skeleton className="h-4 w-36" />{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full rounded-lg" />)}</Card></div>
      </main>
    </div>
  );
}
