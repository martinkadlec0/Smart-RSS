/**
 * @module BgProcess
 * @submodule models/Info
 */
define(['backbone', 'modules/Animation'], function (BB, animation) {

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
			var val;
			if (settings.get('badgeMode') == 'unread') {
				val = info.get('allCountUnread') > 99 ? '+' : info.get('allCountUnread');
			} else {
				val = info.get('allCountUnvisited') > 99 ? '+' : info.get('allCountUnvisited');
			}
			
			val = val <= 0 ? '' : String(val);
			chrome.browserAction.setBadgeText({ text: val });
			chrome.browserAction.setBadgeBackgroundColor({ color: '#777' });
			info.badgeTimeout = null;
		});
	};


	

	/**
	 * This model stores info about count of read/unread/unvisited/total of all feeds and in trash
	 * @class Info
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Info = BB.Model.extend({
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
				var count = 0;
				var countAll = 0;
				sources.where({ folderID: folder.id }).forEach(function(source) {
					count += source.get('count');
					countAll += source.get('countAll');
				});
				folder.set({ count: count, countAll: countAll });
			});
		},
		setEvents: function() {
			settings.on('change:badgeMode', handleAllCountChange);
			if (settings.get('badgeMode') == 'unread') {
				info.on('change:allCountUnread', handleAllCountChange);
			} else if (settings.get('badgeMode') == 'unvisited') {
				info.on('change:allCountUnvisited', handleAllCountChange);
			}
			handleAllCountChange();


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
					item.destroy();
				});

				/****
				 * probably not neccesary because I  save all the removed items to batch and then 
				 * in next frame I remove them at once and all handleScroll anyway
				 ****/
				//items.trigger('render-screen');
				
				

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
					animation.handleIconChange();
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
				var folder;
				if (source.get('folderID')) {

					folder = folders.findWhere({ id: source.get('folderID') });
					if (!folder) return;

					folder.set({
						count: folder.get('count') + source.get('count'),
						countAll: folder.get('countAll') + source.get('countAll')
					});
				}

				if (source.previous('folderID')) {
					folder = folders.findWhere({ id: source.previous('folderID') });
					if (!folder) return;

					folder.set({
						count: Math.max(folder.get('count') - source.get('count'), 0),
						countAll: Math.max(folder.get('countAll') - source.get('countAll'), 0)
					});
				}
			});
		}
	});

	return Info;
});