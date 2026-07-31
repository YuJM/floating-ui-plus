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

On the intended release branch, apply every pending changeset:

```sh
bun run version
```

This updates package versions, internal workspace dependency ranges where
needed, and package changelogs. Review and commit those generated changes.

Commit the generated version and changelog changes before publishing:

```sh
git add .changeset packages bun.lock
git commit -m "release: 패키지 버전 업데이트"
```

Authenticate with npm using the maintainer account and run the local checks:

```sh
npm login
bun run release:packages:check
```

When the package list and archives are correct, publish from the clean release
checkout:

```sh
bun run release:packages
```

The publish script may run from any branch and does not require that branch to
match a remote. It requires a clean worktree, verifies npm authentication,
typechecks, runs package unit and browser tests, builds the packages, previews
every package archive, and lists versions that are not yet present on npm. It
then requires an explicit confirmation before publishing each package with
`bun publish`, which resolves workspace dependency protocols to semver ranges
in the registry manifest. npm may request a 2FA code during publication. The
release checks verify that `bun run version` has consumed all pending Changeset
files; they do not run `changeset status`, because that command compares a
versioned release branch with `main` and reports the already consumed
Changesets as missing.

Pushing the release commit or any manually created tags is a separate
maintainer action and is not required before npm publication.

## Versioning policy

The three published packages form one fixed group. A release affecting any one
of them releases all three at the same version, using the highest required
SemVer bump across the group. Changesets aligns an existing version difference
to the highest current version before applying that bump.

Use one changeset containing every directly affected package when changing a
shared public contract so each changelog records the relevant user-facing
impact.
