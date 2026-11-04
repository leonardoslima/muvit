# MUV-18 — Avaliações de alunos para professor no mobile

## Contexto

A MUV-16 habilitou a sessão `trainer`, isolou a navegação de aluno e treinador e criou o namespace `/trainer`.

A MUV-17, atualmente materializada na PR #15, implementa a home do treinador, a carteira de alunos e o detalhe somente leitura em `/trainer/students/:studentId`. A MUV-18 parte desse detalhe para levar ao mobile o fluxo essencial de avaliações do professor.

A MUV-20 consolidou `PRODUCT.md`, `DESIGN.md`, os tokens executáveis em `apps/mobile/src/lib/styles.ts` e os primitives compartilhados. O Pencil continua sendo referência funcional/UX, não especificação visual pixel a pixel.

O domínio de avaliações já existe no backend e no dashboard web. A API atual expõe:

- `GET /students/:studentId/assessments` — lista paginada, ordenada por data decrescente;
- `POST /students/:studentId/assessments` — cria avaliação;
- `GET /assessments/:id` — detalhe;
- `PATCH /assessments/:id` — atualização;
- `DELETE /assessments/:id` — exclusão;
- `POST /uploads/presign` — presign de imagem para `assessment-photo`.

Todas as operações de domínio passam por `EnsureStudentAccessUseCase`, que retorna `404` para treinador tentando acessar aluno fora do próprio escopo.

O dashboard web atual expõe histórico e criação de avaliação, mas não apresenta UI de edição ou exclusão. Portanto, a mera existência de `PATCH` e `DELETE` na API não é tratada como evidência suficiente de comportamento de produto já adotado.

## Fontes de verdade consideradas

- `AGENTS.md`.
- `apps/mobile/AGENTS.md`.
- `apps/api/AGENTS.md`.
- `packages/validators/AGENTS.md`.
- Linear MUV-18 e seus critérios de aceite.
- Linear MUV-17 e o estado atual da PR #15.
- Linear MUV-20.
- Linear MUV-7 como referência funcional histórica.
- `PRODUCT.md`.
- `DESIGN.md`.
- `packages/validators/src/assessments.ts`.
- `apps/api/src/routes/assessments.ts`.
- `apps/api/src/modules/assessments/use-cases/*`.
- `apps/api/src/modules/students/use-cases/ensure-student-access.ts`.
- `apps/api/src/modules/assessments/repositories/drizzle-assessments-repository.ts`.
- `apps/web/src/app/(app)/students/[id]/assessments/*`.
- `apps/web/src/application/assessments/assessment-form-data.ts`.
- `apps/mobile/src/application/assessments/new-assessment.ts`.
- `apps/mobile/src/screens/new-assessment.tsx`.
- `apps/mobile/src/screens/progress.tsx`.
- `apps/mobile/src/lib/uploads.ts`.
- `apps/mobile/src/application/trainer/trainer-data.ts`.
- `apps/mobile/src/screens/trainer-student-detail.tsx`.

## Objetivo

Permitir que um treinador autenticado:

1. abra as avaliações a partir do detalhe de um aluno vinculado;
2. consulte o histórico paginado desse aluno;
3. abra uma avaliação específica e visualize todos os dados registrados;
4. registre uma nova avaliação usando os campos já suportados pelo produto;
5. envie fotos de progresso quando necessário;
6. receba feedback claro de loading, vazio, erro, validação, envio e sucesso;
7. permaneça protegido pelas regras atuais de autenticação, autorização e multi-tenant da API.

## Decisões de escopo

### 1. A MUV-18 será mobile-only

Não serão alterados API, banco, validators, autenticação ou regras de autorização.

Os contratos existentes já são suficientes para histórico, detalhe e criação. O mobile deve reutilizar `assessmentSchema`, `createAssessmentSchema` e as rotas atuais como fonte de verdade.

### 2. O fluxo nasce dentro do detalhe do aluno

A MUV-17 deixa `/trainer/students/:studentId` como hub do aluno.

A MUV-18 adicionará uma seção **Avaliações** nesse detalhe com duas ações:

- **Ver histórico**;
- **Nova avaliação**.

O detalhe do aluno não fará uma nova query de avaliações apenas para mostrar preview ou última avaliação. Essa tela continua leve e atua como ponto de entrada.

### 3. O namespace de rotas será aninhado sob o aluno

