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

Remote plugins need a `plugins/manifest.json` file:

```json
{
  "my-plugin": {
    "version": "1.0.0",
    "entry": "my-plugin/dist/my-plugin.js"
  }
}
```

Each top-level key is the plugin name. `entry` is relative to the `plugins/`
directory.
