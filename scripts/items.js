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
			this.el.view = this;
		},
		render: function() {
			this.$el.toggleClass('unread', this.model.get('unread'));
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		select: function(e) {
			e = e || {};
			if (e.shiftKey != true && e.ctrlKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
				if (!e.preventLoading) bg.items.trigger('new-selected', this.model);
			} else if (e.shiftKey && list.selectedItems.length) {
				$('.selected').removeClass('selected');
				list.selectedItems = [list.selectedItems[0]];
				list.selectedItems[0].$el.addClass('selected');

				if (list.selectedItems[0].model.get('date') > this.model.get('date')) {
					list.selectedItems[0].$el.nextUntil(this.$el).not('.invisible').each(function(i, el) {
						$(el).addClass('selected');
						list.selectedItems.push(el.view);
					});
				} else {
					this.$el.nextUntil(list.selectedItems[0].$el).not('.invisible').each(function(i, el) {
						$(el).addClass('selected');
						list.selectedItems.push(el.view);
					});
				}
			}

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		handleMouseDown: function(e) {
			this.select({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey });
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
			'click #button-reload': 'refreshItems',
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
			if (list.currentSource) {
				// need to add listener for source destroy to prevent loading deleted source
				bg.downloadOne(list.currentSource);	
			} else {
				bg.downloadAll();
			}
			
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

			list.restartSelection();
		},
		handleButtonDelete: function() {
			list.selectedItems.forEach(list.removeItem, list);
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		views: [],
		currentSource: null,
		events: {
			
		},
		initialize: function() {
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			bg.sources.on('new-selected', this.handleNewSelected, this)	;
			this.addItems(bg.items);
		},
		addItem: function(item, noManualSort) {
			if (!item.get('deleted')) {
				var view = new ItemView({ model: item });


				var after = null;
				if (noManualSort !== true) {
					$.makeArray($('#list .item')).some(function(itemEl) {
						if (itemEl.view.model.get('date') < item.get('date')) {
							after =  itemEl;
							return true;
						}
					});
				}

				if (!after) {
					this.$el.append(view.render().$el);	
				} else {
					//$(after).insertBefore(view.render().$el);
					view.render().$el.insertBefore($(after));
				}

				this.views.push(view);
			}
		},
		addItems: function(items) {
			// better solution?
			this.views.forEach(this.destroyItem, this);
			this.views = [];

			$('#list').html('');
			items.forEach(function(item) {
				this.addItem(item, true);
			}, this);

			setTimeout(function() {
				//if (list.views[0]) list.views[0].select();
				list.selectFirst();
			}, 0);
		},
		handleNewSelected: function(source) {
			if (this.currentSource) {
				this.currentSource.off('destroy', this.handleDestroyedSource, this);
			}
			this.currentSource = source;
			source.on('destroy', this.handleDestroyedSource, this);
			this.addItems(bg.items.where({ sourceID: source.id }));
			
		},
		handleDestroyedSource: function() {
			this.currentSource = null;
			this.addItems(bg.items);	
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
			debugger;
			var io = list.selectedItems.indexOf(this);
			if (io >= 0) list.selectedItems.splice(io, 1);
			io = list.views.indexOf(this);
			if (io >= 0) list.views.splice(io, 1);
		},
		restartSelection: function() {
			if (this.selectedItems.length) {
				this.selectedItems = [];
				$('.selected').removeClass('selected');
				$('.last-selected').removeClass('last-selected');
			}
			this.selectFirst();
		},
		selectFirst: function() {
			var first = $('.item:not(.invisible)').get(0);
			if (first) first.view.select();
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