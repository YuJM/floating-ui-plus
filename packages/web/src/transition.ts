import type {Placement} from '@floating-ui/dom';

export type TransitionStatus = 'unmounted' | 'initial' | 'open' | 'close';

export interface TransitionStyles {
  duration?: number | Partial<{open: number; close: number}> | undefined;
  initial?: Partial<CSSStyleDeclaration> | undefined;
  open?: Partial<CSSStyleDeclaration> | undefined;
  close?: Partial<CSSStyleDeclaration> | undefined;
  common?:
    | Partial<CSSStyleDeclaration>
    | ((placement: Placement) => Partial<CSSStyleDeclaration>)
    | undefined;
}

export class FloatingTransition {
  #status: TransitionStatus = 'unmounted';
  #mounted = false;
  #timer = -1;
  #listeners = new Set<() => void>();

  constructor(
    readonly placement: () => Placement,
    readonly options: TransitionStyles = {},
  ) {}

  get status() {
    return this.#status;
  }

  get isMounted() {
    return this.#mounted;
  }

  get styles() {
    const common =
      typeof this.options.common === 'function'
        ? this.options.common(this.placement())
        : this.options.common;
    const statusStyles =
      this.#status === 'initial'
        ? this.options.initial
        : this.#status === 'open'
          ? this.options.open
          : this.#status === 'close'
            ? this.options.close
            : undefined;
    return {...common, ...statusStyles};
  }

  setOpen(open: boolean) {
    window.clearTimeout(this.#timer);
    if (open) {
      this.#mounted = true;
      this.#status = 'initial';
      this.#emit();
      requestAnimationFrame(() => {
        this.#status = 'open';
        this.#emit();
      });
      return;
    }
    if (!this.#mounted) return;
    this.#status = 'close';
    this.#emit();
    const duration =
      typeof this.options.duration === 'number'
        ? this.options.duration
        : this.options.duration?.close || 0;
    this.#timer = window.setTimeout(() => {
      this.#mounted = false;
      this.#status = 'unmounted';
      this.#emit();
    }, duration);
  }

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  destroy() {
    window.clearTimeout(this.#timer);
    this.#listeners.clear();
  }

  #emit() {
    this.#listeners.forEach((listener) => listener());
  }
}
