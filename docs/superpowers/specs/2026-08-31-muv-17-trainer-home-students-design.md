# MUV-17 — Home e gestão de alunos do professor no mobile

## Contexto

A MUV-16 habilitou a sessão `trainer`, isolou os shells de aluno e treinador e criou o namespace `/trainer` com as tabs **Início**, **Alunos** e **Perfil**. As superfícies de Início e Alunos ficaram propositalmente como placeholders sem queries de domínio.

A MUV-20 consolidou `PRODUCT.md`, `DESIGN.md`, os tokens executáveis em `apps/mobile/src/lib/styles.ts` e os primitives compartilhados do Expo. O Pencil continua válido como referência funcional/UX, mas não é uma especificação visual pixel a pixel.

A MUV-17 transforma os placeholders do treinador em uma primeira experiência funcional de acompanhamento, sem antecipar os fluxos de avaliações e treinos que pertencem respectivamente à MUV-18 e à MUV-19.

O backend já expõe contratos suficientes para esta entrega:

- `GET /trainer/summary` — resumo agregado do treinador, protegido por `role === 'trainer'`.
- `GET /students?q=&status=&limit=&offset=` — lista somente alunos vinculados ao `req.identity.profileId`, ordenada por nome.
- `GET /students/:id` — retorna o aluno somente quando a `RequestIdentity` pode acessá-lo; um treinador tentando abrir aluno de outro escopo recebe `404`.
- `studentSchema` e `listStudentsQuerySchema` já existem em `@muvit/validators`.
- O payload de `/trainer/summary` ainda é tipado localmente na API e não possui schema compartilhado exportado.

## Fontes de verdade consideradas

- `AGENTS.md`.
- `apps/mobile/AGENTS.md`.
- `apps/api/AGENTS.md`.
- `packages/validators/AGENTS.md`.
- Linear MUV-17, incluindo critérios de aceite e dependências.
- Linear MUV-16 e o estado final do PR #14.
- Linear MUV-20 e o estado final do PR #13.
- Linear MUV-7 e as referências funcionais do Pencil para Início, Alunos e detalhe do aluno.
- Linear MUV-18 e MUV-19 para definir a fronteira dos fluxos seguintes.
- `PRODUCT.md` e `DESIGN.md`.
- `apps/mobile/src/lib/api.ts`, `use-api.ts` e `query-client.ts`.
- `apps/api/src/routes/students.ts` e `trainer-summary.ts`.
- `packages/validators/src/students.ts`.
- `apps/api/src/modules/students/use-cases/ensure-student-access.ts`.

## Objetivo

Entregar a primeira operação útil do treinador no Expo:

1. abrir a home e compreender rapidamente a situação dos alunos;
2. abrir a tab Alunos e localizar um aluno vinculado;
3. carregar mais resultados sem truncar silenciosamente a carteira;
4. abrir um aluno e consultar seus dados essenciais;
5. atualizar manualmente os dados e recuperar falhas de rede;
6. preservar autorização, isolamento por role e a foundation visual já consolidada.

## Decisões de escopo

### 1. A MUV-17 será mobile-only

Não serão alterados API, banco, validators, autenticação ou regras de autorização. Os três endpoints existentes são suficientes para cumprir os critérios de aceite da MUV-17.

O tipo do resumo do treinador será declarado na camada de aplicação mobile porque o endpoint ainda não possui schema compartilhado. Não será movido para `@muvit/validators` apenas para esta tela, evitando uma mudança transversal sem ganho funcional.

### 2. A home usará somente `/trainer/summary`

A home não fará uma segunda query de alunos apenas para destacar uma pessoa arbitrariamente. O endpoint atual já fornece os indicadores úteis e evita consultas desnecessárias:

- total de alunos;
- alunos ativos;
- alunos pausados;
- alunos inativos;
- novos alunos na semana;
- planos ativos;
- avaliações nos últimos 30 dias.

A apresentação priorizará quatro sinais:

- alunos ativos, com total vinculado como contexto;
- novos na semana;
- planos ativos;
- avaliações nos últimos 30 dias.

Pausados e inativos permanecem disponíveis no payload e podem aparecer como contexto secundário no card de alunos sem criar uma nova interação.

