/**
 * @module BgProcess
 */
define([
        'jquery',
        'modules/Animation', 'models/Settings', 'models/Info', 'models/Source',
        'collections/Sources', 'collections/Items', 'collections/Folders', 'models/Loader',
        'models/Folder', 'models/Item', 'collections/Toolbars'
    ],
    function ($, animation, Settings, Info, Source, Sources, Items, Folders, Loader, Folder, Item, Toolbars) {

        /**
         * Update animations
         */
        animation.start();

        window.appStarted = new ($.Deferred)();
        window.settingsLoaded = new ($.Deferred)();

        /**
         * Items
         */
        window.Source = Source;
        window.Item = Item;
        window.Folder = Folder;

        /**
         * DB models
         */
        window.settings = new Settings();
        window.info = new Info();
        window.sourceJoker = new Source({id: 'joker'});
        window.sources = new Sources();
        window.items = new Items();
        window.folders = new Folders();

        /**
         * This is used for when new feed is subscribed and smart rss tab is opened to focus the newly added feed
         */
        window.sourceToFocus = null;

        window.toolbars = new Toolbars();


        /**
         * Non-db models & collections
         */
        window.loader = new Loader();

        /**
         * RSS Downloader
         */

        /**
         * Fetch all
         */
        function fetchOne(arr, allDef) {
            if (!arr.length) {
                allDef.resolve();
                return;
            }
            const one = arr.shift();
            one.always(function () {
                fetchOne(arr, allDef);
            });
        }

        function fetchAll() {
            const allDef = new (jQuery.Deferred)();
            const deferreds = [];
            let settingsDef;
            deferreds.push(folders.fetch({silent: true}));
            deferreds.push(sources.fetch({silent: true}));
            deferreds.push(items.fetch({silent: true}));
            deferreds.push(toolbars.fetch({silent: true}));
            deferreds.push(settingsDef = settings.fetch({silent: true}));

            fetchOne(deferreds, allDef);

            settingsDef.always(function () {
                settingsLoaded.resolve();
            });


            return allDef.promise();
        }

        window.fetchAll = fetchAll;
        window.fetchOne = fetchOne;


        /**
         * Init
         */


        (function () {
            fetchAll().always(function () {

                /**
                 * Load counters for specials
                 */

                info.refreshSpecialCounters();

                /**
                 * Set events
                 */

                sources.on('add', function (source) {
                    loader.download(source);
                });


                sources.on('change:url', function (source) {
                    loader.download(source);
                });

                sources.on('change:title', function (source) {
                    // if url was changed as well change:url listener will download the source
                    if (!source.get('title')) {
                        loader.download(source);
                    }

                    sources.sort();
                });

                sources.on('change:hasNew', animation.handleIconChange);
                settings.on('change:icon', animation.handleIconChange);

                info.setEvents(sources);


                /**
                 * Init
                 */
                chrome.alarms.create('scheduler', {
                    delayInMinutes: 0,
                    periodInMinutes: 1
                });

                chrome.alarms.onAlarm.addListener((alarm) => {
                    if (alarm.name === 'scheduler') {
                        if (settings.get('disableAutoUpdate') === true) {
                            console.log('auto updating disabled');
                            return;
                        }
                        loader.downloadAll();
                    }
                });

                appStarted.resolve();

                /**
                 * Set icon
                 */

                animation.stop();

                /**
                 * onclick:button -> open RSS
                 */
                chrome.browserAction.onClicked.addListener(function () {
                    openRSS(true);
                });

            });
        })();

        /**
         * Messages
         */

        chrome.runtime.onMessageExternal.addListener(function (message) {
            // if.sender.id != blahblah -> return;
            if (!message.hasOwnProperty('action')) {
                return;
            }

            if (message.action === 'new-rss' && message.value) {
                message.value = message.value.replace(/^feed:/i, 'http:');

                const duplicate = sources.findWhere({url: message.value});
                if (!duplicate) {
                    const source = sources.create({
                        title: message.value,
                        url: message.value,
                        updateEvery: 180
                    }, {wait: true});
                    openRSS(false, source.get('id'));
                } else {
                    duplicate.trigger('change');
                    openRSS(false, duplicate.get('id'));
                }

            }
        });

        function openRSS(closeIfActive, focusSource) {
            let url = chrome.extension.getURL('rss.html');
            chrome.tabs.query({
                url: url
            }, function (tabs) {
                if (tabs[0]) {
                    if (tabs[0].active && closeIfActive) {
                        chrome.tabs.remove(tabs[0].id);
                    } else {
                        chrome.tabs.update(tabs[0].id, {
                            active: true
                        });
                        if (focusSource) {
                            window.sourceToFocus = focusSource;
                        }
                    }
                } else {
                    window.sourceToFocus = focusSource;
                    chrome.tabs.create({
                        'url': url
                    }, function () {
                    });
                }
            });
        }


    });