import {c, useEffect, useHost, useLayoutEffect} from 'atomico';
import {
  createFloatingTopLayer,
  FloatingPresenceStack,
  FloatingTransition,
  type FloatingPresenceStackContext,
  type FloatingPresenceStackOptions,
  type FloatingTopLayer,
  type FloatingTopLayerController,
  type PresenceStackAddOptions,
  type PresenceStackRecord,
  type PresenceStackSnapshot,
} from '@floating-ui-plus/web';

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

export interface FloatingPresenceStackChangeDetail<T = unknown> {
  snapshot: PresenceStackSnapshot<T>;
}

/** Code-first configuration for `floating-presence-stack`. */
export interface FloatingPresenceStackElementOptions
  extends FloatingPresenceStackOptions {
  /** Time kept mounted after close so consumer CSS can finish its exit. */
  exitDuration?: number | undefined;
  /** Native top-layer primitive used by every cloned surface. */
  topLayer?: FloatingTopLayer | undefined;
}

interface FloatingPresenceStackHost extends HTMLElement {
  limit: number;
  timeoutMs: number;
  exitDuration: number;
  topLayer: FloatingTopLayer;
  syncAttributeOptions(options: FloatingPresenceStackElementOptions): void;
  connect(): () => void;
}

interface PresenceEntry<T> {
  nodes: Node[];
  surface: HTMLElement;
  transition: FloatingTransition;
  unsubscribeTransition: () => void;
  abortController: AbortController;
  record: PresenceStackRecord<T>;
  topLayer: FloatingTopLayerController | undefined;
}

function getTopLayer(
  surface: HTMLElement,
  fallback: FloatingTopLayer,
): FloatingTopLayer {
  const candidate = (surface as HTMLElement & {topLayer?: unknown}).topLayer;
  if (candidate === 'popover' || candidate === 'dialog') return candidate;
  return surface.localName === 'dialog' ? 'dialog' : fallback;
}

function readPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function getBindingValue<T>(
  binding: string,
  record: PresenceStackRecord<T>,
  index: number,
) {
  if (binding === '$id') return record.id;
  if (binding === '$index') return index;
  if (binding === '$remaining') return record.remaining;
  return readPath(record.value, binding);
}

function findAll(nodes: readonly Node[], selector: string): HTMLElement[] {
  const elements: HTMLElement[] = [];
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.matches(selector)) elements.push(node);
    elements.push(...Array.from(node.querySelectorAll<HTMLElement>(selector)));
  }
  return elements;
}

const FloatingPresenceStackBase = c(
  () => {
    const host = useHost<FloatingPresenceStackHost>().current;

    useLayoutEffect(() => {
      host.syncAttributeOptions({
        ...(host.hasAttribute('limit') ? {limit: host.limit} : {}),
        ...(host.hasAttribute('timeout') ? {timeout: host.timeoutMs} : {}),
        ...(host.hasAttribute('exit-duration')
          ? {exitDuration: host.exitDuration}
          : {}),
        ...(host.hasAttribute('top-layer') ? {topLayer: host.topLayer} : {}),
      });
    }, [host, host.limit, host.timeoutMs, host.exitDuration, host.topLayer]);

    useEffect(() => host.connect(), [host]);

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot />
      </host>
    );
  },
  {
    props: {
      limit: {type: Number, value: (): number => 3},
      timeoutMs: {
        type: Number,
        value: (): number => 5000,
        attr: 'timeout',
      },
      exitDuration: {
        type: Number,
        value: (): number => 0,
        attr: 'exit-duration',
      },
      topLayer: {
        type: String,
        value: (): FloatingTopLayer => 'none',
        attr: 'top-layer',
      },
    },
  },
);

/**
 * Renders a bounded transient-surface stack from one declarative
 * `template[slot="content"]`.
 *
 * The first template root is the styled surface. Use `data-presence-item` to
 * select a nested surface in a multi-root template, `data-presence-text="path"`
 * to bind values, and `data-presence-close` on controls that close their
 * owning record.
 */
export class FloatingPresenceStackElement<
  T = unknown,
