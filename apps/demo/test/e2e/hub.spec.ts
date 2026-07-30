import {expect, test} from 'playwright/test';

test('loads published package information once when the hub opens', async ({page}) => {
  let packageRequests = 0;
  await page.route('**/api/npm-packages', async (route) => {
    packageRequests += 1;
    await route.fulfill({
      json: [
        {
          name: '@floating-ui-plus/web',
          version: '9.9.9',
          description: 'Fresh package metadata from npm',
        },
      ],
    });
  });

  await page.goto('/');

  const webPackage = page.locator('[data-npm-package="@floating-ui-plus/web"]');
  await expect(webPackage.getByText('v9.9.9')).toBeVisible();
  await expect(webPackage.locator('[data-npm-package-description]')).toHaveText(
    'Fresh package metadata from npm',
  );
  expect(packageRequests).toBe(1);
});

test('integrated demo selects an example and preserves it while switching implementations', async ({page}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {level: 2, name: /Choose an interaction/}),
  ).toBeVisible();

  await page.getByRole('link', {name: 'Tooltip'}).first().click();
  await expect(page).toHaveURL(/\/tooltip\?framework=web-components$/);
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="vue"]')).toBeHidden();

  const switcher = page.getByRole('group', {name: 'Framework implementation'});
  await switcher.getByRole('link', {name: 'Vue'}).click();
  await expect(page).toHaveURL(/\/tooltip\?framework=vue$/);
  await expect(page.locator('[data-framework-panel="vue"]')).toBeVisible();
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeHidden();

  await page.goto('/tooltip?framework=unknown');
  await expect(page.locator('[data-framework-panel="web-components"]')).toBeVisible();
});
