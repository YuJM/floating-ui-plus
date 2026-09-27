import {describe, expect, test} from 'bun:test';
import {
  findPendingChangesets,
  validatePackedDependencies,
  validatePublishWorktree,
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
