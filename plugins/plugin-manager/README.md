# Plugin Manager

Resolves and loads Glance plugins.

## Install

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/main/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/main/install/install.sh | sh
```

Add this to `glance.yml`:

```yaml
document: { head: '<script src="/assets/plugin-manager.js"></script>' }
```



## Plugin API

Plugins are ES modules:

```js
export default function setup(config) {
    // plugin code
}

export const version = "1.0.0";
```

TypeScript and plain JavaScript both work. The manager imports the module and calls `setup(config)`.

This repository builds TypeScript plugins with `npm run build`.

## Adding plugins

`plugins.json`
```json
{
  "plugins": [
    {
      "plugin": "rwendell/glance-plugins:theme-switcher",
      "version": false,
      "config": {
        "colorscheme": "kissa"
      }
    },
    {
      "plugin": "rwendell/glance-plugins:search-enhanced",
      "version": false,
      "config": {
        "suggestions": true
      }
    }
  ]
}
```

| Field | Description |
| ----- | ----------- |
| `plugin` | Remote plugin source as `owner/repo:plugin`. Can also be a URI/URL |
| `version` | Semver range or `false`. Defaults to `false`. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |

Version pins resolve against tags named `<plugin>-v<version>`, such as `search-enhanced-v2.0.0`. Installers use the `main` branch.
