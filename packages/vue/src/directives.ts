import {applyFloatingStyles} from '@floating-ui-plus/web';
import type {Directive} from 'vue';

import type {UseFloatingReturn} from './types';

const bindings = new WeakMap<
  HTMLElement,
  {cleanup: () => void; floating: UseFloatingReturn}
>();

function bindFloatingStyles(element: HTMLElement, floating: UseFloatingReturn) {
  const previous = bindings.get(element);
  previous?.cleanup();
  if (previous && previous.floating !== floating) {
    previous.floating.controller.presence.set('unmounted');
  }

  const apply = () =>
    applyFloatingStyles(element, floating.controller.floatingStyles);
  apply();
  floating.controller.presence.set('mounted');
  bindings.set(element, {
    cleanup: floating.context.events.on('positionchange', apply),
    floating,
  });
}

/** Applies Web-owned floating styles and keeps them current after positioning. */
export const vFloating: Directive<HTMLElement, UseFloatingReturn> = {
  mounted(element, binding) {
    bindFloatingStyles(element, binding.value);
  },
  updated(element, binding) {
    if (binding.value !== binding.oldValue) {
      bindFloatingStyles(element, binding.value);
    }
  },
  unmounted(element) {
    const binding = bindings.get(element);
    binding?.cleanup();
    binding?.floating.controller.presence.set('unmounted');
    bindings.delete(element);
  },
};
