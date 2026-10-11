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

- O revisor independente encontrou o padding do Card incompatível com o spec; a falha foi demonstrada antes da correção pelo novo teste (1 falha esperada, 19 restantes passaram), corrigida, e o grupo focado passou. A revisão incremental confirmou o commit `9a5b61d9d91a241ba41700269cb404492fd80e54`, sem outros achados materiais (cápsulas Orca `msg_f0468d77e71d` e `msg_45a4f63f8ede`). A PR permanece draft aguardando revisão final do coordenador.
- Nas tentativas Android de 10/10, Maestro 2.10.0 falhou antes de inspecionar o harness: a primeira encontrou ANR da System UI e a segunda `Expo Go: Failed to download remote update`, apesar do reverse TCP e HTTP local 200. O gate foi concluído nesta continuação após diagnosticar Metro ausente e confirmar o manifest e bundle reais; ver a seção de 11/10 abaixo.
- No MCP Pen, nesta retomada `read_skill`/`get_app_state` retornaram `transport not connected to app: desktop`; nenhum conteúdo do `.pen` foi lido agora e não houve comparação visual nova. O ledger/handoff conserva os IDs/snapshot aprovados consultados anteriormente por leitura MCP histórica.
- `expo-doctor` continua com 1 check de incompatibilidade de versões, reportado sem alteração fora do escopo.
- MUV-42: https://linear.app/muvit/issue/MUV-42/corrigir-compatibilidade-da-integracao-sentry-com-expo-sdk-54

## Próximas ações sob responsabilidade do coordenador

- Revisar os commits incrementais e converter PR #20 de draft quando satisfeito, integrando segundo o fluxo do pai.
- Não fazer merge nesta Dispatch, nem mudar MUV-32 para Done; aguardar merge confirmado sob responsabilidade do coordenador.
- Os diretórios de export gerados foram arquivados pelo coordenador fora da worktree em `C:\Users\Leonardo\orca\recovery\muv-32\generated-exports-20261011-1133`; não há artefatos gerados não rastreados pendentes no checkout.

## Continuação de runtime Android — 11/10/2026

- Gate nativo finalmente concluído no `Medium_Phone` / `emulator-5554` com `apps/mobile/test/foundation/foundation.yaml` completo. Maestro 2.10.0 terminou com exit 0; a única alteração de tolerância foi ampliar para 40 s o scroll de `Continuar exemplo`, mantendo visibilidade em 100% e a asserção final. Evidências: capturas em `C:\Users\Leonardo\.maestro\tests\2026-10-11_084218\Foundation mobile v2\takeScreenshot\` (`controls.png`, `readonly.png`, `readonly-focused.png`, `svg.png`, `states.png`, `immersive.png`, `surfaces.png`), e logs em `C:\Users\Leonardo\.maestro\tests\2026-10-11_084218\Foundation mobile v2\logs\` (`maestro.log`, `device-logcat.txt`).
- Diagnóstico do transporte: no início desta continuação Metro não estava ativo. Iniciei Expo em localhost:8093, validei manifest Expo HTTP 200 com `hostUri` `127.0.0.1:8093` e bundle Android HTTP 200 (`application/javascript`, 12.131.643 bytes); a execução Maestro então carregou Expo Go e completou. A falha anterior `Failed to download remote update` não indicava bloqueio externo. ADB voltou a responder após encerrar somente clientes ADB presos iniciados nesta investigação; o daemon compartilhado e o QEMU foram preservados. O logcat registra o `EditText` `preview-readonly` como `enabled=true`, `clickable=true`, `focused=true` após foco nativo, com o IME fechado.
- Causa de `readOnly` confirmada no RN 0.81.5: `TextInput` converte `readOnly` em `editable=false`, mas `accessibilityState.disabled=false` aciona `BaseViewManager.setEnabled(true)` e reabilita o EditText nativo, permitindo abrir o IME. `Field` agora mantém `editable=false` e estado acessível não desabilitado, definindo `showSoftInputOnFocus=false` apenas em readOnly/bloqueado. O teste focado de Field valida essas props, preservação de acessibilidade e ausência de edição; 13/13 passaram. No Maestro, `preview-readonly` manteve `Teclado: fechado` ao receber foco, tanto antes como depois de digitar no controle editável; o valor readOnly permaneceu intacto e o campo editável abriu/fechou teclado normalmente.
- A tela concluiu o gate com o override do dispositivo 840×1920, equivalente a 320 dp, fonte do sistema 2.0 e densidade física 420. `Carregando fontes` saiu antes das asserções, comprovando o carregamento de DM Sans; a captura runtime mostra cores/tipografia dos tokens, layout NativeWind responsivo à escala e ícone SVG de `lucide-react-native`. MCP de Pen continuou indisponível; não foi feita nem alegada comparação visual ao vivo com Pen.
- `pnpm.cmd --dir apps/mobile typecheck` passou após o coordenador arquivar os exports gerados fora da worktree; Biome e o grupo de testes focado passaram antes desta continuação e as mudanças finais de código/teste já estavam verificadas. Não foram repetidos os 505 testes nem coberturas. O único ajuste posterior foi YAML do timeout. Métricas do AVD permaneceram inalteradas: override 840×1920, density 420, font_scale 2.0; reverse `host-16 tcp:8093 tcp:8093`.
- Metro iniciado por esta continuação foi encerrado após o fluxo. Depois de receber a confirmação de uso seguro, o Pai encerrou somente o AVD (`Medium_Phone`, PID 20908) via `adb emu kill`; o daemon ADB compartilhado e Docker permaneceram ativos. As métricas registradas acima são as leituras finais anteriores ao shutdown.
- PR #20 continua draft e branch `feat/muv-32-foundation-mobile-v2`; aguardam decisão do Pai revisão final, merge e transição Linear. Nenhum outro card/run foi assumido nesta continuação.
