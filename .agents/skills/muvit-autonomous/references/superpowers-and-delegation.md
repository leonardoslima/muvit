# Superpowers e workers Orca com perfis híbridos

O chat principal coordena a rodada, integra alterações, confere evidências e cuida de GitHub/Linear. O implementador assume seu ciclo de implementação, checks e correções. O chamador de um auxiliar acompanha a tarefa e integra o resultado; a responsabilidade não é transferida. Superpowers permanece obrigatório nas etapas pertinentes. Use a distribuição local Superpowers 7.0.1 em `.agents/skills/superpowers/` e carregue apenas as skills pertinentes. A proveniência está em `UPSTREAM.md`.

## Perfis e fonte de configuração

`agents.toml`, na raiz desta skill, é a fonte única dos papéis. `[roles.<papel>]` fornece `instructions`; `[profiles.hybrid_go.<papel>]` e `[profiles.codex_only.<papel>]` fornecem agente Orca, modelo e esforço quando aceito. As rotas `planner_complex` e `implementer_complex` do perfil `codex_only` usam, respectivamente, as instruções de `[roles.planner]` e `[roles.implementer]`. Leia as seções do papel e da rota antes de preparar o briefing. O Orca não carrega esse arquivo automaticamente; o coordenador passa os campos do perfil no lançamento e incorpora as instruções no briefing. Nomes de papéis não são IDs Orca. Para OpenCode Go, não passe `--effort` e use o ID pago do manifesto, nunca o modelo Free de nome parecido.

`.codex/config.toml` é somente a configuração do host Codex para o coordenador; seus valores devem espelhar o coordenador dos dois perfis. O host precisa aplicá-lo, pois ler o arquivo não muda uma sessão já iniciada. O diretório `.codex/agents/` não é necessário para esta skill. A pasta `agents/` de uma skill, quando usada para `openai.yaml`, contém metadados de apresentação e invocação da skill, não perfis de workers Orca.

