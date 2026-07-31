import {expect, test} from 'playwright/test';
import axe from 'axe-core';
import {MIDDLEWARE_ARROW} from '../../src/middleware-registry';

test('owns Vue menu navigation, typeahead, and item dismissal', async ({
  page,
}) => {
  await page.goto('/en/menu?framework=vue');
  const trigger = page.getByRole('button', {name: /Open navigator/});
  await trigger.click();
  await trigger.press('ArrowDown');

  const first = page.getByRole('menuitem', {name: /North star/});
  const signal = page.getByRole('menuitem', {name: /Signal log/});
  await expect(first).toBeFocused();
  await first.press('s');
  await expect(signal).toBeFocused();
  await signal.click();
  await expect(page.getByRole('menu')).toBeHidden();
});

test('opens Teleport-backed nested menus', async ({page}) => {
  await page.goto('/en/nested-menu?framework=vue');
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
  const projectTrigger = page.getByRole('menuitem', {
    name: /Move to project/,
  });
  const atlas = page.getByRole('menuitem', {name: /Atlas/});
  await expect(atlas).toBeFocused();
  await atlas.press('Escape');
  await expect(projectMenu).toBeHidden();
  await expect(projectTrigger).toBeFocused();
  await projectTrigger.press('ArrowRight');
  await page.getByRole('menuitem', {name: /Field research/}).click();
  await expect(rootMenu).toBeHidden();
});

