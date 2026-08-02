import {
  createFloatingTopLayer,
  type FloatingTopLayer,
  type FloatingTopLayerController,
} from '@floating-ui-plus/web';
import {
  onScopeDispose,
  toValue,
  watchEffect,
  type Ref,
} from 'vue';

import type {MaybeElement, MaybeReadonlyRefOrGetter} from './types';

export interface UseFloatingTopLayerOptions {
  kind?: MaybeReadonlyRefOrGetter<FloatingTopLayer>;
  onOpenChange?: Parameters<typeof createFloatingTopLayer>[0]['onOpenChange'];
}

/**
 * Vue lifecycle adapter for a renderer-owned native Popover or Dialog.
 * Positioning is intentionally not involved; this is useful for fixed
 * transient surfaces such as Toasts that still need native Top Layer behavior.
 */
export function useFloatingTopLayer(
  element: Readonly<Ref<MaybeElement<HTMLElement>>>,
  open: MaybeReadonlyRefOrGetter<boolean>,
  options: UseFloatingTopLayerOptions = {},
): FloatingTopLayerController {
  const controller = createFloatingTopLayer({
    onOpenChange: options.onOpenChange ?? (() => undefined),
  });
  controller.connect();

  watchEffect(() => {
    const target = toValue(element);
    const nativeElement =
      typeof HTMLElement !== 'undefined' && target instanceof HTMLElement
        ? target
        : null;
    controller.setKind(toValue(options.kind) ?? 'popover');
    controller.setElement(nativeElement);
    controller.sync(Boolean(toValue(open)));
  });

  onScopeDispose(() => controller.destroy());
  return controller;
}
