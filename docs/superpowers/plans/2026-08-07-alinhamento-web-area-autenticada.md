# Alinhamento da Área Autenticada Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar toda a área autenticada web aos frames aprovados do Pencil e entregar o suporte persistente de perfil, notificações, assinatura interna e relatórios.

**Architecture:** A implementação avança em fatias verticais: contratos e banco primeiro, depois módulos de API e seus consumidores web. Server Components carregam dados; Client Components ficam restritos a interação; regras testáveis permanecem em casos de uso, `src/application` ou `src/lib`.

**Tech Stack:** TypeScript estrito, pnpm, Turborepo, Drizzle/PostgreSQL, Zod, Fastify, Better Auth, Next.js 16, React 19, Tailwind CSS 4, Radix UI, Recharts e Vitest/Testing Library.

## Status de execução — 2026-08-07

- [x] Tasks 1–5: contratos, banco e módulos internos da API.
- [x] Task 6: SDK e shell autenticado responsivo.
- [x] Task 7: Dashboard, perfil do aluno e exercícios.
- [x] Task 8: wizard de aluno e avaliações.
- [x] Task 9: construtor canônico de treinos.
- [x] Task 10: tela de Relatórios e versão imprimível.
- [x] Task 11: configurações de perfil, notificações e cobrança.
- [x] Task 12: verificação visual e qualidade integrada.

Execução concluída após a aprovação formal das 12 tasks e da revisão final da branch.

## Global Constraints

- Escopo visual limitado aos frames autenticados `dM0L4`, `Wg556`, `WGclk`, `XOIIZ`, `FsBnA`, `grTSd`, `yDgPu`, `GTg6a`, `Z6aKg`, `WHVaZ`, `s268U`, `pdDTg`, `DkxTf`, `mCtHf` e `y0Ydi`.
- Fidelidade ao Pencil em 1440 px e adaptação responsiva funcional, sem inventar um design mobile detalhado.
- Better Auth permanece a única fonte de sessão, senha e e-mail de login.
- Não adicionar gateway de pagamento, geração de texto por IA ou biblioteca de PDF.
- Planos e limites: `free` = 3 alunos ativos, `starter` = 15, `pro` = 50 e `team` = ilimitado.
- Toda interface visível, documentação local, comentários e commits permanecem em pt-BR com UTF-8 literal.
- Não alterar a landing page, o app mobile ou o arquivo `.pen`, salvo compatibilidade obrigatória de contratos compartilhados.
- Preservar `packages/db/.env.test~clear`, arquivo não rastreado preexistente do usuário.

---

### Task 1: Contratos compartilhados, schema e migration

**Files:**
- Create: `packages/validators/src/trainers.ts`
- Create: `packages/validators/src/notifications.ts`
- Create: `packages/validators/src/billing.ts`
- Create: `packages/validators/src/reports.ts`
- Create: `packages/validators/src/trainers.test.ts`
- Create: `packages/validators/src/notifications.test.ts`
- Create: `packages/validators/src/billing.test.ts`
- Create: `packages/validators/src/reports.test.ts`
- Modify: `packages/validators/src/index.ts`
- Modify: `packages/db/src/schema/trainers.ts`
- Create: `packages/db/src/schema/trainer-settings.ts`
- Modify: `packages/db/src/schema/relations.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/seeds/demo.ts`
- Modify: `packages/db/src/seeds/demo.test.ts`
- Create: migration gerada por `pnpm.cmd --filter @muvit/db generate`

**Interfaces:**
- Produces: `trainerProfileSchema`, `updateTrainerProfileSchema`, `notificationPreferencesSchema`, `updateNotificationPreferencesSchema`, `trainerSubscriptionSchema`, `updateTrainerSubscriptionSchema`, `billingInvoiceSchema`, `reportQuerySchema` e `studentReportSchema`.
- Produces: tabelas `trainer_notification_preferences`, `trainer_subscriptions` e `billing_invoices` e novos campos opcionais de `trainers`.

- [ ] **Step 1: Escrever testes de validators que fixem os contratos públicos**

```ts
expect(updateTrainerProfileSchema.parse({
  name: 'João Pereira',
  email: 'joao@example.com',
  phone: '+55 11 99999-9999',
  bio: 'Treinador especializado em força.',
  specialties: ['Hipertrofia'],
})).toMatchObject({ email: 'joao@example.com' });

expect(reportQuerySchema.safeParse({ range: 'custom', from: '2026-08-10', to: '2026-08-01' }).success)
  .toBe(false);
expect(updateTrainerSubscriptionSchema.parse({ plan: 'pro', billingInterval: 'annual' }))
  .toEqual({ plan: 'pro', billingInterval: 'annual' });
```

- [ ] **Step 2: Executar os testes e confirmar falha por exports ausentes**

Run: `pnpm.cmd --filter @muvit/validators test`
Expected: FAIL porque os quatro módulos ainda não existem.

- [ ] **Step 3: Implementar schemas e tipos compartilhados**

```ts
export const notificationChannelSchema = z.enum(['email', 'push', 'both']);
export const billingIntervalSchema = z.enum(['monthly', 'annual']);
export const invoiceStatusSchema = z.enum(['issued', 'paid', 'void']);
export const reportRangeSchema = z.enum(['30d', '90d', '6m', 'all', 'custom']);
export type StudentReport = z.infer<typeof studentReportSchema>;
```

