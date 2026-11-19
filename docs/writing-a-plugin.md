# Writing a Plugin

A plugin is a JavaScript ES module. Its default export is the entry point:

```js
export default function setup(config) {
    // plugin code
}
```

`config` is the plugin's entry in `~/.config/glance/plugins.json` or in the
manager's `data-config` attribute. Exporting a version is optional:

```js
export const version = "1.0.0";
```

## Loading

Remote plugin repositories use one of two layouts:

- `plugins/manifest.json` for one or more plugins. Each top-level key is a
  plugin name, and `entry` is relative to `plugins/`.
- `index.js` at the repository root for a single plugin.

```json
{
  "my-plugin": {
    "version": "1.0.0",
    "entry": "my-plugin/dist/my-plugin.js"
  }
}
```

For a single plugin, skip the manifest and provide `index.js` at the repo root.
It still needs the default `setup` export shown above.
