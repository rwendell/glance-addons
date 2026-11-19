# Glance Plugins

Plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 3.1.0 | Resolves and loads the other plugins in the browser. |
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

The installer loads the manager from jsDelivr and creates a config scaffold under the Glance config directory (`~/.config/glance` by default):

```text
~/.config/glance/
├── glance.yml              # entry point: server, document.head, page includes
├── plugins.json            # edit this
├── pages/
│   └── home.yml            # page definitions
└── assets/
    ├── plugins.json -> ../plugins.json
    └── themes/
```

If the config directory already exists and is not an installer-generated scaffold, it is moved to `<config-dir>.bak` (for example, `~/.config/glance.bak`) first and a fresh scaffold is created. `plugins.json`, `pages/`, and `assets/` are copied into the new directory. Move any page definitions still in the backup's `glance.yml` into `pages/`, and copy theme, branding, auth, and other settings into the new root file.

The manager and plugins load from jsDelivr. Set `GLANCE_PLUGINS_LOCAL=1` (or pass `--local`) to download a local manager instead.

See [Plugin Manager](plugins/plugin-manager/) for the generated `glance.yml`, manual setup, and `plugins.json`.

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
