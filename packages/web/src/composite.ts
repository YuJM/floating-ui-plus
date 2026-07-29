export type CompositeOrientation = 'horizontal' | 'vertical' | 'both';

export interface CompositeOptions {
  orientation?: CompositeOrientation | undefined;
  loop?: boolean | undefined;
  cols?: number | undefined;
  rtl?: boolean | undefined;
}

export class CompositeController {
  #items: HTMLElement[] = [];
  #activeIndex = 0;

  constructor(readonly options: CompositeOptions = {}) {}

  get activeIndex() {
    return this.#activeIndex;
  }

  setItems(items: Iterable<HTMLElement>) {
    this.#items = [...items];
    this.#syncTabIndex();
  }

  setActiveIndex(index: number, focus = false) {
    if (!this.#items.length) return;
    this.#activeIndex = Math.max(0, Math.min(index, this.#items.length - 1));
    this.#syncTabIndex();
    if (focus) this.#items[this.#activeIndex]?.focus();
  }

  keydown(event: KeyboardEvent) {
    if (event.key === 'Home' || event.key === 'End') {
      const indices =
        event.key === 'Home'
          ? this.#items.keys()
          : Array.from(this.#items.keys()).reverse();
      for (const index of indices) {
        if (!this.#isDisabled(index)) {
          event.preventDefault();
          this.setActiveIndex(index, true);
          return;
        }
      }
      return;
    }

    const cols = this.options.cols || 1;
    const rtl = this.options.rtl === true;
    const deltas: Record<string, number> = {
      ArrowDown: cols,
      ArrowUp: -cols,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    };
    const delta = deltas[event.key];
    if (delta == null) return;
    const orientation = this.options.orientation || 'both';
    if (
      (orientation === 'vertical' &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) ||
      (orientation === 'horizontal' &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown'))
    ) {
      return;
    }
    let nextIndex = this.#activeIndex;
    for (let attempts = 0; attempts < this.#items.length; attempts++) {
      nextIndex += delta;
      if (this.options.loop) {
        nextIndex =
          (nextIndex + this.#items.length) % this.#items.length;
      } else if (nextIndex < 0 || nextIndex >= this.#items.length) {
        return;
      }
      if (!this.#isDisabled(nextIndex)) break;
    }
    if (
      nextIndex === this.#activeIndex ||
      this.#isDisabled(nextIndex)
    ) {
      return;
    }
    event.preventDefault();
    this.setActiveIndex(nextIndex, true);
  }

  #isDisabled(index: number) {
    const item = this.#items[index];
    return (
      item == null ||
      item.hasAttribute('disabled') ||
      item.getAttribute('aria-disabled') === 'true'
    );
  }

  #syncTabIndex() {
    this.#items.forEach((item, index) => {
      item.tabIndex = index === this.#activeIndex ? 0 : -1;
    });
  }
}
