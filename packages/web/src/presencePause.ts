/** Interaction reasons a presence stack can pause on from a host element. */
export type PresencePauseKind = 'pointer' | 'focus';

export interface PresencePauseController {
  pause(reason?: string): void;
  resume(reason?: string): void;
}

export interface BindPresenceStackPauseOptions {
  kinds: Iterable<PresencePauseKind>;
  /** Delay before `resume('pointer')` after `pointerleave`. Defaults to 100. */
  resumeDelay?: number | undefined;
}

const PAUSE_KINDS = new Set<PresencePauseKind>(['pointer', 'focus']);

/** Parses `pause-on="pointer focus"` or an array of the same tokens. */
export function parsePresencePauseOn(
  value: string | readonly string[] | undefined | null,
): Set<PresencePauseKind> {
  const tokens =
    typeof value === 'string'
      ? value.trim().split(/\s+/).filter(Boolean)
      : (value ?? []);
  const kinds = new Set<PresencePauseKind>();
  for (const token of tokens) {
    if (PAUSE_KINDS.has(token as PresencePauseKind)) {
      kinds.add(token as PresencePauseKind);
    }
  }
  return kinds;
}

/**
 * Binds opt-in pointer/focus pause policy to an application-owned host.
 * Does not style the element.
 */
export function bindPresenceStackPause(
  element: HTMLElement,
  controller: PresencePauseController,
  options: BindPresenceStackPauseOptions,
): () => void {
  const kinds = new Set(options.kinds);
  const resumeDelay = Math.max(0, options.resumeDelay ?? 100);
  let resumeTimer = -1;
  const abort = new AbortController();
  const {signal} = abort;

  const cancelResume = () => {
    window.clearTimeout(resumeTimer);
    resumeTimer = -1;
  };

  if (kinds.has('pointer')) {
    element.addEventListener(
      'pointerenter',
      () => {
        cancelResume();
        controller.pause('pointer');
      },
      {signal},
    );
    element.addEventListener(
      'pointerleave',
      () => {
        cancelResume();
        resumeTimer = window.setTimeout(() => {
          resumeTimer = -1;
          controller.resume('pointer');
        }, resumeDelay);
      },
      {signal},
    );
  }

  if (kinds.has('focus')) {
    element.addEventListener(
      'focusin',
      () => {
        controller.pause('focus');
      },
      {signal},
    );
    element.addEventListener(
      'focusout',
      () => {
        queueMicrotask(() => {
          if (signal.aborted) return;
          if (!element.contains(element.ownerDocument.activeElement)) {
            controller.resume('focus');
          }
        });
      },
      {signal},
    );
  }

  return () => {
    cancelResume();
    abort.abort();
  };
}
