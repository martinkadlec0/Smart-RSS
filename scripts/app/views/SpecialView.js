define([
	'jquery', 'underscore', 'views/TopView', 'text!templates/special.html'
],
function($, _, TopView, tplSpecial) {
	var SpecialView = TopView.extend({
		className: 'list-item special',
		template: _.template(tplSpecial),
		/*events: {
			'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown'
		},*/
		showContextMenu: function(e) {
			if (!this.contextMenu) return;
			
			if (!this.$el.hasClass('selected')) {
				app.feeds.feedList.select(this, e);
			}
			this.contextMenu.currentSource = this.model;
			this.contextMenu.show(e.clientX, e.clientY);
		},
		initialize: function() {
			this.el.view = this;
			if (this.model.get('onReady')) {
				this.model.get('onReady').call(this);
			}
			bg.info.on('change', this.changeInfo, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.clearEvents();
			}
		},
		clearEvents: function() {
			bg.info.off('change', this.changeInfo, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		changeInfo: function() {
			if (this.model.get('name') == 'all-feeds') {
				this.setTitle(bg.info.get('allCountUnread'), bg.info.get('allCountTotal'));
			} else if (this.model.get('name') == 'trash') {
				var tot = bg.info.get('trashCountTotal');
				this.setTitle(bg.info.get('trashCountUnread'), tot);

				/**
				 * Change trash icon (0, 1-99, 100+)
				 */
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
		render: function(noinfo) {
			this.$el.html(this.template(this.model.toJSON()));
			if (!noinfo) this.changeInfo();
			return this;
		}
	});
	
	return SpecialView;
});