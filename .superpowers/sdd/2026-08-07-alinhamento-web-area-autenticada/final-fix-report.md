# Onda final de correções — relatório

## Status

**DONE_WITH_CONCERNS** em 2026-08-24, sobre a base `53ac246`. Os cinco findings Important foram reproduzidos, corrigidos e verificados. Não houve mudança da API REST, schema ou migration; por isso o SDK não foi regenerado. Os minors postergados permaneceram fora do diff e o plano Free continua retornando `invoice: null`.

## RED/GREEN por finding

### 1. Builder sem captura de `NEXT_REDIRECT`

- Causa confirmada: a server action persistia, revalidava e lançava o sentinel de `redirect`; o `try/catch` do componente o convertia em erro recuperável após a criação.
- RED: os testes da action e do builder falharam nos dois comportamentos esperados — a action ainda rejeitava com redirect e o cliente não chamava `router.push`.
- GREEN: `actions.test.ts` + `_workout-builder.test.tsx`, **18/18 testes**. A action agora devolve `{ success: true, workoutId }`; o cliente navega uma única vez, não repete a criação e mantém as falhas reais recuperáveis.
- Regressão adicional: `workouts/page.test.tsx`, **2/2 testes**, com fixture do App Router completada.

### 2. Avatar da identidade até o shell

- Causa confirmada: Better Auth já recebia `image`, mas `readAuthUser` descartava o campo; o Avatar não aceitava origem e perfil/sidebar/mobile exibiam somente iniciais.
- RED: testes novos observaram `image` ausente no usuário autenticado, ausência de `<img>`/fallback, prévia não controlada e shell sem a imagem da sessão.
- GREEN: `auth-server.test.ts`, `avatar.test.tsx`, `_profile-form.test.tsx` e `layout.test.tsx`, **11/11 testes**. Somente URLs absolutas HTTP(S) são renderizadas; origem inválida ou erro de carregamento volta às iniciais. A prévia acompanha nome/URL controlados e o sucesso refresca o shell; sidebar e navegação compacta usam a imagem da sessão.

### 3. Validação bruta das notificações

- Causa confirmada: `Number('')` virava zero e depois `undefined`; como o contrato aceita PATCH parcial, o campo desaparecia e a action confirmava sucesso. Valores acima do limite chegavam à API e voltavam como erro genérico.
- RED: comando focado com três arquivos, **8 falhas esperadas e 1 teste aprovado**.
- GREEN: os mesmos três arquivos, **9/9 testes**. `FormData` é validado antes do cliente da API; vazio e limites 90/30/365 produzem `fieldErrors` próprios. Inputs permanecem controlados, possuem `required`, `max`, `step`, `aria-invalid` e `aria-describedby`, e o botão bloqueia novo envio pendente.
- Os limites passaram a ter uma única fonte em `NOTIFICATION_DAY_LIMITS`, preservando o contrato compartilhado existente.

### 4. Idempotência de billing

- Causa confirmada: o upsert e a emissão da fatura eram incondicionais. Um retry do mesmo plano e periodicidade reiniciava `startsAt`/`renewsAt` e emitia nova fatura.
- RED real em PostgreSQL 16: `billing.test.ts`, **4 falhas e 7 aprovações**; retry sequencial alterou a vigência e criou duas faturas, e duas requisições concorrentes devolveram duas faturas.
- GREEN real: **11/11 testes**. Dentro da transação executada sob o advisory lock do fluxo, a assinatura atual é lida primeiro; plano + periodicidade iguais retornam a assinatura intacta com `invoice: null`. Os testes sequencial e concorrente terminam com uma assinatura e uma fatura.

### 5. Clamp civil UTC das renovações

- Causa confirmada: `setUTCMonth` e `setUTCFullYear` normalizavam primeiro o dia inexistente no destino.
- RED real: 31/01 resultava em 03/03 e 29/02 resultava em 01/03.
- GREEN real: 31/01 mensal e 29/02 anual resultam em 28/02, preservando hora, minuto, segundo e milissegundo UTC.

## Gates executados

