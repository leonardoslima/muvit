'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ReportsError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card role="alert" className="items-center py-12 text-center">
      <h1 className="font-display text-xl font-bold">Ocorreu um erro ao abrir os relatórios.</h1>
      <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
      <Button type="button" variant="secondary" onClick={reset}>
        Tentar novamente
      </Button>
    </Card>
  );
}
