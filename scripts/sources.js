$(function() {
	var Source = Backbone.Model.extend({
		defaults: {
			title: '<no title>',
			url: 'rss.rss',
			count: 0
		}
	});

	var sources = new (Backbone.Collection.extend({
		modeL: Source,
		comparator: function(a, b) {
			return a.get('tile') > b.get('title') ? 1 : -1;
		}
	}));

	var SourceView = Backbone.View.extend({
		tagName: 'div',
		className: 'source',
		template: _.template($('#template-source').html()),
		initialize: function() {
			console.log('View created');
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	var app = new (Backbone.View.extend({
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-referesh': 'refreshSources'
		},
		initialize: function() {
			console.log('App started');

			sources.on('reset', this.addSources, this);

			sources.reset([
				{ title: 'OMG! Ubuntu!', url: 'aa', count: 2000 },
				{ title: 'Perfection kills', url: 'aa', count: 0 },
				{ title: 'Lapiduch.cz', url: 'aa', count: 5 },
			]);
		},
		addSourceDialog: function() {
			var url = prompt('RSS source url:');
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
		addSource: function(source) {
			var view = new SourceView({ model: source });
			$('#list').append(view.render().$el);
		},
		addSources: function(sources) {
			sources.forEach(function(source) {
				this.addSource(source);
			}, this);
		},
		refreshSources: function() {
			alert('Refreshing!');
		}
	}));
});