A estrutura atual da MUV-17 possui:

```text
app/(trainer)/trainer/students/
  _layout.tsx
  index.tsx
  [studentId].tsx
```

Para permitir subrotas sem mudar a URL pública, `[studentId].tsx` será movido para:

```text
app/(trainer)/trainer/students/
  _layout.tsx
  index.tsx
  [studentId]/
    index.tsx
    assessments/
      index.tsx
      new.tsx
      [assessmentId].tsx
```

As URLs resultantes permanecem:

```text
/trainer/students/:studentId
/trainer/students/:studentId/assessments
/trainer/students/:studentId/assessments/new
/trainer/students/:studentId/assessments/:assessmentId
```

A tab **Alunos** continua sendo a única entrada de tab para esse fluxo.

### 4. O histórico será paginado e ordenado pela API

`GET /students/:studentId/assessments` já ordena por `date DESC`.

A MUV-18 usará:

- `limit = 25`;
- `offset` incremental;
- ação explícita **Carregar mais**;
- ação **Atualizar**;
- nenhuma ordenação local alternativa.

Não haverá filtro por período, busca ou comparação avançada nesta entrega.

### 5. O detalhe mostrará o shape completo da avaliação

A tela de detalhe exibirá, quando presentes:

- data;
- peso;
- altura;
- percentual de gordura;
- medidas de peito;
- cintura;
- quadril;
- braço direito;
- braço esquerdo;
- coxa direita;
- coxa esquerda;
- panturrilha direita;
- panturrilha esquerda;
- fotos;
- observações.

Campos ausentes não serão inventados. Se uma seção inteira não possuir conteúdo útil, a UI poderá mostrar um estado textual curto como **Não informado** em vez de preencher cada linha com valores artificiais.

### 6. A criação do treinador seguirá o produto web, não o formulário simplificado do aluno

O mobile do aluno atualmente registra apenas:

- data;
- peso;
- percentual de gordura;
- uma foto;
- observações.

Esse subconjunto atende ao auto-registro do aluno, mas não representa a superfície de trabalho do treinador.

O formulário do treinador deve suportar os campos já oferecidos pelo dashboard:

#### Métricas principais

- data;
- peso;
- altura;
- percentual de gordura.

#### Medidas de circunferência

- peito;
- cintura;
- quadril;
- braço direito;
- braço esquerdo;
- coxa direita;
- coxa esquerda;
- panturrilha direita;
- panturrilha esquerda.

#### Fotos

Até 3 fotos por avaliação nesta experiência, acompanhando a superfície atual do dashboard. A API aceita até 6, mas a MUV-18 não amplia o produto apenas porque o contrato técnico permite.

As fotos serão adicionadas uma por vez pelo picker já existente, com remoção antes do submit.

#### Observações

Campo opcional limitado pelo contrato atual.

### 7. Não haverá IMC persistido

O dashboard calcula IMC apenas como feedback derivado de altura e peso.

A MUV-18 pode exibir IMC calculado no formulário quando ambos os valores forem válidos, mas não deve enviá-lo nem persistir novo campo.

### 8. Edição e exclusão ficam fora do MUV-18

A API possui `PATCH /assessments/:id` e `DELETE /assessments/:id`, porém o produto web atual não oferece UI correspondente.

O critério do ticket determina edição somente se esse comportamento já fizer parte das regras atuais do produto e da API. Como a evidência atual confirma apenas o contrato técnico, a MUV-18 não expõe:

- editar avaliação;
- excluir avaliação;
- ações destrutivas relacionadas.

Esses comportamentos podem ser tratados em card posterior se forem assumidos explicitamente como parte do produto.

### 9. Nenhuma fila offline será criada para avaliações do treinador

A criação depende de API e, opcionalmente, upload de imagens.

Falha de rede ou upload será tratada como erro recuperável na tela. Não serão reutilizados journal, rascunho offline ou fila de conclusão de treino do aluno.

### 10. Autorização continua exclusivamente no backend

O mobile não enviará `trainerId` e não tentará replicar vínculos localmente.

Histórico e criação usam o `studentId` da rota. Detalhe usa `assessmentId`, e a API revalida o `studentId` proprietário por `EnsureStudentAccessUseCase`.

Um `404` de avaliação ou aluno continua genérico e não revela se o recurso existe em outro tenant.

## Abordagens consideradas

