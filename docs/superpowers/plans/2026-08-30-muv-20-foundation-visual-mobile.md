# MUV-20 — Foundation visual mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkboxes for tracking.

**Goal:** Registrar a verdade durável do Muvit e consolidar uma foundation visual compartilhada do Expo para aluno e professor/personal, preservando os fluxos funcionais já entregues.

**Architecture:** `PRODUCT.md` será a autoridade de produto e restrições do app mobile. `DESIGN.md` e `.impeccable/design.json` documentarão os tokens e componentes reais de `apps/mobile`; `src/lib/styles.ts` continuará sendo a fonte executável. A implementação de código será uma extração incremental: tokens semânticos e uma mensagem inline compartilhada, seguida pela substituição de valores visuais duplicados, sem alterar rotas, payloads, estados de domínio ou contratos da API.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript estrito, React Native Testing Library, Vitest, Biome, Expo Router, `@expo/vector-icons`, Inter e Space Grotesk.

**Spec:** Linear MUV-20, com `PRODUCT.md` e `DESIGN.md` na raiz como artefatos normativos produzidos por este plano.

## Global Constraints

- Pencil permanece referência de fluxo, conteúdo, estados e interação; não é especificação visual pixel-perfect.
- `PRODUCT.md`, `DESIGN.md` e Impeccable orientam a direção visual e devem servir a `student` e `trainer`/professor/personal.
- Preservar autenticação, navegação atual do aluno, Hoje, sessão guiada, retomada, saída segura, fila offline, progresso, avaliação e perfil.
- Não implementar nova funcionalidade de negócio, suporte de professor, mudanças de API/schema/validators/permissões ou o polish geral do MUV-9.
- Reutilizar `src/lib/styles.ts` e `src/components/ui`; não adicionar dependências.
- Manter textos em pt-BR e acentuação como UTF-8 literal; não deixar marcadores de trabalho pendente ou placeholders.
- Respeitar safe area, teclado, áreas tocáveis mínimas e o inset existente da tab bar.

### Task 1: Fixar o contrato testável da foundation

**Files:**
- Modify: `apps/mobile/src/components/ui/ui.test.tsx`
- Create: `apps/mobile/src/lib/styles.test.ts`

**Interfaces:**
- Consumes: os exports atuais de `apps/mobile/src/lib/styles.ts` e os componentes UI existentes.
- Produces: expectativas executáveis para feedback inline, aliases semânticos de cores, escala tipográfica e dimensões de controles.

- [x] **Step 1: Escrever o teste falhando do feedback inline**

Adicionar ao teste de UI uma renderização de uma mensagem de erro com `tone="error"`, verificar o texto, o papel acessível `alert` e o fundo/borda derivados de `colors.dangerSoft` e `colors.danger`. Importar `InlineMessage` antes de sua implementação para que a falha seja causada pela ausência do primitive.

- [x] **Step 2: Escrever o teste de tokens semânticos**

Criar um teste que importe `colors`, `controlSizes`, `radii` e `typography` e verifique os valores existentes que a foundation deve preservar: `background` `#F5F3EF`, `surface` `#FFFFFF`, `ink` `#1A1A1A`, `primary` `#2ECC71`, `line` `#D1CCC4`, botão/input de 48, tab bar de 64, `radii.md` 10 e famílias Inter/Space Grotesk nos papéis correspondentes.

- [x] **Step 3: Rodar os testes para confirmar a falha correta**

Run: `pnpm.cmd --dir apps/mobile test src/components/ui/ui.test.tsx src/lib/styles.test.ts`

Expected: falha de módulo/export para `InlineMessage` e/ou os novos tokens, sem alterar código de produção para mascarar a falha.

### Task 2: Inicializar o contexto de produto com Impeccable

**Files:**
- Create: `PRODUCT.md`

**Interfaces:**
- Consumes: ticket MUV-20, contextos MUV-7/MUV-8/MUV-16/MUV-17/MUV-18/MUV-19, README e regras de `apps/mobile/AGENTS.md`.
- Produces: registro de produto em `PRODUCT.md` com o schema `impeccable:product-schema 1`.

- [x] **Step 1: Registrar plataforma e usuários confirmados**

Usar `adaptive` em `## Platform`, registrar aluno independente e professor/personal como públicos do mesmo produto, e descrever os jobs móveis sem transformar o cadastro de professor em escopo do ticket.

