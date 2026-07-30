import {
  FloatingRootElement,
  SearchController,
  arrow,
  autoPlacement,
  click,
  clientPoint,
  createFuzzySearchSource,
  dismiss,
  focus,
  flip,
  hide,
  hover,
  inline,
  listNavigation,
  offset,
  role,
  safePolygon,
  shift,
  size,
  typeahead,
  type FloatingOpenChangeDetail,
  type FloatingPlugin,
  type Placement,
} from '@floating-ui-plus/web-components';

import {
  multilingualDestinations,
  multilingualSearchKeys,
  type MultilingualDestination,
} from '../multilingual-destinations';

type DemoScope = HTMLElement;

function root(scope: ParentNode, selector: string) {
  const element = scope.querySelector(selector) ?? document.querySelector(selector);
  if (!(element instanceof HTMLElement) || element.localName !== 'floating-root') {
    throw new Error(`Missing FloatingRootElement for ${selector}`);
  }
  return element as FloatingRootElement;
}

function configure(
  element: FloatingRootElement,
  options: {
    middleware?: FloatingRootElement['middleware'];
    plugins?: FloatingPlugin[];
  },
) {
  if (options.middleware) element.middleware = options.middleware;
  if (options.plugins) element.plugins = options.plugins;
}

function close(
  element: FloatingRootElement,
  event: Event,
  reason: 'click' | 'escape-key' = 'click',
) {
  element.controller.context.onOpenChange(false, event, reason);
}

function emit(scope: DemoScope, message: string) {
  scope.dispatchEvent(
    new CustomEvent('floating-demo-action', {
      bubbles: true,
      composed: true,
      detail: message,
    }),
  );
}

function onOpenChange(
  element: FloatingRootElement,
  listener: (detail: FloatingOpenChangeDetail) => void,
) {
  element.addEventListener('openchange', (event) => {
    listener((event as CustomEvent<FloatingOpenChangeDetail>).detail);
  });
}

function activeItems(items: HTMLElement[], refresh: () => void) {
  let index: number | null = null;
  return {
    get value() {
      return index;
    },
    set(next: number | null) {
      index = next;
      items.forEach((item, itemIndex) => {
        item.tabIndex = itemIndex === next ? 0 : -1;
        item.dataset.active = String(itemIndex === next);
      });
      refresh();
    },
  };
}

function initializeTooltip(scope: DemoScope) {
  const floating = root(scope, '[data-tooltip-root]');
  configure(floating, {
    middleware: [offset(14), flip(), shift({padding: 12})],
    plugins: [
      hover({handleClose: safePolygon({buffer: 4})}),
      focus(),
      dismiss(),
      role({role: 'tooltip'}),
    ],
  });
  onOpenChange(floating, ({open}) => {
    emit(scope, open ? 'Tooltip opened from pointer or focus' : 'Tooltip closed');
  });
}

function initializePopover(scope: DemoScope) {
  const floating = root(scope, '[data-popover-root]');
  floating.middleware = [offset(12), flip(), shift({padding: 18})];
  scope.querySelector('[data-close-popover]')?.addEventListener('click', (event) => {
    close(floating, event);
  });
  onOpenChange(floating, ({open}) => {
    emit(scope, open ? 'Popover opened from its custom element' : 'Popover dismissed');
  });
}

function initializeMenu(scope: DemoScope) {
  const floating = root(scope, '[data-menu-root]');
  const items = [
    ...scope.querySelectorAll<HTMLElement>('[data-menu-item]'),
  ];
  const labels = items.map((item) => item.dataset.label ?? null);
  const listRef = {current: items as Array<HTMLElement | null>};
  const labelRef = {current: labels};
  const active = activeItems(items, () => floating.controller.refresh());

  configure(floating, {
    middleware: [offset(8), flip(), shift({padding: 18})],
    plugins: [
      click(),
      dismiss(),
      role({role: 'menu'}),
      listNavigation(() => ({
        listRef,
        activeIndex: active.value,
        loop: true,
        onNavigate: active.set,
      })),
      typeahead({
        listRef: labelRef,
        get activeIndex() {
          return active.value;
        },
        onMatch: (index) => {
          active.set(index);
          if (index != null) items[index]?.focus({preventScroll: true});
        },
      }),
    ],
  });

  items.forEach((item, index) => {
    item.addEventListener('click', (event) => {
      active.set(index);
      emit(scope, `${labels[index]} selected`);
      close(floating, event);
    });
  });
  onOpenChange(floating, ({open}) => {
    if (!open) active.set(null);
    emit(scope, open ? 'Menu opened · arrows and typeahead are active' : 'Menu closed');
  });
}

