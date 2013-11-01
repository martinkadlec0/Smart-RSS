/**
 * Smart RSS extension
 * COPYRIGHT by Martin Kadlec
 * This extension is meant for Opera only. Do not reuse any of the code for any other browser.
 * You are allowed to do any changes for personal use in Opera Browser.
 * Ask before publishing modified versions.
 * Do not upload any modified version of this extension to addons.opera.com!
 */



/**
 * Update animations
 */

var animation = {
 	i: 2,
 	interval: null,
 	update: function() {
 		chrome.browserAction.setIcon({ path: '/images/reload_anim_' + this.i + '.png' });
 		this.i++;
		if (this.i > 4) this.i = 1;
 	},
 	stop: function() {
 		clearInterval(this.interval);
 		this.interval = null;
 		this.i = 1;
 		handleIconChange();
 	},
 	start: function() {
 		if (this.interval) return;
 		var that = this;
 		this.interval = setInterval(function() {
 			that.update();
 		}, 400);
		this.update();
 	}
};
animation.start();



/**
 * IndexedDB preps.
 */

Backbone.LocalStorage.prepare = function(db) {
	if (!db.objectStoreNames.contains('settings-backbone'))
		db.createObjectStore('settings-backbone', { keyPath: 'id' });

	if (!db.objectStoreNames.contains('items-backbone'))
		db.createObjectStore('items-backbone',    { keyPath: 'id' });

	if (!db.objectStoreNames.contains('sources-backbone'))
		db.createObjectStore('sources-backbone',  { keyPath: 'id' });

	if (!db.objectStoreNames.contains('folders-backbone'))
		db.createObjectStore('folders-backbone', { keyPath: 'id' });

	/*if (!db.objectStoreNames.contains('info-backbone'))
		db.createObjectStore('info-backbone', { keyPath: 'id' });*/

}
Backbone.LocalStorage.version = 3;


/**
 * Localization
 */

function translate(str) {
	return str.replace(/\{\{(\w+)\}\}/gm, function(all, str) {
		return lang.c[str];
	});
}


/*$.ajaxSetup({
	cache: false
});*/

var appStarted = new (jQuery.Deferred)();
var settingsLoaded = new (jQuery.Deferred)();

/**
 * Items
 */

var settings = new(Backbone.Model.extend({
	defaults: {
		id: 'settings-id',
		lang: 'en', // or cs,sk,tr,de
		dateType: 'normal', // normal = DD.MM.YYYY, ISO = YYYY-MM-DD, US = MM/DD/YYYY
		layout: 'horizontal', // or vertical
		lines: 'auto', // one-line, two-lines
		posA: '250,*',
		posB: '350,*',
		posC: '50%,*',
		sortOrder: 'desc',
		icon: 'orange',
		readOnVisit: false,
		askOnOpening: true,
		panelToggled: true,
		enablePanelToggle: false,
		fullDate: false,
		hoursFormat: '24h',
		articleFontSize: '100',
		uiFontSize: '100',
		disableDateGroups: false,
		thickFrameBorders: false,
		badgeMode: 'disabled'
	},
	localStorage: new Backbone.LocalStorage('settings-backbone')
}));

var info = new(Backbone.Model.extend({
	defaults: {
		id: 'info-id',
		allCountUnread: 0,
		allCountTotal: 0,
		allCountUnvisited: 0,
		trashCountUnread: 0,
		trashCountTotal: 0
	},
	badgeTimeout: null,
	autoSetData: function() {
		this.set({
			allCountUnread:   items.where({ trashed: false, deleted: false, unread: true }).length,
			allCountTotal:    items.where({ trashed: false, deleted: false }).length,
			allCountUnvisited:    items.where({ visited: false, trashed: false }).length,
			trashCountUnread: items.where({ trashed: true,  deleted: false, unread: true }).length,
			trashCountTotal:  items.where({ trashed: true,  deleted: false }).length
		});

		sources.forEach(function(source) {
			source.set({
				count: items.where({ trashed: false, sourceID: source.id, unread: true }).length,
				countAll: items.where({ trashed: false, sourceID: source.id }).length
			});
		});

		folders.forEach(function(folder) {
			var count = countAll = 0;
			sources.where({ folderID: folder.id }).forEach(function(source) {
				count += source.get('count');
				countAll += source.get('countAll');
			});
			folder.set({ count: count, countAll: countAll });
		});
	}
}));



