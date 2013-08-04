chrome.runtime.getBackgroundPage(function(bg) {

$(function() {
	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		events: {
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleMouseDown: function(e) {
			if (e.shiftKey != true) {
				$('.selected').removeClass('selected');
				//sendMessage('item', { action: 'item-show', value: 'XYZ' });
				bg.items.trigger('new-selected', this.model);
			} 

			$('.last-selected').removeClass('last-selected');
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		}
	});

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

	var list = new (Backbone.View.extend({
		el: '#list',
		events: {
			
		},
		initialize: function() {
			bg.items.on('reset', this.addItems, this);
			bg.sources.on('new-selected', this.handleNewSelected, this)	;
			this.addItems(bg.items);
		},
		addItem: function(item) {
			var view = new ItemView({ model: item });
			$('#list').append(view.render().$el);
		},
		addItems: function(items) {
			$('#list').html();
			items.forEach(function(item) {
				this.addItem(item);
			}, this);
		},
		handleNewSelected: function(source) {
			this.addItems(bg.items.where({ sourceID: source.id });
		}
	}));
});


});