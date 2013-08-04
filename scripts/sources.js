chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	var SourceView = Backbone.View.extend({
		tagName: 'div',
		className: 'source',
		template: _.template($('#template-source').html()),
		events: {
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			console.log('View created');
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleMouseDown: function(e) {
			if (e.shiftKey != true) {
				$('.selected').removeClass('selected');
				bg.sources.trigger('new-selected', this.model);
			} 

			$('.last-selected').removeClass('last-selected');
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-refresh': 'refreshSources'
		},
		initialize: function() {
			
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
		refreshSources: function() {
			alert('Refreshing!');
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		events: {
			
		},
		initialize: function() {
			console.log('App started');

			bg.sources.on('reset', this.addSources, this);

			this.addSources(bg.sources);
		},
		addSource: function(source) {
			var view = new SourceView({ model: source });
			$('#list').append(view.render().$el);
		},
		addSources: function(sources) {
			$('#list').html('');
			sources.forEach(function(source) {
				this.addSource(source);
			}, this);
		}
	}));
});

});