var Source = Backbone.Model.extend({
	defaults: {
		title: '',
		url: 'about:blank',
		updateEvery: 180,
		lastUpdate: 0,
		count: 0, // unread
		countAll: 0,
		username: '',
		password: '',
		hasNew: false
	}
});

var sourceJoker = new Source({ id: 'joker' });

var sources = new(Backbone.Collection.extend({
	model: Source,
	localStorage: new Backbone.LocalStorage('sources-backbone'),
	comparator: function(a, b) {
		return (a.get('title') || '').trim() < (b.get('title') || '').trim() ? -1 : 1;
	}
}));

var Item = Backbone.Model.extend({
	defaults: {
		title: '<no title>',
		author: '<no author>',
		url: 'opera:blank',
		date: 0,
		content: 'No content loaded.',
		sourceID: -1,
		unread: true,
		visited: false,
		deleted: false,
		trashed: false,
		pinned: false
	},
	markAsDeleted: function() {
		this.save({
			trashed: true,
			deleted: true,
			visited: true,
			unread: false,
			'pinned': false,
			'content': '',
			'author': '',
			'title': ''
		});
	},
	_source: null,
	getSource: function() {
		if (!this._source) {
			this._source = sources.findWhere({ id: this.get('sourceID')	}) || sourceJoker;
		}
		return this._source;
	},
	query: function(o) {
		if (!o) return true;
		for (i in o) {
			if (!o.hasOwnProperty(i)) continue;
			if (this.get(i) != o[i]) return false;
		}
		return true;
	}
});

var items = new(Backbone.Collection.extend({
	model: Item,
	batch: false,
	localStorage: new Backbone.LocalStorage('items-backbone'),
	comparator: function(a, b) {
		var val = a.get('date') <= b.get('date') ? 1 : -1;
		if (settings.get('sortOrder') == 'asc') {
			val = -val;
		}
		return val;
	},
	initialize: function() {
		settings.on('change:sortOrder', this.sort, this);
	}
}));


/**
 *  Folders
 */

var Folder = Backbone.Model.extend({
	defaults: {
		title: '<no title>',
		opened: false,
		count: 0, // unread
		countAll: 0
	}
});

var folders = new (Backbone.Collection.extend({
	model: Folder,
	localStorage: new Backbone.LocalStorage('folders-backbone'),
 	comparator: function(a, b) {
		return (a.get('title') || '').trim() < (b.get('title') || '').trim() ? -1 : 1;
	}
}));

var handleAllCountChange = function(model) {
	if (settings.get('badgeMode') == 'disabled') {
		if (model == settings) chrome.browserAction.setBadgeText({ text: '' });
		return;
	}

	if (model == settings) {
		if (settings.get('badgeMode') == 'unread') {
			info.off('change:allCountUnvisited', handleAllCountChange);
			info.on('change:allCountUnread', handleAllCountChange);
		} else {
			info.off('change:allCountUnread', handleAllCountChange);
			info.on('change:allCountUnvisited', handleAllCountChange);
		}
	}
	if (info.badgeTimeout) return;

	info.badgeTimeout = setTimeout(function() {
		if (settings.get('badgeMode') == 'unread') {
			var val = info.get('allCountUnread') > 99 ? '+' : info.get('allCountUnread');
		} else {
			var val = info.get('allCountUnvisited') > 99 ? '+' : info.get('allCountUnvisited');
		}
		
		val = val <= 0 ? '' : String(val);
		chrome.browserAction.setBadgeText({ text: val });
		chrome.browserAction.setBadgeBackgroundColor({ color: '#777' });
		info.badgeTimeout = null;
	});
}


