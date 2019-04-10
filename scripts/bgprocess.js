require.config({

    baseUrl: 'scripts/bgprocess',
    waitSeconds: 0,

    paths: {
        jquery: '../libs/jquery.min',
        underscore: '../libs/underscore.min',
        backbone: '../libs/backbone.min',
        backboneDB: '../libs/backbone.indexDB',
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
        backboneDB: {
            deps: ['backbone']
        },
        underscore: {
            exports: '_'
        }
    }
});

/**
 * Events handlers that has to be set right on start
 */

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'get-tab-id') {
        sendResponse({
            action: 'response-tab-id',
            value: sender.tab.id
        });
    }
});

chrome.runtime.onConnect.addListener(function (port) {
    port.onDisconnect.addListener(function (port) {
        sources.trigger('clear-events', port.sender.tab.id);
    });
});


requirejs(['bg'], function () {
    // bg started
});

chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.action === 'show-rss-icon') {
        const tab = sender.tab;
        chrome.pageAction.setIcon({
            path: 'rssDetector/icon16.png',
            tabId: tab.id
        });
        chrome.pageAction.show(tab.id);
    }
});