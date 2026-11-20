# Scripts

## Release a plugin

```sh
# See available plugins and versions
aube run release:plugin -- --list

# Preview a patch release
aube run release:plugin -- --plugin theme-switcher --bump patch --dry-run

# Release and push
aube run release:plugin -- --plugin theme-switcher --bump patch --push
```

The plugin manager has a convenience alias:

```sh
aube run release:manager -- --bump patch --push
```

The release script:

- reads the plugin's current version from `plugins/manifest.json`
- updates the manifest version and the source version
- updates the plugin's row in the root README
- runs `aube run check` and `aube run build`
- commits only that plugin's source and dist plus the manifest and README
- creates `<plugin>-v<version>`
- optionally pushes main and the tag

Use `--version x.y.z` for an explicit version or `--bump minor|major`.
Other working-tree changes are left alone.

The build is repo-wide. If it updates another plugin's stale `dist` file, the
script warns and leaves that change uncommitted.

## Pin the manager URL locally

The manager is loaded from a URL, so pin it to a tag or commit after a release:

```sh
aube run pin:manager -- --ref plugin-manager-v4.0.1
```

It updates the Windows config and the chezmoi template when it finds them. Use
`--windows-config`, `--chezmoi-source`, or `--file` to override.

Use `--dry-run` to preview. It does not commit the dotfiles; it prints the
commands to commit, push, and apply them.

Other plugins do not need this step. The manager resolves them from the latest
commit on its next `checkEvery` window; force it with `GlancePlugins.refresh()`.
