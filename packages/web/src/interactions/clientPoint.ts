import type {VirtualElement} from '@floating-ui/dom';

import {addListener, cleanupAll} from '../events';
import type {
  FloatingContext,
  FloatingPlugin,
  ValueOrGetter,
} from '../types';
import {
  contains,
  getTarget,
  getValue,
  isMouseLikePointerType,
} from '../utils/common';

export interface ClientPointOptions {
  enabled?: boolean | undefined;
  axis?: 'x' | 'y' | 'both' | undefined;
  x?: number | null | undefined;
  y?: number | null | undefined;
}

function isMouseBasedEvent(event: Event | undefined): event is MouseEvent {
  return event != null && (event as MouseEvent).clientX != null;
}

export function clientPoint(
  options: ValueOrGetter<ClientPointOptions> = {},
): FloatingPlugin {
  let pointerType: string | undefined;
  let point = {x: null as number | null, y: null as number | null};
  let virtual: VirtualElement | null = null;
  let virtualContextElement: Element | null = null;
  let windowMoveCleanup: (() => void) | null = null;
  let windowMoveFloating: HTMLElement | null = null;

  const getOptions = () => ({
    enabled: true,
    axis: 'both' as const,
    x: null,
    y: null,
    ...getValue(options),
  });

  function getVirtual(domReference: Element) {
    if (virtual && virtualContextElement === domReference) return virtual;
    virtualContextElement = domReference;
    virtual = {
      contextElement: domReference,
      getBoundingClientRect() {
        const current = getOptions();
        const rect = domReference.getBoundingClientRect();
        const useX = current.axis === 'x' || current.axis === 'both';
        const useY = current.axis === 'y' || current.axis === 'both';
        const trackedX = current.x ?? point.x;
        const trackedY = current.y ?? point.y;
        const x = useX && trackedX != null ? trackedX : rect.x;
        const y = useY && trackedY != null ? trackedY : rect.y;
        const width = current.axis === 'y' ? rect.width : 0;
        const height = current.axis === 'x' ? rect.height : 0;
        return {
          x,
          y,
          top: y,
          left: x,
          right: x + width,
          bottom: y + height,
          width,
          height,
        };
      },
    };
    return virtual;
  }

  function restoreDomReference(
    context: FloatingContext,
    domReference: Element,
  ) {
    if (
      virtual &&
      context.elements.reference === virtual &&
      context.elements.domReference === domReference
    ) {
      context.setPositionReference(domReference);
    }
  }

  function setPoint(
    context: FloatingContext,
    domReference: Element,
    x: number | null,
    y: number | null,
  ) {
    const current = getOptions();
    if (!current.enabled) return;

    // Match Floating UI's client-point contract: a tooltip opened from focus
    // or another non-mouse interaction stays anchored to its DOM reference.
    if (
      context.data.openEvent &&
      !isMouseBasedEvent(context.data.openEvent)
    ) {
      restoreDomReference(context, domReference);
      return;
    }

    point = {x, y};
    const positionReference = getVirtual(domReference);
    if (context.elements.reference !== positionReference) {
      context.setPositionReference(positionReference);
    } else {
      void context.update();
    }
  }

  function removeWindowMoveListener() {
    windowMoveCleanup?.();
    windowMoveCleanup = null;
    windowMoveFloating = null;
  }

  function syncWindowMoveListener(
    context: FloatingContext,
    domReference: Element,
  ) {
    const current = getOptions();
    const floating = context.elements.floating;
    const canTrack =
      current.enabled &&
      current.x == null &&
      current.y == null &&
      context.open &&
      floating != null &&
      isMouseLikePointerType(pointerType) &&
      (!context.data.openEvent ||
        isMouseBasedEvent(context.data.openEvent));

    if (!canTrack || !floating) {
      removeWindowMoveListener();
      if (
        context.open &&
        context.data.openEvent &&
        !isMouseBasedEvent(context.data.openEvent)
      ) {
        restoreDomReference(context, domReference);
      }
      return;
    }

    if (windowMoveCleanup && windowMoveFloating === floating) return;
    removeWindowMoveListener();

    const win = floating.ownerDocument.defaultView || window;
    const handleMouseMove = (event: MouseEvent) => {
      const target = getTarget(event);
      if (target instanceof Element && contains(floating, target)) {
        removeWindowMoveListener();
        return;
      }
      setPoint(context, domReference, event.clientX, event.clientY);
    };
    win.addEventListener('mousemove', handleMouseMove);
    windowMoveFloating = floating;
    windowMoveCleanup = () => {
      win.removeEventListener('mousemove', handleMouseMove);
    };
  }

  function sync(context: FloatingContext, domReference: Element) {
    const current = getOptions();
    if (!current.enabled) {
      removeWindowMoveListener();
      restoreDomReference(context, domReference);
      return;
    }

    if (current.x != null || current.y != null) {
      removeWindowMoveListener();
      setPoint(
        context,
        domReference,
        current.x ?? null,
        current.y ?? null,
      );
      return;
    }

    syncWindowMoveListener(context, domReference);
  }

  return {
    name: 'clientPoint',
    connect(context) {
      const reference = context.elements.domReference;
      if (!reference) return;
      const domReference = reference;

      const handlePointerType = (event: PointerEvent) => {
        pointerType = event.pointerType;
      };
      const handleReferenceMove = (event: MouseEvent) => {
        const current = getOptions();
        if (
          !current.enabled ||
          current.x != null ||
          current.y != null ||
          pointerType === 'touch'
        ) {
          return;
        }
        setPoint(context, domReference, event.clientX, event.clientY);
        syncWindowMoveListener(context, domReference);
      };

      sync(context, domReference);

      return cleanupAll([
        () => removeWindowMoveListener(),
        addListener(reference, 'pointerdown', handlePointerType),
        addListener(reference, 'pointerenter', handlePointerType),
        addListener(reference, 'mousemove', handleReferenceMove),
        addListener(reference, 'mouseenter', handleReferenceMove),
      ]);
    },
    update(context) {
      const reference = context.elements.domReference;
      if (!reference) {
        removeWindowMoveListener();
        return;
      }
      sync(context, reference);
    },
  };
}
