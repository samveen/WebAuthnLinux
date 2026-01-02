# Linux Native Messaging Setup

This extension uses a native messaging host to communicate with the system's fingerprint reader. This allows you to use your laptop's built-in biometrics for WebAuthn/FIDO2 development.

## 1. Prerequisites

Ensure your system has the necessary dependencies installed for biometric support.

### Fingerprint Service (fprintd)
The native host use `fprintd` to verify your identity.
- **Install**:
  ```bash
  sudo apt install fprintd libpam-fprintd
  ```
- **Enroll Fingerprint**:
  Ensure you have at least one fingerprint enrolled.
  ```bash
  fprintd-enroll
  ```
- **Verify**:
  Run `fprintd-verify` in your terminal to ensure it works correctly.

---

## 2. Browser Installation

### For Google Chrome / Chromium (Recommended)
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer Mode** (top right toggle).
3. Click **Load unpacked** and select the `extension/` folder from this repository.
4. **Important**: Note the **Extension ID** generated (e.g., `aofdjdfdpmfeohecddhgdjfnigggddpd`). You will need this for the next step.

### For Firefox
1. Open Firefox and navigate to `about:debugging`.
2. Click on **This Firefox**.
3. Click **Load Temporary Add-on** and select `manifest.json` from the `extension/` folder.
   *(Note: Temporary add-ons are removed when Firefox restarts. For permanent use, the Extension ID `webauthnlinux@samveen.github.io` is pre-registered in the installer.)*

---

### Installation
Navigate to the `native/` directory and run the installation script with your preferred options.

#### For Google Chrome / Chromium
Pass your Extension ID to the script:
```bash
cd native
./install.sh --chrome <YOUR_EXTENSION_ID>
```

#### For Firefox
```bash
cd native
./install.sh --firefox
```

#### Interactive Mode
If you run the script without any arguments, it will interactively ask which browsers to install for:
```bash
./install.sh
```

### What does this script do?
- Creates a manifest file `io.github.samveen.webauthnlinux.json`.
- Copies the host script to `~/.local/bin/webauthnlinux_host.py`.
- Automatically populates the manifest with the correct path to the new location.
- Registers it in `~/.mozilla/native-messaging-hosts/` (Firefox).
- Registers it in `~/.config/google-chrome/NativeMessagingHosts/` (Chrome).
- Registers it in `~/.config/chromium/NativeMessagingHosts/` (Chromium).
- Sets correct permissions for the Python script.

---

## 4. Verification

You can run the included check script to verify your environment:
```bash
./check_fingerprint.sh
```

### Testing the Extension
1. Go to a WebAuthn test page (e.g., [WebDevAuthn Web Tool](https://gramthanos.github.io/WebDevAuthn/)).
2. Open the **WebAuthnLinux** extension popup.
3. Click **Unlock with Fingerprint**.
4. You should see a prompt to swipe your finger on the reader (or a system notification/terminal output if you started the browser from a terminal).

---

## Troubleshooting

- **Native Host Errors**: Check the browser's background page console (Chrome: `chrome://extensions` -> background page link).
- **Chrome ID Mismatch**: If you reload the extension and the ID changes, you MUST re-run `install.sh` with the new ID.
- **Permissions**: Ensure `webauthnlinux_host.py` is executable. The `install.sh` script should handle this.
- **fprintd-verify**: If the script fails to verify, try running `fprintd-verify` manually in a terminal to see if your hardware is responding.
