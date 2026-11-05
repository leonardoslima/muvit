# Confirmação de email — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar tarefa a tarefa. Steps use checkbox (`- [ ]`) syntax for tracking. A rodada já foi autorizada de modo autônomo; commit, push e PR pertencem ao coordenador.

**Goal:** Confirmar emails pelo Better Auth e aplicar a mesma política de acesso na API, Web e Mobile.

**Architecture:** Preservar sessões no cadastro e provisionamento existente; autorizar dados privados somente com email verificado. Resend entrega links nativos temporários. UI de confirmação é pública e consulta a sessão como fonte de verdade.

**Tech Stack:** Fastify, Better Auth 1.6.23, Drizzle/PostgreSQL, Resend, Next.js, Expo Router, Vitest, Maestro.

**Spec:** `docs/superpowers/specs/2026-11-04-confirmacao-email-design.md`.

## Global Constraints

- UTF-8 literal em pt-BR; não adicionar dependências nem tokens/endpoints de auth paralelos.
- `expiresIn: 3600`; `sendOnSignUp: true`; `sendOnSignIn: false`; `autoSignInAfterVerification: false`.
- Acesso privado exige email verificado; auth, confirmação, reenvio, recuperação e logout permanecem acessíveis.
- Reenvio com limite Fastify de 3/minuto/IP; cooldown de UI de 60 segundos.
- Callbacks Web `/verify-email` e Mobile `muvit://verify-email`, somente em origens confiáveis.
- Workers não iniciam agentes, alteram Linear, fazem commit/push/PR ou merge. Preserve alterações alheias.

## Review Focus

- Cadastro ainda provisiona perfil se a entrega falhar ou estiver ausente; Task 1 prova isso.
- Sessão antiga reflete a confirmação sem criar outra identidade ou acesso automático; Tasks 1, 3 e 4.
- Callbacks externos, JWT expirado e URLs forjadas não liberam UI privada nem vazam tokens; Tasks 1, 3 e 4.
- Trocar email verificado não concede confiança ao endereço novo nem deixa perfil divergente; Task 2.
- Seed e fixtures não criam bypass de produção ou mascaram o fluxo pendente; Task 5.

---

### Task 1: Confirmação nativa, entrega e autorização

**Files:** modificar `apps/api/src/lib/auth.ts`, `apps/api/src/modules/auth/repositories/drizzle-auth.ts`, `apps/api/src/app.ts`, `apps/api/src/lib/mailer.ts`, `apps/api/src/plugins/auth.ts`, `apps/api/src/routes/better-auth.ts`; criar `apps/api/src/routes/email-verification.test.ts`, `apps/api/src/lib/email-verification-mailer.test.ts`; atualizar `apps/api/src/plugins/auth.test.ts` e testes de logger se necessário.

**Interfaces:** exportar `EmailVerificationMessage = { user: { name: string; email: string }; url: string }`, `SendVerificationEmail = (message: EmailVerificationMessage) => Promise<void>`; adicionar envio e callback seguro de falha às factories e `BuildAppOptions`. `AuthSession.user.emailVerified: boolean` atravessa `mapSession`. Reusar `sendPasswordResetEmail` como padrão, sem acoplar as duas operações.