`studentReportSchema` deve conter `student`, `period`, `physicalEvolution`, `beforeAfter`, `workoutAdherence`, `trainingFrequency`, `topExercises`, `rpeTrend`, `summary` e flags `hasEnoughData` por seção. Valores monetários usam inteiros em centavos.

- [ ] **Step 4: Escrever testes comportamentais de persistência e seed**

```ts
await expect(db.insert(schema.billingInvoices).values({
  trainerId,
  plan: 'starter',
  billingInterval: 'monthly',
  amountCents: 0,
  currency: 'BRL',
  status: 'issued',
  issuedAt: new Date('2026-08-07T12:00:00Z'),
})).rejects.toThrow();
await expect(db.insert(schema.trainerSubscriptions).values({
  trainerId,
  plan: 'starter',
  billingInterval: 'monthly',
  status: 'active',
  startsAt: new Date('2026-08-07T12:00:00Z'),
}).then(() => db.insert(schema.trainerSubscriptions).values({
  trainerId,
  plan: 'pro',
  billingInterval: 'annual',
  status: 'active',
  startsAt: new Date('2026-08-07T12:00:00Z'),
}))).rejects.toThrow();
expect(scenario.billingInvoices.every((invoice) => invoice.amountCents > 0)).toBe(true);
```

- [ ] **Step 5: Implementar schema Drizzle e seed demonstrativo**

Adicionar a `trainers`: `phone`, `bio`, `specialties`, `updatedAt`. Criar preferências um-para-um com defaults de 7 dias e canais aprovados; assinatura um-para-um com plano, periodicidade, status, início e renovação; faturas com trainer, plano, periodicidade, centavos, moeda, status e datas.

- [ ] **Step 6: Gerar e aplicar a migration no banco de teste**

Run: `pnpm.cmd --filter @muvit/db generate`
Expected: nova migration Drizzle contendo apenas os campos, tabelas, índices e FKs desta tarefa.

Run: `pnpm.cmd --filter @muvit/db migrate:test`
Expected: PASS contra PostgreSQL de teste em `localhost:5433`.

- [ ] **Step 7: Verificar contratos e banco**

