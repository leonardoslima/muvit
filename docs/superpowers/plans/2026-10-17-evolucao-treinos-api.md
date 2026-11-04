# Evolução de treinos na API — plano de implementação

**Objetivo:** resumo agregado, meta semanal persistente e atualização do app após sincronização.
**Arquitetura:** validators compartilhados; tabela de preferência independente; módulo de API com portas pequenas, caso de uso e adaptador Drizzle; transporte e configuração no mobile.
**Spec:** `docs/superpowers/specs/2026-10-17-evolucao-treinos-api-design.md`.

## Restrições

Preservar mudanças existentes, UTF-8 literal, contratos de aluno e autenticação. Não criar dependências ou novos processos. Testes de banco usam exclusivamente `.env.test`, porta 5433. QA visual reservado ao usuário.

## Tarefas

- [x] Persistência/contratos: criar e testar os quatro schemas, tabela e migration gerada; exportar `studentWorkoutGoals`, `workoutEvolutionSchema`, `workoutEvolutionQuerySchema`, `workoutGoalSchema`, `updateWorkoutGoalSchema`. Verificar validators e DB.
- [x] Backend: módulo `workout-evolution` e rotas self-scoped; consulta agrupada por semana com meta no mesmo acesso ao banco; domínio de sequência e casos de uso de configuração. Testar regras, roles, isolamento, persistência e atualização após novos logs.
- [x] Mobile: trocar cálculo/paginação local pelo novo resumo, configurar meta apenas no Perfil aluno, exibir denominador quando definido, invalidar consultas após save/conclusão/drain. Testar transporte, edição, sessão e sincronização.
- [x] Integração: migration no banco de teste; testes API/mobile/validators, typechecks dos consumidores e Biome; revisão independente somente leitura; corrigir achados e aplicar migration aditiva local quando validada. Documentar contratos/resultados e preservar artefatos ignorados.

## Foco da revisão

Isolamento por `profileId`; datas locais sem dependência do timezone do servidor; nenhuma paginação de histórico no app; meta `null` diferente de zero; invalidação não pode converter operação confirmada em falha de sincronização ou atingir a conta seguinte.

## Resultado

API: 127/127 testes. Mobile: 827/827 em 86 arquivos, com `--maxWorkers=2 --hookTimeout=60000` devido ao custo de importar as telas no ambiente de teste. Validators: 73/73. Typechecks API/mobile/DB/validators e Biome nos arquivos afetados passaram. Migration 0006 aplicada primeiro em localhost:5433/muvit_api_test e depois em localhost:5432/muvit, sem reset. API existente reconheceu as novas rotas sem reinício; health 200, rotas privadas 401 sem sessão.

A revisão independente apontou leitura antiga sobrescrevendo PATCH e refetch bloqueando confirmação. Ambos foram reproduzidos em testes, corrigidos e revalidados. A regressão de cache aguarda a notificação assíncrona do observer antes de verificar o valor exibido, mantendo também a asserção do cache. Evidências em `artifacts/muv-9/2026-10-17-evolucao-api/` e `artifacts/muv-9/2026-10-17-workout-evolution-backend/`. Validação visual permanece com o usuário. Sem commit ou push.
