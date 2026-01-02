/*
 *  WebAuthnLinux Extension Authenticator Logic
 *
 * Original: Grammatopoulos Athanasios Vasileios (GramThanos)
 * Modifications by Samveen
 */
const BUILD_VERSION = "1.0.0-Alpha";
console.log(`[Auth] Loaded WebAuthnLinux. Version: ${BUILD_VERSION}`);

// Polyfill
window.authnTools = window.authnTools || {};

const initAuthenticator = async () => {
    const authenticator = new window.AuthnDevice();
    // Override storage handler to use chrome.storage.local
    authenticator.handleStorage = function (data) {
        if (data) {
            // Save mode - return a promise or handle async
            return new Promise((resolve, reject) => {
                chrome.storage.local.set({ 'system_credentials': data }, () => {
                    console.log('Credentials saved to local storage');
                    resolve(data);
                });
            });
        } else {
            return this.storage;
        }
    };
    const result = await chrome.storage.local.get(['system_credentials', 'option@debugLogging', 'extension_salt', 'extension_ca_key']);

    // Manage extension salt
    if (result.extension_salt) {
        authenticator.masterkeysalt = window.authnTools.base64urlToUint8Array(result.extension_salt);
        console.log('[Auth] Loaded unique extension identity.');
    } else {
        console.log('[Auth] Generating new unique extension salt...');
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        authenticator.masterkeysalt = salt;
        await new Promise(r => chrome.storage.local.set({ 'extension_salt': window.authnTools.uint8ArrayToBase64url(salt) }, r));
    }

    // Manage extension CA key
    if (result.extension_ca_key) {
        authenticator.setCaPrivateKey(JSON.parse(result.extension_ca_key));
    } else {
        // Generate a new P-256 key for attestation
        console.log('[Auth] Generating unique CA key for this installation...');
        const keyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['sign']
        );
        const jwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
        authenticator.setCaPrivateKey(jwk);
        await new Promise(r => chrome.storage.local.set({ 'extension_ca_key': JSON.stringify(jwk) }, r));
    }

    // Set legacy salt fallback (The original bridge used 16 zeros by default in authenticator.js override)
    const legacySalt = new Uint8Array(16);
    // Legacy: authenticator.js:175 used new Uint8Array(16)
    authenticator.legacyMasterkeySalt = legacySalt.buffer;
    console.log('[Auth] Legacy salt fallback initialized (16 zeros).');

    if (result.system_credentials) authenticator.storage = result.system_credentials;
    authenticator.debugLogging = result['option@debugLogging'] === true;
    return authenticator;
};

const debugLog = (message, ...args) => {
    if (deviceInstance && deviceInstance.debugLogging) {
        console.log(message, ...args);
    }
};

// NATIVE MESSAGING INTEGRATION
// Instead of navigator.credentials, we talk to the native python host
const getMasterKeyFromNativeHost = async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Connecting to System Fingerprint Service...";
    console.log('[Auth] Connecting to Fingerprint Service: io.github.samveen.webauthnlinux');

    return new Promise((resolve, reject) => {
        try {
            // "webauthnlinux@samveen.github.io" must be allowed in the host manifest
            // Host name defined in install.sh is "io.github.samveen.webauthnlinux"
            const hostName = "io.github.samveen.webauthnlinux";

            // Send unlock command
            chrome.runtime.sendNativeMessage(hostName, { type: "unlock" }, (response) => {

                if (chrome.runtime.lastError) {
                    console.error('[Auth] Native Message Error:', chrome.runtime.lastError);
                    reject(new Error("Native Host Communication Failed: " + chrome.runtime.lastError.message));
                    return;
                }

                debugLog('[Auth] Native Response:', response);

                if (response && response.status === "success" && response.key) {
                    statusDiv.textContent = "Fingerprint Verified (Native).";
                    resolve("NativeSecure-" + response.key);
                } else {
                    const msg = response ? response.message : "Unknown Error";
                    reject(new Error("Fingerprint Failed: " + msg));
                }
            });

        } catch (e) {
            reject(e);
        }
    });
};

let deviceInstance = null;

