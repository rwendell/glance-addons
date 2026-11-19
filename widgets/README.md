# Widgets

Custom `custom-api` widgets for Glance. These are YAML configs, not plugins;
the plugin manager does not install them.

Each widget lives in its own directory:

```text
widgets/<name>/
├── README.md
├── meta.yml
├── widget.yml
└── preview.png (optional)
```

## Usage

Copy `widget.yml` into your Glance config directory, or copy its contents into
`glance.yml`. To include it from another config file:

```yaml
widgets:
  - $include: widgets/anilist.yml
```

`$include` paths are relative to the file containing the directive. For
example, from a page file under `pages/`, use `../widgets/anilist.yml`.

The widgets use `custom-api`, so Glance fetches their data server-side. There is
no client-side plugin and no plugin-manager involvement.

Personal values such as usernames and IDs are environment variables. Set them in
the environment where Glance runs; each widget README lists the variables it
needs.

## Widgets

| Widget | Description |
| ------ | ----------- |
| [AniList](anilist/) | Current anime and manga progress from AniList. |
| [GitHub Updates](github-updates/) | Recently updated GitHub repositories. |
| [Infinite Backlog](infinite-backlog/) | Games currently playing on Infinite Backlog. |
