# muvit-autonomous — v8.1 local

Fluxo v8 do Muvit com perfis fixos: Terra medium coordena, Sol high planeja e revisa, Terra xhigh implementa, Luna medium executa checks e Terra medium faz QA visual. As configurações efetivas estão em `.codex/config.toml` e `.codex/agents/muvit-*.toml` do projeto. Veja `references/superpowers-and-delegation.md` para o uso de cada agente.

## Dependências de execução

- Host capaz de aplicar os perfis e iniciar os especialistas com a assinatura Codex Plus.
- Superpowers 7.0.1 incluído em `.agents/skills/superpowers/`, com origem e versão em `UPSTREAM.md`; acesso real ao GitHub, Linear e ferramentas necessárias ao card.
- Ao instalar em outro checkout, levar as pastas `muvit-autonomous/` e `superpowers/` de `.agents/skills/`, além dos arquivos de configuração de `.codex/`. Nenhuma instalação global é necessária.

## Executar e validar

Pedir ao principal uma rodada de `muvit-autonomous` autoriza trabalhar em exatamente um card elegível até os gates de PR/review ou um bloqueio documentado, sem merge. Consultar ou editar os arquivos autoriza somente manutenção. A execução sequencial dos especialistas é o padrão.

A configuração do projeto não troca o modelo de uma sessão já iniciada. No host, confira Terra medium como principal e a descoberta dos agentes antes da rodada; uma seleção explícita do host pode prevalecer. Os agentes personalizados herdam as permissões do principal.

Da raiz do repositório, execute `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests -v`. Os testes analisam os TOMLs e contratos documentados; não comprovam acesso aos modelos, carregamento pelo host ou uma rodada real. Não inicie um card para validar uma manutenção sem autorização de rodada.

O QA visual testa os fluxos da aplicação em execução quando houver interface afetada, sem exigir comparação com design de referência.

A reserva de cards usa `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py` e fica no diretório Git comum, compartilhado pelas worktrees do mesmo clone. Veja aquisição, liberação e retomada em `references/selection-and-state.md`. Nenhuma branch remota de reserva é criada; o primeiro push da branch de entrega ocorre na preparação da PR.

Cada execução seleciona somente cards `agent_ready` atribuídos ao usuário autenticado no Linear. Cada colaborador precisa usar sua própria conexão; cards sem responsável ou de outro usuário não entram na fila. O precheck Orca em `scripts/precheck.ps1` consulta `--assignee me`, e a skill repete o filtro inclusive em execuções manuais e após adquirir a trava.

## Origem

Base: ZIP original v8.0.0, restaurado em 2026-11-03. A v8.1 substitui a dependência externa de delegação por perfis fixos e conserva o fluxo de seleção, isolamento, QA e revisão. Consulte `MIGRATION-NOTE.md` para o registro histórico.
