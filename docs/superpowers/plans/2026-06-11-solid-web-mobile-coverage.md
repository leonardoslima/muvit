# SOLID Web Mobile Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply SOLID boundaries and minimum 85% coverage enforcement to the testable core of `apps/web` and `apps/mobile`, while publishing broad app coverage as a visible non-blocking metric.

**Architecture:** Extract application rules from UI, Server Actions, and Expo screens into small modules under `src/application`. Keep UI as composition/rendering, keep concrete framework APIs at the edge, and enforce the boundary with architecture tests.

**Tech Stack:** TypeScript, Next.js App Router, Expo Router, React, React Native, Vitest, V8 coverage, Biome, Turborepo, pnpm.

**Status auditado em 2026-06-17:** implementado. Todos os artefatos planejados em `apps/web` e `apps/mobile` existem, os pontos de integração delegam regras para `src/application` ou `src/lib`, as regras locais foram registradas nos `AGENTS.md` dos apps e os scripts de cobertura core/global foram adicionados. Evidência local desta auditoria: `pnpm.cmd --dir apps/web test:coverage:core` passou com 20 arquivos de teste e 54 testes; `pnpm.cmd --dir apps/mobile test:coverage:core` passou com 15 arquivos de teste e 61 testes; `pnpm.cmd --dir apps/web test:coverage` e `pnpm.cmd --dir apps/mobile test:coverage` passam como métricas amplas não bloqueantes.

---

## File Structure

Create these web application modules:

- `apps/web/src/application/form-data.ts` - shared pure readers for `FormData`.
- `apps/web/src/application/http/headers.ts` - pure conversion from generated-client header config to `Headers`.
- `apps/web/src/application/students/student-form.ts` - student form state, payload builders and validation.
- `apps/web/src/application/assessments/assessment-form-data.ts` - assessment payload builder.
- `apps/web/src/application/uploads/presign-upload.ts` - presign response validation and fetch adapter.
- `apps/web/src/application/workouts/workout-editor-model.ts` - pure editor state transitions and payload builder.

Create these web tests:

- `apps/web/src/application/form-data.test.ts`
- `apps/web/src/application/http/headers.test.ts`
- `apps/web/src/application/students/student-form.test.ts`
- `apps/web/src/application/assessments/assessment-form-data.test.ts`
- `apps/web/src/application/uploads/presign-upload.test.ts`
- `apps/web/src/application/workouts/workout-editor-model.test.ts`
- `apps/web/test/solid-architecture.test.ts`

Modify these web files:

- `apps/web/src/components/student-form.tsx` - import `StudentFormState` from application module.
- `apps/web/src/app/(app)/students/new/actions.ts` - delegate parsing to `buildCreateStudentBody`.
- `apps/web/src/app/(app)/students/[id]/actions.ts` - delegate parsing to `buildUpdateStudentBody`.
- `apps/web/src/app/(app)/students/[id]/assessments/actions.ts` - delegate payload and presign helpers.
- `apps/web/src/app/(app)/onboarding/actions.ts` - reuse `headersFromConfig`.
- `apps/web/src/app/(app)/workouts/new/_editor.tsx` - delegate state transitions and payload build.
- `apps/web/src/app/(app)/workouts/new/actions.ts` - import `CreateWorkoutInput` from application module.
- `apps/web/package.json` - add coverage scripts and explicit coverage provider dependency.
- `apps/web/vitest.coverage.config.ts` - blocking 85% core coverage.
- `apps/web/vitest.global-coverage.config.ts` - broad non-blocking app coverage.
- `apps/web/AGENTS.md` - document recurring SOLID boundaries.

Create these mobile application modules:

- `apps/mobile/src/application/workouts/today-workout.ts` - active plan selection and today workout loading.
- `apps/mobile/src/application/workouts/workout-log.ts` - set state, finish payload and offline fallback orchestration.
- `apps/mobile/src/application/assessments/new-assessment.ts` - assessment payload, supported photo type and submit orchestration.

Create these mobile tests:

- `apps/mobile/src/application/workouts/today-workout.test.ts`
- `apps/mobile/src/application/workouts/workout-log.test.ts`
- `apps/mobile/src/application/assessments/new-assessment.test.ts`
- `apps/mobile/test/solid-architecture.test.ts`

Modify these mobile files:

- `apps/mobile/src/screens/today-workout.tsx` - delegate workout loading to application service.
- `apps/mobile/src/screens/log-workout.tsx` - delegate set building, grouping, numeric parsing and finish fallback.
- `apps/mobile/src/screens/new-assessment.tsx` - delegate payload and submit orchestration.
- `apps/mobile/package.json` - add coverage scripts and explicit coverage provider dependency.
- `apps/mobile/vitest.coverage.config.ts` - blocking 85% core coverage.
- `apps/mobile/vitest.global-coverage.config.ts` - broad non-blocking app coverage.
- `apps/mobile/AGENTS.md` - document recurring SOLID boundaries.

---

### Task 1: Web FormData Core and Student Actions

**Files:**
- Create: `apps/web/src/application/form-data.ts`
- Create: `apps/web/src/application/form-data.test.ts`
- Create: `apps/web/src/application/students/student-form.ts`
- Create: `apps/web/src/application/students/student-form.test.ts`
- Modify: `apps/web/src/components/student-form.tsx`
- Modify: `apps/web/src/app/(app)/students/new/actions.ts`
- Modify: `apps/web/src/app/(app)/students/[id]/actions.ts`

- [x] **Step 1: Write failing tests for shared FormData readers**

Create `apps/web/src/application/form-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readOptionalNumber, readOptionalTrimmed, readTrimmed } from './form-data';

describe('form-data readers', () => {
  it('trims required and optional string values', () => {
    const formData = new FormData();
    formData.set('name', '  Ana  ');
    formData.set('empty', '   ');

    expect(readTrimmed(formData, 'name')).toBe('Ana');
    expect(readOptionalTrimmed(formData, 'name')).toBe('Ana');
    expect(readOptionalTrimmed(formData, 'empty')).toBeUndefined();
    expect(readOptionalTrimmed(formData, 'missing')).toBeUndefined();
  });

  it('normalizes optional numeric values with comma or dot', () => {
    const formData = new FormData();
    formData.set('weightKg', '72,5');
    formData.set('heightCm', '180.2');
    formData.set('invalid', 'abc');

    expect(readOptionalNumber(formData, 'weightKg')).toBe(72.5);
    expect(readOptionalNumber(formData, 'heightCm')).toBe(180.2);
    expect(readOptionalNumber(formData, 'invalid')).toBeUndefined();
    expect(readOptionalNumber(formData, 'missing')).toBeUndefined();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/form-data.test.ts`

Expected: FAIL because `src/application/form-data.ts` does not exist.

- [x] **Step 2: Implement shared FormData readers**

Create `apps/web/src/application/form-data.ts`:

```ts
export function readTrimmed(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function readOptionalTrimmed(formData: FormData, key: string): string | undefined {
  const value = readTrimmed(formData, key);
  return value ? value : undefined;
}

export function readOptionalNumber(formData: FormData, key: string): number | undefined {
  const value = readTrimmed(formData, key).replace(',', '.');
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
```

