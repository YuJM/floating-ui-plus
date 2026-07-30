import {expect, test} from 'playwright/test';

test('integrated hub links both rendering surfaces', async ({page}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {level: 1, name: /One kernel.*Two surfaces/}),
  ).toBeVisible();

  const webComponents = page.getByRole('link', {name: /Web Components/});
  const vue = page.locator('a[href="/vue"]').filter({hasText: 'Vue'});

  await expect(webComponents).toHaveAttribute('href', '/web-components');
  await expect(vue).toHaveAttribute('href', '/vue');

  await webComponents.click();
  await expect(page).toHaveURL(/\/web-components$/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Floating UI Plus\s*Web Components/,
    }),
  ).toBeVisible();

  await page.goto('/');
  await vue.click();
  await expect(page).toHaveURL(/\/vue$/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Floating UI Plus\s*Vue demo/,
    }),
  ).toBeVisible();
});
