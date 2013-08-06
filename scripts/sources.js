document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});	


if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	var SourceView = Backbone.View.extend({
		tagName: 'div',
		className: 'source',
		template: _.template($('#template-source').html()),
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown',
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
			if (e.which == 1) {
				this.showSourceItems(e);
			} 
		},
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},
		showContextMenu: function(e) {
			this.select(e);
			sourcesContextMenu.currentSource = this.model;
			sourcesContextMenu.show(e.clientX, e.clientY);
		},
		select: function(e) {
			if (e.shiftKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
			} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		showSourceItems: function(e) {
			this.select(e);
			if (e.shiftKey != true) {
				bg.sources.trigger('new-selected', this.model);
			} 
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
			if (this.model.get('icon')) {
				//alert('url("/images/' + this.model.get('icon') + '") no-repeat left center');
				this.$el.css('background', 'url(/images/' + this.model.get('icon') + ') no-repeat left center');
			}
			this.$el.html(this.model.get('title'));
			return this;
		},
		handleClick: function() {
			var action = this.model.get('action');
			if (action && typeof action == 'function') {
				action();
				sourcesContextMenu.hide();
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
			$('body').append(this.render().$el);

			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
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
		},
		show: function(x, y) {
			if (x + this.$el.width() + 4 > document.body.offsetWidth) {
				x = document.body.offsetWidth - this.$el.width() - 8;
			} 
			if (y + this.$el.height() + 4 > document.body.offsetHeight) {
				y = document.body.offsetHeight - this.$el.height() - 8;
			} 
			this.$el.css('top', y + 'px');
			this.$el.css('left', x + 'px');
			this.$el.css('display', 'block');
		},
		hide: function() {
			if (this.$el.css('display') == 'block') {
				this.$el.css('display', 'none');
			}
		}
	});

	var sourcesContextMenu = new ContextMenu([
		{
			title: 'Update',
			icon: 'reload.png',
			action: function() {
				bg.downloadOne(sourcesContextMenu.currentSource);
			}
		},
		{ 
			title: 'Mark All As Read',
			icon: 'read.png',
			action: function() { 
				var id = sourcesContextMenu.currentSource.get('id');
				bg.items.where({ sourceID: id }).forEach(function(item) {
					item.set('unread', false);
				});
			}
		},
		{ 
			title: 'Delete',
			icon: 'delete.png',
			action: function() { 
				sourcesContextMenu.currentSource.destroy();
			}
		},
		{ 
			title: 'Properties',
			icon: 'properties.png',
			action: function() {
				properties.show(sourcesContextMenu.currentSource);
				properties.currentSource = sourcesContextMenu.currentSource;
			}
		}
	]);

	var properties = new (Backbone.View.extend({
		el: '#properties',
		currentSource: null,
		events: {
			'click button' : 'handleClick',
			'keydown button' : 'handleKeyDown'
		},
		initialize: function() {
			//$('#prop-cancel').on('click', this.hide);
			//$('#prop-cancel').on('keydown', this.handleKeyDown);
		},
		handleClick: function(e) {
			var t = e.currentTarget;
			if (t.id == 'prop-cancel') {
				this.hide();
			} else if (t.id == 'prop-ok') {
				this.saveData();
			}
		},
		saveData: function() {
			if (!this.currentSource) {
				this.hide();
				return;
			}

			this.currentSource.save({
				title: $('#prop-title').val(),
				url: $('#prop-url').val(),
			});

			this.hide();

		},
		handleKeyDown: function(e) {
			if (e.keyCode == 13) {
				this.handleClick(e);
			} 
		},
		show: function(source) {
			$('#prop-title').val(source.get('title'));;
			$('#prop-url').val(source.get('url'));
			properties.$el.css('display', 'block');
		},
		hide: function() {
			properties.$el.css('display', 'none');
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
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.renderIndicator, this);
			this.handleLoadingChange();
		},
		handleMouseDown: function(e) {
			if (sourcesContextMenu.el.parentNode && !e.target.matchesSelector('.context-menu, .context-menu *')) {
				// make sure the action gets executed
				sourcesContextMenu.hide();
			}
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