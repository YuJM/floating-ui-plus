import {cleanup, fireEvent, render, waitFor} from '@testing-library/vue';
import {
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
} from 'vue';
import {renderToString} from '@vue/server-renderer';
import {afterEach, vi} from 'vitest';

import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  FloatingArrow,
  FloatingOverlay,
  FloatingPortal,
  FloatingContent,
  FloatingReference,
  FloatingRoot,
  click,
  createFuzzySearchSource,
  createFloatingContextScope,
  dismiss,
  requestFloatingContext,
  role,
  useFloating,
  useSearch,
  vFloating,
} from '../src';

afterEach(() => cleanup());

describe('Floating UI Plus Vue adapter', () => {
  test('marks the default arrow SVG with the shared arrow attribute', async () => {
    const App = defineComponent(() => () =>
      h(
        FloatingRoot,
        {open: true},
        {
          default: () => [
            h(FloatingReference, {}, {default: () => 'Reference'}),
            h(FloatingContent, {}, {default: () => h(FloatingArrow)}),
          ],
        },
      ),
    );

    const {container} = render(App);
    await nextTick();

    expect(container.innerHTML).toContain(
      `${FLOATING_UI_PLUS_ARROW_ATTRIBUTE}=""`,
    );
    expect(container.innerHTML).toContain(
      `${FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE}="7"`,
    );
  });

  test('connects generic search state to Vue lifecycle', async () => {
    const source = createFuzzySearchSource(
      [
        {id: 'seoul', label: '서울', keywords: ['seoul', 'seol']},
        {id: 'beijing', label: '北京', keywords: ['beijing', 'peking']},
      ],
      {
        keys: [{name: 'label'}, {name: 'keywords', weight: 0.7}],
      },
    );
    const App = defineComponent({
      setup() {
        const search = useSearch({
          source,
          getItemKey: (item) => item.id,
          debounceMs: 0,
        });
        return () =>
          h('div', [
            h(
              'button',
              {onClick: () => search.controller.setQuery('bejing')},
              'Search',
            ),
            h(
              'output',
              {'data-query': search.query.value},
              search.items.value.map((item) => item.label).join(','),
            ),
          ]);
      },
    });

    const {getByRole, getByText} = render(App);
    await waitFor(() => expect(getByText('서울,北京')).toBeVisible());
    await fireEvent.click(getByRole('button', {name: 'Search'}));
    await waitFor(() => {
      expect(getByText('北京')).toHaveAttribute('data-query', 'bejing');
    });
  });

  test('offers a declarative root, reference, and content API alongside useFloating', async () => {
    const open = ref(false);
    const App = defineComponent(() => () =>
      h(
        FloatingRoot,
        {
          open: open.value,
          'onUpdate:open': (value: boolean) => (open.value = value),
          plugins: [click(), role({role: 'dialog'})],
        },
        {
          default: () => [
            h(FloatingReference, {'data-testid': 'reference'}, {default: () => 'Open'}),
            open.value
              ? h(FloatingContent, {'data-testid': 'content'}, {default: () => 'Content'})
              : null,
          ],
        },
      ),
    );

    const {getByTestId} = render(App);
    await fireEvent.click(getByTestId('reference'));
    await waitFor(() => {
      expect(getByTestId('content')).toHaveAttribute('role', 'dialog');
      expect(getByTestId('content')).toHaveStyle({position: 'absolute'});
    });
  });

  test('pipes interactions and exposes reactive v-bind attributes', async () => {
    const App = defineComponent({
      setup() {
        const open = ref(false);
        const reference = ref<HTMLElement | null>(null);
        const floating = ref<HTMLElement | null>(null);
        const api = useFloating(reference, floating, {
          open,
          onOpenChange(nextOpen) {
            open.value = nextOpen;
          },
        }).pipe(click(), dismiss(), role({role: 'dialog'}));
        return {api, floating, open, reference};
      },
      template: `
        <button ref="reference" v-bind="api.referenceAttrs">Open</button>
        <div
          v-if="open"
          ref="floating"
          data-testid="floating"
          v-bind="api.floatingAttrs"
          :style="api.floatingStyles"
        >Content</div>
      `,
    });

    const {getByRole, getByTestId} = render(App);
    await fireEvent.click(getByRole('button'));

    await waitFor(() => {
      expect(getByTestId('floating')).toHaveAttribute('role', 'dialog');
    });

    await fireEvent.keyDown(document, {key: 'Escape'});
    await waitFor(() => {
      expect(() => getByTestId('floating')).toThrow();
    });
  });

  test('gives declarative floating elements the default dialog ARIA contract', async () => {
    const App = defineComponent(() => () =>
      h(FloatingRoot, {open: true}, {
        default: () => [
          h(FloatingReference, {'data-testid': 'reference'}, {default: () => 'Open'}),
          h(FloatingContent, {'data-testid': 'content'}, {default: () => 'Content'}),
        ],
      }),
    );

    const {getByTestId} = render(App);
    await waitFor(() => {
      const reference = getByTestId('reference');
      const content = getByTestId('content');
      expect(reference).toHaveAttribute('aria-haspopup', 'dialog');
      expect(reference).toHaveAttribute('aria-expanded', 'true');
      expect(reference).toHaveAttribute('aria-controls', content.id);
      expect(content).toHaveAttribute('role', 'dialog');
    });
  });

  test('uses Vue Teleport and supports disabling it', async () => {
    const disabled = ref(false);
    const target = document.createElement('div');
    target.id = 'portal-target';
    document.body.append(target);

    const App = defineComponent(() => () =>
      h(
        FloatingPortal,
        {to: target, disabled: disabled.value},
        {default: () => h('div', {'data-testid': 'content'}, 'Portaled')},
      ),
    );

    const {container, getByTestId} = render(App);
    await nextTick();
    expect(target).toContainElement(getByTestId('content'));

    disabled.value = true;
    await nextTick();
    expect(container).toContainElement(getByTestId('content'));
    target.remove();
  });

  test('mounts client portal content once after the target is ready', async () => {
    let mountCount = 0;
    const Content = defineComponent({
      setup() {
        onMounted(() => mountCount++);
        return () => h('div', {'data-testid': 'content'}, 'Portaled');
      },
    });
    const App = defineComponent(() => () =>
      h(FloatingPortal, null, {default: () => h(Content)}),
    );

    render(App);
    await nextTick();
    await nextTick();

    expect(mountCount).toBe(1);
  });

  test('appends a nested portal to its logical parent portal', async () => {
    const App = defineComponent(() => () =>
      h(
        FloatingPortal,
        null,
        {
          default: () => [
            h('div', {'data-testid': 'parent-content'}, 'Parent'),
            h(
              FloatingPortal,
              null,
              {
                default: () =>
                  h('div', {'data-testid': 'child-content'}, 'Child'),
              },
            ),
          ],
        },
      ),
    );

    const {getByTestId} = render(App);
    await nextTick();
    await nextTick();
    const parentPortal = getByTestId('parent-content').closest(
      '[data-fup-portal]',
    );
    const childPortal = getByTestId('child-content').closest(
      '[data-fup-portal]',
    );
    expect(parentPortal).not.toBeNull();
    expect(childPortal).not.toBe(parentPortal);
    expect(childPortal?.parentElement).toBe(parentPortal);
  });

  test('attaches after a selector target appears in a later Vue update', async () => {
    const targetVisible = ref(false);
    const App = defineComponent(() => () => [
      h(
        FloatingPortal,
        {to: '#late-portal-target', active: targetVisible.value},
        {
          default: () =>
            h('div', {'data-testid': 'late-content'}, 'Deferred'),
        },
      ),
      targetVisible.value
        ? h('div', {id: 'late-portal-target'})
        : null,
    ]);

    const {container, getByTestId} = render(App);
    await nextTick();
    expect(container).toContainElement(getByTestId('late-content'));

    targetVisible.value = true;
    await nextTick();
    await nextTick();
    expect(document.querySelector('#late-portal-target')).toContainElement(
      getByTestId('late-content'),
    );

    targetVisible.value = false;
    await nextTick();
    await nextTick();
    expect(container).toContainElement(getByTestId('late-content'));
  });

  test('hydrates inline portal content before moving it to its target', async () => {
    const target = document.createElement('div');
    target.id = 'hydration-portal-target';
    const host = document.createElement('div');
    document.body.append(host, target);
    const hydrationErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const App = defineComponent(() => () =>
      h(
        FloatingPortal,
        {to: '#hydration-portal-target'},
        {
          default: () =>
            h('div', {'data-testid': 'hydrated-content'}, 'Hydrated'),
        },
      ),
    );

    host.innerHTML = await renderToString(createSSRApp(App));
    expect(host.querySelector('[data-testid="hydrated-content"]')).not.toBeNull();

    const app = createSSRApp(App);
    app.mount(host);
    await nextTick();
    await nextTick();
    expect(target.querySelector('[data-testid="hydrated-content"]')).not.toBeNull();
    expect(
      hydrationErrors.mock.calls.some(([message]) =>
        String(message).includes('Hydration'),
      ),
    ).toBe(false);

    app.unmount();
    host.remove();
    target.remove();
  });

  test('applies Web-owned styles through the v-floating directive', async () => {
    const App = defineComponent({
      directives: {floating: vFloating},
      setup() {
        const reference = ref<HTMLElement | null>(null);
        const floating = ref<HTMLElement | null>(null);
        return {api: useFloating(reference, floating), floating, reference};
      },
      template: `
        <button ref="reference">Reference</button>
        <div ref="floating" data-testid="floating" v-floating="api">Content</div>
      `,
    });

    const {getByTestId, unmount} = render(App);
    await nextTick();
    expect(getByTestId('floating')).toHaveStyle({position: 'absolute'});
    unmount();
  });

  test('bridges a Web context scope through the Vue Teleport target', async () => {
    const scope = createFloatingContextScope();
    scope.provide('theme', 'vue-green');
    const target = document.createElement('div');
    document.body.append(target);
    const App = defineComponent(() => () =>
      h(
        FloatingPortal,
        {to: target, contextScope: scope, active: true},
        {
          default: () =>
            h('button', {'data-testid': 'scoped-content'}, 'Scoped'),
        },
      ),
    );

    const {getByTestId, unmount} = render(App);
    await nextTick();
    expect(
      requestFloatingContext<string>(getByTestId('scoped-content'), 'theme'),
    ).toBe('vue-green');
    unmount();
    expect(target.querySelector('[data-testid="scoped-content"]')).toBeNull();
    target.remove();
  });

  test('keeps the context scope attached while a Teleport is disabled', async () => {
    const scope = createFloatingContextScope();
    scope.provide('theme', 'disabled-teleport');
    const disabled = ref(true);
    const target = document.createElement('div');
    document.body.append(target);
    const App = defineComponent(() => () =>
      h(
        FloatingPortal,
        {to: target, disabled: disabled.value, contextScope: scope, active: true},
        {
          default: () =>
            h('button', {'data-testid': 'disabled-content'}, 'Scoped'),
        },
      ),
    );

    const {getByTestId} = render(App);
    await nextTick();
    expect(
      requestFloatingContext<string>(getByTestId('disabled-content'), 'theme'),
    ).toBe('disabled-teleport');

    disabled.value = false;
    await nextTick();
    expect(target).toContainElement(getByTestId('disabled-content'));
    expect(
      requestFloatingContext<string>(getByTestId('disabled-content'), 'theme'),
    ).toBe('disabled-teleport');
    target.remove();
  });

  test('locks and restores body scrolling with the overlay lifecycle', async () => {
    document.body.style.overflow = 'auto';
    const visible = ref(true);
    const App = defineComponent(() => () =>
      visible.value
        ? h(
            FloatingOverlay,
            {lockScroll: true},
            {default: () => 'Overlay'},
          )
        : null,
    );

    render(App);
    await nextTick();
    expect(document.body.style.overflow).toBe('hidden');

    visible.value = false;
    await nextTick();
    expect(document.body.style.overflow).toBe('auto');
  });
});
