require.config({

    baseUrl: 'scripts/app',
    waitSeconds: 0,

    paths: {
        jquery: '../libs/jquery.min',
        underscore: '../libs/underscore.min',
        backbone: '../libs/backbone.min',
        text: '../libs/require.text',
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
        }
    }
});

let tabID = -1;

chrome.runtime.getBackgroundPage(function (bg) {
    /**
     * Setup work, that has to be done before any dependencies get executed
     */
    window.bg = bg;

    chrome.runtime.sendMessage({ action: 'get-tab-id' }, function (response) {
        if (response.action === 'response-tab-id') {
            tabID = response.value;
        }
    });
    chrome.runtime.connect();

    init();
});

function init() {
    bg.appStarted.then(() => {
        requirejs(['app'], function (app) {
            app.start();
        });
    });
}
