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
			this.model.on('change', this.render, this);
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		handleMouseDown: function(e) {
			if (e.shiftKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
				bg.sources.trigger('new-selected', this.model);
			} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-reload': 'reloadSources'
		},
		initialize: function() {
			
		},
		addSourceDialog: function() {
			var url = prompt('RSS source url:');
			if (url) {
				bg.sources.create({
					title: url,
					url: url
				}).fetch();
			}
		},
		reloadSources: function() {
			bg.downloadAll();
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		events: {
			
		},
		initialize: function() {
			this.addSources(bg.sources);

			bg.sources.on('reset', this.addSources, this);
			bg.sources.on('add', this.addSource, this);
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
		},
		removeSource: function(view) {
			view.model.destroy();
			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();  
		}
	}));

	var app =  new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown'
		},
		initialize: function() {
		},
		handleKeyDown: function(e) {
			if (e.keyCode == 68) {
				list.selectedItems.forEach(list.removeSource);
			}
		}
	}));
});

});