/**
 * Non-db models & collections
 */

 var loader = new(Backbone.Model.extend({
 	defaults: {
 		maxSources: 0,
 		loaded: 0,
 		loading: false
 	},
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
 	}
 }));

var log = Backbone.Model.extend({
	defaults: {
		message: '<no message>'
	}
});

var logs = new(Backbone.Collection.extend({
	model: log,
	initialze: function() {
		var that = this;
	}
}));


window.onerror = function(a, b, c) {
	var file = b.replace(/chrome\-extension:\/\/[^\/]+\//, '');
	var msg = a.toString() + ' (Line: ' + c.toString() + ', File: ' + file + ')';
	logs.add({
		message: msg
	});
}

/**
 * RSS Downloader
 */
$.support.cors = true;


/**
 * Fetch all
 */

function fetchOne(arr, allDef) {
	if (!arr.length) {
		allDef.resolve();
		return;
	}
	var one = arr.shift();
	one.always(function() {
		fetchOne(arr, allDef);
	});
}

function fetchAll() {
	var allDef = new (jQuery.Deferred)();
	var deferreds = [];
	var settingsDef;
	deferreds.push(  folders.fetch({ silent: true }) );
	deferreds.push(  sources.fetch({ silent: true }) );
	deferreds.push(    items.fetch({ silent: true }) );
	deferreds.push( settingsDef = settings.fetch({ silent: true }) );

	fetchOne(deferreds, allDef)

	settingsDef.always(function() {
		settingsLoaded.resolve();
	});
	

	return allDef.promise();
}


function handleIconChange() {
	if (animation.interval) return;
	if ( sources.findWhere({ hasNew: true }) ) {
		chrome.browserAction.setIcon({
			path: '/images/icon19-' + settings.get('icon') + '.png'
		});
	} else {
		chrome.browserAction.setIcon({
			path: '/images/icon19.png'
		});
	}
}



/**
 * Init
 */


$(function() {
fetchAll().always(function() {

	/**
	 * Load counters for specials
	 */

	info.autoSetData();

	/**
	 * Set events
	 */

	sources.on('add', function(source) {
		if (source.get('updateEvery') > 0) {
			chrome.alarms.create('source-' + source.get('id'), {
				delayInMinutes: source.get('updateEvery'),
				periodInMinutes: source.get('updateEvery')	
			});
		}
		downloadOne(source);
	});

	sources.on('change:updateEvery reset-alarm', function(source) {
		if (source.get('updateEvery') > 0) {
			chrome.alarms.create('source-' + source.get('id'), {
				delayInMinutes: source.get('updateEvery'),
				periodInMinutes: source.get('updateEvery')
			});
		} else {
			chrome.alarms.clear('source-' + source.get('id'));
		}
	});

	chrome.alarms.onAlarm.addListener(function(alarm) {
		var sourceID = alarm.name.replace('source-', '');
		if (sourceID) {
			var source = sources.findWhere({
				id: sourceID
			});
			if (source) {
				if (!downloadOne(source)) {
					setTimeout(downloadOne, 30000, source);
				}
			} else {
				console.log('No source with ID: ' + sourceID);
				chrome.alarms.clear(alarm.name);
				debugger;
			}

		}

	});

	sources.on('change:url', function(source) {
		downloadOne(source);
	});

	sources.on('change:title', function(source) {
		// if url was changed as well change:url listener will download the source
		if (!source.get('title')) {
			downloadOne(source);
		}

		sources.sort();
	});

	sources.on('change:hasNew', handleIconChange);
	settings.on('change:icon', handleIconChange);

	sources.on('destroy', function(source) {
		var trashUnread = 0;
		var trashAll = 0;
		var allUnvisited = 0;
		items.where({ sourceID: source.get('id') }).forEach(function(item) {
			if (!item.get('deleted')) {
				if (!item.get('visited')) allUnvisited++;
				if (item.get('trashed')) trashAll++;
				if (item.get('trashed') && item.get('unread')) trashUnread++;
			}
			item.destroy({ noFocus: true });
		});

		/**
		 * probably not neccesary because I  save all the removed items to batch and then 
		 * in next frame I remove tehm at once and all handleScroll anyway
		 */
		items.trigger('render-screen');
		
		

		info.set({
			allCountUnread: info.get('allCountUnread') - source.get('count'),
			allCountTotal: info.get('allCountTotal') - source.get('countAll'),
			allCountUnvisited: info.get('allCountUnvisited') - allUnvisited,
			trashCountUnread: info.get('trashCountUnread') - trashUnread,
			trashCountTotal: info.get('trashCountTotal') - trashAll
		});

		if (source.get('folderID')) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (folder) {
				folder.set({ 
					count: folder.get('count') - source.get('count'),
					countAll: folder.get('countAll') - source.get('countAll')
				});
			}
		}

		if (source.get('hasNew')) {
			handleIconChange();
		}

		try {
			chrome.alarms.clear('source-' + source.get('id'));
		} catch (e) {
			console.log('Alarm error: ' + e);
		}
	});

	items.on('change:unread', function(model) {
		var source = model.getSource();
		if (!model.previous('trashed') && source != sourceJoker) {
			if (model.get('unread') == true) {
				source.set({
					'count': source.get('count') + 1
				});
			} else {
				source.set({
					'count': source.get('count') - 1
				});

				if (source.get('count') == 0 && source.get('hasNew') == true) {
					source.save('hasNew', false);
				}
			}
		} else if (!model.get('deleted') && source != sourceJoker) {
			info.set({
				trashCountUnread: info.get('trashCountUnread') + (model.get('unread') ? 1 : -1)
			});
		}
	});

	items.on('change:trashed', function(model) {
		var source = model.getSource();
		if (source != sourceJoker && model.get('unread') == true) {
			if (model.get('trashed') == true) {
				source.set({
					'count': source.get('count') - 1,
					'countAll': source.get('countAll') - 1
				});

				if (source.get('count') == 0 && source.get('hasNew') == true) {
					source.save('hasNew', false);
				}

			} else {
				source.set({
					'count': source.get('count') + 1,
					'countAll': source.get('countAll') + 1
				});
			}

			if (!model.get('deleted')) {
				info.set({
					'trashCountTotal': info.get('trashCountTotal') + (model.get('trashed') ? 1 : -1),
					'trashCountUnread': info.get('trashCountUnread') + (model.get('trashed') ? 1 : -1)
				});
			}
		} else if (source != sourceJoker) {
			source.set({ 
				'countAll': source.get('countAll') + (model.get('trashed') ? - 1 : 1) 
			});


			if (!model.get('deleted')) {
				info.set({ 
					'trashCountTotal': info.get('trashCountTotal') + (model.get('trashed') ? 1 : -1) 
				});
			}
		}
	});
	

	items.on('change:deleted', function(model) {
		if (model.previous('trashed') == true) {
			info.set({
				'trashCountTotal': info.get('trashCountTotal') - 1,
				'trashCountUnread': !model.previous('unread') ?  info.get('trashCountUnread') : info.get('trashCountUnread') - 1
			});
		}
	});

	items.on('change:visited', function(model) {
		info.set({
			'allCountUnvisited':  info.get('allCountUnvisited') + (model.get('visited') ? -1 : 1)
		});
	});


	/**
	 * Folder counts
	 */

	sources.on('change:count', function(source) {
		// SPECIALS
		info.set({ 
			'allCountUnread': info.get('allCountUnread') + source.get('count') - source.previous('count')
		});

		// FOLDER
		if (!(source.get('folderID'))) return;

		var folder = folders.findWhere({ id: source.get('folderID') });
		if (!folder) return;

		folder.set({ count: folder.get('count') + source.get('count') - source.previous('count') });
	});

	sources.on('change:countAll', function(source) {
		// SPECIALS
		info.set({ 
			'allCountTotal': info.get('allCountTotal') + source.get('countAll') - source.previous('countAll')
		});

		// FOLDER
		if (!(source.get('folderID'))) return;

		var folder = folders.findWhere({ id: source.get('folderID') });
		if (!folder) return;

		folder.set({ countAll: folder.get('countAll') + source.get('countAll') - source.previous('countAll') });
	});

	sources.on('change:folderID', function(source) {
		if (source.get('folderID')) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (!folder) return;

			folder.set({ 
				count: folder.get('count') + source.get('count'),
				countAll: folder.get('countAll') + source.get('countAll')
			});
		} 

		if (source.previous('folderID')) {
			var folder = folders.findWhere({ id: source.previous('folderID') });
			if (!folder) return;

			folder.set({ 
				count: Math.max(folder.get('count') - source.get('count'), 0),
				countAll: Math.max(folder.get('countAll') - source.get('countAll'), 0)
			});
		}
	});


	settings.on('change:badgeMode', handleAllCountChange);
	if (settings.get('badgeMode') == 'unread') {
		info.on('change:allCountUnread', handleAllCountChange);
	} else if (settings.get('badgeMode') == 'unvisited') {
		info.on('change:allCountUnvisited', handleAllCountChange);	
	}
	handleAllCountChange();

	/**
	 * Init
	 */


	setTimeout(downloadAll, 30000);
	appStarted.resolve();

	/**
	 * Set icon
	 */

	animation.stop();


	/**
	 * onclick:button -> open RSS
	 */
	chrome.browserAction.onClicked.addListener(function(tab) {
		openRSS(true);
	});

});
});

