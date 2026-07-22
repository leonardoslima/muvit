# AGENTS.md

## Objetivo

Entregue mudancas corretas, pequenas e verificaveis no projeto Muvit, respeitando primeiro as regras locais do diretorio afetado.

## Como usar as regras

1. Identifique o workspace, app, pacote ou diretorio afetado.
2. Leia este arquivo e depois o `AGENTS.md` mais especifico dentro do alvo, se existir.
3. Aplique primeiro a regra mais local; em caso de conflito, a instrucao mais especifica vence.
4. Nao concentre regras especificas neste arquivo raiz. Crie ou atualize subarquivos `AGENTS.md` nos diretorios responsaveis pelo contexto.

## Mapa de subarquivos

- `apps/api/AGENTS.md` - padroes de back-end, rotas, casos de uso, repositorios e piso SOLID.
- `apps/api/src/modules/auth/AGENTS.md` - regras especificas de autenticacao, tokens, senha e papeis.
- `apps/web/AGENTS.md` - padroes do dashboard Next.js, UI, geracao de SDK e integracao com API.
- `apps/mobile/AGENTS.md` - padroes do app Expo, navegacao, armazenamento seguro e fluxo mobile.
- `packages/db/AGENTS.md` - regras de schema Drizzle, indices, migrations, seed e banco de teste.
- `packages/validators/AGENTS.md` - contratos Zod compartilhados entre API, web e mobile.
- `packages/config/AGENTS.md` - configuracoes compartilhadas de TypeScript, Vitest e ferramentas.

## Regras globais

- Mantenha mudancas focadas em um unico objetivo.
- Preserve a arquitetura existente e siga padroes reais do workspace afetado.
- Antes de criar arquivo novo, procure implementacao equivalente no mesmo workspace.
- Reutilize tipos, utilitarios, componentes, hooks, schemas e servicos existentes.
- Nao introduza dependencia, biblioteca ou servico novo sem necessidade comprovada.
- Nao mova, renomeie ou reorganize diretorios sem impacto tecnico direto.
- Preserve contratos existentes de API, schema, validacao e banco.
- Trate breaking changes como excecoes explicitas e documentadas.
- Registre problemas fora de escopo separadamente, sem mistura-los ao diff principal.
- Nao deixe `TODO`, `FIXME`, codigo comentado ou placeholders em mudanca finalizada.

## Escopo e comandos

- Execute comandos a partir da raiz do repositorio.
- Use filtros de workspace quando fizer sentido limitar leitura, testes, lint e build.
- Amplie para o monorepo inteiro somente quando houver motivo tecnico claro.
- No PowerShell, se `pnpm` falhar por bloqueio de execucao de `pnpm.ps1`, use `pnpm.cmd`.
- No Codex App, use primeiro o gerenciamento nativo de worktrees do aplicativo; nao execute `git worktree add` manualmente quando a funcionalidade nativa estiver disponivel e nao crie outra worktree quando a tarefa ja estiver em uma worktree gerenciada pelo Codex.
- Ao criar ou usar worktree, copie arquivos `.env` locais ignorados da raiz original para a worktree antes de executar setup, testes ou builds.

## Convencoes gerais

- Gerenciador de pacotes: `pnpm`.
- Monorepo: Turborepo.
- Linguagem principal: TypeScript estrito quando aplicavel.
- Validacao: Zod.
- Testes: Vitest onde configurado.
- Lint/format: Biome.
- Idioma de comunicacao, comentarios, commits e documentacao local: pt-BR, salvo padrao local mais especifico.
- Preserve caracteres pt-BR como UTF-8 literal em codigo, testes, documentacao e textos de interface; nunca use sequencias de escape Unicode para representar acentuacao.

## Estrutura

- `apps/api` - API REST Fastify.
- `apps/web` - dashboard web Next.js.
- `apps/mobile` - app Expo/React Native.
- `packages/db` - schema Drizzle, migrations, seed e tipos do banco.
- `packages/validators` - schemas Zod e tipos compartilhados.
- `packages/config` - configuracoes base compartilhadas.
- `docs/` - contexto persistente, decisoes, planos, padroes e fluxos locais.

## Qualidade minima

- Use `const` por padrao; use `let` somente com reatribuicao real.
- Nao use `any`; prefira `unknown` com narrowing.
- Nao use non-null assertion (`!`).
- Evite casts desnecessarios.
- Remova imports, parametros, variaveis, branches e codigo morto.
- Declare tipos explicitos em parametros de funcao.
- Prefira retorno antecipado para reduzir aninhamento.
- Mantenha cada arquivo com uma responsabilidade principal.

## Verificacao

- Execute os testes mais especificos do workspace afetado.
- Execute lint, typecheck ou build quando forem relevantes para a mudanca.
- Se nao puder executar alguma verificacao, explique o motivo.
- Informe quais comandos foram executados e o resultado.
- Nao diga que algo esta pronto ou passando sem evidencia.
- Antes de concluir mudancas textuais, procure sequencias formadas por barra invertida, letra `u` e quatro digitos hexadecimais nos arquivos alterados e corrija qualquer ocorrencia usada para representar caracteres que devem permanecer em UTF-8 literal.

## Documentacao local

- Atualize documentacao local ao criar padrao recorrente, risco nao obvio, fluxo dependente de ordem ou contrato de API, ambiente, schema, operacao ou workflow.
- Trate `AGENTS.md` como manual operacional para agentes: escreva regras objetivas, verificaveis e relevantes ao escopo, evitando orientacoes vagas ou contexto excessivo.
- Atualize o `AGENTS.md` responsavel no mesmo diff que alterar uma arquitetura, convencao ou restricao registrada nele.
- Arquivos `AGENTS.md` especificos para LLM devem ter no maximo 200 linhas.
- Evite quebras artificiais de linha em `AGENTS.md`; mantenha frases em uma unica linha quando couberem com boa legibilidade.

## Regra final

Faca a menor mudanca correta que respeite o design existente, preserve contratos atuais, seja verificavel e deixe o projeto mais facil de manter.
