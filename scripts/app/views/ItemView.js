define([
	'backbone', 'jquery', 'underscore', 'helpers/formatDate', 'instances/contextMenus'
], function(BB, $, _, formatDate, contextMenus) {
	var ItemView = BB.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		list: null,
		initialize: function(opt, list) {
			this.list = list;
			this.el.setAttribute('draggable', 'true');
			this.el.view = this;
			this.setEvents();
		},
		setEvents: function() {
			this.model.on('change', this.handleModelChange, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
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
		prerendered: false,
		prerender: function() {
			this.prerendered = true;
			this.list.viewsToRender.push(this);
			this.el.className = this.model.get('unread') ? 'item unread' : 'item';
		},
		unplugModel: function() {
			if (this.model) {
				this.el.className = 'unpluged';
				this.clearEvents();
				this.model = null;
				this.el.innerHTML = '';
				if (this.list._itemHeight) this.$el.css('height', this.list._itemHeight + 'px');
			}
		},
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.clearEvents();
			}
		},
		clearEvents: function() {
			if (this.model) {
				this.model.off('change', this.handleModelChange, this);
				this.model.off('destroy', this.handleModelDestroy, this);
			}
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
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

		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},

		showContextMenu: function(e) {
			if (!this.$el.hasClass('selected')) {
				this.list.select(this, e);
			}
			contextMenus.get('items').currentSource = this.model;
			contextMenus.get('items').show(e.clientX, e.clientY);
		},
		
		handleModelChange: function() {
			if (this.model.get('deleted') || (this.list.specialName != 'trash' && this.model.get('trashed')) ) {
				this.list.destroyItem(this);
			} else {
				this.render();
			}
		},
		handleModelDestroy: function(mod, col, opt) {
			if (opt.noFocus && this.list.currentSource) return;
			this.list.destroyItem(this);
		},
		handleClickPin: function(e) {
			e.stopPropagation();
			this.model.save({ pinned: !this.model.get('pinned') });
		}
	});

	return ItemView;
});