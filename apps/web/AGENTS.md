# AGENTS.md

## Escopo

Estas regras valem para `apps/web`, dashboard Next.js do trainer.

## Arquitetura web

- Use Next.js, React, Tailwind CSS e componentes shadcn/ui ja existentes.
- Separe componentes de apresentacao de hooks, actions e acesso a dados quando houver estado assincrono ou regra de negocio.
- Derive estado de URL, cache ou props antes de criar estado local duplicado.
- Nao replique regra de negocio do back-end; use contratos da API, SDK gerado ou schemas compartilhados.
- Antes de criar componente, hook ou utilitario, procure equivalente em `src/components`, `src/lib` e rotas existentes.

## API e contratos

- Consulte schemas de `@muvit/validators`, tipos gerados em `src/lib/api` e rotas da API antes de estruturar chamadas.
- Se o contrato da API mudar, rode o fluxo local de geracao com `pnpm.cmd --dir apps/web api:gen` quando a API estiver servindo OpenAPI atualizada.
- Ao alterar formato de payload, atualize estados, mocks, factories e testes relacionados.
- Erros vindos da API devem ser tratados na borda de UI com mensagens claras e sem vazar detalhe interno.

## UI e acessibilidade

- Siga o padrao visual existente; evite criar sistema visual paralelo.
- Use componentes e tokens existentes antes de adicionar variantes novas.
- Garanta estados de loading, erro e vazio em telas com dados remotos.
- Prefira controles acessiveis e texto visivel em pt-BR.

## Verificacao

- Para alteracoes web, rode `pnpm.cmd --dir apps/web test`, `pnpm.cmd --dir apps/web typecheck` e `pnpm.cmd exec biome check apps/web` conforme o risco.
- Para fluxos visuais relevantes, verifique no navegador local antes de concluir.