### Abordagem A — Fluxo próprio do treinador com núcleo reutilizável de avaliações — escolhida

Criar screens específicas do treinador e extrair para `src/application/assessments` as regras puras de parsing, montagem de payload, listagem, detalhe e criação que não dependem da role.

**Vantagens**

- mantém a navegação de aluno e treinador isolada;
- reaproveita contratos e helpers sem compartilhar UI inadequada;
- permite formulário completo do treinador;
- evita duplicar parsing e payload;
- mantém API e validators intactos;
- deixa cada screen pequena e testável.

**Desvantagem**

- exige pequena reorganização da camada atual de `new-assessment`, hoje acoplada à rota `/students/me/assessments`.

### Abordagem B — Reutilizar diretamente `ProgressScreen` e `NewAssessmentScreen` — rejeitada

Reduziria arquivos novos, mas:

- as telas assumem o contexto do próprio aluno;
- a criação usa `/students/me/assessments`;
- o formulário é simplificado;
- as cópias são orientadas a autoacompanhamento;
- a navegação retornaria para superfícies da role errada.

### Abordagem C — Criar endpoints ou BFF específicos para treinador mobile — rejeitada

A API atual já oferece listagem, detalhe, criação, autorização e uploads suficientes.

Criar contratos novos aumentaria o diff transversal sem cumprir nenhum critério adicional do ticket.

## Arquitetura

### Camada de aplicação de avaliações

Evoluir `apps/mobile/src/application/assessments/new-assessment.ts` para um módulo de domínio mais geral, ou dividir responsabilidades em arquivos focados dentro de `src/application/assessments`.

Estrutura recomendada:

```text
src/application/assessments/
  assessment-data.ts
  assessment-data.test.ts
  assessment-form.ts
  assessment-form.test.ts
```

#### `assessment-data.ts`

Responsabilidades:

- derivar `Assessment` de `assessmentSchema`;
- declarar `AssessmentsPage`;
- listar avaliações de um aluno;
- obter avaliação por ID;
- criar avaliação para um alvo explicitamente informado.

Interfaces previstas:

```ts
import type { assessmentSchema, createAssessmentSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const TRAINER_ASSESSMENTS_PAGE_SIZE = 25;

export type Assessment = z.infer<typeof assessmentSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export type AssessmentsPage = {
  items: Assessment[];
  total: number;
};

export type AssessmentTarget =
  | { kind: 'self' }
  | { kind: 'student'; studentId: string };

export function listAssessments(
  api: ApiRequester,
  target: AssessmentTarget,
  input: { limit: number; offset: number; signal?: AbortSignal },
): Promise<AssessmentsPage>;

export function getAssessment(
  api: ApiRequester,
  assessmentId: string,
  signal?: AbortSignal,
): Promise<Assessment>;

export function createAssessment(
  api: ApiRequester,
  target: AssessmentTarget,
  input: CreateAssessmentInput,
): Promise<Assessment>;
```

A resolução de rota fica encapsulada:

- `self` → `/students/me/assessments`;
- `student` → `/students/:studentId/assessments`.

Nenhum módulo de aplicação importa React Native, Expo Router, picker ou componentes.

#### `assessment-form.ts`

Responsabilidades:

- normalizar números com vírgula/ponto;
- validar valores locais antes do request usando o schema compartilhado;
- montar `measurements` somente quando houver pelo menos uma medida;
- normalizar observações vazias para `undefined`;
- anexar URLs das fotos já enviadas;
- calcular IMC somente para apresentação.

Tipos previstos:

```ts
export type TrainerAssessmentFormValues = {
  date: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  measurements: {
    chest: string;
    waist: string;
    hip: string;
    armRight: string;
    armLeft: string;
    thighRight: string;
    thighLeft: string;
    calfRight: string;
    calfLeft: string;
  };
  notes: string;
};

export type AssessmentPhotoInput = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export type BuildAssessmentInputResult =
  | { ok: true; body: CreateAssessmentInput }
  | { ok: false; message: string };

export function buildCreateAssessmentInput(
  values: TrainerAssessmentFormValues,
  photoUrls: string[],
): BuildAssessmentInputResult;

export function calculateBmi(
  weightKg: string,
  heightCm: string,
): number | null;
```

O schema compartilhado continua sendo a validação final de domínio. A camada mobile pode usar `safeParse` para transformar erros conhecidos em feedback de formulário antes do POST, mas não redefine limites.

