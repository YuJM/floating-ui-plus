---
"@floating-ui-plus/web": minor
"@floating-ui-plus/web-components": patch
"@floating-ui-plus/vue": patch
---

Treat `offset()` as the user-requested visual gap when a Plus Arrow slot is
present. The Web controller now adds the Arrow height on the main axis while
preserving upstream `offset()` and `arrow()` behavior for renderers without a
registered Arrow slot. Web Components and Vue register their Arrow element and
height with the shared Floating context.
