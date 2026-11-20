#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const MANAGER_URL =
    /(https:\/\/cdn\.jsdelivr\.net\/gh\/[^/\s]+\/[^@\s/]+@)[^/\s]+\/plugins\/plugin-manager\/dist\/plugin-manager\.js/g;

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function usage() {
    console.log(`Usage: aube run pin:manager -- --ref <tag|sha> [options]

Options:
  --ref <tag|sha>            Required. New manager ref
  --file <path>              Config file to update (repeatable)
  --windows-config <path>    Windows glance.yml
  --chezmoi-source <path>    Chezmoi source directory
  --dry-run                  Show changes without writing
  -h, --help                 Show this help

If --windows-config or --chezmoi-source are omitted, the script tries
GLANCE_WINDOWS_CONFIG / CHEZMOI_SOURCE, then the usual local paths.
`);
}

function parseArgs(argv) {
    const options = {
        ref: "",
        files: [],
        windowsConfig: "",
        chezmoiSource: "",
        dryRun: false,
        help: false,
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        switch (arg) {
            case "--ref":
                options.ref = argv[++index] || "";
                break;
            case "--file":
                options.files.push(argv[++index] || "");
                break;
            case "--windows-config":
                options.windowsConfig = argv[++index] || "";
                break;
            case "--chezmoi-source":
                options.chezmoiSource = argv[++index] || "";
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            case "-h":
            case "--help":
                options.help = true;
                break;
            default:
                fail(`unknown argument: ${arg}`);
        }
    }

    return options;
}

function expandHome(value) {
    if (value === "~") {
        return os.homedir();
    }

    if (value.startsWith("~/") || value.startsWith("~\\")) {
        return path.join(os.homedir(), value.slice(2));
    }

    return value;
}

function detectWindowsConfig() {
    const cmd = "/mnt/c/Windows/System32/cmd.exe";

    if (!existsSync(cmd)) {
        return "";
    }

    try {
        const winHome = execFileSync(
            cmd,
            ["/c", "echo", "%USERPROFILE%"],
            { cwd: "/mnt/c", encoding: "utf8" },
        ).trim();
        const wslHome = execFileSync("wslpath", ["-u", winHome], {
            encoding: "utf8",
        }).trim();
        const candidate = path.join(wslHome, ".config/glance/glance.yml");

        return existsSync(candidate) ? candidate : "";
    } catch {
        return "";
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        usage();
        return;
    }

    if (!options.ref || /\s/.test(options.ref)) {
        fail("--ref must be a tag or commit SHA");
    }

    const files = new Set();

    for (const file of options.files) {
        if (file) {
            files.add(path.resolve(expandHome(file)));
        }
    }

    const windowsConfig =
        options.windowsConfig ||
        process.env.GLANCE_WINDOWS_CONFIG ||
        detectWindowsConfig();

    if (windowsConfig) {
        files.add(path.resolve(expandHome(windowsConfig)));
    }

    const chezmoiSource =
        options.chezmoiSource ||
        process.env.CHEZMOI_SOURCE ||
        path.join(os.homedir(), ".local/share/chezmoi");
    const chezmoiTemplate = path.join(
        chezmoiSource,
        "dot_config/glance/glance.yml.tmpl",
    );

    if (existsSync(chezmoiTemplate)) {
        files.add(chezmoiTemplate);
    }

    if (files.size === 0) {
        fail("no config files found; pass --windows-config or --file");
    }

    let changed = 0;
    const changedFiles = new Set();

    for (const file of files) {
        if (!existsSync(file)) {
            console.warn(`skip missing: ${file}`);
            continue;
        }

        const original = readFileSync(file, "utf8");
        const matches = original.match(new RegExp(MANAGER_URL.source, "g"));

        if (!matches) {
            console.warn(`no manager URL found in ${file}`);
            continue;
        }

        const updated = original.replace(
            MANAGER_URL,
            `$1${options.ref}/plugins/plugin-manager/dist/plugin-manager.js`,
        );

        if (updated === original) {
            console.log(`already pinned in ${file}`);
            continue;
        }

        if (options.dryRun) {
            console.log(`would update ${file}`);
            for (const line of original.split("\n")) {
                if (line.includes("plugin-manager/dist/plugin-manager.js")) {
                    console.log(`  old: ${line.trim()}`);
                }
            }
            for (const line of updated.split("\n")) {
                if (line.includes("plugin-manager/dist/plugin-manager.js")) {
                    console.log(`  new: ${line.trim()}`);
                }
            }
            changed += 1;
            changedFiles.add(file);
            continue;
        }

        writeFileSync(file, updated);
        console.log(`updated ${file}`);
        changed += 1;
        changedFiles.add(file);
    }

    if (changed === 0) {
        console.log("No files changed.");
        return;
    }

    if (options.dryRun) {
        console.log("\nDry run only; no files written.");
        return;
    }

    console.log("\nNext steps:");

    if (
        windowsConfig &&
        changedFiles.has(path.resolve(expandHome(windowsConfig)))
    ) {
        console.log("  Windows: reload the Glance dashboard.");
    }

    if (changedFiles.has(chezmoiTemplate)) {
        console.log(`  Chezmoi:`);
        console.log(`    cd ${chezmoiSource}`);
        console.log(`    git add dot_config/glance/glance.yml.tmpl`);
        console.log(
            `    git commit -m "Pin Glance manager to ${options.ref}"`,
        );
        console.log(`    git push`);
        console.log(`    chezmoi apply`);
    }

    console.log("  Linux: reload the dashboard; restart the user service if needed.");
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
