/**
 * @module BgProcess
 * @submodule models/Loader
 */
define(['backbone', 'modules/RSSParser', 'modules/Animation', '../../libs/favicon'], function (BB, RSSParser, animation, Favicon) {

    // remove items with age above treshold
    function removeOldItems(source) {
        if (!parseInt(source.get('autoremove'))) {
            return;
        }

        items.where({sourceID: source.get('id'), deleted: false, pinned: false}).forEach(function (item) {
            const date = item.get('dateCreated') || item.get('date');
            const removalInMs = source.get('autoremove') * 24 * 60 * 60 * 1000;
            if (date + removalInMs < Date.now()) {
                item.markAsDeleted();
            }
        });
    }

    function addToList(sourcesToLoad) {
        sourcesToLoad.forEach((model) => {
            if (model instanceof Folder) {
                addToList(sources.where({folderID: model.id}));
            } else if (model instanceof Source) {
                loader.addSources(model);
            }
        });
    }

    function startDownloading() {
        // don't overlap, better use less concurrent downloads or even pause for a minute
        if (loader.get('loading')) {
            return;
        }
        loader.set('loading', true);
        animation.start();
        let concurrentDownloads = settings.get('concurrentDownloads');
        for (let i = 0; i < concurrentDownloads; i++) {
            downloadNext();
        }
    }


    function download(sourcesToDownload) {
        if (!sourcesToDownload) return;
        if (!Array.isArray(sourcesToDownload)) {
            sourcesToDownload = [sourcesToDownload];
        }

        addToList(sourcesToDownload);
        startDownloading();
    }

    function downloadAll(force) {
        let sourcesArr = sources.toArray();

        if (!force) {
            let globalUpdateFrequency = settings.get('updateFrequency');
            sourcesArr = sourcesArr.filter(function (source) {
                let sourceUpdateFrequency = source.get('updateEvery');
                if (sourceUpdateFrequency === 0) {
                    return false;
                }
                let updateFrequency = sourceUpdateFrequency > 0 ? sourceUpdateFrequency : globalUpdateFrequency;
                if (updateFrequency === 0) {
                    return false;
                }
                if (!source.get('lastUpdate')) {
                    return true;
                }
                const multiplier = 1 + source.get('errorCount');
                const finalFrequency = Math.min(updateFrequency * 60 * 1000 * multiplier, 7 * 24 * 60 * 60 * 1000) - 60 * 1000;
                // reduce by a minute to not delay loading by extra minute if new load starts early
                return source.get('lastUpdate') <= Date.now() - finalFrequency;
            });
        }

        // no sources to load yet
        if (sourcesArr.length === 0) {
            return;
        }

        // add sources to list
        loader.addSources(sourcesArr);
        startDownloading();
    }

    function playNotificationSound() {

        let audio;
        if (!settings.get('useSound') || settings.get('useSound') === ':user') {
            audio = new Audio(settings.get('defaultSound'));
        } else if (settings.get('useSound') === ':none') {
            audio = false;
        } else {
            audio = new Audio('/sounds/' + settings.get('useSound') + '.ogg');
        }
        if (audio) {
            audio.volume = parseFloat(settings.get('soundVolume'));
            audio.play();
        }
    }

    function feedDownloaded(model, xhr, success = true) {
        const data = {
            isLoading: false,
            errorCount: success ? 0 : model.get('errorCount') + 1
        };
        if (success) {
            data.successfullyLoaded = Date.now();
        }
        model.save(data);
        model.trigger('update', {ok: success});
        loader.set('loaded', loader.get('loaded') + 1);
        const modelIndex = loader.sourcesLoading.indexOf(model);
        if (modelIndex > -1) {
            loader.sourcesLoading.splice(modelIndex, 1);
        }
        const xhrIndex = loader.currentRequests.indexOf(xhr);
        if (xhrIndex > -1) {
            loader.currentRequests.splice(xhrIndex, 1);
        }
        downloadNext();
    }

    function downloadStopped() {
        if (loader.itemsDownloaded && settings.get('soundNotifications')) {
            playNotificationSound();
        }
        loader.set('maxSources', 0);
        loader.set('loaded', 0);
        loader.set('loading', false);
        loader.itemsDownloaded = false;
        animation.stop();
    }


    function downloadNext() {
        if (loader.sourcesToLoad.length === 0) {
            // IF DOWNLOADING FINISHED, DELETE ITEMS WITH DELETED SOURCE (should not really happen)
            const sourceIDs = sources.pluck('id');
            let foundSome = false;
            items.toArray().forEach(function (item) {
                if (sourceIDs.indexOf(item.get('sourceID')) === -1) {
                    console.log('DELETING ITEM BECAUSE OF MISSING SOURCE');
                    item.destroy();
                    foundSome = true;
                }
            });

            if (foundSome) {
                info.refreshSpecialCounters();
            }
            return downloadStopped();
        }

        let sourceToLoad = loader.sourcesToLoad.shift();
        if (loader.sourcesLoading.includes(sourceToLoad)) {
            return downloadNext();
        }
        loader.sourcesLoading.push(sourceToLoad);

        removeOldItems(sourceToLoad);


        if (settings.get('showSpinner')) {
            sourceToLoad.set('isLoading', true);
        }
        const proxy = sourceToLoad.get('proxyThroughFeedly');

        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status !== 200) {
                    console.log('Failed load source: ' + sourceToLoad.get('url') + (proxy ? 'using Feedly proxy' : ''));
                    return feedDownloaded(sourceToLoad, xhr, false);
                }
                let parsedData = [];
                if (proxy) {
                    const response = JSON.parse(xhr.responseText);
                    const sourceID = sourceToLoad.get('id');
                    response.items.forEach(function (item) {
                        let canonical = item.canonical ? item.canonical[0] : item.alternate[0];
                        parsedData.push({
                            id: item.originId,
                            title: item.title,
                            url: canonical.href,
                            date: item.updated ? item.updated : (item.published ? item.published : Date.now()),
                            author: item.author ? item.author : '',
                            content: item.content ? item.content.content : item.summary.content,
                            sourceID: sourceID,
                            unread: true,
                            deleted: false,
                            trashed: false,
                            visited: false,
                            pinned: false,
                            dateCreated: Date.now()
                        });
                    });
                } else {
                    const response = xhr.responseText.trim();
                    const data = new DOMParser().parseFromString(response, 'text/xml');
                    if ([...data.querySelectorAll('parsererror')].length > 0) {
                        console.log('Failed load source: ' + sourceToLoad.get('url') + (proxy ? 'using Feedly proxy' : ''));
                        return feedDownloaded(soutceToLoad, xhr, false);
                    }
                    parsedData = RSSParser.parse(data, sourceToLoad.get('id'));

                }
                let hasNew = false;
                let createdNo = 0;
                let lastArticle = sourceToLoad.get('lastArticle');
                parsedData.forEach(function (item) {
                    const existingItem = items.get(item.id);
                    lastArticle = Math.max(lastArticle, item.date);
                    if (!existingItem) {
                        hasNew = true;
                        items.create(item, {sort: false});
                        createdNo++;
                    } else if (existingItem.get('deleted') === false && existingItem.get('content') !== item.content) {
                        existingItem.save({
                            content: item.content
                        });
                    }
                });
                sourceToLoad.set('lastArticle', lastArticle);

                items.sort({silent: true});
                if (hasNew) {
                    items.trigger('search');
                    loader.itemsDownloaded = true;
                }

                // remove old deleted content
                const fetchedIDs = parsedData.map((item) => {
                    return item.id;
                });
                items.where({
                    sourceID: sourceToLoad.get('id'),
                    deleted: true
                }).forEach(function (item) {
                    if (fetchedIDs.indexOf(item.id) === -1) {
                        item.destroy();
                    }
                });

                // tip to optimize: var count = items.where.call(countAll, {unread: true }).length
                const countAll = items.where({sourceID: sourceToLoad.get('id'), trashed: false}).length;
                const count = items.where({
                    sourceID: sourceToLoad.get('id'),
                    unread: true,
                    trashed: false
                }).length;

                sourceToLoad.save({
                    'count': count,
                    'countAll': countAll,
                    'lastUpdate': Date.now(),
                    'hasNew': hasNew || sourceToLoad.get('hasNew')
                });

                info.set({
                    allCountUnvisited: info.get('allCountUnvisited') + createdNo
                });

                if (sourceToLoad.get('faviconExpires') < parseInt(Math.round((new Date()).getTime() / 1000))) {
                    Favicon.checkFavicon(sourceToLoad)
                        .then((response) => {
                            sourceToLoad.save(response);
                            return feedDownloaded(sourceToLoad, xhr);
                        }, () => {
                            console.log('failed to load favicon for' + sourceToLoad.get('url'));
                            return feedDownloaded(sourceToLoad, xhr);
                        });
                }
                feedDownloaded(sourceToLoad, xhr);

            }
        };
        let url = sourceToLoad.get('url');
        if (proxy) {
            const i = items.where({sourceID: sourceID});
            let date = 0;

            i.forEach((item) => {
                if (item.date > date) {
                    date = item.date;
                }
            });
            url = 'https://cloud.feedly.com/v3/streams/contents?streamId=feed%2F' + encodeURIComponent(url) + '&count=' + (1000) + ('&newerThan=' + (date));
        }

        xhr.open('GET', url);
        xhr.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('X-Time-Stamp', Date.now());
        if (!proxy && (sourceToLoad.get('username') || sourceToLoad.get('password'))) {
            const username = sourceToLoad.get('username') || '';
            const password = sourceToLoad.getPass() || '';
            xhr.withCredentials = true;
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${username}:${password}`));
        }
        xhr.send();
    }


    /**
     * Updates feeds and keeps info about progress
     * @class Loader
     * @constructor
     * @extends Backbone.Model
     */
    var Loader = Backbone.Model.extend({
        defaults: {
            maxSources: 0,
            loaded: 0,
            loading: false
        },
        currentRequests: [],
        itemsDownloaded: false,
        sourcesToLoad: [],
        sourcesLoading: [],
        loading: false,
        addSources: function (s) {
            if (s instanceof Source) {
                if (!this.sourcesToLoad.includes(s)) {
                    this.sourcesToLoad.push(s);
                    this.set('maxSources', this.get('maxSources') + 1);
                }
            } else if (Array.isArray(s)) {
                this.sourcesToLoad = this.sourcesToLoad.concat(s);
                this.set('maxSources', this.get('maxSources') + s.length);
            }
        },
        abortDownloading: function () {
            loader.currentRequests.forEach((request) => {
                request.abort();
            });
            loader.sourcesToLoad = [];
            loader.sourcesLoading = [];

            downloadStopped();
        },
        download: download,
        downloadURL: downloadNext,
        downloadAll: downloadAll,
        playNotificationSound: playNotificationSound
    });

    return Loader;

});