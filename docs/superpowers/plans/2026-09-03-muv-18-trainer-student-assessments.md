# MUV-18 — Avaliações de alunos para professor no mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o treinador consulte histórico e detalhe de avaliações de um aluno vinculado e registre uma nova avaliação completa pelo mobile, preservando autorização, contratos atuais e regressão do aluno.

**Architecture:** O fluxo do treinador terá screens próprias sob `/trainer/students/:studentId/assessments`, enquanto regras puras de listagem, detalhe, criação, parsing e payload ficam em `src/application/assessments`. A API, banco, validators e autorização permanecem inalterados; o mobile reutiliza os contratos existentes e mantém as query keys do treinador isoladas das do aluno.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router 6, TanStack Query 5, Zod 3, `@muvit/validators`, Vitest 4, React Native Testing Library, Biome, TypeScript 5.9.

**Spec:** `docs/superpowers/specs/2026-09-03-muv-18-trainer-student-assessments-design.md`

## Global Constraints

- Não alterar `apps/api`, `packages/db`, `packages/validators`, autenticação, autorização ou contratos REST.
- Usar `assessmentSchema` e `createAssessmentSchema` de `@muvit/validators` como fonte de verdade.
- O fluxo do treinador usa `/students/:studentId/assessments`; o fluxo do aluno continua usando `/students/me/assessments`.
- Não enviar `trainerId` em nenhuma chamada.
- Edição e exclusão de avaliação ficam fora do escopo.
- O histórico usa páginas de 25 itens e preserva a ordenação `date DESC` fornecida pela API.
- A UI do treinador limita a seleção a 3 fotos JPEG/PNG, embora o validator aceite até 6.
- IMC é apenas derivado para apresentação; nunca entra no payload.
- Nenhuma fila offline, journal ou AsyncStorage novo será criado.
- Usar os tokens existentes de `apps/mobile/src/lib/styles.ts`; não alterar `PRODUCT.md`, `DESIGN.md` ou a foundation.
- Textos visíveis devem permanecer em pt-BR com UTF-8 literal.
- `src/application` não pode importar React Native, Expo Router, picker ou componentes.
- Cobertura bloqueante existente permanece >= 85%; não reduzir thresholds.
- A implementação deve partir do estado atual da MUV-17 presente nesta branch.

---

## Mapa de arquivos final

### Aplicação compartilhada

- `apps/mobile/src/application/assessments/assessment-data.ts` — rotas e contratos HTTP de avaliações.
- `apps/mobile/src/application/assessments/assessment-data.test.ts` — cobertura de self/student, paginação, detalhe e criação.
- `apps/mobile/src/application/assessments/assessment-form.ts` — parsing, validação e IMC do formulário do treinador.
- `apps/mobile/src/application/assessments/assessment-form.test.ts` — cobertura de payload e regras locais.
- `apps/mobile/src/application/assessments/new-assessment.ts` — adapter do fluxo atual do aluno usando o núcleo compartilhado.
- `apps/mobile/src/application/assessments/new-assessment.test.ts` — regressão do adapter do aluno.

### UI compartilhada do domínio

- `apps/mobile/src/components/assessments/assessment-list-item.tsx` — item clicável do histórico.
- `apps/mobile/src/components/assessments/assessment-list-item.test.tsx` — acessibilidade e conteúdo do item.
- `apps/mobile/src/components/assessments/assessment-metric.tsx` — label/valor para métricas.
- `apps/mobile/src/components/assessments/assessment-photo-list.tsx` — fotos remotas do detalhe.
- `apps/mobile/src/components/assessments/assessment-measurements-card.tsx` — medidas corporais.

### Screens

- `apps/mobile/src/screens/trainer-assessments.tsx`
- `apps/mobile/src/screens/trainer-assessments.test.tsx`
- `apps/mobile/src/screens/trainer-assessment-detail.tsx`
- `apps/mobile/src/screens/trainer-assessment-detail.test.tsx`
- `apps/mobile/src/screens/trainer-new-assessment.tsx`
- `apps/mobile/src/screens/trainer-new-assessment.test.tsx`
- `apps/mobile/src/screens/trainer-student-detail.tsx`
- `apps/mobile/src/screens/trainer-student-detail.test.tsx`

### Rotas

- mover `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx` para `apps/mobile/app/(trainer)/trainer/students/[studentId]/index.tsx`
- criar `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/index.tsx`
- criar `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/new.tsx`
- criar `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/[assessmentId].tsx`

### Configuração

- `apps/mobile/vitest.ui-coverage.config.ts` — adicionar as três novas screens do treinador.

---

### Task 1: Criar o núcleo HTTP compartilhado de avaliações

**Files:**
- Create: `apps/mobile/src/application/assessments/assessment-data.ts`
- Create: `apps/mobile/src/application/assessments/assessment-data.test.ts`

**Interfaces:**
- Consumes: `ApiRequester` de `apps/mobile/src/lib/api.ts`, `assessmentSchema` e `createAssessmentSchema`.
- Produces: `Assessment`, `CreateAssessmentInput`, `AssessmentsPage`, `AssessmentTarget`, `TRAINER_ASSESSMENTS_PAGE_SIZE`, `listAssessments`, `getAssessment`, `createAssessment`.

- [ ] **Step 1: Escrever os testes falhando para rotas self e student**

Criar `assessment-data.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  TRAINER_ASSESSMENTS_PAGE_SIZE,
  createAssessment,
  getAssessment,
  listAssessments,
} from './assessment-data';

describe('assessment data', () => {
  it('lista avaliações do próprio aluno', async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    await listAssessments(
      api,
      { kind: 'self' },
      { limit: 20, offset: 0 },
    );

    expect(api.request).toHaveBeenCalledWith(
      '/students/me/assessments?limit=20&offset=0',
      { signal: undefined },
    );
  });

  it('lista avaliações de um aluno do treinador com paginação', async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const signal = new AbortController().signal;

    await listAssessments(
      api,
      { kind: 'student', studentId: 'student-1' },
      { limit: TRAINER_ASSESSMENTS_PAGE_SIZE, offset: 25, signal },
    );

    expect(api.request).toHaveBeenCalledWith(
      '/students/student-1/assessments?limit=25&offset=25',
      { signal },
    );
  });

  it('obtém uma avaliação pelo id', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };
    const signal = new AbortController().signal;

    await getAssessment(api, 'assessment-1', signal);

    expect(api.request).toHaveBeenCalledWith('/assessments/assessment-1', { signal });
  });

  it('cria avaliação para aluno do treinador', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };

    await createAssessment(
      api,
      { kind: 'student', studentId: 'student-1' },
      { date: '2026-09-03', weightKg: 82.5 },
    );

    expect(api.request).toHaveBeenCalledWith('/students/student-1/assessments', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-09-03', weightKg: 82.5 }),
    });
  });

  it('cria avaliação self sem enviar trainerId', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'assessment-1' }) };

    await createAssessment(
      api,
      { kind: 'self' },
      { date: '2026-09-03' },
    );

    expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-09-03' }),
    });
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-data.test.ts
```