Run: `pnpm.cmd --filter @muvit/validators test`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/validators typecheck`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db test`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/validators packages/db
git commit -m "feat(dados): adiciona contratos da área autenticada"
```

### Task 2: Perfil do treinador sincronizado com Better Auth

**Files:**
- Create: `apps/api/src/modules/auth/trainer-identity-updater.ts`
- Create: `apps/api/src/modules/auth/repositories/better-auth-trainer-identity-updater.ts`
- Modify: `apps/api/src/modules/trainers/repositories/trainers-repository.ts`
- Modify: `apps/api/src/modules/trainers/repositories/drizzle-trainers-repository.ts`
- Create: `apps/api/src/modules/trainers/use-cases/get-trainer-profile.ts`
- Create: `apps/api/src/modules/trainers/use-cases/update-trainer-profile.ts`
- Create: `apps/api/src/modules/trainers/use-cases/update-trainer-profile.test.ts`
- Modify: `apps/api/src/modules/trainers/factory.ts`
- Modify: `apps/api/src/routes/trainers.ts`
- Modify: `apps/api/src/routes/trainers.test.ts`
- Modify: `apps/api/src/lib/auth.ts`

**Interfaces:**
- Consumes: `trainerProfileSchema`, `updateTrainerProfileSchema`.
- Produces: `GET /trainers/me` (`operationId: getTrainerProfile`) e `PATCH /trainers/me` (`operationId: updateTrainerProfile`).
- Produces: `TrainerIdentityUpdater.updateIdentity(input): Promise<void>` para isolar Better Auth.

- [ ] **Step 1: Escrever teste unitário da compensação de e-mail**

```ts
const useCase = new UpdateTrainerProfileUseCase(repository, identityUpdater);
await expect(useCase.execute(identity, {
  name: 'João Atualizado',
  email: 'novo@example.com',
})).rejects.toMatchObject({ code: 'profile_update_failed' });
expect(identityUpdater.updateIdentity).toHaveBeenNthCalledWith(1, {
  authUserId: identity.authUserId,
  current: { email: 'antigo@example.com', name: 'João', image: null },
  next: { email: 'novo@example.com', name: 'João Atualizado', image: null },
});
expect(identityUpdater.updateIdentity).toHaveBeenNthCalledWith(2, {
  authUserId: identity.authUserId,
  current: { email: 'novo@example.com', name: 'João Atualizado', image: null },
  next: { email: 'antigo@example.com', name: 'João', image: null },
});
```

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `pnpm.cmd --dir apps/api test -- src/modules/trainers/use-cases/update-trainer-profile.test.ts`
Expected: FAIL porque caso de uso e porta ainda não existem.

- [ ] **Step 3: Implementar leitura, atualização e compensação**

```ts
export interface TrainerIdentityUpdater {
  updateIdentity(input: {
    authUserId: string;
    current: { email: string; name: string; image: string | null };
    next: { email: string; name: string; image: string | null };
  }): Promise<void>;
}
```

O caso de uso lê o perfil atual, altera o e-mail pelo adapter Better Auth quando necessário, atualiza o perfil e restaura o e-mail anterior se a persistência de domínio falhar. Nome e avatar também são refletidos na identidade usando a API nativa configurada em `MuvitAuth`.

- [ ] **Step 4: Escrever testes de rota para leitura, atualização e conflitos**

Cobrir 200, 400, 401, 403 e 409; confirmar no banco que `auth_users.email` e `trainers.email` permanecem iguais depois do sucesso e da compensação.

- [ ] **Step 5: Implementar rotas e wiring**

Registrar schemas Zod de request/response e construir o adapter Better Auth a partir de `app.auth`, sem importar Better Auth nos casos de uso de treinador.

- [ ] **Step 6: Verificar módulo**

Run: `pnpm.cmd --dir apps/api test -- src/modules/trainers/use-cases/update-trainer-profile.test.ts src/routes/trainers.test.ts`
Expected: PASS.

Run: `pnpm.cmd --dir apps/api typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth apps/api/src/modules/trainers apps/api/src/routes/trainers.ts apps/api/src/routes/trainers.test.ts apps/api/src/lib/auth.ts
git commit -m "feat(api): sincroniza perfil do treinador"
```

### Task 3: Assinatura interna, faturas e limites de alunos

**Files:**
- Create: `apps/api/src/modules/billing/plan-catalog.ts`
- Create: `apps/api/src/modules/billing/repositories/billing-repository.ts`
- Create: `apps/api/src/modules/billing/repositories/drizzle-billing-repository.ts`
- Create: `apps/api/src/modules/billing/use-cases/get-subscription.ts`
- Create: `apps/api/src/modules/billing/use-cases/update-subscription.ts`
- Create: `apps/api/src/modules/billing/use-cases/update-subscription.test.ts`
- Create: `apps/api/src/modules/billing/use-cases/get-invoice.ts`
- Create: `apps/api/src/modules/billing/factory.ts`
- Create: `apps/api/src/routes/billing.ts`
- Create: `apps/api/src/routes/billing.test.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/modules/students/use-cases/assert-student-plan-limit.ts`
- Create: `apps/api/src/modules/students/use-cases/assert-student-plan-limit.test.ts`
- Modify: `apps/api/src/modules/students/use-cases/create-student.ts`
- Modify: `apps/api/src/modules/students/use-cases/update-student.ts`
- Modify: `apps/api/src/modules/students/factory.ts`
- Modify: `apps/api/src/routes/students.test.ts`

**Interfaces:**
- Produces: `PLAN_CATALOG` com limites e preços mensais/anuais em centavos.
- Produces: `GET /trainers/me/subscription` (`operationId: getTrainerSubscription`), `PATCH /trainers/me/subscription` (`operationId: updateTrainerSubscription`) e `GET /trainers/me/invoices/:id` (`operationId: getTrainerInvoice`).
- Produces: `StudentPlanLimitPolicy.assertCanActivate(trainerId, excludingStudentId?)`.

- [ ] **Step 1: Escrever testes de catálogo, troca de plano e limite**

```ts
expect(await useCase.execute(identity, { plan: 'pro', billingInterval: 'annual' }))
  .toMatchObject({ subscription: { plan: 'pro', billingInterval: 'annual' } });
expect(repository.createdInvoice).toMatchObject({ status: 'issued', plan: 'pro' });
await expect(freePlanPolicy.assertCanActivate(trainerId)).rejects
  .toMatchObject({ code: 'student_plan_limit_exceeded' });
await expect(teamPlanPolicy.assertCanActivate(trainerId)).resolves.toBeUndefined();
```

No fixture do plano free, o treinador já possui três alunos ativos; no fixture team, possui mais de 50. Cobrir criação do quarto aluno no plano free, reativação acima do limite e plano team ilimitado.

- [ ] **Step 2: Executar testes e confirmar falha**

Run: `pnpm.cmd --dir apps/api test -- src/modules/billing src/modules/students/use-cases/assert-student-plan-limit.test.ts`
Expected: FAIL por módulos ausentes.

- [ ] **Step 3: Implementar catálogo e casos de uso de cobrança interna**

Atualização de plano e criação de fatura devem ocorrer na mesma transação do repositório. Redução abaixo do uso atual retorna `plan_limit_conflict`. Documento de fatura retorna dados estruturados para página imprimível, nunca um pagamento simulado.

- [ ] **Step 4: Integrar política de limite a criação e reativação**

Executar a política somente quando o resultado será `active`; edições de dados de aluno já ativo não repetem contagem desnecessária. A policy depende de uma porta pequena que informa plano e quantidade ativa.

- [ ] **Step 5: Escrever e implementar testes de rota**

Cobrir ownership da fatura, plano inválido, downgrade bloqueado, troca válida, 401/403 e erro de limite em `POST/PATCH /students`.

- [ ] **Step 6: Verificar módulos**

Run: `pnpm.cmd --dir apps/api test -- src/modules/billing src/modules/students src/routes/billing.test.ts src/routes/students.test.ts`
Expected: PASS.

Run: `pnpm.cmd --dir apps/api typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/billing apps/api/src/modules/students apps/api/src/routes/billing.ts apps/api/src/routes/billing.test.ts apps/api/src/routes/students.test.ts apps/api/src/app.ts
git commit -m "feat(api): adiciona assinatura interna e limites"
```

### Task 4: Preferências e execução de notificações

**Files:**
- Modify: `apps/api/src/modules/notifications/repositories/notifications-repository.ts`
- Modify: `apps/api/src/modules/notifications/repositories/drizzle-notifications-repository.ts`
- Create: `apps/api/src/modules/notifications/use-cases/get-notification-preferences.ts`
- Create: `apps/api/src/modules/notifications/use-cases/update-notification-preferences.ts`
- Create: `apps/api/src/modules/notifications/use-cases/update-notification-preferences.test.ts`
- Modify: `apps/api/src/modules/notifications/use-cases/run-daily-notifications.ts`
- Create: `apps/api/src/modules/notifications/use-cases/run-daily-notifications.test.ts`
- Create: `apps/api/src/modules/notifications/use-cases/notify-new-student.ts`
- Modify: `apps/api/src/modules/notifications/factory.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Create: `apps/api/src/routes/notifications.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/modules/students/use-cases/create-student.ts`

