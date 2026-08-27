# Relatório da Task 8

## Escopo e estado

- Branch: `feat/muv-8-aluno-mobile`.
- Base de verificação: `e0dc4fc`.
- HEAD verificado antes do commit: `352e1eb364bf5e7740236bba74d22a54d2e9f17a`.
- Hash de referência do commit antes do ajuste final deste relatório: `c57218d`.
- O lint inicial foi executado antes da matriz e retornou código 0, sem os três achados descritos no brief; os três ajustes mecânicos já estavam no working tree.
- O diff consolidado contém somente a documentação operacional recorrente e três ajustes de formatação/importação permitidos pelo ownership da Task 8.

## Comandos e resultados

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm --dir apps/mobile test` | PASS — 26 arquivos, 224 testes |
| `corepack.cmd pnpm --dir apps/mobile test:coverage:core` | PASS — statements 95,4%; branches 91,09%; funções 99,13%; linhas 97,89% |
| `corepack.cmd pnpm --dir apps/mobile typecheck` | PASS — código 0 |
| `corepack.cmd pnpm --dir apps/mobile doctor` | PASS — código 0, sem saída |
| `corepack.cmd pnpm lint` (inicial e final) | PASS — 373 arquivos, sem achados |
| `git diff --check e0dc4fc..HEAD` e `git diff --check e0dc4fc` | PASS — sem saída |
| scan `\\u[0-9A-Fa-f]{4}` nos 30 arquivos alterados desde `e0dc4fc` | PASS — nenhuma ocorrência |

O fluxo visual do Expo não foi executado porque não havia simulador ou dispositivo alvo disponível nesta execução.

## Checklist React dos TSX alterados desde `e0dc4fc`

- Efeitos e dependências: `QueueDrain` depende de `api` e `authUserId`; o timer do descanso usa efeito de montagem com limpeza; não foram encontrados efeitos com dependências ausentes.
- Estado derivado: seleção, progresso, resumo, exercício atual e contadores são derivados durante render ou em `useMemo`; não há efeito usado para espelhar estado derivado.
- Keys: a lista de exercícios usa `exercise.id`; não foram encontrados keys instáveis em listas de produção.
- Acessibilidade: botões e ações principais têm role/label quando necessário; campos têm `accessibilityHint`; mensagens dinâmicas usam `accessibilityLiveRegion`; títulos usam `accessibilityRole="header"`.
- Imports internos: imports do código mobile usam caminhos relativos e os contratos compartilhados usam `@muvit/validators`; não foram encontrados imports internos inadequados.

## Documentação operacional

`apps/mobile/AGENTS.md` registra os invariantes recorrentes de snapshot offline versionado, relógio ativo, journal de conclusão e inset contextual da tab bar, sem ultrapassar 200 linhas.
