import type {MiddlewareData, Placement} from '@floating-ui/dom';

import type {FloatingContext} from './types';

export interface ArrowOptions {
  element: HTMLElement;
  staticOffset?: string | number | null | undefined;
}

export interface ArrowStyles {
  position: 'absolute';
  left?: string;
  top?: string;
  right?: string;
  bottom?: string;
  transform?: string;
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
  const styles: ArrowStyles = {position: 'absolute'};

  if (data?.x != null) styles.left = `${data.x}px`;
  if (data?.y != null) styles.top = `${data.y}px`;
  styles[staticSide] =
    options.staticOffset != null
      ? typeof options.staticOffset === 'number'
        ? `${options.staticOffset}px`
        : options.staticOffset
      : `${-(options.element.offsetWidth / 2)}px`;

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