### 3. A lista usará busca server-side por nome e paginação explícita

`GET /students` já suporta `q`, `limit` e `offset` e ordena por nome. A MUV-17 usará:

- busca por nome;
- `limit = 25`;
- paginação incremental com ação **Carregar mais**;
- nenhuma filtragem por status nesta etapa.

A busca será aplicada explicitamente ao tocar em **Buscar** ou enviar o teclado. Isso evita rede a cada tecla e dispensa debounce customizado. A ação **Limpar busca** volta à lista completa.

O filtro por status é YAGNI para este card. O status continuará visível em cada aluno.

### 4. O detalhe do aluno será somente leitura

O detalhe consumirá apenas `GET /students/:id` e exibirá:

- nome e iniciais;
- status;
- e-mail;
- telefone;
- data de nascimento;
- gênero;
- objetivo;
- restrições.

Campos ausentes terão fallback textual, sem inventar dados.

`avatarUrl` não será carregado na primeira implementação. Iniciais atendem à identificação sem introduzir estado adicional de imagem remota, cache ou erro visual. O campo poderá ser incorporado posteriormente sem mudar o contrato do detalhe.

### 5. MUV-17 não implementará avaliações nem treinos

A MUV-18 declara explicitamente que integrará o acesso às avaliações a partir da experiência de detalhes do aluno. A MUV-19 assume consulta e manutenção da prescrição.

Por isso, a MUV-17 termina no detalhe do aluno e não criará:

- rotas de avaliações;
- rotas de treinos;
- cards clicáveis que levem a destinos inexistentes;
- previews de última avaliação;
- previews de plano ativo;
- queries para `/students/:studentId/assessments`;
- queries para `/students/:studentId/workout-plans`.

O detalhe será organizado em seções independentes para que MUV-18 e MUV-19 possam adicionar suas entradas sem reestruturar identificação, contato e informações do aluno.

### 6. CRUD de alunos continua fora do mobile

Embora a API possua `POST /students`, `PATCH /students/:id` e `DELETE /students/:id`, a MUV-17 não exporá criação, edição, inativação, exclusão ou troca de vínculo.

“Gestão de alunos” neste card significa consulta operacional da carteira vinculada.

### 7. Não haverá persistência offline do domínio do treinador

A experiência do treinador usará o `QueryClientProvider` global já existente, com cache em memória e chaves prefixadas por `trainer`.

Não serão reutilizados:

- AsyncStorage do treino;
- fila offline;
- journal;
- workout session storage;
- `/students/me/*`;
- push registration do aluno.

Falha de rede no treinador será tratada como erro recuperável com retry/refetch.

## Abordagens consideradas

### Abordagem A — Composição mobile sobre os endpoints existentes — escolhida

Home usa `/trainer/summary`, lista usa `/students` e detalhe usa `/students/:id`.

**Vantagens**

- menor diff;
- zero mudança de contrato;
- autorização continua integralmente no backend;
- reduz risco para MUV-18/MUV-19;
- segue o padrão atual de `useApiClient` + TanStack Query;
- entrega cada tela de forma testável e independente.

**Desvantagem**

- o shape de `/trainer/summary` precisa de um tipo local no mobile enquanto não existir schema compartilhado.

### Abordagem B — Criar um endpoint/BFF específico para a home e detalhe — rejeitada

Um novo endpoint poderia devolver summary, alunos destacados e previews em um único payload.

Foi rejeitado porque criaria contrato novo, alteraria API/validators e anteciparia dados de avaliações/treinos sem necessidade para o aceite atual.

### Abordagem C — Carregar previews de avaliações e treinos no detalhe — rejeitada

O detalhe poderia chamar os endpoints de avaliações e planos existentes.

Foi rejeitado porque aumentaria o número de requests e sobreporia diretamente o escopo funcional da MUV-18 e MUV-19.

## Arquitetura

### Camada de aplicação

Criar `apps/mobile/src/application/trainer/trainer-data.ts` como módulo sem React Native ou Expo Router.

Responsabilidades:

- declarar `TrainerSummary`;
- derivar `TrainerStudent` de `studentSchema`;
- declarar `TrainerStudentsPage`;
- construir a query string de listagem;
- encapsular as três chamadas HTTP da MUV-17.

