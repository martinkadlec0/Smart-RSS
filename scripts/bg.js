/**
 * onclick:button -> open RSS
 */
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({'url': chrome.extension.getURL('rss.html')}, function(tab) {
		// ...
	});
});

/**
 * Items
 */

// USE SET TO SMARTLY UPDATE THE RSS ON UPDATE!

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
		this.fetch();
	}
}));

var Item = Backbone.Model.extend({
	defaults: {
		title: '<no title>',
		author: '',
		url: 'opera:blank',
		date: 0,
		content: 'No content loaded.',
		sourceID: -1,
		unread: true
	}
});

var items = new (Backbone.Collection.extend({
	model: Item,
	comparator: function(a, b) {
		return a.get('date') < b.get('date') ? 1 : -1;
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

	sources.on('add', function(source) {
		var data = { tmpStorage: [] };
		downloadURL([source], data, function() {
			items.add(data.tmpStorage);
		});
	});

	//downloadAll();

});

function downloadAll() {
	var urls = sources.clone();

	var data = { tmpStorage: [] };

	downloadURL(urls, data, function() {
		items.reset(data.tmpStorage);
	});
}

function downloadURL(urls, data, cb) {
	if (!urls.length) {
		cb();
		return;
	}
	var url =  urls.pop();
	$.ajax({
		url: url.get('url'),
		success: function(r) {
			data.tmpStorage = data.tmpStorage.concat( parseRSS(r, url.get('id')) );
			//items.add();
			downloadURL(urls, data, cb);
		},
		error: function(e) {
			console.log('Failed load RSS: url');
			downloadURL(urls, data, cb);
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
	if (title && source.get('title') == source.get('url')) {
		source.set('title', title.textContent);
	}
	source.set('count', nodes.length);

	[].forEach.call(nodes, function(node) {
		items.push({
			title: rssGetTitle(node),
			url: node.querySelector('link') ? node.querySelector('link').textContent : false,
			date: node.querySelector('pubDate') ? (new Date(node.querySelector('pubDate').textContent)).getTime() : '&nbsp;',
			author: rssGetAuthor(node, title),
			content: rssGetContent(node),
			sourceID: sourceID,
			unread: true
		});
	});

	return items;
}

function rssGetAuthor(node, title) {
	var creator = node.querySelector('creator');
	if (creator) {
		return creator.textContent;
	}

	if (title && title.textContent.length > 0) {
		return title.textContent;
	}
	return '&nbsp;';
}

function rssGetTitle(node) {
	return node.querySelector('title') ? node.querySelector('title').textContent : '&nbsp;';
}

function rssGetContent(node) {
	var encoded = node.querySelector('encoded');
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