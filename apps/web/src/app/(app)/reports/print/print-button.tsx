'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer />
      Imprimir ou salvar em PDF
    </Button>
  );
}