Expected: FAIL porque `assessment-data.ts` ainda não existe.

- [ ] **Step 3: Implementar o módulo HTTP mínimo**

Criar `assessment-data.ts`:

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

export type ListAssessmentsInput = {
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

function assessmentsPath(target: AssessmentTarget): string {
  if (target.kind === 'self') {
    return '/students/me/assessments';
  }

  return `/students/${encodeURIComponent(target.studentId)}/assessments`;
}

export function listAssessments(
  api: ApiRequester,
  target: AssessmentTarget,
  input: ListAssessmentsInput,
): Promise<AssessmentsPage> {
  const path = assessmentsPath(target);
  return api.request<AssessmentsPage>(
    `${path}?limit=${input.limit}&offset=${input.offset}`,
    { signal: input.signal },
  );
}

export function getAssessment(
  api: ApiRequester,
  assessmentId: string,
  signal?: AbortSignal,
): Promise<Assessment> {
  return api.request<Assessment>(
    `/assessments/${encodeURIComponent(assessmentId)}`,
    { signal },
  );
}

export function createAssessment(
  api: ApiRequester,
  target: AssessmentTarget,
  input: CreateAssessmentInput,
): Promise<Assessment> {
  return api.request<Assessment>(assessmentsPath(target), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 4: Rodar os testes do núcleo**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-data.test.ts
```

Expected: PASS.

- [ ] **Step 5: Rodar o teste de arquitetura mobile**

```powershell
pnpm.cmd --dir apps/mobile test test/solid-architecture.test.ts
```

Expected: PASS, confirmando que `src/application` não importou framework nativo.

- [ ] **Step 6: Commitar a unidade**

```powershell
git add apps/mobile/src/application/assessments/assessment-data.ts apps/mobile/src/application/assessments/assessment-data.test.ts
git commit -m "feat(mobile): adiciona núcleo de dados de avaliações"
```

---

### Task 2: Criar parsing/validação do formulário e migrar o adapter do aluno

**Files:**
- Create: `apps/mobile/src/application/assessments/assessment-form.ts`
- Create: `apps/mobile/src/application/assessments/assessment-form.test.ts`
- Modify: `apps/mobile/src/application/assessments/new-assessment.ts`
- Modify: `apps/mobile/src/application/assessments/new-assessment.test.ts`
- Verify: `apps/mobile/src/screens/new-assessment.test.tsx`

**Interfaces:**
- Consumes: `CreateAssessmentInput`, `createAssessment`, `createAssessmentSchema`.
- Produces: `TrainerAssessmentFormValues`, `AssessmentPhotoInput`, `BuildAssessmentInputResult`, `buildCreateAssessmentInput`, `calculateBmi`.
- Preserves: `submitAssessment`, `toSupportedContentType`, `AssessmentFormValues` usados pela screen do aluno.

- [ ] **Step 1: Escrever os testes do formulário completo**

Criar `assessment-form.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildCreateAssessmentInput,
  calculateBmi,
  emptyTrainerAssessmentMeasurements,
} from './assessment-form';

describe('assessment form', () => {
  it('monta payload completo aceitando vírgula decimal', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '82,5',
        heightCm: '178',
        bodyFatPct: '18,4',
        measurements: {
          ...emptyTrainerAssessmentMeasurements(),
          chest: '101,5',
          waist: '84',
        },
        notes: '  Evolução consistente  ',
      },
      ['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg'],
    );

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-09-03',
        weightKg: 82.5,
        heightCm: 178,
        bodyFatPct: 18.4,
        measurements: {
          chest: 101.5,
          waist: 84,
        },
        photos: ['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg'],
        notes: 'Evolução consistente',
      },
    });
  });

  it('omite opcionais vazios e objeto de medidas vazio', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '   ',
      },
      [],
    );

    expect(result).toEqual({
      ok: true,
      body: { date: '2026-09-03' },
    });
  });

  it('rejeita conteúdo numérico digitado que não é número', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: 'abc',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '',
      },
      [],
    );

    expect(result).toEqual({
      ok: false,
      message: 'Peso deve ser um número válido.',
    });
  });

  it('rejeita limites usando createAssessmentSchema', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '501',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '',
      },
      [],
    );

    expect(result.ok).toBe(false);
  });

  it('calcula IMC somente com peso e altura válidos', () => {
    expect(calculateBmi('82,5', '178')).toBeCloseTo(26.04, 2);
    expect(calculateBmi('', '178')).toBeNull();
    expect(calculateBmi('82', '0')).toBeNull();
    expect(calculateBmi('abc', '178')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-form.test.ts
```

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implementar parsing explícito e validação Zod**

Criar `assessment-form.ts`:

```ts
import { createAssessmentSchema } from '@muvit/validators';
import type { CreateAssessmentInput } from './assessment-data';

export type AssessmentPhotoInput = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export type TrainerAssessmentMeasurements = {
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

export type TrainerAssessmentFormValues = {
  date: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  measurements: TrainerAssessmentMeasurements;
  notes: string;
};

export type BuildAssessmentInputResult =
  | { ok: true; body: CreateAssessmentInput }
  | { ok: false; message: string };

export function emptyTrainerAssessmentMeasurements(): TrainerAssessmentMeasurements {
  return {
    chest: '',
    waist: '',
    hip: '',
    armRight: '',
    armLeft: '',
    thighRight: '',
    thighLeft: '',
    calfRight: '',
    calfLeft: '',
  };
}

function parseOptionalNumber(
  label: string,
  value: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return { ok: true, value: undefined };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${label} deve ser um número válido.` };
  }

  return { ok: true, value: parsed };
}

export function buildCreateAssessmentInput(
  values: TrainerAssessmentFormValues,
  photoUrls: string[],
): BuildAssessmentInputResult {
  const scalarFields = [
    ['Peso', 'weightKg', values.weightKg],
    ['Altura', 'heightCm', values.heightCm],
    ['Gordura corporal', 'bodyFatPct', values.bodyFatPct],
  ] as const;

  const parsedScalars: Record<string, number | undefined> = {};
  for (const [label, key, rawValue] of scalarFields) {
    const parsed = parseOptionalNumber(label, rawValue);
    if (!parsed.ok) return parsed;
    parsedScalars[key] = parsed.value;
  }

  const measurementLabels: Record<keyof TrainerAssessmentMeasurements, string> = {
    chest: 'Peito',
    waist: 'Cintura',
    hip: 'Quadril',
    armRight: 'Braço direito',
    armLeft: 'Braço esquerdo',
    thighRight: 'Coxa direita',
    thighLeft: 'Coxa esquerda',
    calfRight: 'Panturrilha direita',
    calfLeft: 'Panturrilha esquerda',
  };

  const measurements: Partial<Record<keyof TrainerAssessmentMeasurements, number>> = {};
  for (const key of Object.keys(values.measurements) as Array<keyof TrainerAssessmentMeasurements>) {
    const parsed = parseOptionalNumber(measurementLabels[key], values.measurements[key]);
    if (!parsed.ok) return parsed;
    if (parsed.value !== undefined) measurements[key] = parsed.value;
  }

  const candidate = {
    date: values.date.trim(),
    weightKg: parsedScalars.weightKg,
    heightCm: parsedScalars.heightCm,
    bodyFatPct: parsedScalars.bodyFatPct,
    measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
    photos: photoUrls.length > 0 ? photoUrls : undefined,
    notes: values.notes.trim() || undefined,
  };

  const parsed = createAssessmentSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados da avaliação.',
    };
  }

  return { ok: true, body: parsed.data };
}

export function calculateBmi(weightKg: string, heightCm: string): number | null {
  const weight = Number(weightKg.replace(',', '.').trim());
  const height = Number(heightCm.replace(',', '.').trim());

  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    return null;
  }

  return weight / ((height / 100) ** 2);
}
```

- [ ] **Step 4: Rodar os testes do formulário**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-form.test.ts
```

Expected: PASS.

- [ ] **Step 5: Refatorar o adapter atual do aluno para usar `createAssessment(..., { kind: 'self' })`**

Em `new-assessment.ts`, preservar a API pública da screen atual e substituir somente o request direto:

```ts
import { createAssessment } from './assessment-data';

type AssessmentPayload = {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  photos?: string[];
  notes?: string;
};

import type { ApiRequester } from '../../lib/api';

// manter AssessmentPhotoInput, AssessmentFormValues,
// toOptionalNumber, toSupportedContentType e buildAssessmentPayload.

export async function submitAssessment({
  api,
  values,
  uploadPhoto,
  invalidateAssessments,
}: {
  api: ApiRequester;
  values: AssessmentFormValues;
  uploadPhoto: (photo: AssessmentPhotoInput) => Promise<string>;
  invalidateAssessments: () => Promise<void>;
}): Promise<void> {
  const photoUrl = values.photo ? await uploadPhoto(values.photo) : undefined;
  const payload = buildAssessmentPayload({
    date: values.date,
    weightKg: values.weightKg,
    bodyFatPct: values.bodyFatPct,
    notes: values.notes,
    photoUrl,
  });

  await createAssessment(api, { kind: 'self' }, payload);
  await invalidateAssessments();
}
```

- [ ] **Step 6: Atualizar o teste do adapter sem mudar o contrato esperado**

Em `new-assessment.test.ts`, manter os casos existentes e confirmar que o request continua exatamente:

```ts
expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
  method: 'POST',
  body: JSON.stringify({
    date: '2026-06-11',
    weightKg: 80,
    bodyFatPct: 20,
    photos: ['https://cdn.test/photo.jpg'],
    notes: undefined,
  }),
});
```

- [ ] **Step 7: Rodar regressão do domínio e da screen do aluno**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-data.test.ts src/application/assessments/assessment-form.test.ts src/application/assessments/new-assessment.test.ts src/screens/new-assessment.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commitar a unidade**

```powershell
git add apps/mobile/src/application/assessments/assessment-form.ts apps/mobile/src/application/assessments/assessment-form.test.ts apps/mobile/src/application/assessments/new-assessment.ts apps/mobile/src/application/assessments/new-assessment.test.ts
git commit -m "refactor(mobile): compartilha regras de avaliação"
```

---

### Task 3: Reorganizar a rota do aluno e adicionar entradas para avaliações

**Files:**
- Move: `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx` → `apps/mobile/app/(trainer)/trainer/students/[studentId]/index.tsx`
- Modify: `apps/mobile/src/screens/trainer-student-detail.tsx`
- Modify: `apps/mobile/src/screens/trainer-student-detail.test.tsx`

**Interfaces:**
- Consumes: rota atual `/trainer/students/[studentId]`.
- Produces: ações `Ver histórico` e `Nova avaliação` sem query extra.

- [ ] **Step 1: Atualizar o teste do detalhe do aluno para exigir as novas ações**

Adicionar ao mock:

```ts
const routerState = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
```

Substituir o caso que exigia ausência de **Nova avaliação** por:

```ts
it('abre histórico e nova avaliação sem fazer query adicional', async () => {
  const user = userEvent.setup();
  apiState.request.mockResolvedValueOnce(studentFixture());

  renderTrainerStudentDetail();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();

  expect(screen.getByText('Avaliações')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ver histórico' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Nova avaliação' })).toBeTruthy();
  expect(apiState.request).toHaveBeenCalledTimes(1);

  await user.press(screen.getByRole('button', { name: 'Ver histórico' }));
  expect(routerState.push).toHaveBeenCalledWith({
    pathname: '/trainer/students/[studentId]/assessments',
    params: { studentId: 'student-1' },
  });

  await user.press(screen.getByRole('button', { name: 'Nova avaliação' }));
  expect(routerState.push).toHaveBeenCalledWith({
    pathname: '/trainer/students/[studentId]/assessments/new',
    params: { studentId: 'student-1' },
  });
});
```

Preservar também:

```ts
expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
expect(screen.queryByRole('button', { name: 'Treinos' })).toBeNull();
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx
```

Expected: FAIL porque as ações ainda não existem.

- [ ] **Step 3: Adicionar a seção Avaliações ao detalhe sem nova query**

Em `trainer-student-detail.tsx`, depois de **Restrições**:

```tsx
<Card>
  <Text style={styles.sectionTitle}>Avaliações</Text>
  <Text style={sharedStyles.subtitle}>
    Consulte o histórico ou registre uma nova avaliação deste aluno.
  </Text>
  <AppButton
    label="Ver histórico"
    onPress={() =>
      router.push({
        pathname: '/trainer/students/[studentId]/assessments',
        params: { studentId },
      })
    }
    variant="secondary"
  />
  <AppButton
    label="Nova avaliação"
    onPress={() =>
      router.push({
        pathname: '/trainer/students/[studentId]/assessments/new',
        params: { studentId },
      })
    }
  />
</Card>
```

Não adicionar `useQuery` adicional.

- [ ] **Step 4: Mover o entrypoint preservando a URL**

Criar `apps/mobile/app/(trainer)/trainer/students/[studentId]/index.tsx`:

```tsx
import { TrainerStudentDetailScreen } from '../../../../../src/screens/trainer-student-detail';

export default function TrainerStudentDetailRoute() {
  return <TrainerStudentDetailScreen />;
}
```

Remover `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx`.

- [ ] **Step 5: Rodar os testes do detalhe e das tabs**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/role-layouts.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commitar a unidade**

```powershell
git add -A -- apps/mobile/app/'(trainer)'/trainer/students/'[studentId].tsx' apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/index.tsx apps/mobile/src/screens/trainer-student-detail.tsx apps/mobile/src/screens/trainer-student-detail.test.tsx
git commit -m "feat(mobile): integra avaliações ao detalhe do aluno"
```

---

### Task 4: Implementar histórico paginado de avaliações

**Files:**
- Create: `apps/mobile/src/components/assessments/assessment-list-item.tsx`
- Create: `apps/mobile/src/components/assessments/assessment-list-item.test.tsx`
- Create: `apps/mobile/src/screens/trainer-assessments.tsx`
- Create: `apps/mobile/src/screens/trainer-assessments.test.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/index.tsx`

**Interfaces:**
- Consumes: `Assessment`, `listAssessments`, `TRAINER_ASSESSMENTS_PAGE_SIZE`.
- Produces: histórico em `/trainer/students/:studentId/assessments` e navegação para detalhe/criação.

- [ ] **Step 1: Criar teste do item de histórico**

Criar `assessment-list-item.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { expect, it, vi } from 'vitest';
import { AssessmentListItem } from './assessment-list-item';

it('renderiza resumo acessível e dispara abertura', async () => {
  const onPress = vi.fn();
  const user = userEvent.setup();

  render(
    <AssessmentListItem
      assessment={{
        id: 'assessment-1',
        studentId: 'student-1',
        date: '2026-09-03',
        weightKg: '82.5',
        heightCm: null,
        bodyFatPct: '18.4',
        measurements: null,
        photos: null,
        notes: 'Boa evolução',
        createdAt: '2026-09-03T12:00:00.000Z',
      }}
      onPress={onPress}
    />,
  );

  expect(screen.getByText('03/09/2026')).toBeTruthy();
  expect(screen.getByText('82,5 kg')).toBeTruthy();
  expect(screen.getByText('18,4%')).toBeTruthy();
  expect(screen.getByText('Boa evolução')).toBeTruthy();

  await user.press(
    screen.getByRole('button', { name: 'Abrir avaliação de 03/09/2026' }),
  );
  expect(onPress).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Implementar o item**

Criar `assessment-list-item.tsx` com helpers locais de apresentação:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Assessment } from '../../application/assessments/assessment-data';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export function AssessmentListItem({
  assessment,
  onPress,
}: {
  assessment: Assessment;
  onPress: () => void;
}) {
  const date = formatDate(assessment.date);

  return (
    <Pressable
      accessibilityLabel={`Abrir avaliação de ${date}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Card>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.metrics}>
          <Text style={sharedStyles.subtitle}>
            Peso: {formatMetric(assessment.weightKg, 'kg')}
          </Text>
          <Text style={sharedStyles.subtitle}>
            Gordura: {formatMetric(assessment.bodyFatPct, '%')}
          </Text>
        </View>
        {assessment.notes ? (
          <Text numberOfLines={2} style={sharedStyles.subtitle}>
            {assessment.notes}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatMetric(
  value: string | number | null,
  unit: string,
): string {
  if (value === null) return 'Não informado';
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 'Não informado';
  const formatted = number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
}

const styles = StyleSheet.create({
  date: {
    color: colors.ink,
    ...typography.cardTitle,
  },
  metrics: {
    gap: spacing.xs,
  },
});
```

- [ ] **Step 3: Rodar o teste do componente**

```powershell
pnpm.cmd --dir apps/mobile test src/components/assessments/assessment-list-item.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Escrever os testes principais da screen de histórico**

Criar `trainer-assessments.test.tsx` usando o mesmo harness de `trainer-students.test.tsx`. Casos mínimos:

```tsx
it('carrega a primeira página e abre uma avaliação', async () => {
  const user = userEvent.setup();
  apiState.request.mockResolvedValueOnce({
    items: [assessmentFixture()],
    total: 1,
  });

  renderTrainerAssessments();

  expect(await screen.findByText('03/09/2026')).toBeTruthy();
  expect(apiState.request).toHaveBeenCalledWith(
    '/students/student-1/assessments?limit=25&offset=0',
    expect.any(Object),
  );

  await user.press(
    screen.getByRole('button', { name: 'Abrir avaliação de 03/09/2026' }),
  );

  expect(routerState.push).toHaveBeenCalledWith({
    pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
    params: {
      studentId: 'student-1',
      assessmentId: 'assessment-1',
    },
  });
});

it('mostra vazio e abre nova avaliação', async () => {
  const user = userEvent.setup();
  apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

  renderTrainerAssessments();

  expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Nova avaliação' }));
  expect(routerState.push).toHaveBeenCalledWith({
    pathname: '/trainer/students/[studentId]/assessments/new',
    params: { studentId: 'student-1' },
  });
});

it('carrega mais sem perder a primeira página', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({
      items: Array.from({ length: 25 }, (_, index) =>
        assessmentFixture({ id: `assessment-${index + 1}` }),
      ),
      total: 26,
    })
    .mockResolvedValueOnce({
      items: [assessmentFixture({ id: 'assessment-26', date: '2026-08-01' })],
      total: 26,
    });

  renderTrainerAssessments();
  await screen.findByRole('button', { name: 'Carregar mais' });
  await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

  expect(await screen.findByText('01/08/2026')).toBeTruthy();
  expect(apiState.request).toHaveBeenLastCalledWith(
    '/students/student-1/assessments?limit=25&offset=25',
    expect.any(Object),
  );
});
```

Adicionar também casos explícitos para:
- `studentId` ausente → **Aluno inválido** e zero requests;
- loading → **Carregando avaliações**;
- erro inicial → retry;
- erro de paginação → itens preservados + **Tentar carregar mais**;
- erro de refetch → **Não foi possível atualizar as avaliações.**;
- **Voltar para aluno** → `router.replace('/trainer/students/student-1')`.

- [ ] **Step 5: Rodar os testes para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-assessments.test.tsx
```

Expected: FAIL porque a screen ainda não existe.

- [ ] **Step 6: Implementar a screen com `useInfiniteQuery` no mesmo padrão da carteira**

Estrutura central de `trainer-assessments.tsx`:

```tsx
const query = useInfiniteQuery({
  enabled: Boolean(studentId),
  queryKey: ['trainer', 'assessments', studentId],
  initialPageParam: 0,
  queryFn: ({ pageParam, signal }) => {
    if (!studentId) throw new Error('Aluno inválido.');
    return listAssessments(
      api,
      { kind: 'student', studentId },
      {
        limit: TRAINER_ASSESSMENTS_PAGE_SIZE,
        offset: pageParam,
        signal,
      },
    );
  },
  getNextPageParam: (lastPage, pages) => {
    const loaded = pages.reduce((total, page) => total + page.items.length, 0);
    return loaded < lastPage.total ? loaded : undefined;
  },
});

const assessments = query.data?.pages.flatMap((page) => page.items) ?? [];
const total = query.data?.pages[0]?.total ?? 0;
const hasData = Boolean(query.data);
const hasPaginationError = query.isFetchNextPageError;
const hasRefreshError = query.isRefetchError && !hasPaginationError;
```

Navegação:

```tsx
function openAssessment(assessmentId: string): void {
  if (!studentId) return;

  router.push({
    pathname: '/trainer/students/[studentId]/assessments/[assessmentId]',
    params: { studentId, assessmentId },
  });
}

function openNewAssessment(): void {
  if (!studentId) return;

  router.push({
    pathname: '/trainer/students/[studentId]/assessments/new',
    params: { studentId },
  });
}

function returnToStudent(): void {
  if (!studentId) {
    router.replace('/trainer/students');
    return;
  }

  router.replace(`/trainer/students/${studentId}`);
}
```

A composição deve reutilizar `Screen`, `ScreenHeader`, `StatePanel`, `InlineMessage`, `AppButton` e `AssessmentListItem`, sem `FlatList` nesta entrega.

- [ ] **Step 7: Criar o entrypoint**

`apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/index.tsx`:

```tsx
import { TrainerAssessmentsScreen } from '../../../../../../src/screens/trainer-assessments';

export default function TrainerAssessmentsRoute() {
  return <TrainerAssessmentsScreen />;
}
```

- [ ] **Step 8: Rodar testes do histórico**

```powershell
pnpm.cmd --dir apps/mobile test src/components/assessments/assessment-list-item.test.tsx src/screens/trainer-assessments.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commitar a unidade**

```powershell
git add apps/mobile/src/components/assessments/assessment-list-item.tsx apps/mobile/src/components/assessments/assessment-list-item.test.tsx apps/mobile/src/screens/trainer-assessments.tsx apps/mobile/src/screens/trainer-assessments.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/assessments/index.tsx
git commit -m "feat(mobile): adiciona histórico de avaliações do trainer"
```

---

### Task 5: Implementar detalhe completo da avaliação

**Files:**
- Create: `apps/mobile/src/components/assessments/assessment-metric.tsx`
- Create: `apps/mobile/src/components/assessments/assessment-photo-list.tsx`
- Create: `apps/mobile/src/components/assessments/assessment-measurements-card.tsx`
- Create: `apps/mobile/src/screens/trainer-assessment-detail.tsx`
- Create: `apps/mobile/src/screens/trainer-assessment-detail.test.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/[assessmentId].tsx`

**Interfaces:**
- Consumes: `Assessment`, `getAssessment`, `ApiError`.
- Produces: detalhe read-only com proteção contra `studentId` inconsistente.

- [ ] **Step 1: Escrever os testes da screen de detalhe**

Casos essenciais em `trainer-assessment-detail.test.tsx`:

```tsx
it('renderiza métricas, medidas, fotos e observações', async () => {
  apiState.request.mockResolvedValueOnce(
    assessmentFixture({
      weightKg: '82.5',
      heightCm: '178',
      bodyFatPct: '18.4',
      measurements: {
        chest: 101.5,
        waist: 84,
      },
      photos: [
        'https://cdn.test/front.jpg',
        'https://cdn.test/back.jpg',
      ],
      notes: 'Boa evolução',
    }),
  );

  renderTrainerAssessmentDetail();

  expect(await screen.findByText('03/09/2026')).toBeTruthy();
  expect(screen.getByText('82,5 kg')).toBeTruthy();
  expect(screen.getByText('178 cm')).toBeTruthy();
  expect(screen.getByText('18,4%')).toBeTruthy();
  expect(screen.getByText('101,5 cm')).toBeTruthy();
  expect(screen.getByText('84 cm')).toBeTruthy();
  expect(screen.getByLabelText('Foto 1 da avaliação de 03/09/2026')).toBeTruthy();
  expect(screen.getByLabelText('Foto 2 da avaliação de 03/09/2026')).toBeTruthy();
  expect(screen.getByText('Boa evolução')).toBeTruthy();
});

it('não renderiza avaliação de outro aluno no contexto da URL', async () => {
  apiState.request.mockResolvedValueOnce(
    assessmentFixture({ studentId: 'student-2' }),
  );

  renderTrainerAssessmentDetail();

  expect(await screen.findByText('Avaliação indisponível')).toBeTruthy();
  expect(screen.queryByText('82,5 kg')).toBeNull();
});

it('não expõe editar ou excluir', async () => {
  apiState.request.mockResolvedValueOnce(assessmentFixture());

  renderTrainerAssessmentDetail();

  await screen.findByText('03/09/2026');
  expect(screen.queryByRole('button', { name: 'Editar avaliação' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Excluir avaliação' })).toBeNull();
});
```

Adicionar:
- params ausentes;
- loading;
- `new ApiError('not found', 404)` → **Avaliação não encontrada**;
- erro genérico + retry;
- campos todos nulos → **Não informado** sem valores inventados;
- atualização tardia falha preservando conteúdo;
- **Voltar para avaliações**.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-assessment-detail.test.tsx
```

Expected: FAIL porque a screen ainda não existe.

- [ ] **Step 3: Criar os componentes de apresentação**

`assessment-metric.tsx`:

```tsx
import { Text, View } from 'react-native';
import { sharedStyles } from '../../lib/styles';

export function AssessmentMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View>
      <Text style={sharedStyles.label}>{label}</Text>
      <Text style={sharedStyles.subtitle}>{value}</Text>
    </View>
  );
}
```

`assessment-photo-list.tsx`:

```tsx
import { Image, StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../lib/styles';

export function AssessmentPhotoList({
  dateLabel,
  photos,
}: {
  dateLabel: string;
  photos: string[];
}) {
  return (
    <View style={styles.container}>
      {photos.map((uri, index) => (
        <Image
          accessibilityLabel={`Foto ${index + 1} da avaliação de ${dateLabel}`}
          key={`${uri}-${index}`}
          resizeMode="cover"
          source={{ uri }}
          style={styles.photo}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: radii.md,
    width: '100%',
  },
});
```

`assessment-measurements-card.tsx` deve mapear exatamente:

```ts
const MEASUREMENTS = [
  ['Peito', 'chest'],
  ['Cintura', 'waist'],
  ['Quadril', 'hip'],
  ['Braço direito', 'armRight'],
  ['Braço esquerdo', 'armLeft'],
  ['Coxa direita', 'thighRight'],
  ['Coxa esquerda', 'thighLeft'],
  ['Panturrilha direita', 'calfRight'],
  ['Panturrilha esquerda', 'calfLeft'],
] as const;
```

Se `measurements === null` ou nenhum valor estiver presente, renderizar uma única linha **Não informado**.

- [ ] **Step 4: Implementar a query e os estados da screen**

Núcleo de `trainer-assessment-detail.tsx`:

```tsx
const params = useLocalSearchParams<{
  studentId?: string | string[];
  assessmentId?: string | string[];
}>();

const studentId = firstParam(params.studentId);
const assessmentId = firstParam(params.assessmentId);

const query = useQuery({
  enabled: Boolean(studentId && assessmentId),
  queryKey: ['trainer', 'assessment', assessmentId],
  queryFn: ({ signal }) => {
    if (!assessmentId) throw new Error('Avaliação inválida.');
    return getAssessment(api, assessmentId, signal);
  },
});
```

Depois do carregamento:

```tsx
if (query.data && query.data.studentId !== studentId) {
  return (
    <Screen style={styles.centeredState}>
      <StatePanel
        actionLabel="Voltar para avaliações"
        description="Esta avaliação não pertence ao aluno aberto neste contexto."
        onAction={returnToAssessments}
        title="Avaliação indisponível"
        tone="error"
      />
    </Screen>
  );
}
```

O conteúdo read-only deve ter:
- botão **Voltar para avaliações**;
- `ScreenHeader eyebrow="Avaliação" title={dateLabel}`;
- card **Métricas principais**;
- `AssessmentMeasurementsCard`;
- card **Fotos** quando houver URLs;
- card **Observações**, usando **Não informado** quando vazio;
- `InlineMessage` em `query.isRefetchError`;
- botão **Atualizar**.

- [ ] **Step 5: Criar o entrypoint**

`apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/[assessmentId].tsx`:

```tsx
import { TrainerAssessmentDetailScreen } from '../../../../../../src/screens/trainer-assessment-detail';

export default function TrainerAssessmentDetailRoute() {
  return <TrainerAssessmentDetailScreen />;
}
```

- [ ] **Step 6: Rodar os testes do detalhe**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-assessment-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commitar a unidade**

```powershell
git add apps/mobile/src/components/assessments/assessment-metric.tsx apps/mobile/src/components/assessments/assessment-photo-list.tsx apps/mobile/src/components/assessments/assessment-measurements-card.tsx apps/mobile/src/screens/trainer-assessment-detail.tsx apps/mobile/src/screens/trainer-assessment-detail.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/assessments/'[assessmentId].tsx'
git commit -m "feat(mobile): adiciona detalhe de avaliação do trainer"
```

---

### Task 6: Implementar criação completa de avaliação do treinador

**Files:**
- Create: `apps/mobile/src/screens/trainer-new-assessment.tsx`
- Create: `apps/mobile/src/screens/trainer-new-assessment.test.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/new.tsx`
- Verify: `apps/mobile/src/lib/uploads.ts`
- Verify: `apps/mobile/src/lib/uploads.test.ts`

**Interfaces:**
- Consumes: `TrainerAssessmentFormValues`, `AssessmentPhotoInput`, `buildCreateAssessmentInput`, `calculateBmi`, `createAssessment`, `uploadAssessmentPhoto`, `toSupportedContentType`, `todayIsoDate`, global `queryClient`.
- Produces: criação completa com até 3 fotos e retorno ao histórico.

- [ ] **Step 1: Escrever os testes de comportamento do formulário**

Em `trainer-new-assessment.test.tsx`, criar harness com mocks de `expo-router`, `expo-image-picker`, `useApiClient`, `queryClient` e `uploadAssessmentPhoto`.

Casos principais:

```tsx
it('envia avaliação completa e invalida histórico e summary', async () => {
  const user = userEvent.setup();

  pickerState.launchImageLibraryAsync
    .mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///front.jpg', mimeType: 'image/jpeg' }],
    })
    .mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///back.png', mimeType: 'image/png' }],
    });

  uploadState.uploadAssessmentPhoto
    .mockResolvedValueOnce('https://cdn.test/front.jpg')
    .mockResolvedValueOnce('https://cdn.test/back.png');

  apiState.request.mockResolvedValueOnce(
    assessmentFixture({ id: 'assessment-new' }),
  );
  queryState.invalidateQueries.mockResolvedValue(undefined);

  renderTrainerNewAssessment();

  await user.clear(screen.getByLabelText('Data da avaliação'));
  await user.type(screen.getByLabelText('Data da avaliação'), '2026-09-03');
  await user.type(screen.getByLabelText('Peso'), '82,5');
  await user.type(screen.getByLabelText('Altura'), '178');
  await user.type(screen.getByLabelText('Gordura corporal'), '18,4');
  await user.type(screen.getByLabelText('Peito'), '101,5');
  await user.type(screen.getByLabelText('Cintura'), '84');
  await user.type(screen.getByLabelText('Observações'), 'Boa evolução');

  await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
  await user.press(screen.getByRole('button', { name: 'Adicionar outra foto' }));
  await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

  await waitFor(() => {
    expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledTimes(2);
    expect(apiState.request).toHaveBeenCalledWith('/students/student-1/assessments', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-09-03',
        weightKg: 82.5,
        heightCm: 178,
        bodyFatPct: 18.4,
        measurements: {
          chest: 101.5,
          waist: 84,
        },
        photos: [
          'https://cdn.test/front.jpg',
          'https://cdn.test/back.png',
        ],
        notes: 'Boa evolução',
      }),
    });
  });

  expect(queryState.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['trainer', 'assessments', 'student-1'],
  });
  expect(queryState.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['trainer', 'summary'],
  });
  expect(await screen.findByText('Avaliação salva!')).toBeTruthy();
});
```

Adicionar casos explícitos:

```tsx
it('não faz upload nem POST quando a validação local falha', async () => {
  const user = userEvent.setup();

  renderTrainerNewAssessment();
  await user.type(screen.getByLabelText('Peso'), 'abc');
  await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

  expect(await screen.findByText('Peso deve ser um número válido.')).toBeTruthy();
  expect(uploadState.uploadAssessmentPhoto).not.toHaveBeenCalled();
  expect(apiState.request).not.toHaveBeenCalled();
});

it('não cria avaliação quando um upload falha', async () => {
  const user = userEvent.setup();
  pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: 'file:///front.jpg', mimeType: 'image/jpeg' }],
  });
  uploadState.uploadAssessmentPhoto.mockRejectedValueOnce(new Error('upload'));

  renderTrainerNewAssessment();
  await user.press(screen.getByRole('button', { name: 'Adicionar foto' }));
  await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));

  expect(await screen.findByText('Não foi possível enviar as fotos da avaliação.')).toBeTruthy();
  expect(apiState.request).not.toHaveBeenCalled();
});
```

Também cobrir:
- `studentId` ausente;
- data inicial com `todayIsoDate()`;
- picker cancelado;
- MIME não suportado → feedback e zero foto;
- terceira foto aceita;
- quarta tentativa bloqueada com botão desabilitado ou ausente;
- remoção da foto por label **Remover foto 1**;
- IMC visível com peso/altura e ausente sem ambos;
- submit concorrente bloqueado;
- erro de POST preserva valores e fotos;
- sucesso chama `router.replace('/trainer/students/student-1/assessments')` depois do feedback.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-new-assessment.test.tsx
```

Expected: FAIL porque a screen ainda não existe.

- [ ] **Step 3: Implementar estado inicial e helpers de medidas**

Usar:

```ts
const [values, setValues] = useState<TrainerAssessmentFormValues>({
  date: todayIsoDate(),
  weightKg: '',
  heightCm: '',
  bodyFatPct: '',
  measurements: emptyTrainerAssessmentMeasurements(),
  notes: '',
});
const [photos, setPhotos] = useState<AssessmentPhotoInput[]>([]);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string>();
const [success, setSuccess] = useState(false);
```

Atualização de campo escalar:

```ts
function setField(
  key: 'date' | 'weightKg' | 'heightCm' | 'bodyFatPct' | 'notes',
  value: string,
): void {
  setValues((current) => ({ ...current, [key]: value }));
}
```

Atualização de medida:

```ts
function setMeasurement(
  key: keyof TrainerAssessmentFormValues['measurements'],
  value: string,
): void {
  setValues((current) => ({
    ...current,
    measurements: {
      ...current.measurements,
      [key]: value,
    },
  }));
}
```

- [ ] **Step 4: Implementar seleção e remoção de fotos**

Picker:

```ts
async function pickPhoto(): Promise<void> {
  if (photos.length >= 3) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.7,
  });
  if (result.canceled) return;

  const asset = result.assets?.[0];
  const contentType = toSupportedContentType(asset?.mimeType);

  if (!asset?.uri || !contentType) {
    setError('Selecione uma imagem JPEG ou PNG.');
    return;
  }

  setError(undefined);
  setPhotos((current) => [
    ...current,
    { uri: asset.uri, contentType },
  ]);
}

function removePhoto(index: number): void {
  setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
}
```

A UI deve mostrar cada foto selecionada com texto **Foto 1**, **Foto 2**, **Foto 3** e botão acessível `Remover foto N`.

- [ ] **Step 5: Implementar submit sem upload quando validação falha**

A ordem é obrigatória:

```ts
async function submit(): Promise<void> {
  if (!studentId || submitting) return;

  setError(undefined);
  setSuccess(false);

  const validation = buildCreateAssessmentInput(values, []);
  if (!validation.ok) {
    setError(validation.message);
    return;
  }

  setSubmitting(true);

  try {
    let photoUrls: string[] = [];

    if (photos.length > 0) {
      try {
        photoUrls = await Promise.all(
          photos.map((photo) => uploadAssessmentPhoto({ api, photo })),
        );
      } catch {
        setError('Não foi possível enviar as fotos da avaliação.');
        return;
      }
    }

    const finalInput = buildCreateAssessmentInput(values, photoUrls);
    if (!finalInput.ok) {
      setError(finalInput.message);
      return;
    }

    await createAssessment(
      api,
      { kind: 'student', studentId },
      finalInput.body,
    );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'assessments', studentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'summary'],
      }),
    ]);

    setSuccess(true);
  } catch {
    setError('Não foi possível salvar a avaliação.');
  } finally {
    setSubmitting(false);
  }
}
```

Depois do sucesso, usar efeito idêntico ao padrão atual do aluno, mas com destino determinístico:

```ts
useEffect(() => {
  if (!success || !studentId) return;

  const timeout = setTimeout(() => {
    router.replace(`/trainer/students/${studentId}/assessments`);
  }, 150);

  return () => clearTimeout(timeout);
}, [studentId, success]);
```

- [ ] **Step 6: Implementar a composição visual completa**

Ordem da screen:

1. **Voltar para avaliações**;
2. `ScreenHeader title="Nova avaliação"`;
3. card **Métricas principais** com data, peso, altura, gordura e output de IMC;
4. card **Medidas de circunferência** com 9 `Field`;
5. card **Fotos de progresso** com lista local, remover e adicionar;
6. card **Observações**;
7. `InlineMessage` de erro;
8. `InlineMessage message="Avaliação salva!" tone="success"`;
9. botão **Salvar avaliação**.

IMC:

```tsx
const bmi = calculateBmi(values.weightKg, values.heightCm);

