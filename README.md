# Glance Plugins

Small, self-hosted plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | What it does |
| ------ | ------------ |
| [Enhanced Search](search-enhanced/) | Open URLs directly from the search bar and show live Google suggestions. |
| [Theme Switcher](theme-switcher/) | Follow the OS light/dark preference using Glance theme presets, with an optional manual override. |

## Requirements

- Glance v0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)

## Installation

Both plugins are plain JavaScript files that you copy into your Glance assets directory and load from `document.head`.

```yaml
server:
  assets-path: assets

document:
  head: |
    <script>
      window.GLANCE_THEME_SWITCHER = {
        lightPreset: "my-light",
        darkPreset: "my-dark",
        autoPreset: "my-auto"
      };
      window.GLANCE_ENHANCED_SEARCH = {
        suggestions: true
      };
    </script>
    <script src="/assets/theme-switcher.js"></script>
    <script src="/assets/search-enhanced.js" defer></script>
```

Each plugin's README contains its full configuration and a copy-paste example. The theme switcher's README includes a complete [Kissa](theme-switcher/examples/kissa.css) palette example.

> If you host Glance under a `base-url`, prefix the asset paths accordingly, e.g. `/glance/assets/theme-switcher.js`.

## License

MIT
