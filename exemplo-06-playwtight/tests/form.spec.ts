import { test, expect } from '@playwright/test';

test.describe('Image form', () => {
  test('submete o formulario e atualiza a lista', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/');

    const title = `Playwright item ${Date.now()}`;
    const imageUrl = `https://picsum.photos/seed/${Date.now()}/300/200`;
    const cards = page.getByRole('article');

    const beforeCount = await cards.count();

    await page.getByRole('textbox', { name: 'Image Title' }).fill(title);
    await page.getByRole('textbox', { name: 'Image URL' }).fill(imageUrl);
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(cards).toHaveCount(beforeCount + 1);
  });

  test('valida campos obrigatorios e URL invalida', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/');

    const cards = page.getByRole('article');
    const beforeCount = await cards.count();

    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText('Please type a title for the image.')).toBeVisible();
    await expect(page.getByText('Please type a valid URL')).toBeVisible();

    await page.getByRole('textbox', { name: 'Image Title' }).fill('Titulo valido');
    await page.getByRole('textbox', { name: 'Image URL' }).fill('url-invalida');
    await page.getByRole('button', { name: 'Submit Form' }).click();

    await expect(page.getByText('Please type a valid URL')).toBeVisible();
    await expect(cards).toHaveCount(beforeCount);
  });
});
