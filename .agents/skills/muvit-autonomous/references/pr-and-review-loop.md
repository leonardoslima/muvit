# PR, Codex Review e loop contínuo de correções

## 1. Antes da PR

- Branch com título curto e vinculado ao card; commits e push somente do trabalho aprovado para escopo do card; base do PR conferida no remoto.
- Checar diff, testes, lint/typecheck/build, migrações e QA prático. Descrever intenção, critérios, evidências, riscos e dependências.
- Abrir PR na branch remota, vincular ao Linear e colocar em **revisão humana** ao final do ciclo técnico. **Não fazer merge** automaticamente.

## 2. Após criar PR e após cada push

1. Consultar GitHub e confirmar se Codex Review automático foi disparado. Não presumir que configuração está ativa só porque existe PR.
2. Checar status para HEAD SHA atual; distinguir comentários/reviews antigos de novos. Se a revisão ainda não chegou, consultar a cada **5 minutos**, no máximo **6 checagens por espera** (~30 minutos). O tempo é por espera de review, não limite global da rodada.
3. Ao receber findings, triagem com evidência: local, severidade, cenário reproduzível, versão da HEAD e decisão técnica. `P0/P1` acionáveis devem ser corrigidos; `P2/P3` podem ser adiados apenas com justificativa técnica objetiva, com registro de pendência quando aplicável. Findings inválidos precisam explicação verificável.
4. Usar `batuta` para decidir delegação de correções conforme necessidade, rodar testes e QA afetados, push, e recomeçar espera da **nova revisão na HEAD corrigida**. Mesmo finding repetido exige conferência do patch atual; não ignorar P1 por já ter aparecido antes.
5. **Repetir sem limite fixo de ciclos enquanto houver findings acionáveis e execução viável.** Não impor teto agregado de 90 minutos nem usar limites de tentativas de uma unidade do playbook para declarar a PR concluída. Cada correção exige causa concreta; acesso, cotas e orçamento aprovados continuam valendo. Ao atingir limite autorizado ou precisar reduzir capacidade, preservar estado e registrar bloqueio/decisão pendente.
6. Se 6 polls transcorrerem sem resposta em uma espera, registrar `REVIEW_PENDING`/bloqueio, HEAD e próxima ação necessária. Não tratar timeout de revisão como PASS nem notificar que PR está totalmente revisada.

## 3. Condições para concluir

- PR existe e corresponde à HEAD testada;
- CI/checks e QA pertinentes foram comprovados;
- review da HEAD atual foi concluído, **sem findings acionáveis**; os menores adiados foram explicitamente justificados e rastreados;
- card e PR estão preparados para **revisão humana final**;
- nenhum merge foi feito por automação.

Sem review, com problemas P0/P1, CI reprovado ou ambiente irrecuperável, termina **como bloqueado/pendente documentado**, não como concluído.

## Registro por iteração

`head_sha`, `review_id`, `timestamp`, `poll_count`, `findings`, `severity`, `accepted/rejected`, `rationale`, `correction_commit`, `checks`, `review_status`, `remaining`. Preserve rastro pequeno, seguro e reprodutível. Veja template `review-iteration.md`.
