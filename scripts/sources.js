var chrome = window.top.chrome;

document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});	


if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}

window.addEventListener('focus', function() {
	document.documentElement.classList.add('focused');
});

window.addEventListener('blur', function() {
	document.documentElement.classList.remove('focused');
});

function fixURL(url) {
	if (url.search(/[a-z]+:\/\//) == -1) {
		url = 'http://' + url;
	}
	return url;
}

Array.prototype.last = function(val) {
	if (!this.length) return null;
	if (val) this[this.length - 1] = val;
	return this[this.length - 1];
};

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	$('body').html( bg.translate($('body').html()) );
	document.documentElement.style.fontSize = bg.settings.get('uiFontSize') + '%';

	var TopView = Backbone.View.extend({
		tagName: 'div',
		className: 'list-item',
		template: _.template($('#template-source').html()),
		handleMouseDown: function(e) {
			if (e.which == 1) {
				this.showSourceItems(e);
			} 
		},
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},
		showContextMenu: function(e) {
			this.select(e);
			sourcesContextMenu.currentSource = this.model;
			sourcesContextMenu.show(e.clientX, e.clientY);
		},
		select: function(e) {
			e = e || {};
			//if (e.ctrlKey != true && e.shiftKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
			//} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		showSourceItems: function(e) {
			e = e || {};
			if (!e.noSelect) this.select(e);
			
			if (this.model.get('name') == 'all-feeds') {
				bg.sources.forEach(function(source) {
					if (source.get('hasNew')) {
						source.save({ hasNew: false });
					}
				});
				
			} else if (this.model instanceof bg.Source && this.model.get('hasNew')) {
				this.model.save({ hasNew: false });
			}

			window.top.frames[1].postMessage({
				action: 'new-select',
				value: this.model.id || this.model.get('filter'),
				name: this.model.get('name'),
				unreadOnly: !!e.shiftKey,
				noFocus: !!e.noFocus
			}, '*');
			
		}
	});

	var SourceView = TopView.extend({
		events: {
			'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown',
		},
		className: 'list-item source',
		initialize: function() {
			this.el.setAttribute('draggable', 'true');
			this.model.on('change', this.render, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			this.model.on('change:title', this.handleChangeTitle, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.el.dataset.id = this.model.get('id');
			this.el.view = this;
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				this.clearEvents();
			}
		},
		clearEvents: function() {
			this.model.off('change', this.render, this);
			this.model.off('destroy', this.handleModelDestroy, this);
			this.model.off('change:title', this.handleChangeTitle, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		handleChangeTitle: function() {
			list.placeSource(this);
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
		},
		renderInterval: 'first-time',
		render: function() {
			if (this.renderInterval == 'first-time') return this.realRender();
			if (this.renderInterval) return;
			
			var that = this;
			this.renderInterval = requestAnimationFrame(function() {
				that.realRender();
			});
			return this;
		},
		realRender: function() {
			this.$el.toggleClass('has-unread', !!this.model.get('count'));

			if (this.model.get('folderID')) {
				this.el.dataset.inFolder = this.model.get('folderID');
			} else {
				this.$el.removeClass('in-closed-folder');
				delete this.el.dataset.inFolder;
			}

			
			this.$el.attr('title', 
				this.model.get('title') + ' (' + this.model.get('count') + ' ' + bg.lang.c.UNREAD + ', ' + this.model.get('countAll') + ' ' + bg.lang.c.TOTAL + ')'
			);
			this.$el.html(this.template(this.model.toJSON()));
			this.renderInterval = null;

			return this;
		}
	});

	var FolderView = TopView.extend({
		className: 'list-item folder',
		template: _.template($('#template-folder').html()),
		events: {
			'dblclick': 'handleDoubleClick',
			'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown',
			'click .folder-arrow': 'handleClickArrow'
		},
		handleDoubleClick: function(e) {
			this.handleClickArrow(e);
		},
		showContextMenu: function(e) {
			this.select(e);
			folderContextMenu.currentSource = this.model;
			folderContextMenu.show(e.clientX, e.clientY);
		},
		initialize: function() {
			this.el.view = this;

			this.model.on('destroy', this.handleModelDestroy, this);
			this.model.on('change', this.render, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.el.dataset.id = this.model.get('id');
		},
		clearEvents: function() {
			this.model.off('destroy', this.handleModelDestroy, this);
			this.model.off('change', this.render, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
		},
		handleClickArrow: function(e) {
			this.model.save('opened', !this.model.get('opened'));
			$('.source[data-in-folder=' + this.model.get('id') + ']').toggleClass('in-closed-folder', !this.model.get('opened'));
			e.stopPropagation();
		},
		template: _.template($('#template-folder').html()),
		renderInterval: 'first-time',
		render: function() {
			if (this.renderInterval == 'first-time') return this.realRender();
			if (this.renderInterval) return;
			
			var that = this;
			this.renderInterval = requestAnimationFrame(function() {
				that.realRender();
			});
			return this;
		},
		realRender: function() {
			
			this.$el.toggleClass('has-unread', !!this.model.get('count'));
			
			var data = Object.create(this.model.attributes);
			this.$el.toggleClass('opened', this.model.get('opened'));
			this.$el.html(this.template(data));

			this.$el.attr('title', 
				this.model.get('title') + ' (' + this.model.get('count') + ' ' + bg.lang.c.UNREAD + ', ' + this.model.get('countAll') + ' ' + bg.lang.c.TOTAL + ')'
			);
			this.renderInterval = null;

			return this;
		},
		showSourceItems: function(e) {
			e = e || {};
			if (!e.noSelect) this.select(e);
			
			
			window.top.frames[1].postMessage({
				action: 'new-folder-select',
				value: this.model.id,
				unreadOnly: !!e.shiftKey,
				noFocus: !!e.noFocus
			}, '*');
			
		}
	});

	var Special = Backbone.Model.extend({
		defaults: {
			title: 'All feeds',
			icon: 'icon16_v2.png',
			name: '',
			filter: {},
			position: 'top',
			onReady: null
		}
	});

	var SpecialView = TopView.extend({
		className: 'list-item special',
		events: {
			'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown'
		},
		showContextMenu: function(e) {
			if (!this.contextMenu) return;
			this.select(e);
			this.contextMenu.currentSource = this.model;
			this.contextMenu.show(e.clientX, e.clientY);
		},
		initialize: function() {
			this.el.view = this;
			if (this.model.get('onReady')) {
				this.model.get('onReady').call(this);
			}
			bg.info.on('change', this.changeInfo, this);
			bg.sources.on('clear-events', this.clearEvents, this);
		},
		clearEvents: function() {
			bg.info.off('change', this.changeInfo, this);
			bg.sources.off('clear-events', this.clearEvents, this);
		},
		changeInfo: function() {
			if (this.model.get('name') == 'all-feeds') {
				this.$el.attr('title', this.model.get('title') + ' (' + bg.info.get('allCountUnread') + ' ' + bg.lang.c.UNREAD + ', ' + bg.info.get('allCountTotal') + ' ' + bg.lang.c.TOTAL + ')');
			} else if (this.model.get('name') == 'trash') {
				var tot = bg.info.get('trashCountTotal');
				this.$el.attr('title', this.model.get('title') + ' (' + bg.info.get('trashCountUnread') + ' ' + bg.lang.c.UNREAD + ', ' + tot + ' ' + bg.lang.c.TOTAL + ')');
				if (tot <= 0 && this.model.get('icon') != 'trashsource.png') {
					this.model.set('icon', 'trashsource.png');
					this.render(true);
				} else if (tot > 0 && tot < 100 && this.model.get('icon') != 'trash_full.png') {
					this.model.set('icon', 'trash_full.png');
					this.render(true);
				} else if (tot >= 100 && this.model.get('icon') != 'trash_really_full.png') {
					this.model.set('icon', 'trash_really_full.png');
					this.render(true);
				}
			}
		},
		template: _.template($('#template-special').html()),
		render: function(noinfo) {
			this.$el.html(this.template(this.model.toJSON()));
			if (!noinfo) this.changeInfo();
			return this;
		}
	});

	var trash = new Special({
		title: bg.lang.c.TRASH,
		icon: 'trashsource.png',
		filter: { trashed: true, deleted: false },
		position: 'bottom',
		name: 'trash',
		onReady: function() {
			this.contextMenu = trashContextMenu;
			this.el.addEventListener('dragover', function(e) {
				e.preventDefault();
			});
			this.el.addEventListener('drop', function(e) {
				e.preventDefault();
				var ids = JSON.parse(e.dataTransfer.getData('text/plain') || '[]') || [];
				ids.forEach(function(id) {
					var item = bg.items.findWhere({ id: id });
					if (item && !item.get('trashed')) {
						item.save({
							trashed: true
						});
					}
				});
			});
		}
	});

	var AppToolbar = Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-add-folder': 'addFolderDialog',
			'click #button-reload': 'reloadSources'
		},
		initialize: function() {
			
		},
		addFolderDialog: function() {
			var title = (prompt(bg.lang.c.FOLDER_NAME + ': ') || '').trim();
			if (!title) return;

			bg.folders.create({
				title: title
			});

		},
		addSourceDialog: function() {
			var url = (prompt(bg.lang.c.RSS_FEED_URL) || '').trim();
			if (!url)  return;

			var folderID = 0;
			if (list.selectedItems.length && list.selectedItems[0] instanceof FolderView) {
				folderID = list.selectedItems[0].model.get('id');
			}

			url = fixURL(url);
			bg.sources.create({
				title: url,
				url: url,
				updateEvery: 180,
				folderID: folderID
			}).fetch();

		
		},
		reloadSources: function() {
			bg.downloadAll(true);
		}
	});


	var ContextMenu = bg.ContextMenu.extend({
		initialize: function(mc) {
			this.menuCollection = new (bg.MenuCollection)(mc);
			this.addItems(this.menuCollection);
			$('body').append(this.render().$el);

			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
		},
		show: function(x, y) {
			if (x + this.$el.width() + 4 > document.body.offsetWidth) {
				x = document.body.offsetWidth - this.$el.width() - 8;
			} 
			if (y + this.$el.height() + 4 > document.body.offsetHeight) {
				y = document.body.offsetHeight - this.$el.height() - 8;
			} 
			this.$el.css('top', y + 'px');
			this.$el.css('left', x + 'px');
			this.$el.css('display', 'block');
		}
	});
	

	var sourcesContextMenu = new ContextMenu([
		{
			title: bg.lang.c.UPDATE,
			icon: 'reload.png',
			action: function() {
				bg.downloadOne(sourcesContextMenu.currentSource);
			}
		},
		{ 
			title: bg.lang.c.MARK_ALL_AS_READ,
			icon: 'read.png',
			action: function() { 
				if (!sourcesContextMenu.currentSource) return;
				var id = sourcesContextMenu.currentSource.get('id');
				bg.items.forEach(function(item) {
					if (item.get('unread') == true && item.getSource().id == id) {
						item.save({
							unread: false,
							visited: true
						});
					}
				});

				sourcesContextMenu.currentSource.save({ hasNew: false });
			}
		},
		{ 
			title: bg.lang.c.DELETE,
			icon: 'delete.png',
			action: function() { 
				if (confirm(bg.lang.c.REALLY_DELETE)) {
					sourcesContextMenu.currentSource.destroy();	
				}
				
			}
		},
		{ 
			title: bg.lang.c.PROPERTIES,
			icon: 'properties.png',
			action: function() {
				properties.show(sourcesContextMenu.currentSource);
				properties.currentSource = sourcesContextMenu.currentSource;
			}
		}
	]);

	var trashContextMenu = new ContextMenu([
		{ 
			title: bg.lang.c.MARK_ALL_AS_READ,
			icon: 'read.png',
			action: function() { 
				bg.items.where({ trashed: true, deleted: false }).forEach(function(item) {
					if (item.get('unread') == true) {
						item.save({
							unread: false,
							visited: true
						});
					}
				});
			}
		},
		{ 
			title: bg.lang.c.EMPTY_TRASH,
			icon: 'delete.png',
			action: function() { 
				if (confirm(bg.lang.c.REALLY_EMPTY_TRASH)) {
					bg.items.where({ trashed: true, deleted: false }).forEach(function(item) {
						item.markAsDeleted();
					});
				}
			}
		}
	]);

	var allFeedsContextMenu = new ContextMenu([
		{
			title: bg.lang.c.UPDATE_ALL,
			icon: 'reload.png',
			action: function() {
				bg.downloadAll(true);
			}
		},
		{ 
			title: bg.lang.c.MARK_ALL_AS_READ,
			icon: 'read.png',
			action: function() { 
				if (confirm(bg.lang.c.MARK_ALL_QUESTION)) {
					bg.items.forEach(function(item) {
						item.save({ unread: false, visited: true });
					});	
				}
			}
		},
		{ 
			title: bg.lang.c.DELETE_ALL_ARTICLES,
			icon: 'delete.png',
			action: function() { 
				if (confirm(bg.lang.c.DELETE_ALL_Q)) {
					bg.items.forEach(function(item) {
						if (item.get('deleted') == true) return;
						item.markAsDeleted();
					});
				}
			}
		}
	]);

	var folderContextMenu = new ContextMenu([
		{ 
			title: bg.lang.c.MARK_ALL_AS_READ,
			icon: 'read.png',
			action: function() { 
				var folder = list.selectedItems[0].model;
				if (!folder || !(folder instanceof bg.Folder)) return;

				var sources = bg.sources.where({ folderID: folder.get('id') });
				if (!sources.length) return;

				for (var i=0; i<sources.length; i++) {
					bg.items.forEach(function(item) {
						if (item.get('unread') == true && item.getSource() == sources[i]) {
							item.save({
								unread: false,
								visited: true
							});
						}
					});
					sources[i].save({ hasNew: false });
				}
			}
		},
		{ 
			title: bg.lang.c.DELETE,
			icon: 'delete.png',
			action: function() { 
				if (!confirm(bg.lang.c.REALLY_DELETE)) return;

				var folder = list.selectedItems[0].model;
				bg.sources.where({ folderID: folder.get('id') }).forEach(function(item) {
					item.destroy();
				});
				folder.destroy();
			}
		},
		{ 
			title: bg.lang.c.RENAME,
			action: function() { 
				var newTitle = prompt(bg.lang.c.FOLDER_NAME + ': ', list.selectedItems[0].model.get('title'));
				if (!newTitle) return;

				list.selectedItems[0].model.save({ title: newTitle });
			}
		}
	]);

	var contextMenus = new (Backbone.View.extend({
		list: [],
		initialize: function() {
			this.list = [sourcesContextMenu, trashContextMenu, folderContextMenu, allFeedsContextMenu];
		},
		hideAll: function() {
			this.list.forEach(function(item) {
				item.hide();
			});
		}
	}));


	var properties = new (Backbone.View.extend({
		el: '#properties',
		currentSource: null,
		events: {
			'click button' : 'handleClick',
			'keydown button' : 'handleKeyDown',
			'click #advanced-switch' : 'handleSwitchClick',
		},
		initialize: function() {
			
		},
		handleClick: function(e) {
			var t = e.currentTarget;
			if (t.id == 'prop-cancel') {
				this.hide();
			} else if (t.id == 'prop-ok') {
				this.saveData();
			}
		},
		saveData: function() {
			if (!this.currentSource) {
				this.hide();
				return;
			}

			this.currentSource.save({
				title: $('#prop-title').val(),
				url: fixURL($('#prop-url').val()),
				username: $('#prop-username').val(),
				password: $('#prop-password').val(),
				updateEvery: parseFloat($('#prop-update-every').val())
			});

			this.hide();

		},
		handleKeyDown: function(e) {
			if (e.keyCode == 13) {
				this.handleClick(e);
			} 
		},
		show: function(source) {
			$('#prop-title').val(source.get('title'));;
			$('#prop-url').val(source.get('url'));
			$('#prop-username').val(source.get('username'));
			$('#prop-password').val(source.get('password'));
			if (source.get('updateEvery')) {
				$('#prop-update-every').val(source.get('updateEvery'));	
			}
			
			properties.$el.css('display', 'block');
		},
		hide: function() {
			properties.$el.css('display', 'none');
		},
		handleSwitchClick: function() {
			$('#properties-advanced').toggleClass('visible');
			$('#advanced-switch').toggleClass('switched');
		}
	}));

	var AppList = Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		events: {
			'dragstart .source': 'handleDragStart',
			'drop': 'handleDrop',
			'drop [data-in-folder]': 'handleDrop',
			'drop .folder': 'handleDrop',
			'dragover': 'handleDragOver',
			'dragover .folder,[data-in-folder]': 'handleDragOver',
			'dragleave .folder,[data-in-folder]': 'handleDragLeave'
		},
		initialize: function() {

			this.addFolders(bg.folders);

			this.addSpecial(new Special({
				title: bg.lang.c.ALL_FEEDS,
				icon: 'icon16_v2.png',
				filter: { trashed: false },
				position: 'top',
				name: 'all-feeds',
				onReady: function() {
					this.contextMenu = allFeedsContextMenu;
				}
			}));

			this.addSpecial(new Special({
				title: bg.lang.c.PINNED,
				icon: 'pinsource.png',
				filter: { trashed: false, pinned: true },
				position: 'bottom',
				name: 'pinned'
			}));

			this.addSpecial(trash);

			this.addSources(bg.sources);

			bg.sources.on('reset', this.addSources, this);
			bg.sources.on('add', this.addSource, this);
			bg.sources.on('change:folderID', this.handleChangeFolder, this);
			bg.folders.on('add', this.addFolder, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			window.addEventListener('message', this.handleMessage);
			
		},
		handleMessage: function(e) {
			if (e.data.action == 'select-folder') {
				var folder = $('.folder[data-id=' + e.data.value + ']').get(0);
				if (!folder) return;
				folder.view.select();
			} else if (e.data.action == 'select-all-feeds') {
				var allFeeds = $('.special:first').get(0);
				if (!allFeeds) return;
				allFeeds.view.select();
			}
		},
		handleDragOver: function(e) {
			var f = e.currentTarget.dataset.inFolder;
			if (f) {
				$('.folder[data-id=' + f + ']').addClass('drag-over');
			} else if ($(e.currentTarget).hasClass('folder')) {
				$(e.currentTarget).addClass('drag-over');
			}
			e.preventDefault();
		},
		handleDragLeave: function(e) {
			var f = e.currentTarget.dataset.inFolder;
			if (f) {
				$('.folder[data-id=' + f + ']').removeClass('drag-over');
			} else if ($(e.currentTarget).hasClass('folder')) {
				$(e.currentTarget).removeClass('drag-over');
			}
		},
		handleDrop: function(e) {
			var oe = e.originalEvent;
			e.preventDefault();

			$('.drag-over').removeClass('drag-over');

			var id = oe.dataTransfer.getData('dnd-sources');
			if (!id) return;

			var item = bg.sources.findWhere({ id: id });
			if (!item) return;

			if ($(e.currentTarget).hasClass('folder')) {
				var folderID = e.currentTarget.dataset.id;
			} else {
				var folderID = e.currentTarget.dataset.inFolder;	
			}

			item.save({ folderID: folderID });

			e.stopPropagation();
		},
		handleDragStart: function(e) {
			var id = e.currentTarget.view.model.get('id');

			e.originalEvent.dataTransfer.setData('dnd-sources', id);
		},
		handleChangeFolder: function(source) {
			var source = $('.source[data-id=' + source.get('id') + ']').get(0);
			if (!source) return;

			this.placeSource(source.view)
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.sources.off('reset', this.addSources, this);
				bg.sources.off('add', this.addSource, this);
				bg.sources.off('change:folderID', this.handleChangeFolder, this);
				bg.folders.off('add', this.addFolder, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		addSpecial: function(special) {

			var view = new SpecialView({ model: special });
			if (view.model.get('position') == 'top') {
				this.$el.prepend(view.render().el);
			} else {
				this.$el.append(view.render().el);
			}
			
		},
		addFolder: function(folder) {
			var view = new FolderView({ model: folder });
			var folderViews = $('.folder').toArray();
			if (folderViews.length) {
				this.insertBefore(view.render(), folderViews);
			} else if ($('.special:first').length) {
				// .special-first = all feeds, with more "top" specials this will have to be changed
				view.render().$el.insertAfter($('.special:first'));
			} else {
				this.$el.append(view.render().$el);
			}
		},
		addFolders: function(folders) {
			$('.folder').each(function(i, folder) {
				if (!folder.view || !(folder instanceof FolderView)) return;
				list.destroySource(folder.view);
			});
			folders.forEach(function(folder) {
				this.addFolder(folder);
			}, this);
		},
		addSource: function(source, noManualSort) {
			var view = new SourceView({ model: source });
			this.placeSource(view, noManualSort === true ? true : false);
		},
		placeSource: function(view, noManualSort) {
			var folder = null;
			var source = view.model;
			if (source.get('folderID')) {
				folder = $('.folder[data-id=' + source.get('folderID') + ']');
				if (!folder.length) folder = null;
			}
			
			var sourceViews;
				
			if (folder) {
				sourceViews = $('.source[data-in-folder=' + source.get('folderID') + ']').toArray();
				if (sourceViews.length && noManualSort) {
					view.render().$el.insertAfter(sourceViews.last());
				} else if (sourceViews.length) {
					this.insertBefore(view.render(), sourceViews);
				} else {
					view.render().$el.insertAfter(folder);	
				}

				if (!folder.get(0).view.model.get('opened')) {
					view.$el.addClass('in-closed-folder');
				}

				return;
			}



			sourceViews = $('.source:not([data-in-folder])').toArray();
			if (sourceViews.length && noManualSort) {
				view.render().$el.insertAfter(sourceViews.last());
			} else if (sourceViews.length) {
				this.insertBefore(view.render(), sourceViews);
			} else if ((fls = $('[data-in-folder],.folder')).length) {
				view.render().$el.insertAfter(fls.last());
			} else if ($('.special:first').length) {
				// .special-first = all feeds, with more "top" specials this will have to be changed
				view.render().$el.insertAfter($('.special:first'));
			} else {
				this.$el.append(view.render().$el);
			}
		},
		insertBefore: function(what, where){
			var before = null;
			where.some(function(el) {
				if (el.view.model != what.model && bg.sources.comparator(el.view.model, what.model) == 1) {
					return before = el;
				}
			});
			if (before) {
				what.$el.insertBefore(before);	
			} else {
				if (what instanceof FolderView) {
					var folderSources = $('[data-in-folder=' + where.last().view.model.get('id') + ']');
					if (folderSources.length) {

						where.last(folderSources.last());	
					}
				} 
				what.$el.insertAfter(where.last());
			}
		},
		addSources: function(sources) {
			$('.source').each(function(i, source) {
				if (!source.view || !(source instanceof SourceView)) return;
				list.destroySource(source.view);
			});
			sources.forEach(function(source) {
				this.addSource(source, true);
			}, this);
		},	
		removeSource: function(view) {
			view.model.destroy();
			/*view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();*/
		},
		destroySource: function(view) {
			view.clearEvents();
			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();
			var io = list.selectedItems.indexOf(this);
			if (io >= 0) {
				list.selectedItems.splice(io, 1);
			}
		},
		generateAllFeedsSource: function() {

		}
	});

	var App = Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown',
			'click #panel-toggle': 'handleClickToggle'
		},
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.renderIndicator, this);
			bg.loader.on('change:maxSources', this.renderIndicator, this);
			bg.settings.on('change:panelToggled', this.handleToggleChange, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.handleLoadingChange();
			this.handleToggleChange();
			if (bg.settings.get('enablePanelToggle')) {
				$('#panel-toggle').css('display', 'block');
			}

			window.addEventListener('resize', this.handleResize.bind(this));
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.loader.off('change:loading', this.handleLoadingChange, this);
				bg.loader.off('change:loaded', this.renderIndicator, this);
				bg.loader.off('change:maxSources', this.renderIndicator, this);
				bg.settings.off('change:panelToggled', this.handleToggleChange, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		handleClickToggle: function() {
			bg.settings.save('panelToggled', !bg.settings.get('panelToggled'));
		},
		handleToggleChange: function() {
			$('#panel').toggleClass('hidden', !bg.settings.get('panelToggled'));
			$('#panel-toggle').toggleClass('toggled', bg.settings.get('panelToggled'));
		},
		handleResize: function() {
			if (bg.settings.get('panelToggled')) {
				var wid = $(window).width();
				bg.settings.save({ posA: wid + ',*' });
			}
		},
		handleMouseDown: function(e) {
			if (sourcesContextMenu.el.parentNode && !e.target.matchesSelector('.context-menu, .context-menu *')) {
				// make sure the action gets executed
				contextMenus.hideAll();
				//sourcesContextMenu.hide();
			}
		},
		handleKeyDown: function(e) {
			if (document.activeElement && document.activeElement.tagName == 'INPUT') {
				return;
			}

			if (e.keyCode == 68) {
				//there shouldnt be same shortcut for deleting item and source
				//list.selectedItems.forEach(list.removeSource, list);
			} else if (e.keyCode == 50) {
				window.top.frames[1].focus();
				e.preventDefault();
			} else if (e.keyCode == 51) {
				window.top.frames[2].focus();
				e.preventDefault();
			} else if (e.keyCode == 38) {
				var cs = $('.selected:first');
				var s;
				if (cs.length) {
					s = cs.prevAll('.list-item:not(.in-closed-folder):first').get(0);
				} else {
					s = $('.list-item:not(.in-closed-folder):last').get(0);
				}
				if (s) s.view.select();
				e.preventDefault();
			} else if (e.keyCode == 40) {
				var cs = $('.selected:first');
				var s;
				if (cs.length) {
					s = cs.nextAll('.list-item:not(.in-closed-folder):first').get(0);
				} else {
					s = $('.list-item:not(.in-closed-folder):first').get(0);
				}
				if (s) s.view.select();
				e.preventDefault();
			} else if (e.keyCode == 37 && e.ctrlKey) {
				var folders = $('.folder.opened');
				if (!folders.length) return;
				folders.each(function(i, folder) {
					if (folder.view) {
						folder.view.handleClickArrow(e);
					}
				});
			} else if (e.keyCode == 39 && e.ctrlKey) {
				var folders = $('.folder:not(.opened)');
				if (!folders.length) return;
				folders.each(function(i, folder) {
					if (folder.view) {
						folder.view.handleClickArrow(e);
					}
				});
			} else if (e.keyCode == 37) {
				var cs = $('.selected:first');
				if (cs.length && cs.hasClass('folder')) {
					cs.get(0).view.handleClickArrow(e);
				}
				e.preventDefault();
			} else if (e.keyCode == 39) {
				var cs = $('.selected:first');
				if (cs.length) {
					cs.get(0).view.showSourceItems({ noSelect: true, shiftKey: e.shiftKey, noFocus: true });
				}
				e.preventDefault();
			} else if (e.keyCode == 13) {
				var cs = $('.selected:first');
				if (cs.length) {
					cs.get(0).view.showSourceItems({ noSelect: true, shiftKey: e.shiftKey });
				}
				e.preventDefault();
			} else if (e.keyCode == 27) {
				if (sourcesContextMenu.el.parentNode) {
					// make sure the action gets executed
					contextMenus.hideAll();
					//sourcesContextMenu.hide();
				}
			}
		},
		handleLoadingChange: function(e) {
			if (bg.loader.get('loading') == true) {
				this.renderIndicator();
				$('#indicator').css('display', 'block');
			} else {
				setTimeout(function() {
					$('#indicator').css('display', 'none');
				}, 500);
			}
		},
		renderIndicator: function() {
			var l = bg.loader;
			if (l.get('maxSources') == 0) return;
			var perc = Math.round(l.get('loaded') * 100 / l.get('maxSources'));
			$('#indicator').css('background', 'linear-gradient(to right,  #c5c5c5 ' + perc + '%, #eee ' + perc + '%)');
			$('#indicator').html(bg.lang.c.UPDATING_FEEDS + ' (' + l.get('loaded') + '/' + l.get('maxSources') + ')');
		}
	});

	var app, list, toolbar;

	bg.appStarted.always(function() {
		list = new AppList();
		toolbar = new AppToolbar();
		app = new App();
	});

});

});