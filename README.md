# Glance Plugins

Small, self-hosted plugins for [Glance](https://github.com/glanceapp/glance).

| Plugin | What it does |
| ------ | ------------ |
| [Enhanced Search](search-enhanced/) | Open URLs directly from the search bar and show live Google suggestions. |
| [Theme Switcher](theme-switcher/) | Follow the OS light/dark preference using Glance theme presets, with an optional manual override. |

## Plugin model

Every plugin exposes a `setup(config)` function. There are two ways to call it.

### Standalone

Copy the plugin into your assets directory and put its config on its own script tag:

```yaml
document:
  head: |
    <script src="/assets/theme-switcher.js"
      data-config='{"lightPreset":"my-light","darkPreset":"my-dark","autoPreset":"my-auto"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true,"maxSuggestions":8}'></script>
```

Each plugin has its own `data-config`, so there is no shared global config block.

### Plugin loader

The loader fetches plugins from GitHub (through jsDelivr) and calls their setup functions. Its config is a list of plugin specs:

```js
GlancePlugins.setup({
  plugins: [
    {
      repo: "rwendell/glance-plugins",
      name: "theme-switcher",
      config: {
        lightPreset: "kissa-latte",
        darkPreset: "kissa-macchiato",
        autoPreset: "kissa-auto",
        storageKey: "kissa-theme-mode"
      }
    },
    {
      repo: "rwendell/glance-plugins",
      name: "search-enhanced",
      config: { suggestions: true }
    }
  ]
});
```

`config` can be an object or a function that returns an object. `enabled: false` skips a plugin. `ref` pins a branch, tag, or commit:

```js
{
  repo: "rwendell/glance-plugins",
  ref: "v1.0.0",
  name: "search-enhanced",
  config: { suggestions: true }
}
```

Plugins are loaded in array order. Use `url` instead of `repo` + `name` for a direct script:

```js
{
  url: "https://example.com/my-plugin.js",
  config: { ... }
}
```

## Installation

### Option A: local files

Copy the plugin files into the directory served by `server.assets-path`:

```yaml
server:
  assets-path: assets
```

Then load each plugin with its own config:

```yaml
document:
  head: |
    <script src="/assets/theme-switcher.js"
      data-config='{"lightPreset":"my-light","darkPreset":"my-dark","autoPreset":"my-auto"}'></script>
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

The theme switcher must load without `defer` so it can set the color-scheme marker before paint. Search enhancements can use `defer`.

### Option B: loader from this repository

```yaml
document:
  head: |
    <script src="https://cdn.jsdelivr.net/gh/rwendell/glance-plugins@main/loader/glance-plugins.js"></script>
    <script>
      GlancePlugins.setup({
        plugins: [
          {
            repo: "rwendell/glance-plugins",
            name: "theme-switcher",
            config: {
              lightPreset: "kissa-latte",
              darkPreset: "kissa-macchiato",
              autoPreset: "kissa-auto"
            }
          },
          {
            repo: "rwendell/glance-plugins",
            name: "search-enhanced",
            config: { suggestions: true }
          }
        ]
      });
    </script>
```

The loader reads [`glance-plugins.json`](glance-plugins.json) to resolve `name` to an entry file. If a repo has no manifest, it falls back to `{name}/{name}.js`. See [`loader/README.md`](loader/README.md) for all spec fields and the plugin contract.

You can also put the loader config directly on its script tag:

```yaml
document:
  head: |
    <script
      src="https://cdn.jsdelivr.net/gh/rwendell/glance-plugins@main/loader/glance-plugins.js"
      data-config='{"plugins":[{"repo":"rwendell/glance-plugins","name":"search-enhanced","config":{"suggestions":true}}]}'></script>
```

### Remote loading and first paint

The theme switcher benefits from loading before first paint. Loading it through the loader is convenient, but the browser may paint once before the remote script arrives, which can flash the wrong theme. For a flash-free setup, keep `theme-switcher.js` local and load it directly with `data-config`, and use the loader for the rest.

## Repository layout

```text
glance-plugins.json          # plugin manifest used by the loader
loader/glance-plugins.js     # optional loader
search-enhanced/             # plugin + docs
theme-switcher/              # plugin + docs + Kissa example
```

## Security

Plugins are ordinary JavaScript and run with full access to your dashboard page. Only load repositories and refs you trust. Pinning `ref` to a tag or commit avoids silently picking up new commits.

## Requirements

- Glance v0.8 or newer
- A directory served through [`server.assets-path`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#assets-path) for local files

## License

MIT
