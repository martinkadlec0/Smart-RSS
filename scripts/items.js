RegExp.escape = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

Array.prototype.last = function() {
	if (!this.length) return null;
	return this[this.length - 1];
}

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
			this.model.on('destroy', this.handleModelDestroy, this);
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
				try {
					bg.items.trigger('new-selected', this.model);
				} catch(e) {
					// WTF? what is set_animation??
				}
			} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		handleModelChange: function() {
			if (this.model.get('deleted')) {
				list.removeItem(this);
			} else {
				this.render();
			}
		},
		handleModelDestroy: function(e) {
			list.destroyItem(this);
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-read': 'handleButtonRead',
			'click #button-refresh': 'refreshItems',
			'click #button-delete': 'handleButtonDelete',
			'input input[type=search]': 'handleSearch'
		},
		initialize: function() {
			
		},
		handleButtonRead: function() {
			var val = list.selectedItems.length ? !list.selectedItems[0].model.get('unread') : false;
			list.selectedItems.forEach(function(item) {
				item.model.save({ unread: val });
			}, this);
		},
		refreshItems: function() {
			alert('Refreshing!');
		},
		handleSearch: function(e) {
			var str = e.currentTarget.value || '';
			var searchInContent = false;
			if (str[0] && str[0] == ':') {
				str = str.replace(/^:/, '', str);
				searchInContent = true;
			}
			var rg = new RegExp(RegExp.escape(str), 'i');
			list.views.forEach(function(view) {
				if (rg.test(view.model.get('title')) || rg.test(view.model.get('author')) || (searchInContent && rg.test(view.model.get('content')) )) {
					view.$el.removeClass('invisible');
				} else {
					view.$el.addClass('invisible');
				}
			});
		},
		handleButtonDelete: function() {
			list.selectedItems.forEach(list.removeItem, list);
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		views: [],
		events: {
			
		},
		initialize: function() {
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			bg.sources.on('new-selected', this.handleNewSelected, this)	;
			this.addItems(bg.items);
		},
		addItem: function(item) {
			if (!item.get('deleted')) {
				var view = new ItemView({ model: item });
				$('#list').append(view.render().$el);
				this.views.push(view);
			}
		},
		addItems: function(items) {
			this.views = [];
			$('#list').html('');
			items.forEach(function(item) {
				this.addItem(item);
			}, this);
		},
		handleNewSelected: function(source) {
			this.addItems(bg.items.where({ sourceID: source.id }));
		},
		removeItem: function(view) {
			view.model.save({
				'deleted': true,
				'content': '',
				'author': '',
				'title': ''
			});
			this.destroyItem(view);
		},
		destroyItem: function(view) {
			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();
		}
	}));

	var app = new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown'
		},
		initialize: function() {
		},
		handleKeyDown: function(e) {
			if (e.keyCode == 68) {
				list.selectedItems.forEach(list.removeItem, list);
			} else if (e.keyCode == 75) {
				toolbar.handleButtonRead();
			} else if (e.keyCode == 40) {
				//if (e.shiftKey != true) {
					var last = list.selectedItems.last();
					list.selectedItems = [];
					$('.selected').removeClass('selected');
					//bg.items.trigger('new-selected', this.model);
				//} 

				$('.last-selected').removeClass('last-selected');
				var next;
				var i = 1;
				do {
					next = list.views[list.views.indexOf(last) + i];
					i++;
				} while (next && next.$el.hasClass('invisible'));

				if (next) {
					bg.items.trigger('new-selected', next.model);
					list.selectedItems.push(next);
					next.$el.addClass('selected');
					next.$el.addClass('last-selected');
					next.$el.get(0).scrollIntoView(false);
					e.preventDefault();
				}
			} else if (e.keyCode == 38) {
				//if (e.shiftKey != true) {
					var last = list.selectedItems.last();
					list.selectedItems = [];
					$('.selected').removeClass('selected');
					//bg.items.trigger('new-selected', this.model);
				//} 

				$('.last-selected').removeClass('last-selected');
				var next;
				var i = 1;
				do {
					next = list.views[(list.views.indexOf(last) || list.views.length) - i];
					i++;
				} while (next && next.$el.hasClass('invisible'));


				if (next) {
					bg.items.trigger('new-selected', next.model);
					list.selectedItems.push(next);
					next.$el.addClass('selected');
					next.$el.addClass('last-selected');
					next.$el.get(0).scrollIntoView(false);
					e.preventDefault();
				}
			}
		} 
	}));
});


});