Interfaces previstas:

```ts
export type TrainerSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
  };
  workouts: {
    activePlans: number;
  };
  assessments: {
    last30d: number;
  };
};

export type TrainerStudent = z.infer<typeof studentSchema>;

export type TrainerStudentsPage = {
  items: TrainerStudent[];
  total: number;
};

export type ListTrainerStudentsInput = {
  q?: string;
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

export function getTrainerSummary(
  api: ApiRequester,
  signal?: AbortSignal,
): Promise<TrainerSummary>;

export function listTrainerStudents(
  api: ApiRequester,
  input: ListTrainerStudentsInput,
): Promise<TrainerStudentsPage>;

export function getTrainerStudent(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<TrainerStudent>;
```

As funções recebem `ApiRequester`, não instanciam `ApiClient` e não conhecem sessão, router ou UI.

### Screens

Criar telas específicas:

- `src/screens/trainer-home.tsx`;
- `src/screens/trainer-students.tsx`;
- `src/screens/trainer-student-detail.tsx`.

Cada screen:

- obtém `ApiClient` via `useApiClient()`;
- usa TanStack Query;
- escolhe estados visuais;
- delega blocos repetidos para components;
- não replica autorização da API.

### Components

Criar components específicos do treinador somente onde há reutilização real:

- `components/trainer/trainer-metric-card.tsx` — indicador da home;
- `components/trainer/student-status-badge.tsx` — status semântico usado em lista e detalhe;
- `components/trainer/student-list-item.tsx` — linha/card acessível que abre o detalhe.

Não será criada uma nova biblioteca visual paralela. Todos os components usam `Card`, tokens de `styles.ts`, `AppButton`, tipografia e espaçamentos existentes.

## Rotas e navegação

A tab bar continua com os mesmos três destinos do MUV-16:

- `/trainer` — Início;
- `/trainer/students` — Alunos;
- `/trainer/profile` — Perfil.

Para permitir lista e detalhe sob a mesma tab, o arquivo atual:

```text
app/(trainer)/trainer/students.tsx
```

será reorganizado para:

```text
app/(trainer)/trainer/students/
  _layout.tsx
  index.tsx
  [studentId].tsx
```

O `students/_layout.tsx` usará um `Stack` interno com `headerShown: false`. Assim, `Tabs.Screen name="students"` continua representando somente a tab **Alunos**, enquanto o detalhe fica em `/trainer/students/:studentId` sem criar uma quarta tab.

O detalhe mantém a tab bar do treinador visível e oferece uma ação explícita **Voltar para alunos** no conteúdo. Isso evita depender do histórico de navegação em deep links e preserva um retorno determinístico.

Nenhuma rota de MUV-18/MUV-19 será criada.

## Contratos de API envolvidos

### `GET /trainer/summary`

Autorização:

- `requireAuth`;
- `requireRole('trainer')`;
- usa `req.identity.profileId`.

Resposta:

```ts
{
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
  };
  workouts: {
    activePlans: number;
  };
  assessments: {
    last30d: number;
  };
}
```

### `GET /students`

Autorização:

- `requireAuth`;
- `requireRole('trainer')`;
- o cliente não envia `trainerId`;
- o backend resolve o escopo por `req.identity.profileId`.

Query usada pela MUV-17:

```text
q=<nome opcional>&limit=25&offset=<offset>
```

Resposta:

```ts
{
  items: TrainerStudent[];
  total: number;
}
```

### `GET /students/:id`

Autorização:

- usa `EnsureStudentAccessUseCase`;
- treinador só acessa `student.trainerId === identity.profileId`;
- mismatch de treinador retorna `404`.

A UI nunca diferencia “ID inexistente” de “aluno fora do seu escopo”.

## Fluxos da interface

### Fluxo 1 — Home do treinador

1. Sessão `trainer` é aceita pelo guard criado na MUV-16.
2. `/trainer` monta `TrainerHomeScreen`.
3. A screen consulta `/trainer/summary`.
4. Loading inicial mostra `StatePanel`.
5. Erro inicial mostra `StatePanel` com **Tentar novamente**.
6. Se `students.total === 0`, mostra estado vazio orientado a acompanhamento, sem ação de criação.
7. Com dados, mostra os indicadores.
8. A ação **Ver alunos** abre `/trainer/students`.
9. A ação **Atualizar** refaz a query mantendo o conteúdo visível quando já houver dados.
10. Se uma atualização falhar com dados antigos disponíveis, os dados permanecem visíveis e um `InlineMessage` informa a falha.

