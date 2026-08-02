---
'@floating-ui-plus/web': patch
'@floating-ui-plus/web-components': patch
---

Preserve authored Popover insets and connect presence-stack top-layer surfaces after they are mounted, fixing native Popover toast geometry in Safari. Dynamic result items now also keep their rendered option IDs in sync with `aria-activedescendant` while prior items disconnect.
