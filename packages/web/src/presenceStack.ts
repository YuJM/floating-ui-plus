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

/**
 * Framework-neutral lifecycle for bounded, pausable transient surfaces.
 * Rendering and the final removal after an exit transition stay with the host.
 */
export class FloatingPresenceStack<T> {
  #records = new Map<string, PresenceStackRecord<T>>();
  #timers = new Map<string, number>();
  #startedAt = new Map<string, number>();
  #pauseReasons = new Set<string>();
  #listeners = new Set<(snapshot: PresenceStackSnapshot<T>) => void>();

  constructor(readonly options: FloatingPresenceStackOptions = {}) {}

  get snapshot(): PresenceStackSnapshot<T> {
    return {
      records: [...this.#records.values()].map((record) => ({...record})),
      paused: this.#pauseReasons.size > 0,
    };
  }

  add(value: T, options: PresenceStackAddOptions = {}) {
    const limit = Math.max(1, this.options.limit ?? 3);
    const visible = [...this.#records.values()].filter((record) => record.open);
    if (visible.length >= limit) this.close(visible[0]!.id, true);

    const id = options.id ?? createId('floating-presence');
    const record: PresenceStackRecord<T> = {
      id,
      value,
      open: true,
      overflowed: false,
      remaining: Math.max(0, options.timeout ?? this.options.timeout ?? 5000),
    };
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

  subscribe(listener: (snapshot: PresenceStackSnapshot<T>) => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  destroy() {
    for (const id of this.#timers.keys()) this.#clearTimer(id);
    this.#listeners.clear();
  }

  #schedule(record: PresenceStackRecord<T>) {
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
