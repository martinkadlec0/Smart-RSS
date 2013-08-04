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
		id: -1,
		title: '<no title>',
		url: 'rss.rss',
		count: 0
	}
});

var sources = new (Backbone.Collection.extend({
	model: Source,
	comparator: function(a, b) {
		return a.get('tile') > b.get('title') ? 1 : -1;
	}
}));

var Item = Backbone.Model.extend({
	defaults: {
		title: '<no title>',
		author: '',
		url: 'opera:blank',
		content: 'No content loaded.',
		sourceID: -1
	}
});

var items = new (Backbone.Collection.extend({
	model: Item,
	comparator: function(a, b) {
		return a.get('tile') > b.get('title') ? 1 : -1;
	}
}));


/**
 * RSS Downloader
 */
$.support.cors = true;

$(function() {

	bg.sources.reset([
		{ title: 'Zero Code', url: 'http://shincodezeroblog.wordpress.com/feed/', count: 10, id: 1 },
		{ title: 'Buni', url: 'http://www.bunicomic.com/feed/', count: 8, id: 2 },
	]);

	var urls = bg.sources.pluck('url');

	downloadURL(urls, function() {
		console.log('All fetched');
	});


});

function downloadURL(urls, cb) {
	if (!urls.length) {
		cb();
		return;
	}
	$.ajax({
		url: urls.pop(),
		success: function(r) {
			items.add(parseRSS(r));
			downloadURL(urls, cb);
		},
		error: function(e) {
			console.log('Failed load RSS: url');
			downloadURL(urls, cb);
		}
	});
}


/**
 * RSS Parser
 */
function parseRSS(xml) {
	var items = [];
	var nodes = xml.querySelectorAll('item');
	[].forEach.call(nodes, function(node) {
		items.push({
			title: node.querySelector('title') ? node.querySelector('title').textContent : '&nbsp;',
			url: node.querySelector('link') ? node.querySelector('link').textContent : '&nbsp;',
			date: node.querySelector('pubDate') ? node.querySelector('pubDate').textContent : '&nbsp;',
			author: node.querySelector('creator') ? node.querySelector('creator').textContent : '&nbsp;',
			content: node.querySelector('encoded') ? node.querySelector('encoded').textContent : '&nbsp;',
			sourceID: 1
		});
	});

	return items;
}
