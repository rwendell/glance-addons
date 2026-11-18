# Enhanced Search for Glance

Opens URLs and adds Google suggestions to the Glance search widget.

Bangs take priority. File-like tokens such as `main.py` search normally.

## Install

Plugin manager, `assets/plugins.json`:

```json
{
  "plugin": "rwendell/glance-plugins:search-enhanced",
  "version": false,
  "config": {
    "directUrls": true,
    "suggestions": true,
    "maxSuggestions": 8
  }
}
```

Standalone: copy `dist/search-enhanced.js` to `assets/`.

```yaml
document:
  head: |
    <script type="module">
      import setup from "/assets/search-enhanced.js";
      setup({ directUrls: true, suggestions: true, maxSuggestions: 8 });
    </script>
```

## Configuration

| Option | Default | Description |
| ------ | ------- | ----------- |
| `directUrls` | `true` | Open URLs directly. |
| `suggestions` | `true` | Show Google suggestions. |
| `maxSuggestions` | `8` | Maximum suggestions (1–15). |

Suggestions use Google's JSONP endpoint. Set `suggestions: false` to disable.
