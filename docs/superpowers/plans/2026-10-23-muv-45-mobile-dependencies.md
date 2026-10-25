# MUV-45 — Dependências mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar atualizações mobile compatíveis e auditadas, preservando os fluxos do MVP e entregando evidência verificável na PR.

**Architecture:** Manter Expo SDK 54 e o conjunto nativo recomendado, atualizar dependências em lotes revisáveis e migrar Zod para 4.6.7 com os consumidores indispensáveis para corrigir o advisory alcançável. Preservar contratos compartilhados com testes específicos de PATCH, ambiente, serialização e OpenAPI; validar web e alterar somente se necessário.

**Tech Stack:** Node >=24, pnpm 10.0.0, Expo 54, React Native 0.81.5, React 19.1.0, Router 6, NativeWind 4/Tailwind 3, Better Auth, Zod 4.6.7 (baseline 3.25.76), fastify-type-provider-zod 6.1.0, Vitest 4, Maestro, Android SDK/ADB e PostgreSQL 16 descartável.

**Spec:** `docs/superpowers/specs/2026-10-23-muv-45-mobile-dependencies-design.md`.

## Global Constraints

- Node >=24, pnpm 10.0.0 e `nodeLinker: hoisted` permanecem os contratos operacionais desta entrega.
- Expo SDK 54 com React Native 0.81.5, React/React DOM/react-test-renderer 19.1.0, Expo Router 6 e New Architecture habilitada é a linha inicial de compatibilidade.
- NativeWind 4.2.7, react-native-css-interop 0.2.7 e Tailwind CSS 3 formam o conjunto de estilos; não migrar a NativeWind 5 RC ou Tailwind 4 neste card.
- Preservar Better Auth como origem única da sessão, SecureStore, cookies, isolamento por papel, dados offline e contratos Zod compartilhados. Não reintroduzir Sentry.
- A exceção major justificada desta entrega é Zod 3.25.76 → 4.6.7, integrada entre mobile, validators e API/provider/env para tratar GHSA-mrhx-c7xc-m3w5. Web deve ser validado e alterado somente se a compatibilidade exigir; preservar entradas/saídas e semântica de PATCH.
- Sem force, `--legacy-peer-deps`, supressão de Doctor, mudança funcional ou redesign. Major só com necessidade, guia oficial, migração delimitada e verificação executável.
- Trabalhar na worktree/claim atuais; copiar `.env` ignorados antes de setup, sem imprimir segredos. Nenhum worker faz push, commit, Linear ou GitHub por conta própria; integração cabe ao coordenador.
- Evidências completas em `artifacts/muv-45/<execucao>/`, ignoradas pelo Git; documentação versionada contém decisões e resumos verificáveis. Preservar UTF-8 literal pt-BR.
- A auditoria exige implementação: relatório sem atualização compatível aplicada não satisfaz MUV-45.

## Review Focus

- React web 19.2.7 ou Metro 0.85.3 hoisted alcançando RN 0.81.5 deve ser detectado por resolução/bundle real e instalação limpa (tarefas 1/2/6).
- Upgrade parcial de Navigation pode criar contextos duplicados ou peers divergentes; atualizar trio e provar tabs/Back/deep links (tarefas 3/6).
- Mudança Query/auth não pode cruzar cache privado entre contas nem perder hidratação depois de reabrir; testes existentes e E2E de isolamento devem continuar cobrindo o contrato (tarefas 3/4/6).
- Atualização Babel/Tailwind pode produzir bundle que compila sem aplicar classes, fontes ou ícones; verificar cn/tokens e inspecionar UI Android real (tarefas 3/4/6).
- Zod 4 não pode aplicar status draft em PATCH omisso, remover aceitação de IPv6, alterar respostas Date→ISO ou empobrecer OpenAPI; testes schema/rota/env/serialização e consumidores provam preservação (tarefa 5).
- Advisory alcançável pré-auth não comprova exploração; bodyLimit padrão 1 MiB reduz entrada, mas não prova mitigação. Registrar cadeia, correção, limites e eventuais transitivas ainda afetadas com fonte oficial (tarefas 1/5/6).

## Mapa de arquivos e responsabilidades

