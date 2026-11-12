'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function StudentSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const currentTerm = params.get('q') ?? '';
  const [value, setValue] = useState(currentTerm);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(currentTerm);
  }, [currentTerm]);

  useEffect(() => {
    if (value === currentTerm) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(query);
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('page');
      startTransition(() => router.replace(`?${next.toString()}`));
    }, 300);

    return () => clearTimeout(timer);
  }, [currentTerm, query, router, value]);

  return (
    <div className="relative w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar aluno…"
        className="h-9 pl-9 text-sm"
        aria-busy={isPending}
      />
    </div>
  );
}
