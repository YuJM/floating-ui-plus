import {html, LitElement} from 'lit';
import {afterEach, describe, expect, test} from 'vitest';

import {
  createFuzzySearchSource,
  SearchController,
} from '../../src/legacy';

interface Item {
  id: string;
  label: string;
  keywords: string[];
}

const tag = 'floating-ui-lit-search-controller-test';

class SearchFixture extends LitElement {
  search = new SearchController<Item>(this, {
    source: createFuzzySearchSource(
      [
        {id: 'seoul', label: '서울', keywords: ['seoul', 'seol']},
        {id: 'beijing', label: '北京', keywords: ['beijing']},
      ],
      {keys: [{name: 'label'}, {name: 'keywords', weight: 0.7}]},
    ),
    getItemKey: (item) => item.id,
    debounceMs: 0,
  });

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <output data-query=${this.search.query}>
        ${this.search.items.map((item) => item.label).join(',')}
      </output>
    `;
  }
}

if (!customElements.get(tag)) {
  customElements.define(tag, SearchFixture);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('Lit SearchController', () => {
  test('connects Web source state to the host lifecycle', async () => {
    const host = document.createElement(tag) as SearchFixture;
    document.body.append(host);
    await host.search.refresh();
    await host.updateComplete;
    expect(host.textContent).toContain('서울,北京');

    host.search.setQuery('bejing');
    await host.updateComplete;
    await Promise.resolve();
    await host.updateComplete;
    expect(host.textContent).toContain('北京');
    expect(host.querySelector('output')?.getAttribute('data-query')).toBe(
      'bejing',
    );
  });
});
