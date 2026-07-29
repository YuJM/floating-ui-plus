import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, test} from 'vitest';

interface Baseline {
  source: {commit: string; package: string; repository: string};
  exports: string[];
  interactionOptions: Record<string, string[]>;
}

const interactionFiles = {
  useClick: {
    react: ['hooks/useClick.ts', 'UseClickProps'],
    web: ['interactions/click.ts', 'ClickOptions'],
  },
  useClientPoint: {
    react: ['hooks/useClientPoint.ts', 'UseClientPointProps'],
    web: ['interactions/clientPoint.ts', 'ClientPointOptions'],
  },
  useDismiss: {
    react: ['hooks/useDismiss.ts', 'UseDismissProps'],
    web: ['interactions/dismiss.ts', 'DismissOptions'],
  },
  useFocus: {
    react: ['hooks/useFocus.ts', 'UseFocusProps'],
    web: ['interactions/focus.ts', 'FocusOptions'],
  },
  useHover: {
    react: ['hooks/useHover.ts', 'UseHoverProps'],
    web: ['interactions/hover.ts', 'HoverOptions'],
  },
  useListNavigation: {
    react: ['hooks/useListNavigation.ts', 'UseListNavigationProps'],
    web: ['interactions/listNavigation.ts', 'ListNavigationOptions'],
  },
  useRole: {
    react: ['hooks/useRole.ts', 'UseRoleProps'],
    web: ['interactions/role.ts', 'RoleOptions'],
  },
  useTypeahead: {
    react: ['hooks/useTypeahead.ts', 'UseTypeaheadProps'],
    web: ['interactions/typeahead.ts', 'TypeaheadOptions'],
  },
} as const;

function extractExports(source: string) {
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/gs)) {
    match[1]
      .split(',')
      .map((name) =>
        name
          .trim()
          .split(/\s+as\s+/)
          .at(-1),
      )
      .filter((name): name is string => Boolean(name))
      .forEach((name) => names.add(name));
  }
  return [...names];
}

function extractOptionalProperties(source: string, interfaceName: string) {
  const marker = `export interface ${interfaceName}`;
  const start = source.indexOf(marker);
  if (start === -1) return [];
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < source.length; end++) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return [...source.slice(open + 1, end).matchAll(/^  (\w+)\?:/gm)].map(
    ([, name]) => name!,
  );
}

describe('React parity manifest', () => {
  const packageRoot = process.cwd().endsWith('/test')
    ? resolve(process.cwd(), '..')
    : process.cwd();
  const baseline = JSON.parse(
    readFileSync(resolve(packageRoot, 'react-parity-baseline.json'), 'utf8'),
  ) as Baseline;

  test('classifies every non-deprecated React root export', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'parity-manifest.json'), 'utf8'),
    ) as {
      features: Record<string, unknown>;
      excluded: Record<string, string>;
    };
    const missing = baseline.exports.filter(
      (name) => !manifest.features[name] && !manifest.excluded[name],
    );
    expect(missing).toEqual([]);
  });

  test('maps every non-deprecated React feature to the Vue package', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'parity-manifest.json'), 'utf8'),
    ) as {
      features: Record<string, unknown>;
      vue: Record<string, string>;
    };
    const missing = Object.keys(manifest.features).filter(
      (name) => !manifest.vue[name],
    );
    expect(missing).toEqual([]);
  });

  test('covers every upstream interaction option in the Web API', () => {
    for (const [reactName, mapping] of Object.entries(interactionFiles)) {
      const source = readFileSync(
        resolve(packageRoot, 'src', mapping.web[0]),
        'utf8',
      );
      const webOptions = extractOptionalProperties(source, mapping.web[1]);
      const missing = baseline.interactionOptions[reactName]!.filter(
        (name) => !webOptions.includes(name),
      );
      expect(missing, reactName).toEqual([]);
    }
  });

  test('matches the live upstream checkout when it is available', () => {
    const candidates = [
      process.env.FLOATING_UI_REACT_ROOT,
      resolve(packageRoot, '../../../floating-ui/packages/react'),
    ].filter((value): value is string => Boolean(value));
    const reactRoot = candidates.find((candidate) =>
      existsSync(resolve(candidate, 'src/index.ts')),
    );
    if (!reactRoot) return;

    const liveExports = extractExports(
      readFileSync(resolve(reactRoot, 'src/index.ts'), 'utf8'),
    );
    expect(liveExports).toEqual(baseline.exports);

    for (const [reactName, mapping] of Object.entries(interactionFiles)) {
      const source = readFileSync(
        resolve(reactRoot, 'src', mapping.react[0]),
        'utf8',
      );
      expect(
        extractOptionalProperties(source, mapping.react[1]),
        reactName,
      ).toEqual(baseline.interactionOptions[reactName]);
    }
  });
});