- [x] **Step 2: Registrar propósito, capacidades e restrições duráveis**

Documentar treino do dia, sessão guiada, progresso, avaliações, perfil, operação offline/retomada, navegação por role futura, rotas self-scoped do aluno, autenticação Better Auth, API como autoridade de regras e o estado atual light-only do Expo como restrição observada. Diferenciar fato confirmado de decisão ainda aberta e não incluir tokens ou receitas visuais.

- [x] **Step 3: Registrar princípios de experiência e acessibilidade**

Fixar continuidade do treino, clareza de estado, uma ação de cada vez na sessão, consistência entre roles, recuperação explícita de erro/offline, safe area/teclado e áreas tocáveis confortáveis. Não inventar métricas, depoimentos, claims ou compromissos de dark mode não confirmados.

### Task 3: Implementar a camada executável de tokens e feedback

**Files:**
- Modify: `apps/mobile/src/lib/styles.ts`
- Create: `apps/mobile/src/components/ui/inline-message.tsx`
- Modify: `apps/mobile/src/components/ui/ui.test.tsx`
- Modify: `apps/mobile/src/lib/styles.test.ts`

**Interfaces:**
- Consumes: os valores atuais de `colors`, `spacing`, `radii`, `fontFamilies` e `sharedStyles`.
- Produces: `colors.dangerSoft`, `colors.warningSoft`, `colors.scrim`, `colors.surfaceTranslucent`, `controlSizes`, `typography` e `InlineMessage` com `tone: 'error' | 'success' | 'warning'`.

- [x] **Step 1: Adicionar os tokens semânticos preservando os valores renderizados**

Manter os valores atuais da paleta, espaçamento e fontes. Nomear somente valores já usados ou necessários para eliminar literais repetidos: scrim `#00000040`, superfície translúcida `#FFFFFFB3`, fundos de feedback com alpha `18`, dimensões de toque/controle, raios de sheet/avatar/handle e papéis tipográficos baseados em Inter e Space Grotesk.

- [x] **Step 2: Implementar `InlineMessage`**

Renderizar uma `View` com `accessibilityRole="alert"` e `accessibilityLiveRegion="polite"`, fundo e borda derivados do tom, e `Text` com família, tamanho e cor dos tokens. O primitive recebe somente `message` e `tone`; não acessa API, storage, router ou query client.

- [x] **Step 3: Rodar o teste e confirmar o verde**

Run: `pnpm.cmd --dir apps/mobile test src/components/ui/ui.test.tsx src/lib/styles.test.ts`

Expected: todos os testes direcionados passam, incluindo o teste que falhou antes da implementação.

### Task 4: Reaplicar a foundation às superfícies atuais sem alterar comportamento

**Files:**
- Modify: `apps/mobile/src/components/ui/field.tsx`
- Modify: `apps/mobile/src/components/ui/screen.tsx`
- Modify: `apps/mobile/src/components/ui/button.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/screens/today-workout.tsx`
- Modify: `apps/mobile/src/screens/workout-overview.tsx`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Modify: `apps/mobile/src/screens/progress.tsx`
- Modify: `apps/mobile/src/screens/new-assessment.tsx`
- Modify: `apps/mobile/src/screens/profile.tsx`

**Interfaces:**
- Consumes: tokens e `InlineMessage` da Task 3, mantendo as props e callbacks públicos dos componentes existentes.
- Produces: telas visualmente equivalentes, com nomes semânticos centralizados e mensagens inline reutilizáveis para aluno e futuros fluxos do professor.

- [x] **Step 1: Substituir literais visuais por tokens**

Trocar famílias, tamanhos, raios, scrims, translucidez, alturas e espaçamentos repetidos por `typography`, `radii`, `controlSizes`, `spacing` e `colors`. Preservar composição da navegação, `BottomTabBarHeightContext`, labels, `href`, destinos e estados do MUV-8. Não mudar texto, query key, payload, fluxo de autenticação ou lógica de sessão.

- [x] **Step 2: Usar `InlineMessage` nos feedbacks existentes**

Migrar apenas mensagens já existentes de login, cadastro, avaliação, perfil e sessão guiada. Manter os mesmos textos, `accessibilityLiveRegion`, ações de retry, bloqueio durante submissão e a hierarquia de cards/modais; o componente não deve criar estados novos.

