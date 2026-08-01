import type {OpenChangeReason} from './types';
import {lockScroll} from './overlay';

/** Browser-managed surface modes. `none` keeps the renderer's normal surface. */
export type FloatingTopLayer = 'none' | 'popover' | 'dialog';

export interface FloatingTopLayerOptions {
  onOpenChange(
    open: boolean,
    event?: Event,
    reason?: OpenChangeReason,
  ): boolean | void;
}

type PopoverElement = HTMLElement & {
  showPopover(): void;
  hidePopover(): void;
};

function isPopoverElement(element: HTMLElement): element is PopoverElement {
  return (
    typeof (element as Partial<PopoverElement>).showPopover === 'function' &&
    typeof (element as Partial<PopoverElement>).hidePopover === 'function'
  );
}

export function supportsFloatingTopLayer(kind: FloatingTopLayer) {
  if (kind === 'popover') {
    return typeof HTMLElement !== 'undefined' &&
      isPopoverElement(HTMLElement.prototype as PopoverElement);
  }
  if (kind === 'dialog') {
    return typeof HTMLDialogElement !== 'undefined' &&
      typeof HTMLDialogElement.prototype.showModal === 'function';
  }
  return false;
}

/**
 * Synchronizes renderer-owned open state with the platform Popover or Dialog
 * top layer. Renderers keep DOM ownership; this controller only manages the
 * native lifecycle and maps browser dismissal back to the shared contract.
 */
export class FloatingTopLayerController {
  readonly #options: FloatingTopLayerOptions;
  #element: HTMLElement | null = null;
  #kind: FloatingTopLayer = 'none';
  #open = false;
  #connected = false;
  #cleanup: (() => void) | undefined;
  #unlockScroll: (() => void) | undefined;

  constructor(options: FloatingTopLayerOptions) {
    this.#options = options;
  }

  get kind() {
    return this.#kind;
  }

  get supported() {
    return supportsFloatingTopLayer(this.#kind);
  }

  get active() {
    return this.supported && this.#element != null;
  }

  setElement(element: HTMLElement | null) {
    if (element === this.#element) return;
    this.#hideNative();
    this.#releaseScrollLock();
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#element = element;
    this.#bind();
  }

  setKind(kind: FloatingTopLayer) {
    if (kind === this.#kind) return;
    this.#hideNative();
    this.#releaseScrollLock();
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#kind = kind;
    this.#bind();
  }

  connect() {
    if (this.#connected) return;
    this.#connected = true;
    this.#bind();
  }

  disconnect() {
    if (!this.#connected) return;
    this.#open = false;
    this.#hideNative();
    this.#releaseScrollLock();
    this.#connected = false;
    this.#cleanup?.();
    this.#cleanup = undefined;
  }

  destroy() {
    this.disconnect();
    this.#element = null;
  }

  /** Returns whether a native top-layer surface is currently in use. */
  sync(open: boolean) {
    this.#open = open;
    const element = this.#element;
    if (!this.#connected || !element || !element.isConnected || !this.supported) {
      if (!open) this.#releaseScrollLock();
      return false;
    }

    if (this.#kind === 'popover' && isPopoverElement(element)) {
      element.setAttribute('popover', 'manual');
      const shown = element.matches(':popover-open');
      if (open && !shown) {
        element.hidden = false;
        element.showPopover();
      } else if (!open && shown) {
        element.hidePopover();
        element.hidden = true;
      } else if (!open) {
        element.hidden = true;
      }
      return true;
    }

    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      if (open && !element.open) {
        element.hidden = false;
        try {
          element.showModal();
        } catch {
          // Renderers can bind refs before a portal wrapper is connected.
          // Their post-render sync retries after the DOM commit.
          return false;
        }
        this.#acquireScrollLock(element);
      } else if (open) {
        this.#acquireScrollLock(element);
      } else if (!open && element.open) {
        this.#releaseScrollLock();
        element.close();
        element.hidden = true;
      } else if (!open) {
        this.#releaseScrollLock();
        element.hidden = true;
      }
      return true;
    }

    return false;
  }

  #bind() {
    if (!this.#connected || !this.#element || !this.supported) return;
    const element = this.#element;
    if (this.#kind === 'popover' && isPopoverElement(element)) {
      const handleToggle = (event: Event) => {
        const open = element.matches(':popover-open');
        if (open === this.#open) return;
        const accepted = this.#options.onOpenChange(
          open,
          event,
          open ? 'click' : 'outside-press',
        );
        if (!open && accepted === false) this.sync(true);
      };
      element.addEventListener('toggle', handleToggle);
      this.#cleanup = () => element.removeEventListener('toggle', handleToggle);
      return;
    }
    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      const handleCancel = (event: Event) => {
        if (!this.#open) return;
        event.preventDefault();
        const accepted = this.#options.onOpenChange(
          false,
          event,
          'escape-key',
        );
        if (accepted === false) this.sync(true);
      };
      const handleClose = (event: Event) => {
        this.#releaseScrollLock();
        if (!this.#open) return;
        const accepted = this.#options.onOpenChange(false, event, 'click');
        if (accepted === false) this.sync(true);
      };
      element.addEventListener('cancel', handleCancel);
      element.addEventListener('close', handleClose);
      this.#cleanup = () => {
        element.removeEventListener('cancel', handleCancel);
        element.removeEventListener('close', handleClose);
      };
    }
  }

  #hideNative() {
    const element = this.#element;
    if (!element) return;
    if (this.#kind === 'popover' && isPopoverElement(element)) {
      if (element.matches(':popover-open')) element.hidePopover();
      return;
    }
    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      if (element.open) element.close();
    }
  }

  #acquireScrollLock(element: HTMLDialogElement) {
    if (this.#unlockScroll) return;
    this.#unlockScroll = lockScroll(element.ownerDocument);
  }

  #releaseScrollLock() {
    this.#unlockScroll?.();
    this.#unlockScroll = undefined;
  }
}

export function createFloatingTopLayer(options: FloatingTopLayerOptions) {
  return new FloatingTopLayerController(options);
}
