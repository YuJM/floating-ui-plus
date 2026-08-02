import type {Middleware, MiddlewareState, Placement} from '@floating-ui/dom';

export const FLOATING_TRANSFORM_ORIGIN_VARIABLE =
  '--floating-transform-origin' as const;

export interface TransformOriginOptions {
  /**
   * Keeps the cross-axis origin away from the floating element's corners.
   * Useful when the surface has a large border radius.
   *
   * @default 0
   */
  padding?: number | undefined;
  /**
   * CSS custom property written to the floating element.
   *
   * @default '--floating-transform-origin'
   */
  cssVariable?: `--${string}` | undefined;
}

export interface TransformOriginData {
  x: number;
  y: number;
  value: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSide(placement: Placement) {
  return placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left';
}

function formatPixel(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return `${Object.is(rounded, -0) ? 0 : rounded}px`;
}

export function getFloatingTransformOrigin(
  state: Pick<MiddlewareState, 'x' | 'y' | 'placement' | 'rects'>,
  padding = 0,
): TransformOriginData {
  const side = getSide(state.placement);
  const floatingWidth = state.rects.floating.width;
  const floatingHeight = state.rects.floating.height;
  const horizontalPadding = Math.min(
    Math.max(0, padding),
    floatingWidth / 2,
  );
  const verticalPadding = Math.min(
    Math.max(0, padding),
    floatingHeight / 2,
  );
  const referenceCenterX =
    state.rects.reference.x + state.rects.reference.width / 2;
  const referenceCenterY =
    state.rects.reference.y + state.rects.reference.height / 2;

  const x =
    side === 'left'
      ? floatingWidth
      : side === 'right'
        ? 0
        : clamp(
            referenceCenterX - state.x,
            horizontalPadding,
            floatingWidth - horizontalPadding,
          );
  const y =
    side === 'top'
      ? floatingHeight
      : side === 'bottom'
        ? 0
        : clamp(
            referenceCenterY - state.y,
            verticalPadding,
            floatingHeight - verticalPadding,
          );
  const value = `${formatPixel(x)} ${formatPixel(y)}`;

  return {x, y, value};
}

/**
 * Writes an origin that points from the floating surface toward the current
 * reference. Place it after placement-changing middleware such as `flip()`,
 * `shift()`, and `size()` so the CSS value reflects the final coordinates.
 *
 * ```ts
 * middleware: [offset(8), flip(), shift(), transformOrigin({padding: 8})]
 * ```
 *
 * ```css
 * .floating-panel {
 *   transform-origin: var(--floating-transform-origin);
 * }
 * ```
 */
export function transformOrigin(
  options: TransformOriginOptions = {},
): Middleware {
  const cssVariable =
    options.cssVariable ?? FLOATING_TRANSFORM_ORIGIN_VARIABLE;

  return {
    name: 'transformOrigin',
    options,
    fn(state) {
      const data = getFloatingTransformOrigin(state, options.padding);
      state.elements.floating.style.setProperty(cssVariable, data.value);
      return {data};
    },
  };
}
