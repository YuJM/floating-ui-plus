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
  'sheet',
  'toast',
  'command',
] as const;
const localizedRoutes = locales.flatMap((locale) => [
  locale === 'en' ? '/' : `/${locale}`,
  ...examples.flatMap((example) => [
    `${locale === 'en' ? '' : `/${locale}`}/${example}?framework=wc`,
    `${locale === 'en' ? '' : `/${locale}`}/${example}?framework=vue`,
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
  const trigger = picker.locator('.pattern-picker-trigger');
  await trigger.focus();
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

test('pattern picker native popover remains content-sized after floating styles apply', async ({page}) => {
  await page.goto('/');

  const picker = page.locator('#pattern-picker-root');
  await picker.locator('.pattern-picker-trigger').click();
  await expect(picker).toHaveAttribute('open', '');

  const panel = picker.locator('.pattern-picker-panel');
  await expect(panel).toBeVisible();
  const metrics = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      height: rect.height,
      viewportHeight: window.innerHeight,
      inlineRight: element.style.right,
      inlineBottom: element.style.bottom,
      inlineHeight: element.style.height,
      computedRight: style.right,
      computedBottom: style.bottom,
    };
  });

  expect(metrics.height).toBeLessThan(400);
  expect(metrics.inlineRight).toBe('auto');
  expect(metrics.inlineBottom).toBe('auto');
  expect(metrics.inlineHeight).toBe('auto');
  expect(metrics.computedRight).not.toBe('0px');
  expect(metrics.computedBottom).not.toBe('0px');
});

test('pattern picker constrains a short mobile viewport and exposes every example', async ({page}) => {
  await page.setViewportSize({width: 390, height: 480});
  await page.goto('/');

  const picker = page.locator('.pattern-picker');
  await picker.locator('.pattern-picker-trigger').click();
  const panel = picker.locator('.pattern-picker-panel');
  const viewport = page.viewportSize();
  const panelBox = await panel.boundingBox();

  expect(viewport).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport!.height);
  await expect(panel).toHaveCSS('overflow-y', 'auto');
  expect(
    await panel.evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);

  const lastExample = panel.locator('a[href*="/command"]');
  await lastExample.scrollIntoViewIfNeeded();
  await lastExample.click();
  await expect(page).toHaveURL(/\/command\?framework=wc$/);
});
