'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
          <div className="space-y-2">
            <h1 className="font-semibold text-2xl">Algo deu errado</h1>
            <p className="text-muted-foreground text-sm">
              Nao foi possivel carregar esta tela. Tente novamente em alguns instantes.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
