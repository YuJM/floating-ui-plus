import {readdir, readFile} from 'node:fs/promises';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {TextBy} from '@comneed/textby';

type DocEntry = {
  title: string;
  description: string;
  href: string;
  group: string;
};

const appRoot = resolve(dirname(import.meta.path), '..');
const docsRoot = join(appRoot, 'src/content/docs/docs');
const outputPath = join(appRoot, 'public/llms.txt');
const siteUrl = (process.env.PUBLIC_SITE_URL ?? 'https://fup.polcaneli.com').replace(/\/$/, '');

function frontmatterValue(source: string, key: string) {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? collectMarkdownFiles(path)
        : entry.name.endsWith('.mdx')
          ? Promise.resolve([path])
          : Promise.resolve([]);
    }),
  );
  return files.flat();
}

function toDocEntry(path: string, source: string): DocEntry {
  const relativePath = relative(docsRoot, path).split(sep).join('/');
  const routePath = relativePath
    .replace(/(^|\/)index\.mdx$/, '$1')
    .replace(/\.mdx$/, '')
    .replace(/\/$/, '');
  const route = routePath ? `/docs/${routePath}` : '/docs';
  const segments = relativePath.split('/');
  const group = segments[0] === 'guides'
    ? segments[1] === 'styling'
      ? 'Styling'
      : segments[1] === 'demo'
        ? 'Demos'
        : 'Guides'
    : 'Overview';

  return {
    title: frontmatterValue(source, 'title') || route.split('/').at(-1) || 'Documentation',
    description: frontmatterValue(source, 'description'),
    href: `${siteUrl}${route || '/docs'}`,
    group,
  };
}

const template = `# Floating UI Plus

> Framework-neutral floating UI primitives for Web, Web Components, and Vue.
Use this index to find the documentation most relevant to an implementation.

## Packages
- [Web](https://www.npmjs.com/package/@floating-ui-plus/web): Framework-neutral positioning and interaction kernel.
- [Web Components](https://www.npmjs.com/package/@floating-ui-plus/web-components): Custom Elements adapter for floating surfaces.
- [Vue](https://www.npmjs.com/package/@floating-ui-plus/vue): Vue adapter with reactive bindings and list interactions.

{% for group in groups %}
## {{ group.name }}
{% for doc in group.docs %}
- [{{ doc.title }}]({{ doc.href }}){% if doc.description %}: {{ doc.description }}{% endif %}
{% endfor %}
{% endfor %}
`;

const files = await collectMarkdownFiles(docsRoot);
const entries = (await Promise.all(files.map(async (path) =>
  toDocEntry(path, await readFile(path, 'utf8')),
))).sort((a, b) => a.href.localeCompare(b.href));

const groupOrder = ['Overview', 'Guides', 'Styling', 'Demos'];
const groups = groupOrder
  .map((name) => ({name, docs: entries.filter((entry) => entry.group === name)}))
  .filter((group) => group.docs.length > 0);

const textby = new TextBy();
await textby.renderToFile({
  template,
  data: {groups},
  output: outputPath,
});

console.log(`Generated ${outputPath} from ${entries.length} documentation pages.`);
