# Publishing Guide for WebAuthnLinux

This guide details the steps required to publish the **WebAuthnLinux** extension to the Chrome Web Store and the Mozilla Add-ons (AMO) store, following the 2026 standards.

---

## 1. Preparation

### Icons
Ensure you have the following icon sizes in the `extension/icons/` folder:
- `19x19` (Action icon)
- `48x48` (Extension management page)
- `128x128` (Store listing)

### Versioning
Update the `"version"` field in `extension/manifest.json` before every release (e.g., `1.0.0`, `1.0.1`). 
- **Important**: Mozilla requires the version to be a string of 1 to 4 numbers separated by dots (e.g., `0.1.2.3`). Letters and leading zeros are not allowed.

### Packaging
Use the provided `Makefile` to package the extension into a ZIP/XPI archive:
```bash
make build
```
This creates `WebAuthnLinux-Extension.xpi` in the root directory.

---

## 2. Chrome Web Store (Google)

### Developer Account
1.  Sign up at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2.  Pay the one-time developer registration fee.
3.  Enable Two-Factor Authentication (2FA).

### Submission Steps
1.  **Upload:** Click **"New Item"** and upload the `WebAuthnLinux-Extension.xpi` (rename to `.zip` if required).
2.  **Listing Details:**
    - Provide a concise description.
    - Upload at least one screenshot (1280x800 or 640x400).
    - Provide a link to your Privacy Policy.
3.  **Privacy & Permissions:**
    - **`nativeMessaging`**: Justify this as required for communicating with the local Linux host for biometric (fingerprint) authentication.
    - **`<all_urls>`**: Justify this as required to inject the WebAuthn polyfill into any website the user visits.
4.  **Review:** Chrome uses Manifest V3. Since this extension contains no remotely hosted code and uses service workers (standard for MV3), the review process typically takes 1-7 days.

---

## 3. Mozilla Add-ons (AMO)

### Developer Account
1.  Create an account at [addons.mozilla.org (AMO)](https://addons.mozilla.org/developers/).
2.  Agree to the Developer Agreement.

### Submission Steps
1.  **Upload:** Submit the `WebAuthnLinux-Extension.xpi` file.
2.  **Listing Details:** Fill in the name, summary, and description.
3.  **Source Code Disclosure (Crucial):**
    - Since 2025, Mozilla requires the submission of the full source code if the extension is obfuscated or uses a build process.
    - Even for non-obfuscated code, it is recommended to provide a link to the GitHub repository ([WebAuthnLinux](https://github.com/samveen/WebAuthnLinux)) or upload the source ZIP to ensure transparency.
4.  **Permission Justification:** Similar to Chrome, justify `nativeMessaging` and host permissions.
5.  **Signing:** Mozilla will digitally sign your extension. For self-distribution (outside the store), you can choose "On your own," but for the public store, choose "On this site."

4.  **Security Audit**: Mozilla's automated scanner checks for unsafe code patterns. Specifically:
    - Avoid using `innerHTML` with dynamic values; use `textContent` or `createElement`/`appendChild` instead.
    - Ensure all dependencies are included in the source package if choosing the "full source code" submission option.

---

## 4. Privacy Policy & Data Collection

Both stores require a Privacy Policy since the extension requests sensitive permissions (`nativeMessaging`, `storage`). 

### Mozilla Specific: Data Collection Permission
Mozilla requires a specific field in the manifest to declare fallback data collection behavior. Ensure `extension/manifest.json` includes:
```json
"browser_specific_settings": {
    "gecko": {
        "id": "webauthnlinux@samveen.github.io",
        "data_collection_permissions": {
            "required": ["none"],
            "optional": []
        }
    }
}
```
Setting `required` to `["none"]` indicates the extension does not collect any data.

### General Policy
Your policy should state:
1.  **Data Collection:** No personal data is collected or sent to external servers.
2.  **Native Messaging:** Used only to interact with the local `fprintd` service for user authentication.
3.  **Local Storage:** Used only to store the encrypted virtual credentials locally on the user's machine.

---

## 5. Summary Table

| Requirement | Chrome Web Store | Mozilla Add-ons (AMO) |
| :--- | :--- | :--- |
| **Manifest Version** | Manifest V3 (Mandatory) | Manifest V3 (Supported) / V2 |
| **Review Time** | ~1-7 days | ~1-24 hours (Automated/Manual) |
| **Fee** | One-time $5 USD | Free |
| **Source Disclosure** | Code must be reviewable | Mandatory for build/obfuscation |
| **Signing** | Handled by Google | Handled by Mozilla |
