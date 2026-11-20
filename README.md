# Glance Addons

Plugins and widgets for [Glance](https://github.com/glanceapp/glance).

## Plugins

| Plugin | Version | Description |
| ------ | ------- | ----------- |
| [Plugin Manager](plugins/plugin-manager/) | 4.0.2 | Resolves and loads the other plugins in the browser. |
| [Same Tab](plugins/same-tab/) | 1.0.0 | Opens links in the current tab by default. |
| [Enhanced Search](plugins/search-enhanced/) | 2.0.0 | Opens URLs from the search bar and shows Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | 3.0.0 | Switches a colorscheme's light and dark palettes. Adds a light/dark/system control to the header. |

## Widgets

Widgets are `custom-api` YAML files. Copy a `widget.yml` into your config and
`$include` it, or paste the YAML into `glance.yml`. The plugin manager does not
install widgets.

| Widget | Description |
| ------ | ----------- |
| [AniList](widgets/anilist/) | Current anime and manga progress from AniList. |
| [GitHub Updates](widgets/github-updates/) | Recently updated GitHub repositories. |
| [Hardcover](widgets/hardcover/) | Recent reading activity from Hardcover. |
| [Infinite Backlog](widgets/infinite-backlog/) | Games currently playing on Infinite Backlog. |

See [widgets/](widgets/) for usage and layout.

## Install

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-addons/main/install/install.sh | sh
```

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-addons/main/install/install.cmd | cmd
```

See [Plugin Manager](plugins/plugin-manager/) for the generated `glance.yml`, manual setup, and `plugins.json`.

## Development

See [scripts/README.md](scripts/README.md) for releasing the plugin manager and
pinning its URL locally.

## Launching Glance

Optional systemd and Windows startup templates live in [`launch/`](launch/).
They read widget profile values from `~/.config/glance/glance.env`.

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
