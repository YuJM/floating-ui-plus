import type {VirtualElement} from '@floating-ui/dom';

import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import {getValue} from '../utils/common';

export interface ClientPointOptions {
  enabled?: boolean | undefined;
  axis?: 'x' | 'y' | 'both' | undefined;
  x?: number | null | undefined;
  y?: number | null | undefined;
}

export function clientPoint(
  options: ValueOrGetter<ClientPointOptions> = {},
): FloatingPlugin {
  let pointerType: string | undefined;

  return {
    name: 'clientPoint',
    connect(context) {
      const reference = context.elements.domReference;
      if (!reference) return;
      const domReference = reference;

      function setPoint(x: number | null, y: number | null) {
        const current = {
          enabled: true,
          axis: 'both' as const,
          x: null,
          y: null,
          ...getValue(options),
        };
        if (!current.enabled) return;
        const virtual: VirtualElement = {
          contextElement: domReference,
          getBoundingClientRect() {
            const rect = domReference.getBoundingClientRect();
            const useX = current.axis === 'x' || current.axis === 'both';
            const useY = current.axis === 'y' || current.axis === 'both';
            const nextX = useX && x != null ? x : rect.x;
            const nextY = useY && y != null ? y : rect.y;
            const width = current.axis === 'y' ? rect.width : 0;
            const height = current.axis === 'x' ? rect.height : 0;
            return {
              x: nextX,
              y: nextY,
              top: nextY,
              left: nextX,
              right: nextX + width,
              bottom: nextY + height,
              width,
              height,
            };
          },
        };
        context.setPositionReference(virtual);
      }

      const current = getValue(options);
      if (current.x != null || current.y != null) {
        setPoint(current.x ?? null, current.y ?? null);
      }

      return cleanupAll([
        addListener(reference, 'pointerdown', (event) => {
          pointerType = event.pointerType;
        }),
        addListener(reference, 'mousemove', (event) => {
          if (pointerType === 'touch') return;
          setPoint(event.clientX, event.clientY);
        }),
        addListener(reference, 'mouseenter', (event) => {
          if (pointerType === 'touch') return;
          setPoint(event.clientX, event.clientY);
        }),
      ]);
    },
    update(context) {
      const current = getValue(options);
      if (current.x == null && current.y == null) return;
      const reference = context.elements.domReference;
      if (!reference) return;
      const rect = reference.getBoundingClientRect();
      const x = current.x ?? rect.x;
      const y = current.y ?? rect.y;
      context.setPositionReference({
        contextElement: reference,
        getBoundingClientRect: () => ({
          x,
          y,
          top: y,
          left: x,
          right: x,
          bottom: y,
          width: 0,
          height: 0,
        }),
      });
    },
  };
}
