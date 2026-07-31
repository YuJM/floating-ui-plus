---
"@floating-ui-plus/web-components": major
"@floating-ui-plus/web": patch
---

Replace `floating-content` with native conditional templates. A
`floating-portal` automatically marks its single owned template with
`data-fup-content`; explicit markers support ambiguous portals and non-portal
composition. Roots expose `contentTemplate`, and templates emit
`floatingmount` and `floatingunmount` for fresh-clone initialization.
Plugins and interaction properties assigned after a root connects now replace
their active bindings, supporting applications that register Custom Elements
before their configuration modules run.

Ignore stale asynchronous position measurements after a reference or floating
element unmounts.
