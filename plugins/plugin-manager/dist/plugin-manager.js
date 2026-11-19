// Generated from plugins/plugin-manager/src/plugin-manager.ts by tsdown. Do not edit.
(function() {

// plugins/plugin-manager/src/plugin-manager.ts
	(function() {
		"use strict";
		if (window.GlancePlugins && window.GlancePlugins.__manager) return;
		const script = document.currentScript;
		const scriptBase = script ? new URL(".", script.src) : new URL("./", document.baseURI);
		const remote = Boolean(script && script.src && new URL(script.src).origin !== window.location.origin);
		const assetsBase = remote ? glanceAssetsBase() : scriptBase;
		function glanceAssetsBase() {
			let baseURL = "";
			try {
				if (typeof pageData !== "undefined" && pageData && typeof pageData.baseURL === "string") baseURL = pageData.baseURL;
			} catch {}
			return directoryUrl(`${baseURL.replace(/\/+$/, "")}/assets/`, window.location.origin);
		}
		function directoryUrl(value, base) {
			const url = new URL(value, base);
			if (!url.pathname.endsWith("/")) url.pathname += "/";
			return url;
		}
		function readInlineConfig() {
			const raw = script && script.dataset.config;
			if (!raw) return null;
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return { plugins: parsed };
				if (parsed && typeof parsed === "object") return parsed;
			} catch (error) {
				console.error("[GlancePlugins] Invalid data-config JSON:", error);
			}
			return null;
		}
		const inlineConfig = readInlineConfig();
		const configUrl = new URL(script && script.dataset.configUrl || "plugins.json", assetsBase);
		const themesBase = directoryUrl(script && script.dataset.themes || "themes/", assetsBase);
		const lockKey = "glance-plugin-lock-v1";
		const defaultRepo = "rwendell/glance-plugins";
		const defaultCheckEvery = 216e5;
		const retryTtl = 864e5;
		const branchTtl = 864e5;
		const manifestPath = "plugins/manifest.json";
		const manifestDir = "plugins/";
		window.GlancePlugins = {
			__manager: true,
			version: "4.0.0",
			getLock() {
				return readLock();
			},
			refresh() {
				try {
					localStorage.removeItem(lockKey);
				} catch {}
				window.location.reload();
			}
		};
		function emptyLock() {
			return {
				version: 1,
				updatedAt: 0,
				repos: {},
				plugins: {}
			};
		}
		function readLock() {
			try {
				const parsed = JSON.parse(localStorage.getItem(lockKey));
				if (parsed && typeof parsed === "object") {
					parsed.repos = parsed.repos || {};
					parsed.plugins = parsed.plugins || {};
					return parsed;
				}
			} catch {}
			return emptyLock();
		}
		function writeLock(lock) {
			try {
				localStorage.setItem(lockKey, JSON.stringify(lock));
			} catch {}
		}
		async function fetchResponse(url, options) {
			let lastError = null;
			for (let attempt = 0; attempt < 2; attempt++) try {
				return await fetch(url, options);
			} catch (error) {
				lastError = error;
				if (error instanceof TypeError && attempt === 0) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					continue;
				}
				throw error;
			}
			throw lastError;
		}
		async function fetchJSON(url, options) {
			const res = await fetchResponse(url, options);
			if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
			return await res.json();
		}
		function repoParts(repo) {
			const parts = String(repo || "").split("/");
			if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0] === "." || parts[0] === ".." || parts[1] === "." || parts[1] === "..") throw new Error(`Invalid repo: ${repo}`);
			return parts;
		}
		async function defaultBranch(repo, lock) {
			const cached = lock.repos[repo];
			if (cached && cached.branch && Date.now() - cached.branchAt < branchTtl) return cached.branch;
			try {
				const branch = (await fetchJSON(`https://api.github.com/repos/${repo}`, {
					headers: { Accept: "application/vnd.github+json" },
					cache: "no-store"
				})).default_branch || "main";
				lock.repos[repo] = {
					...cached || {},
					branch,
					branchAt: Date.now()
				};
				return branch;
			} catch (error) {
				if (cached && cached.branch) return cached.branch;
				throw error;
			}
		}
		async function latestCommit(repo, branch, lock, ttl) {
			const cached = lock.repos[repo];
			const now = Date.now();
			if (cached && cached.latestCommit && now - (cached.latestAt || 0) < ttl) return cached.latestCommit;
			if (cached && cached.latestCommit && cached.latestAttemptAt && now - cached.latestAttemptAt < retryTtl) return cached.latestCommit;
			const url = `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`;
			const headers = { Accept: "application/vnd.github+json" };
			if (cached && cached.latestEtag) headers["If-None-Match"] = cached.latestEtag;
			let res;
			try {
				res = await fetchResponse(url, {
					headers,
					cache: "no-store"
				});
			} catch (error) {
				lock.repos[repo] = {
					...cached || {},
					latestAttemptAt: Date.now()
				};
				throw error;
			}
			if (res.status === 304 && cached && cached.latestCommit) {
				lock.repos[repo] = {
					...cached || {},
					latestAt: Date.now()
				};
				return cached.latestCommit;
			}
			if (!res.ok) {
				lock.repos[repo] = {
					...cached || {},
					latestAttemptAt: Date.now()
				};
				throw new Error(`${url}: ${res.status} ${res.statusText}`);
			}
			const commit = await res.json();
			if (!commit || !commit.sha) throw new Error(`No commit returned for ${repo}@${branch}`);
			lock.repos[repo] = {
				...cached || {},
				latestCommit: commit.sha,
				latestAt: Date.now(),
				latestEtag: res.headers.get("ETag") || void 0
			};
			return commit.sha;
		}
		async function tagVersions(repo, lock, ttl) {
			const cached = lock.repos[repo];
			if (cached && cached.tags && Date.now() - (cached.tagsAt || 0) < ttl) return cached.tags;
			try {
				const versions = ((await fetchJSON(`https://data.jsdelivr.com/v1/packages/gh/${repo}`)).versions || []).map((item) => item.version).filter((item) => typeof item === "string");
				lock.repos[repo] = {
					...cached || {},
					tags: versions,
					tagsAt: Date.now()
				};
				return versions;
			} catch (error) {
				if (cached && cached.tags) return cached.tags;
				throw error;
			}
		}
		async function manifestAt(repo, ref) {
			const bases = [`https://cdn.jsdelivr.net/gh/${repo}@${encodeURIComponent(ref)}`, `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}`];
			for (const base of bases) try {
				return await fetchJSON(`${base}/${manifestPath}`);
			} catch {}
			return null;
		}
		function asConfig(value) {
			return value && typeof value === "object" && !Array.isArray(value) ? value : {};
		}
		function parsePluginSource(spec) {
			const raw = String(spec.plugin || "").trim();
			if (!raw) return {
				repo: "",
				name: ""
			};
			if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../") || /\.js$/i.test(raw)) {
				let name = "";
				try {
					name = (new URL(raw, assetsBase).pathname.split("/").filter(Boolean).pop() || "").replace(/\.js$/i, "");
				} catch {}
				return {
					repo: "",
					name,
					url: raw
				};
			}
			const separator = raw.lastIndexOf(":");
			if (separator === -1) return {
				repo: raw,
				name: ""
			};
			return {
				repo: raw.slice(0, separator).trim(),
				name: raw.slice(separator + 1).trim()
			};
		}
		function versionSpec(raw) {
			if (raw === void 0 || raw === null || raw === false) return {
				pinned: false,
				exact: false
			};
			if (typeof raw === "string") {
				const value = raw.trim();
				if (!value || value.toLowerCase() === "false") return {
					pinned: false,
					exact: false
				};
				return {
					pinned: true,
					exact: Boolean(parseSemver(value.replace(/^v/i, ""))),
					value
				};
			}
			throw new Error("version must be a semver range or false");
		}
		function checkEveryMs(name, raw) {
			const value = String(raw || "").trim();
			if (!value) return defaultCheckEvery;
			const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value);
			if (!match) {
				console.warn(`[GlancePlugins] ${name}: invalid checkEvery "${value}"; using 6h`);
				return defaultCheckEvery;
			}
			return Number(match[1]) * {
				s: 1e3,
				m: 6e4,
				h: 36e5,
				d: 864e5
			}[match[2].toLowerCase()];
		}
		function parseSemver(value) {
			const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(value).trim());
			if (!match) return null;
			return {
				major: Number(match[1]),
				minor: Number(match[2]),
				patch: Number(match[3]),
				prerelease: match[4] || ""
			};
		}
		function compareSemver(a, b) {
			if (a.major !== b.major) return a.major - b.major;
			if (a.minor !== b.minor) return a.minor - b.minor;
			if (a.patch !== b.patch) return a.patch - b.patch;
			if (a.prerelease === b.prerelease) return 0;
			if (!a.prerelease) return 1;
			if (!b.prerelease) return -1;
			return a.prerelease < b.prerelease ? -1 : 1;
		}
		function upperCaret(version) {
			if (version.major > 0) return {
				major: version.major + 1,
				minor: 0,
				patch: 0,
				prerelease: ""
			};
			if (version.minor > 0) return {
				major: 0,
				minor: version.minor + 1,
				patch: 0,
				prerelease: ""
			};
			return {
				major: 0,
				minor: 0,
				patch: version.patch + 1,
				prerelease: ""
			};
		}
		function upperTilde(version) {
			return {
				major: version.major,
				minor: version.minor + 1,
				patch: 0,
				prerelease: ""
			};
		}
		function satisfies(version, range) {
			const value = String(range).trim();
			if (!value || value === "*") return true;
			if (value.includes("||")) return value.split("||").some((part) => satisfies(version, part));
			return value.split(/\s+/).filter(Boolean).every((part) => satisfiesOne(version, part));
		}
		function satisfiesOne(version, range) {
			if (range === "*") return true;
			if (range.endsWith(".x") || range.endsWith(".*")) {
				const parts = range.split(".");
				if (version.major !== Number(parts[0])) return false;
				if (parts[1] === "x" || parts[1] === "*") return true;
				return version.minor === Number(parts[1]);
			}
			const match = /^(>=|<=|>|<|\^|~)?\s*v?(.+)$/.exec(range);
			if (!match) return false;
			const operator = match[1] || "";
			const target = parseSemver(match[2]);
			if (!target) return false;
			const cmp = compareSemver(version, target);
			switch (operator) {
				case ">": return cmp > 0;
				case ">=": return cmp >= 0;
				case "<": return cmp < 0;
				case "<=": return cmp <= 0;
				case "^": return cmp >= 0 && compareSemver(version, upperCaret(target)) < 0;
				case "~": return cmp >= 0 && compareSemver(version, upperTilde(target)) < 0;
				default: return cmp === 0;
			}
		}
		function selectTag(versions, plugin, range) {
			const prefix = `${plugin.toLowerCase()}-v`;
			const prefixed = [];
			const global = [];
			for (const name of versions) {
				const lower = name.toLowerCase();
				let parsed = null;
				if (lower.startsWith(prefix)) {
					const version = parseSemver(name.slice(prefix.length));
					if (version && !version.prerelease) prefixed.push({
						name,
						version
					});
					continue;
				}
				parsed = parseSemver(name.replace(/^v/i, ""));
				if (parsed && !parsed.prerelease) global.push({
					name,
					version: parsed
				});
			}
			const candidates = prefixed.length > 0 ? prefixed : global;
			if (candidates.length === 0) throw new Error(`No semver tags found for ${plugin}`);
			candidates.sort((a, b) => compareSemver(b.version, a.version));
			const match = candidates.find((candidate) => satisfies(candidate.version, range));
			if (!match) throw new Error(`No tag for ${plugin} matches ${range}; available: ${candidates.slice(0, 10).map((candidate) => candidate.name).join(", ")}`);
			return match;
		}
		async function resolveRemote(name, spec, lock) {
			const repo = String(spec.plugin || defaultRepo).trim();
			repoParts(repo);
			const requested = versionSpec(spec.version);
			const requestedKey = requested.pinned ? requested.value : "false";
			const ttl = checkEveryMs(name, spec.checkEvery);
			const cached = lock.plugins[name];
			if (cached && cached.repo === repo && cached.requested === requestedKey && cached.kind) {
				const age = Date.now() - (cached.resolvedAt || 0);
				if (cached.kind === "latest" && age < ttl || cached.kind === "tag" && requested.exact || cached.kind === "tag" && age < ttl) return cached;
			}
			try {
				let ref;
				let kind;
				let tagVersion = "";
				if (requested.pinned) {
					const tag = selectTag(await tagVersions(repo, lock, ttl), name, requested.value);
					ref = tag.name;
					kind = "tag";
					tagVersion = `${tag.version.major}.${tag.version.minor}.${tag.version.patch}`;
				} else {
					ref = await latestCommit(repo, await defaultBranch(repo, lock), lock, ttl);
					kind = "latest";
				}
				const manifest = await manifestAt(repo, ref);
				let info;
				let entryDir = "";
				if (manifest) {
					info = manifest[name];
					entryDir = manifestDir;
				} else info = { entry: "index.js" };
				if (!info || !info.entry) throw new Error(`Manifest has no plugin ${name} at ${ref}`);
				const entry = {
					requested: requestedKey,
					version: info.version || tagVersion,
					repo,
					ref,
					entry: info.entry,
					manifestDir: entryDir,
					kind,
					resolvedAt: Date.now()
				};
				lock.plugins[name] = entry;
				return entry;
			} catch (error) {
				if (cached && cached.repo === repo && cached.entry) {
					console.warn(`[GlancePlugins] ${name}: using cached ${cached.ref}`, error);
					return cached;
				}
				throw error;
			}
		}
		function remotePluginUrl(entry) {
			const dir = entry.manifestDir ?? manifestDir;
			const base = `https://cdn.jsdelivr.net/gh/${entry.repo}@${encodeURIComponent(entry.ref)}/${dir}`;
			return new URL(entry.entry, base).href;
		}
		const loadedStyles = /* @__PURE__ */ new Set();
		function loadStylesheet(url) {
			if (loadedStyles.has(url)) return Promise.resolve();
			if (Array.from(document.querySelectorAll("link[rel=\"stylesheet\"]")).find((link) => link.href === url)) {
				loadedStyles.add(url);
				return Promise.resolve();
			}
			return new Promise((resolve, reject) => {
				const link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = url;
				link.onload = () => {
					loadedStyles.add(url);
					resolve();
				};
				link.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${url}`));
				document.head.appendChild(link);
			});
		}
		const loadedModules = /* @__PURE__ */ new Map();
		function importModule(url) {
			if (!loadedModules.has(url)) loadedModules.set(url, import(url));
			return loadedModules.get(url);
		}
		async function main() {
			let config;
			if (inlineConfig) config = inlineConfig;
			else {
				const configRes = await fetch(configUrl, { cache: "no-cache" });
				if (!configRes.ok) {
					console.warn(`[GlancePlugins] Could not load ${configUrl.pathname}: ${configRes.status}`);
					if (remote) console.warn("[GlancePlugins] Add data-config or data-config-url to the manager script tag.");
					return;
				}
				try {
					config = await configRes.json();
				} catch (error) {
					console.error("[GlancePlugins] Invalid plugins.json:", error);
					return;
				}
			}
			const specs = Array.isArray(config.plugins) ? config.plugins : [];
			const lock = readLock();
			const plans = [];
			for (const spec of specs) {
				if (!spec || spec.enabled === false) continue;
				let source;
				try {
					source = parsePluginSource(spec);
				} catch (error) {
					console.error(`[GlancePlugins] ${error.message}`);
					continue;
				}
				const name = source.name;
				if (!name) {
					console.error("[GlancePlugins] Plugin source needs a name");
					continue;
				}
				if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
					console.error(`[GlancePlugins] Invalid plugin name: ${name}`);
					continue;
				}
				if (source.url) {
					try {
						plans.push({
							name,
							config: asConfig(spec.config),
							url: new URL(source.url, assetsBase).href,
							local: true
						});
					} catch (error) {
						console.error(`[GlancePlugins] Invalid URL for ${name}:`, error);
					}
					continue;
				}
				try {
					const entry = await resolveRemote(name, {
						...spec,
						plugin: source.repo
					}, lock);
					plans.push({
						name,
						config: asConfig(spec.config),
						url: remotePluginUrl(entry),
						local: false,
						entry
					});
				} catch (error) {
					console.error(`[GlancePlugins] Failed to resolve ${name}:`, error);
				}
			}
			for (const plan of plans) {
				const colorscheme = plan.config.colorscheme;
				if (typeof colorscheme === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(colorscheme)) try {
					await loadStylesheet(new URL(`${colorscheme}.css`, themesBase).href);
				} catch (error) {
					console.warn(`[GlancePlugins] Could not load theme CSS for ${plan.name}`, error);
				}
			}
			for (const plan of plans) try {
				const module = await importModule(plan.url);
				const setup = module.default;
				if (typeof setup !== "function") throw new Error("module has no default setup function");
				setup(plan.config);
				const declared = typeof module.version === "string" ? module.version : typeof setup.version === "string" ? setup.version : "";
				if (plan.local) {
					lock.plugins[plan.name] = {
						local: true,
						path: new URL(plan.url).pathname,
						version: declared,
						resolvedAt: Date.now()
					};
					continue;
				}
				if (plan.entry && plan.entry.version && declared && plan.entry.version !== declared) console.warn(`[GlancePlugins] ${plan.name}: resolved ${plan.entry.version}, plugin reports ${declared}`);
			} catch (error) {
				console.error(`[GlancePlugins] Failed to load ${plan.name}:`, error);
			}
			lock.updatedAt = Date.now();
			writeLock(lock);
		}
		main().catch((error) => {
			console.error("[GlancePlugins] Manager failed:", error);
		});
	})();

})();