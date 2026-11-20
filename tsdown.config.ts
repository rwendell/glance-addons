import { defineConfig } from "tsdown";

const banner = (entry: string) => ({
    js: `// Generated from ${entry} by tsdown. Do not edit.`,
});

export default defineConfig([
    {
        entry: ["plugins/same-tab/src/same-tab.ts"],
        outDir: "plugins/same-tab/dist",
        format: ["esm"],
        platform: "browser",
        target: "es2020",
        clean: true,
        hash: false,
        sourcemap: false,
        minify: false,
        report: false,
        banner: banner("plugins/same-tab/src/same-tab.ts"),
    },
    {
        entry: ["plugins/theme-switcher/src/theme-switcher.ts"],
        outDir: "plugins/theme-switcher/dist",
        format: ["esm"],
        platform: "browser",
        target: "es2020",
        clean: true,
        hash: false,
        sourcemap: false,
        minify: false,
        report: false,
        banner: banner("plugins/theme-switcher/src/theme-switcher.ts"),
    },
    {
        entry: ["plugins/search-enhanced/src/search-enhanced.ts"],
        outDir: "plugins/search-enhanced/dist",
        format: ["esm"],
        platform: "browser",
        target: "es2020",
        clean: true,
        hash: false,
        sourcemap: false,
        minify: false,
        report: false,
        banner: banner("plugins/search-enhanced/src/search-enhanced.ts"),
    },
    {
        entry: ["plugins/plugin-manager/src/plugin-manager.ts"],
        outDir: "plugins/plugin-manager/dist",
        format: ["iife"],
        platform: "browser",
        target: "es2020",
        clean: true,
        hash: false,
        sourcemap: false,
        minify: false,
        report: false,
        banner: banner("plugins/plugin-manager/src/plugin-manager.ts"),
        outputOptions: {
            entryFileNames: "plugin-manager.js",
        },
    },
]);
