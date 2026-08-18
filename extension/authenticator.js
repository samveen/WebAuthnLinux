/*
 *  WebAuthnLinux Extension Authenticator Logic
 *
 * Original: Grammatopoulos Athanasios Vasileios (GramThanos)
 * Modifications by (see contributors)
 */
const BUILD_VERSION = "0.9.10";
console.log(`[Auth] Loaded WebAuthnLinux. Version: ${BUILD_VERSION}`);

// Polyfill
window.authnTools = window.authnTools || {};

const statusEl = document.getElementById('status');
const iconEl = document.getElementById('icon');
const retryBtn = document.getElementById('retry-btn');

const initAuthenticator = async () => {
    const authenticator = new window.AuthnDevice();
    // Override storage handler to use chrome.storage.local
    authenticator.handleStorage = async function (data = null) {
        if (data !== null) {
            // Save mode - return a promise or handle async
            await chrome.storage.local.set({ 'system_credentials': data }
            );
            console.log('Credentials saved to local storage');
            return data;
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

    // authenticator.storage = result.system_credentials || [];
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
    console.log('[Auth] Connecting to Fingerprint Service: io.github.samveen.webauthnlinux');

    return new Promise((resolve, reject) => {
        try {
            // Host name defined in install.sh (must match exactly, and must
            // be listed in that host's "allowed_extensions" manifest entry)
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
                    statusEl.textContent = "Fingerprint verified.";
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

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 500;
const DEVICE_BUSY_RETRY_DELAY_MS = 10000;
let countdownTimer = null;

const clearCountdown = () => {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
};

// fprintd reports this when the device is still claimed by another process
// (a lingering session, a stuck previous read, etc). Retrying immediately
// just fails again in a tight loop, so this case gets a longer backoff.
const isNoMatchError = (message) => /no-match/i.test(message || '');

// fprintd reports this when the device is still claimed by another process
// (a lingering session, a stuck previous read, etc). Retrying immediately
// just fails again in a tight loop, so this case gets a longer backoff.
const isDeviceBusyError = (message) => /AlreadyInUse|already claimed/i.test(message || '');

// Waits delayMs, updating statusEl with a live countdown, e.g. "No match - retrying in 2..."
const countdown = (message, delayMs = RETRY_DELAY_MS) => new Promise((resolve) => {
    let msLeft = delayMs;
    statusEl.classList.add('error');
    console.log(message);
    statusEl.textContent = "${message} - Retrying...";
    countdownTimer = setInterval(() => {
        msLeft -= 100;
        let secondsLeft = Math.ceil(msLeft / 1000);
        if (secondsLeft > 0) {
            statusEl.textContent = `${message} - Retring in ${secondsLeft}...`;
        } else {
            statusEl.textContent = "${message} - Retrying...";
            clearCountdown();
            resolve();
        }
    }, 100);
});

// Retries the fingerprint read itself (no match, timeout, sensor error, etc.)
// up to MAX_ATTEMPTS times. Does NOT retry failures that happen after a
// successful fingerprint read (those are WebAuthn/logic errors, not
// fingerprint errors, and retrying the finger won't fix them).
const unlockWithRetry = async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        clearCountdown();
        retryBtn.style.display = 'none';
        statusEl.classList.remove('error');
        iconEl.classList.add('pulse');
        statusEl.textContent = attempt === 1
            ? "Touch the fingerprint reader..."
            : `Touch the fingerprint reader... (attempt ${attempt}/${MAX_ATTEMPTS})`;

        try {
            return await getMasterKeyFromNativeHost();
        } catch (e) {
            iconEl.classList.remove('pulse');
            console.warn(`[Auth] Fingerprint attempt ${attempt}/${MAX_ATTEMPTS} failed:`, e);
            if (attempt === MAX_ATTEMPTS) throw e;
            const noMatch = isNoMatchError(e.message);
            const busy = isDeviceBusyError(e.message);
            var message = e.message;
            if (noMatch) message = 'No match';
            if (busy) message = 'Fingerprint device busy';
            await countdown(message, busy ? DEVICE_BUSY_RETRY_DELAY_MS : RETRY_DELAY_MS);
        }
    }
};

const processRequest = async (request) => {
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

            if (deviceInstance.storage) {
                debugLog('[Auth] Manually ensuring storage save...');
                await new Promise(r => chrome.storage.local.set({ 'system_credentials': deviceInstance.storage }, r));
                debugLog('[Auth] Manual save complete.');
            }
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
            statusEl.textContent = "Verified.";
            iconEl.classList.remove('pulse');
            setTimeout(() => window.close(), 900);
        }
    } catch (e) {
        console.error(e);
        statusEl.textContent = "Error: " + e.message;
        statusEl.classList.add('error');
        iconEl.classList.remove('pulse');
        retryBtn.style.display = 'block';
        chrome.runtime.sendMessage({ id: request.id, status: 'error', error: e.message });
    }
};

const runFlow = async (request) => {
    if (!deviceInstance) deviceInstance = await initAuthenticator();
    clearCountdown();
    retryBtn.style.display = 'none';
    statusEl.classList.remove('error');
    try {
        const masterKey = await unlockWithRetry();

        console.log('[Auth] Keys obtained.');
        // deviceInstance.masterkeysalt is already set in initAuthenticator or from storage
        deviceInstance.setMasterKey(masterKey);
        statusEl.textContent = "Verifying...";
        iconEl.classList.remove('pulse');
        await processRequest(request);
    } catch (e) {
        // Only reached once all MAX_ATTEMPTS fingerprint attempts are exhausted.
        console.error('[Auth] Flow failed after retries:', e);
        statusEl.textContent = `Failed after ${MAX_ATTEMPTS} attempts)`;
        statusEl.classList.add('error');
        iconEl.classList.remove('pulse');
        retryBtn.style.display = 'block';
        chrome.runtime.sendMessage({ id: request.id, status: 'error', error: e.message });
    }
};

let lastRequest = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    lastRequest = message;
    runFlow(message);
    sendResponse({ started: true });
    return true;
});

retryBtn.addEventListener('click', () => {
    if (lastRequest) runFlow(lastRequest);
});

// Ask background.js for the pending request and start immediately - no click needed.
chrome.runtime.sendMessage({ type: 'authenticator_ready' });
