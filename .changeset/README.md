# Changesets release workflow

Changesets manages versions and changelog entries for the published packages:

- `@floating-ui-plus/web`
- `@floating-ui-plus/web-components`
- `@floating-ui-plus/vue`

The demo app and the private workspace root are never released.

## Add a changeset

After changing a published package, run this from the repository root:

```sh
bun run changeset
```

Select every published package whose public API, runtime behavior, or package
contents changed. Choose the version bump deliberately:

| Bump | Use for |
| --- | --- |
| `patch` | Backward-compatible fixes, documentation corrections, or internal behavior fixes |
| `minor` | Backward-compatible public APIs or user-visible capabilities |
| `major` | Breaking public API, behavior, browser support, or package-layout changes |

Write the summary for package users. The command writes one Markdown file in
this directory; commit it with the implementation.

## Prepare a release

On the release branch, apply every pending changeset:

```sh
bun run version
```

This updates package versions, internal workspace dependency ranges where
needed, and package changelogs. Review and commit those generated changes.

Commit the generated version and changelog changes before publishing:

```sh
git add .changeset packages bun.lock
git commit -m "release: 패키지 버전 업데이트"
git push origin main
```

Authenticate with npm using the maintainer account and run the local checks:

```sh
npm login
bun run release:packages:check
```

When the package list and archives are correct, publish from a clean `main`
checkout:

```sh
bun run release:packages
git push --follow-tags
```

The publish script requires local `main` to match `origin/main`, verifies npm
authentication, typechecks, runs package unit and browser tests, builds the
packages, previews every package archive, and lists versions that are not yet
present on npm. It then requires an explicit confirmation before running
`changeset publish`. npm may request a 2FA code during publication.

## Versioning policy

Packages version independently. When a changed package affects an internal
consumer, Changesets updates that consumer with at least a patch release so its
published dependency range remains valid. Use one changeset containing all
affected packages when changing a shared public contract.
