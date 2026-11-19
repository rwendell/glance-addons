# AniList — Watching & Reading

Shows the current anime and manga progress for an AniList user.

## Usage

Copy `widget.yml` into your Glance config directory and include it:

```yaml
widgets:
  - $include: widgets/anilist.yml
```

Or copy the YAML from `widget.yml` directly into `glance.yml`.

## Configuration

Set `ANILIST_USER` in the environment where Glance runs:

```sh
ANILIST_USER=your-name
```

| Variable | Description |
| -------- | ----------- |
| `ANILIST_USER` | AniList username. |

The widget uses the public AniList GraphQL API and does not require an API key.
Data is cached for 30 minutes.
