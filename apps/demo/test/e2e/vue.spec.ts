import {expect, test} from 'playwright/test';
import axe from 'axe-core';
import {MIDDLEWARE_ARROW} from '../../src/middleware-registry';

test('owns Vue menu navigation, typeahead, and item dismissal', async ({
  page,
}) => {
  await page.goto('/menu?framework=vue');
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

test('opens native nested menu popovers in place', async ({page}) => {
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
  await expect(rootMenu).toHaveAttribute('popover', 'manual');
  await expect(rootMenu).not.toHaveAttribute('data-fup-portal');

  await page
    .getByRole('menuitem', {name: /Move to project/})
    .press('ArrowRight');
  const projectMenu = page.getByTestId('project-menu');
  await expect(projectMenu).toBeVisible();
  await expect(projectMenu).toHaveAttribute('popover', 'manual');
  await expect(projectMenu).not.toHaveAttribute('data-fup-portal');
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
  await page.goto('/modal?framework=vue');
  const demo = page.locator('[data-framework-panel="vue"]');
  const trigger = demo.getByRole('button', {name: /Enter focus room/});
  await trigger.click();
  const dialog = demo.getByRole('dialog', {
    name: /You are inside the focus trap/,
  });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
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

  const hintTrigger = demo.getByRole('button', {name: 'Show placement hint'});
  await hintTrigger.hover();
  const tooltip = demo.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('z-index', '30');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(23, 58, 50)');
  await expect(tooltip).toHaveCSS('padding', '10px 13px');
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await demo.getByRole('button', {name: 'Open room details'}).click();
  const popover = demo.getByRole('dialog', {name: 'Room details'});
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => {
      return (
        element.matches(':popover-open') &&
        document.querySelector('.vue-modal-demo')?.contains(element)
      );
    }),
  ).toBe(true);
  await demo.getByRole('button', {name: 'Close details'}).click();
  await expect(popover).toBeHidden();
  await demo.getByRole('button', {name: 'Open room details'}).click();
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  const nestedDialogTrigger = demo.getByRole('button', {
    name: 'Open nested dialog',
  });
  await nestedDialogTrigger.click();
  const nestedDialog = demo.getByRole('dialog', {name: 'Nested dialog'});
  await expect(nestedDialog).toBeVisible();
  expect(
    await nestedDialog.evaluate((element) => element.matches(':modal')),
  ).toBe(true);
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
  await page.getByRole('button', {name: 'Return to focus room'}).click();
  await expect(nestedDialog).toBeHidden();
  await expect(nestedDialogTrigger).toBeFocused();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await demo.getByRole('button', {name: 'Leave room'}).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('opens the Vue edge sheet as a modal and restores focus on Escape', async ({
  page,
}) => {
  await page.goto('/sheet?framework=vue');
  const demo = page.locator('[data-framework-panel="vue"]');
  const trigger = demo.getByRole('button', {name: /Open activity sheet/});
  const sheet = demo.getByRole('dialog', {name: 'Activity digest'});

  await trigger.click();
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
  const box = await sheet.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x + box!.width).toBeCloseTo(viewport!.width, 0);
  expect(box!.height).toBeCloseTo(viewport!.height, 0);

  await page.mouse.click(20, Math.round(viewport!.height / 2));
  await expect(sheet).toHaveCSS('transition-property', /display/);
  await expect(sheet).toHaveCSS('transition-property', /overlay/);
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('places every Vue sheet side on the viewport edge after reopening', async ({
  page,
}) => {
  await page.goto('/sheet?framework=vue');
  const demo = page.locator('[data-framework-panel="vue"]');
  const trigger = demo.getByRole('button', {name: /Open activity sheet/});
  const sheet = demo.getByRole('dialog', {name: 'Activity digest'});
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    await demo
      .getByRole('button', {name: new RegExp(`^${side}$`, 'i')})
      .click();
    for (let opening = 0; opening < 2; opening++) {
      await trigger.click();
      await expect(sheet).toBeVisible();
      await expect(sheet).toHaveAttribute('data-side', side);
      await expect
        .poll(async () => {
          const current = await sheet.boundingBox();
          if (!current) return Number.POSITIVE_INFINITY;
          if (side === 'top') return Math.abs(current.y);
          if (side === 'right') {
            return Math.abs(viewport!.width - current.x - current.width);
          }
          if (side === 'bottom') {
            return Math.abs(viewport!.height - current.y - current.height);
          }
          return Math.abs(current.x);
        })
        .toBeLessThanOrEqual(1);
      const box = await sheet.boundingBox();
      expect(box).not.toBeNull();
      if (side === 'top') {
        expect(box!.width).toBeCloseTo(viewport!.width, 0);
      } else if (side === 'right') {
        expect(box!.height).toBeCloseTo(viewport!.height, 0);
      } else if (side === 'bottom') {
        expect(box!.width).toBeCloseTo(viewport!.width, 0);
      } else {
        expect(box!.height).toBeCloseTo(viewport!.height, 0);
      }
      await sheet.getByRole('button', {name: 'Close sheet'}).click();
      await expect(sheet).toBeHidden();
    }
  }
});

test('stacks, pauses, focuses, and dismisses Vue toasts', async ({page}) => {
  await page.goto('/toast?framework=vue');
  const create = page.getByRole('button', {name: /Create notification/});
  const viewport = page.getByRole('region', {name: 'Notifications'});

  await create.click();
  await create.click();
  await expect(viewport.locator('.toast-item')).toHaveCount(2);
  await expect(viewport.locator('.toast-item').first()).toHaveAttribute(
    'data-status',
    'open',
  );

  await viewport.locator('.toast-item').first().hover();
  await expect(viewport).toHaveAttribute('data-expanded', '');
  await page.keyboard.press('F6');
  await expect(viewport).toBeFocused();

  await viewport.getByRole('button', {name: 'Dismiss notification 1'}).click();
  await expect(
    viewport.getByRole('button', {name: 'Dismiss notification 1'}),
  ).toHaveCount(0);
});

test('routes to individual Vue examples and the middleware lab', async ({
  page,
}) => {
  const legacyResponse = await page.goto('/vue/examples/tooltip');
  expect(legacyResponse?.status()).toBe(404);

  await page.goto('/tooltip?framework=vue');
  await expect(
    page.getByRole('heading', {level: 2, name: 'Tooltip'}),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'All patterns',
  });
  await expect(navigation).toHaveCSS('position', 'sticky');
  await navigation.locator('.pattern-picker-trigger').click();
  await navigation.getByRole('link', {name: 'Popover'}).click();
  await expect(page).toHaveURL(/\/popover\?framework=vue$/);
  await expect(
    navigation.locator('[data-example-link="popover"]'),
  ).toHaveAttribute('aria-current', 'page');

  await page.goto('/tooltip?framework=vue');
  await page.getByRole('button', {name: /Inspect signal/}).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'absolute');
  await expect(tooltip).toHaveAttribute('data-placement', /^top/);
  expect(
    await tooltip.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        startY: style.getPropertyValue('--surface-motion-start-y').trim(),
        origin: style.getPropertyValue('--surface-motion-origin').trim(),
      };
    }),
  ).toEqual({startY: '.25rem', origin: '50% 100%'});

  await page.goto('/middleware?framework=vue');
  await expect(
    page
      .locator('.route-copy')
      .getByRole('heading', {level: 2, name: 'Middleware'}),
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
  const offsetDelta = Math.abs(
    (zeroOffsetBox?.y ?? 0) - (tenOffsetBox?.y ?? 0),
  );
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
  await expect(page.locator('[data-kind="inline"] .vue-mw-panel')).toHaveCount(
    2,
  );
});

