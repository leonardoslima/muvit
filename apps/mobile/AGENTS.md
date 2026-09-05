# AGENTS.md

## Escopo

Estas regras valem para `apps/mobile`, app Expo/React Native que atualmente entrega a experiência do aluno e poderá hospedar a experiência de professor/personal.

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
- Cobertura visual critica deve ser medida por `pnpm.cmd --dir apps/mobile test:coverage:ui`; screens devem usar React Native Testing Library com mocks de router, API, storage e dependencias nativas.

## Dados, permissao e notificacoes

- Trate chamadas de rede com estados de loading, erro e retry quando o fluxo exigir.
- Use `authClient.useSession()` como fonte unica de hidratacao e identidade; o plugin Expo do Better Auth e o unico responsavel por persistir a sessao no SecureStore.
- Encaminhe `authClient.getCookie()` no header `Cookie` das chamadas nativas e use `credentials: 'omit'`; nao crie store paralela ou tokens proprios.
- Chamadas de dominio do aluno usam rotas self-scoped `/students/me/*`; nunca trate o ID do usuario Better Auth como `profileId`.
- O fluxo mobile autenticável implementado atualmente é exclusivo de `student`; rejeite e encerre sessões com outro papel enquanto os guards e a navegação de `trainer` não forem implementados nos cards MUV-16 a MUV-19. Essa é uma restrição do escopo atual, não um limite estrutural permanente do app.
- Particione cache persistente privado pela identidade autenticada ou limpe-o ao trocar de conta.
- Solicite permissoes nativas no ponto de uso e trate negacao de forma explicita.
- Push tokens e dados de sessao devem seguir os contratos da API.
- Dados offline ou cache local devem ter origem e invalidez claras.
- Sessoes guiadas offline devem persistir um registro versionado com snapshot validado do dia, particionado por `authUserId` e `workoutDayId`; tente restaurar esse snapshot antes da rede e migre registros legados sem descartar progresso.
- Ao salvar uma sessao, pause-a e persista o relogio acumulado; somente intervalos entre `resumeGuidedSession` e `pauseGuidedSession` contam no resumo enviado.
- Conclusoes devem avancar no journal duravel por `ownerAuthUserId`, data local e `workoutDayId`: persistir `create` antes do POST; persistir `finish` apos o POST bem-sucedido e antes do PATCH; persistir `terminal` apos o PATCH bem-sucedido. O requester deve ser vinculado uma vez ao cookie da mesma sessao Better Auth e o tombstone deve bloquear duplicatas.
- Na reconciliacao de rascunho e tombstone, a mesma data continua bloqueada; para data anterior, remova o rascunho somente no serializador compartilhado por storage e chave e se usuário, dia e `startedAtMs` ainda coincidirem com o snapshot lido. Apos essa remoção, aposente a geração para bloquear saves tardios e remova o tombstone exato somente após essa confirmação. Se a limpeza falhar, ignore o rascunho antigo para liberar o novo ciclo e tente limpar novamente na próxima montagem.

## UI nativa

- Preserve ergonomia mobile: areas tocaveis confortaveis, feedback de toque, safe area e teclado.
- Texto visivel deve estar em pt-BR e caber em telas pequenas.
- Evite layouts dependentes de dimensoes fixas quando o conteudo puder variar.
- O componente `Screen` deve consumir `BottomTabBarHeightContext` e adicionar `tabBarHeight + spacing.lg` ao inset somente quando estiver dentro das tabs; telas nao devem duplicar esse espacamento.
- Use `src/lib/styles.ts` como fonte executavel dos tokens descritos em `PRODUCT.md` e `DESIGN.md`; prefira `colors`, `spacing`, `radii`, `controlSizes` e `typography` a valores visuais locais.
- Reutilize `InlineMessage` para feedback de erro, sucesso e aviso de operacoes ja existentes, sem mover a regra de estado para o componente visual.

## Verificacao

- Para alteracoes mobile, rode `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile typecheck` e `pnpm.cmd --dir apps/mobile doctor` conforme o risco.
- Quando alterar navegacao ou UI, teste pelo Expo em ao menos uma plataforma alvo quando possivel.
- Para testes do app em emulador ou dispositivo, use Maestro como ferramenta padrão; registre evidências observáveis e limitações de cenários não reproduzidos.
