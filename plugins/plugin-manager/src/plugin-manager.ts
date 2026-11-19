/*
 * Glance Plugin Manager
 *
 * Browser-only manager. Reads plugins.json or an inline data-config, resolves
 * versions, loads plugins from jsDelivr, and keeps a runtime lock in
 * localStorage.
 *
 * Local plugins are ES module URLs. They take precedence over remote plugins.
 *
 * Load it locally:
 *   <script src="/assets/plugin-manager.js"></script>
 *
 * Load it from a URL and inline the config:
 *   <script
 *     src="https://cdn.jsdelivr.net/gh/rwendell/glance-addons@main/plugins/plugin-manager/dist/plugin-manager.js"
 *     data-config='{"plugins":[{"plugin":"rwendell/glance-addons:theme-switcher","config":{"colorscheme":"kissa"}}]}'></script>
 *
 * Attributes:
 *   data-config      Inline config JSON. Replaces plugins.json.
 *   data-config-url  Config file URL. Defaults to assets/plugins.json.
 *   data-themes      Theme directory. Defaults to assets/themes/.
 *
 * Config:
 *   {
 *     "plugins": [
 *       {
 *         "plugin": "owner/repo:theme-switcher",
 *         "version": false,
 *         "checkEvery": "6h",
 *         "config": {}
 *       }
 *     ]
 *   }
 *
 * Version values: false, "*", "^1.2.3", "~1.2.3", "1.2.x", ">=1.2.3", "1.2.3"
 * checkEvery: duration like 30m, 6h, 1d. Defaults to 6h.
 */

interface PluginSpec {
    plugin?: string;
    version?: string | false;
    checkEvery?: string;
    config?: unknown;
    enabled?: boolean;
}

interface PluginConfig {
    plugins?: PluginSpec[];
}

interface PluginInfo {
    version?: string;
    entry?: string;
    description?: string;
}

type PluginManifest = Record<string, PluginInfo | undefined>;

interface RepoCache {
    branch?: string;
    branchAt?: number;
    latestCommit?: string;
    latestAt?: number;
    latestEtag?: string;
    latestAttemptAt?: number;
    tags?: string[];
    tagsAt?: number;
}

interface LockEntry {
    requested?: string;
    version?: string;
    repo?: string;
    ref?: string;
    entry?: string;
    manifestDir?: string;
    kind?: "latest" | "tag";
    resolvedAt?: number;
    local?: boolean;
    path?: string;
}

interface ResolvedEntry extends LockEntry {
    requested: string;
    version: string;
    repo: string;
    ref: string;
    entry: string;
    kind: "latest" | "tag";
    resolvedAt: number;
    local?: false;
}

interface PluginLock {
    version: number;
    updatedAt: number;
    repos: Record<string, RepoCache | undefined>;
    plugins: Record<string, LockEntry | undefined>;
}

interface Semver {
    major: number;
    minor: number;
    patch: number;
    prerelease: string;
}

type VersionSpec =
    | { pinned: false; exact: false }
    | { pinned: true; exact: boolean; value: string };

interface TagCandidate {
    name: string;
    version: Semver;
}

interface SourceInfo {
    repo: string;
    name: string;
    url?: string;
}

interface Plan {
    name: string;
    config: Record<string, unknown>;
    url: string;
    local: boolean;
    entry?: ResolvedEntry;
}

interface PluginSetup {
    (config: Record<string, unknown>): void;
    version?: string;
}

interface GlancePluginModule {
    default: PluginSetup;
    version?: string;
}

interface GlancePluginsRegistry {
    __manager: true;
    version: string;
    getLock(): PluginLock;
    refresh(): void;
}

interface Window {
    GlancePlugins?: GlancePluginsRegistry;
}

interface GlancePageData {
    baseURL?: string;
}

declare const pageData: GlancePageData | undefined;

