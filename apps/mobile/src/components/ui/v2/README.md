# Foundation mobile v2

Imports públicos: `src/components/ui/v2`. Este namespace materializa a foundation aprovada no Pen sem migrar telas, tokens ou imports legacy. Cores e fontes vêm de `src/lib/design-system/tokens.ts` e do tema NativeWind do aplicativo. As classes são a implementação visual; não há cópia equivalente em StyleSheet.

## Uso e contratos

- `Text`: variantes `display`, `timer`, `screenTitle`, `sectionTitle`, `action`, `body`, `support`, `caption`, `button` e `label`; contexto de cor herdado, props/ref nativos e escala de fonte preservados.
- `Button`: `label`, props Pressable/ref, variantes `primary`, `secondary`, `destructive`, `text`, `immersive`, `compact`, `disabled` e `loading`. Loading preserva label, reserva espaço de progresso e bloqueia reentrada. Disabled explícito continua prevalecendo. O caller usa disabled estático quando já existe indicador dedicado.
- `IconButton`: `icon` como ReactNode e `accessibilityLabel` obrigatório, props/ref Pressable e alvo mínimo 48×48. Loading substitui somente o ícone.
- `Field`: `label`, `value` string e `onChangeText`, `unit`, `hint`, `error`, `kind` (`default`, `password`, `search`, `numeric`), `variant` (`default`, `immersive`), `size` (`default`, `auth`). Props/ref TextInput e callbacks de foco, blur e submit permanecem disponíveis. `className` estiliza o grupo; `controlClassName` estiliza a superfície do controle; `inputClassName` estiliza o input. `leading`/`trailing` permitem composição visual. Não valida ou converte valores.
- `NumericField`: contrato de Field e `onIncrement`/`onDecrement`; labels de controle opcionais. Valor vazio é preservado. Caller fornece passos, limites, formatação e validação; editable false desativa também os controles.
- `SectionTab`: `label`, `selected` e props/ref Pressable, sem navegação interna.
- `Header`: `title`, `variant` (`default`, `contextual`, `session`), `backAction` e `action`. Sessão usa fechar, título centralizado e slots laterais equilibrados; outros contextos usam retorno. Ação contextual representa atualização. Nenhuma consulta ou router interno.
- `Card`: children, `variant` (`default`, `immersive`, `highlight`) e `action` opcional. Só renderiza Pressable quando existe ação; sem altura fixa.
- `Badge`: label e `variant` (`active`, `inactive`, `pending`, `error`), com texto e ícone Lucide.
- `Message`: title, description e `variant` (`success`, `warning`, `error`, `info`), action opcional. Feedback contextual, sem estado de rede próprio.
- `StatePanel`: kind (`loading`, `empty`, `error`, `success`), title, description, action e contexto imersivo opcional. Ocupa conteúdo, sem card branco ou altura 335. Loading remove action, com um único progresso. Quando já existem dados, o caller preserva o conteúdo e usa Message.
- `Surface`: children e variante `default`, `subtle`, `immersive` ou `raised`, sem padding imposto.
- `SheetSurface`: Surface com cantos superiores 24 e padding 24; não cria modal, safe area fixa, persistência ou proteção de saída.
- `Skeleton`: bloco estático, sem animação obrigatória; oculto da árvore acessível. Dimensões podem ser compostas via className/style.

Ações compartilham `{ label: string; onPress: () => void; disabled?: boolean; loading?: boolean }`. Todos os textos essenciais crescem sem numberOfLines imposto. Fonte e conteúdo podem exigir rolagem provida pelo consumidor. Safe areas continuam responsabilidade do shell. Não usar background imersivo como dark mode global.

## Proveniência

Base local adaptada do [React Native Reusables](https://github.com/founded-labs/react-native-reusables), commit consultado em 2026-10-09: `385834c2196f8a303cbc9057d1ac768f3bde0a3b`.

| Arquivo local | Fonte original no commit |
| --- | --- |
| text.tsx | [Text e TextClassContext](https://github.com/founded-labs/react-native-reusables/blob/385834c2196f8a303cbc9057d1ac768f3bde0a3b/packages/registry/src/nativewind/components/ui/text.tsx) |
| button.tsx, control.ts | [Button, variantes e contexto](https://github.com/founded-labs/react-native-reusables/blob/385834c2196f8a303cbc9057d1ac768f3bde0a3b/packages/registry/src/nativewind/components/ui/button.tsx) |
| field.tsx | [Input](https://github.com/founded-labs/react-native-reusables/blob/385834c2196f8a303cbc9057d1ac768f3bde0a3b/packages/registry/src/nativewind/components/ui/input.tsx) |
| card.tsx | [Card](https://github.com/founded-labs/react-native-reusables/blob/385834c2196f8a303cbc9057d1ac768f3bde0a3b/packages/registry/src/nativewind/components/ui/card.tsx) |
| badge.tsx | [Badge](https://github.com/founded-labs/react-native-reusables/blob/385834c2196f8a303cbc9057d1ac768f3bde0a3b/packages/registry/src/nativewind/components/ui/badge.tsx) |

Mantidos composição local, props nativas, `cn`, classes e contexto de texto. Substituídos tema shadcn e alturas fixas pelos tokens v2; removidos dark mode global, estilos exclusivamente web, sombras e Slot/asChild sem consumidor. Mapas tipados substituem CVA onde não há composição combinatória. Adicionados estados nativos de foco/pressão, guards de disabled/loading, labels persistentes e semântica de apresentação Muvit. Os demais primitives são composições locais do contrato Pen. Nenhuma biblioteca monolítica RNR é instalada.

A licença MIT original de Founded Labs está preservada em [LICENSE](./LICENSE). Ícones são imports da dependência `lucide-react-native`, sem copiar seus assets; seguem a licença da dependência.

Fonte visual: `docs/mobile-v2-foundation.md`, spec MUV-32 e canvas original `C:/Users/Leonardo/Desktop/Muvit/muvit/assets/design/mobile.pen`, consultado via MCP somente leitura. Os IDs e limites da consulta constam em `docs/muv-32-primitives-report.md`.

## Verificação

`pnpm.cmd --dir apps/mobile test src/components/ui/v2` executa RNTL com hosts nativos e SVG da infraestrutura existente; Lucide permanece real. Os testes verificam contratos/events e semântica, mas não medem layout nativo ou estilos resolvidos por NativeWind. O harness e o bundle Android pertencem à integração do líder. `pnpm.cmd --dir apps/mobile typecheck` verifica props/ref públicos. O relatório registra RED, GREEN e limites observados.
