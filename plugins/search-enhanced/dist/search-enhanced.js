// Generated from plugins/search-enhanced/src/search-enhanced.ts by build.mjs. Do not edit.

// plugins/search-enhanced/src/search-enhanced.ts
var version = "2.0.0";
var initialized = false;
var config = {};
var maxSuggestions = 8;
var DOMAIN_RE = /^(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})(?::\d{1,5})?(?:[/?#]\S*)?$/i;
var IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?(?:[/?#]\S*)?$/;
var LOCALHOST_RE = /^localhost(?::\d{1,5})?(?:[/?#]\S*)?$/i;
var FILE_EXTENSIONS = /* @__PURE__ */ new Set([
  "apk",
  "bat",
  "c",
  "cfg",
  "conf",
  "cpp",
  "cs",
  "css",
  "csv",
  "doc",
  "docx",
  "exe",
  "gif",
  "go",
  "h",
  "hpp",
  "html",
  "ini",
  "java",
  "jpeg",
  "jpg",
  "js",
  "json",
  "jsx",
  "lock",
  "log",
  "md",
  "mjs",
  "mov",
  "mp3",
  "mp4",
  "pdf",
  "php",
  "png",
  "ps1",
  "py",
  "rb",
  "rs",
  "sh",
  "svg",
  "tar",
  "toml",
  "ts",
  "tsx",
  "txt",
  "vbs",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "xml",
  "yaml",
  "yml"
]);
var SUGGEST_ENDPOINT = "https://suggestqueries.google.com/complete/search?client=firefox&jsonp=";
var MAX_CACHE_ENTRIES = 100;
var DEBOUNCE_MS = 120;
var JSONP_TIMEOUT_MS = 6e3;
var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
var ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"></path></svg>';
var suggestionCache = /* @__PURE__ */ new Map();
var jsonpCounter = 0;
function looksLikeUrl(raw) {
  const query = raw.trim();
  if (!query || /\s/.test(query)) {
    return false;
  }
  if (LOCALHOST_RE.test(query) || IPV4_RE.test(query)) {
    return true;
  }
  if (!DOMAIN_RE.test(query)) {
    return false;
  }
  const withoutScheme = query.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const hostEnd = withoutScheme.search(/[/?#]/);
  const host = (hostEnd === -1 ? withoutScheme : withoutScheme.slice(0, hostEnd)).split(":")[0];
  const tld = host.slice(host.lastIndexOf(".") + 1).toLowerCase();
  return !FILE_EXTENSIONS.has(tld);
}
function toUrl(query) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(query) ? query : "https://" + query;
}
function queryBangs(widget) {
  return Array.from(
    widget.querySelectorAll(".search-bangs > input")
  ).map((input) => input.dataset.shortcut).filter(Boolean);
}
function hasBangPrefix(query, shortcuts) {
  return shortcuts.some(
    (shortcut) => query === shortcut || query.startsWith(shortcut + " ")
  );
}
function buildSearchUrl(widget, query) {
  const template = widget.dataset.defaultSearchUrl;
  if (!template) {
    return "https://duckduckgo.com/?q=" + encodeURIComponent(query);
  }
  return template.replace("!QUERY!", encodeURIComponent(query));
}
function navigate(widget, url, event) {
  const newTab = widget.dataset.newTab === "true";
  const target = widget.dataset.target || "_blank";
  const ctrl = Boolean(event && (event.ctrlKey || event.metaKey));
  const openInNewTab = newTab ? !ctrl : ctrl;
  if (!openInNewTab) {
    window.location.href = url;
    return;
  }
  const opened = window.open(url, target);
  if (opened) {
    opened.focus();
  } else {
    window.location.href = url;
  }
}
function cacheSuggestions(query, suggestions) {
  if (suggestionCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = suggestionCache.keys().next().value;
    suggestionCache.delete(oldestKey);
  }
  suggestionCache.set(query, suggestions);
}
function requestSuggestions(query, callback) {
  const cached = suggestionCache.get(query);
  if (cached) {
    callback(cached);
    return;
  }
  const callbackName = "__glanceSuggest" + ++jsonpCounter;
  const script = document.createElement("script");
  let settled = false;
  let timeoutId;
  const finish = (suggestions) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeoutId);
    script.remove();
    try {
      delete window[callbackName];
    } catch {
      window[callbackName] = void 0;
    }
    if (suggestions && suggestions.length > 0) {
      cacheSuggestions(query, suggestions);
    }
    callback(suggestions || []);
  };
  window[callbackName] = (payload) => {
    const suggestions = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1].filter((item) => typeof item === "string") : [];
    finish(suggestions);
  };
  timeoutId = setTimeout(() => finish([]), JSONP_TIMEOUT_MS);
  script.async = true;
  script.onerror = () => finish([]);
  script.src = SUGGEST_ENDPOINT + callbackName + "&q=" + encodeURIComponent(query);
  document.head.appendChild(script);
}
function setupSearchWidget(widget) {
  if (widget.dataset.gesEnhanced === "true") {
    return;
  }
  if (!widget.classList.contains("search")) {
    return;
  }
  const input = widget.querySelector(".search-input");
  if (!input) {
    return;
  }
  widget.dataset.gesEnhanced = "true";
  const widgetContainer = widget.closest(".widget");
  if (widgetContainer) {
    widgetContainer.style.position = "relative";
    widgetContainer.style.zIndex = "50";
  }
  const shortcuts = queryBangs(widget);
  const dropdown = document.createElement("div");
  dropdown.className = "ges-suggestions";
  dropdown.setAttribute("role", "listbox");
  dropdown.hidden = true;
  widget.appendChild(dropdown);
  let items = [];
  let rowElements = [];
  let selectedIndex = -1;
  let requestToken = 0;
  let debounceTimer = null;
  const setSelection = (index) => {
    selectedIndex = index;
    for (let i = 0; i < rowElements.length; i++) {
      rowElements[i].setAttribute(
        "aria-selected",
        i === selectedIndex ? "true" : "false"
      );
    }
    if (selectedIndex >= 0 && rowElements[selectedIndex]) {
      rowElements[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  };
  const close = () => {
    dropdown.hidden = true;
    setSelection(-1);
    input.setAttribute("aria-expanded", "false");
  };
  const render = () => {
    dropdown.textContent = "";
    rowElements = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = document.createElement("div");
      row.className = "ges-suggestion";
      row.dataset.kind = item.kind;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");
      const icon = document.createElement("span");
      icon.className = "ges-icon";
      icon.innerHTML = item.kind === "url" ? ICON_GLOBE : ICON_SEARCH;
      const label = document.createElement("span");
      label.className = "ges-label";
      label.textContent = item.label;
      row.append(icon, label);
      if (item.hint) {
        const hint = document.createElement("span");
        hint.className = "ges-hint";
        hint.textContent = item.hint;
        row.append(hint);
      }
      row.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        choose(i, event);
      });
      dropdown.appendChild(row);
      rowElements.push(row);
    }
    dropdown.hidden = items.length === 0;
    input.setAttribute("aria-expanded", String(items.length > 0));
    setSelection(-1);
  };
  const choose = (index, event) => {
    const item = items[index];
    if (!item) {
      return;
    }
    close();
    if (item.kind === "url") {
      navigate(widget, item.url, event);
      return;
    }
    navigate(widget, buildSearchUrl(widget, item.query), event);
  };
  const buildItems = (query, suggestions) => {
    const built = [];
    if (config.directUrls && looksLikeUrl(query)) {
      built.push({
        kind: "url",
        label: query,
        url: toUrl(query),
        hint: "Open"
      });
      built.push({
        kind: "search",
        label: "Search for \u201C" + query + "\u201D",
        query,
        hint: "Search"
      });
    }
    for (const suggestion of suggestions) {
      if (suggestion.toLowerCase() === query.toLowerCase()) {
        continue;
      }
      built.push({
        kind: "search",
        label: suggestion,
        query: suggestion
      });
    }
    return built.slice(0, maxSuggestions + 2);
  };
  const refresh = () => {
    const query = input.value.trim();
    const token = ++requestToken;
    clearTimeout(debounceTimer);
    if (query.length < 2 || hasBangPrefix(query, shortcuts)) {
      items = [];
      close();
      return;
    }
    if (config.directUrls && looksLikeUrl(query)) {
      items = buildItems(query, []);
      render();
      return;
    }
    if (!config.suggestions) {
      items = [];
      close();
      return;
    }
    debounceTimer = setTimeout(() => {
      requestSuggestions(query, (suggestions) => {
        if (token !== requestToken) {
          return;
        }
        if (input.value.trim() !== query) {
          return;
        }
        items = buildItems(query, suggestions);
        render();
      });
    }, DEBOUNCE_MS);
  };
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.addEventListener("input", refresh);
  input.addEventListener("blur", () => {
    close();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!dropdown.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      if (dropdown.hidden || items.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setSelection((selectedIndex + 1) % items.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (dropdown.hidden || items.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setSelection(
        selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1
      );
      return;
    }
    if (event.key === "Enter") {
      if (!dropdown.hidden && selectedIndex >= 0) {
        event.preventDefault();
        event.stopPropagation();
        choose(selectedIndex, event);
        return;
      }
      const query = input.value.trim();
      if (config.directUrls && looksLikeUrl(query) && !hasBangPrefix(query, shortcuts)) {
        event.preventDefault();
        event.stopPropagation();
        close();
        navigate(widget, toUrl(query), event);
        return;
      }
      close();
    }
  });
}
function scanForSearchWidgets() {
  const widgets = document.querySelectorAll(".search");
  for (const widget of widgets) {
    setupSearchWidget(widget);
  }
}
function injectStyles() {
  if (document.getElementById("ges-search-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "ges-search-styles";
  style.textContent = `
            .ges-suggestions {
                position: absolute;
                z-index: 100;
                top: calc(100% + 0.5rem);
                left: 0;
                right: 0;
                padding: 0.4rem;
                background: var(--color-widget-background);
                border: 1px solid var(--color-widget-content-border);
                border-radius: var(--border-radius);
                box-shadow: 0 0.8rem 2.4rem rgba(0, 0, 0, 0.45);
                max-height: 40rem;
                overflow-y: auto;
            }

            .ges-suggestion {
                display: flex;
                align-items: center;
                gap: 0.9rem;
                padding: 0.8rem 1rem;
                border-radius: calc(var(--border-radius) - 1px);
                cursor: pointer;
                color: var(--color-text-base);
                font-size: var(--font-size-base);
                line-height: 1.3;
                text-align: left;
            }

            .ges-suggestion:hover,
            .ges-suggestion[aria-selected="true"] {
                background: var(--color-widget-background-highlight);
                color: var(--color-text-highlight);
            }

            .ges-suggestion .ges-icon {
                display: flex;
                flex: none;
                width: 1.6rem;
                height: 1.6rem;
                stroke: var(--color-text-subdue);
            }

            .ges-suggestion[data-kind="url"] .ges-icon {
                stroke: var(--color-primary);
            }

            .ges-suggestion .ges-icon svg {
                width: 100%;
                height: 100%;
                stroke: inherit;
            }

            .ges-suggestion .ges-label {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .ges-suggestion .ges-hint {
                flex: none;
                color: var(--color-text-subdue);
                font-size: var(--font-size-h6);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
        `;
  document.head.appendChild(style);
}
function start() {
  injectStyles();
  const observer = new MutationObserver(() => scanForSearchWidgets());
  observer.observe(document.body, { childList: true, subtree: true });
  scanForSearchWidgets();
}
function setup(userConfig = {}) {
  if (initialized) {
    return;
  }
  initialized = true;
  config = Object.assign(
    {
      suggestions: true,
      maxSuggestions: 8,
      directUrls: true
    },
    userConfig
  );
  maxSuggestions = Math.min(
    15,
    Math.max(1, Number(config.maxSuggestions) || 8)
  );
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
var search_enhanced_default = setup;
export {
  search_enhanced_default as default,
  version
};