- [x] **Step 3: Rodar os testes de UI e regressão do aluno**

Run: `pnpm.cmd --dir apps/mobile test src/components/ui/ui.test.tsx src/__tests__/auth-screens.test.tsx src/__tests__/tabs-layout.test.tsx src/__tests__/root-layout.test.tsx src/screens/today-workout.test.tsx src/screens/workout-overview.test.tsx src/screens/log-workout.test.tsx src/screens/progress.test.tsx src/screens/new-assessment.test.tsx src/screens/profile.test.tsx`

Expected: os fluxos e estados observáveis continuam passando; nenhuma tela ganha nova chamada de rede, rota ou requisito de autenticação.

### Task 5: Documentar a direção visual real com `/impeccable document`

**Files:**
- Create: `DESIGN.md`
- Create: `.impeccable/design.json`

**Interfaces:**
- Consumes: `PRODUCT.md`, `apps/mobile/src/lib/styles.ts`, componentes UI, layouts de tabs, telas existentes e decisões funcionais do MUV-7.
- Produces: tokens normativos em frontmatter e extensões do sidecar, em formato reutilizável para futuros cards de aluno e professor/personal.

- [x] **Step 1: Extrair o sistema em modo scan**

Documentar a direção incumbente sem criar um mundo visual paralelo: base quente `#F5F3EF`, superfícies brancas, verde `#2ECC71` como ação, neutros `#1A1A1A`/`#666666`/`#D1CCC4`, Inter para corpo/labels e Space Grotesk para títulos. Registrar que a interface atual é flat/tonal, usa borda de 1 px, cápsula somente em controles adequados e não possui sombras normativas.

- [x] **Step 2: Escrever `DESIGN.md` no formato canônico**

Incluir frontmatter com cores, tipografia, rounded, spacing e variantes de botão/campo/card/tab. No corpo, cobrir Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components e Do's and Don'ts. Explicitar aplicação compartilhada por role, estados loading/vazio/erro/sucesso/offline, Pencil como referência funcional e limites MUV-9.

- [x] **Step 3: Escrever o sidecar sem duplicar primitives**

Usar `schemaVersion: 2`, extensões de tonal ramp, scrim, translucidez, dimensões, motion nativa limitada e componentes UI em snippets autocontidos. O sidecar deve apontar para os mesmos valores do frontmatter e declarar que os snippets web são apenas representação documental dos componentes React Native.

### Task 6: Validar o pacote e preparar o handoff

**Files:**
- Verify: `PRODUCT.md`
- Verify: `DESIGN.md`
- Verify: `.impeccable/design.json`
- Verify: arquivos modificados das Tasks 1–5

**Interfaces:**
- Consumes: diff final, testes e ferramentas do Expo.
- Produces: evidência local suficiente para o handoff, com limitações visuais explicitamente registradas.

- [x] **Step 1: Executar verificações estáticas e testes**

Run: `pnpm.cmd --dir apps/mobile test`

Run: `pnpm.cmd --dir apps/mobile typecheck`

Run: `pnpm.cmd exec biome check apps/mobile`

Run: `pnpm.cmd --dir apps/mobile doctor`

Expected: comandos com exit code 0; avisos já conhecidos do React Native devem ser distinguidos de falhas novas.

- [x] **Step 2: Verificar artefatos e UTF-8**

Executar `git diff --check` e procurar `\\u[0-9a-fA-F]{4}` somente em arquivos alterados. Conferir que os headings normativos, referências a ambos os roles, estados preservados e limites de escopo aparecem nos documentos.

- [x] **Step 3: Fazer a inspeção visual nativa disponível**

Se houver emulator/device conectado, capturar pelo menos phone Android e iPhone/simulador quando disponíveis em `.impeccable/review/`, incluindo light theme, teclado/font scale relevante, tabs e estados críticos. Se não houver ambiente visual, registrar a ausência sem iniciar processos preexistentes nem substituir screenshot por alegação.

- [x] **Step 4: Revisar o diff e produzir o handoff**

Confirmar que `assets/design/pencil_design.pen` não foi alterado, que não houve API/schema/validator/rota nova e que o código do MUV-8 permanece funcional. Registrar problemas fora do escopo separadamente e explicar como os próximos cards devem consumir os tokens/componentes e tratar o Pencil apenas como fonte funcional.
