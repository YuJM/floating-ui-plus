import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';

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
--publish  Run the same checks, require a clean main branch, then publish.
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

async function assertPublishCheckout() {
  const branch = await capture(['git', 'branch', '--show-current']);
  if (branch !== 'main') {
    throw new Error(`Publishing is only allowed from main. Current: ${branch}`);
  }

  const status = await capture(['git', 'status', '--porcelain']);
  if (status) {
    throw new Error(
      'Publishing requires a clean worktree. Commit or stash every change first.',
    );
  }

  const head = await capture(['git', 'rev-parse', 'HEAD']);
  const remoteMain = await capture([
    'git',
    'ls-remote',
    'origin',
    'refs/heads/main',
  ]);
  const remoteHead = remoteMain.split(/\s+/)[0];
  if (!remoteHead || head !== remoteHead) {
    throw new Error(
      'Local main must match origin/main exactly. Push or update main first.',
    );
  }
}

async function assertNpmAuthentication() {
  const result = await execute(['npm', 'whoami'], {capture: true});
  if (result.exitCode !== 0) {
    throw new Error('npm authentication failed. Run `npm login` and try again.');
  }
  console.log('✓ npm authentication');
}

async function isPublished(pkg: PackageInfo) {
  const specifier = `${pkg.name}@${pkg.version}`;
  const result = await execute(
    ['npm', 'view', specifier, 'version', '--json'],
    {capture: true},
  );
  if (result.exitCode === 0) return true;

  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes('E404') || output.includes('404 Not Found')) return false;
  throw new Error(`Unable to query npm for ${specifier}.\n${output.trim()}`);
}

async function runVerification(packages: PackageInfo[]) {
  console.log('\nChecking release plan...');
  await run(['bun', 'run', 'changeset', 'status']);

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

async function main() {
  const mode = parseMode(Bun.argv.slice(2));
  if (!mode) return;

  if (mode === 'publish') await assertPublishCheckout();
  await assertNpmAuthentication();

  const packages = await readPackages();
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
  await run(['bun', 'run', 'changeset', 'publish']);
  console.log('\nPackage publication completed.');
  console.log('Push the generated release tags with `git push --follow-tags`.');
}

await main().catch((error) => {
  console.error(`\nRelease failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