### Upload

Reutilizar `apps/mobile/src/lib/uploads.ts`.

A função `uploadAssessmentPhoto` já encapsula:

1. `POST /uploads/presign`;
2. leitura do arquivo local;
3. `PUT` para a URL assinada;
4. retorno da URL pública.

A criação do treinador fará uploads somente no submit. Se qualquer upload falhar:

- o POST da avaliação não ocorre;
- os valores permanecem na tela;
- o usuário recebe mensagem de erro;
- pode tentar novamente.

Não haverá upload em background ao selecionar uma foto.

### Screens

Criar:

- `src/screens/trainer-assessments.tsx`;
- `src/screens/trainer-assessment-detail.tsx`;
- `src/screens/trainer-new-assessment.tsx`.

Cada screen:

- obtém `ApiClient` via `useApiClient()`;
- extrai params da rota;
- usa TanStack Query para leitura;
- usa estado local apenas para formulário/picker;
- chama módulos de aplicação;
- não implementa regra de autorização.

### Components

Criar components específicos somente quando houver reutilização real:

- `components/assessments/assessment-list-item.tsx` — resumo clicável do histórico;
- `components/assessments/assessment-metric.tsx` — label + valor reutilizado no detalhe;
- `components/assessments/assessment-photo-list.tsx` — apresentação das fotos no detalhe;
- `components/assessments/assessment-measurements-card.tsx` — bloco das circunferências quando necessário.

O formulário pode permanecer na screen inicialmente se a composição continuar legível. Se crescer a ponto de concentrar picker, seções e dezenas de fields, deve ser dividido por responsabilidade, não por mera camada técnica.

## Contratos de API envolvidos

### `GET /students/:studentId/assessments`

Autenticação:

- `requireAuth`;
- `EnsureStudentAccessUseCase`.

Query:

```text
limit=25&offset=<offset>
```

Resposta:

```ts
{
  items: Assessment[];
  total: number;
}
```

Ordenação atual:

```text
date DESC
```

### `POST /students/:studentId/assessments`

Body validado por `createAssessmentSchema`:

```ts
{
  date: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hip?: number;
    armRight?: number;
    armLeft?: number;
    thighRight?: number;
    thighLeft?: number;
    calfRight?: number;
    calfLeft?: number;
  };
  photos?: string[];
  notes?: string;
}
```

Regras existentes relevantes:

- `date`: data ISO válida;
- peso: positivo e <= 500;
- altura: positiva e <= 300;
- gordura corporal: entre 0 e 80;
- cada medida: positiva;
- fotos: no máximo 6 pelo contrato;
- observações: no máximo 2000 caracteres.

A UI do treinador limita seleção a 3 fotos por decisão de produto desta entrega.

### `GET /assessments/:id`

A API:

1. busca avaliação pelo ID;
2. resolve `assessment.studentId`;
3. aplica `EnsureStudentAccessUseCase`;
4. retorna `404` tanto para inexistente quanto para recurso fora do escopo.

O mobile não precisa reenviar `studentId` para obter o detalhe, mas mantém o parâmetro na URL para navegação e retorno ao histórico correto.

### `POST /uploads/presign`

Body:

```ts
{
  kind: 'assessment-photo';
  contentType: 'image/jpeg' | 'image/png';
}
```

Não haverá novo tipo de upload.

## Fluxos da interface

### Fluxo 1 — Entrada pelo detalhe do aluno

1. Treinador abre `/trainer/students/:studentId`.
2. O detalhe continua buscando apenas `GET /students/:id`.
3. Uma nova seção **Avaliações** aparece após as informações essenciais.
4. **Ver histórico** abre `/trainer/students/:studentId/assessments`.
5. **Nova avaliação** abre `/trainer/students/:studentId/assessments/new`.
6. Nenhuma query de avaliação é feita no detalhe apenas para preencher essa seção.

### Fluxo 2 — Histórico

1. A screen valida a presença de `studentId`.
2. Carrega `limit=25&offset=0`.
3. Loading inicial usa `StatePanel`.
4. Erro inicial oferece **Tentar novamente**.
5. Lista vazia mostra **Nenhuma avaliação registrada** e ação **Nova avaliação**.
6. Com dados, cada item exibe:
   - data;
   - peso quando disponível;
   - gordura corporal quando disponível;
   - indicação curta de observação, se houver.
