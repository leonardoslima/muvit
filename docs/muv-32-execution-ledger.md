# MUV-32 — Registro de execução

Plano: `docs/superpowers/plans/2026-10-09-muv-32-foundation-mobile-v2.md`.

## Decisões e ownership

- Foundation incremental v2 preserva consumidores legacy; custo se incorreta: migração futura precisa remover a coexistência após todos os cards.
- O runtime recusou worker aninhado com `nested_worker_depth_exceeded`, depth 2/max 1, request `8dccecc1-96ba-4424-8c33-7d1265738f6f`, sem efeitos. O pai despacha especialistas no Run pai com cápsulas definidas pelo líder; nenhum contorno de limite.
- Líder: tokens/config/fontes/test harness/documentação/verificação/PR. Especialista `ctx_94042efc47c1`: somente `apps/mobile/src/components/ui/v2/**` e relatório; não há ownership sobreposto.
- Execução usa Superpowers TDD e executing-plans por responsabilidade; revisão independente do card será lançada pelo pai. Spec/plano tiveram revisão interna, sem aprovação humana simulada.

## Evidência inicial

- Fetch origin/develop: `c4d3ab2e6f36d2de81c527045487dd2723b00a6a`, HEAD igual, divergência 0/0; worktree limpa inicialmente e branch ajustada para `feat/muv-32-foundation-mobile-v2`.
- Baseline mobile: 54 arquivos, 455 testes, exit 0.
- Pen inicial desconectado; após abertura pelo pai, leitura MCP de 96 tokens e símbolos aprovados funcionou. Capturas `QCbOZ`, `t1QC7u`, `X7ftOl` inspecionadas. Hash original/worktree igual: `0747DAAF2AD111E1F974BBC2FD92753E732A0E32BC5F9FD82964054D3F090A03`.
- Token tests: import inicialmente ausente; contrato mínimo tornou a falha comportamental observável (2 failed/1 passed); implementação completa passou 3/3.
- cn: stub retornava vazio, teste de override falhou; implementação clsx/tailwind-merge passou.
- Root fontes: teste detectou ausência dos cinco pesos DM Sans; inclusão passou, preservando Inter/Space Grotesk.
- Verificação específica tokens/cn/root: 3 arquivos/12 testes passaram; typecheck exit 0 e Biome de 11 arquivos passou após formatação.
- Dependências: NativeWind 4.2.7 e Tailwind 3.4 confirmados em documentação primária/registry; mantendo Expo 54 e Reanimated/Worklets existentes.
- `expo install --check` inicial apontou divergências preexistentes: expo 54.0.36/~54.0.37, constants 18.0.13/~18.0.14, sentry-expo 7.2.0/~7.0.0 e bottom-tabs 7.16.0/^7.4.0. Não houve downgrade indiscriminado; doctor e bundling em investigação.
- Pai preparou emulator-5554 e Maestro 2.10.0; inicialmente `adb devices` estava vazio.

## Retomada do snapshot recuperado — 10/10/2026

