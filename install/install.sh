#!/bin/sh
# Installs the Glance plugin manager.
# Usage: sh install.sh [assets-dir] [ref]

set -eu

ASSETS="${1:-${GLANCE_ASSETS:-assets}}"
REF="${2:-${GLANCE_PLUGINS_REF:-v4.0.0}}"
RAW="https://raw.githubusercontent.com/rwendell/glance-plugins/$REF"
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

mkdir -p "$ASSETS/plugins"

echo "Downloading plugin-manager ($REF)..."
download "$RAW/plugins/plugin-manager/plugin-manager.js" "$TARGET"

if [ ! -f "$ASSETS/plugins.json" ]; then
    printf '{\n  "plugins": []\n}\n' > "$ASSETS/plugins.json"
    echo "Created $ASSETS/plugins.json"
fi

printf '\nPlugin manager installed to %s\n\n' "$TARGET"
printf 'Add this to glance.yml:\n\n'
printf '%s\n' "document: { head: '<script src=\"/assets/plugin-manager.js\"></script>' }"
printf '\nEdit %s/plugins.json to add plugins.\n' "$ASSETS"
