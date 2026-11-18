import { build } from "esbuild";

const plugins = [
    ["plugins/theme-switcher/theme-switcher.ts", "plugins/theme-switcher/theme-switcher.js"],
    ["plugins/search-enhanced/search-enhanced.ts", "plugins/search-enhanced/search-enhanced.js"],
];

for (const [entry, outfile] of plugins) {
    await build({
        entryPoints: [entry],
        outfile,
        bundle: true,
        format: "esm",
        platform: "browser",
        target: ["es2020"],
        sourcemap: false,
    });
}
