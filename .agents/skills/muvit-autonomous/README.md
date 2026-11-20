# muvit-autonomous — v9.1 local

Fluxo do Muvit com workers supervisionados do Orca. Para entrega autônoma, o perfil obrigatório é `hybrid_go` (Codex Plus + OpenCode Go). Consulte `agents.toml` para papéis e modelos.

## Dependências de execução

- Orca operacional, com orquestração, coordenador apto a receber eventos e Codex Plus e OpenCode Go autenticados. Carregue os guias versionados `orchestration` e `orca-cli` pelo executável resolvido para a sessão.
- Superpowers 7.0.1 incluído em `.agents/skills/superpowers/`, com origem e versão em `UPSTREAM.md`; acesso real ao GitHub, Linear e ferramentas necessárias ao card.
- Ao instalar em outro checkout para a automação, levar `muvit-dispatch/`, `muvit-autonomous/` e `superpowers/` de `.agents/skills/`; para uma rodada manual, apenas as duas últimas são necessárias. `.codex/config.toml` espelha somente o perfil do coordenador para o host; os perfis dos workers permanecem dentro da skill. Superpowers não exige instalação global; Orca precisa estar disponível, e OpenCode somente para `hybrid_go`.

## Executar e validar

Uma rodada autônoma autorizada abrange exatamente um card elegível até o merge do PR em `develop` e confirmação de `Done` no Linear, ou um bloqueio documentado. Consultar ou editar a skill é manutenção.

Confira Luna xhigh no coordenador e os modelos obrigatórios antes da rodada. Lance `codex` e `opencode` com modelo explícito e use `--effort` somente com Codex. Go indisponível é bloqueio. O manifesto mantém `codex_only` para trabalhos com autorização separada.

O coordenador usa `worker-start`, registra o recibo real de chat/CLI e encerra o turno para ser retomado pelo evento Orca. Workers podem convocar subworkers somente conforme a matriz da referência, com vaga e ownership delimitados no briefing. Correções usam `orchestration send`; o worker conclui pelo protocolo `worker_done` após tratar seus auxiliares. Fim de turno não encerra rodada nem libera trava. Não fazer polling de workers nem substituir Orca por subagentes internos do chat. O teto de quatro agentes incluindo o principal precisa ser contado pelo coordenador: o limite interno de threads Codex não limita workers Orca.

Da raiz do repositório, execute `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests -v`. Os testes analisam `agents.toml`, o espelho do coordenador e contratos documentados; não comprovam acesso aos modelos pelo Orca, superfície efetiva, eventos, subdelegação ou uma rodada real. Não inicie workers ou um card para validar uma manutenção sem autorização específica.

O QA visual testa os fluxos da aplicação em execução quando houver interface afetada, sem exigir comparação com design de referência.

A reserva de cards usa `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py` e fica no diretório Git comum, compartilhado pelas worktrees do mesmo clone. Veja aquisição, liberação e retomada em `references/selection-and-state.md`. Nenhuma branch remota de reserva é criada; o primeiro push da branch de entrega ocorre na preparação da PR.

O agente inicial da automação usa a skill irmã `$muvit-dispatch`. O coordenador desta skill recebe um card e uma worktree já reservados, confere ownership e prossegue sem duplicar a trava ou o checkout. Execuções manuais desta skill continuam podendo selecionar um card conforme `references/selection-and-state.md`.

Cada rodada nova admite somente um card do time `MUV` no workspace `18309e87-272d-4c09-aa18-ed1711c84dcf`, em estado exato `Todo`, atribuído ao usuário autenticado e aprovado nos demais gates. O coordenador repete a leitura após adquirir ou receber a trava e preserva todas as labels durante a rodada. Retomadas autorizadas reconciliam a reserva existente.

## Origem

Base: ZIP original v8.0.0, restaurado em 2026-11-03. A v8.1 introduziu os perfis Codex; a v8.2 passou a delegar pelo Orca; a v9 adota perfis híbridos e delegação hierárquica limitada, conservando seleção, isolamento, QA e revisão. Consulte `MIGRATION-NOTE.md` para o registro histórico.
