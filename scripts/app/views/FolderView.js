/**
 * @module App
 * @submodule views/FolderView
 */
define([
	'backbone', 'jquery', 'underscore', 'views/TopView', 'instances/contextMenus', 'text!templates/folder.html'
],
function(BB, $, _, TopView, contextMenus, tplFolder) {

	/**
	 * View for Folder in feed list
	 * @class FolderView
	 * @constructor
	 * @extends views/TopView
	 */
	var FolderView = TopView.extend({

		/**
		 * Set CSS classnames
		 * @property className
		 * @default 'list-item folder'
		 * @type String
		 */
		className: 'list-item folder',

		/**
		 * Folder view template
		 * @property template
		 * @default ./templates/folder.html
		 * @type Function
		 */
		template: _.template(tplFolder),

		/**
		 * Reference to view/feedList instance. It should be replaced with require('views/feedList')
		 * @property list
		 * @default null
		 * @type Backbone.View
		 */
		list: null,
		events: {
			'dblclick': 'handleDoubleClick',
			/*'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown',*/
			'click .folder-arrow': 'handleClickArrow'
		},

		/**
		 * Opens/closes folder by calling handleClickArrow method
		 * @method handleDoubleClick
		 * @triggered on double click on the folder
		 * @param event {MouseEvent}
		 */
		handleDoubleClick: function(e) {
			this.handleClickArrow(e);
		},

		/**
		 * Shows context menu for folder
		 * @method showContextMenu
		 * @triggered on right mouse click
		 * @param event {MouseEvent}
		 */
		showContextMenu: function(e) {
			if (!this.$el.hasClass('selected')) {
				this.list.select(this, e);
			}
			contextMenus.get('folder').currentSource = this.model;
			contextMenus.get('folder').show(e.clientX, e.clientY);
		},

		/**
		 * Initializations (*constructor*)
		 * @method initialize
		 * @param opt {Object} I don't use it, but it is automatically passed by Backbone
		 * @param list {Backbone.View} Reference to feedList
		 */
		initialize: function(opt, list) {
			this.list = list;
			this.el.view = this;

			this.model.on('destroy', this.handleModelDestroy, this);
			this.model.on('change', this.render, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			this.el.dataset.id = this.model.get('id');
		},

		/**
		 * If the tab is closed, it will remove all events binded to bgprocess
		 * @method handleClearEvents
		 * @triggered when bgprocesses triggers clear-events event
		 * @param id {Number} ID of closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.clearEvents();
			}
		},

		/**
		 * Removes all events binded to bgprocess
		 * @method clearEvents
		 */
		clearEvents: function() {
			this.model.off('destroy', this.handleModelDestroy, this);
			this.model.off('change', this.render, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},

		/**
		 * If the folder model is removed from DB/Backbone then remove it from DOM as well
		 * @method handleModelDestroy
		 * @triggered When model is removed from DB/Backbone
		 * @param id {Number} ID of closed tab
		 */
		handleModelDestroy: function() {
			this.list.destroySource(this);
		},

		/**
		 * If user clicks on folder arrow then show/hide its content
		 * @method handleClickArrow
		 * @triggered  Left click on folder arrow
		 * @param e {MouseEvent}
		 */
		handleClickArrow: function(e) {
			this.model.save('opened', !this.model.get('opened'));
			$('.source[data-in-folder=' + this.model.get('id') + ']').toggleClass('invisible', !this.model.get('opened'));
			e.stopPropagation();
		},

		/**
		 * Reference to requestAnimationFrame frame. It is used to prevent multiple render calls in one frame
		 * @property renderInterval
		 * @type String|Number
		 */
		renderInterval: 'first-time',

		/**
		 * Sets renderInterval to render folder view
		 * @method render
		 */
		render: function() {
			if (this.renderInterval == 'first-time') return this.realRender();
			if (this.renderInterval) return this;
			
			var that = this;
			this.renderInterval = requestAnimationFrame(function() {
				that.realRender();
			});
			return this;
		},

		/**
		 * Renders folder view
		 * @method realRender
		 */
		realRender: function() {
			this.$el.toggleClass('has-unread', !!this.model.get('count'));
			
			var data = Object.create(this.model.attributes);
			this.$el.toggleClass('opened', this.model.get('opened'));
			this.$el.html(this.template(data));

			this.setTitle(this.model.get('count'), this.model.get('countAll'));

			this.renderInterval = null;

			return this;
		},

		/**
		 * Data to send to middle column (list of articles) when folder is selected
		 * @method render
		 * @param e {MouseEvent}
		 */
		getSelectData: function(e) {
			return {
				action: 'new-folder-select',
				value: this.model.id,
				unreadOnly: !!e.altKey
			};
		}
	});
	
	return FolderView;
});