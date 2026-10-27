// Auko loads the adapter namespace only in its browser-side editor boundary.
import type * as FloatingComponents from '@floating-ui-plus/web-components';
import type {ExternalQueryOptions, ListNavigationPlugin} from '@floating-ui-plus/web-components';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function until(ready: () => boolean, message: string) {
  const deadline = performance.now() + 5_000;
  while (!ready()) {
    if (performance.now() > deadline) throw new Error(message);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function runPackedEditorChecks(): Promise<string[]> {
  const components: typeof FloatingComponents = await import('@floating-ui-plus/web-components');
  const checks: string[] = [];
  for (const name of [
    'createQuery', 'createSearch', 'listNavigation', 'createFuzzySearchSource',
    'FloatingRootElement', 'FloatingQueryElement', 'FloatingListElement',
    'click', 'dismiss', 'flip', 'focusManager', 'offset', 'shift', 'size',
    'hover', 'safePolygon',
  ] as const) {
    assert(typeof components[name] === 'function', `Missing runtime export: ${name}`);
  }
  checks.push('Auko-style dynamic namespace exports');

  const items = [{id: 'paragraph', label: '본문'}, {id: 'heading', label: '제목'}];
  const search = components.createSearch({items, getItemKey: (item) => item.id});
  let activations = 0;
  const controller = components.createQuery({
    search, getItemLabel: (item) => item.label, onActivate: () => { activations++; },
  });
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.tabIndex = 0;
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-busy', 'original');
  editor.innerHTML = '<p>문서 /</p>';
  document.body.append(editor);
  editor.focus();
  const original = editor.innerHTML;
  const unbind = controller.bindExternalInput(editor);
  const state: ExternalQueryOptions = {composing: true};
  controller.setExternalQuery('제', state);
  controller.setActiveIndex(1);
  assert(!controller.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter'})), 'Composing Enter activated a result');
  controller.setExternalQuery('제목', {composing: false});
  controller.setActiveIndex(1);
  assert(!controller.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true})), 'Native composition event activated a result');
  assert(!controller.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 229})), 'Safari confirmation activated a result');
  assert(controller.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true})), 'Normal Enter was not handled');
  assert(activations === 1, 'Enter must activate exactly once');
  assert(editor.innerHTML === original && document.activeElement === editor, 'External query changed editor content/focus');
  unbind();
  assert(editor.getAttribute('aria-busy') === 'original', 'External attributes were not restored');
  controller.destroy();
  search.destroy();
  checks.push('external Query methods and IME guards');

  const root = document.createElement('floating-root');
  root.innerHTML = `<floating-list navigation virtual loop>
    <floating-query><div slot="floating">
      <floating-list-item><button type="button">본문</button></floating-list-item>
      <floating-list-item><button type="button">제목</button></floating-list-item>
    </div></floating-query></floating-list>`;
  const query = root.querySelector('floating-query')!;
  const list = root.querySelector('floating-list')!;
  root.querySelectorAll('floating-list-item').forEach((item, index) => { item.value = items[index]; });
  query.configure({
    externalInput: editor,
    search: {items, getItemKey: (item) => item.id},
    getItemLabel: (item) => item.label,
  });
  document.body.append(root);
  root.setReferenceElement(editor);
  root.setFloatingElement(root.querySelector('div'));
  root.open = true;
  await until(() => !!query.controller && list.list.items.length === 2 && list.manualKeyboard, 'Packed Query/list did not bind');
  const key = new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true});
  editor.dispatchEvent(key);
  assert(list.activeIndex == null, 'FUP intercepted the editor before manual handling');
  assert(query.handleKeyDown(key), 'Direct Query keyboard API is missing');
  await until(() => list.activeIndex === 0, 'Direct Query navigation failed');
  assert(!query.handleKeyDown(key), 'Original event was handled twice');
  const plugin: ListNavigationPlugin = components.listNavigation({listRef: {current: []}, activeIndex: null});
  assert(!plugin.handleKeyDown(new KeyboardEvent('keydown', {key: 'ArrowDown'})), 'Disconnected plugin handled a key');
  assert(typeof list.handleKeyDown === 'function', 'Direct list keyboard API is missing');
  assert(editor.innerHTML === original, 'Component binding changed editor content');
  root.remove();
  await until(() => editor.getAttribute('role') === 'textbox' && editor.getAttribute('aria-busy') === 'original', 'Packed component attributes were not restored');
  editor.remove();
  checks.push('Custom Element methods, original-event navigation, cleanup');
  return checks;
}
