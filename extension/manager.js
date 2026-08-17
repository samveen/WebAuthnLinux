/*
 * WebAuthnLinux Credential Manager
 *
 * Handles:
 *  - Display credentials
 *  - Delete credentials
 *  - Rename user handles
 */


const storage =
(typeof browser !== "undefined")
? browser.storage.local
: chrome.storage.local;


let credentials = [];



/*
 * Load credentials
 */

async function loadCredentials() {

    const result = await storage.get("system_credentials");

    credentials = result.system_credentials || [];

    credentials.forEach(credential => {

        if (!credential.label) {

            const handle =
            credential.userHandle ||
            credential.user_handle ||
            "";

            const decoded =
            decodeUserHandle(handle);


            // Only use as label if it looks like readable text
            if (/^[\x20-\x7E]+$/.test(decoded)) {

                credential.label = decoded;

            }
            else {

                credential.label =
                credential.host || "Unnamed";

            }
        }

    });

    renderCredentials();
}


function decodeUserHandle(value) {
    if (!value) return "(none)";

    try {
        const base64 = value
        .replace(/-/g, '+')
        .replace(/_/g, '/');

        const bytes = Uint8Array.from(
            atob(base64),
                                      c => c.charCodeAt(0)
        );

        return new TextDecoder().decode(bytes);

    } catch (e) {
        console.error("decodeUserHandle failed:", e, value);
        return value;
    }
}

function encodeUserHandle(text) {
    const bytes = new TextEncoder().encode(text);

    let binary = "";

    for (const b of bytes) {
        binary += String.fromCharCode(b);
    }

    return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function askForRename(oldName) {

    return new Promise(resolve => {

        const dialog =
        document.getElementById("renameDialog");

        const input =
        document.getElementById("renameInput");


        input.value = oldName;


        dialog.showModal();


        dialog.addEventListener(
            "close",
            function handler() {

                dialog.removeEventListener(
                    "close",
                    handler
                );


                if (dialog.returnValue === "ok") {

                    resolve(input.value);

                }
                else {

                    resolve(null);

                }

            }
        );

    });
}


function askForDelete(message) {

    return new Promise(resolve => {

        const dialog =
        document.getElementById("deleteDialog");

        const text =
        document.getElementById("deleteMessage");

        const confirmButton =
        document.getElementById("confirmDelete");

        const cancelButton =
        document.getElementById("cancelDelete");


        text.textContent = message;


        const cleanup = () => {

            dialog.classList.add("hidden");

            confirmButton.removeEventListener(
                "click",
                confirmHandler
            );

            cancelButton.removeEventListener(
                "click",
                cancelHandler
            );
        };


        const confirmHandler = () => {

            cleanup();
            resolve(true);

        };


        const cancelHandler = () => {

            cleanup();
            resolve(false);

        };


        confirmButton.addEventListener(
            "click",
            confirmHandler
        );


        cancelButton.addEventListener(
            "click",
            cancelHandler
        );


        dialog.classList.remove("hidden");

    });
}

function displayUserHandle(value) {

    if (!value)
        return "(none)";

    const bytes = Uint8Array.from(
        atob(
            value.replace(/-/g, '+').replace(/_/g, '/')
        ),
        c => c.charCodeAt(0)
    );

    const text =
    new TextDecoder().decode(bytes);


    if (/^[\x20-\x7E]+$/.test(text)) {
        return text;
    }


    return "(binary) " +
    Array.from(bytes.slice(0,16))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("") +
    "...";
}


/*
 * Render credential list
 */

function renderCredentials() {

    const container =
    document.getElementById("credentialList");


    container.innerHTML = "";


    if (credentials.length === 0) {

        container.innerHTML =
        `
        <div class="empty-message">
        No credentials stored.
        </div>
        `;

        return;
    }



    credentials.forEach((credential, index) => {


        const card =
        document.createElement("div");


        card.className =
        "credential-card";



        card.innerHTML =
        `

        <div class="credential-row">
        <div class="credential-label">
        RP
        </div>
        <div class="credential-value">
        ${escapeHtml(credential.host || "")}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        Credential ID
        </div>
        <div class="credential-value">
        ${escapeHtml(credential.keyid || "")}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        Label
        </div>

        <div class="credential-value">
        ${escapeHtml(
            credential.label || "Unnamed"
        )}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        User Handle
        </div>

        <div class="credential-value">
        ${escapeHtml(
            displayUserHandle(
                credential.userHandle || credential.user_handle
            )
        )}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        Created
        </div>
        <div class="credential-value">
        ${formatDate(credential.created)}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        Last Used
        </div>
        <div class="credential-value">
        ${formatDate(credential.lastUsed)}
        </div>
        </div>


        <div class="credential-row">
        <div class="credential-label">
        Sign Count
        </div>
        <div class="credential-value">
        ${credential.signCount || 0}
        </div>
        </div>



        <div class="credential-actions">

        <button
        class="action-button"
        title="edit Label"
        data-action="rename">
        ✏️
        </button>


        <button
        class="action-button action-delete"
        title="Delete Credential"
        data-action="delete">
        🗑️
        </button>

        </div>

        `;



        card.querySelector(
            '[data-action="rename"]'
        )
        .onclick = () => renameCredential(index);



        card.querySelector(
            '[data-action="delete"]'
        )
        .onclick = () => deleteCredential(index);



        container.appendChild(card);

    });

}



/*
 * Delete credential
 */

async function deleteCredential(index) {


    const credential =
    credentials[index];


    const confirmDelete =
    await askForDelete(
        "Delete credential for " +
        credential.host +
        "?"
    );


    if (!confirmDelete)
        return;



    credentials.splice(index,1);


    await storage.set({
        system_credentials: credentials
    });


    renderCredentials();

}



/*
 * Rename Label
 */

async function renameCredential(index) {

    const credential =
    credentials[index];


    const oldName =
    credential.label || "";


    const newName =
    await askForRename(oldName);


    if (newName === null)
        return;


    console.log("RENAME LABEL INPUT:", newName);


    if (!newName || newName.trim() === "") {
        alert("Label cannot be empty");
        return;
    }


    credential.label =
    newName.trim();


    await storage.set({
        system_credentials: credentials
    });


    await loadCredentials();

}



/*
 * Date formatting
 */

function formatDate(value) {

    if (!value)
        return "Unknown";


    try {

        return new Date(value)
        .toLocaleString();

    }
    catch {

        return value;

    }

}



/*
 * Basic HTML protection
 */

function escapeHtml(value) {

    return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}



/*
 * Search
 */

document
.getElementById("searchBox")
?.addEventListener(
    "input",
    function() {

        const text =
        this.value
        .toLowerCase();


        document
        .querySelectorAll(
            ".credential-card"
        )
        .forEach(card => {

            card.style.display =
            card.innerText
            .toLowerCase()
            .includes(text)
            ? ""
            : "none";

        });

    }
);



/*
 * Start
 */

loadCredentials();