O coordenador usa Luna xhigh nos dois perfis porque reconcilia estado e prioridades entre Linear, GitHub, Git e Orca ao longo da rodada. Max só deve substituir esse padrão após evidência de melhor conclusão por card que compense sua latência e consumo; não altere o esforço de uma sessão em curso para contornar cota. A [orientação oficial de modelos](https://developers.openai.com/api/docs/guides/model-selection) associa Luna xhigh a contexto entre aplicativos; a [orientação de raciocínio](https://developers.openai.com/api/docs/guides/reasoning) recomenda reservar max aos casos de maior complexidade e comparar resultados.

## Escolha do perfil antes do claim

Se o usuário ou a automação indicar `hybrid_go` ou `codex_only`, use esse perfil exato. Sem indicação, escolha `hybrid_go` quando Codex Plus e OpenCode Go estiverem autenticados e disponíveis; para colaborador sem OpenCode Go, escolha `codex_only` quando Codex Plus estiver disponível. Verifique também a autenticação OpenCode do sistema no host: lista vazia de contas gerenciadas pelo Orca não prova ausência de Go. Se a disponibilidade for incerta, bloqueie a seleção em vez de presumir `codex_only`. Registre o perfil e a evidência da escolha no progresso da rodada antes de qualquer claim. A ausência comprovada de OpenCode Go autoriza selecionar `codex_only` **somente no início**; falha, cota ou indisponibilidade do Go depois de escolher `hybrid_go` não autoriza troca de perfil. Se a conta Go existir mas o modelo escolhido estiver indisponível, trate como bloqueio do perfil híbrido, sem trocar silenciosamente. Não troque perfil, provedor, modelo ou esforço durante a rodada para contornar cota ou falha.

No perfil `codex_only`, todos os workers usam Codex Plus. Antes do claim, leia o aceite e o escopo suficiente do card para registrar a rota `bounded` ou `complex` junto do perfil. Use `bounded` somente quando os arquivos e contratos afetados estiverem claros, a mudança for localizada e os checks existentes cobrirem o comportamento; o planejador e o implementador usam Luna medium. Use `complex` se houver ambiguidade material, alteração entre workspaces/contratos, autenticação, schema/migration, risco de segurança ou mudança sem cobertura verificável; o planejador usa `planner_complex` e o implementador `implementer_complex`, ambos Sol medium. Na dúvida, escolha `complex`. O auxiliar e o verificador sob demanda usam Luna medium; QA visual usa Terra medium; a revisão independente usa Sol medium em ambas as rotas. Escalação técnica comprovada usa Sol high. Registre os critérios observados, a rota e os IDs de modelo antes do claim; não mude a rota para contornar cota. Se uma descoberta invalidar a classificação, preserve a rodada e peça nova análise delimitada ao planejador ou ao papel de escalação, com evidência; não substitua silenciosamente o modelo do worker em andamento.

No `codex_only`, o implementador executa os checks existentes com comandos antes de pedir verificador. Prefira execução sequencial, contexto mínimo e reuso do worker nas correções; o teto de quatro agentes é um máximo, não uma meta. Não use Astra, modo Fast ou extras pagos em qualquer perfil. A economia esperada de Luna é uma hipótese a medir por card: as faixas oficiais do Codex Plus variam com tarefa, contexto e esforço, e não garantem consumo ou conclusão por card. Fontes: [uso Codex Plus](https://chatgpt.com/codex/pricing/), [orientação de modelos](https://developers.openai.com/api/docs/guides/model-selection) e [efeito do esforço no uso](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex).

## Preparação do Orca

Resolva o executável uma vez: use `ORCA_CLI_COMMAND` quando definido; caso contrário, `orca-dev` em sessão com `ORCA_DEV_REPO_ROOT`, `orca-ide` no Linux fora de terminal Orca, ou `orca` nos demais casos. `ORCA` nos exemplos é um marcador: substitua pelo executável resolvido e reutilize-o em toda a rodada. Se não executar, reporte o erro sem tentar outro binário.

Carregue `ORCA skills get orchestration` e `ORCA skills get orca-cli`. Esses guias versionados são a autoridade para comandos e recibos; consulte `--help` para flags não cobertas. Antes do claim, confirme runtime, contexto do workspace, capacidade do coordenador de receber eventos, Codex Plus sem extras pagos e os modelos do perfil escolhido. Para `hybrid_go`, confirme também autenticação OpenCode Go, IDs disponíveis e CLI OpenCode no host; para `codex_only`, não exija OpenCode. Listagem de modelos ou credencial armazenada não provam que Orca consegue iniciar o worker. Não inicie workers para simular precheck durante manutenção. Se o runtime não permitir selecionar o modelo obrigatório do perfil escolhido, bloqueie a etapa; não herde o modelo padrão.

No perfil `hybrid_go`, OpenCode com `--model` exige worktree existente e CLI verificada no host; prepare a worktree antes do primeiro worker Go. O planejador Codex pode usar o checkout inicial, conforme o loop da skill. Em ambos os perfis, QA visual só está comprovado quando o worker real recebe capturas e consegue usar `adb`/emulador ou navegador Orca. Sem essa capacidade, registre QA como não comprovado e não avance ao gate de entrega.

## Delegação permitida

| Chamador | Pode convocar | Condição |
| --- | --- | --- |
| Coordenador | Todos os papéis | Mantém ownership da rodada, Git, Linear, PR e gates |
| Planejador | Verificador | Check concreto necessário para fechar o plano |
| Implementador | Implementador auxiliar | Subtarefa independente com arquivos de escrita disjuntos |
| Implementador | Verificador | Diagnóstico independente de falha ou evidência complexa |
| Implementador | QA visual | Interface pronta para teste na aplicação real |
| Implementador | Planejador | Descoberta que invalida materialmente o plano |
| QA visual | Verificador | Investigar logs ou defeito observado |
| Revisor | Verificador | Reproduzir possível defeito, sem alterar o diff |

Verificador e implementador auxiliar não iniciam outros agentes. O revisor não inicia implementador e nunca edita código; devolve achados ao coordenador. Todo auxiliar devolve evidências ao chamador, que só conclui sua Task após tratar os auxiliares. Delegue por necessidade: não crie agente para ler arquivo, executar comando simples ou resumir resposta curta. Reuse o Dispatch do implementador com `orchestration send` para correções quando possível.

Há no máximo **dois níveis** de delegação abaixo do coordenador: coordenador → worker → subworker. O teto é de **quatro agentes** vivos simultaneamente, incluindo o coordenador e tentativas de estado incerto. O coordenador reserva no briefing quantas vagas de auxiliares um worker pode usar; não distribua mais vagas do que o teto disponível. Antes de iniciar auxiliar, o chamador confere workers vivos e escopo de escrita; não inicia se contagem ou ownership forem incertos. O limite de threads de `.codex/config.toml` não controla workers Orca. Tarefas paralelas só escrevem em caminhos disjuntos; a HEAD integrada é revisada sem escrita concorrente.

## Lançamento e retorno

1. Prepare briefing autossuficiente com perfil escolhido, papel, objetivo, aceite, plano, caminhos permitidos/proibidos, AGENTS.md, Superpowers pertinentes, comandos e evidências, vagas de auxiliares e condições de delegação. Indique que há outros agentes. Incorpore `instructions` de `[roles.<papel>]` em `agents.toml` e as regras da etapa desta skill. Referencie documentos locais em vez de copiar toda a conversa. Registre o briefing em `artifacts/<issue-ou-escopo>/<execucao>/` e use `--spec-file` para preservar UTF-8.
2. Escolha workspace explicitamente. Após o isolamento, especialistas usam a mesma worktree do card. `--worktree current` só vale se o chamador já estiver na worktree certa; caso contrário use seletor exato. A preparação de `.env` segue `environment.md`.
3. Inicie com `--agent codex --model ... --effort ...` para Codex e `--agent opencode --model ...` para Go, sem `--effort`. O exemplo é do planejador do perfil `hybrid_go` e da rota `complex` do `codex_only`; na rota `bounded`, use Luna medium. Para cada papel use os campos de `[profiles.<perfil>.<rota>]` em `agents.toml`.

```text
ORCA orchestration worker-start --worktree "<seletor-exato-da-worktree-do-card>" --agent codex --model gpt-6.1-sol --effort medium --spec-file "artifacts/<issue-ou-escopo>/<execucao>/planner.md" --json
```

Para subworker, o pai usa `worker-start` conforme o guia versionado com `--from <handle-do-pai>`, `--parent <task-id-do-pai>`, worktree exata e perfil permitido. Essas flags no help não provam subdelegação funcional: antes de depender dela na primeira rodada, confirme uma chamada real e o retorno ao pai. Se o runtime recusar antes de criar recursos, o pai usa `orchestration ask` para o coordenador iniciar o auxiliar na mesma Run; o coordenador encaminha o resultado ao pai por `send`, preservando ownership e teto. Se o resultado for desconhecido, reconcilie o Dispatch antes de qualquer novo lançamento. Não apresente tentativa recusada como auxiliar executado.

`worker-start` segue a preferência Chat/CLI do Orca; confira no recibo qual superfície iniciou, sem inventar `--surface`. Falha ou resultado desconhecido não autoriza repetir lançamento; siga `closure-and-recovery.md` e a recuperação versionada.

Registre Run, Task, Dispatch, workspace, handle, perfil solicitado/efetivo, superfície e próxima ação do recibo. Após iniciar trabalho independente, encerre o turno e retome pelo evento Orca. Siga `next` e processe `worker_done`; não use polling, loops de `check`, sleeps ou terminal send para dirigir worker. Ajustes vão por `ORCA orchestration send --to dispatch:<dispatch_id> --subject "<assunto>" --body "<mensagem>"`; leia com `ORCA orchestration worker-read --dispatch <dispatch_id> --source auto` quando necessário. Use `ask` para decisão fora do escopo concedido. Revise Git, comandos e evidências antes de avançar: resultado do worker não prova comportamento.

Somente o coordenador altera Linear, faz claim, commit, push e PR. Nenhum worker faz merge. CI, QA aplicável e revisão do GitHub na HEAD corrente continuam obrigatórios. Manutenção desta skill não autoriza rodada de card nem worker de teste.
