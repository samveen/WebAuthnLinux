#!/bin/bash
set -e

HOST_NAME="io.github.samveen.webauthnlinux"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_HOST_PATH="$SCRIPT_DIR/webauthnlinux_host.py"
BIN_DIR="$HOME/.local/bin"
TARGET_HOST_PATH="$BIN_DIR/webauthnlinux_host.py"
MANIFEST_PATH="$SCRIPT_DIR/webauthnlinux_host.json"

FIREFOX_ID="webauthnlinux@samveen.github.io"
CHROME_ID=""
DO_FIREFOX=false
DO_CHROME=false
DO_FLATPAK=false

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --firefox           Install for Firefox (XDG + legacy + Flatpak)"
    echo "  --chrome <ID>       Install for Chrome/Chromium with the specified Extension ID"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --firefox"
    echo "  $0 --chrome aabbccddeeff..."
    exit 1
}

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --firefox) DO_FIREFOX=true;;
        --chrome) CHROME_ID="$2"; DO_CHROME=true; shift ;;
        --help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

if [ "$DO_FIREFOX" = false ] && [ "$DO_CHROME" = false ]; then
    echo "No browser targets specified."
    read -p "Install for Firefox (native + Flatpak)? (y/n): " resp
    if [[ "$resp" =~ ^[Yy]$ ]]; then DO_FIREFOX=true; fi

    read -p "Install for Chrome/Chromium? (y/n): " resp
    if [[ "$resp" =~ ^[Yy]$ ]]; then
        read -p "Enter Chrome Extension ID: " CHROME_ID
        if [ -n "$CHROME_ID" ]; then DO_CHROME=true; fi
    fi
fi

[ "$DO_FIREFOX" = false ] && [ "$DO_CHROME" = false ] && {
    echo "No browsers selected. Exiting."
    exit 0
}

echo "Installing Native Messaging Host for WebAuthnLinux..."

install -v -D -m 755 "$SOURCE_HOST_PATH" "$TARGET_HOST_PATH"

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
DIRS=()

if [ "$DO_FIREFOX" = true ]; then

    DIRS+=("$HOME/.mozilla/native-messaging-hosts")
    XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
    DIRS+=("$XDG_CONFIG_HOME/mozilla/native-messaging-hosts")

    DIRS+=("$HOME/.var/app/org.mozilla.firefox/.mozilla/native-messaging-hosts")
fi

if [ "$DO_CHROME" = true ]; then
    DIRS+=("$HOME/.config/google-chrome/NativeMessagingHosts")
    DIRS+=("$HOME/.config/chromium/NativeMessagingHosts")
fi
# Following open bug https://bugzilla.mozilla.org/show_bug.cgi?id=2005167 firefox does not check the new XDG paths it uses for new installations thus i opted for creation in the previous ~/.mozilla folder instead since that still works.
# I did it using the below
for HOST_DIR in "${DIRS[@]}"; do
    mkdir -p "$HOST_DIR"
    cp "$MANIFEST_PATH" "$HOST_DIR/$HOST_NAME.json"
    echo "Registered manifest at: $HOST_DIR/$HOST_NAME.json"
done

rm -f "$MANIFEST_PATH"

echo "Done."
