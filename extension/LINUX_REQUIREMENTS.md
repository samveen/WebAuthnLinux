# WebAuthnLinux Extension - Linux Requirements

To use the WebAuthnLinux extension with local fingerprint storage (Platform Authenticator) on Linux, you must satisfy the following requirements:

## 1. System Requirements
- **WebAuthn/FIDO2 Hardware Support**: A machine with a supported fingerprint reader or a connected FIDO2 security key.
- **fido2-tools / libfido2**: Ensure `libfido2` is installed.
  - Debian/Ubuntu: `sudo apt install libfido2-1 fido2-tools`
  - Fedora: `sudo dnf install libfido2`
  - Arch: `sudo pacman -S libfido2`
- **PCSCD**: Smart card daemon should be running (for some token types).
  - `sudo apt install pcscd`
  - `sudo systemctl start pcscd`

## 2. Browser Configuration (Firefox)
Firefox on Linux might not enable Universal 2nd Factor (U2F) or WebAuthn by default in some configurations, especially for Platform Authenticators.

1. Open `about:config`
2. Search for `security.webauth.u2f` and ensure it is **true**.
3. Search for `security.webauth.webauthn` and ensure it is **true**.
4. (Importantly for local/platform) Search for `security.webauth.webauthn_enable_usbtoken` and ensure it is **true**.
5. Restart Firefox if changes were made.

## 3. udev Rules
To allow the browser (running as a user) to access the FIDO device (or fingerprint reader), you need appropriate udev rules.

1. **Verify rules**: storage `/etc/udev/rules.d/70-u2f.rules` typically handles this.
2. If missing, install `libu2f-udev` package:
   - `sudo apt install libu2f-udev`
3. Alternatively, copy the rules from Yubico's repository:
   https://github.com/Yubico/libu2f-host/blob/master/70-u2f.rules

## 4. Testing
- Go to https://webauthn.io/ to test basic WebAuthn support in your browser before using the extension.
- The extension uses `authenticatorAttachment: "platform"`. Verify your OS/Browser supports this. On some minimal Linux setups, "platform" authenticators (like Windows Hello or TouchID) are not emulated by the OS for the browser. You may need to use a roaming USB authenticator if the system fingerprint reader is not exposed via CTAP2/WebAuthn to the browser.
