# MUV-32 — Result Capsule

## Entrega

- PR draft para `develop`: https://github.com/leonardoslima/muvit/pull/20
- Branch publicada: `feat/muv-32-foundation-mobile-v2`
- Commits: `67685a6dd4dc98209672ef254d4dd539080a991c` (foundation) e `9a5b61d9d91a241ba41700269cb404492fd80e54` (correção do Card).
- Spec: `docs/superpowers/specs/2026-10-09-muv-32-foundation-mobile-v2-design.md`.
- Plano: `docs/superpowers/plans/2026-10-09-muv-32-foundation-mobile-v2.md`.
- Registro cronológico: `docs/muv-32-execution-ledger.md`.

## Escopo implementado

- Tokens tipados v2, fonte DM Sans e configuração NativeWind/Tailwind/Metro/Babel integrada ao Expo.
- Primitives em `apps/mobile/src/components/ui/v2`: Button/IconButton, Field/NumericField, SectionTab, Header, Card, Badge, Message, StatePanel, Surface, Skeleton e SheetSurface, com barrel, tipos, testes e atribuição da base local React Native Reusables.
- Estratégia incremental preserva componentes e consumidores legacy; nenhuma tela de domínio, API, regra de negócio, guard ou asset Pen foi alterado.
- Corrigidos estados combinados de loading/readOnly e contraste de loading destructive conforme revisão. O achado material independente sobre Card foi reproduzido em teste e corrigido: padding `p-5` → `p-4` (16 dp).

## Verificação executada

| Comando/validação | Resultado |
| --- | --- |
| `pnpm.cmd --dir apps/mobile test` | 59 arquivos, 505 testes passaram antes da correção incremental; depois, grupos actions/fields passaram 32/32. |
| `pnpm.cmd --dir apps/mobile typecheck` | Passou. |
| `pnpm.cmd --dir apps/mobile test:coverage:core` | Passou: 94.03% statements, 86.90% branches, 98.93% functions, 97.53% lines; limites 85% mantidos. |
| `pnpm.cmd --dir apps/mobile test:coverage:ui` | Passou: 89.40% statements, 86.39% branches, 94.04% functions, 93.76% lines; limites 85% mantidos. |
| `pnpm.cmd --dir apps/mobile exec expo export test/foundation --platform android --output-dir test/foundation/dist-js --clear --max-workers 2 --no-bytecode` | Passou, 2.971 módulos; saída contém CSS interop, classes e tokens v2. |
| Export Expo Android com bytecode do harness | Passou, 2.971 módulos e fontes DM Sans. |
| `pnpm.cmd --dir apps/mobile exec expo export --platform android --output-dir dist --clear --max-workers 2` | Passou, 2.233 módulos, 84 assets, bundle 7.04 MB. |
| `expo-doctor` | 16/17 checks; divergências preexistentes de `sentry-expo` e `@react-navigation/bottom-tabs`; sem suprimir checks nem downgrade. A incompatibilidade de Sentry foi encaminhada ao Pai em MUV-42. |
| `pnpm.cmd --dir apps/mobile test src/components/ui/v2/actions.test.tsx src/components/ui/v2/fields.test.tsx` | Após correção Card: 2 arquivos, 32 testes passaram. |
| `pnpm.cmd exec biome check apps/mobile/src/components/ui/v2/card.tsx apps/mobile/src/components/ui/v2/actions.test.tsx` | Passou, sem correções automáticas. |
| `git diff --check` no ajuste do Card | Passou. |

## Revisão independente e limites

- O revisor independente encontrou o padding do Card incompatível com o spec; a falha foi demonstrada antes da correção pelo novo teste (1 falha esperada, 19 restantes passaram), corrigida, e o grupo focado passou. A revisão incremental confirmou o commit `9a5b61d9d91a241ba41700269cb404492fd80e54`, sem outros achados materiais (cápsulas Orca `msg_f0468d77e71d` e `msg_45a4f63f8ede`). A PR permanece draft para o gate nativo e revisão final do coordenador.
- Maestro 2.10.0 executou no emulador Android. Ambas as tentativas falharam antes de inspecionar o harness; a segunda teve erro `Expo Go: Failed to download remote update` apesar de reverse TCP ativo e HTTP local 200. O bundling real de Expo passou, mas não se afirma validação visual em runtime.
- No MCP Pen, nesta retomada `read_skill`/`get_app_state` retornaram `transport not connected to app: desktop`; nenhum conteúdo do `.pen` foi lido agora e não houve comparação visual nova. O ledger/handoff conserva os IDs/snapshot aprovados consultados anteriormente por leitura MCP histórica.
- `expo-doctor` continua com 1 check de incompatibilidade de versões, reportado sem alteração fora do escopo.
- MUV-42: https://linear.app/muvit/issue/MUV-42/corrigir-compatibilidade-da-integracao-sentry-com-expo-sdk-54

## Próximas ações sob responsabilidade do coordenador

- Revisar incrementalmente o commit Card, converter PR #20 de draft quando satisfeito e fazer revisão/integrar segundo o fluxo do pai.
- Não fazer merge nesta Dispatch, nem mudar MUV-32 para Done; aguardar merge confirmado sob responsabilidade do coordenador.