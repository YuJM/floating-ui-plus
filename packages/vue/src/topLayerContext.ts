import {inject, type InjectionKey, type Ref} from 'vue';

import type {FloatingTopLayer} from '@floating-ui-plus/web';

export const FloatingPortalTopLayerKey: InjectionKey<
  Readonly<Ref<FloatingTopLayer>>
> = Symbol('FloatingPortalTopLayer');

export function useFloatingPortalTopLayer() {
  return inject(FloatingPortalTopLayerKey, null);
}
