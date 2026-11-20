#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
}).trim();
process.chdir(ROOT);

const MANIFEST = "plugins/manifest.json";
const SOURCE = "plugins/plugin-manager/src/plugin-manager.ts";
const DIST = "plugins/plugin-manager/dist/plugin-manager.js";
const README = "README.md";
const RELEASE_FILES = [SOURCE, DIST, MANIFEST, README];

function run(command, args) {
    execFileSync(command, args, { stdio: "inherit" });
}

function runShell(command) {
    execSync(command, { stdio: "inherit" });
}

function capture(command, args) {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function usage() {
    console.log(`Usage: aube run release:manager -- [options]

Options:
  --bump patch|minor|major   Version bump. Default: patch
  --version x.y.z            Explicit version
  --push                     Push main and the new tag
  --dry-run                  Print the plan without changing anything
  -m, --message <text>       Custom commit message
  -h, --help                 Show this help

The release commits only the manager source, its rebuilt dist, the manifest,
and the root README. Other working-tree changes are left alone.
`);
}

function parseArgs(argv) {
    const options = {
        bump: "patch",
        version: "",
        push: false,
        dryRun: false,
        message: "",
        help: false,
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        switch (arg) {
            case "--bump":
                options.bump = argv[++index] || "";
                break;
            case "--version":
                options.version = argv[++index] || "";
                break;
            case "--push":
                options.push = true;
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            case "-m":
            case "--message":
                options.message = argv[++index] || "";
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

function bumpVersion(version, kind) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

    if (!match) {
        fail(`current version is not a plain semver: ${version}`);
    }

    let major = Number(match[1]);
    let minor = Number(match[2]);
    let patch = Number(match[3]);

    switch (kind) {
        case "major":
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case "minor":
            minor += 1;
            patch = 0;
            break;
        case "patch":
            patch += 1;
            break;
        default:
            fail(`invalid --bump value: ${kind}`);
    }

    return `${major}.${minor}.${patch}`;
}

function repoSlug() {
    try {
        const remote = capture("git", ["remote", "get-url", "origin"]);
        const match = remote.match(
            /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/,
        );

        if (match) {
            return `${match[1]}/${match[2]}`;
        }
    } catch {
        // Fall through to the known repository.
    }

    return "rwendell/glance-addons";
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        usage();
        return;
    }

    if (!["patch", "minor", "major"].includes(options.bump)) {
        fail("--bump must be patch, minor, or major");
    }

    const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

    if (branch !== "main") {
        fail(`release from main, not ${branch}`);
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const current = manifest["plugin-manager"]?.version;

    if (!current) {
        fail(`no "plugin-manager".version in ${MANIFEST}`);
    }

    const source = readFileSync(SOURCE, "utf8");

    if (!source.includes(`version: "${current}"`)) {
        fail(
            `${SOURCE} does not contain version "${current}"; ` +
                "align the source and manifest before releasing",
        );
    }

    const next = options.version || bumpVersion(current, options.bump);

    if (!/^\d+\.\d+\.\d+$/.test(next)) {
        fail(`invalid release version: ${next}`);
    }

    const tag = `plugin-manager-v${next}`;
    const existingTag = capture("git", ["tag", "--list", tag]);

    if (existingTag) {
        fail(`tag already exists: ${tag}`);
    }

    const commitMessage =
        options.message || `Release plugin-manager v${next}`;
    const url = `https://cdn.jsdelivr.net/gh/${repoSlug()}@${tag}/plugins/plugin-manager/dist/plugin-manager.js`;

    if (options.dryRun) {
        console.log(`current: ${current}`);
        console.log(`next:    ${next}`);
        console.log(`tag:     ${tag}`);
        console.log(`files:   ${RELEASE_FILES.join(", ")}`);
        console.log(`url:     ${url}`);

        if (options.push) {
            console.log(`push:    origin main, origin ${tag}`);
        }

        return;
    }

    manifest["plugin-manager"].version = next;
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

    writeFileSync(
        SOURCE,
        source.replace(
            `version: "${current}"`,
            `version: "${next}"`,
        ),
    );

    const readme = readFileSync(README, "utf8");
    const readmeRow = /(\[Plugin Manager\]\(plugins\/plugin-manager\/\)\s*\|\s*)[0-9]+\.[0-9]+\.[0-9]+(\s*\|)/;

    if (!readmeRow.test(readme)) {
        fail(`could not find the Plugin Manager row in ${README}`);
    }

    writeFileSync(
        README,
        readme.replace(readmeRow, `$1${next}$2`),
    );

    runShell("aube run check");
    runShell("aube run build");

    console.log(`\nRelease files:`);
    run("git", ["diff", "--stat", "--", ...RELEASE_FILES]);

    run("git", [
        "commit",
        "--only",
        "-m",
        commitMessage,
        "--",
        ...RELEASE_FILES,
    ]);
    run("git", ["tag", "-a", tag, "-m", `plugin-manager v${next}`]);

    if (options.push) {
        run("git", ["push", "origin", "main"]);
        run("git", ["push", "origin", tag]);
    }

    console.log(`\nReleased ${tag}`);
    console.log(`Manager URL:\n  ${url}`);

    if (!options.push) {
        console.log(`\nPush when ready:`);
        console.log(`  git push origin main`);
        console.log(`  git push origin ${tag}`);
    }

    console.log(`\nPin local configs:`);
    console.log(
        `  aube run pin:manager -- --ref ${tag} ` +
            `--windows-config <windows glance.yml> ` +
            `--chezmoi-source ~/.local/share/chezmoi`,
    );
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
