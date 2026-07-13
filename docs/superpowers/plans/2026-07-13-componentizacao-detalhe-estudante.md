# Componentizacao do detalhe do estudante - Plano de implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair os tres cards da visao geral do estudante para componentes locais sem alterar dados, layout ou comportamento.

**Architecture:** `page.tsx` permanece como Server Component e concentra chamadas da API, selecao dos registros atuais e montagem da serie de peso. Cada card recebe dados prontos por props, mantem apenas apresentacao e estados visuais, e nao acessa API nem cria estado local.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Vitest e Testing Library.

## Global Constraints

- Preservar textos, links, estilos e estados atuais.
- Nao alterar contratos da API ou adicionar dependencias.
- Manter as mudancas locais de Turbo fora dos commits desta implementacao.
- Executar comandos a partir da raiz com filtro para `apps/web`.

---

### Task 1: Extrair os cards da visao geral

**Files:**
- Create: `apps/web/src/app/(app)/students/[id]/_student-overview-cards.test.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/_personal-info-card.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/_active-workout-card.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/_latest-assessment-card.tsx`
- Modify: `apps/web/src/app/(app)/students/[id]/page.tsx`
- Test: `apps/web/src/app/(app)/students/[id]/page.test.tsx`

**Interfaces:**
- `PersonalInfoCard({ student })` consumes email, phone, gender, goals, restrictions and isIndependent.
- `ActiveWorkoutCard({ studentId, activeWorkoutPlan, loadFailed })` consumes the selected active plan and the request failure state.
- `LatestAssessmentCard({ studentId, latestAssessment, weightChartPoints, loadFailed })` consumes the selected assessment and data prepared by the page.
- `StudentDetailPage` continues to export `buildWeightChartPoints(assessments)`.

- [ ] **Step 1: Write the failing component tests**

Create tests that import the three not-yet-created modules and verify their public behavior:

```tsx
it('renderiza as informacoes pessoais e as restricoes', () => {
  render(<PersonalInfoCard student={student} />);

  expect(screen.getByRole('heading', { name: /Informa.*es pessoais/ })).toBeInTheDocument();
  expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  expect(screen.getByText('Evitar impacto alto no joelho direito.')).toBeInTheDocument();
});

it('renderiza o treino ativo e suas acoes', () => {
  render(
    <ActiveWorkoutCard
      studentId="student-1"
      activeWorkoutPlan={workoutPlan}
      loadFailed={false}
    />,
  );

  expect(screen.getByText(/Treino A/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ver treino completo/i })).toHaveAttribute(
    'href',
    '/workouts/workout-1',
  );
});

it('renderiza a ultima avaliacao com medidas, grafico e acoes', () => {
  render(
    <LatestAssessmentCard
      studentId="student-1"
      latestAssessment={assessment}
      weightChartPoints={[{ date: '2026-06-20', label: 'jun', weight: 72.5 }]}
      loadFailed={false}
    />,
  );

  expect(screen.getByText('68 cm')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Evolu.*o de peso/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ver hist.rico/ })).toHaveAttribute(
    'href',
    '/students/student-1/assessments',
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "_student-overview-cards.test.tsx"
```

Expected: FAIL because the three component modules do not exist.

- [ ] **Step 3: Implement `PersonalInfoCard`**

Move the personal-info JSX, `InfoRow` and gender formatting into `_personal-info-card.tsx`. Declare the minimal student prop type locally and preserve the current warning layout for restrictions.

- [ ] **Step 4: Implement `ActiveWorkoutCard`**

Move the active-workout JSX, workout-period formatting, training-day definitions and error/empty states into `_active-workout-card.tsx`. Keep the vertical list and current system button variants.

- [ ] **Step 5: Implement `LatestAssessmentCard`**

Move the latest-assessment JSX, metric formatting, `MetricCard` and error/empty states into `_latest-assessment-card.tsx`. Build measurement rows locally and accept `WeightEvolutionPoint[]` as prepared props and preserve Recharts through `WeightEvolutionChart`.

- [ ] **Step 6: Recompose `StudentDetailPage`**

Import the three components, replace the inline cards with component calls and remove card-only imports, constants and helpers. Keep API calls, sorting, selection and `buildWeightChartPoints` in the page.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "_student-overview-cards.test.tsx" "page.test.tsx"
```

Expected: component tests and page integration tests PASS with no duplicate-key warning.

- [ ] **Step 8: Run full web verification**

Run:

```powershell
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/app/(app)/students/[id]/_student-overview-cards.test.tsx" "apps/web/src/app/(app)/students/[id]/_personal-info-card.tsx" "apps/web/src/app/(app)/students/[id]/_active-workout-card.tsx" "apps/web/src/app/(app)/students/[id]/_latest-assessment-card.tsx" "apps/web/src/app/(app)/students/[id]/page.tsx" "apps/web/src/app/(app)/students/[id]/page.test.tsx"
git diff --check
```

Expected: all commands exit with code 0.

- [ ] **Step 9: Commit the implementation**

Stage only the plan and route-local component changes, then create:

```powershell
git commit -m "refactor(web): separa cards do detalhe do estudante"
```

- [ ] **Step 10: Publish and open the pull request**

Push `feat/ajusta-tela-estudantes-design` and open a ready PR targeting `develop`, summarizing the design alignment, Recharts integration, duplicate-key corrections, component extraction and verification evidence.
