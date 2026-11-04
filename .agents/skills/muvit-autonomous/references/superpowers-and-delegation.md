# Superpowers e workers Orca com perfis fixos

O chat principal usa Terra medium para coordenar a rodada por orquestração Orca. Ele reúne o contexto, chama os especialistas, integra alterações, confere evidências e cuida de GitHub/Linear. Sol high planeja e revisa em sessões independentes; o principal não refaz o planejamento delegado. Superpowers permanece obrigatório nas etapas pertinentes, com decisões técnicas rotineiras autônomas conforme a autorização da rodada.

Use a distribuição local Superpowers 7.0.1 em `.agents/skills/superpowers/`, a partir da raiz do repositório. Comece por `using-superpowers/SKILL.md` e carregue somente as skills pertinentes à etapa. Referências `superpowers:<nome>` correspondem a `<nome>/SKILL.md` nessa pasta, mesmo quando o seletor do host não exibir o prefixo. A proveniência está em `UPSTREAM.md`; a instalação global não é pré-requisito.

## Perfis do projeto

O perfil do principal está em `.codex/config.toml`; os especialistas estão em `.codex/agents/muvit-*.toml`, na raiz do repositório. Esses arquivos são a fonte de modelos, esforços e instruções, mas não configuram automaticamente os workers Orca. O coordenador transmite modelo e esforço no lançamento e incorpora `developer_instructions` no briefing. Não há seleção automática de perfil por cota nem dependência de Batuta.

| Papel | Agente | Modelo | Effort |
| --- | --- | --- | --- |
| Coordenador | Chat principal | `gpt-6.1-terra` | `medium` |
| Planejador | `muvit-planner` | `gpt-6.1-sol` | `high` |
| Implementador | `muvit-implementer` | `gpt-6.1-terra` | `xhigh` |
| Revisor | `muvit-reviewer` | `gpt-6.1-sol` | `high` |
| Verificador de checks | `muvit-quality-verifier` | `gpt-6-luna` | `medium` |
| QA visual | `muvit-visual-qa` | `gpt-6.1-terra` | `medium` |

Planejador, implementador e revisor participam das etapas correspondentes. Delegue uma bateria de checks ao verificador quando isso compensar; comandos simples podem ficar com o implementador. QA visual é obrigatório quando o card altera interface e testa fluxos na aplicação, sem exigir comparação com design. A revisão de código não substitui checks nem QA visual.

## Preparação do Orca

Resolva o executável uma vez: use `ORCA_CLI_COMMAND` quando definido; caso contrário, `orca-dev` em sessão com `ORCA_DEV_REPO_ROOT`, `orca-ide` no Linux fora de terminal Orca, ou `orca` nos demais casos. `ORCA` nos exemplos abaixo é um marcador: substitua pelo executável resolvido e reutilize-o em toda a rodada. Se não executar, reporte o erro sem tentar outro binário.

Carregue `ORCA skills get orchestration` e `ORCA skills get orca-cli`. Esses guias versionados são a autoridade para comandos e recibos; consulte `--help` para flags não cobertas. Antes do claim, confirme runtime, contexto do workspace, capacidade do coordenador de receber eventos, suporte aos perfis e assinatura Codex Plus, sem API paga ou extras. Não inicie workers para simular esse precheck. Sem suporte obrigatório verificável, registre bloqueio.

O perfil do coordenador precisa estar aplicado pelo host; criar ou ler um TOML não troca modelo de sessão iniciada. Não substituir orquestração Orca por subagentes internos do chat, Batuta ou CLIs iniciadas diretamente pelo shell.

## Lançamento dos especialistas

