# Cargas inteiras nos treinos

As cargas de prescrições e séries passam a usar `numeric(5, 0)`, mantendo o tipo string do driver Drizzle. Pesos corporais e avaliações continuam com suas precisões anteriores. O seed demo gera cargas inteiras.

Aplicar em ordem pelo migrator oficial:

1. `0007_useful_mulholland_black.sql`: altera `log_sets.load_kg` e `workout_exercises.load_kg`. O PostgreSQL arredonda valores existentes para o inteiro mais próximo; empates positivos sobem (`12.5` vira `13`). A precisão 5 preserva a capacidade anterior, inclusive `9999.9` que passa a `10000`.
2. `0008_round_workout_draft_loads.sql`: migration custom gerada com `pnpm.cmd --filter @muvit/db generate --custom --name round_workout_draft_loads`. Arredonda somente cargas JSON numéricas em `payload.days[].exercises[]`, preservando ordem, demais campos, `null` e ausência de carga. Incrementa `revision` e atualiza `updated_at` somente quando o payload mudar, para rejeitar edições concorrentes baseadas na versão antiga. Rascunhos já inteiros permanecem intactos.

O arredondamento descarta a fração e não pode ser desfeito por uma simples reversão do tipo. Preserve backup antes da aplicação em um ambiente com dados importantes. Os `ALTER TABLE` exigem lock exclusivo e podem reescrever as tabelas; coordene a janela de execução conforme o volume. Evite escritas de versões antigas do app/API durante o rollout. Clientes com rascunhos anteriores modificados precisarão recarregar a versão atual após conflito de revisão.

Primeiro valide exclusivamente no banco de teste confirmado na porta 5433 com `pnpm.cmd --filter @muvit/db migrate:test`. Depois de coordenar a liberação do banco, execute `node --env-file=packages/db/.env.test --import ./packages/db/node_modules/tsx/dist/loader.mjs packages/db/scripts/verify-workout-load-migrations.ts`: a verificação usa tabelas temporárias isoladas para executar os dois SQLs reais contra valores antigos e comprovar arredondamento, preservação do payload e idempotência da transformação JSONB. O script rejeita conexão fora de `localhost:5433`/`127.0.0.1:5433`.

Somente após validar a migration, aplicar no banco local autorizado com `pnpm.cmd --filter @muvit/db migrate`. Não executar seed nem reset para migrar dados existentes.
