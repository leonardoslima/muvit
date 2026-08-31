# MUV-16 — Acesso e navegação do professor no mobile

## Contexto

O aplicativo mobile Expo atende hoje somente a experiência autenticada de aluno. A sessão Better Auth já retorna as roles `student` e `trainer`, mas o guard raiz trata qualquer papel diferente de `student` como visitante e a tela de login encerra a sessão de treinador. Além disso, as rotas de treino do aluno estão diretamente na raiz da árvore do Expo Router, e os efeitos de fila offline e registro de push são montados no layout raiz.

`PRODUCT.md` e `DESIGN.md` definem o mesmo aplicativo para aluno independente e professor/personal, com foundation visual compartilhada e jornadas isoladas. O Pencil é referência funcional e de UX; não é especificação visual pixel a pixel.

## Objetivo

Permitir que uma sessão `trainer` entre no app e receba uma navegação própria, preservando o fluxo atual do aluno, protegendo deep links entre roles e evitando que efeitos exclusivos do aluno sejam montados no shell do professor.

## Decisões

1. A sessão Better Auth continua sendo a única fonte de identidade, role e cookie. Não haverá store, token ou seletor manual de role.
2. Não haverá mudança no backend, schema, validators ou payloads. O contrato atual já representa `student` e `trainer` corretamente.
3. A árvore de rotas será separada por grupos estruturais:

   ```text
   app/
     _layout.tsx
     (auth)/
     (student)/
       _layout.tsx
       (tabs)/
       log/[dayId].tsx
       session/[dayId].tsx
       new-assessment.tsx
     (trainer)/
       _layout.tsx
       trainer/
         _layout.tsx
         index.tsx
         students.tsx
         profile.tsx
   ```

4. As URLs externas existentes do aluno permanecem estáveis: `/`, `/progress`, `/profile`, `/log/:dayId`, `/session/:dayId` e `/new-assessment`. O namespace visível `/trainer` evita colisão entre destinos equivalentes dos dois shells e torna deep links determinísticos.
5. O shell do treinador terá três destinos: `Início`, `Alunos` e `Perfil`. Início e Alunos serão superfícies mínimas, sem busca, CRUD ou queries de domínio nesta etapa. A cópia visível será neutra e orientada ao produto, como `Acompanhe seus alunos por aqui.` e `Consulte seus alunos por aqui.`, sem mencionar etapas de desenvolvimento. O Perfil manterá identidade e logout funcionais, exibindo contexto de treinador.
6. A decisão de acesso será concentrada em uma política pura reutilizável. O `app/_layout.tsx` será a autoridade única para autenticação, role suportada, área da rota, proteção contra deep links e redirecionamentos; os layouts `(student)` e `(trainer)` serão apenas boundaries estruturais para montar seus respectivos stacks e providers.
7. Papel ausente ou desconhecido em uma sessão existente não será tratado como aluno nem treinador. O app bloqueará a árvore protegida e exibirá uma saída segura para encerrar a sessão e retornar à autenticação. O login também encerrará uma sessão cujo papel não possa ser resolvido.
8. `QueueDrain` e `PushTokenRegistration` sairão de `app/_layout.tsx` e serão montados somente em `app/(student)/_layout.tsx`. O `QueryClientProvider`, o carregamento de fontes, Sentry, `StatusBar` e a composição de rotas permanecerão infraestrutura compartilhada; o provider global não é considerado cache de domínio do treinador.
9. A reorganização das rotas existentes do aluno será feita por movimentação dos entrypoints, preferencialmente com `git mv`, preservando conteúdo, named exports e o `default export`. Somente os imports relativos que mudarem de profundidade serão ajustados.
10. `UnsupportedRoleBoundary` será responsável somente pelo bloqueio visível e pelo encerramento seguro da sessão. Depois que a sessão for encerrada, o `app/_layout.tsx` continuará sendo a autoridade que redireciona para `/(auth)/login`.

## Política de navegação e autorização

A política consumida pelo `app/_layout.tsx` receberá `isAuthenticated`, `role` como `unknown` e a área identificada nos segmentos do router. Ela produzirá uma decisão explícita:

| Sessão | Área atual | Resultado |
| --- | --- | --- |
| ausente | autenticação | permite a rota pública |
| ausente | aluno ou treinador | redireciona para `/(auth)/login` |
| `student` | autenticação | redireciona para `/(student)/(tabs)` |
| `student` | aluno | permite |
| `student` | treinador ou área desconhecida | redireciona para `/(student)/(tabs)` |
| `trainer` | autenticação | redireciona para `/(trainer)/trainer` |
| `trainer` | treinador | permite |
| `trainer` | aluno ou área desconhecida | redireciona para `/(trainer)/trainer` |
| role desconhecida | qualquer área | bloqueia a árvore e solicita encerramento seguro da sessão |

Os grupos `(student)` e `(trainer)` serão identificados pelos segmentos, inclusive em navegação direta. Assim, um treinador abrindo `/session/:dayId` ou um aluno abrindo `/trainer` não terá acesso ao conteúdo da role oposta. Redirecionamentos sempre apontarão para o início da role resolvida ou para login, evitando que uma rota inválida seja reempilhada como destino intermediário.

## Fluxo de dados e efeitos

