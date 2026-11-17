# Theme Switcher for Glance

Switches a colorscheme's light and dark palettes with the OS preference, or with a manual Light/Dark/System control in the header.

Version 2.1.1.

## Requirements

- Glance 0.8 or newer
- A colorscheme CSS file in `assets/themes/`
- The [Plugin Manager](../plugin-manager/README.md), or a manual stylesheet link

## Theme file

The colorscheme file must define both variants:

```css
html[data-glance-scheme="dark"] {
    --scheme: ;
    --bgh: 40;
    --bgs: 17%;
    --bgl: 10%;
    /* ... */
}

html[data-glance-scheme="light"] {
    --scheme: 100% -;
    --bgh: 48;
    --bgs: 20%;
    --bgl: 95%;
    /* ... */
}
```

The plugin sets `data-glance-scheme` to `light` or `dark`. It updates automatically in System mode and stays fixed in Light or Dark mode.

A file with one variant logs a console error. Single-variant colorschemes are not supported.

See [`examples/kissa.css`](examples/kissa.css) for a complete palette.

## Install with the Plugin Manager

1. Copy [`theme-switcher.js`](theme-switcher.js) to `assets/.plugins/theme-switcher/theme-switcher.js`.
2. Copy your colorscheme to `assets/themes/kissa.css`.
3. Add the plugin to `assets/plugins.jsonc`:

```jsonc
{
  "name": "theme-switcher",
  "config": {
    "colorscheme": "kissa"
  }
}
```

4. Add a matching entry to `assets/plugin-lock.json`. See [Plugin Manager](../plugin-manager/README.md).
5. Keep only the manager script in `glance.yml`:

```yaml
document:
  head: |
    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>
```

The plugin entry needs only `colorscheme`. The manager loads `themes/kissa.css`. `glance.yml` has no `theme.custom-css-file` entry.

## Standalone install

Load the colorscheme yourself and pass the same config key:

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
```

You can use `theme.custom-css-file: /assets/themes/kissa.css` in place of the `<link>`. The file name must match the `colorscheme` value.

## Controls

The plugin adds one button to the header and the mobile navigation. Click it to cycle:

**System → Light → Dark → System**

The icon and tooltip show the current mode. **System** follows `prefers-color-scheme`; **Light** and **Dark** pin that palette.

The plugin stores the selected mode in `localStorage` under `glance-theme-mode`.

The plugin hides Glance's theme picker when it loads.

```js
GlanceThemeSwitcher.setMode("system"); // system | light | dark
GlanceThemeSwitcher.getMode();
GlanceThemeSwitcher.refresh();
```

## Configuration

| Option | Required | Description |
| ------ | -------- | ----------- |
| `colorscheme` | yes | CSS file name in `assets/themes/`, without `.css`. |

## Notes

- The manager loads the theme CSS before the plugin's `setup()` runs.
- Theme files resolve from the local `assets/themes/` directory, including remote plugin installs.
- `window.GlanceThemeSwitcher.refresh()` reapplies the current mode.
- The plugin replaces Glance's theme picker with the light/dark/system toggle.
- Tested with Glance 0.8.8.

## License

MIT
