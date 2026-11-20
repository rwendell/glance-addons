# Hardcover — Recent Activity

Shows recent reading activity from Hardcover: books started, finished, rated,
reviewed, and shelved.

## Usage

Copy `widget.yml` into your Glance config directory and include it:

```yaml
widgets:
  - $include: widgets/hardcover.yml
```

Or copy the YAML from `widget.yml` directly into `glance.yml`.

## Configuration

Create a personal API token at <https://hardcover.app/account/api> with these
scopes:

- `read:me` — read your profile
- `read:social` — read your activity feed
- `read:catalog` — read book titles, covers, and authors

Set the token in the environment where Glance runs:

```sh
HARDCOVER_TOKEN=your-token
```

| Variable | Description |
| -------- | ----------- |
| `HARDCOVER_TOKEN` | Hardcover personal API token. |

Tokens expire after one year. Regenerate the token when it expires.

The widget requests the authenticated user's `UserBookActivity` events, so it
does not need a username or numeric user ID. Data is cached for 30 minutes.
Change `variables.limit` in `widget.yml` to show more or fewer entries.

The header links to <https://hardcover.app>. To link to your profile instead,
set `title-url` to `https://hardcover.app/@your-username`.