- [x] **Step 3: Run FormData tests**

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/form-data.test.ts`

Expected: PASS.

- [x] **Step 4: Write failing tests for student form payload builders**

Create `apps/web/src/application/students/student-form.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCreateStudentBody, buildUpdateStudentBody } from './student-form';

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe('student form builders', () => {
  it('requires a name when creating a student', () => {
    const result = buildCreateStudentBody(formDataFrom({ name: 'A' }));

    expect(result).toEqual({ ok: false, state: { fieldErrors: { name: 'Informe o nome.' } } });
  });

  it('builds a create payload with optional fields trimmed', () => {
    const result = buildCreateStudentBody(
      formDataFrom({
        name: '  Ana Souza  ',
        email: ' ana@example.com ',
        phone: ' ',
        gender: 'female',
        status: 'paused',
      }),
    );

    expect(result).toEqual({
      ok: true,
      body: {
        name: 'Ana Souza',
        email: 'ana@example.com',
        phone: undefined,
        birthDate: undefined,
        gender: 'female',
        goals: undefined,
        restrictions: undefined,
        status: 'paused',
      },
    });
  });

  it('requires id when updating a student', () => {
    const result = buildUpdateStudentBody(formDataFrom({ name: 'Ana Souza' }));

    expect(result).toEqual({ ok: false, state: { error: 'ID do aluno ausente.' } });
  });

  it('builds an update payload without defaulting status', () => {
    const result = buildUpdateStudentBody(
      formDataFrom({ id: 'student-id', name: ' Ana ', status: '', gender: '' }),
    );

    expect(result).toEqual({
      ok: true,
      id: 'student-id',
      body: {
        name: 'Ana',
        email: undefined,
        phone: undefined,
        birthDate: undefined,
        gender: undefined,
        goals: undefined,
        restrictions: undefined,
        status: undefined,
      },
    });
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/students/student-form.test.ts`

Expected: FAIL because `student-form.ts` does not exist.

- [x] **Step 5: Implement student form payload builders**

Create `apps/web/src/application/students/student-form.ts`:

```ts
import { readOptionalTrimmed, readTrimmed } from '../form-data';

export type StudentFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export type StudentGender = 'male' | 'female' | 'other';
export type StudentStatus = 'active' | 'inactive' | 'paused';

type StudentBody = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: StudentGender;
  goals?: string;
  restrictions?: string;
  status?: StudentStatus;
};

type CreateStudentBody = StudentBody & {
  name: string;
  status: StudentStatus;
};

type CreateStudentResult = { ok: true; body: CreateStudentBody } | { ok: false; state: StudentFormState };
type UpdateStudentResult = { ok: true; id: string; body: StudentBody } | { ok: false; state: StudentFormState };

const studentGenders = new Set<StudentGender>(['male', 'female', 'other']);
const studentStatuses = new Set<StudentStatus>(['active', 'inactive', 'paused']);

export function buildCreateStudentBody(formData: FormData): CreateStudentResult {
  const name = readTrimmed(formData, 'name');
  if (name.length < 2) return { ok: false, state: { fieldErrors: { name: 'Informe o nome.' } } };

  return {
    ok: true,
    body: {
      name,
      email: readOptionalTrimmed(formData, 'email'),
      phone: readOptionalTrimmed(formData, 'phone'),
      birthDate: readOptionalTrimmed(formData, 'birthDate'),
      gender: readStudentGender(formData),
      goals: readOptionalTrimmed(formData, 'goals'),
      restrictions: readOptionalTrimmed(formData, 'restrictions'),
      status: readStudentStatus(formData) ?? 'active',
    },
  };
}

export function buildUpdateStudentBody(formData: FormData): UpdateStudentResult {
  const id = readTrimmed(formData, 'id');
  if (!id) return { ok: false, state: { error: 'ID do aluno ausente.' } };

  return {
    ok: true,
    id,
    body: {
      name: readOptionalTrimmed(formData, 'name'),
      email: readOptionalTrimmed(formData, 'email'),
      phone: readOptionalTrimmed(formData, 'phone'),
      birthDate: readOptionalTrimmed(formData, 'birthDate'),
      gender: readStudentGender(formData),
      goals: readOptionalTrimmed(formData, 'goals'),
      restrictions: readOptionalTrimmed(formData, 'restrictions'),
      status: readStudentStatus(formData),
    },
  };
}

function readStudentGender(formData: FormData): StudentGender | undefined {
  const value = readOptionalTrimmed(formData, 'gender');
  return value && studentGenders.has(value as StudentGender) ? (value as StudentGender) : undefined;
}

function readStudentStatus(formData: FormData): StudentStatus | undefined {
  const value = readOptionalTrimmed(formData, 'status');
  return value && studentStatuses.has(value as StudentStatus) ? (value as StudentStatus) : undefined;
}
```

- [x] **Step 6: Move `StudentFormState` consumption out of the component**

Modify `apps/web/src/components/student-form.tsx`:

```ts
import type { StudentFormState } from '@/application/students/student-form';
```

Remove the local `export type StudentFormState = ...` declaration from the same file.

- [x] **Step 7: Refactor create student action**

Modify `apps/web/src/app/(app)/students/new/actions.ts`:

```ts
'use server';

import { buildCreateStudentBody, type StudentFormState } from '@/application/students/student-form';
import { configureServerClient } from '@/lib/api-client';
import { postStudents } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createStudentAction(
  _: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = buildCreateStudentBody(formData);
  if (!input.ok) return input.state;

  const client = await configureServerClient();
  const res = await postStudents({ client, body: input.body });
  if (res.error || !res.data) {
    return { error: 'Nao foi possivel cadastrar o aluno.' };
  }
  revalidatePath('/students');
  redirect(`/students/${res.data.id}`);
}
```

- [x] **Step 8: Refactor update student action**

Modify `apps/web/src/app/(app)/students/[id]/actions.ts`:

```ts
'use server';

import { buildUpdateStudentBody, type StudentFormState } from '@/application/students/student-form';
import { configureServerClient } from '@/lib/api-client';
import { deleteStudentsById, patchStudentsById } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateStudentAction(
  _: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = buildUpdateStudentBody(formData);
  if (!input.ok) return input.state;

  const client = await configureServerClient();
  const res = await patchStudentsById({ client, path: { id: input.id }, body: input.body });
  if (res.error || !res.data) return { error: 'Falha ao atualizar.' };
  revalidatePath(`/students/${input.id}`);
  revalidatePath('/students');
  return null;
}

export async function deleteStudentAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const client = await configureServerClient();
  await deleteStudentsById({ client, path: { id } });
  revalidatePath('/students');
  redirect('/students');
}
```

- [x] **Step 9: Run focused web tests and typecheck**

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/form-data.test.ts src/application/students/student-form.test.ts`

Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`

Expected: PASS.

- [x] **Step 10: Commit**

```bash
git add apps/web/src/application/form-data.ts apps/web/src/application/form-data.test.ts apps/web/src/application/students/student-form.ts apps/web/src/application/students/student-form.test.ts apps/web/src/components/student-form.tsx apps/web/src/app/(app)/students/new/actions.ts apps/web/src/app/(app)/students/[id]/actions.ts
git commit -m "refactor(web): extrai regras de formulario de aluno"
```

### Task 2: Web Assessment and Upload Application Boundaries

**Files:**
- Create: `apps/web/src/application/http/headers.ts`
- Create: `apps/web/src/application/http/headers.test.ts`
- Create: `apps/web/src/application/assessments/assessment-form-data.ts`
- Create: `apps/web/src/application/assessments/assessment-form-data.test.ts`
- Create: `apps/web/src/application/uploads/presign-upload.ts`
- Create: `apps/web/src/application/uploads/presign-upload.test.ts`
- Modify: `apps/web/src/app/(app)/students/[id]/assessments/actions.ts`
- Modify: `apps/web/src/app/(app)/onboarding/actions.ts`

- [x] **Step 1: Write failing tests for header conversion**

Create `apps/web/src/application/http/headers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { headersFromConfig } from './headers';

describe('headersFromConfig', () => {
  it('copies headers from Headers', () => {
    const source = new Headers({ authorization: 'Bearer token' });
    const headers = headersFromConfig(source);

    expect(headers.get('authorization')).toBe('Bearer token');
  });

  it('copies headers from array and object values', () => {
    const fromArray = headersFromConfig([['x-app', 'muvit']]);
    const fromObject = headersFromConfig({ authorization: 'Bearer token', ignored: 10 });

    expect(fromArray.get('x-app')).toBe('muvit');
    expect(fromObject.get('authorization')).toBe('Bearer token');
    expect(fromObject.has('ignored')).toBe(false);
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/http/headers.test.ts`

Expected: FAIL because `headers.ts` does not exist.

- [x] **Step 2: Implement header conversion**

Create `apps/web/src/application/http/headers.ts`:

```ts
export function headersFromConfig(value: unknown): Headers {
  const headers = new Headers();

  if (value instanceof Headers) {
    value.forEach((headerValue, headerName) => headers.set(headerName, headerValue));
    return headers;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string'
      ) {
        headers.set(entry[0], entry[1]);
      }
    }
    return headers;
  }

  if (value !== null && typeof value === 'object') {
    for (const [headerName, headerValue] of Object.entries(value)) {
      if (typeof headerValue === 'string') headers.set(headerName, headerValue);
    }
  }

  return headers;
}
```

- [x] **Step 3: Write failing tests for assessment payload builder**

Create `apps/web/src/application/assessments/assessment-form-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildAssessmentPayload } from './assessment-form-data';

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe('buildAssessmentPayload', () => {
  it('requires date', () => {
    expect(buildAssessmentPayload(formDataFrom({ date: '' }))).toEqual({
      ok: false,
      state: { error: 'Informe a data.' },
    });
  });

  it('omits measurements when all values are empty', () => {
    const result = buildAssessmentPayload(formDataFrom({ date: '2026-06-11', notes: '  ok  ' }));

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-06-11',
        weightKg: undefined,
        heightCm: undefined,
        bodyFatPct: undefined,
        measurements: undefined,
        photos: undefined,
        notes: 'ok',
      },
    });
  });

  it('includes numeric measurements and optional photo', () => {
    const result = buildAssessmentPayload(
      formDataFrom({ date: '2026-06-11', weightKg: '80,5', chest: '100' }),
      'https://cdn.muvit.test/photo.jpg',
    );

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-06-11',
        weightKg: 80.5,
        heightCm: undefined,
        bodyFatPct: undefined,
        measurements: {
          chest: 100,
          waist: undefined,
          hip: undefined,
          armRight: undefined,
          armLeft: undefined,
          thighRight: undefined,
          thighLeft: undefined,
        },
        photos: ['https://cdn.muvit.test/photo.jpg'],
        notes: undefined,
      },
    });
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/assessments/assessment-form-data.test.ts`

Expected: FAIL because `assessment-form-data.ts` does not exist.

- [x] **Step 4: Implement assessment payload builder**

Create `apps/web/src/application/assessments/assessment-form-data.ts`:

```ts
import { readOptionalNumber, readOptionalTrimmed, readTrimmed } from '../form-data';

export type AssessmentState = { error?: string } | null;

type AssessmentMeasurements = {
  chest?: number;
  waist?: number;
  hip?: number;
  armRight?: number;
  armLeft?: number;
  thighRight?: number;
  thighLeft?: number;
};

type AssessmentBody = {
  date: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  measurements?: AssessmentMeasurements;
  photos?: string[];
  notes?: string;
};

type AssessmentPayloadResult = { ok: true; body: AssessmentBody } | { ok: false; state: AssessmentState };

export function buildAssessmentPayload(
  formData: FormData,
  photoUrl?: string,
): AssessmentPayloadResult {
  const date = readTrimmed(formData, 'date');
  if (!date) return { ok: false, state: { error: 'Informe a data.' } };

  const measurements: AssessmentMeasurements = {
    chest: readOptionalNumber(formData, 'chest'),
    waist: readOptionalNumber(formData, 'waist'),
    hip: readOptionalNumber(formData, 'hip'),
    armRight: readOptionalNumber(formData, 'armRight'),
    armLeft: readOptionalNumber(formData, 'armLeft'),
    thighRight: readOptionalNumber(formData, 'thighRight'),
    thighLeft: readOptionalNumber(formData, 'thighLeft'),
  };
  const hasMeasurements = Object.values(measurements).some((value) => value !== undefined);

  return {
    ok: true,
    body: {
      date,
      weightKg: readOptionalNumber(formData, 'weightKg'),
      heightCm: readOptionalNumber(formData, 'heightCm'),
      bodyFatPct: readOptionalNumber(formData, 'bodyFatPct'),
      measurements: hasMeasurements ? measurements : undefined,
      photos: photoUrl ? [photoUrl] : undefined,
      notes: readOptionalTrimmed(formData, 'notes'),
    },
  };
}
```

- [x] **Step 5: Write failing tests for presign upload adapter**

Create `apps/web/src/application/uploads/presign-upload.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { presignUpload } from './presign-upload';

describe('presignUpload', () => {
  it('posts to the API base URL with configured headers', async () => {
    const client = {
      getConfig: () => ({
        baseUrl: 'https://api.muvit.test/',
        headers: { authorization: 'Bearer token' },
      }),
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://r2.test/upload',
          publicUrl: 'https://cdn.test/photo.jpg',
          fields: {},
        }),
        { status: 200 },
      ),
    );

    await expect(
      presignUpload({
        client,
        body: { kind: 'assessment-photo', contentType: 'image/jpeg' },
        fetcher,
      }),
    ).resolves.toEqual({
      uploadUrl: 'https://r2.test/upload',
      publicUrl: 'https://cdn.test/photo.jpg',
      fields: {},
    });

    expect(fetcher).toHaveBeenCalledWith('https://api.muvit.test/uploads/presign', {
      method: 'POST',
      headers: expect.any(Headers),
      body: JSON.stringify({ kind: 'assessment-photo', contentType: 'image/jpeg' }),
    });
  });

  it('rejects invalid presign payloads', async () => {
    const client = { getConfig: () => ({ baseUrl: 'https://api.muvit.test' }) };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    await expect(
      presignUpload({
        client,
        body: { kind: 'assessment-photo', contentType: 'image/jpeg' },
        fetcher,
      }),
    ).rejects.toThrow('invalid presign response');
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/uploads/presign-upload.test.ts`

Expected: FAIL because `presign-upload.ts` does not exist.

- [x] **Step 6: Implement presign upload adapter**

Create `apps/web/src/application/uploads/presign-upload.ts`:

```ts
import { headersFromConfig } from '../http/headers';

type UploadKind = 'assessment-photo' | 'avatar';
type SupportedContentType = 'image/jpeg' | 'image/png';

export type PresignUploadInput = {
  kind: UploadKind;
  contentType: SupportedContentType;
};

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  fields: Record<string, never>;
};

type ClientWithConfig = {
  getConfig: () => {
    baseUrl?: string;
    headers?: unknown;
  };
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function presignUpload({
  client,
  body,
  fetcher = fetch,
}: {
  client: ClientWithConfig;
  body: PresignUploadInput;
  fetcher?: Fetcher;
}): Promise<PresignedUpload> {
  const config = client.getConfig();
  const baseUrl = String(config.baseUrl ?? 'http://localhost:3333').replace(/\/$/, '');
  const headers = headersFromConfig(config.headers);
  headers.set('content-type', 'application/json');

  const response = await fetcher(`${baseUrl}/uploads/presign`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('presign failed');

  const payload: unknown = await response.json();
  if (!isPresignedUpload(payload)) throw new Error('invalid presign response');
  return payload;
}

function isPresignedUpload(value: unknown): value is PresignedUpload {
  return (
    value !== null &&
    typeof value === 'object' &&
    'uploadUrl' in value &&
    'publicUrl' in value &&
    typeof value.uploadUrl === 'string' &&
    typeof value.publicUrl === 'string'
  );
}
```

- [x] **Step 7: Refactor assessment action and onboarding action**

Modify `apps/web/src/app/(app)/students/[id]/assessments/actions.ts` so it imports:

```ts
import {
  buildAssessmentPayload,
  type AssessmentState,
} from '@/application/assessments/assessment-form-data';
import { presignUpload } from '@/application/uploads/presign-upload';
```

The action body should use:

```ts
const client = await configureServerClient();
const photo = formData.get('photo');
let photoUrl: string | undefined;

if (photo instanceof File && photo.size > 0) {
  try {
    photoUrl = await uploadFileWithPresignedUrl({
      file: photo,
      kind: 'assessment-photo',
      presign: (body) => presignUpload({ client, body }),
    });
  } catch {
    return { error: 'Falha ao enviar foto da avaliacao.' };
  }
}

const input = buildAssessmentPayload(formData, photoUrl);
if (!input.ok) return input.state;

const res = await postStudentsByStudentIdAssessments({
  client,
  path: { studentId },
  body: input.body,
});
```

Remove local `num`, `presignUpload`, `isPresignedUpload` and `headersFromConfig`.

Modify `apps/web/src/app/(app)/onboarding/actions.ts` to import:

```ts
import { headersFromConfig } from '@/application/http/headers';
```

Remove the local `headersFromConfig` function from that action file.

- [x] **Step 8: Run focused web tests and typecheck**

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/http/headers.test.ts src/application/assessments/assessment-form-data.test.ts src/application/uploads/presign-upload.test.ts src/lib/uploads.test.ts`

Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`

Expected: PASS.

- [x] **Step 9: Commit**

```bash
git add apps/web/src/application/http apps/web/src/application/assessments apps/web/src/application/uploads apps/web/src/app/(app)/students/[id]/assessments/actions.ts apps/web/src/app/(app)/onboarding/actions.ts
git commit -m "refactor(web): isola regras de avaliacao e upload"
```

### Task 3: Web Workout Editor Model

**Files:**
- Create: `apps/web/src/application/workouts/workout-editor-model.ts`
- Create: `apps/web/src/application/workouts/workout-editor-model.test.ts`
- Modify: `apps/web/src/app/(app)/workouts/new/_editor.tsx`
- Modify: `apps/web/src/app/(app)/workouts/new/actions.ts`

- [x] **Step 1: Write failing tests for workout editor model**

Create `apps/web/src/application/workouts/workout-editor-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addWorkoutDay,
  addWorkoutExercise,
  buildCreateWorkoutInput,
  createWorkoutDay,
  moveWorkoutExercise,
  removeWorkoutDay,
  validateWorkoutDraft,
} from './workout-editor-model';

const exercise = { id: 'exercise-id', name: 'Supino', muscleGroup: 'chest' as const };

describe('workout editor model', () => {
  it('adds days until the seven-day limit', () => {
    const ids = Array.from({ length: 8 }, (_, index) => `day-${index}`);
    let index = 0;
    const nextId = () => ids[index++] ?? 'extra';
    const days = Array.from({ length: 7 }, (_, dayIndex) =>
      createWorkoutDay(`Treino ${dayIndex + 1}`, nextId),
    );

    expect(addWorkoutDay(days, nextId)).toHaveLength(7);
  });

  it('does not remove the last remaining day', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(removeWorkoutDay([day], 0)).toEqual([day]);
  });

  it('adds and moves exercises inside a day', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const withFirst = addWorkoutExercise([day], 0, exercise);
    const withSecond = addWorkoutExercise(withFirst, 0, {
      id: 'second-id',
      name: 'Remada',
      muscleGroup: 'back',
    });

    const moved = moveWorkoutExercise(withSecond, 0, 1, -1);

    expect(moved[0]?.exercises.map((item) => item.exerciseName)).toEqual(['Remada', 'Supino']);
  });

  it('validates required plan data', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');

    expect(validateWorkoutDraft('', [day])).toEqual('Informe um nome para o treino.');
    expect(validateWorkoutDraft('Plano', [day])).toEqual('Cada dia precisa ter ao menos 1 exercicio.');
  });

  it('builds create workout payload', () => {
    const day = createWorkoutDay('Treino A', () => 'day-a');
    const days = addWorkoutExercise([day], 0, exercise);

    expect(
      buildCreateWorkoutInput({
        studentId: 'student-id',
        name: ' Hipertrofia ',
        notes: ' ',
        status: 'active',
        days,
      }),
    ).toEqual({
      studentId: 'student-id',
      name: 'Hipertrofia',
      notes: undefined,
      status: 'active',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: 'exercise-id',
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
              restSeconds: undefined,
              loadKg: undefined,
              notes: undefined,
            },
          ],
        },
      ],
    });
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/workouts/workout-editor-model.test.ts`

Expected: FAIL because `workout-editor-model.ts` does not exist.

- [x] **Step 2: Implement workout editor model**

Create `apps/web/src/application/workouts/workout-editor-model.ts`:

```ts
import type { MuscleGroup } from '@/lib/muscle-groups';

