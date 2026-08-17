/*
 * WebAuthnLinux (WebDevAuthn Derivative)
 * Script: WebAuthn Settings
 *
 * Original: GramThanos
 * Modifications by Samveen
 */

let options = [
	'option@development',
	'option@instance-of-pub-key',
	'option@debugLogging'
];

// Load items from addon storage
chrome.storage.local.get(options, function (items) {
	// For each option
	options.forEach(option => {

		let element = document.getElementById(option);

		if (element) {
			// Load default value
			element.checked = items[option] ? true : false;

			// Fix opacity
			element.parentNode.parentNode.style.opacity = items[option] ? 1 : 0.6;
		}
	});

	// Remove no animations class if it exists
	let noAnimationElements =
	document.getElementsByClassName('sliders-no-animations');

	if (noAnimationElements.length > 0) {
		setTimeout(() => {
			noAnimationElements[0].classList.remove('sliders-no-animations');
		}, 400);
	}
});

// For each option
options.forEach(option => {
	let element = document.getElementById(option);
	if (element) {
		// Add toggle listener
		element.addEventListener('change', function () {
			// Save option on/off
			let obj = {};
			obj[option] = this.checked;
			chrome.storage.local.set(obj, () => { });
			// Fix opacity
			this.parentNode.parentNode.style.opacity = this.checked ? 1 : 0.6;
			console.log(option, this.checked);
		}, false);
	}
});
document.getElementById('manageCredentials').addEventListener('click', () => {
	chrome.tabs.create({
		url: chrome.runtime.getURL('manager.html')
	});
});
