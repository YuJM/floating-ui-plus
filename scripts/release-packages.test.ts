import {describe, expect, test} from 'bun:test';
import {
  findPendingChangesets,
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
