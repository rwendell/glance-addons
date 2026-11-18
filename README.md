# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 3.0.0 | Resolves and loads the other plugins in the browser. |
| [Enhanced Search](plugins/search-enhanced/) | 2.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 3.0.0 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Install

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/main/install/install.sh | sh
```

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/main/install/install.cmd | cmd
```

The installer writes to `~/.config/glance` (`$XDG_CONFIG_HOME/glance` when set): the manager goes in `assets/`, and `plugins.json` sits at the config root. See [Plugin Manager](plugins/plugin-manager/) for the layout and `glance.yml` setup.

## Loading plugins without Plugin Manager

Plugins are ES modules. Copy them into your Glance assets directory (`~/.config/glance/assets/` by default) and load them directly:

```yaml
#glance.yml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script type="module">
      import setupTheme from "/assets/theme-switcher.js";
      import setupSearch from "/assets/search-enhanced.js";
      setupTheme({ colorscheme: "kissa" });
      setupSearch({ suggestions: true });
    </script>
```
