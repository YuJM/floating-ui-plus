import {isElement} from '@floating-ui/utils/dom';
import type {Rect, Side} from '@floating-ui/dom';

import type {HandleClose} from './hover';
import {contains, getTarget} from '../utils/common';

type Point = [number, number];

function isPointInPolygon(point: Point, polygon: Point[]) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i] || [0, 0];
    const [xj, yj] = polygon[j] || [0, 0];
    if (yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

function isInside([x, y]: Point, rect: Rect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

export interface SafePolygonOptions {
  buffer?: number | undefined;
  blockPointerEvents?: boolean | undefined;
  requireIntent?: boolean | undefined;
}

/**
 * Keeps a hover interaction open while the pointer travels through the polygon
 * between the reference and floating elements.
 */
export function safePolygon(options: SafePolygonOptions = {}): HandleClose {
  const {
    buffer = 0.5,
    blockPointerEvents = false,
    requireIntent = true,
  } = options;
  let landed = false;
  let lastPoint: Point | null = null;
  let lastTime = 0;
  let closeTimer = -1;

  const handleClose: HandleClose = ({x, y, elements, onClose, position}) => {
    return (event) => {
      window.clearTimeout(closeTimer);
      const reference = elements.domReference;
      const floating = elements.floating;
      if (!reference || !floating || x == null || y == null) return;

      const target = getTarget(event) as Element | null;
      const overFloating = contains(floating, target);
      const overReference = contains(reference, target);
      const leaving = event.type === 'mouseleave';

      if (overFloating) {
        landed = true;
        if (!leaving) return;
      }
      if (overReference && !leaving) {
        landed = true;
        return;
      }
      if (
        leaving &&
        isElement(event.relatedTarget) &&
        contains(floating, event.relatedTarget)
      ) {
        return;
      }

      const refRect = reference.getBoundingClientRect();
      const floatingRect = floating.getBoundingClientRect();
      const point: Point = [event.clientX, event.clientY];
      const side = position.placement.split('-')[0] as Side;

      if (
        (side === 'top' && y >= refRect.bottom - 1) ||
        (side === 'bottom' && y <= refRect.top + 1) ||
        (side === 'left' && x >= refRect.right - 1) ||
        (side === 'right' && x <= refRect.left + 1)
      ) {
        onClose();
        return;
      }

      const horizontal =
        side === 'top' || side === 'bottom'
          ? [
              Math.min(refRect.left, floatingRect.left),
              Math.max(refRect.right, floatingRect.right),
            ]
          : [0, 0];
      const vertical =
        side === 'left' || side === 'right'
          ? [
              Math.min(refRect.top, floatingRect.top),
              Math.max(refRect.bottom, floatingRect.bottom),
            ]
          : [0, 0];
      const trough: Point[] =
        side === 'top' || side === 'bottom'
          ? [
              [horizontal[0], Math.min(refRect.top, floatingRect.top)],
              [horizontal[1], Math.min(refRect.top, floatingRect.top)],
              [horizontal[1], Math.max(refRect.bottom, floatingRect.bottom)],
              [horizontal[0], Math.max(refRect.bottom, floatingRect.bottom)],
            ]
          : [
              [Math.min(refRect.left, floatingRect.left), vertical[0]],
              [Math.max(refRect.right, floatingRect.right), vertical[0]],
              [Math.max(refRect.right, floatingRect.right), vertical[1]],
              [Math.min(refRect.left, floatingRect.left), vertical[1]],
            ];

      if (isPointInPolygon(point, trough)) return;
      if (landed && !isInside(point, refRect)) {
        onClose();
        return;
      }

      if (requireIntent) {
        const now = performance.now();
        if (lastPoint && now !== lastTime) {
          const distance = Math.hypot(
            point[0] - lastPoint[0],
            point[1] - lastPoint[1],
          );
          if (distance / (now - lastTime) < 0.1) {
            onClose();
            return;
          }
        }
        lastPoint = point;
        lastTime = now;
      }

      const edge: [Point, Point] =
        side === 'top'
          ? [
              [floatingRect.left - buffer, floatingRect.bottom + buffer],
              [floatingRect.right + buffer, floatingRect.bottom + buffer],
            ]
          : side === 'bottom'
            ? [
                [floatingRect.left - buffer, floatingRect.top - buffer],
                [floatingRect.right + buffer, floatingRect.top - buffer],
              ]
            : side === 'left'
              ? [
                  [floatingRect.right + buffer, floatingRect.top - buffer],
                  [floatingRect.right + buffer, floatingRect.bottom + buffer],
                ]
              : [
                  [floatingRect.left - buffer, floatingRect.top - buffer],
                  [floatingRect.left - buffer, floatingRect.bottom + buffer],
                ];

      if (!isPointInPolygon(point, [[x, y], ...edge])) {
        onClose();
      } else if (!landed && requireIntent) {
        closeTimer = window.setTimeout(onClose, 40);
      }
    };
  };

  handleClose.__options = {blockPointerEvents};
  return handleClose;
}
