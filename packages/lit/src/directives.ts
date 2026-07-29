import {AsyncDirective, directive} from 'lit/async-directive.js';
import {
  PartType,
  type ChildPart,
  type ElementPart,
  type PartInfo,
} from 'lit/directive.js';
import {noChange, nothing, render} from 'lit';
import {
  createPortalNode,
  getContextArrowStyles,
  removePortalNode,
  type ArrowOptions,
  type FloatingController,
  type FloatingList,
  type ItemState,
  type PortalNodeOptions,
} from '@floating-ui-plus/web';
import {setAttributes} from '@floating-ui-plus/web/utils';

type BindingKind = 'reference' | 'floating' | 'item' | 'arrow';

interface ElementBinding {
  controller: FloatingController;
  kind: BindingKind;
  state?: ItemState | undefined;
  list?: FloatingList<unknown> | undefined;
  arrowOptions?: Omit<ArrowOptions, 'element'> | undefined;
}

const POSITION_STYLE_KEYS = [
  'position',
  'left',
  'top',
  'right',
  'bottom',
  'transform',
  'willChange',
] as const;

class FloatingElementDirective extends AsyncDirective {
  #element: Element | null = null;
  #binding: ElementBinding | null = null;
  #attributes = new Set<string>();
  #itemCleanup: (() => void) | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error(
        'Floating element directives can only be used in an element expression.',
      );
    }
  }

  render(_binding: ElementBinding) {
    return nothing;
  }

  update(part: ElementPart, [binding]: Parameters<this['render']>) {
    const element = part.element;
    const sameElementBinding =
      this.#binding?.kind === binding.kind &&
      this.#binding.controller === binding.controller &&
      this.#element === element;
    const preservesElementBinding =
      sameElementBinding &&
      binding.kind !== 'item' &&
      (binding.kind === 'reference'
        ? binding.controller.elements.domReference === element
        : binding.kind === 'floating'
          ? binding.controller.elements.floating === element
          : true);

    // Lit calls `update()` whenever the host renders, even when this directive
    // is still attached to the same DOM node. Keep stable element bindings
    // mounted so autoUpdate observers and interaction listeners are not torn
    // down and recreated by unrelated reactive state changes. This also
    // preserves virtual position references such as clientPoint().
    if (!preservesElementBinding) {
      this.#release();
    }
    this.#element = element;
    this.#binding = binding;
    const attributes =
      binding.kind === 'item'
        ? typeof binding.controller.context.attributes.item === 'function'
          ? binding.controller.context.attributes.item(binding.state || {})
          : binding.controller.context.attributes.item || {}
        : binding.kind === 'reference'
          ? binding.controller.context.attributes.reference || {}
          : binding.kind === 'floating'
            ? binding.controller.context.attributes.floating || {}
            : {};
    this.#attributes = setAttributes(element, attributes, this.#attributes);

    if (binding.kind === 'reference' && !preservesElementBinding) {
      binding.controller.setReference(element);
    } else if (binding.kind === 'floating' && element instanceof HTMLElement) {
      if (!preservesElementBinding) {
        binding.controller.setFloating(element);
      }
      const styles = binding.controller.floatingStyles;
      POSITION_STYLE_KEYS.forEach((name) => {
        const value = styles[name];
        if (value == null || value === '') {
          element.style.removeProperty(
            name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
          );
        } else {
          element.style[name] = value;
        }
      });
    } else if (binding.kind === 'arrow' && element instanceof HTMLElement) {
      ['position', 'left', 'top', 'right', 'bottom', 'transform'].forEach(
        (name) => element.style.removeProperty(name),
      );
      Object.assign(
        element.style,
        getContextArrowStyles(binding.controller.context, {
          element,
          ...binding.arrowOptions,
        }),
      );
    } else if (
      binding.kind === 'item' &&
      binding.list &&
      element instanceof HTMLElement
    ) {
      const state = binding.state as
        | (ItemState & {label?: string; value?: unknown})
        | undefined;
      this.#itemCleanup = binding.list.register({
        element,
        label: state?.label ?? element.textContent,
        value: state?.value ?? element,
      });
    }

    return noChange;
  }

  disconnected() {
    this.#release();
  }

  #release() {
    if (!this.#binding || !this.#element) return;
    this.#itemCleanup?.();
    this.#itemCleanup = null;
    this.#attributes = setAttributes(this.#element, {}, this.#attributes);
    if (
      this.#binding.kind === 'reference' &&
      this.#binding.controller.elements.domReference === this.#element
    ) {
      this.#binding.controller.setReference(null);
    }
    if (
      this.#binding.kind === 'floating' &&
      this.#binding.controller.elements.floating === this.#element
    ) {
      this.#binding.controller.setFloating(null);
    }
    this.#binding = null;
    this.#element = null;
  }
}

export const bindFloatingElement = directive(FloatingElementDirective);

interface PortalBinding {
  controller: FloatingController;
  value: unknown;
  options?: PortalNodeOptions & {
    topLayer?: 'popover' | undefined;
  };
}

class FloatingPortalDirective extends AsyncDirective {
  #node: HTMLElement | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('portal() can only be used in child content.');
    }
  }

  render(_binding: PortalBinding) {
    return nothing;
  }

  update(part: ChildPart, [binding]: Parameters<this['render']>) {
    if (typeof document === 'undefined') return nothing;
    if (!this.#node) {
      const parent = part.parentNode;
      const document =
        parent instanceof Node
          ? parent.ownerDocument || window.document
          : window.document;
      this.#node = createPortalNode({
        ...binding.options,
        root: binding.options?.root || document.body,
        contextScope: binding.controller.contextScope,
      });
      if (
        binding.options?.topLayer === 'popover' &&
        this.#node &&
        'showPopover' in this.#node
      ) {
        this.#node.setAttribute('popover', 'manual');
        try {
          (this.#node as HTMLElement & {showPopover(): void}).showPopover();
        } catch {
          // The regular portal remains the fallback when the top layer rejects
          // the operation for the current document state.
        }
      }
    }
    if (this.#node) render(binding.value, this.#node);
    return noChange;
  }

  disconnected() {
    if (this.#node) render(nothing, this.#node);
    removePortalNode(this.#node);
    this.#node = null;
  }
}

export const renderFloatingPortal = directive(FloatingPortalDirective);