export type ExerciseLite = { id: string; name: string; muscleGroup: MuscleGroup };

export type WorkoutExerciseState = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restSeconds?: number;
  loadKg?: number;
  notes?: string;
};

export type WorkoutDayState = {
  id: string;
  label: string;
  exercises: WorkoutExerciseState[];
};

export type WorkoutStatus = 'draft' | 'active' | 'archived';

export type CreateWorkoutInput = {
  studentId: string;
  name: string;
  notes?: string;
  status: WorkoutStatus;
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
      tempo?: string;
      notes?: string;
    }>;
  }>;
};

const defaultLabels = ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Treino E', 'Treino F', 'Treino G'];

export function createWorkoutDay(label: string, createId: () => string): WorkoutDayState {
  return { id: createId(), label, exercises: [] };
}

export function addWorkoutDay(days: WorkoutDayState[], createId: () => string): WorkoutDayState[] {
  if (days.length >= 7) return days;
  return [...days, createWorkoutDay(defaultLabels[days.length] ?? `Treino ${days.length + 1}`, createId)];
}

export function removeWorkoutDay(days: WorkoutDayState[], index: number): WorkoutDayState[] {
  if (days.length === 1) return days;
  return days.filter((_, dayIndex) => dayIndex !== index);
}

export function updateWorkoutDayLabel(
  days: WorkoutDayState[],
  index: number,
  label: string,
): WorkoutDayState[] {
  return days.map((day, dayIndex) => (dayIndex === index ? { ...day, label } : day));
}

