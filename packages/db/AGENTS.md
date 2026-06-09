# AGENTS.md

## Escopo

Estas regras valem para `packages/db`, incluindo schema Drizzle, client, migrations, seed e tipos publicos do banco.

## Schema e tipos

- Defina tabelas em `src/schema/*` e exporte pelo `src/schema/index.ts` quando o tipo ou tabela for publico.
- Preserve consistencia entre schema Drizzle, migrations geradas, seed e contratos consumidos por API, web e mobile.
- Nomeie tabelas, colunas, enums e indices com vocabulario de dominio consistente.
- Use tipos Drizzle exportados para entidades persistidas; nao duplique tipos de banco em apps consumidores.
- Antes de criar coluna, enum ou tabela, verifique se ja existe representacao equivalente no schema atual.

## Indices e constraints

- Crie indices apenas quando houver consulta ou restricao real que os justifique.
- Prefira constraints de banco para invariantes persistentes que nao dependem de contexto de request.
- Ao adicionar unique constraint, valide o erro esperado na API ou no caso de uso correspondente.
- Ao adicionar chave estrangeira, revise comportamento de delete/update e impacto nas rotas e seeds.

## Migrations

- Nao edite migrations geradas manualmente quando houver fluxo oficial de geracao.
- Gere migrations com `pnpm.cmd --filter @muvit/db generate` apos alterar schema.
- Rode `pnpm.cmd --filter @muvit/db migrate:test` antes de testes que dependem de banco.
- Nunca aponte testes para banco de desenvolvimento; use `.env.test` do pacote.
- Se uma migration exigir ordem operacional ou cuidado de dados, documente em `docs/operations/`.

## Ambiente e seed

- Variaveis de banco devem ser validadas em `src/env.ts`; nao leia `process.env` diretamente em outros arquivos.
- Seeds devem ser deterministas o suficiente para desenvolvimento local e nao devem ser dependencia oculta de testes.
- Atualize `.env.example` local se adicionar, remover ou renomear variaveis deste pacote.

## Verificacao

- Para schema, rode `pnpm.cmd --filter @muvit/db typecheck`.
- Para migration, rode `pnpm.cmd --filter @muvit/db migrate:test`.
- Para mudanca com consumidores, rode tambem as verificacoes do workspace consumidor afetado.
