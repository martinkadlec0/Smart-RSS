require.config({

	baseUrl: 'scripts/app',

	paths: {
		jquery: '../libs/jquery.min',
		underscore: '../libs/underscore.min',
		backbone: '../libs/backbone.min',
		text: '../text',
		i18n: '../i18n',
		domReady: '../domReady',
		//mocha: '../../node_modules/mocha/mocha',
		mocha: 'https://cdnjs.cloudflare.com/ajax/libs/mocha/1.12.1/mocha.min',
		mochacss: 'https://cdnjs.cloudflare.com/ajax/libs/mocha/1.12.1/mocha.min.css?nojs',
		chai: 'https://raw.github.com/chaijs/chai/master/chai'
	},

	shim: {
		jquery: {
			exports: '$'
		},
		backbone: {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		underscore: {
			exports: '_'
		},
		mocha: {
			exports: 'mocha'
		}
	}
});

var tabID = -1;

chrome.runtime.getBackgroundPage(function(bg) {
	/**
	 * Stup work, that has to be done before any dependencies get executed
	 */
	window.bg = bg;

	chrome.extension.sendMessage({ action: 'get-tab-id'}, function(response) {
		if (response.action == 'response-tab-id') {
			tabID = response.value;	
		}
	});
	chrome.runtime.connect();
	
	requirejs(['app'], function(app) {	
		bg.appStarted.always(function() {	
			app.start();
		});
	});
});