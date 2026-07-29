import {expect, test} from 'playwright/test';

test('loads the Tailwind v4 design tokens without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {level: 1, name: 'Floating UI Plus'}),
  ).toBeVisible();

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      background: styles.getPropertyValue('--color-background').trim(),
      foreground: styles.getPropertyValue('--color-foreground').trim(),
      ring: styles.getPropertyValue('--color-ring').trim(),
      radius: styles.getPropertyValue('--radius-panel').trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(tokens).toEqual({
    background: '#e8e9f5',
    foreground: '#17182f',
    ring: '#77e3e0',
    radius: '0.8125rem',
    overflow: 0,
  });
});

test('nested menu preserves the complete keyboard path', async ({page}) => {
  await page.goto('/');

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
  await moveToProject.press('ArrowRight');

  const projectMenu = page.getByRole('menu', {name: 'Move to project'});
  const atlas = projectMenu.getByRole('menuitem', {name: /Atlas/});
  const fieldResearch = projectMenu.getByRole('menuitem', {
    name: /Field research/,
  });
  await expect(projectMenu).toBeVisible();
  await expect(atlas).toBeFocused();

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

test('cursor signal follows the pointer virtual reference', async ({page}) => {
  await page.goto('/examples/client-point');

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
  await page.goto('/examples/middleware');
  await expect(
    page.getByRole('heading', {level: 2, name: /Position with intent/}),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);

  const offsetStages = page.locator('lit-offset-example .mw-static-stage');
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

  const arrowStage = page.locator('.mw-stage-arrow');
  const arrow = arrowStage.locator('.mw-arrow');
  await expect(arrow).toHaveAttribute('style', /(?:left|top):/);
  const [arrowPanelBox, arrowBox, arrowReferenceBox] = await Promise.all([
    arrowStage.locator('.mw-panel-arrow').boundingBox(),
    arrow.boundingBox(),
    arrowStage.locator('button').boundingBox(),
  ]);
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
  ).toBeLessThanOrEqual(12);

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

  const hideStage = page.locator('.mw-stage-hide');
  const hidePanel = hideStage.locator('.mw-panel-hide');
  await hideStage.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(hidePanel).toHaveAttribute('data-reference-hidden', 'true');
  await expect(
    page.locator('lit-hide-middleware-example .mw-state-readout'),
  ).toContainText('reference hidden');

  const inlineMetrics = await page
    .locator('lit-inline-example')
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
