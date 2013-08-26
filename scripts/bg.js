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

$.ajaxSetup({
	cache: false
});


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
		icon: 'orange'
	},
	localStorage: new Backbone.LocalStorage('settings-backbone'),
	initialize: function() {
		this.fetch();
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

var sources = new(Backbone.Collection.extend({
	model: Source,
	localStorage: new Backbone.LocalStorage('sources-backbone'),
	comparator: function(a, b) {
		return (a.get('title') || '').trim() < (b.get('title') || '').trim() ? -1 : 1;
	},
	initialize: function() {
		var that = this;
		this.fetch({ silent: true }).then(function() {
			if (that.findWhere({ hasNew: true })) {
				chrome.browserAction.setIcon({ path: '/images/icon19-' + settings.get('icon') + '.png' 	});
			}
		});
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
			this._source = sources.findWhere({
				id: this.get('sourceID')
			});
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
		var that = this;
		this.fetch({
			silent: true
		});
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
	initialize: function() {
		var that = this;
		this.fetch({ silent: true });
	},
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
			//alert('url("/images/' + this.model.get('icon') + '") no-repeat left center');
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

$(function() {

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
		if (sources.findWhere({
			hasNew: true
		})) {
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
		items.where({ sourceID: source.get('id') }).forEach(function(item) {
			item.destroy({
				noFocus: true
			});
		});
		chrome.alarms.clear('source-' + source.get('id'));

		if (source.get('folderID') > 0) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (!folder) return;

			folder.save({ 
				count: folder.get('count') - source.get('count'),
				countAll: folder.get('countAll') - source.get('countAll')
			});
		}
	});

	items.on('change:unread', function(model) {
		if (!model.get('trashed')) {
			var source = model.getSource();
			if (source && model.get('unread') == true) {
				source.save({
					'count': source.get('count') + 1
				});
			} else {
				source.save({
					'count': source.get('count') - 1
				});
			}
		}
	});

	items.on('change:trashed', function(model) {
		var source = model.getSource();
		if (source && model.get('unread') == true) {
			if (model.get('trashed') == true) {
				source.save({
					'count': source.get('count') - 1,
					'countAll': source.get('countAll') - 1
				});
			} else {
				source.save({
					'count': source.get('count') + 1,
					'countAll': source.get('countAll') + 1
				});
			}
		} else if (source) {
			source.save({ 
				'countAll': source.get('countAll') + (model.get('trashed') ? - 1 : 1) 
			});
		}
	});

	/**
	 * Folder counts
	 */

	sources.on('change:count', function(source) {
		if (!(source.get('folderID') > 0)) return;

		var folder = folders.findWhere({ id: source.get('folderID') });
		if (!folder) return;

		folder.save({ count: folder.get('count') + source.get('count') - source.previous('count') });
	});

	sources.on('change:countAll', function(source) {
		if (!(source.get('folderID') > 0)) return;

		var folder = folders.findWhere({ id: source.get('folderID') });
		if (!folder) return;

		folder.save({ countAll: folder.get('countAll') + source.get('countAll') - source.previous('countAll') });
	});

	sources.on('change:folderID', function(source) {
		if (source.get('folderID') > 0) {

			var folder = folders.findWhere({ id: source.get('folderID') });
			if (!folder) return;

			folder.save({ 
				count: folder.get('count') + source.get('count'),
				countAll: folder.get('countAll') + source.get('countAll')
			});
		} else if (source.previous('folderID') > 0) {
			var folder = folders.findWhere({ id: source.previous('folderID') });
			if (!folder) return;

			folder.save({ 
				count: Math.max(folder.get('count') - source.get('count'), 0),
				countAll: Math.max(folder.get('countAll') - source.get('countAll'), 0)
			});
		}
	});

	/**
	 * Init
	 */


	// I should make sure all items are fetched before downloadAll is called .. ideas?
	setTimeout(downloadAll, 30000);

	/**
	 * onclick:button -> open RSS
	 */
	chrome.browserAction.onClicked.addListener(function(tab) {
		openRSS(true);
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

			// will url.get('id') be still the right id?

			loader.set('loaded', loader.get('loaded') + 1);

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
			if (hasNew) items.trigger('new-items');

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


			downloadURL();
		},
		error: function(e) {
			loader.set('loaded', loader.get('loaded') + 1);

			console.log('Failed load RSS: ' + sourceToLoad.get('url'));
			downloadURL();
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

	var title = xml.querySelector('channel > title, feed > title');
	var source = sources.findWhere({
		id: sourceID
	});
	if (title && (source.get('title') == source.get('url') || !source.get('title'))) {
		source.set('title', title.textContent);
		source.save();
	}

	[].forEach.call(nodes, function(node) {
		items.push({
			title: rssGetTitle(node),
			url: node.querySelector('link') ? node.querySelector('link').textContent : false,
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
	var creator = node.querySelector('creator, author');
	if (creator) {
		creator = creator.textContent;
	} else if (title && title.textContent.length > 0) {
		creator = title.textContent;
	}

	if (creator) {
		if (/^\S+@\S+\.\S+\s+\(.+\)$/.test(creator)) {
			creator = creator.replace(/^\S+@\S+\.\S+\s+\((.+)\)$/, '$1');
		}
		creator = creator.replace(/\s*\(\)\s*$/, '');
		return creator;
	}

	return '<no author>';
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