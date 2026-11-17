# Plugin Manager

Loads and configures Glance plugins from `assets/plugins.jsonc`.

Version 1.1.0. The plugin manager is the only plugin in `glance.yml`.

## Requirements

- Glance 0.8 or newer
- A directory served through `server.assets-path`
- `curl`, or `wget` on Linux and macOS. Windows 10 and 11 include `curl.exe`.

## Install

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.1.0/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.1.0/install/install.sh | sh
```

The installer writes:

- `assets/.plugins/plugin-manager/plugin-manager.js`
- `assets/.plugins/plugin-manager/glance-plugins` or `glance-plugins.exe`
- `assets/plugins.jsonc` with an empty `plugins` array

Add this to `glance.yml`:

```yaml
document:
  head: |
    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>
```

Use a different assets directory:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.1.0/install/install.sh | sh -s -- /path/to/assets
```

```bat
set "GLANCE_ASSETS=D:\path\to\assets"
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.1.0/install/install.cmd | cmd
```

## `plugins.jsonc`

```jsonc
{
  "plugins": [
    {
      "name": "theme-switcher",
      "version": false,
      "config": {
        "colorscheme": "kissa"
      }
    },
    {
      "name": "search-enhanced",
      "version": "^1.0.0",
      "config": {
        "suggestions": true
      }
    }
  ]
}
```

| Field | Description |
| ----- | ----------- |
| `name` | Plugin name and folder name under `.plugins/`. |
| `version` | Semver range, or `false` for the latest commit. Defaults to `false`. |
| `repo` | Optional source repository. Defaults to `rwendell/glance-plugins`. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |
| `path` | Optional local script path, relative to `assets/`. |
| `url` | Optional direct script URL. |
| `styles` | Optional stylesheet URLs, relative to `assets/`. |

Plugins load in array order.

## Updater

Run the updater after editing `plugins.jsonc`:

```sh
assets/.plugins/plugin-manager/glance-plugins update
```

```bat
assets\.plugins\plugin-manager\glance-plugins.exe update
```

The updater:

- Resolves each `version` against the plugin's semver tags.
- `version: false` resolves to the latest commit on the default branch.
- Downloads the plugin entry into `assets/.plugins/<name>/`.
- Writes `assets/plugin-lock.json` with resolved versions, tags, commits, and paths.

Do not edit `plugin-lock.json`. The next updater run rewrites it.

Flags:

| Flag | Description |
| ---- | ----------- |
| `--dry-run` | Resolve and print versions without downloading or writing. |
| `--force` | Download every plugin. |
| `--assets PATH` | Assets directory. Defaults to the directory detected from the updater location. |
| `--repo OWNER/NAME` | Default plugin repository. |

Set `GITHUB_TOKEN` to raise the GitHub API rate limit.

## Lock file

```json
{
  "version": 1,
  "generatedAt": "2026-11-17T22:10:43Z",
  "plugins": {
    "theme-switcher": {
      "requested": false,
      "version": "2.1.4",
      "repo": "rwendell/glance-plugins",
      "ref": "75670a0cdf23e0266479f56f56346e0927c9b07e",
      "commit": "75670a0cdf23e0266479f56f56346e0927c9b07e",
      "entry": "plugins/theme-switcher/theme-switcher.js",
      "path": ".plugins/theme-switcher/theme-switcher.js",
      "resolvedAt": "2026-11-17T22:10:43Z"
    }
  }
}
```

The runtime manager loads `path` from the lock. If the local file is missing, it loads `repo` + `ref` + `entry` from jsDelivr.

## Versions

Each plugin has its own semantic version and its own tag, for example `theme-switcher-v2.1.4`.

`version` in `plugins.jsonc` selects a tag:

| Value | Result |
| ----- | ------ |
| `false` | Latest commit on the default branch. |
| `"*"` | Latest stable tag. |
| `"^2.1.0"` | Latest compatible tag. |
| `"~2.1.0"` | Latest patch tag. |
| `"2.1.x"` | Latest tag starting with `2.1`. |
| `">=2.1.0"` | Latest tag at or above `2.1.0`. |
| `"2.1.4"` | Exact tag. |

## Troubleshooting

The manager does not load: check the script path in `glance.yml` and `server.assets-path`.

A plugin does not load: run the updater, then check the browser console and `plugin-lock.json`.

`no lock entry` warning: run the updater.

`lock version does not match plugin version`: rerun the updater.

## Remote loading

```js
GlancePlugins.setup({
  plugins: [
    {
      repo: "rwendell/glance-plugins",
      ref: "theme-switcher-v2.1.4",
      name: "theme-switcher",
      config: { colorscheme: "kissa" }
    }
  ]
});
```

Theme files resolve from the local `assets/themes/` directory.
