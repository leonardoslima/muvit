# Superpowers e agentes com perfis fixos

O chat principal usa Terra medium para coordenar a rodada. Ele reúne o contexto, chama os especialistas, integra alterações, confere evidências e cuida de GitHub/Linear. Sol high planeja e revisa em sessões independentes; o principal não refaz o planejamento delegado. Superpowers permanece obrigatório nas etapas pertinentes, com decisões técnicas rotineiras autônomas conforme a autorização da rodada.

## Perfis do projeto

A configuração do principal está em `.codex/config.toml`; os especialistas estão em `.codex/agents/muvit-*.toml`, na raiz do repositório. Esses arquivos são a configuração efetiva. Não há seleção automática de perfil por cota nem dependência externa de roteamento.

| Papel | Agente | Modelo | Effort |
| --- | --- | --- | --- |
| Coordenador | Chat principal | `gpt-6.1-terra` | `medium` |
| Planejador | `muvit-planner` | `gpt-6.1-sol` | `high` |
| Implementador | `muvit-implementer` | `gpt-6.1-terra` | `xhigh` |
| Revisor | `muvit-reviewer` | `gpt-6.1-sol` | `high` |
| Verificador de checks | `muvit-quality-verifier` | `gpt-6-luna` | `medium` |
| QA visual | `muvit-visual-qa` | `gpt-6.1-terra` | `medium` |

Planejador, implementador e revisor participam das etapas correspondentes. Delegue uma bateria de checks ao verificador quando isso compensar; comandos simples podem ficar com o implementador. QA visual é obrigatório quando o card altera interface e testa fluxos na aplicação, sem exigir comparação com design. A revisão de código não substitui checks nem QA visual.

## Execução direta

1. Antes do claim, confirme ferramentas, acesso aos modelos e capacidade do host de aplicar os perfis necessários. Codex descobre agentes de projeto em `.codex/agents/`. Uma sessão já iniciada pode precisar recarregar as definições; criar o arquivo não altera retroativamente o modelo do chat. Overrides explícitos do host podem prevalecer sobre o projeto: confira o coordenador efetivo antes da rodada.
2. Inicie o especialista pelo nome configurado. Se o host não descobrir nomes personalizados, use sua ferramenta nativa com modelo, esforço e instruções do TOML correspondente explicitamente. Quando a ferramenta exigir `fork_turns="none"` para aceitar modelo e esforço, use esse modo e envie o contexto necessário no pedido. Não herde silenciosamente o perfil do principal. Sem suporte ao perfil obrigatório, registre bloqueio antes do claim.
3. Execute um especialista por vez como padrão, evitando duplicação de contexto. O teto é de quatro agentes simultâneos incluindo o principal; a configuração Codex permite três especialistas, pois seu limite exclui o principal. Workers não iniciam outros agentes. Paralelismo, quando útil, exige ownership disjunto. Use a assinatura Codex Plus, sem API paga ou extras.
4. Informe objetivo, aceite, plano, caminhos permitidos e proibidos, dependências e comandos de validação. Aponte para documentos e trechos relevantes em vez de repassar toda a conversa. Informe que há outros agentes no repositório e que mudanças alheias devem ser preservadas. Ajustes rotineiros ficam com o implementador; descobertas que invalidem o plano voltam ao planejador, com evidências.
5. O reviewer recebe a HEAD e o diff integrados em sessão independente, sem escrita concorrente sobre o que revisa. Não reutilize a sessão do planejador para revisar. Sua restrição de não editar é uma instrução operacional: o TOML herda as permissões do principal, sem prometer sandbox próprio.
6. Confira IDs, modelos/esforços efetivos quando expostos, diff, comandos e resultados. Workers não fazem claim, commit, push, PR ou merge nem alteram preferências. Resultados declarados não substituem evidência. A revisão do GitHub e os gates da HEAD corrente continuam obrigatórios.

Se a cota acabar ou um perfil ficar indisponível, preserve estado e reporte o bloqueio. Não troque modelos ou esforços automaticamente. Manutenção desta skill não autoriza uma rodada de card nem iniciar workers para simulá-la.
