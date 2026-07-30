import {expect, test} from 'playwright/test';
import axe from 'axe-core';

test('opens Teleport-backed nested menus', async ({page}) => {
  await page.goto('/nested-menu?framework=vue');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Floating UI Plus/,
    }),
  ).toBeVisible();
  await page.getByRole('button', {name: 'Open actions'}).click();
  const rootMenu = page.getByTestId('actions-menu');
  await expect(rootMenu).toBeVisible();
  await expect(rootMenu).toHaveCSS('position', 'absolute');

  await page.getByRole('menuitem', {name: /Move to project/}).press('ArrowRight');
  const projectMenu = page.getByTestId('project-menu');
  await expect(projectMenu).toBeVisible();
  await expect(projectMenu).toHaveCSS('position', 'absolute');
  expect((await projectMenu.boundingBox())?.y).toBeGreaterThan(0);
  await expect(page.getByRole('menuitem', {name: /Atlas/})).toBeVisible();
});

test('traps modal focus and closes on Escape', async ({page}) => {
  await page.goto('/modal?framework=vue');
  const trigger = page.getByRole('button', {name: /Enter focus room/});
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: /Focus room/});
  await expect(dialog).toBeVisible();

  const hintTrigger = page.getByRole('button', {name: 'Show placement hint'});
  await hintTrigger.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.getByRole('button', {name: 'Open room details'}).click();
  const popover = page.getByRole('dialog', {name: 'Room details'});
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.getByRole('button', {name: 'Open nested dialog'}).click();
  const nestedDialog = page.getByRole('dialog', {name: 'Nested dialog'});
  await expect(nestedDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nestedDialog).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('routes to individual Vue examples and the middleware lab', async ({
  page,
}) => {
  const legacyResponse = await page.goto('/vue/examples/tooltip');
  expect(legacyResponse?.status()).toBe(404);

  await page.goto('/tooltip?framework=vue');
  await expect(
    page.getByRole('heading', {level: 2, name: 'Pointer and'}),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'Integrated demo navigation',
  });
  await expect(navigation).toHaveCSS('position', 'sticky');
  await navigation.getByRole('link', {name: 'Popover'}).click();
  await expect(page).toHaveURL(/\/popover\?framework=vue$/);
  await expect(
    navigation.getByRole('link', {name: 'Popover'}),
  ).toHaveAttribute('aria-current', 'page');

  await page.goto('/tooltip?framework=vue');
  await page.getByRole('button', {name: /Inspect signal/}).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'absolute');

  await page.goto('/middleware?framework=vue');
  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: /Position with intent/}),
  ).toBeVisible();
  await expect(page.locator('.vue-middleware-card')).toHaveCount(8);
  await expect(page.locator('.vue-mw-panel')).toHaveCount(10);
  await expect(page.locator('.vue-middleware-title a')).toHaveCount(8);
  await expect(
    page.getByRole('link', {
      name: 'Auto placement middleware official documentation',
    }),
  ).toHaveAttribute('href', 'https://floating-ui.com/docs/autoplacement');

  const offsetPanels = page.locator('[data-kind="offset"] .vue-mw-panel');
  await expect(offsetPanels).toHaveCount(2);
  const zeroOffsetBox = await offsetPanels.nth(0).boundingBox();
  const tenOffsetBox = await offsetPanels.nth(1).boundingBox();
  expect(Math.abs((zeroOffsetBox?.y ?? 0) - (tenOffsetBox?.y ?? 0))).toBeCloseTo(
    10,
    0,
  );

  const flipStage = page.locator('[data-kind="flip"] .vue-mw-stage');
  await flipStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(
    page.locator('[data-kind="flip"] .vue-mw-panel'),
  ).toHaveAttribute('data-placement', 'top');

  const hideStage = page.locator('[data-kind="hide"] .vue-mw-stage');
  await hideStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(
    page.locator('[data-kind="hide"] .vue-mw-panel'),
  ).toHaveAttribute('data-reference-hidden', 'true');

  await expect(
    page.locator('[data-kind="arrow"] .vue-mw-arrow'),
  ).toBeVisible();
  await expect(
    page.locator('[data-kind="inline"] .vue-mw-panel'),
  ).toHaveCount(2);
});

test('placement constants drive all 12 Vue positions', async ({page}) => {
  await page.goto('/placement?framework=vue');

  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: /Choose a constant/}),
  ).toBeVisible();
  const vuePanel = page.locator('[data-framework-panel="vue"]');
  await expect(vuePanel.locator('[data-placement-control]')).toHaveCount(12);

  const floating = vuePanel.locator('.vue-placement-floating');
  const reference = vuePanel.locator('.vue-placement-reference');
  await expect(floating).toHaveAttribute('data-placement', 'top');

  const bottomStart = vuePanel.getByRole('button', {
    name: 'Place floating element at bottom-start',
  });
  await bottomStart.click();
  await expect(bottomStart).toHaveAttribute('aria-pressed', 'true');
  await expect(floating).toHaveAttribute('data-placement', 'bottom-start');

  const [floatingBox, referenceBox] = await Promise.all([
    floating.boundingBox(),
    reference.boundingBox(),
  ]);
  expect(floatingBox).not.toBeNull();
  expect(referenceBox).not.toBeNull();
  expect(floatingBox!.y).toBeGreaterThan(
    referenceBox!.y + referenceBox!.height,
  );
  expect(Math.abs(floatingBox!.x - referenceBox!.x)).toBeLessThanOrEqual(2);
});

test('multilingual Vue combobox keeps input focus and teleports results', async ({
  page,
}) => {
  await page.goto('/combobox?framework=vue');
  const input = page.getByRole('combobox', {name: 'Destination'});

  for (const [query, expected] of [
    ['서을', '서울'],
    ['とうきょ', '東京'],
    ['bejing', '北京'],
    ['munchen', 'München'],
    ['대한민국', '서울'],
    ['日本', '東京'],
    ['china', '北京'],
    ['deutschland', 'München'],
  ] as const) {
    await input.fill(query);
    await expect(page.getByRole('option', {name: new RegExp(expected)}))
      .toBeVisible();
  }

  await input.fill('bejing');
  const option = page.getByRole('option', {name: /北京/});
  await expect(option).toBeVisible();
  const popup = page.locator('[data-floating-combobox-popup]');
  await expect(popup).toHaveCSS('position', 'absolute');
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest('[data-floating-ui-plus-portal]')),
    ),
  ).toBe(true);

  await input.press('ArrowDown');
  await expect(input).toBeFocused();
  await expect
    .poll(() => input.getAttribute('aria-activedescendant'))
    .toBe(await option.getAttribute('id'));
  await input.press('Enter');
  await expect(input).toHaveValue('北京');
  await expect(popup).toBeHidden();

  await input.fill('no-such-destination');
  await expect(page.getByText(/No destination found/)).toBeVisible();

  await page.addScriptTag({content: axe.source});
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({
      include: [
        ['.vue-combobox-card'],
        ['[data-floating-combobox-popup]'],
      ],
    });
    return result.violations.filter((violation: {impact: string | null}) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    );
  });
  expect(violations).toEqual([]);
  await input.press('Escape');
  await expect(popup).toBeHidden();
});
