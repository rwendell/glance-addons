package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"path"
	"regexp"
	"strings"
)

type Config struct {
	Plugins []PluginSpec `json:"plugins"`
}

type PluginSpec struct {
	Name    string          `json:"name"`
	Repo    string          `json:"repo,omitempty"`
	Version json.RawMessage `json:"version,omitempty"`
	Config  map[string]any  `json:"config,omitempty"`
}

type VersionSpec struct {
	Pinned bool
	Value  string
}

var pluginNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]*$`)

func readConfig(data []byte) (*Config, error) {
	cleaned := stripJSONC(data)

	var cfg Config
	if err := json.Unmarshal(cleaned, &cfg); err != nil {
		return nil, fmt.Errorf("parse plugins.jsonc: %w", err)
	}

	for i := range cfg.Plugins {
		spec := &cfg.Plugins[i]
		spec.Name = strings.TrimSpace(spec.Name)
		spec.Repo = strings.TrimSpace(spec.Repo)

		if spec.Name == "" {
			return nil, fmt.Errorf("plugin #%d has no name", i+1)
		}
		if !pluginNamePattern.MatchString(spec.Name) {
			return nil, fmt.Errorf("plugin %q has an invalid name", spec.Name)
		}
	}

	return &cfg, nil
}

func parseVersionSpec(raw json.RawMessage) (VersionSpec, error) {
	if len(raw) == 0 || bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return VersionSpec{Pinned: false}, nil
	}

	var b bool
	if err := json.Unmarshal(raw, &b); err == nil {
		if b {
			return VersionSpec{}, fmt.Errorf("version=true is not supported; use a semver range or false")
		}
		return VersionSpec{Pinned: false}, nil
	}

	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return VersionSpec{}, fmt.Errorf("version must be a semver range or false")
	}

	s = strings.TrimSpace(s)
	if s == "" || strings.EqualFold(s, "false") {
		return VersionSpec{Pinned: false}, nil
	}

	return VersionSpec{Pinned: true, Value: s}, nil
}

func splitRepo(repo string) (string, string, error) {
	parts := strings.Split(strings.TrimSpace(repo), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("repo must be owner/name, got %q", repo)
	}
	if parts[0] == "." || parts[0] == ".." || parts[1] == "." || parts[1] == ".." {
		return "", "", fmt.Errorf("invalid repo %q", repo)
	}
	return parts[0], parts[1], nil
}

func cleanEntry(entry string) (string, error) {
	entry = strings.TrimSpace(entry)
	entry = strings.TrimPrefix(entry, "/")
	cleaned := path.Clean(entry)

	if cleaned == "." || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return "", fmt.Errorf("invalid plugin entry %q", entry)
	}

	return cleaned, nil
}

// stripJSONC removes // and /* */ comments and trailing commas while preserving
// string contents.
func stripJSONC(data []byte) []byte {
	var out []byte
	inString := false
	escaped := false

	for i := 0; i < len(data); i++ {
		c := data[i]

		if inString {
			out = append(out, c)
			if escaped {
				escaped = false
			} else if c == '\\' {
				escaped = true
			} else if c == '"' {
				inString = false
			}
			continue
		}

		if c == '"' {
			inString = true
			out = append(out, c)
			continue
		}

		if c == '/' && i+1 < len(data) && data[i+1] == '/' {
			for i < len(data) && data[i] != '\n' {
				i++
			}
			if i < len(data) {
				out = append(out, '\n')
			}
			continue
		}

		if c == '/' && i+1 < len(data) && data[i+1] == '*' {
			i += 2
			for i+1 < len(data) && !(data[i] == '*' && data[i+1] == '/') {
				i++
			}
			i++
			continue
		}

		out = append(out, c)
	}

	var cleaned []byte
	inString = false
	escaped = false

	for i := 0; i < len(out); i++ {
		c := out[i]

		if inString {
			cleaned = append(cleaned, c)
			if escaped {
				escaped = false
			} else if c == '\\' {
				escaped = true
			} else if c == '"' {
				inString = false
			}
			continue
		}

		if c == '"' {
			inString = true
			cleaned = append(cleaned, c)
			continue
		}

		if c == ',' {
			j := i + 1
			for j < len(out) && (out[j] == ' ' || out[j] == '\t' || out[j] == '\n' || out[j] == '\r') {
				j++
			}
			if j < len(out) && (out[j] == '}' || out[j] == ']') {
				continue
			}
		}

		cleaned = append(cleaned, c)
	}

	return cleaned
}
