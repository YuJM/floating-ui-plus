# @floating-ui/vue

## 0.6.0

### Minor Changes

- 66bcfba: Add a framework-neutral `ComboboxController` that composes search with input,
  IME, active-option ARIA, selection, and navigation behavior, including shared
  input, option, and navigation binding props for renderer adapters.
  Expose framework-neutral search phases for idle, loading, error, empty, and
  result rendering. A blank query reports `results` when its source returns
  items, reserving `idle` for a blank query without results. Re-export
  it from Web Components, add a renderless `<floating-combobox>` element with
  automatic virtual `<floating-list>` and `<floating-list-item>` option binding,
  and add a Vue `useCombobox()` adapter that consumes the same props so editable
  fuzzy-search examples no longer repeat event or ARIA wiring.

  Add `createSearchRenderer()` for direct DOM and Custom Element integrations.
  It owns the search subscription, phase dispatch, and bound-container updates
  while applications retain their own result nodes and state-specific copy.

  Add declarative `<floating-search>` phase templates for Web Components. It
  repeats result templates, binds item/search text, and supplies generated
  `<floating-list-item>` labels and values so consumers no longer write DOM
  factories or portal-mount rendering code.
  `configure()` also accepts phase-keyed status messages so live-region updates
  do not require an application-owned subscription or nested status conditionals.
  It can receive `SearchOptions` and own the resulting controller, allowing local
  fuzzy and async server sources to use the same declarative composition. An
  existing application-owned `SearchController` remains supported.
  Vue now provides the equivalent renderless `FloatingSearch` named-slot
  component, while `useCombobox()` exposes `statusText` and
  `getQueryTriggerProps()` from the same framework-neutral status and query
  binding contracts.
  When an existing result set refreshes or loads another page, its render phase
  remains `results` while `loading` is true, so Web, Web Components, and Vue can
  retain visible list items and present a non-blocking loading indicator.
  Document the same composition with local fuzzy and asynchronous server-search
  examples in both Web Components and Vue demos.
  Keep ordinary anchored examples in their local DOM and reserve
  `floating-portal` for surfaces that explicitly need a body-level layer.
  Add checked root lookup, own-root event subscriptions, and controller-backed
  closing to `FloatingRootElement` so direct DOM consumers do not need local
  lifecycle wrapper utilities.

  Add `FloatingRootElement.configure()` for setting middleware and plugin
  functions together without application-owned assignment helpers.

  Add a framework-neutral `FloatingTopLayerController` for native modal Dialog
  lifecycle. Native top layers are inferred from real `<dialog>` surfaces, so
  modal Web Components and Vue composition does not need a root-level
  `top-layer` setting; explicit values remain an escape hatch. Web Components
  use a root-owned `<template slot="content">` for normal conditional surfaces,
  keeping them inert before Custom Element registration and promoting them to a
  native Popover where supported. A direct native dialog remains the exception
  because the browser already hides it while closed. `data-fup-content` remains
  as a compatibility alias for the public content slot.

  Allow `floating-content` to register as the nearest Web Components root's
  surface even when it is composed inside another behavior element such as
  `floating-combobox`. It remains available for advanced always-mounted
  composition, while ordinary overlays and combobox result surfaces use the
  portal/template pattern and retain native search phase templates.

  Add a framework-neutral combobox `getItemValue()` contract. Web Components
  `floating-combobox` is form-associated and submits its selected value through
  `name`, participates in `required` validation, and restores its configured
  selection on native form reset. Vue exposes the same selected value ref for a
  hidden native form input.

  Add framework-neutral external query activation and a declarative Web
  Components `query-trigger-selector`, so query preset buttons no longer repeat
  query, open, and input-focus event wiring or masquerade as result list items.

  Add declarative cursor-page controls to Web Components `floating-search`:
  `template[data-search-more]` renders only while another page is available, and
  its `data-search-load-more` control delegates to the shared
  `SearchController.loadMore()` lifecycle.

  Expose the shared search pending state on combobox input props as `aria-busy`
  and `data-loading`. Web Components mirrors it on the combobox host and bound
  input, while Vue adds a reactive `combobox.loading` projection for input-level
  pending UI.

  `SearchOptions.source` now also accepts an application-owned async request
  function directly. The package does not prescribe a network client, endpoint,
  response protocol, or pagination transport; the function adapts any chosen
  communication layer to the small search-page result shape.

### Patch Changes

- 66bcfba: Document the current controller, component, and `SearchController` APIs,
  explain how Plus extends Floating UI, and make `FloatingPortal` follow the
  nearest `FloatingRoot` open state automatically so Vue consumers no longer
  need to repeat `v-if` or `:active` for floating surfaces.
- Updated dependencies [66bcfba]
- Updated dependencies [66bcfba]
  - @floating-ui-plus/web@0.6.0

## 0.5.0

### Minor Changes

- Add removable component-owned plugins, declarative list navigation and
  typeahead, nested reference items, and `FloatingClose` so conventional Vue
  menus, dialogs, and Comboboxes no longer need manual element-ref arrays,
  roving tabindex state, or close handlers.

  Keep nested Teleport targets inside modal focus traps so pointer interaction
  and focus restoration continue to work with subtree isolation.

### Patch Changes

- Updated dependencies [a9ca2cc]
- Updated dependencies [56b5d88]
  - @floating-ui-plus/web@0.5.0

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

## 2.0.1

### Patch Changes

- fix: support explicit `undefined` for optional properties with `exactOptionalPropertyTypes`
- Update dependencies: `@floating-ui/dom@1.8.0`, `@floating-ui/utils@0.2.12`

## 2.0.0

### Major Changes

- breaking: drop the abandoned and soon-to-be-deprecated `vue-demi` package (see [Deprecation Warning](https://github.com/vueuse/vue-demi/pull/270)), ending support for Vue 2 and Vue <3.3.0

## 1.1.11

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.7.6`, `@floating-ui/utils@0.2.11`

## 1.1.10

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.7.5`

## 1.1.9

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.7.4`

## 1.1.8

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.7.3`

## 1.1.7

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.10`, `@floating-ui/dom@1.7.2`

## 1.1.6

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.9`

## 1.1.5

### Patch Changes

- fix(useFloating): avoid setting `isPositioned` to true when `open` is false
- Update dependencies: `@floating-ui/utils@0.2.8`

## 1.1.4

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.7`

## 1.1.3

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.6`

## 1.1.2

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.5`

## 1.1.1

### Patch Changes

- fix: ensure `MaybeReadonlyRefOrGetter` works in earlier versions of Vue

## 1.1.0

### Minor Changes

- feat: support `MaybeReadonlyRefOrGetter` in `useFloating`

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.4`

## 1.0.7

### Patch Changes

- Update dependencies: `@floating-ui/utils@0.2.3`

## 1.0.6

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.6.1`

## 1.0.5

### Patch Changes

- Update dependencies: `@floating-ui/dom@1.6.0`

## 1.0.4

### Patch Changes

- de70c04: fix: change `isComponentPublicInstance` implementation

## 1.0.3

### Patch Changes

- 4c04669: chore: exports .d.mts types, solves #2472
- 62a5242: fix: do not throw when component type reference or floating renders nothing
- Updated dependencies [4c04669]
- Updated dependencies [0d18e37]
- Updated dependencies [afb7e5e]
  - @floating-ui/utils@0.2.0
  - @floating-ui/dom@1.5.4
