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


chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	$('body').html( bg.translate($('body').html()) );

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
					source.save({ hasNew: false });
				});
				
			} else if (this.model instanceof bg.Source) {
				this.model.save({ hasNew: false });
			}

			
			window.top.frames[1].postMessage({
				action: 'new-select',
				value: this.model.id || this.model.get('filter'),
				name: this.model.get('name'),
				unreadOnly: !!e.shiftKey
			}, '*');
			
		}
	});

	var SourceView = TopView.extend({
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown',
		},
		className: 'list-item source',
		initialize: function() {
			this.el.setAttribute('draggable', 'true');
			this.model.on('change', this.render, this);
			this.model.on('destroy', this.handleModelDestroy, this);
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
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
		},
		render: function() {
			this.$el.toggleClass('has-unread', !!this.model.get('count'));

			if (this.model.get('folderID') > 0) {
				this.el.dataset.inFolder = this.model.get('folderID');
			} else {
				this.$el.css('display', 'flex');
				delete this.el.dataset.inFolder;
			}

			
			this.$el.attr('title', 
				this.model.get('title') + ' (' + this.model.get('count') + ' unread, ' + this.model.get('countAll') + ' total'
			);
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	var FolderView = TopView.extend({
		className: 'list-item folder',
		template: _.template($('#template-folder').html()),
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown',
			'click .folder-arrow': 'handleClickArrow'
		},
		showContextMenu: function(e) {
			this.select(e);
			folderContextMenu.currentSource = this.model;
			folderContextMenu.show(e.clientX, e.clientY);
		},
		initialize: function() {
			this.el.view = this;

			this.model.on('destroy', this.handleModelDestroy, this);
			this.model.on('change:title', this.render, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.el.dataset.id = this.model.get('id');
		},
		clearEvents: function() {
			this.model.off('destroy', this.handleModelDestroy, this);
			this.model.off('change:title', this.render, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
		},
		handleClickArrow: function(e) {
			this.model.save('opened', !this.model.get('opened'));
			$('.source[data-in-folder=' + this.model.get('id') + ']').css('display', this.model.get('opened') ? 'flex' : 'none');
			this.render();
			e.stopPropagation();
		},
		template: _.template($('#template-folder').html()),
		render: function() {
			this.model.save('opened', this.model.get('opened'));
			var data = Object.create(this.model.attributes);
			this.$el.toggleClass('opened', this.model.get('opened'));
			this.$el.html(this.template(data));
			return this;
		},
		showSourceItems: function(e) {
			e = e || {};
			if (!e.noSelect) this.select(e);
			
			
			window.top.frames[1].postMessage({
				action: 'new-folder-select',
				value: this.model.id,
				unreadOnly: !!e.shiftKey
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
			'mousedown': 'handleMouseDown'
		},
		showContextMenu: function(e) {
			if (this.model.get('name') != 'trash') return;
			this.select(e);
			trashContextMenu.currentSource = this.model;
			trashContextMenu.show(e.clientX, e.clientY);
		},
		initialize: function() {
			this.el.view = this;
			if (this.model.get('onReady')) {
				this.model.get('onReady').call(this);
			}
		},
		template: _.template($('#template-special').html()),
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
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

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-add-folder': 'addFolderDialog',
			'click #button-reload': 'reloadSources'
		},
		initialize: function() {
			
		},
		addFolderDialog: function() {
			var title = (prompt('Folder name: ') || '').trim();
			if (!title) return;

			bg.folders.create({
				id: bg.folderIdIndex++,
				title: title
			});

		},
		addSourceDialog: function() {
			var url = (prompt(bg.lang.c.RSS_FEED_URL) || '').trim();
			if (!url)  return;

			url = fixURL(url);
			bg.sources.create({
				id: bg.sourceIdIndex++,
				title: url,
				url: url,
				updateEvery: 180
			}).fetch();

			localStorage.setItem('sourceIdIndex', bg.sourceIdIndex);
		
		},
		reloadSources: function() {
			bg.downloadAll(true);
		}
	}));


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
				bg.items.where({ sourceID: id }).forEach(function(item) {
					item.save({
						unread: false,
						visited: true
					});
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
					item.save({
						unread: false,
						visited: true
					});
				});
			}
		},
		{ 
			title: bg.lang.c.EMPTY_TRASH,
			icon: 'delete.png',
			action: function() { 
				if (confirm(bg.lang.c.REALLY_DELETE)) {
					bg.items.where({ trashed: true, deleted: false }).forEach(function(item) {
						item.markAsDeleted();
					});
				}
			}
		}
	]);

	var folderContextMenu = new ContextMenu([
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
			title: 'Rename',
			action: function() { 
				var newTitle = prompt('Title: ', list.selectedItems[0].model.get('title'));
				if (!newTitle) return;

				list.selectedItems[0].model.save({ title: newTitle });
			}
		}
	]);

	var contextMenus = new (Backbone.View.extend({
		list: [],
		initialize: function() {
			this.list = [sourcesContextMenu, trashContextMenu, folderContextMenu];
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

	var list = new (Backbone.View.extend({
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
				name: 'all-feeds'
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

			var id = parseInt(oe.dataTransfer.getData('dnd-sources') || 0);
			if (!id) return;

			var item = bg.sources.findWhere({ id: id });
			if (!item) return;

			if ($(e.currentTarget).hasClass('folder')) {
				var folderID = parseInt(e.currentTarget.dataset.id || 0);
			} else {
				var folderID = parseInt(e.currentTarget.dataset.inFolder || 0);	
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
			if (source.get('folderID') > 0) {
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
					view.$el.css('display', 'none');
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
				if (bg.sources.comparator(el.view.model, what.model) == 1) {
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
	}));

	var app = new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.renderIndicator, this);
			bg.loader.on('change:maxSources', this.renderIndicator, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.handleLoadingChange();

			window.addEventListener('resize', this.handleResize.bind(this));
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.loader.off('change:loading', this.handleLoadingChange, this);
				bg.loader.off('change:loaded', this.renderIndicator, this);
				bg.loader.off('change:maxSources', this.renderIndicator, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		handleResize: function() {
			var wid = $(window).width();
			bg.settings.save({ posA: wid + ',*' });
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
					s = cs.prevAll('.source:first').get(0);
				} else {
					s = $('.source:last').get(0);
				}
				if (s) s.view.select();
				e.preventDefault();
			} else if (e.keyCode == 40) {
				var cs = $('.selected:first');
				var s;
				if (cs.length) {
					s = cs.nextAll('.source:first').get(0);
				} else {
					s = $('.source:first').get(0);
				}
				if (s) s.view.select();
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
	}));
});

});