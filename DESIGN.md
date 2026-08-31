---
name: Muvit Mobile
description: Foundation visual compartilhada para executar, registrar e acompanhar treinos.
colors:
  background: "#F5F3EF"
  surface: "#FFFFFF"
  ink: "#1A1A1A"
  muted: "#666666"
  line: "#D1CCC4"
  primary: "#2ECC71"
  primary-soft: "#E9F9F0"
  primary-text: "#167A45"
  warning: "#F39C12"
  warning-soft: "#F39C1218"
  warning-text: "#8A4B00"
  danger: "#E74C3C"
  danger-soft: "#E74C3C18"
  danger-text: "#B42318"
  scrim: "#00000040"
  surface-translucent: "#FFFFFFB3"
typography:
  display:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "32sp"
    fontWeight: 600
  headline:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "28sp"
    fontWeight: 600
  title:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "22sp"
    fontWeight: 600
  subtitle:
    fontFamily: "Inter_400Regular"
    fontSize: "15sp"
    lineHeight: "22sp"
    fontWeight: 400
  body:
    fontFamily: "Inter_400Regular"
    fontSize: "15sp"
    lineHeight: "22sp"
    fontWeight: 400
  body-strong:
    fontFamily: "Inter_600SemiBold"
    fontSize: "14sp"
    fontWeight: 600
  label:
    fontFamily: "Inter_600SemiBold"
    fontSize: "14sp"
    fontWeight: 600
  label-compact:
    fontFamily: "Inter_600SemiBold"
    fontSize: "13sp"
    fontWeight: 600
  caption:
    fontFamily: "Inter_400Regular"
    fontSize: "12sp"
    fontWeight: 400
  button:
    fontFamily: "Inter_600SemiBold"
    fontSize: "16sp"
    fontWeight: 600
  input:
    fontFamily: "Inter_400Regular"
    fontSize: "14sp"
    fontWeight: 400
  brand:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "32sp"
    fontWeight: 600
  brand-compact:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "24sp"
    fontWeight: 600
  brand-tagline:
    fontFamily: "Inter_600SemiBold"
    fontSize: "9sp"
    fontWeight: 600
  exercise-title:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "18sp"
    fontWeight: 600
  session-title:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "24sp"
    fontWeight: 600
  sheet-title:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "26sp"
    fontWeight: 600
  timer:
    fontFamily: "SpaceGrotesk_600SemiBold"
    fontSize: "48sp"
    fontWeight: 600
rounded:
  sm: "6dp"
  md: "10dp"
  lg: "14dp"
  control: "8dp"
  sheet: "28dp"
  handle: "2dp"
  avatar: "36dp"
  pill: "999dp"
spacing:
  xs: "4dp"
  sm: "8dp"
  md: "12dp"
  lg: "16dp"
  xl: "20dp"
  xxl: "24dp"
  xxxl: "32dp"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "48dp"
    padding: "0 20dp"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "48dp"
    padding: "0 20dp"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16dp"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    height: "48dp"
    padding: "0 16dp"
  inline-message-error:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-text}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "12dp"
  state-panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24dp"
  tab-bar:
    backgroundColor: "{colors.surface-translucent}"
    rounded: "{rounded.pill}"
    height: "64dp"
    padding: "8dp"
  rest-surface:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16dp"
---

# Design System: Muvit Mobile

## Overview

**Creative North Star: "Movimento com clareza"**

Esta é uma fundação visual extraída da implementação mobile existente, não uma substituição de identidade. O Muvit usa uma base quente e discreta para deixar o treino legível, superfícies brancas para agrupar informação e verde para sinalizar ação e avanço. A combinação de Inter com Space Grotesk dá precisão ao conteúdo operacional e presença aos títulos sem transformar a execução do treino em uma experiência ornamental.

O sistema deve servir os dois shells do produto: aluno, que executa e retoma uma sessão, e professor/personal, que terá superfícies próprias de acompanhamento e operação. A linguagem estrutural é compartilhada; conteúdo, permissões, navegação e estados continuam definidos por cada fluxo. A direção visual registrada aqui assume o estado atual light-only do Expo e não antecipa o polish geral do MUV-9.

**Key Characteristics:**

- Clareza operacional antes de decoração.
- Ritmo espacial constante, com grupos reconhecíveis.
- Contraste semântico para que estados não dependam somente da cor.
- Camadas planas e bordas discretas em vez de sombras decorativas.
- Componentes pequenos que preservam safe area, teclado e contexto da sessão.

