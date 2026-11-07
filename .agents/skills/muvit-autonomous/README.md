# muvit-autonomous — v9 local

Fluxo v9 do Muvit com workers supervisionados do Orca: chat nativo preferencial e CLI como fallback autorizado, conforme a configuração do aplicativo. `agents.toml` nesta skill define dois perfis: `hybrid_go` combina Codex Plus e OpenCode Go; `codex_only` usa só Codex Plus e escolhe uma rota `bounded` (Luna) ou `complex` (Sol) pelo escopo do card. Perfil e rota são registrados antes do claim e não mudam por cota durante a rodada. O coordenador aplica agente, modelo, esforço quando aceito e instruções explicitamente no lançamento Orca. As permissões de delegação estão em `references/superpowers-and-delegation.md`.

## Dependências de execução

- Orca operacional, com orquestração, coordenador apto a receber eventos e Codex Plus autenticado. OpenCode Go é exigido somente por `hybrid_go`; `codex_only` atende colaboradores sem Go. Carregar os guias versionados `orchestration` e `orca-cli` pelo executável resolvido para a sessão.
- Superpowers 7.0.1 incluído em `.agents/skills/superpowers/`, com origem e versão em `UPSTREAM.md`; acesso real ao GitHub, Linear e ferramentas necessárias ao card.
- Ao instalar em outro checkout, levar as pastas `muvit-autonomous/` e `superpowers/` de `.agents/skills/`. `.codex/config.toml` espelha somente o perfil do coordenador para o host; os perfis dos workers permanecem dentro da skill. Superpowers não exige instalação global; Orca precisa estar disponível, e OpenCode somente para `hybrid_go`.

## Executar e validar

Pedir ao principal uma rodada de `muvit-autonomous` autoriza trabalhar em exatamente um card elegível até os gates de PR/review ou um bloqueio documentado, sem merge. Consultar ou editar os arquivos autoriza somente manutenção. A execução sequencial dos especialistas é o padrão.

A configuração do projeto não troca o modelo de uma sessão já iniciada. No host, confira Luna xhigh como principal e o suporte ao perfil escolhido antes da rodada; uma seleção explícita do host pode prevalecer. `agents.toml` não é registro automático de agentes Orca. Os IDs de lançamento são `codex` e, no híbrido, `opencode`, com modelo explícito; `--effort` é usado somente com Codex. Sem perfil indicado, use `hybrid_go` quando Go e Codex estiverem disponíveis; sem Go, selecione e registre `codex_only` antes do claim. Na rota `bounded`, Luna medium planeja e implementa tarefas localizadas com critérios e checks claros; na rota `complex`, Sol medium assume essas etapas. Sol medium revisa ambas; Terra medium faz QA visual aplicável. Não troque perfil ou rota por cota ou falha durante a rodada.

O coordenador usa `worker-start`, registra o recibo real de chat/CLI e encerra o turno para ser retomado pelo evento Orca. Workers podem convocar subworkers somente conforme a matriz da referência, com vaga e ownership delimitados no briefing. Correções usam `orchestration send`; o worker conclui pelo protocolo `worker_done` após tratar seus auxiliares. Fim de turno não encerra rodada nem libera trava. Não fazer polling de workers nem substituir Orca por subagentes internos do chat. O teto de quatro agentes incluindo o principal precisa ser contado pelo coordenador: o limite interno de threads Codex não limita workers Orca.

Da raiz do repositório, execute `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests -v`. Os testes analisam `agents.toml`, o espelho do coordenador e contratos documentados; não comprovam acesso aos modelos pelo Orca, superfície efetiva, eventos, subdelegação ou uma rodada real. Não inicie workers ou um card para validar uma manutenção sem autorização específica.

O QA visual testa os fluxos da aplicação em execução quando houver interface afetada, sem exigir comparação com design de referência.

A reserva de cards usa `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py` e fica no diretório Git comum, compartilhado pelas worktrees do mesmo clone. Veja aquisição, liberação e retomada em `references/selection-and-state.md`. Nenhuma branch remota de reserva é criada; o primeiro push da branch de entrega ocorre na preparação da PR.

Cada execução seleciona somente cards `agent_ready` atribuídos ao usuário autenticado no Linear. Cada colaborador precisa usar sua própria conexão; cards sem responsável ou de outro usuário não entram na fila. O precheck Orca em `scripts/precheck.ps1` consulta `--assignee me`, e a skill repete o filtro inclusive em execuções manuais e após adquirir a trava.

## Origem

Base: ZIP original v8.0.0, restaurado em 2026-11-03. A v8.1 introduziu os perfis Codex; a v8.2 passou a delegar pelo Orca; a v9 adota perfis híbridos e delegação hierárquica limitada, conservando seleção, isolamento, QA e revisão. Consulte `MIGRATION-NOTE.md` para o registro histórico.
