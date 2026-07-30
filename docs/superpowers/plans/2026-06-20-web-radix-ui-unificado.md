# Radix UI Unificado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar atomicamente o `apps/web` para o pacote unificado `radix-ui` como unica biblioteca de primitives.

**Architecture:** A camada `src/components/ui` encapsula Radix e as features reutilizam seus componentes. Um teste arquitetural protege o manifesto e os imports contra Base UI e pacotes Radix individuais.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui, Radix UI, Vitest, Biome, pnpm.

---

### Task 1: Fixar a regra arquitetural

**Files:**
- Modify: `apps/web/test/solid-architecture.test.ts`
- Modify: `apps/web/AGENTS.md`

- [x] Adicionar teste que leia `package.json` e todos os arquivos TypeScript de `src`.
- [x] Exigir `radix-ui` como dependencia de producao.
- [x] Rejeitar `@base-ui/react` e qualquer pacote ou import `@radix-ui/react-*`.
- [x] Executar o teste e confirmar falha causada pelo estado atual.

### Task 2: Migrar tudo no mesmo diff

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/components.json`
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/form.tsx`
- Modify: `apps/web/src/components/ui/label.tsx`
- Modify: `apps/web/src/components/ui/dialog.tsx`
- Modify: `apps/web/src/components/ui/select.tsx`
- Modify: `apps/web/src/components/confirmation-dialog.tsx`
- Modify: `apps/web/src/app/(app)/exercises/_create-dialog.tsx`
- Modify: `apps/web/src/app/(app)/workouts/new/_editor.tsx`

- [x] Instalar `radix-ui@latest` e remover Base UI e pacotes Radix individuais.
- [x] Alterar o shadcn de `base-nova` para `new-york`.
- [x] Migrar Slot, Label, Dialog e Select para namespaces de `radix-ui`.
- [x] Trocar a API Base UI `render` por `asChild` nos consumidores.
- [x] Fazer os dialogos de features reutilizarem o primitive compartilhado.
- [x] Executar o teste arquitetural e confirmar sucesso.

### Task 3: Verificar o web completo

**Files:**
- Verify only.

- [x] Executar `corepack pnpm --dir apps/web test`.
- [x] Executar `corepack pnpm --dir apps/web typecheck`.
- [x] Executar `corepack pnpm exec biome check apps/web`.
- [x] Executar `corepack pnpm --dir apps/web build`.
- [x] Confirmar com `rg` que nao restam imports ou dependencias proibidas.
- [x] Revisar o diff sem incluir a alteracao preexistente de `apps/web/next-env.d.ts` no escopo da migracao.
