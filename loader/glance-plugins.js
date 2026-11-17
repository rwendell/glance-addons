/*
 * Glance Plugins Loader
 *
 * Loads Glance plugins from GitHub (via jsDelivr) or any URL, then calls each
 * plugin's setup(config). Plugins can be a repo + name, a direct URL, or a
 * string shorthand:
 *
 *   GlancePlugins.setup({
 *     plugins: [
 *       {
 *         repo: "rwendell/glance-plugins",
 *         name: "theme-switcher",
 *         config: { lightPreset: "kissa-latte", darkPreset: "kissa-macchiato" }
 *       },
 *       {
 *         repo: "rwendell/glance-plugins",
 *         name: "search-enhanced",
 *         config: { suggestions: true }
 *       }
 *     ]
 *   });
 *
 * Shorthand:
 *
 *   GlancePlugins.setup({
 *     plugins: ["rwendell/glance-plugins#theme-switcher"]
 *   });
 *
 * Or configure the loader itself:
 *
 *   <script src="/assets/glance-plugins.js" data-config='{
 *     "plugins": [
 *       {"url": "/assets/search-enhanced.js", "config": {"suggestions": true}}
 *     ]
 *   }'></script>
 *
 * Plugin contract: a plugin script registers itself with
 *
 *   window.GlancePlugins.register("name", function setup(config) { ... });
 *
 * and must skip automatic setup while `GlancePlugins._loading` is true.
 */
(() => {
    "use strict";

    if (window.GlancePlugins && window.GlancePlugins.__loader) {
        return;
    }

    const LOADER_VERSION = 1;
    const DEFAULT_REF = "main";
    const MANIFEST_NAME = "glance-plugins.json";
    const loadedScripts = new Set();
    const scriptPromises = new Map();
    const stylesheetPromises = new Map();
    const manifestCache = new Map();
    let setupQueue = Promise.resolve();

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

    async function readManifest(url) {
        if (manifestCache.has(url)) {
            return manifestCache.get(url);
        }

        let manifest = null;

        try {
            const response = await fetch(url, { cache: "no-cache" });

            if (response.ok) {
                manifest = await response.json();
            }
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

        return new URL(`${spec.name}/${spec.name}.js`, base).href;
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

    const registry = {
        __loader: true,
        version: LOADER_VERSION,
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

                await loadScript(entry);

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
    const inlineConfig = script && script.dataset.config;

    if (inlineConfig) {
        try {
            registry.setup(JSON.parse(inlineConfig));
        } catch (error) {
            console.error("[GlancePlugins] Invalid data-config JSON:", error);
        }
    }
})();
