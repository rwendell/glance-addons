/*
 * Glance Theme Switcher
 *
 * Applies a colorscheme's light/dark palette and provides a manual
 * light/dark/system toggle in the header.
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
    const VERSION = "2.1.1";
    const ATTRIBUTE = "data-glance-scheme";
    const STORAGE_KEY = "glance-theme-mode";
    const MODES = ["system", "light", "dark"];
    const LIGHT_SELECTOR = /data-glance-scheme\s*=\s*["']light["']/;
    const DARK_SELECTOR = /data-glance-scheme\s*=\s*["']dark["']/;

    const ICON_SYSTEM =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 2v2"></path>' +
        '<path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"></path>' +
        '<path d="M16 12a4 4 0 0 0-4-4"></path>' +
        '<path d="m19 5-1.256 1.256"></path>' +
        '<path d="M20 12h2"></path></svg>';
    const ICON_LIGHT =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';
    const ICON_DARK =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';

    const MODE_LABELS = { system: "System", light: "Light", dark: "Dark" };
    const MODE_ICONS = {
        system: ICON_SYSTEM,
        light: ICON_LIGHT,
        dark: ICON_DARK,
    };

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

    function injectStyles() {
        if (document.getElementById("gts-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "gts-styles";
        style.textContent = `
            html.gts-active .theme-picker,
            html.gts-active .mobile-navigation .theme-choices {
                display: none !important;
            }

            .gts-toggle {
                display: flex;
                flex: none;
                align-items: center;
                justify-content: center;
                width: 3.2rem;
                height: 3.2rem;
                margin-left: 1rem;
                padding: 0;
                border: 0;
                border-radius: var(--border-radius);
                background: var(--color-widget-background-highlight);
                color: var(--color-text-base);
                cursor: pointer;
            }

            .gts-toggle:hover {
                color: var(--color-text-highlight);
                background: var(--color-widget-background);
            }

            .gts-toggle svg {
                width: 1.8rem;
                height: 1.8rem;
                stroke: currentColor;
                fill: none;
                stroke-width: 1.8;
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            .mobile-navigation .gts-toggle {
                width: 3.2rem;
                height: 3.2rem;
                margin-left: 0.5rem;
                background: transparent;
            }

            .mobile-navigation .gts-toggle:hover,
            .mobile-navigation .gts-toggle:active {
                background: var(--color-widget-background-highlight);
            }
        `;

        document.head.appendChild(style);
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

        function readMode() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);

                if (stored === "auto" || stored === "off") {
                    return "system";
                }

                return MODES.includes(stored) ? stored : "system";
            } catch {
                return "system";
            }
        }

        let mode = readMode();

        root.dataset.glanceColorscheme = colorscheme;

        function syncControls() {
            const label = MODE_LABELS[mode];

            for (const button of document.querySelectorAll(".gts-toggle")) {
                button.dataset.mode = mode;
                button.innerHTML = MODE_ICONS[mode];
                button.title = `Color scheme: ${label} (click to change)`;
                button.setAttribute(
                    "aria-label",
                    `Color scheme: ${label}. Activate to change.`
                );
            }
        }

        function apply() {
            const light =
                mode === "light" || (mode === "system" && media.matches);

            root.setAttribute(ATTRIBUTE, light ? "light" : "dark");
            syncControls();
        }

        function setMode(nextMode) {
            if (!MODES.includes(nextMode)) {
                return;
            }

            mode = nextMode;

            try {
                localStorage.setItem(STORAGE_KEY, mode);
            } catch {
                // localStorage can be unavailable in private browsing modes.
            }

            apply();
        }

        function nextMode() {
            return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        }

        function createToggle() {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "gts-toggle";
            button.addEventListener("click", () => setMode(nextMode()));
            return button;
        }

        function mountControls() {
            const header = document.querySelector(".header-container .header");

            if (header && !header.querySelector(".gts-toggle")) {
                header.appendChild(createToggle());
            }

            const mobileIcons = document.querySelector(
                ".mobile-navigation-icons"
            );

            if (mobileIcons && !mobileIcons.querySelector(".gts-toggle")) {
                mobileIcons.appendChild(createToggle());
            }

            syncControls();
        }

        function whenReady(callback) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", callback, {
                    once: true,
                });
                return;
            }

            callback();
        }

        injectStyles();
        root.classList.add("gts-active");
        apply();
        whenReady(mountControls);

        media.addEventListener("change", () => {
            if (mode === "system") {
                apply();
            }
        });

        requestAnimationFrame(() => validateTheme(colorscheme));

        window.GlanceThemeSwitcher = {
            colorscheme,
            getMode: () => mode,
            setMode,
            refresh: apply,
        };
    }

    setup.version = VERSION;

    const registry = window.GlancePlugins || (window.GlancePlugins = {});

    if (typeof registry.register === "function") {
        registry.register(NAME, setup);
    }

    if (!registry._loading) {
        setup(readInlineConfig());
    }
})();
