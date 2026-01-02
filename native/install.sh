#!/bin/bash
set -e

HOST_NAME="io.github.samveen.webauthnlinux"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_HOST_PATH="$SCRIPT_DIR/webauthnlinux_host.py"
BIN_DIR="$HOME/.local/bin"
TARGET_HOST_PATH="$BIN_DIR/webauthnlinux_host.py"
MANIFEST_PATH="$SCRIPT_DIR/webauthnlinux_host.json"

# Default values
FIREFOX_ID="webauthnlinux@samveen.github.io"
CHROME_ID=""
DO_FIREFOX=false
DO_CHROME=false

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --firefox           Install for Firefox"
    echo "  --chrome <ID>       Install for Chrome/Chromium with the specified Extension ID"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --firefox"
    echo "  $0 --chrome aabbccddeeff..."
    exit 1
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --firefox) DO_FIREFOX=true ;;
        --chrome) CHROME_ID="$2"; DO_CHROME=true; shift ;;
        --help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

# Interactively ask if no flags provided
if [ "$DO_FIREFOX" = false ] && [ "$DO_CHROME" = false ]; then
    echo "No browser targets specified."
    read -p "Install for Firefox? (y/n): " resp
    if [[ "$resp" =~ ^[Yy]$ ]]; then DO_FIREFOX=true; fi

    read -p "Install for Chrome/Chromium? (y/n): " resp
    if [[ "$resp" =~ ^[Yy]$ ]]; then
        read -p "Enter Chrome Extension ID: " CHROME_ID
        if [ -n "$CHROME_ID" ]; then DO_CHROME=true; fi
    fi
fi

[[ "$DO_FIREFOX" == true ]] && [[ "$DO_CHROME" == true ]] && { echo "Only one browser install can be done at a time"; exit 2; }
[[ "$DO_FIREFOX" = false ]] && [[ "$DO_CHROME" = false ]] && { echo "No browsers selected. Exiting."; exit 0; }

echo "Installing Native Messaging Host for WebAuthnLinux..."

# Install host script to ~/.local/bin
install -v -D -m 755 "$SOURCE_HOST_PATH" "$TARGET_HOST_PATH"

# Create Manifest
(
cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "WebAuthnLinux Native Host for Fingerprint Integration",
  "path": "$TARGET_HOST_PATH",
  "type": "stdio",
  "allowed_extensions": [
    "$FIREFOX_ID"
EOF

if [ "$DO_CHROME" = true ] && [ -n "$CHROME_ID" ]; then
    cat <<EOF
  ],
  "allowed_origins": [
    "chrome-extension://$CHROME_ID/"
EOF
fi

cat <<EOF
  ]
}
EOF
) > "$MANIFEST_PATH"

# Directories to install to
DIRS=()
if [ "$DO_FIREFOX" = true ]; then
    DIRS+=("$HOME/.mozilla/native-messaging-hosts")
fi
if [ "$DO_CHROME" = true ]; then
    DIRS+=("$HOME/.config/google-chrome/NativeMessagingHosts")
    DIRS+=("$HOME/.config/chromium/NativeMessagingHosts")
fi

for HOST_DIR in "${DIRS[@]}"; do
    if [ -d "$(dirname "$HOST_DIR")" ]; then
        mkdir -p "$HOST_DIR"
        mv -f "$MANIFEST_PATH" "$HOST_DIR/$HOST_NAME.json"
        echo "Registered manifest at: $HOST_DIR/$HOST_NAME.json"
    else
        echo "Skipping non-existent browser config directory: $(dirname "$HOST_DIR")"
    fi
done

echo "Done."
