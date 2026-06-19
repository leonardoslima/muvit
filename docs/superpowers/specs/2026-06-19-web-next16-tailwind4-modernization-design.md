# Modernizacao Web para Next 16 e Tailwind 4

## Objetivo

Modernizar somente `apps/web` para Next.js 16, React 19.2 e Tailwind CSS 4, atualizar as dependencias web auditadas, remover dependencias depreciadas ou redundantes e preservar os contratos compartilhados do monorepo.

## Contexto atual

- `apps/web` resolve Next.js 15.5.15, React 19.1.0 e Tailwind CSS 3.4.19.
- O preset shadcn `base-nova` e componentes recentes ja usam sintaxe esperada pelo Tailwind 4.
- `globals.css` importa `tw-animate-css`, mas `tailwind.config.ts` ainda registra `tailwindcss-animate` com `require()`.
- O CSS de producao atual preserva diretivas `@theme` e `@utility` sem processamento e nao gera utilitarios usados por componentes Base UI.
- O servidor Next em desenvolvimento encerra ao recompilar a landing page porque `tailwind.config.ts` e carregado como ESM e tenta usar `require()`.
- `pnpm audit --prod` aponta vulnerabilidades conhecidas no Next.js 15.5.15 e dependencias transitivas trazidas pelo CLI `shadcn` instalado como dependencia de producao.

## Escopo aprovado

A entrega fica restrita a `apps/web` e ao lockfile compartilhado necessario para representar suas dependencias.

Inclui:

- Next.js 16.2.9 e React/React DOM 19.2.7.
- Tailwind CSS 4.3.1 com `@tailwindcss/postcss`.
- Migracao do tema existente de `tailwind.config.ts` para configuracao CSS-first.
- Migracao de `src/middleware.ts` para a convencao `src/proxy.ts` do Next.js 16, preservando autenticacao e matchers.
- Atualizacao das dependencias diretas do web apontadas pela auditoria, respeitando compatibilidade.
- Remocao de `tailwindcss-animate`, `@hey-api/client-fetch` e do CLI `shadcn` das dependencias de runtime.
- Atualizacao de `components.json` para Tailwind 4 e manutencao do preset `base-nova`.
- Verificacao de testes, cobertura, tipos, lint, build, audit e navegacao real.

Nao inclui:

- Zod 4, porque os schemas sao compartilhados por API, web e mobile.
- TypeScript 6, porque a configuracao e compartilhada no monorepo.
- Alteracoes funcionais em API, mobile, banco ou validators.
- Redesign visual, troca de tokens ou substituicao em massa de Base UI/Radix.
- Alteracoes funcionais adicionais em `docker-compose.yml`; a remocao local ja feita dos limites de CPU e memoria sera mantida e incluida no diff final por autorizacao do usuario.

## Abordagem escolhida

A migracao sera executada em duas etapas verificaveis dentro da mesma entrega.

### Etapa 1: runtime Next e React

- Atualizar Next.js diretamente para 16.2.9, sem passar pela linha 15.5.19.
- Atualizar React e React DOM para 19.2.7 e os tipos React correspondentes.
- Renomear `src/middleware.ts` para `src/proxy.ts` e adaptar apenas o nome da funcao exportada quando exigido pelo Next.js 16.
- Preservar Server Actions, rotas, cookies, params e searchParams existentes; a auditoria mostrou que as APIs de request relevantes ja sao consumidas assincronamente.
- Atualizar dependencias web de runtime e desenvolvimento que nao exigem mudanca de dominio.

### Etapa 2: Tailwind e shadcn

- Substituir o plugin PostCSS `tailwindcss` por `@tailwindcss/postcss`.
- Remover `autoprefixer`, pois o fluxo Tailwind 4 nao depende mais dessa configuracao local.
- Trocar as diretivas `@tailwind base/components/utilities` por `@import "tailwindcss"`.
- Manter `@import "tw-animate-css"` e remover `tailwindcss-animate`.
- Migrar cores, raios, fontes, tamanhos tipograficos, sombras, background e largura de container para `@theme inline`, mantendo os nomes de classes usados atualmente.
- Manter os valores semanticos em variaveis CSS para preservar light/dark mode e a aparencia existente.
- Remover `tailwind.config.ts` quando todos os tokens estiverem representados em CSS.
- Atualizar `components.json` para nao apontar para um arquivo de configuracao Tailwind removido.

## Dependencias alvo

As versoes principais da entrega sao:

| Pacote | Origem | Alvo |
| --- | --- | --- |
| `next` | 15.5.15 | 16.2.9 |
| `react`, `react-dom` | 19.1.0 | 19.2.7 |
| `tailwindcss` | 3.4.19 | 4.3.1 |
| `@tailwindcss/postcss` | ausente | 4.3.1 |
| `@base-ui/react` | 1.4.1 | 1.6.0 |
| `@sentry/nextjs` | 10.53.1 | 10.59.0 |
| `@tanstack/react-query` e devtools | 5.100.9 | 5.101.0 |
| `react-hook-form` | 7.75.0 | 7.79.0 |
| `lucide-react` | 1.14.0 | 1.21.0 |
| `tailwind-merge` | 3.5.0 | 3.6.0 |
| `vitest`, `@vitest/coverage-v8` | 4.1.5 | 4.1.5 exato, mantido para alinhar a copia hoisted do monorepo |
| `jsdom` | 26.1.0 | 29.1.1 |
| `@hey-api/openapi-ts` | 0.97.1 | 0.98.2 |

Radix, Base UI, Sentry, React Query, React Hook Form, tipos React, PostCSS e ferramentas de teste sem acoplamento hoisted serao atualizados para as versoes atuais encontradas pela auditoria. Vitest e coverage permanecerao em 4.1.5 porque atualizar apenas o web cria duas copias incompatíveis com a augmentacao de tipos do `jest-dom`; atualizar todos os workspaces fica fora do escopo. `@types/node` permanecera na linha 22 e `typescript` na linha 5.9 para manter alinhamento com o monorepo. `zod` permanecera na linha 3.

## Tratamento de dependencias especiais

- `shadcn` nao e importado pelo aplicativo. O pacote sera removido de `dependencies`; operacoes futuras do CLI usarao `pnpm dlx shadcn@latest`.
- `@hey-api/client-fetch` esta depreciado porque o cliente passou a ser incorporado ao `@hey-api/openapi-ts`. A dependencia sera removida, preservando a geracao do SDK e validando o comando `api:gen` contra a API local.
- `@tanstack/react-query-devtools` continuara disponivel para o build enquanto seu uso atual for importado pelo aplicativo; a entrega verificara que ele nao introduz regressao de producao.
- Os pacotes Radix atuais permanecem porque ainda existem componentes do projeto que os importam diretamente. A migracao para o pacote Radix unificado fica fora de escopo.

## Preservacao de comportamento

- URLs, contratos HTTP, cookies, redirects e regras de autenticacao nao mudam.
- O tema visual mantem as mesmas variaveis e nomes semanticos.
- Classes Tailwind 4 ja usadas por `base-nova` passam a ser compiladas corretamente.
- Animacoes ficam sob uma unica fonte, `tw-animate-css`.
- A landing page, login, signup e rotas autenticadas devem manter o comportamento atual.

## Estrategia de teste e verificacao

Esta migracao e majoritariamente de configuracao e dependencias. Em vez de adicionar um teste unitario que leia arquivos de configuracao, sera usado um ciclo red/green executavel:

1. Reproducao vermelha ja registrada: Next dev encerra ao navegar entre `/login` e `/`, e o CSS compilado preserva `@theme`/`@utility` sem gerar classes Tailwind 4 usadas pela UI.
2. Verificacao verde: servidor dev permanece ativo nas mesmas navegacoes, sem erro no console, e o CSS compilado nao contem diretivas Tailwind cruas.
3. Regressao automatizada: executar testes existentes e gates de cobertura do web.

Comandos obrigatorios:

- `pnpm.cmd --dir apps/web test`
- `pnpm.cmd --dir apps/web test:coverage:core`
- `pnpm.cmd --dir apps/web test:coverage:ui`
- `pnpm.cmd --dir apps/web typecheck`
- `pnpm.cmd exec biome check apps/web`
- `pnpm.cmd --dir apps/web build`
- `pnpm.cmd audit --prod`

A verificacao manual automatizada no navegador deve abrir `/`, navegar para `/login` e `/signup`, inspecionar console e confirmar que o servidor permanece disponivel.

## Criterios de aceite

- `apps/web` usa Next.js 16.2.9, React 19.2.7 e Tailwind CSS 4.3.1.
- O build nao contem diretivas `@theme` ou `@utility` sem processamento.
- Classes Tailwind 4 usadas pelos componentes `base-nova` sao geradas.
- O erro `ReferenceError: require is not defined` nao ocorre no desenvolvimento.
- `tailwindcss-animate`, `@hey-api/client-fetch` e `shadcn` nao permanecem como dependencias de runtime do web.
- Middleware/proxy de autenticacao continua protegendo as mesmas rotas.
- Testes, coberturas, typecheck, Biome e build passam.
- A navegacao local entre landing, login e signup funciona sem erros de console.
- Nenhuma alteracao fora do web, lockfile, documentacao aprovada e remocao autorizada dos limites de recursos no `docker-compose.yml` e introduzida.
