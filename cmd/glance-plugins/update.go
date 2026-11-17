package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
)

type Lock struct {
	Version     int                  `json:"version"`
	GeneratedAt string               `json:"generatedAt"`
	Plugins     map[string]LockEntry `json:"plugins"`
}

type LockEntry struct {
	Requested  any    `json:"requested"`
	Version    string `json:"version,omitempty"`
	Repo       string `json:"repo"`
	Ref        string `json:"ref"`
	Commit     string `json:"commit,omitempty"`
	Entry      string `json:"entry"`
	Path       string `json:"path"`
	ResolvedAt string `json:"resolvedAt"`
}

type Resolution struct {
	Repo    string
	Ref     string
	Commit  string
	Version string
	Entry   string
}

type UpdateOptions struct {
	Assets  string
	Config  string
	Lock    string
	Repo    string
	Force   bool
	DryRun  bool
	Version string
}

type taggedVersion struct {
	Tag     Tag
	Version *semver.Version
}

func runUpdate(ctx context.Context, opts UpdateOptions) error {
	cfgData, err := os.ReadFile(opts.Config)
	if err != nil {
		return fmt.Errorf("read %s: %w", opts.Config, err)
	}

	cfg, err := readConfig(cfgData)
	if err != nil {
		return err
	}

	oldLock, err := loadLock(opts.Lock)
	if err != nil {
		return err
	}

	gh := newGitHubClient()
	next := Lock{
		Version:     1,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Plugins:     map[string]LockEntry{},
	}

	var failures []error

	for _, plugin := range cfg.Plugins {
		repo := plugin.Repo
		if repo == "" {
			repo = opts.Repo
		}

		requested, err := parseVersionSpec(plugin.Version)
		if err != nil {
			failures = append(failures, fmt.Errorf("%s: %w", plugin.Name, err))
			continue
		}

		res, err := resolvePlugin(ctx, gh, repo, plugin.Name, requested)
		if err != nil {
			failures = append(failures, fmt.Errorf("%s: %w", plugin.Name, err))
			continue
		}

		localPath := path.Join(".plugins", plugin.Name, path.Base(res.Entry))
		destination := filepath.Join(opts.Assets, filepath.FromSlash(localPath))
		requestedValue := requestedValue(requested)

		existing, hasExisting := oldLock.Plugins[plugin.Name]
		unchanged := hasExisting &&
			fmt.Sprint(existing.Requested) == fmt.Sprint(requestedValue) &&
			existing.Repo == res.Repo &&
			existing.Ref == res.Ref &&
			existing.Version == res.Version &&
			existing.Commit == res.Commit &&
			existing.Path == localPath &&
			fileExists(destination)

		status := "updated"
		if unchanged && !opts.Force {
			status = "unchanged"
		}

		if !opts.DryRun && (opts.Force || !unchanged) {
			if err := gh.download(ctx, res.Repo, res.Ref, res.Entry, destination); err != nil {
				failures = append(failures, fmt.Errorf("%s: %w", plugin.Name, err))
				continue
			}
		}

		refLabel := res.Ref
		if !requested.Pinned {
			refLabel = "latest " + shortSHA(res.Commit)
		}

		fmt.Printf(
			"%-20s %-12s %-10s %s (%s)\n",
			plugin.Name,
			requestedLabel(requested),
			status,
			res.Version,
			refLabel,
		)

		next.Plugins[plugin.Name] = LockEntry{
			Requested:  requestedValue,
			Version:    res.Version,
			Repo:       res.Repo,
			Ref:        res.Ref,
			Commit:     res.Commit,
			Entry:      res.Entry,
			Path:       localPath,
			ResolvedAt: time.Now().UTC().Format(time.RFC3339),
		}
	}

	if opts.DryRun {
		if len(failures) > 0 {
			return errors.Join(failures...)
		}
		return nil
	}

	if err := writeLock(opts.Lock, next); err != nil {
		return err
	}

	fmt.Printf("\nWrote %s\n", opts.Lock)

	if len(failures) > 0 {
		return errors.Join(failures...)
	}

	return nil
}

