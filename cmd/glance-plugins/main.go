package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

const updaterVersion = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "update":
		if err := runUpdateCommand(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
	case "version", "--version", "-v":
		fmt.Println(updaterVersion)
	case "help", "--help", "-h":
		usage()
	default:
		usage()
		os.Exit(2)
	}
}

func runUpdateCommand(args []string) error {
	fs := flag.NewFlagSet("update", flag.ExitOnError)

	assets := fs.String("assets", defaultAssets(), "assets directory")
	configPath := fs.String("config", "", "plugins.jsonc path")
	lockPath := fs.String("lock", "", "plugin-lock.json path")
	repo := fs.String("repo", "rwendell/glance-plugins", "default plugin repository")
	force := fs.Bool("force", false, "download every plugin")
	dryRun := fs.Bool("dry-run", false, "resolve versions without downloading or writing")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if *configPath == "" {
		*configPath = filepath.Join(*assets, "plugins.jsonc")
	}
	if *lockPath == "" {
		*lockPath = filepath.Join(*assets, "plugin-lock.json")
	}

	return runUpdate(context.Background(), UpdateOptions{
		Assets: *assets,
		Config: *configPath,
		Lock:   *lockPath,
		Repo:   *repo,
		Force:  *force,
		DryRun: *dryRun,
	})
}

func defaultAssets() string {
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		if filepath.Base(dir) == "plugin-manager" &&
			filepath.Base(filepath.Dir(dir)) == ".plugins" {
			assets := filepath.Clean(filepath.Join(dir, "..", ".."))
			if info, err := os.Stat(assets); err == nil && info.IsDir() {
				return assets
			}
		}
	}

	return "assets"
}

func usage() {
	fmt.Fprint(os.Stderr, `glance-plugins updater

Usage:
  glance-plugins update [flags]
  glance-plugins version

Flags:
  --assets string   assets directory (default "assets")
  --config string   plugins.jsonc path (default "<assets>/plugins.jsonc")
  --lock string     plugin-lock.json path (default "<assets>/plugin-lock.json")
  --repo string     default plugin repository (default "rwendell/glance-plugins")
  --force           download every plugin
  --dry-run         resolve versions without downloading or writing

Environment:
  GITHUB_TOKEN      optional token for higher GitHub API limits
`)
}
