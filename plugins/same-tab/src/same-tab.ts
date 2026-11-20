/*
 * Same Tab for Glance
 *
 * Glance renders most widget links with target="_blank". Removing that
 * attribute makes a normal click stay in the current tab. Ctrl/Cmd/Shift/Alt
 * clicks and middle clicks still open a new tab because the browser handles
 * those itself.
 */

export const version = "1.0.0";

const SELECTOR = 'a[target="_blank"]';

let initialized = false;
let scheduled = false;

function stripTargets(): void {
    scheduled = false;

    for (const link of document.querySelectorAll(SELECTOR)) {
        link.removeAttribute("target");
    }
}

function schedule(): void {
    if (scheduled) {
        return;
    }

    scheduled = true;
    queueMicrotask(stripTargets);
}

function setup(): void {
    if (initialized) {
        return;
    }

    initialized = true;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", stripTargets, {
            once: true,
        });
    } else {
        stripTargets();
    }

    const root = document.documentElement;

    if (root) {
        new MutationObserver(schedule).observe(root, {
            childList: true,
            subtree: true,
        });
    }
}

export default setup;
