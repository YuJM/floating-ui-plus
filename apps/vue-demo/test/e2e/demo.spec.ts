import {expect, test} from 'playwright/test';

test('opens Teleport-backed nested menus', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Open actions'}).click();
  await expect(page.getByTestId('actions-menu')).toBeVisible();

  await page.getByRole('menuitem', {name: /Move to project/}).press('ArrowRight');
  await expect(page.getByTestId('project-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', {name: /Atlas/})).toBeVisible();
});

test('traps modal focus and closes on Escape', async ({page}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', {name: 'Open modal'});
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});
