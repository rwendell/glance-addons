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
