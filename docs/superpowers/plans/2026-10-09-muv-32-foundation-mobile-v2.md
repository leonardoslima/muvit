# Foundation mobile v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** entregar tokens e primitives v2 verificadas no Expo em PR para develop, preservando consumidores atuais.

**Architecture:** namespace incremental `src/components/ui/v2` com tokens independentes de plataforma em `src/lib/design-system`. NativeWind v4 compartilha a fonte dos tokens com Tailwind; React Native Reusables fornece bases locais adaptadas. Nenhuma tela de domínio é migrada.

**Tech Stack:** Expo 54, React Native 0.81.5, NativeWind 4 estável, Tailwind 3, React Native Reusables, Vitest/RNTL, Biome.

**Spec:** `docs/superpowers/specs/2026-10-09-muv-32-foundation-mobile-v2-design.md`.

## Global Constraints

- Editar apenas apps/mobile, dependências/configuração raiz estritamente necessárias e documentação MUV-32.
- Preservar tokens/imports legacy, guards, rotas, API, regras de negócio e Pen.
- UTF-8 literal pt-BR, sem any, non-null assertion, placeholders de implementação ou checks desativados.
- Gutter 16; CTA mínimo 58; compacto/campo 52; auth 58; alvos 48×48; insets nativos dinâmicos.
- Core/UI coverage 85% sem redução de thresholds.
- Commit/push/PR para develop autorizados; merge/Done/main/produção/MUV-9/MUV-14 proibidos.

## Review Focus

- Labels extensos/escala de fonte: preservar crescimento e texto essencial, incluindo CTA loading.
- Disabled/editable/loading combinados: nenhuma reentrada nem override semântico que reative controle.
- Foco nativo e props/ref: callbacks do consumidor não devem ser perdidos por overrides internos.
- Imersivo contextual: nenhuma mudança global de tema ou consumidores legacy.
- Primitives sem consumidores de domínio: export Android deve exercitar NativeWind v2 efetivamente.

### Task 1: Tokens, fontes e pipeline NativeWind

**Ownership:** líder; `apps/mobile/src/lib/design-system/*`, config mobile, dependências/lockfile, root layout apenas CSS/fontes, AGENTS mobile e documentação.

**Files:** criar tokens.ts/tokens.test.ts, cn.ts, babel.config.js, metro.config.js, tailwind.config.ts, global.css, nativewind-env.d.ts; modificar package.json mobile, app.json se necessário, app/_layout.tsx e pnpm-lock.yaml.

**Interfaces:** exportar `penTokens`, `colors` (background/surface/text/brand/secondary/primary/primaryPressed/border/subtle/disabled/error/errorBg/warning/warningBg/success/successBg/info/infoBg/scrim/sessionBackground/sessionSurface/sessionRaised/sessionBorder/sessionText/sessionSecondary), `spacing`, `radii`, `controlSizes`, `typography`, `elevation`, `fontFamilies`; `cn(...inputs: ClassValue[]): string`. Tailwind expõe colors `v2-*`, fontFamily `v2-regular/medium/semibold/bold/extrabold`, raios e dimensões arbitrárias seguem tokens. Tarefa 2 pode usar `penTokens` diretamente para valores exatos.

- [x] Escrever teste que exige os 96 nomes/valores aprovados e preservação de colors/typography legacy.
- [x] Rodar `pnpm.cmd --dir apps/mobile test src/lib/design-system/tokens.test.ts`; confirmar falha pela API ausente.
- [x] Implementar tokens tipados/derivados e cn, instalar apenas dependências necessárias compatíveis com Expo 54, configurar Babel/Metro/Tailwind/CSS/types e carregar DM Sans adicionalmente.
- [x] Rodar teste específico e `pnpm.cmd --dir apps/mobile typecheck`; confirmar sucesso sem alterar guards/legacy.
- [x] Commit focado dos arquivos de ownership após verificações relevantes.

### Task 2: Primitives v2 e testes comportamentais

**Ownership:** especialista implementador Orca; somente `apps/mobile/src/components/ui/v2/**`, inclusive proveniência/licença e testes. Não editar configs, tokens, root layout, legacy, telas, API ou Pen. Líder fornece dependências antes da verificação final; ajustes de mocks/configs precisam ser solicitados.