7. Tocar no item abre o detalhe.
8. **Nova avaliação** permanece disponível.
9. **Atualizar** refaz a consulta atual.
10. Quando `items.length < total`, aparece **Carregar mais**.
11. Falha de paginação preserva os itens existentes e mostra retry inline.
12. **Voltar para aluno** aponta deterministicamente para `/trainer/students/:studentId`.

### Fluxo 3 — Detalhe da avaliação

1. A screen valida `studentId` e `assessmentId`.
2. Consulta `GET /assessments/:assessmentId`.
3. Loading inicial usa `StatePanel`.
4. `404` mostra **Avaliação não encontrada** sem diferenciar tenant.
5. Outros erros oferecem retry.
6. Dados válidos exibem:
   - data;
   - métricas principais;
   - medidas;
   - fotos;
   - observações.
7. **Voltar para avaliações** aponta para o histórico do aluno.
8. **Atualizar** refaz o detalhe.
9. Não existem ações de editar ou excluir.

Se a API retornar uma avaliação cujo `studentId` seja diferente do parâmetro `studentId` da rota, a screen não deve confiar silenciosamente na URL. A navegação segura é voltar para `/trainer/students/:studentId/assessments` e tratar o dado como indisponível para aquele contexto. Esse cenário não deve acontecer no fluxo normal, mas evita composição inconsistente em deep links alterados manualmente.

### Fluxo 4 — Nova avaliação

1. A screen valida `studentId`.
2. Data inicia com `todayIsoDate()`.
3. Campos numéricos iniciam vazios.
4. O treinador preenche qualquer subconjunto permitido, mantendo data obrigatória.
5. IMC aparece somente quando peso e altura forem numéricos e positivos.
6. **Adicionar foto** abre o picker.
7. Cada foto válida é adicionada à seleção local até o máximo de 3.
8. O treinador pode remover foto antes de salvar.
9. **Salvar avaliação**:
   - bloqueia submit concorrente;
   - monta e valida o payload;
   - envia as fotos selecionadas em paralelo com `Promise.all`, repetindo o padrão já usado pelo dashboard;
   - executa `POST /students/:studentId/assessments`;
   - invalida histórico do aluno;
   - invalida `['trainer', 'summary']`, porque o agregado de avaliações dos últimos 30 dias pode mudar;
   - apresenta sucesso;
   - retorna para o histórico.
10. Erro de validação não chama upload nem POST.
11. Erro de upload não chama POST.
12. Erro de POST mantém os dados preenchidos e oferece nova tentativa.

A tela não deve descartar silenciosamente os campos preenchidos em uma falha recuperável.

## Estados por superfície

| Superfície | Loading | Vazio | Erro | Atualização / submit |
| --- | --- | --- | --- | --- |
| Entrada no detalhe | não adiciona query | não se aplica | mantém comportamento da MUV-17 | não se aplica |
| Histórico | `Carregando avaliações` | `Nenhuma avaliação registrada` | retry | mantém dados; `Atualizando...` |
| Paginação | mantém itens | não se aplica | retry inline | `Carregando mais...` |
| Detalhe | `Carregando avaliação` | não se aplica | 404 genérico ou retry | mantém conteúdo; `Atualizando...` |
| Nova avaliação | não se aplica | campos vazios permitidos conforme contrato | erro de validação/upload/API | `Salvando avaliação...` e sucesso explícito |

## Cache e chaves de query

Usar namespace do treinador:

```ts
['trainer', 'assessments', studentId]
['trainer', 'assessment', assessmentId]
['trainer', 'summary']
```

O histórico não reutiliza `['assessments', 'me']`, usado pelo aluno.

Após criação bem-sucedida:

```ts
queryClient.invalidateQueries({
  queryKey: ['trainer', 'assessments', studentId],
});

queryClient.invalidateQueries({
  queryKey: ['trainer', 'summary'],
});
```

Não é necessário popular manualmente o detalhe da nova avaliação no cache para cumprir o fluxo.

## Formulário e validação

### Parsing numérico

Todos os campos numéricos aceitam vírgula ou ponto na camada de aplicação:

```text
"82,5" -> 82.5
"82.5" -> 82.5
"" -> undefined
```

Valores não numéricos não podem virar `undefined` silenciosamente quando o usuário digitou conteúdo. Devem produzir erro de validação.

