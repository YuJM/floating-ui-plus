import {describe, expect, test} from 'bun:test';
import {syncWorkspaceLockVersions} from './sync-workspace-lock-versions';

const manifests = {
  '': {name: 'example', version: '0.0.0'},
  'apps/demo': {name: 'demo', version: '0.0.7'},
  'packages/web': {name: '@example/web', version: '0.10.0'},
};

const lock = `{
  "workspaces": {
    "": {
      "name": "example",
    },
    "apps/demo": {
      "name": "demo",
      "version": "0.0.5",
      "dependencies": {"@example/web": "workspace:^"},
    },
    "packages/web": {
      "name": "@example/web",
      "version": "0.7.3",
    },
  },
  "packages": {
    "example": ["example@0.9.1", "", {}],
  },
}\n`;

describe('syncWorkspaceLockVersions', () => {
  test('updates only stale workspace versions and preserves lockfile contents', () => {
    const {updated, changes} = syncWorkspaceLockVersions(lock, manifests);
    expect(changes).toEqual([
      {path: 'apps/demo', from: '0.0.5', to: '0.0.7'},
      {path: 'packages/web', from: '0.7.3', to: '0.10.0'},
    ]);
    expect(updated).toContain('"example@0.9.1"');
    expect(updated.replace('"version": "0.0.7"', '"version": "0.0.5"')
      .replace('"version": "0.10.0"', '"version": "0.7.3"')).toBe(lock);
    expect(syncWorkspaceLockVersions(updated, manifests).changes).toEqual([]);
  });

  test('rejects missing workspaces instead of silently writing an incomplete lockfile', () => {
    expect(() => syncWorkspaceLockVersions(lock, {
      ...manifests,
      'packages/vue': {name: '@example/vue', version: '0.10.0'},
    })).toThrow('workspace paths differ');
  });

  test('rejects a workspace name mismatch', () => {
    expect(() => syncWorkspaceLockVersions(lock, {
      ...manifests,
      'packages/web': {name: '@example/other', version: '0.10.0'},
    })).toThrow('package.json names @example/other');
  });
});
