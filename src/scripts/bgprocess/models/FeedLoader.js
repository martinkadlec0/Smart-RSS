/**
 * @module BgProcess
 * @submodule models/FeedLoader
 */
define(['modules/RSSParser', '../../libs/favicon'], function (RSSParser, Favicon) {
    return class FeedLoader {
        constructor(loader) {
            this.loader = loader;
            this.request = new XMLHttpRequest();
            this.request.timeout = 1000 * 15; // TODO: make configurable
            this.request.onload = this.onLoad.bind(this);
            this.request.onerror = this.onError.bind(this);
            this.request.ontimeout = this.onTimeout.bind(this);
            this.request.onabort = this.onAbort.bind(this);
        }

        onAbort() {
            this.model.save({isLoading: false});
        }

        onLoad() {
            let parsedData = [];
            const proxy = this.model.get('proxyThroughFeedly');
            if (proxy) {
                const response = JSON.parse(this.request.responseText);
                response.items.forEach((item) => {
                    let canonical = item.canonical ? item.canonical[0] : item.alternate[0];
                    parsedData.push({
                        id: item.originId,
                        title: item.title,
                        url: canonical.href,
                        date: item.updated ? item.updated : (item.published ? item.published : Date.now()),
                        author: item.author ? item.author : '',
                        content: item.content ? item.content.content : item.summary.content,
                        sourceID: this.model.get('id'),
                        dateCreated: Date.now()
                    });
                });
            } else {
                const response = this.request.responseText.trim();
                const data = new DOMParser().parseFromString(response, 'text/xml');
                const error = data.querySelector('parsererror');
                if (error) {
                    // TODO: save error for later review
                    console.log(error.outerHTML);
                    console.log('Failed load source: ' + this.model.get('url') + (proxy ? 'using Feedly proxy' : ''));
                    return this.onFeedProcessed(false);
                }
                try {
                    const parser = new RSSParser(data, this.model);

                    parsedData = parser.parse();
                } catch (e) {
                    parsedData = [];
                }
            }
            let hasNew = false;
            let createdNo = 0;
            let lastArticle = this.model.get('lastArticle');
            parsedData.forEach((item) => {
                const existingItem = items.get(item.id);
                if (!existingItem) {
                    hasNew = true;
                    items.create(item, {
                        sort: false
                    });
                    lastArticle = Math.max(lastArticle, item.date);
                    createdNo++;
                    return;
                }
                if (existingItem.get('deleted') === false && existingItem.get('content') !== item.content) {
                    existingItem.save({
                        content: item.content
                    });
                }
            });
            this.model.set('lastArticle', lastArticle);
            items.sort({
                silent: false
            });
            if (hasNew) {
                items.trigger('search');
                loader.itemsDownloaded = true;
                // remove old deleted content
                const fetchedIDs = parsedData.map((item) => {
                    return item.id;
                });
                if (fetchedIDs.length > 0) {
                    items.where({
                        sourceID: this.model.get('id'),
                        deleted: true
                    })
                        .forEach((item) => {
                            if (!fetchedIDs.includes(item.id)) {
                                item.destroy();
                            }
                        });
                }
            }

            const countAll = items.where({
                sourceID: this.model.get('id'),
                trashed: false
            })
                .length;
            const unreadCount = items.where({
                sourceID: this.model.get('id'),
                unread: true,
                trashed: false
            })
                .length;
            this.model.save({
                'count': unreadCount,
                'countAll': countAll,
                'lastUpdate': Date.now(),
                'hasNew': hasNew || this.model.get('hasNew')
            });
            info.set({
                allCountUnvisited: info.get('allCountUnvisited') + createdNo
            });
            if (this.model.get('faviconExpires') < parseInt(Math.round((new Date())
                .getTime() / 1000))) {
                return Favicon.checkFavicon(this.model)
                    // no finally available in Waterfox 56
                    .then((response) => {
                        this.model.save(response);
                        return this.onFeedProcessed();
                    }, () => {
                        return this.onFeedProcessed();
                    });
            }
            return this.onFeedProcessed();
        }

        onTimeout() {
            return this.onFeedProcessed(false);
        }

        onError() {
            return this.onFeedProcessed(false, this.request.status > 0);
        }

        removeOldItems() {
            if (!parseInt(this.model.get('autoremove'))) {
                return;
            }
            items.where({
                sourceID: this.model.get('id'),
                deleted: false,
                pinned: false
            })
                .forEach((item) => {
                    const date = item.get('dateCreated') || item.get('date');
                    const removalInMs = this.model.get('autoremove') * 24 * 60 * 60 * 1000;
                    if (date + removalInMs < Date.now()) {
                        item.markAsDeleted();
                    }
                });
        }

        onFeedProcessed(success = true, isOnline = true) {
            isOnline = isOnline && (typeof navigator.onLine !== 'undefined' ? navigator.onLine : true);
            if (success && isOnline) {
                this.removeOldItems(this.model);
            }
            const data = {
                isLoading: false,
                lastChecked: Date.now(),
                errorCount: success ? 0 : (isOnline ? this.model.get('errorCount') + 1 : this.model.get('errorCount'))
            };
            this.model.save(data);
            this.model.trigger('update', {
                ok: success || !isOnline
            });
            this.loader.sourceLoaded(this.model);
            // setTimeout(() => {
            this.downloadNext();
            // }, 100);
        }

        downloadNext() {
            this.model = this.loader.sourcesToLoad.shift();
            if (!this.model) {
                return this.loader.workerFinished(this);
            }
            if (loader.sourcesLoading.includes(this.model)) {
                // may happen if source is still loading after last attempt
                return this.downloadNext();
            }
            this.loader.sourcesLoading.push(this.model);
            if (settings.get('showSpinner')) {
                this.model.set('isLoading', true);
            }
            const proxy = this.model.get('proxyThroughFeedly');
            let url = this.model.get('url');
            if (proxy) {
                const i = items.where({
                    sourceID: sourceID
                });
                let date = 0;
                i.forEach((item) => {
                    if (item.date > date) {
                        date = item.date;
                    }
                });
                url = 'https://cloud.feedly.com/v3/streams/contents?streamId=feed%2F' + encodeURIComponent(url) + '&count=' + (1000) + ('&newerThan=' + (date));
            }
            this.request.open('GET', url);
            this.request.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
            this.request.setRequestHeader('Pragma', 'no-cache');
            this.request.setRequestHeader('X-Time-Stamp', Date.now());
            if (!proxy && (this.model.get('username') || this.model.get('password'))) {
                const username = this.model.get('username') || '';
                const password = this.model.getPass() || '';
                this.request.withCredentials = true;
                this.request.setRequestHeader('Authorization', 'Basic ' + btoa(`${username}:${password}`));
            }
            this.request.send();
        }
    };
});
