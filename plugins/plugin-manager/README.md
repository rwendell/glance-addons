# Plugin Manager

Resolves and loads Glance plugins in the browser.

Version 2.0.0. The plugin manager is the only plugin in `glance.yml`.

## Requirements

- Glance 0.8 or newer
- A directory served through `server.assets-path`
- Network access to jsDelivr and GitHub for remote plugins

## Install

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.sh | sh
```

The installer writes:

- `assets/plugin-manager.js`
- `assets/plugins.json` with an empty `plugins` array
- `assets/plugins/` for local plugins

Add this to `glance.yml`:

```yaml
document:
  head: |
    <script src="/assets/plugin-manager.js"></script>
```

Use a different assets directory:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.sh | sh -s -- /path/to/assets
```

```bat
set "GLANCE_ASSETS=D:\path\to\assets"
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.cmd | cmd
```

## `plugins.json`

Strict JSON. No comments or trailing commas.

```json
{
  "plugins": [
    {
      "name": "theme-switcher",
      "plugin": "rwendell/glance-plugins",
      "version": false,
      "config": {
        "colorscheme": "kissa"
      }
    },
    {
      "name": "search-enhanced",
      "plugin": "rwendell/glance-plugins",
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
| `name` | Plugin name and folder name under `plugins/`. |
| `plugin` | GitHub repository as `owner/repo`. Defaults to `rwendell/glance-plugins`. |
| `version` | Semver range or `false`. Defaults to `false`. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |
| `path` | Optional local script path, relative to `assets/`. |
| `url` | Optional direct script URL. |
| `styles` | Optional stylesheet URLs, relative to `assets/`. |

Plugins load in array order.

## Versions

`version` accepts lazy.nvim-style semver ranges and `false` for the latest commit. See [lazy.nvim versioning](https://lazy.folke.io/spec/versioning).

Plugin tags use `<name>-v<semver>`, for example `theme-switcher-v2.1.4`.

The manager resolves tags through the jsDelivr package API and latest commits through the GitHub API.

## Local plugins

`assets/plugins/<name>/<name>.js` takes precedence over the remote plugin.

```json
{
  "plugins": [
    {
      "name": "my-plugin",
      "config": {}
    }
  ]
}
```

The manager checks the local file before resolving `plugin` or `version`.

## Runtime

1. Fetch `plugins.json`.
2. Check `plugins/<name>/<name>.js`.
3. Resolve remote versions and fetch `glance-plugins.json`.
4. Load theme stylesheets from `themes/`.
5. Load plugin scripts from jsDelivr.
6. Call each plugin's `setup(config)`.
7. Write the resolved lock to `localStorage`.
8. Poll `plugins.json` every 10 seconds and reload on change.

Lock key: `glance-plugin-lock-v1`.

```js
GlancePlugins.getLock();
GlancePlugins.refresh();
```

`refresh()` clears the cached lock and reloads the dashboard.

## Troubleshooting

- `Invalid plugins.json`: validate the file as JSON. No comments or trailing commas.
- `Failed to resolve`: check network access to GitHub and jsDelivr, or pin an exact `version`.
- `Failed to load`: check the plugin entry in `glance-plugins.json`.
- Theme colors do not change: `assets/themes/<colorscheme>.css` needs both `html[data-glance-scheme="light"]` and `html[data-glance-scheme="dark"]` blocks.
- Local plugin ignored: the file path must be `assets/plugins/<name>/<name>.js` or set `path`.

## Security

Remote plugins run as JavaScript with access to the dashboard page. Pin `version` to a tag for fixed releases. Local plugin files load from `assets/plugins/`.
