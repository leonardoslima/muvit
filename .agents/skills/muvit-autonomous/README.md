# muvit-autonomous — v8.2 local

Fluxo v8 do Muvit com workers supervisionados do Orca: chat nativo preferencial e CLI como fallback autorizado, conforme a configuração do aplicativo. Terra medium coordena, Sol high planeja e revisa em sessões distintas, Terra xhigh implementa, Luna medium executa checks e Terra medium faz QA visual. Os perfis estão em `.codex/config.toml` e `.codex/agents/muvit-*.toml`; o coordenador aplica modelo, esforço e instruções explicitamente no lançamento Orca. Veja `references/superpowers-and-delegation.md`.

## Dependências de execução

- Orca operacional, com orquestração, coordenador apto a receber eventos e agente Codex capaz de usar os perfis com a assinatura Plus. Carregar os guias versionados `orchestration` e `orca-cli` pelo executável resolvido para a sessão.
- Superpowers 7.0.1 incluído em `.agents/skills/superpowers/`, com origem e versão em `UPSTREAM.md`; acesso real ao GitHub, Linear e ferramentas necessárias ao card.
- Ao instalar em outro checkout, levar as pastas `muvit-autonomous/` e `superpowers/` de `.agents/skills/`, além dos arquivos de configuração de `.codex/`. Superpowers não exige instalação global; Orca e seu runtime precisam estar disponíveis.

## Executar e validar

Pedir ao principal uma rodada de `muvit-autonomous` autoriza trabalhar em exatamente um card elegível até os gates de PR/review ou um bloqueio documentado, sem merge. Consultar ou editar os arquivos autoriza somente manutenção. A execução sequencial dos especialistas é o padrão.

A configuração do projeto não troca o modelo de uma sessão já iniciada. No host, confira Terra medium como principal e o suporte aos perfis antes da rodada; uma seleção explícita do host pode prevalecer. Os TOMLs não são registro automático de agentes Orca e não garantem permissões ou sandbox dos workers. O ID de lançamento é `codex`, com modelo/esforço explícitos e briefing derivado do papel.

O coordenador usa `worker-start`, registra o recibo real de chat/CLI e encerra o turno para ser retomado pelo evento Orca. Correções usam `orchestration send`; o worker conclui pelo protocolo `worker_done`. Fim de turno não encerra rodada nem libera trava. Não fazer polling de workers nem substituir Orca por subagentes internos do chat. O teto de quatro agentes incluindo o principal precisa ser contado pelo coordenador: o limite interno de threads Codex não limita workers Orca.

Da raiz do repositório, execute `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests -v`. Os testes analisam os TOMLs e contratos documentados; não comprovam acesso aos modelos, superfície efetiva, eventos Orca, autenticação Plus ou uma rodada real. Não inicie workers ou um card para validar uma manutenção sem autorização específica.

O QA visual testa os fluxos da aplicação em execução quando houver interface afetada, sem exigir comparação com design de referência.

A reserva de cards usa `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py` e fica no diretório Git comum, compartilhado pelas worktrees do mesmo clone. Veja aquisição, liberação e retomada em `references/selection-and-state.md`. Nenhuma branch remota de reserva é criada; o primeiro push da branch de entrega ocorre na preparação da PR.

Cada execução seleciona somente cards `agent_ready` atribuídos ao usuário autenticado no Linear. Cada colaborador precisa usar sua própria conexão; cards sem responsável ou de outro usuário não entram na fila. O precheck Orca em `scripts/precheck.ps1` consulta `--assignee me`, e a skill repete o filtro inclusive em execuções manuais e após adquirir a trava.

## Origem

Base: ZIP original v8.0.0, restaurado em 2026-11-03. A v8.1 introduziu os perfis fixos; a v8.2 passa a delegar pelo Orca, conservando perfis, seleção, isolamento, QA e revisão. Consulte `MIGRATION-NOTE.md` para o registro histórico.