### Medidas

`measurements` só é enviado se pelo menos um dos nove campos tiver valor.

Não enviar objeto vazio.

### Observações

Aplicar `trim()`.

Texto vazio vira `undefined`.

### Fotos

- formatos aceitos: JPEG e PNG;
- máximo visual: 3;
- cada item mantém `uri` e `contentType`;
- seleção cancelada não altera estado;
- MIME não suportado gera feedback sem adicionar o arquivo.

### IMC

```ts
weightKg / ((heightCm / 100) ** 2)
```

Somente apresentação.

Não classificar faixa de IMC, não emitir recomendação clínica e não criar regra de negócio nova.

## Foundation visual

Seguir `PRODUCT.md`, `DESIGN.md` e `apps/mobile/src/lib/styles.ts`.

Regras:

- `Screen` continua responsável por safe area e inset da tab bar;
- `ScreenHeader` mantém a hierarquia principal;
- `Card` agrupa métricas, medidas, fotos e observações;
- `StatePanel` representa loading, vazio e erro inicial;
- `InlineMessage` representa falha recuperável quando conteúdo útil permanece visível;
- `Field` é reutilizado nos inputs;
- `AppButton` representa ações;
- tokens de cor, spacing, tipografia, raio e tamanho vêm de `styles.ts`;
- nenhum valor visual novo deve ser criado sem necessidade;
- textos em pt-BR UTF-8 literal;
- nomes e observações podem quebrar linha;
- a UI não depende apenas de cor para estado.

O Pencil pode orientar ordem e agrupamento funcional, mas não deve ser copiado pixel a pixel.

## Acessibilidade

- itens do histórico são botões acessíveis com label incluindo a data;
- fotos no detalhe possuem descrição acessível por posição, como **Foto 1 da avaliação de 03/09/2026**;
- botão de remoção de foto selecionada informa qual item será removido;
- fields expõem labels e unidades;
- submit comunica estado desabilitado;
- mensagens de erro são textuais;
- conteúdo longo permanece rolável;
- deep links possuem ação explícita de retorno;
- tamanho de toque segue os controles existentes da foundation.

## Arquivos envolvidos

### Criar

- `apps/mobile/src/application/assessments/assessment-data.ts`
- `apps/mobile/src/application/assessments/assessment-data.test.ts`
- `apps/mobile/src/application/assessments/assessment-form.ts`
- `apps/mobile/src/application/assessments/assessment-form.test.ts`
- `apps/mobile/src/components/assessments/assessment-list-item.tsx`
- `apps/mobile/src/components/assessments/assessment-list-item.test.tsx`
- `apps/mobile/src/components/assessments/assessment-metric.tsx`
- `apps/mobile/src/components/assessments/assessment-photo-list.tsx`
- `apps/mobile/src/screens/trainer-assessments.tsx`
- `apps/mobile/src/screens/trainer-assessments.test.tsx`
- `apps/mobile/src/screens/trainer-assessment-detail.tsx`
- `apps/mobile/src/screens/trainer-assessment-detail.test.tsx`
- `apps/mobile/src/screens/trainer-new-assessment.tsx`
- `apps/mobile/src/screens/trainer-new-assessment.test.tsx`
- `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/index.tsx`
- `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/new.tsx`
- `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/[assessmentId].tsx`

### Mover

- `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx`
  → `apps/mobile/app/(trainer)/trainer/students/[studentId]/index.tsx`

### Modificar

- `apps/mobile/src/screens/trainer-student-detail.tsx`
- `apps/mobile/src/screens/trainer-student-detail.test.tsx`
- `apps/mobile/src/lib/uploads.ts`, somente se for necessário generalizar tipo/assinatura sem mudar comportamento existente;
- `apps/mobile/src/lib/uploads.test.ts`, caso a assinatura seja alterada;
- `apps/mobile/vitest.ui-coverage.config.ts` — incluir as novas screens críticas sem reduzir thresholds;
- `apps/mobile/src/application/assessments/new-assessment.ts` e seu teste, somente durante a migração do fluxo do aluno para o núcleo compartilhado, ou removê-los se ficarem totalmente substituídos.

### Verificar sem alterar por padrão

- `apps/mobile/src/screens/new-assessment.tsx`;
- `apps/mobile/src/screens/new-assessment.test.tsx`;
- `apps/mobile/src/screens/progress.tsx`;
- `apps/mobile/src/screens/progress.test.tsx`;
- guards e layouts da MUV-16;
- screens e testes da MUV-17.

