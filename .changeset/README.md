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

Then verify and publish:

```sh
bun run build
bun run test
bun run release
```

`bun run release` runs `changeset publish` and publishes only packages with a
new version. It uses the registry and authentication configured for the release
environment; it does not configure credentials itself.

## Versioning policy

Packages version independently. When a changed package affects an internal
consumer, Changesets updates that consumer with at least a patch release so its
published dependency range remains valid. Use one changeset containing all
affected packages when changing a shared public contract.
