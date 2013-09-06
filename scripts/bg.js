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
 * matchesselector might be important because of ContextMenu views .. not sure tho.
 */
if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}


/**
 * Localization
 */

function translate(str) {
	return str.replace(/\{\{(\w+)\}\}/gm, function(all, str) {
		return lang.c[str];
	});
}

var sourceIdIndex = localStorage.getItem('sourceIdIndex') || 1;
var folderIdIndex = localStorage.getItem('folderIdIndex') || 1;

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
		thickFrameBorders: false
	},
	localStorage: new Backbone.LocalStorage('settings-backbone')
}));

var info = new(Backbone.Model.extend({
	defaults: {
		id: 'info-id',
		allCountUnread: 0,
		allCountTotal: 0,
		trashCountUnread: 0,
		trashCountTotal: 0
	},
	autoSetData: function() {
		this.set({
			allCountUnread:   items.where({ trashed: false, deleted: false, unread: true }).length,
			allCountTotal:    items.where({ trashed: false, deleted: false }).length,
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
		id: null,
		title: '<no title>',
		url: 'rss.rss',
		updateEvery: 0,
		lastUpdate: 0,
		count: 0, // unread
		countAll: 0,
		username: '',
		password: '',
		hasNew: false
	}
});

var sourceJoker = new Source();

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
	}
});

