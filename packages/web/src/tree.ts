import type {FloatingController, OpenChangeReason} from './types';
import {createId} from './utils/common';

export type FloatingTreeController = Pick<FloatingController, 'context'>;

export interface FloatingNode {
  id: string;
  parentId: string | null;
  controller: FloatingTreeController;
}

export class FloatingTree {
  #nodes = new Map<string, FloatingNode>();
  #listeners = new Set<() => void>();

  get nodes(): readonly FloatingNode[] {
    return [...this.#nodes.values()];
  }

  register(
    controller: FloatingTreeController,
    options: {id?: string; parentId?: string | null} = {},
  ) {
    const node: FloatingNode = {
      id: options.id || createId('floating-node'),
      parentId: options.parentId ?? null,
      controller,
    };
    this.#nodes.set(node.id, node);
    this.#emit();
    return {
      node,
      unregister: () => {
        this.#nodes.delete(node.id);
        this.#emit();
      },
    };
  }

  children(parentId: string) {
    return this.nodes.filter((node) => node.parentId === parentId);
  }

  closeDescendants(
    parentId: string,
    event?: Event,
    reason: OpenChangeReason = 'focus-out',
  ) {
    for (const child of this.children(parentId)) {
      child.controller.context.onOpenChange(false, event, reason);
      this.closeDescendants(child.id, event, reason);
    }
  }

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    this.#listeners.forEach((listener) => listener());
  }
}

export const FLOATING_CONTEXT_REQUEST = 'floating-ui-context-request';

export class FloatingContextRequestEvent<T> extends Event {
  value: T | undefined;

  constructor(
    readonly key: string,
    readonly callback?: (value: T) => void,
  ) {
    super(FLOATING_CONTEXT_REQUEST, {bubbles: true, composed: true});
  }

  provide(value: T) {
    if (this.value !== undefined) return;
    this.value = value;
    this.callback?.(value);
    this.stopPropagation();
  }
}

export function requestFloatingContext<T>(target: EventTarget, key: string) {
  const event = new FloatingContextRequestEvent<T>(key);
  target.dispatchEvent(event);
  return event.value;
}

export function provideFloatingContext<T>(
  target: EventTarget,
  key: string,
  getValue: () => T,
) {
  const listener = (event: Event) => {
    const request = event as FloatingContextRequestEvent<T>;
    if (request.key === key) request.provide(getValue());
  };
  target.addEventListener(FLOATING_CONTEXT_REQUEST, listener);
  return () => target.removeEventListener(FLOATING_CONTEXT_REQUEST, listener);
}
