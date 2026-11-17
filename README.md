# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 1.0.0 | Required. Loads and configures the other plugins. |
| [Enhanced Search](plugins/search-enhanced/) | 1.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 2.1.4 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Requirements

- Glance 0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)
- `curl`, or `wget` on Linux and macOS. Windows 10 and 11 include `curl.exe`.

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

Add plugin entries to `assets/plugins.jsonc`

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


## Example Layout

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