function initializeClientPoint(scope: DemoScope) {
  const floating = root(scope, '[data-client-point-root]');
  const field = scope.querySelector<HTMLElement>('.cursor-field');
  const label = scope.querySelector<HTMLElement>('[data-pointer-label]');
  if (!field || !label) return;

  configure(floating, {
    middleware: [offset(16), flip(), shift({padding: 18})],
    plugins: [
      hover({move: true}),
      clientPoint(),
      dismiss(),
      role({role: 'tooltip'}),
    ],
  });

  let frame: number | null = null;
  let nextLabel = label.textContent ?? '';
  field.addEventListener('mousemove', (event) => {
    const bounds = field.getBoundingClientRect();
    nextLabel = `${Math.round(event.clientX - bounds.left)} × ${Math.round(event.clientY - bounds.top)}`;
    if (frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      label.textContent = nextLabel;
    });
  });
  onOpenChange(floating, ({open}) => {
    emit(
      scope,
      open
        ? 'Cursor reference is now tracking the pointer'
        : 'Cursor reference released',
    );
  });
}

function initializeNestedMenu(scope: DemoScope) {
  const parent = root(scope, '[data-nested-root]');
  const child = root(scope, '[data-projects-root]');
  const parentItems = [
    ...scope.querySelectorAll<HTMLElement>('[data-root-menu-item]'),
  ];
  const childItems = [
    ...scope.querySelectorAll<HTMLElement>('[data-project-menu-item]'),
  ];
  const parentRef = {current: parentItems as Array<HTMLElement | null>};
  const childRef = {current: childItems as Array<HTMLElement | null>};
  const parentLabels = {
    current: parentItems.map((item) => item.dataset.label ?? null),
  };
  const childLabels = {
    current: childItems.map((item) => item.dataset.label ?? null),
  };
  const parentActive = activeItems(
    parentItems,
    () => parent.controller.refresh(),
  );
  const childActive = activeItems(
    childItems,
    () => child.controller.refresh(),
  );

  configure(parent, {
    middleware: [offset(8), flip(), shift({padding: 18})],
    plugins: [
      click(),
      dismiss(() => ({
        escapeKey: !child.open,
        outsidePress: (event) =>
          !(event.target instanceof Element) ||
          !event.target.closest('.nested-menu-submenu'),
      })),
      role({role: 'menu'}),
      listNavigation(() => ({
        listRef: parentRef,
        activeIndex: parentActive.value,
        loop: true,
        onNavigate: parentActive.set,
      })),
      typeahead({
        listRef: parentLabels,
        get activeIndex() {
          return parentActive.value;
        },
        onMatch: (index) => {
          parentActive.set(index);
          if (index != null) parentItems[index]?.focus({preventScroll: true});
        },
      }),
    ],
  });
  configure(child, {
    middleware: [
      offset({mainAxis: 6, alignmentAxis: -6}),
      flip(),
      shift({padding: 18}),
    ],
    plugins: [
      click(),
      hover({
        move: false,
        delay: {open: 80, close: 120},
        handleClose: safePolygon(),
      }),
      dismiss(),
      role({role: 'menu'}),
      listNavigation(() => ({
        listRef: childRef,
        activeIndex: childActive.value,
        nested: true,
        loop: true,
        onNavigate: childActive.set,
      })),
      typeahead({
        listRef: childLabels,
        get activeIndex() {
          return childActive.value;
        },
        onMatch: (index) => {
          childActive.set(index);
          if (index != null) childItems[index]?.focus({preventScroll: true});
        },
      }),
    ],
  });

  const childTrigger = parentItems[1];
  childTrigger?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight') return;
    event.preventDefault();
    child.controller.context.onOpenChange(true, event, 'click');
    queueMicrotask(() => {
      childActive.set(0);
      childItems[0]?.focus({preventScroll: true});
    });
  });
  parentItems.forEach((item, index) => {
    if (index === 1) return;
    item.addEventListener('click', (event) => {
      emit(scope, `${item.dataset.label} selected`);
      close(parent, event);
    });
  });
  childItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      emit(scope, `Moved to ${item.dataset.label}`);
      close(parent, event);
    });
  });
  onOpenChange(parent, ({open, reason}) => {
    if (!open) {
      parentActive.set(null);
      child.open = false;
      if (reason === 'escape-key') {
        queueMicrotask(() => {
          const reference = parent.referenceElement;
          if (reference instanceof HTMLElement) {
            reference.focus({preventScroll: true});
          }
        });
      }
    }
    emit(scope, open ? 'Nested menu opened' : 'Nested menu closed');
  });
  onOpenChange(child, ({open, reason}) => {
    if (!open) {
      childActive.set(null);
      if (reason === 'escape-key' || reason === 'focus-out') {
        window.setTimeout(
          () => childTrigger?.focus({preventScroll: true}),
          0,
        );
      }
    }
    emit(scope, open ? 'Project submenu opened' : 'Project submenu closed');
  });
}

