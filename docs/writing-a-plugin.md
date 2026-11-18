# Writing a Plugin

A plugin is a JavaScript ES module. Its default export is the entry point:

```js
export default function setup(config) {
    // plugin code
}
```

`config` is the object from `plugins.json`. Exporting a version is optional:

```js
export const version = "1.0.0";
```

TypeScript works too. Build it to JavaScript and commit the output in `dist/`.

## Loading

Remote plugins need a `glance-plugins.json` at the repository root:

```json
{
  "plugins": {
    "my-plugin": {
      "version": "1.0.0",
      "entry": "dist/my-plugin.js"
    }
  }
}
```

`entry` is the JavaScript file the manager loads.

Point `assets/plugins.json` at the repository and plugin name:

```json
{
  "plugins": [
    {
      "plugin": "owner/repo:my-plugin",
      "version": false,
      "config": {}
    }
  ]
}
```

A local plugin can skip the manifest by setting `plugin` to the JavaScript file URL. Install [Plugin Manager](../plugins/plugin-manager/) first.
