import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {
  packageNames,
  verifyPackedConsumers,
  type PackageArchives,
} from './verify-packed-demo-consumers';

type Mode = 'check' | 'publish';

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface PackageInfo {
  directory: string;
  name: string;
  version: string;
  dependencies: Record<string, string>;
}

interface PreparedPackage extends PackageInfo {
  archive: string;
  integrity: string;
}

interface PackedManifest {
  name: string;
  version: string;
  exports?: unknown;
  main?: string;
  module?: string;
  types?: string;
  dependencies?: Record<string, string>;
}

const rootDirectory = fileURLToPath(new URL('..', import.meta.url));
const packageDirectories = [
  'packages/web',
  'packages/web-components',
  'packages/vue',
];

function printUsage() {
  console.log(`Local package release

Usage:
  bun scripts/release-packages.ts --check
  bun scripts/release-packages.ts --publish

--check    Validate local artifacts and public npm versions; report authentication.
--publish  Require authentication and a clean checkout, verify, then publish the verified archives.
`);
}

function parseMode(args: string[]): Mode | null {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return null;
  }
  if (args.length === 1 && args[0] === '--check') return 'check';
  if (args.length === 1 && args[0] === '--publish') return 'publish';
  printUsage();
  throw new Error('Pass exactly one of --check or --publish.');
}

async function execute(
  command: string[],
  options: {capture?: boolean; cwd?: string} = {},
): Promise<CommandResult> {
  const capture = options.capture ?? false;
  const process = Bun.spawn(command, {
    cwd: options.cwd ?? rootDirectory,
    stdin: 'inherit',
    stdout: capture ? 'pipe' : 'inherit',
    stderr: capture ? 'pipe' : 'inherit',
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    capture ? new Response(process.stdout).text() : Promise.resolve(''),
    capture ? new Response(process.stderr).text() : Promise.resolve(''),
  ]);
  return {exitCode, stdout, stderr};
}

async function run(command: string[], cwd?: string) {
  const result = await execute(command, {cwd});
  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(' ')}`);
  }
}

async function capture(command: string[]) {
  const result = await execute(command, {capture: true});
  if (result.exitCode !== 0) {
    const details = result.stderr.trim() || result.stdout.trim();
    throw new Error(
      `Command failed: ${command.join(' ')}${details ? `\n${details}` : ''}`,
    );
  }
  return result.stdout.trim();
}

async function readPackages(): Promise<PackageInfo[]> {
  return Promise.all(
    packageDirectories.map(async (directory) => {
      const manifest = await Bun.file(
        `${rootDirectory}/${directory}/package.json`,
      ).json();
      return {
        directory,
        name: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies ?? {},
      };
    }),
  );
}

export function findPendingChangesets(fileNames: string[]) {
  return fileNames
    .filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
    .sort();
}

async function assertVersionedReleasePlan(packages: PackageInfo[]) {
  const changesetDirectory = `${rootDirectory}/.changeset`;
  const pendingChangesets = findPendingChangesets(
    await readdir(changesetDirectory),
  );

  if (pendingChangesets.length > 0) {
    throw new Error(
      'Pending changesets have not been applied. Run `bun run version`, review '
        + 'the generated package versions and changelogs, then commit them.\n'
        + pendingChangesets.map((fileName) => `  - .changeset/${fileName}`).join('\n'),
    );
  }

  for (const pkg of packages) {
    const changelog = await Bun.file(
      `${rootDirectory}/${pkg.directory}/CHANGELOG.md`,
    ).text();
    if (!changelog.includes(`## ${pkg.version}`)) {
      throw new Error(
        `${pkg.name}@${pkg.version} is missing from ${pkg.directory}/CHANGELOG.md. `
          + 'Run `bun run version` and review the generated release files.',
      );
    }
  }

  console.log('✓ changesets applied to package versions and changelogs');
}

export function validatePublishWorktree(status: string) {
  if (status) {
    throw new Error(
      'Publishing requires a clean worktree. Commit or stash every change first.',
    );
  }
}

