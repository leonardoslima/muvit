# MUV-32 — Job Capsule de revisão independente

## Responsabilidade e recursos solicitados

Revisão técnica independente e somente leitura da foundation mobile v2, incluindo interpretação da spec/plano e risco de regressão. O pai lança esta responsabilidade porque Orca limita workers aninhados a depth 1; não repetir os especialistas de implementação ou diagnóstico já concluídos.

Recurso escolhido para esta revisão: Codex `gpt-6-astra`, esforço `high`. Justificativa contextual: cruzar fidelidade do Pen, coexistência legacy/v2, pipeline Expo/Metro/pnpm, semântica acessível e evidência nativa exige julgamento além dos checks; a implementação foi conduzida em SOL/high e o diagnóstico isolado já resolveu o problema de caminhos. Não é uma associação fixa entre função e modelo. O pai deve confirmar parâmetros solicitados e efetivos no recibo/transcript e informar divergências, sem fallback silencioso ou reinício de agente saudável.

Especialização: ler integralmente `C:/Users/Leonardo/.codex/agents/code-reviewer.toml` e aplicar suas instruções. Se o host não carrega esse perfil nativamente, registrar `instrucoes_em_linha`, sem afirmar `perfil_carregado`. Aplicar `agent-orchestrator` atualizada quanto a revisão/recursos e o contrato de revisão do Superpowers `requesting-code-review/code-reviewer.md`; não delegar novamente.

## Objetivo e critérios

- Implementar somente MUV-32: 96 tokens aprovados, DM Sans, NativeWind real e primitives buttons/fields/headers/cards/badges/messages/states/superfícies.
- Preservar imports e comportamento legacy; nenhuma migração MUV-33 a MUV-40, API, guard, autorização, regra de negócio ou modificação Pen.
- React Native Reusables como base quando equivalente; proveniência/licença local, sem biblioteca monolítica, Slot/CVA sem uso removidos.
- Estados default/pressed/focus/disabled/loading reais, callbacks e refs nativas, labels e escala de texto sem truncamento imposto, alvo de ícone 48 dp, sem progresso duplicado.
- Spec/plano tiveram revisão técnica interna autônoma; o usuário dispensou gates humanos, sem aprovação humana simulada. Revise também a adequação dessas decisões.

## Superfície somente leitura

Workspace: `C:/Users/Leonardo/orca/workspaces/muvit/feat-muv-32-foundation-mobile-v2`.
Branch: `feat/muv-32-foundation-mobile-v2`; base `c4d3ab2e6f36d2de81c527045487dd2723b00a6a` (`origin/develop`). Revisar diff de trabalho tracked e arquivos untracked; não presumir que `git diff` inclui arquivos novos. Ainda não há commit/PR desta entrega.

Ler AGENTS raiz/mobile, PRODUCT.md, DESIGN.md, `docs/mobile-v2-foundation.md`, `docs/mobile-v2-design-gate.md`, spec `docs/superpowers/specs/2026-10-09-muv-32-foundation-mobile-v2-design.md`, plano `docs/superpowers/plans/2026-10-09-muv-32-foundation-mobile-v2.md` e `docs/muv-32-primitives-report.md`.

Código/config: `apps/mobile/src/lib/design-system/**`, `apps/mobile/src/components/ui/v2/**`, Babel/Metro/Tailwind/CSS/types, `app/_layout.tsx` e teste de fontes, `app.json`, `package.json`, mocks/configs de teste/cobertura, `test/foundation/**`, `pnpm-lock.yaml`. Verificar por que o lockfile registra atualização dos peers Expo no importer API sem alteração do manifesto API. Não modificar código, índice, branch, docs, tracker, Pen ou dependências; não commit/push/PR/merge.

## Evidências existentes e limites

- Pen MCP somente leitura: 96 tokens e IDs da foundation; capturas `QCbOZ`, `t1QC7u`, `X7ftOl` vistas. Arquivo original/worktree hash `0747DAAF2AD111E1F974BBC2FD92753E732A0E32BC5F9FD82964054D3F090A03`. Não ler arquivo criptografado como JSON. Se consultar MCP, só Get/GetVariables/TakeScreenshot/Print.
- Baseline: 54 arquivos/455 testes. Especialista UI: 59 arquivos/496 testes, 36 testes v2; consolidação atual: 500 testes, 40 v2, cobertura UI branches 86,19%, v2 89,38%; thresholds 85% preservados e includes ampliados.
- NativeWind inicialmente só compilava sem aplicar CSS no harness. Diagnóstico independente demonstrou `cssInterop_outputDirectory` relativo cwd versus filename relativo projectRoot; ajuste apenas no Metro do harness resolveu `injectData` e screenshot Android com estilos v2. Nenhum patch de node_modules.
- Bundle Android padrão passou após declarar diretamente CSS Interop 0.2.7, necessário à resolução pnpm do JSX runtime; bundle final e Maestro serão consolidados pelo líder. Harness isolado não expõe rota nem desvia guards do app.
- Expo patch 54.0.36 → 54.0.37 e Constants 18.0.13 → 18.0.14 alinham recomendações do SDK durante configuração, sem atualização do SDK/RN. Avalie se essa alteração mínima é justificada ou deve ser separada.
- Doctor baseline16/17 com quatro mismatches; atual16/17 com Sentry Expo7.2.0/esperado~7.0.0 e bottom-tabs7.16.0/esperado^7.4.0. Sem exclude, redução de checks ou threshold. Avalie explicitamente risco e se é bloqueante para esta PR, com evidência; Sentry7.0.1 implica downgrade de @sentry/react-native5.17.0→5.5.0 e @sentry/react7.81.1→7.52.1, fora da foundation. Follow-up separado será registrado.
- Logs locais reais: `%TEMP%/muv32-ui-final.log`, `muv32-core-final.log`, `muv32-doctor-final.log`, `muv32-preview-fixed.log`, `muv32-preview-fixed-bundle.js`, `muv32-maestro.log`. Não tratar o relato do líder como prova; confirmar artefatos/trechos pertinentes.

## Saída e interrupção

Retornar Result Capsule ao pai/líder com arquivos inspecionados, comandos reais, configuração efetiva e especialização aplicada, achados por severidade, arquivo:linha, gatilho, impacto e correção mínima. Separar bloqueantes, riscos não bloqueantes e observações; listar comportamentos considerados e deixados fora da avaliação com motivo. Emitir parecer claro sobre prontidão da PR e sobre doctor; não alegar aprovação humana, merge ou card Done.

O líder corrigirá achados materiais e revalidará o risco afetado, sem reiniciar revisão completa por ritual. Esta cápsula autoriza somente revisão independente; integração final permanece com o supervisor pai.