1. Use um worker por papel/etapa, sequencialmente como padrão. O teto é de quatro agentes simultâneos incluindo o principal; conte também tentativas que ainda possam estar vivas. O limite de threads de `.codex/config.toml` não controla workers Orca. Workers não iniciam outros agentes. Paralelismo exige ownership disjunto.
2. Use `--agent codex` com `--model` e `--effort` do TOML correspondente. `muvit-planner`, `muvit-implementer` e os demais nomes identificam papéis, não IDs de agentes Orca. Não herde silenciosamente o modelo padrão do aplicativo. Perfil indisponível bloqueia a etapa, sem troca automática.
3. Prepare um briefing autossuficiente com papel, `developer_instructions` do TOML, objetivo, aceite, plano quando existente, caminhos permitidos/proibidos, regras AGENTS.md e Superpowers pertinentes, dependências, comandos e evidências esperadas. Indique que há outros agentes e preserve alterações alheias. Referencie documentos/trechos locais em vez de copiar toda a conversa. Registre o briefing em `artifacts/<issue-ou-escopo>/<execucao>/` e passe `--spec-file` para preservar UTF-8 e evitar escapes de shell.
4. Escolha o workspace explicitamente. O planejador pode ler o checkout inicial antes do isolamento previsto no loop; não modifica código de produto. Após o isolamento, os especialistas usam a mesma worktree do card, sem criar outra por papel. `--worktree current` só é válido se o coordenador já estiver na worktree correta; caso contrário, use seu seletor exato. Criação nativa e preparação de `.env` seguem `environment.md`.

Exemplo do planejador já na worktree isolada; substitua os marcadores, prepare o briefing e execute com o binário resolvido. Para outros papéis, aplique seu TOML, sem reutilizar este modelo/esforço por conveniência:

```text
ORCA orchestration worker-start --worktree "<seletor-exato-da-worktree-do-card>" --agent codex --model gpt-6.1-sol --effort high --spec-file "artifacts/<issue-ou-escopo>/<execucao>/planner.md" --json
```

`worker-start` usa a preferência Chat/CLI configurada no Orca: chat nativo é o padrão pretendido e CLI é fallback autorizado. Não há flag `--surface` nesse comando. Confira no recibo qual superfície iniciou e registre o resultado real; se o recibo não a expuser, registre como não comprovada. O fallback do runtime no mesmo lançamento é aceito, sem nova aprovação ou mudança global de configuração. Uma falha ou resultado desconhecido não autoriza repetir o lançamento para tentar CLI; siga `closure-and-recovery.md` e a recuperação versionada antes de qualquer nova tentativa.

## Eventos, correções e conclusão

- Registre Run, Task, Dispatch, workspace, handle quando exposto, perfil solicitado/efetivo, superfície e próxima ação do recibo. Siga `next` quando presente. Depois de iniciar o trabalho independente, encerre o turno: Orca retoma o coordenador por evento. Isso não finaliza a rodada nem libera sua trava.
- Quando retomado, execute o `check` indicado pelo evento. Responda perguntas com `orchestration reply` quando a resposta decorrer do escopo autorizado; ambiguidades materiais seguem as regras de precedência. Processe `worker_done` e seu resultado, sem marcar falha como conclusão bem-sucedida. Escalation/stopReason exige tratamento conforme o guia, sem assumir entrega.
- Não faça polling de workers, loops de `check`, sleeps ou watchdogs para aguardar conclusão; eles podem consumir notificações que deveriam retomar o coordenador. A espera de reviews do GitHub mantém seu protocolo específico e não é espera de worker.
- Envie ajustes por `ORCA orchestration send --to dispatch:<dispatch_id> --subject "<assunto>" --body "<mensagem>"`. Use `ORCA orchestration worker-read --dispatch <dispatch_id> --source auto` para leitura quando necessária, sem depender de terminal: workers chat podem não ter terminal. Não dirija workers por `terminal send` ou `terminal wait`. Correções rotineiras voltam ao implementador; descobertas que invalidem o plano voltam ao planejador com evidências.
- O briefing exige que o worker siga o preâmbulo Task/Dispatch do Orca para perguntar com `ask` e concluir com `worker_done`. Não iniciar outros agentes, alterar preferências, fazer claim, editar Linear, commitar, fazer push, abrir PR ou fazer merge.
- Inicie o revisor em sessão independente do planejador, sobre HEAD/diff integrados, sem escrita concorrente. A restrição de não editar é operacional; não promete sandbox próprio nem permissões idênticas às do principal em outra sessão Orca.
- Confira Git, comandos e evidências antes de avançar, sem repetir checks só por rotina: reexecute quando houver lacuna, contradição ou alteração integrada que invalide o resultado. Declaração de worker não prova comportamento. CI e revisão do GitHub na HEAD corrente continuam obrigatórios.

Se a cota acabar ou um perfil ficar indisponível, preserve estado e reporte o bloqueio. Não troque modelos ou esforços automaticamente. Manutenção desta skill não autoriza uma rodada de card nem iniciar workers para simulá-la.
