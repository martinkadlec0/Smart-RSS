define(['jquery'], function($) {

return {
	selectedItems: [],
	selectPivot: null,
	selectFlag: false,
	restartSelection: function() {
		if (this.selectedItems.length) {
			this.selectedItems = [];
			this.$el.find('.selected').removeClass('selected');
			this.$el.find('.last-selected').removeClass('last-selected');
		}
		this.selectFirst();
	},
	selectFirst: function() {
		var first = $('.' + this.itemClass + ':not(.invisible)').get(0);
		if (first) this.select(first.view);
	},
	selectNext: function(e) {
		e = e || {};

		var q = e.selectUnread ? '.unread:not(.invisible)' : '.' + this.itemClass + ':not(.invisible)';
		var next;
		if (e.selectUnread &&  this.selectPivot) {
			next = this.selectPivot.el.nextElementSibling;
		} else {
			next = this.$el.find('.last-selected');
			if (next.length) {
				next = next.get(0).nextElementSibling;
			} else {
				next = this.el.firstElementChild;
			}
		}
		while (next && !next.matchesSelector(q)) {
			next = next.nextElementSibling;
		}

		if (!next && !e.shiftKey && !e.ctrlKey) {
			next = this.el.querySelector(q);
			if (e.currentIsRemoved && next && this.$el.find('.last-selected').get(0) == next) {
				next = [];
				app.trigger('no-items:' + this.el.id);
			}
		}
		if (next && next.view) {
			this.select(next.view, e);
			if (!this.inView(next)) {
				next.scrollIntoView(false);
			}
		}

	},
	selectPrev: function(e) {
		e = e || {};
		var q = e.selectUnread ? '.unread:not(.invisible)' : '.' + this.itemClass + ':not(.invisible)';
		var prev;
		if (e.selectUnread &&  this.selectPivot) {
			prev = this.selectPivot.el.previousElementSibling;
		} else {
			prev = this.$el.find('.last-selected');
			if (prev.length) {
				prev = prev.get(0).previousElementSibling;
			} else {
				prev = this.el.lastElementChild;
			}
		}
		while (prev && !prev.matchesSelector(q)) {
			prev = prev.previousElementSibling;
		}

		if (!prev && !e.shiftKey && !e.ctrlKey) {
			prev = this.$el.find(q + ':last').get(0);
			if (e.currentIsRemoved && prev && this.$el.find('.last-selected').get(0) == prev) {
				prev = [];
				app.trigger('no-items:' + this.el.id);
			}
		}
		if (prev && prev.view) {
			this.select(prev.view, e);
			if (!this.inView(prev)) {
				prev.scrollIntoView(true);
			}
		}
	},
	select: function(view, e) {
		e = e || {};
		var that = this;
		if ( (e.shiftKey != true && e.ctrlKey != true) || (e.shiftKey && !this.selectPivot) ) {
			this.selectedItems = [];
			this.selectPivot = view;
			this.$el.find('.selected').removeClass('selected');

			
			if (!window || !window.frames) {
				bg.logs.add({ message: 'Event duplication bug! Clearing events now...' });
				bg.console.log('Event duplication bug! Clearing events now...');
				bg.sources.trigger('clear-events', -1);
				return;
			}

			setTimeout(function() {
				this.trigger('pick', view, e);
			}.bind(this), 0);
			
		} else if (e.shiftKey && this.selectPivot) {
			this.$el.find('.selected').removeClass('selected');
			this.selectedItems = [this.selectPivot];
			this.selectedItems[0].$el.addClass('selected');

			if (this.selectedItems[0] != view) {
				if (this.selectedItems[0].$el.index() < view.$el.index() ) {
					this.selectedItems[0].$el.nextUntil(view.$el).not('.invisible,.date-group').each(function(i, el) {
						$(el).addClass('selected');
						that.selectedItems.push(el.view);
					});
				} else {
					view.$el.nextUntil(this.selectedItems[0].$el).not('.invisible,.date-group').each(function(i, el) {
						$(el).addClass('selected');
						that.selectedItems.push(el.view);
					});
				}

			}
		} else if (e.ctrlKey && view.$el.hasClass('selected')) {
			view.$el.removeClass('selected');
			view.$el.removeClass('last-selected');
			this.selectPivot = null;
			this.selectedItems.splice(this.selectedItems.indexOf(view), 1);
			return;
		} else if (e.ctrlKey) {
			this.selectPivot = view;
		}

		this.$el.find('.last-selected').removeClass('last-selected');
		if (this.selectedItems[0] != view) {
			this.selectedItems.push(view);
			view.$el.addClass('selected');
		}
		view.$el.addClass('last-selected');
	},
	inView: function(cel) {
		var $cel = $(cel);
		if ($cel.position().top - this.$el.offset().top < 0 || $cel.position().top + cel.offsetHeight >= this.el.offsetHeight) {
			return false;
		}
		return true;
	},
	handleSelectableMouseDown: function(e) {
		//e.currentTarget.view.handleMouseDown(e);
		var item = e.currentTarget.view;
		if (this.selectedItems.length > 1 && item.$el.hasClass('selected') && !e.ctrlKey && !e.shiftKey) {
			this.selectFlag = true;
			return;
		}
		// used to be just { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey } instead of 'e'
		this.select(item, e);
	},
	handleSelectableMouseUp: function(e) {
		var item = e.currentTarget.view;
		if (e.which == 1 && this.selectedItems.length > 1 && this.selectFlag) {
			this.select(item, e);
			this.selectFlag = false;
		}
	}

};
});