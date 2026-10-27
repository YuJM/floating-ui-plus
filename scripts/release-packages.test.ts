import {describe, expect, test} from 'bun:test';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  findPendingChangesets,
  validatePackedDependencies,
  validatePublishWorktree,
  validatePackedManifest,
  archiveIntegrity,
  validateArchiveIntegrity,
} from './release-packages';

describe('findPendingChangesets', () => {
  test('ignores Changesets metadata files', () => {
    expect(findPendingChangesets(['README.md', 'config.json'])).toEqual([]);
  });

  test('returns pending changeset markdown files in stable order', () => {
    expect(
      findPendingChangesets([
        'README.md',
        'zebra-change.md',
        'config.json',
        'alpha-change.md',
      ]),
    ).toEqual(['alpha-change.md', 'zebra-change.md']);
  });
});

describe('verified release archive', () => {
  const packages = [{directory: 'packages/web', name: '@floating-ui-plus/web', version: '0.11.1', dependencies: {}}];
  const manifest = {
    name: '@floating-ui-plus/web', version: '0.11.1', types: './dist/index.d.ts',
    exports: {'.': {types: './dist/index.d.ts', import: './dist/index.js', require: './dist/index.cjs'}},
  };
  const files = ['package/dist/index.d.ts', 'package/dist/index.js', 'package/dist/index.cjs'];

  test('rejects a missing declaration or runtime conditional export in the tarball', () => {
    expect(() => validatePackedManifest(manifest, packages, files)).not.toThrow();
    for (const missing of files) {
      expect(() => validatePackedManifest(manifest, packages, files.filter((file) => file !== missing))).toThrow('exports a missing archive file');
    }
  });

  test('rejects an archive version mismatch and a missing package root export', () => {
    expect(() => validatePackedManifest({...manifest, version: '0.10.1'}, packages, files)).toThrow('archive version');
    expect(() => validatePackedManifest({...manifest, exports: {}}, packages, files)).toThrow('public root export');
  });

  test('stops if a verified archive changes before publishing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fup-integrity-test-'));
    try {
      const archive = join(directory, 'web.tgz');
      await Bun.write(archive, 'verified content');
      const prepared = {name: manifest.name, archive, integrity: await archiveIntegrity(archive)};
      await validateArchiveIntegrity(prepared);
      await Bun.write(archive, 'changed content');
      await expect(validateArchiveIntegrity(prepared)).rejects.toThrow('changed after verification');
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});

describe('validatePublishWorktree', () => {
  test('accepts a clean checkout from any branch', () => {
    expect(() => validatePublishWorktree('')).not.toThrow();
  });

  test('rejects a dirty worktree', () => {
    expect(() => validatePublishWorktree(' M package.json')).toThrow(
      'Publishing requires a clean worktree',
    );
  });
});

describe('validatePackedDependencies', () => {
  const packages = [
    {
      directory: 'packages/web',
      name: '@floating-ui-plus/web',
      version: '0.10.0',
      dependencies: {},
    },
    {
      directory: 'packages/web-components',
      name: '@floating-ui-plus/web-components',
      version: '0.10.0',
      dependencies: {'@floating-ui-plus/web': 'workspace:^'},
    },
  ];

  test('accepts an archive that installs the matching web runtime', () => {
    expect(() =>
      validatePackedDependencies(
        {
          name: '@floating-ui-plus/web-components',
          dependencies: {'@floating-ui-plus/web': '^0.10.0'},
        },
        packages,
      ),
    ).not.toThrow();
  });

  test('rejects the stale runtime range from the 0.9.0 archive', () => {
    expect(() =>
      validatePackedDependencies(
        {
          name: '@floating-ui-plus/web-components',
          dependencies: {'@floating-ui-plus/web': '^0.7.3'},
        },
        packages,
      ),
    ).toThrow('expected ^0.10.0');
  });

  test('rejects an archive missing its workspace runtime', () => {
    expect(() =>
      validatePackedDependencies(
        {name: '@floating-ui-plus/web-components', dependencies: {}},
        packages,
      ),
    ).toThrow('expected ^0.10.0');
  });
});
