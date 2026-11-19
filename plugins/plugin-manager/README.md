# Plugin Manager

Resolves and loads Glance plugins.

## Installer

Linux and macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/rwendell/glance-addons/main/install/install.sh | sh
```

Windows:

```bat
curl.exe -fsSL https://raw.githubusercontent.com/rwendell/glance-addons/main/install/install.cmd | cmd
```

The installer sets up:

```text
~/.config/glance/
├── glance.yml              # entry point
├── plugins.json            # edit this
├── pages/
│   └── home.yml            # page definitions
└── assets/
    ├── plugins.json -> ../plugins.json
    └── themes/
```

The generated `glance.yml` loads the manager from jsDelivr and includes every
page file:

```yaml
server:
  assets-path: /home/you/.config/glance/assets

document:
  head: |
    <script src="https://cdn.jsdelivr.net/gh/rwendell/glance-addons@main/plugins/plugin-manager/dist/plugin-manager.js"></script>

pages:
  - $include: pages/home.yml
```

Each `pages/*.yml` file is one list item:

```yaml
- name: Home
  columns:
    - size: full
      widgets:
        - type: search
```

Add a new file under `pages/` and a matching `- $include: pages/<name>.yml`
line in the root `glance.yml`.

If the config directory already exists and is not an installer-generated
scaffold, the installer moves the whole directory to `~/.config/glance.bak` (or
`.bak.1`, `.bak.2`, etc.) and writes a fresh scaffold. It copies `plugins.json`,
`pages/`, and `assets/` into the new directory. Move any page definitions still in the backup's `glance.yml` into
`pages/`, and copy theme, branding, auth, or other top-level settings into the
new root. If your old config used a different `assets-path`, update the
generated `server.assets-path` or move those assets.

Re-running the installer keeps a scaffold that it generated. It only backs up a
config directory whose `glance.yml` does not have the generated marker. To force
a fresh scaffold, move `glance.yml` out of the directory and rerun.

`assets/plugins.json` is a symlink to `plugins.json` so the browser can fetch
the config. Edit the file at the config root. The link is relative, so
`plugins.json` and `assets/` need to stay together. In Docker, mount the config
directory and point `assets-path` at its `assets/` subdirectory.

Set `GLANCE_CONFIG` to use a different config directory. The shell installer
also accepts it as the first argument.

### Local manager

The installer uses the remote manager by default. Pass `--local` or set
`GLANCE_PLUGINS_LOCAL=1` to download `assets/plugin-manager.js` instead. The
generated `glance.yml` then points at `/assets/plugin-manager.js`.

## Manual install

Point the manager at jsDelivr and keep `plugins.json`:

```yaml
document:
  head: |
    <script src="https://cdn.jsdelivr.net/gh/rwendell/glance-addons@main/plugins/plugin-manager/dist/plugin-manager.js"></script>
```

The manager fetches `<base-url>/assets/plugins.json` and themes from
`<base-url>/assets/themes/`. Put `plugins.json` in the assets directory, or use
`data-config-url` to point somewhere else.

`plugins.json` is read once when the page loads. Refresh the browser after
editing it; there is no background polling.

Pin a tag instead of `main` for a fixed version.

`~/.config/glance/plugins.json`:

```json
{
  "plugins": [
    {
      "plugin": "rwendell/glance-addons:theme-switcher",
      "version": false,
      "checkEvery": "6h",
      "config": {
        "colorscheme": "kissa"
      }
    }
  ]
}
```

If you would rather keep the plugin list in `glance.yml`, omit `plugins.json`
and pass the same object through `data-config`:

```yaml
document:
  head: |
    <script
      src="https://cdn.jsdelivr.net/gh/rwendell/glance-addons@main/plugins/plugin-manager/dist/plugin-manager.js"
      data-config='{"plugins":[
        {"plugin":"rwendell/glance-addons:theme-switcher","config":{"colorscheme":"kissa"}},
        {"plugin":"rwendell/glance-addons:search-enhanced","config":{"suggestions":true}}
      ]}'></script>
```

### Script attributes

| Attribute | Description |
| --------- | ----------- |
| `data-config` | Inline config JSON. |
| `data-config-url` | Config file URL. Default: `assets/plugins.json`. |
| `data-themes` | Theme CSS directory. Default: `assets/themes/`. |

Relative plugin URLs resolve against the assets directory, so
`"plugin": "plugins/my-plugin/my-plugin.js"` loads
`assets/plugins/my-plugin/my-plugin.js`.

## Plugin API

Plugins are ES modules:

```js
export default function setup(config) {
    // plugin code
}

export const version = "1.0.0";
```

TypeScript and plain JavaScript both work. The manager imports the module and calls `setup(config)`.

Plugin sources live in `src/`. The committed `dist/` files are the builds that Glance loads. Rebuild with `aube run build`, or use `aube run build:watch` while developing. The bundler config is `tsdown.config.ts`.

Remote plugin repositories use `plugins/manifest.json` for one or more plugins,
or a single `index.js` at the repository root. In the manifest, top-level keys
are plugin names and `entry` paths are relative to `plugins/`. The manifest
moved here in 4.0.0; older managers read the old root path.

## Adding plugins

| Field | Description |
| ----- | ----------- |
| `plugin` | Remote plugin source as `owner/repo:plugin`. Can also be a URI/URL |
| `version` | Semver range or `false`. Defaults to `false`. |
| `checkEvery` | How often to check for a newer commit/tag. Duration like `30m`, `6h`, `1d`. Defaults to `6h`; ignored for exact versions. |
| `config` | Object passed to the plugin's `setup(config)`. |
| `enabled` | Set to `false` to skip the plugin. |

Version pins resolve against tags named `<plugin>-v<version>`, such as `search-enhanced-v2.0.0`. The installer and manual examples use the `main` branch.

## Caching

Plugins are loaded with dynamic `import()`, so each module is evaluated once
per page load and reused from the browser cache after that. Remote plugin URLs
resolve to a commit SHA (`version: false`) or a tag (`version: "^3.0.0"`), both
of which jsDelivr caches aggressively.

`version: false` and version ranges check for updates at most once every six
hours by default. Set `checkEvery` on a plugin to change that window (`0s`
checks on every page load). The resolved version is stored in `localStorage`.

GitHub commit checks use ETag conditional requests, so an unchanged commit
returns `304 Not Modified` and the commit payload is not downloaded again.
These are unauthenticated requests, so the check window is what keeps usage
within GitHub's 60/hour limit. If a check fails, the manager keeps the cached
commit and retries the next day (24 hours) instead of retrying on every page
load.

Pin an exact version to skip update checks entirely. `GlancePlugins.refresh()`
clears the lock and reloads if you need to re-resolve immediately.

`plugins.json` itself is a small same-origin request. It is revalidated on each
page load, which usually returns a 304 and does not download the file again.
