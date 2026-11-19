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

Change the `variables.user` value in the GraphQL request from `rwendell` to
your AniList username:

```yaml
variables:
  user: rwendell
```

The widget uses the public AniList GraphQL API and does not require an API key.
Data is cached for 30 minutes.