function initializeModal(scope: DemoScope) {
  const floating = root(scope, '[data-modal-root]');
  const tooltip = root(scope, '[data-modal-tooltip-root]');
  const popover = root(scope, '[data-modal-popover-root]');
  const nestedModal = root(scope, '[data-nested-modal-root]');
  configure(floating, {
    middleware: [offset(20), shift({padding: 24})],
    plugins: [
      click(),
      // The backdrop owns the whole viewport. Keep the parent dialog open
      // while a nested popover handles an outside press on its own.
      dismiss({outsidePress: false}),
      role({role: 'dialog'}),
    ],
  });
  tooltip.middleware = [offset(12), flip(), shift({padding: 12})];
  popover.middleware = [offset(12), flip(), shift({padding: 18})];
  configure(nestedModal, {
    middleware: [offset(20), shift({padding: 24})],
    plugins: [click(), dismiss({outsidePress: false}), role({role: 'dialog'})],
  });
  scope.querySelector('[data-close-modal]')?.addEventListener('click', (event) => {
    close(floating, event);
  });
  scope
    .querySelector('[data-close-modal-popover]')
    ?.addEventListener('click', (event) => {
      close(popover, event);
    });
  scope
    .querySelector('[data-close-nested-modal]')
    ?.addEventListener('click', (event) => {
      close(nestedModal, event);
    });
  onOpenChange(floating, ({open}) => {
    emit(
      scope,
      open ? 'Modal trap activated' : 'Modal closed and focus restored',
    );
  });
}

function initializeCombobox(scope: DemoScope) {
  const floating = root(scope, '[data-combobox-root]');
  const input = scope.querySelector<HTMLInputElement>('#destination-search');
  const popup = scope.querySelector<HTMLElement>('[data-combobox-popup]');
  const status = scope.querySelector<HTMLElement>('#combobox-status');
  if (!input || !popup || !status) return;

  const source = createFuzzySearchSource(multilingualDestinations, {
    keys: multilingualSearchKeys,
    threshold: 0.35,
  });
  const search = new SearchController<MultilingualDestination>({
    source,
    getItemKey: (item) => item.id,
    debounceMs: 0,
  });
  const listRef = {current: [] as Array<HTMLElement | null>};
  let activeIndex: number | null = null;
  let selected: MultilingualDestination | null = null;

  const optionId = (index: number) =>
    `destination-option-${search.items[index]?.id ?? index}`;
  const setActive = (index: number | null) => {
    activeIndex = index;
    if (index == null) {
      input.removeAttribute('aria-activedescendant');
    } else {
      input.setAttribute('aria-activedescendant', optionId(index));
    }
    listRef.current.forEach((item, itemIndex) => {
      if (!item) return;
      item.dataset.active = String(itemIndex === index);
    });
    floating.controller.refresh();
  };
  const select = (item: MultilingualDestination) => {
    selected = item;
    input.value = item.label;
    search.setQuery(item.label);
    setActive(null);
    floating.open = false;
    emit(scope, `${item.label} selected`);
  };
  const render = () => {
    popup.replaceChildren();
    if (search.loading) {
      popup.append(createEmptyOption('Searching…'));
    } else if (search.error) {
      popup.append(createEmptyOption('Search failed.'));
    } else if (!search.items.length) {
      popup.append(
        createEmptyOption(`No destination found for “${search.query}”`),
      );
    } else {
      search.items.forEach((item, index) => {
        const option = document.createElement('div');
        option.id = optionId(index);
        option.className = 'combobox-option';
        option.role = 'option';
        option.dataset.active = String(activeIndex === index);
        option.setAttribute('aria-selected', String(selected?.id === item.id));
        option.innerHTML =
          `<span><strong>${item.label}</strong><small>${item.region}</small></span>` +
          `<span class="language-badge">${item.language}</span>`;
        option.addEventListener('mousedown', (event) => event.preventDefault());
        option.addEventListener('click', () => select(item));
        popup.append(option);
      });
    }
    listRef.current = [
      ...popup.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'),
    ];
    status.textContent = floating.open
      ? search.items.length
        ? `${search.items.length} destinations available`
        : `No destinations found for ${search.query}`
      : selected
        ? `${selected.label} selected`
        : 'Destination suggestions closed';
    floating.controller.refresh();
  };

  configure(floating, {
    middleware: [offset(8), flip(), shift({padding: 18})],
    plugins: [
      dismiss(),
      role(() => ({
        role: 'combobox',
        activeIndex,
        getItemId: optionId,
      })),
      listNavigation(() => ({
        listRef,
        activeIndex,
        virtual: true,
        loop: true,
        allowEscape: true,
        focusItemOnOpen: false,
        onNavigate: setActive,
      })),
    ],
  });

  search.subscribe(render);
  input.addEventListener('focus', () => {
    floating.open = true;
  });
  input.addEventListener('input', () => {
    setActive(null);
    floating.open = true;
    search.setQuery(input.value);
  });
  input.addEventListener('compositionstart', () => search.startComposition());
  input.addEventListener('compositionend', () => search.endComposition(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || activeIndex == null) return;
    const item = search.items[activeIndex];
    if (!item) return;
    event.preventDefault();
    select(item);
  });
  scope.querySelectorAll<HTMLElement>('[data-search-sample]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.searchSample ?? '';
      floating.open = true;
      search.setQuery(input.value);
      input.focus();
    });
  });
  onOpenChange(floating, ({open}) => {
    if (!open) setActive(null);
    render();
  });
}

