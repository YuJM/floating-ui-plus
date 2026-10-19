import {afterEach, describe, expect, test, vi} from 'vitest';
import {createFloating, createQuery, createSearch, listNavigation} from '../src';

const items = [{id: 'paragraph', label: '본문'}, {id: 'heading', label: '제목'}];
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  document.body.replaceChildren();
});

function setup() {
  const search = createSearch({items, getItemKey: (item) => item.id});
  const onActivate = vi.fn();
  const query = createQuery({search, getItemLabel: (item) => item.label, onActivate});
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.innerHTML = '<p>문서 /</p>';
  editor.tabIndex = 0;
  document.body.append(editor);
  cleanups.push(() => search.destroy(), () => query.destroy());
  return {search, query, editor, onActivate};
}

describe('IME-safe Query activation', () => {
  test.each(['event', 'search', '229', 'prevented'])(
    'leaves Enter untouched during %s composition/handling', (guard) => {
      const {query, search, onActivate} = setup();
      query.setActiveIndex(0);
      if (guard === 'search') search.startComposition();
      const event = new KeyboardEvent('keydown', {
        key: 'Enter', cancelable: true,
        isComposing: guard === 'event', keyCode: guard === '229' ? 229 : 13,
      });
      if (guard === 'prevented') event.preventDefault();
      expect(query.handleKeyDown(event)).toBe(false);
      expect(onActivate).not.toHaveBeenCalled();
      expect(query.activeIndex).toBe(0);
      expect(event.defaultPrevented).toBe(guard === 'prevented');
    },
  );

  test('bound input ignores the IME confirmation and activates on the next Enter', () => {
    const {query, onActivate} = setup();
    const input = document.createElement('input');
    query.bindInput(input);
    query.setActiveIndex(0);
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true}));
    expect(onActivate).not.toHaveBeenCalled();
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}));
    expect(onActivate).toHaveBeenCalledExactlyOnceWith(items[0], expect.any(KeyboardEvent));
  });
});

describe('external editor query', () => {
  test('updates an unbound query without browser input globals', () => {
    const {query, search} = setup();
    vi.stubGlobal('HTMLInputElement', undefined);
    try {
      expect(() => query.setQuery('제목')).not.toThrow();
      expect(search.query).toBe('제목');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('syncs query/composition/ARIA without touching text, selection, or focus', () => {
    const {query, search, editor} = setup();
    const content = editor.innerHTML;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    query.bindExternalInput(editor);
    query.setExternalQuery('ㅈ', {composing: true});
    expect(search.query).toBe('ㅈ');
    expect(search.composing).toBe(true);
    query.setExternalQuery('제목', {composing: false});
    expect(search.query).toBe('제목');
    expect(search.composing).toBe(false);
    search.setControlledState({items, loading: false});
    query.setActiveIndex(1);
    expect(editor.getAttribute('aria-activedescendant')).toBe(query.getItemId(1));
    expect(editor.innerHTML).toBe(content);
    expect(selection.anchorNode).toBe(editor);
    expect(selection.anchorOffset).toBe(range.startOffset);
    expect(document.activeElement).toBe(editor);
    // No input or keydown listener is installed on an editor-owned target.
    editor.dispatchEvent(new InputEvent('input'));
    editor.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}));
    expect(search.query).toBe('제목');
    expect(query.activeIndex).toBe(1);
  });

  test('restores original attributes across rebind, repeated cleanup, and destroy', () => {
    const {query, search, editor} = setup();
    editor.setAttribute('aria-busy', 'original');
    editor.setAttribute('aria-activedescendant', 'original-option');
    const cleanup = query.bindExternalInput(editor);
    search.setControlledState({items, loading: true});
    expect(editor.getAttribute('aria-busy')).toBe('true');
    const other = document.createElement('div');
    query.bindExternalInput(other);
    expect(editor.getAttribute('aria-busy')).toBe('original');
    expect(editor.getAttribute('aria-activedescendant')).toBe('original-option');
    expect(editor.hasAttribute('data-loading')).toBe(false);
    cleanup();
    query.destroy();
    expect(other.hasAttribute('aria-busy')).toBe(false);
    expect(other.hasAttribute('data-loading')).toBe(false);
    expect(query.handleKeyDown(new KeyboardEvent('keydown', {key: 'Enter'}))).toBe(false);
  });

  test('keeps active descendant identity current when external results change', () => {
    const {query, search, editor} = setup();
    query.bindExternalInput(editor);
    query.setActiveIndex(0);
    search.setControlledState({items: [items[1], items[0]]});
    expect(editor.getAttribute('aria-activedescendant')).toBe(query.getItemId(0));
    expect(editor.getAttribute('aria-activedescendant')).toContain('heading');
  });

  test('leaves editor-owned active descendant attributes alone with semantics none', () => {
    const {query, editor} = setup();
    query.setOptions({semantics: 'none'});
    editor.setAttribute('aria-activedescendant', 'editor-option');
    const unbind = query.bindExternalInput(editor);
    query.setActiveIndex(1);
    expect(editor.getAttribute('aria-activedescendant')).toBe('editor-option');
    editor.setAttribute('aria-activedescendant', 'next-editor-option');
    unbind();
    expect(editor.getAttribute('aria-activedescendant')).toBe('next-editor-option');
  });
});

describe('direct list keyboard API', () => {
  test('navigates once after editor handling, skips disabled items, loops, and disconnects', () => {
    const {query, editor} = setup();
    const popup = document.createElement('div');
    const options = Array.from({length: 3}, () => document.createElement('button'));
    options[1].disabled = true;
    popup.append(...options);
    document.body.append(popup);
    let activeIndex: number | null = null;
    const onNavigate = vi.fn((index: number | null) => { activeIndex = index; });
    const navigation = listNavigation(() => ({
      listRef: {current: options}, activeIndex, onNavigate,
      virtual: true, loop: true, keyboardHandling: 'manual', scrollItemIntoView: false,
      focusItemOnOpen: false,
    }));
    const controller = createFloating({open: true}).pipe(navigation);
    cleanups.push(() => controller.destroy());
    const key = (value: string, init: KeyboardEventInit = {}) =>
      new KeyboardEvent('keydown', {key: value, cancelable: true, ...init});
    expect(navigation.handleKeyDown(key('ArrowDown'))).toBe(false);
    controller.setReference(editor);
    controller.setFloating(popup);
    controller.connect();
    editor.focus();
    const event = key('ArrowDown');
    editor.dispatchEvent(event);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(navigation.handleKeyDown(event)).toBe(true);
    expect(activeIndex).toBe(0);
    expect(navigation.handleKeyDown(event)).toBe(false);
    expect(navigation.handleKeyDown(key('ArrowDown'))).toBe(true);
    expect(activeIndex).toBe(2);
    navigation.handleKeyDown(key('ArrowDown'));
    expect(activeIndex).toBe(0);
    navigation.handleKeyDown(key('End'));
    expect(activeIndex).toBe(2);
    navigation.handleKeyDown(key('Home'));
    expect(activeIndex).toBe(0);
    for (const init of [{isComposing: true}, {keyCode: 229}, {ctrlKey: true}]) {
      expect(navigation.handleKeyDown(key('ArrowDown', init))).toBe(false);
    }
    expect(navigation.handleKeyDown(key('Enter'))).toBe(false);
    expect(document.activeElement).toBe(editor);
    controller.disconnect();
    expect(navigation.handleKeyDown(key('ArrowDown'))).toBe(false);
    query.destroy();
  });
});
