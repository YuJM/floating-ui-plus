import {describe, expect, test} from 'bun:test';

import {exampleHref, resolveFramework} from '../../src/demo-registry';

describe('demo route state', () => {
  test('uses Web Components when the framework query is absent or invalid', () => {
    expect(resolveFramework(null)).toBe('web-components');
    expect(resolveFramework('wc')).toBe('web-components');
    expect(resolveFramework('web-components')).toBe('web-components');
    expect(resolveFramework('react')).toBe('web-components');
  });

  test('keeps the example path while selecting a framework', () => {
    expect(exampleHref('tooltip', 'web-components')).toBe(
      '/tooltip?framework=wc',
    );
    expect(exampleHref('tooltip', 'vue')).toBe('/tooltip?framework=vue');
  });
});
