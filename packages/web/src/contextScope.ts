import {
  FLOATING_CONTEXT_SCOPE,
} from './constants';
import {
  FLOATING_CONTEXT_REQUEST,
  type FloatingContextRequestEvent,
  requestFloatingContext,
} from './tree';

export type FloatingContextProvider<T = unknown> = () => T;

export class FloatingContextScope {
  #parent: FloatingContextScope | null;
  #providers = new Map<string, FloatingContextProvider>();
  #attachments = new Map<EventTarget, () => void>();
  #destroyed = false;

  constructor(parent: FloatingContextScope | null = null) {
    this.#parent = parent;
  }

  get parent() {
    return this.#parent;
  }

  setParent(parent: FloatingContextScope | null) {
    if (parent === this) {
      throw new Error('A floating context scope cannot parent itself.');
    }
    this.#parent = parent;
  }

  provide<T>(key: string, value: T | FloatingContextProvider<T>) {
    const provider =
      typeof value === 'function'
        ? (value as FloatingContextProvider<T>)
        : () => value;
    this.#providers.set(key, provider);
    return () => {
      if (this.#providers.get(key) === provider) {
        this.#providers.delete(key);
      }
    };
  }

  consume<T>(key: string): T | undefined {
    const provider = this.#providers.get(key);
    if (provider) {
      const value = provider() as T | undefined;
      if (value !== undefined) return value;
    }
    return this.#parent?.consume<T>(key);
  }

  attach(target: EventTarget) {
    this.detach(target);
    if (this.#destroyed) return () => {};

    const listener = (event: Event) => {
      const request = event as FloatingContextRequestEvent<unknown>;
      if (request.key === FLOATING_CONTEXT_SCOPE) {
        request.provide(this);
        return;
      }
      const value = this.consume(request.key);
      if (value !== undefined) request.provide(value);
    };
    target.addEventListener(FLOATING_CONTEXT_REQUEST, listener);
    const cleanup = () => {
      target.removeEventListener(FLOATING_CONTEXT_REQUEST, listener);
      if (this.#attachments.get(target) === cleanup) {
        this.#attachments.delete(target);
      }
    };
    this.#attachments.set(target, cleanup);
    return cleanup;
  }

  detach(target: EventTarget) {
    this.#attachments.get(target)?.();
  }

  fork() {
    return new FloatingContextScope(this);
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    [...this.#attachments.values()].forEach((cleanup) => cleanup());
    this.#providers.clear();
    this.#parent = null;
  }
}

export function createFloatingContextScope(
  parent: FloatingContextScope | null = null,
) {
  return new FloatingContextScope(parent);
}

export function requestFloatingContextScope(target: EventTarget) {
  return requestFloatingContext<FloatingContextScope>(
    target,
    FLOATING_CONTEXT_SCOPE,
  );
}
