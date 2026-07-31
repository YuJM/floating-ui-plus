import {
  c,
  useContext,
  useHost,
  useLayoutEffect,
  useRef,
  useSlot,
} from "atomico";
import type { ItemState } from "@floating-ui-plus/web";
import { setAttributes } from "@floating-ui-plus/web/utils";

import { floatingComponentContext } from "./component-context";
import type { FloatingRootElement } from "./FloatingRootElement";

const contentsStyles = `
  :host,
  slot {
    display: contents;
  }
`;

function useRootPart(
  bind: (root: FloatingRootElement, element: Element | null) => void,
) {
  const root = useContext(floatingComponentContext).root;
  const slot = useRef<HTMLSlotElement>();
  const children = useSlot<Element>(slot, (node) => node instanceof Element);
  const element = children[0] ?? null;

  useLayoutEffect(() => {
    if (root) bind(root, element);
    return () => {
      if (root && element) bind(root, null);
    };
  }, [root, element]);

  return slot;
}

interface FloatingItemHost extends HTMLElement {
  active: boolean;
  selected: boolean;
  index?: number;
  label?: string;
}

const FloatingReferenceBase = c(() => {
  const slot = useRootPart((root, element) => {
    root.setReferenceElement(element);
  });
  return (
    <host shadowDom>
      <style>{contentsStyles}</style>
      <slot ref={slot} />
    </host>
  );
});

/** Binds its first child to the nearest floating root reference. */
export class FloatingReferenceElement extends FloatingReferenceBase {
  get updateComplete() {
    return this.updated;
  }
}

const FloatingItemBase = c(
  () => {
    const host = useHost<FloatingItemHost>().current;
    const root = useContext(floatingComponentContext).root;
    const slot = useRef<HTMLSlotElement>();
    const children = useSlot<Element>(slot, (node) => node instanceof Element);
    const element = children[0] ?? null;
    const bound = useRef<Element | null>(null);
    const attributes = useRef(new Set<string>());

    const clear = (element = bound.current) => {
      if (!element) return;
      attributes.current = setAttributes(element, {}, attributes.current);
    };

    const sync = () => {
      if (element !== bound.current) clear();
      bound.current = element;
      if (!root || !element) return;
      const itemAttributes = root.controller.context.attributes.item;
      const state: ItemState = {
        active: host.active,
        selected: host.selected,
        ...(host.index == null ? {} : { index: host.index }),
      };
      attributes.current = setAttributes(
        element,
        typeof itemAttributes === "function"
          ? itemAttributes(state)
          : (itemAttributes ?? {}),
        attributes.current,
      );
    };

    useLayoutEffect(() => {
      sync();
    }, [root, element, host.active, host.selected, host.index, host.label]);
    useLayoutEffect(
      () => () => {
        clear();
        bound.current = null;
      },
      [],
    );

    return (
      <host shadowDom>
        <style>{contentsStyles}</style>
        <slot ref={slot} />
      </host>
    );
  },
  {
    props: {
      active: { type: Boolean, value: (): boolean => false, reflect: true },
      selected: { type: Boolean, value: (): boolean => false, reflect: true },
      index: { type: Number },
      label: { type: String },
    },
  },
);

/** Applies item interaction attributes to its first child. */
export class FloatingItemElement extends FloatingItemBase {
  #value: unknown;

  get updateComplete() {
    return this.updated;
  }

  get value() {
    return this.#value;
  }

  set value(value: unknown) {
    if (value === this.#value) return;
    this.#value = value;
    void this.update();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "floating-reference": FloatingReferenceElement;
    "floating-item": FloatingItemElement;
  }
}
