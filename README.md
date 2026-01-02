# WebAuthnLinux (WebDevAuthn Derivative)

> [!NOTE]
> This fork (**WebAuthnLinux**) extends the original tool with **Native Messaging support for Linux Fingerprint integration**.
> Current Version: **1.0.0-Alpha**

___

### Description

This project enables **Linux System Integration** for WebAuthn/FIDO2. It features a Python-based Native Messaging Host that bridges the gap between the browser and the Linux system's biometric services (via `fprintd`).

This allows the extension to leverage your laptop's built-in fingerprint reader for user verification events, bypassing the need for external hardware or specific web services.

### Key Features

- **Linux Fingerprint Integration**: Use `fprintd` for biometric authentication directly in the browser.
- **Native Messaging Support**: Secure communication between the extension and the local system.
- **Multi-Browser Compatibility**: Installation script supports **Chrome**, **Chromium**, and **Firefox**.
- **Manifest V3**: Modern extension architecture for improved security and performance.
- **Dynamic Security**: Uses a unique, dynamically generated 256-bit master key and unique installation salts (no hardcoded secrets).
- **Hardware Agnostic**: Designed to bridge system biometrics for development, even on systems where the browser doesn't natively expose the fingerprint reader as a "platform" authenticator.

### Quick Setup

1. **System Dependencies**: Ensure `fprintd` and `python3` are installed and configured.
2. **Setup Extension**: Sideload the `extension/` folder in your browser (`chrome://extensions` for Chrome/Chromium).
3. **Install Native Host**:
   ```bash
   cd native
   ./install.sh [YOUR_CHROME_EXTENSION_ID]
   ```

For detailed, browser-specific instructions, see [LINUX_SETUP.md](LINUX_SETUP.md).

### Project Structure

- **`extension/`**: The Web Extension source code (Manifest V3). Includes logic for triggering native messaging and handling biometric responses.
- **`native/`**: Python-based Native Messaging Host (`webauthnlinux_host.py`) and multi-browser installer (`install.sh`).

___

### Contact & Hosting

This derivative work is hosted at [https://github.com/samveen/WebAuthnLinux](https://github.com/samveen/WebAuthnLinux)

The original work can be found by navigating to this fork's parent.

Modified by [Samveen](https://github.com/samveen), largely thanks to [AntiGravity](https://antigravity.google)

The Derivative Work is Copyright (c) 2026 Onwards, Projects by Samveen.

The Copyright of all unmodified work remains Copyright (c) The Original Authors.

___

# **ORIGINAL CONTENT**

# WebDevAuthn
A tool to test &amp; analyze FIDO2/WebAuthn requests and responses

 - WebDevAuthn Web Tool: https://gramthanos.github.io/WebDevAuthn/
 - Chrome Extension: https://chrome.google.com/webstore/detail/webdevauthn/aofdjdfdpmfeohecddhgdjfnigggddpd
 - Firefox Extension: https://addons.mozilla.org/firefox/addon/webdevauthn/

___

### Description

WebDevAuthn is a web tool for testing and analyzing [FIDO2/WebAuthn](https://en.wikipedia.org/wiki/WebAuthn) requests and responses. The web application can work as a playground, letting developers experiment and understand the WebAuthn internals while also allowing the testing and experimentation of FIDO2 authenticator devices. Furthermore, developers may use this tool's injector (embedded code or an extension) to hijack WebAuthn calls and analyse them. The tool also features an advanced virtual authenticator that can emulate WebAuthn responses.

This repository is part of the research conducted for the papers:
- A web tool for analyzing FIDO2/WebAuthn Requests and Responses [https://doi.org/10.1145/3465481.3469209](https://doi.org/10.1145/3465481.3469209)
- Blind software-assisted conformance and security assessment of FIDO2/WebAuthn implementations [https://doi.org/10.22667/JOWUA.2022.06.30.096](https://doi.org/10.22667/JOWUA.2022.06.30.096)

Analyser Features:
- Capture WebAuthn requests
- Analyse WebAuthn options (show info, warnings & errors)
- Unpack/Decode WebAuthn authenticator responses
- Virtual Authenticator Device (for custom responses)

Virtual Authenticator Device:
- OS independent
- Supports packed attestation
- Supports wrapped keys to credentials ID
- Access to the private key of the generated credentials
- Testing mode to assess implementations
- Multiple supported algorithms

___


### Contact me

Please feel free to contact me to leave me your feedback or to express your thoughts.

You can [open an issue](https://github.com/GramThanos/WebDevAuthn/issues) or [send me a mail](mailto:gramthanos@gmail.com)

___


### About

This web application was developed as part of my thesis for the postgraduate programme "Digital Systems Security" and research conducted as part of the [Systems Security Laboratory](https://laboratories.ds.unipi.gr/ssl/)

[University of Piraeus](https://www.unipi.gr/), [Department of Digital Systems](https://www.ds.unipi.gr/), Digital Systems Security

Copyright (c) 2021-2025 Grammatopoulos Athanasios-Vasileios

___

[![GramThanos](https://avatars2.githubusercontent.com/u/14858959?s=42&v=4)](https://github.com/GramThanos)
