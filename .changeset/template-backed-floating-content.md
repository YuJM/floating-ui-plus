---
"@floating-ui-plus/web-components": minor
"@floating-ui-plus/web": patch
---

Add native-template conditional rendering to `floating-content`. A direct
`template` remains inert while closed, is cloned into Light DOM while open, and
is removed on close. Expose the native template and its `content` fragment from
`FloatingContentElement`, and bind direct children only while their root is
open.

Ignore stale asynchronous position measurements after a reference or floating
element unmounts.
