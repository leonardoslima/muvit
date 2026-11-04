# MUV-32 — Result Capsule dos primitives

Responsável: worker mobile/UI, Task `task_6422c9fc9b31`, Dispatch `ctx_94042efc47c1`. Escopo exclusivo `apps/mobile/src/components/ui/v2/**` e este relatório. Nenhum commit, push, PR, merge, alteração de Linear, API, telas, tokens, dependências, configuração, layout raiz ou Pen executado por este worker.

## Arquivos e entrega

14 primitives (`text`, `button`, `icon-button`, `field`, `numeric-field`, `section-tab`, `header`, `card`, `badge`, `message`, `state-panel`, `surface`, `skeleton`, `sheet-surface`), helper interno `control.ts`, barrel `index.ts`, testes RNTL `actions.test.tsx`, `fields.test.tsx`, `feedback.test.tsx`, README e LICENSE.

Interfaces seguem Task 2 e estão descritas no README. Props/ref nativos permanecem tipados; string numérica é opaca, sem coerção/validação. Loading bloqueia reentrada, preserva label e cores da variante, com slots constantes de progresso; foco e blur são eventos reais. StatePanel loading remove a ação concorrente, e superfícies não criam modal ou safe area fixa. Campos, títulos, mensagens e botões não impõem truncamento ou altura de conteúdo fixa. A decoração visual é NativeWind real, sem StyleSheet duplicado.

## Fontes e proveniência

