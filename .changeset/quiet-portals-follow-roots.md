---
'@floating-ui-plus/web': patch
'@floating-ui-plus/web-components': patch
'@floating-ui-plus/vue': patch
---

Document the current controller, component, and `SearchController` APIs,
explain how Plus extends Floating UI, and make `FloatingPortal` follow the
nearest `FloatingRoot` open state automatically so Vue consumers no longer
need to repeat `v-if` or `:active` for floating surfaces.
