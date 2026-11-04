import { Skeleton } from '@/components/ui/skeleton';

export default function WorkoutsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando construtor de treino"
      className="flex min-h-0 flex-1 overflow-hidden bg-background max-lg:flex-col"
    >
      <aside
        aria-label="Detalhes do treino"
        className="flex w-80 shrink-0 flex-col gap-6 border-r border-border p-6 max-lg:w-full max-lg:border-r-0 max-lg:border-b"
      >
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="mt-auto h-10 w-full" />
      </aside>

      <section aria-label="Editor do treino" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    </main>
  );
}
