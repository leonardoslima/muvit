# AGENTS.md

## Objetivo

Entregue mudancas corretas, pequenas e verificaveis no projeto Muvit, sem violar
os padroes globais do repositorio nem as regras locais de cada workspace, app ou
pacote.

Antes de propor, editar, mover ou criar arquivos:

1. Identifique qual workspace, app, pacote ou diretorio sera afetado.
2. Leia as instrucoes locais do alvo, como `AGENTS.md`, `CLAUDE.md`, `README.md`
   ou documentacao equivalente.
3. Aplique primeiro as regras mais especificas do diretorio afetado.
4. Em caso de conflito, a instrucao mais local vence.

## Regras globais

- Trate este arquivo como fonte de regras globais do projeto.
- Mantenha mudancas focadas em um unico objetivo.
- Preserve a arquitetura existente e siga os padroes ja usados no workspace.
- Antes de criar um arquivo novo, procure uma implementacao equivalente no mesmo
  workspace.
- Reutilize tipos, utilitarios, componentes, hooks, schemas e servicos existentes.
- Nao introduza dependencia, biblioteca ou servico novo sem necessidade comprovada.
- Nao mova, renomeie ou reorganize diretorios sem impacto tecnico direto.
- Se mover ou renomear algo, atualize imports, scripts e documentacao afetada.
- Preserve contratos existentes de API, schema, validacao e banco.
- Trate breaking changes como excecoes explicitas.
- Registre problemas fora de escopo separadamente, sem mistura-los ao diff principal.
- Nao deixe `TODO`, `FIXME`, codigo comentado ou placeholders em mudanca finalizada.

## Escopo de trabalho

- Identifique o workspace afetado ao iniciar qualquer tarefa.
- Limite leitura, edicao, testes e build a esse escopo.
- Amplie para o monorepo inteiro somente quando houver motivo tecnico claro.
- Execute comandos a partir da raiz do repositorio.
- Use filtros de workspace quando fizer sentido limitar o escopo.

## Convencoes do projeto

- Gerenciador de pacotes: `pnpm`.
- Monorepo: Turborepo.
- Frontend: Next.js, React, Tailwind CSS e shadcn/ui em `apps/web`.
- Backend: Fastify em `apps/api`.
- Banco: PostgreSQL.
- ORM/query builder: Drizzle.
- Validacao: Zod.
- Testes: Vitest onde configurado.
- Lint/format: Biome.
- Idioma padrao de comunicacao e documentacao local: pt-BR.

## Estrutura

- `apps/api` - rotas HTTP, middlewares, plugins, testes e servicos backend.
- `apps/web` - paginas, componentes, hooks e integracao cliente.
- `packages/db` - schema Drizzle, client, migrations, seed e tipos do banco.
- `packages/validators` - schemas Zod e tipos compartilhados.
- `packages/config` - configuracoes base compartilhadas.
- `docs/` - contexto persistente, decisoes, planos, padroes e fluxos locais.

## Estilo de codigo

- Use TypeScript estrito quando aplicavel.
- Nao use `any`; prefira `unknown` com narrowing.
- Nao use non-null assertion (`!`).
- Evite casts desnecessarios.
- Use `const` por padrao; use `let` somente com reatribuicao real.
- Remova imports, parametros, variaveis, branches e codigo morto.
- Declare tipos explicitos em parametros de funcao.
- Prefira retorno antecipado para reduzir aninhamento.
- Mantenha cada arquivo com uma responsabilidade principal.
- Extraia partes coesas quando um arquivo acumular responsabilidades.
- Evite valores literais repetidos; extraia constantes quando o valor controlar
  comportamento em mais de um ponto.
- Use vocabulario consistente de dominio e um unico idioma por identificador.

## Padroes de arquitetura

- Mantenha handlers HTTP finos.
- Coloque regras de negocio em servicos ou modulos de dominio.
- Valide entrada e saida nas bordas da aplicacao.
- Nao misture logica de negocio com transporte HTTP.
- Nao misture acesso a dados, transformacao e renderizacao no mesmo arquivo.
- Use schemas compartilhados como contrato central quando existirem.
- No frontend, separe componentes de apresentacao de hooks e acesso a dados
  quando houver estado assincrono ou regra de negocio.
- Derive estado de URL, cache ou props antes de criar estado local duplicado.
- Nao replique regra de negocio no frontend e no backend; defina uma fonte principal.

## Banco e ambiente

- Nao acesse variaveis de ambiente diretamente em qualquer lugar.
- Centralize validacao de ambiente em modulo proprio.
- Atualize `.env.example` ao adicionar, remover ou renomear variaveis.
- Nao edite migrations geradas manualmente quando houver fluxo oficial de geracao.
- Mantenha schema, migration e tipos publicos consistentes na mesma alteracao.
- Ao adicionar recurso novo, atualize validacao, tipos, persistencia, API e consumo
  no frontend no mesmo ciclo, quando aplicavel.

## Verificacao

Antes de considerar uma tarefa concluida:

1. Execute os testes mais especificos do workspace afetado.
2. Execute lint, typecheck ou build quando forem relevantes para a mudanca.
3. Se nao puder executar alguma verificacao, explique claramente o motivo.
4. Informe quais comandos foram executados e o resultado.
5. Nao diga que algo esta pronto ou passando sem evidencia.

## Documentacao local

Atualize documentacao local quando criar padrao recorrente, identificar risco nao
obvio, adicionar fluxo dependente de ordem ou alterar contrato, ambiente, schema,
operacao ou workflow.

Mantenha arquivos globais curtos. Coloque detalhes especificos de dominio,
ambiente, operacao ou workflow em `docs/` ou na documentacao local do workspace.

Sempre que a IA considerar necessario ou util, podem ser criados arquivos
`AGENTS.md` em subdiretorios para documentar padroes locais, convencoes, comandos,
cuidados ou decisoes especificas daquela parte do projeto. Esses arquivos
complementam este arquivo e valem para os arquivos dentro do respectivo diretorio.

## Comunicacao

- Explique decisoes tecnicas de forma breve e objetiva.
- Aponte riscos reais, nao hipoteses vagas.
- Se houver ambiguidade relevante, faca uma pergunta curta antes de implementar.
- Se a suposicao for segura e reversivel, siga em frente e documente a decisao.
- Escreva comentarios, commits, titulos e descricoes em pt-BR, salvo padrao local
  mais especifico.

## Regra final

Faca a menor mudanca correta que respeite o design existente, preserve contratos
atuais, seja verificavel e deixe o projeto mais facil de manter.