### Não alterar

- `apps/api`;
- `packages/db`;
- `packages/validators`;
- autenticação;
- regras de autorização;
- contratos REST;
- `PRODUCT.md`;
- `DESIGN.md`;
- tokens visuais;
- fluxo de treinos da MUV-19.

## Estratégia de testes

### Camada de aplicação — dados

Cobrir:

- listagem `self`;
- listagem por `studentId`;
- `limit` e `offset`;
- encoding seguro de `studentId`;
- detalhe por `assessmentId`;
- criação `self`;
- criação por `studentId`;
- body exato do POST;
- encaminhamento de `AbortSignal`;
- ausência de `trainerId` no request.

### Camada de aplicação — formulário

Cobrir:

- vírgula e ponto decimal;
- campo vazio → `undefined`;
- texto numérico inválido → erro;
- limites do `createAssessmentSchema`;
- medidas parcialmente preenchidas;
- ausência de `measurements` quando todas vazias;
- trim de notes;
- máximo de fotos assumido pela screen;
- cálculo de IMC;
- payload completo.

### Histórico

Cobrir:

- parâmetro `studentId` ausente;
- loading;
- erro inicial + retry;
- vazio;
- renderização de itens;
- ordenação preservada da resposta;
- abertura do detalhe;
- abertura de nova avaliação;
- atualização;
- paginação;
- erro de paginação mantendo itens;
- retorno para aluno;
- nenhum request fora de `/students/:studentId/assessments`.

### Detalhe

Cobrir:

- params ausentes;
- loading;
- `404` genérico;
- erro recuperável;
- métricas completas;
- campos nulos;
- medidas parciais;
- fotos;
- observações;
- atualização;
- retorno para histórico;
- mismatch entre `assessment.studentId` e `studentId` da rota;
- ausência de editar/excluir.

### Nova avaliação

Cobrir:

- data inicial;
- campos vazios opcionais;
- parsing de vírgula;
- preenchimento completo;
- IMC;
- picker cancelado;
- MIME inválido;
- adicionar até 3 fotos;
- impedir quarta foto;
- remover foto;
- erro de validação sem upload/POST;
- erro de upload sem POST;
- erro de POST preservando formulário;
- submit concorrente bloqueado;
- sucesso;
- invalidação do histórico;
- invalidação do summary;
- retorno para histórico.

### Regressão do aluno

O reaproveitamento da camada de aplicação não pode alterar o comportamento existente:

- `ProgressScreen` continua usando `/students/me/assessments`;
- `NewAssessmentScreen` continua criando avaliação do próprio aluno;
- o formulário simplificado do aluno continua simplificado;
- query key `['assessments', 'me']` permanece isolada;
- upload de uma foto continua funcionando;
- tabs e guards do aluno continuam passando.

### Regressão do treinador

Reexecutar:

- home;
- carteira de alunos;
- detalhe do aluno;
- tabs Início/Alunos/Perfil;
- guards por role;
- `404` cross-tenant genérico.

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

Antes de concluir, procurar escapes Unicode indevidos nos arquivos alterados.

### Validação manual

Quando houver emulador/dispositivo:

1. autenticar como treinador;
2. abrir Alunos;
3. abrir aluno vinculado;
4. abrir histórico;
5. confirmar histórico vazio ou populado;
6. abrir avaliação existente;
7. conferir métricas, medidas, fotos e observações;
8. voltar para histórico;
9. criar nova avaliação somente com data;
10. confirmar sucesso e presença no histórico;
11. criar avaliação com métricas, medidas, 3 fotos e observações;
12. confirmar atualização do histórico;
13. testar validação numérica inválida;
14. testar cancelamento do picker;
15. testar tentativa de quarta foto;
16. abrir ID de avaliação inexistente e confirmar `404` genérico;
17. testar deep link inconsistente com `studentId` diferente do dono da avaliação;
18. autenticar como aluno e confirmar que Progresso/Nova avaliação continuam funcionando;
19. confirmar que aluno não entra no namespace `/trainer`.

Falhas de rede/upload que não puderem ser reproduzidas manualmente devem permanecer cobertas por testes automatizados e ser registradas como não validadas manualmente, em vez de presumidas como aprovadas.

## Riscos e mitigação