- [ ] Escrever e rodar testes RED de cadastro pendente com perfil, envio único inicial, ausência/falha de serviço, callback permitido/exterior, autorização 403 antes e sucesso após confirmação, tokens inválidos/expirados e repetição idempotente.
- [ ] Escrever testes RED de reenvio genérico para conta ausente/verificada sem sessão, rejeição de email de outra conta com sessão, cooldown por IP, callback externo sem entrega e recuperação/logout disponíveis enquanto pendente.
- [ ] Configurar mecanismo nativo; preservar `requireEmailVerification` desativado para manter `newSession` no provisionamento. Injetar entrega assíncrona com captura de falha segura; não devolver token nem erro do provedor.
- [ ] Registrar `/send-verification-email` explicitamente com rate limit; validar callback de envio/cadastro por mecanismo suportado do Better Auth ou hook pequeno que reutiliza sua validação de origem. Não presumir que `verify-email` sozinho protege o envio de links externos.
- [ ] Aplicar gate em `requireAuth`, preservando cookies, papéis e resolução de perfil. Testar conta sem perfil além de conta pendente.
- [ ] Rodar `pnpm.cmd --dir apps/api test -- src/routes/email-verification.test.ts src/plugins/auth.test.ts src/lib/email-verification-mailer.test.ts src/routes/password-reset.test.ts`; rodar `pnpm.cmd --dir apps/api typecheck`.

### Task 2: Troca de email preserva confirmação e consistência

**Files:** `apps/api/src/modules/auth/trainer-identity-updater.ts`, `repositories/better-auth-trainer-identity-updater.ts` e teste; novo decorador `apps/api/src/modules/auth/repositories/drizzle-auth-adapter.ts` e testes; `repositories/drizzle-auth.ts`; `apps/api/src/modules/trainers/use-cases/update-trainer-profile.ts` e testes; `apps/api/src/modules/trainers/repositories/*` pertinentes; `apps/api/src/lib/auth.ts`; `packages/validators/src/trainers.ts`; `apps/api/src/routes/trainers.ts` e testes; Web `settings/profile` e módulo `profile-form-data`.

**Interfaces:** manter `TrainerProfile.email` como email efetivo. Se necessário, estender resposta de PATCH com `emailVerificationPending?: boolean` e atualizar schemas, SDK e consumidores no mesmo diff. O decorador recebe executor Drizzle e configurações do adapter oficial; retorna a mesma factory de adapter, inferida de `typeof drizzleAdapter`, mantendo o contrato nativo. Não usar `db` no hook nem atualizar tabelas auth com SQL próprio.

- [ ] Reproduzir por teste o comportamento nativo de `changeEmail` em conta verificada após ativar envio: email antigo permanece até confirmar. O updater atual lança conflito nessa condição; registrar RED antes de corrigir.
- [ ] Adaptar o caminho de atualização para solicitar confirmação nativa e preservar email antigo em domínio; demais alterações de perfil mantêm o tratamento de conflito e compensação. Passar callback Web confiável à operação nativa.
- [ ] Adicionar teste RED de troca sem cookie: nenhuma sessão/cookie ou atualização de identidade/perfil pode ocorrer. Implementar defesa em `databaseHooks.session.create.before` que lança `APIError` quando `context?.path === '/verify-email'`. Testar confirmação simples sem sessão como caso separado que continua válido.
- [ ] Acrescentar testes RED de falha de sincronização e colisão com email único de perfil sem identidade auth correspondente: email antigo deve permanecer em auth e domínio, e mesmo token deve funcionar após remover a causa da falha. Testar duas confirmações concorrentes e confirmação concorrente com PATCH de nome/email.
- [ ] Implementar decorador do adapter nativo: em update de user com email, resolver identidade/perfil, adquirir advisory lock transacional pelo profileId, delegar update ao adapter Drizzle oficial vinculado a tx e atualizar perfil em tx. Retornar resultado nativo; erro faz rollback. Preservar o caminho `adapter.transaction` com o mesmo decorador para evitar bypass; não abrir transação aninhada inadvertidamente.
- [ ] Entregar link de troca pela superfície de UI para executar `authClient.verifyEmail` com cookie/SecureStore atual. Sem sessão, pedir login e nova solicitação; com conta diferente, rejeitar sem mutação. Não usar `afterEmailVerification` como garantia de consistência nem presumir que `autoSignInAfterVerification:false` controla a troca nativa.
- [ ] Exibir aviso claro de confirmação pendente no formulário; só apresentar email efetivo retornado. Atualizar SDK por `pnpm.cmd --dir apps/web api:gen` quando API exclusiva estiver pronta.
- [ ] Rodar testes direcionados de updater, use case, rota trainers, validators e formulário. Se surgir conflito material de atomicidade com a compensação atual, devolver ao planejador com teste reproduzível; não substituir por erro genérico ou troca silenciosa.

