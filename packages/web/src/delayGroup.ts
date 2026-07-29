import type {Delay} from './types';

export interface DelayGroupOptions {
  delay?: Delay | undefined;
  timeoutMs?: number | undefined;
}

export class DelayGroup {
  #currentId: string | null = null;
  #instantPhase = false;
  #timeout = -1;
  #listeners = new Set<() => void>();

  constructor(public options: DelayGroupOptions = {}) {}

  get currentId() {
    return this.#currentId;
  }

  get isInstantPhase() {
    return this.#instantPhase;
  }

  open(id: string) {
    window.clearTimeout(this.#timeout);
    this.#instantPhase = this.#currentId !== null && this.#currentId !== id;
    this.#currentId = id;
    this.#emit();
  }

  close(id: string) {
    if (this.#currentId !== id) return;
    window.clearTimeout(this.#timeout);
    this.#timeout = window.setTimeout(() => {
      this.#currentId = null;
      this.#instantPhase = false;
      this.#emit();
    }, this.options.timeoutMs ?? 0);
  }

  getDelay(id: string): Delay {
    if (this.#instantPhase && this.#currentId !== id) return 0;
    return this.options.delay ?? 0;
  }

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  destroy() {
    window.clearTimeout(this.#timeout);
    this.#listeners.clear();
  }

  #emit() {
    this.#listeners.forEach((listener) => listener());
  }
}

/** The non-stale delay group service. */
export class NextDelayGroup extends DelayGroup {}
