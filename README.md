# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 2.0.0 | Required. Resolves and loads the other plugins in the browser. |
| [Enhanced Search](plugins/search-enhanced/) | 1.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 2.1.4 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Requirements

- Glance 0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)
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

`version` accepts lazy.nvim-style semver ranges. See [lazy.nvim versioning](https://lazy.folke.io/spec/versioning).

Plugin tags use `<name>-v<semver>`, for example `theme-switcher-v2.1.4`.

## Runtime

- The manager loads when the dashboard opens.
- It resolves versions, loads plugin scripts from jsDelivr, and calls each `setup(config)`.
- It stores the resolved lock in `localStorage` under `glance-plugin-lock-v1`.
- It checks `plugins.json` every 10 seconds and reloads the dashboard when the file changes.
- No separate process or lock file.

```js
GlancePlugins.getLock();
GlancePlugins.refresh();
```

## Local plugins

`assets/plugins/<name>/<name>.js` takes precedence over the remote plugin.

```text
assets/plugins/my-plugin/my-plugin.js
```

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

Local plugins do not need `plugin` or `version`.

## Example layout

```text
assets/
├── plugin-manager.js
├── plugins.json
├── plugins/
│   └── my-plugin/
│       └── my-plugin.js
└── themes/
    └── kissa.css
```

## Security

Remote plugins run as JavaScript with access to the dashboard page. Pin `version` to a tag for fixed releases. Use local plugins under `assets/plugins/` for code you do not want loaded from jsDelivr.
