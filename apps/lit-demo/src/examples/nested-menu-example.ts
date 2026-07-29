import {html, LitElement, nothing} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {
  autoUpdate,
  click,
  dismiss,
  flip,
  FloatingController,
  FloatingTree,
  hover,
  listNavigation,
  offset,
  role,
  safePolygon,
  shift,
  type OpenChangeReason,
  typeahead,
} from '@floating-ui/lit';

const ROOT_NODE_ID = 'nested-menu-root';
const PROJECTS_NODE_ID = 'nested-menu-projects';
const rootLabels = ['New note', 'Move to project', 'Archive'];
const projectLabels = ['Atlas', 'Field research', 'Signals'];

class LitNestedMenuExample extends LitElement {
  static properties = {
    rootOpen: {state: true},
    rootActiveIndex: {state: true},
    projectsOpen: {state: true},
    projectActiveIndex: {state: true},
  };

  rootOpen = false;
  rootActiveIndex: number | null = null;
  projectsOpen = false;
  projectActiveIndex: number | null = null;

  private readonly tree = new FloatingTree();
  private registrations: Array<{unregister(): void}> = [];
  private readonly rootElements = {
    current: [] as Array<HTMLElement | null>,
  };
  private readonly rootText = {
    current: rootLabels as Array<string | null>,
  };
  private readonly projectElements = {
    current: [] as Array<HTMLElement | null>,
  };
  private readonly projectText = {
    current: projectLabels as Array<string | null>,
  };
  private readonly rootItemRefs = rootLabels.map(
    (_, index) => (element?: Element) => {
      this.rootElements.current[index] = (element as HTMLElement) || null;
    },
  );
  private readonly projectItemRefs = projectLabels.map(
    (_, index) => (element?: Element) => {
      this.projectElements.current[index] =
        (element as HTMLElement) || null;
    },
  );

