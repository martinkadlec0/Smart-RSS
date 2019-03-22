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
                return source.get('lastUpdate') <= Date.now() - updateFrequency * 60 * 1000;
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

    function feedDownloaded(model, xhr) {
        const modelIndex = loader.sourcesLoading.indexOf(model);
        if (modelIndex > -1) {
            loader.sourcesLoading.splice(modelIndex, 1);
        }
        const xhrIndex = loader.currentRequests.indexOf(xhr);
        if (xhrIndex > -1) {
            loader.currentRequests.splice(xhrIndex, 1);
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
        if (loader.sourcesToLoad.length === 0) {
            // IF DOWNLOADING FINISHED, DELETED ITEMS WITH DELETED SOURCE (should not really happen)
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
            return downloadURL();
        }
        loader.sourcesLoading.push(sourceToLoad);

        removeOldItems(sourceToLoad);


        if (settings.get('showSpinner')) {
            sourceToLoad.set('isLoading', true);
        }
        const proxy = sourceToLoad.get('proxyThroughFeedly');

        let xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/xml');
        xhr.onreadystatechange = () => {
            let ok = false;
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    ok = true;
                    let parsedData = [];
                    if (proxy) {
                        let response = JSON.parse(xhr.responseText);
                        let sourceID = sourceToLoad.get('id');
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
                        const response = xhr.responseText;
                        const data = new DOMParser().parseFromString(response, 'text/xml');
                        if ([...data.querySelectorAll('parsererror')].length > 0) {
                            console.log('Failed load source: ' + sourceToLoad.get('url') + (proxy ? 'using feedly proxy' : ''));
                            sourceToLoad.trigger('update', {ok: false});
                            sourceToLoad.save({
                                favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACfUlEQVR42pXSb0gTYRwH8O/Ns8AXeg36gxG0YhBmLOhVryxIkggxs6BSEQpCU0nNGWRIFpWIUUaaOMmcIspIUqvp7MUU8oUEXZtTXGpoggbl1N3t/mxed1uad9aLfvBwv4P7fp7n4X6EJEmw2qfe74wjEziGBesPkKyfjWL8HBlgOJJj+ShRCJLbdm8fmvTMZj+rzZ7BhiIUoMvhHT2TbEzAP6r4uQvHD1NwOCc+B73j6XWWa5MqoL3b5b6QeujgxpAkL3EVCMnrlsWFgjQDnnhIfHrVN2ZcmUpvfFk0vg602D6OZWccObAREEJAcDWC3HnhgjljP74zQYx4FjE6MIRHNZnEOmBpHZ64knnU+Lew0j9ocanv5KXVQH2TczL3ctK+8LHlwDBJYNfrfuhPJGP+XR9+ZqRAdC9B9hBgQnB2vFEDtXWOmcK85D3C77Cpuhp0aSn0Nns4bMrKAm21Im5BgsiKaH/aoQZqHr+dK7p+Kn6IiIQpgwG+kRHQVVXhMEVR8Hm9oO12RH8RYKvTAA+rexaKS07vmOpxYCHtJExlZaD0evjcblVYKZ1XQFe9Brh3v+tHkTlNzwrE+p21Ox+TP3bOSgiyAnobOtVA5V3bUoH5bOy33v5NYSo6Gr7padDyaZTiPDz6LBqgoqKTyb95LsYTo9u0sykxEZQgwDc/D3p5Gcwoj4EmDVB+u4PLLTu/NSASmNMTSMrJgbO5Gd0pV5Fqb4ApNjYc9k1IkDgBg80aoNTcxueXX9zi5wnwQWAlnogMzFd5MvZG+sVxCYL8qpOBD1YNUHKjLVRYeUnHCH8mUHkq2FqvzIio/AUeGGxsVQPFJa0S/rPWgF+LDojwZf7f9QAAAABJRU5ErkJggg==',
                                faviconExpires: parseInt(Math.round((new Date()).getTime() / 1000)) + 60 * 60
                            });
                        }
                        parsedData = RSSParser.parse(data, sourceToLoad.get('id'));

                    }
                    let hasNew = false;
                    let createdNo = 0;
                    parsedData.forEach(function (item) {
                        const existingItem = items.get(item.id);
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

                    sourceToLoad.trigger('update', {ok: true});

                } else {
                    console.log('Failed load source: ' + sourceToLoad.get('url') + (proxy ? 'using feedly proxy' : ''));
                    sourceToLoad.trigger('update', {ok: false});
                    sourceToLoad.save({
                        favicon: '/images/brokenFeed.png',
                        faviconExpires: parseInt(Math.round((new Date()).getTime() / 1000)) + 60 * 60
                    });
                }
                loader.set('loaded', loader.get('loaded') + 1);
                sourceToLoad.set('isLoading', false);


                if (ok && (sourceToLoad.get('faviconExpires') < parseInt(Math.round((new Date()).getTime() / 1000)))) {
                    console.log('checking favicon for' + sourceToLoad.get('url'));
                    Favicon.checkFavicon(sourceToLoad)
                        .then((response) => {
                            sourceToLoad.save(response);
                            feedDownloaded(sourceToLoad, xhr);
                            downloadURL();
                        }, () => {
                            console.log('failed to load favicon for' + sourceToLoad.get('url'));
                            feedDownloaded(sourceToLoad, xhr);
                            downloadURL();
                        });
                } else {
                    feedDownloaded(sourceToLoad, xhr);
                    downloadURL();
                }
            }
        };
        let url = sourceToLoad.get('url');
        if (proxy) {
            let i = items.where({sourceID: sourceID});
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
            let username = sourceToLoad.get('username') || '';
            let password = sourceToLoad.getPass() || '';
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
        downloadURL: downloadURL,
        downloadAll: downloadAll,
        playNotificationSound: playNotificationSound
    });

    return Loader;

})
;