| Arquivos | Responsabilidade |
| --- | --- |
| `apps/mobile/package.json`, `pnpm-lock.yaml` | Versões diretas e resolução coerente dos lotes |
| `apps/mobile/{babel.config.js,metro.config.js,tailwind.config.ts,app.json}` | Apenas ajuste de compatibilidade demonstrado; não antecipar mudanças |
| `apps/mobile/src/lib/design-system/cn.test.ts`, `apps/mobile/src/components/navigation/app-tabs.test.tsx`, `apps/mobile/src/__tests__/{auth-screens,root-layout,tabs-layout,trainer-tabs-layout}.test.tsx` | Regressões existentes de estilos, navegação e sessão; confirmar nomes no checkout |
| `apps/mobile/src/lib/`, `apps/mobile/src/screens/`, `.maestro/mobile/` | Correções/testes somente quando uma integração atualizada exigir; organização por funcionalidade |
| `apps/api/package.json`, `packages/validators/package.json`, `apps/api/src/env.ts`, `packages/validators/src/workouts.ts` | Migração Zod integrada e preservação de IP/PATCH; ler AGENTS locais antes |
| `apps/api/src/app.ts`, `apps/api/src/routes/workouts.test.ts`, `packages/validators/src/workouts.test.ts`, `apps/api/src/env.test.ts` | Provider/serialização/OpenAPI e testes de contrato; criar os testes novos por funcionalidade quando não houver equivalente |
| `apps/web/src/application/workouts/workout-editor-model.test.ts`, `apps/mobile/src/application/workouts/today-workout.test.ts`, `apps/mobile/src/lib/{log-queue,workout-session-storage}.test.ts` | Regressões dos consumidores Zod; reutilizar testes existentes |
| `apps/web/package.json` e SDK gerado | Alterar apenas se compatibilidade Zod/OpenAPI exigir; validar web mesmo sem mudança |
| `docs/operations/mobile-dependencies.md` | Inventário antes/depois, política escolhida, advisories aplicáveis e adiamentos; manter conciso |
| `artifacts/muv-45/<execucao>/` | Logs completos, audit JSON, inventário bruto, exports, APK, screenshots e relatório local |

### Tarefa 1 — Baseline, inventário e caminhos de risco

**Interfaces:** Consome manifest/lockfile/configs e fontes oficiais da spec. Produz inventário de pacote, specifier, resolved, recommended, latest, ação, risco, fonte; baseline de comando/exit code e advisories por caminho. Não altera dependências nesta tarefa.

