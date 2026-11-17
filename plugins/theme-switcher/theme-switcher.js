/*
 * Glance Theme Switcher
 *
 * Applies the OS light/dark preference to <html data-glance-scheme>. The
 * plugin manager loads themes/<colorscheme>.css automatically.
 *
 * Config:
 *   { "colorscheme": "kissa" }
 *
 * Theme file requirement: it must define BOTH variants:
 *
 *   html[data-glance-scheme="dark"]  { ... }
 *   html[data-glance-scheme="light"] { ... }
 *
 * A file that only defines one variant is reported as an error.
 */
(function () {
    "use strict";

    const NAME = "theme-switcher";
    const ATTRIBUTE = "data-glance-scheme";
    const LIGHT_SELECTOR = /data-glance-scheme\s*=\s*["']light["']/;
    const DARK_SELECTOR = /data-glance-scheme\s*=\s*["']dark["']/;
    let initialized = false;

    function readInlineConfig() {
        const script = document.currentScript;

        if (!script || !script.dataset.config) {
            return {};
        }

        try {
            return JSON.parse(script.dataset.config);
        } catch (error) {
            console.error(`[${NAME}] Invalid data-config JSON:`, error);
            return {};
        }
    }

    function findThemeStylesheet(colorscheme) {
        const suffix = `/themes/${colorscheme}.css`;

        return Array.from(document.styleSheets).find((sheet) => {
            const href = sheet.href || "";
            return href.endsWith(suffix) || href.includes(suffix + "?");
        });
    }

    function stylesheetHasBothVariants(sheet) {
        let light = false;
        let dark = false;

        function visit(rules) {
            for (const rule of rules) {
                const text = rule.cssText || "";

                if (!light && LIGHT_SELECTOR.test(text)) {
                    light = true;
                }

                if (!dark && DARK_SELECTOR.test(text)) {
                    dark = true;
                }

                if (rule.cssRules) {
                    visit(rule.cssRules);
                }
            }
        }

        visit(sheet.cssRules);

        return light && dark;
    }

    function validateTheme(colorscheme) {
        const sheet = findThemeStylesheet(colorscheme);

        if (!sheet) {
            console.warn(
                `[${NAME}] Could not find themes/${colorscheme}.css. ` +
                    "Load it with the plugin manager or a stylesheet."
            );
            return;
        }

        let valid = false;

        try {
            valid = stylesheetHasBothVariants(sheet);
        } catch (error) {
            console.warn(
                `[${NAME}] Could not inspect themes/${colorscheme}.css`,
                error
            );
            return;
        }

        if (!valid) {
            console.error(
                `[${NAME}] themes/${colorscheme}.css must define both ` +
                    `html[${ATTRIBUTE}="light"] and html[${ATTRIBUTE}="dark"].`
            );
        }
    }

    function setup(userConfig) {
        if (initialized) {
            return;
        }

        initialized = true;

        const config = userConfig || {};
        const colorscheme =
            typeof config.colorscheme === "string"
                ? config.colorscheme.trim()
                : "";

        if (!colorscheme) {
            console.error(`[${NAME}] Missing required config: colorscheme`);
            return;
        }

        if (!/^[a-z0-9][a-z0-9_-]*$/i.test(colorscheme)) {
            console.error(`[${NAME}] Invalid colorscheme name: ${colorscheme}`);
            return;
        }

        const root = document.documentElement;
        const media = window.matchMedia("(prefers-color-scheme: light)");

        root.dataset.glanceColorscheme = colorscheme;

        function apply(isLight) {
            root.setAttribute(ATTRIBUTE, isLight ? "light" : "dark");
        }

        apply(media.matches);

        media.addEventListener("change", (event) => {
            apply(event.matches);
        });

        requestAnimationFrame(() => validateTheme(colorscheme));

        window.GlanceThemeSwitcher = {
            colorscheme,
            refresh: () => apply(media.matches),
        };
    }

    const registry = window.GlancePlugins || (window.GlancePlugins = {});

    if (typeof registry.register === "function") {
        registry.register(NAME, setup);
    }

    if (!registry._loading) {
        setup(readInlineConfig());
    }
})();
