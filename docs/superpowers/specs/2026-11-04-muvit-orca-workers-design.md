# Delegação da muvit-autonomous pelo Orca

Data: 2026-11-04. Estado: aprovado pelo usuário; implementação local autorizada, sem commit ou execução de workers.

## Objetivo e decisão do usuário

Migrar os especialistas da skill local de subagentes internos do chat para workers supervisionados pelo Orca. Usar chat nativo conforme a preferência já configurada pelo usuário no aplicativo; CLI é fallback autorizado quando chat não estiver disponível. A manutenção não inicia rodada, claim, worker, commit, push ou PR.

## Abordagens consideradas

- Exigir chat nativo e bloquear no fallback: evita execução em terminal, mas não corresponde à preferência expressa pelo usuário.
- Usar orquestração Orca com chat nativo preferencial e CLI como fallback: abordagem escolhida pelo usuário. O runtime decide a superfície segundo sua configuração; o coordenador registra o resultado real.
- Manter subagentes internos como fallback: fora da escolha do usuário. Indisponibilidade da orquestração Orca é bloqueio, sem troca silenciosa de backend.

## Contrato proposto

Preservar os modelos e esforços atuais como proposta de continuidade: Terra medium coordena; Sol high planeja e revisa em sessões distintas; Terra xhigh implementa; Luna medium verifica checks; Terra medium executa QA visual. Manter os TOMLs existentes como fonte dos perfis e instruções, sem assumir que Orca descobre nomes personalizados ou aplica a configuração do coordenador automaticamente.

Cada rodada carrega o guia versionado com o executável Orca resolvido para a sessão. O coordenador inicia os especialistas com `orchestration worker-start --agent codex`, informando modelo, esforço, tarefa autossuficiente e workspace correto. O nome do papel identifica a tarefa; não substitui o ID de agente `codex`. O briefing incorpora as instruções pertinentes do TOML, regras locais, critérios de aceite, escopo de escrita e validação.

`worker-start` segue a preferência Chat/CLI do aplicativo, sem flag para forçar chat. Registrar a superfície efetivamente informada no recibo, sem prometer chat quando o runtime usou CLI. Aceitar o fallback do próprio lançamento. Uma falha ou resultado desconhecido não autoriza repetir o comando para tentar CLI: carregar a recuperação versionada, reconciliar efeitos e recursos e só então decidir a próxima ação segura.

Usar a worktree isolada do card para os especialistas sequenciais, evitando uma worktree por papel. Respeitar o isolamento por card e copiar os arquivos `.env` locais ignorados da origem antes de setup, testes e builds, sem expor segredos. Criação e seleção de worktrees seguem o gerenciamento nativo e as regras do host aplicável.

O coordenador encerra o turno após delegar, conservando a rodada em andamento. Ao ser retomado por evento do Orca, executa o `check` indicado, responde perguntas autorizadas e processa `worker_done`. Encerrar um turno para aguardar worker não encerra a rodada nem libera sua trava. Não criar polling de workers ou watchdog próprio. O polling de revisão do GitHub continua sendo outro protocolo, com suas regras atuais.

Enviar ajustes por `orchestration send`; usar os comandos de leitura de workers que suportam chat e CLI. O worker segue o preâmbulo Orca para perguntar e concluir. Não dirigir workers por entrada de terminal. Recuperação, retomada e limpeza seguem os recibos e referências versionadas; silêncio ou timeout não provam saída do processo.

Manter execução sequencial como padrão e teto de quatro agentes simultâneos incluindo o coordenador, contado pelo coordenador também para workers Orca. O limite de threads internas do Codex não limita workers Orca. Workers não delegam nem fazem claim, commit, push, PR ou merge. Revisor usa sessão independente do planejador e recebe a HEAD integrada sem escrita concorrente.

Preservar um card por rodada, assinatura Plus sem extras pagos, lock local, elegibilidade do Linear, Superpowers, testes, QA real, revisão independente, CI e revisão da HEAD corrente. Não introduzir Batuta, novo roteamento de modelos ou alteração global de preferências Orca.

## Arquivos previstos

- `SKILL.md`: backend Orca, pré-requisitos e encaminhamento para o protocolo de delegação.
- `references/superpowers-and-delegation.md`: perfis, lançamento, mensagens, conclusão e restrições dos workers.
- `references/closure-and-recovery.md`: Run/Task/Dispatch e estado necessário à retomada, distinguindo fim de turno de fim de rodada.
- `references/environment.md`: integração do workspace isolado com workers e preparação dos arquivos de ambiente.
- `README.md` e `MIGRATION-NOTE.md`: dependências e descrição atuais, preservando o histórico identificado como histórico.
- `tests/test_contract.py`: atualizar contrato sem confundir validação estática com prova de execução real.

Preservar os valores dos perfis em `.codex/`; documentar a diferença entre essas definições e sua aplicação pelo Orca. Ajustar outras referências ou templates somente se contiverem orientação incompatível com esse fluxo.

## Validação e limites

Executar a suíte específica da skill, validação de frontmatter/referências e `git diff --check`. Conferir UTF-8 literal e escapes Unicode nos arquivos alterados. Conferir os comandos com os guias e a ajuda do Orca instalado. Exercitar decisões sobre recibo de chat, fallback CLI, lançamento desconhecido e retomada sem iniciar trabalho real.

Esses checks não comprovam lançamento real, acesso aos modelos, autenticação Plus ou entrega de eventos. Não iniciar workers ou um card como smoke test nesta manutenção. Informar explicitamente essa limitação na entrega. Não criar commit sem autorização separada.
