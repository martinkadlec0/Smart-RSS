/**
 * @module App
 * @submodule views/articleList
 */
define([
	'backbone', 'underscore', 'jquery', 'collections/Groups', 'models/Group', 'views/GroupView',
	'views/ItemView', 'mixins/selectable', 'modules/Locale'
],
function (BB, _, $, Groups, Group, GroupView, ItemView, selectable, Locale) {

	function isScrolledIntoView(elem) {
		if (!screen) {
			bg.sources.trigger('clear-events', -1);
			return false;
		}
		
		var docViewTop = 0;
		var docViewBottom = screen.height;

		var rect = elem.getBoundingClientRect();
		var elemTop = rect.top;
		var elemBottom = elemTop + rect.height;

		return (elemBottom >= docViewTop) && (elemTop <= docViewBottom);
		/*  && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) ;*/
	}

	var groups = new Groups();


	/**
	 * List of articles
	 * @class ArticleListView
	 * @constructor
	 * @extends Backbone.View
	 */
	var ArticleListView = BB.View.extend({
		/**
		 * Height of one article item (changes with layout and rems)
		 * @property _itemHeight
		 * @default 0
		 * @type Number
		 */
		_itemHeight: 0,

		/**
		 * Tag name of article list element
		 * @property tagName
		 * @default 'div'
		 * @type String
		 */
		tagName: 'div',

		/**
		 * ID of article list
		 * @property id
		 * @default 'article-list'
		 * @type String
		 */
		id: 'article-list',

		/**
		 * Class of article views
		 * @property itemClass
		 * @default 'item'
		 * @type string
		 */
		itemClass: 'item',

		/**
		 * Unordered list of all article views
		 * @property views
		 * @default []
		 * @type Array
		 */
		views: [],

		/**
		 * Order list of yet rendered article views
		 * @property viewsToRender
		 * @default []
		 * @type Array
		 */
		viewsToRender: [],

		
		/**
		 * Data received from feedList about current selection (feed ids, name of special, filter, unreadOnly)
		 * @property currentData
		 * @default { feeds: [], name: 'all-feeds', filter: { trashed: false}, unreadOnly: false }
		 * @type Object
		 */
		currentData: {
			feeds: [],
			searches: [],
			name: 'all-feeds',
			filter: { trashed: false },
			unreadOnly: false
		},

		/**
		 * Flag to prevent focusing more items in one tick
		 * @property noFocus
		 * @default false
		 * @type Boolean
		 */
		noFocus: false,

		/**
		 * All article views - unattached views
		 * @property reuseIndex
		 * @default 0
		 * @type Integer
		 */
		reuseIndex: 0,

		events: {
			'dragstart .item': 'handleDragStart',
			'mousedown .item': 'handleMouseDown',
			'mouseup .item': 'handleMouseUp',
			'dblclick .item': 'handleItemDblClick',
			'mousedown .item-pin,.item-pinned': 'handleClickPin',
		},

		/**
		 * Opens articles url in new tab
		 * @method handleItemDblClick
		 * @triggered on double click on article
		 */
		handleItemDblClick: function() {
			app.actions.execute('articles:oneFullArticle');
		},

		/**
		 * Selects article
		 * @method handleMouseDown
		 * @triggered on mouse down on article
		 * @param event {MouseEvent}
		 */
		handleMouseDown: function(e) {
			this.handleSelectableMouseDown(e);
		},

		/**
		 * Changes pin state
		 * @method handleClickPin
		 * @triggered on click on pin button
		 * @param event {MouseEvent}
		 */
		handleClickPin: function(e) {
			e.currentTarget.parentNode.view.handleClickPin(e);
		},

		/**
		 * Calls neccesary slect methods
		 * @method handleMouseUp
		 * @triggered on mouse up on article
		 * @param event {MouseEvent}
		 */
		handleMouseUp: function(e) {
			e.currentTarget.view.handleMouseUp(e);
			this.handleSelectableMouseUp(e);
		},

		/**
		 * Called when new instance is created
		 * @method initialize
		 */
		initialize: function() {

			this.$el.addClass('lines-' + bg.settings.get('lines'));
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			bg.items.on('sort', this.handleSort, this);
			bg.items.on('render-screen', this.handleRenderScreen, this);
			bg.settings.on('change:lines', this.handleChangeLines, this);
			bg.settings.on('change:layout', this.handleChangeLayout, this);
			bg.sources.on('destroy', this.handleSourcesDestroy, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			groups.on('add', this.addGroup, this);

			this.on('attach', this.handleAttached, this);
			this.on('pick', this.handlePick, this);


			this.$el.on('scroll', this.handleScroll.bind(this));

		},

		/**
		 * Sends msg to show selected article
		 * @method handlePick
		 * @triggered when one article is selected
		 * @param view {views/ItemView}
		 */
		handlePick: function(view) {
			if (!view.model.collection) {
				// This shouldn't usually happen
				// It might happen when source is deleted and created in the same tick
				return;
			}

			app.trigger('select:' + this.el.id, { action: 'new-select', value: view.model.id });

			if (view.model.get('unread') && bg.settings.get('readOnVisit')) {
				view.model.save({
					visited: true,
					unread: false
				});
			} else if (!view.model.get('visited')) {
				view.model.save('visited', true);
			}
		},

		/**
		 * Sets comm event listeners
		 * @method handleAttached
		 * @triggered when article list is attached to DOM
		 */
		handleAttached: function() {

			app.on('select:feed-list', function(data) {
				this.el.scrollTop = 0;
				this.unreadOnly = data.unreadOnly;

				if (data.action == 'new-select') {
					this.handleNewSelected(data);
				}
			}, this);

			app.on('give-me-next', function() {
				if (this.selectedItems[0] && this.selectedItems[0].model.get('unread') == true) {
					this.selectedItems[0].model.save({ unread: false });
				}
				this.selectNext({ selectUnread: true });
			}, this);

			if (bg.sourceToFocus) {
				setTimeout(function() {
					app.trigger('focus-feed', bg.sourceToFocus);
					bg.sourceToFocus = null;
				}, 0);
			} else {
				this.loadAllFeeds();
			}
		},

		/**
		 * Loads all untrashed feeds
		 * @method loadAllFeeds
		 * @chainable
		 */
		loadAllFeeds: function() {
			var that = this;
			setTimeout(function() {
				app.trigger('select-all-feeds');

				var unread = bg.items.where({ trashed: false, unread: true });
				if (unread.length) {
					that.addItems(unread);
				} else {
					that.addItems(bg.items.where({ trashed: false }));
				}
			}, 0);

			return this;
		},

		/**
		 * Renders unrendered articles in view by calling handleScroll
		 * @method handleRenderScreen
		 * @triggered when new items arr added or when source is destroyed
		 */
		handleRenderScreen: function() {
			this.redraw();
			if ($('input[type=search]').val() || this.currentData.searches.length) {
				app.actions.execute('articles:search');
			}
		},

		/**
		 * Calls redraw when user scrolls in list
		 * @method handleScroll
		 * @triggered when list is scrolled (and is called from many other places)
		 */
		handleScroll: function() {
			this.redraw();
		},

		/**
		 * Renders unrendered articles in view
		 * @method redraw
		 */
		redraw: function() {
			var start = -1;
			var count = 0;
			for (var i=0,j=this.viewsToRender.length; i<j; i++) {
				if ((start >= 0 && count % 10 != 0) || isScrolledIntoView(this.viewsToRender[i].el)) {
					this.viewsToRender[i].render();
					count++;
					if (start == -1) start = i;
				} else if (start >= 0) {
					break;
				}
			}


			if (start >= 0 && count > 0) {
				this.viewsToRender.splice(start, count);
			}
		},

		/**
		 * Unbinds all listeners to bg process
		 * @method handleClearEvents
		 * @triggered when tab is closed/refershed
		 * @param id {Integer} id of the closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				bg.items.off('reset', this.addItems, this);
				bg.items.off('add', this.addItem, this);
				bg.items.off('sort', this.handleSort, this);
				bg.items.off('render-screen', this.handleRenderScreen, this);
				bg.settings.off('change:lines', this.handleChangeLines, this);
				bg.settings.off('change:layout', this.handleChangeLayout, this);

				bg.sources.off('destroy', this.handleSourcesDestroy, this);
				
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},

		/**
		 * Sets new article item height and rerenders list
		 * @method handleChangeLayout
		 * @triggered when layout setting is changed
		 */
		handleChangeLayout: function() {
			var that = this;
			requestAnimationFrame(function() {
				that.setItemHeight();
				that.handleScroll();
			});
		},

		/**
		 * Clears searchbox and sorts the list
		 * @method handleSort
		 * @triggered when sort setting is changed
		 */
		handleSort: function() {
			$('#input-search').val('');
			
			this.handleNewSelected(this.currentData);
			
		},

		/**
		 * Adds or removes neccesary one-line/twoline classes for given lines settings
		 * @method handleChangeLines
		 * @triggered when lines setting is changed
		 * @param settings {Settings} bg.Settings
		 */
		handleChangeLines: function(settings) {
			this.$el.removeClass('lines-auto');
			this.$el.removeClass('lines-one-line');
			this.$el.removeClass('lines-two-lines');
			// this.$el.removeClass('lines-' + settings.previous('lines')); // does not work for some reason
			this.$el.addClass('lines-' + settings.get('lines'));
		},

		/**
		 * Stores ids of dragged items
		 * @method handleDragStart
		 * @triggered on drag start
		 * @param event {DragEvent}
		 */
		handleDragStart: function(e) {
			var ids = this.selectedItems.map(function(view) {
				return view.model.id;
			});

			e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(ids));
		},

		/**
		 * Selects new item when the last selected is deleted
		 * @method selectAfterDelete
		 * @param view {views/ItemView}
		 */
		selectAfterDelete: function(view) {
			if (view == this.selectedItems[0]) {
				var last = this.$el.find('.item:not(.invisible):last').get(0);
				if (last && view == last.view) {
					this.selectPrev({ currentIsRemoved: true });
				} else {
					this.selectNext({ currentIsRemoved: true });
				}
			} else {
				// if first item is the last item to be deleted, selecting it will trigger error - rAF to get around it
				requestAnimationFrame(function() {
					this.selectFirst();
				}.bind(this));
			}
		},

		/**
		 * Tests whether newly fetched item should be added to current list.
		 * (If the item's feed is selected)
		 * @method inCurrentData
		 * @return Boolean
		 * @param item {Item} bg.Item
		 */
		inCurrentData: function(item) {
			var f = this.currentData.feeds;
			if (!f.length) {
				if (!this.currentData.filter) {
					return true;
				} else if (item.query(this.currentData.filter)) {
					return true;
				}
			} else if (f.indexOf(item.get('sourceID')) >= 0) {
				return true;
			}

			return false;
		},

		/**
		 * Adds new article item to the list
		 * @method addItem
		 * @param item {Item} bg.Item
		 * @param noManualSort {Boolean} true when adding items in a batch in right order
		 */
		addItem: function(item, noManualSort) {
	
			//Don't add newly fetched items to middle column, when they shouldn't be
			if (noManualSort !== true && !this.inCurrentData(item)) {
				return false;
			}

		

			var after = null;
			if (noManualSort !== true) {
				$.makeArray($('#article-list .item, #article-list .date-group')).some(function(itemEl) {
					if (bg.items.comparator(itemEl.view.model, item) === 1) {
						after = itemEl;
						return true;
					}
				});
			}

			var view;

			if (!after) {
				if (this.reuseIndex >= this.views.length) {
					view = new ItemView({ model: item }, this);
					if (!this._itemHeight) {
						view.render();
					} else {
						view.$el.css('height', this._itemHeight + 'px');
						view.prerender();
					}
					this.$el.append(view.$el);
					this.views.push(view);
				} else {
					view = this.views[this.reuseIndex];
					view.swapModel(item);
				}
				
				if (!this.selectedItems.length) this.select(view);
			} else {
				view = new ItemView({ model: item }, this);
				view.render().$el.insertBefore($(after));
				
				// weee, this is definitelly not working 100% right :D or is it?
				var indexElement = after.view instanceof ItemView ? after : after.nextElementSibling;
				var index = indexElement ? this.views.indexOf(indexElement.view) : -1;
				if (index == -1) index = this.reuseIndex;

				this.views.splice(index, 0, view);
			}

			if (!this._itemHeight) {
				this._itemHeight = view.el.getBoundingClientRect().height;
			}


			if (!bg.settings.get('disableDateGroups') && bg.settings.get('sortBy') == 'date') {
				var group = Group.getGroup(item.get('date'));
				if (!groups.findWhere({ title: group.title })) {
					groups.add(new Group(group), { before: view.el });
				}
			}

			this.reuseIndex++;
		},

		/**
		 * Adds new date group to the list
		 * @method addGroup
		 * @param model {models/Group} group create by groups.create
		 * @param col {collections/Groups}
		 * @param opt {Object} options { before: insertBeforeItem }
		 */
		addGroup: function(model, col, opt) {
			var before = opt.before;
			var view = new GroupView({ model: model }, groups);
			
		
			view.render().$el.insertBefore(before);
		},

		/**
		 * Gets the height of one article items and stores it.
		 * @method setItemHeight
		 */
		setItemHeight: function() {
			var firstItem = this.$el.find('.item:not(.invisible):first');
			if (firstItem.length) {
				this._itemHeight = firstItem.get(0).getBoundingClientRect().height;
			}
		},

		/**
		 * Removes everything from lists and adds new collectino of articles
		 * @method setItemHeight
		 * @param items {Backbone.Collection} bg.Items
		 */
		addItems: function(items) {

			groups.reset();
			

			/**
			 * Select removal
			 */
			this.selectedItems = [];
			this.viewsToRender = [];
			this.$el.find('.selected').removeClass('.selected');
			this.$el.find('.last-selected').removeClass('.last-selected');
			this.selectPivot = null;
			/* --- */

			//var st = Date.now();

			this.setItemHeight();

			this.reuseIndex = 0;

			

			items.forEach(function(item) {
				this.addItem(item, true);
			}, this);

			for (var i=this.reuseIndex, j = this.views.length; i < j; i++) {
				if (!this.views[i].model) break;
				this.views[i].unplugModel();
			}

			this.redraw();

			if ($('input[type=search]').val() || this.currentData.searches.length) {
				app.actions.execute('articles:search');
			}

			//alert(Date.now() - st);

		},

		/**
		 * Called every time when new feed is selected and before it is rendered
		 * @method clearOnSelect
		 */
		clearOnSelect: function() {
			// Smart RSS used to reset search on feed select change. It instead keeps the fitler now.
			//$('input[type=search]').val('');

			// if trash was previously selected, hide undelete buttons
			if (this.currentData.name == 'trash') {
				app.articles.toolbar.showItems('articles:update').hideItems('articles:undelete');
				$('#context-undelete').css('display', 'none');
			}

			this.currentData = {
				feeds: [],
				searches: [],
				name: 'all-feeds',
				filter: { trashed: false },
				unreadOnly: false
			};

		},

		/**
		 * Called every time when new feed is selected. Gets the right data from store.
		 * @method handleNewSelected
		 * @param data {Object} data object received from feed list
		 */
		handleNewSelected: function(data) {
			this.clearOnSelect();
			this.currentData = data;

			var searchIn = null;
			if (data.filter) {
				searchIn = bg.items.where(data.filter);
			} else {
				searchIn = bg.items.where({ trashed: false });
			}

			// if newly selected is trash
			if (this.currentData.name == 'trash') {
				app.articles.toolbar.hideItems('articles:update').showItems('articles:undelete');
				$('#context-undelete').css('display', 'block');
			}

			var items = searchIn.filter(function(item) {
				if (!item.get('unread') && this.unreadOnly) return false;
				return data.name || data.feeds.indexOf(item.get('sourceID')) >= 0;
			}, this);

			this.addItems( items );
		},

		
		/**
		 * If current feed is removed, select all feeds
		 * @triggered when any source is destroyed
		 * @method handleSourcesDestroy
		 * @param source {Source} Destroyed source
		 */
		handleSourcesDestroy: function(source) {

			var that = this;
			var d = this.currentData;
			var index = d.feeds.indexOf(source.id);

			if (index >= 0) {
				d.feeds.splice(index, 1);
			}

			if (!d.feeds.length && !d.filter) {

				this.clearOnSelect();

				if (document.querySelector('.item')) {
					this.once('items-destroyed', function() {
						that.loadAllFeeds();
					}, this);
				} else {
					this.loadAllFeeds();
				}
			}

		},

		/**
		 * Moves item from trash back to its original source
		 * @method undeleteItem
		 * @param view {views/ItemView} Undeleted article view
		 */
		undeleteItem: function(view) {
			view.model.save({
				'trashed': false
			});
			this.destroyItem(view);
		},

		/**
		 * Moves item to trash
		 * @method removeItem
		 * @param view {views/ItemView} Removed article view
		 */
		removeItem: function(view) {
			view.model.save({ trashed: true, visited: true });
			//this.destroyItem(view);
		},

		/**
		 * Removes item from both source and trash leaving only info it has been already fetched and deleted
		 * @method removeItemCompletely
		 * @param view {views/ItemView} Removed article view
		 */
		removeItemCompletely: function(view) {
			if (view.model.get('pinned') && bg.settings.get('askRmPinned')) {
				var conf = confirm(Locale.c.PIN_QUESTION_A + view.model.escape('title') + Locale.c.PIN_QUESTION_B);
				if (!conf) {
					return;
				}
			}
			view.model.markAsDeleted();
			//this.destroyItem(view);
		},

		/**
		 * Calls undeleteItem/removeItem/removeItemCompletely in a batch for several items
		 * @method destroyBatch
		 * @param arr {Array} List of views
		 * @param fn {Function} Function to be called on each view
		 */
		destroyBatch: function(arr, fn) {
			for (var i=0, j=arr.length; i<j; i++) {
				fn.call(this, arr[i]);
			}
		},

		/**
		 * List of views to be closed when nextFrame animation frame is called
		 * @property nextFrame
		 * @default null
		 * @type Object
		 */
		nextFrameStore: [],

		/**
		 * RequestAnimationFrame return value for next destroy item call.
		 * @property nextFrame
		 * @default null
		 * @type Object
		 */
		nextFrame: null,

		/**
		 * Removes article view (clearing events and all)
		 * @method destroyItem
		 * @param view {views/ItemView} Destroyed article view
		 */
		destroyItem: function(view) {
			this.nextFrameStore.push(view);
			if (!this.nextFrame) {
				this.nextFrame = requestAnimationFrame(function() {
					for (var i=0, j=this.nextFrameStore.length - 1; i<j; i++) {
						this.destroyItemFrame(this.nextFrameStore[i]);
					}
					var lastView = this.nextFrameStore[this.nextFrameStore.length - 1];
					this.selectAfterDelete(lastView);
					this.destroyItemFrame(lastView);

					this.nextFrame = null;
					this.nextFrameStore = [];
					this.handleScroll();

					this.trigger('items-destroyed');

				}.bind(this));
			}
		},

		/**
		 * Called asynchronously from destroyItem. It does the real removing job.
		 * @method destroyItemFrame
		 * @param view {views/ItemView} Destroyed article view
		 */
		destroyItemFrame: function(view) {
			// START: REMOVE DATE GROUP
			/*var prev = view.el.previousElementSibling;
			var next = view.el.nextElementSibling;*/
			var prev = view.el.findPrev(':not(.unpluged)');
			var next = view.el.findNext(':not(.unpluged)');
			if (prev && prev.classList.contains('date-group')) {
				if (!next || next.classList.contains('date-group')) {
					groups.remove(prev.view.model);
				}
			}
			// END: REMOVE DATE GROUP

			view.clearEvents();
			// view.undelegateEvents(); - I moved all events to _list_ so this shouldn't be neccesary
			// view.$el.removeData() - i removed this as I don't use jquery .data, if I will in future I have to add it again
			// view.$el.unbind(); - - I'm not adding any jquery events
			// view.off(); - This takes from some reason quite a time, and does nothing because I'm not adding events on the view
			view.remove();
			
			var io = this.selectedItems.indexOf(view);
			if (io >= 0) this.selectedItems.splice(io, 1);
			io = this.views.indexOf(view);
			if (io >= 0) this.views.splice(io, 1);
			io = this.viewsToRender.indexOf(view);
			if (io >= 0) this.viewsToRender.splice(io, 1);
			
			this.reuseIndex--;
			if (this.reuseIndex < 0) {
				this.reuseIndex = 0;
				console.log('reuse index under zero');
			}
		},

		/**
		 * Toggles unread state of selected items (with onlyToRead option)
		 * @method changeUnreadState
		 * @param opt {Object} Options { onlyToRead: bool }
		 */
		changeUnreadState: function(opt) {
			opt = opt || {};
			var val = this.selectedItems.length && !opt.onlyToRead ? !this.selectedItems[0].model.get('unread') : false;
			this.selectedItems.forEach(function(item) {
				if (!opt.onlyToRead || item.model.get('unread') == true) {
					item.model.save({ unread: val, visited: true });
				}
				
			}, this);
		}
	});

	ArticleListView = ArticleListView.extend(selectable);

	return new ArticleListView();
});