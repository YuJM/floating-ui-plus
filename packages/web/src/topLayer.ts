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
  /** Called after a closed native surface has been restored to `hidden`. */
  onExitComplete?(element: HTMLElement): void;
  /** Restore focus to the element that opened a native Dialog when it closes. */
  restoreFocus?: boolean;
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

function getTimeInMilliseconds(value: string) {
  const duration = value.trim();
  if (duration.endsWith('ms')) return Number.parseFloat(duration) || 0;
  if (duration.endsWith('s')) return (Number.parseFloat(duration) || 0) * 1000;
  return 0;
}

function getNativeExitTransitionDuration(element: HTMLElement) {
  if (typeof getComputedStyle !== 'function') return 0;
  const style = getComputedStyle(element);
  const properties = style.transitionProperty
    .split(',')
    .map((value) => value.trim());
  const durations = style.transitionDuration.split(',');
  const delays = style.transitionDelay.split(',');
  const behaviors = style
    .getPropertyValue('transition-behavior')
    .split(',')
    .map((value) => value.trim());
  return properties.reduce((longest, property, index) => {
    if (property !== 'display' && property !== 'overlay') {
      return longest;
    }
    // A duration on display/overlay is not enough: discrete transitions only
    // run when allow-discrete is part of the same transition item.
    if (behaviors[index % behaviors.length] !== 'allow-discrete') {
      return longest;
    }
    const duration = getTimeInMilliseconds(
      durations[index % durations.length] ?? '0s',
    );
    const delay = getTimeInMilliseconds(delays[index % delays.length] ?? '0s');
    return Math.max(longest, duration + delay);
  }, 0);
}

const safeAreaStyleProperties = [
  ['--fup-safe-area-inset-top', 'env(safe-area-inset-top, 0px)'],
  ['--fup-safe-area-inset-right', 'env(safe-area-inset-right, 0px)'],
  ['--fup-safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)'],
  ['--fup-safe-area-inset-left', 'env(safe-area-inset-left, 0px)'],
] as const;

function applyDialogSafeArea(element: HTMLDialogElement) {
  const previous = new Map<string, string>();
  for (const [property, value] of safeAreaStyleProperties) {
    previous.set(property, element.style.getPropertyValue(property));
    if (!element.style.getPropertyValue(property)) {
      element.style.setProperty(property, value);
    }
  }
  const hadAttribute = element.hasAttribute('data-fup-safe-area');
  element.setAttribute('data-fup-safe-area', '');
  return () => {
    for (const [property] of safeAreaStyleProperties) {
      const previousValue = previous.get(property) ?? '';
      if (previousValue) element.style.setProperty(property, previousValue);
      else element.style.removeProperty(property);
    }
    if (!hadAttribute) element.removeAttribute('data-fup-safe-area');
  };
}

