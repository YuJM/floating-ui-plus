import {expect, test, type Page} from 'playwright/test';
import {TOOLTIP_ARROW} from '../../src/example-config';

async function inspectTooltip(page: Page, framework: 'web-components' | 'vue') {
  await page.goto(`/tooltip?framework=${framework}`);

  const panel = page.locator(`[data-framework-panel="${framework}"]`);
  const card = panel.locator('.tooltip-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText(
    'One floating surface wires pointer intent, keyboard focus, dismissal, and descriptive ARIA.',
  );
  await expect(card.locator('code')).toHaveText(
    'hover() → focus() → dismiss()',
  );

  const trigger = card.getByRole('button', {name: /Inspect signal/});
  await trigger.focus();

  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText('Positioned by autoUpdate');

  const arrow = tooltip.locator('[data-fup-arrow]');
  await expect(arrow).toBeVisible();
  await tooltip.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });

  const cardBox = await card.boundingBox();
  const triggerBox = await trigger.boundingBox();
  const tooltipBox = await tooltip.boundingBox();
  const arrowBox = await arrow.boundingBox();
  const typography = await tooltip.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      padding: style.padding,
    };
  });

  await trigger.press('Escape');
  await expect(tooltip).toBeHidden();
  await trigger.hover();
  await expect(tooltip).toBeVisible();

  const surfaceGap =
    (triggerBox?.y ?? 0) -
    ((tooltipBox?.y ?? 0) + (tooltipBox?.height ?? 0));

  return {cardBox, tooltipBox, arrowBox, typography, surfaceGap};
}

test('Web Components and Vue expose the same tooltip fixture', async ({page}) => {
  const webComponents = await inspectTooltip(page, 'web-components');
  const vue = await inspectTooltip(page, 'vue');

  const expectedSurfaceGap = TOOLTIP_ARROW.gap + TOOLTIP_ARROW.height;
  expect(webComponents.surfaceGap).toBeCloseTo(expectedSurfaceGap, 0);
  expect(vue.surfaceGap).toBeCloseTo(expectedSurfaceGap, 0);
  expect(webComponents.typography).toEqual(vue.typography);
  expect(webComponents.cardBox?.width).toBeCloseTo(vue.cardBox?.width ?? 0, 0);
  expect(webComponents.cardBox?.height).toBeCloseTo(vue.cardBox?.height ?? 0, 0);
  expect(webComponents.tooltipBox?.width).toBeCloseTo(
    vue.tooltipBox?.width ?? 0,
    0,
  );
  expect(webComponents.tooltipBox?.height).toBeCloseTo(
    vue.tooltipBox?.height ?? 0,
    0,
  );
  expect(webComponents.arrowBox?.width).toBeCloseTo(
    vue.arrowBox?.width ?? 0,
    0,
  );
  expect(webComponents.arrowBox?.height).toBeCloseTo(
    vue.arrowBox?.height ?? 0,
    0,
  );
});
