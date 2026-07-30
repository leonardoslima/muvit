# Web Next 16 and Tailwind 4 Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `apps/web` diretamente para Next.js 16.2.9, React 19.2.7 e Tailwind CSS 4.3.1, atualizar suas dependencias auditadas e eliminar a configuracao hibrida Tailwind 3/4 sem alterar contratos compartilhados.

**Architecture:** A migracao separa runtime Next/React da toolchain Tailwind/shadcn para isolar regressões. O proxy de autenticacao ganha um teste de comportamento antes da troca de convencao, enquanto a configuracao Tailwind usa verificacao red/green por build, CSS compilado e navegador real, conforme a excecao de configuracao aprovada na especificacao.

**Tech Stack:** Next.js 16 App Router, React 19.2, Tailwind CSS 4, shadcn/base-nova, Base UI, Radix UI, Vitest, Testing Library, Biome e pnpm 10.

---

## Mapa de arquivos

- Criar `apps/web/src/proxy.test.ts`: proteger redirects e liberacao de rotas publicas durante a migracao de middleware.
- Renomear `apps/web/src/middleware.ts` para `apps/web/src/proxy.ts`: adotar a convencao Next.js 16 sem mudar regras de autenticacao.
- Modificar `apps/web/package.json`: atualizar dependencias web, remover pacotes obsoletos e adicionar o plugin PostCSS do Tailwind 4.
- Modificar `pnpm-lock.yaml`: registrar a arvore resolvida pelo pnpm.
- Modificar `apps/web/postcss.config.mjs`: usar apenas `@tailwindcss/postcss`.
- Modificar `apps/web/src/app/globals.css`: migrar diretivas e tokens para CSS-first.
- Modificar `apps/web/components.json`: remover a referencia ao config JavaScript do Tailwind.
- Excluir `apps/web/tailwind.config.ts`: eliminar o carregamento ESM com `require()` e a configuracao duplicada.
- Preservar e incluir `docker-compose.yml`: a remocao local dos limites de CPU e memoria foi confirmada pelo usuario e faz parte do diff final, sem outras mudancas no Compose.

### Task 1: Proteger e migrar o proxy de autenticacao

**Files:**
- Create: `apps/web/src/proxy.test.ts`
- Rename: `apps/web/src/middleware.ts` -> `apps/web/src/proxy.ts`
- Modify: `apps/web/src/proxy.ts`

- [x] **Step 1: Escrever o teste que exige a convencao `proxy`**

```ts
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

function request(path: string, access?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: access ? { cookie: `muvit_access=${access}` } : undefined,
  });
}

describe('proxy', () => {
  it('redireciona visitante sem token para login preservando a rota', () => {
    const response = proxy(request('/students'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fstudents');
  });

  it('redireciona usuario autenticado para dashboard ao abrir login', () => {
    const response = proxy(request('/login', 'token'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('mantem a landing page publica', () => {
    const response = proxy(request('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
```

- [x] **Step 2: Executar o teste e confirmar RED**

Run: `corepack pnpm --dir apps/web test src/proxy.test.ts`

Expected: FAIL porque `./proxy` ainda nao existe.

- [x] **Step 3: Renomear o arquivo e a funcao exportada**

Mover `src/middleware.ts` para `src/proxy.ts` e substituir somente:

```ts
export function middleware(req: NextRequest) {
```

por:

```ts
export function proxy(req: NextRequest) {
```

Manter `PUBLIC_PATHS`, `AUTH_PATHS`, redirects e `config.matcher` inalterados.

- [x] **Step 4: Executar o teste e confirmar GREEN**

Run: `corepack pnpm --dir apps/web test src/proxy.test.ts`

Expected: 3 testes passando.

### Task 2: Atualizar a arvore de dependencias web

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Atualizar dependencias de runtime**

Definir no `apps/web/package.json`:

