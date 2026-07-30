---
"@floating-ui-plus/web-components": patch
---

Web Components의 내부 구현을 Lit에서 Atomico로 전환했습니다. 포털은 루트의 `open` 컨텍스트가 실제로 전달된 뒤에만 자식을 target으로 옮기며, 이동된 트리에도 루트·트리·부모 노드·스코프 컨텍스트를 다시 제공합니다.