export function addWorkoutExercise(
  days: WorkoutDayState[],
  activeDay: number,
  exercise: ExerciseLite,
): WorkoutDayState[] {
  return days.map((day, dayIndex) =>
    dayIndex === activeDay
      ? {
          ...day,
          exercises: [
            ...day.exercises,
            {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              muscleGroup: exercise.muscleGroup,
              sets: 3,
              reps: '10',
            },
          ],
        }
      : day,
  );
}

export function removeWorkoutExercise(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) =>
    currentDayIndex === dayIndex
      ? { ...day, exercises: day.exercises.filter((_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex) }
      : day,
  );
}

export function moveWorkoutExercise(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
  direction: -1 | 1,
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) => {
    if (currentDayIndex !== dayIndex) return day;
    const next = [...day.exercises];
    const targetIndex = exerciseIndex + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return day;
    const current = next[exerciseIndex];
    const target = next[targetIndex];
    if (!current || !target) return day;
    next[exerciseIndex] = target;
    next[targetIndex] = current;
    return { ...day, exercises: next };
  });
}

export function updateWorkoutExercise<K extends keyof WorkoutExerciseState>(
  days: WorkoutDayState[],
  dayIndex: number,
  exerciseIndex: number,
  key: K,
  value: WorkoutExerciseState[K],
): WorkoutDayState[] {
  return days.map((day, currentDayIndex) =>
    currentDayIndex === dayIndex
      ? {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) =>
            currentExerciseIndex === exerciseIndex ? { ...exercise, [key]: value } : exercise,
          ),
        }
      : day,
  );
}

export function validateWorkoutDraft(name: string, days: WorkoutDayState[]): string | null {
  if (!name.trim()) return 'Informe um nome para o treino.';
  if (days.some((day) => day.exercises.length === 0)) return 'Cada dia precisa ter ao menos 1 exercicio.';
  return null;
}

