# Confirmação de ações destrutivas — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar a confirmação de todas as ações destrutivas visíveis no dashboard web sem criar um segundo sistema de modal.

**Architecture:** `components/ui/dialog.tsx` permanece como primitive visual. Uma composição `ConfirmationDialog` em `components` coordena confirmação, cancelamento, `FormData`, estado pendente e fechamento após sucesso; aluno, exercícios e editor de treino fornecem somente gatilho, textos e ação concreta.

**Tech Stack:** Next.js App Router, React 19, Base UI Dialog, Tailwind CSS, Vitest e Testing Library.

---

### Task 1: Criar a composição compartilhada

**Files:**
- Create: `apps/web/src/components/confirmation-dialog.tsx`
- Create: `apps/web/src/components/confirmation-dialog.test.tsx`
- Modify: `apps/web/vitest.ui-coverage.config.ts`

- [x] **Step 1: Escrever os testes da composição**

Criar `confirmation-dialog.test.tsx`:

```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from './confirmation-dialog';
import { Button } from './ui/button';

function renderConfirmation(confirmAction: (formData: FormData) => void | Promise<void>) {
  render(
    <ConfirmationDialog
      trigger={<Button aria-label="Excluir item">Excluir</Button>}
      title="Excluir item?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir item"
      pendingLabel="Excluindo..."
      confirmAction={confirmAction}
      hiddenFields={{ id: 'item-1' }}
    />,
  );
}

describe('ConfirmationDialog', () => {
  it('fecha sem executar a ação ao cancelar', async () => {
    const confirmAction = vi.fn();
    renderConfirmation(confirmAction);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir item' }));
    expect(screen.getByRole('dialog', { name: 'Excluir item?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Excluir item?' })).not.toBeInTheDocument();
    });
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('envia os campos, bloqueia nova confirmação e fecha após sucesso', async () => {
    let resolveAction: (() => void) | undefined;
    const confirmAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderConfirmation(confirmAction);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir item' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir item?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir item' }));

    await waitFor(() => expect(confirmAction).toHaveBeenCalledOnce());
    const formData = confirmAction.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('id')).toBe('item-1');
    expect(within(dialog).getByRole('button', { name: 'Excluindo...' })).toBeDisabled();

    await act(async () => resolveAction?.());

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Excluir item?' })).not.toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Executar o teste e confirmar RED**

Run: `pnpm.cmd --dir apps/web test -- "src/components/confirmation-dialog.test.tsx"`

Expected: FAIL porque `./confirmation-dialog` ainda não existe.

- [x] **Step 3: Implementar a composição mínima**

Criar `confirmation-dialog.tsx`:

```tsx
'use client';

import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
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

interface ConfirmationDialogProps {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  confirmAction: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
}

interface ConfirmationButtonProps {
  confirmLabel: string;
  pendingLabel: string;
}