**Files:** text.tsx, button.tsx, icon-button.tsx, field.tsx, numeric-field.tsx, section-tab.tsx, header.tsx, card.tsx, badge.tsx, message.tsx, state-panel.tsx, surface.tsx, skeleton.tsx, sheet-surface.tsx, index.ts e testes próximos, README/LICENSE de proveniência.

**Interfaces:** consumir exports da Task 1. Exportar componentes e tipos pelo barrel; usar props nativas tipadas onde adequado. Button recebe label/onPress/variant/disabled/loading/compact; IconButton exige accessibilityLabel e ícone; Field recebe label/value/onChangeText/unit/hint/error/variant/size e props TextInput; NumericField soma callbacks onIncrement/onDecrement sem matemática interna; SectionTab recebe label/selected/onPress; Header recebe title/variant e ações opcionais; Card aceita children e ação opcional; Badge label/variant; Message title/description/variant/action opcional; StatePanel kind/title/description/action opcional; superfícies recebem children/variant. Ações são `{label: string; onPress: () => void; disabled?: boolean; loading?: boolean}`. Não impor rota, query ou regra de negócio.

- [x] Escrever testes RNTL para variantes e eventos: press/disabled/loading/focus/blur; label/value/unit/error, password/search/numeric; callbacks numéricos preservando string vazia; tab selecionada; Card estático e interativo; feedback e StatePanel sem retry durante loading; texto longo sem truncamento.
- [x] Rodar cada grupo antes de implementar e registrar falha observada por recurso ausente.
- [x] Consultar fontes primárias atuais do React Native Reusables e adaptar componentes equivalentes com proveniência MIT e tokens v2; implementar restantes conforme spec/MCP. Classes NativeWind reais, não somente className decorativo com StyleSheet duplicado.
- [x] Rodar `pnpm.cmd --dir apps/mobile test src/components/ui/v2` e typecheck; revisar diff próprio e entregar Result Capsule com comandos e limitações, sem commit/push concorrente.
- [x] Líder verifica resultado determinístico e solicita revisão independente da tarefa/diff antes da integração final.

### Task 3: Integração, revisão e PR

**Ownership:** líder para integração/verificação/documentação/PR; revisor independente somente leitura, lançado pelo pai devido ao limite Orca nested depth 1.

**Files:** documentação do card e evidência de bundling em apps/mobile/test ou scripts se necessária; mudanças de correção roteadas ao ownership original.

**Interfaces:** barrel v2 e config da Task 1; relatório completo em `docs/muv-32-result-capsule.md`.

- [x] Criar entrada de bundling verificável que importa v2 sem expor rota de domínio ou desviar guards; escrever teste/probe que detecta pipeline ausente antes da configuração quando aplicável.
- [x] Executar bundle Expo Android com essa entrada e conferir CSS interop/classes/tokens gerados, além de bundle padrão do aplicativo.
- [x] Rodar suíte mobile, typecheck, doctor, coverage core/UI, Biome do escopo, diff check e varredura UTF-8/escapes. Conferir hashes Pen e ausência de mudanças fora do escopo.
- [x] Se emulador disponível, validar foundation por Maestro; registrar ausência/limites reais sem alegar UI nativa inspecionada.
- [x] Produzir pacote de revisão independente do diff completo, registrar achados por severidade, corrigir materiais com teste que falha antes e passa depois, e revalidar superfície afetada.
- [x] Atualizar plano e Result Capsule com SHA/comandos/resultados/limites; commit, push somente branch autorizada e criar PR para develop. Não executar merge nem Done.

## Revisão interna do plano

Task 2 consome exatamente os exports de Task 1. Prefixos `v2-*` e namespace preservam v1; root layout só adiciona infraestrutura/fontes. Os cinco focos de revisão têm testes na Task 2 ou bundling na Task 3. O limite de profundidade Orca exige lançamento pelo pai, mantendo cápsulas e ownership definidos por esta liderança; sem simular delegação ou revisão. Baseline: 54 arquivos e 455 testes passaram em 09/10/2026.

## Registro final da execução — 10/10/2026

Os itens executáveis do plano foram concluídos e registrados em `docs/muv-32-result-capsule.md`. O revisor independente encontrou o padding incorreto de Card; a correção foi commitada no SHA `9a5b61d9d91a241ba41700269cb404492fd80e54` e a revisão incremental confirmou a correção sem outros achados materiais (cápsulas Orca `msg_f0468d77e71d` e `msg_45a4f63f8ede`). A PR #20 permanece draft até a confirmação do coordenador; esta execução não faz merge nem altera o status de MUV-32.