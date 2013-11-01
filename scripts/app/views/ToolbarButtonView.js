define(['backbone', 'jquery', 'domReady!'], function (BB, $) {
	var ToolbarButtonView = BB.View.extend({
		tagName: 'div',
		className: 'button',
		initialize: function() {
			
			var action = app.actions.get(this.model.get('actionName'));
			/****BETTER SOLUTION****/
			if (action.id != 'articles:search') {
				this.$el.css('background', 'url("/images/' + action.get('icon') + '") no-repeat center center');
			} else {
				var newEl = $('<input type="search" required class="input-search" />');
				this.$el.replaceWith(newEl);
				this.$el = newEl;
				this.$el.attr('placeholder', bg.lang.c.SEARCH);
				this.$el.attr('tabindex', -1);
				this.el = this.$el.get(0);
			}

			this.el.dataset.action = this.model.get('actionName');
			this.el.title = action.get('title');

			if (this.model.get('position') == 'right') {
				this.$el.css('margin-right', 0);
				this.$el.css('margin-left', 'auto');
			}

			this.el.view = this;
		}
	});

	return ToolbarButtonView;
});