export function buildCreateWorkoutInput({
  studentId,
  name,
  notes,
  status,
  days,
}: {
  studentId: string;
  name: string;
  notes: string;
  status: WorkoutStatus;
  days: WorkoutDayState[];
}): CreateWorkoutInput {
  return {
    studentId,
    name: name.trim(),
    notes: notes.trim() || undefined,
    status,
    days: days.map((day, dayIndex) => ({
      label: day.label,
      dayOrder: dayIndex,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.exerciseId,
        exerciseOrder: exerciseIndex,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        loadKg: exercise.loadKg,
        notes: exercise.notes,
      })),
    })),
  };
}
```

- [x] **Step 3: Refactor workout editor imports and state helpers**

Modify `apps/web/src/app/(app)/workouts/new/_editor.tsx`:

```ts
import {
  type ExerciseLite,
  type WorkoutDayState,
  addWorkoutDay,
  addWorkoutExercise,
  buildCreateWorkoutInput,
  createWorkoutDay,
  moveWorkoutExercise,
  removeWorkoutDay,
  removeWorkoutExercise,
  updateWorkoutDayLabel,
  updateWorkoutExercise,
  validateWorkoutDraft,
} from '@/application/workouts/workout-editor-model';
```

Remove local `ExerciseLite`, `DayState`, `DEFAULT_LABELS`, and `createDay`.

Add near the top of `WorkoutEditor`:

```ts
const createDay = (label: string) => createWorkoutDay(label, () => crypto.randomUUID());
```

Change the days state:

```ts
const [days, setDays] = useState<WorkoutDayState[]>([createDay('Treino A')]);
```

Replace local handlers with these delegating handlers:

```ts
function addDay() {
  if (days.length >= 7) return;
  setDays((current) => addWorkoutDay(current, () => crypto.randomUUID()));
  setActiveDay(days.length);
}

function removeDay(idx: number) {
  setDays((current) => removeWorkoutDay(current, idx));
  setActiveDay(0);
}

function updateDayLabel(idx: number, label: string) {
  setDays((current) => updateWorkoutDayLabel(current, idx, label));
}

function addExercise(exercise: ExerciseLite) {
  setDays((current) => addWorkoutExercise(current, activeDay, exercise));
  setPickerOpen(false);
}

function removeExercise(dayIdx: number, exIdx: number) {
  setDays((current) => removeWorkoutExercise(current, dayIdx, exIdx));
}

function moveExercise(dayIdx: number, exIdx: number, dir: -1 | 1) {
  setDays((current) => moveWorkoutExercise(current, dayIdx, exIdx, dir));
}

function updateEx<K extends keyof WorkoutDayState['exercises'][number]>(
  dayIdx: number,
  exIdx: number,
  key: K,
  value: WorkoutDayState['exercises'][number][K],
) {
  setDays((current) => updateWorkoutExercise(current, dayIdx, exIdx, key, value));
}
```

Replace payload construction inside `save`:

```ts
const validationError = validateWorkoutDraft(planName, days);
if (validationError) return setError(validationError);

startTransition(async () => {
  const res = await createWorkoutPlanAction(
    buildCreateWorkoutInput({
      studentId,
      name: planName,
      notes,
      status,
      days,
    }),
  );
  if (res?.error) setError(res.error);
});
```

- [x] **Step 4: Reuse `CreateWorkoutInput` in the action**

Modify `apps/web/src/app/(app)/workouts/new/actions.ts`:

```ts
import type { CreateWorkoutInput } from '@/application/workouts/workout-editor-model';
```

Remove the local `export type CreateWorkoutInput = ...` declaration.

- [x] **Step 5: Run focused web tests and typecheck**

Run: `pnpm.cmd --dir apps/web exec vitest run src/application/workouts/workout-editor-model.test.ts`

Expected: PASS.

Run: `pnpm.cmd --dir apps/web typecheck`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/web/src/application/workouts apps/web/src/app/(app)/workouts/new/_editor.tsx apps/web/src/app/(app)/workouts/new/actions.ts
git commit -m "refactor(web): extrai modelo do editor de treino"
```

### Task 4: Web SOLID Architecture Guard

**Files:**
- Create: `apps/web/test/solid-architecture.test.ts`

- [x] **Step 1: Write architecture tests**

Create `apps/web/test/solid-architecture.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return listTypeScriptFiles(path);
    if ((!path.endsWith('.ts') && !path.endsWith('.tsx')) || path.endsWith('.test.ts')) return [];

    return [path];
  });
}

describe('web SOLID architecture rules', () => {
  it('keeps application modules independent from UI and framework edges', () => {
    const forbiddenImports = [
      /from ['"]next\/navigation['"]/,
      /from ['"]next\/cache['"]/,
      /from ['"]react['"]/,
      /from ['"]react-dom/,
      /from ['"]@\/components/,
      /from ['"].*\/components/,
    ];

    const violations = listTypeScriptFiles(join(srcRoot, 'application')).flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      return forbiddenImports.some((pattern) => pattern.test(content))
        ? [relative(process.cwd(), path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps refactored server actions free of private helper functions', () => {
    const actionFiles = [
      join(srcRoot, 'app', '(app)', 'students', 'new', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'students', '[id]', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'students', '[id]', 'assessments', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'onboarding', 'actions.ts'),
    ];

    const violations = actionFiles.flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      const helperNames = [...content.matchAll(/\nfunction\s+([A-Za-z0-9_]+)/g)].map(
        (match) => match[1],
      );
      return helperNames.length > 0
        ? [`${relative(process.cwd(), path)} defines ${helperNames.join(', ')}`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
```

- [x] **Step 2: Run architecture tests**

Run: `pnpm.cmd --dir apps/web exec vitest run test/solid-architecture.test.ts`

Expected: PASS after Tasks 1-3. If it fails, fix the listed import or helper violation before continuing.

- [x] **Step 3: Commit**

```bash
git add apps/web/test/solid-architecture.test.ts
git commit -m "test(web): adiciona guarda SOLID"
```

### Task 5: Mobile Workout Application Services

**Files:**
- Create: `apps/mobile/src/application/workouts/today-workout.ts`
- Create: `apps/mobile/src/application/workouts/today-workout.test.ts`
- Create: `apps/mobile/src/application/workouts/workout-log.ts`
- Create: `apps/mobile/src/application/workouts/workout-log.test.ts`
- Modify: `apps/mobile/src/screens/today-workout.tsx`
- Modify: `apps/mobile/src/screens/log-workout.tsx`

- [x] **Step 1: Write failing tests for today workout service**

Create `apps/mobile/src/application/workouts/today-workout.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { loadTodayWorkout } from './today-workout';

describe('loadTodayWorkout', () => {
  it('returns null when there is no active plan', async () => {
    const api = {
      request: vi.fn().mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'draft' }] }),
    };

    await expect(loadTodayWorkout({ api, userId: 'student-id' })).resolves.toBeNull();
  });

  it('selects the first non-completed day from the active plan', async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
        .mockResolvedValueOnce({
          id: 'plan-id',
          name: 'Plano',
          days: [
            { id: 'day-a', label: 'A', exercises: [] },
            { id: 'day-b', label: 'B', exercises: [] },
          ],
        })
        .mockResolvedValueOnce({ items: [{ workoutDayId: 'day-a', completed: true }] }),
    };

    await expect(loadTodayWorkout({ api, userId: 'student-id' })).resolves.toMatchObject({
      day: { id: 'day-b' },
    });
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/application/workouts/today-workout.test.ts`

Expected: FAIL because `today-workout.ts` does not exist.

- [x] **Step 2: Implement today workout service**

Create `apps/mobile/src/application/workouts/today-workout.ts`:

