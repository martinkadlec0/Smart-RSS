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

Element.prototype.findNext = function(query) {
	var cur = this;
	while (cur = cur.nextElementSibling) {
		if (cur.matchesSelector(query)) {
			return cur;
		}
	}
	return null;
}

Element.prototype.findPrev = function(query) {
	var cur = this;
	while (cur = cur.previousElementSibling) {
		if (cur.matchesSelector(query)) {
			return cur;
		}
	}
	return null;
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

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;

function isScrolledIntoView(elem) {
	var docViewTop = 0;
	var docViewBottom = screen.height;

	var rect = elem.getBoundingClientRect();
	var elemTop = rect.top;
	var elemBottom = elemTop + rect.height;

	return (elemBottom >= docViewTop) && (elemTop <= docViewBottom);
	/*  && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) ;*/
}

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	$('body').html( bg.translate($('body').html()) );
	$('#input-search').attr('placeholder', bg.lang.c.SEARCH);
	document.documentElement.style.fontSize = bg.settings.get('uiFontSize') + '%';

	var _itemHeight = 0;
	

	var getGroup = (function() {
		var days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
		var months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
		var dc = null;
		var todayMidnight = null;
		var dct = null;
		

		return function(date) {
			var dt = new Date(date);
			dc = dc || new Date();

			
			var dtt = parseInt(unixutc(dt) / 86400000);
			dct = dct || parseInt(unixutc(dc) / 86400000);

			if (!todayMidnight) {
				todayMidnight = new Date(dc);
				todayMidnight.setHours(0,0,0);
				setTimeout(function() {
					todayMidnight = null;
					dc = null;
					dct = null;
				}, 10000);
			}
			
			var itemMidnight = new Date(dt);
			itemMidnight.setHours(0,0,0);

			var group;
			var dtwoy, dcwoy;

			if (dtt >= dct) {
				group = {
					title: bg.lang.c.TODAY.toUpperCase(),
					date: todayMidnight.getTime() + 86400000 * 5000 // 5000 = make sure "today" is the first element in list
				}; 
			} else if (dtt + 1 == dct) {
				group = {
					title: bg.lang.c.YESTERDAY.toUpperCase(),
					date: todayMidnight.getTime()
				};
			} else if ((dtwoy = getWOY(dt)) == (dcwoy = getWOY(dc)) && dtt + 7 >= dct) {
				group = {
					title: bg.lang.c[days[dt.getDay()]].toUpperCase(),
					date: itemMidnight.getTime() + 86400000
				};
			} else if (dtwoy + 1 == dcwoy &&  dtt + 14 >= dct) {
				group = {
					title: bg.lang.c.LAST_WEEK.toUpperCase(),
					date: todayMidnight.getTime() - 86400000 * ( ((todayMidnight.getDay() || 7) - 1) || 1)
				};
			} else if (dt.getMonth() == dc.getMonth() && dt.getFullYear() == dc.getFullYear()) {
				group = {
					title: bg.lang.c.EARLIER_THIS_MONTH.toUpperCase(),
					date: todayMidnight.getTime() - 86400000 * ((todayMidnight.getDay() || 7) - 1) - 7 * 86400000
				};
			} else if (dt.getFullYear() == dc.getFullYear() ) {
				group = {
					title: bg.lang.c[months[dt.getMonth()]].toUpperCase(),
					date: (new Date(dt.getFullYear(), dt.getMonth() + 1, 1)).getTime()
				};
			} else {
				group = {
					title: dt.getFullYear(),
					date: (new Date(dt.getFullYear() + 1, 0, 1)).getTime()
				};
			}

			return group;

		}
	})();

	

	var ItemView = Backbone.View.extend({
		tagName: 'div',
		className: 'item',
		template: _.template($('#template-item').html()),
		initialize: function() {
			this.el.setAttribute('draggable', 'true');
			this.el.view = this;
			this.setEvents();
		},
		setEvents: function() {
			this.model.on('change', this.handleModelChange, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		swapModel: function(newModel) {
			if (this.model == newModel) {
				this.prerender();
				return;
			}
			if (this.model) {
				this.clearEvents();
			}
			this.model = newModel;
			this.setEvents();
			this.prerender();
		},
		prerendered: false,
		prerender: function() {
			prerendered = true;
			list.viewsToRender.push(this);
			this.el.className = this.model.get('unread') ? 'item unread' : 'item';
		},
		unplugModel: function() {
			if (this.model) {
				this.el.className = 'unpluged';
				this.clearEvents();
				this.model = null;
				this.el.innerHTML = '';
				if (_itemHeight) this.$el.css('height', _itemHeight + 'px');
			}
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				this.clearEvents();
			} 
		},
		clearEvents: function() {
			this.model.off('change', this.handleModelChange, this);
			this.model.off('destroy', this.handleModelDestroy, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		render: function() {

			this.$el.toggleClass('unvisited', !this.model.get('visited'));
			this.$el.toggleClass('unread', this.model.get('unread'));

			var ca = this.model.changedAttributes();
			if (ca) {
				var caKeys =  Object.keys(ca);
				if ( ('unread' in ca && caKeys.length == 1) || ('unread' in ca && 'visited' in ca && caKeys.length == 2) ) {
					return this;
				}
			}

			this.$el.css('height','');
			var data = this.model.toJSON();

			var dateFormats = { normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY' };
			var pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

			var timeFormat = bg.settings.get('hoursFormat') == '12h' ? 'H:mm a' : 'hh:mm';
			var timeFormatTitle = bg.settings.get('hoursFormat') == '12h' ? 'H:mm a' : 'hh:mm:ss';

			if (data.date) {
				if (bg.settings.get('fullDate')) {
					data.date = formatDate(new Date(data.date), pickedFormat + ' ' + timeFormat);
				} else if (parseInt(formatDate(data.date, 'T') / 86400000) >= parseInt(formatDate(Date.now(), 'T') / 86400000)) {
					data.date = formatDate(new Date(data.date), timeFormat);
				} else if ((new Date(data.date)).getFullYear() == (new Date()).getFullYear() ) {
					data.date = formatDate(new Date(data.date), pickedFormat.replace(/\/?YYYY(?!-)/, ''));	
				} else {
					data.date = formatDate(new Date(data.date), pickedFormat);
				}
			}

			this.el.title = data.title + '\n' + formatDate(this.model.get('date'), pickedFormat + ' ' + timeFormatTitle);
			
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
					if (!topWindow || !topWindow.frames) {
						bg.logs.add({ message: 'Event duplication bug! Clearing events now...' });
						bg.console.log('Event duplication bug! Clearing events now...');
						bg.sources.trigger('clear-events', -1);
						return;
					}
					topWindow.frames[2].postMessage({ action: 'new-select', value: this.model.id }, '*');
				}

				
				if (this.model.get('unread') && bg.settings.get('readOnVisit')) {
					this.model.save({
						visited: true,
						unread: false
					});
				} else if (!this.model.get('visited')) {
					this.model.save('visited', true);
				}
				
			} else if (e.shiftKey && list.selectPivot) {
				$('.selected').removeClass('selected');
				list.selectedItems = [list.selectPivot];
				list.selectedItems[0].$el.addClass('selected');

				if (list.selectedItems[0] != this) {
					if (list.selectedItems[0].$el.index() < this.$el.index() ) {
						list.selectedItems[0].$el.nextUntil(this.$el).not('.invisible,.date-group').each(function(i, el) {
							$(el).addClass('selected');
							list.selectedItems.push(el.view);
						});
					} else {
						this.$el.nextUntil(list.selectedItems[0].$el).not('.invisible,.date-group').each(function(i, el) {
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
			list.destroyItem(this);
		},
		handleClickPin: function(e) {
			e.stopPropagation();
			this.model.save({ pinned: !this.model.get('pinned') });
		}
	});


	/**
	 * Today, Yesterday, Monday-Sunday, Last Week, January-December, Last Year, 2011-1960
	 */
	var Group = Backbone.Model.extend({
		defaults: {
			title: '<no title>',
			date: 0
		},
		idAttribute: 'date'
	});

	var groups = new (Backbone.Collection.extend({
		model: Group
	}));

	var GroupView = Backbone.View.extend({
		tagName: 'div',
		className: 'date-group',
		initialize: function() {
			this.el.view = this;
			groups.on('reset', this.handleReset, this);
			groups.on('remove', this.handleRemove, this);
		},
		render: function() {
			this.$el.html(this.model.get('title'));
			return this;
		},
		handleRemove: function(model) {
			if (model == this.model) {
				this.handleReset();
			}
		},
		handleReset: function() {
			groups.off('reset', this.handleRemove, this);
			groups.off('remove', this.handleRemove, this);
			this.$el.remove();
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
				bg.downloadAll(true); // true = force
			}
			
		},
		handleSearch: function(e) {
			var str = e.currentTarget.value || '';

			if (str == '') {
				$('.date-group').css('display', 'block');
			} else {
				$('.date-group').css('display', 'none');
			}

			var searchInContent = false;
			if (str[0] && str[0] == ':') {
				str = str.replace(/^:/, '', str);
				searchInContent = true;
			}
			var rg = new RegExp(RegExp.escape(str), 'i');
			list.views.some(function(view) {
				if (!view.model) return true;
				if (rg.test(view.model.get('title')) || rg.test(view.model.get('author')) || (searchInContent && rg.test(view.model.get('content')) )) {
					view.$el.removeClass('invisible');
				} else {
					view.$el.addClass('invisible');
				}
			});

			list.handleScroll();

			list.restartSelection();
		},
		handleButtonDelete: function(e) {
			if (list.specialName == 'trash' || e.shiftKey) {
				list.destroyBatch(list.selectedItems, list.removeItemCompletely);
			} else {
				list.destroyBatch(list.selectedItems, list.removeItem);
			}
		},
		handleButtonUndelete: function() {
			if (list.specialName == 'trash') {
				list.destroyBatch(list.selectedItems, list.undeleteItem);
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
			title: bg.lang.c.NEXT_UNREAD + ' (H)',
			icon: 'forward.png',
			action: function() {
				app.selectNext({ selectUnread: true });
			}
		},
		{
			title: bg.lang.c.PREV_UNREAD + ' (Y)',
			icon: 'back.png',
			action: function() {
				app.selectPrev({ selectUnread: true });
			}
		},
		{
			title: bg.lang.c.MARK_AS_READ + ' (K)',
			icon: 'read.png',
			action: function() {
				list.changeUnreadState();
			}
		},
		{
			title: bg.lang.c.MARK_AND_NEXT_UNREAD + ' (G)',
			icon: 'find_next.png',
			action: function() {
				list.changeUnreadState({ onlyToRead: true });
				app.selectNext({ selectUnread: true });
			}
		},
		{
			title: bg.lang.c.MARK_AND_PREV_UNREAD + ' (T)',
			icon: 'find_previous.png',
			action: function() {
				list.changeUnreadState({ onlyToRead: true });
				this.selectPrev({ selectUnread: true });
			}
		},
		{
			title: bg.lang.c.FULL_ARTICLE,
			icon: 'full_article.png',
			action: function(e) {
				if (!list.selectedItems || !list.selectedItems.length) return;
				if (list.selectedItems.length > 10 && bg.settings.get('askOnOpening')) {
					if (!confirm('Do you really want to open ' + list.selectedItems.length + ' articles?')) {
						return;
					}
				}
				list.selectedItems.forEach(function(item) {
					chrome.tabs.create({ url: escapeHtml(item.model.get('url')), active: !e.shiftKey });
				});
			}
		},
		{
			title: bg.lang.c.PIN + ' (P)',
			icon: 'pinsource_context.png',
			action: function() {
				if (!list.selectedItems || !list.selectedItems.length) return;
				var val = !list.selectedItems[0].model.get('pinned');
				list.selectedItems.forEach(function(item) {
					item.model.save({ pinned: val });
				});
			}
		},
		{
			title: bg.lang.c.DELETE + ' (D)',
			icon: 'delete.png',
			action: function(e) {
				e = e || {};
				if (list.specialName == 'trash' || e.shiftKey) {
					list.destroyBatch(list.selectedItems, list.removeItemCompletely);
				} else {
					list.destroyBatch(list.selectedItems, list.removeItem);
				}
			}
		},
		{
			title: bg.lang.c.UNDELETE + ' (U)',
			id: 'context-undelete',
			icon: 'delete_selected.png',
			action: function(e) {
				if (list.specialName == 'trash') {
					list.destroyBatch(list.selectedItems, list.undeleteItem);
				}
			}
		}
	]);

	var AppList = Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		selectPivot: null,
		views: [],
		viewsToRender: [],
		currentSource: null,
		currentFolder: null,
		specialName: 'all-feeds',
		specialFilter: { trashed: false },
		unreadOnly: false,
		noFocus: false,
		reuseIndex: 0,
		events: {
			'dragstart .item': 'handleDragStart',
			'mousedown .item': 'handleMouseDown',
			'dblclick .item': 'handleItemDblClick',
			'mouseup .item': 'handleMouseUp',
			'mousedown .item-pin,.item-pinned': 'handleClickPin',
		},
		handleItemDblClick: function(e) {
			var t = e.currentTarget;
			if (t.view.model) {
				chrome.tabs.create({ url: escapeHtml(t.view.model.get('url')), active: !e.shiftKey });
			}
		},
		handleClickPin: function(e) {
			e.currentTarget.parentNode.view.handleClickPin(e);
		},
		handleMouseDown: function(e) {
			e.currentTarget.view.handleMouseDown(e);
		},
		handleMouseUp: function(e) {
			e.currentTarget.view.handleMouseUp(e);
		},
		initialize: function() {
			var that = this;
			this.$el.addClass('lines-' + bg.settings.get('lines'));
			bg.items.on('reset', this.addItems, this);
			bg.items.on('add', this.addItem, this);
			bg.items.on('sort', this.handleSort, this);
			bg.items.on('render-screen', this.handleRenderScreen, this);
			bg.settings.on('change:lines', this.handleChangeLines, this);
			bg.settings.on('change:layout', this.handleChangeLayout, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			groups.on('add', this.addGroup, this);

			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select' || e.data.action == 'new-folder-select') {
					if (!e.data.noFocus) window.focus();
					that.el.scrollTop = 0;
					that.unreadOnly = e.data.unreadOnly;
				}

				if (e.data.action == 'new-select') {
					if (typeof e.data.value == 'object') {
						that.handleNewSpecialSelected(e.data.value, e.data.name);
					} else {
						that.handleNewSelected(bg.sources.findWhere({ id: e.data.value }));	
					}
				} else if (e.data.action == 'new-folder-select') {
					that.handleNewFolderSelected(e.data.value);	
				} else if (e.data.action == 'give-me-next') {
					if (list.selectedItems[0] && list.selectedItems[0].model.get('unread') == true) {
						list.selectedItems[0].model.save({ unread: false });
					} 
					
					app.selectNext({ selectUnread: true });
				}
			});

			this.el.addEventListener('scroll', this.handleScroll.bind(this));

			setTimeout(function() {
				var unread = bg.items.where({ trashed: false, unread: true });
				if (unread.length) {
					that.addItems(unread);
				} else {
					that.addItems(bg.items.where({ trashed: false }));
				}
			}, 0);
		},
		handleRenderScreen: function() {
			this.handleScroll();
		},
		handleScroll: function() {
			var start = -1;
			var count = 0;
			for (var i=0,j=this.viewsToRender.length; i<j; i++) {
				if ((start >= 0 && count % 10 != 0) || isScrolledIntoView(this.viewsToRender[i].el)) {
					this.viewsToRender[i].render();
					count++;
					if (start == -1) start = i;
				} else if (start >= 0) {
					break;
				}
			}


			if (start >= 0 && count > 0) {
				this.viewsToRender.splice(start, count);
			}
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.items.off('reset', this.addItems, this);
				bg.items.off('add', this.addItem, this);
				bg.items.off('sort', this.handleSort, this);
				bg.items.off('render-screen', this.handleRenderScreen, this);
				bg.settings.off('change:lines', this.handleChangeLines, this);
				bg.settings.off('change:layout', this.handleChangeLayout, this);
				if (this.currentSource) {
					this.currentSource.off('destroy', this.handleDestroyedSource, this);
				}
				if (this.currentFolder) {
					this.currentFolder.off('destroy', this.handleDestroyedSource, this);
				}
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		handleChangeLayout: function() {
			requestAnimationFrame(function() {
				list.setItemHeight();
				list.handleScroll();
			});
		},
		handleSort: function(items) {
			$('#input-search').val('');
			if (this.specialName) {
				this.handleNewSpecialSelected(this.specialFilter, this.specialName);
			} else if (this.currentSource) {
				this.handleNewSelected(this.currentSource);
			} else if (this.currentFolder) {
				this.handleNewFolderSelected(this.currentFolder);
			} else {
				alert('E1: This should not happen. Please report it!');
				debugger;
			}
		},
		handleChangeLines: function(settings) {
			this.$el.removeClass('lines-auto');
			this.$el.removeClass('lines-one-line');
			this.$el.removeClass('lines-two-lines');
			// this.$el.removeClass('lines-' + settings.previous('lines')); // does not work for some reason
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
			} else {
				this.selectFirst()
			}
		},
		addItem: function(item, noManualSort) {
			/**
			 * Don't add newly fetched items to middle column, when they shouldn't be
			 */
			if (noManualSort !== true) {
				if (this.currentSource && this.currentSource.id != item.get('sourceID')) {
					return;	
				} else if (this.specialName && this.specialName != 'all-feeds') {
					return;
				} else if (this.currentFolder && this.currentFolder.id != item.getSource().get('folderID')) {
					return;
				}
			} 

			if (!item.get('deleted') && (!item.get('trashed') || this.specialName == 'trash') ) {

				var after = null;
				if (noManualSort !== true) {
					$.makeArray($('#list .item, #list .date-group')).some(function(itemEl) {
						if (bg.items.comparator(itemEl.view.model, item) === 1) {
							after = itemEl;
							return true;
						}
					});
				}

				var view;

				if (!after) {
					if (this.reuseIndex >= this.views.length) {
						view = new ItemView({ model: item });
						if (!_itemHeight) {
							view.render();
						} else {
							view.$el.css('height', _itemHeight + 'px');
							view.prerender();
						}
						this.$el.append(view.$el);	
						this.views.push(view);
					} else {
						view = this.views[this.reuseIndex];
						view.swapModel(item);
					}
					
					if (!this.selectedItems.length) view.select();
				} else {
					view = new ItemView({ model: item });
					view.render().$el.insertBefore($(after));
					
					// weee, this is definitelly not working 100% right :D or is it?
					var indexElement = after.view instanceof ItemView ? after : after.nextElementSibling;
					var index = indexElement ? this.views.indexOf(indexElement.view) : -1;
					if (index == -1) index = this.reuseIndex;

					this.views.splice(index, 0, view);
				}

				if (!_itemHeight) {
					_itemHeight = view.el.getBoundingClientRect().height;
				}


				if (!bg.settings.get('disableDateGroups')) {
					var group = getGroup(item.get('date'));
					if (!groups.findWhere({ title: group.title })) {
						groups.add(new Group(group), { before: view.el });
					}
				}

				this.reuseIndex++;
				

				
			}
		},
		addGroup: function(model, col, opt) {
			var before = opt.before;
			var view = new GroupView({ model: model });
			
	
			view.render().$el.insertBefore(before);
		},
		setItemHeight: function() {
			var firstItem = $('.item:not(.invisible):first');
			if (firstItem.length) {
				_itemHeight = firstItem.get(0).getBoundingClientRect().height;
			}
		},
		addItems: function(items) {

			groups.reset();
			

			/**
			 * Select removal
			 */
			this.selectedItems = [];
			this.viewsToRender = [];
			$('.selected').removeClass('.selected');
			$('.last-selected').removeClass('.last-selected');
			this.selectPivot = null;
			/* --- */

			//var st = Date.now();

			this.setItemHeight();

			this.reuseIndex = 0;

			

			items.forEach(function(item) {
				this.addItem(item, true);
			}, this);

			for (var i=this.reuseIndex, j = this.views.length; i < j; i++) {
				if (!this.views[i].model) break;
				this.views[i].unplugModel();
			}

			this.handleScroll();

			//alert(Date.now() - st);

		},
		clearOnSelect: function() {
			$('#input-search').val('');

			if (this.currentSource) {
				this.currentSource.off('destroy', this.handleDestroyedSource, this);
			}

			if (this.specialName == 'trash') {
				$('#button-reload').css('display', 'block');
				$('#button-undelete').css('display', 'none');
				$('#context-undelete').css('display', 'none');
			}

			if (this.currentFolder) {
				this.currentFolder.off('destroy', this.handleDestroyedSource, this);
			}

			this.specialName = null;
			this.specialFilter = null;
			this.currentSource = null;
			this.currentFolder = null;
		},
		handleNewSelected: function(source) {
			this.clearOnSelect();
			this.currentSource = source;
			
			source.on('destroy', this.handleDestroyedSource, this);

			var completeFilter = { sourceID: source.id };
			if (this.unreadOnly) completeFilter.unread = true;
			this.addItems( bg.items.where(completeFilter) );
		},
		handleNewSpecialSelected: function(filter, name) {
			this.clearOnSelect();

			this.specialName = name;
			this.specialFilter = filter;

			if (this.specialName == 'trash') {
				$('#button-reload').css('display', 'none');
				$('#button-undelete').css('display', 'block');
				$('#context-undelete').css('display', 'block');
			}
			var completeFilter = filter;
			if (this.unreadOnly) completeFilter.unread = true;
			this.addItems( bg.items.where(completeFilter) );
		},
		handleNewFolderSelected: function(folderID) {
			this.clearOnSelect();

			if (folderID instanceof bg.Folder) {
				this.currentFolder = folderID;
				folderID = this.currentFolder.get('id');
			} else {
				this.currentFolder = bg.folders.findWhere({ id: folderID });
			}

			
			this.currentFolder.on('destroy', this.handleDestroyedSource, this);



			var feeds = _.pluck(bg.sources.where({ folderID: folderID }), 'id');

			if (!feeds.length) return;

			this.addItems( bg.items.filter(function(item) {
				if (this.unreadOnly && item.get('unread') == true) {
					if (feeds.indexOf(item.get('sourceID')) >= 0) {
						return true;	
					}
				} else if (!this.unreadOnly && feeds.indexOf(item.get('sourceID')) >= 0) {
					return true;	
				} 
				
			}, this) );
		},
		handleDestroyedSource: function(model) {
			var that = this;
			if (this.currentFolder && !(model instanceof bg.Folder)) {
				setTimeout(function() {
					that.handleNewFolderSelected(that.currentFolder);
				}, 0);
			} else {
				this.clearOnSelect();
				this.specialName = 'all-feeds';
				setTimeout(function() {
					that.addItems(bg.items.where({ trashed: false, unread: true }));
				}, 0);	
			}
		},
		undeleteItem: function(view) {
			view.model.save({
				'trashed': false
			});
			this.destroyItem(view);
		},
		removeItem: function(view) {
			view.model.save({ 'trashed': true });
			//this.destroyItem(view);
		},
		removeItemCompletely: function(view) {
			if (view.model.get('pinned')) {
				var conf = confirm(bg.lang.c.PIN_QUESTION_A + view.model.escape('title') + bg.lang.c.PIN_QUESTION_B);
				if (!conf) {
					return;
				}
			}
			view.model.markAsDeleted();
			//this.destroyItem(view);
		},
		destroyBatch: function(arr, fn) {
			for (var i=0, j=arr.length; i<j; i++) {
				fn.call(this, arr[i]);
			}
		},
		nextFrameStore: [],
		nextFrame: null,
		destroyItem: function(view) {
			this.nextFrameStore.push(view);
			if (!this.nextFrame) {
				this.nextFrame = requestAnimationFrame(function() {
					for (var i=0, j=this.nextFrameStore.length - 1; i<j; i++) {
						this.destroyItemFrame(this.nextFrameStore[i]);
					}
					var lastView = this.nextFrameStore[this.nextFrameStore.length - 1];
					this.selectAfterDelete(lastView);
					this.destroyItemFrame(lastView);

					this.nextFrame = null;
					this.nextFrameStore = [];
					this.handleScroll();

				}.bind(this));
			}
		},
		destroyItemFrame: function(view) {
			// START: REMOVE DATE GROUP
			/*var prev = view.el.previousElementSibling;
			var next = view.el.nextElementSibling;*/
			var prev = view.el.findPrev(':not(.unpluged)');
			var next = view.el.findNext(':not(.unpluged)');
			if (prev && prev.classList.contains('date-group')) {
				if (!next || next.classList.contains('date-group')) {
					groups.remove(prev.view.model);
				}
			}
			// END: REMOVE DATE GROUP

			view.clearEvents();
			// view.undelegateEvents(); - I moved all events to _list_ so this shouldn't be neccesary
			// view.$el.removeData() - i removed this as I don't use jquery .data, if I will in future I have to add it again
			// view.$el.unbind(); - - I'm not adding any jquery events
			// view.off(); - This takes from some reason quite a time, and does nothing because I'm not adding events on the view
			view.remove(); 
			
			var io = list.selectedItems.indexOf(view);
			if (io >= 0) list.selectedItems.splice(io, 1);
			io = list.views.indexOf(view);
			if (io >= 0) list.views.splice(io, 1);
			io = list.viewsToRender.indexOf(view);
			if (io >= 0) list.viewsToRender.splice(io, 1);

			// not really sure what would happen if this wouldn't be here :P (too tired to think about it)
			this.reuseIndex--;
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
	});

	var App = Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			window.addEventListener('resize', this.handleResize.bind(this));
		},
		handleResize: function() {
			if (bg.settings.get('layout') == 'horizontal') {
				var wid = $(window).width();
				bg.settings.save({ posB: wid + ',*' });
			} else {
				var hei = $(window).height();
				bg.settings.save({ posC: hei + ',*' });
			}
		},
		handleMouseDown: function(e) {
			if (itemsContextMenu.el.parentNode && !e.target.matchesSelector('.context-menu, .context-menu *')) {
				// make sure the action gets executed
				itemsContextMenu.hide();
			}
		},
		selectNext: function(e) {
			var e = e || {};

			var q = e.selectUnread ? '.unread:not(.invisible)' : '.item:not(.invisible)';
			var next;
			if (e.selectUnread &&  list.selectPivot) {
				next = list.selectPivot.el.nextElementSibling;
			} else {
				next = $('.last-selected').get(0).nextElementSibling;
			}
			while (next && !next.matchesSelector(q)) {
				next = next.nextElementSibling;
			}

			if (!next && !e.shiftKey && !e.ctrlKey) {
				next = list.el.querySelector(q);
				if (e.currentIsRemoved && next && $('.last-selected').get(0) == next) {
					next = [];
					topWindow.frames[2].postMessage({ action: 'no-items' }, '*');
				}
			}
			if (next && next.view) {
				next.view.select(e);
				if (!list.inView(next)) {
					next.scrollIntoView(false);	
				}
			}

		},
		selectPrev: function(e) {
			var e = e || {};
			var q = e.selectUnread ? '.unread:not(.invisible)' : '.item:not(.invisible)';
			var prev;
			if (e.selectUnread &&  list.selectPivot) {
				prev = list.selectPivot.el.previousElementSibling;
			} else {
				prev = $('.last-selected').get(0).previousElementSibling;
			}
			while (prev && !prev.matchesSelector(q)) {
				prev = prev.previousElementSibling;
			}

			if (!prev && !e.shiftKey && !e.ctrlKey) {
				prev = $(q + ':last').get(0);
				if (e.currentIsRemoved && prev && $('.last-selected').get(0) == prev) {
					prev = [];
					topWindow.frames[2].postMessage({ action: 'no-items' }, '*');
				}
			}
			if (prev && prev.view) {
				prev.view.select(e);
				if (!list.inView(prev)) {
					prev.scrollIntoView(true);	
				}
			}
		},
		handleKeyDown: function(e) {
			if (document.activeElement && document.activeElement.tagName == 'INPUT') {
				return;
			}

			if (e.keyCode == 68 || e.keyCode == 46) { // D, DEL
				if (list.specialName == 'trash' || e.shiftKey) {
					list.destroyBatch(list.selectedItems, list.removeItemCompletely);
				} else {
					list.destroyBatch(list.selectedItems, list.removeItem);
				}
				e.preventDefault();
			} else if (e.keyCode == 70 && e.ctrlKey) { // CTRL+F
				$('#input-search').focus();
				e.preventDefault();
			} else if (e.keyCode == 49) { // 1
				topWindow.frames[0].focus();
				e.preventDefault();
			} else if (e.keyCode == 13) { // ENTER
				if (!list.selectedItems.length) return;
				list.handleItemDblClick({ currentTarget: list.selectedItems[0].el, shiftKey: e.shiftKey });
				e.preventDefault();
			} else if (e.keyCode == 51) { // 3
				topWindow.frames[2].focus();
				e.preventDefault();
			} else if (e.keyCode == 75) { // K - mark as read/unread
				list.changeUnreadState();
				e.preventDefault();
			} else if (e.keyCode == 40 || e.keyCode == 74) { // arrow down, J
				this.selectNext(e);
				e.preventDefault();
			} else if (e.keyCode == 38 || e.keyCode == 85) { // arrow up, U
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
			} else if (e.keyCode == 89 || e.keyCode == 90) { // Y/Z = go to prev unread
				this.selectPrev({ selectUnread: true });
				e.preventDefault();
			} else if (e.keyCode == 65 && e.ctrlKey && e.shiftKey) { // A = Mark all as read
				if (list.currentSource) {
					var id = list.currentSource.get('id');
					if (!id) return;
					bg.items.forEach(function(item) {
						if (item.get('unread') == true && item.getSource().id == id) {
							item.save({ unread: false, visited: true });
						}
					});
				} else if (list.specialName == 'all-feeds') {
					if (confirm(bg.lang.c.MARK_ALL_QUESTION)) {
						bg.items.forEach(function(item) {
							if (item.get('unread') == true) {
								item.save({ unread: false, visited: true });
							}
						});	
					}
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
			} else if (e.keyCode == 78) { // N = Undelete item
				if (!list.selectedItems || !list.selectedItems.length || list.specialName != 'trash') return;
				list.destroyBatch(list.selectedItems, list.undeleteItem);				
				e.preventDefault();
			} else if (e.keyCode == 32) { // Space = Space through items
				if (!list.selectedItems || !list.selectedItems.length) return;
				topWindow.frames[2].postMessage({ action: 'space-pressed' }, '*');
				e.preventDefault();
			}

			
		} 
	});


	var app, list;

	bg.appStarted.always(function() {
		list = new AppList();
		app = new App();
	});

});


});