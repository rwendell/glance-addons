# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 1.0.0 | Required. Loads and configures the other plugins. |
| [Enhanced Search](plugins/search-enhanced/) | 1.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 2.1.2 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Requirements

- Glance 0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)
- `curl`, or `wget` on Linux and macOS. Windows 10 and 11 include `curl.exe`.

## Install the plugin manager

The plugin manager is the only plugin in `glance.yml`.

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.3/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.3/install/install.sh | sh
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
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.3/install/install.sh | sh -s -- /path/to/assets
```

```bat
set "GLANCE_ASSETS=D:\path\to\assets"
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v2.0.3/install/install.cmd | cmd
```

Manual install: copy [`plugins/plugin-manager/plugin-manager.js`](plugins/plugin-manager/plugin-manager.js) to `assets/.plugins/plugin-manager/plugin-manager.js` and add the script tag.

If the manager does not load, check the script path and `server.assets-path`. The browser console reports missing files.

## Add plugins

Add plugin entries to `assets/plugins.jsonc` and install metadata to `assets/plugin-lock.json`.

`assets/plugins.jsonc`:

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
        "directUrls": true,
        "suggestions": true,
        "maxSuggestions": 8
      }
    }
  ]
}
```

`assets/plugin-lock.json`:

```json
{
  "version": 1,
  "plugins": {
    "theme-switcher": {
      "version": "2.1.2",
      "repo": "rwendell/glance-plugins",
      "ref": "v2.0.3",
      "entry": "plugins/theme-switcher/theme-switcher.js",
      "path": ".plugins/theme-switcher/theme-switcher.js"
    },
    "search-enhanced": {
      "version": "1.0.0",
      "repo": "rwendell/glance-plugins",
      "ref": "v2.0.3",
      "entry": "plugins/search-enhanced/search-enhanced.js",
      "path": ".plugins/search-enhanced/search-enhanced.js"
    }
  }
}
```

The manager loads `path` first. If that file is missing, it loads the `repo` + `ref` + `entry` URL from jsDelivr.

Theme Switcher reads `assets/themes/<colorscheme>.css`. The file must define both variants:

```css
html[data-glance-scheme="dark"]  { /* dark palette */ }
html[data-glance-scheme="light"] { /* light palette */ }
```

The [Plugin Manager docs](plugins/plugin-manager/README.md) list every `plugins.jsonc` field and the remote-loading API.

## Versions

Each plugin has its own semantic version. The plugin source declares it as `setup.version`, [`glance-plugins.json`](glance-plugins.json) lists current versions, and `plugin-lock.json` records installed versions.

Repository tags such as `v2.0.3` are distribution snapshots. They do not replace per-plugin versions.

The manager appends the installed version to local script URLs and logs a warning when the lock version differs from the plugin's `setup.version`.

## Layout

```text
assets/
├── plugins.jsonc
├── plugin-lock.json
├── themes/
│   └── kissa.css
└── .plugins/
    ├── plugin-manager/
    ├── search-enhanced/
    └── theme-switcher/
```

## Standalone plugins

Enhanced Search and Theme Switcher run without the manager. Copy the plugin file into `assets/` and use its own `data-config` attribute. See each plugin README for the script tag.

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

## Repository layout

```text
install/
├── install.sh
└── install.cmd
glance-plugins.json
plugins/
├── plugin-manager/
├── search-enhanced/
└── theme-switcher/
```

## Security

Plugins run as JavaScript with access to the dashboard page. Load repositories and refs you trust. A tag or commit in `ref` keeps installs on a fixed version.

## License

MIT
