# Enhanced Search for Glance

Version 1.0.0. Opens URLs and adds Google suggestions to the Glance search widget.

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

Standalone:

```yaml
document:
  head: |
    <script src="/assets/search-enhanced.js" defer
      data-config='{"directUrls":true,"suggestions":true,"maxSuggestions":8}'></script>
```

## Configuration

| Option | Default | Description |
| ------ | ------- | ----------- |
| `directUrls` | `true` | Open URLs directly. |
| `suggestions` | `true` | Show Google suggestions. |
| `maxSuggestions` | `8` | Maximum suggestions (1–15). |

Suggestions use Google's JSONP endpoint. Set `suggestions: false` to disable.
