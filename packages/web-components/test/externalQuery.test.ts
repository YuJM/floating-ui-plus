import {afterEach, expect, test, vi} from 'vitest';
import {SearchController} from '../src';

afterEach(() => document.body.replaceChildren());

test('external Query delegates original events after editor guards and restores bindings', async () => {
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-busy', 'original');
  editor.innerHTML = '<p>문서 /</p>';
  const root = document.createElement('floating-root');
  root.innerHTML = `
    <floating-list navigation virtual loop>
      <floating-query>
        <div slot="floating">
          <floating-list-item><button>본문</button></floating-list-item>
          <floating-list-item><button>제목</button></floating-list-item>
        </div>
      </floating-query>
    </floating-list>`;
  const items = [{id: 'paragraph', label: '본문'}, {id: 'heading', label: '제목'}];
  const search = new SearchController({items, getItemKey: (item) => item.id});
  const query = root.querySelector('floating-query')!;
  const list = root.querySelector('floating-list')!;
  root.querySelectorAll('floating-list-item').forEach((item, index) => { item.value = items[index]; });
  query.configure({search, externalInput: editor, getItemLabel: (item) => item.label});
  document.body.append(editor, root);
  root.setReferenceElement(editor);
  root.setFloatingElement(root.querySelector('div'));
  root.open = true;
  const activate = vi.fn();
  query.addEventListener('queryactivate', activate);
  await vi.waitFor(() => {
    expect(query.controller).toBeDefined();
    expect(list.manualKeyboard).toBe(true);
    expect(list.list.items).toHaveLength(2);
  });
  const event = new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true});
  editor.dispatchEvent(event);
  expect(list.activeIndex).toBe(null);
  expect(query.handleKeyDown(event)).toBe(true);
  await vi.waitFor(() => expect(query.controller?.activeIndex).toBe(0));
  expect(query.handleKeyDown(event)).toBe(false);
  query.setExternalQuery('', {composing: true});
  expect(query.handleKeyDown(new KeyboardEvent('keydown', {key: 'ArrowDown'}))).toBe(false);
  expect(query.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter'}))).toBe(false);
  expect(activate).not.toHaveBeenCalled();
  query.setExternalQuery('', {composing: false});
  expect(query.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}))).toBe(true);
  expect(activate).toHaveBeenCalledOnce();
  expect(editor.innerHTML).toBe('<p>문서 /</p>');
  root.remove();
  await vi.waitFor(() => {
    expect(editor.getAttribute('aria-busy')).toBe('original');
    expect(editor.getAttribute('role')).toBe('textbox');
    expect(editor.hasAttribute('data-loading')).toBe(false);
  });
  expect(query.handleKeyDown(new KeyboardEvent('keydown', {key: 'ArrowDown'}))).toBe(false);
  document.body.append(root);
  await vi.waitFor(() => {
    expect(query.controller).toBeDefined();
    expect(list.list.items).toHaveLength(2);
  });
  root.open = true;
  const next = new KeyboardEvent('keydown', {key: 'ArrowDown', cancelable: true});
  expect(query.handleKeyDown(next)).toBe(true);
  await vi.waitFor(() => expect(query.controller?.activeIndex).toBe(0));
  root.remove();
  search.destroy();
});
