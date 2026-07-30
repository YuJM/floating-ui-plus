import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {readdir} from 'node:fs/promises';

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

--check    Validate authentication, tests, builds, archives, and npm versions.
--publish  Run the same checks from any clean checkout, then publish.
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

async function assertCleanWorktree() {
  const status = await capture(['git', 'status', '--porcelain']);
  validatePublishWorktree(status);
  console.log('✓ clean release worktree');
}

async function assertNpmAuthentication() {
  const result = await execute(['bun', 'pm', 'whoami'], {capture: true});
  if (result.exitCode !== 0) {
    throw new Error('npm authentication failed. Run `bunx npm login` and try again.');
  }
  console.log('✓ npm authentication');
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

async function runVerification(packages: PackageInfo[]) {
  console.log('\nTypechecking...');
  await run(['bun', 'run', 'typecheck']);

  console.log('\nRunning package unit tests...');
  await run(['bun', 'run', 'test:packages']);

  console.log('\nBuilding packages...');
  await run(['bun', 'run', 'build:packages']);

  console.log('\nRunning package browser tests...');
  await run([
    'bun',
    'run',
    '--filter',
    '@floating-ui-plus/*',
    'test:browser',
  ]);

  console.log('\nPreviewing package archives...');
  for (const pkg of packages) {
    console.log(`\n${pkg.name}@${pkg.version}`);
    await run(
      ['bun', 'pm', 'pack', '--dry-run'],
      `${rootDirectory}/${pkg.directory}`,
    );
    await run(
      ['bun', 'publish', '--dry-run', '--access', 'public'],
      `${rootDirectory}/${pkg.directory}`,
    );
  }
}

async function findPendingPackages(packages: PackageInfo[]) {
  const pending: PackageInfo[] = [];
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

  await assertNpmAuthentication();
  await runVerification(packages);
  const pendingPackages = await findPendingPackages(packages);

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
    return;
  }

  await confirmPublish(pendingPackages);
  for (const pkg of pendingPackages) {
    console.log(`\nPublishing ${pkg.name}@${pkg.version} with Bun...`);
    await run(
      ['bun', 'publish', '--access', 'public', '--tolerate-republish'],
      `${rootDirectory}/${pkg.directory}`,
    );
  }
  console.log('\nPackage publication completed.');
  console.log('Push the release commit or any manual tags separately if desired.');
}

if (import.meta.main) {
  await main().catch((error) => {
    console.error(`\nRelease failed: ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
