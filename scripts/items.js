var chrome = window.top.chrome;
var topWindow = window.top;


document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});	


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

HTMLCollection.prototype.indexOf = Array.prototype.indexOf;

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
			'mousedown .item-pinned': 'handleClickPin',
			'mouseup': 'handleMouseUp'
		},
		initialize: function() {
			this.el.setAttribute('draggable', 'true');
			this.model.on('change', this.handleModelChange, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.el.view = this;
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				this.clearEvents();
			} 
		},
		clearEvents: function() {
			this.model.off('change', this.handleModelChange);
			this.model.off('destroy', this.handleModelDestroy);
			bg.sources.off('clear-events', this.handleClearEvents);
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
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			} else if (list.selectedItems.length > 1 && list.selectFlag) {
				this.select({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey });	
				list.selectFlag = false;
			}
		},
		showContextMenu: function(e) {
			if (!this.$el.hasClass('selected')) {
				this.select(e);	
			}
			itemsContextMenu.currentSource = this.model;
			itemsContextMenu.show(e.clientX, e.clientY);
		},
		select: function(e) {
			e = e || {};
			if ( (e.shiftKey != true && e.ctrlKey != true) || (e.shiftKey && !list.selectPivot) ) {
				list.selectedItems = [];
				list.selectPivot = this;
				$('.selected').removeClass('selected');

				if (!e.preventLoading) {
					//bg.items.trigger('new-selected', this.model);
					topWindow.frames[2].postMessage({ action: 'new-select', value: this.model.id }, '*');
				}

				if (!this.model.get('visited')) {
					this.model.set('visited', true);
				}
			} else if (e.shiftKey && list.selectPivot) {
				$('.selected').removeClass('selected');
				list.selectedItems = [list.selectPivot];
				list.selectedItems[0].$el.addClass('selected');

				if (list.selectedItems[0] != this) {
					if (list.selectedItems[0].$el.index() < this.$el.index() ) {
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
			} else if (e.ctrlKey && this.$el.hasClass('selected')) {
				this.$el.removeClass('selected');
				this.$el.removeClass('last-selected');
				list.selectPivot = null;
				list.selectedItems.splice(list.selectedItems.indexOf(this), 1);
				return;
			} else if (e.ctrlKey) {
				list.selectPivot = this;
			}

			$('.last-selected').removeClass('last-selected');
			if (list.selectedItems[0] != this) {
				list.selectedItems.push(this);
				this.$el.addClass('selected');
			}
			this.$el.addClass('last-selected');

		},
		handleMouseDown: function(e) {
			if (list.selectedItems.length > 1 && this.$el.hasClass('selected') && !e.ctrlKey && !e.shiftKey) {
				list.selectFlag = true;
				return;
			}
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

	var ContextMenu = bg.ContextMenu.extend({
		initialize: function(mc) {
			this.menuCollection = new (bg.MenuCollection)(mc);
			this.addItems(this.menuCollection);
			$('body').append(this.render().$el);

			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
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
		}
	});

	// Mark As Read
	// Delete (check for shift)
	// Next unread
	// Prev unread
	// MU and next unread
	// MU and prev unread
	// Pin
	// Undelete

	var itemsContextMenu = new ContextMenu([
		{
			title: 'Mark As Un/Read (K)',
			icon: 'read.png',
			action: function() {
				list.changeUnreadState();
			}
		},
		{
			title: 'Delete (D)',
			icon: 'delete.png',
			action: function(e) {
				e = e || {};
				if (list.specialName == 'trash' || e.shiftKey) {
					list.selectedItems.forEach(list.removeItemCompletely, list);
				} else {
					list.selectedItems.forEach(list.removeItem, list);	
				}
			}
		},
		{
			title: 'Undelete (U)',
			id: 'context-undelete',
			icon: 'delete_selected.png',
			action: function(e) {
				if (list.specialName == 'trash') {
					list.selectedItems.forEach(list.undeleteItem, list);
				}
			}
		},
		{
			title: 'Next Unread (H)',
			action: function() {
				app.selectNext({ selectUnread: true });
			}
		},
		{
			title: 'Previous Unread (Y)',
			action: function() {
				app.selectPrev({ selectUnread: true });
			}
		},
		{
			title: 'Mark And Next Unread (G)',
			action: function() {
				list.changeUnreadState({ onlyToRead: true });
				app.selectNext({ selectUnread: true });
			}
		},
		{
			title: 'Mark And Prev Unread (T)',
			action: function() {
				list.changeUnreadState({ onlyToRead: true });
				this.selectPrev({ selectUnread: true });
			}
		},
		{
			title: 'Un/Pin (P)',
			icon: 'mail_pinned.png',
			action: function() {
				if (!list.selectedItems || !list.selectedItems.length) return;
				var val = !list.selectedItems[0].model.get('pinned');
				list.selectedItems.forEach(function(item) {
					item.model.save({ pinned: val });
				});
			}
		}
	]);

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		views: [],
		currentSource: null,
		specialName: null,
		specialFilter: null,
		noFocus: false,
		events: {
			'dragstart .item': 'handleDragStart'
		},
		initialize: function() {
			var that = this;
			this.$el.addClass('lines-' + bg.settings.get('lines'));
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			bg.settings.on('change:lines', this.handleChangeLines, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select') {
					window.focus();
					$('#input-search').val('');
					if (typeof e.data.value == 'object') {
						that.handleNewSpecialSelected(e.data.value, e.data.name);
					} else {
						that.handleNewSelected(bg.sources.findWhere({ id: e.data.value }));	
					}
					
				} if (e.data.action == 'give-me-next') {
					app.selectNext({ selectUnread: true });
				}
			});

			setTimeout(function() {
				that.addItems(bg.items);
			}, 0);
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.items.off('reset', this.addItems, this);
				bg.items.off('add', this.addItem, this);
				bg.settings.off('change:lines', this.handleChangeLines, this);
				if (this.currentSource) {
					this.currentSource.off('destroy', this.handleDestroyedSource, this);
				}
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		handleChangeLines: function(settings) {
			this.$el.removeClass('lines-' + settings.previous('lines'));
			this.$el.addClass('lines-' + settings.get('lines'));
		},
		handleDragStart: function(e) {
			var ids = list.selectedItems.map(function(view) {
				return view.model.id
			});

			e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(ids));
		},
		selectAfterDelete: function(view) {
			if (view == list.selectedItems[0]) {
				var last = $('.item:not(.invisible):last').get(0);
				if (last && view == last.view) {
					app.selectPrev({ currentIsRemoved: true });
				} else {
					app.selectNext({ currentIsRemoved: true });
				}
			}
		},
		addItem: function(item, noManualSort) {
			if (!item.get('deleted') && (!item.get('trashed') || this.specialName == 'trash') ) {
				var view = new ItemView({ model: item });


				var after = null;
				if (noManualSort !== true) {
					$.makeArray($('#list .item')).some(function(itemEl) {
						alert(bg.items.comparator);
						//if (bg.items.comparator(itemEl.view.model, item) == 1||-1) {
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

			/*setTimeout(function() {
				//if (list.views[0]) list.views[0].select();
				list.selectFirst();
			}, 0);*/
		},
		handleNewSelected: function(source) {
			if (this.currentSource) {
				this.currentSource.off('destroy', this.handleDestroyedSource, this);
			}
			this.currentSource = source;
			if (this.specialName == 'trash') {
				$('#button-undelete').css('display', 'none');
				$('#context-undelete').css('display', 'none');
			}
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
			if (this.specialName == 'trash') {
				$('#button-undelete').css('display', 'none');	
				$('#context-undelete').css('display', 'none');
			} 
			this.specialName = name;
			this.specialFilter = filter;
			if (this.specialName == 'trash') {
				$('#button-undelete').css('display', 'block');
				$('#context-undelete').css('display', 'block');
			}
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

			view.clearEvents();
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
			var val = list.selectedItems.length && !opt.onlyToRead ? !list.selectedItems[0].model.get('unread') : false;
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
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
		},
		handleMouseDown: function(e) {
			if (itemsContextMenu.el.parentNode && !e.target.matchesSelector('.context-menu, .context-menu *')) {
				// make sure the action gets executed
				itemsContextMenu.hide();
			}
		},
		selectNext: function(e) {
			var e = e || {};
			var q = e.selectUnread ? '.unread:not(.invisible):first' : '.item:not(.invisible):first';
			var next = $('.last-selected').nextAll(q);
			if (!next.length && !e.shiftKey && !e.ctrlKey) {
				next = $(q);
				if (e.currentIsRemoved && next.length && $('.last-selected').get(0) == next.get(0)) {
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
				if (e.currentIsRemoved && prev.length && $('.last-selected').get(0) == prev.get(0)) {
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
			} else if (e.keyCode == 80) { // P
				if (!list.selectedItems || !list.selectedItems.length) return;
				var val = !list.selectedItems[0].model.get('pinned');
				list.selectedItems.forEach(function(item) {
					item.model.save({ pinned: val });
				});
				e.preventDefault();
			} else if (e.keyCode == 27) { // ESC
				if (itemsContextMenu.el.parentNode) {
					// make sure the action gets executed
					itemsContextMenu.hide();
					e.preventDefault();
				}
			} else if (e.keyCode == 85) { // U = Undelete item
				if (!list.selectedItems || !list.selectedItems.length) return;
				list.selectedItems.forEach(list.undeleteItem, list);
				e.preventDefault();
			} else if (e.keyCode == 32) { // U = Undelete item
				if (!list.selectedItems || !list.selectedItems.length) return;
				topWindow.frames[2].postMessage({ action: 'space-pressed' }, '*');
				e.preventDefault();
			}

			
		} 
	}));
});


});