export function validatePackedDependencies(
  packed: {name: string; dependencies?: Record<string, string>},
  packages: PackageInfo[],
) {
  const source = packages.find((pkg) => pkg.name === packed.name);
  if (!source) throw new Error(`Unknown packed package: ${packed.name}`);
  for (const dependency of packages) {
    if (source.dependencies[dependency.name] !== 'workspace:^') continue;
    const actual = packed.dependencies?.[dependency.name];
    const expected = `^${dependency.version}`;
    if (actual !== expected) {
      throw new Error(
        `${packed.name} packs ${dependency.name}@${actual}; expected ${expected}. `
          + 'Run `bun run sync:lockfile` before publishing.',
      );
    }
  }
}

export function validatePackedManifest(
  packed: PackedManifest,
  packages: PackageInfo[],
  files: string[],
) {
  validatePackedDependencies(packed, packages);
  const source = packages.find((pkg) => pkg.name === packed.name)!;
  if (packed.version !== source.version) {
    throw new Error(`${packed.name} archive version ${packed.version} differs from ${source.version}.`);
  }
  if (!packed.exports || typeof packed.exports !== 'object' || !('.' in packed.exports)) {
    throw new Error(`${packed.name} is missing its public root export.`);
  }
  const targets: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string') targets.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(packed.exports);
  collect(packed.main);
  collect(packed.module);
  collect(packed.types);
  const paths = new Set(files);
  for (const target of targets) {
    if (target.split('/').includes('..') || !paths.has(`package/${target.replace(/^\.\//, '')}`)) {
      throw new Error(`${packed.name} exports a missing archive file: ${target}`);
    }
  }
}