(function () {
    "use strict";

    if (window.GlancePlugins && window.GlancePlugins.__manager) {
        return;
    }

    const script = document.currentScript as HTMLScriptElement | null;
    const scriptBase = script
        ? new URL(".", script.src)
        : new URL("./", document.baseURI);
    const remote = Boolean(
        script &&
            script.src &&
            new URL(script.src).origin !== window.location.origin
    );
    const assetsBase = remote ? glanceAssetsBase() : scriptBase;

    function glanceAssetsBase(): URL {
        let baseURL = "";

        try {
            if (
                typeof pageData !== "undefined" &&
                pageData &&
                typeof pageData.baseURL === "string"
            ) {
                baseURL = pageData.baseURL;
            }
        } catch {
            // Not running inside Glance.
        }

        return directoryUrl(
            `${baseURL.replace(/\/+$/, "")}/assets/`,
            window.location.origin
        );
    }

    function directoryUrl(value: string, base: string | URL): URL {
        const url = new URL(value, base);

        if (!url.pathname.endsWith("/")) {
            url.pathname += "/";
        }

        return url;
    }

    function readInlineConfig(): PluginConfig | null {
        const raw = script && script.dataset.config;

        if (!raw) {
            return null;
        }

        try {
            const parsed: unknown = JSON.parse(raw);

            if (Array.isArray(parsed)) {
                return { plugins: parsed as PluginSpec[] };
            }

            if (parsed && typeof parsed === "object") {
                return parsed as PluginConfig;
            }
        } catch (error) {
            console.error("[GlancePlugins] Invalid data-config JSON:", error);
        }

        return null;
    }

    const inlineConfig = readInlineConfig();
    const configUrl = new URL(
        (script && script.dataset.configUrl) || "plugins.json",
        assetsBase
    );
    const themesBase = directoryUrl(
        (script && script.dataset.themes) || "themes/",
        assetsBase
    );
    const lockKey = "glance-plugin-lock-v1";
    const defaultRepo = "rwendell/glance-addons";
    const defaultCheckEvery = 6 * 60 * 60 * 1000;
    const retryTtl = 24 * 60 * 60 * 1000;
    const branchTtl = 24 * 60 * 60 * 1000;
    const manifestPath = "plugins/manifest.json";
    const manifestDir = "plugins/";

    const registry: GlancePluginsRegistry = {
        __manager: true,
        version: "4.0.0",

        getLock() {
            return readLock();
        },

        refresh() {
            try {
                localStorage.removeItem(lockKey);
            } catch {
                // localStorage can be unavailable in private browsing modes.
            }

            window.location.reload();
        },
    };

    window.GlancePlugins = registry;

    function emptyLock(): PluginLock {
        return { version: 1, updatedAt: 0, repos: {}, plugins: {} };
    }

    function readLock(): PluginLock {
        try {
            const parsed = JSON.parse(localStorage.getItem(lockKey));

            if (parsed && typeof parsed === "object") {
                parsed.repos = parsed.repos || {};
                parsed.plugins = parsed.plugins || {};
                return parsed;
            }
        } catch {
            // Ignore malformed cached lock.
        }

        return emptyLock();
    }

    function writeLock(lock: PluginLock): void {
        try {
            localStorage.setItem(lockKey, JSON.stringify(lock));
        } catch {
            // localStorage can be unavailable in private browsing modes.
        }
    }

    async function fetchResponse(url: string, options?: RequestInit): Promise<Response> {
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return await fetch(url, options);
            } catch (error) {
                lastError = error;

                if (error instanceof TypeError && attempt === 0) {
                    await new Promise<void>((resolve) => setTimeout(resolve, 500));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }

    async function fetchJSON<T = unknown>(url: string, options?: RequestInit): Promise<T> {
        const res = await fetchResponse(url, options);

        if (!res.ok) {
            throw new Error(`${url}: ${res.status} ${res.statusText}`);
        }

        return (await res.json()) as T;
    }

    function repoParts(repo: string): string[] {
        const parts = String(repo || "").split("/");

        if (
            parts.length !== 2 ||
            !parts[0] ||
            !parts[1] ||
            parts[0] === "." ||
            parts[0] === ".." ||
            parts[1] === "." ||
            parts[1] === ".."
        ) {
            throw new Error(`Invalid repo: ${repo}`);
        }

        return parts;
    }

    async function defaultBranch(repo: string, lock: PluginLock): Promise<string> {
        const cached = lock.repos[repo];

        if (cached && cached.branch && Date.now() - cached.branchAt < branchTtl) {
            return cached.branch;
        }

        try {
            const info = await fetchJSON<{ default_branch?: string }>(
                `https://api.github.com/repos/${repo}`,
                {
                    headers: { Accept: "application/vnd.github+json" },
                    cache: "no-store",
                }
            );

            const branch = info.default_branch || "main";
            lock.repos[repo] = {
                ...(cached || {}),
                branch,
                branchAt: Date.now(),
            };
            return branch;
        } catch (error) {
            if (cached && cached.branch) {
                return cached.branch;
            }
            throw error;
        }
    }

    async function latestCommit(
        repo: string,
        branch: string,
        lock: PluginLock,
        ttl: number
    ): Promise<string> {
        const cached = lock.repos[repo];
        const now = Date.now();

        if (
            cached &&
            cached.latestCommit &&
            now - (cached.latestAt || 0) < ttl
        ) {
            return cached.latestCommit;
        }

        if (
            cached &&
            cached.latestCommit &&
            cached.latestAttemptAt &&
            now - cached.latestAttemptAt < retryTtl
        ) {
            return cached.latestCommit;
        }

        const url = `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(
            branch
        )}`;
        const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",
        };

        if (cached && cached.latestEtag) {
            headers["If-None-Match"] = cached.latestEtag;
        }

        let res: Response;

        try {
            res = await fetchResponse(url, { headers, cache: "no-store" });
        } catch (error) {
            lock.repos[repo] = {
                ...(cached || {}),
                latestAttemptAt: Date.now(),
            };
            throw error;
        }

        if (res.status === 304 && cached && cached.latestCommit) {
            lock.repos[repo] = {
                ...(cached || {}),
                latestAt: Date.now(),
            };
            return cached.latestCommit;
        }

        if (!res.ok) {
            lock.repos[repo] = {
                ...(cached || {}),
                latestAttemptAt: Date.now(),
            };
            throw new Error(`${url}: ${res.status} ${res.statusText}`);
        }

        const commit = (await res.json()) as { sha?: string };

        if (!commit || !commit.sha) {
            throw new Error(`No commit returned for ${repo}@${branch}`);
        }

        lock.repos[repo] = {
            ...(cached || {}),
            latestCommit: commit.sha,
            latestAt: Date.now(),
            latestEtag: res.headers.get("ETag") || undefined,
        };

        return commit.sha;
    }

    async function tagVersions(
        repo: string,
        lock: PluginLock,
        ttl: number
    ): Promise<string[]> {
        const cached = lock.repos[repo];

        if (
            cached &&
            cached.tags &&
            Date.now() - (cached.tagsAt || 0) < ttl
        ) {
            return cached.tags;
        }

        try {
            const data = await fetchJSON<{ versions?: Array<{ version?: string }> }>(
                `https://data.jsdelivr.com/v1/packages/gh/${repo}`
            );

            const versions = (data.versions || [])
                .map((item) => item.version)
                .filter((item): item is string => typeof item === "string");

            lock.repos[repo] = {
                ...(cached || {}),
                tags: versions,
                tagsAt: Date.now(),
            };
            return versions;
        } catch (error) {
            if (cached && cached.tags) {
                return cached.tags;
            }
            throw error;
        }
    }

    async function manifestAt(
        repo: string,
        ref: string
    ): Promise<PluginManifest | null> {
        const bases = [
            `https://cdn.jsdelivr.net/gh/${repo}@${encodeURIComponent(ref)}`,
            `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}`,
        ];

        for (const base of bases) {
            try {
                return await fetchJSON<PluginManifest>(
                    `${base}/${manifestPath}`
                );
            } catch {
                // Try the next source.
            }
        }

        return null;
    }

    function asConfig(value: unknown): Record<string, unknown> {
        return value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    }

    function parsePluginSource(spec: PluginSpec): SourceInfo {
        const raw = String(spec.plugin || "").trim();

        if (!raw) {
            return { repo: "", name: "" };
        }

        if (
            /^(?:https?:)?\/\//i.test(raw) ||
            raw.startsWith("/") ||
            raw.startsWith("./") ||
            raw.startsWith("../") ||
            /\.js$/i.test(raw)
        ) {
            let name = "";

            try {
                const url = new URL(raw, assetsBase);
                const last = url.pathname.split("/").filter(Boolean).pop() || "";
                name = last.replace(/\.js$/i, "");
            } catch {
                // The name check below reports an invalid source.
            }

            return { repo: "", name, url: raw };
        }

        const separator = raw.lastIndexOf(":");

        if (separator === -1) {
            return { repo: raw, name: "" };
        }

        return {
            repo: raw.slice(0, separator).trim(),
            name: raw.slice(separator + 1).trim(),
        };
    }

    function versionSpec(raw: string | false | null | undefined): VersionSpec {
        if (raw === undefined || raw === null || raw === false) {
            return { pinned: false, exact: false };
        }

        if (typeof raw === "string") {
            const value = raw.trim();

            if (!value || value.toLowerCase() === "false") {
                return { pinned: false, exact: false };
            }

            return {
                pinned: true,
                exact: Boolean(parseSemver(value.replace(/^v/i, ""))),
                value,
            };
        }

        throw new Error("version must be a semver range or false");
    }

    function checkEveryMs(name: string, raw: string | undefined): number {
        const value = String(raw || "").trim();

        if (!value) {
            return defaultCheckEvery;
        }

        const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value);

        if (!match) {
            console.warn(
                `[GlancePlugins] ${name}: invalid checkEvery "${value}"; using 6h`
            );
            return defaultCheckEvery;
        }

        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return amount * multipliers[unit];
    }

    function parseSemver(value: unknown): Semver | null {
        const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(
            String(value).trim()
        );

        if (!match) {
            return null;
        }

        return {
            major: Number(match[1]),
            minor: Number(match[2]),
            patch: Number(match[3]),
            prerelease: match[4] || "",
        };
    }

    function compareSemver(a: Semver, b: Semver): number {
        if (a.major !== b.major) return a.major - b.major;
        if (a.minor !== b.minor) return a.minor - b.minor;
        if (a.patch !== b.patch) return a.patch - b.patch;
        if (a.prerelease === b.prerelease) return 0;
        if (!a.prerelease) return 1;
        if (!b.prerelease) return -1;
        return a.prerelease < b.prerelease ? -1 : 1;
    }

    function upperCaret(version: Semver): Semver {
        if (version.major > 0) {
            return { major: version.major + 1, minor: 0, patch: 0, prerelease: "" };
        }
        if (version.minor > 0) {
            return { major: 0, minor: version.minor + 1, patch: 0, prerelease: "" };
        }
        return { major: 0, minor: 0, patch: version.patch + 1, prerelease: "" };
    }

    function upperTilde(version: Semver): Semver {
        return {
            major: version.major,
            minor: version.minor + 1,
            patch: 0,
            prerelease: "",
        };
    }

    function satisfies(version: Semver, range: string): boolean {
        const value = String(range).trim();

        if (!value || value === "*") {
            return true;
        }

        if (value.includes("||")) {
            return value.split("||").some((part) => satisfies(version, part));
        }

        return value
            .split(/\s+/)
            .filter(Boolean)
            .every((part) => satisfiesOne(version, part));
    }

    function satisfiesOne(version: Semver, range: string): boolean {
        if (range === "*") {
            return true;
        }

        if (range.endsWith(".x") || range.endsWith(".*")) {
            const parts = range.split(".");

            if (version.major !== Number(parts[0])) {
                return false;
            }

            if (parts[1] === "x" || parts[1] === "*") {
                return true;
            }

            return version.minor === Number(parts[1]);
        }

        const match = /^(>=|<=|>|<|\^|~)?\s*v?(.+)$/.exec(range);

        if (!match) {
            return false;
        }

        const operator = match[1] || "";
        const target = parseSemver(match[2]);

        if (!target) {
            return false;
        }

        const cmp = compareSemver(version, target);

        switch (operator) {
            case ">":
                return cmp > 0;
            case ">=":
                return cmp >= 0;
            case "<":
                return cmp < 0;
            case "<=":
                return cmp <= 0;
            case "^":
                return cmp >= 0 && compareSemver(version, upperCaret(target)) < 0;
            case "~":
                return cmp >= 0 && compareSemver(version, upperTilde(target)) < 0;
            default:
                return cmp === 0;
        }
    }

    function selectTag(versions: string[], plugin: string, range: string): TagCandidate {
        const prefix = `${plugin.toLowerCase()}-v`;
        const prefixed: TagCandidate[] = [];
        const global: TagCandidate[] = [];

        for (const name of versions) {
            const lower = name.toLowerCase();
            let parsed = null;

            if (lower.startsWith(prefix)) {
                const version = parseSemver(name.slice(prefix.length));
                if (version && !version.prerelease) {
                    prefixed.push({ name, version });
                }
                continue;
            }

            parsed = parseSemver(name.replace(/^v/i, ""));
            if (parsed && !parsed.prerelease) {
                global.push({ name, version: parsed });
            }
        }

        const candidates = prefixed.length > 0 ? prefixed : global;

        if (candidates.length === 0) {
            throw new Error(`No semver tags found for ${plugin}`);
        }

        candidates.sort((a, b) => compareSemver(b.version, a.version));

        const match = candidates.find((candidate) =>
            satisfies(candidate.version, range)
        );

        if (!match) {
            throw new Error(
                `No tag for ${plugin} matches ${range}; available: ${candidates
                    .slice(0, 10)
                    .map((candidate) => candidate.name)
                    .join(", ")}`
            );
        }

        return match;
    }

    async function resolveRemote(name: string, spec: PluginSpec, lock: PluginLock): Promise<ResolvedEntry> {
        const repo = String(spec.plugin || defaultRepo).trim();
        repoParts(repo);

        const requested = versionSpec(spec.version);
        const requestedKey = requested.pinned ? requested.value : "false";
        const ttl = checkEveryMs(name, spec.checkEvery);
        const cached = lock.plugins[name];

        if (
            cached &&
            cached.repo === repo &&
            cached.requested === requestedKey &&
            cached.kind
        ) {
            const age = Date.now() - (cached.resolvedAt || 0);

            if (
                (cached.kind === "latest" && age < ttl) ||
                (cached.kind === "tag" && requested.exact) ||
                (cached.kind === "tag" && age < ttl)
            ) {
                return cached as ResolvedEntry;
            }
        }

        try {
            let ref: string;
            let kind: "latest" | "tag";
            let tagVersion = "";

            if (requested.pinned) {
                const versions = await tagVersions(repo, lock, ttl);
                const tag = selectTag(versions, name, requested.value);
                ref = tag.name;
                kind = "tag";
                tagVersion = `${tag.version.major}.${tag.version.minor}.${tag.version.patch}`;
            } else {
                const branch = await defaultBranch(repo, lock);
                ref = await latestCommit(repo, branch, lock, ttl);
                kind = "latest";
            }

            const manifest = await manifestAt(repo, ref);
            let info: PluginInfo | undefined;
            let entryDir = "";

            if (manifest) {
                info = manifest[name];
                entryDir = manifestDir;
            } else {
                info = { entry: "index.js" };
            }

            if (!info || !info.entry) {
                throw new Error(`Manifest has no plugin ${name} at ${ref}`);
            }

            const entry: ResolvedEntry = {
                requested: requestedKey,
                version: info.version || tagVersion,
                repo,
                ref,
                entry: info.entry,
                manifestDir: entryDir,
                kind,
                resolvedAt: Date.now(),
            };

            lock.plugins[name] = entry;
            return entry;
        } catch (error) {
            if (cached && cached.repo === repo && cached.entry) {
                console.warn(
                    `[GlancePlugins] ${name}: using cached ${cached.ref}`,
                    error
                );
                return cached as ResolvedEntry;
            }

            throw error;
        }
    }

    function remotePluginUrl(entry: ResolvedEntry): string {
        const dir = entry.manifestDir ?? manifestDir;
        const base = `https://cdn.jsdelivr.net/gh/${entry.repo}@${encodeURIComponent(
            entry.ref
        )}/${dir}`;

        return new URL(entry.entry, base).href;
    }

    const loadedStyles = new Set<string>();

    function loadStylesheet(url: string): Promise<void> {
        if (loadedStyles.has(url)) {
            return Promise.resolve();
        }

        const existing = Array.from(
            document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
        ).find((link) => link.href === url);

        if (existing) {
            loadedStyles.add(url);
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = url;
            link.onload = () => {
                loadedStyles.add(url);
                resolve();
            };
            link.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(link);
        });
    }

    const loadedModules = new Map<string, Promise<GlancePluginModule>>();

    function importModule(url: string): Promise<GlancePluginModule> {
        if (!loadedModules.has(url)) {
            loadedModules.set(url, import(url));
        }

        return loadedModules.get(url);
    }

    async function main(): Promise<void> {
        let config: PluginConfig;

        if (inlineConfig) {
            config = inlineConfig;
        } else {
            const configRes = await fetch(configUrl, { cache: "no-cache" });

            if (!configRes.ok) {
                console.warn(
                    `[GlancePlugins] Could not load ${configUrl.pathname}: ${configRes.status}`
                );

                if (remote) {
                    console.warn(
                        "[GlancePlugins] Add data-config or data-config-url to the manager script tag."
                    );
                }

                return;
            }

            try {
                config = (await configRes.json()) as PluginConfig;
            } catch (error) {
                console.error("[GlancePlugins] Invalid plugins.json:", error);
                return;
            }
        }

        const specs: PluginSpec[] = Array.isArray(config.plugins) ? config.plugins : [];
        const lock = readLock();
        const plans: Plan[] = [];

        for (const spec of specs) {
            if (!spec || spec.enabled === false) {
                continue;
            }

            let source: SourceInfo;

            try {
                source = parsePluginSource(spec);
            } catch (error) {
                console.error(`[GlancePlugins] ${error.message}`);
                continue;
            }

            const name = source.name;

            if (!name) {
                console.error("[GlancePlugins] Plugin source needs a name");
                continue;
            }

            if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
                console.error(`[GlancePlugins] Invalid plugin name: ${name}`);
                continue;
            }

            if (source.url) {
                try {
                    plans.push({
                        name,
                        config: asConfig(spec.config),
                        url: new URL(source.url, assetsBase).href,
                        local: true,
                    });
                } catch (error) {
                    console.error(`[GlancePlugins] Invalid URL for ${name}:`, error);
                }
                continue;
            }

            try {
                const entry = await resolveRemote(
                    name,
                    { ...spec, plugin: source.repo },
                    lock
                );
                plans.push({
                    name,
                    config: asConfig(spec.config),
                    url: remotePluginUrl(entry),
                    local: false,
                    entry,
                });
            } catch (error) {
                console.error(`[GlancePlugins] Failed to resolve ${name}:`, error);
            }
        }

        for (const plan of plans) {
            const colorscheme = plan.config.colorscheme;

            if (
                typeof colorscheme === "string" &&
                /^[a-z0-9][a-z0-9_-]*$/i.test(colorscheme)
            ) {
                try {
                    await loadStylesheet(
                        new URL(`${colorscheme}.css`, themesBase).href
                    );
                } catch (error) {
                    console.warn(
                        `[GlancePlugins] Could not load theme CSS for ${plan.name}`,
                        error
                    );
                }
            }
        }

        for (const plan of plans) {
            try {
                const module = await importModule(plan.url);
                const setup = module.default;

                if (typeof setup !== "function") {
                    throw new Error("module has no default setup function");
                }

                setup(plan.config);

                const declared =
                    typeof module.version === "string"
                        ? module.version
                        : typeof setup.version === "string"
                          ? setup.version
                          : "";

                if (plan.local) {
                    lock.plugins[plan.name] = {
                        local: true,
                        path: new URL(plan.url).pathname,
                        version: declared,
                        resolvedAt: Date.now(),
                    };
                    continue;
                }

                if (
                    plan.entry && plan.entry.version &&
                    declared &&
                    plan.entry.version !== declared
                ) {
                    console.warn(
                        `[GlancePlugins] ${plan.name}: resolved ${plan.entry.version}, ` +
                            `plugin reports ${declared}`
                    );
                }
            } catch (error) {
                console.error(`[GlancePlugins] Failed to load ${plan.name}:`, error);
            }
        }

        lock.updatedAt = Date.now();
        writeLock(lock);
    }

    main().catch((error) => {
        console.error("[GlancePlugins] Manager failed:", error);
    });
})();
