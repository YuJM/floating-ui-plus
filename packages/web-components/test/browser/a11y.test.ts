import axe from 'axe-core';
import {afterEach, describe, expect, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

describe('browser example accessibility', () => {
  test('tooltip, dialog, menu, listbox, and combobox have no axe violations', async () => {
    document.body.innerHTML = `
      <main>
        <button aria-describedby="tooltip">Help</button>
        <div id="tooltip" role="tooltip">Helpful text</div>

        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h2 id="dialog-title">Settings</h2>
          <button>Close</button>
        </div>

        <button aria-haspopup="menu" aria-expanded="true" aria-controls="menu">
          Actions
        </button>
        <div id="menu" role="menu" aria-label="Actions">
          <button role="menuitem">Edit</button>
        </div>

        <label id="fruit-label">Fruit</label>
        <div role="listbox" aria-labelledby="fruit-label">
          <div role="option" aria-selected="true">Apple</div>
        </div>

        <label for="city">City</label>
        <input
          id="city"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="cities"
        />
        <div id="cities" role="listbox" aria-label="Cities">
          <div role="option" aria-selected="false">Seoul</div>
        </div>
      </main>
    `;

    const result = await axe.run(document.body, {
      rules: navigator.userAgent.includes('jsdom')
        ? {'color-contrast': {enabled: false}}
        : {},
    });
    expect(result.violations).toEqual([]);
  });
});
