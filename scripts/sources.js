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
			this.model.on('destroy', this.handleModelDestroy, this);
			this.el.view = this;
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
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
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
					id: bg.sourceIdIndex++,
					title: url,
					url: url
				}).fetch();

				localStorage.setItem('sourceIdIndex', bg.sourceIdIndex);
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
			this.$el.append(view.render().$el);	
		},
		addSources: function(sources) {
			this.$el.html('');
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
		},
		destroySource: function(view) {
			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();
			var io = list.selectedItems.indexOf(this);
			if (io >= 0) {
				list.selectedItems.splice(io, 1);
			}
		}
	}));

	var app = new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown'
		},
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.renderIndicator, this);
			this.handleLoadingChange();
		},
		handleKeyDown: function(e) {
			if (e.keyCode == 68) {
				list.selectedItems.forEach(list.removeSource);
			}
		},
		handleLoadingChange: function(e) {
			if (bg.loader.get('loading') == true) {
				this.renderIndicator();
				$('#indicator').css('display', 'block');
			} else {
				setTimeout(function() {
					$('#indicator').css('display', 'none');
				}, 500);
			}
		},
		renderIndicator: function() {
			// should ount and show failed
			var l = bg.loader;
			var perc = Math.round(l.get('loaded') * 100 / l.get('maxSources'));
			$('#indicator').css('background', 'linear-gradient(to right,  #d1d1d1 ' + perc + '%, #eee ' + perc + '%)');
			$('#indicator').html(l.get('loaded') + '/' + l.get('maxSources'));
		}
	}));
});

});