#!/bin/bash
set -e

HOST_NAME="io.github.samveen.webauthnlinux"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_HOST_PATH="$SCRIPT_DIR/webauthnlinux_host.py"
BIN_DIR="$HOME/.local/bin"
TARGET_HOST_PATH="$BIN_DIR/webauthnlinux_host.py"
MANIFEST_PATH="$SCRIPT_DIR/webauthnlinux_host.json"
EXTENSION_DIR="$( cd "$SCRIPT_DIR/../extension" && pwd )"

# Default values
FIREFOX_ID="webauthnlinux@samveen.github.io"
CHROME_ID=""
DO_FIREFOX=false
DO_CHROME=false

display_path()
{
    local path="$1"
    echo "${path/#$HOME/\~}"
}

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --firefox           Install for Firefox"
    echo "  --chrome [ID]       Install for Chrome/Chromium (asks for ID if omitted)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --firefox"
    echo "  $0 --chrome"
    echo "  $0 --chrome aabbccddeeff..."
    exit 1
}

prepare_firefox_extension()
{
    echo ""
    echo "Preparing Firefox-family extension (i.e. Firefox, Librewolf etc)..."
    echo "WARNING: Native Messaging support depends on the browser package exposing user native messaging hosts."
    echo "Snap and Flatpak installations may require additional configuration or not work at all."

echo ""
    if [ ! -f "$EXTENSION_DIR/manifest.firefox.json" ]; then
        echo "ERROR: manifest.firefox.json not found:"
        echo "  $EXTENSION_DIR"
        exit 1
    fi

    cp -f "$EXTENSION_DIR/manifest.firefox.json" \
          "$EXTENSION_DIR/manifest.json"

    echo "Created Firefox/Librewolf manifest:"
    echo "  $EXTENSION_DIR/manifest.json"
    echo "NOTE: Do not run Firefox and Chrome installs at the same time."
    echo "Install one after the other."

    echo ""
    echo "Firefox/Librewolf Temporary Install setup:"
    echo "1. Open Firefox"
    echo "2. Go to:"
    echo "     about:debugging"
    echo "3. Select:"
    echo "     This Firefox"
    echo "4. Click:"
    echo "     Load Temporary Add-on"
    echo "5. Select:"
    echo "     $EXTENSION_DIR/manifest.json"
    echo ""

    echo "Firefox/LibreWolf Permanent Install setup:"
    echo ""
    echo "Recommended installation:"
    echo "Permanent installation depends on Firefox extension signing requirements."
    echo "Unsigned XPI files often work in LibreWolf, Firefox Developer Edition, Firefox Nightly,"
    echo "and less likely for Firefox installations configured to allow unsigned extensions (Tested: Kubuntu Firefox works)."
    echo "1. Create/install the provided WebAuthnLinux XPI package."
    echo "2. Open Firefox/LibreWolf."
    echo "3. Go to:"
    echo "     about:config"
    echo "Set xpinstall.signatures.required = false"
    echo "3. Go to:"
    echo "     about:addons"
    echo "4. Select (from top right gear icon):"
    echo "     Install Add-on From File"
    echo "5. Select:"
    echo "     /WebAuthnLinux/webauthnlinux.xpi"
    echo ""
}

prepare_chrome_extension()
{
    echo ""
    echo "Preparing Chrome-family exension (i.e. Chrome, Chromium, Brave, Edge, Vivaldi, Opera)..."
    echo "WARNING: Native Messaging support depends on the browser package exposing user native messaging hosts."
    echo "Snap and Flatpak installations may require additional configuration or not work at all."
    echo ""

    if [ ! -f "$EXTENSION_DIR/manifest.chrome.json" ]; then
        echo "ERROR: manifest.chrome.json not found:"
        echo "  $EXTENSION_DIR"
        exit 1
    fi

    cp -f "$EXTENSION_DIR/manifest.chrome.json" \
          "$EXTENSION_DIR/manifest.json"

    echo "Created Chrome manifest:"
    echo "  $EXTENSION_DIR/manifest.json"
    echo "NOTE: Do not run Firefox and Chrome installs at the same time."
    echo "Install one after the other."

    echo ""
    echo "Chromium-family setup:"
    echo "1. Open Chromium-family browser"
    echo "2. Go to:"
    echo "     chrome://extensions"
    echo "3. Enable Developer mode"
    echo "4. Click 'Load unpacked'"
    echo "5. Select:"
    echo "     $EXTENSION_DIR"
    echo "6. Copy the Extension ID shown"
    echo ""

    echo "The Chromium-family native messaging manifest requires the extension ID."
    echo "This ID comes from the browser extension you just loaded."
    echo ""
    read -p "Paste the Chrome/Chromium-family Extension ID: " CHROME_ID

    if [ -z "$CHROME_ID" ]; then
        echo "No extension ID supplied. Exiting."
        exit 1
    fi
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --firefox) DO_FIREFOX=true ;;

        --chrome)
            DO_CHROME=true

            if [ -n "$2" ] && [[ "$2" != --* ]]; then
                CHROME_ID="$2"
                shift
            fi
            ;;

        --help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
    shift
