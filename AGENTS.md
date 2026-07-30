# Repository instructions

## Tooling

- Use Bun for workspace dependency management, scripts, builds, and tests.
- Run commands from the repository root unless a package-specific command
  explicitly requires another working directory.
- Use `git mv` or the operating system's `mv` command when renaming or moving
  files.

## Testing boundaries

- Keep framework-neutral behavior and kernel logic in `@floating-ui-plus/web`
  unit tests. A browser-backed unit test is appropriate there only when the
  primitive itself requires DOM APIs; it must not cover an end-user UI flow.
- Put rendered component behavior, accessibility, and real interaction E2E
  coverage in `@floating-ui-plus/web-components` or `@floating-ui-plus/vue`.
  Do not add UI E2E tests to `@floating-ui-plus/web`.
- Prefer Vitest for every behavior that can be verified deterministically in
  the test runtime, including component state, rendered attributes, and
  accessibility contracts. Reserve Playwright E2E for browser-only behavior:
  real portals, focus trapping/restoration, scroll locking, pointer/keyboard
  event paths, layout/positioning, and cross-surface integration.

## Published packages

The published packages are:

- `@floating-ui-plus/web`
- `@floating-ui-plus/web-components`
- `@floating-ui-plus/vue`

Add a Changeset whenever a change affects a published package's API, runtime
behavior, documentation, or package contents:

```sh
bun run changeset
```

Choose `patch`, `minor`, or `major` according to the public impact. Keep shared
contract changes for affected packages in the same Changeset.

## Local-only npm releases

npm packages are released only from a maintainer's local checkout. Cloudflare
Pages deployment is independent and must not publish npm packages. Do not add
npm publication to Pages build commands, GitHub Actions, or another CI system
unless the user explicitly changes this policy. Use `bun publish` through the
release script; do not use `npm publish` or `changeset publish`, because Bun
resolves workspace protocols in the registry manifest.

Do not run `bun run version`, `bun run release:packages`,
`changeset publish`, `npm publish`, or `git push --follow-tags` unless the user
explicitly requests a release. These commands change versions or external
registry state.

The maintainer release flow is:

```sh
bun run version
git add .changeset packages bun.lock
git commit -m "release: 패키지 버전 업데이트"
git push origin main
npm login
bun run release:packages:check
bun run release:packages
git push --follow-tags
```

The publish script requires a clean `main` checkout matching `origin/main`,
checks npm authentication, typechecks, runs package unit and browser tests,
builds every package, previews package archives, and asks for explicit
confirmation before publication.

`bun run release:packages:check` is the non-publishing validation command. It
may query npm and launch browser tests, but it does not publish packages.
