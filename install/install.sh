#!/bin/sh
# Installs the Glance plugin manager and updater.
# Usage: sh install.sh [assets-dir] [ref]

set -eu

ASSETS="${1:-${GLANCE_ASSETS:-assets}}"
REF="${2:-${GLANCE_PLUGINS_REF:-v2.1.0}}"
RAW="https://raw.githubusercontent.com/rwendell/glance-plugins/$REF"
RELEASE="https://github.com/rwendell/glance-plugins/releases/download/$REF"
TARGET_DIR="$ASSETS/.plugins/plugin-manager"
MANAGER="$TARGET_DIR/plugin-manager.js"
UPDATER="$TARGET_DIR/glance-plugins"

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

case "$(uname -s)" in
    Linux) OS=linux ;;
    Darwin) OS=darwin ;;
    *)
        echo "Unsupported OS: $(uname -s)" >&2
        exit 1
        ;;
esac

case "$(uname -m)" in
    x86_64|amd64) ARCH=amd64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    *)
        echo "Unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
esac

mkdir -p "$TARGET_DIR"

echo "Downloading plugin-manager ($REF)..."
download "$RAW/plugins/plugin-manager/plugin-manager.js" "$MANAGER"

echo "Downloading updater ($REF)..."
download "$RELEASE/glance-plugins-$OS-$ARCH" "$UPDATER"
chmod +x "$UPDATER"

if [ ! -f "$ASSETS/plugins.jsonc" ]; then
    printf '{\n  "plugins": []\n}\n' > "$ASSETS/plugins.jsonc"
    echo "Created $ASSETS/plugins.jsonc"
fi

printf '\nPlugin manager installed to %s\n' "$MANAGER"
printf 'Updater installed to %s\n\n' "$UPDATER"
printf 'Add this to glance.yml:\n\n'
printf 'document:\n  head: |\n    <script src="/assets/.plugins/plugin-manager/plugin-manager.js"></script>\n'
printf '\nRun the updater after editing plugins.jsonc:\n\n'
printf '  %s update\n' "$UPDATER"
