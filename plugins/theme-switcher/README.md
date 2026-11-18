# Theme Switcher for Glance

Version 2.1.4. Switches a colorscheme's light and dark palettes and adds a light/dark/system toggle.

## Install

Copy the colorscheme to `assets/themes/<colorscheme>.css`. It must define both:

```css
html[data-glance-scheme="dark"]  { /* dark palette */ }
html[data-glance-scheme="light"] { /* light palette */ }
```

Example: [`examples/kissa.css`](examples/kissa.css).

Plugin manager, `assets/plugins.json`:

```json
{
  "plugin": "rwendell/glance-plugins:theme-switcher",
  "version": false,
  "config": {
    "colorscheme": "kissa"
  }
}
```

Standalone:

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script src="/assets/theme-switcher.js"
      data-config='{"colorscheme":"kissa"}'></script>
```

## Configuration

| Option | Required | Description |
| ------ | -------- | ----------- |
| `colorscheme` | yes | CSS file name in `assets/themes/`, without `.css`. |

The toggle cycles System → Light → Dark → System and replaces Glance's theme picker. The mode is stored in `localStorage` under `glance-theme-mode`.
