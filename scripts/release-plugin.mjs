#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
}).trim();
process.chdir(ROOT);

const MANIFEST = "plugins/manifest.json";
const README = "README.md";

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

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function usage() {
    console.log(`Usage: aube run release:plugin -- --plugin <name> [options]

Options:
  --plugin <name>            Plugin to release (see --list)
  --list                     List plugins and current versions
  --bump patch|minor|major   Version bump. Default: patch
  --version x.y.z            Explicit version
  --push                     Push main and the new tag
  --dry-run                  Print the plan without changing anything
  -m, --message <text>       Custom commit message
  -h, --help                 Show this help

The release bumps the manifest and source version, rebuilds all plugin dists,
commits only the selected plugin's files plus the manifest and README, and tags
<plugin>-v<version>.
`);
}

function parseArgs(argv) {
    const options = {
        plugin: "",
        list: false,
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
            case "--plugin":
                options.plugin = argv[++index] || "";
                break;
            case "--list":
                options.list = true;
                break;
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

function sourcePathFor(plugin, info) {
    const distPath = path.join("plugins", info.entry);
    const srcDir = path.join(
        path.dirname(path.dirname(distPath)),
        "src",
    );
    const expected = path.join(
        srcDir,
        `${path.basename(info.entry, ".js")}.ts`,
    );

    if (existsSync(expected)) {
        return { distPath, sourcePath: expected };
    }

    const candidates = readdirSync(srcDir).filter((file) =>
        file.endsWith(".ts"),
    );

    if (candidates.length !== 1) {
        fail(
            `could not determine the source file for ${plugin} under ${srcDir}`,
        );
    }

    return {
        distPath,
        sourcePath: path.join(srcDir, candidates[0]),
    };
}

function replaceSourceVersion(source, current, next) {
    const value = escapeRegExp(current);
    const patterns = [
        new RegExp(`(export const version = ")${value}(";)`),
        new RegExp(`(const VERSION = ")${value}(";)`),
        new RegExp(`(version: ")${value}(",?)`),
    ];

    for (const pattern of patterns) {
        if (pattern.test(source)) {
            return source.replace(pattern, `$1${next}$2`);
        }
    }

    return null;
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        usage();
        return;
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

    if (options.list) {
        for (const name of Object.keys(manifest).sort()) {
            console.log(`${name}\t${manifest[name].version}`);
        }
        return;
    }

    if (!options.plugin) {
        fail("--plugin is required; use --list to see available plugins");
    }

    if (!["patch", "minor", "major"].includes(options.bump)) {
        fail("--bump must be patch, minor, or major");
    }

    const info = manifest[options.plugin];

    if (!info || !info.entry) {
        fail(`unknown plugin: ${options.plugin}`);
    }

    if (!/^\d+\.\d+\.\d+$/.test(info.version)) {
        fail(
            `${options.plugin} has an unsupported version: ${info.version}`,
        );
    }

    const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

    if (branch !== "main") {
        fail(`release from main, not ${branch}`);
    }

    const next = options.version || bumpVersion(info.version, options.bump);

    if (!/^\d+\.\d+\.\d+$/.test(next)) {
        fail(`invalid release version: ${next}`);
    }

    const tag = `${options.plugin}-v${next}`;
    const existingTag = capture("git", ["tag", "--list", tag]);

    if (existingTag) {
        fail(`tag already exists: ${tag}`);
    }

    const { distPath, sourcePath } = sourcePathFor(options.plugin, info);
    const source = readFileSync(sourcePath, "utf8");
    const updatedSource = replaceSourceVersion(
        source,
        info.version,
        next,
    );

    if (!updatedSource) {
        fail(
            `could not find version "${info.version}" in ${sourcePath}`,
        );
    }

    const readme = readFileSync(README, "utf8");
    const readmeRow = new RegExp(
        `(\\[[^\\]]+\\]\\(plugins/${escapeRegExp(
            options.plugin,
        )}/\\)\\s*\\|\\s*)[0-9]+\\.[0-9]+\\.[0-9]+(\\s*\\|)`,
    );

    if (!readmeRow.test(readme)) {
        fail(
            `could not find the ${options.plugin} row in ${README}`,
        );
    }

    const releaseFiles = [sourcePath, distPath, MANIFEST, README];
    const commitMessage =
        options.message || `Release ${options.plugin} v${next}`;
    const url = `https://cdn.jsdelivr.net/gh/${repoSlug()}@${tag}/plugins/${info.entry}`;

    if (options.dryRun) {
        console.log(`plugin:  ${options.plugin}`);
        console.log(`current: ${info.version}`);
        console.log(`next:    ${next}`);
        console.log(`tag:     ${tag}`);
        console.log(`files:   ${releaseFiles.join(", ")}`);
        console.log(`url:     ${url}`);

        if (options.push) {
            console.log(`push:    origin main, origin ${tag}`);
        }

        return;
    }

    manifest[options.plugin].version = next;
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(sourcePath, updatedSource);
    writeFileSync(
        README,
        readme.replace(readmeRow, `$1${next}$2`),
    );

    runShell("aube run check");
    runShell("aube run build");

    const status = capture("git", ["status", "--porcelain", "--", "plugins"]);
    const otherDist = status
        .split("\n")
        .filter(
            (line) =>
                line.trim() &&
                line.endsWith(".js") &&
                !line.includes(distPath),
        );

    if (otherDist.length > 0) {
        console.warn(
            "warning: the build changed other plugin dist files; " +
                "they were left uncommitted:\n" +
                otherDist.join("\n"),
        );
    }

    console.log(`\nRelease files:`);
    run("git", ["diff", "--stat", "--", ...releaseFiles]);

    run("git", [
        "commit",
        "--only",
        "-m",
        commitMessage,
        "--",
        ...releaseFiles,
    ]);
    run("git", ["tag", "-a", tag, "-m", `${options.plugin} v${next}`]);

    if (options.push) {
        run("git", ["push", "origin", "main"]);
        run("git", ["push", "origin", tag]);
    }

    console.log(`\nReleased ${tag}`);
    console.log(`Plugin URL:\n  ${url}`);

    if (!options.push) {
        console.log(`\nPush when ready:`);
        console.log(`  git push origin main`);
        console.log(`  git push origin ${tag}`);
    }

    if (options.plugin === "plugin-manager") {
        console.log(`\nPin local configs:`);
        console.log(
            `  aube run pin:manager -- --ref ${tag} ` +
                `--windows-config <windows glance.yml> ` +
                `--chezmoi-source ~/.local/share/chezmoi`,
        );
    } else {
        console.log(
            `\nThe manager resolves ${options.plugin} from the latest commit ` +
                "on its next check. Force it with GlancePlugins.refresh() " +
                "or wait for checkEvery.",
        );
        console.log(`Exact config version: ${next}`);
    }
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
