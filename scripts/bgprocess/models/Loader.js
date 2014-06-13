/**
 * @module BgProcess
 * @submodule models/Loader
 */
define(['backbone', 'modules/RSSParser', 'modules/Animation'], function (BB, RSSParser, animation) {

	function autoremoveItems(source) {
		/*
		var sourcesWithAutoRemove = sources.filter(function(source) {
			return source.get('autoremove') > 0;
		});
		sourcesWithAutoRemove.forEach(function(source) {
		*/

		if (!parseFloat(source.get('autoremove'))) return;

		items.where({ sourceID: source.get('id'), deleted: false, pinned: false }).forEach(function(item) {
			var date = item.get('dateCreated') || item.get('date');
			var removalInMs = source.get('autoremove') * 24 * 60 * 60 * 1000;
			if (date + removalInMs < Date.now() ) {
				item.markAsDeleted();
			}
		});
	}

	function download(sourcesToDownload) {
		if (!sourcesToDownload) return;
		if (!Array.isArray(sourcesToDownload)) {
			sourcesToDownload = [sourcesToDownload];
		}

		sourcesToDownload.forEach(downloadOne);
	}

	function downloadOne(model) {
		if (loader.sourceLoading == model || loader.sourcesToLoad.indexOf(model) >= 0) {
			return false;
		}

		if (model instanceof Folder) {
			download( sources.where({ folderID: model.id }) );
			return true;
		} else if (model instanceof Source) {
			loader.addSources(model);
			if (loader.get('loading') == false) downloadURL();
			return true;
		}

		return false;
	}

	function downloadAll(force) {

		if (loader.get('loading') == true) return;

		var sourcesArr = sources.toArray();

		if (!force) {
			sourcesArr = sourcesArr.filter(function(source) {
				if (source.get('updateEvery') == 0) return false;
				/****
					why !source.get('lastUpdate') ? .. I think I wanted !source.get('lastUpdate') => true not the other way around 
				****/
				if (!source.get('lastUpdate')) return true;
				if (/*!source.get('lastUpdate') ||*/ source.get('lastUpdate') > Date.now() - source.get('updateEvery') * 60 * 1000) {
					return false;
				}
				return true;
			});
		}

		if (sourcesArr.length) {
			loader.addSources(sourcesArr);
			downloadURL();
		}

	}

	function playNotificationSound() {

		var audio;
		if (!settings.get('useSound') || settings.get('useSound') == ':user') {
			audio = new Audio(settings.get('defaultSound'));
		} else if (settings.get('useSound') == ':none') {
			audio = false;
		} else {
			audio = new Audio('/sounds/' + settings.get('useSound') + '.ogg');
		}
		if (audio) {
			audio.volume = parseFloat(settings.get('soundVolume'));
			audio.play();
		}
		
	}

	function downloadStopped() {
		if (loader.itemsDownloaded && settings.get('soundNotifications')) {
			playNotificationSound();
		}

		loader.set('maxSources', 0);
		loader.set('loaded', 0);
		loader.set('loading', false);
		loader.sourceLoading = null;
		loader.currentRequest = null;
		loader.itemsDownloaded = false;
		animation.stop();
	}

	function downloadURL() {
		if (!loader.sourcesToLoad.length) {
			// IF DOWNLOADING FINISHED, DELETED ITEMS WITH DELETED SOURCE (should not really happen)
			var sourceIDs = sources.pluck('id');
			var foundSome = false;
			items.toArray().forEach(function(item) {
				if (sourceIDs.indexOf(item.get('sourceID')) == -1) {
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

		animation.start();
		loader.set('loading', true);
		var sourceToLoad = loader.sourceLoading = loader.sourcesToLoad.pop();

		autoremoveItems(sourceToLoad);

		var options = {
			url: sourceToLoad.get('url'),
			timeout: 20000,
			dataType: 'xml',
			success: function(r) {

				// parsedData step needed for debugging
				var parsedData = RSSParser.parse(r, sourceToLoad.get('id'));

				var hasNew = false;
				var createdNo = 0;
				parsedData.forEach(function(item) {
					var existingItem = items.get(item.id) || items.get(item.oldId);
					if (!existingItem) {
						hasNew = true;
						items.create(item, { sort: false });
						createdNo++;
					} else if (existingItem.get('deleted') == false && existingItem.get('content') != item.content) {
						existingItem.save({
							content: item.content
						});
					}
				});

				items.sort({ silent: true });
				if (hasNew) {
					items.trigger('render-screen');
					loader.itemsDownloaded = true;
				}

				// remove old deleted content
				var fetchedIDs = _.pluck(parsedData, 'id');
				var fetchedOldIDs = _.pluck(parsedData, 'oldId');
				items.where({
					sourceID: sourceToLoad.get('id'),
					deleted: true
				}).forEach(function(item) {
					if (fetchedIDs.indexOf(item.id) == -1 && fetchedOldIDs.indexOf(item.id) == -1) {
						item.destroy();
					}
				});

				// tip to optimize: var count = items.where.call(countAll, {unread: true }).length
				var countAll = items.where({ sourceID: sourceToLoad.get('id'), trashed: false }).length;
				var count = items.where({ sourceID: sourceToLoad.get('id'),	unread: true, trashed: false }).length;

				sourceToLoad.save({
					'count': count,
					'countAll': countAll,
					'lastUpdate': Date.now(),
					'hasNew': hasNew || sourceToLoad.get('hasNew')
				});

				info.set({
					allCountUnvisited: info.get('allCountUnvisited') + createdNo
				});

				sourceToLoad.trigger('update', { ok: true });
				
			},
			error: function() {
				console.log('Failed load RSS: ' + sourceToLoad.get('url'));

				sourceToLoad.trigger('update', { ok: false });
			},
			complete: function() {
				loader.set('loaded', loader.get('loaded') + 1);

				// reset alarm to make sure next call isn't too soon + to make sure alarm acutaly exists (it doesn't after import)
				sourceToLoad.trigger('reset-alarm', sourceToLoad);
				sourceToLoad.set('isLoading', false);

				downloadURL();
			},
			beforeSend: function(xhr) {
				xhr.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				xhr.setRequestHeader('Pragma', 'no-cache');
				/* Removed because "http://www.f5haber.com/rss/teknoloji_haber.xml" doesn't like it
				   xhr.setRequestHeader('If-Modified-Since', 'Tue, 1 Jan 1991 00:00:00 GMT');
				 */
				xhr.setRequestHeader('X-Time-Stamp', Date.now());
			}
		};

		if (sourceToLoad.get('username') || sourceToLoad.get('password')) {
			options.username = sourceToLoad.get('username') || '';
			options.password = sourceToLoad.getPass() || '';
		}

		if (settings.get('showSpinner')) {
			sourceToLoad.set('isLoading', true);
		}
		loader.currentRequest = $.ajax(options);
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
		itemsDownloaded: false,
		sourcesToLoad: [],
		sourceLoading: null,
		addSources: function(s) {
			if (s instanceof Source) {
				this.sourcesToLoad.push(s);
				this.set('maxSources', this.get('maxSources') + 1);
			} else if (Array.isArray(s)) {
				this.sourcesToLoad = this.sourcesToLoad.concat(s);
				this.set('maxSources', this.get('maxSources') + s.length);
			}
		},
		abortDownloading: function() {
			loader.currentRequest.abort();
			this.sourcesToLoad = [];
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