---
'@floating-ui-plus/web': minor
'@floating-ui-plus/web-components': minor
'@floating-ui-plus/vue': minor
---

Add a framework-neutral `ComboboxController` that composes search with input,
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
Document the same composition with local fuzzy and asynchronous server-search
examples in both Web Components and Vue demos.

Add `FloatingRootElement.configure()` for setting middleware and plugin
functions together without application-owned assignment helpers.
