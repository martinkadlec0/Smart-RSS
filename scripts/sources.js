document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});	

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	var SourceView = Backbone.View.extend({
		tagName: 'div',
		className: 'source',
		template: _.template($('#template-source').html()),
		events: {
			'mouseup': 'handleMouseUp'
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
		handleMouseUp: function(e) {
			if (e.which == 1) {
				this.showSourceItems(e);
			} else if (e.which == 3) {
				this.showContextMenu(e);
				e.preventDefault();
				e.stopPropagation();
			}
		},
		showContextMenu: function(e) {
			sourcesContextMenu.currentSource = this.model;
			$('body').append(sourcesContextMenu.render().$el);

			var posY = e.clientY;
			var posX = e.clientX;
			if (posX + sourcesContextMenu.el.offsetWidth > document.body.offsetWidth) {
				posX = document.body.offsetWidth - sourcesContextMenu.el.offsetWidth;
			} 
			if (posY + sourcesContextMenu.el.offsetHeight > document.body.offsetHeight) {
				posY = document.body.offsetHeight - sourcesContextMenu.el.offsetHeight;
			} 
			sourcesContextMenu.$el.css('top', posY + 'px');
			sourcesContextMenu.$el.css('left', posX + 'px');
		},
		showSourceItems: function(e) {
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

	var MenuItem = Backbone.Model.extend({
		defaults: {
			'title': '<no title>',
			'action': null
		}
	});

	var MenuCollection = Backbone.Collection.extend({
		model: MenuItem
	});

	var MenuItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'context-menu-item',
		events: {
			'click': 'handleClick'
		},
		render: function() {
			this.$el.html(this.model.get('title'));
			return this;
		},
		handleClick: function() {
			var action = this.model.get('action');
			if (action && typeof action == 'function') {
				action();
				this.el.parentNode.parentNode.removeChild(this.el.parentNode);
			}
		}
	});

	var ContextMenu = Backbone.View.extend({
		tagName: 'div',
		className: 'context-menu',
		menuCollection: null,
		initialize: function(mc) {
			this.menuCollection = new MenuCollection(mc);
			this.addItems(this.menuCollection);
		},
		addItem: function(item) {
			var v = new MenuItemView({ model: item });
			this.$el.append(v.render().$el);
		},
		addItems: function(items) {
			items.forEach(function(item) {
				this.addItem(item);
			}, this);
		},
		render: function() {
			return this;
		}
	});

	var sourcesContextMenu = new ContextMenu([
		{ title: 'Update', action: function() {
			bg.downloadOne(sourcesContextMenu.currentSource);
		}},
		{ title: 'Mark All As Read', action: function() { 
			var id = sourcesContextMenu.currentSource.get('id');
			bg.items.where({ sourceID: id }).forEach(function(item) {
				item.set('unread', false);
			});
		}},
		{ title: 'Delete', action: function() { 
			sourcesContextMenu.currentSource.destroy();
		}},
		{ title: 'Properties', action: function() { 
			alert(JSON.stringify(sourcesContextMenu.currentSource.toJSON(), null, 1));
		}},
	]);

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
			/*view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();*/
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
				list.selectedItems.forEach(list.removeSource, list);
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