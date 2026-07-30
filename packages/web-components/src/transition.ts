import {nothing} from 'lit';
import {AsyncDirective, directive} from 'lit/async-directive.js';
import {
  PartType,
  type ChildPart,
  type DirectiveResult,
  type PartInfo,
} from 'lit/directive.js';
import type {StyleInfo} from 'lit/directives/style-map.js';
import {
  FloatingTransition,
  type Placement,
  type TransitionStatus,
  type TransitionStyles,
} from '@floating-ui-plus/web';

export interface FloatingTransitionState {
  isMounted: boolean;
  status: TransitionStatus;
  styles: Readonly<StyleInfo>;
}

export type FloatingTransitionRenderer = (
  state: FloatingTransitionState,
) => unknown;

interface TransitionBinding {
  open: boolean;
  placement: () => Placement;
  renderer: FloatingTransitionRenderer;
  options: TransitionStyles;
}

class FloatingTransitionDirective extends AsyncDirective {
  #binding: TransitionBinding | null = null;
  #transition: FloatingTransition | null = null;
  #unsubscribe: (() => void) | null = null;
  #open: boolean | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('floatingTransition() can only be used in child content.');
    }
  }

  render(binding: TransitionBinding) {
    return binding.open
      ? binding.renderer({
          isMounted: true,
          status: 'initial',
          styles: {
            ...(typeof binding.options.common === 'function'
              ? binding.options.common(binding.placement())
              : binding.options.common),
            ...binding.options.initial,
          } as Readonly<StyleInfo>,
        })
      : nothing;
  }

  update(_part: ChildPart, [binding]: Parameters<this['render']>) {
    const changed =
      !this.#binding ||
      this.#binding.placement !== binding.placement ||
      this.#binding.options !== binding.options;
    this.#binding = binding;
    if (changed) this.#createTransition();
    if (this.#open !== binding.open) {
      this.#open = binding.open;
      this.#transition?.setOpen(binding.open);
    }
    return this.#renderCurrent();
  }

  disconnected() {
    this.#destroy();
  }

  #createTransition() {
    this.#destroy();
    if (!this.#binding) return;
    this.#transition = new FloatingTransition(
      this.#binding.placement,
      this.#binding.options,
    );
    this.#unsubscribe = this.#transition.subscribe(() => {
      this.setValue(this.#renderCurrent());
    });
    this.#open = undefined;
  }

  #renderCurrent() {
    if (!this.#binding || !this.#transition?.isMounted) return nothing;
    return this.#binding.renderer({
      isMounted: this.#transition.isMounted,
      status: this.#transition.status,
      styles: this.#transition.styles as Readonly<StyleInfo>,
    });
  }

  #destroy() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#transition?.destroy();
    this.#transition = null;
    this.#open = undefined;
  }
}

const renderFloatingTransition = directive(FloatingTransitionDirective);

export function floatingTransition(
  open: boolean,
  placement: () => Placement,
  renderer: FloatingTransitionRenderer,
  options: TransitionStyles = {},
): DirectiveResult {
  return renderFloatingTransition({
    open,
    placement,
    renderer,
    options,
  });
}