function createEmptyOption(message: string) {
  const element = document.createElement('div');
  element.className = 'combobox-empty';
  element.role = 'option';
  element.setAttribute('aria-disabled', 'true');
  element.textContent = message;
  return element;
}

function initializePlacement(scope: DemoScope) {
  const floating = root(scope, '[data-placement-root]');
  floating.middleware = [offset(18)];
  const panel = scope.querySelector<HTMLElement>('.placement-floating');
  const constant = scope.querySelector<HTMLElement>('[data-placement-constant]');
  const value = scope.querySelector<HTMLElement>('[data-placement-value]');
  scope.querySelectorAll<HTMLButtonElement>('[data-placement-control]').forEach((button) => {
    button.addEventListener('click', () => {
      const placement = button.dataset.placementControl as Placement;
      floating.placement = placement;
      scope.querySelectorAll<HTMLButtonElement>('[data-placement-control]').forEach((control) => {
        const selected = control === button;
        control.classList.toggle('is-selected', selected);
        control.setAttribute('aria-pressed', String(selected));
      });
      const name = placement.toUpperCase().replace('-', '_');
      if (constant) constant.textContent = `PLACEMENT.${name}`;
      if (value) value.textContent = placement;
      if (panel) panel.textContent = placement;
      void floating.updatePosition();
    });
  });
}

