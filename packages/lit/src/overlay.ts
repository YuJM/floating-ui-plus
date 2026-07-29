import {html, nothing} from 'lit';
import {AsyncDirective, directive} from 'lit/async-directive.js';
import {
  PartType,
  type ChildPart,
  type DirectiveResult,
  type PartInfo,
} from 'lit/directive.js';
import {lockScroll} from '@floating-ui-plus/web';

export interface FloatingOverlayOptions {
  lockScroll?: boolean | undefined;
  className?: string | undefined;
}

class FloatingOverlayDirective extends AsyncDirective {
  #unlock: (() => void) | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('floatingOverlay() can only be used in child content.');
    }
  }

  render(content: unknown, options: FloatingOverlayOptions = {}) {
    return html`<div
      data-floating-ui-overlay
      class=${options.className || ''}
      style="position:fixed;inset:0"
    >
      ${content}
    </div>`;
  }

  update(part: ChildPart, [content, options = {}]: Parameters<this['render']>) {
    this.#unlock?.();
    this.#unlock = null;
    if (options.lockScroll && part.parentNode instanceof Node) {
      const document = part.parentNode.ownerDocument;
      if (document) this.#unlock = lockScroll(document);
    }
    return this.render(content, options);
  }

  disconnected() {
    this.#unlock?.();
    this.#unlock = null;
  }
}

const renderFloatingOverlay = directive(FloatingOverlayDirective);

export function floatingOverlay(
  content: unknown = nothing,
  options: FloatingOverlayOptions = {},
): DirectiveResult {
  return renderFloatingOverlay(content, options);
}

export {lockScroll};
