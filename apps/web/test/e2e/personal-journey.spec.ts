import { expect, loginAs, test } from './fixtures';

test('autentica e cadastra aluno, avaliação e plano ativo com persistência', async ({
  page,
  account,
  api,
  catalogExercise,
  referenceDate,
}, testInfo) => {
  const suffix = testInfo.testId.slice(-8);
  const studentName = `Aluno E2E ${suffix}`;
  const notes = `Avaliação E2E ${suffix}`;
  const planName = `Plano E2E ${suffix}`;
  let studentId = '';
  let workoutId = '';
  await test.step('carteira vazia válida antes do cadastro', async () => {
    await loginAs(page, account);
    await page.screenshot({ path: testInfo.outputPath('apos-login.png') });
    await page.getByRole('link', { name: 'Alunos', exact: true }).first().click();
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByText('0 alunos cadastrados')).toBeVisible();
    await expect(page.getByText('Nenhum aluno cadastrado ainda.')).toBeVisible();
    await page.getByRole('link', { name: 'Cadastrar primeiro aluno' }).click();
    await expect(page).toHaveURL(/\/students\/new$/);
    await page.screenshot({ path: testInfo.outputPath('carteira-vazia.png') });
  });
  await test.step('autenticação e cadastro', async () => {
    await page.getByLabel('Nome completo').fill(studentName);
    await page.getByLabel('E-mail').fill(`aluno-${suffix}@example.invalid`);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Hipertrofia' }).click();
    await page.getByRole('button', { name: '3 dias' }).click();
    await page.getByRole('button', { name: 'Cadastrar aluno' }).click();
    await expect(page.getByText('Aluno cadastrado com sucesso')).toBeVisible();
    const href = await page.getByRole('link', { name: 'Ver perfil do aluno' }).getAttribute('href');
    studentId = href?.split('/').at(-1) ?? '';
    expect(studentId).toBeTruthy();
    await page.getByRole('link', { name: 'Registrar avaliação' }).click();
  });
  await test.step('avaliação persistida', async () => {
    await page.getByLabel('Data da avaliação').fill(referenceDate);
    await page.getByLabel('Peso', { exact: true }).fill('78.5');
    await page.getByLabel('Altura').fill('170');
    await page.getByLabel('Observações da avaliação').fill(notes);
    await page.getByRole('button', { name: 'Salvar avaliação' }).click();
    await expect(page).toHaveURL(new RegExp(`/students/${studentId}/assessments$`));
    const assertAssessment = async () => {
      await expect(page.getByText(studentName).first()).toBeVisible();
      await expect(page.getByText('78.5 kg').first()).toBeVisible();
      await expect(
        page.getByText(referenceDate.split('-').reverse().join('/')).first(),
      ).toBeVisible();
    };
    await assertAssessment();
    await page.reload();
    await assertAssessment();
    const result = await api.get(`/students/${studentId}/assessments`);
    expect(result.ok()).toBeTruthy();
    const data: {
      items: Array<{
        date: string;
        weightKg: string | number;
        heightCm: string | number;
        notes: string;
      }>;
    } = await result.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ date: referenceDate, notes });
    expect(Number(data.items[0]?.weightKg)).toBe(78.5);
    expect(Number(data.items[0]?.heightCm)).toBe(170);
    await page.goto(`/students/${studentId}`);
    await expect(page.getByText(notes)).toBeVisible();
    await page.reload();
    await expect(page.getByText(notes)).toBeVisible();
    await page.getByRole('link', { name: 'Novo treino' }).first().click();
  });
  await test.step('treino ativo persistido', async () => {
    await page.getByLabel('Aluno', { exact: true }).selectOption(studentId);
    await page.getByLabel('Nome do plano').fill(planName);
    await page.getByLabel('Data inicial').fill(referenceDate);
    await expect(page.getByLabel('Status')).toHaveValue('draft');
    await page.getByLabel('Status').selectOption('active');
    await page.getByRole('button', { name: 'Adicionar exercício' }).first().click();
    await page.getByLabel('Buscar exercícios').fill(catalogExercise.name);
    await page.getByRole('button', { name: `Adicionar ${catalogExercise.name}` }).click();
    for (const [label, value] of [
      ['Séries', '3'],
      ['Repetições', '12'],
      ['Carga', '24'],
      ['Descanso', '60'],
    ] as const)
      await page.getByLabel(`${label} de ${catalogExercise.name}`).fill(value);
    await page.getByRole('button', { name: 'Salvar treino' }).click();
    await expect(page).toHaveURL(/\/workouts\/[^/]+$/);
    workoutId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
    const assertPlan = async () => {
      await expect(page.getByText(planName).first()).toBeVisible();
      await expect(page.getByText('Ativo', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Treino A').first()).toBeVisible();
      await expect(page.getByText(catalogExercise.name).first()).toBeVisible();
      const prescription = page.getByRole('listitem').filter({ hasText: catalogExercise.name });
      await expect(prescription).toContainText(/3x12.*24(?:\.0+)?kg.*60s desc/);
    };
    await assertPlan();
    await page.reload();
    await assertPlan();
    const response = await api.get(`/workout-plans/${workoutId}`);
    expect(response.ok()).toBeTruthy();
    const plan = await response.json();
    expect(plan).toMatchObject({
      studentId,
      name: planName,
      status: 'active',
      startDate: referenceDate,
    });
    expect(plan.trainerId).toBe(account.profileId);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].exercises).toHaveLength(1);
    expect(plan.days[0].exercises[0]).toMatchObject({
      exerciseId: catalogExercise.id,
      sets: 3,
      reps: '12',
      restSeconds: 60,
    });
    expect(Number(plan.days[0].exercises[0].loadKg)).toBe(24);
    const plans = await api.get(`/students/${studentId}/workout-plans`);
    expect(plans.ok()).toBeTruthy();
    expect(JSON.stringify(await plans.json())).toContain(workoutId);
    const student = await api.get(`/students/${studentId}`);
    expect(student.ok()).toBeTruthy();
    expect(await student.json()).toMatchObject({ id: studentId, name: studentName });
  });
  await test.step('carteira e dashboard com dados reais', async () => {
    await page.getByRole('link', { name: 'Alunos', exact: true }).first().click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/students');
    const assertWallet = async () => {
      await expect(page.getByText('1 aluno cadastrado')).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(studentName) }).first()).toBeVisible();
    };
    await assertWallet();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await assertWallet();
    await page.screenshot({ path: testInfo.outputPath('carteira-com-aluno.png') });

    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/dashboard');
    const assertDashboard = async () => {
      const activeStudents = page.getByRole('article', { name: 'Alunos ativos' });
      await expect(activeStudents).toContainText('1');
      await expect(activeStudents).toContainText(/\+1 esta semana|1 no total/);
      await expect(page.getByText(studentName).first()).toBeVisible();
      await expect(page.getByText('Mostrando 1 de 1 alunos')).toBeVisible();
    };
    await assertDashboard();
    await page.reload();
    await assertDashboard();
    await page.screenshot({ path: testInfo.outputPath('dashboard-com-aluno.png') });
  });
  await test.step('reabertura após sair', async () => {
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
    await loginAs(page, account);
    await page.getByRole('link', { name: 'Alunos', exact: true }).first().click();
    await page.getByPlaceholder('Buscar aluno…').fill(studentName);
    await expect(page).toHaveURL(/\?q=/);
    await page
      .getByRole('link', { name: new RegExp(studentName) })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/students/${studentId}$`));
    await expect(page.getByText(notes)).toBeVisible();
    await page.getByRole('link', { name: 'Ver histórico' }).click();
    await expect(page).toHaveURL(new RegExp(`/students/${studentId}/assessments$`));
    await expect(page.getByText('78.5 kg').first()).toBeVisible();
    await expect(
      page.getByText(referenceDate.split('-').reverse().join('/')).first(),
    ).toBeVisible();
    await page.goto(`/students/${studentId}`);
    await page
      .getByRole('link', { name: /Ver treino/ })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/workouts/${workoutId}$`));
    await expect(page.getByText(planName).first()).toBeVisible();
    await expect(page.getByText('Ativo', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Treino A').first()).toBeVisible();
    const reopenedExercise = page.getByRole('listitem').filter({ hasText: catalogExercise.name });
    await expect(reopenedExercise).toContainText(/3x12.*24(?:\.0+)?kg.*60s desc/);
    await page.screenshot({ path: testInfo.outputPath('jornada-final.png') });
  });
  // A fixture autentica trainer; equivalência self/trainer está coberta no teste API.
  await test.step('empate de data entre formulário e fronteira HTTP', async () => {
    const ambiguityWarning =
      'Há mais de uma avaliação nesta data. A ordem das medições não foi informada.';
    const displayDate = referenceDate.split('-').reverse().join('/');
    const created = await api.post(`/students/${studentId}/assessments`, {
      data: { date: referenceDate, weightKg: 80, notes: 'Registro via HTTP' },
    });
    expect(created.ok()).toBeTruthy();
    const httpAssessment: { id: string } = await created.json();
    const listed = await api.get(`/students/${studentId}/assessments`);
    const data: { items: Array<{ id: string; dateAssessmentCount: number }> } = await listed.json();
    expect(data.items).toHaveLength(2);
    expect(data.items.map((item) => item.dateAssessmentCount)).toEqual([2, 2]);
    const ids = data.items.map((item) => item.id);
    expect(ids).toEqual([...ids].sort());
    await page.goto(`/students/${studentId}/assessments`);
    await expect(page.getByText(ambiguityWarning)).toHaveCount(1);
    await expect(page.getByText('Mais recente', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Data mais recente', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Atual:/)).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Dados de evolução de Peso' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Registro' })).toHaveCount(0);
    await expect(page.getByText('Registro via HTTP')).toBeVisible();
    const desktopHistoryText = await page.locator('body').innerText();
    for (const id of ids) expect(desktopHistoryText).not.toContain(id);
    await page.screenshot({ path: testInfo.outputPath('avaliacoes-empatadas-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText(ambiguityWarning)).toHaveCount(1);
    await expect(page.getByText(/Atual:/)).toHaveCount(0);
    await expect(page.getByText('Registro via HTTP')).toBeVisible();
    const narrowHistoryText = await page.locator('body').innerText();
    for (const id of ids) expect(narrowHistoryText).not.toContain(id);
    await page.screenshot({ path: testInfo.outputPath('avaliacoes-empatadas-estreito.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/students/${studentId}`);
    const latestAssessmentCard = page.locator('#ultima-avaliacao');
    await expect(page.getByRole('heading', { name: 'Última avaliação' })).toBeVisible();
    await expect(page.getByText(ambiguityWarning)).toBeVisible();
    await expect(page.getByText(notes)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ver histórico de avaliações' })).toBeVisible();
    await latestAssessmentCard.scrollIntoViewIfNeeded();
    await expect(latestAssessmentCard).toBeInViewport({ ratio: 0.9 });
    await page.screenshot({ path: testInfo.outputPath('resumo-aluno-empatado-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Última avaliação' })).toBeVisible();
    await expect(page.getByText(ambiguityWarning)).toBeVisible();
    await latestAssessmentCard.scrollIntoViewIfNeeded();
    await expect(latestAssessmentCard).toBeInViewport({ ratio: 0.9 });
    await page.screenshot({ path: testInfo.outputPath('resumo-aluno-empatado-estreito.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    const laterDate = new Date(`${referenceDate}T12:00:00Z`);
    laterDate.setUTCDate(laterDate.getUTCDate() + 1);
    const third = await api.post(`/students/${studentId}/assessments`, {
      data: { date: laterDate.toISOString().slice(0, 10), weightKg: 79 },
    });
    expect(third.ok()).toBeTruthy();
    const refreshed = await api.get(`/students/${studentId}/assessments`);
    expect(refreshed.ok()).toBeTruthy();
    const history: { items: Array<{ id: string; dateAssessmentCount: number }> } =
      await refreshed.json();
    expect(history.items.map((item) => item.dateAssessmentCount)).toEqual([1, 2, 2]);
    expect(history.items.slice(1).map((item) => item.id)).toEqual(ids);
    await page.goto(`/students/${studentId}/assessments`);
    await expect(page.getByText(/Atual:/)).toHaveCount(0);
    const historicalSummary = page
      .locator('summary')
      .filter({ hasText: `Detalhes de ${displayDate} — 80 kg` });
    await historicalSummary.focus();
    await historicalSummary.press('Enter');
    await expect(page.getByText('Registro via HTTP')).toBeVisible();
    const detailsHistoryText = await page.locator('body').innerText();
    for (const id of ids) expect(detailsHistoryText).not.toContain(id);
    expect(ids).toContain(httpAssessment.id);
  });
});
