const { test, expect } = require('@playwright/test');

test('deve carregar a aplicação na home', async ({ page }) => {
  await page.goto('/vanilla-js-web-app-example/');

  await expect(page).toHaveURL(/\/vanilla-js-web-app-example\/?$/);
  await expect(page).toHaveTitle('TDD Frontend Example');
  await expect(page.getByRole('textbox', { name: 'Image Title' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Image URL' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Form' })).toBeVisible();
});