const handleMessage = async (request, sender, sendResponse) => {

    const processRequest = async () => {
        // ... (unchanged logic for WebAuthn processing) ...
        try {
            let result;
            if (request.type === 'create' || request.authn === 'create') {
                debugLog('[Auth] Create Options (Raw):', request.options);

                let opts = request.options;
                // Parse if string to ensure we check structure of object, not string properties
                if (typeof opts === 'string') {
                    try { opts = JSON.parse(opts); } catch (e) { console.error("JSON parse error:", e); }
                }

                if (!opts.publicKey) opts = { publicKey: opts };

                const deserializedOptions = window.authnTools.unserialize(JSON.stringify(opts));
                debugLog('[Auth] Create Options (Deserialized):', deserializedOptions);
                result = await deviceInstance.create(deserializedOptions, request.url);

                // If create triggered a storage save, it might have returned a promise (if logic inside create awaits handleStorage)
                // But deviceInstance.create inside webauthn-authenticator.js awaits handleStorage ONLY if it was async.
                // However, our handleStorage now returns a Promise.
                // webauthn-authenticator.js:341: if (this.handleStorage) this.handleStorage(this.storage);
                // It does NOT await it. It just calls it.
                // So we need to manually ensure we save "authenticator.storage" if it changed?
                // UNLESS we explicit save here.

                debugLog('[Auth] Manually ensuring storage save...');
                await new Promise(r => chrome.storage.local.set({ 'system_credentials': deviceInstance.storage }, r));
                debugLog('[Auth] Manual save complete.');
            } else if (request.type === 'get' || request.authn === 'get') {
                debugLog('[Auth] Get Options (Raw):', request.options);

                let opts = request.options;
                if (typeof opts === 'string') {
                    try { opts = JSON.parse(opts); } catch (e) { console.error("JSON parse error:", e); }
                }

                if (!opts.publicKey) opts = { publicKey: opts };

                const deserializedOptions = window.authnTools.unserialize(JSON.stringify(opts));
                debugLog('[Auth] Get Options (Deserialized):', deserializedOptions);
                debugLog('[Auth] Current Storage:', deviceInstance.storage);
                result = await deviceInstance.get(deserializedOptions, request.url);
            }

            if (result) {
                const responsePayload = {
                    id: result.id,
                    // Use serialize to ensure ArrayBuffers are preserved for the client script
                    rawId: JSON.parse(window.authnTools.serialize(result.rawId)),
                    response: { clientDataJSON: JSON.parse(window.authnTools.serialize(result.response.clientDataJSON)) },
                    type: result.type,
                    getClientExtensionResults: result.getClientExtensionResults()
                };
                if (result.response.attestationObject) responsePayload.response.attestationObject = JSON.parse(window.authnTools.serialize(result.response.attestationObject));
                if (result.response.authenticatorData) responsePayload.response.authenticatorData = JSON.parse(window.authnTools.serialize(result.response.authenticatorData));
                if (result.response.signature) responsePayload.response.signature = JSON.parse(window.authnTools.serialize(result.response.signature));
                if (result.response.userHandle) responsePayload.response.userHandle = JSON.parse(window.authnTools.serialize(result.response.userHandle));

                chrome.runtime.sendMessage({ id: request.id, status: 'completed', credential: JSON.stringify(responsePayload) });
                document.getElementById('status').textContent = "Operation Completed.";
                setTimeout(() => { if (window) window.close(); }, 1500);
            }
        } catch (e) {
            console.error(e);
            document.getElementById('status').innerHTML = `<span class="error">Error: ${e.message}</span>`;
            chrome.runtime.sendMessage({ id: request.id, status: 'error', error: e.message });
        }
    };

    if (!deviceInstance) {
        deviceInstance = await initAuthenticator();
    }

    const unlockBtn = document.getElementById('unlock-btn');
    const statusDiv = document.getElementById('status');

    statusDiv.textContent = "Authentication Required";
    unlockBtn.style.display = "inline-block";

    const newBtn = unlockBtn.cloneNode(true);
    unlockBtn.parentNode.replaceChild(newBtn, unlockBtn);

    newBtn.addEventListener('click', async () => {
        console.log('[Auth] Unlock button clicked. Using Native Messaging.');
        newBtn.disabled = true;
        try {
            const masterKey = await getMasterKeyFromNativeHost();

            console.log('[Auth] Keys obtained.');
            // deviceInstance.masterkeysalt is already set in initAuthenticator or from storage
            deviceInstance.setMasterKey(masterKey);

            newBtn.style.display = "none";
            statusDiv.textContent = "Processing...";

            await processRequest();

        } catch (e) {
            console.error('[Auth] Unlock process failed:', e);
            statusDiv.textContent = "Error: " + e.message;
            newBtn.disabled = false;
        }
    });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message);
    sendResponse({ started: true });
    return true;
});

chrome.runtime.sendMessage({ type: 'authenticator_ready' });
