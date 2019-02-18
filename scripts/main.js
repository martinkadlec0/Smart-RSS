require.config({

	baseUrl: 'scripts/app',
	waitSeconds: 0,

	paths: {
		jquery: '../libs/jquery.min',
		underscore: '../libs/underscore.min',
		backbone: '../libs/backbone.min',
		text: '../text',
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
	 * Setup work, that has to be done before any dependencies get executed
	 */
	window.bg = bg;

	chrome.runtime.sendMessage({ action: 'get-tab-id'}, function(response) {
		if (response.action === 'response-tab-id') {
			tabID = response.value;
		}
	});
	chrome.runtime.connect();

	checkState();
});

/**
 * This is retarded solution. It is too late to think of something else.
 * Broadcasting message from bgprocess might help.
 */
function checkState() {
	if ('appStarted' in bg) {
		init();
	} else {
		setTimeout(checkState, 100);
	}
}

function init() {
	bg.appStarted.always(function() {
		requirejs(['app'], function(app) {
			app.start();
		});
	});
}