### Risco: MUV-18 parte de uma PR ainda não mergeada

A estrutura necessária do detalhe do aluno existe no head atual da PR #15, não necessariamente em `develop`.

**Mitigação:** esta spec e a futura branch de implementação partem do head da PR #15. Se a MUV-17 mudar antes do merge, rebasear e revisar apenas os pontos de integração.

### Risco: generalizar o fluxo atual do aluno cause regressão

`new-assessment.ts` hoje está acoplado a `/students/me/assessments`.

**Mitigação:** introduzir `AssessmentTarget` explícito, manter testes do aluno e não compartilhar UI entre roles. O compartilhamento ocorre na camada pura de aplicação.

### Risco: formulário do treinador ficar grande demais

São métricas, nove medidas, fotos e observações.

**Mitigação:** organizar em cards/seções com hierarquia clara e rolagem única. Extrair componentes somente quando a screen perder legibilidade, evitando fragmentação prematura.

### Risco: upload parcial antes de falha

Se duas fotos forem enviadas e a terceira falhar, URLs anteriores já podem existir no storage sem avaliação criada.

**Mitigação:** esse comportamento já é inerente ao fluxo web atual com uploads anteriores ao POST. A MUV-18 não cria rotina de garbage collection fora do escopo. O submit informa falha e não cria avaliação parcial.

### Risco: diferença entre limite técnico de 6 fotos e UI de 3

A API aceita 6, o dashboard atual usa 3 slots.

**Mitigação:** documentar 3 como limite de experiência do MUV-18. Não alterar validator.

### Risco: `GET /assessments/:id` não recebe `studentId`

Um deep link pode combinar um `studentId` da URL com avaliação válida de outro aluno do mesmo treinador.

**Mitigação:** após carregar o detalhe, comparar `assessment.studentId` ao `studentId` da rota. Se divergir, não renderizar a avaliação dentro do contexto incorreto.

### Risco: histórico com muitos registros em `ScrollView`

A foundation atual favorece `Screen scroll`.

**Mitigação:** paginação explícita de 25 itens limita crescimento inicial. Virtualização pode ser tratada depois se houver evidência real de degradação.

## Dependências

- MUV-16: concluída e necessária para role/guards.
- MUV-20: concluída e necessária para foundation visual.
- MUV-17: dependência direta; PR #15 fornece o detalhe do aluno e ainda está em review.
- API de assessments: existente.
- upload presign: existente.
- MUV-19: independente funcionalmente; não deve ser antecipada.

## Dúvidas abertas não bloqueantes

1. **Quantidade futura de fotos:** a API suporta 6 e a UI atual do treinador usará 3. Ampliação deve ser decisão explícita de produto.
2. **Edição/exclusão:** contratos existem, mas a UI atual do produto não os assume. Permanecem fora até existir decisão de produto.
3. **Visualização ampliada de foto:** a MUV-18 precisa mostrar as fotos com legibilidade; zoom/fullscreen dedicado só entra se a implementação atual exigir para usabilidade básica.
4. **Comparações/gráficos:** o web possui gráfico de evolução no histórico, mas o card MUV-18 exige consultar histórico/detalhe e registrar avaliação, não paridade completa. Gráfico e comparação avançada permanecem fora desta entrega.

Nenhuma dessas dúvidas impede a implementação definida nesta spec.

## Critérios de aceite derivados

- Treinador abre avaliações a partir do detalhe do aluno da MUV-17.
- Histórico usa somente dados do aluno autorizado.
- Histórico pagina sem truncar silenciosamente.
- Treinador abre detalhe de avaliação.
- Detalhe exibe os dados existentes sem inventar campos.
- Treinador registra avaliação usando os campos atuais do produto.
- Fotos JPEG/PNG podem ser adicionadas até o limite visual de 3.
- Payload respeita `createAssessmentSchema`.
- Dados inválidos não são enviados como avaliação válida.
- `404` não expõe existência cross-tenant.
- Erros de loading, rede, paginação, upload e submit possuem tratamento explícito.
- Edição e exclusão não são expostas.
- Nenhuma regra de API, autorização, validator ou banco é alterada.
- Fluxo do aluno não sofre regressão.
- Foundation visual e acessibilidade permanecem consistentes.
- Testes, coverage, typecheck, Biome, Expo Doctor e verificações de diff fornecem evidência antes do handoff.
