window.errors = [];

window.onerror = function(a) {
	window.errors.push(a.toString());
}

var sourceIdIndex = localStorage.getItem('sourceIdIndex') || 1;


/**
 * Items
 */

var Source = Backbone.Model.extend({
	defaults: {
		id: null,
		title: '<no title>',
		url: 'rss.rss',
		count: 0
	}
});

var sources = new (Backbone.Collection.extend({
	model: Source,
	localStorage: new Backbone.LocalStorage('sources-backbone'),
	comparator: function(a, b) {
		return a.get('tile') < b.get('title') ? 1 : -1;
	},
	initialize: function() {
		this.fetch({ silent: true });
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
		deleted: false
	}
});

var items = new (Backbone.Collection.extend({
	model: Item,
	localStorage: new Backbone.LocalStorage('items-backbone'),
	comparator: function(a, b) {
		return a.get('date') < b.get('date') ? 1 : -1;
	},
	initialize: function() {
		var that = this;
		this.fetch({ silent: true });
	}
}));


var loader = new (Backbone.Model.extend({
	defaults: {
		maxSources: 0,
		loaded: 0,
		loading: false
	}
}));


/**
 * RSS Downloader
 */
$.support.cors = true;

$(function() {

	/*sources.reset([
		{ title: 'Zero Code', url: 'http://shincodezeroblog.wordpress.com/feed/', count: 10, id: 1 },
		{ title: 'Buni', url: 'http://www.bunicomic.com/feed/', count: 8, id: 2 },
	]);*/

	sources.on('add change:url', function(source) {
		downloadOne(source);
	});

	/*sources.on('change:title', function(source) {
		if (!source.get('title')) {
			downloadOne(source);
		}
	});*/

	sources.on('destroy', function(a, b, c) {
		items.where({ sourceID: a.get('id') }).forEach(function(item) {
			item.destroy();
		});
	});

	items.on('change:unread', function(model) {
		var source = sources.findWhere({ id: model.get('sourceID') });
		if (model.get('unread') == true) {
			source.save({ 'count': source.get('count') + 1 });
		} else {
			source.save({ 'count': source.get('count') - 1 });
		}
	});

	items.on('change:deleted', function(model) {
		var source = sources.findWhere({ id: model.get('sourceID') });
		if (model.get('deleted') == true) {
			source.save({ 'count': source.get('count') - 1 });
		} else {
			source.save({ 'count': source.get('count') + 1 });
		}
	});


	// I should make sure all items are fetched before downloadAll is called .. ideas?
	setTimeout(downloadAll, 5000);

	/**
	 * onclick:button -> open RSS
	 */
	chrome.browserAction.onClicked.addListener(function(tab) {
		chrome.tabs.create({'url': chrome.extension.getURL('rss.html')}, function(tab) {
			// ...
		});
	});

});

function downloadOne(source) {
	loader.set('maxSources', 1);
	loader.set('loading', true);
	loader.set('loaded', 0);
	downloadURL([source], function() {
		loader.set('loaded', 1);
		loader.set('loading', false);
	});
}

function downloadAll() {
	var urls = sources.clone();

	if (urls.length) {
		loader.set('maxSources', urls.length);
		loader.set('loaded', 0);
		loader.set('loading', true);
		downloadURL(urls, function() {
			loader.set('loading', false);
		});
	}
	
}

function downloadURL(urls, cb) {
	if (!urls.length) {
		cb();
		return;
	}
	var url =  urls.pop();
	$.ajax({
		url: url.get('url'),
		success: function(r) {

			loader.set('loaded', loader.get('loaded') + 1);
			
			// parsedData step needed for debugging
			var parsedData = parseRSS(r, url.get('id'));
			console.log('get pass here: ' + Date.now());
			parsedData.forEach(function(item) {
				if (!items.get(item.id)) {
					items.create(item);	
				}
			});

			// too many wheres and stuff .. optimize?
			var count = items.where({ sourceID: url.get('id'), unread: true, deleted: false  }).length;
			sources.findWhere({ id: url.get('id') }).save({ 'count': count });


			downloadURL(urls, cb);
		},
		error: function(e) {
			loader.set('loaded', loader.get('loaded') + 1);

			console.log('Failed load RSS: url');
			downloadURL(urls, cb);
		}
	});
}


/**
 * RSS Parser
 */
function parseRSS(xml, sourceID) {
	var items = [];
	var nodes = xml.querySelectorAll('item');
	var title = xml.querySelector('channel > title');
	var source = sources.findWhere({ id: sourceID });
	if (title && (source.get('title') == source.get('url') || !source.get('title')) ) {
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
			unread: true
		});

		var last = items[items.length-1];
		last.id = CryptoJS.MD5(last.sourceID + last.title + last.date + last.content).toString();
	});

	return items;
}

function rssGetDate(node) {
	var pubDate = node.querySelector('pubDate, updated');
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
		return creator;
	}

	return '<no author>';
}

function rssGetTitle(node) {
	return node.querySelector('title') ? node.querySelector('title').textContent : '<no title>;';
}

function rssGetContent(node) {
	var encoded = node.querySelector('encoded, content');
	if (encoded) {
		return encoded.textContent; 
	} 

	var desc = node.querySelector('description'); 
	if (desc) {
		return desc.textContent;
	}
	return  '&nbsp;'
}

/**
 * Date parser
 */

var formatDate = function(){
	var that;
    var addZero = function(num){
        if (num<10) num = "0"+num;
        return num;
    };
    var na = function(n,z){
        return n%z;
    };
    var getDOY = function() {
        var onejan = new Date(that.getFullYear(),0,1);
        return Math.ceil((that - onejan) / 86400000);
    };
    var getWOY = function() {
        var onejan = new Date(that.getFullYear(),0,1);
        return Math.ceil((((that - onejan) / 86400000) + onejan.getDay()+1)/7);
    };
    var dateVal = function(all, found) {
        switch (found) {
            case "DD":   return addZero(that.getDate());
            case "D":    return that.getDate();
            case "MM":   return addZero(that.getMonth()+1);
            case "M":    return that.getMonth()+1;
            case "YYYY": return that.getFullYear();
            case "YY":   return that.getFullYear().toString().substr(2,2);
            case "hh":   return addZero(that.getHours());
            case "h":    return that.getHours();
            case "HH":   return addZero(na(that.getHours(),12));
            case "H":    return na(that.getHours(),12);
            case "mm":   return addZero(that.getMinutes());
            case "m":    return that.getMinutes();
            case "ss":   return addZero(that.getSeconds());
            case "s":    return that.getSeconds();
            case "u":    return that.getMilliseconds();
            case "U":    return that.getTime();
            case "W":    return that.getDay();
            case "y":    return getDOY();
            case "w":    return getWOY();
            case "G":    return that.getTimezoneOffset();
            case "a":    return that.getHours()>12?"pm":"am";
            default:     return "";
        }
    };
    return function(str){
    	that = this;
        str = str.replace(/(DD|D|MM|M|YYYY|YY|hh|h|HH|H|mm|m|ss|s|u|U|W|y|w|G|a)/g, dateVal);
        return str;
    };
}();


/**
 * Messages
 */

chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
	// if.sender.id != blahblah -> return;
	if (!message.hasOwnProperty('action')) {
		return;
	}

	if (message.action == 'new-rss' && message.value) {
		sources.create({
			id: sourceIdIndex++,
			title: message.value,
			url: message.value
		});

		localStorage.setItem('sourceIdIndex', sourceIdIndex);

		chrome.tabs.create({'url': chrome.extension.getURL('rss.html')}, function(tab) {});
	}
});