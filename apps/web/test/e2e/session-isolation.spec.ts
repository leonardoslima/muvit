import { request } from '@playwright/test';
import { createAccount, expect, loginAs, test } from './fixtures';

test('isola sessões e recursos entre treinadores', async ({
  page,
  account,
  api,
  catalogExercise,
  referenceDate,
}, testInfo) => {
  const unauthenticated = await request.newContext({ baseURL: process.env.WEB_E2E_API_URL });
  const second = await createAccount();
  try {
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login/);
    expect((await unauthenticated.get('/students')).status()).toBe(401);
    const studentName = `Aluno privado ${testInfo.testId.slice(-8)}`;
    const created = await api.post('/students', {
      data: { name: studentName, email: `privado-${testInfo.testId.slice(-8)}@example.invalid` },
    });
    expect(created.status()).toBe(201);
    const student: { id: string } = await created.json();
    const planName = `Plano privado ${testInfo.testId.slice(-8)}`;
    const createdPlan = await api.post('/workout-plans', {
      data: {
        studentId: student.id,
        name: planName,
        startDate: referenceDate,
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: catalogExercise.id,
                exerciseOrder: 0,
                sets: 2,
                reps: '10',
                loadKg: 20,
                restSeconds: 60,
              },
            ],
          },
        ],
      },
    });
    expect(createdPlan.status()).toBe(201);
    const plan: { id: string } = await createdPlan.json();
    await loginAs(page, account);
    await page.screenshot({ path: testInfo.outputPath('isolamento-apos-login.png') });
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
    await loginAs(page, second.account);
    await page.getByRole('link', { name: 'Alunos', exact: true }).first().click();
    await expect(page.getByText(studentName)).toHaveCount(0);
    await page.getByPlaceholder('Buscar aluno…').fill(studentName);
    await expect(page).toHaveURL(/\?q=/);
    await expect(page.getByText('Nenhum aluno encontrado para esta busca.')).toBeVisible();
    await expect(page.getByText(studentName)).toHaveCount(0);
    await page.goto(`/students/${student.id}`);
    await expect(page.getByText(studentName)).toHaveCount(0);
    await page.goto(`/workouts/${plan.id}`);
    await expect(page.getByText(planName)).toHaveCount(0);
    expect((await second.api.get(`/students/${student.id}`)).status()).toBe(404);
    expect((await second.api.get(`/workout-plans/${plan.id}`)).status()).toBe(404);
    expect(await (await api.get(`/students/${student.id}`)).json()).toMatchObject({
      id: student.id,
      name: studentName,
    });
    expect(await (await api.get(`/workout-plans/${plan.id}`)).json()).toMatchObject({
      id: plan.id,
      name: planName,
      studentId: student.id,
    });
    await page.screenshot({ path: testInfo.outputPath('isolamento-final.png') });
  } finally {
    await unauthenticated.dispose();
    await second.api.dispose();
  }
});