<Text style={sharedStyles.label}>IMC</Text>
<Text style={sharedStyles.subtitle}>
  {bmi === null
    ? 'Informe peso e altura'
    : bmi.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}
</Text>
```

Não adicionar classificação de IMC.

- [ ] **Step 7: Criar o entrypoint**

`apps/mobile/app/(trainer)/trainer/students/[studentId]/assessments/new.tsx`:

```tsx
import { TrainerNewAssessmentScreen } from '../../../../../../src/screens/trainer-new-assessment';

export default function TrainerNewAssessmentRoute() {
  return <TrainerNewAssessmentScreen />;
}
```

- [ ] **Step 8: Rodar os testes da criação e upload existente**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-form.test.ts src/screens/trainer-new-assessment.test.tsx src/lib/uploads.test.ts
```

Expected: PASS.

- [ ] **Step 9: Rodar a regressão da criação do aluno**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/new-assessment.test.ts src/screens/new-assessment.test.tsx
```

Expected: PASS sem mudança na rota `/students/me/assessments`.

- [ ] **Step 10: Commitar a unidade**

```powershell
git add apps/mobile/src/screens/trainer-new-assessment.tsx apps/mobile/src/screens/trainer-new-assessment.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/assessments/new.tsx
git commit -m "feat(mobile): adiciona criação de avaliação do trainer"
```

---

### Task 7: Consolidar cobertura visual e regressão completa do MUV-18

**Files:**
- Modify: `apps/mobile/vitest.ui-coverage.config.ts`
- Verify: todos os arquivos alterados nas Tasks 1–6.
- Verify: guards, tabs e fluxos de aluno/treinador existentes.

**Interfaces:**
- Não produz nova interface de domínio.
- Garante que as três screens novas entram no piso visual bloqueante.

- [ ] **Step 1: Adicionar as screens ao include de cobertura visual**

Preservar todos os includes existentes e acrescentar:

```ts
'src/screens/trainer-assessments.tsx',
'src/screens/trainer-assessment-detail.tsx',
'src/screens/trainer-new-assessment.tsx',
```

Não reduzir:

```ts
thresholds: {
  statements: 85,
  branches: 85,
  functions: 85,
  lines: 85,
},
```

- [ ] **Step 2: Rodar os testes específicos do MUV-18**

```powershell
pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-data.test.ts src/application/assessments/assessment-form.test.ts src/application/assessments/new-assessment.test.ts src/components/assessments/assessment-list-item.test.tsx src/screens/trainer-student-detail.test.tsx src/screens/trainer-assessments.test.tsx src/screens/trainer-assessment-detail.test.tsx src/screens/trainer-new-assessment.test.tsx src/lib/uploads.test.ts
```

Expected: PASS.

- [ ] **Step 3: Rodar regressão de navegação e role**

```powershell
pnpm.cmd --dir apps/mobile test src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/role-layouts.test.tsx src/__tests__/root-layout.test.tsx src/__tests__/tabs-layout.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Rodar regressão das telas anteriores do treinador**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Rodar regressão do aluno**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/progress.test.tsx src/screens/new-assessment.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Rodar a suíte mobile completa**

