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
			this.model.on('change', this.handleModelChange, this);
		},
		render: function() {
			this.$el.toggleClass('unread', this.model.get('unread'));
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleMouseDown: function(e) {
			if (e.shiftKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
				bg.items.trigger('new-selected', this.model);
			} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		handleModelChange: function() {
			this.render();
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-read': 'handleButtonRead',
			'click #button-refresh': 'refreshItems'
		},
		initialize: function() {
			
		},
		handleButtonRead: function() {
			var val = list.selectedItems.length ? !list.selectedItems[0].model.get('unread') : false;
			list.selectedItems.forEach(function(item) {
				item.model.set('unread', val);
			}, this);
		},
		refreshItems: function() {
			alert('Refreshing!');
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
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
			$('#list').html('');
			items.forEach(function(item) {
				this.addItem(item);
			}, this);
		},
		handleNewSelected: function(source) {
			this.addItems(bg.items.where({ sourceID: source.id }));
		}
	}));
});


});