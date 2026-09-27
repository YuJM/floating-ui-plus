import {dirname, join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

type WorkspaceManifest = {name: string; version?: string};
type LockWorkspace = {name?: string; version?: string};
type Lockfile = {workspaces?: Record<string, LockWorkspace>};

const root = fileURLToPath(new URL('..', import.meta.url));

// Bun can retain old workspace versions after a version-only manifest change.
// Keep this targeted edit until https://github.com/oven-sh/bun/issues/18906 is fixed.

export function syncWorkspaceLockVersions(
  source: string,
  manifests: Record<string, WorkspaceManifest>,
) {
  const lock = Bun.JSONC.parse(source) as Lockfile;
  if (!lock.workspaces || typeof lock.workspaces !== 'object') {
    throw new Error('bun.lock has no workspaces map.');
  }

  const expectedPaths = Object.keys(manifests).sort();
  const actualPaths = Object.keys(lock.workspaces).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `bun.lock workspace paths differ from package.json: `
        + `lock=${actualPaths.join(', ')} manifests=${expectedPaths.join(', ')}`,
    );
  }

  let updated = source;
  const changes: Array<{path: string; from: string; to: string}> = [];
  for (const path of expectedPaths) {
    const manifest = manifests[path]!;
    const workspace = lock.workspaces[path]!;
    if (workspace.name !== manifest.name) {
      throw new Error(
        `bun.lock workspace ${path || '(root)'} names ${workspace.name}; `
          + `package.json names ${manifest.name}.`,
      );
    }
    // Bun omits the root package's version from the workspace map.
    if (path === '') continue;
    if (!manifest.version || !workspace.version) {
      throw new Error(`Missing version for workspace ${path} in package.json or bun.lock.`);
    }
    if (workspace.version === manifest.version) continue;

    const header = `    ${JSON.stringify(path)}: {`;
    const start = updated.indexOf(header);
    if (start < 0 || updated.indexOf(header, start + header.length) >= 0) {
      throw new Error(`Cannot uniquely locate workspace ${path} in bun.lock.`);
    }
    const end = updated.indexOf('\n    },', start);
    if (end < 0) throw new Error(`Cannot locate the end of workspace ${path} in bun.lock.`);
    const versionPrefix = '      "version": "';
    const versionStart = updated.indexOf(versionPrefix, start);
    if (versionStart < 0 || versionStart >= end) {
      throw new Error(`Cannot locate version for workspace ${path} in bun.lock.`);
    }
    const valueStart = versionStart + versionPrefix.length;
    const valueEnd = updated.indexOf('"', valueStart);
    if (valueEnd < 0 || valueEnd >= end) {
      throw new Error(`Invalid version for workspace ${path} in bun.lock.`);
    }
    const writtenVersion = updated.slice(valueStart, valueEnd);
    if (writtenVersion !== workspace.version) {
      throw new Error(`bun.lock workspace ${path} changed while being synchronized.`);
    }
    updated = updated.slice(0, valueStart) + manifest.version + updated.slice(valueEnd);
    changes.push({path, from: workspace.version, to: manifest.version});
  }

  const verified = Bun.JSONC.parse(updated) as Lockfile;
  for (const path of expectedPaths) {
    if (path !== '' && verified.workspaces?.[path]?.version !== manifests[path]?.version) {
      throw new Error(`Failed to verify synchronized workspace ${path}.`);
    }
  }
  return {updated, changes};
}

async function readWorkspaceManifests() {
  const rootManifest = await Bun.file(join(root, 'package.json')).json();
  const manifests: Record<string, WorkspaceManifest> = {
    '': {name: rootManifest.name, version: rootManifest.version},
  };
  for (const pattern of rootManifest.workspaces as string[]) {
    for await (const file of new Bun.Glob(`${pattern}/package.json`).scan(root)) {
      const path = dirname(file);
      if (manifests[path]) throw new Error(`Duplicate workspace ${path}.`);
      const manifest = await Bun.file(join(root, file)).json();
      manifests[path] = {name: manifest.name, version: manifest.version};
    }
  }
  return manifests;
}

async function main(args: string[]) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: bun scripts/sync-workspace-lock-versions.ts [--check]');
  }
  const lockPath = join(root, 'bun.lock');
  const source = await Bun.file(lockPath).text();
  const {updated, changes} = syncWorkspaceLockVersions(
    source,
    await readWorkspaceManifests(),
  );
  if (args[0] === '--check' && changes.length > 0) {
    throw new Error(
      'bun.lock workspace versions are stale:\n'
        + changes.map(({path, from, to}) => `  ${path}: ${from} -> ${to}`).join('\n')
        + '\nRun `bun run sync:lockfile` or `bun run version`.',
    );
  }
  if (args[0] !== '--check' && changes.length > 0) {
    await writeFile(lockPath, updated);
  }
  console.log(
    changes.length > 0
      ? `Synchronized ${changes.length} bun.lock workspace version(s).`
      : '✓ bun.lock workspace versions match package.json',
  );
}

if (import.meta.main) await main(Bun.argv.slice(2));