```ts
import type { workoutPlanFullSchema, workoutPlanSummarySchema } from '@muvit/validators';
import type { z } from 'zod';

type WorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
type WorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
type WorkoutDay = WorkoutPlan['days'][number];

type WorkoutApiClient = {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

type WorkoutLogSummary = {
  workoutDayId: string;
  completed: boolean;
};

export type TodayWorkout = {
  plan: WorkoutPlan;
  day: WorkoutDay;
};

export async function loadTodayWorkout({
  api,
  userId,
}: {
  api: WorkoutApiClient;
  userId: string;
}): Promise<TodayWorkout | null> {
  const summaries = await api.request<{ items: WorkoutPlanSummary[] }>(
    `/students/${userId}/workout-plans`,
  );
  const active = summaries.items.find((plan) => plan.status === 'active');
  if (!active) return null;

  const [plan, logs] = await Promise.all([
    api.request<WorkoutPlan>(`/workout-plans/${active.id}`),
    api.request<{ items: WorkoutLogSummary[] }>(`/students/${userId}/workout-logs?limit=30`),
  ]);

  const day = selectNextWorkoutDay(plan.days, logs.items);
  return day ? { plan, day } : null;
}

export function selectNextWorkoutDay(
  days: WorkoutDay[],
  logs: WorkoutLogSummary[],
): WorkoutDay | undefined {
  const completedDayIds = new Set(
    logs.filter((log) => log.completed).map((log) => log.workoutDayId),
  );
  return days.find((candidate) => !completedDayIds.has(candidate.id)) ?? days[0];
}
```

- [x] **Step 3: Write failing tests for workout log service**

Create `apps/mobile/src/application/workouts/workout-log.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildFinishWorkoutLogInput,
  buildInitialSets,
  finishWorkoutWithOfflineFallback,
  groupSetsByExercise,
  toOptionalNumber,
} from './workout-log';

const workoutExercise = {
  id: 'workout-exercise-id',
  sets: 2,
  loadKg: 40,
};

describe('workout log service', () => {
  it('builds initial set state from workout exercises', () => {
    expect(buildInitialSets([workoutExercise])).toEqual([
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 2,
        repsDone: '',
        loadKg: '40',
        completed: false,
      },
    ]);
  });

  it('groups sets by workout exercise id', () => {
    const sets = buildInitialSets([workoutExercise]);

    expect(groupSetsByExercise(sets).get('workout-exercise-id')).toHaveLength(2);
  });

  it('normalizes optional numbers', () => {
    expect(toOptionalNumber('10,5')).toBe(10.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toOptionalNumber(' ')).toBeUndefined();
  });

  it('queues workout log when online send fails', async () => {
    const queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const send = vi.fn().mockRejectedValue(new Error('offline'));
    const sets = [
      {
        workoutExerciseId: 'workout-exercise-id',
        setNumber: 1,
        repsDone: '10',
        loadKg: '40',
        completed: true,
      },
    ];

    await expect(
      finishWorkoutWithOfflineFallback({
        api: {},
        queue,
        send,
        workoutDayId: 'day-id',
        date: '2026-06-11',
        sets,
      }),
    ).resolves.toEqual({ queued: true });

    expect(queue.enqueue).toHaveBeenCalledWith({
      workoutDayId: 'day-id',
      date: '2026-06-11',
      finish: buildFinishWorkoutLogInput(sets),
    });
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/application/workouts/workout-log.test.ts`

Expected: FAIL because `workout-log.ts` does not exist.

- [x] **Step 4: Implement workout log service**

Create `apps/mobile/src/application/workouts/workout-log.ts`:

```ts
import type { finishWorkoutLogSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { PendingWorkoutLog } from '../../lib/log-queue';

type FinishWorkoutLogInput = z.infer<typeof finishWorkoutLogSchema>;

export type WorkoutSetState = {
  workoutExerciseId: string;
  setNumber: number;
  repsDone: string;
  loadKg: string;
  completed: boolean;
};

type WorkoutExerciseForSets = {
  id: string;
  sets: number;
  loadKg: number | null;
};

type Queue = {
  enqueue: (item: PendingWorkoutLog) => Promise<void>;
};

type SendPendingWorkoutLog = (api: unknown, item: PendingWorkoutLog) => Promise<void>;

export function buildInitialSets(exercises: WorkoutExerciseForSets[]): WorkoutSetState[] {
  return exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({
      workoutExerciseId: exercise.id,
      setNumber: index + 1,
      repsDone: '',
      loadKg: exercise.loadKg === null ? '' : String(exercise.loadKg),
      completed: false,
    })),
  );
}

export function groupSetsByExercise(sets: WorkoutSetState[]): Map<string, WorkoutSetState[]> {
  const groups = new Map<string, WorkoutSetState[]>();
  for (const set of sets) {
    groups.set(set.workoutExerciseId, [...(groups.get(set.workoutExerciseId) ?? []), set]);
  }
  return groups;
}

export function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildFinishWorkoutLogInput(sets: WorkoutSetState[]): FinishWorkoutLogInput {
  return {
    durationMin: 45,
    completed: true,
    sets: sets.map((set) => ({
      workoutExerciseId: set.workoutExerciseId,
      setNumber: set.setNumber,
      repsDone: toOptionalNumber(set.repsDone),
      loadKg: toOptionalNumber(set.loadKg),
      completed: set.completed,
    })),
  };
}

export async function finishWorkoutWithOfflineFallback({
  api,
  queue,
  send,
  workoutDayId,
  date,
  sets,
}: {
  api: unknown;
  queue: Queue;
  send: SendPendingWorkoutLog;
  workoutDayId: string;
  date: string;
  sets: WorkoutSetState[];
}): Promise<{ queued: boolean }> {
  const item: PendingWorkoutLog = {
    workoutDayId,
    date,
    finish: buildFinishWorkoutLogInput(sets),
  };

  try {
    await send(api, item);
    return { queued: false };
  } catch {
    await queue.enqueue(item);
    return { queued: true };
  }
}
```

- [x] **Step 5: Refactor today workout screen**

Modify `apps/mobile/src/screens/today-workout.tsx`:

```ts
import { loadTodayWorkout } from '../application/workouts/today-workout';
```

Change the query function to:

```ts
queryFn: async () => {
  if (!userId) throw new Error('usuario nao autenticado');
  const cache = createOfflineCache(AsyncStorage);
  return cache.get(`today-workout:${userId}`, async () => loadTodayWorkout({ api, userId }));
},
```

Remove the local `loadTodayWorkout` function and local `WorkoutPlanSummary` type. Keep UI types that are still used for rendering.

- [x] **Step 6: Refactor log workout screen**

Modify `apps/mobile/src/screens/log-workout.tsx`:

```ts
import {
  type WorkoutSetState,
  buildInitialSets,
  finishWorkoutWithOfflineFallback,
  groupSetsByExercise,
} from '../application/workouts/workout-log';
```

Change state and grouping:

```ts
const [sets, setSets] = useState<WorkoutSetState[]>([]);

const groupedSets = useMemo(() => groupSetsByExercise(sets), [sets]);
```

Change query initialization:

```ts
setSets((current) => (current.length > 0 ? current : buildInitialSets(day.exercises)));
```

Change `finish` to delegate the fallback:

```ts
async function finish() {
  if (!params.dayId) return;
  setSaving(true);

  try {
    await finishWorkoutWithOfflineFallback({
      api,
      queue: createLogQueue(AsyncStorage),
      send: sendPendingWorkoutLog,
      workoutDayId: params.dayId,
      date: todayIsoDate(),
      sets,
    });
    router.back();
  } finally {
    setSaving(false);
  }
}
```

Remove local `SetState`, `buildInitialSets`, and `toOptionalNumber`.

- [x] **Step 7: Run focused mobile tests and typecheck**

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/application/workouts/today-workout.test.ts src/application/workouts/workout-log.test.ts`

Expected: PASS.

Run: `pnpm.cmd --dir apps/mobile typecheck`

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add apps/mobile/src/application/workouts apps/mobile/src/screens/today-workout.tsx apps/mobile/src/screens/log-workout.tsx
git commit -m "refactor(mobile): extrai servicos de treino"
```

### Task 6: Mobile Assessment Application Service

**Files:**
- Create: `apps/mobile/src/application/assessments/new-assessment.ts`
- Create: `apps/mobile/src/application/assessments/new-assessment.test.ts`
- Modify: `apps/mobile/src/screens/new-assessment.tsx`

