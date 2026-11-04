import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <output aria-label="Carregando relatório" className="flex flex-col gap-7">
      <span className="sr-only">Carregando relatório</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card>
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-64 w-full" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['a', 'b', 'c', 'd'].map((key) => (
          <Card key={key}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>
    </output>
  );
}
