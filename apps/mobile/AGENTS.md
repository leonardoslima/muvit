# AGENTS.md

## Escopo

Estas regras valem para `apps/mobile`, app Expo/React Native do aluno.

## Arquitetura mobile

- Use Expo Router e padroes existentes de telas em `app/` e `src/screens`.
- Mantenha telas finas; extraia regras de dados, permissao, cache e efeitos para hooks ou servicos locais quando crescerem.
- Nao replique regra de negocio da API; consuma contratos compartilhados de `@muvit/validators` e tipos existentes.
- Antes de criar componente, tela ou store, procure padrao equivalente no app.
- Persistencia sensivel deve usar armazenamento seguro ja adotado, nao AsyncStorage direto para secrets.

## Piso SOLID local

- Regras de aplicacao, montagem de payload, selecao de dados, fila offline, cache e upload devem ficar em `src/application` ou `src/lib`, nao diretamente em screens.
- Screens devem permanecer finas: renderizam UI, conectam hooks e chamam services; dependencias concretas como storage, router, picker e query client ficam na borda.
- Modulos em `src/application` nao devem importar `react-native`, `expo-router`, `expo-image-picker`, AsyncStorage concreto, screens ou componentes.
- Cobertura minima bloqueante de 85% vale para o nucleo testavel medido por `pnpm.cmd --dir apps/mobile test:coverage:core`; cobertura ampla fica em `pnpm.cmd --dir apps/mobile test:coverage`.

## Dados, permissao e notificacoes

- Trate chamadas de rede com estados de loading, erro e retry quando o fluxo exigir.
- Solicite permissoes nativas no ponto de uso e trate negacao de forma explicita.
- Push tokens e dados de sessao devem seguir os contratos da API.
- Dados offline ou cache local devem ter origem e invalidez claras.

## UI nativa

- Preserve ergonomia mobile: areas tocaveis confortaveis, feedback de toque, safe area e teclado.
- Texto visivel deve estar em pt-BR e caber em telas pequenas.
- Evite layouts dependentes de dimensoes fixas quando o conteudo puder variar.

## Verificacao

- Para alteracoes mobile, rode `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile typecheck` e `pnpm.cmd --dir apps/mobile doctor` conforme o risco.
- Quando alterar navegacao ou UI, teste pelo Expo em ao menos uma plataforma alvo quando possivel.
