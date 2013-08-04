chrome.runtime.getBackgroundPage(function(bg) {

$(function() {
	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addItemDialog',
			'click #button-refresh': 'refreshItems'
		},
		initialize: function() {
			
		},
		addItemDialog: function() {
			var url = prompt('RSS item url:');
			if (url) {
				$.ajax({ url: url, responseType: 'xml' })
				 .success(function(e) {
				 	alert('success');
				 })
				 .error(function() {
				 	alert('error');
				 });
			}
		},
		refreshItems: function() {
			alert('Refreshing!');
		}
	}));

	var itemView = new (Backbone.View.extend({
		el: '#item',
		template: _.template($('#template-item').html()),
		events: {
			
		},
		initialize: function() {
			bg.items.on('new-selected', this.handleNewSelected, this);
			if (bg.items.at(0)) {
				this.model = bg.items.at(0);
				this.render();
			}
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleNewSelected: function(model) {
			this.model = model;
			this.render();
		}
	}));

});

});