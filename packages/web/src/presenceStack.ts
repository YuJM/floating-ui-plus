import {createId} from './utils/common';

/** A transient surface managed independently from its rendered exit presence. */
export interface PresenceStackRecord<T> {
  id: string;
  value: T;
  open: boolean;
  overflowed: boolean;
  remaining: number;
}

export interface PresenceStackSnapshot<T> {
  records: readonly PresenceStackRecord<T>[];
  paused: boolean;
}

export interface FloatingPresenceStackOptions {
  /** Maximum number of simultaneously visible surfaces. Defaults to 3. */
  limit?: number | undefined;
  /** Auto-close timeout in milliseconds. Set to `0` to disable it. */
  timeout?: number | undefined;
}

export interface PresenceStackAddOptions {
  id?: string | undefined;
  timeout?: number | undefined;
}

export type PresenceStackListener<T> = (
  snapshot: PresenceStackSnapshot<T>,
) => void;

/**
 * Framework-neutral public contract shared by rendering adapters.
 *
 * Web Components, Vue composables, and application-owned renderers can expose
 * this shape without coupling transient lifecycle state to their markup.
 */
export interface FloatingPresenceStackContext<T> {
  readonly snapshot: PresenceStackSnapshot<T>;
  add(value: T, options?: PresenceStackAddOptions): string;
  close(id: string, overflowed?: boolean): void;
  remove(id: string): void;
  pause(reason?: string): void;
  resume(reason?: string): void;
  subscribe(listener: PresenceStackListener<T>): () => void;
}

/**
 * Framework-neutral lifecycle for bounded, pausable transient surfaces.
 * Rendering and the final removal after an exit transition stay with the host.
 */
export class FloatingPresenceStack<T>
  implements FloatingPresenceStackContext<T>
{
  #options: FloatingPresenceStackOptions;
  #records = new Map<string, PresenceStackRecord<T>>();
  #timers = new Map<string, number>();
  #startedAt = new Map<string, number>();
  #persistent = new Set<string>();
  #pauseReasons = new Set<string>();
  #listeners = new Set<PresenceStackListener<T>>();

  constructor(options: FloatingPresenceStackOptions = {}) {
    this.#options = {...options};
  }

  get options(): Readonly<FloatingPresenceStackOptions> {
    return {...this.#options};
  }

  /**
   * Updates defaults used by records added after this call.
   *
   * Reducing `limit` also closes the oldest excess records immediately. An
   * updated timeout does not rewrite timers that are already running.
   */
  setOptions(options: Partial<FloatingPresenceStackOptions>) {
    this.#options = {...this.#options, ...options};
    if (options.limit == null) return;

    const limit = Math.max(1, options.limit);
    const visible = [...this.#records.values()].filter((record) => record.open);
    for (const record of visible.slice(0, Math.max(0, visible.length - limit))) {
      this.close(record.id, true);
    }
  }

  get snapshot(): PresenceStackSnapshot<T> {
    return {
      records: [...this.#records.values()].map((record) => ({...record})),
      paused: this.#pauseReasons.size > 0,
    };
  }

  add(value: T, options: PresenceStackAddOptions = {}) {
    const limit = Math.max(1, this.#options.limit ?? 3);
    const visible = [...this.#records.values()].filter((record) => record.open);
    if (visible.length >= limit) this.close(visible[0]!.id, true);

    const id = options.id ?? createId('floating-presence');
    const timeout = Math.max(
      0,
      options.timeout ?? this.#options.timeout ?? 5000,
    );
    const record: PresenceStackRecord<T> = {
      id,
      value,
      open: true,
      overflowed: false,
      remaining: timeout,
    };
    if (timeout === 0) this.#persistent.add(id);
    this.#records.set(id, record);
    this.#schedule(record);
    this.#emit();
    return id;
  }

  close(id: string, overflowed = false) {
    const record = this.#records.get(id);
    if (!record || !record.open) return;
    this.#clearTimer(id);
    record.open = false;
    record.overflowed = overflowed;
    this.#emit();
  }

  /** Removes a surface after the renderer's close transition has ended. */
  remove(id: string) {
    if (!this.#records.delete(id)) return;
    this.#clearTimer(id);
    this.#persistent.delete(id);
    this.#emit();
  }

  pause(reason = 'manual') {
    if (this.#pauseReasons.has(reason)) return;
    const wasPaused = this.#pauseReasons.size > 0;
    this.#pauseReasons.add(reason);
    if (!wasPaused) {
      const now = performance.now();
      for (const record of this.#records.values()) {
        if (!record.open) continue;
        const startedAt = this.#startedAt.get(record.id);
        if (startedAt != null) {
          record.remaining = Math.max(0, record.remaining - (now - startedAt));
        }
        this.#clearTimer(record.id);
      }
    }
    this.#emit();
  }

  resume(reason = 'manual') {
    if (!this.#pauseReasons.delete(reason)) return;
    if (this.#pauseReasons.size === 0) {
      for (const record of this.#records.values()) {
        if (record.open) this.#schedule(record);
      }
    }
    this.#emit();
  }

  subscribe(listener: PresenceStackListener<T>) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  destroy() {
    for (const id of this.#timers.keys()) this.#clearTimer(id);
    this.#listeners.clear();
  }

  #schedule(record: PresenceStackRecord<T>) {
    if (this.#persistent.has(record.id)) return;
    if (!record.open || this.#pauseReasons.size > 0 || record.remaining <= 0) {
      if (record.remaining <= 0 && record.open) this.close(record.id);
      return;
    }
    this.#clearTimer(record.id);
    this.#startedAt.set(record.id, performance.now());
    this.#timers.set(
      record.id,
      window.setTimeout(() => this.close(record.id), record.remaining),
    );
  }

  #clearTimer(id: string) {
    const timer = this.#timers.get(id);
    if (timer != null) window.clearTimeout(timer);
    this.#timers.delete(id);
    this.#startedAt.delete(id);
  }

  #emit() {
    const snapshot = this.snapshot;
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}

export function createFloatingPresenceStack<T>(options?: FloatingPresenceStackOptions) {
  return new FloatingPresenceStack<T>(options);
}
