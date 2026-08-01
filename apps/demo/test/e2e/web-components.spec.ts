import {expect, test} from 'playwright/test';
import axe from 'axe-core';
import {MIDDLEWARE_ARROW} from '../../src/middleware-registry';

test('loads the Tailwind v4 design tokens without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/tooltip');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Floating UI Plus/,
    }),
  ).toBeVisible();

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )).toBe(0);
});

test('registers floating elements before the example module runs', async ({
  page,
}) => {
  await page.goto('/popover');

  const moduleSources = await page
    .locator('script[type="module"][src]')
    .evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).src),
    );
  const registrationIndex = moduleSources.findIndex((source) =>
    source.includes('DemoLayout.astro_astro_type_script_index_0'),
  );
  const exampleIndex = moduleSources.findIndex((source) =>
    source.includes('PopoverExample.astro_astro_type_script_index_0'),
  );

  expect(registrationIndex).toBe(0);
  expect(exampleIndex).toBeGreaterThan(registrationIndex);
  expect(
    await page.evaluate(() => Boolean(customElements.get('floating-root'))),
  ).toBe(true);
});

test('keeps native popover template content inert across refresh until it opens', async ({
  page,
}) => {
  await page.goto('/popover');
  await page.reload();
  await expect(page.locator('[data-demo="popover"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );

  const demo = page.locator('[data-framework-panel="web-components"]');
  const trigger = demo.getByRole('button', {name: /Open coordinates/});
  const panel = demo.locator('.popover-panel');
  await expect(panel).toHaveCount(0);

  await trigger.click();
  await expect(panel).toBeVisible();
  expect(
    await panel.evaluate((element) =>
      element.matches(':popover-open') &&
      element.parentElement?.localName === 'floating-root',
    ),
  ).toBe(true);
  await page.getByRole('button', {name: 'Close panel'}).click();
  await expect(panel).toHaveCount(0);

  await trigger.click();
  await expect(panel).toBeVisible();
});

test('only native dialog surfaces use the direct floating slot', async ({page}) => {
  await page.goto('/modal');

  const directSurfaces = await page
    .locator('floating-root > [slot="floating"]')
    .evaluateAll((elements) => elements.map((element) => element.localName));
  expect(directSurfaces).toEqual(['dialog', 'dialog']);
});

test('menu starts roving focus at the first item after opening with a pointer', async ({
  page,
}) => {
  await page.goto('/menu');

  const trigger = page.getByRole('button', {name: 'Open navigator'});
  const firstItem = page.getByRole('menuitem', {name: /North star/});
  const secondItem = page.getByRole('menuitem', {name: /Orbit map/});
  const signalItem = page.getByRole('menuitem', {name: /Signal log/});

  await trigger.click();
  await trigger.press('ArrowDown');

  await expect(firstItem).toBeFocused();
  expect(
    await firstItem.evaluate((element) =>
      Boolean(element.closest('floating-portal-target')),
    ),
  ).toBe(false);
  await expect(secondItem).not.toBeFocused();
  await firstItem.press('s');
  await expect(signalItem).toBeFocused();
});

test('nested menu preserves the complete keyboard path', async ({page}) => {
  await page.goto('/nested-menu');
  await expect(page.locator('[data-demo="nested-menu"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );

  const trigger = page.getByRole('button', {name: 'Open actions'});
  await trigger.click();
  await trigger.press('ArrowDown');

  const newNote = page.getByRole('menuitem', {name: /New note/});
  const moveToProject = page.getByRole('menuitem', {
    name: /Move to project/,
  });
  const archive = page.getByRole('menuitem', {name: /Archive/});

  await expect(newNote).toBeFocused();
  await newNote.press('ArrowDown');
  await expect(moveToProject).toBeFocused();

  await moveToProject.press('ArrowDown');
  await expect(archive).toBeFocused();

  await archive.press('ArrowUp');
  await expect(moveToProject).toBeFocused();

  const scrollBeforeSubmenu = await page.evaluate(() => window.scrollY);
  await moveToProject.press('ArrowRight');

  const projectMenu = page.getByRole('menu', {name: 'Move to project'});
  const atlas = projectMenu.getByRole('menuitem', {name: /Atlas/});
  const fieldResearch = projectMenu.getByRole('menuitem', {
    name: /Field research/,
  });
  await expect(projectMenu).toBeVisible();
  await expect(atlas).toBeFocused();

  const openingGeometry = await projectMenu.evaluate((menu) => {
    const animation = menu
      .getAnimations()
      .find(
        (candidate) =>
          candidate instanceof CSSAnimation &&
          candidate.animationName === 'surface-in',
      );
    if (animation) {
      animation.pause();
      animation.currentTime = 80;
    }
    const menuRect = menu.getBoundingClientRect();
    const parentRect = document
      .querySelector<HTMLElement>(
        '.nested-menu-root [aria-haspopup="menu"]',
      )
      ?.getBoundingClientRect();
    return {
      hasSurfaceAnimation: Boolean(animation),
      menuTop: menuRect.top,
      parentTop: parentRect?.top ?? Number.NaN,
    };
  });
  expect(openingGeometry.hasSurfaceAnimation).toBe(true);
  expect(
    Math.abs(openingGeometry.menuTop - openingGeometry.parentTop),
  ).toBeLessThan(180);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeSubmenu);

  await atlas.press('ArrowDown');
  await expect(fieldResearch).toBeFocused();
  await fieldResearch.press('Escape');

  await expect(projectMenu).toBeHidden();
  await expect(page.getByRole('menu', {name: 'Open actions'})).toBeVisible();
  await expect(moveToProject).toBeFocused();
  await moveToProject.press('ArrowDown');
  await expect(archive).toBeFocused();

  await archive.press('Escape');
  await expect(page.getByRole('menu', {name: 'Open actions'})).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('nested dialog surfaces dismiss only the topmost layer', async ({page}) => {
  await page.goto('/modal');
  await expect(page.locator('[data-demo="modal"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );
  const demo = page.locator('[data-framework-panel="web-components"]');
  const trigger = demo.getByRole('button', {name: /Enter focus room/});
  await trigger.click();

  const dialog = demo
    .locator('.modal-panel')
    .filter({hasText: 'Nested surfaces keep their own dismissal step.'});
  const hintTrigger = demo.getByRole('button', {name: 'Show placement hint'});
  const popoverTrigger = demo.getByRole('button', {name: 'Open room details'});
  const nestedDialogTrigger = demo.getByRole('button', {
    name: 'Open nested dialog',
  });

  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
  await expect(hintTrigger).toBeFocused();

  await hintTrigger.hover();
  const tooltip = demo.locator('.tooltip').filter({
    hasText: 'This tooltip stays inside the dialog.',
  });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('z-index', '30');
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await popoverTrigger.click();
  const popover = demo.locator('.popover-panel').filter({
    hasText: 'Details stay above the dialog.',
  });
  await expect(popover).toBeVisible();
  expect(await popover.evaluate((element) => element.parentElement?.localName)).toBe(
    'floating-root',
  );
  await demo.getByRole('button', {name: 'Close details'}).click();
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  await popoverTrigger.click();
  await expect(popover).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();

  await nestedDialogTrigger.click();
  const nestedDialog = demo.locator('.nested-modal-panel');
  await expect(nestedDialog).toBeVisible();
  expect(
    await nestedDialog.evaluate((element) =>
      element.matches(':modal') && element.parentElement?.localName === 'floating-root'
    ),
  ).toBe(true);
  await page
    .getByRole('button', {name: 'Return to focus room'})
    .click();
  await expect(nestedDialog).toBeHidden();
  await expect(dialog).toBeVisible();

  await demo.getByRole('button', {name: 'Leave room'}).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('tooltip component opens from hover or keyboard focus and dismisses cleanly', async ({
  page,
}) => {
  await page.goto('/tooltip');
  const trigger = page.getByRole('button', {name: /Inspect signal/});
  const tooltip = page.getByRole('tooltip');

  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await expect
    .poll(() => tooltip.evaluate((element) => getComputedStyle(element).overflow))
    .toBe('visible');
  await trigger.press('Escape');
  await expect(tooltip).toBeHidden();

  await trigger.hover();
  await expect(tooltip).toBeVisible();

  await page.mouse.move(2, 2);
  await expect(tooltip).toBeHidden();
});

test('cursor signal follows the pointer virtual reference', async ({page}) => {
  await page.goto('/client-point');
  await expect(page.locator('[data-demo="client-point"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );

  const field = page.locator('.cursor-field');
  await field.scrollIntoViewIfNeeded();
  const fieldBox = await field.boundingBox();
  expect(fieldBox).not.toBeNull();
  const pointer = {
    x: fieldBox!.x + Math.min(120, fieldBox!.width / 2),
    y: fieldBox!.y + Math.min(40, fieldBox!.height / 2),
  };

  await page.mouse.move(pointer.x, pointer.y);
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((element) =>
      Boolean(element.closest('floating-portal-target')),
    ),
  ).toBe(false);
  const label = (await field.textContent())!.match(/(\d+) × (\d+)/);
  expect(label).not.toBeNull();
  expect(
    Math.abs(Number(label![1]) - (pointer.x - fieldBox!.x)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(Number(label![2]) - (pointer.y - fieldBox!.y)),
  ).toBeLessThanOrEqual(1);

  const tooltipBox = await tooltip.boundingBox();
  expect(tooltipBox).not.toBeNull();
  expect(
    Math.abs(tooltipBox!.x + tooltipBox!.width / 2 - pointer.x),
  ).toBeLessThanOrEqual(2);
  expect(pointer.y - (tooltipBox!.y + tooltipBox!.height)).toBeGreaterThanOrEqual(
    14,
  );
});

test('all middleware fixtures expose their observable behavior', async ({
  page,
}) => {
  await page.goto('/middleware');
  await expect(page.locator('[data-demo="middleware"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );
  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: 'Middleware'}),
  ).toBeVisible();
  await expect(page.locator('.middleware-title a')).toHaveCount(8);
  await expect(
    page.getByRole('link', {
      name: 'Auto placement middleware official documentation',
    }),
  ).toHaveAttribute('href', 'https://floating-ui.com/docs/autoplacement');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);

  const offsetStages = page.locator(
    '[data-middleware-example="offset"] .mw-static-stage',
  );
  const zeroReference = await offsetStages.nth(0).locator('button').boundingBox();
  const zeroFloating = await offsetStages
    .nth(0)
    .locator('.mw-panel')
    .boundingBox();
  const tenReference = await offsetStages.nth(1).locator('button').boundingBox();
  const tenFloating = await offsetStages
    .nth(1)
    .locator('.mw-panel')
    .boundingBox();
  const zeroGap = zeroReference!.y - (zeroFloating!.y + zeroFloating!.height);
  const tenGap = tenReference!.y - (tenFloating!.y + tenFloating!.height);
  expect(tenGap - zeroGap).toBeCloseTo(10, 0);

  const shiftStage = page.locator('.mw-stage-shift');
  const shiftPanel = shiftStage.locator('.mw-panel');
  await expect
    .poll(async () => {
      const stage = await shiftStage.boundingBox();
      const panel = await shiftPanel.boundingBox();
      return {
        left: panel!.x - stage!.x,
        right: stage!.x + stage!.width - (panel!.x + panel!.width),
      };
    })
    .toMatchObject({left: expect.any(Number), right: expect.any(Number)});
  const shiftBounds = await Promise.all([
    shiftStage.boundingBox(),
    shiftPanel.boundingBox(),
  ]);
  expect(shiftBounds[1]!.x).toBeGreaterThanOrEqual(shiftBounds[0]!.x + 7);
  expect(shiftBounds[1]!.x + shiftBounds[1]!.width).toBeLessThanOrEqual(
    shiftBounds[0]!.x + shiftBounds[0]!.width - 7,
  );

  const flipStage = page.locator('.mw-stage-flip');
  const flipPanel = flipStage.locator('.mw-panel');
  await flipStage.evaluate((element) => {
    element.scrollTop = 80;
  });
  await expect(flipPanel).toHaveAttribute('data-placement', /^top/);
  await flipStage.evaluate((element) => {
    element.scrollTop = 160;
  });
  await expect(flipPanel).toHaveAttribute('data-placement', /^bottom/);
  const [flipStageBox, flipPanelBox] = await Promise.all([
    flipStage.boundingBox(),
    flipPanel.boundingBox(),
  ]);
  expect(flipPanelBox!.x).toBeGreaterThanOrEqual(flipStageBox!.x + 7);
  expect(flipPanelBox!.x + flipPanelBox!.width).toBeLessThanOrEqual(
    flipStageBox!.x + flipStageBox!.width - 7,
  );

  const arrowStage = page.locator('.mw-stage-arrow');
  const arrow = arrowStage.locator('.mw-arrow');
  await expect(arrow).toHaveAttribute('style', /(?:left|top):/);
  await expect(arrowStage.locator('.mw-panel-arrow')).toHaveAttribute(
    'data-placement',
    /^top/,
  );
  await expect
    .poll(() =>
      arrow.evaluate((element) => ({
        top: (element as HTMLElement).style.top,
        bottom: (element as HTMLElement).style.bottom,
      })),
    )
    .toEqual({top: '', bottom: '-7px'});
  const arrowRoot = arrowStage.locator('floating-root');
  await arrowRoot.evaluate(async (element) => {
    const root = element as HTMLElement & {
      placement: string;
      updateComplete: Promise<unknown>;
      updatePosition(): Promise<unknown>;
    };
    root.placement = 'bottom';
    await root.updateComplete;
    await root.updatePosition();
  });
  await expect(arrowStage.locator('.mw-panel-arrow')).toHaveAttribute(
    'data-placement',
    /^bottom/,
  );
  await expect
    .poll(() =>
      arrow.evaluate((element) => ({
        top: (element as HTMLElement).style.top,
        bottom: (element as HTMLElement).style.bottom,
        transform: (element as HTMLElement).style.transform,
      })),
    )
    .toEqual({top: '-7px', bottom: '', transform: 'rotate(0deg)'});
  await arrowRoot.evaluate(async (element) => {
    const root = element as HTMLElement & {
      placement: string;
      updateComplete: Promise<unknown>;
      updatePosition(): Promise<unknown>;
    };
    root.placement = 'top';
    await root.updateComplete;
    await root.updatePosition();
  });
  const [arrowPanelBox, arrowBox, arrowReferenceBox] = await Promise.all([
    arrowStage.locator('.mw-panel-arrow').boundingBox(),
    arrow.boundingBox(),
    arrowStage.locator('button').boundingBox(),
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
  expect(arrowBox!.x).toBeGreaterThanOrEqual(arrowPanelBox!.x - 3);
  expect(arrowBox!.x + arrowBox!.width).toBeLessThanOrEqual(
    arrowPanelBox!.x + arrowPanelBox!.width + 3,
  );
  expect(
    Math.abs(
      arrowReferenceBox!.x +
        arrowReferenceBox!.width / 2 -
        (arrowBox!.x + arrowBox!.width / 2),
    ),
  // The centered arrow can shift with the floating panel to remain inside its
  // constrained scroll stage; it must still stay visibly associated with its
  // reference rather than escaping the panel bounds checked above.
  ).toBeLessThanOrEqual(40);

  const sizeStage = page.locator('.mw-stage-size');
  const sizePanel = sizeStage.locator('.mw-panel-size');
  const maxHeight = await sizePanel.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).maxHeight),
  );
  expect(maxHeight).toBeGreaterThan(0);
  expect(maxHeight).toBeLessThan((await sizeStage.boundingBox())!.height);

  const autoStage = page.locator('.mw-stage-auto-placement');
  const autoPanel = autoStage.locator('.mw-panel-auto');
  await autoStage.evaluate((element) => {
    element.scrollTop = 40;
  });
  await expect(autoPanel).toHaveAttribute('data-placement', /^top/);
  await autoStage.evaluate((element) => {
    element.scrollTop = 190;
  });
  await expect(autoPanel).toHaveAttribute('data-placement', /^bottom/);
  const [autoStageBox, autoPanelBox] = await Promise.all([
    autoStage.boundingBox(),
    autoPanel.boundingBox(),
  ]);
  expect(autoPanelBox!.x).toBeGreaterThanOrEqual(autoStageBox!.x + 7);
  expect(autoPanelBox!.x + autoPanelBox!.width).toBeLessThanOrEqual(
    autoStageBox!.x + autoStageBox!.width - 7,
  );

  const hideStage = page.locator('.mw-stage-hide');
  const hidePanel = hideStage.locator('.mw-panel-hide');
  await hideStage.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(hidePanel).toHaveAttribute('data-reference-hidden', 'true');
  await expect(
    page.locator('[data-middleware-example="hide"] .mw-state-readout'),
  ).toContainText('reference hidden');

  const inlineMetrics = await page
    .locator('[data-middleware-example="inline"]')
    .evaluate((example) => {
      const references = example.querySelectorAll('.mw-inline-reference');
      const panels = example.querySelectorAll('.mw-panel-inline');
      const withoutReference = references[0]!.getBoundingClientRect();
      const withReferenceRects = [...references[1]!.getClientRects()];
      const withoutPanel = panels[0]!.getBoundingClientRect();
      const withPanel = panels[1]!.getBoundingClientRect();
      const center = (rect: DOMRect) => rect.x + rect.width / 2;
      return {
        lines: withReferenceRects.length,
        withoutDistance: Math.abs(
          center(withoutPanel) - center(withoutReference),
        ),
        withDistance: Math.abs(center(withPanel) - center(withReferenceRects[0]!)),
      };
    });
  expect(inlineMetrics.lines).toBeGreaterThan(1);
  expect(inlineMetrics.withoutDistance).toBeLessThanOrEqual(2);
  expect(inlineMetrics.withDistance).toBeLessThanOrEqual(2);
});

test('placement controls drive all 12 component positions', async ({page}) => {
  await page.goto('/placement');
  await expect(page.locator('[data-demo="placement"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );

  const webPanel = page.locator('[data-framework-panel="web-components"]');
  await expect(
    page.locator('.route-copy').getByRole('heading', {level: 2, name: 'Placement'}),
  ).toBeVisible();
  await expect(webPanel.locator('[data-placement-control]')).toHaveCount(12);

  const floating = webPanel.locator('.placement-floating');
  const reference = webPanel.locator('.placement-reference');
  await expect(floating).toHaveAttribute('data-placement', 'top');

  const bottomStart = webPanel.getByRole('button', {
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

test('multilingual combobox keeps input focus and renders results', async ({
  page,
}) => {
  await page.goto('/combobox?framework=wc');
  await expect(page.locator('[data-demo="combobox"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );
  const input = page.getByRole('combobox', {
    name: 'Destination',
    exact: true,
  });
  const webPanel = page.locator('[data-framework-panel="web-components"]');

  await webPanel.getByRole('tab', {name: 'Server search'}).click();
  await expect(page).toHaveURL(/\/combobox\?framework=wc&source=server$/);
  await expect(webPanel.locator('[data-demo="async-combobox"]')).toBeVisible();
  await webPanel.getByRole('tab', {name: 'Fuzzy search'}).click();
  await expect(page).toHaveURL(/\/combobox\?framework=wc&source=fuzzy$/);

  await input.focus();
  await expect(page.getByRole('option')).toHaveCount(4);
  await webPanel.locator('[data-search-sample="bejing"]').click();
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
    await expect(page.getByRole('option', {name: new RegExp(expected)}))
      .toBeVisible();
  }

  await input.fill('');
  await expect(page.getByRole('option')).toHaveCount(4);

  await input.fill('bejing');
  const option = page.getByRole('option', {name: /北京/});
  await expect(option).toBeVisible();
  const popup = page.locator('[data-combobox-popup]');
  await expect(popup).toHaveCSS('position', 'absolute');
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest('floating-portal-target')),
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
      include: [['.combobox-card'], ['.combobox-popup']],
    });
    return result.violations.filter((violation: {impact: string | null}) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    );
  });
  expect(violations).toEqual([]);
  await input.press('Escape');
  await expect(popup).toBeHidden();
});

test('async server combobox renders loading and ignores stale requests', async ({
  page,
}) => {
  await page.goto('/combobox?source=server');
  await expect(page.locator('[data-demo="async-combobox"]')).toHaveAttribute(
    'data-initialized',
    'true',
  );
  const input = page.getByRole('combobox', {name: 'Remote destination'});
  const popup = page.locator('.async-combobox-popup');

  await input.focus();
  await input.fill('seo');
  await expect(popup.getByText('Querying remote endpoint…')).toBeVisible();
  await input.fill('bei');
  await expect(popup.getByRole('option', {name: /^北京/})).toBeVisible();
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest('floating-portal-target')),
    ),
  ).toBe(false);
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
