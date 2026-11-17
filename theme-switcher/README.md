# Theme Switcher for Glance

Follows your operating system's light/dark preference and switches between two Glance theme presets automatically. The theme picker still works: pick the light or dark preset to pin a variant, pick the auto preset to follow the OS again, or pick any other theme to turn the switcher off.

The switcher avoids a flash of the wrong theme by applying a marker attribute to `<html>` **before the page paints**. Your palette lives in CSS, so no request is needed to switch.

## How it works

The plugin sets:

```html
<html data-glance-scheme="light">
```

or

```html
<html data-glance-scheme="dark">
```

Your `theme.custom-css-file` maps those markers to Glance's CSS variables:

```css
html[data-glance-scheme="dark"] {
    --scheme: ;
    --bgh: 40;
    --bgs: 17%;
    --bgl: 10%;
    --cm: 1.15;
    --tsm: 1.6;
    --color-primary: hsl(211 50% 66%);
    --color-positive: hsl(97 34% 58%);
    --color-negative: hsl(0 71% 69%);
}

html[data-glance-scheme="light"] {
    --scheme: 100% -;
    --bgh: 48;
    --bgs: 20%;
    --bgl: 95%;
    --cm: 1;
    --tsm: 1.6;
    --color-primary: hsl(213 53% 43%);
    --color-positive: hsl(146 33% 33%);
    --color-negative: hsl(0 44% 43%);
}
```

When the switcher is off, the attribute is removed and Glance's own theme rendering applies normally.

## Installation

1. Copy [`theme-switcher.js`](theme-switcher.js) into your assets directory.
2. Copy your palette CSS into the same directory (see [`examples/kissa.css`](examples/kissa.css) for a complete example).
3. Define three presets in `glance.yml`: light, dark, and an auto/fallback preset.
4. Configure the plugin and load it from `document.head`.

A complete Kissa example is in [`examples/glance.yml`](examples/glance.yml).

```yaml
server:
  assets-path: assets

document:
  head: |
    <script>
      window.GLANCE_THEME_SWITCHER = {
        lightPreset: "my-light",
        darkPreset: "my-dark",
        autoPreset: "my-auto",
        storageKey: "my-theme-mode"
      };
    </script>
    <script src="/assets/theme-switcher.js"></script>

theme:
  custom-css-file: /assets/my-theme.css

  # Fallback used by the server before the plugin runs.
  background-color: 240 8 9
  primary-color: 43 50 70

  presets:
    my-dark:
      background-color: 240 8 9
      primary-color: 43 50 70
    my-light:
      light: true
      background-color: 240 13 95
      primary-color: 230 100 30
    my-auto:
      # Same as my-dark. Used as the picker's "Auto" entry and as
      # the no-JavaScript fallback.
      background-color: 240 8 9
      primary-color: 43 50 70
```

The script must load **without** `defer` so the marker is set before paint. The config object must be defined before the script tag.

## Configuration

| Option | Default | Description |
| ------ | ------- | ----------- |
| `lightPreset` | `glance-light` | Preset key used when the light variant is active. |
| `darkPreset` | `glance-dark` | Preset key used when the dark variant is active. |
| `autoPreset` | `glance-auto` | Picker entry that re-enables automatic switching. |
| `storageKey` | `glance-theme-mode` | `localStorage` key for the selected mode. |
| `defaultMode` | `auto` | Mode for first-time visitors: `auto`, `light`, `dark`, or `off`. |
| `attribute` | `data-glance-scheme` | Attribute set on `<html>`. Change it if it conflicts with something. |

## Picker behavior

| Picker selection | Mode |
| ---------------- | ---- |
| Auto preset | `auto` — follows the OS and switches live. |
| Light preset | `light` — pinned, ignores OS changes. |
| Dark preset | `dark` — pinned, ignores OS changes. |
| Any other theme | `off` — switcher is disabled and the normal Glance theme applies. |

Selections are remembered in `localStorage`, so a manual choice survives reloads.

### Hide the picker

If you always want automatic switching and do not need a UI, add this to your theme:

```yaml
theme:
  disable-picker: true
```

The switcher still follows the OS. You can change modes from the browser console:

```js
GlanceThemeSwitcher.setMode("light"); // auto | light | dark | off
GlanceThemeSwitcher.getMode();
```

## JavaScript API

The plugin exposes:

```js
GlanceThemeSwitcher.setMode("auto");
GlanceThemeSwitcher.getMode(); // "auto" | "light" | "dark" | "off"
GlanceThemeSwitcher.refresh(); // reapply the current mode
```

## Notes

- The plugin sets `data-glance-scheme`, not Glance's `data-scheme`. Your CSS is responsible for `--scheme` and the palette variables, which avoids fighting Glance's server-rendered theme.
- `autoPreset` is only used for the picker and the initial preset; you can omit it if you do not want an Auto entry.
- Tested with Glance v0.8.8.

## Kissa example

[`examples/kissa.css`](examples/kissa.css) is a complete [Kissa](https://github.com/rwendell/kissa) palette for both schemes, and [`examples/glance.yml`](examples/glance.yml) shows the full config. The Kissa repository also ships the individual color presets under [`extras/glance/`](https://github.com/rwendell/kissa/tree/main/extras/glance).

## License

MIT
