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
Vue now provides the equivalent renderless `FloatingSearch` named-slot
component, while `useCombobox()` exposes `statusText` and
`getQueryTriggerProps()` from the same framework-neutral status and query
binding contracts.
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
