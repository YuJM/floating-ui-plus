import type {FloatingEvents} from './types';

export function createFloatingEvents(): FloatingEvents {
  const listeners = new Map<string, Set<(value: unknown) => void>>();

  return {
    emit(event, value) {
      listeners.get(event)?.forEach((listener) => listener(value));
    },
    on(event, listener) {
      let eventListeners = listeners.get(event);
      if (!eventListeners) {
        eventListeners = new Set();
        listeners.set(event, eventListeners);
      }
      eventListeners.add(listener as (value: unknown) => void);
      return () => {
        eventListeners?.delete(listener as (value: unknown) => void);
      };
    },
  } as FloatingEvents;
}

export function addListener<K extends keyof GlobalEventHandlersEventMap>(
  target: EventTarget | null | undefined,
  type: K,
  listener: (event: GlobalEventHandlersEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function addListener(
  target: EventTarget | null | undefined,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function addListener(
  target: EventTarget | null | undefined,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
) {
  if (!target) {
    return () => {};
  }

  target.addEventListener(type, listener, options);
  return () => {
    target.removeEventListener(type, listener, options);
  };
}

export function cleanupAll(cleanups: Array<() => void>) {
  return () => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
  };
}
