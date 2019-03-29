/**
 * @module BgProcess
 */
define([
        'modules/Animation', 'models/Settings', 'models/Info', 'models/Source',
        'collections/Sources', 'collections/Items', 'collections/Folders', 'models/Loader',
        'models/Folder', 'models/Item', 'collections/Toolbars'
    ],
    function (animation, Settings, Info, Source, Sources, Items, Folders, Loader, Folder, Item, Toolbars) {
        /**
         * Messages
         */

        function onAddSourceMessage(message) {
            if (!message.hasOwnProperty('action')) {
                return;
            }

            if (message.action === 'new-rss' && message.value) {
                message.value = message.value.replace(/^feed:/i, 'https:');

                const duplicate = sources.findWhere({url: message.value});

                if (!duplicate) {
                    const source = sources.create({
                        title: message.value,
                        url: message.value
                    }, {wait: true});
                    openRSS(false, source.get('id'));
                } else {
                    duplicate.trigger('change');
                    openRSS(false, duplicate.get('id'));
                }

            }
        }

        chrome.runtime.onMessageExternal.addListener(onAddSourceMessage);
        chrome.runtime.onMessage.addListener(onAddSourceMessage);

        function openRSS(closeIfActive, focusSource) {
            let url = chrome.extension.getURL('rss.html');
            chrome.tabs.query({url: url},
                function (tabs) {
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

        window.openRSS = openRSS;

        /**
         * Update animations
         */
        animation.start();

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
        window.sources = new Sources();
        window.items = new Items();
        window.folders = new Folders();

        /**
         * This is used for when new feed is subscribed and smart rss tab is opened to focus the newly added feed
         */
        window.sourceToFocus = null;

        window.toolbars = new Toolbars();

        window.loader = new Loader();


        function fetchOne(tasks) {
            return new Promise((resolve, reject) => {
                if (tasks.length === 0) {
                    resolve(true);
                    return;
                }
                const oneTask = tasks.shift();
                oneTask.always(function () {
                    resolve(fetchOne(tasks));
                });
            });
        }

        function fetchAll() {
            const tasks = [];
            tasks.push(folders.fetch({silent: true}));
            tasks.push(sources.fetch({silent: true}));
            tasks.push(items.fetch({silent: true}));
            tasks.push(toolbars.fetch({silent: true}));
            tasks.push(settings.fetch({silent: true}));

            return fetchOne(tasks);
        }

        window.fetchAll = fetchAll;
        window.fetchOne = fetchOne;


        window.appStarted = new Promise((resolve, reject) => {

            /**
             * Init
             */


            fetchAll().then(function () {
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

                /**
                 * onclick:button -> open RSS
                 */
                chrome.browserAction.onClicked.addListener(function () {
                    openRSS(true);
                });
                /**
                 * Set icon
                 */

                animation.stop();
                resolve(true);
            });
        });

    });