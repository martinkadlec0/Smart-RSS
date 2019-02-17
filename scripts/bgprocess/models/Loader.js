/**
 * @module BgProcess
 * @submodule models/Loader
 */
define(['backbone', 'modules/RSSParser', 'modules/Animation'], function (BB, RSSParser, animation) {

    function autoremoveItems(source) {
        if (!parseFloat(source.get('autoremove'))) return;

        items.where({sourceID: source.get('id'), deleted: false, pinned: false}).forEach(function (item) {
            var date = item.get('dateCreated') || item.get('date');
            var removalInMs = source.get('autoremove') * 24 * 60 * 60 * 1000;
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
        animation.start();
        loader.set('loading', true);
        let concurrentDownloads = settings.get('concurrentDownloads');
        for (let i = 0; i < concurrentDownloads; i++) {
            downloadURL();
        }

    }


    function download(sourcesToDownload) {
        if (!sourcesToDownload) return;
        if (!Array.isArray(sourcesToDownload)) {
            sourcesToDownload = [sourcesToDownload];
        }

        addToList(sourcesToDownload);


        startDownloading();
        // loader.sourcesToLoad.forEach(downloadOne);
    }


    function downloadOne(model) {
        if (loader.sourcesLoading.includes(model)) {
            return false;
        }
        startDownloading();
    }

    function downloadAll(force) {

        if (loader.get('loading') === true) return;

        var sourcesArr = sources.toArray();

        if (!force) {
            sourcesArr = sourcesArr.filter(function (source) {
                if (source.get('updateEvery') === 0) return false;
                /****
                 why !source.get('lastUpdate') ? .. I think I wanted !source.get('lastUpdate') => true not the other way around
                 ****/
                if (!source.get('lastUpdate')) return true;
                return source.get('lastUpdate') <= Date.now() - source.get('updateEvery') * 60 * 1000;

            });
        }

        if (sourcesArr.length) {
            loader.addSources(sourcesArr);
            startDownloading();
        }

    }

    function playNotificationSound() {

        var audio;
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

    function feedDownloaded(model, xhr) {
        var index = loader.sourcesLoading.indexOf(model);
        if (index > -1) {
            loader.sourcesLoading.splice(index, 1);
        }
        var index = loader.currentRequests.indexOf(xhr);
        if (index > -1) {
            loader.currentRequests.splice(index, 1);
        }
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

    function downloadURL() {
        if (!loader.sourcesToLoad.length) {

            // IF DOWNLOADING FINISHED, DELETED ITEMS WITH DELETED SOURCE (should not really happen)
            var sourceIDs = sources.pluck('id');
            var foundSome = false;
            items.toArray().forEach(function (item) {
                if (sourceIDs.indexOf(item.get('sourceID')) === -1) {
                    console.log('DELETING ITEM BECAUSE OF MISSING SOURCE');
                    item.destroy();
                    foundSome = true;
                }
            });

            if (foundSome) {
                info.autoSetData();
            }

            downloadStopped();


            return;
        }

        let sourceToLoad = loader.sourcesToLoad.pop();
        if (loader.sourcesLoading.includes(model)) {
            return downloadURL();
        }
        loader.sourcesLoading.push(sourceToLoad);

        autoremoveItems(sourceToLoad);


        if (settings.get('showSpinner')) {
            sourceToLoad.set('isLoading', true);
        }

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = (e) => {

            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // parsedData step needed for debugging
                    var parsedData = RSSParser.parse(xhr.responseXML, sourceToLoad.get('id'));

                    var hasNew = false;
                    var createdNo = 0;
                    parsedData.forEach(function (item) {

                        var existingItem = items.get(item.id) || items.get(item.oldId);
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

                    items.sort({silent: true});
                    if (hasNew) {
                        items.trigger('render-screen');
                        loader.itemsDownloaded = true;
                    }

                    // remove old deleted content
                    var fetchedIDs = parsedData.map((item) => {
                        return item.id;
                    });
                    var fetchedOldIDs = parsedData.map((item) => {
                        return item.oldId;
                    });
                    items.where({
                        sourceID: sourceToLoad.get('id'),
                        deleted: true
                    }).forEach(function (item) {
                        if (fetchedIDs.indexOf(item.id) === -1 && fetchedOldIDs.indexOf(item.id) === -1) {
                            item.destroy();
                        }
                    });

                    // tip to optimize: var count = items.where.call(countAll, {unread: true }).length
                    var countAll = items.where({sourceID: sourceToLoad.get('id'), trashed: false}).length;
                    var count = items.where({sourceID: sourceToLoad.get('id'), unread: true, trashed: false}).length;

                    sourceToLoad.save({
                        'count': count,
                        'countAll': countAll,
                        'lastUpdate': Date.now(),
                        'hasNew': hasNew || sourceToLoad.get('hasNew')
                    });

                    info.set({
                        allCountUnvisited: info.get('allCountUnvisited') + createdNo
                    });

                    sourceToLoad.trigger('update', {ok: true});

                } else {
                    console.log('Failed load RSS: ' + sourceToLoad.get('url'));
                    sourceToLoad.trigger('update', {ok: false});
                }
                loader.set('loaded', loader.get('loaded') + 1);

                // reset alarm to make sure next call isn't too soon + to make sure alarm acutaly exists (it doesn't after import)
                sourceToLoad.trigger('reset-alarm', sourceToLoad);
                sourceToLoad.set('isLoading', false);

                feedDownloaded(sourceToLoad, xhr);
                downloadURL();
            }


        };
        xhr.open('GET', sourceToLoad.get('url'));
        xhr.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('X-Time-Stamp', Date.now());
        if (sourceToLoad.get('username') || sourceToLoad.get('password')) {
            let username = sourceToLoad.get('username') || '';
            let password = sourceToLoad.getPass() || '';
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${username}:${password}`));
        }


        // loader.currentRequest = xhr;
        loader.currentRequests.push(xhr);
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
        currentRequest: null,
        currentRequests: [],
        itemsDownloaded: false,
        sourcesToLoad: [],
        sourceLoading: null,
        sourcesLoading: [],
        addSources: function (s) {
            if (s instanceof Source) {
                this.sourcesToLoad.push(s);
                this.set('maxSources', this.get('maxSources') + 1);
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
        downloadURL: downloadURL,
        downloadOne: downloadOne,
        downloadAll: downloadAll,
        playNotificationSound: playNotificationSound
    });

    return Loader;

});