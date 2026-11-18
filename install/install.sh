#!/bin/sh
# Installs the Glance plugin manager into the Glance config directory.
# Usage: sh install.sh [config-dir] [ref]
#
# The config dir defaults to ${XDG_CONFIG_HOME:-$HOME/.config}/glance.
# Set GLANCE_CONFIG to override it.

set -eu

CONFIG="${1:-${GLANCE_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/glance}}"
REF="${2:-${GLANCE_PLUGINS_REF:-main}}"
RAW="https://raw.githubusercontent.com/rwendell/glance-plugins/$REF"

mkdir -p "$CONFIG/assets"

CONFIG="$(cd "$CONFIG" && pwd)"
ASSETS="$CONFIG/assets"
PLUGINS="$CONFIG/plugins.json"
SERVED="$ASSETS/plugins.json"
TARGET="$ASSETS/plugin-manager.js"

download() {
    URL="$1"
    OUT="$2"

    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$URL" -o "$OUT"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$OUT" "$URL"
    else
        echo "curl or wget is required." >&2
        exit 1
    fi
}

echo "Downloading plugin-manager ($REF)..."
download "$RAW/plugins/plugin-manager/dist/plugin-manager.js" "$TARGET"

if [ ! -f "$PLUGINS" ]; then
    if [ -f "$SERVED" ] && [ ! -L "$SERVED" ]; then
        mv "$SERVED" "$PLUGINS"
        echo "Moved $SERVED to $PLUGINS"
    else
        printf '{\n  "plugins": []\n}\n' > "$PLUGINS"
        echo "Created $PLUGINS"
    fi
fi

if [ -L "$SERVED" ]; then
    if [ ! -e "$SERVED" ]; then
        ln -sfn "../plugins.json" "$SERVED"
        echo "Repaired $SERVED"
    fi
elif [ -e "$SERVED" ]; then
    echo "$SERVED is not a symlink; leaving it alone." >&2
else
    ln -s "../plugins.json" "$SERVED"
    echo "Linked $SERVED -> ../plugins.json"
fi

printf '\nPlugin manager installed to %s\n\n' "$TARGET"
printf 'Add this to glance.yml:\n\n'
printf 'server:\n  assets-path: %s\n\n' "$ASSETS"
printf 'document:\n  head: |\n    <script src="/assets/plugin-manager.js"></script>\n\n'
printf 'Edit %s to add plugins.\n' "$PLUGINS"
