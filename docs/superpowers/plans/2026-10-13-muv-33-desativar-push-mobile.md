# MUV-33: desativar push mobile — Plano de implementação

> **Para agentes executores:** usar `superpowers:subagent-driven-development` ou `superpowers:executing-plans` para executar as etapas pendentes. As caixas registram conclusão observada ou evidência informada pelo executor, conforme indicado.

**Objetivo:** eliminar o carregamento e a execução da integração de push notifications no app mobile para permitir a validação do MUV-33 no Expo Go, corrigindo também as divergências comprovadas do shell durante essa validação.

**Arquitetura:** remover a integração na origem: montagem no layout do aluno, componente, helper e dependência Expo. Separar a cápsula visual da tab bar da caixa que reserva o inset inferior, usando `tabBarBackground` do navegador existente. Preservar `QueueDrain`, a Stack, os contratos da API e a navegação existente.

**Tecnologias:** Expo SDK 54, Expo Router, React Native, TypeScript, pnpm, Vitest, React Native Testing Library e ADB.

**Spec:** seção “Especificação e decisões” deste documento; escopo derivado da correção explícita do usuário e da issue [MUV-33](https://linear.app/muvit/issue/MUV-33/implementar-shell-e-navegacao-visual-mobile-v2).

## Restrições globais

- Limitar o reparo à integração mobile de push notifications e às divergências comprovadas de ícone/cápsula do shell; não alterar API, schema, autenticação, destinos, guards ou roles.
- Preservar pt-BR em UTF-8 literal e evitar escapes Unicode para acentuação.
- Reutilizar a worktree e a PR #21 existentes; entregar para revisão humana, sem merge nem Done.
- Usar API e banco isolados da worktree durante testes integrados e ADB para interação Android.
- Este registro consolida o reparo já iniciado; não representa aprovação prévia de artefato inexistente. A execução autônoma segue a autorização do usuário e a regra específica de planejamento sem aprovação intermediária da `muvit-autonomous`.

## Especificação e decisões

O commit `8f90a78` desabilitou o registro dentro de `registerPushToken`, porém `StudentLayout` ainda montava `PushTokenRegistration`, cujo import estático carregava `expo-notifications`. Interromper o helper não retirava o módulo do caminho de carregamento. O resultado desejado é um app sem import, permissões, obtenção de token ou chamada a `/students/me/push-token` provenientes dessa integração.

Alternativas consideradas: manter apenas a flag preservaria o problema de importação; condicionar um import dinâmico manteria código e dependência sem uso para uma funcionalidade explicitamente desativada. A remoção da integração é a menor solução que elimina ambos os caminhos de execução e carregamento.

Não objetivos: reativar push, configurar `projectId`, remover campos compartilhados como `expoPushToken`, alterar serviços de notificações da API, redesenhar autenticação ou migrar conteúdo interno das telas de domínio. Cards, textos e composição legacy da home do aluno/professor permanecem fora deste reparo. Os critérios originais do MUV-33 permanecem: correspondência com Pen, navegação preservada, safe area, áreas tocáveis, estados selecionados e testes relevantes.

### Complemento de brainstorming: divergências do shell

A releitura da issue confirmou que tab bars, navegação por papel, safe area e insets pertencem ao MUV-33. A inspeção direta dos exports `e46wp.png` e `O2Tlz.png` em `%TEMP%/muv33-pen-design` mostra cápsula branca compacta, com o ícone de casa na primeira aba de ambos os papéis. Antes do reparo, o fonte do aluno usava `calendar-outline` e o teste exigia esse calendário. A correção para `home-outline` mantém nome de rota `index`, label `Hoje` e todos os destinos.

A captura `%TEMP%/muv33-student-home-2026-10-13.png` mostra espaço branco adicional abaixo dos labels e sombra Android. A causa confirmada no fonte é `backgroundColor: surface` aplicado à caixa inteira de `height: 67 + insets.bottom`, com `paddingBottom: 8 + insets.bottom`. O inset necessário para reservar a área do sistema vira parte da cápsula branca. O navegador instalado também aplica `elevation: 8` por padrão; a foundation não define sombra normativa.

O executor confirmou por Pen CLI (`Print(Get("R0o8QX", {depth:2}))`) que os frames de navegação do aluno e do professor (`oyS6v`) usam `cornerRadius: 34`; o fundo selecionado usa 27. A cápsula separada deve usar `penTokens['radius/34']`, respeitando o valor literal confirmado. Esta evidência foi fornecida pelo executor e não reextraída pelo planner.

Medição direta de ambiente por ADB: resolução efetiva 840×1920, densidade física 420 dpi; a conversão nominal é 2,625 px/dp. Os tokens locais fixam cápsula em 67 dp, padding em 8 dp, gutter/deslocamento em 16 dp e alvo mínimo em 48 dp. Visualmente, a cápsula anterior aparentava cerca de 91 dp; o valor sugeriria inset de 24 dp, mas esse inset não foi instrumentado nesta inspeção e a estimativa por imagem não é uma medição exata. A altura de 67 dp provém do token, não de subtração estimada da captura. O executor informou aprovação posterior do Visual QA para cápsula 67 dp/r34, safe area, alvos de pelo menos 48 dp e ícone de casa; essa confirmação posterior substitui a pendência visual, sem transformar a estimativa anterior em medição exata.

Alternativas: reduzir a caixa inteira para 67 dp e deslocá-la por safe area exigiria mudar a reserva do `Screen` e seu contrato local; manter a superfície atual continuaria inflando a cápsula. Decisão mínima: manter caixa/reserva `67 + insets.bottom` e paddings atuais, tornar a caixa transparente e sem elevação/sombra, e desenhar somente uma superfície de 67 dp no topo via `tabBarBackground`. Esse callback é suportado pelo `BottomTabBar.tsx` instalado e seu wrapper já usa `pointerEvents="none"`; os controles permanecem interativos. Assim `BottomTabBarHeightContext` e `Screen` continuam reservando o inset uma única vez, sem nova abstração nem mudança de regra em `AGENTS.md`.

## Foco da revisão

- Entrada autenticada do aluno: a Stack e a drenagem offline continuam presentes, sem registro de push.
- Entrada do professor: o layout continua isolado dos efeitos privados do aluno.
- Inicialização no Expo Go: o bundle não carrega `expo-notifications` nem solicita permissão push.
- Instalação reproduzível: manifesto e lockfile concordam, sem mudar resolução de autenticação.
- Troca de rotas e rolagem: o reparo não introduz regressão no comportamento já exigido pelo MUV-33.

## Etapa 1: retirar a integração e preservar os layouts

**Arquivos:** `apps/mobile/app/(student)/_layout.tsx`, `apps/mobile/src/components/push-token-registration.tsx`, `apps/mobile/src/lib/push-token.ts`, `apps/mobile/src/lib/push-token.test.ts`, `apps/mobile/src/__tests__/role-layouts.test.tsx`, `apps/mobile/src/__tests__/root-layout.test.tsx`, `apps/mobile/vitest.coverage.config.ts`, `apps/mobile/package.json` e `pnpm-lock.yaml`.

**Interfaces:** consome o layout existente; produz o mesmo `StudentLayout()` com `QueueDrain` e Stack, sem interface substituta de push. Nenhum contrato da API muda.

- [x] O executor informou um ciclo RED/GREEN em `role-layouts.test.tsx`: a expectativa sem montagem de push falhou antes da remoção e passou após o reparo.
- [x] Remover import e montagem de `PushTokenRegistration` e excluir componente, helper e testes exclusivos do helper; confirmado no diff.
- [x] Retirar mocks e configuração de cobertura obsoletos; manter assertions úteis de Stack e `QueueDrain`, sem usar ausência de texto de mock removido como garantia de ausência do módulo.
- [x] Remover `expo-notifications` do manifesto e as três entradas correspondentes do lockfile; o diff inspecionado preserva as demais resoluções.
- [x] A pesquisa do planner nos fontes/configuração mobile encontrou somente a regra documental e fixtures `expoPushToken: null`, sem chamada executável restante da integração.

## Etapa 2: validar regressão e registrar limites

**Arquivos:** testes existentes e artefatos de evidência externos ao código de produto.

**Interfaces:** consome o app sem push; produz resultados verificáveis do bundle, layouts e execução Android.

- [x] O executor informou `pnpm.cmd --dir apps/mobile test --hookTimeout=30000`: 58 arquivos e 511 testes aprovados após a remoção de push, antes do complemento visual. Esse resultado não substitui a suíte final após alterações posteriores.
- [x] O executor informou suíte final aprovada com `pnpm.cmd --dir apps/mobile exec vitest run --hookTimeout=30000`: 58 arquivos e 517 testes. A tentativa padrão anterior falhou somente pelo timeout preexistente de 10 s no `beforeAll` de `log-workout`; a repetição com 30 s passou, sem alteração da configuração global.
- [x] O executor informou export Android final aprovado com `pnpm.cmd --dir apps/mobile exec expo export --platform android --output-dir <diretório temporário>`: 4.105 módulos. Os logins autenticados de aluno e professor no Expo Go via ADB já haviam sido realizados com API/banco isolados.
- [x] O executor informou pesquisa no bundle e nos fontes por módulo, API e obtenção/registro de token push sem correspondências executáveis restantes.
- [x] O executor informou typecheck e Biome aprovados para o estado final; Biome verificou 9 arquivos.
- [x] O executor informou `pnpm.cmd --dir apps/mobile run doctor`: 16/17; divergências preexistentes de versões de `sentry-expo` e `@react-navigation/bottom-tabs` permanecem registradas, sem atribuição a este reparo.
- [x] O executor confirmou instalação com lockfile congelado após o ajuste final do lockfile.
- [x] O executor informou `git diff --check` aprovado e busca de escapes Unicode aprovada nos arquivos textuais alterados.
- [x] O executor informou confirmação pós-fix do Visual QA aprovando o shell em relação à referência Pen: cápsula 67 dp/r34, safe area, alvos de pelo menos 48 dp e ícone `Hoje` como `home-outline`.
- [x] Limitação registrada pelo executor: Maestro não está instalado e não foi executado. A evidência de runtime desta sessão usa ADB/Expo Go com API/banco isolados, sem atribuir esses resultados a Maestro.

## Etapa 2A: corrigir ícone e cápsula do shell com testes primeiro

**Arquivos:** modificar `apps/mobile/app/(student)/(tabs)/_layout.tsx`, `apps/mobile/src/__tests__/tabs-layout.test.tsx`, `apps/mobile/src/components/navigation/app-tabs.tsx` e `apps/mobile/src/components/navigation/app-tabs.test.tsx`. Preservar `apps/mobile/src/components/ui/screen.tsx` e validar seus testes existentes em `apps/mobile/src/components/ui/ui.test.tsx`; nenhuma screen de domínio deve mudar.

**Interfaces:** `AppTabsLayout({ tabs }: AppTabsLayoutProps)` continua consumindo `readonly AppTab[]`; acrescentar `tabBarBackground: () => React.ReactElement` nas opções de navegação, retornando `View` com superfície branca e altura `v2ControlSizes.tabBar`. Não criar interface pública nem mudar rotas.

- [x] Expectativa de ícones atualizada em `tabs-layout.test.tsx` para `['home-outline', 'stats-chart-outline', 'person-outline']`; confirmado no fonte pelo planner.
- [x] Configuração do aluno alterada somente de `calendar-outline` para `home-outline`, preservando nomes/labels das rotas; confirmado no fonte pelo planner.
- [x] Testes de `tabBarBackground` implementados para insets inferiores `0`, `24` e `34`: superfície sempre com altura 67, cor `v2Colors.surface` e radius 34 (`penTokens['radius/34']`); caixa externa transparente, altura `67 + inset`, padding inferior `8 + inset`, padding superior 8, deslocamento vertical -16, `elevation: 0` e `shadowOpacity: 0`. Confirmado no fonte pelo planner.
- [x] `tabBarBackground` implementado com `View` e tokens existentes; caixa transparente/sem sombra, mantendo altura/paddings da reserva, `PlatformPressable` e inset do `Screen`; confirmado no fonte pelo planner.
- [x] A suíte final `pnpm.cmd --dir apps/mobile exec vitest run --hookTimeout=30000` engloba os testes de shell/aluno/professor/Screen e passou com 58 arquivos/517 testes, conforme executor. Typecheck/Biome também aprovados.
- [x] Confirmação pós-fix do Visual QA aprovada conforme executor, com cápsula 67 dp/r34, safe area, alvos de pelo menos 48 dp e `home-outline` em Hoje. Os logins autenticados de ambos os papéis precederam essa confirmação.

O plano original especificou RED antes da implementação do ícone e da cápsula; nesta atualização o planner confirmou os testes/código e recebeu os resultados acima, sem auditar novamente a ordem histórica desses ciclos. Não foi acrescentada uma alegação de RED executado sem evidência correspondente.

### Refinamento posterior: margem da seleção dentro da cápsula

A revisão independente posterior informou que a superfície do export `O2Tlz` começa em x32 e o fundo selecionado em x52; no Android ambos começam em x42. O executor confirmou a escala do export em 2×: o deslocamento esquerdo observado é 20 px / 2 = 10 dp. Isso comprova que o fundo selecionado atual encosta na lateral da cápsula, enquanto a referência contém margem interna. Não usar dimensão física da captura como dp.

O planner mediu o bitmap `O2Tlz.png` (780×1688) com `System.Drawing`: na linha y1580, a cor sólida da seleção ocupa x53..262, cerca de 210 px; os contornos com antialiasing acrescentam aproximadamente 1 px por lado. A largura nominal inferida é cerca de 212 px / 2 = 106 dp, e o centro fica próximo de x158 px / 2 = 79 dp. Portanto 106 é uma largura em dp inferida da referência, não 106 px nem 53 dp. A referência usa viewport de 390 dp; antes de fixar padding/gap, confirmar os valores literais dos frames no Pen. Não fixar largura de item em 106 dp: a implementação deve preservar distribuição/centralização adaptável ao viewport Android menor.

**Arquivos:** refinamento limitado a `apps/mobile/src/components/navigation/app-tabs.tsx` e `apps/mobile/src/components/navigation/app-tabs.test.tsx`, usando o mesmo shell compartilhado. Nenhuma screen de domínio deve mudar.

- [x] Comparação registrada: deslocamento esquerdo observado no export Pen de 10 dp na base de 390 dp. A implementação adaptou o recuo ao viewport Android menor usando `marginHorizontal: v2Spacing.optical` (6 dp) por item, em vez de impor largura fixa de 106 dp ou apresentar 6 dp como medida literal do Pen.
- [x] O executor informou ciclo RED/GREEN focado após o refinamento de margem, com 9/9 testes aprovados. O teste exige recuo do item, mantendo cápsula 67 dp/r34, altura/reserva `67 + inset` e alvo mínimo de 48 dp.
- [x] O planner confirmou no fonte a aplicação de `marginHorizontal: v2Spacing.optical` em `tabBarItemStyle`, preservando destinos, eventos, labels e permissões.
- [x] O executor informou captura final ADB do professor: cápsula `[42,1639]–[798,1815]`, seleção `[58,1660]–[278,1794]`; à densidade nominal de 2,625 px/dp, o recuo é aproximadamente 6 dp e o alvo mede aproximadamente 84×51 dp. A nova evidência confirma que a seleção não encosta na cápsula e mantém dimensão mínima de toque.
- [x] Aluno e professor foram autenticados/verificados antes do último refinamento, aplicado ao componente compartilhado. A captura final após esse refinamento é do professor; não foi declarada uma captura final do aluno que não ocorreu. O executor informou revisão técnica independente `APPROVED`, sem findings após a correção.

As Etapas 2/2A estão concluídas com os resultados e limites registrados acima. A validação visual foi realizada por ADB/Expo Go; Maestro permanece sem execução por ausência da ferramenta. A prontidão de entrega ainda depende das ações remotas da Etapa 3.

## Etapa 3: revisão e entrega

**Interfaces:** consome diff e evidências finais; produz a PR #21 atualizada para revisão humana no SHA validado.

- [x] O executor informou revisão técnica independente `APPROVED`, sem findings após o refinamento final.
- [ ] Fazer commit/push e confirmar os checks obrigatórios do novo SHA da PR #21.
- [ ] Corrigir o comentário Linear `047f4ae2-94a0-40b3-b535-0267b45baef2`, cuja atribuição do bloqueio ao Expo Go ficou superada pela descoberta do import ainda ativo.
- [ ] Atualizar evidências e estado de revisão do card; remover `agent_blocked` somente quando as verificações obrigatórias restantes estiverem comprovadas. Não declarar revisão humana pronta com gate obrigatório pendente.

Os resultados acima atribuídos ao executor não foram reexecutados pelo planner. Uma execução passada ou binário previamente instalado não constitui garantia para builds antigos; a ausência da integração deve ser vinculada ao diff e ao bundle atuais.
