import {expect, test} from 'playwright/test';

const locales = ['en', 'ko', 'ja'] as const;
const examples = [
  'tooltip',
  'popover',
  'menu',
  'nested-menu',
  'client-point',
  'combobox',
  'placement',
  'middleware',
  'modal',
] as const;
const localizedRoutes = locales.flatMap((locale) => [
  `/${locale}`,
  ...examples.flatMap((example) => [
    `/${locale}/${example}?framework=web-components`,
    `/${locale}/${example}?framework=vue`,
  ]),
]);

test('localized homes and representative examples fit every supported viewport', async ({page}) => {
  for (const route of localizedRoutes) {
    await page.goto(route);
    await expect(page.locator('floating-ui-demo')).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('pattern picker remains keyboard-operable and contained at every viewport', async ({page}) => {
  await page.goto('/ko?framework=vue');

  const picker = page.locator('.pattern-picker');
  const summary = picker.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveAttribute('open', '');

  const panel = picker.locator('.pattern-picker-panel');
  await expect(panel.getByRole('link', {name: '툴팁'})).toBeVisible();
  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width);

  await panel.getByRole('link', {name: '툴팁'}).click();
  await expect(page).toHaveURL(/\/ko\/tooltip\?framework=vue$/);
});
