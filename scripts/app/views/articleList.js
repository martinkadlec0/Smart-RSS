/**
 * @module App
 * @submodule views/articleList
 */
define([
        'backbone', 'jquery', 'collections/Groups', 'models/Group', 'views/GroupView',
        'views/ItemView', 'mixins/selectable', 'modules/Locale'
    ],
    function (BB, $, Groups, Group, GroupView, ItemView, selectable, Locale) {

        var groups = new Groups();

        /**
         * List of articles
         * @class ArticleListView
         * @constructor
         * @extends Backbone.View
         */
        var ArticleListView = BB.View.extend({

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
            itemClass: 'articles-list-item',

            /**
             * Unordered list of all article views
             * @property views
             * @default []
             * @type Array
             */
            views: [],

            /**
             * Data received from feedList about current selection (feed ids, name of special, filter, unreadOnly)
             * @property currentData
             * @default { feeds: [], name: 'all-feeds', filter: { trashed: false}, unreadOnly: false }
             * @type Object
             */
            currentData: {
                feeds: [],
                name: 'all-feeds',
                filter: {trashed: false},
                unreadOnly: false
            },

            /**
             * Flag to prevent focusing more items in one tick
             * @property noFocus
             * @default false
             * @type Boolean
             */
            noFocus: false,

            events: {
                'dragstart .articles-list-item': 'handleDragStart',
                'click .articles-list-item': 'handleMouseDown',
                'mouseup .articles-list-item': 'handleMouseUp',
                'dblclick .articles-list-item': 'handleItemDblClick',
                'mousedown .item-pin,.item-pinned': 'handleClickPin'
            },

            /**
             * Opens articles url in new tab
             * @method handleItemDblClick
             * @triggered on double click on article
             */
            handleItemDblClick: function () {
                app.actions.execute('articles:oneFullArticle');
            },

            /**
             * Selects article
             * @method handleMouseDown
             * @triggered on mouse down on article
             * @param event {MouseEvent}
             */
            handleMouseDown: function (event) {
                this.handleSelectableMouseDown(event);
            },

            /**
             * Changes pin state
             * @method handleClickPin
             * @triggered on click on pin button
             * @param event {MouseEvent}
             */
            handleClickPin: function (event) {
                event.currentTarget.parentNode.view.handleClickPin(event);
            },

            /**
             * Calls neccesary slect methods
             * @method handleMouseUp
             * @triggered on mouse up on article
             * @param event {MouseEvent}
             */
            handleMouseUp: function (event) {
                event.currentTarget.view.handleMouseUp(event);
                this.handleSelectableMouseUp(event);
            },

            /**
             * Called when new instance is created
             * @method initialize
             */
            initialize: function () {
                this.el.classList.add('lines-' + bg.settings.get('lines'));
                bg.items.on('reset', this.addItems, this);
                bg.items.on('add', this.addItem, this);
                bg.items.on('sort', this.handleSort, this);
                bg.items.on('render-screen', this.handleRenderScreen, this);
                bg.settings.on('change:lines', this.handleChangeLines, this);
                bg.sources.on('destroy', this.handleSourcesDestroy, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);

                groups.on('add', this.addGroup, this);

                this.on('attach', this.handleAttached, this);
                this.on('pick', this.handlePick, this);
            },

            /**
             * Sends msg to show selected article
             * @method handlePick
             * @triggered when one article is selected
             * @param view {views/ItemView}
             */
            handlePick: function (view) {
                if (!view.model.collection) {
                    // This shouldn't usually happen
                    // It might happen when source is deleted and created in the same tick
                    return;
                }

                app.trigger('select:' + this.el.id, {action: 'new-select', value: view.model.id});

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
            handleAttached: function () {
                app.on('select:feed-list', function (data) {
                    this.el.scrollTop = 0;
                    this.unreadOnly = data.unreadOnly;

                    if (data.action === 'new-select') {
                        this.handleNewSelected(data);
                    }
                }, this);

                app.on('give-me-next', function () {
                    if (this.selectedItems[0] && this.selectedItems[0].model.get('unread') === true) {
                        this.selectedItems[0].model.save({unread: false});
                    }
                    this.selectNext({selectUnread: true});
                }, this);

                if (bg.sourceToFocus) {
                    setTimeout(function () {
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
            loadAllFeeds: function () {
                var that = this;
                setTimeout(function () {
                    app.trigger('select-all-feeds');

                    var unread = bg.items.where({trashed: false, unread: true});
                    if (unread.length) {
                        that.addItems(unread);
                    } else {
                        that.addItems(bg.items.where({trashed: false}));
                    }
                }, 0);

                return this;
            },

            /**
             * Renders unrendered articles in view by calling handleScroll
             * @method handleRenderScreen
             * @triggered when new items arr added or when source is destroyed
             */
            handleRenderScreen: function () {
                if ($('input[type=search]').val()) {
                    app.actions.execute('articles:search');
                }
            },


            /**
             * Unbinds all listeners to bg process
             * @method handleClearEvents
             * @triggered when tab is closed/refreshed
             * @param id {Number} id of the closed tab
             */
            handleClearEvents: function (id) {
                if (window === null || id === tabID) {
                    bg.items.off('reset', this.addItems, this);
                    bg.items.off('add', this.addItem, this);
                    bg.items.off('sort', this.handleSort, this);
                    bg.items.off('render-screen', this.handleRenderScreen, this);
                    bg.settings.off('change:lines', this.handleChangeLines, this);

                    bg.sources.off('destroy', this.handleSourcesDestroy, this);

                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },


            /**
             * Clears searchbox and sorts the list
             * @method handleSort
             * @triggered when sort setting is changed
             */
            handleSort: function () {
                $('#input-search').val('');
                this.handleNewSelected(this.currentData);
            },

            /**
             * Adds or removes necessary one-line/twoline classes for given lines settings
             * @method handleChangeLines
             * @triggered when lines setting is changed
             * @param settings {Settings} bg.Settings
             */
            handleChangeLines: function (settings) {
                const classList = this.el.classList;
                classList.remove('lines-auto');
                classList.remove('lines-one-line');
                classList.remove('lines-two-lines');
                classList.remove('lines-' + settings.get('lines'));
            },

            /**
             * Stores ids of dragged items
             * @method handleDragStart
             * @triggered on drag start
             * @param event {DragEvent}
             */
            handleDragStart: function (event) {
                var ids = this.selectedItems.map(function (view) {
                    return view.model.id;
                });

                event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(ids));
            },

            /**
             * Selects new item when the last selected is deleted
             * @method selectAfterDelete
             * @param view {views/ItemView}
             */
            selectAfterDelete: function (view) {
                if (view === this.selectedItems[0]) {
                    const children = Array.from(this.el.children);
                    const length = children.length;
                    if (children[length - 1].view === view) {
                        this.selectPrev({currentIsRemoved: true});
                    } else {
                        this.selectNext({currentIsRemoved: true});
                    }
                } else {
                    // if first item is the last item to be deleted, selecting it will trigger error - rAF to get around it
                    requestAnimationFrame(function () {
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
            inCurrentData: function (item) {
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
            addItem: function (item, noManualSort) {
                //Don't add newly fetched items to middle column, when they shouldn't be
                if (noManualSort !== true && !this.inCurrentData(item)) {
                    return false;
                }

                var after = null;
                if (noManualSort !== true) {
                    Array.from(($('#article-list .articles-list-item, #article-list .date-group'))).some(function (itemEl) {
                        if (bg.items.comparator(itemEl.view.model, item) === 1) {
                            after = itemEl;
                            return true;
                        }
                    });
                }

                var view;

                if (!after) {
                    view = new ItemView({model: item}, this);
                    view.render();
                    this.views.push(view);
                    this.$el.append(view.$el);
                    if (!this.selectedItems.length) {
                        this.select(view);
                    }
                } else {
                    view = new ItemView({model: item}, this);
                    view.render().$el.insertBefore($(after));
                    var indexElement = after.view instanceof ItemView ? after : after.nextElementSibling;
                    var index = indexElement ? this.views.indexOf(indexElement.view) : -1;
                    this.views.splice(index, 0, view);
                }

                if (!bg.settings.get('disableDateGroups') && bg.settings.get('sortBy') === 'date') {
                    var group = Group.getGroup(item.get('date'));
                    if (!groups.findWhere({title: group.title})) {
                        groups.add(new Group(group), {before: view.el});
                    }
                }
                // return view.$el;
            },

            /**
             * Adds new date group to the list
             * @method addGroup
             * @param model {models/Group} group create by groups.create
             * @param col {collections/Groups}
             * @param opt {Object} options { before: insertBeforeItem }
             */
            addGroup: function (model, col, opt) {
                var before = opt.before;
                var view = new GroupView({model: model}, groups);
                view.render().$el.insertBefore(before);
            },


            /**
             * Removes everything from lists and adds new collectino of articles
             * @method setItemHeight
             * @param items {Backbone.Collection} bg.Items
             */
            addItems: function (items) {
                let display = this.el.style.display;
                this.el.style.display = 'none';

                groups.reset();

                /**
                 * Select removal
                 */
                this.selectedItems = [];
                this.el.innerHTML = '';

                this.selectPivot = null;
                let els = [];

                items.forEach(function (item) {
                    els.push(this.addItem(item, true));
                }, this);

                // this.$el.append(els);


                if ($('input[type=search]').val()) {
                    app.actions.execute('articles:search');
                }
                this.el.style.display = display;
            },

            /**
             * Called every time when new feed is selected and before it is rendered
             * @method clearOnSelect
             */
            clearOnSelect: function () {
                // if prev selected was trash, hide undelete buttons
                if (this.currentData.name === 'trash') {
                    app.articles.toolbar.showItems('articles:update');
                    app.articles.toolbar.hideItems('articles:undelete');
                    $('#context-undelete').css('display', 'none');
                }

                this.currentData = {
                    feeds: [],
                    name: 'all-feeds',
                    filter: {trashed: false},
                    unreadOnly: false
                };

            },

            /**
             * Called every time when new feed is selected. Gets the right data from store.
             * @method handleNewSelected
             * @param data {Object} data object received from feed list
             */
            handleNewSelected: function (data) {
                this.clearOnSelect();
                this.currentData = data;

                var searchIn = null;
                if (data.filter) {
                    searchIn = bg.items.where(data.filter);
                } else {
                    searchIn = bg.items.where({trashed: false});
                }

                // if newly selected is trash
                if (this.currentData.name === 'trash') {
                    app.articles.toolbar.hideItems('articles:update').showItems('articles:undelete');
                    $('#context-undelete').css('display', 'block');
                }

                var items = searchIn.filter(function (item) {
                    if (!item.get('unread') && this.unreadOnly) return false;
                    return data.name || data.feeds.indexOf(item.get('sourceID')) >= 0;
                }, this);

                this.addItems(items);
            },


            /**
             * If current feed is removed, select all feeds
             * @triggered when any source is destroyed
             * @method handleSourcesDestroy
             * @param source {Source} Destroyed source
             */
            handleSourcesDestroy: function (source) {
                var that = this;
                var d = this.currentData;
                var index = d.feeds.indexOf(source.id);

                if (index >= 0) {
                    d.feeds.splice(index, 1);
                }

                if (!d.feeds.length && !d.filter) {

                    this.clearOnSelect();

                    if (document.querySelector('.articles-list-item')) {
                        this.once('items-destroyed', function () {
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
            undeleteItem: function (view) {
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
            removeItem: function (view) {
                askRmPinned = bg.settings.get('askRmPinned');
                if (view.model.get('pinned') && askRmPinned === 'all') {
                    var conf = confirm(Locale.PIN_QUESTION_A + view.model.escape('title') + Locale.PIN_QUESTION_B);
                    if (!conf) {
                        return;
                    }
                }
                view.model.save({trashed: true, visited: true});
                //this.destroyItem(view);
            },

            /**
             * Removes item from both source and trash leaving only info it has been already fetched and deleted
             * @method removeItemCompletely
             * @param view {views/ItemView} Removed article view
             */
            removeItemCompletely: function (view) {
                askRmPinned = bg.settings.get('askRmPinned');
                if (view.model.get('pinned') && askRmPinned && askRmPinned !== 'none') {
                    var conf = confirm(Locale.PIN_QUESTION_A + view.model.escape('title') + Locale.PIN_QUESTION_B);
                    if (!conf) {
                        return;
                    }
                }
                view.model.markAsDeleted();
            },

            /**
             * Calls undeleteItem/removeItem/removeItemCompletely in a batch for several items
             * @method destroyBatch
             * @param arr {Array} List of views
             * @param fn {Function} Function to be called on each view
             */
            destroyBatch: function (arr, fn) {
                for (var i = 0, j = arr.length; i < j; i++) {
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
            destroyItem: function (view) {
                this.nextFrameStore.push(view);
                if (!this.nextFrame) {
                    this.nextFrame = requestAnimationFrame(function () {
                        for (var i = 0, j = this.nextFrameStore.length - 1; i < j; i++) {
                            this.destroyItemFrame(this.nextFrameStore[i]);
                        }
                        var lastView = this.nextFrameStore[this.nextFrameStore.length - 1];
                        this.selectAfterDelete(lastView);
                        this.destroyItemFrame(lastView);

                        this.nextFrame = null;
                        this.nextFrameStore = [];

                        this.trigger('items-destroyed');
                    }.bind(this));
                }
            },

            /**
             * Called asynchronously from destroyItem. It does the real removing job.
             * @method destroyItemFrame
             * @param view {views/ItemView} Destroyed article view
             */
            destroyItemFrame: function (view) {
                // START: REMOVE DATE GROUP
                let prev = view.el.previousElementSibling;
                let next = view.el.nextElementSibling;
                if (prev && prev.classList.contains('date-group')) {
                    if (!next || next.classList.contains('date-group')) {
                        groups.remove(prev.view.model);
                    }
                }
                // END: REMOVE DATE GROUP

                view.clearEvents();
                view.remove();

                var io = this.selectedItems.indexOf(view);
                if (io >= 0) {
                    this.selectedItems.splice(io, 1);
                }
                io = this.views.indexOf(view);
                if (io >= 0) {
                    this.views.splice(io, 1);
                }
            },

            /**
             * Toggles unread state of selected items (with onlyToRead option)
             * @method changeUnreadState
             * @param opt {Object} Options { onlyToRead: bool }
             */
            changeUnreadState: function (opt) {
                opt = opt || {};
                var val = this.selectedItems.length && !opt.onlyToRead ? !this.selectedItems[0].model.get('unread') : false;
                this.selectedItems.forEach(function (item) {
                    if (!opt.onlyToRead || item.model.get('unread') === true) {
                        item.model.save({unread: val, visited: true});
                    }
                }, this);
            }
        });

        ArticleListView = ArticleListView.extend(selectable);

        return new ArticleListView();
    });