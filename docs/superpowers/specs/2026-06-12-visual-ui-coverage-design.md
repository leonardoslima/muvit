# Visual UI Coverage Design

## Objetivo

Criar uma rampa controlada de cobertura visual para `apps/web` e `apps/mobile`, complementando o piso SOLID ja aplicado ao core. A primeira entrega deve proteger fluxos visuais criticos com testes bloqueantes e manter a cobertura ampla de UI como metrica visivel, sem forcar 85% global visual antes do harness estar estavel.

## Contexto atual

- `apps/web` ja usa Vitest, Testing Library, jsdom e alguns testes TSX em componentes e interacoes simples.
- `apps/mobile` usa Vitest em ambiente `node` para services/libs e ainda nao possui harness de teste visual para React Native.
- O core testavel de web/mobile ja possui `test:coverage:core` bloqueante acima de 85%.
- Os relatorios globais atuais sao visiveis, mas nao bloqueantes, e incluem muita superficie de pagina/screen ainda sem teste visual.

## Abordagem escolhida

Usar uma rampa controlada:

1. Adicionar gates bloqueantes para UI critica, separados do core.
2. Medir cobertura visual ampla sem threshold bloqueante inicialmente.
3. Testar comportamento visivel e interacoes principais, evitando snapshots amplos como substituto de assert funcional.
4. Usar Playwright quando um fluxo web precisar de navegador real, roteamento realista, layout, navegacao ou integracao que o jsdom nao cubra com confianca.

Esta abordagem evita cobertura artificial e cria uma base que pode crescer ate 85% visual amplo quando os harnesses estiverem maduros.

## Escopo web

Manter Vitest + Testing Library + jsdom como primeira linha de teste para componentes e unidades visuais client-side.

Cobrir primeiro:

- `src/components/student-form.tsx`: render de campos obrigatorios, mensagens de erro, estado inicial e submit action mockada.
- `src/components/onboarding-wizard.tsx`: passos, links e acao de conclusao.
- `src/app/(app)/students/_search.tsx`: debounce, preservacao/remocao de query params e acessibilidade basica do input.
- `src/app/(app)/students/[id]/assessments/_form.tsx`: campos, upload opcional, mensagens de erro e submit action mockada.
- `src/app/(app)/students/[id]/assessments/_chart.tsx`: render com dados vazios e dados reais sem quebrar.
- `src/app/(app)/workouts/new/_editor.tsx`: adicionar/remover dias, adicionar/remover/mover exercicios, validacao visual e submit action mockada.
- Componentes de shell testaveis sem servidor, como `sidebar` e `top-bar`, quando as dependencias puderem ser mockadas de forma limpa.

Server Components e paginas Next devem ser cobertos por componentes extraidos, helpers de render ou Playwright quando o teste de pagina inteira for mais confiavel que um mock pesado.

## Escopo mobile

Adicionar um harness de teste visual para React Native, preferencialmente `@testing-library/react-native`, desde que seja compativel com a versao atual de Expo/React Native do workspace.

Cobrir primeiro:

- `src/screens/today-workout.tsx`: loading, estado vazio, dados carregados, cache stale quando visivel e navegacao para registrar treino.
- `src/screens/log-workout.tsx`: render de exercicios/sets, edicao de reps/carga, agrupamento visual e fallback de envio offline.
- `src/screens/new-assessment.tsx`: campos, selecao/remocao de foto, submit, loading e retorno apos sucesso.
- `src/screens/progress.tsx`: loading, estado vazio e lista/grafico textual de progresso conforme UI atual.
- `src/screens/profile.tsx`: dados do perfil, logout e estados simples.
- Componentes de borda `push-token-registration` e `queue-drain` apenas se puderem ser testados com mocks estaveis de permissao/storage/API.

Dependencias nativas, router, query client, storage, camera/picker e API devem ser mockados na borda. Testes mobile nao devem depender de dispositivo, rede, storage real ou ordem de execucao.

## Cobertura e comandos

Adicionar scripts separados:

- `test:coverage:ui` em `apps/web` e `apps/mobile` para cobertura bloqueante do conjunto visual critico.
- `test:coverage:app` ou manter `test:coverage` como relatorio amplo nao bloqueante, conforme melhor encaixe com os scripts atuais.

Threshold inicial recomendado para `test:coverage:ui`:

- 85% para statements, branches, functions e lines dentro do conjunto visual critico definido nos configs.
- O include deve ser explicito e conservador no inicio, cobrindo apenas componentes/screens com testes reais e comportamento relevante.
- O include deve crescer por tarefa, junto com testes, ate representar a UI critica dos dois apps.

O core atual deve continuar protegido por `test:coverage:core`; a cobertura visual nao deve reduzir nem substituir esse gate.

## Playwright

Playwright deve ser usado para web quando houver valor claro de navegador real:

- fluxo entre rotas que depende de Next/navigation de forma dificil de simular;
- comportamento visual/layout que jsdom nao representa;
- verificacao de formulario em browser real;
- regressao em fluxo critico que combina UI, roteamento e mocks de API.

Playwright nao deve ser a primeira opcao para cada componente. Para unidades visuais isoladas, Testing Library segue mais rapida, barata e precisa.

## Regras de qualidade dos testes

- Testes devem ser unitarios ou de componente/screen, independentes entre si.
- Preferir queries por role, label, text e estado visivel.
- Evitar snapshots amplos.
- Mockar dependencias externas no limite da UI.
- Cobrir loading, vazio, erro e sucesso quando o componente realmente possui esses estados.
- Testar interacoes do usuario por comportamento observado, nao por detalhes internos.
- Nao introduzir dependencia nova sem necessidade comprovada pelo harness.

## Fora de escopo

- Nao exigir 85% global visual de todo o app nesta primeira etapa.
- Nao criar E2E completo de ponta a ponta contra API real.
- Nao reestruturar design visual ou layout sem necessidade para testabilidade.
- Nao mover componentes/paginas em massa; extrair somente quando isso reduzir acoplamento ou permitir teste limpo.

## Criterios de aceite

- `apps/web` possui gate bloqueante de cobertura UI para componentes/fluxos criticos definidos.
- `apps/mobile` possui harness visual e gate bloqueante de cobertura UI para screens criticas definidas.
- `test:coverage:core` continua passando em web e mobile.
- Relatorios amplos continuam disponiveis sem bloquear a primeira entrega.
- Testes finais passam com `test`, `typecheck`, `test:coverage:core`, `test:coverage:ui` e Biome nos workspaces afetados.
- Quando Playwright for usado, o plano deve indicar o fluxo, os mocks necessarios e a forma de execucao local.
