# @floating-ui/vue

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
