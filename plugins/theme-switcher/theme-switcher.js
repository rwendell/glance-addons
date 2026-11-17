/*
 * Glance Theme Switcher
 *
 * Applies a colorscheme's light/dark palette and provides a manual
 * System/Light/Dark control in the header.
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
    const VERSION = "2.1.0";
    const ATTRIBUTE = "data-glance-scheme";
    const STORAGE_KEY = "glance-theme-mode";
    const MODES = ["system", "light", "dark"];
    const LIGHT_SELECTOR = /data-glance-scheme\s*=\s*["']light["']/;
    const DARK_SELECTOR = /data-glance-scheme\s*=\s*["']dark["']/;

    const ICON_SYSTEM =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path></svg>';
    const ICON_LIGHT =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';
    const ICON_DARK =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';

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

            .gts-control {
                display: flex;
                flex: none;
                align-items: center;
                gap: 0.2rem;
                margin-left: 1rem;
                padding: 0.2rem;
                border-radius: calc(var(--border-radius) * 2);
                background: var(--color-widget-background-highlight);
            }

            .gts-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2.8rem;
                height: 2.8rem;
                padding: 0;
                border: 0;
                border-radius: var(--border-radius);
                background: transparent;
                color: var(--color-text-subdue);
                cursor: pointer;
            }

            .gts-button:hover,
            .gts-button[aria-pressed="true"] {
                color: var(--color-text-highlight);
                background: var(--color-widget-background);
            }

            .gts-button svg {
                width: 1.6rem;
                height: 1.6rem;
                stroke: currentColor;
                fill: none;
                stroke-width: 1.8;
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            .mobile-navigation .gts-control {
                margin-left: 0.5rem;
                padding: 0;
                background: transparent;
            }

            .mobile-navigation .gts-button {
                width: 2.4rem;
                height: 2.4rem;
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
            for (const button of document.querySelectorAll(".gts-button")) {
                button.setAttribute(
                    "aria-pressed",
                    button.dataset.mode === mode ? "true" : "false"
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

        function createControl() {
            const group = document.createElement("div");
            group.className = "gts-control";
            group.setAttribute("role", "group");
            group.setAttribute("aria-label", "Color scheme");

            const choices = [
                ["system", "System", ICON_SYSTEM],
                ["light", "Light", ICON_LIGHT],
                ["dark", "Dark", ICON_DARK],
            ];

            for (const [value, label, icon] of choices) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "gts-button";
                button.dataset.mode = value;
                button.title = label;
                button.setAttribute("aria-label", `${label} color scheme`);
                button.innerHTML = icon;
                button.addEventListener("click", () => setMode(value));
                group.appendChild(button);
            }

            return group;
        }

        function mountControls() {
            const header = document.querySelector(".header-container .header");

            if (header && !header.querySelector(".gts-control")) {
                header.appendChild(createControl());
            }

            const mobileIcons = document.querySelector(
                ".mobile-navigation-icons"
            );

            if (mobileIcons && !mobileIcons.querySelector(".gts-control")) {
                mobileIcons.appendChild(createControl());
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