- O checkout desta Dispatch foi preparado em `c4d3ab2`; o snapshot recuperado corresponde ao trabalho histórico verificado, mas todos os checks foram repetidos neste checkout. `.env` e `apps/mobile/.env` existem, sem leitura nem exposição de conteúdo.
- Antes de instalar dependências, restaurei `apps/mobile/.gitignore` da base e acrescentei `**/.expo/`, preservando regras nativas, assinatura, env e arquivos gerados.
- Registrei correções de `Field`/`NumericField`: `loading` bloqueia interação e `readOnly={false}` não pode reativar controles bloqueados; NumericField também bloqueia incrementos em readOnly. `IconButton` destructive/loading usa spinner `v2Colors.surface`, como Button.
- Testes das correções foram escritos antes da implementação e executados após o setup: 2 arquivos/31 testes passaram. O RED não foi executado durante esta retomada porque dependências ainda estavam ausentes quando os testes foram escritos.
- Instalação/lock: `pnpm.cmd install --lockfile-only --filter @muvit/mobile --no-frozen-lockfile --offline` concluiu; `pnpm.cmd install --offline --frozen-lockfile --filter '@muvit/mobile...'` preparou mobile e validators sem nova resolução. O lock foi inspecionado; alterações de peer context acompanham Expo `54.0.37` e Constants `18.0.14` recomendados no SDK 54, além dos novos pacotes de foundation. Nenhum manifesto de API/web foi alterado.
- Verificação atual: `pnpm.cmd --dir apps/mobile test` passou 59 arquivos/505 testes; `pnpm.cmd --dir apps/mobile typecheck` passou; cobertura core passou Statements 94.03%, Branches 86.90%, Functions 98.93%, Lines 97.53%; cobertura UI passou 89.40%, 86.39%, 94.04%, 93.76% respectivamente. Os thresholds 85% foram mantidos.
- As duas coberturas foram inicialmente iniciadas em paralelo e colidiram no diretório `coverage/.tmp`; ambas foram repetidas sequencialmente e passaram sem erro. Não usar o primeiro resultado parcial.
- `expo-doctor` executou 17 checks e passou 16; o único mismatch é baseline `sentry-expo` 7.2.0 versus `~7.0.0` e `@react-navigation/bottom-tabs` 7.16.0 versus `^7.4.0`. Não foram feitos downgrade, exclusão de check ou supressão.
- `adb devices` não lista dispositivo. Maestro nativo continua indisponível nesta execução. O MCP pencil `read_skill` e `get_app_state` falhou após três tentativas com `transport not connected to app: desktop`; o arquivo `.pen` não foi aberto diretamente. Nenhuma comparação visual nova foi feita; referências/IDs e leitura histórica estão preservados no handoff recuperado.
- Documentação primária atual consultada: NativeWind v4.2.7 installation, Expo SDK 54 Metro/Babel/Constants e React Native Reusables installation/component model. O React Native Reusables confirma que os componentes são copiados como fonte local, compatível com a adaptação local adotada.
- Ainda pendentes nesta etapa: export Expo Android do app e harness Foundation, revisão independente recuperada pelo Pai, varredura final UTF-8/escapes, atualização da Result Capsule, commit/push e PR.

## Bundles, emulador e correção de revisão — 10/10/2026

- Export Expo Android do harness NativeWind concluiu com 2.971 módulos e bundle incluindo CSS interop/classes e tokens v2; export bytecode também passou com fontes DM Sans. O export Android padrão concluiu com 2.233 módulos e 84 assets.
- O emulador `emulator-5554` foi iniciado e Maestro 2.10.0 executado contra o harness. As duas tentativas falharam antes da validação da tela: primeira exibiu ANR de System UI; segunda terminou em home depois de `Expo Go` reportar `Failed to download remote update`, mesmo após `adb reverse` e HTTP 200 no endpoint local. Portanto, NativeWind está verificado pelo bundle real, mas não há validação visual nativa concluída.
- A revisão independente identificou que `Card` usava `p-5` (20 dp), embora o spec e `docs/mobile-v2-foundation.md` definam 16 dp. Acrescentei teste que reproduziu a falha e corrigi para `p-4`; actions/fields passaram 32/32 e Biome passou nos dois arquivos. Commit incremental: `9a5b61d9d91a241ba41700269cb404492fd80e54`; re-revisão incremental solicitada ao Pai e ainda pendente.
- Branch tem dois commits sobre `origin/develop`: `67685a6dd4dc98209672ef254d4dd539080a991c` e `9a5b61d9d91a241ba41700269cb404492fd80e54`. Push autorizado feito para `origin/feat/muv-32-foundation-mobile-v2`; PR draft #20 criada para develop. Merge e transição Linear permanecem com o Pai.
- MCP do Pen nesta retomada falhou em `read_skill` e `get_app_state` com `transport not connected to app: desktop`; não houve leitura visual nova. IDs e evidência histórica estão no handoff recuperado; não alegar comparação nova.
- Resultado detalhado e comandos estão em `docs/muv-32-result-capsule.md`. Pendentes antes da conclusão: re-revisão independente, finalizar a Result Capsule/plano, auditoria UTF-8/escapes do diff final e atualizar corpo/estado da PR conforme a revisão.