```powershell
pnpm.cmd --dir apps/mobile test
```

Expected: PASS.

- [ ] **Step 7: Rodar cobertura bloqueante do núcleo**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:core
```

Expected: PASS com thresholds existentes.

- [ ] **Step 8: Rodar cobertura visual crítica**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:ui
```

Expected: PASS com statements, branches, functions e lines >= 85%, incluindo as três novas screens.

- [ ] **Step 9: Rodar typecheck, Biome e Expo Doctor**

```powershell
pnpm.cmd --dir apps/mobile typecheck
pnpm.cmd exec biome check apps/mobile
pnpm.cmd --dir apps/mobile doctor
```

Expected: todos exit 0.

- [ ] **Step 10: Verificar whitespace e escapes Unicode**

```powershell
git diff --check
git diff --name-only --diff-filter=ACMR |
  ForEach-Object {
    if (Test-Path $_) {
      Select-String -Path $_ -Pattern '\\u[0-9A-Fa-f]{4}' -SimpleMatch:$false
    }
  }
```

Expected: `git diff --check` sem saída e nenhuma sequência `\uXXXX` usada para texto pt-BR.

- [ ] **Step 11: Verificar o escopo do diff**

```powershell
git diff --name-only
```

Confirmar que não aparecem caminhos sob:

