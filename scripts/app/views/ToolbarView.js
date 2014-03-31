define([
	'backbone',  'collections/ToolbarItems', 'jquery', 'factories/ToolbarItemsFactory', 'underscore'
],
function (BB, ToolbarItems, $, ToolbarItemsFactory, _) {
	var ToolbarView = BB.View.extend({
		tagName: 'div',
		className: 'toolbar',
		items: null,
		doNotRegenerate: false,
		events: {
			'click .button': 'handleButtonClick',
			'input input[type=search]': 'handleButtonClick',
			/**** replace with "drop" to implement dnd between toolbars ****/
			'dragend': 'handleDragEnd',
			'dragover': 'handleDragOver'
		},
		initialize: function() {
			this.el.view = this;
			this.items = new ToolbarItems();

			this.listenTo(this.items, 'add', this.addToolbarItem);
			this.listenTo(this.model, 'change', this.handleChange);
			bg.sources.on('clear-events', this.handleClearEvents, this);


			this.model.get('actions').forEach(this.createToolbarItem, this);
			this.hideItems('articles:undelete');
		},

		/**
		 * If the tab is closed, it will remove all events binded to bgprocess
		 * @method handleClearEvents
		 * @triggered when bgprocesses triggers clear-events event
		 * @param id {Number} ID of closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.stopListening();
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},

		/**
		 * Regenerates DOM of items according to new chnages
		 * @triggered when some change to Toolbar modle happens
		 * @method handleChange
		 */
		handleChange: function() {
			if (!this.doNotRegenerate) {
				this.$el.find('> *').remove();
				this.items.reset();

				this.model.get('actions').forEach(this.createToolbarItem, this);

				if (app.articles.articleList.currentData.name == 'trash') {
					this.hideItems('articles:update');
				} else {
					this.hideItems('articles:undelete');
				}
			}
		},
		/**
		 * List of hidden toolbar items. The reason for storing hidden items is so that we can show all hiden items when customizing ui.
		 * @param hiddenItems
		 * @type Array
		 */
		hiddenItems: [],
		hideItems: function(action) {
			var list = this.$el.find('> [data-action="' + action + '"]').hide().toArray();
			this.hiddenItems = _.uniq(this.hiddenItems.concat(list));
		},
		showItems: function(action) {
			this.hiddenItems = this.hiddenItems.filter(function(item) {
				if (item.dataset.action == action) {
					$(item).show();
					return false;
				}
				return true;
			});
		},



		/**
		 * Called for every Toolbar action when ToolbarView is initalized
		 * @method createToolbarItem
		 * @param action {String} Name of the action
		 */
		createToolbarItem: function(action) {
			if (action == '!dynamicSpace')	{
				this.items.add({ type: 'dynamicSpace' });
				return null;
			}
			this.items.add({ actionName: action, type: 'button' });
		},
		handleButtonClick: function(e) {
			var button = e.currentTarget.view.model;
			app.actions.execute(button.get('actionName'), e);
		},
		render: function() {
			return this;
		},

		/**
		 * Called when new model was added to _items_ collection
		 * @method addToolbarItem
		 * @param toolbarItem {ToolbarButton} Model added to the collection
		 */
		addToolbarItem: function(toolbarItem) {
			var view;
			if (toolbarItem.get('actionName') == 'articles:search') {
				view = ToolbarItemsFactory.create('search', toolbarItem);
			} else if (toolbarItem.get('type') != 'dynamicSpace') {
				view = ToolbarItemsFactory.create('button', toolbarItem);
			} else {
				view = ToolbarItemsFactory.create('dynamicSpace', toolbarItem);
			}

			this.$el.append(view.render().el);
			toolbarItem.view = view;
		},

		handleDragEnd: function(e) {
			e.stopPropagation();
			var t = e.originalEvent.target;

			// toolbarItems are sorted by left position
			this.items.sort();
			var moved = this.items.some(function(item) {
				var r = item.view.el.getBoundingClientRect();

				// if the toolbarItem is hidden (e.g. undelete button)
				if (r.left == 0) return false;

				if (r.left + r.width/2 > e.originalEvent.clientX) {
					if (item.view.el == t) return true;

					$(t).insertBefore(item.view.$el);
					return true;
				}
			});

			if (!moved) {
				this.$el.append(t);
			}
			this.items.sort();
			this.saveToDB();

			this.hiddenItems.forEach(function(item) {
				$(item).hide();
			});
		},
		saveToDB: function() {
			this.doNotRegenerate = true;
			var list = this.items.pluck('actionName');
			list = list.map(function(action, i) {
				if (action == 'global:default') {
					if (this.items.at(i).get('type') == 'dynamicSpace') {
						return '!dynamicSpace';
					}
				}
				return action;
			}, this);

			this.model.set('actions', list);
			this.model.save();
			this.doNotRegenerate = false;
		},

		/**
		 * Shows all hidden items during drag
		 * @triggered when user drags item over to the toolbar (which happens immidiatelly)
		 * @method handleDragStart
		 */
		handleDragOver: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.hiddenItems.forEach(function(item) {
				$(item).show();
			});
		}
	});

	return ToolbarView;
});