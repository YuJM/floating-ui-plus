import {AsyncDirective, directive} from 'lit/async-directive.js';
import {
  PartType,
  type ChildPart,
  type ElementPart,
  type PartInfo,
} from 'lit/directive.js';
import {noChange, nothing, render} from 'lit';
import {
  applyFloatingStyles,
  createPortalNodeController,
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  getArrowMainAxisSize,
  getContextArrowStyles,
  registerFloatingArrow,
  type ArrowOptions,
  type FloatingController,
  type FloatingList,
  type ItemState,
  type PortalNodeController,
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

class FloatingElementDirective extends AsyncDirective {
  #element: Element | null = null;
  #binding: ElementBinding | null = null;
  #attributes = new Set<string>();
  #itemCleanup: (() => void) | null = null;
  #arrowCleanup: (() => void) | null = null;

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
        binding.controller.presence.set('mounted');
      }
      applyFloatingStyles(element, binding.controller.floatingStyles);
    } else if (binding.kind === 'arrow' && element instanceof HTMLElement) {
      element.setAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE, '');
      const height =
        binding.arrowOptions?.height ??
        getArrowMainAxisSize(
          element,
          binding.controller.context.position.placement,
        );
      element.setAttribute(
        FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
        String(height),
      );
      this.#arrowCleanup?.();
      this.#arrowCleanup = registerFloatingArrow(
        binding.controller.context,
        {element, height},
      );
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
    this.#arrowCleanup?.();
    this.#arrowCleanup = null;
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
      this.#binding.controller.presence.set('unmounted');
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
  #portal: PortalNodeController | null = null;
  #node: HTMLElement | null = null;
  #binding: PortalBinding | null = null;
  #ownerDocument: Document | null = null;

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
    const parent = part.parentNode;
    this.#ownerDocument =
      parent instanceof Node
        ? parent.ownerDocument || window.document
        : window.document;
    this.#binding = binding;
    if (this.isConnected) this.#syncPortal();
    return noChange;
  }

  disconnected() {
    if (this.#node) render(nothing, this.#node);
    this.#portal?.disconnect();
    this.#node = null;
  }

  reconnected() {
    this.#syncPortal();
  }

  #syncPortal() {
    const binding = this.#binding;
    const ownerDocument = this.#ownerDocument;
    if (!binding || !ownerDocument) return;

    const {topLayer: _topLayer, ...portalOptions} = binding.options ?? {};
    const options: PortalNodeOptions = {
      ...portalOptions,
      ownerDocument,
      contextScope: binding.controller.contextScope,
    };
    const previousNode = this.#node;
    if (!this.#portal) {
      this.#portal = createPortalNodeController(options);
      this.#node = this.#portal.connect();
    } else {
      this.#node = this.#portal.updateOptions(options);
      if (!this.#portal.connected) this.#node = this.#portal.connect();
    }

    if (previousNode && previousNode !== this.#node) {
      render(nothing, previousNode);
    }
    if (!this.#node) return;
    if (
      binding.options?.topLayer === 'popover' &&
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
    render(binding.value, this.#node);
  }
}

export const renderFloatingPortal = directive(FloatingPortalDirective);
