# E2E web do personal trainer

## Origem e objetivo

Planejamento delegado do [MUV-13](https://linear.app/muvit/issue/MUV-13/criar-e2e-do-fluxo-principal-do-personal), consultado em 2026-11-04. Validar a jornada real do dashboard: autenticar → cadastrar aluno → registrar avaliação → criar plano ativo; demonstrar navegação, persistência e repetibilidade. Defeitos funcionais descobertos ficam fora do diff deste card.

## Decisões do planejamento

- Usar Playwright Test com Chromium headless, API Fastify e PostgreSQL 16 reais desta worktree. Não há automação web instalada; Vitest/jsdom não cobre cookies entre navegador/API, Server Actions e navegação real.
- Manter os E2E sob `apps/web/test/e2e`, separados do roteiro manual de recuperação de senha já existente. A configuração Vitest atual inclui somente `*.test.ts`/`*.test.tsx`; usar `*.spec.ts` para Playwright.
- Preparar somente treinadores e exercício privado com os endpoints públicos existentes; criar aluno, avaliação e plano da jornada pela UI. Fixtures não dependem do seed demo nem escrevem banco diretamente.
- Cada teste recebe contas únicas e contexto de navegador vazio. Cada comando recebe PostgreSQL, API e Next exclusivos, com limpeza automática em sucesso e falha.
- O produto atual cria o treino com `Status = Ativo`; a tela de detalhe é de leitura. O cenário seleciona explicitamente `Ativo` antes de salvar e confere `status: active` persistido. Não introduzir uma transição de ativação inexistente na UI.
- Usar origens `http://127.0.0.1:<porta>` iguais no hostname para Web/API e `WEB_URL` exata. Configurar `NEXT_PUBLIC_API_URL` antes de iniciar o Next, preservando os cookies Better Auth e o encaminhamento de Cookie pelo servidor.
- Reutilizar os utilitários genéricos já exportados de `scripts/mobile-e2e.mjs` (`runCommand`, `runWithResources`, `sanitizeRecursively`) sem executar seu `run`. O guard de entrada já permite import seguro; não refatorar o runner mobile neste card.

## Alternativas consideradas

1. Ampliar Vitest/jsdom: custo baixo, mas não prova integração real nem atende ao aceite.
2. Usar serviços e seed demo compartilhados: menos setup, mas depende de estado manual e pode interferir em outras execuções.
3. Playwright com ambiente descartável: recomendado por atender o aceite e seguir a estratégia operacional do E2E mobile existente.

## Limites e critérios

- Uma jornada completa em um único teste, com `test.step` por etapa; não dividir etapas entre testes dependentes.
- Outro cenário independente protege sessão ausente e isolamento entre treinadores, com recurso estrangeiro preparado especificamente para esse teste.
- Recarregar/reabrir as páginas e ler a API autenticada para conferir valores, IDs e vínculos. Toast ou resposta HTTP bem-sucedida sem os valores esperados não basta.
- Sem mocks de rede na jornada aprovada; sem endpoints de teste, alterações de schema, SDK ou produto.
- Sem fotos, R2, entrega externa de e-mail, mobile, comparação visual ou matriz de navegadores neste escopo.
- Evidências em `artifacts/<escopo>/<execucao>/`; sem cookies, senha, tokens, arquivos `.env` ou storage state persistidos. Desativar trace/HAR/vídeo automáticos nesta primeira suíte porque podem registrar cookies e credenciais; capturas somente depois do login e sem dados reais.
- Execução de navegador é explícita (`web:e2e`); `pnpm test` mantém suites atuais e pode incluir os testes leves do runner. Integração do navegador no CI não é exigida pelo MUV-13 e fica fora deste plano.

## Riscos e ambiguidades

- O texto do aceite separa criação e ativação; a implementação web combina as duas no salvar com status escolhido. A decisão acima valida o comportamento disponível; se o coordenador exigir a transição de plano salvo em rascunho para ativo pela UI, há lacuna de produto e deve ser reportada separadamente.
- `next dev` usa lock em `.next/dev` por worktree: não compartilhar uma execução Next existente, nem removê-la; falhar com diagnóstico se a worktree já tiver um servidor ativo. Portas próprias não resolvem esse lock.
- Forçar término do processo/queda do host pode impedir `finally`; documentar recuperação apenas pelos IDs/labels do run. SIGINT/SIGTERM devem disparar a limpeza no runner.
- Falha funcional observada deve deixar o E2E vermelho e gerar evidência; não contornar assertions ou criar fixtures que executem a etapa no lugar do usuário.

## Evidências locais consultadas

`AGENTS.md`; `apps/web/AGENTS.md`; `apps/api/AGENTS.md`; `apps/api/src/modules/auth/AGENTS.md`; `packages/db/AGENTS.md`; `docs/operations/qa-artifacts.md`; `docs/operations/mobile-e2e.md`; `scripts/mobile-e2e.mjs`; `scripts/mobile-e2e.test.mjs`; `apps/api/test/e2e-mobile/fixtures.ts`; `apps/web/vitest.config.ts`; `apps/web/tsconfig.json`; manifests da raiz/Web/API/db; `.github/workflows/ci.yml`; `.gitignore`; `apps/web/src/lib/{auth-client,auth-server,api-client}.ts`; `apps/web/src/proxy.ts`; páginas/componentes das rotas login, students/new, students/[id]/assessments e workouts; `apps/web/src/application/workouts/workout-editor-model.ts`; rotas API students, assessments, exercises, trainers e workouts; `packages/validators/src/{exercises,workouts}.ts`; schema db trainers/students.

Preflight somente de leitura: HEAD `68c23230a7cb5a465919b7e03cb28e9b34cce08c`, branch `test/muv-13-e2e-personal`, Git inicialmente limpo; Node `v24.22.1`, pnpm `10.0.0`, Docker Server `29.9.1`; dependências locais Next/tsx presentes. A consulta Linear `get_agent_context` retornou `Tool not found`; issue foi obtida com sucesso. Nenhuma suíte de produto foi executada durante este planejamento.
