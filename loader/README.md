# Plugin Loader

Loads plugins from GitHub (through jsDelivr) or any URL and calls each plugin's `setup(config)`.

The loader is optional. Every plugin also works standalone with its own `data-config` attribute.

## Usage

```html
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

Or put the config on the loader's own script tag:

```html
<script
  src="https://cdn.jsdelivr.net/gh/rwendell/glance-plugins@main/loader/glance-plugins.js"
  data-config='{"plugins":[{"repo":"rwendell/glance-plugins","name":"search-enhanced","config":{"suggestions":true}}]}'></script>
```

## Specs

| Field | Description |
| ----- | ----------- |
| `repo` | GitHub repository, e.g. `rwendell/glance-plugins`. |
| `name` | Plugin name. Resolved through the repo's `glance-plugins.json`, falling back to `{name}/{name}.js`. |
| `ref` | Branch, tag, or commit. Defaults to `main`. Pin a tag or commit for stability. |
| `url` | Direct script URL. Takes precedence over `repo`. |
| `entry` | Optional explicit path relative to the repo root. |
| `base` | Optional base URL when hosting plugins yourself. |
| `manifest` | Optional manifest path. Defaults to `glance-plugins.json`. |
| `styles` | Array of stylesheet URLs, resolved relative to the plugin script. |
| `config` | Object or function returning an object, passed to the plugin's `setup()`. |
| `enabled` | Set to `false` to skip a plugin. |

String shorthand is supported:

```js
GlancePlugins.setup({
  plugins: ["rwendell/glance-plugins#theme-switcher"]
});
```

## API

```js
GlancePlugins.setup({ plugins: [...] }); // load a list
GlancePlugins.use(spec);                 // load one plugin
GlancePlugins.get("search-enhanced");    // get a registered setup function
GlancePlugins.setup(["owner/repo#plugin"]); // array shorthand
```

## Plugin contract

A plugin script registers itself and skips automatic setup while the loader is loading:

```js
(function () {
  function setup(config) {
    // ...
  }

  const registry = window.GlancePlugins || (window.GlancePlugins = {});

  if (typeof registry.register === "function") {
    registry.register("my-plugin", setup);
  }

  if (!registry._loading) {
    setup(/* standalone config from data-config */);
  }
})();
```

Plugins in this repository use this pattern.

## Security

The loader executes remote JavaScript in your dashboard. Pin `ref` to a tag or commit and only load repositories you trust.
