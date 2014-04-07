/**
 * @module App
 * @submodule views/feedList
 */
define([
	'backbone', 'jquery', 'underscore', 'views/SourceView', 'views/FolderView', 'views/SpecialView', 'models/Special',
	'instances/contextMenus', 'mixins/selectable', 'instances/specials'
],
function (BB, $, _, SourceView, FolderView, SpecialView, Special, contextMenus, selectable, specials) {

	/**
	 * List of feeds (in left column)
	 * @class FeedListView
	 * @constructor
	 * @extends Backbone.View
	 */
	var FeedListView = BB.View.extend({

		/**
		 * Tag name of the list
		 * @property tagName
		 * @default 'div'
		 * @type String
		 */
		tagName: 'div',

		/**
		 * Class of feed list views
		 * @property itemClass
		 * @default 'list-item'
		 * @type String
		 */
		itemClass: 'list-item',

		/**
		 * ID of feed list
		 * @property id
		 * @default 'feed-list'
		 * @type String
		 */
		id: 'feed-list',

		events: {
			'dragstart .source':     'handleDragStart',
			'drop':                  'handleDrop',
			'drop [data-in-folder]': 'handleDrop',
			'drop .folder':          'handleDrop',
			'dragover':              'handleDragOver',
			'dragover .folder,[data-in-folder]':  'handleDragOver',
			'dragleave .folder,[data-in-folder]': 'handleDragLeave',
			'mousedown .list-item': 'handleMouseDown',
			'mouseup .list-item': 'handleMouseUp'
		},

		/**
		 * Called when new instance is created
		 * @method initialize
		 */
		initialize: function() {

			this.el.view = this;

			this.on('attach', this.handleAttach);

			bg.sources.on('reset', this.addSources, this);
			bg.sources.on('add', this.addSource, this);
			bg.sources.on('change:folderID', this.handleChangeFolder, this);
			bg.folders.on('add', this.addFolder, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			this.on('pick', this.handlePick);
			
		},

		/**
		 * Sets comm event listeners and inserts feeds
		 * @method handleAttached
		 * @triggered when feed list is attached to DOM
		 */
		handleAttach: function() {
			app.on('select-all-feeds', function() {
				var allFeeds = $('.special:first').get(0);
				if (!allFeeds) return;
				this.select(allFeeds.view);
			}, this);

			app.on('select-folder', function(id) {
				var folder = $('.folder[data-id=' + id + ']').get(0);
				if (!folder) return;
				this.select(folder.view);
			}, this);

			app.on('focus-feed', function(id) {
				var feed = $('.list-item[data-id=' + id + ']').get(0);
				if (!feed) return;
				this.select(feed.view);
				app.actions.execute('feeds:showAndFocusArticles');
			}, this);

			this.insertFeeds();
		},

		/**
		 * Adds folders specials and sources
		 * @method insertFeeds
		 * @@chainable
		 */
		insertFeeds: function() {
			this.addFolders(bg.folders);

			this.addSpecial(specials.allFeeds);
			this.addSpecial(specials.pinned);
			this.addSpecial(specials.trash);

			this.addSources(bg.sources);

			return this;
		},

		/**
		 * If one list-item was selected by left mouse button, show its articles.
		 * @triggered by selectable mixin.
		 * @method handlePick
		 * @param view {TopView} Picked source, folder or special
		 * @param event {Event} Mouse or key event
		 */
		handlePick: function(view, e) {
			if (e.type == 'mousedown' && e.which == 1) {
				//view.showSourceItems(e);
				app.actions.execute('feeds:showAndFocusArticles', e);
			}
		},

		/**
		 * Selectable mixin bindings. The selectable mixing will trigger "pick" event when items are selected.
		 * @method handleMouseDown
		 * @triggered on mouse down
		 * @param event {Event} Mouse event
		 */
		handleMouseDown: function(e) {
			//e.currentTarget.view.handleMouseDown(e);
			this.handleSelectableMouseDown(e);
		},

		/**
		 * Selectable mixin bindings, item bindings
		 * @method handleMouseUp
		 * @triggered on mouse up
		 * @param event {Event} Mouse event
		 */
		handleMouseUp: function(e) {
			e.currentTarget.view.handleMouseUp(e);
			this.handleSelectableMouseUp(e);
		},

		/**
		 * Add class to drop region elements
		 * @method handleMouseDown
		 * @triggered on drag over
		 * @param event {DragEvent} Drag event
		 */
		handleDragOver: function(e) {
			var f = e.currentTarget.dataset.inFolder;
			if (f) {
				$('.folder[data-id=' + f + ']').addClass('drag-over');
			} else if ($(e.currentTarget).hasClass('folder')) {
				$(e.currentTarget).addClass('drag-over');
			}
			e.preventDefault();
		},

		/**
		 * Remove class from drop region elements
		 * @method handleDragLeave
		 * @triggered on drag leave
		 * @param event {DragEvent} Drag event
		 */
		handleDragLeave: function(e) {
			var f = e.currentTarget.dataset.inFolder;
			if (f) {
				$('.folder[data-id=' + f + ']').removeClass('drag-over');
			} else if ($(e.currentTarget).hasClass('folder')) {
				$(e.currentTarget).removeClass('drag-over');
			}
		},

		/**
		 * Handle drop event (move feeds between folders)
		 * @method handleDrop
		 * @triggered on drop
		 * @param event {DragEvent} Drag event
		 */
		handleDrop: function(e) {

			var oe = e.originalEvent;
			e.preventDefault();

			$('.drag-over').removeClass('drag-over');

			var ids = JSON.parse( oe.dataTransfer.getData('dnd-sources') ) ;
			if (!ids || !ids.length) return;


			for (var i=0; i<ids.length; i++) {
				var id = ids[i];
				var item = bg.sources.findWhere({ id: id });
				if (!item) continue;

				var folderID;
				if ($(e.currentTarget).hasClass('folder')) {
					folderID = e.currentTarget.dataset.id;
				} else {
					folderID = e.currentTarget.dataset.inFolder;
				}

				item.save({ folderID: folderID });

			}

			e.stopPropagation();
		},

		/**
		 * Add feeds ids to drag data
		 * @method handleDragStart
		 * @triggered on drag start
		 * @param event {DragEvent} Drag event
		 */
		handleDragStart: function(e) {
			//var id = e.currentTarget.view.model.get('id');
			var models = _.pluck(this.selectedItems, 'model');
			var ids = [];
			models.forEach(function(model) {
				if (model instanceof bg.Source) {
					ids.push(model.id);
				}
			});

			e.originalEvent.dataTransfer.setData('dnd-sources', JSON.stringify(ids));
		},

		/**
		 * Place feed to the right place
		 * @method handleDragStart
		 * @triggered when folderID of feed is changed
		 * @param source {Source} Source tha has its folderID changed
		 */
		handleChangeFolder: function(source) {
			source = $('.source[data-id=' + source.get('id') + ']').get(0);
			if (!source) return;

			this.placeSource(source.view);
		},

		/**
		 * Unbinds all listeners to bg process
		 * @method handleClearEvents
		 * @triggered when tab is closed/refershed
		 * @param id {Integer} id of the closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				bg.sources.off('reset', this.addSources, this);
				bg.sources.off('add', this.addSource, this);
				bg.sources.off('change:folderID', this.handleChangeFolder, this);
				bg.folders.off('add', this.addFolder, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},

		/**
		 * Adds one special (all feeds, pinned, trash)
		 * @method addSpecial
		 * @param special {models/Special} Special model to add
		 */
		addSpecial: function(special) {

			var view = new SpecialView({ model: special });
			if (view.model.get('position') == 'top') {
				this.$el.prepend(view.render().el);
			} else {
				this.$el.append(view.render().el);
			}
			
		},

		/**
		 * Adds one folder
		 * @method addFolder
		 * @param folder {models/Folder} Folder model to add
		 */
		addFolder: function(folder) {
			var view = new FolderView({ model: folder }, this);
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

		/**
		 * Adds more folders ta once
		 * @method addFolders
		 * @param folders {Array} Array of folder models to add
		 */
		addFolders: function(folders) {
			var that = this;
			$('.folder').each(function(i, folder) {
				if (!folder.view || !(folder instanceof FolderView)) return;
				that.destroySource(folder.view);
			});
			folders.forEach(function(folder) {
				this.addFolder(folder);
			}, this);
		},

		/**
		 * Adds one source
		 * @method addSource
		 * @param source {models/Source} Source model to add
		 * @param noManualSort {Boolean} When false, the rigt place is computed
		 */
		addSource: function(source, noManualSort) {
			var view = new SourceView({ model: source }, this);
			this.placeSource(view, noManualSort === true ? true : false);
		},

		/**
		 * Places source to its right place
		 * @method placeSource
		 * @param view {views/TopView} Feed/Folder/Special to add
		 * @param noManualSort {Boolean} When false, the rigt place is computed
		 */
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
					view.$el.addClass('invisible');
				}

				return;
			}


			var fls;
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

		/**
		 * Insert element after another element
		 * @method insertBefore
		 * @param what {HTMLElement} Element to add
		 * @param where {HTMLElement} Element to add after
		 */
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

		/**
		 * Add more sources at once
		 * @method addSources
		 * @param sources {Array} Array of source models to add
		 */
		addSources: function(sources) {
			var that = this;
			$('.source').each(function(i, source) {
				if (!source.view || !(source instanceof SourceView)) return;
				that.destroySource(source.view);
			});
			sources.forEach(function(source) {
				this.addSource(source, true);
			}, this);
		},

		/**
		 * Destroy feed
		 * @method removeSource
		 * @param view {views/SourceView} View containg the model to be destroyed
		 */
		removeSource: function(view) {
			view.model.destroy();
		},


		/**
		 * Closes item view
		 * @method destroySource
		 * @param view {views/TopView} View to be closed
		 */
		destroySource: function(view) {
			view.clearEvents();
			view.undelegateEvents();
			view.$el.removeData().unbind();
			view.off();
			view.remove();
			var io = this.selectedItems.indexOf(view);
			if (io >= 0) {
				this.selectedItems.splice(io, 1);
			}
		},

		/**
		 * Get array of selected feeds (including feeds in selected folders)
		 * @method getSelectedFeeds
		 * @param arr {Array} List of selected items
		 */
		getSelectedFeeds: function(arr) {
			var si = arr || _.pluck(this.selectedItems, 'model');
			var rt = [];
			for (var i=0; i<si.length; i++) {
				if (si[i] instanceof bg.Source) {
					rt.push(si[i]);
				} else if (si[i] instanceof bg.Folder) {
					var folderFeeds = bg.sources.where({ folderID: si[i].id });
					rt.push.apply(rt, this.getSelectedFeeds(folderFeeds));
				}
			}

			return _.unique(rt);
		},

		/**
		 * Get array of selected folders
		 * @method getSelectedFolders
		 * @param arr {Array} List of selected items
		 */
		getSelectedFolders: function(arr) {
			var si = arr || _.pluck(this.selectedItems, 'model');
			var rt = [];
			for (var i=0; i<si.length; i++) {
				if (si[i] instanceof bg.Folder) {
					rt.push(si[i]);
					/*var folderFeeds = bg.sources.where({ folderID: si[i].id });
					rt.push.apply(rt, this.getSelectedFeeds(folderFeeds));*/
				}
			}

			return rt;
		}
	});

	FeedListView = FeedListView.extend(selectable);

	return new FeedListView();
});