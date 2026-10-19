import {expect, test} from 'playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/fixtures/editor-query');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('combobox', {name: 'Document editor'}).click();
  await page.keyboard.type('/');
  await expect(page.getByRole('listbox', {name: 'Block commands'})).toBeVisible();
});

test('real Tiptap keys navigate once, preserve selection/focus and execute one transaction', async ({page}) => {
  const editor = page.getByRole('combobox', {name: 'Document editor'});
  const before = await editor.textContent();
  await page.keyboard.press('ArrowDown');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-paragraph');
  await page.keyboard.press('ArrowDown');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-heading');
  await expect(editor).toBeFocused();
  await expect(editor).toHaveText(before!);
  await page.keyboard.press('Enter');
  await expect(page.locator('#activations')).toHaveText('1');
  await expect(editor.locator('h2')).toHaveText('Write here');
  await expect(editor).toBeFocused();
  await expect(page.locator('#popup')).toHaveCount(0);
});

test('Home/End scroll only the option list and Escape preserves writing focus', async ({page}) => {
  const editor = page.getByRole('combobox', {name: 'Document editor'});
  const scrollTop = await page.locator('#scroller').evaluate((element) => element.scrollTop);
  await page.keyboard.press('End');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-item-17');
  await expect.poll(() => page.locator('#popup').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#scroller').evaluate((element) => element.scrollTop)).toBe(scrollTop);
  await page.keyboard.press('Home');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-paragraph');
  await page.keyboard.press('Escape');
  await expect(page.locator('#popup')).toHaveCount(0);
  await expect(editor).toBeFocused();
  await expect(page.locator('#activations')).toHaveText('0');
});

test('Korean composition event sequence and Safari 229 cannot activate a block', async ({page}) => {
  const editor = page.getByRole('combobox', {name: 'Document editor'});
  await page.keyboard.press('ArrowDown');
  await editor.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}));
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', isComposing: true, bubbles: true, cancelable: true,
    }));
    element.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true, data: '제목'}));
    document.querySelector('floating-query')!.handleKeyDown(new KeyboardEvent('keydown', {
      key: 'Enter', keyCode: 229, bubbles: true, cancelable: true,
    }));
  });
  await expect(page.locator('#activations')).toHaveText('0');
  await expect(editor.locator('h2')).toHaveCount(0);
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('제목');
  await expect(page.getByRole('option', {name: '제목', exact: true})).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(1);
});

test('portal option click preserves the editor range; scroll follows the caret', async ({page}) => {
  const popup = page.getByRole('listbox', {name: 'Block commands'});
  const before = await popup.boundingBox();
  await page.locator('#scroller').evaluate((element) => { element.scrollTop = 40; });
  await expect.poll(async () => (await popup.boundingBox())!.y).toBeLessThan(before!.y - 20);
  await page.getByRole('option', {name: '제목', exact: true}).click();
  await expect(page.locator('.tiptap h2')).toHaveText('Write here');
  await expect(page.locator('.tiptap')).toBeFocused();
  await expect(page.locator('#activations')).toHaveText('1');
});

test('outside dismissal and detach/reattach clean up editor bindings', async ({page}) => {
  await page.getByRole('button', {name: 'Outside editor'}).click();
  await expect(page.locator('#popup')).toHaveCount(0);
  await page.getByRole('button', {name: 'Detach menu'}).click();
  const editor = page.locator('.tiptap');
  await expect(editor).not.toHaveAttribute('aria-activedescendant');
  await expect(editor).toHaveAttribute('role', 'textbox');
  await page.getByRole('button', {name: 'Reattach menu'}).click();
  await expect(page.getByRole('listbox', {name: 'Block commands'})).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-paragraph');
  await page.keyboard.press('ArrowDown');
  await expect(editor).toHaveAttribute('aria-activedescendant', 'editor-option-heading');
  await page.keyboard.press('Enter');
  await expect(page.locator('#activations')).toHaveText('1');
});
