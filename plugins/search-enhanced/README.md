# Enhanced Search for Glance

Adds URL opening and Google suggestions to the Glance search widget.

Version 1.0.0.

- Type `youtube.com` and press Enter to open it.
- Suggestions load under the search bar as you type.
- Bangs take priority: `!gh youtube.com` searches GitHub.
- File-like tokens search normally: `main.py`, `notes.md`.
- <kbd>↑</kbd>/<kbd>↓</kbd> select, <kbd>Enter</kbd> opens, <kbd>Esc</kbd> closes.
- The search widget's `new-tab` setting applies. <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Enter</kbd> inverts it.

A URL query shows two rows: **Open** and **Search for "…"**.

## Install

### Plugin manager

Add an entry to `assets/plugins.json`:

```json
{
  "name": "search-enhanced",
  "plugin": "rwendell/glance-plugins",
  "version": false,
  "config": {
    "directUrls": true,
    "suggestions": true,
    "maxSuggestions": 8
  }
}
```

For a local copy, place [`search-enhanced.js`](search-enhanced.js) at `assets/plugins/search-enhanced/search-enhanced.js` and omit `plugin` and `version`.

See [Plugin Manager](../plugin-manager/README.md).

### Standalone

Copy the plugin to `assets/search-enhanced.js` and load it with its own config:

```yaml
document:
  head: |
    <script src="/assets/search-enhanced.js" defer
      data-config='{"directUrls":true,"suggestions":true,"maxSuggestions":8}'></script>
```

With `base-url`, prefix the path:

```yaml
document:
  head: |
    <script src="/glance/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

## Configuration

| Option | Default | Description |
| ------ | ------- | ----------- |
| `directUrls` | `true` | Open a URL when the query looks like one. |
| `suggestions` | `true` | Show Google suggestions. |
| `maxSuggestions` | `8` | Maximum suggestions to display (1–15). |

## URL detection

The plugin treats a query as a URL when it has no spaces and:

- is `localhost` or an IPv4 address, with an optional port and path, or
- ends in a domain with a 2–63 character TLD, with an optional port, path, query, or fragment.

Common source and document extensions search instead: `main.py`, `notes.md`, `index.html`, `data.json`.

To force a search for a token that looks like a URL, use a configured bang such as `!g`.

## Notes

- Suggestions come from Google's public JSONP endpoint. Queries go to Google as you type. Set `suggestions: false` to turn this off.
- The plugin applies to every `search` widget, including widgets added after page navigation.
- Standalone installs: Glance caches `/assets/` files for two hours. Add a version query after updates, such as `/assets/search-enhanced.js?v=2`.
- Tested with Glance 0.8.8. The plugin uses the search widget's existing classes and `data-*` attributes.

## License

MIT
