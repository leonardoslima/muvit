import { randomBytes } from 'node:crypto';
import { type APIRequestContext, type Page, test as base, expect, request } from '@playwright/test';
import { confirmFixtureEmail, receiveVerificationLink } from './verification-helper';

export type Account = { name: string; email: string; password: string; profileId: string };
type Exercise = { id: string; name: string };
type Fixtures = {
  account: Account;
  api: APIRequestContext;
  catalogExercise: Exercise;
  referenceDate: string;
};
const authenticatedPages = new WeakSet<Page>();
const apiUrl = process.env.WEB_E2E_API_URL ?? '';
const webUrl = process.env.WEB_E2E_BASE_URL ?? '';

export async function createAccount(): Promise<{ account: Account; api: APIRequestContext }> {
  const runId = process.env.WEB_E2E_RUN_ID ?? 'missing';
  const suffix = randomBytes(5).toString('hex');
  const name = `Trainer E2E ${suffix}`;
  const email = `web-e2e-${runId}-${suffix}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const api = await request.newContext({ baseURL: apiUrl, extraHTTPHeaders: { Origin: webUrl } });
  try {
    const signup = await api.post('/api/auth/sign-up/email', {
      data: { name, email, password, role: 'trainer' },
    });
    if (!signup.ok()) throw new Error(`Cadastro da fixture falhou: ${signup.status()}`);
    await confirmFixtureEmail(
      () => receiveVerificationLink(email),
      async (token) => (await api.get('/api/auth/verify-email', { params: { token } })).ok(),
      webUrl,
      apiUrl,
    );
    const profileResponse = await api.get('/trainers/me');
    if (!profileResponse.ok())
      throw new Error(`Perfil da fixture falhou: ${profileResponse.status()}`);
    const profile: { id: string } = await profileResponse.json();
    if (!profile.id) throw new Error('Perfil da fixture sem ID');
    return { account: { name, email, password, profileId: profile.id }, api };
  } catch (error) {
    await api.dispose();
    throw error;
  }
}

export async function loginAs(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha').fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(account.name).first()).toBeVisible();
  authenticatedPages.add(page);
}

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright exige desestruturação de fixtures.
  api: async ({}, use) => {
    const fixture = await createAccount();
    accountByApi.set(fixture.api, fixture.account);
    try {
      await use(fixture.api);
    } finally {
      await fixture.api.dispose();
    }
  },
  account: async ({ api }, use) => {
    const profileResponse = await api.get('/trainers/me');
    const profile: { id: string; name: string; email: string } = await profileResponse.json();
    // A senha da conta é mantida apenas em memória pelo contexto da fixture.
    const fixture = accountByApi.get(api);
    if (!fixture || profile.id !== fixture.profileId)
      throw new Error('Conta da fixture indisponível');
    await use(fixture);
  },
  catalogExercise: async ({ api }, use) => {
    const name = `Exercício E2E ${randomBytes(6).toString('hex')}`;
    const response = await api.post('/exercises', { data: { name, muscleGroup: 'full_body' } });
    if (!response.ok()) throw new Error(`Exercício da fixture falhou: ${response.status()}`);
    const exercise: Exercise = await response.json();
    await use(exercise);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright exige desestruturação de fixtures.
  referenceDate: async ({}, use) => {
    await use(new Date().toISOString().slice(0, 10));
  },
});
const accountByApi = new WeakMap<APIRequestContext, Account>();
test.afterEach(async ({ page }, testInfo) => {
  try {
    if (
      testInfo.status !== testInfo.expectedStatus &&
      authenticatedPages.has(page) &&
      !page.url().includes('/login') &&
      (await page.getByLabel('Senha').count()) === 0
    ) {
      await page.screenshot({ path: testInfo.outputPath('falha.png') });
    }
  } finally {
    for (const error of testInfo.errors) {
      error.message = 'Falha no teste; consulte a localização e a captura segura.';
      error.errorContext = undefined;
    }
  }
});
export { expect };
