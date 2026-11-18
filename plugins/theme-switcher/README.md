# Theme Switcher for Glance

Switches a colorscheme's light and dark palettes and adds a light/dark/system toggle.

## Install

Copy the colorscheme to `~/.config/glance/assets/themes/<colorscheme>.css`. It must define both:

```css
html[data-glance-scheme="dark"]  { /* dark palette */ }
html[data-glance-scheme="light"] { /* light palette */ }
```

Example: [`examples/kissa.css`](examples/kissa.css).

Add this entry to the `plugins` array in `~/.config/glance/plugins.json`:

```json
{
  "plugin": "rwendell/glance-plugins:theme-switcher",
  "version": false,
  "config": {
    "colorscheme": "kissa"
  }
}
```

Standalone: copy `dist/theme-switcher.js` to `~/.config/glance/assets/`.

```yaml
document:
  head: |
    <link rel="stylesheet" href="/assets/themes/kissa.css">
    <script type="module">
      import setup from "/assets/theme-switcher.js";
      setup({ colorscheme: "kissa" });
    </script>
```

## Configuration

| Option | Required | Description |
| ------ | -------- | ----------- |
| `colorscheme` | yes | CSS file name in `assets/themes/`, without `.css`. |