### Task 3: Confirmação Web e proteção de navegação

**Files:** criar `apps/web/src/app/(auth)/verify-email/page.tsx`, `apps/web/src/lib/use-email-verification.ts` e testes; modificar `apps/web/src/lib/auth-server.ts` e testes, `src/proxy.ts` e testes, `(auth)/signup/page.tsx`, `(auth)/login/page.tsx` e testes; atualizar `src/lib/auth-errors.ts` se necessário.

**Interfaces:** o hook consome `authClient.sendVerificationEmail({email, callbackURL})`, `authClient.getSession()` e `authClient.signOut()`, expondo pending/error/sent/cooldown e refresh. `AuthUser` inclui `emailVerified`; `requireUser()` redireciona pendentes a `/verify-email`.

- [ ] Escrever testes RED de cadastro/login pendente encaminhado à confirmação; sessão verificada segue destino atual. Testar proxy deixando confirmação pública com/sem cookie.
- [ ] Implementar página com email da sessão, reenvio seguro e saída; sem sessão, permitir informar email para reenvio genérico e oferecer login. Não depender de query de email para identificar a conta autenticada.
- [ ] Callback de sucesso refaz sessão; somente `emailVerified=true` libera continuação. Sem sessão, informar que é necessário entrar; `INVALID_TOKEN`/`TOKEN_EXPIRED` exibem feedback e reenvio. Ausência de `error` sozinha nunca prova confirmação.
- [ ] Enviar `callbackURL` no cadastro; mostrar sucesso como solicitação enviada, sem comprovar entrega externa. Loading/rede/429 impedem duplicação e possuem feedback acessível.
- [ ] Rodar testes de auth-server, proxy, login/signup e nova página; `pnpm.cmd --dir apps/web typecheck`.

### Task 4: Confirmação Mobile e deep link

**Files:** criar `apps/mobile/app/(auth)/verify-email.tsx`, hook local e testes; modificar `app/_layout.tsx`, `src/application/navigation/role-navigation.ts` e testes, `src/__tests__/root-layout.test.tsx`, `src/__tests__/auth-screens.test.tsx`, `(auth)/signup.tsx`, `(auth)/login.tsx`.

**Interfaces:** ampliar `RouteArea` com área pública de confirmação e `RouteAccessInput` com estado de verificação; `mobileRoutes.verifyEmail = '/(auth)/verify-email'`. `emailVerified` vem exclusivamente de `authClient.useSession()`; não criar armazenamento paralelo.

