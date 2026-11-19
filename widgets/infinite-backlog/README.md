# Infinite Backlog — Playing

Shows the games currently marked as playing on Infinite Backlog.

## Usage

Copy `widget.yml` into your Glance config directory and include it:

```yaml
widgets:
  - $include: widgets/infinite-backlog.yml
```

Or copy the YAML from `widget.yml` directly into `glance.yml`.

## Configuration

Change `user_id` in the URL from `35772` to your Infinite Backlog user ID:

```yaml
url: https://infinitebacklog.net/api/user_collections?user_id=35772&status=playing&limit=5
```

Data is cached for 30 minutes.