```json
{
  "@base-ui/react": "^1.6.0",
  "@hookform/resolvers": "^5.4.0",
  "@muvit/validators": "workspace:*",
  "@radix-ui/react-dialog": "^1.1.17",
  "@radix-ui/react-label": "^2.1.10",
  "@radix-ui/react-slot": "^1.3.0",
  "@sentry/nextjs": "^10.59.0",
  "@tanstack/react-query": "^5.101.0",
  "@tanstack/react-query-devtools": "^5.101.0",
  "@vercel/analytics": "^2.0.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.21.0",
  "next": "^16.2.9",
  "next-themes": "^0.4.6",
  "react": "^19.2.7",
  "react-dom": "^19.2.7",
  "react-hook-form": "^7.79.0",
  "sonner": "^2.0.7",
  "tailwind-merge": "^3.6.0",
  "tw-animate-css": "^1.4.0",
  "zod": "^3.25.76"
}
```

Remover `shadcn` e `tailwindcss-animate`.

- [x] **Step 2: Atualizar dependencias de desenvolvimento**

Definir no `apps/web/package.json`:

```json
{
  "@hey-api/openapi-ts": "^0.98.2",
  "@muvit/config": "workspace:*",
  "@tailwindcss/postcss": "^4.3.1",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/react": "^16.3.2",
  "@types/node": "^22.19.21",
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3",
  "@vitest/coverage-v8": "4.1.5",
  "jsdom": "^29.1.1",
  "postcss": "^8.5.15",
  "tailwindcss": "^4.3.1",
  "typescript": "^5.9.3",
  "vitest": "4.1.5"
}
```

Remover `@hey-api/client-fetch` e `autoprefixer`.

- [x] **Step 3: Atualizar o lockfile sem tocar outros manifests**

Run: `corepack pnpm install`

Expected: `pnpm-lock.yaml` atualizado e instalacao concluida sem peer dependency error bloqueante.

- [x] **Step 4: Confirmar as versoes resolvidas**

Run: `corepack pnpm --filter @muvit/web list --depth 0`

Expected: Next 16.2.9, React 19.2.7, Tailwind 4.3.1 e ausencia dos tres pacotes removidos.

### Task 3: Migrar Tailwind para CSS-first

**Files:**
- Modify: `apps/web/postcss.config.mjs`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/components.json`
- Delete: `apps/web/tailwind.config.ts`

- [x] **Step 1: Trocar o plugin PostCSS**

Substituir `postcss.config.mjs` por:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [x] **Step 2: Migrar imports e tokens do tema**

O inicio de `globals.css` deve ser:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-hover: var(--card-hover);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-bg: var(--destructive-bg);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-warning: var(--warning);
  --color-warning-bg: var(--warning-bg);
  --color-info: var(--info);
  --color-info-bg: var(--info-bg);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-inactive: var(--inactive);
  --color-inactive-bg: var(--inactive-bg);
  --color-border: var(--border);
  --color-border-dark: var(--border-dark);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-mkt-dark: var(--mkt-section-dark);
  --color-mkt-dark-elevated: var(--mkt-section-dark-elevated);
  --color-mkt-light: var(--mkt-section-light);
  --color-mkt-on-dark: var(--mkt-text-on-dark);
  --color-mkt-on-dark-muted: var(--mkt-text-on-dark-muted);
  --color-mkt-card-border: var(--mkt-card-border);
  --color-mkt-cta: var(--mkt-cta);
  --color-mkt-cta-hover: var(--mkt-cta-hover);
  --color-mkt-cta-active: var(--mkt-cta-active);
  --color-mkt-cta-foreground: var(--mkt-cta-foreground);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --font-sans: "Inter", "Inter Fallback", system-ui, sans-serif;
  --font-display: "Space Grotesk", "Space Grotesk Fallback", system-ui, sans-serif;
  --text-hero-display: 72px;
  --text-hero-display--line-height: 1.05;
  --text-hero-display--letter-spacing: -0.02em;
  --text-hero-display--font-weight: 700;
  --text-hero-display-mobile: 44px;
  --text-hero-display-mobile--line-height: 1.1;
  --text-hero-display-mobile--letter-spacing: -0.02em;
  --text-hero-display-mobile--font-weight: 700;
  --text-hero-h2: 48px;
  --text-hero-h2--line-height: 1.15;
  --text-hero-h2--letter-spacing: -0.01em;
  --text-hero-h2--font-weight: 700;
  --text-hero-h3: 32px;
  --text-hero-h3--line-height: 1.2;
  --text-hero-h3--font-weight: 700;
  --text-hero-lead: 20px;
  --text-hero-lead--line-height: 1.5;
  --shadow-subtle: 0 1px 3px 0 #0000000d;
  --shadow-card: 0 4px 12px 0 #00000014;
  --shadow-elevated: 0 8px 24px 0 #0000001f;
  --background-image-mkt-hero: linear-gradient(
    200deg,
    var(--mkt-hero-from) 0%,
    var(--mkt-hero-to) 100%
  );
  --container-container: 1280px;
}
```

