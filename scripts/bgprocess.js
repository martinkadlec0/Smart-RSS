/**
 * Smart RSS extension
 * COPYRIGHT by Martin Kadlec
 * This extension is meant for Opera only. Do not reuse any of the code for any other browser.
 * You are allowed to do any changes for personal use in Opera Browser.
 * Ask before publishing modified versions.
 * Do not upload any modified version of this extension to addons.opera.com!
 */


require.config({

	baseUrl: 'scripts/bgprocess',
	waitSeconds: 0,

	paths: {
		jquery: '../libs/jquery.min',
		underscore: '../libs/underscore.min',
		backbone: '../libs/backbone.min',
		backboneDB: '../libs/backbone.indexDB',
		locale: '../local/local',
		md5: '../libs/md5',
		text: '../text',
		domReady: '../domReady'
	},

	shim: {
		jquery: {
			exports: '$'
		},
		backbone: {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		backboneDB: {
			deps: ['backbone']
		},
		underscore: {
			exports: '_'
		},
		md5: {
			exports: 'CryptoJS'
		}
	}
});

/**
 * Events handlers that has to be set right on start
 */

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
 	if (message.action == 'get-tab-id') {
 		sendResponse({
 			action: 'response-tab-id',
 			value: sender.tab.id
 		});
 	}
});

chrome.runtime.onConnect.addListener(function(port) {
 	port.onDisconnect.addListener(function(port) {
 		sources.trigger('clear-events', port.sender.tab.id);
 	});
});


requirejs(['bg'], function(bg) {
	// bg started
});