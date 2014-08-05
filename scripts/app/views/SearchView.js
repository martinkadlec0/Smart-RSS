define([
	'jquery', 'underscore', 'views/TopView', 'text!templates/search.html'
],
function($, _, TopView, tplSearch) {

	var SearchView = TopView.extend({

		className: 'list-item search-item',
		template: _.template(tplSearch),

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
			
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.clearEvents();
			}
		},
		clearEvents: function() {
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		render: function() {
			var data = this.model.toJSON();
			this.$el.html(this.template(data));
			return this;
		}
	});
	
	return SearchView;
});