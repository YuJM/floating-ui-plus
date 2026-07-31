# @floating-ui-plus/web-components

## 1.0.0

### Major Changes

- 56b5d88: Replace `floating-content` with native conditional templates. A
  `floating-portal` automatically marks its single owned template with
  `data-fup-content`; explicit markers support ambiguous portals and non-portal
  composition. Roots expose `contentTemplate`, and templates emit
  `floatingmount` and `floatingunmount` for fresh-clone initialization.
  Plugins and interaction properties assigned after a root connects now replace
  their active bindings, supporting applications that register Custom Elements
  before their configuration modules run.

  Ignore stale asynchronous position measurements after a reference or floating
  element unmounts.

### Minor Changes

- a9ca2cc: Add declarative list navigation, typeahead, and selector-based item discovery
  to `floating-list`, and let `data-fup-close` controls close their owning
  floating surface without template mount listeners.

  Keep dynamically mounted nested portal targets inside modal focus traps so
  `outside-elements-inert` does not block their focus or pointer interactions.

### Patch Changes

- Updated dependencies [a9ca2cc]
- Updated dependencies [56b5d88]
  - @floating-ui-plus/web@0.4.1

## 0.4.0

### Minor Changes

- 6b9be9c: Provide the default dialog ARIA relationship for every floating controller and
  its Web Components and Vue bindings. Specific `role()` patterns continue to
  override the default, and `role({enabled: false})` opts out.

### Patch Changes

- 6b9be9c: Treat `offset()` as the user-requested visual gap when a Plus Arrow slot is
  present. The Web controller now adds the Arrow height on the main axis while
  preserving upstream `offset()` and `arrow()` behavior for renderers without a
  registered Arrow slot. Web Components and Vue register their Arrow element and
  height with the shared Floating context.
- 5c2efea: Web Components의 내부 구현을 Lit에서 Atomico로 전환했습니다. 포털은 루트 컨텍스트가 전달되면 `open` 상태와 독립적으로 target과 자식을 한 번만 준비하며, 열린 상태는 surface visibility로 반영합니다. Vue와 Web Components의 중첩 포털은 부모 포털 아래에 target을 만들고, 이동된 트리에는 루트·트리·부모 노드·스코프 컨텍스트를 다시 제공합니다. 포커스 매니저는 닫힘과 같은 틱에 언마운트되어도 트리거로 포커스를 복원합니다.
- Updated dependencies [6b9be9c]
- Updated dependencies [5c2efea]
- Updated dependencies [6b9be9c]
  - @floating-ui-plus/web@0.4.0

## 0.3.0

### Minor Changes

- Shorten generated DOM markers to the `data-fup-*` namespace and expose a
  shared arrow marker across the framework-neutral, Web Components, and Vue
  packages. Vue's default arrow now also exposes its rendered SVG element for
  middleware composition while retaining slot-based visual customization.

### Patch Changes

- fix arrow
- Updated dependencies
- Updated dependencies
  - @floating-ui-plus/web@0.3.0

## 0.2.2

### Patch Changes

- update info
- Updated dependencies
  - @floating-ui-plus/web@0.2.2

## 0.2.1

### Patch Changes

- fix dependencies
- Updated dependencies
  - @floating-ui-plus/web@0.2.1

## 0.2.0

### Minor Changes

- 처음배포다

### Patch Changes

- aff40e1: Add packaged usage guides and improve package documentation.
- Updated dependencies [aff40e1]
- Updated dependencies
  - @floating-ui-plus/web@0.2.0
