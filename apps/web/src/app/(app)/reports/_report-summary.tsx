import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function ReportSummary({ summary }: { summary: string }) {
  return (
    <section aria-labelledby="report-summary-title" className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <Sparkles className="size-5 text-primary" />
        <h2 id="report-summary-title" className="font-display text-xl font-bold">
          Resumo e insights
        </h2>
      </div>
      <Card className="border border-success/20 bg-success/10 shadow-none">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" />
          Resumo do período
        </div>
        <p className="text-sm leading-6 text-foreground">{summary}</p>
      </Card>
    </section>
  );
}
