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
        function addSource(address) {
            address = address.replace(/^feed:/i, 'https:');

            const duplicate = sources.findWhere({url: address});

            if (duplicate) {
                duplicate.trigger('change');
                openRSS(false, duplicate.get('id'));
                return;
            }
            const source = sources.create({
                title: address,
                url: address
            }, {wait: true});
            openRSS(false, source.get('id'));
        }

        function createLinksMenu() {
            chrome.contextMenus.create({
                title: 'Subscribe to this feed',
                contexts: ['link'],
                checked: false,
                onclick: (info) => {
                    addSource(info.linkUrl);
                }

            });
        }


        function onMessage(message) {
            if (!message.hasOwnProperty('action')) {
                return;
            }

            if (message.action === 'new-rss' && message.value) {
                addSource(message.value);
                return;
            }
            if (message.action === 'list-feeds') {
                chrome.contextMenus.removeAll();
                createLinksMenu();
                if (!settings.get('detectFeeds')) {
                    return;
                }
                setTimeout(() => {
                    let feeds = message.value;
                    let subscribedFound = 0;
                    let unsubscribedFound = 0;
                    if (settings.get('hideSubscribedFeeds') === 'hide') {
                        feeds = feeds.filter((feed) => {
                            const isFound = !sources.where({url: feed.url}).length;
                            if (isFound) {
                                subscribedFound++;
                            } else {
                                unsubscribedFound++;
                            }
                            return isFound;
                        });
                    } else {
                        feeds = feeds.map((feed) => {
                            const isFound = sources.where({url: feed.url}).length;
                            if (isFound) {
                                subscribedFound++;
                                feed.title = '[*] ' + feed.title;
                            } else {
                                unsubscribedFound++;
                            }
                            return feed;
                        });
                    }

                    if (feeds.length === 0) {
                        animation.handleIconChange();
                        return;
                    }

                    const whenToChangeIcon = settings.get('showNewArticlesIcon');
                    let shouldChangeIcon = true;
                    if (whenToChangeIcon === 'not-subscribed-found' && unsubscribedFound === 0) {
                        shouldChangeIcon = false;
                    }
                    if (whenToChangeIcon === 'no-subscribed-found' && subscribedFound > 0) {
                        shouldChangeIcon = false;
                    }
                    if (whenToChangeIcon === 'never') {
                        shouldChangeIcon = false;
                    }
                    if (shouldChangeIcon) {
                        chrome.browserAction.setIcon({
                            path: '/images/icon19-' + settings.get('sourcesFoundIcon') + '.png'
                        });
                    }
                    chrome.contextMenus.create({
                        id: 'SmartRss',
                        contexts: ['browser_action'],
                        title: 'Subscribe'
                    }, function () {
                        feeds.forEach(function (feed) {
                            chrome.contextMenus.create({
                                id: feed.url,
                                title: feed.title,
                                contexts: ['browser_action'],
                                parentId: 'SmartRss',
                                onclick: function () {
                                    addSource(feed.url);
                                }
                            });
                        });
                    });
                    if (settings.get('badgeMode') === 'sources') {
                        chrome.browserAction.setBadgeText({text: feeds.length.toString()});
                    }
                }, 250);


            }
            if (message.action === 'visibility-lost') {
                animation.handleIconChange();
                chrome.contextMenus.removeAll();
                createLinksMenu();
                if (settings.get('badgeMode') === 'sources') {
                    chrome.browserAction.setBadgeText({text: ''});
                }
            }
        }

        chrome.runtime.onMessage.addListener(onMessage);

        function openRSS(closeIfActive, focusSource) {
            let url = chrome.extension.getURL('rss.html');
            chrome.tabs.query({url: url},
                (tabs) => {
                    if (tabs[0]) {
                        if (tabs[0].active && closeIfActive) {
                            chrome.tabs.remove(tabs[0].id);
                            return;
                        }
                        chrome.tabs.update(tabs[0].id, {
                            active: true
                        });
                        if (focusSource) {
                            window.sourceToFocus = focusSource;
                        }
                        return;
                    }
                    window.sourceToFocus = focusSource;
                    if (settings.get('openInNewTab')) {
                        chrome.tabs.create({
                            url: url
                        }, () => {
                        });
                    } else {
                        chrome.tabs.update({url: url});
                    }
                });
        }

        function openInNewTab() {
            chrome.tabs.create({
                url: chrome.extension.getURL('rss.html')
            }, () => {
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
            return new Promise((resolve) => {
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
            tasks.push(settings.fetch({silent: true}));
            tasks.push(folders.fetch({silent: true}));
            tasks.push(sources.fetch({silent: true}));
            tasks.push(toolbars.fetch({silent: true}));
            tasks.push(items.fetch({silent: true}));


            return fetchOne(tasks);
        }

        window.fetchAll = fetchAll;
        window.fetchOne = fetchOne;
        window.reloadExt = function () {
            chrome.runtime.reload();
        };


        window.appStarted = new Promise((resolve) => {
            /**
             * Init
             */


            fetchAll().then(function () {
                window.items.sort();
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

                const version = settings.get('version') || 0;
                if (version < 1) {
                    items.forEach((item) => {
                        item.save('id', item.get('id') + item.get('sourceID'));
                    });
                    settings.save('version', 1);
                }

                chrome.alarms.create('scheduler', {
                    periodInMinutes: 1
                });

                chrome.alarms.onAlarm.addListener((alarm) => {
                    if (alarm.name === 'scheduler') {
                        if (!settings.get('disableAutoUpdate')) {
                            loader.downloadAll();
                        }
                        const trashCleaningDelay = settings.get('autoremovetrash');
                        if (trashCleaningDelay === 0) {
                            return;
                        }
                        const now = Date.now();
                        const diff = trashCleaningDelay * 1000 * 60 * 60 * 24;
                        bg.items.where({trashed: true, deleted: false}).forEach(function (item) {
                            if (now - item.get('trashedOn') > diff) {
                                item.markAsDeleted();
                            }
                        });
                    }
                });

                /**
                 * onclick:button -> open RSS
                 */
                chrome.browserAction.onClicked.addListener(function (tab, onClickData) {
                    if (typeof onClickData !== 'undefined') {
                        if (onClickData.button === 1) {
                            openInNewTab();
                            return;
                        }
                    }
                    openRSS(true);
                });
                createLinksMenu();


                if (typeof browser !== 'undefined') {
                    browser.runtime.getBrowserInfo().then((info) => {
                        if (info.name !== 'Waterfox') {
                            return;
                        }
                        if (info.version.split('.')[0] !== 56) {
                            return;
                        }

                        const onHeadersReceived = function (details) {
                            details.tabId === -1;

                            for (let i = 0; i < details.responseHeaders.length; i++) {
                                if (details.responseHeaders[i].name.toLowerCase() === 'content-security-policy') {
                                    details.responseHeaders[i].value = '';
                                }
                            }

                            return {
                                responseHeaders: details.responseHeaders
                            };
                        };


                        const onHeaderFilter = {
                            urls: ['*://*/*'],
                            types: ['main_frame', 'sub_frame', 'other', 'object_subrequest', 'xmlhttprequest'],
                            tabId: -1
                        };
                        chrome.webRequest.onHeadersReceived.addListener(
                            onHeadersReceived, onHeaderFilter, ['blocking', 'responseHeaders']
                        );
                    });
                }


                /**
                 * Set icon
                 */
                animation.stop();
                resolve(true);
            });
        });
    });