**Interfaces:**
- Produces: `GET /trainers/me/notification-preferences` (`operationId: getTrainerNotificationPreferences`) e `PATCH /trainers/me/notification-preferences` (`operationId: updateTrainerNotificationPreferences`).
- Produces: defaults efetivos mesmo sem linha persistida.
- Consumes: serviços atuais `sendEmail` e `sendPush`.

- [ ] **Step 1: Escrever testes de defaults, persistência e job**

```ts
expect(await getPreferences.execute(trainerIdentity)).toMatchObject({
  inactivity: { enabled: true, afterDays: 7, channel: 'both' },
});
expect(services.sendEmail).not.toHaveBeenCalled();
expect(services.sendPush).toHaveBeenCalledOnce();
```

Cobrir preferências ausentes, evento desativado, canal `email`, `push`, `both`, treino vencendo, avaliação pendente e falha não bloqueante ao notificar novo aluno.

- [ ] **Step 2: Executar testes e confirmar falha**

Run: `pnpm.cmd --dir apps/api test -- src/modules/notifications`
Expected: FAIL pelos novos contratos ainda não implementados.

- [ ] **Step 3: Implementar casos de uso e repositório**

O job carrega preferências por treinador, calcula datas com o prazo configurado e envia somente pelos canais habilitados. `notify-new-student` captura falha de entrega depois da persistência do aluno e registra apenas categoria e IDs de domínio.

- [ ] **Step 4: Implementar rotas e testes HTTP**

Cobrir 200, 400, 401 e 403 e confirmar upsert idempotente por trainer.

- [ ] **Step 5: Verificar notificações**

Run: `pnpm.cmd --dir apps/api test -- src/modules/notifications src/routes/notifications.test.ts src/jobs/notifications.test.ts`
Expected: PASS.

Run: `pnpm.cmd --dir apps/api typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/notifications apps/api/src/routes/notifications.ts apps/api/src/routes/notifications.test.ts apps/api/src/modules/students/use-cases/create-student.ts apps/api/src/app.ts
git commit -m "feat(api): persiste preferências de notificações"
```

### Task 5: Agregação autorizada de relatórios

**Files:**
- Create: `apps/api/src/modules/reports/report-period.ts`
- Create: `apps/api/src/modules/reports/report-summary.ts`
- Create: `apps/api/src/modules/reports/repositories/reports-repository.ts`
- Create: `apps/api/src/modules/reports/repositories/drizzle-reports-repository.ts`
- Create: `apps/api/src/modules/reports/use-cases/get-student-report.ts`
- Create: `apps/api/src/modules/reports/use-cases/get-student-report.test.ts`
- Create: `apps/api/src/modules/reports/factory.ts`
- Create: `apps/api/src/routes/reports.ts`
- Create: `apps/api/src/routes/reports.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `reportQuerySchema`, `studentReportSchema`, `StudentAccessPolicy`.
- Produces: `GET /reports/students/:studentId` (`operationId: getStudentReport`).

- [ ] **Step 1: Escrever testes puros de período e resumo**

```ts
expect(resolveReportPeriod({ range: '90d' }, new Date('2026-08-07T12:00:00Z')))
  .toEqual({ from: '2026-05-10', to: '2026-08-07' });
