import {copyFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageNames = ['web', 'web-components', 'vue'] as const;
const demoSources = {
  'web-components': 'apps/demo/src/components/examples/FuzzyComboboxExample.astro',
  vue: 'apps/demo/src/vue/components/ExampleFuzzyCombobox.vue',
} as const;
const exampleGlobs = {
  'web-components': [
    'src/components/examples/**/*.astro',
    'src/components/PreviewFrame.astro',
    'src/layouts/DemoLayout.astro',
  ],
  vue: ['src/vue/components/**/*.vue', 'src/vue/views/**/*.vue'],
} as const;

type Adapter = keyof typeof exampleGlobs;

async function collectDemoImports(adapter: Adapter) {
  const runtime = new Set<string>();
  const types = new Set<string>();
  const files = new Set<string>();
  const expectedPackage = `@floating-ui-plus/${adapter}`;
  for (const pattern of exampleGlobs[adapter]) {
    for await (const relativePath of new Bun.Glob(pattern).scan(join(root, 'apps/demo'))) {
      const source = await Bun.file(join(root, 'apps/demo', relativePath)).text();
      let found = false;
      const imports = source.matchAll(
        /\bimport\s+(type\s+)?(?:\{([^}]+)\}\s+from\s+)?['"](@floating-ui-plus\/[^'"]+)['"]/g,
      );
      for (const [, typeOnly, specifiers, packageName] of imports) {
        if (packageName !== expectedPackage) {
          throw new Error(`${relativePath} imports ${packageName}; expected ${expectedPackage}`);
        }
        found = true;
        for (const raw of (specifiers ?? '').split(',')) {
          const name = raw.trim();
          if (!name) continue;
          const isType = Boolean(typeOnly) || name.startsWith('type ');
          const identifier = name.replace(/^type\s+/, '').trim();
          if (!/^[$A-Z_a-z][$\w]*$/.test(identifier)) {
            throw new Error(`Unsupported package import in ${relativePath}: ${name}`);
          }
          (isType ? types : runtime).add(identifier);
        }
      }
      if (found) files.add(relativePath);
    }
  }
  if (files.size < 10 || runtime.size === 0) {
    throw new Error(`Expected at least 10 ${adapter} demo files with package imports`);
  }
  return {runtime: [...runtime].sort(), types: [...types].sort(), files: [...files].sort()};
}

function floatingImports(source: string) {
  return [...source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*['"](@floating-ui-plus\/[^'"]+)['"]/g)]
    .map(([, names, packageName]) => ({
      packageName,
      names: names.split(',').map((name) => name.trim()).filter(Boolean).sort(),
    }));
}

async function verifyFixtureImports(adapter: keyof typeof demoSources) {
  const demo = floatingImports(await Bun.file(join(root, demoSources[adapter])).text());
  const fixture = floatingImports(await Bun.file(
    join(root, 'apps/demo/test/consumer', `fuzzy-${adapter}.ts`),
  ).text());
  const expectedPackage = `@floating-ui-plus/${adapter}`;
  if (
    demo.length !== 1 || fixture.length !== 1
    || demo[0]?.packageName !== expectedPackage
    || fixture[0]?.packageName !== expectedPackage
    || JSON.stringify(demo[0].names) !== JSON.stringify(fixture[0].names)
  ) {
    throw new Error(`${adapter} consumer imports must match ${demoSources[adapter]}`);
  }
}

function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, {cwd, stdout: 'pipe', stderr: 'pipe'});
  if (result.exitCode !== 0) {
    throw new Error(
      `${command.join(' ')} failed in ${cwd}\n`
        + new TextDecoder().decode(result.stdout)
        + new TextDecoder().decode(result.stderr),
    );
  }
  return new TextDecoder().decode(result.stdout);
}

async function verifyAdapter(
  adapter: Adapter,
  directory: string,
  archives: Record<(typeof packageNames)[number], string>,
) {
  const imports = await collectDemoImports(adapter);
  const fixture = join(directory, adapter);
  await mkdir(fixture);
  await Bun.write(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: `packed-demo-${adapter}`,
      private: true,
      type: 'module',
      dependencies: {
        [`@floating-ui-plus/${adapter}`]: `file:${archives[adapter]}`,
        ...(adapter === 'vue' ? {vue: '^3.5.22'} : {}),
      },
      // Install the unpublished local Web archive; its packed range is checked before this install.
      overrides: {'@floating-ui-plus/web': `file:${archives.web}`},
    }),
  );
  await copyFile(
    join(root, 'apps/demo/test/consumer', `fuzzy-${adapter}.ts`),
    join(fixture, 'entry.ts'),
  );
  const allRuntime = imports.runtime.join(', ');
  const allTypes = imports.types.join(', ');
  await Bun.write(join(fixture, 'all-demo-imports.ts'), [
    `import {${allRuntime}} from '@floating-ui-plus/${adapter}';`,
    ...(allTypes ? [`import type {${allTypes}} from '@floating-ui-plus/${adapter}';`] : []),
    `void [${allRuntime}];`,
    ...(imports.types.length ? [`type DemoTypes = [${allTypes}];`, 'export type {DemoTypes};'] : []),
  ].join('\n'));
  await Bun.write(join(fixture, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
    files: ['all-demo-imports.ts', 'entry.ts'],
  }));
  run(['bun', 'install', '--ignore-scripts'], fixture);

  for (const name of [adapter, 'web'] as const) {
    const expected = await Bun.file(join(root, 'packages', name, 'package.json')).json();
    const installed = await Bun.file(
      join(fixture, 'node_modules/@floating-ui-plus', name, 'package.json'),
    ).json();
    if (installed.version !== expected.version) {
      throw new Error(`${adapter} installed ${name}@${installed.version}; expected ${expected.version}`);
    }
  }

  run(['bun', 'build', 'entry.ts', '--target', 'browser', '--outdir', 'dist'], fixture);
  run(['bun', 'build', 'all-demo-imports.ts', '--target', 'browser', '--outdir', 'dist'], fixture);
  run([join(root, 'node_modules/.bin/tsc'), '--project', 'tsconfig.json'], fixture);
  console.log(`✓ @floating-ui-plus/${adapter} builds imports from ${imports.files.length} demo files and fuzzy Query fixture`);
}

const directory = await mkdtemp(join(tmpdir(), 'floating-ui-plus-consumer-'));
try {
  await verifyFixtureImports('web-components');
  await verifyFixtureImports('vue');
  const archives = {} as Record<(typeof packageNames)[number], string>;
  for (const name of packageNames) {
    archives[name] = join(directory, `${name}.tgz`);
    run(['bun', 'pm', 'pack', '--filename', archives[name]], join(root, 'packages', name));
  }
  const web = JSON.parse(run(['tar', '-xOf', archives.web, 'package/package.json'], root));
  for (const adapter of ['web-components', 'vue'] as const) {
    const packed = JSON.parse(
      run(['tar', '-xOf', archives[adapter], 'package/package.json'], root),
    );
    const expected = `^${web.version}`;
    const actual = packed.dependencies?.['@floating-ui-plus/web'];
    if (actual !== expected) {
      throw new Error(`Packed ${adapter} requires web@${actual}; expected ${expected}`);
    }
  }
  await verifyAdapter('web-components', directory, archives);
  await verifyAdapter('vue', directory, archives);
} finally {
  await rm(directory, {recursive: true, force: true});
}
