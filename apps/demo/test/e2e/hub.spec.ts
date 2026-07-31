import {expect, test} from 'playwright/test';

test('shows the package choices from the local catalog', async ({page}) => {
  await page.goto('/');

  const packages = page.locator('[data-npm-package]');
  await expect(packages).toHaveCount(3);
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web-components"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/vue"]')).toBeVisible();
});

test('redirects legacy prefixed English URLs to their canonical routes', async ({page}) => {
  await page.goto('/en');
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/en/tooltip');
  await expect(page).toHaveURL(/\/tooltip$/);
});

test('keeps the selected implementation when the brand returns home', async ({page}) => {
  await page.goto('/ko/popover?framework=vue');

  await page.getByRole('link', {name: 'Floating UI Plus'}).click();

  await expect(page).toHaveURL(/\/ko\?framework=vue$/);
  await expect(page.locator('html')).toHaveAttribute('data-framework', 'vue');
});

test('keeps the selected implementation through home, example, and pattern navigation', async ({page}) => {
  await page.goto('/ko/popover?framework=vue');

  await page.locator('.back-link').click();
  await expect(page).toHaveURL(/\/ko\?framework=vue$/);

  await page.locator('.demo-example-link[data-example-link="tooltip"]').click();
  await expect(page).toHaveURL(/\/ko\/tooltip\?framework=vue$/);

  await page.locator('.pattern-picker > summary').click();
  await page.locator('.pattern-picker-panel [data-example-link="popover"]').click();
  await expect(page).toHaveURL(/\/ko\/popover\?framework=vue$/);
  await expect(page.locator('[data-framework-panel="vue"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeHidden();
});

test('integrated demo selects an example and preserves it while switching implementations', async ({page}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {level: 2, name: /Build the moments around your interface/}),
  ).toBeVisible();

  await page.getByRole('link', {name: 'Tooltip'}).first().click();
  await expect(page).toHaveURL(/\/tooltip\?framework=web-components$/);
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="vue"]')).toBeHidden();

  const switcher = page.getByRole('group', {name: 'Implementation'});
  await switcher.getByRole('link', {name: 'Vue'}).click();
  await expect(page).toHaveURL(/\/tooltip\?framework=vue$/);
  await expect(page.locator('[data-framework-panel="vue"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeHidden();

  await page.goto('/tooltip?framework=unknown');
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
});

test('preserves the selected framework when switching locale', async ({page}) => {
  await page.goto('/ko/modal?framework=vue');

  await page.getByRole('link', {name: 'English'}).click();

  await expect(page).toHaveURL(/\/modal\?framework=vue$/);
  await expect(page.locator('[data-framework-panel="vue"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeHidden();
});
