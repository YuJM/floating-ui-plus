# Floating UI Plus

A positioning and interaction toolkit for the web. Choose a framework-neutral
controller, Custom Elements, or Vue components without changing the underlying
interaction model.

## Why Floating UI Plus

Floating UI Plus is built on the positioning engine and middleware of
[Floating UI](https://floating-ui.com/). Its React package offers a mature
composition experience, but other frameworks often need to assemble more of
the interaction layer themselves. We made Plus to bring that missing layer to
framework-neutral, Web Components, and Vue applications without turning the
core into a React-only abstraction.

Plus keeps Floating UI's placement model while adding reusable controllers for
open state, dismissal, focus management, nested collections, portals, and
multilingual fuzzy or asynchronous search. Applications still own their
markup, semantics, and rendering; Plus supplies the behavior that should work
the same in every framework.

Floating UI Plus is not a UI kit. It is a foundation for the custom overlay
components a product needs when its design system no longer covers the
interaction: the tooltips, popovers, menus, comboboxes, and dialogs shown in
the [demo](./apps/demo). You keep the product's design system, markup, ARIA,
and visual language; Plus supplies the positioning and interaction behavior.

For React, use the official
[`@floating-ui/react`](https://floating-ui.com/docs/react) package. It is the
React-first set of primitives for building the same kinds of custom floating
interfaces.

## Packages

- [`@floating-ui-plus/web`](./packages/web): framework-neutral positioning,
  interactions, search, focus, and collection controllers
- [`@floating-ui-plus/web-components`](./packages/web-components): Custom
  Elements for HTML-first applications
- [`@floating-ui-plus/vue`](./packages/vue): Vue composables and declarative
  floating components

Read each package README for installation and framework-specific examples.

## Development

```sh
bun install
bun run typecheck
bun run build
bun run test
bun run test:browser
```

All packages are built with [tsdown](https://tsdown.dev/). Package `dev`
scripts run `tsdown --watch --no-clean`.

`test:browser` runs the Web, Web Components, and Vue Vitest Browser suites,
then the integrated demo E2E suite. Playwright uses the installed Chrome browser and
exercises native layout, focus, pointer, and keyboard behavior.

## Demo

The [demo](./apps/demo) lets you compare the Custom Elements and Vue APIs for
the same common UI patterns:

- tooltips, popovers, menus, cursor-following surfaces, and modals
- nested menus, lists, keyboard composites, and focus management
- multilingual search, all placements, and middleware examples

Each example uses one public route and the `framework` query selects its
implementation: `/tooltip` defaults to Web Components, while
`/tooltip?framework=vue` shows the Vue version. Invalid or omitted query values
fall back to Web Components.

The Combobox demo has a second URL state for its search implementation:
`/combobox?source=fuzzy` and `/combobox?source=server`. Combine it with the
framework selection to compare the same source across implementations, for
example `/combobox?framework=vue&source=server`. Switching framework or locale
preserves these query parameters.

Run the complete development environment from the repository root:

```sh
bun run dev
```

It builds the package `dist` outputs once, then starts every package watcher
and the Astro demo. Open <http://127.0.0.1:5173>.

When package watchers are already running, start only the demo with:

```sh
bun run dev:demo
```

In a new checkout with no package `dist` outputs, build packages before
starting the demo alone:

```sh
bun run build:packages
bun run dev:demo
```

Browser tests exercise both surfaces in desktop and mobile Chrome.

## Cloudflare Pages deployment

The connected Cloudflare Pages project builds the repository with
`bun install --frozen-lockfile && bun run build` and publishes
`apps/demo/dist`. The Pages Function for npm package versions lives in the
repository-root `functions/` directory.

## Package releases

Published packages are versioned with [Changesets](https://github.com/changesets/changesets).
Add a changeset with `bun run changeset` whenever a change affects a published
package. npm package releases are performed only from a maintainer's local
checkout. Cloudflare Pages deployment is a separate process and must not run
`npm publish` or `changeset publish`. The local release script uses Bun's
native `bun publish`, which resolves workspace dependency protocols to semver
ranges in the published manifest.

The demo uses local workspace links during development, so its browser tests
cannot detect an incorrect dependency range in an npm archive. Run
`bun run test:consumer` to install the packed adapters in isolated projects and
build the public imports used by every Web Components and Vue demo with only
the matching adapter as a direct Floating UI Plus dependency. It also loads
the packed Web Components adapter through an Auko-style dynamic namespace
import in Chromium and WebKit, and checks the editor Query/List methods,
IME guards, original-event navigation, and cleanup. Install both browser
engines with `bun run test:browser:install` if needed. The package release
check runs this verification against the same archives it would publish.

Prepare and publish a release from the intended release branch:

```sh
bun run version
git add .changeset packages bun.lock
git commit -m "release: 패키지 버전 업데이트"
bun run release:packages:check
bunx npm login
bun run release:packages
```

The release commands expect `bun run version` to have consumed every pending
Changeset, written the current versions to the package changelogs, and
synchronized all workspace versions in `bun.lock`. Run `bun run check:lockfile`
to verify the lockfile without changing it. This explicit synchronization is
needed because [Bun can leave workspace versions stale after a version-only
change](https://github.com/oven-sh/bun/issues/18906); `bun install --lockfile-only`
and `bun install --frozen-lockfile` do not detect that drift in this repository.
Package builds and release checks run the lockfile check before packing. The
publish command may run from any branch and does not require that branch to
match a remote; it only requires a clean worktree so the reviewed files are
exactly the files being published. It builds packages before typechecking,
runs release-tooling and package unit/browser tests, and verifies every packed
runtime/type export target and workspace dependency version. Each archive is
packed once, dry-run with Bun, and installed in isolated consumers. Publication
uses those exact verified tarballs, checks their SHA-512 integrity, and asks
for confirmation. The worktree is checked again before and after confirmation.

`bun run release:packages:check` performs the local and public-registry checks
without publishing anything. Missing npm authentication is reported but does
not stop the build/export/browser checks; publishing still requires login.
Registry connection or metadata errors fail the check. `bun run test:release`
runs the release-tooling regression tests separately.

The publish command requires authentication before verification. It publishes
dependencies before adapters, stops on the first failure, and reports which
versions succeeded. On rerun it queries registry versions again and skips
already published versions. A conflicting version fails instead of being
silently accepted with `--tolerate-republish`. Publishing a prepared archive
uses [Bun's tarball publication](https://bun.com/docs/pm/cli/publish) so the
package is not repacked or modified by a second packing lifecycle.
Pushing the release commit or any manually created tags is a separate
maintainer action and is not a publication prerequisite.

See [`.changeset/README.md`](./.changeset/README.md) for the team workflow and
versioning rules.