done

# ------------------------------------------------------------
# Interactive installer wizard
# ------------------------------------------------------------
if [ "$DO_FIREFOX" = false ] && [ "$DO_CHROME" = false ]; then

    echo ""
    echo "=========================================="
    echo "       WebAuthnLinux Installer"
    echo "=========================================="
    echo ""
    echo "Select browser family:"
    echo ""
    echo "  1) Firefox family"
    echo "     Firefox, LibreWolf, Firefox Developer Edition, Nightly"
    echo ""
    echo "  2) Chromium family"
    echo "     Chrome, Chromium, Brave, Edge, Vivaldi, Opera"
    echo ""

    while true; do
        read -p "Selection [1/2]: " CHOICE

        case "$CHOICE" in
            1)
                DO_FIREFOX=true
                break
                ;;
            2)
                DO_CHROME=true
                break
                ;;
            *)
                echo "Please enter 1 or 2."
                ;;
        esac
    done

echo ""
echo "CRITICALLY IMPORTANT"
echo "--------------------"
echo ""
echo "This installer currently supports the GitHub branch:"
echo ""
echo "    webauthn-credential-manager"
echo ""
echo "Do NOT install from the default 'main' branch."
echo "Installing the wrong branch will leave incompatible"
echo "extension files, manifests, or native messaging hosts"
echo "on your system, producing extension errors when you later"
echo "install the correct branch."
echo ""
echo "If you previously installed the wrong branch:"
echo "  1. Remove the existing WebAuthnLinux extension (Search your entire drive for files)."
echo "  2. Remove the native messaging host (Search your entire drive for files)."
echo "  3. Clone the correct branch again."
echo ""

    if [ -d "$SCRIPT_DIR/../.git" ]; then
        CURRENT_BRANCH=$(git -C "$SCRIPT_DIR/.." branch --show-current 2>/dev/null)

        if [ -n "$CURRENT_BRANCH" ]; then
            echo ""
            echo "Git branch detected:"
            echo "    $CURRENT_BRANCH"

            if [ "$CURRENT_BRANCH" != "webauthn-credential-manager" ]; then
                echo ""
                echo "WARNING: This is not the tested branch."
            fi
            echo ""
        fi
    fi

    read -p "Continue? [Y/n] " RESP

    if [[ "$RESP" =~ ^[Nn]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

[[ "$DO_FIREFOX" == true ]] && [[ "$DO_CHROME" == true ]] && { echo "Only one browser install can be done at a time"; exit 2; }
[[ "$DO_FIREFOX" = false ]] && [[ "$DO_CHROME" = false ]] && { echo "No browsers selected. Exiting."; exit 0; }

# Interactively ask if no flags provided
if [ "$DO_FIREFOX" = true ]; then
    prepare_firefox_extension
fi

if [ "$DO_CHROME" = true ] && [ -z "$CHROME_ID" ]; then
    prepare_chrome_extension
fi

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

    echo "Using Firefox/Librewolf native messaging directory:"
    echo -n "  "
    display_path "$HOME/.mozilla/native-messaging-hosts"
    echo

    mkdir -p "$HOME/.mozilla/native-messaging-hosts"
    DIRS+=("$HOME/.mozilla/native-messaging-hosts")

fi

if [ "$DO_FIREFOX" = true ]; then
    echo ""
    echo "Firefox/Librewolf native messaging install targets:"

    for DIR in "${DIRS[@]}"; do
        echo "  $(display_path "$DIR")"
    done

    echo ""
fi

if [ "$DO_CHROME" = true ]; then

    CHROMIUM_BROWSER_DIRS=(
        "$HOME/.config/google-chrome/NativeMessagingHosts|Google Chrome"
        "$HOME/.config/chromium/NativeMessagingHosts|Chromium"
        "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts|Brave"
        "$HOME/.config/microsoft-edge/NativeMessagingHosts|Microsoft Edge"
        "$HOME/.config/vivaldi/NativeMessagingHosts|Vivaldi"
        "$HOME/.config/opera/NativeMessagingHosts|Opera"
    )

    echo ""
    echo "Searching for Chromium-family browsers..."
    echo ""

    FOUND_CHROMIUM=false

    for ENTRY in "${CHROMIUM_BROWSER_DIRS[@]}"; do

        DIR="${ENTRY%%|*}"
        BROWSER="${ENTRY##*|}"

        if [ -d "$(dirname "$DIR")" ]; then

            FOUND_CHROMIUM=true

            echo "Found $BROWSER:"
            echo "  $(display_path "$DIR")"
            echo ""
            echo "Is the supplied WebAuthnLinux Extension ID for this browser?"
            echo "If not, skip to the next browser."
            echo ""

            read -p "Install WebAuthnLinux native messaging host here? [Y/n] " RESP

            if [[ ! "$RESP" =~ ^[Nn]$ ]]; then

                mkdir -p "$DIR"
                DIRS+=("$DIR")

                echo "Selected."
                break
            else
                echo "Skipped."
            fi
            echo ""
        fi
    done

    if [ "$FOUND_CHROMIUM" = false ]; then

        echo "No installed Chromium-family browsers detected."
        echo ""
        echo "Expected locations include:"
        echo "  ~/.config/google-chrome"
        echo "  ~/.config/chromium"
        echo "  ~/.config/BraveSoftware/Brave-Browser"
        echo "  ~/.config/microsoft-edge"
        echo "  ~/.config/vivaldi"
        echo "  ~/.config/opera"
        echo ""

    fi
fi

if [ "$DO_CHROME" = true ]; then
    echo ""
    echo "Chromium-family native messaging install targets:"

    if [ "${#DIRS[@]}" -eq 0 ]; then
        echo "  None selected"
    else
        for DIR in "${DIRS[@]}"; do
            echo "  $(display_path "$DIR")"
        done
    fi

    echo ""
fi

for HOST_DIR in "${DIRS[@]}"; do
    mkdir -p "$HOST_DIR"
    cp -f "$MANIFEST_PATH" "$HOST_DIR/$HOST_NAME.json"
    echo "Installed manifest: $HOST_DIR/$HOST_NAME.json"
done

echo ""
echo "Installation complete."
echo "Native host:"
echo "  $TARGET_HOST_PATH"

if [ -f "$TARGET_HOST_PATH" ]; then
    echo "✓ Native host installed"

    echo ""
    echo "Next steps:"
    if [ "$DO_FIREFOX" = true ]; then
        echo ""
        echo "Firefox-family:"
        echo "  Install the WebAuthnLinux extension using the instructions above."
        echo "  Then restart Firefox/LibreWolf if required."
        echo "  Then test WebAuthn authentication. (try webauthn.io)"
    fi

    if [ "$DO_CHROME" = true ]; then

        if [ "${#DIRS[@]}" -gt 0 ]; then
            echo ""
            echo "Chromium-family:"
            echo "  The native host has been installed."
            echo "  Reload the extension once to reconnect."
            echo "  Then test WebAuthn authentication."
            echo ""
        else
            echo ""
            echo "Chromium-family:"
            echo "  No browser was selected."
            echo "  No native messaging host was installed."
            echo "  Run the installer again and select the correct browser."
            echo ""
        fi
    fi
else
    echo "✗ Native host missing"
fi

for HOST_DIR in "${DIRS[@]}"; do
if [ -f "$HOST_DIR/$HOST_NAME.json" ]; then
echo "✓ Manifest installed: $HOST_DIR/$HOST_NAME.json"
fi
done