- [ ] Testes RED para pendente tentando áreas student/trainer, confirmação com/sem sessão, recovery público e papéis desconhecidos. Atualizar fixtures de sessões verificadas explicitamente.
- [ ] Implementar superfície usando `AuthRecoveryLayout`/primitives v2, campos e feedback existentes. Compartilhar somente apresentação comprovadamente equivalente; não redesenhar login.
- [ ] Cadastro inclui callback `muvit://verify-email`; login pendente vai à confirmação. Deep link aceita erros nativos, refaz sessão e só continua com verificação real. Testar app aberto em outra conta e estado offline.
- [ ] Reenvio usa email da sessão ou entrada pública validada, possui cooldown e estado de rede. Logout limpa sessão/cache conforme padrão existente.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile doctor`.

### Task 5: Seed, fixtures, documentação e E2E permanente

**Files:** `apps/api/src/modules/auth/repositories/demo-identity-repository.ts`, `drizzle-demo-identity-repository.ts`, `src/seed-demo.ts`, testes de seed; `apps/api/test/helpers/auth.ts`, `test/helpers/build.ts`, `test/e2e-mobile/fixtures.ts` e harnesses que criem contas de negócio; criar `.maestro/mobile/confirmacao-email.yaml` e `apps/web/test/e2e/email-verification.md`; atualizar `apps/api/src/modules/auth/AGENTS.md`, `apps/mobile/AGENTS.md`, documentação operacional de confirmação.

**Interfaces:** adicionar `markEmailVerified(authUserId: string): Promise<void>` exclusivamente ao repositório de seed. Helpers de negócio criam/verificam contas explicitamente; suíte de confirmação usa cadastro bruto para conservar estado inicial falso. Preferir confirmação nativa capturada por callback injetado nos testes de autenticação, sem tokens próprios.

- [ ] Testar seed idempotente com somente contas demo verificadas e guarda de produção; conta real recém-criada permanece pendente. Não mudar dados de outros usuários.
- [ ] Atualizar helpers e fixtures de negócio para manter cenários existentes representativos; não desativar gate global em testes. Rerodar testes de recuperação e perfil que usam o helper.
- [ ] Escrever E2E de cadastro → pendente → reenvio → confirmação → acesso e inválido/expirado, usando harness de QA injetado e infra exclusiva. Maestro independente recebe link preparado pelo harness; não expor mailbox no produto.
- [ ] Documentar configuração Resend, política para contas existentes, retorno/deep link, limites, comportamento idempotente e seed local. Atualizar regras locais no mesmo diff.

### Task 6: Validação integrada e handoff ao coordenador

- [ ] Confirmar `.env` copiados sem imprimir segredos e PostgreSQL/API desta rodada. Executar migrations no banco exclusivo antes dos testes; não concorrer DB e API truncando as mesmas tabelas.
- [ ] Rodar suíte API completa, Web/Mobile completas, typechecks dos três apps e validators, builds API/Web, Biome dos caminhos alterados e cobertura core/UI dos clientes afetados conforme regras locais.
- [ ] Rodar QA real Web no navegador Orca e Android em AVD exclusivo: cadastro, bloqueio, reenvio/cooldown, link válido, inválido/expirado, sessão existente/ausente, retorno por papel, troca de email e recuperação sem regressão. Informar entrega externa separadamente.
- [ ] Conferir diff/arquivos não rastreados, segredos e `\\u[0-9a-fA-F]{4}` em textos alterados; salvar logs/capturas/relatório apenas em `artifacts/muv-15/<execucao>/`.
- [ ] Devolver arquivos, comandos, exit codes, evidências e limites ao coordenador. Coordenador obtém revisão independente da HEAD, publica PR para `develop`, verifica CI/review corrente e atualiza Linear sem merge.

## Evidências consultadas

- `apps/api/src/lib/auth.ts`, `app.ts`, `plugins/auth.ts`, `routes/better-auth.ts`, `routes/password-reset.test.ts`, `lib/mailer.ts`.
- `apps/api/node_modules/better-auth/dist/api/routes/{email-verification,sign-up,update-user}.mjs`: fonte da versão instalada para expiração JWT, idempotência, sessões e troca pendente.
- `packages/db/src/schema/auth.ts`; profile updater/use cases; seed e helpers reais.
- `apps/web/src/lib/auth-server.ts`, `src/proxy.ts`, páginas signup/login e settings/profile.
- `apps/mobile/app/_layout.tsx`, páginas signup/login e política de navegação.
- AGENTS raiz e locais de API/auth/Web/Mobile/db/validators; `docs/operations/{qa-artifacts,password-recovery,mobile-e2e}.md`.

## Auto revisão do plano

Os oito critérios do card estão cobertos pelas Tasks 1–5; validação e revisão estão na Task 6. Não há necessidade de migration para `emailVerified`, já existente. O maior risco é a troca de email do perfil, explicitamente isolada na Task 2; é obrigatório provar esse comportamento antes de considerar a confirmação pronta.
