/*
 * WebAuthnLinux
 * Script: WebAuthn Linux Credential Provider
 *
 * Original: Grammatopoulos Athanasios Vasileios (GramThanos)
 * Modifications by Samveen
 */

window.WebAuthnLinux = window.WebAuthnLinux || ((cWindow, credentials, PKCredential) => {
	let WebAuthnLinux = {

		// Initialize
		init: function () {
			// Production defaults
			this._patchPubCred = false;
			this._debugLogging = false;
			this._platformAuthenticatorAvailable = true; // Enabled by default on Linux

			// Instances ID increment
			this.idIncrement = 0;

			// Check script data (if needed for specific overrides)
			let script = document.currentScript;
			if (script) {
				if (
					(script.dataset.instanceOfPubKey && script.dataset.instanceOfPubKey.toLowerCase() == 'true') ||
					(script.getAttribute('instance-of-pub-key') && script.getAttribute('instance-of-pub-key').toLowerCase() == 'true')
				) this._patchPubCred = true;
				if (
					(script.dataset.debugLogging && script.dataset.debugLogging.toLowerCase() == 'true') ||
					(script.getAttribute('debug-logging') && script.getAttribute('debug-logging').toLowerCase() == 'true')
				) this._debugLogging = true;
			}

			// Store WebAuthn references
			this.WebAuthn = {
				'scope': credentials,
				'create': credentials.create,
				'get': credentials.get
			};
			this.PKCredential = {
				'scope': PKCredential,
				'isUserVerifyingPlatformAuthenticatorAvailable': PKCredential.isUserVerifyingPlatformAuthenticatorAvailable
			};

			// Override functions
			let self = this;
			credentials.create = function () { return self.create.apply(self, arguments); };
			credentials.get = function () { return self.get.apply(self, arguments); };

			PKCredential.isUserVerifyingPlatformAuthenticatorAvailable = function () {
				return self.isUserVerifyingPlatformAuthenticatorAvailable.apply(self, arguments);
			}
		},

		handleResponse: function (data) {
			// Find instance
			let instance = false;
			for (var i = this.instances.length - 1; i >= 0; i--) {
				if (this.instances[i].id == data.id) {
					instance = this.instances[i];
				}
			}
			if (!instance) return;

			// Do action
			if (instance.status == 'unassigned') {
				instance.status = 'assigned';
			}

			if (instance.status == 'assigned') {
				// Only proceed if we have a credential or an explicit error/completion
				if (!data.credential && data.status !== 'completed' && data.status !== 'error') {
					return;
				}

				instance.status = 'completed';

				if (this._debugLogging) console.log("WebAuthnLinux: Response received", data);

				// Catch cases where the extension frontend can't find a key natively
				if (data.status === 'error' && data.error === "No authenticator found for the requested allowCredentials") {
					console.log("🔍 Checking persistent storage fallback database tables...");

					// Intercept and look for the keys we saved manually earlier
					if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
						chrome.storage.local.get(null, (items) => {
							// Look for any key matching our credential profile mapping paths
							let foundKey = null;
							for (let k in items) {
								if (k.startsWith("cred_")) {
									foundKey = items[k];
									break;
								}
							}

							if (foundKey) {
								console.log("🎯 Match found in persistent fallback database! Injecting...");
								data.status = 'completed';
								data.credential = foundKey;
								this.processValidCredential(foundKey, instance);
							} else {
								instance.reject(new Error(data.error || 'Identity verification failed'));
							}
						});
						return;
					}
				}

				let obj = data.credential ? this.unserialize(data.credential) : null;
				if (obj) {
					this.processValidCredential(obj, instance, data.credential);
				} else if (data.status === 'error') {
					instance.reject(new Error(data.error || 'Identity verification failed'));
				} else {
					instance.reject(new Error('Process cancelled or empty response.'));
				}
				return;
			}
		},

		// Helper to construct the native memory prototype structures cleanly
		processValidCredential: function(obj, instance, rawJsonStr) {
			if (typeof obj === 'string') obj = this.unserialize(obj);

			const toBuffer = (target) => {
				if (target && target.constructor === "ArrayBuffer" && Array.isArray(target.data)) {
					return new Uint8Array(target.data).buffer;
				}
				return target;
			};

			const trueRawId = toBuffer(obj.rawId);
			const trueClientData = toBuffer(obj.response?.clientDataJSON);
			const trueAttestation = toBuffer(obj.response?.attestationObject);
			const trueSignature = toBuffer(obj.response?.signature);
			const trueUserHandle = toBuffer(obj.response?.userHandle);
			const trueAuthData = toBuffer(obj.response?.authenticatorData);

			const isAssertion = (trueSignature !== undefined || obj.response?.signature !== undefined);
			const nativeMockCred = Object.create(PublicKeyCredential.prototype);
			const nativeMockResp = Object.create(isAssertion ? AuthenticatorAssertionResponse.prototype : AuthenticatorAttestationResponse.prototype);

			let responseProperties = {
				clientDataJSON: { value: trueClientData, enumerable: true }
			};

			if (isAssertion) {
				responseProperties.signature = { value: trueSignature, enumerable: true };
				responseProperties.userHandle = { value: trueUserHandle, enumerable: true };
				responseProperties.authenticatorData = { value: trueAuthData, enumerable: true };
			} else {
				responseProperties.attestationObject = { value: trueAttestation, enumerable: true };
				responseProperties.getTransports = { value: () => ['internal'], enumerable: true };
				responseProperties.getAuthenticatorData = { value: () => trueAuthData || new ArrayBuffer(0), enumerable: true };
				responseProperties.getPublicKey = { value: () => new ArrayBuffer(0), enumerable: true };
				responseProperties.getPublicKeyAlgorithm = { value: () => -7, enumerable: true };
			}

			Object.defineProperties(nativeMockResp, responseProperties);

			Object.defineProperties(nativeMockCred, {
				id: { value: obj.id, enumerable: true },
				rawId: { value: trueRawId, enumerable: true },
				response: { value: nativeMockResp, enumerable: true },
				type: { value: 'public-key', enumerable: true },
				authenticatorAttachment: { value: 'platform', enumerable: true },
				getClientExtensionResults: { value: () => ({}), enumerable: true }
			});

			// If this is a brand new registration save pass, commit it permanently right now
			if (!isAssertion && rawJsonStr && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
				let storageKey = "cred_" + obj.id;
				let storageObj = {};
				storageObj[storageKey] = rawJsonStr;
				chrome.storage.local.set(storageObj);
			}

			console.log("🛠️ Injected custom spec-compliant prototype vectors.");
			instance.resolve(nativeMockCred);
		},

		connect: function (instance, send = true) {
			if (!send) return;

			// Prepare the payload
			const payload = {
				id: instance.id,
				type: instance.type,
				url: instance.url,
				options: this.serialize(instance.options),
				credential: this.serialize(instance.credential),
				extensions: this.serialize(instance.extensions),

				// Signal for inject.js relay
				source: 'webauthn-linux-injected',
				action: 'trigger_authenticator',
				data: {
					id: instance.id,
					type: instance.type,
					url: instance.url,
					options: this.serialize(instance.options),
					authn: instance.authn // 'create' or 'get'
				}
			};

			// Send to content script
			window.postMessage(payload, window.location.origin);

			// Setup listener for response
			const responseHandler = (event) => {
				if (event.source !== window || !event.data) return;

				// Check if it's the response for this ID from our content script
				if (event.data.id === instance.id && event.data.source === 'webauthn-linux-content-script') {
					window.removeEventListener('message', responseHandler);
					this.handleResponse(event.data);
				}
			};
			window.addEventListener('message', responseHandler);
		},

		instances: [],

		// Substitute WebAuthn functions
		create: function () {
			// In production, we always process create/get if possible
			if (arguments.length < 1 || !arguments[0].hasOwnProperty('publicKey')) {
				return this.WebAuthn.create.apply(this.WebAuthn.scope, arguments);
			}

			return new Promise((resolve, reject) => {
				let instance = {
					status: 'unassigned',
					type: 'biometric',
					authn: 'create',
					url: cWindow.location.href,
					id: ++this.idIncrement,
					resolve: resolve,
					reject: reject,
					options: arguments[0],
					credential: null
				};
				this.instances.push(instance);
				this.connect(instance);
			});
		},
		get: function () {
			if (arguments.length < 1 || !arguments[0].hasOwnProperty('publicKey')) {
				return this.WebAuthn.get.apply(this.WebAuthn.scope, arguments);
			}

			// Condition UI handling
			if (arguments[0].mediation === 'conditional') {
				return new Promise(() => { });
			}

			return new Promise((resolve, reject) => {
				let instance = {
					status: 'unassigned',
					type: 'biometric',
					authn: 'get',
					url: cWindow.location.href,
					id: ++this.idIncrement,
					resolve: resolve,
					reject: reject,
					options: arguments[0],
					credential: null
				};
				this.instances.push(instance);
				this.connect(instance);
			});
		},

		isUserVerifyingPlatformAuthenticatorAvailable: function () {
			return new Promise((resolve) => { resolve(true); });
		},

		serialize: function (obj) {
			let parseObject = function (value) {
				if (
					value instanceof Int8Array || value instanceof Uint8Array ||
					value instanceof Uint8ClampedArray || value instanceof Int16Array ||
					value instanceof Uint16Array || value instanceof Int32Array ||
					value instanceof Uint32Array || value instanceof Float32Array ||
					value instanceof Float64Array || value instanceof ArrayBuffer
				) {
					return {
						constructor: value.constructor.name,
						data: Array.apply([], value instanceof ArrayBuffer ? new Uint8Array(value) : value),
						flag: 'FLAG_TYPED_ARRAY'
					};
				}
				else if (value instanceof Array) {
					return value.map(parseObject);
				}
				else if (typeof value === 'object' && value !== null) {
					let o = {};
					for (let i in value) {
						if (typeof value[i] !== 'function') {
							o[i] = parseObject(value[i]);
						}
					}
					return o;
				}
				return value;
			};
			return JSON.stringify(parseObject(obj));
		},
		unserialize: function (jsonStr) {
			return JSON.parse(jsonStr, function (key, value) {
				try {
					if (value.hasOwnProperty('flag') && value.flag === 'FLAG_TYPED_ARRAY') {
						if (value.constructor === 'ArrayBuffer')
							return new Uint8Array(value.data).buffer;
						return new cWindow[value.constructor](value.data);
					}
				} catch (e) { }
				return value;
			});
		}
	};

	// Linux AuthenticatorAssertionResponse
	let LinuxAuthenticatorAssertionResponse = function () {
		return (class extends (class Dummy { }) {
			constructor(obj) {
				super(obj);
				this.clientDataJSON = obj.clientDataJSON;
				this.authenticatorData = obj.authenticatorData;
				this.signature = obj.signature;
				this.userHandle = obj.userHandle;

				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.AuthenticatorAssertionResponse.prototype;
			}
			get [Symbol.toStringTag]() {
				return 'AuthenticatorAssertionResponse';
			}
		});
	};

	// Linux AuthenticatorAttestationResponse
	let LinuxAuthenticatorAttestationResponse = function () {
		return (class extends (class Dummy { }) {
			constructor(obj) {
				super(obj);
				this.clientDataJSON = obj.clientDataJSON;
				this.attestationObject = obj.attestationObject;

				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.AuthenticatorAttestationResponse.prototype;
			}
			getAuthenticatorData() { return null; }
			getPublicKey() { return null; }
			getPublicKeyAlgorithm() { return null; }
			getTransports() { return []; }
			get [Symbol.toStringTag]() {
				return 'AuthenticatorAttestationResponse';
			}
		});
	};

	// Linux PublicKeyCredential
	let LinuxPublicKeyCredential = function () {
		let priv = Symbol('private');

		return (class extends (class Dummy { }) {
			constructor(obj) {
				super();
				this.type = 'public-key';
				this.id = obj.id;
				this.rawId = obj.rawId;
				this.response =
					obj.response && obj.response.authenticatorData ? new (LinuxAuthenticatorAssertionResponse())(obj.response) :
						obj.response && obj.response.attestationObject ? new (LinuxAuthenticatorAttestationResponse())(obj.response) :
							null;
				this[priv] = {};
				this[priv].extensions = typeof obj.getClientExtensionResults == 'function' ?
					obj.getClientExtensionResults() :
					obj.getClientExtensionResults || {};

				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.PublicKeyCredential.prototype;
			}

			getClientExtensionResults() {
				return this[priv].extensions;
			}
			get [Symbol.toStringTag]() {
				return 'PublicKeyCredential';
			}
		});
	};

	if (!credentials || !PKCredential) {
		console.warn('WebAuthnLinux: WebAuthn is not availiable in this context.');
	}
	else {
		WebAuthnLinux.init();
	}
	return WebAuthnLinux;
})(window, window.navigator.credentials, window.PublicKeyCredential);
