define(['backbone', 'underscore', 'jquery', 'helpers/formatDate'], function(BB, _, $, formatDate) {
	var LogView = BB.View.extend({
		tagName: 'footer',
		events: {
			'click #button-hide-log': 'hide'
		},
		initialize: function() {
			this.template = _.template($('#template-log').html());
			this.$el.html(this.template({}));

			bg.logs.on('add', this.addItem, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				bg.logs.off('add', this.addItem, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		addItem: function(model) {
			this.show();
			$('<div class="log">' + formatDate(new Date, 'hh:mm:ss') + ': ' + model.get('message') + '</div>').insertAfter(this.$el.find('#button-hide-log'));
		},
		show: function() {
			this.$el.css('display', 'block');
		},
		hide: function() {
			this.$el.css('display', 'none');
		}
	});

	return LogView;
});