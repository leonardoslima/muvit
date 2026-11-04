# <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> — Gestão de treinos e exercícios do professor no mobile

## Contexto

A <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue> habilitou o shell autenticado de `trainer` no Expo, com navegação própria e isolamento de role. A <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue> transformou a home e a carteira de alunos em superfícies funcionais e criou o detalhe contextual do aluno. A <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue> adicionou ao mesmo detalhe o fluxo de avaliações, consolidando o padrão de rotas aninhadas sob `/trainer/students/:studentId`, queries prefixadas por `trainer`, tratamento de `404` sem vazamento cross-tenant e componentes visuais compartilhados.

A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> completa o conjunto operacional principal do professor no Mobile MVP ao permitir consultar e manter a prescrição essencial de treino de um aluno vinculado. O objetivo não é reproduzir o dashboard web, e sim disponibilizar no mobile as operações cotidianas necessárias para consultar, criar e alterar fichas de treino usando os contratos e regras já existentes.

O backend já possui os contratos necessários:

* `GET /students/:studentId/workout-plans` — lista planos de um aluno acessível à identidade atual.
* `GET /workout-plans/:id` — retorna o plano completo com dias e exercícios.
* `POST /workout-plans` — cria plano após validar acesso ao aluno.
* `PATCH /workout-plans/:id` — altera metadados e, quando `days` é enviado, substitui a estrutura de dias/exercícios em uma transação.
* `GET /exercises` — lista exercícios visíveis à identidade atual, com busca, filtro por grupo muscular, `scope`, paginação e ordenação por nome.
* `createWorkoutPlanSchema`, `updateWorkoutPlanSchema`, `workoutPlanFullSchema`, `workoutPlanSummarySchema`, `exerciseSchema` e `listExercisesQuerySchema` já existem em `@muvit/validators`.

O dashboard web já possui um editor de treino que confirma parte do comportamento de produto esperado: nome do treino, notas, dias, seleção de exercícios, séries, repetições, carga, descanso, reordenação de exercícios e salvamento como ativo ou rascunho. A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> reutiliza essas decisões funcionais como referência, sem portar a UI web para React Native.

## Fontes de verdade consideradas

* `AGENTS.md`.
* `apps/mobile/AGENTS.md` no estado de `develop`.
* `apps/api/AGENTS.md`.
* Linear <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>, incluindo contexto, escopo, critérios de aceite e relações.
* <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue>, <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue>, <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue> e <issue id="dd7c0698-d086-4c28-b67b-bf2e593e765c" href="https://linear.app/muvit/issue/MUV-20/consolidar-foundation-visual-mobile-com-impeccable">MUV-20</issue> já concluídas.
* `PRODUCT.md` e `DESIGN.md`.
* `docs/superpowers/specs/2026-08-31-muv-17-trainer-home-students-design.md`.
* `docs/superpowers/specs/2026-09-03-muv-18-trainer-student-assessments-design.md`.
* `apps/mobile/src/screens/trainer-student-detail.tsx`.
* `apps/mobile/src/application/workouts/today-workout.ts` e fluxo atual do aluno, apenas como referência de contratos já consumidos no mobile.
* `apps/api/src/routes/workouts.ts`.
* `apps/api/src/modules/workouts/use-cases/create-workout-plan.ts`.
* `apps/api/src/modules/workouts/use-cases/update-workout-plan.ts`.
* `apps/api/src/modules/workouts/use-cases/assert-workout-plan-access.ts`.
* `apps/api/src/modules/workouts/repositories/drizzle-workout-plans-repository.ts`.
* `apps/api/src/routes/exercises.ts`.
* `apps/api/src/modules/exercises/use-cases/list-exercises.ts`.
* `apps/api/src/modules/exercises/repositories/drizzle-exercises-repository.ts`.
* `packages/validators/src/workouts.ts`.
* `packages/validators/src/exercises.ts`.
* `apps/web/src/app/(app)/workouts/new/_editor.tsx`.
* `apps/web/src/application/workouts/workout-editor-model.ts`.

## Objetivo

Permitir que o treinador, a partir de um aluno ao qual possui acesso:

1. consulte todos os planos de treino desse aluno;
2. abra um plano e visualize sua estrutura completa de dias e exercícios;
3. crie uma nova prescrição essencial;
4. altere uma prescrição existente que esteja ativa ou em rascunho;
5. selecione exercícios disponíveis no catálogo visível para sua conta;
6. trate loading, vazio, erro, validação e sucesso sem perder contexto útil;
7. preserve autorização, contratos REST, regras de domínio e a foundation visual compartilhada do mobile.

## Decisões de escopo

### 1. A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> será mobile-only sobre os contratos atuais

Não serão alterados por padrão:

* `apps/api`;
* `packages/db`;
* `packages/validators`;
* autenticação;
* regras de autorização;
* contratos REST.

Os endpoints existentes já cobrem consulta, criação, edição e catálogo de exercícios. Qualquer necessidade de mudar backend descoberta durante a implementação deve ser tratada como desvio de escopo e não como parte implícita da <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>.

### 2. O fluxo de treinos nasce no detalhe do aluno

`TrainerStudentDetailScreen` ganhará uma seção **Treinos** após as informações essenciais e em paralelo conceitual à seção **Avaliações** da <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>.

A seção terá duas ações:

* **Ver treinos** → `/trainer/students/:studentId/workouts`;
* **Novo treino** → `/trainer/students/:studentId/workouts/new`.

O detalhe do aluno não fará query de planos apenas para montar preview, contagem ou “último treino”. Isso evita request adicional e mantém a responsabilidade da <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue>/<issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue> intacta.

### 3. A lista de treinos exibirá todos os planos retornados pela API

`GET /students/:studentId/workout-plans` não possui paginação e já retorna os planos ordenados por criação mais recente.

A lista mostrará:

* nome;
* status textual (`Ativo`, `Rascunho`, `Arquivado`);
* período quando `startDate` ou `endDate` existir;
* data de criação como contexto secundário em todos os itens.

Não haverá filtro por status nesta entrega. A quantidade esperada de planos por aluno não justifica um mecanismo adicional sem evidência de necessidade.

### 4. Planos arquivados serão consulta apenas

Planos com status `archived` permanecem visíveis e podem ser abertos para consulta, mas o mobile não exibirá **Editar treino** para eles.