```text
apps/api/
packages/db/
packages/validators/
PRODUCT.md
DESIGN.md
```

Confirmar também por busca no diff:

```powershell
git diff | Select-String -Pattern 'PATCH /assessments|DELETE /assessments|trainerId'
```

Expected: nenhuma implementação de edição/exclusão e nenhum `trainerId` enviado pelo mobile.

- [ ] **Step 12: Commitar a configuração de coverage**

```powershell
git add apps/mobile/vitest.ui-coverage.config.ts
git commit -m "test(mobile): cobre avaliações do trainer"
```

---

### Task 8: Validar manualmente o fluxo completo e preparar handoff

**Files:**
- Verify only.
- Compare implementation against `docs/superpowers/specs/2026-09-03-muv-18-trainer-student-assessments-design.md`.

**Interfaces:**
- A entrega final deve satisfazer o fluxo de treinador sem regressão do aluno e sem mudanças backend.

- [ ] **Step 1: Validar entrada pelo detalhe do aluno**

No emulador/dispositivo:

1. autenticar como `trainer`;
2. abrir **Alunos**;
3. abrir um aluno vinculado;
4. confirmar a seção **Avaliações**;
5. confirmar **Ver histórico**;
6. voltar;
7. confirmar **Nova avaliação**.

Expected: nenhuma query de avaliação ocorre apenas por abrir o detalhe do aluno.

