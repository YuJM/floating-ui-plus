---
"@floating-ui-plus/web-components": minor
"@floating-ui-plus/web": patch
---

Add declarative list navigation, typeahead, and selector-based item discovery
to `floating-list`, and let `data-fup-close` controls close their owning
floating surface without template mount listeners.

Keep dynamically mounted nested portal targets inside modal focus traps so
`outside-elements-inert` does not block their focus or pointer interactions.
