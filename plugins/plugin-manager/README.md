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

Files go under the config directory (`~/.config/glance` on Linux and macOS, `%USERPROFILE%\.config\glance` on Windows):

```text
~/.config/glance/
├── glance.yml
├── plugins.json            # edit this
└── assets/
    ├── plugin-manager.js
    ├── plugins.json -> ../plugins.json   # served to the browser
    └── themes/
```

Point Glance at the assets directory and load the manager in `glance.yml`:

```yaml
server:
  assets-path: /home/you/.config/glance/assets

document:
  head: |
    <script src="/assets/plugin-manager.js"></script>
```

`assets/plugins.json` is a symlink to `plugins.json` so the browser can fetch the config. Edit the file at the config root. Re-running the installer moves an existing `assets/plugins.json` to the root and replaces it with the symlink.

The link is relative, so `plugins.json` and `assets/` need to stay together. In Docker, mount the config directory and point `assets-path` at its `assets/` subdirectory instead of mounting `assets/` on its own.

Pass a different config directory as the first argument or set `GLANCE_CONFIG`.

## Plugin API

Plugins are ES modules:

```js
export default function setup(config) {
    // plugin code
}

export const version = "1.0.0";
```

TypeScript and plain JavaScript both work. The manager imports the module and calls `setup(config)`.

Plugin sources live in `src/`. The committed `dist/` files are the builds that Glance loads. Rebuild with `aube run build`.

## Adding plugins

`~/.config/glance/plugins.json`
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
