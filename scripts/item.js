chrome.runtime.getBackgroundPage(function(bg) {

$(function() {
	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-print': 'handleButtonPrint',
			'click #button-read': 'handleButtonRead',
			'click #button-delete': 'handleButtonDelete'
		},
		initialize: function() {
			
		},
		handleButtonPrint: function() {
			window.print();
		},
		handleButtonRead: function() {
			itemView.model.save({
				unread: !itemView.model.get('unread')
			});
		},
		handleButtonDelete: function() {
			itemView.model.save({
				'deleted': true,
				'content': '',
				'author': '',
				'title': ''
			});
			itemView.getSome();
		}
	}));

	var itemView = new (Backbone.View.extend({
		el: '#item',
		template: _.template($('#template-item').html()),
		events: {
			
		},
		initialize: function() {
			bg.items.on('new-selected', this.handleNewSelected, this);
			this.getSome();
		},
		getSome: function() {
			var first = bg.items.findWhere({ deleted: false });
			if (first) {
				this.$el.css('display', 'block');
				this.model = first;
				this.model.on('destroy', this.getSome, this);
				this.render();
			} else {
				this.$el.css('display', 'none');
			}
		},
		render: function() {
			var data = this.model.toJSON();
			data.date = bg.formatDate.call(new Date(data.date), 'YYYY-MM-DD hh:mm:ss');
			this.$el.html(this.template(data));
			return this;
		},
		handleNewSelected: function(model) {
			this.model = model;
			this.render();
		}
	}));

});

});