function ConfirmationButton({ confirmLabel, pendingLabel }: ConfirmationButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  confirmAction,
  hiddenFields = {},
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm(formData: FormData) {
    await confirmAction(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={handleConfirm}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <ConfirmationButton confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [x] **Step 4: Incluir a composição na cobertura visual crítica**

Adicionar ao array `coverage.include` de `vitest.ui-coverage.config.ts`:

```ts
'src/components/confirmation-dialog.tsx',
```

- [x] **Step 5: Executar o teste e confirmar GREEN**

Run: `pnpm.cmd --dir apps/web test -- "src/components/confirmation-dialog.test.tsx"`

Expected: PASS nos dois cenários da composição.

### Task 2: Migrar exclusões persistentes

**Files:**
- Modify: `apps/web/src/app/(app)/students/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/page.test.tsx`
- Delete: `apps/web/src/app/(app)/students/[id]/_delete-student-dialog.tsx`
- Delete: `apps/web/src/app/(app)/students/[id]/_delete-student-dialog.test.tsx`
- Modify: `apps/web/src/app/(app)/exercises/page.tsx`
- Create: `apps/web/src/app/(app)/exercises/page.test.tsx`

- [x] **Step 1: Escrever o teste de integração da exclusão de aluno**

Criar `students/[id]/page.test.tsx` com mocks do carregamento da página, abrir `Excluir aluno`, confirmar e validar que `deleteStudentAction` recebe `id=student-1` em `FormData`.

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentDetailPage from './page';
import { deleteStudentAction } from './actions';

vi.mock('@/components/student-form', () => ({ StudentForm: () => <div>Formulário</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getStudentsById: vi.fn().mockResolvedValue({
    data: {
      id: 'student-1',
      name: 'Ana Lima',
      email: 'ana@example.com',
      phone: null,
      birthDate: null,
      gender: null,
      goals: null,
      restrictions: null,
      status: 'active',
      isIndependent: false,
      createdAt: '2026-06-20T00:00:00.000Z',
    },
  }),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('./actions', () => ({ deleteStudentAction: vi.fn(), updateStudentAction: vi.fn() }));

describe('StudentDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma a exclusão com o identificador do aluno', async () => {
    vi.mocked(deleteStudentAction).mockResolvedValue(undefined);
    render(await StudentDetailPage({ params: Promise.resolve({ id: 'student-1' }) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir aluno' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir aluno?' });
    expect(within(dialog).getByText(/Ana Lima/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir aluno' }));

    await waitFor(() => expect(deleteStudentAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteStudentAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('student-1');
  });
});
```

- [x] **Step 2: Escrever o teste de integração da exclusão de exercício**

Criar `exercises/page.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExercisesPage from './page';
import { deleteExerciseAction } from './actions';

vi.mock('@/components/top-bar', () => ({ TopBar: () => <div>Exercícios</div> }));
vi.mock('@/lib/api-client', () => ({ configureServerClient: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/api/sdk.gen', () => ({
  getExercises: vi.fn().mockResolvedValue({
    data: {
      items: [
        {
          id: 'exercise-1',
          name: 'Supino reto',
          muscleGroup: 'chest',
          equipment: 'Barra',
          trainerId: 'trainer-1',
        },
      ],
    },
  }),
}));
vi.mock('./_create-dialog', () => ({ CreateExerciseDialog: () => null }));
vi.mock('./actions', () => ({ deleteExerciseAction: vi.fn() }));

describe('ExercisesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirma a exclusão com o identificador do exercício', async () => {
    vi.mocked(deleteExerciseAction).mockResolvedValue(undefined);
    render(await ExercisesPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Supino reto' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir exercício?' });
    expect(within(dialog).getByText(/Supino reto/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir exercício' }));

    await waitFor(() => expect(deleteExerciseAction).toHaveBeenCalledOnce());
    const formData = vi.mocked(deleteExerciseAction).mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('id')).toBe('exercise-1');
  });
});
```

- [x] **Step 3: Executar os testes e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/students/[id]/page.test.tsx"
pnpm.cmd --dir apps/web test -- "src/app/(app)/exercises/page.test.tsx"
```

Expected: o teste de exercício falha porque a exclusão ainda é direta; o teste de aluno estabelece o contrato a preservar durante a troca do componente específico.

- [x] **Step 4: Migrar aluno para `ConfirmationDialog`**

Em `students/[id]/page.tsx`, importar `ConfirmationDialog` e `Trash2`, remover `DeleteStudentDialog` e renderizar:

```tsx
<ConfirmationDialog
  trigger={
    <Button type="button" variant="ghost" size="icon" aria-label="Excluir aluno">
      <Trash2 />
    </Button>
  }
  title="Excluir aluno?"
  description={`Você está prestes a excluir ${s.name}. Esta ação não pode ser desfeita.`}
  confirmLabel="Excluir aluno"
  pendingLabel="Excluindo..."
  confirmAction={deleteStudentAction}
  hiddenFields={{ id: s.id }}
/>
```

Excluir `_delete-student-dialog.tsx` e `_delete-student-dialog.test.tsx`.

- [x] **Step 5: Migrar exercícios para `ConfirmationDialog`**

Em `exercises/page.tsx`, importar `ConfirmationDialog` e substituir o formulário direto por:

```tsx
<ConfirmationDialog
  trigger={
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Excluir ${ex.name}`}
    >
      <Trash2 />
    </Button>
  }
  title="Excluir exercício?"
  description={`Você está prestes a excluir ${ex.name}. Esta ação não pode ser desfeita.`}
  confirmLabel="Excluir exercício"
  pendingLabel="Excluindo..."
  confirmAction={deleteExerciseAction}
  hiddenFields={{ id: ex.id }}
/>
```

- [x] **Step 6: Executar os testes e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/students/[id]/page.test.tsx"
pnpm.cmd --dir apps/web test -- "src/app/(app)/exercises/page.test.tsx"
```

Expected: PASS nos dois fluxos persistentes.

### Task 3: Migrar remoções locais do editor

**Files:**
- Modify: `apps/web/src/app/(app)/workouts/new/_editor.tsx`
- Modify: `apps/web/src/app/(app)/workouts/new/_editor.test.tsx`

- [x] **Step 1: Alterar os testes para exigir confirmação**

Importar `within` e tornar assíncronos os dois testes de remoção. No teste de dias, substituir o clique e asserções finais por:

```tsx
fireEvent.click(elementAt(screen.getAllByLabelText('Remover dia'), 1));
const dialog = screen.getByRole('dialog', { name: 'Remover dia?' });
expect(screen.getByText('Dias (2)')).toBeInTheDocument();
fireEvent.click(within(dialog).getByRole('button', { name: 'Remover dia' }));

await waitFor(() => expect(screen.getByText('Dias (1)')).toBeInTheDocument());
expect(screen.getByRole('heading', { name: 'Treino A' })).toBeInTheDocument();
```

No teste de exercícios, substituir a remoção final por:

```tsx
fireEvent.click(elementAt(screen.getAllByLabelText('Remover'), 0));
const dialog = screen.getByRole('dialog', { name: 'Remover exercício?' });
expect(screen.getByText('Remada')).toBeInTheDocument();
fireEvent.click(within(dialog).getByRole('button', { name: 'Remover exercício' }));

await waitFor(() => expect(screen.queryByText('Remada')).not.toBeInTheDocument());
expect(screen.getByText('Supino')).toBeInTheDocument();
```

- [x] **Step 2: Executar o teste e confirmar RED**

Run: `pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/new/_editor.test.tsx"`

Expected: FAIL porque os itens ainda são removidos no primeiro clique e nenhum diálogo é aberto.

- [x] **Step 3: Migrar a remoção de dia**

Importar `ConfirmationDialog` e substituir o botão `Remover dia` por:

```tsx
<ConfirmationDialog
  trigger={
    <button
      type="button"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Remover dia"
    >
      <X className="size-3.5" />
    </button>
  }
  title="Remover dia?"
  description={`O dia ${d.label} e seus exercícios serão removidos deste treino.`}
  confirmLabel="Remover dia"
  pendingLabel="Removendo..."
  confirmAction={() => removeDay(i)}
/>
```

- [x] **Step 4: Migrar a remoção de exercício**

Substituir o botão `Remover` por:

```tsx
<ConfirmationDialog
  trigger={
    <button
      type="button"
      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive-bg hover:text-destructive"
      aria-label="Remover"
    >
      <Trash2 className="size-4" />
    </button>
  }
  title="Remover exercício?"
  description={`O exercício ${ex.name} será removido deste treino.`}
  confirmLabel="Remover exercício"
  pendingLabel="Removendo..."
  confirmAction={() => removeExercise(activeDay, j)}
/>
```

- [x] **Step 5: Executar o teste e confirmar GREEN**

Run: `pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/new/_editor.test.tsx"`

Expected: PASS, provando que ambas as remoções aguardam confirmação.

### Task 4: Verificação, documentação de status e commit

**Files:**
- Modify: `docs/superpowers/plans/2026-06-20-confirmacao-acoes-destrutivas.md`

- [x] **Step 1: Confirmar que não restaram exclusões diretas na UI web**

Run: `rg -n -S 'form action=\{delete|onClick=\{\(\) => remove|_delete-student-dialog' apps/web/src --glob '*.tsx'`

Expected: nenhum fluxo destrutivo visível fora de `ConfirmationDialog`; ocorrências legítimas não relacionadas devem ser analisadas explicitamente.

- [x] **Step 2: Executar verificações automatizadas**

Run:

```powershell
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web test:coverage:ui
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check apps/web
```

Expected: todos os testes e gates passam. Se o Biome amplo continuar apontando apenas `apps/web/next-env.d.ts`, preservar a alteração preexistente, executar Biome nos arquivos do escopo e registrar a limitação.

- [x] **Step 3: Verificar no navegador**

Executar o dashboard local e validar:

1. exclusão de aluno abre e cancela sem excluir;
2. exclusão de exercício abre e cancela sem excluir;
3. remoção de dia e exercício no editor só ocorre após confirmação;
4. nenhum erro é emitido no console.

- [x] **Step 4: Marcar este plano como concluído**

Alterar os checkboxes executados de `[ ]` para `[x]` somente após cada evidência correspondente.

- [x] **Step 5: Commitar a implementação**

```powershell
git add -- 'apps/web/src/components/confirmation-dialog.tsx' 'apps/web/src/components/confirmation-dialog.test.tsx' 'apps/web/vitest.ui-coverage.config.ts' 'apps/web/src/app/(app)/students/[id]/page.tsx' 'apps/web/src/app/(app)/students/[id]/page.test.tsx' 'apps/web/src/app/(app)/students/[id]/_delete-student-dialog.tsx' 'apps/web/src/app/(app)/students/[id]/_delete-student-dialog.test.tsx' 'apps/web/src/app/(app)/exercises/page.tsx' 'apps/web/src/app/(app)/exercises/page.test.tsx' 'apps/web/src/app/(app)/workouts/new/_editor.tsx' 'apps/web/src/app/(app)/workouts/new/_editor.test.tsx' 'docs/superpowers/plans/2026-06-20-confirmacao-acoes-destrutivas.md'
git commit -m "refactor(web): padroniza confirmacoes destrutivas"
```
