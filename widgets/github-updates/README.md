# GitHub — Recently Updated

Shows recently updated public repositories for a GitHub user.

## Usage

Copy `widget.yml` into your Glance config directory and include it:

```yaml
widgets:
  - $include: widgets/github-updates.yml
```

Or copy the YAML from `widget.yml` directly into `glance.yml`.

## Configuration

Set `GITHUB_USER` in the environment where Glance runs:

```sh
GITHUB_USER=your-name
```

| Variable | Description |
| -------- | ----------- |
| `GITHUB_USER` | GitHub username. |

The widget uses the unauthenticated GitHub API, which is limited to 60 requests
per hour per IP. Data is cached for 30 minutes. If you need a higher limit, add
an `Authorization` header with a token.
