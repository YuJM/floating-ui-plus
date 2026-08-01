---
'@floating-ui-plus/web-components': patch
'@floating-ui-plus/vue': patch
---

Make native top-layer selection explicit across adapters. Web Components keep
the template and native dialog contracts, while Vue surfaces now use
`top-layer="popover"` or `as="dialog"`; ARIA roles no longer implicitly
promote positioned content to the native Popover API.