- [ ] **Step 2: Validar histórico**

1. abrir **Ver histórico**;
2. confirmar loading inicial sem flash de conteúdo inválido;
3. confirmar itens em ordem fornecida pela API;
4. confirmar peso/gordura com fallback quando ausentes;
5. atualizar;
6. usar **Carregar mais** se o seed tiver mais de 25 avaliações;
7. confirmar **Voltar para aluno**.

Se o seed possuir <= 25 avaliações, registrar que paginação manual não se aplicou; não alterar dados somente para forçar o caso.

- [ ] **Step 3: Validar detalhe da avaliação**

1. abrir uma avaliação existente;
2. conferir data;
3. conferir peso/altura/gordura;
4. conferir medidas disponíveis;
5. conferir fotos;
6. conferir observações;
7. atualizar;
8. voltar ao histórico;
9. abrir um UUID inexistente;
10. confirmar **Avaliação não encontrada** sem exposição de tenant.

- [ ] **Step 4: Validar criação mínima**

1. abrir **Nova avaliação**;
2. deixar somente a data preenchida;
3. salvar;
4. confirmar **Avaliação salva!**;
5. confirmar retorno ao histórico;
6. confirmar o novo registro no histórico.

Expected: payload válido somente com `date`.

- [ ] **Step 5: Validar criação completa**

