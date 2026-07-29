import {expect, test} from 'playwright/test';

test('opens Teleport-backed nested menus', async ({page}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Floating UI Plus Vue demo',
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
  await page.goto('/');
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
  await page.goto('/examples/tooltip');
  await expect(
    page.getByRole('heading', {level: 2, name: 'Pointer and'}),
  ).toBeVisible();
  await page.getByRole('button', {name: /Inspect signal/}).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'absolute');

  await page.goto('/middleware');
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
  await page.goto('/placement');

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
