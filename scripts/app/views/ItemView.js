/**
 * @module App
 * @submodule views/ItemView
 */
define([
	'backbone', 'jquery', 'underscore', 'helpers/formatDate', 'instances/contextMenus'
], function(BB, $, _, formatDate, contextMenus) {

	/**
	 * View of one article item in article list
	 * @class ItemView
	 * @constructor
	 * @extends Backbone.View
	 */
	var ItemView = BB.View.extend({

		/**
		 * Tag name of article item element
		 * @property tagName
		 * @default 'div'
		 * @type String
		 */
		tagName: 'div',

		/**
		 * Class name of article item element
		 * @property className
		 * @default 'item'
		 * @type String
		 */
		className: 'item',

		/**
		 * Article item view template
		 * @property template
		 * @default #template-item
		 * @type Function
		 */
		template: _.template($('#template-item').html()),

		/**
		 * Reference to view/articleList instance. It should be replaced with require('views/articleList')
		 * @property list
		 * @default null
		 * @type Backbone.View
		 */
		list: null,

		/**
		 * Initializations (*constructor*)
		 * @method initialize
		 * @param opt {Object} I don't use it, but it is automatically passed by Backbone
		 * @param list {Backbone.View} Reference to articleList
		 */
		initialize: function(opt, list) {
			this.list = list;
			this.el.setAttribute('draggable', 'true');
			this.el.view = this;
			this.setEvents();
		},

		/**
		 * Set events that are binded to bgprocess
		 * @method setEvents
		 */
		setEvents: function() {
			this.model.on('change', this.handleModelChange, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},

		/**
		 * Swaps models of view.
		 * It reuses already created DOM when changing selected feeds/folders.
		 * @method swapModel
		 * @param newModel {Item} Item model to be used
		 */
		swapModel: function(newModel) {
			if (this.model == newModel) {
				this.prerender();
				return;
			}
			if (this.model) {
				this.clearEvents();
			}
			this.model = newModel;
			this.setEvents();
			this.prerender();
		},

		/**
		 * Indiciates whether the item was prerendered (true) or already fully-rendered (false).
		 * When prerendered, only the classNames are set without any text content.
		 * Prerendering is used for not-visible items in the list. 
		 * @property prerendered
		 * @default false
		 * @type Boolean
		 */
		prerendered: false,

		/**
		 * Prerenders view. (More info on prerenderer property).
		 * @method prerender
		 */
		prerender: function() {
			this.prerendered = true;
			this.list.viewsToRender.push(this);
			this.el.className = this.model.get('unread') ? 'item unread' : 'item';
		},

		/**
		 * Removes item content without removing the actuall DOM and Backbone view. 
		 * When changing selected feed with _m_ items to another feed with _n_ items where n<m
		 * then the first n items use the swapModel method and the rest unplugModel method.
		 * @method unplugModel
		 */
		unplugModel: function() {
			if (this.model) {
				this.el.className = 'unpluged';
				this.clearEvents();
				this.model = null;
				this.el.innerHTML = '';
				if (this.list._itemHeight) this.$el.css('height', this.list._itemHeight + 'px');
			}
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
			if (this.model) {
				this.model.off('change', this.handleModelChange, this);
				this.model.off('destroy', this.handleModelDestroy, this);
			}
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},

		/**
		 * Renders article item view
		 * @method render
		 * @chainable
		 */
		render: function() {

			this.$el.toggleClass('unvisited', !this.model.get('visited'));
			this.$el.toggleClass('unread', this.model.get('unread'));

			var ca = this.model.changedAttributes();
			if (ca) {
				var caKeys =  Object.keys(ca);
				if ( ( ('unread' in ca || 'visited' in ca) && caKeys.length == 1) || ('unread' in ca && 'visited' in ca && caKeys.length == 2) ) {
					return this;
				}
			}

			this.$el.css('height','');
			var data = this.model.toJSON();

			data.date = this.getItemDate(data.date);

			//this.el.title = data.title + '\n' + formatDate(this.model.get('date'), pickedFormat + ' ' + timeFormatTitle);
			
			this.$el.html(this.template(data));

			return this;
		},

		/**
		 * Returns formated date according to user settings and time interval
		 * @method getItemDate
		 * @param date {Integer} UTC time
		 * @return String
		 */
		getItemDate: function(date) {
			var dateFormats = { normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY' };
			var pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

			var timeFormat = bg.settings.get('hoursFormat') == '12h' ? 'H:mm a' : 'hh:mm';
			//var timeFormatTitle = bg.settings.get('hoursFormat') == '12h' ? 'H:mm a' : 'hh:mm:ss';

			if (date) {
				if (bg.settings.get('fullDate')) {
					date = formatDate(new Date(date), pickedFormat + ' ' + timeFormat);
				} else if (parseInt(formatDate(date, 'T') / 86400000, 10) >= parseInt(formatDate(Date.now(), 'T') / 86400000, 10)) {
					date = formatDate(new Date(date), timeFormat);
				} else if ((new Date(date)).getFullYear() == (new Date()).getFullYear() ) {
					date = formatDate(new Date(date), pickedFormat.replace(/\/?YYYY(?!-)/, ''));
				} else {
					date = formatDate(new Date(date), pickedFormat);
				}
			}

			return date;
		},

		/**
		 * Shows context menu on right click
		 * @method handleMouseUp
		 * @triggered on mouse up + condition for right click only
		 * @param event {MouseEvent}
		 */
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},

		/**
		 * Shows context menu for article item
		 * @method showContextMenu
		 * @param event {MouseEvent}
		 */
		showContextMenu: function(e) {
			if (!this.$el.hasClass('selected')) {
				this.list.select(this, e);
			}
			contextMenus.get('items').currentSource = this.model;
			contextMenus.get('items').show(e.clientX, e.clientY);
		},
		
		/**
		 * When model is changed rerender it or remove it from DOM (depending on what is changed)
		 * @method handleModelChange
		 * @triggered when model is changed
		 */
		handleModelChange: function() {
			if (this.model.get('deleted') || (this.list.currentData.name != 'trash' && this.model.get('trashed')) ) {
				this.list.destroyItem(this);
			} else {
				this.render();
			}
		},

		/**
		 * When model is removed from DB/Backbone remove it from DOM as well
		 * @method handleModelDestroy
		 * @triggered when model is destroyed
		 */
		/****this.list.currentSource does not exsits anymore****/
		handleModelDestroy: function(mod, col, opt) {
			if (opt.noFocus && this.list.currentSource) return;
			this.list.destroyItem(this);
		},

		/**
		 * Changes pin state (true/false)
		 * @method when user clicked on pin button in article item
		 * @triggered when model is destroyed
		 */
		handleClickPin: function(e) {
			e.stopPropagation();
			this.model.save({ pinned: !this.model.get('pinned') });
		}
	});

	return ItemView;
});