1. preencher peso;
2. preencher altura;
3. conferir IMC derivado;
4. preencher gordura;
5. preencher ao menos duas medidas;
6. adicionar foto JPEG;
7. adicionar foto PNG;
8. adicionar terceira foto;
9. confirmar que a quarta não pode ser adicionada;
10. remover uma foto;
11. adicionar novamente até 3;
12. preencher observações;
13. salvar;
14. confirmar retorno ao histórico;
15. abrir o registro criado;
16. conferir métricas, medidas, fotos e observações.

- [ ] **Step 6: Validar erros locais que não dependem da rede**

1. digitar `abc` em Peso;
2. tentar salvar;
3. confirmar erro local;
4. confirmar que a tela mantém os demais valores;
5. cancelar o picker;
6. confirmar que nenhuma foto foi adicionada;
7. tentar selecionar formato não suportado se o ambiente permitir;
8. confirmar mensagem JPEG/PNG.

- [ ] **Step 7: Validar regressão do aluno**

1. encerrar sessão do treinador;
2. autenticar como `student`;
3. abrir **Progresso**;
4. confirmar histórico próprio;
5. abrir **Nova avaliação**;
6. salvar uma avaliação simples ou cancelar sem mudança;
7. confirmar que o namespace `/trainer` permanece bloqueado.

