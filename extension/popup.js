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

// Load items form addon storage
chrome.storage.local.get(options, function (items) {
	// For each option
	options.forEach(option => {
		// Load defaul value
		document.getElementById(option).checked = items[option] ? true : false;
		// Fix opacity
		document.getElementById(option).parentNode.parentNode.style.opacity = items[option] ? 1 : 0.6;
	});

	document.getElementById('sub-options').style.opacity = items[options[0]] ? 1 : 0.6;

	// Remove no animations class
	setTimeout(() => {
		document.getElementsByClassName('sliders-no-animations')[0].classList.remove('sliders-no-animations');
	}, 400);
});

// For each option
options.forEach(option => {
	// Add toggle listener
	document.getElementById(option).addEventListener('change', function () {
		// On toggle save option on/off
		let obj = {};
		obj[option] = this.checked;
		chrome.storage.local.set(obj, () => { });
		// Fix opacity
		document.getElementById(option).parentNode.parentNode.style.opacity = this.checked ? 1 : 0.6;
		console.log(option, options[0]);
		if (option == options[0]) {
			document.getElementById('sub-options').style.opacity = this.checked ? 1 : 0.6;
		}
	}, false);
});
