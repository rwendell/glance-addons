# Glance Plugins

Small, self-hosted plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | What it does |
| ------ | ------------ |
| [Enhanced Search](plugins/search-enhanced/) | Open URLs directly from the search bar and show live Google suggestions. |
| [Theme Switcher](plugins/theme-switcher/) | Follow the OS light/dark preference using Glance theme presets, with an optional manual override. |

## `plugin-manager.js` is the entry point

To load other plugins automatically, you need [`plugin-manager.js`](plugin-manager.js). It is the only script referenced from `glance.yml`; it reads the plugin list and configs from `assets/plugins.jsonc`.

Each plugin can still be used **standalone** with its own `data-config` attribute if you do not want the manager.

## Recommended layout

```text
assets/
├── plugin-manager.js
├── plugins.jsonc
├── plugin-lock.json
└── .plugins/
    ├── search-enhanced/
    │   └── search-enhanced.js
    └── theme-switcher/
        ├── kissa.css
        └── theme-switcher.js
```

`glance.yml` only needs the manager and the theme CSS:

```yaml
server:
  assets-path: assets

document:
  head: |
    <script src="/assets/plugin-manager.js"></script>

theme:
  custom-css-file: /assets/.plugins/theme-switcher/kissa.css
```

The manager path is relative to itself, so this also works under a `base-url`.

## `plugins.jsonc`

This is where every plugin's config lives. Comments and trailing commas are allowed.

```jsonc
{
  "plugins": [
    {
      "name": "theme-switcher",
      "config": {
        "lightPreset": "kissa-latte",
        "darkPreset": "kissa-macchiato",
        "autoPreset": "kissa-auto",
        "storageKey": "kissa-theme-mode"
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

| Field | Description |
| ----- | ----------- |
| `name` | Plugin name and the default folder name under `.plugins/`. |
| `config` | Passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |
| `path` | Optional local script path, relative to `assets/`. |
| `url` | Optional direct script URL. |
| `styles` | Optional stylesheet URLs. |

Plugins are loaded in array order. If `path` is omitted, the manager uses `plugin-lock.json` and then falls back to `.plugins/<name>/<name>.js`.

## `plugin-lock.json`

Strict JSON; this is the machine-managed install metadata. Keep the local `path` and the source `repo`/`ref`/`entry` together so the files can be updated or re-downloaded later.

```json
{
  "version": 1,
  "plugins": {
    "theme-switcher": {
      "repo": "rwendell/glance-plugins",
      "ref": "v1.1.0",
      "entry": "plugins/theme-switcher/theme-switcher.js",
      "path": ".plugins/theme-switcher/theme-switcher.js"
    },
    "search-enhanced": {
      "repo": "rwendell/glance-plugins",
      "ref": "v1.1.0",
      "entry": "plugins/search-enhanced/search-enhanced.js",
      "path": ".plugins/search-enhanced/search-enhanced.js"
    }
  }
}
```

If a local file is missing or fails to load, the manager tries the `repo` + `ref` + `entry` URL from jsDelivr.

## Standalone plugins

No manager required:

```yaml
document:
  head: |
    <script src="/assets/theme-switcher.js"
      data-config='{"lightPreset":"kissa-latte","darkPreset":"kissa-macchiato"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

The theme switcher should load without `defer` so it can set the color-scheme marker before paint.

## Remote loading

The manager also exposes a small loader API for loading plugins directly from GitHub or a URL:

```js
GlancePlugins.setup({
  plugins: [
    {
      repo: "rwendell/glance-plugins",
      ref: "v1.1.0",
      name: "search-enhanced",
      config: { suggestions: true }
    }
  ]
});
```

Specs support `repo`, `name`, `ref`, `url`, `entry`, `base`, `manifest`, `styles`, `enabled`, and `config` (object or function). `repo` + `name` resolves through [`glance-plugins.json`](glance-plugins.json), falling back to `plugins/<name>/<name>.js`.

The loader can also be configured with `data-config` on its script tag:

```yaml
document:
  head: |
    <script src="/assets/plugin-manager.js" data-config='{"plugins":[{"repo":"rwendell/glance-plugins","name":"search-enhanced","config":{"suggestions":true}}]}'></script>
```

## Repository layout

```text
plugin-manager.js          # required to auto-load plugins
glance-plugins.json        # remote name -> entry manifest
plugins/
├── search-enhanced/
└── theme-switcher/
```

## Security

Plugins are ordinary JavaScript and run with full access to your dashboard page. Only load repositories and refs you trust. Pinning `ref` to a tag or commit avoids silently picking up new commits.

## Requirements

- Glance v0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path)

## License

MIT
