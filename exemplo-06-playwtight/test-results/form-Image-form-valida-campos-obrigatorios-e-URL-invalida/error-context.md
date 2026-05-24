# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form.spec.ts >> Image form >> valida campos obrigatorios e URL invalida
- Location: form.spec.ts:21:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/vanilla-js-web-app-example/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Image form', () => {
  4  |   test('submete o formulario e atualiza a lista', async ({ page }) => {
  5  |     await page.goto('/vanilla-js-web-app-example/');
  6  | 
  7  |     const title = `Playwright item ${Date.now()}`;
  8  |     const imageUrl = `https://picsum.photos/seed/${Date.now()}/300/200`;
  9  |     const cards = page.getByRole('article');
  10 | 
  11 |     const beforeCount = await cards.count();
  12 | 
  13 |     await page.getByRole('textbox', { name: 'Image Title' }).fill(title);
  14 |     await page.getByRole('textbox', { name: 'Image URL' }).fill(imageUrl);
  15 |     await page.getByRole('button', { name: 'Submit Form' }).click();
  16 | 
  17 |     await expect(page.getByRole('heading', { name: title })).toBeVisible();
  18 |     await expect(cards).toHaveCount(beforeCount + 1);
  19 |   });
  20 | 
  21 |   test('valida campos obrigatorios e URL invalida', async ({ page }) => {
> 22 |     await page.goto('/vanilla-js-web-app-example/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  23 | 
  24 |     const cards = page.getByRole('article');
  25 |     const beforeCount = await cards.count();
  26 | 
  27 |     await page.getByRole('button', { name: 'Submit Form' }).click();
  28 | 
  29 |     await expect(page.getByText('Please type a title for the image.')).toBeVisible();
  30 |     await expect(page.getByText('Please type a valid URL')).toBeVisible();
  31 | 
  32 |     await page.getByRole('textbox', { name: 'Image Title' }).fill('Titulo valido');
  33 |     await page.getByRole('textbox', { name: 'Image URL' }).fill('url-invalida');
  34 |     await page.getByRole('button', { name: 'Submit Form' }).click();
  35 | 
  36 |     await expect(page.getByText('Please type a valid URL')).toBeVisible();
  37 |     await expect(cards).toHaveCount(beforeCount);
  38 |   });
  39 | });
  40 | 
```