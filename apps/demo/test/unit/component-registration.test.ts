import {describe, expect, test} from 'bun:test';

const layoutUrl = new URL('../../src/layouts/DemoLayout.astro', import.meta.url);

describe('Web Component registration order', () => {
  test('imports the registration module from the document head', async () => {
    const source = await Bun.file(layoutUrl).text();
    const head = source.slice(
      source.indexOf('<head>'),
      source.indexOf('</head>'),
    );
    const body = source.slice(source.indexOf('<body>'));

    expect(head).toContain("import '@floating-ui-plus/web-components';");
    expect(body).not.toContain(
      "import '@floating-ui-plus/web-components';",
    );
  });
});
