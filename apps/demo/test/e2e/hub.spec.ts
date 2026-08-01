import {expect, test} from 'playwright/test';

test('shows the package choices from the local catalog', async ({page}) => {
  await page.goto('/');

  const packages = page.locator('[data-npm-package]');
  await expect(packages).toHaveCount(3);
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/web-components"]')).toBeVisible();
  await expect(page.locator('[data-npm-package="@floating-ui-plus/vue"]')).toBeVisible();
});

test('explains the custom-overlay foundation and React path', async ({page}) => {
  await page.goto('/ko');

  const foundation = page.locator('.why-plus');
  await expect(foundation).toContainText('UI 키트가 아닙니다.');
  await expect(
    foundation.getByRole('link', {name: '@floating-ui/react를 사용하세요.'}),
  ).toHaveAttribute('href', 'https://floating-ui.com/docs/react');
});

test('uses component names and applied-function badges on every example', async ({page}) => {
  const examples = [
    ['tooltip', 'Tooltip'],
    ['popover', 'Popover'],
    ['menu', 'Menu'],
    ['nested-menu', 'Nested menu'],
    ['client-point', 'Client point'],
    ['combobox', 'Combobox'],
    ['placement', 'Placement'],
    ['middleware', 'Middleware'],
    ['modal', 'Modal'],
  ] as const;

  for (const [path, title] of examples) {
    await page.goto(`/${path}`);
    const route = page.locator('.route-copy');
    await expect(route.getByRole('heading', {level: 2, name: title})).toBeVisible();
    await expect(route.locator(':scope > .section-kicker')).toHaveCount(0);
    await expect(route.locator('.implementation-badge')).not.toHaveCount(0);
    await expect(route.locator('.implementation-summary')).toBeVisible();
  }

  await page.goto('/tooltip');
  await expect(page.locator('.implementation-badge[data-badge-tone]')).toHaveCount(7);
  await expect(page.locator('.implementation-summary')).toContainText('pointer');
  await expect(page.locator('.implementation-summary')).not.toContainText('hover()');
  await expect(page.locator('.implementation-badge--cyan')).toHaveCount(2);
  await expect(page.locator('.implementation-badge--lavender')).toHaveCount(2);
  await expect(page.locator('.implementation-badge--coral')).toHaveCount(1);
  await expect(page.locator('.implementation-badge--mint')).toHaveCount(1);
  await expect(page.locator('.implementation-badge--gold')).toHaveCount(1);
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
