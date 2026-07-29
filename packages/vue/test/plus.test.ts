import {cleanup, fireEvent, render, waitFor} from '@testing-library/vue';
import {defineComponent, h, nextTick, ref} from 'vue';
import {afterEach} from 'vitest';

import {
  FloatingOverlay,
  FloatingPortal,
  click,
  dismiss,
  role,
  useFloating,
} from '../src';

afterEach(() => cleanup());

describe('Floating UI Plus Vue adapter', () => {
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
