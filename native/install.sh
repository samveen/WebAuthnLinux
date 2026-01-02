#!/bin/bash
set -e

HOST_NAME="io.github.samveen.webauthnlinux"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TARGET_HOST_PATH="$SCRIPT_DIR/webauthnlinux_host.py"
MANIFEST_PATH="$SCRIPT_DIR/webauthnlinux_host.json"

# Extension IDs
FIREFOX_ID="webauthnlinux@samveen.github.io"
CHROME_ID="$1"

if [ -z "$CHROME_ID" ]; then
    echo "Usage: $0 [CHROME_EXTENSION_ID]"
    echo "Tip: For sideloading, find the ID in chrome://extensions after loading the extension folder."
    echo "Tip: For official store version, use the ID from the store URL."
    read -p "Enter Chrome Extension ID (or press enter to skip Chrome/Chromium): " CHROME_ID
fi

echo "Installing Native Messaging Host for WebAuthnLinux..."

# Create Manifest
cat > "$MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "WebAuthnLinux Native Host for Fingerprint Integration",
  "path": "$TARGET_HOST_PATH",
  "type": "stdio",
  "allowed_extensions": [
    "$FIREFOX_ID"
  ],
  "allowed_origins": [
EOF

if [ -n "$CHROME_ID" ]; then
    echo "    \"chrome-extension://$CHROME_ID/\"" >> "$MANIFEST_PATH"
fi

cat >> "$MANIFEST_PATH" <<EOF
  ]
}
EOF

# Directories to install to
DIRS=(
    "$HOME/.mozilla/native-messaging-hosts"
    "$HOME/.config/google-chrome/NativeMessagingHosts"
    "$HOME/.config/chromium/NativeMessagingHosts"
)

for HOST_DIR in "${DIRS[@]}"; do
    if [ -d "$(dirname "$HOST_DIR")" ]; then
        mkdir -p "$HOST_DIR"
        cp "$MANIFEST_PATH" "$HOST_DIR/$HOST_NAME.json"
        echo "Registered at: $HOST_DIR/$HOST_NAME.json"
    fi
done

echo "Pointed to script: $TARGET_HOST_PATH"
chmod +x "$TARGET_HOST_PATH"
echo "Done."