expect(buildReportSummary(report)).toContain('concluiu 18 de 24 treinos');
```

Cobrir `30d`, `90d`, `6m`, `all`, intervalo customizado, ausência de avaliações, uma avaliação, ausência de RPE e séries sem carga.

- [ ] **Step 2: Executar teste e confirmar falha**

Run: `pnpm.cmd --dir apps/api test -- src/modules/reports`
Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar repositório de leituras enxutas**

Separar consultas de avaliações/fotos, logs, séries/exercícios e planos. O caso de uso agrega em memória somente as linhas do período e retorna arrays ordenados por data. Não incluir regra de apresentação nem nomes de classes CSS.

- [ ] **Step 4: Implementar autorização e rota**

Reutilizar `StudentAccessPolicy` para negar aluno de outro treinador. Validar query e resposta com Zod. Cobrir 200, 400, 401, 403/404 conforme política atual e relatório sem dados.

- [ ] **Step 5: Verificar relatórios**

Run: `pnpm.cmd --dir apps/api test -- src/modules/reports src/routes/reports.test.ts`
Expected: PASS.

Run: `pnpm.cmd --dir apps/api typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/reports apps/api/src/routes/reports.ts apps/api/src/routes/reports.test.ts apps/api/src/app.ts
git commit -m "feat(api): adiciona relatórios de evolução"
```

### Task 6: Regeneração do SDK e shell autenticado responsivo

**Files:**
- Modify: `apps/web/src/lib/api/**` via gerador oficial
- Modify: `apps/web/src/app/(app)/layout.tsx`
- Modify: `apps/web/src/app/(app)/layout.test.tsx`
- Modify: `apps/web/src/components/sidebar.tsx`
- Modify: `apps/web/src/components/sidebar.test.tsx`
- Create: `apps/web/src/components/mobile-app-navigation.tsx`
- Create: `apps/web/src/components/mobile-app-navigation.test.tsx`
- Modify: `apps/web/src/components/top-bar.tsx`
- Modify: `apps/web/src/components/top-bar.test.tsx`

**Interfaces:**
- Consumes: OpenAPI atualizado das Tasks 2–5.
- Produces: navegação para Dashboard, Alunos, Treinos, Exercícios, Relatórios e Configurações em desktop e viewport estreito.

- [ ] **Step 1: Escrever testes do shell e da navegação**

```tsx
expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/reports');
expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/settings/profile');
expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
```

Cobrir estado ativo, logout, nome/avatar, menu compacto e fechamento por `Escape`.

- [ ] **Step 2: Iniciar API e regenerar SDK**

Run em terminal 1: `pnpm.cmd --dir apps/api dev`
Expected: OpenAPI disponível em `http://localhost:3333/docs/openapi.json`.

Run em terminal 2: `pnpm.cmd --dir apps/web api:gen`
Expected: SDK contém funções tipadas para perfil, billing, notificações e relatórios.

- [ ] **Step 3: Executar testes do shell e confirmar falhas visuais/semânticas**

Run: `pnpm.cmd --dir apps/web test -- src/app/(app)/layout.test.tsx src/components/sidebar.test.tsx src/components/mobile-app-navigation.test.tsx`
Expected: FAIL pela navegação e componente mobile ausentes.

- [ ] **Step 4: Implementar shell compartilhado**

Manter sidebar de 260 px no desktop; disponibilizar navegação compacta abaixo de `lg`; permitir que rotas full-height, como `/workouts`, removam padding por composição explícita e não por seletores frágeis.

- [ ] **Step 5: Verificar shell e SDK**

Run: `pnpm.cmd --dir apps/web test -- src/app/(app)/layout.test.tsx src/components/sidebar.test.tsx src/components/mobile-app-navigation.test.tsx src/components/top-bar.test.tsx`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api apps/web/src/app/'(app)'/layout.tsx apps/web/src/app/'(app)'/layout.test.tsx apps/web/src/components
git commit -m "feat(web): atualiza shell da área autenticada"
```

### Task 7: Alinhamento de Dashboard, perfil do aluno e exercícios

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx`
- Modify: `apps/web/src/components/stat-card.tsx`
- Modify: `apps/web/src/components/stat-card.test.tsx`
- Modify: `apps/web/src/components/student-list-table.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/page.test.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/_personal-info-card.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/_active-workout-card.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/_latest-assessment-card.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/_weight-evolution-chart.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/_student-overview-cards.test.tsx`
- Modify: `apps/web/src/app/(app)/exercises/page.tsx`
- Modify: `apps/web/src/app/(app)/exercises/page.test.tsx`
- Modify: `apps/web/src/app/(app)/exercises/_create-dialog.tsx`

**Interfaces:**
- Consumes: contratos existentes de resumo, alunos, avaliações, treinos e exercícios.
- Produces: correspondência visual com `dM0L4`, `Wg556`, `FsBnA` e `grTSd`.

- [ ] **Step 1: Atualizar testes para a hierarquia e estados aprovados**

Testar quatro métricas do Pencil, tabela “Lista de alunos”, cabeçalho/abas do perfil, três colunas, cards de exercício com placeholder visual, busca, filtros, vazio, erro e modal acessível.

```tsx
expect(screen.getByRole('heading', { name: 'Lista de alunos' })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('dialog', { name: 'Novo exercício personalizado' })).toBeInTheDocument();
```

- [ ] **Step 2: Executar testes focados e confirmar falhas**

Run: `pnpm.cmd --dir apps/web test -- src/app/(app)/dashboard/page.test.tsx src/app/(app)/students/[id]/page.test.tsx src/app/(app)/exercises/page.test.tsx`
Expected: FAIL nas novas expectativas de composição.

- [ ] **Step 3: Implementar a menor alteração visual correta**

Usar tokens de `globals.css`, reduzir cards genéricos, preservar Server Components e manter gráficos com resumo textual. Busca de exercícios deve vir da URL; filtros não duplicam estado local.

- [ ] **Step 4: Verificar testes e cobertura visual crítica**

Run: `pnpm.cmd --dir apps/web test -- src/app/(app)/dashboard src/app/(app)/students/[id] src/app/(app)/exercises`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web test:coverage:ui`
Expected: cobertura crítica >= 85% para arquivos incluídos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(app)'/dashboard apps/web/src/app/'(app)'/students/'[id]' apps/web/src/app/'(app)'/exercises apps/web/src/components/stat-card.tsx apps/web/src/components/stat-card.test.tsx apps/web/src/components/student-list-table.tsx
git commit -m "feat(web): alinha dashboard alunos e exercícios"
```

### Task 8: Wizard de aluno e avaliações

**Files:**
- Create: `apps/web/src/application/students/student-wizard.ts`
- Create: `apps/web/src/application/students/student-wizard.test.ts`
- Create: `apps/web/src/app/(app)/students/new/_student-wizard.tsx`
- Create: `apps/web/src/app/(app)/students/new/_student-wizard.test.tsx`
- Modify: `apps/web/src/app/(app)/students/new/page.tsx`
- Create: `apps/web/src/app/(app)/students/new/page.test.tsx`
- Modify: `apps/web/src/app/(app)/students/new/actions.ts`
- Modify: `apps/web/src/application/students/student-form.ts`
- Modify: `apps/web/src/application/students/student-form.test.ts`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/new/page.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/new/page.test.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/_form.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/_form.test.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/page.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/assessments/page.test.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/_chart.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/_chart.test.tsx`

**Interfaces:**
- Produces: `StudentWizardDraft`, `validateBasicStep`, `validateGoalsStep`, `buildCreateStudentPayload`.
- Consumes: `createStudentAction`, fluxo presign de fotos e contratos de avaliações.

- [ ] **Step 1: Escrever testes puros do wizard**

```ts
expect(validateBasicStep({ name: '', email: '', phone: '' })).toEqual({ name: 'Informe o nome.' });
expect(buildCreateStudentPayload(draft)).toEqual({
  name: 'Maria Costa',
  email: 'maria@example.com',
  phone: '+55 11 99999-9999',
  goals: 'Hipertrofia; nível intermediário',
  restrictions: 'Dor leve no ombro direito.',
  status: 'active',
});
```

- [ ] **Step 2: Executar testes e confirmar falha**

Run: `pnpm.cmd --dir apps/web test -- src/application/students/student-wizard.test.ts src/app/(app)/students/new`
Expected: FAIL porque o modelo e componente ainda não existem.

- [ ] **Step 3: Implementar wizard sem persistência parcial**

Estado permanece no Client Component até submissão da etapa 2. Etapa 3 recebe o ID criado e oferece links exatos para `/workouts?studentId=...`, `/students/:id/assessments/new` e `/students/:id`.

- [ ] **Step 4: Atualizar testes e UI de avaliações**

Cobrir record new, histórico vazio, avaliação única, comparação, ausência de fotos/medidas, erro e responsividade estrutural. Preservar action fina e upload presign.

- [ ] **Step 5: Verificar fluxo**

Run: `pnpm.cmd --dir apps/web test -- src/application/students src/app/(app)/students/new src/app/(app)/students/[id]/assessments`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/application/students apps/web/src/app/'(app)'/students/new apps/web/src/app/'(app)'/students/'[id]'/assessments
git commit -m "feat(web): implementa cadastro guiado e avaliações"
```

### Task 9: Construtor canônico de treinos

**Files:**
- Modify: `apps/web/src/application/workouts/workout-editor-model.ts`
- Modify: `apps/web/src/application/workouts/workout-editor-model.test.ts`
- Modify: `apps/web/src/app/(app)/workouts/page.tsx`
- Create: `apps/web/src/app/(app)/workouts/page.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-builder.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-details-panel.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-day-tabs.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-exercise-table.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-empty-state.tsx`
- Create: `apps/web/src/app/(app)/workouts/_exercise-drawer.tsx`
- Create: `apps/web/src/app/(app)/workouts/actions.ts`
- Modify: `apps/web/src/app/(app)/workouts/new/page.tsx`
- Modify: `apps/web/src/app/(app)/workouts/new/page.test.tsx`
- Delete after parity: `apps/web/src/app/(app)/workouts/new/_editor.tsx`
- Delete after parity: `apps/web/src/app/(app)/workouts/new/_editor.test.tsx`
- Delete after parity: `apps/web/src/app/(app)/workouts/new/actions.ts`

**Interfaces:**
- Produces: `/workouts` canônico e redirecionamento `/workouts/new?studentId=...`.
- Consumes: `createWorkoutPlan`, `getStudents`, `getExercises` e modelo puro do editor.

- [ ] **Step 1: Expandir testes do modelo puro**

Cobrir draft inicial, sete dias, renomear/remover, ordenação por teclado, datas inválidas, notas, descarte preservando aluno e payload integral.

- [ ] **Step 2: Executar teste e confirmar lacunas**

Run: `pnpm.cmd --dir apps/web test -- src/application/workouts/workout-editor-model.test.ts`
Expected: FAIL nas novas regras ainda ausentes.

- [ ] **Step 3: Implementar modelo mínimo e fazê-lo passar**

Usar tipos explícitos `WorkoutDraft`, `WorkoutDayDraft`, `WorkoutExerciseDraft` e funções puras; nenhum import React, Next ou SDK.

- [ ] **Step 4: Escrever teste integrado do builder**

```tsx
expect(screen.getByRole('heading', { name: 'Detalhes do treino' })).toBeInTheDocument();
expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: 'Adicionar exercício' }));
expect(screen.getByRole('dialog', { name: 'Adicionar exercício' })).toBeInTheDocument();
```

Cobrir drawer, foco/Escape, filtros, tabela, notas, remoções confirmadas, salvar, erro, ausência de aluno e ausência de exercícios.

- [ ] **Step 5: Implementar página e componentes route-local**

O drawer sobrepõe o painel central no desktop e usa backdrop abaixo de `lg`. O layout full-height não reduz a tabela. A action apenas chama SDK, traduz erro, revalida e redireciona.

- [ ] **Step 6: Implementar redirecionamento legado e remover editor antigo**

Só remover `_editor.tsx` e action antiga depois de todos os testes equivalentes passarem no novo builder.

- [ ] **Step 7: Verificar construtor**

Run: `pnpm.cmd --dir apps/web test -- src/application/workouts src/app/(app)/workouts`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web test:coverage:core`
Expected: cobertura bloqueante >= 85%.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/application/workouts apps/web/src/app/'(app)'/workouts
git commit -m "feat(web): implementa construtor de treinos do Pencil"
```

### Task 10: Tela de Relatórios e versão imprimível

**Files:**
- Create: `apps/web/src/application/reports/report-query.ts`
- Create: `apps/web/src/application/reports/report-query.test.ts`
- Create: `apps/web/src/app/(app)/reports/page.tsx`
- Create: `apps/web/src/app/(app)/reports/page.test.tsx`
- Create: `apps/web/src/app/(app)/reports/_report-filters.tsx`
- Create: `apps/web/src/app/(app)/reports/_report-dashboard.tsx`
- Create: `apps/web/src/app/(app)/reports/_physical-evolution.tsx`
- Create: `apps/web/src/app/(app)/reports/_before-after.tsx`
- Create: `apps/web/src/app/(app)/reports/_workout-performance.tsx`
- Create: `apps/web/src/app/(app)/reports/_report-summary.tsx`
- Create: `apps/web/src/app/(app)/reports/print/page.tsx`
- Create: `apps/web/src/app/(app)/reports/print/print-button.tsx`

**Interfaces:**
- Consumes: `getStudentReport` gerado e lista de alunos.
- Produces: URL derivada de `studentId`, `range`, `from`, `to`; versão imprimível sem navegação do app.

- [ ] **Step 1: Escrever teste puro de query**

```ts
expect(parseReportSearchParams({ studentId: 'id', range: '90d' })).toEqual({
  studentId: 'id',
  range: '90d',
});
expect(buildReportHref({ studentId: 'id', range: 'custom', from: '2026-01-01', to: '2026-02-01' }))
  .toBe('/reports?studentId=id&range=custom&from=2026-01-01&to=2026-02-01');
```

- [ ] **Step 2: Executar testes e confirmar falha**

Run: `pnpm.cmd --dir apps/web test -- src/application/reports src/app/(app)/reports`
Expected: FAIL por arquivos ausentes.

- [ ] **Step 3: Implementar Server Component, filtros e seções**

Filtros alteram a URL; charts recebem dados prontos; cada seção cobre dados insuficientes. Fotos usam URLs da API e `alt` descritivo. Tabelas/resumos equivalentes tornam gráficos acessíveis.

- [ ] **Step 4: Implementar impressão funcional**

`/reports/print` reutiliza os dados e componentes sem sidebar, inclui CSS `@media print` e um Client Component cujo único efeito explícito é `window.print()` após ação do usuário.

- [ ] **Step 5: Verificar relatório**

Run: `pnpm.cmd --dir apps/web test -- src/application/reports src/app/(app)/reports`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/application/reports apps/web/src/app/'(app)'/reports
git commit -m "feat(web): adiciona relatórios de evolução"
```

### Task 11: Configurações de perfil, notificações e cobrança

**Files:**
- Create: `apps/web/src/components/settings-navigation.tsx`
- Create: `apps/web/src/components/settings-navigation.test.tsx`
- Create: `apps/web/src/app/(app)/settings/layout.tsx`
- Create: `apps/web/src/app/(app)/settings/profile/page.tsx`
- Create: `apps/web/src/app/(app)/settings/profile/page.test.tsx`
- Create: `apps/web/src/app/(app)/settings/profile/_profile-form.tsx`
- Create: `apps/web/src/app/(app)/settings/profile/actions.ts`
- Create: `apps/web/src/application/settings/profile-form-data.ts`
- Create: `apps/web/src/application/settings/profile-form-data.test.ts`
- Create: `apps/web/src/app/(app)/settings/notifications/page.tsx`
- Create: `apps/web/src/app/(app)/settings/notifications/page.test.tsx`
- Create: `apps/web/src/app/(app)/settings/notifications/_notification-form.tsx`
- Create: `apps/web/src/app/(app)/settings/notifications/actions.ts`
- Create: `apps/web/src/app/(app)/settings/billing/page.tsx`
- Create: `apps/web/src/app/(app)/settings/billing/page.test.tsx`
- Create: `apps/web/src/app/(app)/settings/billing/_plan-selector.tsx`
- Create: `apps/web/src/app/(app)/settings/billing/actions.ts`
- Create: `apps/web/src/app/(app)/settings/billing/invoices/[id]/page.tsx`

**Interfaces:**
- Consumes: endpoints gerados de perfil, preferências, assinatura e faturas.
- Produces: settings shell com entradas ativas e “Em breve” desabilitadas.

- [x] **Step 1: Escrever testes de parsers e layout**

```tsx
expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('aria-current', 'page');
expect(screen.getByText('Integrações')).toHaveAttribute('aria-disabled', 'true');
expect(parseProfileFormData(formData)).toEqual({
  name: 'João Pereira',
  email: 'joao@example.com',
  specialties: ['Hipertrofia', 'Reabilitação'],
});
```

- [x] **Step 2: Executar testes e confirmar falha**

Run: `pnpm.cmd --dir apps/web test -- src/application/settings src/app/(app)/settings src/components/settings-navigation.test.tsx`
Expected: FAIL por rotas e componentes ausentes.

- [x] **Step 3: Implementar Meu Perfil**

Formulário com nome, e-mail, telefone, bio, especialidades e avatar; action fina; erros de e-mail duplicado e sincronização exibidos sem perder dados. Depois do sucesso, `revalidatePath` para settings e layout e `router.refresh()` no cliente.

- [x] **Step 4: Implementar Notificações**

Controles acessíveis para enable/canal/prazo; salvar via action; impedir submissão concorrente; refletir defaults vindos da API sem duplicá-los no componente.

- [x] **Step 5: Implementar Plano e Cobrança**

Catálogo vem da resposta da API; troca de plano/periodicidade usa `ConfirmationDialog`; downgrade inválido apresenta erro; tabela de faturas liga para documento imprimível com ownership validado.

- [x] **Step 6: Verificar configurações**

Run: `pnpm.cmd --dir apps/web test -- src/application/settings src/app/(app)/settings src/components/settings-navigation.test.tsx`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/application/settings apps/web/src/app/'(app)'/settings apps/web/src/components/settings-navigation.tsx apps/web/src/components/settings-navigation.test.tsx
git commit -m "feat(web): adiciona configurações do treinador"
```

### Task 12: Verificação visual e qualidade integrada

**Files:**
- Modify only when a verification exposes a scoped defect: files changed in Tasks 1–11.
- Modify if recurring operational knowledge changed: responsible local `AGENTS.md` or `docs/operations/*`.

**Interfaces:**
- Consumes: aplicação completa e banco de teste migrado.
- Produces: evidência de testes, cobertura e comparação visual.

- [x] **Step 1: Executar verificações de validators e banco**

Run: `pnpm.cmd --filter @muvit/validators test`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/validators typecheck`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db test`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db typecheck`
Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db migrate:test`
Expected: PASS.

- [x] **Step 2: Executar verificações da API**

Run: `pnpm.cmd --dir apps/api test`
Expected: PASS.

Run: `pnpm.cmd --dir apps/api typecheck`
Expected: PASS.

Run: `pnpm.cmd exec biome check apps/api packages/db packages/validators`
Expected: PASS.

- [x] **Step 3: Executar verificações web**

Run: `pnpm.cmd --dir apps/web test`
Expected: PASS.

Run: `pnpm.cmd --dir apps/web test:coverage:core`
Expected: PASS com piso >= 85%.

Run: `pnpm.cmd --dir apps/web test:coverage:ui`
Expected: PASS com piso >= 85%.

Run: `pnpm.cmd --dir apps/web typecheck`
Expected: PASS.

Run: `pnpm.cmd exec biome check apps/web`
Expected: PASS.

- [x] **Step 4: Iniciar stack local e comparar com o Pencil**

Run: `pnpm.cmd dev`
Expected: API em `3333` e web em `3000` sem erros de inicialização.

Verificar em 1440 px: Dashboard, perfil do aluno, builder preenchido/vazio, exercícios/modal, três etapas de aluno, avaliação nova/histórico, relatórios e três telas de settings. Comparar hierarquia, dimensões, cores, tipografia, alinhamento, conteúdo e estados com os IDs listados em Global Constraints.

- [x] **Step 5: Verificar responsividade e acessibilidade**

Verificar 1024 px, 768 px e 375 px; teclado completo; foco de dialogs/drawers; `Escape`; retorno de foco; overflow; tabelas; textos alternativos; console sem erro ou warning de hidratação.

- [x] **Step 6: Executar verificações finais de diff e UTF-8**

Run: `git diff --check`
Expected: nenhuma saída.

Run: `rg -n '\\u[0-9A-Fa-f]{4}' apps/api apps/web packages/db packages/validators docs`
Expected: nenhuma ocorrência nova usada para representar texto pt-BR.

Run: `git status --short`
Expected: somente mudanças intencionais; `packages/db/.env.test~clear` continua não rastreado e não incluído.

- [x] **Step 7: Commit de correções de verificação, se necessário**

Se houver correções, adicionar explicitamente apenas os arquivos já pertencentes às Tasks 1–11, revisar `git diff --cached` e executar:

```bash
git commit -m "fix(web): corrige paridade visual e acessibilidade"
```

Se nenhuma correção for necessária, não criar commit vazio.
