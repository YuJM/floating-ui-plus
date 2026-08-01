import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FLOATING_UI_PLUS_CLOSE_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_ATTRIBUTE,
  FLOATING_UI_PLUS_CONTENT_SLOT,
  FloatingArrowElement,
  FloatingComboboxElement,
  FloatingCompositeElement,
  FloatingListElement,
  FloatingPortalElement,
  FloatingQueryElement,
  FloatingReferenceElement,
  FloatingRootElement,
  SearchController,
  click,
  createAsyncSearchSource,
  offset,
  supportsFloatingTopLayer,
} from '../../src';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

afterEach(() => {
  document.body.replaceChildren();
  if (originalScrollIntoView) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    delete (HTMLElement.prototype as {scrollIntoView?: unknown})
      .scrollIntoView;
  }
});

describe('FloatingRootElement', () => {
  test('registers a direct floating-content surface', () => {
    expect(customElements.get('floating-content')).toBeDefined();
  });

  test('binds native slotted elements without a directive', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.middleware = [offset(8)];
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    document.body.append(root);
    await root.updateComplete;
    await root.updatePosition();

    expect(root).toBeInstanceOf(FloatingRootElement);
    expect(root.referenceElement).toBe(root.querySelector('button'));
    expect(root.floatingElement).toBe(root.querySelector('section'));
    expect(root.floatingElement?.hidden).toBe(false);
    expect(root.floatingElement?.style.position).toBe('absolute');
    expect(root.referenceElement?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(root.referenceElement?.getAttribute('aria-expanded')).toBe('true');
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    expect(root.referenceElement?.getAttribute('aria-controls')).toBe(
      root.floatingElement?.id,
    );
  });

  test('configures middleware and plugins as one root operation', () => {
    const root = document.createElement('floating-root');
    const middleware = [offset(8)];
    const plugins = [click()];

    expect(root.configure({middleware, plugins})).toBe(root);
    expect(root.middleware).toBe(middleware);
    expect(root.plugins).toBe(plugins);
  });

  test('queries roots and subscribes only to their own open changes', () => {
    const parent = document.createElement('floating-root');
    const child = document.createElement('floating-root');
    parent.append(child);
    document.body.append(parent);
    const listener = vi.fn();
    const unsubscribe = parent.on('openchange', listener);

    expect(FloatingRootElement.query(document, 'floating-root')).toBe(parent);
    expect(() =>
      FloatingRootElement.query(document, '[data-missing-root]'),
    ).toThrow('Missing FloatingRootElement for [data-missing-root]');

    child.commitOpenChange(true, undefined, 'click');
    expect(listener).not.toHaveBeenCalled();
    parent.commitOpenChange(true, undefined, 'click');
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({open: true, reason: 'click'}),
    );

    unsubscribe();
    parent.commitOpenChange(false, undefined, 'click');
    expect(listener).toHaveBeenCalledOnce();
  });

  test('subscribes to owned content mounts and closes through the controller', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template data-fup-content><section>Content</section></template>
    `;
    const mounted = vi.fn();
    const changed = vi.fn();
    root.on('floatingmount', mounted);
    root.on('openchange', changed);
    document.body.append(root);
    await root.updateComplete;

    root.commitOpenChange(true, undefined, 'click');
    await vi.waitFor(() => {
      expect(mounted).toHaveBeenCalledWith(
        expect.objectContaining({root, element: root.floatingElement}),
      );
    });

    const sourceEvent = new MouseEvent('click');
    root.close(sourceEvent, 'click');
    expect(root.open).toBe(false);
    expect(changed).toHaveBeenLastCalledWith({
      open: false,
      reason: 'click',
      sourceEvent,
    });
  });

  test('dispatches a cancelable before-close event for imperative closes', () => {
    const root = document.createElement('floating-root');
    root.open = true;
    document.body.append(root);
    const beforeClose = vi.fn((event: Event) => event.preventDefault());
    const changed = vi.fn();
    root.addEventListener('floatingbeforeclose', beforeClose);
    root.addEventListener('openchange', changed);

    const sourceEvent = new MouseEvent('click');
    expect(root.close(sourceEvent, 'click')).toBe(false);
    expect(beforeClose).toHaveBeenCalledOnce();
    expect(beforeClose.mock.calls[0]?.[0]).toMatchObject({
      type: 'floatingbeforeclose',
      cancelable: true,
      detail: {reason: 'click', sourceEvent},
    });
    expect(root.open).toBe(true);
    expect(changed).not.toHaveBeenCalled();

    root.removeEventListener('floatingbeforeclose', beforeClose);
    expect(root.close(sourceEvent, 'click')).toBe(true);
    expect(root.open).toBe(false);
    expect(changed).toHaveBeenCalledOnce();
  });

  test('keeps a slotted native popover in its root context', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.floatingRole = 'dialog';
    root.strategy = 'fixed';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-content slot="floating" top-layer="popover">Content</floating-content>
    `;
    document.body.append(root);
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement?.getAttribute('popover')).toBe('manual');
    });

    expect(root.floatingElement?.parentElement).toBe(root);
    expect(root.floatingElement?.closest('floating-root')).toBe(root);
    root.open = false;
    await root.updateComplete;
    expect(root.floatingElement?.hidden).toBe(true);
  });

  test('uses a native popover for a direct slotted surface by default', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-content slot="floating">Content</floating-content>
    `;
    document.body.append(root);
    await root.updateComplete;
    await vi.waitFor(() => expect(root.floatingElement).not.toBeNull());

    expect(root.floatingElement).toHaveAttribute('popover', 'manual');
    expect(root.floatingElement?.hidden).toBe(false);
  });

  test('uses a slotted dialog as a native modal surface', async () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <dialog slot="floating">Content</dialog>
    `;
    document.body.append(root);
    await root.updateComplete;
    const dialog = root.floatingElement as HTMLDialogElement;
    await vi.waitFor(() => expect(dialog.hidden).toBe(false));

    dialog.dispatchEvent(new Event('cancel', {cancelable: true}));
    await vi.waitFor(() => expect(root.open).toBe(false));
    expect(dialog.hidden).toBe(true);
  });

  test('reopens a native modal when floatingbeforeclose is canceled', async () => {
    if (!supportsFloatingTopLayer('dialog')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <dialog slot="floating">Content</dialog>
    `;
    const beforeClose = (event: Event) => event.preventDefault();
    root.addEventListener('floatingbeforeclose', beforeClose);
    document.body.append(root);
    await root.updateComplete;
    const dialog = root.floatingElement as HTMLDialogElement;
    await vi.waitFor(() => expect(dialog.open).toBe(true));

    dialog.dispatchEvent(new Event('cancel', {cancelable: true}));

    await vi.waitFor(() => {
      expect(root.open).toBe(true);
      expect(dialog.open).toBe(true);
    });
    root.removeEventListener('floatingbeforeclose', beforeClose);
  });

  test('maps click interactions to reflected state and a DOM event', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    const listener = vi.fn();
    root.addEventListener('openchange', listener);
    document.body.append(root);
    await root.updateComplete;

    root.querySelector('button')?.click();
    await root.updateComplete;

    expect(root.open).toBe(true);
    expect(root.hasAttribute('open')).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    expect(listener).toHaveBeenCalledOnce();
  });

  test('closes template content through the declarative close marker', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template slot="${FLOATING_UI_PLUS_CONTENT_SLOT}">
        <section>
          Content
          <button ${FLOATING_UI_PLUS_CLOSE_ATTRIBUTE}>Close</button>
        </section>
      </template>
    `;
    const listener = vi.fn();
    root.addEventListener('openchange', listener);
    document.body.append(root);
    await root.updateComplete;

    root.querySelector('button')?.click();
    await vi.waitFor(() => {
      expect(root.open).toBe(true);
      expect(root.floatingElement).not.toBeNull();
    });
    root.floatingElement?.querySelector('button')?.click();

    await vi.waitFor(() => {
      expect(root.open).toBe(false);
      expect(root.floatingElement).toBeNull();
    });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({open: false, reason: 'click'}),
      }),
    );
  });

  test('lets a floating list own navigation and typeahead state', async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const root = document.createElement('floating-root');
    root.open = true;
    root.interactions = 'dismiss';
    root.floatingRole = 'menu';
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">
        <floating-list navigation typeahead loop>
          <floating-list-item label="Inspect">
            <button role="menuitem">Inspect</button>
          </floating-list-item>
          <floating-list-item label="Signal">
            <button role="menuitem">Signal</button>
          </floating-list-item>
        </floating-list>
      </section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const list = root.querySelector('floating-list')!;
    const listItems = Array.from(root.querySelectorAll('floating-list-item'));
    await list.updateComplete;
    await Promise.all(listItems.map((item) => item.updateComplete));
    const reference = root.querySelector<HTMLButtonElement>(
      '[slot="reference"]',
    )!;
    const items = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );

    reference.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowDown'}),
    );
    await vi.waitFor(() => {
      expect(list.activeIndex).toBe(0);
      expect(document.activeElement).toBe(items[0]);
      expect(items[0]?.tabIndex).toBe(0);
      expect(items[1]?.tabIndex).toBe(-1);
    });

    items[0]?.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 's'}),
    );
    await vi.waitFor(() => {
      expect(list.activeIndex).toBe(1);
      expect(document.activeElement).toBe(items[1]);
      expect(items[1]?.dataset.active).toBe('true');
    });

    root.controller.context.onOpenChange(false);
    await vi.waitFor(() => {
      expect(list.activeIndex).toBeNull();
      expect(items.every((item) => item.tabIndex === -1)).toBe(true);
    });

    list.navigation = false;
    list.typeahead = false;
    await list.updateComplete;
    await vi.waitFor(() => {
      expect(
        items.every(
          (item) =>
            !item.hasAttribute('tabindex') &&
            !item.hasAttribute('data-active'),
        ),
      ).toBe(true);
    });
  });

  test('composes a declarative virtual-focus combobox with list items', async () => {
    const destinations = [
      {id: 'seoul', label: '서울'},
      {id: 'beijing', label: '北京'},
    ];
    const search = new SearchController<(typeof destinations)[number]>({
      items: destinations,
      getItemKey: (item) => item.id,
    });
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-list navigation loop allow-escape>
        <floating-combobox option-id-prefix="destination-option">
          <floating-reference><input aria-label="Destination" /></floating-reference>
          <floating-list-item label="서울"><div>서울</div></floating-list-item>
          <floating-list-item label="北京"><div>北京</div></floating-list-item>
        </floating-combobox>
      </floating-list>
    `;
    const combobox = root.querySelector('floating-combobox')!;
    const list = root.querySelector('floating-list')!;
    const listItems = Array.from(
      root.querySelectorAll('floating-list-item'),
    );
    listItems.forEach((item, index) => {
      item.value = destinations[index];
    });
    combobox.search = search as SearchController<unknown>;
    const selectListener = vi.fn();
    combobox.addEventListener('comboboxselect', selectListener);
    document.body.append(root);

    await root.updateComplete;
    await list.updateComplete;
    await combobox.updateComplete;
    await Promise.all(listItems.map((item) => item.updateComplete));
    const input = root.querySelector('input')!;
    const options = Array.from(root.querySelectorAll<HTMLElement>('div'));

    await vi.waitFor(() => {
      expect(combobox).toBeInstanceOf(FloatingComboboxElement);
      expect(list.virtual).toBe(true);
      expect(input.getAttribute('role')).toBe('combobox');
      expect(
        options.every((option) => option.getAttribute('role') === 'option'),
      ).toBe(true);
    });

    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowDown'}),
    );
    await vi.waitFor(() => {
      expect(list.activeIndex).toBe(0);
      expect(document.activeElement).toBe(input);
      expect(input.getAttribute('aria-activedescendant')).toBe(
        options[0]?.id,
      );
      expect(options.every((option) => !option.hasAttribute('tabindex'))).toBe(
        true,
      );
    });

    input.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Enter'}),
    );
    await vi.waitFor(() => {
      expect(combobox.selectedItem).toBe(destinations[0]);
      expect(input.value).toBe('서울');
      expect(root.open).toBe(false);
      expect(selectListener).toHaveBeenCalledOnce();
    });
    search.destroy();
  });

  test('composes a non-form-associated query with default combobox semantics', async () => {
    const destinations = [
      {id: 'seoul', label: 'Seoul'},
      {id: 'beijing', label: 'Beijing'},
    ];
    const search = new SearchController<(typeof destinations)[number]>({
      items: destinations,
      getItemKey: (item) => item.id,
    });
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-list navigation loop allow-escape>
        <floating-query option-id-prefix="destination-query-option">
          <floating-reference><input aria-label="Destination query" /></floating-reference>
          <floating-list-item label="Seoul"><div>Seoul</div></floating-list-item>
          <floating-list-item label="Beijing"><div>Beijing</div></floating-list-item>
        </floating-query>
      </floating-list>
    `;
    const query = root.querySelector('floating-query')!;
    const list = root.querySelector('floating-list')!;
    const listItems = Array.from(root.querySelectorAll('floating-list-item'));
    listItems.forEach((item, index) => {
      item.value = destinations[index];
    });
    query.configure({search, getItemLabel: (item) => item.label});
    const activateListener = vi.fn();
    query.addEventListener('queryactivate', activateListener);
    document.body.append(root);

    await root.updateComplete;
    await list.updateComplete;
    await query.updateComplete;
    await Promise.all(listItems.map((item) => item.updateComplete));
    const input = root.querySelector('input')!;
    const options = Array.from(root.querySelectorAll<HTMLElement>('div'));

    await vi.waitFor(() => {
      expect(query).toBeInstanceOf(FloatingQueryElement);
      expect((query as {selectedItem?: unknown}).selectedItem).toBeUndefined();
      expect(input.getAttribute('role')).toBe('combobox');
      expect(
        options.every((option) => option.getAttribute('role') === 'option'),
      ).toBe(true);
    });

    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowDown'}),
    );
    await vi.waitFor(() => expect(list.activeIndex).toBe(0));
    input.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Enter'}),
    );
    await vi.waitFor(() => {
      expect(activateListener).toHaveBeenCalledOnce();
      expect(activateListener.mock.calls[0]?.[0].detail.item).toBe(
        destinations[0],
      );
      expect(input.value).toBe('');
    });
    search.destroy();
  });

  test('reflects search loading on the combobox host and input', async () => {
    const search = new SearchController({
      items: [{id: 'seoul', label: '서울'}],
      getItemKey: (item) => item.id,
    });
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-combobox>
        <floating-reference><input aria-label="Destination" /></floating-reference>
      </floating-combobox>
    `;
    const combobox = root.querySelector('floating-combobox')!;
    combobox.configure({search, getItemLabel: (item) => item.label});
    document.body.append(root);

    await root.updateComplete;
    await combobox.updateComplete;
    await vi.waitFor(() => expect(combobox.controller).toBeDefined());

    search.setControlledState({
      items: [{id: 'seoul', label: '서울'}],
      loading: true,
    });
    await vi.waitFor(() => {
      expect(combobox.dataset.loading).toBe('true');
      expect(combobox.getAttribute('aria-busy')).toBe('true');
      expect(root.querySelector('input')?.getAttribute('aria-busy')).toBe(
        'true',
      );
      expect(root.querySelector('input')?.getAttribute('data-loading')).toBe(
        'true',
      );
    });
    search.destroy();
  });

  test('binds external query presets through a declarative selector', async () => {
    const destinations = [{id: 'alpha', label: 'Alpha'}];
    const search = new SearchController<(typeof destinations)[number]>({
      items: destinations,
      getItemKey: (item) => item.id,
    });
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-combobox query-trigger-selector="#alpha-preset">
        <floating-reference><input aria-label="Destination" /></floating-reference>
      </floating-combobox>
    `;
    const combobox = root.querySelector('floating-combobox')!;
    combobox.configure({
      search,
      getItemLabel: (item) => item.label,
    });
    const preset = document.createElement('button');
    preset.id = 'alpha-preset';
    preset.value = 'alpah';
    document.body.append(root, preset);

    await root.updateComplete;
    await combobox.updateComplete;
    await vi.waitFor(() => expect(combobox.controller).toBeDefined());
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    preset.dispatchEvent(mouseDown);
    preset.click();

    await vi.waitFor(() => {
      expect(mouseDown.defaultPrevented).toBe(true);
      expect(search.query).toBe('alpah');
      expect(root.open).toBe(true);
      expect(root.querySelector('input')).toBe(document.activeElement);
    });
    search.destroy();
  });

  test('submits and resets a floating combobox as a native form control', async () => {
    if (
      typeof ElementInternals === 'undefined' ||
      typeof ElementInternals.prototype.setFormValue !== 'function'
    ) {
      return;
    }
    const destinations = [
      {id: 'seoul', label: '서울'},
      {id: 'beijing', label: '北京'},
    ];
    const search = new SearchController<(typeof destinations)[number]>({
      items: destinations,
      getItemKey: (item) => item.id,
    });
    const form = document.createElement('form');
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-combobox name="destination" required>
        <floating-reference><input aria-label="Destination" /></floating-reference>
      </floating-combobox>
    `;
    const combobox = root.querySelector('floating-combobox')!;
    combobox.configure({
      search,
      getItemLabel: (item) => item.label,
      getItemValue: (item) => `airport:${item.id}`,
      selectedItem: destinations[0],
    });
    form.append(root);
    document.body.append(form);

    await root.updateComplete;
    await combobox.updateComplete;
    await vi.waitFor(() => {
      expect(new FormData(form).get('destination')).toBe('airport:seoul');
    });

    combobox.select(destinations[1]);
    expect(new FormData(form).get('destination')).toBe('airport:beijing');

    form.reset();
    await vi.waitFor(() => {
      expect(combobox.selectedItem).toBe(destinations[0]);
      expect(new FormData(form).get('destination')).toBe('airport:seoul');
    });
    search.destroy();
  });

  test('renders combobox search phases and result items from native templates', async () => {
    const destination = {id: 'beijing', label: '北京', region: 'China'};
    const search = new SearchController<typeof destination>({
      items: [],
      getItemKey: (item) => item.id,
    });
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-list navigation>
        <floating-combobox>
          <floating-reference><input aria-label="Destination" /></floating-reference>
          <floating-portal>
            <template>
              <section>
                <floating-search>
                  <template data-search-idle><p>Try a query</p></template>
                  <template data-search-loading><p>Searching</p></template>
                  <template data-search-error><p data-search-text="$error"></p></template>
                  <template data-search-empty><p>No match for <span data-search-text="$query"></span></p></template>
                  <template data-search-result>
                    <floating-list-item>
                      <div><strong data-search-text="label"></strong><small data-search-text="region"></small></div>
                    </floating-list-item>
                  </template>
                  <template data-search-more>
                    <button type="button" data-search-load-more>
                      Load next <span data-search-text="$count"></span>/<span data-search-text="$total"></span>
                    </button>
                  </template>
                </floating-search>
              </section>
            </template>
          </floating-portal>
          <p data-combobox-status></p>
        </floating-combobox>
      </floating-list>
    `;
    const combobox = root.querySelector('floating-combobox')!;
    combobox.configure({
      search,
      getItemLabel: (item) => item.label,
      status: {
        closed: 'closed',
        idle: 'idle',
        loading: 'loading',
        error: 'error',
        empty: 'empty',
        results: 'results',
      },
    });
    document.body.append(root);
    await root.updateComplete;
    await combobox.updateComplete;

    await vi.waitFor(() => {
      expect(document.querySelector('floating-search')?.dataset.phase).toBe(
        'idle',
      );
      expect(document.querySelector('floating-search')?.textContent).toContain(
        'Try a query',
      );
      expect(combobox.querySelector('[data-combobox-status]')?.textContent).toBe(
        'idle',
      );
    });

    search.setQuery('bejing');
    await vi.waitFor(() => {
      expect(document.querySelector('floating-search')?.textContent).toContain(
        'No match for bejing',
      );
    });

    const loadMore = vi.spyOn(search, 'loadMore');
    search.setControlledState({
      items: [destination],
      total: 2,
      nextCursor: 'page-2',
    });
    await vi.waitFor(() => {
      const item = document.querySelector('floating-list-item');
      expect(item?.label).toBe('北京');
      expect(item?.value).toBe(destination);
      expect(item?.textContent).toContain('北京China');
      expect(combobox.querySelector('[data-combobox-status]')?.textContent).toBe(
        'results',
      );
      expect(document.querySelector('[data-search-load-more]')?.textContent).toContain(
        'Load next 1/2',
      );
    });
    search.setControlledState({
      items: [destination],
      total: 2,
      nextCursor: 'page-2',
      loading: true,
    });
    await vi.waitFor(() => {
      const searchElement = document.querySelector('floating-search');
      expect(searchElement?.dataset.phase).toBe('results');
      expect(searchElement?.dataset.loading).toBe('true');
      expect(searchElement?.textContent).toContain('北京China');
      expect(
        document.querySelector<HTMLButtonElement>('[data-search-load-more]')
          ?.disabled,
      ).toBe(true);
      expect(combobox.querySelector('[data-combobox-status]')?.textContent).toBe(
        'loading',
      );
    });
    search.setControlledState({
      items: [destination],
      total: 2,
      nextCursor: 'page-2',
    });
    await vi.waitFor(() => {
      expect(
        document.querySelector<HTMLButtonElement>('[data-search-load-more]')
          ?.disabled,
      ).toBe(false);
    });
    document
      .querySelector<HTMLButtonElement>('[data-search-load-more]')
      ?.click();
    expect(loadMore).toHaveBeenCalledOnce();
    search.destroy();
  });

  test('creates an owned controller from async search options', async () => {
    const request = vi.fn(async ({query}: {query: string}) => ({
      items: [{id: 'remote', label: `Remote ${query}`}],
    }));
    const combobox = document.createElement('floating-combobox');

    combobox.configure<{id: string; label: string}>({
      search: {
        source: createAsyncSearchSource({search: request}),
        getItemKey: (item) => item.id,
        debounceMs: 0,
      },
      getItemLabel: (item) => item.label,
    });

    expect(combobox.search).toBeInstanceOf(SearchController);
    expect(combobox.ownsSearch).toBe(true);
    combobox.search?.setQuery('seoul');

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledOnce();
      expect(combobox.search?.items).toEqual([
        {id: 'remote', label: 'Remote seoul'},
      ]);
    });

    const ownedSearch = combobox.search!;
    const externalSearch = new SearchController({
      items: [{id: 'local', label: 'Local'}],
      getItemKey: (item) => item.id,
    });
    combobox.configure({
      search: externalSearch,
      getItemLabel: (item) => item.label,
    });

    expect(ownedSearch.connected).toBe(false);
    expect(combobox.search).toBe(externalSearch);
    expect(combobox.ownsSearch).toBe(false);
    externalSearch.destroy();
  });

  test('connects and replaces plugins assigned after the root is connected', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <button slot="reference">Open</button>
      <section slot="floating">Content</section>
    `;
    const button = root.querySelector('button')!;
    document.body.append(root);
    await root.updateComplete;

    root.plugins = [click()];
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(true);

    root.open = false;
    root.plugins = [];
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(false);

    root.interactions = 'click';
    await root.updateComplete;
    button.click();
    expect(root.open).toBe(true);
  });

  test('reconciles replaced slot content', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">First</button>
      <section slot="floating">First panel</section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const first = root.referenceElement;

    const replacement = document.createElement('button');
    replacement.slot = 'reference';
    replacement.textContent = 'Second';
    first?.replaceWith(replacement);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.referenceElement).toBe(replacement);
    expect(root.controller.elements.reference).toBe(replacement);
  });

  test('composes a reference with an explicit native content template', async () => {
    const root = document.createElement('floating-root');
    root.interactions = 'click dismiss';
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section>Content</section>
      </template>
    `;
    document.body.append(root);
    await root.updateComplete;
    const reference = root.querySelector('floating-reference');
    await reference?.updateComplete;

    expect(reference).toBeInstanceOf(FloatingReferenceElement);
    expect(root.referenceElement).toBe(root.querySelector('button'));
    expect(root.contentTemplate).toBe(root.querySelector('template'));
    expect(root.floatingElement).toBeNull();

    root.querySelector('button')?.click();
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(root.querySelector('section'));
    });
    expect(root.open).toBe(true);
    expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
  });

  test('uses a native template as an inert conditional blueprint', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-template-panel>
          Content
          <button data-template-action>Action</button>
        </section>
      </template>
    `;
    const template = root.querySelector('template');
    const panel = template?.content.querySelector<HTMLElement>(
      '[data-template-panel]',
    );
    const listener = vi.fn();
    const mountListener = vi.fn((event: Event) => {
      const {element} = (
        event as CustomEvent<{element: HTMLElement}>
      ).detail;
      expect(element.isConnected).toBe(true);
      expect(root.floatingElement).toBeNull();
      element
        .querySelector('[data-template-action]')
        ?.addEventListener('click', listener);
    });
    const unmountListener = vi.fn();
    const unmountConnected: boolean[] = [];
    template?.addEventListener('floatingmount', mountListener);
    template?.addEventListener('floatingunmount', (event) => {
      unmountListener(event);
      unmountConnected.push(
        (
          event as CustomEvent<{
            element: HTMLElement;
          }>
        ).detail.element.isConnected,
      );
      expect(root.floatingElement).toBeNull();
    });

    document.body.append(root);
    await root.updateComplete;

    expect(panel?.isConnected).toBe(false);
    expect(document.querySelector('[data-template-panel]')).toBeNull();
    expect(root.floatingElement).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const firstPanel = document.querySelector('[data-template-panel]');
      expect(root.floatingElement).toBe(firstPanel);
      expect(firstPanel).not.toBe(panel);
    });
    expect(mountListener).toHaveBeenCalledOnce();
    expect(mountListener.mock.calls[0]?.[0].target).toBe(template);
    const firstPanel = document.querySelector('[data-template-panel]');
    firstPanel
      ?.querySelector<HTMLButtonElement>('[data-template-action]')
      ?.click();
    expect(listener).toHaveBeenCalledOnce();

    root.open = false;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBeNull();
      expect(panel?.isConnected).toBe(false);
      expect(template?.content.querySelector('[data-template-panel]')).toBe(
        panel,
      );
    });
    expect(unmountListener).toHaveBeenCalledOnce();
    expect(unmountConnected).toEqual([true]);

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const secondPanel = document.querySelector('[data-template-panel]');
      expect(root.floatingElement).toBe(secondPanel);
      expect(secondPanel).not.toBe(firstPanel);
      expect(secondPanel).not.toBe(panel);
    });
    const secondPanel = document.querySelector('[data-template-panel]');
    secondPanel
      ?.querySelector<HTMLButtonElement>('[data-template-action]')
      ?.click();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(mountListener).toHaveBeenCalledTimes(2);
  });

  test('automatically marks a portal template and keeps it inert until open', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal top-layer="none">
        <template>
          <section data-template-portal>Portal content</section>
        </template>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      expect(document.querySelector('floating-portal-target')).not.toBeNull();
      expect(template?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
      expect(root.contentTemplate).toBe(template);
    });
    expect(document.querySelector('[data-template-portal]')).toBeNull();
    expect(root.floatingElement).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      const panel = document.querySelector('[data-template-portal]');
      expect(panel).not.toBeNull();
      expect(panel?.closest('floating-portal-target')).not.toBeNull();
      expect(root.floatingElement).toBe(panel);
    });

    root.open = false;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(document.querySelector('[data-template-portal]')).toBeNull();
      expect(root.floatingElement).toBeNull();
    });
  });

  test('prefers a native popover for a default portal template', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <template><section data-native-portal>Content</section></template>
      </floating-portal>
    `;
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      expect(root.floatingElement?.getAttribute('popover')).toBe('manual');
      expect(root.floatingElement?.matches(':popover-open')).toBe(true);
    });
    expect(root.floatingElement?.parentElement?.localName).toBe(
      'floating-portal',
    );
    expect(document.querySelector('floating-portal-target')).toBeNull();
  });

  test('prefers a native popover for a default portal template', async () => {
    if (!supportsFloatingTopLayer('popover')) return;
    const root = document.createElement('floating-root');
    root.open = true;
    root.floatingRole = 'dialog';
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <template><section data-native-portal>Content</section></template>
      </floating-portal>
    `;
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      expect(root.floatingElement?.getAttribute('popover')).toBe('manual');
      expect(root.floatingElement?.matches(':popover-open')).toBe(true);
    });
    expect(root.floatingElement?.parentElement?.localName).toBe(
      'floating-portal',
    );
    expect(document.querySelector('floating-portal-target')).toBeNull();
  });

  test('preserves a mounted clone while its portal is enabled or disabled', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal top-layer="none">
        <template><section data-portable-clone>Portable</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal');
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
      expect(template?.closest('floating-portal-target')).not.toBeNull();
    });
    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        document.querySelector('[data-portable-clone]'),
      );
      expect(
        root.floatingElement?.closest('floating-portal-target'),
      ).not.toBeNull();
    });
    const clone = root.floatingElement;
    portal!.disabled = true;
    await portal?.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(clone);
      expect(clone?.closest('floating-root')).toBe(root);
    });

    portal!.disabled = false;
    await portal?.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(clone);
      expect(clone?.closest('floating-portal-target')).not.toBeNull();
    });
    expect(mounted).toHaveBeenCalledOnce();
  });

  test('preserves a mounted clone while its portal target changes', async () => {
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.append(firstTarget, secondTarget);

    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal>
        <template><section data-target-clone>Targeted</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal')!;
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    portal.target = firstTarget;
    document.body.append(root);

    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(template);
      expect(root.floatingElement).toBe(
        firstTarget.querySelector('[data-target-clone]'),
      );
    });
    const clone = root.floatingElement;

    portal.target = secondTarget;
    await portal.updateComplete;
    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(template);
      expect(root.floatingElement).toBe(clone);
      expect(secondTarget.querySelector('[data-target-clone]')).toBe(clone);
    });
    expect(firstTarget.querySelector('[data-target-clone]')).toBeNull();
    expect(mounted).toHaveBeenCalledOnce();
  });

  test('remounts an open template after its document fragment changes', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-fragment-version="first">First</section>
      </template>
    `;
    const template = root.querySelector('template');
    const mounted = vi.fn();
    template?.addEventListener('floatingmount', mounted);
    document.body.append(root);

    await vi.waitFor(() => {
      expect(root.floatingElement?.dataset.fragmentVersion).toBe('first');
    });
    const first = root.floatingElement;
    const replacement = document.createElement('section');
    replacement.dataset.fragmentVersion = 'second';
    replacement.textContent = 'Second';
    template?.content.replaceChildren(replacement);

    await vi.waitFor(() => {
      expect(root.floatingElement?.dataset.fragmentVersion).toBe('second');
      expect(root.floatingElement).not.toBe(first);
    });
    expect(first?.isConnected).toBe(false);
    expect(mounted).toHaveBeenCalledTimes(2);
  });

  test('finds the unique portal template through structural components', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <floating-overlay>
          <floating-focus-manager>
            <template>
              <section data-structured-template>Dialog</section>
            </template>
          </floating-focus-manager>
        </floating-overlay>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
      expect(root.contentTemplate).toBe(template);
    });
    expect(document.querySelector('[data-structured-template]')).toBeNull();
  });

  test('excludes templates owned by a nested floating root', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <template><section>Parent</section></template>
        <floating-root>
          <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
            <section>Child</section>
          </template>
        </floating-root>
      </floating-portal>
    `;
    const templates = Array.from(root.querySelectorAll('template'));
    const childRoot = root.querySelector('floating-root');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(templates[0]?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
      expect(childRoot?.contentTemplate).toBe(templates[1]);
    });
    expect(root.contentTemplate).toBe(templates[0]);
    expect(
      templates[1]?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
    ).toBe(true);
  });

  test('excludes a nested portal template from its parent portal', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <floating-portal>
          <template><section data-nested-portal-template>Nested</section></template>
        </floating-portal>
      </floating-portal>
    `;
    const template = root.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(template?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
      expect(root.contentTemplate).toBe(template);
    });
    expect(document.querySelectorAll('template[slot="content"]')).toHaveLength(
      1,
    );
    expect(document.querySelector('[data-nested-portal-template]')).toBeNull();
  });

  test('requires an explicit marker when a portal owns multiple templates', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-reference><button>Open</button></floating-reference>
      <floating-portal>
        <template><section data-first-template>First</section></template>
        <template><section data-second-template>Second</section></template>
      </floating-portal>
    `;
    const templates = Array.from(root.querySelectorAll('template'));
    document.body.append(root);

    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalled();
    });
    expect(
      templates.some((template) =>
        template.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE),
      ),
    ).toBe(false);
    expect(root.contentTemplate).toBeNull();

    templates[1]?.setAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, '');
    root.open = true;
    await vi.waitFor(() => {
      expect(root.contentTemplate).toBe(templates[1]);
      expect(root.floatingElement).toBe(
        document.querySelector('[data-second-template]'),
      );
    });
    expect(document.querySelector('[data-first-template]')).toBeNull();
    warning.mockRestore();
  });

  test('removes only an automatically injected marker after ownership changes', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-portal>
        <template><section>Automatic</section></template>
      </floating-portal>
    `;
    const portal = root.querySelector('floating-portal');
    const automatic = portal?.querySelector('template');
    document.body.append(root);

    await vi.waitFor(() => {
      expect(automatic?.slot).toBe(FLOATING_UI_PLUS_CONTENT_SLOT);
    });
    root.append(automatic!);
    await vi.waitFor(() => {
      expect(automatic?.slot).toBe('');
    });

    const explicit = document.createElement('template');
    explicit.setAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE, '');
    explicit.innerHTML = '<section>Explicit</section>';
    portal?.append(explicit);
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.append(explicit);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(explicit?.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE)).toBe(
      true,
    );
  });

  test('prioritizes a manual surface, then a named slot, then a template', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <section slot="floating" data-slotted-surface>Slotted</section>
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section data-template-surface>Template</section>
      </template>
    `;
    document.body.append(root);
    await root.updateComplete;

    expect(root.floatingElement).toBe(
      root.querySelector('[data-slotted-surface]'),
    );
    expect(document.querySelector('[data-template-surface]')).toBeNull();

    const manual = document.createElement('section');
    manual.dataset.manualSurface = '';
    document.body.append(manual);
    root.setFloatingElement(manual);
    expect(root.floatingElement).toBe(manual);

    root.setFloatingElement(null);
    expect(root.floatingElement).toBe(
      root.querySelector('[data-slotted-surface]'),
    );

    root.querySelector('[data-slotted-surface]')?.remove();
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        root.querySelector('[data-template-surface]'),
      );
    });
  });

  test('warns and stays unmounted for an invalid template fragment', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <template ${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}>
        <section>First</section>
        <section>Second</section>
      </template>
    `;
    document.body.append(root);

    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalled();
    });
    expect(root.floatingElement).toBeNull();
    warning.mockRestore();
  });

  test('waits for root context and binds portal template content only when open', async () => {
    const standaloneParent = document.createElement('div');
    const standalone = document.createElement('floating-portal');
    standalone.innerHTML = '<button>Not ready</button>';
    standaloneParent.append(standalone);
    document.body.append(standaloneParent);
    await standalone.updateComplete;

    expect(standalone.parentElement).toBe(standaloneParent);
    expect(standalone.shadowRoot?.querySelector('slot')?.hidden).toBe(true);
    expect(document.querySelector('floating-portal-target')).toBeNull();

    const root = document.createElement('floating-root');
    root.innerHTML =
      '<floating-reference><button>Reference</button></floating-reference>';
    const portal = document.createElement('floating-portal');
    portal.setAttribute('top-layer', 'none');
    portal.innerHTML =
      '<template><section>Ready while closed</section></template>';
    root.append(portal);
    document.body.append(root);
    await root.updateComplete;
    await portal.updateComplete;

    await vi.waitFor(() => {
      expect(portal).toBeInstanceOf(FloatingPortalElement);
      expect(portal.parentElement).toBe(root);
      const target = document.body.querySelector(
        'floating-portal-target',
      );
      expect(target?.shadowRoot?.querySelector('slot')).toBeInstanceOf(
        HTMLSlotElement,
      );
      expect(target?.querySelector('template')).not.toBeNull();
    });
    expect(root.open).toBe(false);
    expect(root.floatingElement).toBeNull();
    expect(document.querySelector('floating-portal-target section')).toBeNull();

    root.open = true;
    await root.updateComplete;
    await vi.waitFor(() => {
      expect(root.floatingElement).toBe(
        document.querySelector('floating-portal-target section'),
      );
      expect(root.floatingElement?.hidden).toBe(false);
      expect(root.floatingElement?.getAttribute('role')).toBe('dialog');
    });
  });

  test('appends a nested portal to its logical parent portal', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <floating-reference><button>Reference</button></floating-reference>
      <floating-portal top-layer="none">
        <template>
          <section data-parent-content>
            <floating-portal>
              <div data-child-content>Child</div>
            </floating-portal>
          </section>
        </template>
      </floating-portal>
    `;
    document.body.append(root);
    await root.updateComplete;

    await vi.waitFor(() => {
      const parentContent = document.querySelector('[data-parent-content]');
      const childContent = document.querySelector('[data-child-content]');
      const parentPortal = parentContent?.closest('floating-portal-target');
      const childPortal = childContent?.closest('floating-portal-target');
      expect(parentPortal).not.toBeNull();
      expect(childPortal).not.toBe(parentPortal);
      expect(childPortal?.parentElement).toBe(parentPortal);
      expect(parentPortal?.lastElementChild).toBe(childPortal);
    });
  });

  test('provides ordered list and composite components', async () => {
    const root = document.createElement('floating-root');
    root.innerHTML = `
      <floating-list>
        <floating-list-item label="One"><button>One</button></floating-list-item>
        <floating-list-item label="Two"><button>Two</button></floating-list-item>
      </floating-list>
    `;
    document.body.append(root);
    await root.updateComplete;
    const list = root.querySelector('floating-list');
    const listItems = Array.from(
      root.querySelectorAll('floating-list-item'),
    );
    await list?.updateComplete;
    await Promise.all(listItems.map((item) => item.updateComplete));

    expect(list).toBeInstanceOf(FloatingListElement);
    expect(root.controller.list.items.map((item) => item.label)).toEqual([
      'One',
      'Two',
    ]);

    const composite = document.createElement('floating-composite');
    composite.loop = true;
    composite.innerHTML = `
      <floating-composite-item><button>First</button></floating-composite-item>
      <floating-composite-item><button>Second</button></floating-composite-item>
    `;
    document.body.append(composite);
    await composite.updateComplete;
    await Promise.all(
      Array.from(
        composite.querySelectorAll('floating-composite-item'),
      ).map(
        (item) => item.updateComplete,
      ),
    );
    const buttons = Array.from(composite.querySelectorAll('button'));
    buttons[0]?.focus();
    buttons[0]?.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}),
    );

    expect(composite).toBeInstanceOf(FloatingCompositeElement);
    expect(document.activeElement).toBe(buttons[1]);
  });

  test('discovers list items from a selector and tracks DOM changes', async () => {
    const list = document.createElement('floating-list');
    list.setAttribute('item-selector', '[data-command]');
    list.innerHTML = `
      <button data-command data-label="One">First label</button>
      <button data-command>Two</button>
    `;
    document.body.append(list);
    await list.updateComplete;

    await vi.waitFor(() => {
      expect(list.list.items.map((item) => item.label)).toEqual([
        'One',
        'Two',
      ]);
    });

    const first = list.querySelector('button')!;
    first.dataset.label = 'Updated';
    list.lastElementChild?.remove();
    await vi.waitFor(() => {
      expect(list.list.items.map((item) => item.label)).toEqual([
        'Updated',
      ]);
    });
  });

  test('renders an arrow component with an SVG contract', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">Reference</button>
      <section slot="floating">
        Floating
        <floating-arrow width="18" height="9"></floating-arrow>
      </section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const arrow = root.querySelector('floating-arrow');
    await arrow?.updateComplete;

    expect(arrow).toBeInstanceOf(FloatingArrowElement);
    expect(
      arrow?.shadowRoot?.querySelector('svg')?.getAttribute('viewBox'),
    ).toBe('0 0 18 9');
    expect(arrow?.shadowRoot?.querySelector('slot')).toBeInstanceOf(
      HTMLSlotElement,
    );
    const path = arrow?.shadowRoot?.querySelector('path');
    if (typeof path?.getBBox === 'function') {
      expect(path.getBBox().width).toBe(18);
    } else {
      expect(path?.getAttribute('d')).toBe('M0 9L9 0L18 9Z');
    }
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    expect(arrow?.hasAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE)).toBe(true);
    expect(
      arrow?.getAttribute(FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE),
    ).toBe('9');
  });

  test('updates the arrow side and rotation when placement changes', async () => {
    const root = document.createElement('floating-root');
    root.open = true;
    root.innerHTML = `
      <button slot="reference">Reference</button>
      <section slot="floating">
        Floating
        <floating-arrow width="18" height="9" static-offset="-9"></floating-arrow>
      </section>
    `;
    document.body.append(root);
    await root.updateComplete;
    const arrow = root.querySelector('floating-arrow')!;
    await arrow.updateComplete;

    const cases = [
      ['top', 'bottom', 'rotate(180deg)'],
      ['right', 'left', 'rotate(-90deg)'],
      ['bottom', 'top', 'rotate(0deg)'],
      ['left', 'right', 'rotate(90deg)'],
    ] as const;

    for (const [placement, staticSide, transform] of cases) {
      root.placement = placement;
      await root.updateComplete;
      await root.updatePosition();

      await vi.waitFor(() => {
        expect(arrow.style[staticSide]).toBe('-9px');
        expect(arrow.style.transform).toBe(transform);
      });
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        if (side !== staticSide) expect(arrow.style[side]).toBe('');
      }
    }
  });
});
