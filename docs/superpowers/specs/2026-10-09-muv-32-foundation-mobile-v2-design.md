# MUV-32 — Foundation mobile v2 no Expo

## Intenção e autoridade

Materializar os tokens e primitives aprovados no Pen para uso incremental pelos cards MUV-33 a MUV-40. O card termina com PR revisável para `develop`, sem merge nem transição para Done. A baseline é `origin/develop` em `c4d3ab2e6f36d2de81c527045487dd2723b00a6a`; a worktree Orca existente usa `feat/muv-32-foundation-mobile-v2`. O setup contém dependências e `.env` mobile, conferidos sem exposição de conteúdo.

Trata-se de trabalho arquitetural segundo brainstorming. O usuário dispensou expressamente perguntas e aprovação humana de brainstorming, spec e plano; decisões e revisões internas são registradas como tais. Isso não representa aprovação humana simulada. Aplicam-se AGENTS raiz/mobile, PRODUCT, DESIGN e os handoffs mobile-v2. PRODUCT e DESIGN descrevem a implementação anterior; o Pen aprovado e `mobile-v2-foundation.md`/`mobile-v2-design-gate.md` determinam os valores v2.

## Abordagens consideradas

1. **Namespace v2 incremental, escolhido:** novos tokens e primitives, carregamento adicional de DM Sans e infraestrutura NativeWind compartilhada. Preserva contratos, aparência e imports dos consumidores atuais. Custo: coexistência temporária de duas foundations explicitamente documentadas.
2. Substituir tokens e primitives existentes: reduz coexistência, mas redesenha todas as telas indiretamente e viola o escopo.
3. Implementar só com StyleSheet: reduz configuração, mas não atende à adoção obrigatória de NativeWind e React Native Reusables.

## Fonte visual e evidência

O MCP leu o canvas aprovado em `C:/Users/Leonardo/Desktop/Muvit/muvit/assets/design/mobile.pen`, aberto pelo coordenador pai, depois de uma falha inicial de transporte. `GetVariables` retornou 96 tokens. Foram lidos `ZXCPO`, `OPBw0`, `c7VTG` e os símbolos de ações, campos, mensagens, badges, headers, card, skeleton e sheet indicados no handoff. Nenhum comando de mutação/salvamento do Pen é autorizado. O arquivo da worktree deve permanecer sem diff; a identidade com o arquivo aberto será conferida por hash. Capturas de referência e ensaios nativos serão registrados separadamente: leitura estrutural não prova equivalência visual nativa.

## Arquitetura e interfaces

- `src/lib/design-system/tokens.ts` exporta `penTokens` com nomes/valores exatos dos 96 tokens, além de `colors`, `spacing`, `radii`, `controlSizes`, `typography`, `elevation` e `fontFamilies` derivados. Não importa React Native: Tailwind e testes consomem a mesma fonte.
- `src/lib/design-system/cn.ts` exporta `cn(...inputs: ClassValue[]): string`, combinando clsx e tailwind-merge, conforme React Native Reusables.
- `src/components/ui/v2/` contém `Text`, `Button`, `IconButton`, `Field`, `NumericField`, `SectionTab`, `Header`, `Card`, `Badge`, `Message`, `StatePanel`, `Surface`, `Skeleton` e `SheetSurface`, com barrel público. Componentes de domínio não entram nesta camada.
- React Native Reusables fornece a base local adaptada de Text/context, Button/variantes, Input, Card e Badge quando equivalentes. Registrar proveniência, licença MIT e adaptações; não instalar uma biblioteca fictícia monolítica. Slot só é necessário se houver composição `asChild` real. Lucide fornece ícones aprovados.
- `tailwind.config.ts`, `babel.config.js`, `metro.config.js`, `global.css` e `nativewind-env.d.ts` configuram NativeWind estável v4/Tailwind 3 no Expo SDK 54 existente. Não atualizar SDK ou trocar dependências nativas sem evidência. Classes v2 usam prefixo semântico `v2-`; CSS não muda tokens legacy.
- Root layout importa CSS uma vez e carrega pesos DM Sans 400/500/600/700/800 junto às fontes existentes, sem alterar guards, providers, rotas ou decisões de sessão.

## Contratos visuais

Papel `#F6F5EF`, branco `#FFFFFF`, texto `#15372E`, marca `#2F6B50`, apoio `#607064`, lima `#C9F36C`, pressed `#B5DB61`, borda/disabled `#DDE6DC`, superfície suave `#EBF0E8`. A paleta imersiva contextual usa `#0D1512`, `#17231D`, `#203128`, `#31443A`, `#F3F7EF`, `#AEBCAF`; nunca dark mode global. Feedback usa os valores do Pen, inclusive erro `#A83232`, atenção `#7A5313`, sucesso `#2F6B50` e informação `#285C75` e seus fundos.

DM Sans: display 84/1.1/700, timer 43/1.2/700, título de tela 30/1.2/800, seção 20/1.3/700, ação 17/1.3/700, corpo 14/1.4/400, apoio 12/1.4/400, legenda 11/1.4/700. Botão de catálogo usa 15/700; campos 14/400 e label 14/700. Preservar escala óptica completa em `penTokens`.

