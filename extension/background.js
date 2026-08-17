/*
 * WebAuthnLinux Background Script
 *
 * Original: Grammatopoulos Athanasios Vasileios (GramThanos)
 * Modifications by Samveen
 */
let popupWindowId = null;
let pendingRequest = null;
let contentScriptPort = null;

// Listen for messages from content scripts (injected page)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === 'authenticator_ready') {
        // The popup is open and ready. Send the pending request.
        console.log("AUTHENTICATOR READY");
        if (pendingRequest) {
            chrome.runtime.sendMessage(pendingRequest);
        }
        return;
    }

    // Message from the authenticator popup (completion)
    if (message.status === "completed" || message.status === "error") {

        // console.log(
        //     "FULL COMPLETION MESSAGE:",
        //     message
        // );

        let credential = null;

        if (message.credential) {
            try {
                credential = JSON.parse(message.credential);
                console.log("PARSED CREDENTIAL:", credential);
            } catch (e) {
                console.error("FAILED TO PARSE CREDENTIAL:", e);
            }
        }

        //
        // Debug credential payload
        //
        if (message.credential) {

            try {
                let credential = JSON.parse(message.credential);

                console.log(
                    "PARSED CREDENTIAL:",
                    credential
                );

                // rawId
                if (credential.rawId?.data) {
                    let rawId = new Uint8Array(credential.rawId.data);
                    console.log("FORWARDED RAW ID:",rawId.byteLength,rawId);
                }

                // authenticatorData
                if (
                    credential.response?.authenticatorData?.data
                ) {

                    let authData = new Uint8Array(credential.response.authenticatorData.data);
                    console.log("FORWARDED AUTHDATA:",authData.byteLength);
                }

                // signature
                if (credential.response?.signature?.data) {
                    let signature =
                    new Uint8Array(credential.response.signature.data
                    );

                    console.log("FORWARDED SIGNATURE:",signature.byteLength);

                    console.log(
                        "SIGNATURE HEX:",
                        Array.from(signature)
                        .map(
                            b =>
                            b.toString(16)
                            .padStart(2,"0")
                        )
                        .join("")
                    );
                }

                // userHandle
                if (
                    credential.response?.userHandle?.data
                ) {

                    let userHandle =
                    new Uint8Array(
                        credential.response.userHandle.data
                    );

                    console.log("FORWARDED USER HANDLE:",userHandle.byteLength);
                }


            }
            catch(e) {console.error("FAILED TO PARSE CREDENTIAL:",e);
            } 
        }

        // If we have a stored tab ID from the pending request, use it.
        if (pendingRequest && pendingRequest.requestingTabId) {
            console.log("WebAuthnLinux: Forwarding response to tab " + pendingRequest.requestingTabId);
            chrome.tabs.sendMessage(pendingRequest.requestingTabId, {
                ...message,
                extensionResponse: true
            });
            // Clear pending request after completion?
            // Maybe wait a bit or clear it now. Let's clear it to be clean.
            // Clear request after completion
            pendingRequest = null;
        } else {
            // Do not fallback to active tab.
            // The active tab may not be the tab that initiated WebAuthn.
            console.warn("No requesting tab stored");
        }
        return;
    }

    // Message from the content script (requesting auth)
    if (message.action === 'trigger_authenticator') {
        pendingRequest = message.data;
        // Store the ID of the tab that requested this, so we can reply to the correct one later
        // message.data might not have it, but 'sender' does.
        if (sender.tab) {
            pendingRequest.requestingTabId = sender.tab.id;
        }

        // Open the authenticator popup
        chrome.windows.create({
            url: "authenticator.html",
            type: "popup",
            width: 400,
            height: 600,
            focused: true
        }, (window) => {
            if(window)
                popupWindowId = window.id;
        });

        sendResponse({ started: true });
        return true; // async response
    }
});
