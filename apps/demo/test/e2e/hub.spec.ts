import {expect, test} from 'playwright/test';

test('shows the package choices from the local catalog', async ({page}) => {
  await page.goto('/en');

  const packages = page.locator('[data-npm-package]');
  await expect(packages).toHaveCount(3);
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web-components"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/vue"]')).toBeVisible();
});

test('integrated demo selects an example and preserves it while switching implementations', async ({page}) => {
  await page.goto('/en');

  await expect(
    page.getByRole('heading', {level: 2, name: /Build the moments around your interface/}),
  ).toBeVisible();

  await page.getByRole('link', {name: 'Tooltip'}).first().click();
  await expect(page).toHaveURL(/\/en\/tooltip\?framework=web-components$/);
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="vue"]')).toBeHidden();

  const switcher = page.getByRole('group', {name: 'Implementation'});
  await switcher.getByRole('link', {name: 'Vue'}).click();
  await expect(page).toHaveURL(/\/en\/tooltip\?framework=vue$/);
  await expect(page.locator('[data-framework-panel="vue"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeHidden();

  await page.goto('/en/tooltip?framework=unknown');
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
});