1. O layout raiz aguarda fontes e `authClient.useSession()`.
2. Enquanto a sessão hidrata, renderiza o estado existente de carregamento.
3. Com a sessão resolvida, a política de navegação decide permitir, redirecionar ou bloquear.
4. Somente após a decisão permitir, o `Slot` monta o grupo correspondente.
5. O layout do aluno monta `QueueDrain` e `PushTokenRegistration` junto do shell do aluno. O layout do treinador não importa nem monta esses componentes.
6. Cache persistido específico do domínio do aluno, journal, fila offline, workout session storage, queries de treino/aluno, listeners e demais side effects da experiência do aluno continuam pertencendo exclusivamente ao grupo `(student)`.
7. O `QueryClientProvider` permanece global como infraestrutura compartilhada. O shell do treinador não recebe, nesta etapa, queries de domínio, cache persistido de aluno, subscriptions, listeners de treino ou inicializações de storage do aluno.
8. O shell do treinador usa apenas `Screen`, `ScreenHeader`, `StatePanel`, `AppButton`, `Card`, tokens de `src/lib/styles.ts` e um componente compartilhado de tabs.
9. O logout continua encerrando Better Auth, limpando o `QueryClient` e navegando para `/(auth)/login` somente quando apropriado. O comportamento de erro existente será preservado.

## Organização dos componentes

- `src/application/navigation/role-navigation.ts`: tipos, rotas canônicas, resolução de role, identificação de área e decisão pura de acesso.
- `src/components/navigation/unsupported-role-boundary.tsx`: estado seguro para papel inválido, com encerramento explícito da sessão e feedback recuperável; não decide rotas.
- `src/components/navigation/app-tabs.tsx`: shell de tabs visualmente compartilhado, parametrizado por itens; os itens e labels continuam específicos de cada role.
- `src/screens/trainer-section.tsx`: superfície mínima reutilizável para destinos do treinador ainda sem escopo de negócio.
- `src/screens/profile.tsx`: preserva o fluxo de logout e aceita contexto de conta para que o perfil do treinador não se apresente como aluno.

Nenhum módulo em `src/application` importará React Native, Expo Router, screens ou componentes.

## Estados e falhas

- Sessão pendente: mantém o indicador `Carregando sessão` existente.
- Visitante em rota protegida: redireciona para o login.
- Sessão válida em área da role oposta: redireciona para o início da própria role.
- Papel inválido ou ausente em sessão existente: não monta conteúdo protegido; solicita logout explícito e limpa o cache de queries em memória compartilhado. Quando a sessão for encerrada, o root redireciona ao fluxo de autenticação.
- Falha no logout da superfície de role inválida: mantém a mensagem de erro e a ação de tentar novamente, sem liberar a rota protegida.
- Falhas e estados de negócio do aluno permanecem inalterados; o professor não receberá um estado de domínio inventado nesta etapa.

## Testes

Serão adicionados testes unitários para a política pura cobrindo role suportada, role inválida, área pública, área de aluno, área de treinador, sessão ausente e destinos canônicos. Os testes do root layout, shells e autenticação cobrirão:

1. visitante redirecionado ao login;
2. aluno encaminhado ao shell de aluno;
3. treinador encaminhado ao shell de treinador;
4. aluno bloqueado ao abrir grupo de treinador;
5. treinador bloqueado ao abrir grupo de aluno;
6. role desconhecida bloqueada de forma segura;
7. fila offline e push montados no layout do aluno e ausentes no layout do treinador;
8. o `QueryClientProvider` global continua disponível sem montar cache persistido do domínio do aluno ou side effects de aluno para o treinador;
9. tabs de aluno preservadas;
10. tabs de treinador expostas como `Início`, `Alunos` e `Perfil`;
11. labels, destinos, acessibilidade e estados de seleção são verificados sem fixar valores numéricos de estilo da foundation;
12. login de treinador sem logout e com destino correto;
13. cadastro continuando a criar somente aluno;
14. fluxo existente de logout e navegação do aluno preservado.

## Compatibilidade e escopo

O cadastro continua enviando `role: 'student'`. Não será criado onboarding de treinador, home funcional de alunos, avaliações, gestão de treinos, gestão de exercícios, novas queries, contratos de API, deep link para o dashboard web ou redesign visual. As novas telas consumirão a foundation visual consolidada pela MUV-20 e manterão textos em pt-BR com UTF-8 literal.

## Critérios de aceite

- Sessões `student` continuam entrando em Hoje e mantendo o percurso de treino, progresso, avaliação e perfil.
- Sessões `trainer` entram em `/trainer` e conseguem alternar entre Início, Alunos e Perfil.
- Visitantes permanecem no fluxo de autenticação.
- Deep links para a role oposta são redirecionados antes da montagem da tela protegida.
- O professor não monta fila offline, registro de push, cache persistido de domínio do aluno, journal, workout session storage, queries de treino/aluno ou efeitos exclusivos do aluno; o `QueryClientProvider` global permanece permitido.
- Papel inválido não recebe acesso silencioso nem é assumido como uma role conhecida.
- A implementação não exige alteração de API, schema ou validators.
- Os testes específicos, typecheck e lint do mobile fornecem evidência da mudança.
