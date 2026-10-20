# Evolução de treinos e meta semanal

## Objetivo

Centralizar os indicadores de Sua evolução na API, permitir que o aluno configure sua meta semanal e atualizar os indicadores após sincronizar conclusões. A solicitação explícita amplia o trabalho anterior de apresentação da tela Hoje; não altera os fluxos de prescrição ou autenticação.

## Contrato

- `GET /students/me/workout-evolution?date=YYYY-MM-DD`: retorna `{ streakWeeks, completedThisWeek, weeklyGoal }`. Data local enviada pelo app; `weeklyGoal` é inteiro de 1 a 7 ou `null`.
- `GET /students/me/workout-goal`: retorna `{ weeklyGoal }`.
- `PATCH /students/me/workout-goal`: recebe e retorna `{ weeklyGoal }`; `null` remove a configuração. Rotas exclusivas de aluno, sempre self-scoped pelo `profileId` resolvido da sessão.
- Schemas compartilhados: `workoutEvolutionQuerySchema`, `workoutEvolutionSchema`, `workoutGoalSchema`, `updateWorkoutGoalSchema` em `packages/validators/src/workout-evolution.ts` e exportados pelo índice.

## Regras

Semanas começam na segunda-feira. Apenas conclusões até a data consultada contam. A sequência conta semanas consecutivas com alguma conclusão, aceitando a semana anterior como início enquanto a atual ainda não tiver conclusão. O total semanal conta os registros concluídos da semana atual. A meta é configuração explícita do aluno, independente dos dias cadastrados no plano; não modifica retroativamente a regra de sequência. Nenhuma meta é inventada para perfis existentes.

Persistir a preferência em `student_workout_goals`, separada do contrato existente de alunos, com `student_id` como PK/FK com exclusão em cascata e `weekly_goal` inteiro com constraint de 1 a 7. Ausência de linha representa meta não definida. Reutilizar o índice existente `workout_logs_student_date_idx`.

O repositório retorna o histórico agregado por semana e a meta em uma única consulta SQL, filtrada por aluno, conclusão e data. O caso de uso aplica a regra de sequência sem devolver registros individuais ao app. Rotas permanecem finas; DB fica restrito ao adaptador Drizzle.

## Mobile

Substituir a paginação/cálculo local por leitura validada do resumo da API. Manter cache por usuário e data, requester vinculado à sessão e cancelamento. Card Na semana mostra `de XX treinos` quando houver meta e apenas `treinos` quando não houver.

Adicionar configuração no Perfil do aluno com controles existentes, carregamento, salvar e remover meta, erro/retry e confirmação. Perfil do professor não recebe a configuração. Invalidar meta/resumo após salvar; após conclusão guiada ou drain da fila, invalidar apenas o cache do proprietário, preservando journal e tombstones.

## Verificação

Testar calendário, virada do ano, semana vazia, registros incompletos/futuros, isolamento entre alunos e roles, validação 1–7/null, persistência e remoção de meta, atualização após sincronização e falhas de rede. Gerar migration pelo fluxo Drizzle, aplicar primeiro somente no banco de teste confirmado na porta 5433. Aplicação no banco local de desenvolvimento será aditiva e apenas após validação da migration. Sem resets, novos processos persistentes, merge ou push. Validação visual permanece com o usuário.
