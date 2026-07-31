import type {
  FloatingElement,
  MiddlewareData,
  ReferenceElement,
  FloatingPlugin,
  ItemState,
} from '@floating-ui-plus/web';
import {createFloating} from '@floating-ui-plus/web';
import type {Ref} from 'vue';
import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
  watchEffect,
} from 'vue';

import type {
  MaybeElement,
  MaybeReadonlyRefOrGetter,
  UseFloatingOptions,
  UseFloatingReturn,
} from './types';
import {unwrapElement} from './utils/unwrapElement';

/**
 * Computes the `x` and `y` coordinates that will place the floating element next to a reference element when it is given a certain CSS positioning strategy.
 * @param reference The reference template ref.
 * @param floating The floating template ref.
 * @param options The floating options.
 * @see https://floating-ui.com/docs/vue
 */
export function useFloating<T extends ReferenceElement = ReferenceElement>(
  reference: Readonly<Ref<MaybeElement<T>>>,
  floating: Readonly<Ref<MaybeElement<FloatingElement>>>,
  options: UseFloatingOptions<T> = {},
): UseFloatingReturn {
  const openOption = computed(() => toValue(options.open) ?? true);
  const middlewareOption = computed(() => toValue(options.middleware));
  const placementOption = computed(
    () => toValue(options.placement) ?? 'bottom',
  );
  const strategyOption = computed(
    () => toValue(options.strategy) ?? 'absolute',
  );
  const transformOption = computed(() => toValue(options.transform) ?? true);
  const referenceElement = computed(() => unwrapElement(reference.value));
  const floatingElement = computed(() => unwrapElement(floating.value));
  const x = shallowRef(0);
  const y = shallowRef(0);
  const strategy = shallowRef(strategyOption.value);
  const placement = shallowRef(placementOption.value);
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = shallowRef(false);
  const revision = shallowRef(0);
  const elements = shallowRef<{
    reference: ReferenceElement | null;
    floating: HTMLElement | null;
  }>({reference: null, floating: null});
  const controller = createFloating(() => ({
    open: openOption.value,
    transform: transformOption.value,
    middleware: middlewareOption.value,
    placement: placementOption.value,
    strategy: strategyOption.value,
    ...(options.onOpenChange
      ? {onOpenChange: options.onOpenChange}
      : {}),
    ...(options.whileElementsMounted
      ? {
          whileElementsMounted: (
            nextReference: ReferenceElement,
            nextFloating: HTMLElement,
            nextUpdate: () => void,
          ) =>
            options.whileElementsMounted!(
              nextReference as T,
              nextFloating,
              nextUpdate,
            ),
        }
      : {}),
  }));
  const registeredPluginEntries = new Map<
    symbol,
    {
      plugins: FloatingPlugin[];
      cleanups: Array<() => void>;
    }
  >();
  let registeredPluginContext:
    | Parameters<NonNullable<FloatingPlugin['connect']>>[0]
    | null = null;
  let registeredPluginBridgeInstalled = false;

  function cleanupRegisteredEntry(
    entry: {cleanups: Array<() => void>},
  ) {
    entry.cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
  }

  function connectRegisteredEntry(
    entry: {
      plugins: FloatingPlugin[];
      cleanups: Array<() => void>;
    },
    context: NonNullable<typeof registeredPluginContext>,
  ) {
    cleanupRegisteredEntry(entry);
    for (const plugin of entry.plugins) {
      const cleanup = plugin.connect(context);
      if (cleanup) entry.cleanups.push(cleanup);
    }
  }

  const registeredPluginBridge: FloatingPlugin = {
    name: 'vue-registered-plugins',
    connect(context) {
      registeredPluginContext = context;
      for (const entry of registeredPluginEntries.values()) {
        connectRegisteredEntry(entry, context);
      }
      return () => {
        for (const entry of registeredPluginEntries.values()) {
          cleanupRegisteredEntry(entry);
        }
        if (registeredPluginContext === context) {
          registeredPluginContext = null;
        }
      };
    },
    update(context) {
      for (const entry of registeredPluginEntries.values()) {
        for (const plugin of entry.plugins) plugin.update?.(context);
      }
    },
  };

  function syncPosition() {
    const position = controller.position;
    x.value = position.x;
    y.value = position.y;
    strategy.value = position.strategy;
    placement.value = position.placement;
    middlewareData.value = position.middlewareData;
    isPositioned.value = position.isPositioned;
    revision.value++;
    syncAttrs();
  }

  function update() {
    return controller.update().then(syncPosition);
  }

  const floatingStyles = computed(() => {
    revision.value;
    const styles = controller.floatingStyles;
    return {
      position: styles.position,
      top: styles.top,
      left: styles.left,
      ...(styles.transform ? {transform: styles.transform} : {}),
      ...(styles.willChange ? {willChange: styles.willChange} : {}),
    };
  });

  const referenceAttrs = shallowReactive<Record<string, string | boolean>>({});
  const floatingAttrs = shallowReactive<Record<string, string | boolean>>({});

  function syncAttrs() {
    replaceRecord(
      referenceAttrs,
      compactAttrs(controller.context.attributes.reference),
    );
    replaceRecord(
      floatingAttrs,
      compactAttrs(controller.context.attributes.floating),
    );
  }

  function getItemAttrs(
    state: MaybeReadonlyRefOrGetter<ItemState> = {},
  ) {
    const itemAttrs = shallowReactive<Record<string, string | boolean>>({});
    watchEffect(() => {
      revision.value;
      const attributes = controller.context.attributes.item;
      const value = toValue(state);
      replaceRecord(
        itemAttrs,
        compactAttrs(
          typeof attributes === 'function' ? attributes(value) : attributes,
        ),
      );
    });
    return itemAttrs;
  }

  function refresh() {
    controller.refresh();
    if (!openOption.value) {
      isPositioned.value = false;
    }
    revision.value++;
    syncAttrs();
  }

  const removePositionListener = controller.context.events.on(
    'positionchange',
    syncPosition,
  );
  const removeOpenListener = controller.context.events.on(
    'openchange',
    () => {
      revision.value++;
      syncAttrs();
    },
  );

  watch(
    [middlewareOption, placementOption, strategyOption, openOption, transformOption],
    refresh,
    {flush: 'sync'},
  );
  watch(
    [referenceElement, floatingElement],
    ([nextReference, nextFloating]) => {
      const nextFloatingElement =
        typeof HTMLElement !== 'undefined' &&
        nextFloating instanceof HTMLElement
          ? nextFloating
          : null;
      if (controller.elements.reference !== (nextReference ?? null)) {
        controller.setReference(nextReference ?? null);
      }
      if (controller.elements.floating !== nextFloatingElement) {
        controller.setFloating(nextFloatingElement);
      }
      elements.value = {
        reference: nextReference ?? null,
        floating: nextFloatingElement,
      };
      revision.value++;
    },
    {flush: 'sync', immediate: true},
  );

  controller.connect();

  let result: UseFloatingReturn;
  const pipe = (...plugins: FloatingPlugin[]) => {
    controller.pipe(...plugins);
    revision.value++;
    syncAttrs();
    return result;
  };
  const registerPlugins = (...plugins: FloatingPlugin[]) => {
    const owner = Symbol('vue-floating-plugins');
    const entry = {plugins, cleanups: [] as Array<() => void>};
    registeredPluginEntries.set(owner, entry);
    if (!registeredPluginBridgeInstalled) {
      registeredPluginBridgeInstalled = true;
      controller.pipe(registeredPluginBridge);
    } else if (registeredPluginContext) {
      connectRegisteredEntry(entry, registeredPluginContext);
    }
    controller.refresh();
    revision.value++;
    syncAttrs();
    return () => {
      const current = registeredPluginEntries.get(owner);
      if (!current) return;
      cleanupRegisteredEntry(current);
      registeredPluginEntries.delete(owner);
      controller.refresh();
      revision.value++;
      syncAttrs();
    };
  };

  result = {
    x: shallowReadonly(x),
    y: shallowReadonly(y),
    strategy: shallowReadonly(strategy),
    placement: shallowReadonly(placement),
    middlewareData: shallowReadonly(middlewareData),
    isPositioned: shallowReadonly(isPositioned),
    floatingStyles,
    update,
    context: controller.context,
    controller,
    contextScope: controller.contextScope,
    pipe,
    registerPlugins,
    referenceAttrs,
    floatingAttrs,
    getItemAttrs,
    elements: shallowReadonly(elements),
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      removePositionListener();
      removeOpenListener();
      controller.destroy();
    });
  }

  return result;
}

function compactAttrs(
  attributes:
    | Record<string, string | boolean | null | undefined>
    | undefined,
) {
  return Object.fromEntries(
    Object.entries(attributes ?? {}).filter(([, value]) => value != null),
  ) as Record<string, string | boolean>;
}

function replaceRecord(
  target: Record<string, string | boolean>,
  source: Record<string, string | boolean>,
) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key];
  }
  Object.assign(target, source);
}