  private readonly rootMenu = new FloatingController(this, () => ({
    open: this.rootOpen,
    onOpenChange: (open, event, reason) => {
      this.rootOpen = open;
      if (!open) {
        this.rootActiveIndex = null;
        this.tree.closeDescendants(
          ROOT_NODE_ID,
          event,
          reason ?? 'focus-out',
        );
      }
      this.emitAction(open ? 'Nested menu opened' : 'Nested menu closed');
    },
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({padding: 18})],
    whileElementsMounted: autoUpdate,
  })).pipe(
    click(),
    dismiss({
      escapeKey: false,
      outsidePress: (event) =>
        !(event.target instanceof Element) ||
        !event.target.closest('.nested-menu-submenu'),
    }),
    role({role: 'menu'}),
    listNavigation(() => ({
      listRef: this.rootElements,
      activeIndex: this.rootActiveIndex,
      loop: true,
      onNavigate: (index) => {
        this.rootActiveIndex = index;
        if (index !== 1 && this.projectsOpen) {
          this.projectsMenu.context.onOpenChange(
            false,
            undefined,
            'focus-out',
          );
        }
      },
    })),
    typeahead(() => ({
      listRef: this.rootText,
      activeIndex: this.rootActiveIndex,
      onMatch: (index) => {
        this.rootActiveIndex = index;
        this.rootElements.current[index]?.focus({preventScroll: true});
      },
    })),
  );

  private readonly projectsMenu = new FloatingController(this, () => ({
    open: this.projectsOpen,
    onOpenChange: (open, event, reason) => {
      this.projectsOpen = open;
      if (!open) {
        this.projectActiveIndex = null;
        if (reason === 'escape-key' || reason === 'focus-out') {
          queueMicrotask(() => {
            this.rootElements.current[1]?.focus({preventScroll: true});
          });
        }
      }
      this.emitAction(
        open ? 'Project submenu opened' : 'Project submenu closed',
      );
    },
    placement: 'right-start',
    middleware: [offset({mainAxis: 6, alignmentAxis: -6}), flip(), shift({
      padding: 18,
    })],
    whileElementsMounted: autoUpdate,
  })).pipe(
    click(),
    hover({move: false, delay: {open: 80, close: 120}, handleClose: safePolygon()}),
    dismiss(),
    role({role: 'menu'}),
    listNavigation(() => ({
      listRef: this.projectElements,
      activeIndex: this.projectActiveIndex,
      nested: true,
      loop: true,
      onNavigate: (index) => {
        this.projectActiveIndex = index;
      },
    })),
    typeahead(() => ({
      listRef: this.projectText,
      activeIndex: this.projectActiveIndex,
      onMatch: (index) => {
        this.projectActiveIndex = index;
        this.projectElements.current[index]?.focus({preventScroll: true});
      },
    })),
  );

  connectedCallback() {
    super.connectedCallback();
    if (this.registrations.length === 0) {
      this.registrations = [
        this.tree.register(this.rootMenu, {id: ROOT_NODE_ID}),
        this.tree.register(this.projectsMenu, {
          id: PROJECTS_NODE_ID,
          parentId: ROOT_NODE_ID,
        }),
      ];
    }
  }

  disconnectedCallback() {
    this.registrations.splice(0).forEach(({unregister}) => unregister());
    super.disconnectedCallback();
  }

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <article class="demo-card nested-menu-card">
        <div class="card-top">
          <span class="number">T</span>
          <span class="chip">${this.tree.nodes.length} tree nodes</span>
        </div>
        <h3>Nested command tree</h3>
        <p>
          Open “Move to project” with hover, click, or ArrowRight. Escape
          returns focus to its parent item.
        </p>
        <div class="card-action">
          <button class="dark-button" ${this.rootMenu.reference()}>
            Open actions <span aria-hidden="true">⌄</span>
          </button>
          ${this.rootOpen
            ? this.rootMenu.portal(html`
                <div
                  class="menu-panel nested-menu-root"
                  ${this.rootMenu.floating()}
                  @keydown=${this.handleRootKeyDown}
                >
                  <div class="menu-heading">Tree coordinated actions</div>
                  ${rootLabels.map(
                    (label, index) => html`
                      <button
                        class="menu-item"
                        role="menuitem"
                        tabindex=${this.rootActiveIndex === index ? 0 : -1}
                        data-active=${this.rootActiveIndex === index
                          ? 'true'
                          : 'false'}
                        aria-haspopup=${index === 1 ? 'menu' : nothing}
                        ${ref(this.rootItemRefs[index])}
                        ${this.rootMenu.item({
                          active: this.rootActiveIndex === index,
                          index,
                          label,
                          value: label,
                        })}
                        ${index === 1
                          ? this.projectsMenu.reference()
                          : nothing}
                        @keydown=${index === 1
                          ? this.handleProjectsReferenceKeyDown
                          : nothing}
                        @click=${index === 1
                          ? nothing
                          : (event: Event) =>
                              this.selectRoot(index, event)}
                      >
                        <span>${label}</span>
                        ${index === 1
                          ? html`<kbd aria-hidden="true">→</kbd>`
                          : html`<kbd>${index + 1}</kbd>`}
                      </button>
                    `,
                  )}
                </div>
              `)
            : nothing}
          ${this.projectsOpen
            ? this.projectsMenu.portal(html`
                <div
                  class="menu-panel nested-menu-submenu"
                  ${this.projectsMenu.floating()}
                  @keydown=${this.handleProjectsKeyDown}
                >
                  <div class="menu-heading">Choose a project</div>
                  ${projectLabels.map(
                    (label, index) => html`
                      <button
                        class="menu-item"
                        role="menuitem"
                        tabindex=${this.projectActiveIndex === index ? 0 : -1}
                        data-active=${this.projectActiveIndex === index
                          ? 'true'
                          : 'false'}
                        ${ref(this.projectItemRefs[index])}
                        ${this.projectsMenu.item({
                          active: this.projectActiveIndex === index,
                          index,
                          label,
                          value: label,
                        })}
                        @click=${(event: Event) =>
                          this.selectProject(index, event)}
                      >
                        <span>${label}</span><kbd>${index + 1}</kbd>
                      </button>
                    `,
                  )}
                </div>
              `)
            : nothing}
        </div>
        <code>FloatingTree.register() + closeDescendants()</code>
      </article>
    `;
  }

  private readonly handleRootKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !this.projectsOpen) {
      event.preventDefault();
      this.rootMenu.context.onOpenChange(false, event, 'escape-key');
    }
  };

  private readonly handleProjectsReferenceKeyDown = (
    event: KeyboardEvent,
  ) => {
    if (event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    this.projectsMenu.context.onOpenChange(true, event, 'list-navigation');
    void this.focusFirstProject();
  };

  private readonly handleProjectsKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft') return;
    event.preventDefault();
    event.stopPropagation();
    this.projectsMenu.context.onOpenChange(false, event, 'focus-out');
  };

  private selectRoot(index: number, event: Event) {
    this.emitAction(`${rootLabels[index]} selected`);
    this.rootMenu.context.onOpenChange(false, event, 'click');
  }

  private async focusFirstProject() {
    await this.updateComplete;
    this.projectActiveIndex = 0;
    await this.updateComplete;
    this.projectElements.current[0]?.focus({preventScroll: true});
  }

  private selectProject(index: number, event: Event) {
    this.emitAction(`Moved to ${projectLabels[index]}`);
    this.rootMenu.context.onOpenChange(false, event, 'click');
  }

  private emitAction(message: string) {
    this.dispatchEvent(
      new CustomEvent('floating-demo-action', {
        detail: message,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define('lit-nested-menu-example', LitNestedMenuExample);