- [x] **Step 1: Write failing tests for assessment service**

Create `apps/mobile/src/application/assessments/new-assessment.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildAssessmentPayload,
  submitAssessment,
  toOptionalNumber,
  toSupportedContentType,
} from './new-assessment';

describe('new assessment service', () => {
  it('normalizes optional numbers and content types', () => {
    expect(toOptionalNumber('12,5')).toBe(12.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toSupportedContentType('image/jpeg')).toBe('image/jpeg');
    expect(toSupportedContentType('image/gif')).toBeNull();
  });

  it('builds payload with optional photo and trimmed notes', () => {
    expect(
      buildAssessmentPayload({
        date: '2026-06-11',
        weightKg: '80,5',
        bodyFatPct: '',
        notes: '  Evoluiu  ',
        photoUrl: 'https://cdn.test/photo.jpg',
      }),
    ).toEqual({
      date: '2026-06-11',
      weightKg: 80.5,
      bodyFatPct: undefined,
      photos: ['https://cdn.test/photo.jpg'],
      notes: 'Evoluiu',
    });
  });

  it('submits assessment and invalidates the assessments query', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await submitAssessment({
      api,
      userId: 'student-id',
      values: {
        date: '2026-06-11',
        weightKg: '80',
        bodyFatPct: '20',
        notes: '',
        photo: { uri: 'file://photo.jpg', contentType: 'image/jpeg' },
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).toHaveBeenCalledWith({ uri: 'file://photo.jpg', contentType: 'image/jpeg' });
    expect(api.request).toHaveBeenCalledWith('/students/student-id/assessments', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-06-11',
        weightKg: 80,
        bodyFatPct: 20,
        photos: ['https://cdn.test/photo.jpg'],
        notes: undefined,
      }),
    });
    expect(invalidateAssessments).toHaveBeenCalledWith('student-id');
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/application/assessments/new-assessment.test.ts`

Expected: FAIL because `new-assessment.ts` does not exist.

- [x] **Step 2: Implement assessment service**

Create `apps/mobile/src/application/assessments/new-assessment.ts`:

```ts
import type { AssessmentPhoto } from '../../lib/uploads';

type AssessmentPayload = {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  photos?: string[];
  notes?: string;
};

type AssessmentApiClient = {
  request: (path: string, init?: RequestInit) => Promise<unknown>;
};

export type AssessmentFormValues = {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photo?: AssessmentPhoto;
};

export function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toSupportedContentType(value: string | undefined): AssessmentPhoto['contentType'] | null {
  if (value === 'image/jpeg' || value === 'image/png') return value;
  return null;
}

export function buildAssessmentPayload({
  date,
  weightKg,
  bodyFatPct,
  notes,
  photoUrl,
}: {
  date: string;
  weightKg: string;
  bodyFatPct: string;
  notes: string;
  photoUrl?: string;
}): AssessmentPayload {
  return {
    date,
    weightKg: toOptionalNumber(weightKg),
    bodyFatPct: toOptionalNumber(bodyFatPct),
    photos: photoUrl ? [photoUrl] : undefined,
    notes: notes.trim() || undefined,
  };
}

export async function submitAssessment({
  api,
  userId,
  values,
  uploadPhoto,
  invalidateAssessments,
}: {
  api: AssessmentApiClient;
  userId: string;
  values: AssessmentFormValues;
  uploadPhoto: (photo: AssessmentPhoto) => Promise<string>;
  invalidateAssessments: (userId: string) => Promise<void>;
}): Promise<void> {
  const photoUrl = values.photo ? await uploadPhoto(values.photo) : undefined;
  const payload = buildAssessmentPayload({
    date: values.date,
    weightKg: values.weightKg,
    bodyFatPct: values.bodyFatPct,
    notes: values.notes,
    photoUrl,
  });

  await api.request(`/students/${userId}/assessments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await invalidateAssessments(userId);
}
```

- [x] **Step 3: Refactor new assessment screen**

Modify `apps/mobile/src/screens/new-assessment.tsx`:

```ts
import {
  submitAssessment,
  toSupportedContentType,
} from '../application/assessments/new-assessment';
```

Change `submit`:

```ts
async function submit() {
  if (!userId) return;
  setSubmitting(true);

  try {
    await submitAssessment({
      api,
      userId,
      values: { date, weightKg, bodyFatPct, notes, photo },
      uploadPhoto: (selectedPhoto) => uploadAssessmentPhoto({ api, photo: selectedPhoto }),
      invalidateAssessments: (studentId) =>
        queryClient.invalidateQueries({ queryKey: ['assessments', studentId] }),
    });
    router.back();
  } finally {
    setSubmitting(false);
  }
}
```

Remove local `AssessmentPayload`, `toOptionalNumber`, and `toSupportedContentType`.

- [x] **Step 4: Run focused mobile tests and typecheck**

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/application/assessments/new-assessment.test.ts`

Expected: PASS.

Run: `pnpm.cmd --dir apps/mobile typecheck`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/mobile/src/application/assessments apps/mobile/src/screens/new-assessment.tsx
git commit -m "refactor(mobile): extrai regras de nova avaliacao"
```

### Task 7: Mobile SOLID Architecture Guard

**Files:**
- Create: `apps/mobile/test/solid-architecture.test.ts`

- [x] **Step 1: Write architecture tests**

Create `apps/mobile/test/solid-architecture.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return listTypeScriptFiles(path);
    if ((!path.endsWith('.ts') && !path.endsWith('.tsx')) || path.endsWith('.test.ts')) return [];

    return [path];
  });
}

describe('mobile SOLID architecture rules', () => {
  it('keeps application modules independent from native UI and framework edges', () => {
    const forbiddenImports = [
      /from ['"]react-native['"]/,
      /from ['"]expo-router['"]/,
      /from ['"]expo-image-picker['"]/,
      /from ['"]@react-native-async-storage\/async-storage['"]/,
      /from ['"].*\/screens\//,
      /from ['"].*\/components\//,
    ];

    const violations = listTypeScriptFiles(join(srcRoot, 'application')).flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      return forbiddenImports.some((pattern) => pattern.test(content))
        ? [relative(process.cwd(), path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps refactored screens from defining private application helpers', () => {
    const screenFiles = [
      join(srcRoot, 'screens', 'today-workout.tsx'),
      join(srcRoot, 'screens', 'log-workout.tsx'),
      join(srcRoot, 'screens', 'new-assessment.tsx'),
    ];

    const violations = screenFiles.flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      const helperNames = [...content.matchAll(/\nfunction\s+([A-Za-z0-9_]+)/g)]
        .map((match) => match[1])
        .filter((name) => !['TodayWorkoutScreen', 'LogWorkoutScreen', 'NewAssessmentScreen'].includes(name));
      return helperNames.length > 0
        ? [`${relative(process.cwd(), path)} defines ${helperNames.join(', ')}`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
```

- [x] **Step 2: Include the mobile test directory in Vitest**

Modify `apps/mobile/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
```

- [x] **Step 3: Run architecture tests**

Run: `pnpm.cmd --dir apps/mobile exec vitest run test/solid-architecture.test.ts`

Expected: PASS after Tasks 5-6.

- [x] **Step 4: Commit**

```bash
git add apps/mobile/test/solid-architecture.test.ts apps/mobile/vitest.config.ts
git commit -m "test(mobile): adiciona guarda SOLID"
```

### Task 8: Coverage Scripts and Thresholds

**Files:**
- Create: `apps/web/vitest.coverage.config.ts`
- Create: `apps/web/vitest.global-coverage.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/mobile/vitest.coverage.config.ts`
- Create: `apps/mobile/vitest.global-coverage.config.ts`
- Modify: `apps/mobile/package.json`

- [x] **Step 1: Add web coverage configs**

Create `apps/web/vitest.coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/application/**/*.{ts,tsx}', 'src/lib/uploads.ts', 'src/lib/muscle-groups.ts', 'src/lib/utils.ts'],
        exclude: ['src/**/*.test.{ts,tsx}', 'test/**'],
        thresholds: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  }),
);
```

Create `apps/web/vitest.global-coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/lib/api/**',
          'src/components/ui/**',
          'src/app/page.tsx',
          'src/app/layout.tsx',
          'src/app/global-error.tsx',
          'src/app/providers.tsx',
          'src/instrumentation*.ts',
          'src/sentry.*.config.ts',
          'test/**',
        ],
      },
    },
  }),
);
```

- [x] **Step 2: Add web package scripts and explicit coverage provider**

Modify `apps/web/package.json`:

```json
"scripts": {
  "dev": "next dev -p 3000",
  "build": "next build",
  "start": "next start -p 3000",
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest",
  "test:coverage": "vitest run --config vitest.global-coverage.config.ts --coverage",
  "test:coverage:core": "vitest run --config vitest.coverage.config.ts --coverage",
  "typecheck": "tsc --noEmit",
  "api:gen": "openapi-ts -i http://localhost:3333/docs/openapi.json -o src/lib/api -c @hey-api/client-fetch"
}
```

Add to `devDependencies`:

```json
"@vitest/coverage-v8": "^4.1.5"
```

- [x] **Step 3: Add mobile coverage configs**

Create `apps/mobile/vitest.coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/application/**/*.ts',
          'src/lib/api.ts',
          'src/lib/config-url.ts',
          'src/lib/log-queue.ts',
          'src/lib/offline-cache.ts',
          'src/lib/push-token.ts',
          'src/lib/uploads.ts',
        ],
        exclude: ['src/**/*.test.ts', 'test/**'],
        thresholds: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  }),
);
```

Create `apps/mobile/vitest.global-coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'test/**',
          'src/lib/styles.ts',
          'src/lib/query-client.ts',
          'app/_layout.tsx',
          'app/(tabs)/_layout.tsx',
        ],
      },
    },
  }),
);
```

- [x] **Step 4: Add mobile package scripts and explicit coverage provider**

Modify `apps/mobile/package.json`:

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:coverage": "vitest run --config vitest.global-coverage.config.ts --coverage",
  "test:coverage:core": "vitest run --config vitest.coverage.config.ts --coverage",
  "doctor": "expo-doctor"
}
```

