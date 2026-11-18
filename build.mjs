import { build } from "esbuild";

const plugins = [
    {
        entry: "plugins/theme-switcher/src/theme-switcher.ts",
        outfile: "plugins/theme-switcher/dist/theme-switcher.js",
        format: "esm",
    },
    {
        entry: "plugins/search-enhanced/src/search-enhanced.ts",
        outfile: "plugins/search-enhanced/dist/search-enhanced.js",
        format: "esm",
    },
    {
        entry: "plugins/plugin-manager/src/plugin-manager.ts",
        outfile: "plugins/plugin-manager/dist/plugin-manager.js",
        format: "iife",
    },
];

for (const plugin of plugins) {
    await build({
        entryPoints: [plugin.entry],
        outfile: plugin.outfile,
        bundle: true,
        format: plugin.format,
        platform: "browser",
        target: ["es2020"],
        sourcemap: false,
        banner: {
            js: `// Generated from ${plugin.entry} by build.mjs. Do not edit.`,
        },
    });
}
