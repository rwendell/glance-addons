#!/bin/sh
# Installs the Glance plugin manager only.
# Usage: sh install.sh [assets-dir] [ref]

set -eu

ASSETS="${1:-${GLANCE_ASSETS:-assets}}"
REF="${2:-${GLANCE_PLUGINS_REF:-v2.0.0}}"
BASE="https://raw.githubusercontent.com/rwendell/glance-plugins/$REF"
TARGET_DIR="$ASSETS/.plugins/plugin-manager"
TARGET="$TARGET_DIR/plugin-manager.js"

mkdir -p "$TARGET_DIR"

echo "Downloading plugin-manager ($REF)..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$BASE/plugins/plugin-manager/plugin-manager.js" -o "$TARGET"
elif command -v wget >/dev/null 2>&1; then
    wget -qO "$TARGET" "$BASE/plugins/plugin-manager/plugin-manager.js"
else
    echo "curl or wget is required." >&2
    exit 1
fi

if [ ! -f "$ASSETS/plugins.jsonc" ]; then
    printf '{\n  "plugins": []\n}\n' > "$ASSETS/plugins.jsonc"
    echo "Created $ASSETS/plugins.jsonc"
fi

if [ ! -f "$ASSETS/plugin-lock.json" ]; then
    printf '{\n  "version": 1,\n  "plugins": {}\n}\n' > "$ASSETS/plugin-lock.json"
    echo "Created $ASSETS/plugin-lock.json"
fi

printf '\nPlugin manager installed to %s\n\n' "$TARGET"
printf 'Add this to glance.yml:\n\n'
printf 'document:\n  head: |\n    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>\n'
