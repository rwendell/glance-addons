# Plugin Manager

Resolves and loads Glance plugins.

## Install

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.cmd | cmd
```

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-plugins/v3.0.0/install/install.sh | sh
```

Add this to `glance.yml`:

```yaml
document: { head: '<script src="/assets/plugin-manager.js"></script>' }
```



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
      "version": "^1.0.0",
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
| `name` | Local plugin name and folder name under `plugins/`. Omit for remote plugins. |
| `version` | Semver range or `false`. Defaults to `false`. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |
| `styles` | Optional stylesheet URLs, relative to `assets/`. |