test('traps modal focus and closes on Escape', async ({page}) => {
  await page.goto('/en/modal?framework=vue');
  const trigger = page.getByRole('button', {name: /Enter focus room/});
  await trigger.click();
  const dialog = page.getByRole('dialog', {
    name: /You are inside the focus trap/,
  });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(
    Math.abs(dialogBox!.x + dialogBox!.width / 2 - viewport!.width / 2),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(dialogBox!.y + dialogBox!.height / 2 - viewport!.height / 2),
  ).toBeLessThanOrEqual(1);

  const hintTrigger = page.getByRole('button', {name: 'Show placement hint'});
  await hintTrigger.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('z-index', '30');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(23, 58, 50)');
  await expect(tooltip).toHaveCSS('padding', '10px 13px');
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.getByRole('button', {name: 'Open room details'}).click();
  const popover = page.getByRole('dialog', {name: 'Room details'});
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS('z-index', '20');
  expect(
    await popover.evaluate((element) => {
      const portal = element.closest('[data-fup-portal]');
      return portal?.parentElement?.matches('[data-fup-portal]');
    }),
  ).toBe(true);
  await page.getByRole('button', {name: 'Close details'}).click();
  await expect(popover).toBeHidden();
  await page.getByRole('button', {name: 'Open room details'}).click();
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  const nestedDialogTrigger = page.getByRole('button', {
    name: 'Open nested dialog',
  });
  await nestedDialogTrigger.click();
  const nestedDialog = page.getByRole('dialog', {name: 'Nested dialog'});
  await expect(nestedDialog).toBeVisible();
  const nestedDialogBox = await nestedDialog.boundingBox();
  expect(nestedDialogBox).not.toBeNull();
  expect(
    Math.abs(
      nestedDialogBox!.x + nestedDialogBox!.width / 2 - viewport!.width / 2,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      nestedDialogBox!.y + nestedDialogBox!.height / 2 - viewport!.height / 2,
    ),
  ).toBeLessThanOrEqual(1);
  const nestedOverlay = page.locator('.demo-overlay').filter({
    has: nestedDialog,
  });
  await expect(nestedOverlay).toHaveCSS('z-index', '20');
  expect(
    await nestedOverlay.evaluate((element) => {
      const portal = element.closest('[data-fup-portal]');
      return portal?.parentElement?.matches('[data-fup-portal]');
    }),
  ).toBe(true);
  await page
    .getByRole('button', {name: 'Return to focus room'})
    .click();
  await expect(nestedDialog).toBeHidden();
  await expect(nestedDialogTrigger).toBeFocused();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', {name: 'Leave room'}).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('routes to individual Vue examples and the middleware lab', async ({
  page,
}) => {
  const legacyResponse = await page.goto('/vue/examples/tooltip');
  expect(legacyResponse?.status()).toBe(404);

  await page.goto('/en/tooltip?framework=vue');
  await expect(
    page.getByRole('heading', {level: 2, name: 'Pointer and'}),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'All patterns',
  });
  await expect(navigation).toHaveCSS('position', 'sticky');
  await navigation.locator('summary').click();
  await navigation.getByRole('link', {name: 'Popover'}).click();
  await expect(page).toHaveURL(/\/en\/popover\?framework=vue$/);
  await expect(
    navigation.locator('[data-example-link="popover"]'),
  ).toHaveAttribute('aria-current', 'page');

  await page.goto('/en/tooltip?framework=vue');
  await page.getByRole('button', {name: /Inspect signal/}).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'absolute');

  await page.goto('/en/middleware?framework=vue');
  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: /Position with the constraints/}),
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
  const offsetDelta = Math.abs((zeroOffsetBox?.y ?? 0) - (tenOffsetBox?.y ?? 0));
  if ((page.viewportSize()?.width ?? 0) <= 520) {
    expect(offsetDelta).toBeGreaterThan(100);
  } else {
    expect(offsetDelta).toBeCloseTo(10, 0);
  }

  const flipStage = page.locator('[data-kind="flip"] .vue-mw-stage');
  await flipStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(
    page.locator('[data-kind="flip"] .vue-mw-panel'),
  ).toHaveAttribute('data-placement', 'top');
  await flipStage.evaluate((element) => {
    element.scrollTop = 160;
    element.dispatchEvent(new Event('scroll'));
  });
  const flipPanel = page.locator('[data-kind="flip"] .vue-mw-panel');
  await expect(flipPanel).toHaveAttribute('data-placement', 'bottom');
  const [flipStageBox, flipPanelBox] = await Promise.all([
    flipStage.boundingBox(),
    flipPanel.boundingBox(),
  ]);
  expect(flipPanelBox!.x).toBeGreaterThanOrEqual(flipStageBox!.x + 7);
  expect(flipPanelBox!.x + flipPanelBox!.width).toBeLessThanOrEqual(
    flipStageBox!.x + flipStageBox!.width - 7,
  );

  const autoStage = page.locator('[data-kind="auto"] .vue-mw-stage');
  const autoPanel = page.locator('[data-kind="auto"] .vue-mw-panel');
  await autoStage.evaluate((element) => {
    element.scrollTop = 40;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(autoPanel).toHaveAttribute('data-placement', 'top');
  await autoStage.evaluate((element) => {
    element.scrollTop = 190;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(autoPanel).toHaveAttribute('data-placement', 'bottom');
  const [autoStageBox, autoPanelBox] = await Promise.all([
    autoStage.boundingBox(),
    autoPanel.boundingBox(),
  ]);
  expect(autoPanelBox!.x).toBeGreaterThanOrEqual(autoStageBox!.x + 7);
  expect(autoPanelBox!.x + autoPanelBox!.width).toBeLessThanOrEqual(
    autoStageBox!.x + autoStageBox!.width - 7,
  );

  const hideStage = page.locator('[data-kind="hide"] .vue-mw-stage');
  await hideStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(
    page.locator('[data-kind="hide"] .vue-mw-panel'),
  ).toHaveAttribute('data-reference-hidden', 'true');

  const arrowCard = page.locator('[data-kind="arrow"]');
  const arrowPanel = arrowCard.locator('.vue-mw-panel');
  const arrowElement = arrowCard.locator('.vue-mw-arrow');
  const arrowReference = arrowCard.locator('.vue-mw-reference');
  await expect(arrowElement).toBeVisible();
  await expect(arrowPanel).toHaveAttribute('data-placement', 'top');
  const [arrowPanelBox, arrowBox, arrowReferenceBox] = await Promise.all([
    arrowPanel.boundingBox(),
    arrowElement.boundingBox(),
    arrowReference.boundingBox(),
  ]);
  const panelToReferenceGap =
    arrowReferenceBox!.y - (arrowPanelBox!.y + arrowPanelBox!.height);
  const arrowTipToReferenceGap =
    arrowReferenceBox!.y - (arrowBox!.y + arrowBox!.height);
  expect(panelToReferenceGap).toBeCloseTo(
    MIDDLEWARE_ARROW.height + MIDDLEWARE_ARROW.gap,
    0,
  );
  expect(arrowTipToReferenceGap).toBeCloseTo(MIDDLEWARE_ARROW.gap, 0);
  await expect(
    page.locator('[data-kind="inline"] .vue-mw-panel'),
  ).toHaveCount(2);
});

test('placement constants drive all 12 Vue positions', async ({page}) => {
  await page.goto('/en/placement?framework=vue');

  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: /Make placement a product decision/}),
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
  await page.goto('/en/combobox?framework=vue');
  const input = page.getByRole('combobox', {name: 'Destination'});

  await input.focus();
  await expect(page.getByRole('option')).toHaveCount(4);

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
      Boolean(element.closest('[data-fup-portal]')),
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
