# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 2.0.0 | Resolves and loads the other plugins in the browser. |
| [Enhanced Search](plugins/search-enhanced/) | 1.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 2.1.4 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |


## Loading Plugins without Plugin Manager

Copy plugin files into `assets/` and load them directly:

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

