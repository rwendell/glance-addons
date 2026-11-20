# Scripts

## Publish a plugin

```sh
# Infer the changed plugin, bump patch, build, commit, tag, and push
aube run publish
```

Preview first if you want:

```sh
aube run publish -- --dry-run
```

`publish` infers the plugin from changed `plugins/<name>/src/` files. If no
source changed, it falls back to changed `plugins/<name>/dist/` files. It fails
if more than one plugin changed; pass `--plugin` in that case.

```sh
aube run publish -- --minor
aube run publish -- --major
aube run publish -- --plugin theme-switcher
aube run publish -- --no-push
aube run publish -- --version 3.1.0
```

The script updates the manifest, source version, and README row, runs
`aube run check` and `aube run build`, commits only that plugin's files plus the
manifest and README, creates `<plugin>-v<version>`, and pushes.

The build is repo-wide. If it updates another plugin's stale `dist` file, the
script warns and leaves that change uncommitted.

## Explicit release

`release:plugin` is the same script without the implicit push:

```sh
aube run release:plugin -- --plugin theme-switcher --bump patch --push
```

`release:manager` is an alias for the manager:

```sh
aube run release:manager -- --bump patch --push
```

## Pin the manager URL locally

The manager is loaded from a URL, so pin it to a tag or commit after a release:

```sh
aube run pin:manager -- --ref plugin-manager-v4.0.1
```

It updates the Windows config and the chezmoi template when it finds them. Use
`--windows-config`, `--chezmoi-source`, or `--file` to override, and `--dry-run`
to preview. It does not commit the dotfiles; it prints the commands to commit,
push, and apply them.

Other plugins do not need this step. The manager resolves them from the latest
commit on its next `checkEvery` window; force it with `GlancePlugins.refresh()`.