> extends FloatingPresenceStackBase {
  #attributeOptions: FloatingPresenceStackElementOptions = {};
  #codeOptions: FloatingPresenceStackElementOptions = {};
  #options: FloatingPresenceStackOptions = {limit: 3, timeout: 5000};
  #exitDuration = 0;
  #topLayer: FloatingTopLayer = 'none';
  #controller = new FloatingPresenceStack<T>(this.#options);
  #entries = new Map<string, PresenceEntry<T>>();

  get updateComplete() {
    return this.updated;
  }

  get snapshot() {
    return this.#controller.snapshot;
  }

  /** Shared framework-neutral lifecycle contract used by this adapter. */
  get context(): FloatingPresenceStackContext<T> {
    return this.#controller;
  }

  get options(): Readonly<FloatingPresenceStackElementOptions> {
    return {
      ...this.#options,
      exitDuration: this.#exitDuration,
      topLayer: this.#topLayer,
    };
  }

  set options(options: FloatingPresenceStackElementOptions) {
    this.configure(options);
  }

  add(value: T, options?: PresenceStackAddOptions) {
    return this.#controller.add(value, options);
  }

  close(id: string) {
    this.#controller.close(id);
  }

  removeRecord(id: string) {
    this.#controller.remove(id);
  }

  pause(reason = 'manual') {
    this.#controller.pause(reason);
  }

  resume(reason = 'manual') {
    this.#controller.resume(reason);
  }

  /**
   * Applies code-owned options. Explicit code options take precedence over
   * matching HTML attributes; omitted values keep their current source.
   */
  configure(options: Partial<FloatingPresenceStackElementOptions>) {
    this.#codeOptions = {...this.#codeOptions, ...options};
    this.#applyOptions();
    return this;
  }

  syncAttributeOptions(options: FloatingPresenceStackElementOptions) {
    this.#attributeOptions = options;
    this.#applyOptions();
  }

  #applyOptions() {
    const options = {
      limit: 3,
      timeout: 5000,
      exitDuration: 0,
      topLayer: 'none' as FloatingTopLayer,
      ...this.#attributeOptions,
      ...this.#codeOptions,
    };
    this.#options = {
      limit: Math.max(1, options.limit ?? 3),
      timeout: Math.max(0, options.timeout ?? 5000),
    };
    this.#controller.setOptions(this.#options);
    this.#exitDuration = Math.max(0, options.exitDuration ?? 0);
    this.#topLayer = options.topLayer ?? 'none';
  }

  connect() {
    const unsubscribe = this.#controller.subscribe((snapshot) => {
      this.#sync(snapshot);
      this.dispatchEvent(
        new CustomEvent<FloatingPresenceStackChangeDetail<T>>(
          'presencechange',
          {
            bubbles: true,
            composed: true,
            detail: {snapshot},
          },
        ),
      );
    });

    this.#sync(this.snapshot);

    return () => {
      unsubscribe();
      this.#clearEntries();
      this.#controller.destroy();
      this.#controller = new FloatingPresenceStack<T>(this.#options);
    };
  }

  #sync(snapshot: PresenceStackSnapshot<T>) {
    const visible = snapshot.records.filter((record) => record.open).reverse();
    for (const record of snapshot.records) {
      let entry = this.#entries.get(record.id);
      if (!entry && record.open) entry = this.#createEntry(record);
      if (!entry) continue;

      entry.record = record;
      const index = Math.max(
        0,
        visible.findIndex((visibleRecord) => visibleRecord.id === record.id),
      );
      this.#bindEntry(entry, index);
      entry.surface.style.setProperty(
        '--floating-presence-index',
        String(index),
      );
      entry.surface.dataset.presenceIndex = String(index);
      entry.surface.toggleAttribute(
        'data-presence-overflowed',
        record.overflowed,
      );
      if (!record.open) entry.transition.setOpen(false);
      entry.topLayer?.sync(record.open);
    }
    this.toggleAttribute('data-presence-paused', snapshot.paused);
  }

  #createEntry(record: PresenceStackRecord<T>) {
    const template = Array.from(this.children).find(
      (child): child is HTMLTemplateElement =>
        child instanceof HTMLTemplateElement && child.slot === 'content',
    );
    if (!template) return undefined;

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const nodes = Array.from(fragment.childNodes);
    const surface =
      fragment.querySelector<HTMLElement>('[data-presence-item]') ??
      nodes.find((node): node is HTMLElement => node instanceof HTMLElement);
    if (!surface) return undefined;

    const transition = new FloatingTransition(() => 'bottom-end', {
      duration: {close: this.#exitDuration},
    });
    const topLayerKind = getTopLayer(surface, this.#topLayer);
    const topLayer =
      topLayerKind === 'none'
        ? undefined
        : createFloatingTopLayer({
            onOpenChange: (open) => {
              if (!open) this.close(record.id);
            },
          });
    topLayer?.setKind(topLayerKind);
    topLayer?.setElement(surface);
    topLayer?.connect();
    const abortController = new AbortController();
    const entry: PresenceEntry<T> = {
      nodes,
      surface,
      transition,
      unsubscribeTransition: () => undefined,
      abortController,
      record,
      topLayer,
    };

    for (const control of findAll(nodes, '[data-presence-close]')) {
      control.addEventListener('click', () => this.close(record.id), {
        signal: abortController.signal,
      });
    }
    entry.unsubscribeTransition = transition.subscribe(() => {
      surface.dataset.status = transition.status;
      if (!transition.isMounted && transition.status === 'unmounted') {
        this.#removeEntry(record.id);
        this.#controller.remove(record.id);
      }
    });

    this.append(fragment);
    this.#entries.set(record.id, entry);
    transition.setOpen(true);
    topLayer?.sync(true);
    return entry;
  }

  #bindEntry(entry: PresenceEntry<T>, index: number) {
    entry.surface.setAttribute('data-presence-id', entry.record.id);
    for (const element of findAll(entry.nodes, '[data-presence-text]')) {
      const binding = element.dataset.presenceText;
      if (!binding) continue;
      const value = getBindingValue(binding, entry.record, index);
      element.textContent = value == null ? '' : String(value);
    }
  }

  #removeEntry(id: string) {
    const entry = this.#entries.get(id);
    if (!entry) return;
    entry.abortController.abort();
    entry.unsubscribeTransition();
    entry.transition.destroy();
    entry.topLayer?.destroy();
    entry.nodes.forEach((node) => node.parentNode?.removeChild(node));
    this.#entries.delete(id);
  }

  #clearEntries() {
    for (const id of [...this.#entries.keys()]) this.#removeEntry(id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-presence-stack': FloatingPresenceStackElement;
  }

  interface HTMLElementEventMap {
    presencechange: CustomEvent<FloatingPresenceStackChangeDetail>;
  }
}
