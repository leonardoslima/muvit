'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function StudentSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [isPending, startTransition] = useTransition();
  const query = params.toString();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(query);
      if (value) next.set('q', value);
      else next.delete('q');
      startTransition(() => router.replace(`?${next.toString()}`));
    }, 300);
    return () => clearTimeout(t);
  }, [query, router, value]);

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
