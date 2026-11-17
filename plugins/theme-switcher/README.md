# Theme Switcher for Glance

Switches a colorscheme's light and dark palettes based on the OS preference.

The plugin manager loads `assets/themes/<colorscheme>.css` automatically when the plugin is configured with a `colorscheme`, so `glance.yml` does not need `theme.custom-css-file`.

## Theme file requirement

A theme file **must define both variants**:

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

If either block is missing, the plugin logs a console error. Single-variant colorschemes are not supported.

The plugin applies:

```html
<html data-glance-scheme="light">
```

or

```html
<html data-glance-scheme="dark">
```

and updates it when `prefers-color-scheme` changes.

See [`examples/kissa.css`](examples/kissa.css) for a complete palette that defines both variants.

## Install with the plugin manager

1. Copy [`theme-switcher.js`](theme-switcher.js) to `assets/.plugins/theme-switcher/theme-switcher.js`.
2. Copy your colorscheme CSS to `assets/themes/<name>.css`.
3. Add the plugin to `assets/plugins.jsonc`:

```jsonc
{
  "name": "theme-switcher",
  "config": {
    "colorscheme": "kissa"
  }
}
```

4. Keep `glance.yml` minimal:

```yaml
document:
  head: |
    <script src="/assets/plugin-manager.js"></script>
```

There is no `styles` entry and no `theme.custom-css-file`. The manager resolves `themes/kissa.css` automatically.

## Standalone install

If you are not using the plugin manager, load the theme CSS yourself and keep the same single config key:

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
```

You can use `theme.custom-css-file: /assets/themes/kissa.css` instead of the `<link>`; the file name must still match the `colorscheme` value so the plugin can validate it.

## Configuration

| Option | Required | Description |
| ------ | -------- | ----------- |
| `colorscheme` | yes | Name of the CSS file in `assets/themes/`, without the `.css` extension. |

The plugin intentionally has no mode/preset settings. It always follows the OS light/dark preference.

## Notes

- The theme CSS is loaded by the manager before the plugin's `setup()` runs.
- `window.GlanceThemeSwitcher.refresh()` reapplies the current OS preference.
- The plugin sets `data-glance-scheme`; it does not change Glance's own theme picker. If you want pure automatic switching, use `theme.disable-picker: true`.
- Tested with Glance v0.8.8.