Base 390 dp, gutter 16, inset óptico 6, espaçamento relacionado 8–12, interno 16, entre seções 24–32. Raio 20 dados/campos, 24 sessão/sheet, 26 destaque, 29 CTA; cápsulas podem crescer com texto. CTA mínimo 58, compacto/campo 52, campo de autenticação 58, alvo de ícone 48×48 e ícone 20–24. Camadas zIndex 0/1/2, sem sombras normativas. Safe areas 62/34 são referências de desenho, nunca padding nativo fixo. Não implementar shell/tab bar neste card.

## Estados e comportamento de apresentação

- Button: primary, secondary, destructive, text, immersive; default/pressed/focus/disabled/loading. Loading bloqueia reentrada e mantém label/largura, com spinner único; o caller escolhe desativado estático quando já há progresso dedicado. Focus é evento real, não estado decorativo hardcoded. Props nativas relevantes e ref permanecem disponíveis.
- IconButton: nome acessível obrigatório, alvo mínimo 48×48; mesmas regras de loading/disabled/foco. Header permite retorno/fechar e ação contextual opcional, sem router ou consulta interna. Sessão centraliza título com slots laterais equilibrados.
- Field: label persistente, valor controlado, unidade/hint/error, foco nativo, disabled/editable, password/search/numeric, variante imersiva e dimensão auth opcional. Erro local conserva valor e label. Não validar nem converter valores do domínio.
- NumericField: valor string, edição direta e callbacks `onIncrement`/`onDecrement`; controles 48×48. Caller é dono de passos, limites e formatação; foundation não redefine validação da API.
- SectionTab: seleção e foco acessíveis, sem criar rota. Card: surface padrão e pressable com feedback/foco/disabled só quando há ação; sem alturas fixas ou truncamento de conteúdo significativo.
- Badge: active/inactive/pending/error com texto e ícone. Message: success/warning/error/info, título/descrição e ação contextual opcional; sem estado de rede próprio.
- StatePanel: loading/empty/error/success ocupa área de conteúdo, sem card branco/altura 335 fixa. Loading não renderiza retry concorrente; caller preserva conteúdo carregado e usa Message para falhas de atualização.
- Surface/SheetSurface/Skeleton: apenas apresentação; sheet não cria modal, proteção de saída ou persistência. Skeleton estático evita movimento obrigatório. Componentes permitem rolagem/expansão pelo consumidor e escala de fonte nativa; não aplicar `numberOfLines` a conteúdo essencial.

## Estratégia incremental

Imports atuais de `src/lib/styles.ts` e `src/components/ui/*` continuam íntegros. MUV-33 adota tokens/superfícies/headers no shell e resolve insets uma vez; MUV-34 migra autenticação/perfis; MUV-35 Hoje; MUV-36 sessão; MUV-37 progresso; MUV-38 alunos; MUV-39 avaliações; MUV-40 treinos. Cada card migra somente seus consumidores e preserva serviços e regras atuais. Nenhum desses cards é executado nesta PR. Atualizar AGENTS mobile para tornar essa fronteira operacional explícita.

## Verificação e riscos

TDD demonstra bloqueio de toque e reentrada, foco e blur, labels/unidades/erros, callbacks numéricos sem coerção, semântica de seleção, crescimento com texto e ausência de progresso duplicado. Testes legacy permanecem; baseline observada: 54 arquivos/455 testes passando. Rodar suíte mobile, typecheck, doctor, cobertura core e UI com thresholds 85% preservados, Biome do escopo, diff check e UTF-8 estrito/escapes nos arquivos alterados.

Bundling Expo Android real deve incluir entrada de verificação que importe primitives v2, para evitar falsa validação por tree-shaking de uma biblioteca ainda sem consumidores. Se export web for usado, não conta como ensaio Android. Maestro é a ferramenta padrão quando houver emulador; `adb devices` inicialmente não encontrou dispositivo. Registrar comandos, plataforma, cobertura e limitações efetivas em Result Capsule persistente. Revisor independente deve conferir diff completo e achados materiais devem ser corrigidos antes da entrega.

## Revisão interna da spec

Escopo, interfaces e valores foram conferidos contra o card e leituras MCP. A coexistência v1/v2 evita migração implícita; callbacks controlados evitam novas regras de negócio; o bundling de uma entrada dedicada impede atestar NativeWind apenas por configuração. A impossibilidade inicial de workers aninhados foi escalada: o pai lança especialistas Orca com cápsulas desta liderança, sem contornar limite de profundidade.

## Documentação primária consultada

- [NativeWind v4 — instalação Expo](https://www.nativewind.dev/docs/getting-started/installation): configuração Babel, Metro, CSS, Tailwind 3 e tipos.
- [React Native Reusables — instalação](https://reactnativereusables.com/docs/installation) e [componentes](https://reactnativereusables.com/docs/components/button): componentes locais adaptáveis, sem impor tema paralelo.