- Spec `docs/superpowers/specs/2026-10-09-muv-32-foundation-mobile-v2-design.md`, Task 2/Global Constraints/Review Focus do plano e `docs/mobile-v2-foundation.md`.
- [React Native Reusables](https://github.com/founded-labs/react-native-reusables), commit atual consultado `385834c2196f8a303cbc9057d1ac768f3bde0a3b` em 2026-10-09; fontes primárias `packages/registry/src/nativewind/components/ui/{text,button,input,card,badge}.tsx` e LICENSE foram lidas diretamente do repositório. O README mapeia cada arquivo ao permalink original. Licença MIT Copyright (c) 2025 Founded Labs preservada integralmente.
- Adaptados Text/context, Button/variantes, Input, Card e Badge; componentes adicionais são composições locais dos contratos Pen. Removidos tema global/dark mode, alturas fixas, sombras e Slot sem consumidor. Mantidos componentes locais, props nativas, `cn` e classes. Mapas tipados substituem CVA quando não há composição combinatória.
- MCP somente leitura no arquivo original `C:/Users/Leonardo/Desktop/Muvit/muvit/assets/design/mobile.pen`. `get_app_state` confirmou o arquivo aberto. Leituras `Get` com valores resolvidos: `QCbOZ`, `APBrn`, `DHxZY`, `xB6yO`, `hbHXq`, `t1QC7u`, `IDwm1`, `nE3zB`, `U4udI`, `B1d01P`, `EyQ6K`, `X7ftOl`, `tlmyy`, `dNdSn`, `A571l`, `TkKz2`; complementos de estados `Bn8Zy`, `txIBZ`, `VdgJg`, `HLmZg`, `vhUrO`, `fQXup`, `x06M9O`, `nqQdX`, `VLGa4`, `zo4z7`, `CdTSy`, `YVbKW`. Nenhuma mutação ou salvamento.

## Ledger TDD e decisões

| Etapa | Comando / evidência observada |
| --- | --- |
| RED ações | `pnpm.cmd --dir apps/mobile test src/components/ui/v2/actions.test.tsx`: exit 1, módulo `./button` ausente antes da implementação. |
| RED campos | `pnpm.cmd --dir apps/mobile test src/components/ui/v2/fields.test.tsx`: exit 1, módulo `./field` ausente antes da implementação. |
| RED feedback | `pnpm.cmd --dir apps/mobile test src/components/ui/v2/feedback.test.tsx`: exit 1, módulo `./badge` ausente antes da implementação. |
| Infraestrutura | Reruns falharam em `Touchable.Mixin` do SVG real; ajustes solicitados ao líder, sem editar seu ownership. Em execução durante edição, houve `ReferenceError __vi_import_2__` de factory hoisted no setup; comunicado. |
| RED comportamental | Após resolver imports, 28/35 falharam: controles sem accessible explícito no host e render SVG inválido. O worker explicitou semântica acessível nos controles e no progresso; líder possui mock SVG. |
| RED loading | `pnpm.cmd --dir apps/mobile test src/components/ui/v2/actions.test.tsx -t 'mantém apresentação'`: exit 1 por classes de loading mudarem `bg-v2-primary` para disabled. Leitura MCP de `Bn8Zy` confirmou cores da variante preservadas. |
| GREEN parcial | Depois de separar disabled explícito do bloqueio por loading, suíte v2 passou 21/36; 15 falhas restantes exclusivamente na renderização Lucide/SVG (`Element type is invalid`, ForwardRef). |
| GREEN específico final | `pnpm.cmd --dir apps/mobile test src/components/ui/v2`: exit 0, 3 arquivos/36 testes passando, 14:50:17. Líder resolveu fronteira CJS/SVG por inline de lucide-react-native no Vitest, mantendo ícones reais. |
| Typecheck | `pnpm.cmd --dir apps/mobile typecheck`: exit 0 às 14:46, após corrigir tipo de style de Card estático e nome exportado `Info` do Lucide; mocks compartilhados corrigidos pelo líder. |
| Typecheck final | `pnpm.cmd --dir apps/mobile typecheck`: exit 0 após GREEN específico, com todos os primitives e alterações finais presentes. |
| Formatação/lint | `pnpm.cmd exec biome check --write apps/mobile/src/components/ui/v2`: exit 0, 19 arquivos verificados/18 formatados. |
| Lint final | `pnpm.cmd exec biome check apps/mobile/src/components/ui/v2`: exit 0, 19 arquivos, sem fixes. |
| Suíte mobile | Primeira execução: 496 testes/59 arquivos passaram, mas exit 1 por probe transitório `test/svg-probe.test.ts` removido durante coleta pelo líder. Repetição `pnpm.cmd --dir apps/mobile test` às 14:50:59: exit 0, 59 arquivos/496 testes passando, 25,76 s. |
| Diff / UTF-8 | `git diff --check`: exit 0. Decodificação UTF-8 estrita dos 21 arquivos de ui/v2 e busca de escapes Unicode: sem falhas/ocorrências. Busca de trailing whitespace nos arquivos novos: sem ocorrências. Relatório verificado também após finalização. |

Os primeiros REDs são falhas de import por API ausente, não resultados de asserções RNTL; isso é registrado sem apresentá-los como RED comportamental. Os REDs de semântica e loading foram observados em testes executados.

Ruling: usar acessibilidade explícita nos controles em vez de enfraquecer queries por role — mantém contrato nativo claro e testa semântica real — não muda regra de negócio.

Ruling: preservar cores da variante durante loading e separar disabled visual de blocked — MCP `Bn8Zy` e demais estados loading preservam fundo/texto — disabled explicitamente combinado continua prevalecendo.

Ruling: NumericField compõe Field com padding horizontal 8, gaps internos zero e input mínimo 40, centralizado; imersivo usa escala óptica 25/700 do `nE3zB` — preserva espaço de edição ao lado dos dois controles 48 em colunas estreitas — equivalência geométrica nativa requer harness/dispositivo.

## Limites e integração

Status final do worker: implementação concluída, 36/36 testes específicos e 496/496 testes mobile passando, typecheck e Biome limpos. O worker mantém Lucide real e não substitui componentes por mocks que façam asserções tautológicas. Configuração/mocks fora do ownership foram solicitados e alterados exclusivamente pelo líder. Nenhum arquivo externo ao ownership foi escrito por este worker.

RNTL usa hosts nativos; verifica callbacks, estados, a11y e passagem de props/ref, sem provar geometria, leitores de tela, escala real de fonte ou resolução de estilos NativeWind. Classes testadas em hosts não são evidência de pipeline. Harness/bundle Android que importa o barrel v2, doctor, cobertura global e eventual Maestro pertencem à consolidação do líder; não são reivindicados por este worker. Consumidores legacy permanecem fora deste ownership.
