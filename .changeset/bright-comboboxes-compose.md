---
'@floating-ui-plus/web': minor
'@floating-ui-plus/web-components': minor
'@floating-ui-plus/vue': minor
---

Add a framework-neutral `ComboboxController` that composes search with input,
IME, active-option ARIA, selection, and navigation behavior, including shared
input, option, and navigation binding props for renderer adapters. Re-export
it from Web Components, add a renderless `<floating-combobox>` element with
automatic virtual `<floating-list>` and `<floating-list-item>` option binding,
and add a Vue `useCombobox()` adapter that consumes the same props so editable
fuzzy-search examples no longer repeat event or ARIA wiring.
