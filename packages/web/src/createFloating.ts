import {computePosition} from '@floating-ui/dom';
import {isElement} from '@floating-ui/utils/dom';

import {createFloatingEvents} from './events';
import type {
  FloatingAttributes,
  FloatingContext,
  FloatingController,
  FloatingData,
  FloatingElements,
  FloatingOptions,
  FloatingOptionsSource,
  FloatingPlugin,
  FloatingPosition,
  FloatingStyles,
  ReferenceElement,
} from './types';

let id = 0;

function resolveOptions(source: FloatingOptionsSource): FloatingOptions {
  return typeof source === 'function' ? source() : source;
}

function createInitialPosition(options: FloatingOptions): FloatingPosition {
  return {
    x: 0,
    y: 0,
    strategy: options.strategy ?? 'absolute',
    placement: options.placement ?? 'bottom',
    middlewareData: {},
    isPositioned: false,
  };
}

function getFloatingStyles(
  position: FloatingPosition,
  floating: HTMLElement | null,
  transform: boolean,
): FloatingStyles {
  const initial: FloatingStyles = {
    position: position.strategy,
    left: '0',
    top: '0',
  };

  if (!floating) {
    return initial;
  }

  const dpr = floating.ownerDocument.defaultView?.devicePixelRatio || 1;
  const round = (value: number) => Math.round(value * dpr) / dpr;
  const x = round(position.x);
  const y = round(position.y);

  if (transform) {
    return {
      ...initial,
      transform: `translate(${x}px, ${y}px)`,
      ...(dpr >= 1.5 ? {willChange: 'transform'} : {}),
    };
  }

  return {
    ...initial,
    left: `${x}px`,
    top: `${y}px`,
  };
}

export function createFloating(
  optionsSource: FloatingOptionsSource = {},
): FloatingController {
  const elements: FloatingElements = {
    reference: null,
    domReference: null,
    floating: null,
  };
  const data: FloatingData = {};
  const attributes: FloatingAttributes = {};
  const events = createFloatingEvents();
  const plugins: FloatingPlugin[] = [];
  const pluginCleanups: Array<() => void> = [];
  let mountedCleanup: (() => void) | undefined;
  let connected = false;
  let destroyed = false;
  let requestId = 0;
  let position = createInitialPosition(resolveOptions(optionsSource));
  let floatingStyles = getFloatingStyles(
    position,
    null,
    resolveOptions(optionsSource).transform !== false,
  );

  const context: FloatingContext = {
    get open() {
      return resolveOptions(optionsSource).open ?? false;
    },
    get options() {
      return resolveOptions(optionsSource);
    },
    elements,
    get position() {
      return position;
    },
    data,
    events,
    floatingId: `floating-ui-${++id}`,
    attributes,
    nested: false,
    onOpenChange(open, event, reason) {
      data.openEvent = open ? event : undefined;
      const value = {open, event, reason, nested: context.nested};
      events.emit('openchange', value);
      resolveOptions(optionsSource).onOpenChange?.(open, event, reason);
    },
    setPositionReference(reference) {
      controller.setPositionReference(reference);
    },
    update() {
      return update();
    },
  };

  function cleanupPlugins() {
    pluginCleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
  }

  function connectPlugins() {
    cleanupPlugins();
    if (!connected) return;

    plugins.forEach((plugin) => {
      const cleanup = plugin.connect(context);
      if (cleanup) {
        pluginCleanups.push(cleanup);
      }
    });
  }

  function cleanupMounted() {
    mountedCleanup?.();
    mountedCleanup = undefined;
  }

  function attachPositioning() {
    cleanupMounted();
    const reference = elements.reference;
    const floating = elements.floating;
    if (!connected || !reference || !floating) return;

    const whileElementsMounted =
      resolveOptions(optionsSource).whileElementsMounted;
    if (whileElementsMounted) {
      mountedCleanup = whileElementsMounted(reference, floating, () => {
        void update();
      });
    } else {
      void update();
    }
  }

  async function update() {
    const reference = elements.reference;
    const floating = elements.floating;
    if (!reference || !floating || destroyed) return;

    const currentRequest = ++requestId;
    const options = resolveOptions(optionsSource);
    const result = await computePosition(reference, floating, {
      middleware: options.middleware,
      placement: options.placement,
      strategy: options.strategy,
      platform: options.platform,
    });

    if (currentRequest !== requestId || destroyed) return;

    position = {
      ...result,
      isPositioned: options.open !== false,
    };
    floatingStyles = getFloatingStyles(
      position,
      floating,
      options.transform !== false,
    );
    events.emit('positionchange', position);
  }

  function setReference(reference: Element | ReferenceElement | null) {
    elements.reference = reference;
    if (isElement(reference) || reference === null) {
      elements.domReference = reference;
    }
    attachPositioning();
    connectPlugins();
  }

  const controller: FloatingController = {
    context,
    elements,
    get position() {
      return position;
    },
    get floatingStyles() {
      return floatingStyles;
    },
    plugins,
    pipe(...nextPlugins) {
      plugins.push(...nextPlugins);
      if (connected) {
        connectPlugins();
      }
      return controller;
    },
    setReference,
    setPositionReference(reference) {
      elements.reference = reference;
      attachPositioning();
    },
    setFloating(floating) {
      elements.floating = floating;
      attachPositioning();
      connectPlugins();
    },
    connect() {
      if (destroyed || connected) return;
      connected = true;
      attachPositioning();
      connectPlugins();
    },
    disconnect() {
      if (!connected) return;
      connected = false;
      cleanupMounted();
      cleanupPlugins();
    },
    refresh() {
      if (destroyed) return;
      const options = resolveOptions(optionsSource);
      if (options.open === false) {
        position = {...position, isPositioned: false};
      }
      plugins.forEach((plugin) => plugin.update?.(context));
      void update();
    },
    update,
    destroy() {
      controller.disconnect();
      destroyed = true;
      requestId++;
      elements.reference = null;
      elements.domReference = null;
      elements.floating = null;
    },
  };

  return controller;
}
