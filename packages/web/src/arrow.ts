import {
  offset,
  type Middleware,
  type MiddlewareData,
  type OffsetOptions,
  type Placement,
} from '@floating-ui/dom';

import {FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE} from './constants';
import type {FloatingArrowSlot, FloatingContext} from './types';

export interface ArrowOptions {
  element: HTMLElement;
  /** Unrotated main-axis depth used by Arrow-aware offset composition. */
  height?: number | undefined;
  staticOffset?: string | number | null | undefined;
  /** Rotate the default upward-pointing arrow toward the reference element. */
  rotate?: boolean | undefined;
}

export interface ArrowStyles {
  position: 'absolute';
  left?: string;
  top?: string;
  right?: string;
  bottom?: string;
  transform?: string;
}

type MiddlewareEntry = Middleware | null | undefined | false;
type ArrowOffsetValue =
  | number
  | {
      mainAxis?: number | undefined;
      crossAxis?: number | undefined;
      alignmentAxis?: number | null | undefined;
    };

function parseSize(value: string | null) {
  if (value == null || value.trim() === '') return undefined;
  const size = Number.parseFloat(value);
  return Number.isFinite(size) && size >= 0 ? size : undefined;
}

function toCssLength(value: string | number) {
  if (typeof value === 'number') return `${value}px`;
  const numericValue = Number(value);
  return value.trim() !== '' && Number.isFinite(numericValue)
    ? `${numericValue}px`
    : value;
}

/**
 * Returns the depth occupied by an Arrow on the placement's main axis.
 *
 * Plus Arrow components publish their unrotated height explicitly. Custom
 * renderers can use `data-fup-arrow-height`; measured layout is the fallback.
 */
export function getArrowMainAxisSize(
  element: Element,
  placement: Placement,
) {
  const explicitSize = parseSize(
    element.getAttribute(FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE),
  );
  if (explicitSize != null) return explicitSize;

  const heightAttribute = parseSize(element.getAttribute('height'));
  if (heightAttribute != null) return heightAttribute;

  const elementHeight = (element as Element & {height?: unknown}).height;
  if (typeof elementHeight === 'number' && Number.isFinite(elementHeight)) {
    return Math.max(0, elementHeight);
  }

  const rect = element.getBoundingClientRect();
  const side = placement.split('-')[0];
  return side === 'top' || side === 'bottom' ? rect.height : rect.width;
}

function addMainAxisOffset(value: ArrowOffsetValue, size: number) {
  if (typeof value === 'number') return value + size;
  return {
    ...value,
    mainAxis: (value.mainAxis ?? 0) + size,
  };
}

export function registerFloatingArrow(
  context: FloatingContext,
  options: FloatingArrowSlot,
) {
  const height = Number.isFinite(options.height)
    ? Math.max(0, options.height)
    : 0;
  const registration = {
    element: options.element,
    height,
  };
  context.data.arrow = registration;
  void context.update();

  return () => {
    if (context.data.arrow !== registration) return;
    delete context.data.arrow;
    void context.update();
  };
}

/**
 * Adds the owned Arrow's height to the first `offset()` middleware.
 *
 * This preserves upstream `offset()` and `arrow()` semantics. The composition
 * is active only for an Arrow slot registered with the current context.
 */
export function withArrowOffset(
  middleware: MiddlewareEntry[] | undefined,
  arrowSlot: FloatingArrowSlot | undefined,
): MiddlewareEntry[] | undefined {
  const hasArrowMiddleware = middleware?.some(
    (entry) => entry && entry.name === 'arrow',
  );
  if (!hasArrowMiddleware || !arrowSlot) return middleware;

  const nextMiddleware = [...(middleware ?? [])];
  const offsetIndex = nextMiddleware.findIndex(
    (entry) => entry && entry.name === 'offset',
  );
  const originalOffset =
    offsetIndex >= 0
      ? (nextMiddleware[offsetIndex] as Middleware).options as
          | OffsetOptions
          | undefined
      : 0;
  const arrowAwareOffset = offset((state) => {
    const value =
      typeof originalOffset === 'function'
        ? originalOffset(state)
        : (originalOffset ?? 0);
    return addMainAxisOffset(
      value as ArrowOffsetValue,
      arrowSlot.height,
    );
  });

  if (offsetIndex >= 0) {
    nextMiddleware[offsetIndex] = arrowAwareOffset;
  } else {
    nextMiddleware.unshift(arrowAwareOffset);
  }
  return nextMiddleware;
}

export function getArrowTransform(placement: Placement) {
  const side = placement.split('-')[0];
  return side === 'top'
    ? 'rotate(180deg)'
    : side === 'left'
      ? 'rotate(90deg)'
      : side === 'right'
        ? 'rotate(-90deg)'
        : 'rotate(0deg)';
}

export function getArrowStyles(
  placement: Placement,
  middlewareData: MiddlewareData,
  options: ArrowOptions,
): ArrowStyles {
  const data = middlewareData.arrow as
    | {x?: number; y?: number; centerOffset?: number}
    | undefined;
  const side = placement.split('-')[0];
  const staticSide =
    side === 'top'
      ? 'bottom'
      : side === 'right'
        ? 'left'
        : side === 'bottom'
          ? 'top'
          : 'right';
  // Reset every inset so a placement change cannot leave the previous side
  // (for example `top`) competing with the new static side (`bottom`).
  const styles: ArrowStyles = {
    position: 'absolute',
    left: '',
    top: '',
    right: '',
    bottom: '',
  };

  if ((side === 'top' || side === 'bottom') && data?.x != null) {
    styles.left = `${data.x}px`;
  }
  if ((side === 'left' || side === 'right') && data?.y != null) {
    styles.top = `${data.y}px`;
  }
  styles[staticSide] =
    options.staticOffset != null
      ? toCssLength(options.staticOffset)
      : `${-getArrowMainAxisSize(options.element, placement)}px`;
  if (options.rotate) styles.transform = getArrowTransform(placement);

  return styles;
}

export function getContextArrowStyles(
  context: FloatingContext,
  options: ArrowOptions,
) {
  return getArrowStyles(
    context.position.placement,
    context.position.middlewareData,
    options,
  );
}
