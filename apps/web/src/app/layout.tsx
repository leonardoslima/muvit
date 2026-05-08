import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from './providers';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Muvit',
  description: 'Plataforma de treinos para personal trainers e alunos independentes.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
