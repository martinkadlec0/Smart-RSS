var chrome = window.top.chrome;
var topWindow = window.top;


RegExp.escape = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

Array.prototype.last = function() {
	if (!this.length) return null;
	return this[this.length - 1];
};

Array.prototype.first = function() {
	if (!this.length) return null;
	return this[0];
};

if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}

window.addEventListener('load', function() {
	window.focus();
})


window.addEventListener('focus', function() {
	document.documentElement.classList.add('focused');
});

window.addEventListener('blur', function() {
	document.documentElement.classList.remove('focused');
});

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {
	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		events: {
			'mousedown': 'handleMouseDown',
			'mousedown .item-pin': 'handleClickPin',
			'mousedown .item-pinned': 'handleClickPin'
		},
		initialize: function() {
			this.model.on('change', this.handleModelChange, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			this.el.view = this;
		},
		render: function() {
			this.$el.toggleClass('unvisited', !this.model.get('visited'));
			this.$el.toggleClass('unread', this.model.get('unread'));
			var data = this.model.toJSON();
			if (data.date) {
				if (parseInt(data.date / 86400000) == parseInt(Date.now() / 86400000)) {
					data.date = bg.formatDate.call(new Date(data.date), 'hh:mm');
				} else if ((new Date(data.date)).getYear() == (new Date()).getYear() ) {
					data.date = bg.formatDate.call(new Date(data.date), 'DD.MM');	
				} else {
					data.date = bg.formatDate.call(new Date(data.date), 'DD.MM.YYYY');	
				}
			}
			
			this.$el.html(this.template(data));
			return this;
		},
		select: function(e) {
			e = e || {};
			if (e.shiftKey != true && e.ctrlKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
				if (!e.preventLoading) {
					//bg.items.trigger('new-selected', this.model);
					try {
						topWindow.frames[2].postMessage({ action: 'new-select', value: this.model.id }, '*');	
					} catch(e) {
						debugger;
					}
					
				}

				if (!this.model.get('visited')) {
					this.model.set('visited', true);
				}
			} else if (e.shiftKey && list.selectedItems.length) {
				$('.selected').removeClass('selected');
				list.selectedItems = [list.selectedItems[0]];
				list.selectedItems[0].$el.addClass('selected');

				if (list.selectedItems[0] != this) {

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
			}

			$('.last-selected').removeClass('last-selected');
			if (list.selectedItems[0] != this) {
				list.selectedItems.push(this);
				this.$el.addClass('selected');
			}
			this.$el.addClass('last-selected');

		},
		handleMouseDown: function(e) {
			this.select({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey });
		},
		handleModelChange: function() {
			if (this.model.get('deleted') || (list.specialName != 'trash' && this.model.get('trashed')) ) {
				list.destroyItem(this);
			} else {
				this.render();
			}
		},
		handleModelDestroy: function(mod, col, opt) {
			if (opt.noFocus && list.currentSource) return;
			if (opt.noFocus) list.noFocus = true;
			list.destroyItem(this);
			if (opt.noFocus) {
				list.noFocus = false;
				list.selectFirst();
			}
		},
		handleClickPin: function(e) {
			e.stopPropagation();
			this.model.save({ pinned: !this.model.get('pinned') });
			this.render();
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-read': 'handleButtonRead',
			'click #button-reload': 'refreshItems',
			'click #button-delete': 'handleButtonDelete',
			'click #button-undelete': 'handleButtonUndelete',
			'input input[type=search]': 'handleSearch'
		},
		initialize: function() {
			
		},
		handleButtonRead: function() {
			list.changeUnreadState();
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
		handleButtonDelete: function(e) {
			if (list.specialName == 'trash' || e.shiftKey) {
				list.selectedItems.forEach(list.removeItemCompletely, list);
			} else {
				list.selectedItems.forEach(list.removeItem, list);	
			}
		},
		handleButtonUndelete: function() {
			if (list.specialName == 'trash') {
				list.selectedItems.forEach(list.undeleteItem, list);
			} 
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		views: [],
		currentSource: null,
		specialName: null,
		specialFilter: null,
		noFocus: false,
		events: {
			
		},
		initialize: function() {
			var that = this;
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select') {
					window.focus();
					if (typeof e.data.value == 'object') {
						that.handleNewSpecialSelected(e.data.value, e.data.name);
					} else {
						that.handleNewSelected(bg.sources.findWhere({ id: e.data.value }));	
					}
					
				} if (e.data.action == 'give-me-next') {
					app.selectNext();
				}
			});

			setTimeout(function() {
				that.addItems(bg.items);
			}, 0);
		},
		selectAfterDelete: function(view) {
			if (view == list.selectedItems[0]) {
				var last = $('.item:not(.invisible):last').get(0);
				if (last && view == last.view) {
					app.selectPrev();
				} else {
					app.selectNext();
				}
			}
		},
		addItem: function(item, noManualSort) {
			if (!item.get('deleted') && (!item.get('trashed') || this.specialName == 'trash') ) {
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
					if (!this.selectedItems.length) view.select();
				} else {
					//$(after).insertBefore(view.render().$el);
					view.render().$el.insertBefore($(after));
				}

				this.views.push(view);
			}
		},
		addItems: function(items) {
			// better solution?
			this.noFocus = true;
			this.views.forEach(this.destroyItem, this);
			this.noFocus = false;
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
			if (this.specialName == 'trash') $('#button-undelete').css('display', 'none');
			this.specialName = null;
			this.specialFilter = null;
			source.on('destroy', this.handleDestroyedSource, this);
			this.addItems(bg.items.where({ sourceID: source.id }));
		},
		handleNewSpecialSelected: function(filter, name) {
			if (this.currentSource) {
				this.currentSource.off('destroy', this.handleDestroyedSource, this);
			}
			this.currentSource = null;
			if (this.specialName == 'trash') $('#button-undelete').css('display', 'none');
			this.specialName = name;
			this.specialFilter = filter;
			if (this.specialName == 'trash') $('#button-undelete').css('display', 'block');
			this.addItems(bg.items.where( filter ));
		},
		handleDestroyedSource: function() {
			this.currentSource = null;
			this.addItems(bg.items);	
		},
		undeleteItem: function(view) {
			view.model.save({
				'trashed': false
			});
			this.destroyItem(view);
		},
		removeItem: function(view) {
			view.model.save({
				'trashed': true
			});
			this.destroyItem(view);
		},
		removeItemCompletely: function(view) {
			if (view.model.get('pinned')) {
				var conf = confirm('Item "' + view.model.escape('title') + '" is pinned. Do you really want to delete it?');
				if (!conf) {
					return;
				}
			}
			view.model.save({
				'deleted': true,
				'trashed': true,
				'pinned': false,
				'content': '',
				'author': '',
				'title': ''
			});
			this.destroyItem(view);
		},
		destroyItem: function(view) {
			if (!this.noFocus) {
				this.selectAfterDelete(view);
			}

			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();
			
			var io = list.selectedItems.indexOf(view);
			if (io >= 0) list.selectedItems.splice(io, 1);
			io = list.views.indexOf(view);
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
		},
		changeUnreadState: function(opt) {
			var opt = opt || {};
			var val = list.selectedItems.length ? !list.selectedItems[0].model.get('unread') : false;
			list.selectedItems.forEach(function(item) {
				if (opt.onlyToRead && item.model.get('unread') == false) {
					// do nothing
				} else {
					item.model.save({ unread: val, visited: true });
				}
				
			}, this);
		},
		inView: function(cel) {
			var $cel = $(cel);
			if ($cel.position().top - this.$el.offset().top < 0 || $cel.position().top + cel.offsetHeight >= this.el.offsetHeight) {
				return false;
			}
			return true;
		}
	}));

	var app = new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown'
		},
		initialize: function() {
		},
		selectNext: function(e) {
			var e = e || {};
			var q = e.selectUnread ? '.unread:not(.invisible):first' : '.item:not(.invisible):first';
			var next = $('.last-selected').nextAll(q);
			if (!next.length && !e.shiftKey && !e.ctrlKey) {
				next = $(q);
				if (next.length && $('.last-selected').get(0) == next.get(0)) {
					next = [];
					topWindow.frames[2].postMessage({ action: 'no-items' }, '*');
				}
			}
			if (next.length) {
				next.get(0).view.select(e);
				if (!list.inView(next.get(0))) {
					next.get(0).scrollIntoView(false);	
				}
				
			} 
		},
		selectPrev: function(e) {
			var e = e || {};
			var q = e.selectUnread ? '.unread:not(.invisible)' : '.item:not(.invisible)';
			var prev = $('.last-selected').prevAll(q + ':first');
			if (!prev.length && !e.shiftKey && !e.ctrlKey) {
				prev = $(q + ':last');
				if (prev.length && $('.last-selected').get(0) == prev.get(0)) {
					prev = [];
					topWindow.frames[2].postMessage({ action: 'no-items' }, '*');
				}
			}
			if (prev.length) {
				prev.get(0).view.select(e);
				if (!list.inView(prev.get(0))) {
					prev.get(0).scrollIntoView(true);
				}
			}
		},
		handleKeyDown: function(e) {
			if (document.activeElement && document.activeElement.tagName == 'INPUT') {
				return;
			}

			if (e.keyCode == 68 || e.keyCode == 46) {
				if (list.specialName == 'trash' || e.shiftKey) {
					list.selectedItems.forEach(list.removeItemCompletely, list);
				} else {
					list.selectedItems.forEach(list.removeItem, list);	
				}
				e.preventDefault();
			} else if (e.keyCode == 49) {
				topWindow.frames[0].focus();
				e.preventDefault();
			} else if (e.keyCode == 51) {
				topWindow.frames[2].focus();
				e.preventDefault();
			} else if (e.keyCode == 75) { // mark as read/unread
				list.changeUnreadState();
				e.preventDefault();
			} else if (e.keyCode == 40) { // arrow down
				this.selectNext(e);
				e.preventDefault();
			} else if (e.keyCode == 38) { // arrow up
				this.selectPrev(e);
				e.preventDefault();
			} else if (e.keyCode == 71) { // G - mark as read and go to next unread
				list.changeUnreadState({ onlyToRead: true });
				this.selectNext({ selectUnread: true });
				e.preventDefault();
			}  else if (e.keyCode == 84) { // T - mark as read and go to prev unread
				list.changeUnreadState({ onlyToRead: true });
				this.selectPrev({ selectUnread: true });
				e.preventDefault();
			} else if (e.keyCode == 72) { // H = go to next unread
				this.selectNext({ selectUnread: true });
				e.preventDefault();
			} else if (e.keyCode == 89) { // Y = go to prev unread
				this.selectPrev({ selectUnread: true });
				e.preventDefault();
			} else if (e.keyCode == 65 && e.ctrlKey && e.shiftKey) { // A = Mark all as read
				if (list.currentSource) {
					var id = list.currentSource.get('id');
					if (!id) return;
					bg.items.where({ sourceID: id }).forEach(function(item) {
						item.save({ unread: false, visited: true });
					});
				} else if (list.specialName == 'all-feeds' && confirm('Do you really want to mark ALL items as read?')) {
					bg.items.forEach(function(item) {
						item.save({ unread: false, visited: true });
					});
				} else if (list.specialName) {
					bg.items.where(list.specialFilter).forEach(function(item) {
						item.save({ unread: false, visited: true });
					});
				} 
				e.preventDefault();
			} else if (e.keyCode == 65 && e.ctrlKey) { // A = Select all
				$('.selected').removeClass('selected');
				list.selectedItems = [];
				$('.item:not(.invisible)').each(function(i, item) {
					item.view.$el.addClass('selected');
					list.selectedItems.push(item.view);
				});

				$('.last-selected').removeClass('last-selected');
				$('.item:not(.invisible):last').addClass('last-selected');
				e.preventDefault();
			} 

			
		} 
	}));
});


});