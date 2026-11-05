import { randomBytes } from 'node:crypto';
import { expect, test } from './fixtures';
import { receiveVerificationLink } from './verification-helper';

test('cadastro pendente, reenvio e confirmação liberam o dashboard', async ({ page }) => {
  const email = `web-e2e-${process.env.WEB_E2E_RUN_ID}-${randomBytes(5).toString('hex')}@example.invalid`;
  const password = `Aa1-${randomBytes(18).toString('base64url')}`;
  await page.goto('/signup');
  await page.getByLabel('Nome').fill('Personal E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/verify-email/);
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();
  expect((await page.request.get(`${process.env.WEB_E2E_API_URL}/trainers/me`)).status()).toBe(403);
  await receiveVerificationLink(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByText(/Se houver uma conta pendente/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Aguarde/ })).toBeDisabled();
  const link = await receiveVerificationLink(email);
  const url = new URL(link);
  expect(url.origin).toBe(process.env.WEB_E2E_API_URL);
  expect(url.pathname).toBe('/api/auth/verify-email');
  await page.goto(link);
  await expect(page).toHaveURL(/\/dashboard/);
  expect((await page.request.get(`${process.env.WEB_E2E_API_URL}/trainers/me`)).status()).toBe(200);
});

test('link inválido mantém a conta fora do dashboard', async ({ page }) => {
  await page.goto('/verify-email?error=INVALID_TOKEN');
  await expect(page.getByRole('alert').filter({ hasText: 'inválido ou expirou' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