A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não introduzirá operação de arquivar, desarquivar ou reativar plano. Isso evita criar semântica de ciclo de vida que o card não exige e mantém `archived` como estado de leitura.

Planos `active` e `draft` podem ser editados.

### 5. Haverá um editor mobile próprio, não um porte da UI web

A lógica de formulário será implementada na camada de aplicação mobile e a tela usará primitives e tokens existentes do Expo.

O editor terá dois modos:

* `create` — cria um novo plano para o `studentId` da rota;
* `edit` — carrega um plano existente, confirma que `plan.studentId === studentId` da rota e permite alterar a estrutura quando o status não é `archived`.

A UI web é referência funcional, não código a ser compartilhado entre apps. Não será criado um pacote compartilhado apenas para reutilizar o editor.

### 6. Campos editáveis da prescrição essencial

O editor mobile expõe:

#### Plano

* nome — obrigatório;
* notas — opcional;
* status editável entre `active` e `draft`.

#### Dias

* mínimo de 1 dia;
* máximo de 7 dias;
* label obrigatório;
* ordem derivada da posição atual.

Novos dias usam por padrão:

* `Treino A`;
* `Treino B`;
* `Treino C`;
* `Treino D`;
* `Treino E`;
* `Treino F`;
* `Treino G`.

Cada dia precisa possuir pelo menos um exercício antes de salvar, seguindo o comportamento já adotado pelo editor web.

#### Exercícios prescritos

* exercício selecionado pelo catálogo;
* séries — inteiro entre 1 e 20;
* repetições — texto obrigatório de até 20 caracteres, permitindo formatos como `10` ou `8-12`;
* carga em kg — opcional, entre 0 e 1000;
* descanso em segundos — opcional, inteiro entre 0 e 600;
* observação — opcional, até 500 caracteres;
* ordem derivada da posição no dia.

Ao editar um plano existente, o estado interno também preserva `tempo` quando ele já estiver presente no exercício, mas sem expô-lo como campo visual.

`tempo` existe no contrato, mas não será exposto nesta entrega. `startDate` e `endDate` também não serão editáveis no mobile nesta etapa. Em uma edição, omiti-los do `PATCH` preserva os valores existentes no backend.

Não será criada validação local de unicidade de exercício no mesmo dia porque o contrato atual e o editor web não impõem essa regra.

### 7. Rascunho e ativo são estados explícitos, sem regra nova de exclusividade

O usuário pode salvar uma ficha como:

* `draft`;
* `active`.

O mobile não criará regra do tipo “somente um plano ativo por aluno”, não arquivará automaticamente outro plano e não inferirá transições. A API permanece fonte de verdade para regras existentes.

### 8. O catálogo de exercícios será somente leitura/seleção

Decisão aprovada para a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>:

* o professor pode consultar e selecionar exercícios disponíveis;
* não pode criar, editar ou excluir exercícios pelo mobile nesta entrega.

O catálogo usa:

```text
GET /exercises?scope=all&q=<opcional>&muscleGroup=<opcional>&limit=50&offset=<offset>
```

Para uma identidade `trainer`, `scope=all` retorna somente:

* exercícios globais (`trainerId === null`);
* exercícios próprios do treinador (`trainerId === identity.profileId`).

O cliente nunca envia `trainerId`.

A busca por nome será aplicada explicitamente ao submeter **Buscar**, seguindo o padrão já adotado na carteira de alunos. O filtro por grupo muscular é opcional e usa os valores de `muscleGroupSchema` com labels em pt-BR.

O catálogo terá paginação incremental com `limit = 50` e ação **Carregar mais**.

### 9. O editor manterá todo o rascunho em memória

A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não adicionará persistência offline, AsyncStorage, journal ou fila de sincronização ao editor do treinador.

O fluxo de treino offline do aluno não será reutilizado para prescrição administrativa. Enquanto o usuário permanece na tela, erros de validação ou API preservam o conteúdo preenchido para nova tentativa.

Persistência de rascunho de formulário entre fechamentos do app fica fora do escopo.

### 10. Exclusão de plano e CRUD de exercícios ficam fora

Mesmo existindo contratos de `DELETE /workout-plans/:id`, `POST /exercises`, `PATCH /exercises/:id` e `DELETE /exercises/:id`, a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não expõe essas operações.

Também ficam fora:

* histórico de execuções do aluno;
* edição de logs;
* criação de exercício personalizado;
* edição/exclusão de exercício;
* arquivamento/desarquivamento de plano;
* duplicação de plano;
* templates de treino;
* prescrição em lote para vários alunos;
* regras novas de progressão, periodização ou autorização;
* paridade administrativa com o dashboard.

## Abordagens consideradas

### Abordagem A — Editor mobile próprio sobre os contratos atuais — escolhida

O detalhe do aluno abre lista, detalhe e editor nativos; a seleção de exercícios acontece em um catálogo modal somente leitura.

**Vantagens**

* preserva a ergonomia mobile;
* mantém o backend como fonte de verdade;
* permite testes unitários da montagem do payload;
* reutiliza padrões estabelecidos pelas <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue>/<issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>;
* não cria dependência transversal entre web e mobile;
* mantém o catálogo desacoplado da edição de exercícios.

**Desvantagem**

* a lógica de estado do editor precisa existir também no mobile, embora baseada nos mesmos validators.

### Abordagem B — Portar o editor web quase literalmente — rejeitada

O editor web poderia ser reproduzido com estrutura visual semelhante.

Foi rejeitado porque o layout de duas colunas, dialogs e controles densos do dashboard não é adequado a telas pequenas e criaria acoplamento de experiência entre plataformas.

### Abordagem C — Wizard em múltiplas rotas — rejeitada

Nome, dias, catálogo, parâmetros e confirmação poderiam ser separados em várias telas.

Foi rejeitado porque aumentaria o estado entre rotas, exigiria persistência de rascunho ou store dedicada e criaria mais complexidade de navegação do que o MVP necessita.

## Arquitetura

### Camada de aplicação — dados de treino do treinador

Criar `apps/mobile/src/application/workouts/trainer-workout-data.ts`.

Responsabilidades:

* derivar tipos de `workoutPlanSummarySchema` e `workoutPlanFullSchema`;
* listar planos por `studentId`;
* carregar plano por `planId`;
* criar plano;
* atualizar plano;
* encaminhar `AbortSignal` nas operações de leitura;
* não conhecer router, React Native ou sessão.