function openRSS(closeIfActive) {
	var url = chrome.extension.getURL('rss_all.html');
	chrome.tabs.query({
		url: url
	}, function(tabs) {
		if (tabs[0]) {
			if (tabs[0].active && closeIfActive) {
				chrome.tabs.remove(tabs[0].id);
			} else {
				chrome.tabs.update(tabs[0].id, {
					active: true
				});
			}
		} else {
			chrome.tabs.create({
				'url': url
			}, function(tab) {});
		}
	});
}


/**
 * Downlaoding
 */

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
			if (!source.get('lastUpdate') || source.get('lastUpdate') > Date.now() - source.get('updateEvery') * 60 * 1000) {
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

function downloadURL(urls, cb) {
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

		loader.set('maxSources', 0);
		loader.set('loaded', 0);
		loader.set('loading', false);
		loader.sourceLoading = null;
		animation.stop();

		return;
	}

	animation.start();
	loader.set('loading', true);
	var sourceToLoad = loader.sourceLoading = loader.sourcesToLoad.pop();

	var options = {
		url: sourceToLoad.get('url'),
		timeout: 20000,
		dataType: 'xml',
		success: function(r) {

			// parsedData step needed for debugging
			var parsedData = parseRSS(r, sourceToLoad.get('id'));

			var hasNew = false;
			var createdNo = 0;
			parsedData.forEach(function(item) {
				var existingItem = items.get(item.id);
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
			if (hasNew) items.trigger('render-screen');

			// remove old deleted content
			var fetchedIDs = _.pluck(parsedData, 'id');
			items.where({
				sourceID: sourceToLoad.get('id'),
				deleted: true
			}).forEach(function(item) {
				if (fetchedIDs.indexOf(item.id) == -1) {
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
		error: function(e) {
			console.log('Failed load RSS: ' + sourceToLoad.get('url'));

			sourceToLoad.trigger('update', { ok: false });
		},
		complete: function() {
			loader.set('loaded', loader.get('loaded') + 1);

			// reset alarm to make sure next call isn't too soon + to make sure alarm acutaly exists (it doesn't after import)
			sourceToLoad.trigger('reset-alarm', sourceToLoad);


			downloadURL();
		},
		beforeSend: function(xhr) {
			xhr.setRequestHeader('Cache-Control', 'no-cache');
			xhr.setRequestHeader('Pragma', 'no-cache');
			xhr.setRequestHeader('If-Modified-Since', 'Tue, 1 Jan 1991 00:00:00 GMT');
			xhr.setRequestHeader('X-Time-Stamp', Date.now());
		}
	};

	if (sourceToLoad.get('username') || sourceToLoad.get('password')) {
		options.username = sourceToLoad.get('username') || '';
		options.password = sourceToLoad.get('password') || '';
	}


	$.ajax(options);
}


/**
 * RSS Parser
 */

function parseRSS(xml, sourceID) {
	var items = [];


	var nodes = xml.querySelectorAll('item');
	if (!nodes.length) {
		nodes = xml.querySelectorAll('entry');
	}

	var title = getFeedTitle(xml);
	var source = sources.findWhere({
		id: sourceID
	});
	if (title && (source.get('title') == source.get('url') || !source.get('title'))) {
		source.save('title', title);
	}

	/**
	 * TTL check
	 */
	var ttl = xml.querySelector('channel > ttl, feed > ttl, rss > ttl');
	if (ttl && source.get('lastUpdate') == 0) {
		ttl = parseInt(ttl.textContent);
		var vals = [300, 600, 1440, 10080];
		if (ttl > 10080) {
			source.save({ updateEvery: 10080 });
		} else if (ttl > 180) {
			for (var i=0; i<vals.length; i++) {
				if (ttl <= vals[i]) {
					ttl = vals[i];
					break;
				}
			}
			source.save({ updateEvery: ttl });
		}
	}
	/* END: ttl check */

	[].forEach.call(nodes, function(node) {
		items.push({
			title: rssGetTitle(node),
			url: rssGetLink(node),
			date: rssGetDate(node),
			author: rssGetAuthor(node, title),
			content: rssGetContent(node),
			sourceID: sourceID,
			unread: true,
			deleted: false,
			trashed: false,
			visited: false,
			pinned: false
		});

		var last = items[items.length - 1];
		last.id = CryptoJS.MD5(last.sourceID + last.title + last.date).toString();
		if (last.date == '0') last.date = Date.now();
	});


	return items;
}

function rssGetLink(node) {
	var link = node.querySelector('link[rel="alternate"]');
	if (!link) link = node.querySelector('link[type="text/html"]');
	if (!link) link = node.querySelector('link');

	if (link) {
		return link.textContent || link.getAttribute('href');
	} 

	return false;
}

function getFeedTitle(xml) {
	var title = xml.querySelector('channel > title, feed > title, rss > title');
	if (!title || !(title.textContent).trim()) {
		title = xml.querySelector('channel > description, feed > description, rss > description');
	}

	if (!title || !(title.textContent).trim()) {
		title = xml.querySelector('channel > description, feed > description, rss > description');
	}

	if (!title || !(title.textContent).trim()) {
		title = xml.querySelector('channel > link, feed > link, rss > link');
	}

	return title && title.textContent ? title.textContent.trim() || 'rss' : 'rss';
}

function rssGetDate(node) {
	var pubDate = node.querySelector('pubDate, published');
	if (pubDate) {
		return (new Date(pubDate.textContent)).getTime();
	}

	pubDate = node.querySelector('date');
	if (pubDate) {
		return (new Date(pubDate.textContent)).getTime();
	}

	pubDate = node.querySelector('lastBuildDate, updated, update');

	if (pubDate) {
		return (new Date(pubDate.textContent)).getTime();
	}
	return '0';
}

function rssGetAuthor(node, title) {
	var creator = node.querySelector('creator, author > name');
	if (creator) {
		creator = creator.textContent.trim();
	} 

	if (!creator) {
		creator = node.querySelector('author');
		if (creator) {
			creator = creator.textContent.trim();
		}
	} 

	if (!creator && title && title.length > 0) {
		creator = title;
	}

	if (creator) {
		if (/^\S+@\S+\.\S+\s+\(.+\)$/.test(creator)) {
			creator = creator.replace(/^\S+@\S+\.\S+\s+\((.+)\)$/, '$1');
		}
		creator = creator.replace(/\s*\(\)\s*$/, '');
		return creator;
	}

	return 'no author';
}

function rssGetTitle(node) {
	return node.querySelector('title') ? node.querySelector('title').textContent : '<no title>;';
}

function rssGetContent(node) {
	var desc = node.querySelector('encoded');
	if (desc) return desc.textContent;

	desc = node.querySelector('description');
	if (desc) return desc.textContent;

	desc = node.querySelector('summary');
	if (desc) return desc.textContent;

	desc = node.querySelector('content');
	if (desc) return desc.textContent;

	return '&nbsp;'
}


/**
 * Messages
 */

chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
	// if.sender.id != blahblah -> return;
	if (!message.hasOwnProperty('action')) {
		return;
	}

	if (message.action == 'new-rss' && message.value) {
		message.value = message.value.replace(/^feed:/i, 'http:');
		sources.create({
			title: message.value,
			url: message.value,
			updateEvery: 180
		}, { wait: true });

		openRSS();

	}
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.action == 'get-tab-id') {
		sendResponse({
			action: 'response-tab-id',
			value: sender.tab.id
		});
	}
});

chrome.runtime.onConnect.addListener(function(port) {
	port.onDisconnect.addListener(function(port) {
		sources.trigger('clear-events', port.sender.tab.id);
	});
});


/**
 * Date parser
 */

var formatDate = (function() {
	var that;
	var addZero = function(num) {
		if (num < 10) num = '0' + num;
		return num;
	};
	var na = function(n, z) {
		return n % z;
	};
	var getDOY = function() {
		var dt = new Date(that);
		dt.setHours(0, 0, 0);
		var onejan = new Date(dt.getFullYear(), 0, 1);
		return Math.ceil((dt - onejan) / 86400000);
	};
	var getWOY = function() {
		var dt = new Date(that);
		dt.setHours(0, 0, 0);
		dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
		var onejan = new Date(dt.getFullYear(), 0, 1);
		return Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
	};
	var dateVal = function(all, found) {
		switch (found) {
			case 'DD':
				return addZero(that.getDate());
			case 'D':
				return that.getDate();
			case 'MM':
				return addZero(that.getMonth() + 1);
			case 'M':
				return that.getMonth() + 1;
			case 'YYYY':
				return that.getFullYear();
			case 'YY':
				return that.getFullYear().toString().substr(2, 2);
			case 'hh':
				return addZero(that.getHours());
			case 'h':
				return that.getHours();
			case 'HH':
				return addZero(na(that.getHours(), 12));
			case 'H':
				return na(that.getHours(), 12);
			case 'mm':
				return addZero(that.getMinutes());
			case 'm':
				return that.getMinutes();
			case 'ss':
				return addZero(that.getSeconds());
			case 's':
				return that.getSeconds();
			case 'u':
				return that.getMilliseconds();
			case 'U':
				return that.getTime();
			case 'T':
				return that.getTime() - that.getTimezoneOffset() * 60000;
			case 'W':
				return that.getDay();
			case 'y':
				return getDOY();
			case 'w':
				return getWOY();
			case 'G':
				return that.getTimezoneOffset();
			case 'a':
				return that.getHours() > 12 ? 'PM' : 'AM';
			default:
				return '';
		}
	};
	return function(date, str) {
		if (!(date instanceof Date)) date = new Date(date);
		that = date;
		str = str.replace(/(DD|D|MM|M|YYYY|YY|hh|h|HH|H|mm|m|ss|s|u|U|W|y|w|G|a|T)/g, dateVal);
		return str;
	};
}());