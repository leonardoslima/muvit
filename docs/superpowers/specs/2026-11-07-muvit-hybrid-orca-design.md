# Muvit autonomous v9: perfis híbridos e delegação

## Intenção

Preservar a entrega de um card por rodada, os gates de qualidade e a supervisão Orca, reduzindo o consumo do Codex Plus com implementação e verificação sob demanda pelo OpenCode Go.

## Desenho aprovado

- Coordenador Codex Luna xhigh mantém Linear, Git, PR, integração e conclusão. Max fica fora do padrão até haver ganho observado que compense tempo e cota.
- Planejador e revisor independentes usam Codex Sol medium.
- Implementador principal usa `opencode-go/deepseek-v4.1-flash`; verificador sob demanda usa `opencode-go/mimo-v2.6-flash`. QA visual usa DeepSeek somente após comprovar acesso a capturas e ferramentas reais.
- O chamador de um auxiliar acompanha seu resultado e continua responsável pela entrega. Profundidade máxima: coordenador, worker e subworker. Até quatro agentes vivos, incluindo o coordenador.
- Coordenador convoca todos; planejador pode convocar verificador; implementador pode convocar implementador auxiliar, verificador, QA e planejador quando o plano for invalidado; QA e revisor podem convocar verificador. Verificador e implementador auxiliar não delegam.
- Checks comuns são comandos locais. Revisor não edita código nem convoca implementador. Auxiliares que editam recebem arquivos disjuntos. Não há fallback automático de modelo por cota.
- As instruções comuns e os perfis `hybrid_go` e `codex_only` ficam em `agents.toml` dentro da skill. O colaborador sem Go usa apenas Codex; sua rota `bounded` usa Luna medium para planejar e implementar mudanças localizadas, enquanto a rota `complex` usa Sol medium para essas etapas. Sol medium faz revisão independente em ambas, Terra medium faz QA visual aplicável e Sol high fica para bloqueio técnico comprovado. Perfil e rota são registrados antes do claim e não mudam por cota ou falha durante a rodada. O Orca recebe os valores explicitamente no lançamento; `.codex/config.toml` apenas espelha o coordenador para o host Codex.

## Abordagens

Centralizar todas as chamadas no coordenador simplifica supervisão, mas exige transferências repetidas de contexto. A hierarquia limitada escolhida permite autonomia com ownership explícito e orçamento de agentes.

## Limites

A CLI instalada e os IDs de modelos foram verificados, mas nenhum worker ou subworker foi iniciado nesta manutenção. A sintaxe `--from` não prova subdelegação funcional; a primeira rodada precisa validar essa capacidade antes de depender dela. Alterar `.codex/config.toml` não troca o modelo de uma sessão já iniciada. Manutenção não autoriza claim, worker, commit, push ou PR.
