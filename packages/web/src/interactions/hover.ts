import {addListener, cleanupAll} from '../events';
import type {
  Delay,
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

export interface HandleCloseContext extends FloatingContext {
  onClose(): void;
  x: number | null;
  y: number | null;
  leave?: boolean | undefined;
}

export interface HandleClose {
  (context: HandleCloseContext): (event: MouseEvent) => void;
  __options?: {blockPointerEvents?: boolean | undefined} | undefined;
}

export interface HoverOptions {
  enabled?: boolean | undefined;
  handleClose?: HandleClose | null | undefined;
  restMs?: number | (() => number) | undefined;
  delay?: Delay | (() => Delay) | undefined;
  mouseOnly?: boolean | undefined;
  move?: boolean | undefined;
}

export function getDelay(
  value: HoverOptions['delay'],
  key: 'open' | 'close',
  pointerType?: string,
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) return 0;
  const resolved = typeof value === 'function' ? value() : value;
  return typeof resolved === 'number' ? resolved : resolved?.[key] ?? 0;
}

export function hover(
  options: ValueOrGetter<HoverOptions> = {},
): FloatingPlugin {
  let pointerType: string | undefined;
  let openTimeout = -1;
  let closeTimeout = -1;
  let restTimeout = -1;
  let documentMoveCleanup = () => {};
  let leavePoint: {x: number; y: number} | null = null;

  return {
    name: 'hover',
    connect(context) {
      const reference = context.elements.domReference;
      const floating = context.elements.floating;
      if (!reference) return;
      const ownerDocument = reference.ownerDocument;
      const win = ownerDocument.defaultView || window;

      const getOptions = () => ({
        enabled: true,
        handleClose: null,
        restMs: 0,
        delay: 0,
        mouseOnly: false,
        move: true,
        ...getValue(options),
      });
      const clear = () => {
        win.clearTimeout(openTimeout);
        win.clearTimeout(closeTimeout);
        win.clearTimeout(restTimeout);
      };
      const close = (event: Event, reason: 'hover' | 'safe-polygon') => {
        clear();
        documentMoveCleanup();
        context.onOpenChange(false, event, reason);
      };
      const open = (event: Event) => {
        clear();
        documentMoveCleanup();
        context.onOpenChange(true, event, 'hover');
      };

      function scheduleOpen(event: MouseEvent) {
        const current = getOptions();
        if (!current.enabled || event.defaultPrevented) return;
        if (
          current.mouseOnly &&
          pointerType &&
          !isMouseLikePointerType(pointerType)
        ) {
          return;
        }
        const delay = getDelay(current.delay, 'open', pointerType);
        const rest =
          typeof current.restMs === 'function'
            ? current.restMs()
            : current.restMs;
        if ((rest || 0) > 0 && event.type === 'mousemove') {
          win.clearTimeout(restTimeout);
          restTimeout = win.setTimeout(() => open(event), rest);
        } else if (delay > 0) {
          openTimeout = win.setTimeout(() => open(event), delay);
        } else {
          open(event);
        }
      }

      function scheduleClose(event: MouseEvent) {
        const current = getOptions();
        if (!current.enabled || event.defaultPrevented) return;
        win.clearTimeout(openTimeout);
        win.clearTimeout(restTimeout);
        if (current.handleClose && context.open) {
          leavePoint = {x: event.clientX, y: event.clientY};
          const handler = current.handleClose({
            ...context,
            x: leavePoint.x,
            y: leavePoint.y,
            onClose: () => close(event, 'safe-polygon'),
            leave: true,
          });
          documentMoveCleanup();
          documentMoveCleanup = addListener(
            ownerDocument,
            'mousemove',
            handler,
          );
          return;
        }
        const delay = getDelay(current.delay, 'close', pointerType);
        if (delay > 0) {
          closeTimeout = win.setTimeout(() => close(event, 'hover'), delay);
        } else {
          close(event, 'hover');
        }
      }

      const cleanups = [
        context.events.on('openchange', ({open}) => {
          if (!open) clear();
        }),
        addListener(reference, 'pointerdown', (event) => {
          pointerType = event.pointerType;
          context.data.pointerType = pointerType;
        }),
        addListener(reference, 'mouseenter', scheduleOpen),
        addListener(reference, 'mousemove', (event) => {
          if (getOptions().move && !context.open) scheduleOpen(event);
        }),
        addListener(reference, 'mouseleave', scheduleClose),
      ];

      if (floating) {
        cleanups.push(
          addListener(floating, 'mouseenter', (event) => {
            if (!getOptions().enabled) return;
            clear();
            documentMoveCleanup();
            if (
              getOptions().move &&
              !context.open &&
              contains(floating, getTarget(event) as Element)
            ) {
              scheduleOpen(event);
            }
          }),
          addListener(floating, 'mouseleave', scheduleClose),
        );
      }

      return () => {
        clear();
        documentMoveCleanup();
        cleanupAll(cleanups)();
      };
    },
  };
}