Add to `devDependencies`:

```json
"@vitest/coverage-v8": "^4.1.5"
```

- [x] **Step 5: Run coverage checks**

Run: `pnpm.cmd --dir apps/web test:coverage:core`

Expected: PASS with statements, branches, functions and lines each at least 85%.

Run: `pnpm.cmd --dir apps/mobile test:coverage:core`

Expected: PASS with statements, branches, functions and lines each at least 85%.

Run: `pnpm.cmd --dir apps/web test:coverage`

Expected: PASS and print broad coverage without enforcing 85%.

Run: `pnpm.cmd --dir apps/mobile test:coverage`

Expected: PASS and print broad coverage without enforcing 85%.

- [x] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.coverage.config.ts apps/web/vitest.global-coverage.config.ts apps/mobile/package.json apps/mobile/vitest.coverage.config.ts apps/mobile/vitest.global-coverage.config.ts pnpm-lock.yaml
git commit -m "test: configura cobertura SOLID em web e mobile"
```

### Task 9: Document Local SOLID Rules

**Files:**
- Modify: `apps/web/AGENTS.md`
- Modify: `apps/mobile/AGENTS.md`

- [x] **Step 1: Update web local instructions**

Add this section to `apps/web/AGENTS.md` after "Arquitetura web":

```md
## Piso SOLID local

- Regras de aplicacao, parsing de formulario, montagem de payload, upload e orquestracao testavel devem ficar em `src/application` ou `src/lib`, nao dentro de componentes ou Server Actions.
- Server Actions devem permanecer finas: recebem entrada da borda, chamam modulo de aplicacao ou SDK, traduzem erro esperado e fazem `revalidatePath` ou `redirect`.
- Modulos em `src/application` nao devem importar componentes React, `next/navigation`, `next/cache` ou SDK gerado diretamente quando houver comportamento de dominio ao redor.
- Cobertura minima bloqueante de 85% vale para o nucleo testavel medido por `pnpm.cmd --dir apps/web test:coverage:core`; cobertura ampla fica em `pnpm.cmd --dir apps/web test:coverage`.
```

- [x] **Step 2: Update mobile local instructions**

Add this section to `apps/mobile/AGENTS.md` after "Arquitetura mobile":

```md
## Piso SOLID local

- Regras de aplicacao, montagem de payload, selecao de dados, fila offline, cache e upload devem ficar em `src/application` ou `src/lib`, nao diretamente em screens.
- Screens devem permanecer finas: renderizam UI, conectam hooks e chamam services; dependencias concretas como storage, router, picker e query client ficam na borda.
- Modulos em `src/application` nao devem importar `react-native`, `expo-router`, `expo-image-picker`, AsyncStorage concreto, screens ou componentes.
- Cobertura minima bloqueante de 85% vale para o nucleo testavel medido por `pnpm.cmd --dir apps/mobile test:coverage:core`; cobertura ampla fica em `pnpm.cmd --dir apps/mobile test:coverage`.
```

- [x] **Step 3: Verify AGENTS length and ASCII**

Run: `Get-Content apps/web/AGENTS.md | Measure-Object -Line`

Expected: line count is below 200.

Run: `Get-Content apps/mobile/AGENTS.md | Measure-Object -Line`

Expected: line count is below 200.

Run: `rg -n "[^\\x00-\\x7F]" apps/web/AGENTS.md apps/mobile/AGENTS.md`

Expected: no output.

- [x] **Step 4: Commit**

```bash
git add apps/web/AGENTS.md apps/mobile/AGENTS.md
git commit -m "docs: registra piso SOLID de web e mobile"
```

### Task 10: Final Verification

**Files:**
- No file changes expected unless a verification command exposes a concrete issue.

- [x] **Step 1: Run web verification**

Run: `pnpm.cmd --dir apps/web test`

Expected: PASS.

Run: `pnpm.cmd --dir apps/web test:coverage:core`

Expected: PASS with all configured core thresholds at or above 85%.

Run: `pnpm.cmd --dir apps/web test:coverage`

Expected: PASS and broad coverage report printed.

Run: `pnpm.cmd --dir apps/web typecheck`

Expected: PASS.

- [x] **Step 2: Run mobile verification**

Run: `pnpm.cmd --dir apps/mobile test`

Expected: PASS.

Run: `pnpm.cmd --dir apps/mobile test:coverage:core`

Expected: PASS with all configured core thresholds at or above 85%.

Run: `pnpm.cmd --dir apps/mobile test:coverage`

Expected: PASS and broad coverage report printed.

Run: `pnpm.cmd --dir apps/mobile typecheck`

Expected: PASS.

- [x] **Step 3: Run Biome on affected workspaces**

Run: `pnpm.cmd exec biome check apps/web apps/mobile`

Expected: PASS.

- [x] **Step 4: Inspect git diff**

Run: `git status --short`

Expected: only intended files are modified.

Run: `git diff --stat`

Expected: changes match the tasks in this plan.

- [x] **Step 5: Final commit if any verification fixes were needed**

If verification required fixes, run:

```bash
git add apps/web apps/mobile pnpm-lock.yaml
git commit -m "chore: ajusta verificacao de SOLID web mobile"
```

If no verification fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: this plan implements SOLID extraction, architecture tests, core 85% coverage, broad coverage visibility, and local documentation for both `apps/web` and `apps/mobile`.
- Scope control: API, DB, validators and visual design are not changed.
- Type consistency: `StudentFormState`, `AssessmentState`, `CreateWorkoutInput`, `WorkoutSetState` and application service interfaces are defined before their consumers are modified.
- Verification: every affected workspace has focused tests, full tests, core coverage, broad coverage, typecheck and Biome commands.
- No open gaps: each task names exact files, code snippets, commands and expected outcomes.
