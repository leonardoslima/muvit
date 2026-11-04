import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrintableReportLoading() {
  return (
    <output aria-label="Preparando versão para impressão" className="flex flex-col gap-7">
      <span className="sr-only">Preparando versão para impressão</span>
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Card>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </Card>
    </output>
  );
}
