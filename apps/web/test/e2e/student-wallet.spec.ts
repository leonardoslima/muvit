import type { Page } from '@playwright/test';
import { expect, loginAs, test } from './fixtures';

const STUDENT_COUNT = 52;
const WALLET_NAMES = Array.from(
  { length: STUDENT_COUNT },
  (_, index) => `Carteira ${String(index + 1).padStart(3, '0')}`,
);
const STUDENT_ID_PATTERN = /^\/students\/([0-9a-f-]{36})$/;

test('percorre a carteira paginada com contagem global e filtros preservados', async ({
  page,
  account,
  api,
}, testInfo) => {
  testInfo.setTimeout(300_000);

  const createdIds: string[] = [];
  await test.step('cria 52 alunos sintéticos pausados', async () => {
    for (const name of WALLET_NAMES) {
      const response = await api.post('/students', { data: { name, status: 'paused' } });
      expect(response.status()).toBe(201);
      const student: { id: string; name: string; status: string } = await response.json();
      expect(student).toMatchObject({ name, status: 'paused' });
      createdIds.push(student.id);
    }
    expect(new Set(createdIds).size).toBe(STUDENT_COUNT);
  });

  await loginAs(page, account);

  await test.step('dashboard oferece CTA sem falsa paginação', async () => {
    await expect(page).toHaveURL(/\/dashboard$/);
    const section = page.getByRole('region', { name: 'Lista de alunos' });
    await expect(section.getByText('Mostrando 5 de 52 alunos')).toBeVisible();
    await expect(section.getByRole('link', { name: 'Ver todos os alunos' })).toHaveAttribute(
      'href',
      '/students',
    );
    await expect(section.getByRole('button', { name: 'Anterior' })).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Próxima' })).toHaveCount(0);
    await expect(section.getByRole('link', { name: 'Próxima' })).toHaveCount(0);
    await expect(section.getByRole('link', { name: 'Anterior' })).toHaveCount(0);
    await expect(section.getByRole('link', { name: '2', exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('dashboard-previa.png') });
  });

  await test.step('carteira pagina 1 e 2 com 52 IDs distintos', async () => {
    await page.getByRole('link', { name: 'Ver todos os alunos' }).click();
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByText('52 alunos cadastrados')).toBeVisible();
    await expect(page.getByText('Mostrando 1–50 de 52 alunos')).toBeVisible();
    await expect(page.getByText('Página 1 de 2')).toBeVisible();

    const firstPageIds = await collectWalletIds(page);
    expect(firstPageIds).toHaveLength(50);
    await page.screenshot({ path: testInfo.outputPath('carteira-pagina-1.png') });

    await page.getByRole('link', { name: 'Próxima' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('Mostrando 51–52 de 52 alunos')).toBeVisible();
    await expect(page.getByText('Página 2 de 2')).toBeVisible();

    const secondPageIds = await collectWalletIds(page);
    expect(secondPageIds).toHaveLength(2);
    await page.screenshot({ path: testInfo.outputPath('carteira-pagina-2.png') });

    const union = [...firstPageIds, ...secondPageIds];
    expect(new Set(union).size).toBe(STUDENT_COUNT);
    expect([...union].sort()).toEqual([...createdIds].sort());
  });

  await test.step('abre o perfil do aluno 052 e volta ao histórico da página 2', async () => {
    await expect(page.getByText('Carteira 052')).toBeVisible();
    await page
      .getByRole('link', { name: /Carteira 052/ })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/students/${createdIds.at(-1)}$`));
    await expect(page.getByText('Carteira 052').first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/students\?page=2$/);
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    expect(await collectWalletIds(page)).toHaveLength(2);
  });

  await test.step('status=paused preserva filtro ao navegar', async () => {
    await page.goto('/students?status=paused');
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await page.getByRole('link', { name: 'Próxima' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('paused');
    await expect(page.getByText('Página 2 de 2')).toBeVisible();

    await page.getByRole('link', { name: 'Anterior' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('paused');
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBeNull();
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
  });

  await test.step('busca preserva termo e status na paginação e histórico', async () => {
    const search = page.getByPlaceholder(/Buscar aluno/);
    await search.fill('Carteira');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Carteira');
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBeNull();
    await expect(page.getByText('52 alunos encontrados')).toBeVisible();

    await page.getByRole('link', { name: 'Próxima' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Carteira');
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('paused');
    await expect(search).toHaveValue('Carteira');

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Carteira');
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBeNull();
    await expect(search).toHaveValue('Carteira');

    await page.goForward();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect(search).toHaveValue('Carteira');

    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect(search).toHaveValue('Carteira');
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
  });

  await test.step('busca a partir da página 2 reinicia a página e mantém totais', async () => {
    const search = page.getByPlaceholder(/Buscar aluno/);
    await search.fill('Carteira 052');
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBeNull();
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Carteira 052');
    await expect(page.getByText('52 alunos cadastrados')).toBeVisible();
    await expect(page.getByText('1 aluno encontrado')).toBeVisible();
    await expect(page.getByText('Mostrando 1–1 de 1 alunos')).toBeVisible();
    await expect(page.getByText('Carteira 052')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  await test.step('busca sem resultados distingue total global e filtrado', async () => {
    const search = page.getByPlaceholder(/Buscar aluno/);
    await search.fill('Carteira 999');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Carteira 999');
    await expect(page.getByText('52 alunos cadastrados')).toBeVisible();
    await expect(
      page.getByText('Nenhum aluno encontrado para os filtros aplicados.'),
    ).toBeVisible();
    await expect(page.getByText('0 alunos encontrados')).toBeVisible();
    await expect(page.getByText('Mostrando 0 de 0 alunos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cadastrar primeiro aluno' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('carteira-vazio-filtrado.png') });
  });

  await test.step('limpar a busca recupera a navegação da carteira', async () => {
    const search = page.getByPlaceholder(/Buscar aluno/);
    await search.fill('');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBeNull();
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await expect(page.getByText('Mostrando 1–50 de 52 alunos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Próxima' })).toBeVisible();
    expect(await collectWalletIds(page)).toHaveLength(50);

    await page.goto('/students');
    await expect(page.getByText('52 alunos cadastrados')).toBeVisible();
    await expect(page.getByText(/alunos encontrados/)).toHaveCount(0);
  });
});

async function collectWalletIds(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('a[href^="/students/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  const ids = hrefs
    .map((href) => STUDENT_ID_PATTERN.exec(href)?.[1])
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)];
}