Remover de `:root` as declaracoes de `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` e sombras, pois passam a ser definidas por `@theme`. Manter `--radius: var(--radius-md)` e todas as variaveis semanticas de cor.

- [x] **Step 3: Atualizar o config do shadcn e remover o config antigo**

Em `components.json`, definir:

```json
"tailwind": {
  "config": "",
  "css": "src/app/globals.css",
  "baseColor": "neutral",
  "cssVariables": true,
  "prefix": ""
}
```

Excluir `apps/web/tailwind.config.ts`.

- [x] **Step 4: Compilar e inspecionar o CSS**

Run: `corepack pnpm --dir apps/web build`

Expected: build Next 16 concluido sem `require is not defined`.

Run:

```powershell
$css = Get-Content -Raw (Get-ChildItem apps/web/.next/static/css/*.css | Select-Object -First 1).FullName
@{
  RawTheme = $css.Contains('@theme')
  RawUtility = $css.Contains('@utility')
  AnimateIn = $css.Contains('.animate-in')
  AvailableHeight = $css.Contains('--available-height')
} | ConvertTo-Json
```

Expected: `RawTheme` e `RawUtility` falsos; `AnimateIn` e `AvailableHeight` verdadeiros.

### Task 4: Validar compatibilidade de codigo e SDK

**Files:**
- Modify only if generated output changes validly: `apps/web/src/lib/api/**`

- [x] **Step 1: Executar typecheck e testes do web**

Run: `corepack pnpm --dir apps/web typecheck`

Expected: exit 0.

Run: `corepack pnpm --dir apps/web test`

Expected: todos os testes passando.

- [x] **Step 2: Validar o gerador OpenAPI atualizado**

Iniciar a API local com `corepack pnpm --dir apps/api dev` e executar:

Run: `corepack pnpm --dir apps/web api:gen`

Expected: geracao concluida sem depender do pacote depreciado `@hey-api/client-fetch`.

Se o gerador produzir mudancas, conferir que sao exclusivamente artefatos gerados e executar novamente typecheck e testes.

- [x] **Step 3: Executar Biome**

Run: `corepack pnpm exec biome check apps/web`

Expected: exit 0 sem arquivos fora de `apps/web` formatados ou alterados.

### Task 5: Executar gates de cobertura e verificacao visual

**Files:**
- No planned source changes.

- [x] **Step 1: Executar coberturas bloqueantes**

Run: `corepack pnpm --dir apps/web test:coverage:core`

Expected: quatro thresholds >= 85%.

Run: `corepack pnpm --dir apps/web test:coverage:ui`

Expected: quatro thresholds >= 85%.

- [x] **Step 2: Executar build final fresco**

Run: `corepack pnpm --dir apps/web build`

Expected: todas as rotas compiladas com exit 0.

- [x] **Step 3: Reproduzir o fluxo original em desenvolvimento**

Iniciar `corepack pnpm --dir apps/web dev`, abrir `/`, navegar para `/login` e `/signup`, voltar para `/` e inspecionar o console.

Expected: servidor permanece ativo, navegacoes concluem e nao existe `Failed to fetch`, `require is not defined` ou erro de console.

- [x] **Step 4: Executar audit e revisar o diff**

Run: `corepack pnpm audit --prod --json`

Expected: nenhuma vulnerabilidade do caminho `apps\\web > next@15.5.15` e nenhuma vulnerabilidade de runtime trazida por `apps\\web > shadcn`.

Run: `git diff --check`

Expected: exit 0.

Run: `git status --short`

Expected: somente `apps/web/**`, `pnpm-lock.yaml`, os documentos desta migracao e a remocao autorizada dos limites de recursos em `docker-compose.yml` aparecem modificados.

## Handoff

A execucao deve permanecer inline nesta sessao. Nao criar commit, branch ou PR sem pedido explicito do usuario.
