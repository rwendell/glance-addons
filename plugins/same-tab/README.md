# Same Tab for Glance

Makes links open in the current tab by default.

Glance's built-in widgets render most links with `target="_blank"`. This plugin
removes that attribute, so a normal click navigates the dashboard tab instead of
opening another one. Ctrl/Cmd/Shift/Alt-click and middle-click still open a new
tab.

## Install

Add this entry to the `plugins` array in `~/.config/glance/plugins.json`:

```json
{
  "plugin": "rwendell/glance-addons:same-tab",
  "version": false
}
```

Standalone: copy `dist/same-tab.js` to `~/.config/glance/assets/`.

```yaml
document:
  head: |
    <script type="module">
      import setup from "/assets/same-tab.js";
      setup();
    </script>
```

## Behavior

- Removes `target="_blank"` from existing links and from links added later.
- Leaves `target="_self"`, `_parent`, `_top`, and named targets alone.
- Modifier clicks and middle clicks keep the browser's new-tab behavior.
- The search widget's `new-tab` setting still works because it does not use
  links for that path.