### Fluxo 2 — Lista e busca de alunos

1. `/trainer/students` carrega a primeira página com `limit=25&offset=0`.
2. O campo **Buscar aluno** mantém o texto digitado separado da busca aplicada.
3. **Buscar** normaliza espaços e inicia a consulta com `q`.
4. **Limpar busca** remove `q` e volta à carteira completa.
5. Cada aluno mostra nome, contato preferencial disponível e status textual.
6. Tocar no aluno abre `/trainer/students/:studentId`.
7. Quando ainda houver resultados, **Carregar mais** solicita o próximo `offset`.
8. **Atualizar** refaz as páginas da busca atual.
9. Busca sem resultado exibe vazio específico e oferece **Limpar busca**.
10. Carteira realmente vazia exibe vazio distinto, sem sugerir criar aluno no mobile.

### Fluxo 3 — Detalhe do aluno

1. A rota extrai `studentId`.
2. A screen consulta `/students/:id`.
3. Loading inicial exibe estado de carregamento.
4. `404` exibe **Aluno não encontrado** e ação **Voltar para alunos**.
5. Outros erros exibem estado de erro com **Tentar novamente**.
6. Dados válidos exibem identificação, contato e informações de acompanhamento.
7. Campos ausentes usam `Não informado`, `Sem contato cadastrado`, `Sem objetivo cadastrado` ou `Sem restrições cadastradas`, conforme o contexto.
8. **Atualizar** refaz a query.
9. **Voltar para alunos** sempre aponta para `/trainer/students`.
10. Nenhuma ação mutável ou fluxo de avaliações/treinos aparece nesta entrega.

## Estados por superfície

| Superfície | Loading | Vazio | Erro | Atualização |
| --- | --- | --- | --- | --- |
| Home | `Carregando visão geral` | `Nenhum aluno vinculado` quando `total === 0` | retry sem montar métricas inexistentes | mantém dados; botão `Atualizando...`; falha tardia usa `InlineMessage` |
| Alunos | `Carregando alunos` | diferencia carteira vazia de busca sem resultado | retry preservando busca aplicada | mantém lista; botão `Atualizando...` |
| Paginação | mantém itens atuais | não se aplica | mensagem inline e botão `Tentar carregar mais` | `Carregando mais...` sem bloquear itens atuais |
| Detalhe | `Carregando aluno` | não se aplica | `404` usa mensagem de indisponibilidade; outros erros têm retry | mantém conteúdo; botão `Atualizando...` |

## Cache e chaves de query

Usar chaves que não colidam com o domínio do aluno:

```ts
['trainer', 'summary']
['trainer', 'students', appliedSearch]
['trainer', 'student', studentId]
```

A busca aplicada faz parte da chave. Trocar a busca cria um resultado independente e permite voltar à consulta anterior enquanto ela ainda estiver em cache.

O logout já limpa o `QueryClient`. Nenhuma persistência adicional será criada.

## Foundation visual

A implementação seguirá `PRODUCT.md`, `DESIGN.md` e `apps/mobile/src/lib/styles.ts`.

Regras específicas:

- `Screen` continua sendo o shell de safe area e inset da tab bar.
- `ScreenHeader` define a hierarquia principal.
- `Card` agrupa métricas e dados do aluno.
- `StatePanel` representa loading, vazio e erro.
- `InlineMessage` representa falha de atualização/paginação quando conteúdo útil continua visível.
- `AppButton` representa ações explícitas.
- `Field` será reutilizado para busca.
- cores, tipografia, raios e spacing vêm exclusivamente dos tokens existentes;
- não adicionar sombras decorativas;
- texto visível em pt-BR UTF-8 literal;
- estados sempre possuem texto e não dependem apenas de cor;
- controles mantêm área tocável mínima já consolidada.

## Acessibilidade