function initializeMiddleware(scope: DemoScope) {
  const offsetZero = root(scope, '[data-offset-root="0"]');
  const offsetTen = root(scope, '[data-offset-root="10"]');
  offsetZero.middleware = [offset(0)];
  offsetTen.middleware = [offset(10)];

  const shiftStage = scope.querySelector<HTMLElement>('.mw-stage-shift');
  const shiftRoot = root(scope, '[data-shift-root]');
  shiftRoot.middleware = [
    shift({boundary: shiftStage ?? undefined, padding: 8, rootBoundary: 'document'}),
  ];

  const flipStage = scope.querySelector<HTMLElement>('.mw-stage-flip');
  const flipRoot = root(scope, '[data-flip-root]');
  flipRoot.middleware = [
    offset(8),
    flip({boundary: flipStage ?? undefined, padding: 8, rootBoundary: 'document'}),
  ];

  const arrowStage = scope.querySelector<HTMLElement>('.mw-stage-arrow');
  const arrowRoot = root(scope, '[data-arrow-root]');
  const arrowElement = scope.querySelector<HTMLElement>('floating-arrow');
  arrowRoot.middleware = [
    offset(10),
    shift({boundary: arrowStage ?? undefined, padding: 8, rootBoundary: 'document'}),
    ...(arrowElement ? [arrow({element: arrowElement, padding: 8})] : []),
  ];

  const sizeStage = scope.querySelector<HTMLElement>('.mw-stage-size');
  const sizeRoot = root(scope, '[data-size-root]');
  sizeRoot.middleware = [
    offset(8),
    size({
      boundary: sizeStage ?? undefined,
      padding: 8,
      rootBoundary: 'document',
      apply({availableWidth, availableHeight, elements}) {
        Object.assign(elements.floating.style, {
          maxWidth: `${Math.max(0, availableWidth)}px`,
          maxHeight: `${Math.max(0, availableHeight)}px`,
        });
      },
    }),
  ];

  const autoStage = scope.querySelector<HTMLElement>('.mw-stage-auto-placement');
  const autoRoot = root(scope, '[data-auto-placement-root]');
  autoRoot.middleware = [
    autoPlacement({
      boundary: autoStage ?? undefined,
      padding: 8,
      rootBoundary: 'document',
    }),
  ];

  const hideStage = scope.querySelector<HTMLElement>('.mw-stage-hide');
  const hideRoot = root(scope, '[data-hide-root]');
  hideRoot.middleware = [
    offset(8),
    hide({boundary: hideStage ?? undefined, rootBoundary: 'document'}),
    hide({
      boundary: hideStage ?? undefined,
      strategy: 'escaped',
      rootBoundary: 'document',
    }),
  ];

  const withoutInline = root(scope, '[data-inline-root="without"]');
  const withInline = root(scope, '[data-inline-root="with"]');
  withoutInline.middleware = [offset(8)];
  withInline.middleware = [inline(), offset(8)];

  const syncObservableState = async () => {
    await Promise.all([
      flipRoot.updatePosition(),
      autoRoot.updatePosition(),
      hideRoot.updatePosition(),
    ]);
    const flipPanel = flipRoot.floatingElement;
    const autoPanel = autoRoot.floatingElement;
    if (flipPanel) {
      flipPanel.dataset.placement = flipRoot.controller.position.placement;
      flipPanel.textContent = `Final: ${flipRoot.controller.position.placement}`;
    }
    if (autoPanel) {
      autoPanel.dataset.placement = autoRoot.controller.position.placement;
      autoPanel.textContent = `Final: ${autoRoot.controller.position.placement}`;
    }
    const data = hideRoot.controller.position.middlewareData.hide as
      | {referenceHidden?: boolean; escaped?: boolean}
      | undefined;
    const referenceHidden = Boolean(data?.referenceHidden);
    const escaped = Boolean(data?.escaped);
    const panel = hideRoot.floatingElement;
    panel?.setAttribute('data-reference-hidden', String(referenceHidden));
    panel?.setAttribute('data-escaped', String(escaped));
    const readout = scope.querySelector<HTMLElement>(
      '[data-middleware-example="hide"] .mw-state-readout',
    );
    if (readout) {
      readout.textContent = `State: ${
        referenceHidden
          ? 'reference hidden'
          : escaped
            ? 'floating escaped'
            : 'attached'
      }`;
    }
  };

  [flipStage, autoStage, hideStage].forEach((stage) => {
    stage?.addEventListener('scroll', () => void syncObservableState());
  });
  requestAnimationFrame(() => {
    if (shiftStage) shiftStage.scrollLeft = 360;
    if (flipStage) flipStage.scrollTop = 160;
    if (arrowStage) arrowStage.scrollLeft = 520;
    if (sizeStage) sizeStage.scrollTop = 210;
    if (autoStage) autoStage.scrollTop = 130;
    if (hideStage) hideStage.scrollTop = 160;
    void Promise.all([
      shiftRoot.updatePosition(),
      arrowRoot.updatePosition(),
      sizeRoot.updatePosition(),
      withoutInline.updatePosition(),
      withInline.updatePosition(),
      syncObservableState(),
    ]);
  });

  if (window.location.hash === '#hide') {
    requestAnimationFrame(() => {
      scope.querySelector('#hide')?.scrollIntoView({block: 'center'});
    });
  }
}

const initializers: Record<string, (scope: DemoScope) => void> = {
  tooltip: initializeTooltip,
  popover: initializePopover,
  menu: initializeMenu,
  'client-point': initializeClientPoint,
  'nested-menu': initializeNestedMenu,
  modal: initializeModal,
  combobox: initializeCombobox,
  placement: initializePlacement,
  middleware: initializeMiddleware,
};

export function initializeDemos(rootNode: ParentNode = document) {
  rootNode.querySelectorAll<DemoScope>('[data-demo]').forEach((scope) => {
    if (scope.dataset.initialized === 'true') return;
    const name = scope.dataset.demo;
    const initialize = name ? initializers[name] : undefined;
    if (!initialize) return;
    initialize(scope);
    scope.dataset.initialized = 'true';
  });
}
