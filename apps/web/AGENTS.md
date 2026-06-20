# AGENTS.md

## Escopo

Estas regras valem para `apps/web`, dashboard Next.js do trainer.

## Arquitetura web

- Use Next.js, React, Tailwind CSS e componentes shadcn/ui ja existentes.
- Separe componentes de apresentacao de hooks, actions e acesso a dados quando houver estado assincrono ou regra de negocio.
- Derive estado de URL, cache ou props antes de criar estado local duplicado.
- Nao replique regra de negocio do back-end; use contratos da API, SDK gerado ou schemas compartilhados.
- Antes de criar componente, hook ou utilitario, procure equivalente em `src/components`, `src/lib` e rotas existentes.

## Piso SOLID local

- Regras de aplicacao, parsing de formulario, montagem de payload, upload e orquestracao testavel devem ficar em `src/application` ou `src/lib`, nao dentro de componentes ou Server Actions.
- Server Actions devem permanecer finas: recebem entrada da borda, chamam modulo de aplicacao ou SDK, traduzem erro esperado e fazem `revalidatePath` ou `redirect`.
- Modulos em `src/application` nao devem importar componentes React, `next/navigation`, `next/cache` ou SDK gerado diretamente quando houver comportamento de dominio ao redor.
- Cobertura minima bloqueante de 85% vale para o nucleo testavel medido por `pnpm.cmd --dir apps/web test:coverage:core`; cobertura ampla fica em `pnpm.cmd --dir apps/web test:coverage`.
- Cobertura visual critica deve ser medida por `pnpm.cmd --dir apps/web test:coverage:ui`; use Testing Library/jsdom primeiro e Playwright somente para fluxo web que dependa de navegador real.

## API e contratos

- Consulte schemas de `@muvit/validators`, tipos gerados em `src/lib/api` e rotas da API antes de estruturar chamadas.
- Se o contrato da API mudar, rode o fluxo local de geracao com `pnpm.cmd --dir apps/web api:gen` quando a API estiver servindo OpenAPI atualizada.
- Ao alterar formato de payload, atualize estados, mocks, factories e testes relacionados.
- Erros vindos da API devem ser tratados na borda de UI com mensagens claras e sem vazar detalhe interno.

## UI e acessibilidade

- Siga o padrao visual existente; evite criar sistema visual paralelo.
- Use componentes e tokens existentes antes de adicionar variantes novas.
- Trate `src/components/ui` como a camada de primitives visuais; nao adicione regra de dominio ou comportamento especifico de uma funcionalidade nesses componentes.
- Quando um comportamento de interface realmente se repetir, crie uma composicao focada em `src/components` que reutilize os primitives existentes e mantenha uma unica responsabilidade visual ou comportamental.
- Toda acao destrutiva visivel ao usuario deve exigir confirmacao pela composicao compartilhada `ConfirmationDialog`; a tela consumidora fornece gatilho, textos e acao concreta.
- Garanta estados de loading, erro e vazio em telas com dados remotos.
- Prefira controles acessiveis e texto visivel em pt-BR.

## Verificacao

- Para alteracoes web, rode `pnpm.cmd --dir apps/web test`, `pnpm.cmd --dir apps/web typecheck` e `pnpm.cmd exec biome check apps/web` conforme o risco.
- Para fluxos visuais relevantes, verifique no navegador local antes de concluir.