Interfaces previstas:

```ts
export type TrainerWorko
```utPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
export type TrainerWorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
export type CreateTrainerWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateTrainerWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;

export function listTrainerWorkoutPlans(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ items: TrainerWorkoutPlanSummary[] }>;

export function getTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  signal?: AbortSignal,
): Promise<TrainerWorkoutPlan>;

export function createTrainerWorkoutPlan(
  api: ApiRequester,
  input: CreateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan>;

export function updateTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  input: UpdateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan>;
```

IDs entram na URL com `encodeURIComponent`.

### Camada de aplicação — editor

Criar `apps/mobile/src/application/workouts/workout-editor.ts` como módulo puro.

Responsabilidades:

* representar o estado editável sem depender de `TextInput` ou React;
* criar o primeiro dia padrão;
* converter um `TrainerWorkoutPlan` existente em rascunho editável;
* adicionar/remover dias;
* preservar `tempo` de exercícios existentes como dado oculto não editável;
* adicionar/remover/reordenar exercícios;
* atualizar campos de um exercício;
* normalizar texto;
* aceitar vírgula ou ponto para carga;
* converter campos numéricos de texto para número;
* validar limites e campos obrigatórios;
* montar payload de criação;
* montar payload de edição;
* validar o payload final com os schemas compartilhados.

O estado de exercício usa um identificador local separado de `exerciseId`, permitindo que o mesmo exercício seja selecionado mais de uma vez sem quebrar keys ou reordenação.

Estrutura conceitual:

```ts
export type WorkoutEditorExercise = {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: string;
  reps: string;
  restSeconds: string;
  loadKg: string;
  notes: string;
  tempo?: string;
};

export type WorkoutEditorDay = {
  localId: string;
  label: string;
  exercises: WorkoutEditorExercise[];
};

export type WorkoutEditorState = {
  name: string;
  notes: string;
  status: 'active' | 'draft';
  days: WorkoutEditorDay[];
};
```

Planos `archived` não são convertidos para modo editável pela screen.

### Camada de aplicação — catálogo de exercícios

Criar `apps/mobile/src/application/exercises/exercise-catalog.ts`.

Responsabilidades:

* derivar `Exercise` de `exerciseSchema`;
* montar query string com `scope=all`, `q`, `muscleGroup`, `limit` e `offset`;
* normalizar busca;
* listar páginas do catálogo;
* encaminhar `AbortSignal`;
* nunca enviar `trainerId`.

Interface prevista:

```ts
export const EXERCISE_CATALOG_PAGE_SIZE = 50;

export type Exercise = z.infer<typeof exerciseSchema>;

export type ExerciseCatalogPage = {
  items: Exercise[];
  total: number;
};

export function listExerciseCatalog(
  api: ApiRequester,
  input: {
    q?: string;
    muscleGroup?: Exercise['muscleGroup'];
    limit: number;
    offset: number;
    signal?: AbortSignal;
  },
): Promise<ExerciseCatalogPage>;
```

### Apresentação de grupos musculares

Criar um mapa mobile único em `apps/mobile/src/lib/muscle-groups.ts` para traduzir os valores de `muscleGroupSchema` para pt-BR.

Ele serve catálogo e exibição de detalhes sem alterar validators ou transportar labels de UI para o domínio compartilhado.

### Screens

Criar:

* `src/screens/trainer-workouts.tsx` — lista dos planos do aluno;
* `src/screens/trainer-workout-detail.tsx` — consulta de um plano;
* `src/screens/trainer-workout-editor.tsx` — editor compartilhado entre criação e edição por propriedade de modo.

Cada screen:

* lê params via Expo Router;
* obtém API por `useApiClient()`;
* usa TanStack Query/Mutation;
* mantém navegação e feedback na borda;
* delega transformação de dados para `src/application`;
* não replica autorização da API.

### Componentes

Criar componentes de domínio apenas quando possuírem responsabilidade visual clara:

* `components/workouts/workout-plan-list-item.tsx` — item acessível da listagem;
* `components/workouts/workout-status-badge.tsx` — status semântico em lista/detalhe;
* `components/workouts/workout-day-card.tsx` — leitura de um dia e seus exercícios no detalhe;
* `components/workouts/exercise-catalog-modal.tsx` — seleção somente leitura usando `Modal` nativo e tokens existentes;
* `components/workouts/workout-editor-day.tsx` — edição do dia ativo quando a extração for necessária para manter a screen fina.

O catálogo modal segue o padrão nativo já existente no app para `Modal`, usa `colors.scrim`, `colors.surface` e `radii.sheet`, renderiza o título com `typography.title` e usa `AppButton`/`Field` para ações e busca, sem valores visuais ad hoc.

## Rotas e navegação

O namespace do treinador continua isolado em `/trainer`.

Adicionar sob o aluno:

```text
app/(trainer)/trainer/students/[studentId]/workouts/
  index.tsx
  new.tsx
  [planId]/
    index.tsx
    edit.tsx
```

Rotas resultantes:

```text
/trainer/students/:studentId/workouts
/trainer/students/:studentId/workouts/new
/trainer/students/:studentId/workouts/:planId
/trainer/students/:studentId/workouts/:planId/edit
```

O `Stack` já existente em `trainer/students/_layout.tsx` continua sendo o container de navegação; não será criada uma nova tab.

Cada superfície possui retorno determinístico:

* lista → **Voltar para aluno**;
* detalhe → **Voltar para treinos**;
* criação → **Voltar para treinos**;
* edição → **Voltar para treino**.

Deep links não dependem exclusivamente de `router.back()`.

## Contratos de API envolvidos

### `GET /students/:studentId/workout-plans`

Uso:

```text
GET /students/<studentId>/workout-plans
```

Autorização:

* `requireAuth`;
* `ListWorkoutPlansUseCase` chama a política de acesso ao aluno;
* treinador só acessa aluno cujo `trainerId === identity.profileId`;
* mismatch retorna `404`.

Resposta:

```ts
{
  items: TrainerWorkoutPlanSummary[];
}
```

O cliente não envia `trainerId`.

A listagem valida acesso ao aluno, enquanto o detalhe do plano também valida ownership do próprio plano. Em dados históricos inconsistentes, um item pode aparecer na lista e retornar `404` ao abrir; o mobile deve tratar esse `404` normalmente e não filtrar por `trainerId` no cliente.

### `GET /workout-plans/:id`

Retorna `workoutPlanFullSchema` com:

* metadados do plano;
* dias ordenados por `dayOrder`;
* exercícios ordenados por `exerciseOrder`;
* nome e grupo muscular do exercício relacionado.

`assertWorkoutPlanAccess` valida o acesso à ficha e ao aluno.

Além da autorização do backend, a screen compara `plan.studentId` com o `studentId` da rota. Se divergir, não renderiza o plano dentro do aluno incorreto e oferece retorno para a lista de treinos daquele `studentId`.

### `POST /workout-plans`

Body:

```ts
{
  studentId: string;
  name: string;
  status: 'active' | 'draft';
  notes?: string;
  days: Array<{
    label: string;
    dayOrder: number;
    exercises: Array<{
      exerciseId: string;
      exerciseOrder: number;
      sets: number;
      reps: string;
      restSeconds?: number;
      loadKg?: number;
      notes?: string;
    }>;
  }>;
}
```

Na criação, a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> omite `startDate`, `endDate` e `tempo`.

`CreateWorkoutPlanUseCase` valida acesso ao `studentId` e define `trainerId = identity.profileId` para o treinador. O cliente nunca envia ownership do treinador.

### `PATCH /workout-plans/:id`

A edição envia os campos editáveis completos:

```ts
{
  name: string;
  status: 'active' | 'draft';
  notes?: string;
  days: [
    {
      label: string;
      dayOrder: number;
      exercises: Array<{
        exerciseId: string;
        exerciseOrder: number;
        sets: number;
        reps: string;
        restSeconds?: number;
        loadKg?: number;
        tempo?: string;
        notes?: string;
      }>;
    },
  ];
}
```

Em edição, `tempo` só é enviado quando já existia no exercício carregado; ele não é editável e não é criado para exercícios novos.

`studentId` não é enviado no `PATCH`.

Quando `days` é enviado, o repositório atual remove os dias existentes e recria a estrutura dentro de uma única transação. Portanto, o editor sempre monta a árvore completa de dias/exercícios no salvamento.

`startDate` e `endDate` são omitidos para preservar valores existentes que não são editáveis no mobile.

### `GET /exercises`

Query da <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>:

```text
scope=all
q=<nome opcional>
muscleGroup=<grupo opcional>
limit=50
offset=<offset>
```

Para treinador, `scope=all` retorna global + próprios. O backend executa a filtragem de ownership; o mobile não replica essa lógica.

## Fluxos da interface

### Fluxo 1 — Entrada pelo detalhe do aluno

1. Treinador abre `/trainer/students/:studentId`.
2. O detalhe continua buscando somente `GET /students/:id`.
3. Uma seção **Treinos** apresenta texto curto de contexto.
4. **Ver treinos** abre a listagem.
5. **Novo treino** abre o editor em modo criação.
6. Nenhuma query de treino é executada no detalhe apenas para preencher a seção.

### Fluxo 2 — Lista de treinos

 1. A screen valida `studentId`.
 2. Consulta `GET /students/:studentId/workout-plans`.
 3. Loading inicial usa `StatePanel`.
 4. `404` usa mensagem genérica de indisponibilidade, sem diferenciar inexistência de falta de acesso.
 5. Outros erros oferecem **Tentar novamente**.
 6. Lista vazia mostra **Nenhum treino cadastrado** e ação **Novo treino**.
 7. Com dados, cada item mostra nome, status e contexto temporal disponível.
 8. Tocar abre `/trainer/students/:studentId/workouts/:planId`.
 9. **Novo treino** permanece disponível.
10. **Atualizar** refaz a lista.
11. Falha de atualização preserva os itens existentes e usa `InlineMessage`.

### Fluxo 3 — Detalhe do treino

 1. A screen valida `studentId` e `planId`.
 2. Consulta `GET /workout-plans/:planId`.
 3. Loading inicial usa `StatePanel`.
 4. `404` mostra **Treino não encontrado** sem revelar existência fora do escopo.
 5. Se `plan.studentId !== studentId`, o conteúdo não é exibido naquele contexto e a ação segura volta à lista de treinos do aluno da rota.
 6. Dados válidos exibem:
    * nome;
    * status;
    * período, quando existente;
    * notas, quando existentes;
    * dias em ordem;
    * exercícios em ordem;
    * séries;
    * repetições;
    * carga quando existente;
    * descanso quando existente;
    * observação quando existente.
 7. `active` e `draft` exibem **Editar treino**.
 8. `archived` não exibe ação de edição.
 9. **Atualizar** refaz o detalhe.
10. Não existem ações de excluir, arquivar ou duplicar.

### Fluxo 4 — Novo treino

 1. A screen valida `studentId`.
 2. Inicializa o editor com:
    * nome vazio;
    * notas vazias;
    * status `draft`;
    * um dia `Treino A`;
    * nenhum exercício.
 3. O treinador adiciona exercícios usando o catálogo.
 4. Cada exercício novo inicia com:
    * séries `3`;
    * repetições `10`;
    * carga vazia;
    * descanso vazio;
    * observação vazia.
 5. O treinador pode adicionar até 7 dias.
 6. O treinador pode remover dias enquanto permanecer pelo menos um; se o dia contiver exercícios, `TrainerWorkoutEditorScreen` usa `Alert.alert` com **Cancelar** e **Remover dia** antes de descartar aquele conteúdo local. Dia vazio pode ser removido diretamente.
 7. Exercícios podem ser removidos e reordenados no dia.
 8. **Salvar treino** valida o rascunho e executa `POST /workout-plans`.
 9. Erro de validação não chama a API e mantém o conteúdo.
10. Erro da API mantém o conteúdo e oferece nova tentativa.
11. Sucesso:
    * invalida a lista de treinos do aluno;
    * invalida `['trainer', 'summary']`;
    * grava o plano retornado em `['trainer', 'workout', created.id]` com `queryClient.setQueryData`;
    * mostra `InlineMessage` **Treino salvo com sucesso.**;
    * oferece **Ver treino** usando o `id` retornado.
12. Nova alteração no formulário remove o feedback de sucesso anterior.

### Fluxo 5 — Editar treino

 1. A rota valida `studentId` e `planId`.
 2. Carrega o plano completo.
 3. Aplica as mesmas regras de `404` e mismatch do detalhe.
 4. Se `status === 'archived'`, não monta editor e orienta voltar ao detalhe.
 5. Converte o plano para `WorkoutEditorState`.
 6. O treinador altera nome, notas, status, dias e exercícios.
 7. `startDate`, `endDate` e `tempo` não entram no formulário.
 8. **Salvar alterações** monta a árvore completa e executa `PATCH /workout-plans/:planId`.
 9. Erro de validação não chama a API.
10. Erro de API preserva o formulário.
11. Sucesso:
    * invalida `['trainer', 'workouts', studentId]`;
    * grava o plano retornado em `['trainer', 'workout', planId]` com `queryClient.setQueryData`;
    * invalida `['trainer', 'summary']`;
    * mostra `InlineMessage` **Treino atualizado com sucesso.**;
    * oferece **Voltar para treino**.
12. Nova alteração remove o feedback de sucesso anterior.

### Fluxo 6 — Catálogo de exercícios

 1. **Adicionar exercício** abre `ExerciseCatalogModal` para o dia ativo.
 2. A primeira consulta usa `scope=all&limit=50&offset=0`.
 3. Loading inicial mostra estado de carregamento dentro do modal.
 4. Erro inicial oferece **Tentar novamente** sem fechar o editor.
 5. O campo **Buscar exercício** mantém texto digitado separado da busca aplicada.
 6. **Buscar** normaliza e aplica `q`.
 7. **Limpar busca** remove `q`.
 8. O filtro de grupo muscular altera a chave da query e reinicia a paginação.
 9. Cada item mostra nome, grupo muscular em pt-BR e equipamento quando disponível.
10. Selecionar item adiciona o exercício ao dia ativo e fecha o modal.
11. Quando `items.length < total`, **Carregar mais** busca o próximo offset.
12. Erro de paginação preserva itens carregados e oferece retry inline.
13. Nenhuma ação de criar, editar ou excluir exercício aparece no modal.

## Estados por superfície

| Superfície | Loading | Vazio | Erro | Atualização / submit |
| -- | -- | -- | -- | -- |
| Entrada no detalhe | não adiciona query | não se aplica | mantém comportamento existente | não se aplica |
| Lista de treinos | `Carregando treinos` | `Nenhum treino cadastrado` | `404` genérico ou retry | mantém lista; `Atualizando...` |
| Detalhe do treino | `Carregando treino` | não se aplica | `404`, mismatch seguro ou retry | mantém conteúdo; `Atualizando...` |
| Editor create | não há fetch inicial de plano | formulário inicial | validação/API sem perder rascunho | `Salvando...` + sucesso explícito |
| Editor edit | `Carregando treino` | não se aplica | `404`, mismatch, arquivado ou retry | `Salvando alterações...` + sucesso explícito |
| Catálogo | `Carregando exercícios` | `Nenhum exercício encontrado` | retry | mantém itens durante refetch |
| Paginação catálogo | mantém itens | não se aplica | retry inline | `Carregando mais...` |

## Cache e chaves de query

Usar namespace do treinador:

```ts
['trainer', 'workouts', studentId]
['trainer', 'workout', planId]
['trainer', 'exercise-catalog', appliedSearch, muscleGroup]
['trainer', 'summary']
```

O catálogo não compartilha chave com qualquer consulta futura do aluno.

Após criação:

```ts
queryClient.invalidateQueries({ queryKey: ['trainer', 'workouts', studentId] });
queryClient.invalidateQueries({ queryKey: ['trainer', 'summary'] });
```

Após edição:

```ts
queryClient.setQueryData(['trainer', 'workout', planId], updatedPlan);
queryClient.invalidateQueries({ queryKey: ['trainer', 'workouts', studentId] });
queryClient.invalidateQueries({ queryKey: ['trainer', 'summary'] });
```

Após criação, o plano retornado também é gravado em `['trainer', 'workout', createdPlan.id]` antes de oferecer **Ver treino**.

Invalidar o summary em toda criação/edição é intencional: o agregado `activePlans` pode mudar quando um plano é salvo como ativo ou rascunho.

## Formulário e validação

### Texto

* nome e labels de dias usam `trim()`;
* nome vazio é inválido;
* label de dia vazia é inválida;
* `reps` usa `trim()` e não pode ficar vazia;
* na criação, notas vazias do plano viram `undefined`;
* na edição, limpar completamente as notas do plano envia `notes: ''`, porque omitir `notes` no `PATCH` preservaria o valor anterior no contrato atual;
* o detalhe trata `notes.trim() === ''` como ausência de observação;
* observações de exercício vazias viram `undefined`.

### Séries

Entrada textual convertida para inteiro.

Faixa:

```text
1..20
```

Conteúdo vazio, decimal ou não numérico produz erro de validação.

### Descanso

Entrada textual opcional convertida para inteiro.

```text
"" -> undefined
"60" -> 60
```

Faixa:

```text
0..600
```

### Carga

Aceita vírgula ou ponto:

```text
"82,5" -> 82.5
"82.5" -> 82.5
"" -> undefined
```

Faixa:

```text
0..1000
```

Conteúdo digitado que não seja número válido nunca vira `undefined` silenciosamente.

### Dias e exercícios

* mínimo de 1 dia;
* máximo de 7 dias;
* cada dia precisa de pelo menos 1 exercício no salvamento;
* `dayOrder` é recalculado de `0` a `n - 1`;
* `exerciseOrder` é recalculado de `0` a `n - 1` dentro de cada dia.

O editor não confia em ordens antigas após remoções ou reordenação.

### Schema final

Criação é validada com `createWorkoutPlanSchema`.

Edição é validada com `updateWorkoutPlanSchema`, usando um payload completo para os campos que o mobile permite editar.

Erros do schema são transformados em feedback compreensível na tela; o usuário não recebe paths internos de Zod.

## Foundation visual

Seguir `PRODUCT.md`, `DESIGN.md` e `apps/mobile/src/lib/styles.ts`.

Regras:

* `Screen` continua responsável por safe area e inset da tab bar;
* `ScreenHeader` mantém hierarquia principal;
* `Card` agrupa plano, dia e blocos de exercício;
* `StatePanel` representa loading, vazio e erro inicial;
* `InlineMessage` representa erro recuperável e sucesso quando conteúdo útil continua visível;
* `Field` é reutilizado para inputs;
* `AppButton` representa ações principais e secundárias;
* status usa texto além de cor;
* tokens de cor, spacing, tipografia, raio e dimensões vêm de `styles.ts`;
* o catálogo modal usa `colors.scrim`, `colors.surface` e `radii.sheet`;
* nenhuma sombra ou cor nova é criada para esta feature sem necessidade comprovada;
* textos visíveis ficam em pt-BR UTF-8 literal;
* telas com formulário usam rolagem e comportamento de teclado compatível com conteúdo variável;
* Pencil pode orientar agrupamento funcional, mas não é especificação pixel a pixel.

### Estrutura do editor no mobile

O editor usa uma única tela rolável.

* metadados do plano aparecem primeiro;
* um seletor compacto identifica o dia ativo;
* somente o conteúdo do dia ativo é editado em detalhes;
* adicionar/remover dia atualiza esse seletor;
* exercícios do dia são cards empilhados;
* ações **Mover para cima**, **Mover para baixo** e **Remover exercício** têm labels acessíveis;
* **Adicionar exercício** abre o catálogo modal;
* salvamento permanece visível ao final do fluxo, sem layout de duas colunas.

## Acessibilidade

* itens de plano usam `accessibilityRole="button"` e label com nome e status;
* status possui cópia textual;
* dias ativos não dependem apenas de cor para seleção;
* inputs expõem label e unidade quando aplicável;
* carga usa teclado decimal quando suportado;
* séries e descanso usam teclado numérico quando suportado;
* botões de reordenação informam o exercício afetado;
* botão de remoção identifica o exercício ou dia;
* catálogo modal possui ação explícita de fechar;
* item de catálogo informa nome e grupo muscular;
* operações concorrentes deixam ações mutáveis desabilitadas;
* mensagens de erro e sucesso são textuais;
* conteúdo permanece rolável em telas pequenas;
* deep links possuem retorno determinístico.

## Arquivos envolvidos

### Criar

* `apps/mobile/src/application/workouts/trainer-workout-data.ts`
* `apps/mobile/src/application/workouts/trainer-workout-data.test.ts`
* `apps/mobile/src/application/workouts/workout-editor.ts`
* `apps/mobile/src/application/workouts/workout-editor.test.ts`
* `apps/mobile/src/application/exercises/exercise-catalog.ts`
* `apps/mobile/src/application/exercises/exercise-catalog.test.ts`
* `apps/mobile/src/lib/muscle-groups.ts`
* `apps/mobile/src/lib/muscle-groups.test.ts`
* `apps/mobile/src/components/workouts/workout-plan-list-item.tsx`
* `apps/mobile/src/components/workouts/workout-plan-list-item.test.tsx`
* `apps/mobile/src/components/workouts/workout-status-badge.tsx`
* `apps/mobile/src/components/workouts/workout-day-card.tsx`
* `apps/mobile/src/components/workouts/exercise-catalog-modal.tsx`
* `apps/mobile/src/components/workouts/exercise-catalog-modal.test.tsx`
* `apps/mobile/src/components/workouts/workout-editor-day.tsx`
* `apps/mobile/src/components/workouts/workout-editor-day.test.tsx`
* `apps/mobile/src/screens/trainer-workouts.tsx`
* `apps/mobile/src/screens/trainer-workouts.test.tsx`
* `apps/mobile/src/screens/trainer-workout-detail.tsx`
* `apps/mobile/src/screens/trainer-workout-detail.test.tsx`
* `apps/mobile/src/screens/trainer-workout-editor.tsx`
* `apps/mobile/src/screens/trainer-workout-editor.test.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/index.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/new.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/index.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/edit.tsx`

### Modificar

* `apps/mobile/src/screens/trainer-student-detail.tsx` — adicionar a entrada de Treinos sem nova query.
* `apps/mobile/src/screens/trainer-student-detail.test.tsx` — cobrir as duas ações e preservar Avaliações.
* `apps/mobile/vitest.ui-coverage.config.ts` — incluir as novas screens críticas sem reduzir thresholds.
* `apps/mobile/AGENTS.md` — remover a restrição textual defasada de que o fluxo autenticável implementado é exclusivo de `student` e registrar o isolamento atual entre shells/rotas/caches de `student` e `trainer`.

### Verificar sem alterar por padrão

* `apps/mobile/src/application/workouts/today-workout.ts` e testes;
* `apps/mobile/src/application/workouts/workout-log.ts` e testes;
* screens de treino do aluno;
* screens e rotas de avaliações da <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>;
* `trainer/students/_layout.tsx`;
* root guards e layouts da <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue>;
* `PRODUCT.md`;
* `DESIGN.md`.

### Não alterar

* `apps/api`;
* `packages/db`;
* `packages/validators`;
* contratos de autenticação;
* regras de ownership;
* endpoints de workout logs;
* CRUD de exercícios;
* fluxo offline de execução do aluno;
* tokens visuais da foundation, salvo se uma necessidade real e explicitamente aprovada for descoberta.

## Estratégia de testes

### Camada de aplicação — dados de treino

Cobrir:

* listagem por `studentId`;
* encoding seguro de `studentId`;
* detalhe por `planId`;
* encoding seguro de `planId`;
* criação com body exato;
* ausência de `trainerId` no POST;
* edição com body exato;
* ausência de `studentId` e `trainerId` no PATCH;
* encaminhamento de `AbortSignal` nas leituras.

### Camada de aplicação — editor

Cobrir:

* estado inicial com `Treino A`;
* criação dos labels A–G;
* limite de 7 dias;
* impossibilidade de remover o último dia;
* `Alert.alert` ao remover dia que contém exercícios, incluindo cancelamento e confirmação;
* adicionar exercício com defaults `3` e `10`;
* IDs locais independentes de `exerciseId`;
* exercício duplicado permitido sem conflito de key;
* remover exercício;
* mover exercício para cima/baixo;
* atualização de campos;
* trim de nome, label, reps e notes;
* limpeza de notas do plano em edição usando `notes: ''`;
* carga com vírgula e ponto;
* carga inválida;
* séries vazias/não inteiras/fora do limite;
* descanso vazio e válido;
* descanso inválido;
* dia sem exercício;
* criação de `dayOrder` e `exerciseOrder` sequenciais;
* payload de criação;
* payload de edição;
* omissão de `startDate`, `endDate` e `tempo` na criação;
* preservação de `tempo` existente na edição sem expô-lo como campo visual;
* conversão de plano existente para estado editável;


* preservação de observações e valores opcionais existentes suportados pelo editor.

### Camada de aplicação — catálogo

Cobrir:

* `scope=all` sempre presente;
* sem `q` quando busca vazia;
* trim e encoding de `q`;
* filtro `muscleGroup`;
* `limit=50` e offset;
* encaminhamento de signal;
* ausência de `trainerId`.

### Lista de treinos

Cobrir:

* param `studentId` ausente;
* loading;
* `404` genérico;
* erro inicial + retry;
* vazio + **Novo treino**;
* renderização dos três statuses;
* período com datas parciais/completas;
* abertura do detalhe;
* abertura de novo treino;
* atualização;
* falha de refetch preservando lista;
* retorno para aluno.

### Detalhe do treino

Cobrir:

* params ausentes;
* loading;
* `404` genérico;
* erro recuperável;
* mismatch `plan.studentId !== studentId`;
* metadados;
* notas ausentes/presentes;
* dias e exercícios ordenados como recebidos;
* carga/descanso opcionais;
* observações opcionais;
* `active` com editar;
* `draft` com editar;
* `archived` sem editar;
* atualização;
* ausência de excluir/arquivar/duplicar.

### Editor

Cobrir criação e edição com:

* params inválidos;
* loading apenas em edição;
* `404` e mismatch em edição;
* bloqueio de archived;
* estado inicial de criação;
* hidratação de plano existente;
* alteração de nome/notas/status;
* adicionar/remover dia;
* selecionar dia ativo;
* adicionar exercício;
* remover/reordenar exercício;
* editar séries/reps/carga/descanso/observação;
* erro de validação sem mutation;
* mutation concorrente bloqueada;
* erro de API preservando conteúdo;
* sucesso de criação;
* sucesso de edição;
* invalidações corretas;
* feedback de sucesso removido após nova alteração;
* navegação para detalhe após criação por ação explícita.

### Catálogo modal

Cobrir:

* abrir/fechar;
* loading;
* erro + retry;
* vazio;
* busca aplicada somente ao submit;
* limpar busca;
* filtro por grupo;
* grupo muscular em pt-BR;
* equipamento opcional;
* seleção;
* paginação;
* erro de paginação preservando itens;
* ausência de CRUD de exercício;
* controles bloqueados durante fetch concorrente.

### Regressão do treinador

Reexecutar:

* home;
* carteira de alunos;
* detalhe do aluno;
* avaliações do aluno;
* tabs Início/Alunos/Perfil;
* guards por role;
* `404` cross-tenant genérico.

### Regressão do aluno

A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não deve alterar:

* `/students/me/workout-plans`;
* `TodayWorkoutScreen`;
* `LogWorkoutScreen`;
* rascunho offline;
* fila/journal de conclusão;
* tabs do aluno;
* avaliações do aluno;
* autenticação.

Os testes atuais dessas áreas precisam continuar passando.

## Validação

Comandos esperados na implementação:

```powershell
pnpm.cmd --dir apps/mobile test
pnpm.cmd --dir apps/mobile test:coverage:core
pnpm.cmd --dir apps/mobile test:coverage:ui
pnpm.cmd --dir apps/mobile typecheck
pnpm.cmd exec biome check apps/mobile
pnpm.cmd --dir apps/mobile doctor
git diff --check
```

Antes de concluir, procurar sequências de escape Unicode indevidas nos arquivos alterados e manter pt-BR em UTF-8 literal.

### Validação no app

Quando houver emulador/dispositivo, usar Maestro como ferramenta padrão de interação/validação conforme `apps/mobile/AGENTS.md`, sem transformar a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> no card de suíte E2E que pertence à <issue id="a4aefb83-c2da-4dd7-a6ab-3b45bbeb067d" href="https://linear.app/muvit/issue/MUV-14/criar-e2e-dos-fluxos-principais-de-aluno-e-professor-no-mobile">MUV-14</issue>.

Cenários mínimos:

 1. autenticar como treinador;
 2. abrir Alunos;
 3. abrir aluno vinculado;
 4. confirmar seção Treinos e que Avaliações continua disponível;
 5. abrir lista de treinos;
 6. abrir plano ativo e conferir dias/exercícios;
 7. abrir plano rascunho;
 8. abrir plano arquivado e confirmar ausência de editar;
 9. criar novo treino em rascunho com um dia e um exercício;
10. buscar exercício global pelo nome;
11. buscar exercício próprio do treinador;
12. filtrar catálogo por grupo muscular;
13. carregar página adicional quando houver mais de 50 exercícios;
14. adicionar segundo dia e exercícios;
15. editar séries, reps, carga com decimal, descanso e observação;
16. reordenar exercícios;
17. tentar salvar com dia vazio e confirmar validação local;
18. salvar com sucesso e abrir o plano retornado;
19. editar plano existente e salvar alteração;
20. confirmar atualização da lista e detalhe;
21. testar `planId` inexistente e confirmar `404` genérico;
22. testar deep link com `studentId` de um aluno e `planId` de outro aluno acessível e confirmar mismatch seguro;
23. autenticar como aluno e confirmar que o fluxo de treino atual continua funcionando;
24. confirmar que aluno não entra no namespace `/trainer`.

Falhas de rede que não puderem ser reproduzidas manualmente permanecem cobertas por testes automatizados e devem ser registradas como não validadas manualmente, em vez de presumidas como aprovadas.

## Riscos e mitigação

### Risco: editor mobile crescer demais

Dias, exercícios e parâmetros geram uma superfície densa.

**Mitigação:** uma única tela com metadados + seletor de dia ativo + cards do dia ativo. Lógica de transformação fica em `src/application`; `WorkoutEditorDay` concentra a edição do dia ativo e `ExerciseCatalogModal` concentra a seleção, mantendo a screen responsável apenas por orquestração e navegação.

### Risco: `PATCH` substitui todos os dias

A API remove e recria dias/exercícios quando `days` está presente.

**Mitigação:** o editor sempre monta a árvore completa e valida antes do submit. Não enviar atualizações parciais de um único dia como se a API fizesse merge.

### Risco: campos não expostos serem apagados na edição

`startDate`, `endDate` e `tempo` existem no contrato, mas não fazem parte do editor aprovado.

**Mitigação:** `PATCH` omite `startDate`/`endDate`, preservando-os. Para `tempo`, a substituição de `days` poderia apagar valores existentes se o payload não os preservar.

Por isso, ao hidratar um plano existente, o estado interno deve manter `tempo` como dado preservado não editável por exercício e reenviá-lo no payload de edição quando já existir. Novos exercícios continuam omitindo `tempo`.

Essa preservação é interna e não cria campo visual novo.

### Risco: deep link combina aluno e plano diferentes

O endpoint de detalhe recebe somente `planId`. Um treinador pode ter acesso legítimo a planos de mais de um aluno e montar uma URL inconsistente manualmente.

**Mitigação:** comparar `plan.studentId` ao `studentId` da rota antes de renderizar ou editar, repetindo o padrão de segurança contextual estabelecido na <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>.

### Risco: catálogo pode crescer

Carregar todos os exercícios de uma vez tornaria o modal pesado.

**Mitigação:** `limit=50`, busca server-side, filtro por grupo e paginação explícita.

### Risco: ownership do catálogo ser replicado no cliente

Filtrar por `trainerId` no app seria frágil e poderia divergir da API.

**Mitigação:** usar `scope=all`; o backend resolve global + próprios pela `RequestIdentity`.

### Risco: regras locais de status divergirem do backend

O mobile poderia tentar impor exclusividade de plano ativo ou transições não existentes.

**Mitigação:** limitar a UI a `active`/`draft`, leitura de `archived` e deixar qualquer regra adicional para a API.

### Risco: regressão no fluxo de treino do aluno

O diretório `src/application/workouts` já contém lógica offline crítica do aluno.

**Mitigação:** novos módulos do treinador têm nomes explícitos, não alteram `today-workout.ts`, `workout-log.ts`, storage ou journal e os testes de regressão continuam obrigatórios.

### Risco: documentação mobile está defasada sobre roles

`apps/mobile/AGENTS.md` ainda descreve o fluxo autenticável implementado como exclusivo de `student` até os cards <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue> a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>.

**Mitigação:** <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>, ao completar esse conjunto, atualiza a regra local para refletir os dois shells implementados e o isolamento entre seus domínios.

## Dependências

* <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue> — concluída; fornece role, guards e shell do treinador.
* <issue id="dd7c0698-d086-4c28-b67b-bf2e593e765c" href="https://linear.app/muvit/issue/MUV-20/consolidar-foundation-visual-mobile-com-impeccable">MUV-20</issue> — concluída; fornece `PRODUCT.md`, `DESIGN.md`, tokens e primitives compartilhados.
* <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue> — concluída; fornece home, carteira e detalhe do aluno.
* <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue> — concluída; fornece o padrão atual de rotas contextuais sob o aluno e tratamento cross-tenant/deep link.
* API de workout plans — existente.
* API de exercises — existente.
* Validators compartilhados — existentes.
* <issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue> — bloqueada pela <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> e responsável pelo polish geral posterior.
* <issue id="a4aefb83-c2da-4dd7-a6ab-3b45bbeb067d" href="https://linear.app/muvit/issue/MUV-14/criar-e2e-dos-fluxos-principais-de-aluno-e-professor-no-mobile">MUV-14</issue> — relacionada e responsável por E2E amplo dos fluxos principais; a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não antecipa essa suíte.

## Dúvidas abertas não bloqueantes

1. **Datas do plano:** `startDate` e `endDate` existem no domínio, mas o editor web atual não as expõe. Permanecem somente leitura quando existirem; um card futuro pode decidir torná-las editáveis.
2. **Tempo de execução (**`tempo`**):** permanece preservado internamente em edições quando já existir, mas sem campo visual. Exposição futura depende de decisão de produto.
3. **Arquivamento:** a API suporta `archived` por update de status, mas a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> não define UX para arquivar/desarquivar. Continua fora do escopo.
4. **Duplicação de treino:** pode ser útil futuramente, mas não é necessária para prescrição essencial e não entra nesta entrega.
5. **Persistência de rascunho:** o editor mantém estado apenas durante a sessão de tela. Persistência entre fechamentos do app pode ser considerada posteriormente se houver evidência de uso real.

Nenhuma dessas dúvidas impede a implementação definida nesta spec.

## Critérios de aceite derivados

* Treinador acessa Treinos a partir do detalhe do aluno.
* A entrada no detalhe do aluno não adiciona query de treino apenas para preview.
* Lista usa somente planos do aluno autorizado pela API.
* `404` não revela existência de aluno/plano fora do escopo.
* Deep link inconsistente entre `studentId` e `planId` não exibe dados no contexto errado.
* Treinador consulta planos ativos, rascunhos e arquivados.
* Planos arquivados são somente leitura no mobile.
* Treinador visualiza dias e exercícios na ordem retornada.
* Treinador cria plano `draft` ou `active`.
* Treinador edita plano `draft` ou `active`.
* Editor suporta 1–7 dias e pelo menos um exercício por dia no salvamento.
* Editor suporta séries, reps, carga, descanso e observação.
* `startDate` e `endDate` não são apagados em edição.
* `tempo` existente não é apagado em edição embora não seja editável.
* Catálogo lista somente exercícios visíveis via `scope=all`.
* Catálogo permite busca por nome, filtro por grupo e paginação.
* Catálogo não expõe criação, edição ou exclusão de exercício.
* Cliente nunca envia `trainerId` para determinar ownership.
* Payloads respeitam os validators compartilhados.
* Validação impede request com rascunho inválido.
* Erro de API preserva o conteúdo do editor.
* Sucesso de criação/edição é comunicado explicitamente.
* Após criação/edição, a lista e o summary são invalidados e o detalhe retornado pela mutation é atualizado no cache.
* Nenhuma regra nova de negócio, autorização ou status é criada no mobile.
* Fluxos do aluno, avaliações do treinador e navegação existente não sofrem regressão.
* Foundation visual, acessibilidade, coverage, typecheck, Biome, Expo Doctor e verificações de diff fornecem evidência antes do handoff.
