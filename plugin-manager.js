/*
 * Glance Plugin Manager
 *
 * Local mode (default): reads plugins.jsonc + plugin-lock.json from the same
 * directory as this script and loads installed plugins from .plugins/.
 *
 *   assets/plugin-manager.js
 *   assets/plugins.jsonc
 *   assets/plugin-lock.json
 *   assets/.plugins/<name>/<name>.js
 *
 *   <script src="/assets/plugin-manager.js"></script>
 *
 * Remote mode: load plugins from GitHub or any URL directly.
 *
 *   <script src="/assets/plugin-manager.js" data-config='{
 *     "plugins": [
 *       {"repo": "rwendell/glance-plugins", "name": "search-enhanced",
 *        "config": {"suggestions": true}}
 *     ]
 *   }'></script>
 *
 * Or from JavaScript:
 *
 *   GlancePlugins.setup({
 *     plugins: [
 *       {"repo": "rwendell/glance-plugins", "name": "search-enhanced",
 *        "config": {"suggestions": true}}
 *     ]
 *   });
 *
 * Plugin contract: plugins register themselves with
 *
 *   window.GlancePlugins.register("name", function setup(config) { ... });
 *
 * and skip automatic setup while `GlancePlugins._loading` is true.
 */
(function () {
    "use strict";

    if (window.GlancePlugins && window.GlancePlugins.__manager) {
        return;
    }

    const MANAGER_VERSION = 2;
    const DEFAULT_REF = "main";
    const MANIFEST_NAME = "glance-plugins.json";
    const loadedScripts = new Set();
    const scriptPromises = new Map();
    const stylesheetPromises = new Map();
    const manifestCache = new Map();
    let setupQueue = Promise.resolve();

    function parseJsonc(text) {
        let withoutComments = "";
        let inString = false;
        let escaped = false;
        let index = 0;

        while (index < text.length) {
            const char = text[index];
            const next = text[index + 1];

            if (inString) {
                withoutComments += char;

                if (escaped) {
                    escaped = false;
                } else if (char === "\\") {
                    escaped = true;
                } else if (char === '"') {
                    inString = false;
                }

                index++;
                continue;
            }

            if (char === '"') {
                inString = true;
                withoutComments += char;
                index++;
                continue;
            }

            if (char === "/" && next === "/") {
                while (index < text.length && text[index] !== "\n") {
                    index++;
                }

                continue;
            }

            if (char === "/" && next === "*") {
                index += 2;

                while (
                    index < text.length &&
                    !(text[index] === "*" && text[index + 1] === "/")
                ) {
                    index++;
                }

                index += 2;
                continue;
            }

            withoutComments += char;
            index++;
        }

        let withoutTrailingCommas = "";
        inString = false;
        escaped = false;

        for (let i = 0; i < withoutComments.length; i++) {
            const char = withoutComments[i];

            if (inString) {
                withoutTrailingCommas += char;

                if (escaped) {
                    escaped = false;
                } else if (char === "\\") {
                    escaped = true;
                } else if (char === '"') {
                    inString = false;
                }

                continue;
            }

            if (char === '"') {
                inString = true;
                withoutTrailingCommas += char;
                continue;
            }

            if (char === ",") {
                let lookahead = i + 1;

                while (
                    lookahead < withoutComments.length &&
                    /\s/.test(withoutComments[lookahead])
                ) {
                    lookahead++;
                }

                if (
                    withoutComments[lookahead] === "}" ||
                    withoutComments[lookahead] === "]"
                ) {
                    continue;
                }
            }

            withoutTrailingCommas += char;
        }

        return JSON.parse(withoutTrailingCommas);
    }

    function normalizeSpec(rawSpec) {
        if (typeof rawSpec === "string") {
            const hashIndex = rawSpec.indexOf("#");

            if (hashIndex === -1) {
                throw new Error(
                    "String plugin specs need a plugin name, e.g. owner/repo#plugin"
                );
            }

            const repoPart = rawSpec.slice(0, hashIndex);
            const name = rawSpec.slice(hashIndex + 1);
            const atIndex = repoPart.lastIndexOf("@");

            if (atIndex > 0) {
                return {
                    repo: repoPart.slice(0, atIndex),
                    ref: repoPart.slice(atIndex + 1),
                    name,
                };
            }

            return { repo: repoPart, name };
        }

        if (!rawSpec || typeof rawSpec !== "object") {
            throw new Error("Invalid plugin spec");
        }

        return Object.assign({ ref: DEFAULT_REF }, rawSpec);
    }

    function repoBase(spec) {
        if (spec.base) {
            return new URL(spec.base, document.baseURI).href.replace(/\/?$/, "/");
        }

        const repo = String(spec.repo || "").replace(/^\/+|\/+$/g, "");
        const ref = spec.ref || DEFAULT_REF;

        if (!repo) {
            throw new Error("Plugin spec needs a repo, base, or url");
        }

        return `https://cdn.jsdelivr.net/gh/${repo}@${ref}/`;
    }

    async function readJson(url) {
        const response = await fetch(url, { cache: "no-cache" });

        if (!response.ok) {
            return null;
        }

        return response.json();
    }

    async function readJsonc(url) {
        const response = await fetch(url, { cache: "no-cache" });

        if (!response.ok) {
            return null;
        }

        return parseJsonc(await response.text());
    }

    async function readManifest(url) {
        if (manifestCache.has(url)) {
            return manifestCache.get(url);
        }

        let manifest = null;

        try {
            manifest = await readJson(url);
        } catch {
            // A manifest is optional. Fall back to {name}/{name}.js below.
        }

        manifestCache.set(url, manifest);
        return manifest;
    }

    async function resolveEntry(spec) {
        if (spec.url) {
            return new URL(spec.url, document.baseURI).href;
        }

        if (!spec.name) {
            throw new Error("Plugin spec needs a name or url");
        }

        const base = repoBase(spec);
        const manifestUrl = new URL(spec.manifest || MANIFEST_NAME, base).href;
        const manifest = await readManifest(manifestUrl);
        const info = manifest && manifest.plugins && manifest.plugins[spec.name];

        if (spec.entry) {
            return new URL(spec.entry, base).href;
        }

        if (typeof info === "string") {
            return new URL(info, base).href;
        }

        if (info && info.entry) {
            return new URL(info.entry, base).href;
        }

        return new URL(`plugins/${spec.name}/${spec.name}.js`, base).href;
    }

    function loadScript(url) {
        if (loadedScripts.has(url)) {
            return Promise.resolve();
        }

        if (scriptPromises.has(url)) {
            return scriptPromises.get(url);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.async = true;
            script.onload = () => {
                loadedScripts.add(url);
                resolve();
            };
            script.onerror = () => {
                scriptPromises.delete(url);
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });

        scriptPromises.set(url, promise);
        return promise;
    }

    function loadStylesheet(url) {
        if (stylesheetPromises.has(url)) {
            return stylesheetPromises.get(url);
        }

        const existing = Array.from(
            document.querySelectorAll('link[rel="stylesheet"]')
        ).find((link) => link.href === url);

        if (existing) {
            return Promise.resolve();
        }

        const promise = new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = url;
            link.onload = resolve;
            link.onerror = () => {
                stylesheetPromises.delete(url);
                reject(new Error(`Failed to load stylesheet: ${url}`));
            };
            document.head.appendChild(link);
        });

        stylesheetPromises.set(url, promise);
        return promise;
    }

    function findRegisteredName(before) {
        const added = Object.keys(registry._plugins).filter(
            (name) => !before.has(name)
        );

        if (added.length === 1) {
            return added[0];
        }

        if (added.length === 0) {
            throw new Error("Plugin did not register itself");
        }

        throw new Error(
            `Plugin registered multiple names (${added.join(", ")}); specify a name`
        );
    }

    function versionedUrl(url, version) {
        if (!version) {
            return url;
        }

        const parsed = new URL(url, document.baseURI);
        parsed.searchParams.set("v", version);
        return parsed.href;
    }

    function localSpecs(config, lock, base) {
        const entries = Array.isArray(config.plugins) ? config.plugins : [];
        const lockedPlugins = (lock && lock.plugins) || {};

        return entries.map((entry) => {
            const name = entry.name;

            if (!name) {
                throw new Error("Each entry in plugins.jsonc needs a name");
            }

            const lockEntry = lockedPlugins[name] || {};
            const localPath =
                entry.path || lockEntry.path || `.plugins/${name}/${name}.js`;
            const fallback =
                lockEntry.repo && lockEntry.entry
                    ? `https://cdn.jsdelivr.net/gh/${lockEntry.repo}@${
                          lockEntry.ref || DEFAULT_REF
                      }/${lockEntry.entry}`
                    : null;
            const configuredStyles = entry.styles ?? lockEntry.styles ?? [];
            const localUrl = new URL(localPath, base).href;
            const version = lockEntry.ref || lockEntry.version || "";

            return {
                name,
                url: entry.url || versionedUrl(localUrl, version),
                fallback,
                styles: configuredStyles.map((style) =>
                    new URL(style, base).href
                ),
                config: entry.config || {},
                enabled: entry.enabled !== false,
            };
        });
    }

    const registry = {
        __manager: true,
        version: MANAGER_VERSION,
        assetsBase: null,
        _loading: false,
        _plugins: Object.create(null),

        register(name, setup) {
            if (typeof setup !== "function") {
                throw new Error(`Plugin ${name} did not provide a setup function`);
            }

            this._plugins[name] = setup;
        },

        get(name) {
            return this._plugins[name];
        },

        setup(options) {
            const normalized = Array.isArray(options)
                ? { plugins: options }
                : options || {};

            setupQueue = setupQueue.then(async () => {
                const specs = Array.isArray(normalized.plugins)
                    ? normalized.plugins
                    : [];

                this._loading = true;

                try {
                    for (const rawSpec of specs) {
                        try {
                            await this.load(rawSpec);
                        } catch (error) {
                            console.error(
                                "[GlancePlugins] Failed to load plugin",
                                rawSpec,
                                error
                            );
                        }
                    }
                } finally {
                    this._loading = false;
                }
            });

            return setupQueue;
        },

        use(spec) {
            return this.setup({ plugins: [spec] });
        },

        async load(rawSpec) {
            const wasLoading = this._loading;
            this._loading = true;

            try {
                const spec = normalizeSpec(rawSpec);

                if (spec.enabled === false) {
                    return;
                }

                if (
                    (!spec.styles || spec.styles.length === 0) &&
                    spec.config &&
                    typeof spec.config.colorscheme === "string" &&
                    this.assetsBase
                ) {
                    const colorscheme = spec.config.colorscheme.trim();

                    if (/^[a-z0-9][a-z0-9_-]*$/i.test(colorscheme)) {
                        spec.styles = [
                            new URL(
                                `themes/${colorscheme}.css`,
                                this.assetsBase
                            ).href,
                        ];
                    }
                }

                const entry = await resolveEntry(spec);

                if (loadedScripts.has(entry)) {
                    console.warn(`[GlancePlugins] Already loaded: ${entry}`);
                    return;
                }

                const before = new Set(Object.keys(this._plugins));

                if (spec.name && this._plugins[spec.name]) {
                    console.warn(
                        `[GlancePlugins] ${spec.name} is already loaded; skipping`
                    );
                    return;
                }

                if (spec.styles) {
                    for (const style of spec.styles) {
                        await loadStylesheet(new URL(style, entry).href);
                    }
                }

                try {
                    await loadScript(entry);
                } catch (error) {
                    if (!spec.fallback || spec.fallback === entry) {
                        throw error;
                    }

                    console.warn(
                        `[GlancePlugins] Falling back to ${spec.fallback}`,
                        error
                    );
                    await loadScript(spec.fallback);
                }

                const name = spec.name || findRegisteredName(before);
                const setup = this._plugins[name];

                if (typeof setup !== "function") {
                    throw new Error(
                        `Plugin ${name} did not register a setup function`
                    );
                }

                const config =
                    typeof spec.config === "function" ? spec.config() : spec.config;

                setup(config || {});
            } finally {
                this._loading = wasLoading;
            }
        },
    };

    window.GlancePlugins = registry;

    const script = document.currentScript;

    if (!script) {
        return;
    }

    const base = new URL(".", script.src);

    registry.assetsBase = base.href;

    if (script.dataset.config) {
        try {
            registry.setup(JSON.parse(script.dataset.config));
        } catch (error) {
            console.error("[GlancePlugins] Invalid data-config JSON:", error);
        }

        return;
    }

    (async () => {
        const configUrl = new URL(
            script.dataset.configFile || "plugins.jsonc",
            base
        );
        const lockUrl = new URL(
            script.dataset.lockFile || "plugin-lock.json",
            base
        );

        try {
            const config = await readJsonc(configUrl);

            if (!config) {
                return;
            }

            let lock = null;

            try {
                lock = await readJson(lockUrl);
            } catch {
                // The lock file is optional; paths fall back to .plugins/.
            }

            await registry.setup({ plugins: localSpecs(config, lock, base) });
        } catch (error) {
            console.error("[GlancePlugins] Failed to load plugins.jsonc:", error);
        }
    })();
})();
