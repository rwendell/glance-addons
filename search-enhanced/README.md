# Enhanced Search for Glance

Upgrades the built-in Glance search widget with:

- **Direct URL navigation** — type `youtube.com` and press Enter to open it instead of searching for it.
- **Google suggestions** — live autocomplete under the search bar.
- **Bangs still win** — `!gh youtube.com` searches GitHub instead of opening YouTube.
- **File names still search** — `main.py`, `notes.md`, and similar tokens are treated as searches.
- **Keyboard navigation** — <kbd>↑</kbd>/<kbd>↓</kbd> to select, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close.
- **New-tab support** — respects the search widget's `new-tab` setting; <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Enter</kbd> inverts it.

When a query looks like a URL, the dropdown shows two choices: **Open** and **Search for "…"**, so you can always force a normal search.

## Installation

1. Copy [`search-enhanced.js`](search-enhanced.js) into your Glance assets directory. With `server.assets-path: assets`, that is `assets/search-enhanced.js` next to `glance.yml`.

2. Load it from `document.head` and put the config on the plugin's own script tag:

```yaml
document:
  head: |
    <script src="/assets/search-enhanced.js" defer
      data-config='{"suggestions":true,"maxSuggestions":8}'></script>
```

If you use [`base-url`](https://github.com/glanceapp/glance/blob/main/docs/configuration.md#base-url), prefix the path:

```yaml
document:
  head: |
    <script src="/glance/assets/search-enhanced.js" defer
      data-config='{"suggestions":true}'></script>
```

No changes to the search widget itself are required.

## Configuration

All options are optional. Pass them in the plugin's own `data-config` attribute:

```yaml
document:
  head: |
    <script src="/assets/search-enhanced.js" defer
      data-config='{"directUrls":true,"suggestions":true,"maxSuggestions":8}'></script>
```

Or with the [plugin loader](../README.md#plugin-loader):

```js
GlancePlugins.setup({
  plugins: [
    {
      repo: "rwendell/glance-plugins",
      name: "search-enhanced",
      config: {
        directUrls: true,
        suggestions: true,
        maxSuggestions: 8
      }
    }
  ]
});
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `directUrls` | `true` | Navigate directly when the query looks like a URL. |
| `suggestions` | `true` | Show Google search suggestions. |
| `maxSuggestions` | `8` | Maximum number of suggestions to display (1–15). |

## How URL detection works

A query is treated as a URL when it:

- has no spaces,
- is `localhost` or an IPv4 address, optionally with a port/path, or
- looks like a domain ending in a 2–63 character TLD, optionally with a port, path, query, or fragment.

Common source and document extensions are excluded, so `main.py`, `notes.md`, `index.html`, `data.json`, and similar inputs still search. If a token is wrongly detected as a URL, use a configured search bang (for example `!g`) to force a normal search.

## Notes

- Suggestions are fetched directly from Google's public JSONP endpoint. Queries are sent to Google as you type; set `suggestions: false` to disable them.
- The enhancement applies to every `search` widget on the page, including widgets added after page navigation.
- Glance caches `/assets/` files for two hours. Append a version query when updating the script, e.g. `/assets/search-enhanced.js?v=2`.
- Tested with Glance v0.8.8. It relies on the search widget's existing classes and `data-*` attributes, which are stable across Glance 0.8.x.

## License

MIT
