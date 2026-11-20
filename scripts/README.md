# Scripts

## Release the plugin manager

```sh
# See what would happen
aube run release:manager -- --bump patch --dry-run

# Commit, tag, and push a patch release
aube run release:manager -- --bump patch --push

# Or commit/tag locally and push later
aube run release:manager -- --bump patch
```

The release script:

- bumps `plugins/manifest.json` and the manager registry version
- updates the Plugin Manager row in the root README
- runs `aube run check` and `aube run build`
- commits only the manager source, rebuilt dist, manifest, and README
- creates `plugin-manager-v<version>`
- optionally pushes `main` and the tag

Other working-tree changes are left alone. Use `--version x.y.z` for an explicit
version or `--bump minor|major`.

## Pin the new manager URL locally

```sh
aube run pin:manager -- --ref plugin-manager-v4.0.1 \
  --windows-config /mnt/c/Users/Ryan/.config/glance/glance.yml \
  --chezmoi-source ~/.local/share/chezmoi
```

The pin script replaces the manager URL in the given config files. It can also
detect the Windows config under WSL and the default chezmoi source.

Use `--dry-run` to preview. It does not commit the dotfiles; it prints the
commands to commit and apply them.

Environment variables are also supported:

```sh
GLANCE_WINDOWS_CONFIG=/mnt/c/Users/Ryan/.config/glance/glance.yml \
CHEZMOI_SOURCE=$HOME/.local/share/chezmoi \
aube run pin:manager -- --ref plugin-manager-v4.0.1
```

Use a tag or commit SHA rather than `@main` when you need the update
immediately; `@main` is cached by jsDelivr and browsers.
