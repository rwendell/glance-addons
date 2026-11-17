package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const githubAPIBase = "https://api.github.com"
const rawBase = "https://raw.githubusercontent.com"

type GitHubClient struct {
	http          *http.Client
	token         string
	repoCache     map[string]string
	tagsCache     map[string][]Tag
	manifestCache map[string]Manifest
}

type Tag struct {
	Name   string `json:"name"`
	Commit struct {
		SHA string `json:"sha"`
	} `json:"commit"`
}

type Manifest struct {
	Plugins map[string]ManifestPlugin `json:"plugins"`
}

type ManifestPlugin struct {
	Version string `json:"version"`
	Entry   string `json:"entry"`
}

func newGitHubClient() *GitHubClient {
	return &GitHubClient{
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
		token:         strings.TrimSpace(os.Getenv("GITHUB_TOKEN")),
		repoCache:     map[string]string{},
		tagsCache:     map[string][]Tag{},
		manifestCache: map[string]Manifest{},
	}
}

func (c *GitHubClient) requestJSON(ctx context.Context, url string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "glance-plugins-updater")

	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("GET %s: %s: %s", url, res.Status, strings.TrimSpace(string(body)))
	}

	return json.NewDecoder(res.Body).Decode(out)
}

func (c *GitHubClient) defaultBranch(ctx context.Context, repo string) (string, error) {
	if branch, ok := c.repoCache[repo]; ok {
		return branch, nil
	}

	var info struct {
		DefaultBranch string `json:"default_branch"`
	}

	if err := c.requestJSON(ctx, fmt.Sprintf("%s/repos/%s", githubAPIBase, repo), &info); err != nil {
		return "", err
	}

	if info.DefaultBranch == "" {
		info.DefaultBranch = "main"
	}

	c.repoCache[repo] = info.DefaultBranch
	return info.DefaultBranch, nil
}

func (c *GitHubClient) latestCommit(ctx context.Context, repo, branch string) (string, error) {
	var commit struct {
		SHA string `json:"sha"`
	}

	url := fmt.Sprintf("%s/repos/%s/commits/%s", githubAPIBase, repo, url.PathEscape(branch))
	if err := c.requestJSON(ctx, url, &commit); err != nil {
		return "", err
	}

	if commit.SHA == "" {
		return "", fmt.Errorf("no commit returned for %s@%s", repo, branch)
	}

	return commit.SHA, nil
}

func (c *GitHubClient) tags(ctx context.Context, repo string) ([]Tag, error) {
	if tags, ok := c.tagsCache[repo]; ok {
		return tags, nil
	}

	var all []Tag

	for page := 1; page <= 5; page++ {
		var batch []Tag
		url := fmt.Sprintf("%s/repos/%s/tags?per_page=100&page=%d", githubAPIBase, repo, page)

		if err := c.requestJSON(ctx, url, &batch); err != nil {
			return nil, err
		}

		all = append(all, batch...)

		if len(batch) < 100 {
			break
		}
	}

	c.tagsCache[repo] = all
	return all, nil
}

func (c *GitHubClient) manifest(ctx context.Context, repo, ref string) (Manifest, error) {
	key := repo + "@" + ref
	if manifest, ok := c.manifestCache[key]; ok {
		return manifest, nil
	}

	rawURL := fmt.Sprintf(
		"%s/%s/%s/glance-plugins.json",
		rawBase,
		repo,
		url.PathEscape(ref),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return Manifest{}, err
	}
	req.Header.Set("User-Agent", "glance-plugins-updater")

	res, err := c.http.Do(req)
	if err != nil {
		return Manifest{}, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return Manifest{}, fmt.Errorf("GET %s: %s: %s", rawURL, res.Status, strings.TrimSpace(string(body)))
	}

	var manifest Manifest
	if err := json.NewDecoder(res.Body).Decode(&manifest); err != nil {
		return Manifest{}, fmt.Errorf("parse manifest at %s: %w", rawURL, err)
	}

	c.manifestCache[key] = manifest
	return manifest, nil
}

func (c *GitHubClient) download(ctx context.Context, repo, ref, entry, dest string) error {
	rawURL := fmt.Sprintf(
		"%s/%s/%s/%s",
		rawBase,
		repo,
		url.PathEscape(ref),
		escapePath(entry),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "glance-plugins-updater")

	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("GET %s: %s: %s", rawURL, res.Status, strings.TrimSpace(string(body)))
	}

	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}

	tmp, err := os.CreateTemp(filepath.Dir(dest), ".download-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()

	defer func() {
		tmp.Close()
		os.Remove(tmpName)
	}()

	if _, err := io.Copy(tmp, res.Body); err != nil {
		return err
	}

	if err := tmp.Close(); err != nil {
		return err
	}

	return os.Rename(tmpName, dest)
}

func escapePath(p string) string {
	parts := strings.Split(p, "/")
	for i := range parts {
		parts[i] = url.PathEscape(parts[i])
	}
	return strings.Join(parts, "/")
}
