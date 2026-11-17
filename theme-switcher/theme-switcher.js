/*
 * Glance Theme Switcher
 *
 * Follows prefers-color-scheme and applies a light/dark variant marker to
 * <html>. Pair it with a custom CSS file that maps that marker to your theme
 * variables. Also tracks explicit selections from Glance's theme picker.
 *
 * Configuration (set before this script loads):
 *
 *   window.GLANCE_THEME_SWITCHER = {
 *     lightPreset: "kissa-latte",
 *     darkPreset: "kissa-macchiato",
 *     autoPreset: "kissa-auto",
 *     storageKey: "kissa-theme-mode"
 *   };
 *
 * By default the script sets <html data-glance-scheme="light|dark">.
 */
(() => {
    "use strict";

    if (window.__glanceThemeSwitcherLoaded) {
        return;
    }

    window.__glanceThemeSwitcherLoaded = true;

    const config = Object.assign(
        {
            lightPreset: "glance-light",
            darkPreset: "glance-dark",
            autoPreset: "glance-auto",
            storageKey: "glance-theme-mode",
            defaultMode: "auto",
            attribute: "data-glance-scheme",
        },
        window.GLANCE_THEME_SWITCHER || {}
    );

    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const modes = ["auto", "light", "dark", "off"];

    function readStoredMode() {
        try {
            return localStorage.getItem(config.storageKey);
        } catch {
            return null;
        }
    }

    function storeMode(value) {
        try {
            localStorage.setItem(config.storageKey, value);
        } catch {
            // localStorage can be unavailable in private browsing modes.
        }
    }

    const managedPresets = [
        config.lightPreset,
        config.darkPreset,
        config.autoPreset,
    ].filter(Boolean);

    const currentTheme = root.dataset.theme || "default";
    const currentThemeIsManaged =
        currentTheme === "default" || managedPresets.includes(currentTheme);

    const storedMode = readStoredMode();
    const firstVisitMode = modes.includes(config.defaultMode)
        ? config.defaultMode
        : "auto";
    let mode = modes.includes(storedMode)
        ? storedMode
        : currentThemeIsManaged
          ? firstVisitMode
          : "off";

    function applyScheme(isLight) {
        root.setAttribute(config.attribute, isLight ? "light" : "dark");
    }

    function clearScheme() {
        root.removeAttribute(config.attribute);
    }

    function applyCurrentMode() {
        if (mode === "off") {
            clearScheme();
            return;
        }

        applyScheme(mode === "light" || (mode === "auto" && media.matches));
    }

    function setMode(nextMode) {
        if (!modes.includes(nextMode)) {
            return;
        }

        mode = nextMode;
        storeMode(mode);
        applyCurrentMode();
    }

    applyCurrentMode();

    media.addEventListener("change", () => {
        if (mode === "auto") {
            applyScheme(media.matches);
        }
    });

    // Glance's theme picker updates data-theme/data-scheme after its request
    // finishes. Re-assert the selected scheme if that races with this script.
    new MutationObserver(() => {
        if (mode !== "off") {
            applyCurrentMode();
        }
    }).observe(root, {
        attributes: true,
        attributeFilter: ["data-theme", "data-scheme"],
    });

    // Capture phase so this runs before Glance's own picker handler. We do not
    // stop propagation: Glance should still update its current-theme preview
    // and persist the preset cookie.
    document.addEventListener(
        "click",
        (event) => {
            const preset = event.target.closest(".theme-preset");

            if (!preset || !preset.dataset.key) {
                return;
            }

            const key = preset.dataset.key;

            if (config.autoPreset && key === config.autoPreset) {
                setMode("auto");
                return;
            }

            if (key === config.lightPreset) {
                setMode("light");
                return;
            }

            if (key === config.darkPreset) {
                setMode("dark");
                return;
            }

            setMode("off");
        },
        true
    );

    window.GlanceThemeSwitcher = {
        setMode,
        getMode: () => mode,
        refresh: applyCurrentMode,
    };
})();