## Colors

A paleta combina um fundo quente, superfícies neutras e um único acento de movimento. Os tokens `primary`, `warning` e `danger` são adequados para preenchimentos, bordas e ícones; `primary-text`, `warning-text` e `danger-text` são as variantes para texto sobre fundo claro.

### Primary

- **Verde movimento** (`colors.primary`): ação principal, avanço, seleção e preenchimento de progresso.
- **Verde suave** (`colors.primary-soft`): fundo de badges, seleção ativa e feedback positivo.

### Neutral

- **Papel quente** (`colors.background`): canvas principal do mobile.
- **Superfície branca** (`colors.surface`): cards, campos e sheets.
- **Tinta** (`colors.ink`): texto principal e superfície escura da pausa.
- **Texto secundário** (`colors.muted`): descrições e apoio.
- **Linha mineral** (`colors.line`): bordas e trilhas de progresso.

### Feedback

- **Âmbar de atenção** (`colors.warning` / `colors.warning-text`): avisos recuperáveis, com fundo `colors.warning-soft`.
- **Vermelho de erro** (`colors.danger` / `colors.danger-text`): falhas e validações, com fundo `colors.danger-soft`.
- **Scrim** (`colors.scrim`): camada de modais bottom-sheet.
- **Superfície translúcida** (`colors.surface-translucent`): tab bar flutuante existente.

**The Semantic Contrast Rule.** Preenchimento de marca e texto semântico são papéis diferentes. Texto de estado usa as variantes `*-text`, e nenhum estado crítico pode depender somente da cor.

## Typography

**Display Font:** Space Grotesk (`SpaceGrotesk_600SemiBold`)

**Body Font:** Inter (`Inter_400Regular` e `Inter_600SemiBold`)

**Character:** Space Grotesk cria hierarquia e reconhecimento para títulos; Inter mantém labels, métricas, instruções e feedback compactos e legíveis. A escala existente é deliberadamente curta para priorizar a próxima decisão do usuário.

### Hierarchy

- **Display** (600, `typography.display`, 32sp): resumo de sessão e mensagens de conclusão que precisam marcar uma mudança de fase.
- **Headline** (600, `typography.headline`, 28sp): títulos de tela como Entrar e cabeçalhos principais.
- **Title** (600, `typography.title`, 22sp): estados, nomes e títulos de destaque dentro de uma tela.
- **Body** (400, `typography.body`, 15sp/22sp): descrições, contexto, unidades e instruções.
- **Label** (600, `typography.label`, 14sp): campos, métricas e nomenclatura de controles.
- **Caption** (400, `typography.caption`, 12sp): badges, dicas e informações auxiliares.

**The Two-Font Rule.** Use Space Grotesk para hierarquia; use Inter para operação. Não introduza outra família por tela ou por role.

## Layout

As telas usam `Screen` como shell, com safe area e canvas de fundo. O padding padrão de uma tela rolável é `spacing.xxl`; os grupos internos usam `spacing.lg`, e elementos diretamente relacionados usam `spacing.md` ou `spacing.sm`. Conteúdo que passa pela tab bar recebe o inset derivado de `BottomTabBarHeightContext`; esse comportamento é parte da fundação e não deve ser substituído por padding fixo.

A navegação do aluno mantém Hoje, Progresso e Perfil. O futuro shell do professor/personal pode reutilizar o mesmo shell e os mesmos primitivos para Início, Alunos e Perfil, sem compartilhar rotas ou caches de aluno por acidente. Em telas menores, priorize uma coluna e rolagem; em telas maiores, use flexibilidade de largura e quebra de grupos sem mudar o contrato da jornada.

## Elevation & Depth

O sistema é flat/tonal. Cards e campos usam superfície mais clara, borda de uma unidade e espaçamento interno; não há sombra normativa. Bottom-sheets usam superfície, cantos superiores amplos e scrim para separar contexto. A pausa da sessão usa uma superfície escura por contraste tonal, não por sombra.

**The Flat-by-Default Rule.** Não adicione sombra para compensar falta de hierarquia; ajuste agrupamento, espaçamento, borda ou estado primeiro.

## Shapes

