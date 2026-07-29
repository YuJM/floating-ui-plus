import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, test} from 'vitest';

describe('React parity manifest', () => {
  test('classifies every non-deprecated React root export', () => {
    const packageRoot = process.cwd().endsWith('/test')
      ? resolve(process.cwd(), '..')
      : process.cwd();
    const reactIndex = readFileSync(
      resolve(packageRoot, '../react/src/index.ts'),
      'utf8',
    );
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'parity-manifest.json'), 'utf8'),
    ) as {
      features: Record<string, unknown>;
      excluded: Record<string, string>;
    };
    const exportedNames = new Set<string>();

    for (const match of reactIndex.matchAll(/export\s*\{([^}]+)\}/gs)) {
      match[1]
        .split(',')
        .map((name) =>
          name
            .trim()
            .split(/\s+as\s+/)
            .at(-1),
        )
        .filter((name): name is string => Boolean(name))
        .forEach((name) => exportedNames.add(name));
    }

    const missing = [...exportedNames].filter(
      (name) => !manifest.features[name] && !manifest.excluded[name],
    );
    expect(missing).toEqual([]);
  });
});
