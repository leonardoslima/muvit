# Ciclo de vida do ambiente por rodada

Escopo aprovado na conversa: evoluir o protótipo com preparar, parar e remover explícitos, reduzindo decisões perigosas do agente. Preservar runners E2E e mudanças locais anteriores. Sem commit, push ou execução de cards.

## Contrato

- `prepare` cria/reutiliza recursos e verifica SQL/definição do AVD. `run-android` executa o emulador em primeiro plano; `status` comprova o boot. `stop` encerra somente recursos comprovadamente próprios e preserva dados. `remove` recusa recursos ativos e exige `--apply --delete-data`.
- Sem `--apply`, ações mutáveis apenas mostram plano. `status` consulta recursos reais. A aplicação continua fora deste provisionador.
- Estado v2 vincula worktree, card, run, ID Docker, label, AVD e caminho canônico. Estado legado/incompleto ou recurso substituído bloqueia limpeza. Não adotar estado legado automaticamente.
- Verificar todos os recursos antes de qualquer mutação de cleanup. Não encerrar ADB, fazer prune, matar por nome ou fechar terminais possivelmente reutilizados.
- Exclusões de AVD devem confirmar que o caminho absoluto está dentro de `artifacts/<card>/<run>/environment/avd` e corresponde ao registro do SDK. Nunca apagar a pasta de evidências.
- Manter comandos nos terminais internos do Orca. Testar com nova rodada experimental, preservando o experimento anterior.

## Execução e verificação

1. Escrever e executar testes de recusa antes da implementação (RED).
2. Implementar validação de ownership e comandos de lifecycle; integrar recibos v2 na preparação.
3. Executar testes unitários, simulação sem efeitos e ciclo real prepare/status/stop/remove; comprovar repetição e bloqueio de remove ativo.
4. Atualizar referências da skill e salvar relatório/JSON em artifacts, com limites de validação.

Escolha técnica: manter Python sem dependências e dividir validação/cleanup em módulo adjacente. Alteração localizada, sem um novo orquestrador. Evidências não substituem QA da aplicação. A revisão final é local, sem agentes adicionais.

## Resultado

Etapas concluídas: 18 testes de recusa/contrato passaram; ciclo real prepare/status/reutilização/recusa de remove ativo/stop/remove/repetição passou em recursos novos exclusivos. Skills validadas; diff e integridade textual aprovados. Evidências em `artifacts/ambiente-spike/20261109-lifecycle/`. Todos os shells auxiliares da conversa foram fechados após conferência; nenhuma automação, rodada, publicação ou commit iniciado.

Refinamento solicitado: scripts independentes do host/agente, específicos para Windows. Abertura/fechamento de terminais são responsabilidade do chamador; a skill mantém terminais internos quando o host for Orca. Removidos `--orca-cli`, leitura de `ORCA_CLI_COMMAND`, chamadas à CLI Orca e recibos de terminal da preparação. O comando `run-android` mantém o filho no console herdado e aguarda sua saída, liberando a trava para `stop`. `prepare` retorna o vetor de argumentos para lançamento explícito, sem criar processo destacado. Validação final: 21 testes e novo ciclo real sem a variável Orca passaram; evidências em `artifacts/ambiente-spike/20261109-windows-agnostic/`.
