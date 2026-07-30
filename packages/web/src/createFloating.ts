import {computePosition} from '@floating-ui/dom';
import {isElement} from '@floating-ui/utils/dom';

import {withArrowOffset} from './arrow';
import {createFloatingEvents} from './events';
import {FloatingCoordinator} from './coordinator';
import {role} from './interactions/role';
import type {
  FloatingAttributes,
  FloatingContext,
  FloatingController,
  FloatingData,
  FloatingElements,
  FloatingOptions,
  FloatingOptionsSource,
  FloatingPresence,
  FloatingPresenceState,
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
  // Every floating surface gets a baseline reference/content relationship.
  // A later role() replaces this dialog contract; role({enabled: false}) opts
  // out for a purely presentational surface.
  const plugins: FloatingPlugin[] = [role()];
  const pluginCleanups: Array<() => void> = [];
  let mountedCleanup: (() => void) | undefined;
  let connected = false;
  let destroyed = false;
  let requestId = 0;
  let attachRequestId = 0;
  let position = createInitialPosition(resolveOptions(optionsSource));
  let floatingStyles = getFloatingStyles(
    position,
    null,
    resolveOptions(optionsSource).transform !== false,
  );
  let presenceState: FloatingPresenceState = 'unmounted';
  const positionedResolvers = new Set<(position: FloatingPosition) => void>();

  function resolvePositioned() {
    if (presenceState !== 'mounted' || !position.isPositioned) return;
    positionedResolvers.forEach((resolve) => resolve(position));
    positionedResolvers.clear();
  }

  const presence: FloatingPresence = {
    get state() {
      return presenceState;
    },
    set(state) {
      presenceState = state;
      resolvePositioned();
    },
  };

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
  let coordinator: FloatingCoordinator;

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

  function attachPositioning(deferIfDetached = true) {
    const currentAttachRequest = ++attachRequestId;
    cleanupMounted();
    const reference = elements.reference;
    const floating = elements.floating;
    if (!connected || !reference || !floating) return;

    const contextElement = isElement(reference)
      ? reference
      : reference.contextElement;
    if (
      !floating.isConnected ||
      (contextElement && !contextElement.isConnected)
    ) {
      if (deferIfDetached) {
        // Framework directives can bind elements while their template is still
        // detached. Wait until the commit completes so autoUpdate discovers
        // the real overflow ancestors instead of subscribing only to window.
        setTimeout(() => {
          if (currentAttachRequest === attachRequestId) {
            attachPositioning(false);
          }
        }, 0);
      }
      return;
    }

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
      middleware: withArrowOffset(options.middleware, context.data.arrow),
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
    resolvePositioned();
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
    get contextScope() {
      return coordinator.scope;
    },
    elements,
    get position() {
      return position;
    },
    get floatingStyles() {
      return floatingStyles;
    },
    presence,
    get list() {
      return coordinator.list;
    },
    plugins,
    pipe(...nextPlugins) {
      plugins.push(...nextPlugins);
      if (connected) {
        connectPlugins();
      }
      return controller;
    },
    node(options) {
      coordinator.node(options);
      return controller;
    },
    withList(list) {
      coordinator.withList(list);
      return controller;
    },
    delayGroup(options) {
      coordinator.delayGroup(options);
      return controller;
    },
    setContextParent(scope) {
      coordinator.setParentScope(scope);
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
      coordinator.connect();
      attachPositioning();
      connectPlugins();
    },
    disconnect() {
      if (!connected) return;
      connected = false;
      attachRequestId++;
      cleanupMounted();
      cleanupPlugins();
      coordinator.disconnect();
    },
    refresh() {
      if (destroyed) return;
      const options = resolveOptions(optionsSource);
      if (options.open === false) {
        position = {...position, isPositioned: false};
      }
      plugins.forEach((plugin) => plugin.update?.(context));
      coordinator.refresh();
      void update();
    },
    update,
    whenPositioned() {
      if (presenceState === 'mounted' && position.isPositioned) {
        return Promise.resolve(position);
      }
      return new Promise((resolve) => positionedResolvers.add(resolve));
    },
    destroy() {
      controller.disconnect();
      destroyed = true;
      requestId++;
      presence.set('unmounted');
      positionedResolvers.clear();
      elements.reference = null;
      elements.domReference = null;
      elements.floating = null;
      coordinator.destroy();
    },
  };
  coordinator = new FloatingCoordinator(controller);

  return controller;
}