var items = new(Backbone.Collection.extend({
	model: Item,
	batch: false,
	localStorage: new Backbone.LocalStorage('items-backbone'),
	comparator: function(a, b) {
		var val = a.get('date') < b.get('date') ? 1 : -1;
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
		id: -1,
		title: '<no title',
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
	var msg = a.toString() + ' (Line: ' + c.toString() + ')';
	logs.add({
		message: msg
	});
}


/**
 * Conext Menu
 */

var MenuItem = Backbone.Model.extend({
	defaults: {
		'title': '<no title>',
		'action': null
	}
});

var MenuCollection = Backbone.Collection.extend({
	model: MenuItem
});

var MenuItemView = Backbone.View.extend({
	tagName: 'div',
	className: 'context-menu-item',
	contextMenu: null,
	events: {
		'click': 'handleClick'
	},
	initialize: function() {
		if (this.model.id) {
			this.el.id = this.model.id;
		}
	},
	render: function() {
		if (this.model.get('icon')) {
			this.$el.css('background', 'url(/images/' + this.model.get('icon') + ') no-repeat left center');
		}
		this.$el.html(this.model.get('title'));
		return this;
	},
	handleClick: function(e) {
		var action = this.model.get('action');
		if (action && typeof action == 'function') {
			action(e);
			this.contextMenu.hide();
		}
	}
});

var ContextMenu = Backbone.View.extend({
	tagName: 'div',
	className: 'context-menu',
	menuCollection: null,
	addItem: function(item) {
		var v = new MenuItemView({
			model: item
		});
		v.contextMenu = this;
		this.$el.append(v.render().$el);
	},
	addItems: function(items) {
		items.forEach(function(item) {
			this.addItem(item);
		}, this);
	},
	render: function() {
		return this;
	},
	hide: function() {
		if (this.$el.css('display') == 'block') {
			this.$el.css('display', 'none');
		}
	}
});


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

/**
 * Init
 */


$(function() {
fetchAll().always(function() {

	/**
	 * Set icon
	 */

	if (sources.findWhere({ hasNew: true })) {
		chrome.browserAction.setIcon({ path: '/images/icon19-' + settings.get('icon') + '.png' 	});
	}

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

	sources.on('change:updateEvery', function(source) {
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
		var sourceID = parseInt(alarm.name.replace('source-', ''));
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
		if (!source.get('title') && !source.changed.url) {
			downloadOne(source);
		}
	});

	function handleIconChange() {
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

	sources.on('change:hasNew', handleIconChange);
	settings.on('change:icon', handleIconChange);

	sources.on('destroy', function(source) {
		var trashUnread = 0;
		var trashAll = 0;
		items.where({ sourceID: source.get('id') }).forEach(function(item) {
			if (!item.get('deleted')) {
				if (item.get('trashed')) trashAll++;
				if (item.get('trashed') && item.get('unread')) trashUnread++;
			}
			item.destroy({
				noFocus: true
			});
		});

		items.trigger('render-screen');
		
		try {
			chrome.alarms.clear('source-' + source.get('id'));
		} catch (e) {
			console.log('Alarm error: ' + e);
		}

		info.set({
			allCountUnread: info.get('allCountUnread') - source.get('count'),
			allCountTotal: info.get('allCountTotal') - source.get('countAll'),
			trashCountUnread: info.get('trashCountUnread') - trashUnread,
			trashCountTotal: info.get('trashCountTotal') - trashAll
		});

		if (source.get('folderID') > 0) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (!folder) return;

			folder.set({ 
				count: folder.get('count') - source.get('count'),
				countAll: folder.get('countAll') - source.get('countAll')
			});
		}

		if (source.get('hasNew')) {
			handleIconChange();
		}
	});

	items.on('change:unread', function(model) {
		var source = model.getSource();
		if (!model.get('trashed') && source) {
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
		} else if (!model.get('deleted') && source) {
			info.set({
				trashCountUnread: info.get('trashCountUnread') + (model.get('unread') ? 1 : -1)
			});
		}
	});

	items.on('change:trashed', function(model) {
		var source = model.getSource();
		if (source && model.get('unread') == true) {
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
		} else if (source) {
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
	/**
	 * Folder counts
	 */

	sources.on('change:count', function(source) {
		// SPECIALS
		info.set({ 
			'allCountUnread': info.get('allCountUnread') + source.get('count') - source.previous('count')
		});

		// FOLDER
		if (!(source.get('folderID') > 0)) return;

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
		if (!(source.get('folderID') > 0)) return;

		var folder = folders.findWhere({ id: source.get('folderID') });
		if (!folder) return;

		folder.set({ countAll: folder.get('countAll') + source.get('countAll') - source.previous('countAll') });
	});

	sources.on('change:folderID', function(source) {
		if (source.get('folderID') > 0) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (!folder) return;

			folder.set({ 
				count: folder.get('count') + source.get('count'),
				countAll: folder.get('countAll') + source.get('countAll')
			});
		} else if (source.previous('folderID') > 0) {
			var folder = folders.findWhere({ id: source.previous('folderID') });
			if (!folder) return;

			folder.set({ 
				count: Math.max(folder.get('count') - source.get('count'), 0),
				countAll: Math.max(folder.get('countAll') - source.get('countAll'), 0)
			});
		}
	});

	/**
	 * Init
	 */


	setTimeout(downloadAll, 30000);
	appStarted.resolve();

	/**
	 * onclick:button -> open RSS
	 */
	chrome.browserAction.onClicked.addListener(function(tab) {
		openRSS(true);
	});

});
});

function openRSS(closeIfActive) {
	var url = chrome.extension.getURL('rss.html');
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

function downloadOne(source) {
	if (loader.sourceLoading == source || loader.sourcesToLoad.indexOf(source) >= 0) {
		return false;
	}

	loader.addSources(source);
	if (loader.get('loading') == false) downloadURL();

	return true;
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
		items.where({
			deleted: true
		}).forEach(function(item) {
			if (sourceIDs.indexOf(item.get('sourceID')) == -1) {
				console.log('DELETING OLD CONTENT BECAUSE OF MISSING SOURCE');
				item.destroy();
			}
		});

		loader.set('maxSources', 0);
		loader.set('loaded', 0);
		loader.set('loading', false);
		loader.sourceLoading = null;

		return;
	}

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
			parsedData.forEach(function(item) {
				var existingItem = items.get(item.id);
				if (!existingItem) {
					hasNew = true;
					items.create(item, { sort: false });
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
			
		},
		error: function(e) {
			console.log('Failed load RSS: ' + sourceToLoad.get('url'));
		},
		complete: function() {
			loader.set('loaded', loader.get('loaded') + 1);

			// reset alarm to make sure next call isn't too soon + to make sure alarm acutaly exists (it doesn't after import)
			chrome.alarms.create('source-' + sourceToLoad.get('id'), {
				delayInMinutes: sourceToLoad.get('updateEvery'),
				periodInMinutes: sourceToLoad.get('updateEvery')	
			});


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
			id: sourceIdIndex++,
			title: message.value,
			url: message.value,
			updateEvery: 180
		});

		localStorage.setItem('sourceIdIndex', sourceIdIndex);

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