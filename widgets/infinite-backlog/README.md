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

Set both variables in the environment where Glance runs:

```sh
INFINITE_BACKLOG_USER=your-name
INFINITE_BACKLOG_USER_ID=12345
```

| Variable | Description |
| -------- | ----------- |
| `INFINITE_BACKLOG_USER` | Infinite Backlog username, used for the title link. |
| `INFINITE_BACKLOG_USER_ID` | Numeric user ID, used by the API. |

Data is cached for 30 minutes.
