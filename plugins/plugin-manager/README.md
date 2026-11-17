# Plugin Manager

Loads and configures Glance plugins from `assets/plugins.jsonc`.

Version 1.0.0. This is the only plugin in `glance.yml`.

## Requirements

- Glance 0.8 or newer
- A directory served through `server.assets-path`
- `curl`, or `wget` on Linux and macOS. Windows 10 and 11 include `curl.exe`.

## Install

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.1/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.1/install/install.sh | sh
```

The installers write:

- `assets/.plugins/plugin-manager/plugin-manager.js`
- `assets/plugins.jsonc` with an empty `plugins` array
- `assets/plugin-lock.json` with an empty `plugins` object

Add this to `glance.yml`:

```yaml
document:
  head: |
    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>
```

Use a different assets directory:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.1/install/install.sh | sh -s -- /path/to/assets
```

```bat
set "GLANCE_ASSETS=D:\path\to\assets"
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.1/install/install.cmd | cmd
```

Manual install: copy [`plugin-manager.js`](plugin-manager.js) to `assets/.plugins/plugin-manager/plugin-manager.js` and add the script tag.

The manager looks for `plugins.jsonc` next to itself and two directories up. The `.plugins/plugin-manager/` install finds `assets/plugins.jsonc`.

## Layout

```text
assets/
├── plugins.jsonc
├── plugin-lock.json
├── themes/
└── .plugins/
    ├── plugin-manager/
    │   └── plugin-manager.js
    ├── search-enhanced/
    └── theme-switcher/
```

## `plugins.jsonc`

Use comments and trailing commas.

```jsonc
{
  "plugins": [
    {
      "name": "theme-switcher",
      "config": {
        "colorscheme": "kissa"
      }
    },
    {
      "name": "search-enhanced",
      "config": {
        "suggestions": true
      }
    }
  ]
}
```

| Field | Description |
| ----- | ----------- |
| `name` | Plugin name and the default folder name under `.plugins/`. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |
| `path` | Local script path, relative to `assets/`. |
| `url` | Direct script URL. |
| `styles` | Stylesheet URLs. Resolved relative to `assets/`. |

Plugins load in array order. Without `path`, the manager uses `plugin-lock.json`, then `.plugins/<name>/<name>.js`.

When `config.colorscheme` is set, the manager loads `themes/<colorscheme>.css` automatically.

## `plugin-lock.json`

```json
{
  "version": 1,
  "plugins": {
    "theme-switcher": {
      "version": "2.1.1",
      "repo": "rwendell/glance-plugins",
      "ref": "v2.0.1",
      "entry": "plugins/theme-switcher/theme-switcher.js",
      "path": ".plugins/theme-switcher/theme-switcher.js"
    }
  }
}
```

The manager loads `path` first. If that file is missing, it loads `repo` + `ref` + `entry` from jsDelivr.

## Versions

- Plugin source: `setup.version`.
- [`glance-plugins.json`](../../glance-plugins.json): current version of every plugin.
- `plugin-lock.json`: installed version and source ref.
- Repository tags: distribution snapshots.

The manager appends the installed version to local script URLs and logs a warning when the lock version differs from the plugin's `setup.version`.

## Remote loading

```js
GlancePlugins.setup({
  plugins: [
    {
      repo: "rwendell/glance-plugins",
      ref: "v2.0.1",
      name: "search-enhanced",
      config: { suggestions: true }
    }
  ]
});
```

Specs support `repo`, `name`, `ref`, `url`, `entry`, `base`, `manifest`, `styles`, `enabled`, and `config`. `repo` + `name` resolves through [`glance-plugins.json`](../../glance-plugins.json), then `plugins/<name>/<name>.js`.

Theme files resolve from the local `assets/themes/` directory.

## Troubleshooting

The manager does not load: check the script path in `glance.yml` and `server.assets-path`. The browser console reports missing files.

A plugin does not load: check the `name` in `plugins.jsonc`, the `path` in `plugin-lock.json`, and the browser console.

Theme colors do not change: `assets/themes/<colorscheme>.css` needs both `html[data-glance-scheme="light"]` and `html[data-glance-scheme="dark"]` blocks.

`lock version does not match plugin version`: update the `version` in `plugin-lock.json` or replace the local plugin file with the matching version.
