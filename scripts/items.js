$(function() {
	var Item = Backbone.Model.extend({
		defaults: {
			title: '<no title>',
			author: 'Martin Kadlec'
		}
	});

	var items = new (Backbone.Collection.extend({
		model: Item,
		comparator: function(a, b) {
			return a.get('tile') > b.get('title') ? 1 : -1;
		}
	}));

	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		initialize: function() {
			console.log('View created');
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
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
			console.log('App started');

			items.on('reset', this.addItems, this);

			items.reset([
				{ title: 'OMG! Ubuntu!', author: 'aa' },
				{ title: 'Perfection kills', author: 'aa' }
				
			]);
		},
		addItem: function(item) {
			var view = new ItemView({ model: item });
			$('#list').append(view.render().$el);
		},
		addItems: function(items) {
			items.forEach(function(item) {
				this.addItem(item);
			}, this);
		}
	}));
});