- [ ] Confirmar branch/SHA/estado local, versões Node/pnpm e `.env` copiados; criar a pasta exclusiva de artefatos, conferir `git check-ignore` e não registrar segredos.
- [ ] Registrar `pnpm.cmd --filter @muvit/mobile list --depth 0 --json` e árvore transitiva relevante; consultar `pnpm.cmd --filter @muvit/mobile outdated` e registry para cada candidata. `outdated` retornar não zero por haver updates é resultado de inventário, não falha de instalação.
- [ ] Capturar `pnpm.cmd audit --json` e `pnpm.cmd audit --prod --json` como escopo monorepo; mapear cada ocorrência relevante com `pnpm.cmd --filter @muvit/mobile why <pacote>`. Confirmar advisory oficial, ambiente de exploração e versão corrigida. Separar indisponibilidade de serviço de zero achados.
- [ ] Registrar GHSA-mrhx-c7xc-m3w5 nas cadeias mobile→Zod e mobile→validators→Zod, mais o uso API do schema; documentar validação antes de requireAuth/preHandler, bodyLimit padrão de 1 MiB e rate limit não global. Não tratar days.max(7) em Zod 3 como rejeição antecipada nem afirmar exploração comprovada. Guardar baseline de testes/typecheck validators/API/web antes do lote Zod.
- [ ] Executar `pnpm.cmd install --frozen-lockfile`, `pnpm.cmd --dir apps/mobile exec expo install --check`, `pnpm.cmd --dir apps/mobile doctor`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile test` e `pnpm.cmd exec biome check apps/mobile`. Capturar logs/exit codes e falhas preexistentes sem alterar baseline.
- [ ] Registrar baseline do export Android e iOS com `pnpm.cmd --dir apps/mobile exec expo export --platform android --output-dir <pasta-absoluta-artifacts>` e equivalente `--platform ios` em outra pasta; comparar resolução real de React/RN/Metro via `require.resolve(..., { paths: [diretorioMobile] })` e diagnósticos do bundler.
- [ ] Tentar build Android baseline conforme `docs/operations/mobile-android-build-windows.md` sem usar AVD/serviço de terceiros; registrar bloqueio concreto se existir. Comparar o bundle 54.0.37/54.0.38 publicado antes de fixar a seleção do lote 2.
- [ ] Consolidar matriz de decisões em `docs/operations/mobile-dependencies.md`, distinguindo recomendado pelo SDK, latest do registry e alvo escolhido; incluir cada dependência direta e transitive/advisory relevante.

**Gate:** baseline rastreável e inventário completo; falhas são classificadas, não ocultadas. O coordenador revisa antes do lote de mutação.

### Tarefa 2 — Expo patch e higiene de compatibilidade

**Arquivos:** `apps/mobile/package.json`, `pnpm-lock.yaml`; configs mobile só se houver incompatibilidade provada; inventário operacional.

**Interfaces:** Consome decisões da tarefa 1 e `expo@54.0.38/bundledNativeModules.json`. Produz SDK 54.0.38 com runtime React/RN/Router coerente e instalação/export reproduzíveis.

- [ ] Instalar `expo@~54.0.38` com `pnpm.cmd --filter @muvit/mobile add expo@~54.0.38`; verificar o diff do lockfile antes de prosseguir. Não executar upgrade geral para latest.
- [ ] Executar `expo install --check` pelo workspace e usar `expo install --fix` apenas após revisar a lista proposta. Manter RN 0.81.5, React/DOM/renderer 19.1.0 e módulos nativos conforme a spec; não aceitar RN 0.81.6 com React 19.1.0.
- [ ] Limitar `expo-image-picker`/`expo-secure-store` ao range `~` recomendado se isso previne deriva de SDK sem alterar versão resolvida. Conferir uso/plugins/transitivas de `expo-application` e `expo-device`; remover declaração direta apenas com prova de desuso e validação de bundling/autolinking, preservando dependências transitivas necessárias.
- [ ] Reexecutar instalação congelada, check Expo, Doctor, typecheck, suíte mobile e exports Android/iOS. Comparar avisos com baseline; investigar resolução duplicada de React/Metro em vez de injetar overrides por semelhança de número de versão.
- [ ] Atualizar inventário com antes/depois e motivo; entregar lote ao gate de revisão do coordenador.

**Gate:** patch efetivamente aplicado, lockfile consistente, nenhuma nova incompatibilidade sem tratamento; falha reproduzida exige diagnóstico antes do lote seguinte.

### Tarefa 3 — Bibliotecas JS e navegação coerente

**Arquivos:** manifest/lockfile/inventário; testes existentes de cn, tabs, auth, Query e telas afetadas. Inspecionar `rg --files apps/mobile` para escolher os testes existentes de cada integração, sem criar suíte com nome de card.

**Interfaces:** Consome instalação estável da tarefa 2. Produz conjunto Navigation com native ^7.5.1 satisfeito, estilos NativeWind 4 preservados e pacotes JS compatíveis atualizados.

- [ ] Conferir changelogs/peers e aplicar Navigation junto: `@react-navigation/native@^7.5.1`, `@react-navigation/bottom-tabs@7.21.0`, `@react-navigation/elements@2.9.45`. Confirmar Router 6 e transitivas usam contextos compatíveis, sem forçar cópia divergente de native/elements.
- [ ] Rodar testes de `app-tabs`, layouts aluno/professor e auth; asserções devem preservar shell por papel, tab selecionada, espaço inferior e hidratação antes da navegação. Se uma atualização exigir ajuste de integração, escrever/observar regressão antes da correção mínima.
- [ ] Atualizar `@tanstack/react-query@^5.104.5`, `lucide-react-native@^1.61.0`, `tailwind-merge@2.6.1` e `tailwindcss@3.4.19` após confirmar changelogs. Não mudar NativeWind/css-interop nem SVG nativo para acompanhar latest.
- [ ] Rodar testes de cn/tokens/ícones e hooks de cache/sessão; confirmar precedência das classes e isolamento por identidade. Acrescentar teste somente para comportamento de compatibilidade realmente alterado, sem snapshots que apenas espelhem versões.
- [ ] Executar suíte mobile completa, typecheck, Biome dos arquivos suportados alterados, Doctor e export Android/iOS; registrar cada atualização e eventual adiamento justificado.

**Gate:** peers Navigation satisfeitos e nenhum contrato de sessão/cache/layout alterado; QA Android funcional fica obrigatório na tarefa 6.

### Tarefa 4 — Tooling e correções de segurança por alcance

**Arquivos:** manifest/lockfile/inventário; configs/tests e manifests compartilhados apenas se a investigação provar necessidade.

**Interfaces:** Consome inventário de advisories e runtime dos lotes anteriores. Produz ferramentas compatíveis e tratamento explícito de cada achado relevante.

- [ ] Atualizar `@babel/plugin-transform-react-jsx@7.29.7`, `expo-doctor@^1.21.5` e parear `vitest@^4.1.12` com `@vitest/coverage-v8@^4.1.12`; conservar TypeScript 5.9.3, Babel preset Expo 54.0.12, RNTL 13.3.3 e renderer alinhado ao React.
- [ ] Reexecutar testes mobile, `pnpm.cmd --dir apps/mobile test:coverage:core` (piso 85%), typecheck, Biome, Doctor e export Android/iOS; investigar eventuais mudanças de runner/config sem remover testes, reduzir cobertura ou aumentar timeouts para esconder causa.
- [ ] Para Better Auth, comparar changelogs/advisories 1.6.x/1.7.x e peers reais. Se atualização for indispensável ao mobile/segurança, alinhar `better-auth`, `@better-auth/expo`, core e adapters entre mobile/API/web; ler regras locais, limitar o diff à migração comprovada e validar todos os consumidores. Caso contrário, documentar versão mantida, risco concreto e próximo passo, sem atualizar autenticação no escuro.
- [ ] Tratar demais transitivas alcançáveis com a menor atualização upstream compatível; caso override seja inevitável, demonstrar intervalo/API/testes e limitar à cadeia necessária. Preservar React distinto do web e evitar refresh global de pacotes sem relação mobile.
- [ ] Repetir audit completo/prod e `why` para comparar antes/depois; documentar findings remanescentes, severidade, alcance, impossibilidade de correção segura e ação futura. Não apresentar audit do monorepo como risco integral do mobile.
- [ ] Se compartilhados mudarem, executar testes/typecheck de validators/API/web e builds relevantes com PostgreSQL exclusivo conforme regras locais; registrar efeitos reais do lockfile mesmo sem alteração de código desses apps.

**Gate:** nenhuma vulnerabilidade relevante omitida; ferramentas pareadas e todas as mutações compartilhadas justificadas e verificadas. A correção integrada de Zod é obrigatória na tarefa 5, não um adiamento genérico por ser major.

### Tarefa 5 — Zod 4.6.7 integrado, contratos preservados

**Arquivos:** `apps/mobile/package.json`, `packages/validators/package.json`, `apps/api/package.json`, `pnpm-lock.yaml`; `packages/validators/src/workouts.ts`, `apps/api/src/env.ts` e integração do provider em `apps/api/src/app.ts` conforme necessidade. Reutilizar testes de rotas/consumidores; criar `packages/validators/src/workouts.test.ts` e `apps/api/src/env.test.ts` se não houver equivalente. Web e demais schemas/configs só mudam mediante incompatibilidade demonstrada.

**Interfaces:** Consome o baseline Zod 3 e advisory da tarefa 1. Produz objetos Zod 4.6.7 coerentes entre validators/mobile/API, provider 6.1.0 com peers satisfeitos, PATCH sem defaults implícitos e contratos HTTP/ambiente/OpenAPI preservados. O objetivo é eliminar a versão afetada nas cadeias migradas, sem alegar que limitações HTTP demonstram ausência de exploração ou que arrays ilimitados ficam imunes a abuso.

- [ ] Ler regras API/validators/web e guia Zod oficial; salvar checkpoint de todos os manifests e arquivos de integração que serão alterados. Confirmar matriz provider <=4.x→Zod3, 5/6→Zod4 e peers 6.1.0: Zod >=4.1.5, Fastify ^5.5.0, Swagger >=9.5.1, openapi-types ^12.1.3. Reutilizar a versão existente deste peer quando satisfizer; não usar overrides/bypass para manter provider 4 com Zod 4.
- [ ] Fixar regressões de contrato no baseline: `updateWorkoutPlanSchema.parse({ name: 'Treino renomeado' })` não tem propriedade status; criação sem status continua produzindo draft e conclusão sem completed continua produzindo true. No teste de rota, criar plano ativo e arquivado, enviar PATCH apenas de nome com sessão trainer e conferir status original e demais campos preservados. Registrar esses testes passando antes da migração; eles devem detectar a regressão se ocorrer no primeiro upgrade.
- [ ] Acrescentar teste de rejeição antecipada usando `z.array(z.object({ label: z.string().superRefine(contador) })).max(7)` com oito elementos: resultado inválido e contador zero. Observar falha no Zod 3 e sucesso no Zod corrigido; entrada é pequena e não faz ensaio de esgotamento de memória. Proteger também days >7 pelo schema compartilhado e preservar erros úteis dos payloads válidos/em tamanho permitido.
- [ ] Migrar Zod direto mobile/validators/API para 4.6.7 e provider API para 6.1.0 em um lote coerente; atualizar o lockfile pelo pnpm, revisar resolução/peers e não atualizar pacotes sem relação. Evitar coexistência Zod3/Zod4 nos objetos compartilhados e tipos genéricos como `parseOnlinePayload<TSchema extends z.ZodType>` do mobile. Conferir `why zod` para separar transitivas de outros proprietários.
- [ ] Adaptar o schema PATCH para que omissão de status continue ausente apesar do default de criação em Zod4; preservar default draft na criação e completed na conclusão. Ajustar somente incompatibilidades reais dos seis arquivos de schemas (coerção, UUID/datas, mensagens e transforms), sem reescrita estética de APIs apenas deprecadas. Reexecutar regressões schema/rota e confirmar plano ativo/arquivado não vira draft.
- [ ] Substituir `.ip()` de `apps/api/src/env.ts` por equivalente que aceite IPv4 e IPv6, conserve default 0.0.0.0 e rejeite hostname/inválido. Testar carregamento real do módulo env em processo/contexto isolado com ambiente válido e sem imprimir segredos; não exportar internals de produção só para testar. Escrever cenários antes da adaptação e registrar falha de importação/validação do Zod4 se aplicável.
- [ ] Provar integração provider/API: payload inválido recebe 400 com formato útil, payload válido mantém coerção/defaults; POST/GET/PATCH de treino devolvem Date→ISO, cargas/decimais e campos esperados. Consultar `/docs/openapi.json` no app de teste, exigir resposta 200 e conferir schemas de body/PATCH/resposta de workout-plans. Comparar schema antes/depois, incluindo status opcional em PATCH. Nas respostas, exigir estrutura e tipos úteis: resolver referências quando houver, conferir propriedades/dias/exercícios e exigir `createdAt` documentado como `type: string`, com formato quando fizer parte do contrato, em vez de `{}`. Provider 6.1 pode converter output inrepresentável em schema vazio sem falhar; HTTP 200 e presença do campo não bastam para aprovar OpenAPI. Preservar os tipos publicados sem apagar campos devido a transforms. Não migrar ao provider7 para resolver este lote.
- [ ] Validar consumidores com comandos focados: `pnpm.cmd --filter @muvit/validators test -- src/workouts.test.ts src/workout-load.test.ts src/workout-plan-drafts.test.ts src/assessments.test.ts`; `pnpm.cmd --dir apps/api test -- src/routes/workouts.test.ts src/env.test.ts`; `pnpm.cmd --dir apps/web test -- src/application/workouts/workout-editor-model.test.ts`; `pnpm.cmd --dir apps/mobile test -- src/application/workouts/today-workout.test.ts src/lib/log-queue.test.ts src/lib/workout-session-storage.test.ts`. Ajustar apenas caminho confirmado no checkout, sem remover as asserções de contrato. PostgreSQL da API pertence à execução.
- [ ] Executar suítes completas e typecheck de validators/API/web/mobile; `pnpm.cmd --dir apps/api build`, `pnpm.cmd --dir apps/web build`, Biome nos arquivos suportados alterados e exports mobile Android/iOS. Web deve ser validado mesmo sem diff; alterar manifest Zod/SDK gerado somente se coerência de dependências/contrato exigir e documentar por quê. Regenerar SDK somente com API/OpenAPI desta worktree, se houver alteração real de contrato.
- [ ] Repetir audit prod/completo, `why zod` e inventário: apontar a remoção de GHSA-mrhx-c7xc-m3w5 das cadeias migradas e qualquer proprietário transitivo ainda afetado. Não afirmar audit global limpo apenas porque o direto virou 4.6.7. Documentar alcance pré-auth, limite de 1 MiB, correção upstream e ausência de prova de exploração; limites estruturais adicionais/rate limit não entram silenciosamente como mudança funcional neste lote.
- [ ] Entregar o lote para revisão independente de semântica PATCH, ambiente, serialização, OpenAPI, tipos e lockfile. A tarefa 6 obrigatoriamente repete E2E aluno/professor/isolamento com esta migração integrada.

**Gate:** Zod 4.6.7/provider 6.1.0 efetivamente integrados, contratos preservados por testes específicos e consumidores validados; falha de contrato exige correção neste lote. SDK 54→58 permanece follow-up separado pela migração nativa.

### Tarefa 6 — Instalação limpa, Android real e handoff

**Arquivos:** documentação operacional e testes/fluxos existentes apenas se um gap de regressão introduzida exigir. Saídas exclusivamente em artifacts.

**Interfaces:** Consome todos os lotes integrados e gera aceite verificável, inventário final e riscos para PR; o coordenador faz publicação/revisões automáticas sem merge.

- [ ] Provar instalação limpa sem reaproveitar node_modules de outra worktree, com `pnpm.cmd install --frozen-lockfile` no checkout descartável gerenciado ou nesta worktree após verificar ownership de todos os diretórios locais regeneráveis. Não remover pastas ou caches compartilhados; registrar método e exit code.
- [ ] Executar os checks finais mobile: test, typecheck, test:coverage:core, Biome, `expo install --check`, Doctor e exports Android/iOS. A migração Zod exige também suítes/typecheck validators/API/web e builds API/web; reaproveitar resultados da tarefa 5 somente se correspondem ao mesmo estado integrado sem alterações posteriores que os invalidem. Separar execução local do CI da PR.
- [ ] Seguir `docs/operations/mobile-android-build-windows.md`: prebuild, configuração SDK local ignorada e build Android, confirmando APK existente. Usar somente AVD exclusivo com nome/serial/boot confirmados; instalar/reinstalar o Development Build; iniciar Metro da mesma worktree na porta registrada e configurar `adb -s <serial> reverse tcp:<porta> tcp:<porta>`; abrir a URL de development client indicada pelo Metro. Salvar captura de tela em que a UI renderizada pelo JavaScript desta worktree está visível e logcat focado, além de confirmar ausência de crash. Abrir a atividade por `monkey` isoladamente não comprova inicialização JS. Não tratar warning CMake como falha se Gradle finalizar com sucesso, nem tratar APK antigo como saída desta execução.
- [ ] Executar `pnpm.cmd mobile:e2e --scenario all --device <serial-confirmado> --avd-name <avd-exclusivo> --artifact-scope muv-45` conforme `docs/operations/mobile-e2e.md`. Exigir aluno, professor e isolamento com persistência/HTTP, não só API-only. Registrar que o runner usa Expo Go SDK 54, e o smoke do APK próprio é evidência separada.
- [ ] Inspecionar no runtime fontes, tokens/classes, ícones, gestos, safe area, teclado e Back; complementar gestão de alunos/exercícios, fotos/permissões e vídeo conforme os pacotes efetivamente alterados. Preservar assertions Maestro e tratar overlays conhecidos sem tornar etapas críticas opcionais. Capturas inspecionadas são requisito para alegar QA visual.
- [ ] Declarar iOS: export/checagem estática executados e respectivos resultados; build Xcode/instalação/smoke não executados quando não houver macOS. Registrar bloqueios concretos por cenário, nunca inferir aceite iOS a partir de Android.
- [ ] Atualizar `docs/operations/mobile-dependencies.md` com inventário final antes/depois, advisories, compatibilidade, adiamentos e comandos resumidos. Relatório completo local inclui SHA/estado não commitado, comandos/exit codes, capturas e limites, conforme qa-artifacts.md.
- [ ] Executar `git diff --check`; conferir `git ls-files -- artifacts` vazio; procurar escapes Unicode nos arquivos alterados com `rg -n '\\u[0-9a-fA-F]{4}' <arquivos-alterados>` e corrigir acentuação escapada. Verificar diff de manifests/lockfile e ausência de Sentry reintroduzido.
- [ ] Entregar os lotes ao coordenador para revisão técnica independente, ajustes, commit/PR, CI e revisões automáticas da skill. Corpo da PR contém inventário, fontes, migrações, validações e riscos; links locais de artifacts não equivalem a evidência compartilhada. Não fazer merge.

**Gate:** atualizações compatíveis aplicadas e verificadas, aceite Android registrado, limitações explícitas e PR pronta para revisão humana pelo fluxo autorizado.