export async function archiveIntegrity(archive: string) {
  const bytes = new Uint8Array(await Bun.file(archive).arrayBuffer());
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export async function validateArchiveIntegrity(
  prepared: Pick<PreparedPackage, 'name' | 'archive' | 'integrity'>,
) {
  if (await archiveIntegrity(prepared.archive) !== prepared.integrity) {
    throw new Error(`${prepared.name} archive changed after verification. Run release checks again.`);
  }
}

async function assertCleanWorktree() {
  const status = await capture(['git', 'status', '--porcelain']);
  validatePublishWorktree(status);
  console.log('✓ clean release worktree');
}

async function checkNpmAuthentication() {
  const result = await execute(['bun', 'pm', 'whoami'], {capture: true});
  return result.exitCode === 0;
}

async function isPublished(pkg: PackageInfo) {
  const specifier = `${pkg.name}@${pkg.version}`;
  const result = await execute(
    ['bun', 'pm', 'view', specifier, 'version', '--json'],
    {capture: true},
  );
  if (result.exitCode === 0) return true;

  const output = `${result.stdout}\n${result.stderr}`;
  if (
    output.includes('E404') ||
    output.includes('404 Not Found') ||
    output.includes('No matching version found')
  ) {
    return false;
  }
  throw new Error(`Unable to query npm for ${specifier}.\n${output.trim()}`);
}

async function runVerification(packages: PackageInfo[], directory: string) {
  console.log('\nBuilding packages...');
  await run(['bun', 'run', 'build:packages']);

  console.log('\nTypechecking...');
  await run(['bun', 'run', 'typecheck']);

  console.log('\nRunning package unit tests...');
  await run(['bun', 'run', 'test:packages']);

  console.log('\nTesting release tooling...');
  await run(['bun', 'run', 'test:release']);

  console.log('\nRunning package browser tests...');
  await run([
    'bun',
    'run',
    '--filter',
    '@floating-ui-plus/*',
    'test:browser',
  ]);

  console.log('\nPreviewing package archives...');
  const prepared: PreparedPackage[] = [];
  const archives = {} as PackageArchives;
  for (const pkg of packages) {
    console.log(`\n${pkg.name}@${pkg.version}`);
    const key = packageNames.find((name) => pkg.directory === `packages/${name}`);
    if (!key) throw new Error(`Unknown package archive: ${pkg.directory}`);
    const archive = join(directory, `${key}.tgz`);
    await run(
      ['bun', 'pm', 'pack', '--filename', archive],
      `${rootDirectory}/${pkg.directory}`,
    );
    const packed = JSON.parse(
      await capture(['tar', '-xOf', archive, 'package/package.json']),
    );
    const files = (await capture(['tar', '-tf', archive])).split('\n');
    validatePackedManifest(packed, packages, files);
    const integrity = await archiveIntegrity(archive);
    prepared.push({...pkg, archive, integrity});
    archives[key] = archive;
    console.log(`✓ archive exports, version, dependencies: ${integrity}`);
    await run(
      ['bun', 'publish', '--dry-run', '--access', 'public', archive],
    );
  }

  console.log('\nBuilding demo imports from packed packages...');
  await verifyPackedConsumers(archives);
  return prepared;
}

async function findPendingPackages<T extends PackageInfo>(packages: T[]) {
  const pending: T[] = [];
  for (const pkg of packages) {
    if (!(await isPublished(pkg))) pending.push(pkg);
  }
  return pending;
}

async function confirmPublish(packages: PackageInfo[]) {
  console.log('\nPackages to publish:');
  for (const pkg of packages) {
    console.log(`  - ${pkg.name}@${pkg.version}`);
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await readline.question('\nType "publish" to continue: ');
  readline.close();
  if (answer.trim() !== 'publish') {
    throw new Error('Publication cancelled.');
  }
}

export async function main() {
  const mode = parseMode(Bun.argv.slice(2));
  if (!mode) return;

  if (mode === 'publish') await assertCleanWorktree();
  const packages = await readPackages();

  console.log('\nChecking versioned release plan...');
  await assertVersionedReleasePlan(packages);

  await run(['bun', 'run', 'check:lockfile']);

  const authenticated = await checkNpmAuthentication();
  if (mode === 'publish' && !authenticated) {
    throw new Error('npm authentication failed. Run `bunx npm login` and try again.');
  }
  console.log(authenticated
    ? '✓ npm authentication'
    : 'npm authentication unavailable; local/public-registry checks will continue. Publication requires login.');
  const directory = await mkdtemp(join(tmpdir(), 'floating-ui-plus-release-'));
  try {
    const prepared = await runVerification(packages, directory);
    const pendingPackages = await findPendingPackages(prepared);

    if (pendingPackages.length === 0) {
      console.log('\nAll local package versions are already published.');
      return;
    }

    console.log('\nUnpublished package versions:');
    for (const pkg of pendingPackages) {
      console.log(`  - ${pkg.name}@${pkg.version}`);
    }

    if (mode === 'check') {
      console.log('\nRelease check completed. No packages were published.');
      if (!authenticated) console.log('Before publishing: run `bunx npm login`, then use the publish command to rerun verification.');
      return;
    }

    // Builds and validation may update tracked files. Recheck both before
    // confirmation and after the user has had time to edit the checkout.
    await assertCleanWorktree();
    await confirmPublish(pendingPackages);
    await assertCleanWorktree();
    const published: string[] = [];
    try {
      for (const pkg of pendingPackages) {
        await validateArchiveIntegrity(pkg);
        console.log(`\nPublishing ${pkg.name}@${pkg.version} with Bun...`);
        // Publish the bytes that passed archive and consumer verification.
        // A conflicting version must fail rather than silently succeed.
        await run(['bun', 'publish', '--access', 'public', pkg.archive]);
        published.push(`${pkg.name}@${pkg.version}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Publication stopped. Published in this run: ${published.join(', ') || 'none'}. `
        + 'Rerun the release command after resolving the error; registry versions are checked again.\n'
        + reason,
      );
    }
    console.log('\nPackage publication completed.');
    console.log('Push the release commit or any manual tags separately if desired.');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

if (import.meta.main) {
  await main().catch((error) => {
    console.error(`\nRelease failed: ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
