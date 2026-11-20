// Generated from plugins/same-tab/src/same-tab.ts by tsdown. Do not edit.
// plugins/same-tab/src/same-tab.ts
const version = "1.0.0";
const SELECTOR = "a[target=\"_blank\"]";
let initialized = false;
let scheduled = false;
function stripTargets() {
	scheduled = false;
	for (const link of document.querySelectorAll(SELECTOR)) link.removeAttribute("target");
}
function schedule() {
	if (scheduled) return;
	scheduled = true;
	queueMicrotask(stripTargets);
}
function setup() {
	if (initialized) return;
	initialized = true;
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", stripTargets, { once: true });
	else stripTargets();
	const root = document.documentElement;
	if (root) new MutationObserver(schedule).observe(root, {
		childList: true,
		subtree: true
	});
}

export { setup as default, version };