| Gate | Resultado observado |
| --- | --- |
| Validators serial | PASS — 7 arquivos, 16 testes |
| DB serial | PASS — 5 arquivos, 15 testes; imports ESM raiz/schema/seed aprovados |
| API serial, PostgreSQL real | PASS — 37 arquivos, 172 testes, 100,91 s |
| Web serial | PASS — 80 arquivos, 261 testes, 112,62 s |
| Coverage core web | PASS — 96,16% statements, 90,64% branches, 100% functions, 97,39% lines |
| Coverage UI web | PASS — 95% statements, 85,58% branches, 94,59% functions, 96,67% lines |
| Typecheck validators/DB/API/web | PASS nos quatro workspaces |
| Biome | PASS — 498 arquivos, nenhuma correção pendente |
| Build local forçado | PASS — Turbo 4/4, cache zero, Next com 17 páginas |
| Fresh Node 20.20.2 | PASS — install por lockfile sem `node_modules`/`dist`, preseed, imports ESM validators/DB, build 4/4 e import de `apps/api/dist/routes/billing.js` |
| `migrate:test` real | PASS em duas execuções idempotentes no PostgreSQL 16 |
| Higiene | `git diff --check` sem saída; `DIFF_SCAN_OK`; sem escapes Unicode ou marcadores de pendência novos |

Comandos principais normalizados:

```text
node ./node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism
node ./node_modules/vitest/vitest.mjs run --config vitest.coverage.config.ts --coverage --maxWorkers=1 --no-file-parallelism
node ./node_modules/vitest/vitest.mjs run --config vitest.ui-coverage.config.ts --coverage --maxWorkers=1 --no-file-parallelism
node node_modules/typescript/bin/tsc --noEmit -p <workspace>/tsconfig.json
node_modules/.bin/biome.cmd check .
node node_modules/turbo/bin/turbo build --force
pnpm@10.0.0 --filter @muvit/db migrate:test
```

## Arquivos alterados

- Billing e datas: `apps/api/src/modules/billing/repositories/drizzle-billing-repository.ts`, `apps/api/src/routes/billing.test.ts`.
- Builder: `apps/web/src/app/(app)/workouts/actions.ts`, `actions.test.ts`, `_workout-builder.tsx`, `_workout-builder.test.tsx`, `page.test.tsx`.
- Avatar: `apps/web/src/lib/auth-server.ts`, `auth-server.test.ts`, `components/ui/avatar.tsx`, `avatar.test.tsx`, `components/sidebar.tsx`, `components/mobile-app-navigation.tsx`, `app/(app)/layout.test.tsx`, `settings/profile/_profile-form.tsx`, `_profile-form.test.tsx`.
- Notificações: `packages/validators/src/notifications.ts`, `apps/web/src/application/settings/notification-form-data.ts`, `notification-form-data.test.ts`, `settings/notifications/actions.ts`, `actions.test.ts`, `_notification-form.tsx`, `_notification-form.test.tsx`.

## Limpeza e concerns

- Removidos `.pnpm-store`, `.turbo`, `.next`, coverage e todos os `dist` gerados; container PostgreSQL efêmero, container fresh Node 20 e imagem temporária foram removidos; `postgres_test` iniciado durante o diagnóstico foi parado. Portas 3000, 3333 e 55433 ficaram sem listener. Screenshots externos não foram tocados e `packages/db/.env.test~clear` permanece ausente.
- Concern operacional: um PostgreSQL nativo já ocupava IPv4 `localhost:5433`, enquanto o Compose publicava o teste pelo backend Docker. Para não parar serviço local, os gates usaram PostgreSQL 16 efêmero em `55433`. A senha do role do volume `postgres_test` foi alinhada ao valor versionado do Compose antes de o serviço ser parado; nenhum dado ou volume foi apagado.
- Concern operacional: no Windows, o processo Turbo manteve um handle após imprimir `4 successful, 4 total`; ele foi interrompido somente depois do resumo. O build fresh em Linux/Node 20 encerrou com código zero e repetiu os mesmos 4/4 e 17 páginas.
