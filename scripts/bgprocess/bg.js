/**
 * @module BgProcess
 */
define([
	'jquery',
	'modules/Animation', 'models/Settings', 'models/Info', 'models/Source',
	'collections/Sources', 'collections/Items', 'collections/Folders', 'models/Loader', 'collections/Logs',
	'models/Folder', 'models/Item', 'collections/Toolbars'
],
function ($, animation, Settings, Info, Source, Sources, Items, Folders, Loader, Logs, Folder, Item, Toolbars) {

	/**
	 * Update animations
	 */
	animation.start();


	/*$.ajaxSetup({
		cache: false
	});*/

	window.appStarted = new (jQuery.Deferred)();
	window.settingsLoaded = new (jQuery.Deferred)();

	/**
	 * Items
	 */
	window.Source = Source;
	window.Item = Item;
	window.Folder = Folder;

	/**
	 * DB models
	 */
	window.settings = new Settings();
	window.info = new Info();
	window.sourceJoker = new Source({ id: 'joker' });
	window.sources = new Sources();
	window.items = new Items();
	window.folders = new Folders();

	window.toolbars = new Toolbars();


	/**
	 * Non-db models & collections
	 */
	window.loader = new Loader();
	window.logs = new Logs();
	logs.startLogging();

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
		deferreds.push( toolbars.fetch({ silent: true }) );
		deferreds.push( settingsDef = settings.fetch({ silent: true }) );

		fetchOne(deferreds, allDef);

		settingsDef.always(function() {
			settingsLoaded.resolve();
		});
		

		return allDef.promise();
	}

	window.fetchAll = fetchAll;
	window.fetchOne = fetchOne;





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
			loader.downloadOne(source);
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
					if (!loader.downloadOne(source)) {
						setTimeout(loader.downloadOne, 30000, source);
					}
				} else {
					console.log('No source with ID: ' + sourceID);
					chrome.alarms.clear(alarm.name);
				}

			}

		});

		sources.on('change:url', function(source) {
			loader.downloadOne(source);
		});

		sources.on('change:title', function(source) {
			// if url was changed as well change:url listener will download the source
			if (!source.get('title')) {
				loader.downloadOne(source);
			}

			sources.sort();
		});

		sources.on('change:hasNew', animation.handleIconChange);
		settings.on('change:icon', animation.handleIconChange);

		info.setEvents(sources);


		/**
		 * Init
		 */


		setTimeout(loader.downloadAll, 30000);
		appStarted.resolve();

		/**
		 * Set icon
		 */

		animation.stop();


		/**
		 * onclick:button -> open RSS
		 */
		chrome.browserAction.onClicked.addListener(function() {
			openRSS(true);
		});

	});
	});

	/**
	 * Messages
	 */

	chrome.runtime.onMessageExternal.addListener(function(message) {
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
				}, function() {});
			}
		});
	}

});