func resolvePlugin(
	ctx context.Context,
	gh *GitHubClient,
	repo string,
	name string,
	version VersionSpec,
) (Resolution, error) {
	if _, _, err := splitRepo(repo); err != nil {
		return Resolution{}, err
	}

	var ref string
	var commit string
	var resolvedVersion string

	if version.Pinned {
		tags, err := gh.tags(ctx, repo)
		if err != nil {
			return Resolution{}, err
		}

		tag, ver, err := selectTag(tags, name, version.Value)
		if err != nil {
			return Resolution{}, err
		}

		ref = tag.Name
		commit = tag.Commit.SHA
		resolvedVersion = ver.String()
	} else {
		branch, err := gh.defaultBranch(ctx, repo)
		if err != nil {
			return Resolution{}, err
		}

		commit, err = gh.latestCommit(ctx, repo, branch)
		if err != nil {
			return Resolution{}, err
		}

		ref = commit
	}

	manifest, err := gh.manifest(ctx, repo, ref)
	if err != nil {
		return Resolution{}, err
	}

	info, ok := manifest.Plugins[name]
	if !ok {
		return Resolution{}, fmt.Errorf("manifest has no plugin %q at %s", name, ref)
	}

	entry, err := cleanEntry(info.Entry)
	if err != nil {
		return Resolution{}, err
	}

	pluginVersion := strings.TrimSpace(info.Version)
	if pluginVersion == "" {
		pluginVersion = resolvedVersion
	}

	if pluginVersion == "" {
		return Resolution{}, fmt.Errorf("manifest has no version for %q at %s", name, ref)
	}

	return Resolution{
		Repo:    repo,
		Ref:     ref,
		Commit:  commit,
		Version: pluginVersion,
		Entry:   entry,
	}, nil
}

func selectTag(tags []Tag, plugin, constraint string) (Tag, *semver.Version, error) {
	prefix := strings.ToLower(plugin) + "-v"
	var prefixed []taggedVersion
	var global []taggedVersion

	for _, tag := range tags {
		name := strings.TrimSpace(tag.Name)
		if name == "" {
			continue
		}

		if strings.HasPrefix(strings.ToLower(name), prefix) {
			raw := name[len(prefix):]
			if ver, err := semver.NewVersion(raw); err == nil && ver.Prerelease() == "" {
				prefixed = append(prefixed, taggedVersion{Tag: tag, Version: ver})
			}
			continue
		}

		raw := strings.TrimPrefix(name, "v")
		if ver, err := semver.NewVersion(raw); err == nil && ver.Prerelease() == "" {
			global = append(global, taggedVersion{Tag: tag, Version: ver})
		}
	}

	candidates := prefixed
	if len(candidates) == 0 {
		candidates = global
	}

	if len(candidates) == 0 {
		return Tag{}, nil, fmt.Errorf("no semver tags found for %s", plugin)
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Version.GreaterThan(candidates[j].Version)
	})

	if constraint == "*" {
		return candidates[0].Tag, candidates[0].Version, nil
	}

	check, err := semver.NewConstraint(constraint)
	if err == nil {
		for _, candidate := range candidates {
			if check.Check(candidate.Version) {
				return candidate.Tag, candidate.Version, nil
			}
		}
	} else {
		for _, candidate := range candidates {
			if strings.EqualFold(candidate.Tag.Name, constraint) ||
				strings.EqualFold(strings.TrimPrefix(candidate.Tag.Name, "v"), strings.TrimPrefix(constraint, "v")) {
				return candidate.Tag, candidate.Version, nil
			}
		}
	}

	var available []string
	for _, candidate := range candidates {
		available = append(available, candidate.Tag.Name)
	}
	if len(available) > 10 {
		available = available[:10]
	}

	return Tag{}, nil, fmt.Errorf(
		"no tag for %s matches %q (available: %s)",
		plugin,
		constraint,
		strings.Join(available, ", "),
	)
}

func requestedValue(spec VersionSpec) any {
	if !spec.Pinned {
		return false
	}
	return spec.Value
}

func requestedLabel(spec VersionSpec) string {
	if !spec.Pinned {
		return "false"
	}
	return spec.Value
}

func loadLock(filename string) (Lock, error) {
	lock := Lock{Version: 1, Plugins: map[string]LockEntry{}}

	data, err := os.ReadFile(filename)
	if errors.Is(err, os.ErrNotExist) {
		return lock, nil
	}
	if err != nil {
		return lock, fmt.Errorf("read %s: %w", filename, err)
	}

	if err := json.Unmarshal(data, &lock); err != nil {
		return lock, fmt.Errorf("parse %s: %w", filename, err)
	}

	if lock.Plugins == nil {
		lock.Plugins = map[string]LockEntry{}
	}

	return lock, nil
}

func writeLock(filename string, lock Lock) error {
	data, err := json.MarshalIndent(lock, "", "  ")
	if err != nil {
		return err
	}

	data = append(data, '\n')

	dir := filepath.Dir(filename)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	tmp, err := os.CreateTemp(dir, ".plugin-lock-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()

	defer os.Remove(tmpName)

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}

	if err := tmp.Close(); err != nil {
		return err
	}

	return os.Rename(tmpName, filename)
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	return err == nil && !info.IsDir()
}

func shortSHA(sha string) string {
	if len(sha) > 7 {
		return sha[:7]
	}
	return sha
}
