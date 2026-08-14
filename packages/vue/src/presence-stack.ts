import {
  bindPresenceStackPause,
  FloatingPresenceStack as WebFloatingPresenceStack,
  parsePresencePauseOn,
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

export interface UseFloatingPresenceStackOptions
  extends FloatingPresenceStackOptions {
  /**
   * Application-owned host that receives opt-in pause listeners and the
   * `--floating-presence-count` token. The composable does not style it.
   */
  pauseTarget?: MaybeReadonlyRefOrGetter<HTMLElement | null | undefined>;
  /** Space-separated `pointer` and/or `focus`. Empty disables pause binding. */
  pauseOn?: MaybeReadonlyRefOrGetter<string | readonly string[] | undefined>;
  /** Delay before `resume('pointer')` after `pointerleave`. */
  resumeDelay?: MaybeReadonlyRefOrGetter<number | undefined>;
}

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

function toKernelOptions(
  options: UseFloatingPresenceStackOptions,
): FloatingPresenceStackOptions {
  const next: FloatingPresenceStackOptions = {};
  if (options.limit != null) next.limit = options.limit;
  if (options.timeout != null) next.timeout = options.timeout;
  return next;
}

/**
 * Vue lifecycle adapter for the framework-neutral transient stack.
 *
 * It mirrors the imperative Web Component API while exposing reactive
 * `snapshot`, `records`, and `paused` values for template rendering.
 */
export function useFloatingPresenceStack<T>(
  options:
    | MaybeReadonlyRefOrGetter<UseFloatingPresenceStackOptions>
    | undefined = {},
): UseFloatingPresenceStackReturn<T> {
  const controller = new WebFloatingPresenceStack<T>(
    toKernelOptions(toValue(options)),
  );
  const snapshot = shallowRef<PresenceStackSnapshot<T>>(controller.snapshot);
  const unsubscribe = controller.subscribe((next) => {
    snapshot.value = next;
  });
  let countTarget: HTMLElement | undefined;

  const stopOptionsWatch = watchEffect(() => {
    controller.setOptions(toKernelOptions(toValue(options)));
  });

  const stopPauseWatch = watchEffect((onCleanup) => {
    const resolved = toValue(options);
    const target = toValue(resolved.pauseTarget);
    const kinds = parsePresencePauseOn(toValue(resolved.pauseOn));
    if (!(target instanceof HTMLElement) || kinds.size === 0) return;
    onCleanup(
      bindPresenceStackPause(target, controller, {
        kinds,
        resumeDelay: toValue(resolved.resumeDelay),
      }),
    );
  });

  const stopCountWatch = watchEffect(() => {
    const resolved = toValue(options);
    const target = toValue(resolved.pauseTarget);
    if (countTarget && countTarget !== target) {
      countTarget.style.removeProperty('--floating-presence-count');
    }
    countTarget = target instanceof HTMLElement ? target : undefined;
    if (!countTarget) return;
    countTarget.style.setProperty(
      '--floating-presence-count',
      String(snapshot.value.records.filter((record) => record.open).length),
    );
  });

  onScopeDispose(() => {
    stopOptionsWatch();
    stopPauseWatch();
    stopCountWatch();
    countTarget?.style.removeProperty('--floating-presence-count');
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
