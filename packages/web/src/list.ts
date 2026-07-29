import {createId} from './utils/common';

export interface FloatingListItem<T = unknown> {
  id: string;
  element: HTMLElement | null;
  label: string | null;
  value: T;
  index: number;
}

export interface FloatingListItemOptions<T> {
  id?: string | undefined;
  element?: HTMLElement | null | undefined;
  label?: string | null | undefined;
  value: T;
}

export class FloatingList<T = unknown> {
  #items = new Map<string, FloatingListItem<T>>();
  #listeners = new Set<() => void>();

  get items(): readonly FloatingListItem<T>[] {
    return [...this.#items.values()]
      .sort((a, b) => {
        if (a.element && b.element) {
          const position = a.element.compareDocumentPosition(b.element);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        }
        return a.index - b.index;
      })
      .map((item, index) => ({...item, index}));
  }

  register(options: FloatingListItemOptions<T>) {
    const id = options.id || createId('floating-list-item');
    this.#items.set(id, {
      id,
      element: options.element || null,
      label: options.label ?? null,
      value: options.value,
      index: this.#items.size,
    });
    this.#emit();
    return () => {
      this.#items.delete(id);
      this.#emit();
    };
  }

  update(id: string, update: Partial<FloatingListItemOptions<T>>) {
    const item = this.#items.get(id);
    if (!item) return;
    Object.assign(item, update);
    this.#emit();
  }

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    this.#listeners.forEach((listener) => listener());
  }
}