- [ ] **Step 8: Registrar limitações da validação manual**

Se não for possível reproduzir:
- erro de upload;
- erro de POST;
- erro de paginação;
- cross-tenant real;
- mais de 25 avaliações;

registrar esses cenários como **cobertos por teste automatizado e não reproduzidos manualmente**. Não afirmar validação manual que não ocorreu.

- [ ] **Step 9: Revisar critérios de conclusão**

A MUV-18 só está pronta quando:

```text
- detalhe do aluno possui Ver histórico e Nova avaliação;
- histórico usa /students/:studentId/assessments com limit=25;
- paginação não perde páginas anteriores;
- detalhe usa /assessments/:id;
- mismatch assessment.studentId != route studentId não é renderizado;
- criação suporta data, peso, altura, gordura, 9 medidas, até 3 fotos e notes;
- validação local acontece antes de upload;
- falha de upload impede POST;
- criação invalida histórico e trainer summary;
- não existem editar/excluir;
- não existe trainerId enviado;
- não existe mudança em API/db/validators;
- fluxo do aluno continua em /students/me/assessments;
- testes, coverage, typecheck, Biome, Expo Doctor e diff check passam;
- validação manual foi executada ou suas limitações foram registradas.
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-03-muv-18-trainer-student-assessments.md`.

Duas opções de execução:

1. **Subagent-Driven (recomendado)** — usar `superpowers:subagent-driven-development`, um worker novo por task e revisão entre tasks.
2. **Inline Execution** — usar `superpowers:executing-plans`, executando em lotes com checkpoints.