- o aluno da lista será um `Pressable` com `accessibilityRole="button"` e label contendo o nome;
- o status terá texto visível além de cor;
- o campo de busca terá label `Buscar aluno`;
- botões expõem estado disabled durante operações concorrentes;
- loading continua usando `ActivityIndicator` rotulado via `StatePanel`;
- nomes, objetivos e restrições não terão altura fixa;
- cards permitem quebra de texto em telas pequenas;
- deep link de detalhe possui retorno determinístico para a lista.

## Arquivos envolvidos

### Criar

- `apps/mobile/src/application/trainer/trainer-data.ts`
- `apps/mobile/src/application/trainer/trainer-data.test.ts`
- `apps/mobile/src/components/trainer/trainer-metric-card.tsx`
- `apps/mobile/src/components/trainer/student-status-badge.tsx`
- `apps/mobile/src/components/trainer/student-list-item.tsx`
- `apps/mobile/src/screens/trainer-home.tsx`
- `apps/mobile/src/screens/trainer-home.test.tsx`
- `apps/mobile/src/screens/trainer-students.tsx`
- `apps/mobile/src/screens/trainer-students.test.tsx`
- `apps/mobile/src/screens/trainer-student-detail.tsx`
- `apps/mobile/src/screens/trainer-student-detail.test.tsx`
- `apps/mobile/app/(trainer)/trainer/students/_layout.tsx`
- `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx`

### Mover/alterar

- `apps/mobile/app/(trainer)/trainer/students.tsx` → `apps/mobile/app/(trainer)/trainer/students/index.tsx`
- `apps/mobile/app/(trainer)/trainer/index.tsx`
- `apps/mobile/src/__tests__/trainer-screens.test.tsx`
- `apps/mobile/vitest.ui-coverage.config.ts` — incluir as três novas screens na cobertura visual crítica sem reduzir o threshold de 85%.

### Remover após substituição dos placeholders

- `apps/mobile/src/screens/trainer-section.tsx`
- `apps/mobile/src/screens/trainer-section.test.tsx`

### Não alterar

- API;
- `packages/db`;
- `packages/validators`;
- autenticação;
- `app/_layout.tsx`;
- `(student)`;
- `ProfileScreen`;
- `AppTabsLayout`;
- tokens de `styles.ts`; a MUV-17 reutiliza a foundation existente sem alterar seus tokens.

## Estratégia de testes

### Camada de aplicação

Testar:

- `/trainer/summary`;
- query de alunos sem `q`;
- normalização e encoding de `q`;
- `limit`/`offset`;
- `/students/:id`;
- encaminhamento do `AbortSignal`;
- ausência de `trainerId` no request.

### Home

Testar:

- loading;
- erro inicial + retry;
- zero alunos;
- métricas com dados;
- ação **Ver alunos**;
- atualização;
- falha de refetch preservando dados e mostrando feedback inline.

### Lista

Testar:

- loading;
- erro + retry;
- carteira vazia;
- busca sem resultado;
- busca aplicada somente ao submeter;
- limpar busca;
- renderização de status;
- contato com fallbacks;
- abertura do detalhe;
- paginação;
- erro ao carregar mais sem perder páginas existentes;
- atualização mantendo o filtro atual.

### Detalhe

Testar:

- loading;
- `404` com retorno para lista;
- erro recuperável;
- dados completos;
- fallbacks para campos nulos;
- status semântico;
- atualização;
- ausência de ações de edição/exclusão;
- ausência de chamadas de avaliações/treinos.

### Regressão

Reexecutar:

- guards e root layout da MUV-16;
- tab bar do treinador com apenas Início, Alunos e Perfil;
- perfil do treinador;
- fluxo do aluno;
- suíte mobile completa;
- `test:coverage:ui` incluindo explicitamente home, lista e detalhe do treinador.

## Validação

Comandos finais esperados:

```powershell
pnpm.cmd --dir apps/mobile test
pnpm.cmd --dir apps/mobile test:coverage:core
pnpm.cmd --dir apps/mobile test:coverage:ui
pnpm.cmd --dir apps/mobile typecheck
pnpm.cmd exec biome check apps/mobile
pnpm.cmd --dir apps/mobile doctor
git diff --check
```

Validação manual quando houver emulador/dispositivo:

