# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 1.1.0 | Required. Loads and configures the other plugins. |
| [Enhanced Search](plugins/search-enhanced/) | 1.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 2.1.4 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Requirements

- Glance 0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)
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

The installer writes the plugin manager and updater to `assets/.plugins/plugin-manager/`, then creates an empty `assets/plugins.jsonc`.

Add this to `glance.yml`:

```yaml
document:
  head: |
    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>
```

## Installing Plugins

### Standalone plugins

Copy the plugin file into `assets/` and use its own `data-config` attribute. See each plugin README for the script tag.

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

### With [Plugin Manager](plugins/plugin-manager/)

Add plugin entries to `assets/plugins.jsonc`:

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
        "directUrls": true,
        "suggestions": true,
        "maxSuggestions": 8
      }
    }
  ]
}
```

`version` accepts lazy.nvim-style semver ranges:

| Value | Result |
| ----- | ------ |
| `false` | Latest commit on the default branch. This is the default. |
| `"*"` | Latest stable plugin tag. |
| `"^2.1.0"` | Latest tag compatible with `2.1.0`. |
| `"~2.1.0"` | Latest patch release of `2.1.0`. |
| `"2.1.x"` | Latest tag starting with `2.1`. |
| `">=2.1.0"` | Latest tag at or above `2.1.0`. |
| `"2.1.4"` | Exact tag. |

Run the updater after editing `plugins.jsonc`:

```sh
assets/.plugins/plugin-manager/glance-plugins update
```

```bat
assets\.plugins\plugin-manager\glance-plugins.exe update
```

The updater resolves versions, downloads plugin files into `assets/.plugins/`, and writes `assets/plugin-lock.json`. Do not edit the lock file.

## Example Layout

```text
assets/
├── plugins.jsonc
├── plugin-lock.json
├── themes/
│   └── kissa.css
└── .plugins/
    ├── plugin-manager/
    │   ├── plugin-manager.js
    │   └── glance-plugins(.exe)
    ├── search-enhanced/
    └── theme-switcher/
```
