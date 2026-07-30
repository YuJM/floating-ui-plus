import {expect, test} from 'playwright/test';
import axe from 'axe-core';

test('opens Teleport-backed nested menus', async ({page}) => {
  await page.goto('/vue');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Floating UI Plus\s*Vue demo/,
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
  await page.goto('/vue');
  const trigger = page.getByRole('button', {name: /Enter focus room/});
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('routes to individual Vue examples and the middleware lab', async ({
  page,
}) => {
  await page.goto('/vue/examples/tooltip');
  await expect(
    page.getByRole('heading', {level: 2, name: 'Pointer and'}),
  ).toBeVisible();
  await page.getByRole('button', {name: /Inspect signal/}).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'absolute');

  await page.goto('/vue/middleware');
  await expect(
    page.getByRole('heading', {level: 2, name: /Position with intent/}),
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
  await page.goto('/vue/placement');

  await expect(
    page.getByRole('heading', {level: 2, name: /Choose a constant/}),
  ).toBeVisible();
  await expect(page.locator('[data-placement-control]')).toHaveCount(12);

  const floating = page.locator('.vue-placement-floating');
  const reference = page.locator('.vue-placement-reference');
  await expect(floating).toHaveAttribute('data-placement', 'top');

  const bottomStart = page.getByRole('button', {
    name: 'Place floating element at bottom-start',
  });
  await bottomStart.click();
  await expect(bottomStart).toHaveAttribute('aria-pressed', 'true');
  await expect(floating).toHaveAttribute('data-placement', 'bottom-start');
  await expect(page.locator('.vue-placement-readout')).toContainText(
    'PLACEMENT.BOTTOM_START',
  );

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
  await page.goto('/vue/examples/combobox');
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