1. autenticar como treinador;
2. abrir Início;
3. atualizar a home;
4. abrir Alunos;
5. buscar aluno existente;
6. limpar busca;
7. carregar página adicional quando aplicável;
8. abrir detalhe;
9. atualizar detalhe;
10. testar um deep link de aluno fora do escopo ou ID inexistente e confirmar que nenhum dado é exposto;
11. autenticar como aluno e confirmar que a experiência existente continua isolada.

## Riscos e mitigação

### Risco: divergência local do tipo `/trainer/summary`

O schema não é compartilhado.

**Mitigação:** declarar o tipo uma única vez em `trainer-data.ts`, cobrir a chamada por teste e não espalhar o shape pelas screens. Se o contrato evoluir em uma issue futura, considerar promovê-lo a `@muvit/validators`.

### Risco: lista extensa dentro de `ScrollView`

O `Screen` atual é otimizado para `ScrollView`, não `FlatList`.

**Mitigação:** paginação explícita de 25 itens evita buscar toda a carteira de uma vez e adia o custo de renderização até o usuário solicitar mais resultados. Como `Screen` usa `ScrollView`, os itens já carregados continuam cumulativos; se perfis reais tiverem centenas de alunos e houver evidência de degradação, uma lista virtualizada deve ser tratada como melhoria focada.

### Risco: wording de “acessos” no card MUV-17

A MUV-17 menciona acessos a avaliações/treinos, mas a MUV-18 explicitamente assume a integração de avaliações a partir do detalhe e a MUV-19 assume o fluxo de treino.

**Mitigação:** a implementação desta spec encerra no hub de detalhe e não cria destinos mortos. MUV-18/MUV-19 adicionam suas entradas ao detalhe existente.

### Risco: `apps/mobile/AGENTS.md` mantém texto histórico anterior à conclusão da MUV-16

O arquivo lido em `develop` ainda contém uma observação dizendo que o fluxo autenticável implementado é exclusivo de `student` “enquanto” MUV-16 a MUV-19 não forem implementados, embora a MUV-16 já tenha habilitado `trainer`.

**Mitigação:** interpretar a regra estrutural mais recente pelo código e pela spec/PR da MUV-16. A MUV-17 não deve alterar `AGENTS.md` apenas para corrigir documentação histórica, porque o pedido atual restringe a mudança aos documentos de spec/plano. Registrar a inconsistência para correção posterior.

## Dependências

- MUV-16 concluída: obrigatória e satisfeita.
- MUV-20 concluída: obrigatória e satisfeita.
- API atual de students e trainer summary: existente.
- Better Auth/role guards: existentes.
- MUV-18 e MUV-19: dependem desta entrega, mas não bloqueiam a implementação da MUV-17.

## Dúvidas abertas não bloqueantes

1. **Filtro por status:** o endpoint suporta, mas esta spec não o inclui por YAGNI. Se uso real mostrar carteira grande com necessidade de segmentação, pode ser acrescentado em card próprio ou refinamento posterior.
2. **Imagem de avatar:** `avatarUrl` existe, mas esta spec usa iniciais para evitar um segundo conjunto de estados de rede. A foundation pode incorporar imagem depois sem alterar a navegação ou os contratos.
3. **Integração visual com MUV-18/MUV-19:** as novas entradas devem ser adicionadas ao detalhe sem mover a identificação, contato, objetivos e restrições já implementados.

Nenhuma dessas dúvidas impede a execução do plano atual.

## Critérios de aceite derivados

- Trainer autenticado continua entrando em `/trainer`.
- Home exibe dados reais de `/trainer/summary`.
- Trainer abre a carteira de alunos vinculados.
- Busca por nome utiliza o escopo do backend, sem enviar `trainerId`.
- A lista não trunca silenciosamente resultados além da primeira página.
- Trainer abre `/trainer/students/:studentId`.
- O detalhe mostra somente dados autorizados por `GET /students/:id`.
- Aluno inexistente ou fora do escopo não expõe dados.
- Loading, vazio, erro, retry, paginação e atualização possuem tratamento explícito.
- Nenhum fluxo de aluno sofre alteração funcional.
- Nenhuma rota, regra ou contrato de MUV-18/MUV-19 é antecipado.
- Foundation visual, acessibilidade, testes e verificações estáticas permanecem atendidos.