function applyPopoverPositionReset(element: HTMLElement) {
  const margin = {
    value: element.style.getPropertyValue('margin'),
    priority: element.style.getPropertyPriority('margin'),
  };
  const inset = {
    value: element.style.getPropertyValue('inset'),
    priority: element.style.getPropertyPriority('inset'),
  };
  const authoredInset =
    !inset.value && typeof getComputedStyle === 'function'
      ? getComputedStyle(element).inset
      : '';
  const right = {
    value: element.style.getPropertyValue('right'),
    priority: element.style.getPropertyPriority('right'),
  };
  const bottom = {
    value: element.style.getPropertyValue('bottom'),
    priority: element.style.getPropertyPriority('bottom'),
  };
  const height = {
    value: element.style.getPropertyValue('height'),
    priority: element.style.getPropertyPriority('height'),
  };
  // Native popovers start with `inset: 0` and `margin: auto`. Floating UI
  // controls the position with left, top, and transform. Preserve a
  // stylesheet-authored inset when one exists: a fixed surface may
  // intentionally position itself with right/bottom (as Toast does), and an
  // inline `inset: auto` would erase those declarations in the native layer.
  // Inline positioning remains reset to `auto` for Floating UI's normal
  // left/top positioning contract.
  element.style.setProperty(
    'inset',
    inset.value ? 'auto' : authoredInset || 'auto',
  );
  element.style.setProperty('margin', '0');
  element.style.setProperty('height', 'auto');
  return () => {
    if (inset.value) {
      element.style.setProperty('inset', inset.value, inset.priority);
    } else {
      element.style.removeProperty('inset');
    }
    if (margin.value) {
      element.style.setProperty('margin', margin.value, margin.priority);
    } else {
      element.style.removeProperty('margin');
    }
    if (right.value) {
      element.style.setProperty('right', right.value, right.priority);
    } else {
      element.style.removeProperty('right');
    }
    if (bottom.value) {
      element.style.setProperty('bottom', bottom.value, bottom.priority);
    } else {
      element.style.removeProperty('bottom');
    }
    if (height.value) {
      element.style.setProperty('height', height.value, height.priority);
    } else {
      element.style.removeProperty('height');
    }
  };
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
  #cancelDeferredHide: (() => void) | undefined;
  #previousFocus: HTMLElement | null = null;
  #restoreFocusElement: HTMLElement | null = null;

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

  /**
   * Sets the element that should regain focus after a native Dialog closes.
   * Renderers call this from their reference binding so pointer-down opening
   * still restores focus to the trigger (before the browser focuses it).
   */
  setRestoreFocusElement(element: HTMLElement | null) {
    this.#restoreFocusElement = element;
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
    this.#restoreFocusElement = null;
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
        this.#captureFocus(element);
        this.#cancelDeferredHide?.();
        this.#cancelDeferredHide = undefined;
        element.hidden = false;
        element.showPopover();
      } else if (!open && shown) {
        element.hidePopover();
        // Read the closed selector after :popover-open has changed. This lets
        // applications use asymmetric entry and exit timings.
        this.#deferHidden(
          element,
          getNativeExitTransitionDuration(element),
        );
      } else if (!open && !this.#cancelDeferredHide) {
        const exitDuration = getNativeExitTransitionDuration(element);
        if (exitDuration > 0) this.#deferHidden(element, exitDuration);
        else element.hidden = true;
      }
      return true;
    }

    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      if (open && !element.open) {
        this.#captureFocus(element);
        this.#cancelDeferredHide?.();
        this.#cancelDeferredHide = undefined;
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
        this.#restoreFocusAfterClose();
        this.#deferHidden(
          element,
          getNativeExitTransitionDuration(element),
        );
      } else if (!open && !this.#cancelDeferredHide) {
        this.#releaseScrollLock();
        const exitDuration = getNativeExitTransitionDuration(element);
        if (exitDuration > 0) this.#deferHidden(element, exitDuration);
        else element.hidden = true;
      }
      return true;
    }

    return false;
  }

  #bind() {
    if (!this.#connected || !this.#element || !this.supported) return;
    const element = this.#element;
    if (this.#kind === 'popover' && isPopoverElement(element)) {
      const restorePosition = applyPopoverPositionReset(element);
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
      this.#cleanup = () => {
        restorePosition();
        element.removeEventListener('toggle', handleToggle);
      };
      return;
    }
    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      const restoreSafeArea = applyDialogSafeArea(element);
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
        else this.#restoreFocusAfterClose();
      };
      element.addEventListener('cancel', handleCancel);
      element.addEventListener('close', handleClose);
      this.#cleanup = () => {
        restoreSafeArea();
        element.removeEventListener('cancel', handleCancel);
        element.removeEventListener('close', handleClose);
      };
    }
  }

  #hideNative() {
    const element = this.#element;
    if (!element) return;
    this.#cancelDeferredHide?.();
    this.#cancelDeferredHide = undefined;
    if (this.#kind === 'popover' && isPopoverElement(element)) {
      if (element.matches(':popover-open')) element.hidePopover();
      element.hidden = true;
      return;
    }
    if (this.#kind === 'dialog' && element instanceof HTMLDialogElement) {
      if (element.open) element.close();
      element.hidden = true;
    }
    this.#previousFocus = null;
  }

  #captureFocus(element: HTMLElement) {
    if (this.#options.restoreFocus === false) return;
    if (this.#kind !== 'dialog' && this.#options.restoreFocus !== true) return;
    const active = element.ownerDocument.activeElement;
    const candidate = this.#restoreFocusElement ?? active;
    this.#previousFocus =
      candidate instanceof HTMLElement &&
      candidate !== element &&
      !element.contains(candidate)
        ? candidate
        : null;
  }

  #restoreFocusAfterClose() {
    const target = this.#previousFocus ?? this.#restoreFocusElement;
    this.#previousFocus = null;
    if (!target?.isConnected) return;
    // Native dialog focus management runs after the close event. Defer one
    // task so the explicit reference restoration wins over the browser's
    // default return to the document body.
    globalThis.setTimeout(() => {
      if (this.#open || !target.isConnected) return;
      target.focus({preventScroll: true});
    }, 0);
  }

  #deferHidden(element: HTMLElement, duration: number) {
    if (duration <= 0) {
      element.hidden = true;
      this.#options.onExitComplete?.(element);
      return;
    }
    let timer = -1;
    const finish = () => {
      if (this.#open || this.#element !== element) return;
      cleanup();
      element.hidden = true;
      this.#options.onExitComplete?.(element);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (
        event.target === element &&
        (event.propertyName === 'display' || event.propertyName === 'overlay')
      ) {
        finish();
      }
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      element.removeEventListener('transitionend', handleTransitionEnd);
      element.removeEventListener('transitioncancel', handleTransitionEnd);
      if (this.#cancelDeferredHide === cleanup) {
        this.#cancelDeferredHide = undefined;
      }
    };
    element.addEventListener('transitionend', handleTransitionEnd);
    element.addEventListener('transitioncancel', handleTransitionEnd);
    timer = window.setTimeout(finish, duration + 50);
    this.#cancelDeferredHide = cleanup;
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
