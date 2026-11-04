# MUV-45 — Auditoria e atualização das dependências mobile

## Intenção e autorização

Auditar e aplicar atualizações seguras no mobile do Muvit, reduzindo risco de segurança e resolução sem alterar comportamento ou layout do MVP. O [card MUV-45](https://linear.app/muvit/issue/MUV-45/auditar-e-atualizar-dependencias-do-aplicativo-mobile) autoriza decisões técnicas e execução autônoma sem aprovação humana intermediária; a revisão humana ocorre na PR. Este documento registra decisões do agente, não uma escolha humana de versões.

Base inspecionada em 2026-10-23: `develop` em `6c98af86a2174a00a38249757979502f2f78afa2`, branch `chore/muv-45-auditar-e-atualizar-dependencias-do`, worktree já reservada. O planejamento não executou instalação, testes ou build e não considera o baseline aprovado.

## Restrições

- Escopo primário: `apps/mobile/package.json`, seu importer e transitivas relevantes em `pnpm-lock.yaml`, configurações/integradores mobile somente se a atualização exigir.
- Node >=24, pnpm 10.0.0 e `nodeLinker: hoisted` permanecem os contratos operacionais desta entrega.
- Expo SDK 54 com React Native 0.81.5, React/React DOM/react-test-renderer 19.1.0, Expo Router 6 e New Architecture habilitada é a linha inicial de compatibilidade.
- NativeWind 4.2.7, react-native-css-interop 0.2.7 e Tailwind CSS 3 formam o conjunto de estilos; não migrar a NativeWind 5 RC ou Tailwind 4 neste card.
- Preservar Better Auth como origem única da sessão, SecureStore, cookies, isolamento por papel, dados offline e contratos Zod compartilhados. Não reintroduzir Sentry.
- `apps/api` é o backend real; a referência a `apps/server` no card não corresponde a diretório atual.
- Compartilhados/API/web só mudam quando indispensáveis ao mobile; cada mudança exige leitura do AGENTS local e validação dos consumidores afetados.
- A exceção major justificada desta entrega é Zod 3.25.76 → 4.6.7, integrada entre mobile, validators e API/provider/env para tratar GHSA-mrhx-c7xc-m3w5. Web deve ser validado e alterado somente se a compatibilidade exigir; preservar entradas/saídas e semântica de PATCH.
- Não usar force, `--legacy-peer-deps`, desabilitação de checks ou exclusões do Doctor como solução de compatibilidade.
- Evidências completas em `artifacts/muv-45/<execucao>/`, ignoradas pelo Git; documentação versionada contém decisões e resumos verificáveis. Preservar UTF-8 literal pt-BR.

## Abordagens consideradas

1. **Somente inventário:** baixo risco, mas não cumpre o pedido explícito de implementar atualizações. Descartada.
2. **Lotes dentro da linha SDK 54 com migração Zod delimitada:** atualizar o patch Expo e dependências JS/tooling compatíveis; migrar o conjunto Zod alcançável pelo mobile e pela API para 4.6.7, preservando contratos com regressões específicas. Escolha técnica revisada após a confirmação do advisory sem correção em Zod 3; mantém o conjunto nativo recomendado e trata o risco compartilhado demonstrado.
3. **Migrar imediatamente ao último SDK:** npm publica Expo 58.0.17 na consulta atual. Exige quatro transições de SDK desde 54, novas linhas de RN/React/Router e revalidação nativa Android/iOS. Adiada salvo vulnerabilidade aplicável sem correção na linha atual que torne a migração necessária e executável com segurança. Não basta trocar todas as versões para `latest`.

## Inventário inicial e decisão por grupo

Versões abaixo são as resolvidas no importer mobile do lockfile, não somente ranges do manifest. Metadados npm foram consultados em 2026-10-23; as versões candidatas devem ser reconfirmadas antes de instalar. Nenhum dos manifests diretos consultados retornou campo `deprecated`; isso não comprova manutenção, ausência de vulnerabilidades ou saúde das transitivas.

| Dependência/grupo | Resolvida | Decisão inicial / candidata | Motivo e gate |
| --- | --- | --- | --- |
| expo | 54.0.37 | Atualizar a 54.0.38 | Patch disponível na mesma linha; comparar changelog e bundle recomendado |
| react / react-dom / react-test-renderer | 19.1.0 | Manter conjunto inicial | Bundle SDK 54.0.38 fixa 19.1.0; latest 19.3.1 não é substituição independente |
| react-native | 0.81.5 | Manter inicialmente | Bundle fixa 0.81.5; 0.81.6 existe, mas exige React ^19.1.4 e análise conjunta |
| expo-router / @expo/metro-runtime / babel-preset-expo | 6.0.24 / 6.1.2 / 54.0.12 | Manter | Últimas patches das linhas consultadas; seguem o SDK |
| expo-application / expo-device | 7.0.8 / 8.0.10 | Verificar remoção direta | Busca inicial não encontrou imports de produção; conferir plugins, autolinking, uso transitivo e bundle antes de remover |
| expo-constants / expo-dev-client / expo-font | 18.0.14 / 6.0.21 / 14.0.12 | Manter | Últimas patches das linhas SDK 54 |
| expo-image / expo-image-picker / expo-linking | 3.0.11 / 17.0.11 / 8.0.12 | Manter versões | Picker ^17.0.11 pode ser limitado a ~17.0.11 conforme bundle, sem alterar permissões |
| expo-network / expo-secure-store / expo-status-bar / expo-video | 8.0.8 / 15.0.8 / 3.0.9 / 3.0.16 | Manter versões | Network é usado no fluxo de mídia; SecureStore participa da sessão. Store ^15.0.8 pode ser limitado a ~15.0.8 |
| @react-native-async-storage/async-storage | 2.2.0 | Manter | Bundle fixa 2.2.0; latest 3.1.1 exige migração nativa/contratual separada |
| react-native-gesture-handler / reanimated / worklets | 2.28.0 / 4.1.7 / 0.5.1 | Manter | Matriz RN/Expo, não apenas semver; Reanimated 4.7.x não suporta RN 0.81 |
| react-native-safe-area-context / screens / svg | 5.6.2 / 4.16.0 / 15.12.1 | Manter | Compatíveis com bundle; latest 5.10.1 / 4.30.0 / 15.16.0 não são automaticamente recomendadas para SDK 54 |
| nativewind / react-native-css-interop | 4.2.7 / 0.2.7 | Manter | Já latest estável consultada, integração Babel/Metro existente coincide com guia v4 |
| tailwindcss / tailwind-merge | 3.4.17 / 2.6.0 | Atualizar a 3.4.19 / 2.6.1 | Patches na linha atual; preservar classes e precedência dos tokens |
| @react-navigation/native / bottom-tabs / elements | 7.2.4 / 7.16.0 / 2.9.17 | Lote conjunto 7.5.1 / 7.21.0 / 2.9.45 | Bottom-tabs/elements candidatos exigem native ^7.5.1; conferir transitivas Router e E2E de navegação |
| @tanstack/react-query | 5.100.9 | Atualizar a 5.104.5 | Mesma major; conferir cache, retry, invalidação e troca de identidade |
| lucide-react-native | 1.54.0 | Atualizar a 1.61.0 | Mesma major; conferir exportações usadas e render SVG |
| @better-auth/expo / better-auth | 1.6.23 / 1.6.23 | Avaliar correções 1.6.x antes de 1.7.12 | Plugin, core e servidor precisam coerência; minor 1.7.12 amplia integração e não deve mudar só no mobile |
| @muvit/validators / zod | workspace / 3.25.76 | Migrar a 4.6.7 em lote integrado | GHSA-mrhx-c7xc-m3w5 afeta <4.6.6, sem correção 3.x; alinhar mobile/validators/API, preservar PATCH/defaults e validar web |
| fastify-type-provider-zod (API) | 4.0.2 | Migrar a 6.1.0 | 4.x exige Zod 3; 6.1.0 aceita Zod >=4.1.5 e Fastify ^5.5.0; conferir peer openapi-types e Swagger >=9.5.1; não promover ao serializer 7.x |
| @expo-google-fonts/dm-sans / inter / space-grotesk | 0.4.2 / 0.4.2 / 0.4.1 | Manter | Todos latest consultados; Inter e Space Grotesk ainda importados pelo root layout |
| @expo/vector-icons / clsx | 15.1.1 / 2.1.1 | Manter | Já latest; Ionicons tem uso de produção nas tabs |
| @types/react / @types/react-dom | 19.1.17 / 19.1.11 | Manter linha 19.1; avaliar patches | Não promover tipos 19.3 por serem latest |
| @babel/plugin-transform-react-jsx | 7.28.6 | Atualizar a 7.29.7 | Patch/minor da major 7; Babel 8 fica adiado; declaração direta é necessária ao bundle NativeWind |
| @testing-library/react-native | 13.3.3 | Manter | Latest 14.1.0 é major com migração de tooling; preservar renderer 19.1.0 |
| vitest / @vitest/coverage-v8 | 4.1.5 / 4.1.5 | Atualizar juntos a 4.1.12 | Não misturar versões; major 5 exigiria verificar configs e peers compartilhados |
| expo-doctor / typescript | 1.18.22 / 5.9.3 | Doctor 1.21.5; manter TS 5.9.3 | TS já latest 5.x; TypeScript 7.0.2 não entra sem migração justificada |

## Auditoria transitiva e segurança

Produzir inventário executável por `pnpm list`/`pnpm why` e `pnpm audit --json`, separando produção/tooling e árvore completa do monorepo da árvore realmente alcançável pelo mobile. Para cada advisory: pacote, versão resolvida, cadeia até o importer, severidade, condições de exploração, intervalo afetado, versão corrigida e decisão. Confrontar os achados relevantes com advisories/changelogs oficiais. Falha de rede no audit não é ausência de vulnerabilidade.

Priorizar correção pelo pacote proprietário da dependência. Override só é admissível se o intervalo upstream, API e testes provarem compatibilidade, com justificativa por caminho; nunca aplicar correção global de versões transitivas de forma indiscriminada. Não declarar o app vulnerável a uma execução de servidor só porque um peer opcional ou pacote de RSC aparece no lockfile; demonstrar alcance e configuração real. Também não ignorar uma vulnerabilidade apenas porque o pacote aparece via tooling.

O lockfile inicial já contém versões de React distintas para web/mobile, peers opcionais de Next/Better Auth e `@react-native/metro-config@0.85.3` sob RN 0.81.5. Investigar resolução/autolinking efetivos antes de atribuir incompatibilidade; preservar o isolamento React do mobile. O aviso antigo de bottom-tabs no Doctor deve ser reproduzido e confrontado com o range real: 7.16.0 satisfaz ^7.4.0. Não fazer downgrade/exclusão para obter um resultado verde.

### Zod: alcance confirmado e migração integrada

GHSA-mrhx-c7xc-m3w5 é alto e afeta Zod <4.6.6; a versão escolhida é 4.6.7. A cadeia direta `apps/mobile → zod@3.25.76` e o uso de `@muvit/validators → zod@3.25.76` impedem tratar o achado apenas promovendo a dependência mobile. A API também importa esses schemas e tem Zod direto; não atualizar um consumidor isolado e deixar objetos Zod 3 atravessarem integrações Zod 4.

O alcance HTTP é anterior à autenticação: `apps/api/src/routes/workouts.ts:20` registra `requireAuth` em `preHandler`, e `:120` registra `createWorkoutPlanSchema` como body de `POST /workout-plans`; no ciclo Fastify a validação acontece antes desse hook. `apps/api/src/app.ts:50` não define bodyLimit; o padrão do Fastify 5.8.5 é 1.048.576 bytes (1 MiB). A rota não sobrescreve o limite e `app.ts:59` configura rate limit com `global: false`. Isso demonstra exposição do processamento, não prova exploração, crash ou intensidade de consumo no ambiente de produção.

`packages/validators/src/workouts.ts:29` limita days a sete, mas Zod 3.25.76 registra o erro de máximo e ainda percorre todos os elementos. `exercises` (`:19`) e `finishWorkoutLogSchema.sets` (`:107`) não têm máximo. O patch oficial 4.6.6 rejeita coleções acima do máximo antes de percorrer elementos; arrays sem máximo ainda exigem avaliar limites de entrada e amplificação de issues. O limite de 1 MiB reduz bytes aceitos, sem comprovar eliminação do risco de memória/concurrency. Não realizar carga destrutiva contra serviços compartilhados; qualquer ensaio deve ser pequeno, limitado e isolado.

A migração deve preservar estes contratos:

- `createWorkoutPlanSchema.status` tem default draft (`workouts.ts:27`), mas `updateWorkoutPlanSchema` usa `.partial()` (`:32`). Zod 4 aplica defaults dentro de opcionais; PATCH omitindo status deve continuar omitindo status, sem transformar plano ativo/arquivado em draft. O repositório persiste qualquer status definido (`apps/api/src/modules/workouts/repositories/drizzle-workout-plans-repository.ts:137`). Testar schema e rota real para provar preservação.
- `apps/api/src/env.ts:6` usa `.ip()`, removido em Zod 4. Substituir por equivalente IPv4/IPv6 mantendo o default 0.0.0.0 e rejeitando hosts inválidos; não restringir a IPv4 sem contrato explícito.
- `apps/api/src/app.ts:54-55` e `:84` dependem de validatorCompiler, serializerCompiler e jsonSchemaTransform globais. Usar provider 6.1.0 com peers satisfeitos; preservar transformação Date→ISO, decimais, defaults, respostas e erro de validação. Provider 7 altera semântica de serialização e fica fora deste lote.
- Schemas compartilhados mantêm mensagens de UI, coerção, datas, UUIDs e comportamento de updates parciais. Os seis arquivos de schemas do validators e integrações de parsing/journal/cache mobile devem ser verificados; não reescrever todos os schemas por estética ou depreciação quando o método ainda é compatível.
- Web tem uso real de `workoutExerciseInputSchema` em `apps/web/src/application/workouts/workout-editor-model.ts:2`. Validar esse fluxo, typecheck e build; mudar Zod direto/SDK gerado apenas se necessário para coerência ou se o OpenAPI realmente mudar. Nenhuma migração de formulário sem uso demonstrado.

O lote inclui manifests mobile/validators/API e lockfile; `env.ts`, schemas compartilhados e integrações do provider recebem somente adaptações necessárias. Mudanças web são condicionais. A documentação final deve distinguir eliminação do advisory nas cadeias migradas de eventuais Zod 3 transitivos ainda instalados por outros proprietários; não prometer audit global limpo se persistirem cadeias fora do lote.

## Lotes e limites de mudança

1. Baseline + inventário + auditoria, sem mudança de produto.
2. Expo 54.0.38 e higiene de ranges/declarações comprovadas; verificar CLI, Metro, instalação e bundle Android/iOS.
3. Bibliotecas JS/estilos e Navigation no conjunto compatível; testes focados em classes, tabs, auth e dados privados, mais suíte mobile.
4. Tooling pareado e tratamento de advisories reais; Better Auth apenas se a auditoria justificar uma atualização coerente entre clientes/servidor e houver validação dos consumidores.
5. Migração integrada Zod 4.6.7/provider 6.1.0, com regressões de schema/PATCH/env/serialização/OpenAPI e validação API/validators/web/mobile.
6. Instalação limpa, QA nativo e regressão final; inventário antes/depois e adiamentos na PR.

Antes de cada lote, salvar cópias de `apps/mobile/package.json` e `pnpm-lock.yaml` em `artifacts/muv-45/<execucao>/checkpoints/<lote>/`, registrar seus SHA-256 e repetir após o lote para manter um par manifest/lockfile restaurável. Para Zod/compartilhados, incluir todos os manifests e arquivos de integração modificados no checkpoint. A reversão restaura o conjunto do checkpoint anterior e exige nova instalação congelada; se o lote alterou dependências ou configuração nativas, também exige regenerar o prebuild e reconstruir/reinstalar o Development Build. O executor registra versão selecionada, origem da decisão, resultado e checkpoints. Não atualizar dependências sem relação mobile apenas por estarem no mesmo lockfile. Ajustes de código ficam limitados à compatibilidade demonstrada, com teste de regressão quando mudarem comportamento observável.

## Aceite e verificação

Instalação limpa com lock congelado; Expo install --check e Doctor; TypeScript, Biome, testes mobile e cobertura core >=85%; exports Metro Android e iOS; APK nativo e abertura por ADB em AVD exclusivo; Maestro `all` exercitando aluno, professor e isolamento com banco descartável. Confirmar volume 364 kg do aluno, avaliação 78,5 kg/170 cm e carga prescrita 24 kg do professor, além de reabertura autenticada e negações de ownership já cobertas.

A suíte Maestro existente não cobre upload de fotos, reprodução de vídeo e toda a gestão de exercícios/alunos. Avaliar smokes adicionais segundo as bibliotecas alteradas, incluindo fontes/classes, ícones, safe area, gestos, teclado e Back. iOS export/typecheck/Doctor não comprovam compilação Xcode nem execução em iPhone; na ausência de macOS, declarar esses limites. Falha preexistente não é resultado aprovado; registrar baseline e resultado final separadamente.

O lote Zod exige testes específicos e suítes/typecheck de validators/API/web/mobile, build API/web, exports mobile e E2E real. A validação inclui PATCH sem status em plano ativo e arquivado, IPv4/IPv6/default, resposta Date→ISO, esquema OpenAPI e rejeição antecipada de days acima de sete. Mudanças de Better Auth também exigem API/web e E2E real. Checks CI completos são responsabilidade da etapa de PR. A entrega termina em PR revisada para revisão humana, sem merge.

## Riscos e adiamentos

- SDK 54 está listado entre versões antigas no guia atual, e React Native 0.81 consta como Unsupported na política atual de releases do RN. O custo de permanência inclui menor janela de suporte Expo Go/EAS e menor expectativa de suporte/correções para a linha RN, além da dívida de migração. Próximo passo verificável: abrir issue própria para avaliar atualização incremental 54 → 55 → 56 → 57 → 58, registrando matrizes RN/React/Router e QA iOS por etapa. Isso não invalida aplicar correções SDK 54 agora.
- O caminho desta worktree é longo para CMake/Ninja no Windows. Se houver falha por comprimento, investigar a causa e coordenar caminho curto gerenciado preservando claim e ownership; não mascarar com timeout ou reutilizar caches nativos de outra worktree.
- Navigation, Query e auth podem alterar comportamento sem erro de tipos; E2E e smokes são gates, não opcionais só por estarem na mesma major.
- Alterar native deps exige reconstruir/reinstalar Development Build; Expo Go não prova compatibilidade do binário próprio.
- Zod é major autorizada por segurança neste card; a mitigação exige preservar semântica dos contratos. Audit sem o advisory na cadeia direta não comprova ausência de abuso de coleções ilimitadas nem elimina achados de proprietários transitivos não migrados.
- Adiamentos terão pacote/versão, risco, evidência do impedimento e próximo passo concreto; não usar uma migração grande para bloquear correções independentes.

## Fontes oficiais consultadas em 2026-10-23

- [Expo — guia incremental de atualização](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): um SDK por etapa, install --fix/Doctor e regeneração nativa conforme o projeto.
- [React Native — política de releases](https://reactnative.dev/releases/overview): status de suporte da linha 0.81.
- [Expo SDK 54 — changelog](https://expo.dev/changelog/sdk-54): RN 0.81, Android 16/edge-to-edge e diferenças de toolchain.
- [expo@54.0.38 — metadados npm](https://registry.npmjs.org/expo/54.0.38) e [bundle publicado do SDK 54.0.38](https://unpkg.com/expo@54.0.38/bundledNativeModules.json): versões recomendadas reais da linha; não confiar em redirecionamento de documentação arquivada para latest.
- [Expo — monorepos](https://docs.expo.dev/guides/monorepos/): integração Metro e riscos de duplicação de módulos nativos/React.
- [NativeWind — instalação v4](https://www.nativewind.dev/docs/getting-started/installation): Babel, Metro, Tailwind 3 e integração CSS; v5 está em documentação separada de RC.
- [Reanimated — matriz RN/Worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/): compatibilidade por minor/patch e exigência de New Architecture.
- [Better Auth — integração Expo](https://better-auth.com/docs/integrations/expo): cliente/plugin/servidor; o guia atual é escrito para SDK 55 e não autoriza substituir a matriz SDK 54 automaticamente.
- [Navigation bottom-tabs 7.21.0](https://registry.npmjs.org/@react-navigation%2fbottom-tabs/7.21.0) e [elements 2.9.45](https://registry.npmjs.org/@react-navigation%2felements/2.9.45): peers native ^7.5.1. Metadados npm diretos de todas as dependências mobile sustentam as candidatas do inventário.
- [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [correção upstream](https://github.com/colinhacks/zod/commit/a0ebf97) e [Zod 3.25.76 publicado](https://unpkg.com/zod@3.25.76/v3/types.js): intervalo afetado, correção e processamento de arrays antes/depois.
- [Zod 4 — migração](https://zod.dev/v4/changelog): defaults dentro de opcionais, remoção de .ip(), mudanças de coerção e formatos.
- [Provider Fastify/Zod — matriz oficial](https://github.com/turkerdev/fastify-type-provider-zod#zod-compatibility) e [provider 6.1.0 publicado](https://registry.npmjs.org/fastify-type-provider-zod/6.1.0): integração Zod 4 e peers necessários.
- [Fastify — lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/) e [bodyLimit](https://fastify.dev/docs/latest/Reference/Server/#bodylimit): validação anterior a preHandler e limite padrão 1 MiB, também confirmado no código publicado de Fastify 5.8.5.
