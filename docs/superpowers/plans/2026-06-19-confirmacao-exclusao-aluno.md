# Confirmação de exclusão de aluno — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exigir confirmação em um modal do Muvit antes de executar a exclusão de um aluno.

**Architecture:** Manter a página de detalhes como Server Component e extrair somente a interação do modal para um Client Component próximo à rota. O componente reutiliza o `Dialog` existente e recebe a Server Action por propriedade, preservando a chamada e o redirecionamento atuais.

**Tech Stack:** Next.js App Router, React 19, Base UI `Dialog`, Tailwind CSS, Vitest e Testing Library.

---

### Task 1: Componente de confirmação de exclusão

**Files:**
- Create: `apps/web/src/app/(app)/students/[id]/_delete-student-dialog.tsx`
- Test: `apps/web/src/app/(app)/students/[id]/_delete-student-dialog.test.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/page.tsx`

- [x] **Step 1: Escrever os testes que reproduzem a exclusão sem confirmação**

Criar `_delete-student-dialog.test.tsx` com testes acessíveis para cancelamento e confirmação:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteStudentDialog } from './_delete-student-dialog';

describe('DeleteStudentDialog', () => {
  it('fecha a confirmação sem excluir ao cancelar', async () => {
    const deleteAction = vi.fn();
    render(
      <DeleteStudentDialog
        studentId="student-1"
        studentName="Ana Lima"
        deleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    expect(screen.getByRole('dialog', { name: 'Excluir aluno?' })).toBeInTheDocument();
    expect(screen.getByText(/Ana Lima/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Excluir aluno?' })).not.toBeInTheDocument();
    });
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it('envia o identificador do aluno somente após a confirmação', async () => {
    const deleteAction = vi.fn();
    render(
      <DeleteStudentDialog
        studentId="student-1"
        studentName="Ana Lima"
        deleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir aluno?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir aluno' }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledOnce());
    const formData = deleteAction.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('id')).toBe('student-1');
  });
});
```

- [x] **Step 2: Executar o teste e confirmar a falha esperada**

Run: `pnpm.cmd --dir apps/web test -- "src/app/(app)/students/[id]/_delete-student-dialog.test.tsx"`

Expected: FAIL porque `./_delete-student-dialog` ainda não existe.

- [x] **Step 3: Implementar o menor componente que satisfaz os testes**

Criar `_delete-student-dialog.tsx` reutilizando os componentes existentes:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface DeleteStudentDialogProps {
  studentId: string;
  studentName: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function DeleteStudentDialog({
  studentId,
  studentName,
  deleteAction,
}: DeleteStudentDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="icon" aria-label="Excluir aluno" />}
      >
        <Trash2 />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir aluno?</DialogTitle>
          <DialogDescription>
            Você está prestes a excluir {studentName}. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={studentId} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" variant="destructive">
              Excluir aluno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [x] **Step 4: Integrar o componente à página sem alterar a Server Action**

Em `page.tsx`, remover o formulário que envia diretamente `deleteStudentAction`, remover `Trash2` do import de ícones e renderizar:

```tsx
<DeleteStudentDialog
  studentId={s.id}
  studentName={s.name}
  deleteAction={deleteStudentAction}
/>
```

Importar o componente com:

```tsx
import { DeleteStudentDialog } from './_delete-student-dialog';
```

- [x] **Step 5: Executar o teste focado e confirmar que passa**

Run: `pnpm.cmd --dir apps/web test -- "src/app/(app)/students/[id]/_delete-student-dialog.test.tsx"`

Expected: PASS com 2 testes aprovados.

- [x] **Step 6: Executar as verificações do workspace web**

Run:

```powershell
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check apps/web
```

Expected: todos os comandos encerram com código 0.

- [x] **Step 7: Commitar a implementação**

```powershell
git add -- 'apps/web/src/app/(app)/students/[id]/_delete-student-dialog.tsx' 'apps/web/src/app/(app)/students/[id]/_delete-student-dialog.test.tsx' 'apps/web/src/app/(app)/students/[id]/page.tsx'
git commit -m "fix(web): confirma exclusao de aluno"
```