Cards usam cantos suavemente curvos (`rounded.lg`), campos e controles compactos usam `rounded.md` ou `rounded.control`, e sheets usam `rounded.sheet` nos cantos superiores. Pills são reservadas para ações principais existentes, tab bar, seleção ativa e badges; não transforme todo container em cápsula. O handle do sheet e o avatar têm raios próprios para manter geometria previsível.

As áreas interativas devem respeitar pelo menos `controlSizes.touchTarget` quando o componente oferecer esse controle. A borda é um elemento estrutural: use `colors.line` em vez de linhas ad hoc.

## Components

### Buttons

- **Shape:** AppButton usa cápsula, altura de controle de 48dp e padding horizontal de 20dp; ações compactas de autenticação podem usar o raio de controle existente.
- **Primary:** fundo `colors.primary`, texto `colors.ink`, label em Inter semibold; estado desabilitado reduz opacidade sem remover a ação do layout.
- **Hover / Focus:** em native, Pressable comunica pressão por opacidade; o estado desabilitado é exposto semanticamente. Não simule hover de web no mobile.
- **Secondary:** superfície branca, borda `colors.line`, texto `colors.ink` e a mesma altura/padding da ação primária.

### Cards / Containers

- **Corner Style:** `rounded.lg` para Card e `rounded.sheet` para sheets.
- **Background:** `colors.surface` sobre `colors.background`; a sessão de descanso usa `colors.ink`.
- **Shadow Strategy:** sem sombra normativa; a separação vem de tonalidade, borda e espaçamento.
- **Border:** uma borda com `colors.line` nos cards e campos que precisam de contorno.
- **Internal Padding:** `spacing.lg` por padrão; sheets podem usar `spacing.xxl`.

### Inputs / Fields

- **Style:** campo branco, contorno mineral, `rounded.md`, altura mínima de 48dp, texto Inter e padding horizontal de `spacing.lg`.
- **Focus:** preservar o foco nativo do `TextInput`; não esconder o cursor nem substituir o teclado configurado pelo domínio.
- **Error / Disabled:** erro contextual usa `sharedStyles.error`; erros de operação usam `InlineMessage`. Labels, unidades, teclado e conteúdo esperado permanecem visíveis.

### Feedback and State

- `StatePanel` organiza loading, vazio e erro com título, descrição e retry quando aplicável.
- `InlineMessage` organiza erro, sucesso e aviso já existentes, com `accessibilityRole="alert"` e `accessibilityLiveRegion="polite"`.
- Offline, retomada, confirmação de saída, sincronização pendente e conclusão são estados funcionais: a camada visual deve torná-los legíveis sem alterar a lógica de storage, journal ou API.

### Navigation

A tab bar atual é uma cápsula translúcida flutuante, com altura de 64dp, labels em Inter semibold e seleção em fundo verde suave. A posição e o inset pertencem ao shell de navegação; telas roláveis não devem assumir que a barra é um elemento normal do fluxo. O aluno e o professor/personal podem ter labels diferentes, mas compartilham a linguagem de seleção, safe area e feedback.

### Guided Session

A sessão guiada usa card, badge de série, formulário de carga/repetições, descanso contrastado, timer e resumo. O componente visual deve acompanhar a fase real — série, descanso, próximo exercício, pronto para finalizar ou resumo — sem criar uma transição de domínio ou esconder falha de persistência.

## Do's and Don'ts

### Do:

- **Do** evoluir `apps/mobile/src/lib/styles.ts` e `apps/mobile/src/components/ui` antes de criar primitives equivalentes.
- **Do** consumir tokens semânticos para cor, tipografia, raio, espaçamento e dimensões de controle.
- **Do** preservar safe area, teclado, inset da tab bar, labels, retries, retomada e confirmação de saída.
- **Do** desenhar superfícies futuras de aluno e professor/personal com a mesma base e com guards/escopos próprios.
- **Do** usar o Pencil como referência de fluxo, conteúdo, estados e interação, enquanto `PRODUCT.md` e este documento guiam a direção visual.

### Don't:

- **Don't** tratar `assets/design/pencil_design.pen` como especificação visual pixel-perfect.
- **Don't** adicionar cores, sombras, raios ou famílias de fonte locais quando um token existente cobre o caso.
- **Don't** comunicar sucesso, erro ou offline apenas por cor, nem remover texto/ação de recuperação.
- **Don't** alterar rotas, payloads, contratos, permissões, storage, journal ou regras de role em uma mudança de foundation visual.
- **Don't** antecipar o redesign geral e o polish final do MUV-9 neste sistema.
