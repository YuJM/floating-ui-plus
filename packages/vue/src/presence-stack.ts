import {
  FloatingPresenceStack as WebFloatingPresenceStack,
  type FloatingPresenceStackContext,
  type FloatingPresenceStackOptions,
  type PresenceStackAddOptions,
  type PresenceStackRecord,
  type PresenceStackSnapshot,
} from '@floating-ui-plus/web';
import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  watchEffect,
  type ComputedRef,
  type ShallowRef,
} from 'vue';

import type {MaybeReadonlyRefOrGetter} from './types';

export interface UseFloatingPresenceStackReturn<T> {
  controller: WebFloatingPresenceStack<T>;
  context: FloatingPresenceStackContext<T>;
  /** Reactive counterpart of the Web Component's `snapshot` getter. */
  snapshot: Readonly<ShallowRef<PresenceStackSnapshot<T>>>;
  records: ComputedRef<readonly PresenceStackRecord<T>[]>;
  paused: ComputedRef<boolean>;
  add(value: T, options?: PresenceStackAddOptions): string;
  close(id: string, overflowed?: boolean): void;
  remove(id: string): void;
  pause(reason?: string): void;
  resume(reason?: string): void;
  subscribe: FloatingPresenceStackContext<T>['subscribe'];
}

/**
 * Vue lifecycle adapter for the framework-neutral transient stack.
 *
 * It mirrors the imperative Web Component API while exposing reactive
 * `snapshot`, `records`, and `paused` values for template rendering.
 */
export function useFloatingPresenceStack<T>(
  options: MaybeReadonlyRefOrGetter<FloatingPresenceStackOptions> = {},
): UseFloatingPresenceStackReturn<T> {
  const controller = new WebFloatingPresenceStack<T>(toValue(options));
  const snapshot = shallowRef<PresenceStackSnapshot<T>>(controller.snapshot);
  const unsubscribe = controller.subscribe((next) => {
    snapshot.value = next;
  });

  const stopOptionsWatch = watchEffect(() => {
    controller.setOptions(toValue(options));
  });

  onScopeDispose(() => {
    stopOptionsWatch();
    unsubscribe();
    controller.destroy();
  });

  return {
    controller,
    context: controller,
    snapshot,
    records: computed(() => snapshot.value.records),
    paused: computed(() => snapshot.value.paused),
    add: (value, addOptions?: PresenceStackAddOptions) =>
      controller.add(value, addOptions),
    close: (id, overflowed) => controller.close(id, overflowed),
    remove: (id) => controller.remove(id),
    pause: (reason) => controller.pause(reason),
    resume: (reason) => controller.resume(reason),
    subscribe: (listener) => controller.subscribe(listener),
  };
}