test('placement constants drive all 12 Vue positions', async ({page}) => {
  await page.goto('/placement?framework=vue');

  await expect(
    page
      .locator('.route-copy')
      .getByRole('heading', {level: 2, name: 'Placement'}),
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

test('multilingual Vue combobox keeps input focus in a native popover', async ({
  page,
}) => {
  await page.goto('/combobox?framework=vue');
  const input = page.getByRole('combobox', {
    name: 'Destination',
    exact: true,
  });
  const vuePanel = page.locator('[data-framework-panel="vue"]');

  await vuePanel.getByRole('tab', {name: 'Server search'}).click();
  await expect(page).toHaveURL(/\/combobox\?framework=vue&source=server$/);
  await expect(
    vuePanel.getByRole('combobox', {name: 'Remote destination'}),
  ).toBeVisible();
  await vuePanel.getByRole('tab', {name: 'Fuzzy search'}).click();
  await expect(page).toHaveURL(/\/combobox\?framework=vue&source=fuzzy$/);
  await expect(input).toBeVisible();

  await input.focus();
  await expect(page.getByRole('option')).toHaveCount(4);
  await vuePanel.locator('[data-search-sample="bejing"]').click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('bejing');
  const firstResult = page.getByRole('option', {name: /^北京/});
  await expect(firstResult).toBeVisible();
  await expect(firstResult).toHaveCSS('min-height', '58px');
  await expect(firstResult).toHaveCSS('padding', '9px 11px');
  await expect(firstResult).toHaveCSS('border-radius', '8px');

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
    await expect(
      page.getByRole('option', {name: new RegExp(expected)}),
    ).toBeVisible();
  }

  await input.fill('');
  await expect(page.getByRole('option')).toHaveCount(4);

  await input.fill('bejing');
  const option = page.getByRole('option', {name: /北京/});
  await expect(option).toBeVisible();
  const popup = page.locator('[data-floating-query-popup]:visible');
  await expect(popup).toHaveAttribute('popover', 'manual');
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest('[data-fup-portal]')),
    ),
  ).toBe(false);

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
      include: [['.vue-combobox-card'], ['[data-floating-query-popup]']],
    });
    return result.violations.filter((violation: {impact: string | null}) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    );
  });
  expect(violations).toEqual([]);
  await input.press('Escape');
  await expect(popup).toBeHidden();
});

test('async Vue server combobox renders loading and ignores stale requests', async ({
  page,
}) => {
  await page.goto('/combobox?framework=vue&source=server');
  const input = page.getByRole('combobox', {name: 'Remote destination'});
  const popup = page.locator('.vue-async-combobox-popup');

  await input.focus();
  await input.fill('seo');
  await expect(popup.getByText('Querying remote endpoint…')).toBeVisible();
  await input.fill('bei');
  await expect(popup.getByRole('option', {name: /^北京/})).toBeVisible();
  await expect(popup.getByRole('option', {name: /^서울/})).toHaveCount(0);

  await input.fill('no-remote-match');
  await expect(popup.getByText(/server found no match/)).toBeVisible();
  await input.fill('');
  await expect(popup.getByRole('option')).toHaveCount(4);

  await input.fill('tokyo');
  await expect(popup.getByText('Querying remote endpoint…')).toBeVisible();
  await expect(popup.getByRole('option')).toHaveCount(1);
  const option = popup.getByRole('option', {name: /^東京/});
  await expect(option).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('東京');
  await expect(popup).toBeHidden();
});
