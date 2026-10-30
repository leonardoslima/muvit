# Superpowers e delegação pela Batuta

## Coordenador e planejamento

O Codex principal responde por seleção, plano, integração, GitHub/Linear e fechamento. Não iniciar outro supervisor ou outra rodada Muvit em um worker. Use as skills Superpowers disponíveis e pertinentes à etapa: descoberta e plano antes da implementação; TDD para comportamento; diagnóstico para falhas; revisão e verificação antes da entrega. Resolva escolhas técnicas rotineiras internamente conforme a autonomia autorizada. Bloqueios de acesso, orçamento e decisões materiais fora do escopo continuam exigindo resolução; não chame um procedimento comum de Superpowers quando a skill necessária estiver ausente.

Use **`batuta`**, não a antiga dependência `orchestrator`, para decidir se delegar e escolher backend, playbook, modelo e esforço. Leia seu `SKILL.md` e somente as referências pertinentes. Não copie roteador, catálogo de modelos ou configuração da Batuta para esta skill. Ausência de setup ou Python não bloqueia capacidades nativas verificadas. Se Batuta estiver ausente, registre o pré-requisito antes de claim; continue apenas leituras e diagnóstico independentes.

## Backend, consumo e permissões

- Siga preferência explícita e política aprovada atual. Confira conta, acesso, cotas e concorrência antes de cada rodada delegada. Leituras ausentes ou antigas permanecem desconhecidas; não inferir acesso por catálogo nem capacidade pela mensalidade. Respeite restrições de provedor, extras e perfil já autorizadas; não reconfigure para viabilizar um card.
- Agentes nativos usam ferramentas reais do host para iniciar, acompanhar e encerrar. O runner Python não inicia nem controla esses agentes e não é pré-requisito para eles. Consulte `native-execution.md` da Batuta; o adaptador Orca somente no host Orca.
- Workers CLI seguem `cli-workflow.md` da Batuta e seus processos/limites próprios. Não apresentar sessão CLI como agente nativo. Não trocar backend exigido silenciosamente.
- Delegue unidades independentes quando compensar. Mudanças pequenas ou acopladas podem ficar no principal. Escritores concorrentes têm caminhos disjuntos e isolamento adequado; revisão usa a HEAD integrada após as escritas.
- Workers não iniciam outra orquestração ou CLIs de agentes alheios. Descendentes nativos herdam escopo/permissões e contam no teto total aprovado junto do principal e demais agentes ativos.
- Registre IDs, parentesco, estado, escolhas e resultados observados. Tokens/custos não expostos ficam desconhecidos; não somar métricas nativas potencialmente inclusivas aos totais CLI. Persistência é serializada pelo principal conforme `tracing.md` da Batuta.
- Cota insuficiente, redução de capacidade ou previsão acima do limite seguem o gate de decisão da Batuta. Reparos ilimitados da PR não autorizam ultrapassar orçamento. Uma nova tentativa precisa de causa concreta e corrigível.

## Brief e retorno

Siga `briefs.md` da Batuta: posição da unidade, objetivo/conclusão verificável, caminhos de escrita e proibidos, interfaces/decisões relevantes, ambiguidades resolvidas e verificações exatas. Aponte para arquivos do plano e critérios; não copie transcrições. Informe que há outros agentes e que mudanças alheias devem ser preservadas.

Workers não alteram Linear, remotos, PR ou preferências da Batuta. Commit, push e PR ficam com o principal, apenas quando a rodada completa estiver autorizada conforme `SKILL.md`; manutenção isolada desta skill não concede essa autorização.

Retorno: status real, arquivos/diff, comandos e resultados, evidências, limitações e próxima ação. O principal confere Git, testes e comportamento antes de integrar. Resultado declarado por worker não prova sucesso.
