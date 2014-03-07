define(['backbone', 'domReady!'], function (BB) {
	var ToolbarButtonView = BB.View.extend({
		tagName: 'div',
		className: 'button',
		initialize: function() {
			
			var action = app.actions.get(this.model.get('actionName'));
			
			this.$el.css('background', 'url("/images/' + action.get('icon') + '") no-repeat center center');
	
			this.el.dataset.action = this.model.get('actionName');
			this.el.title = action.get('title');

			this.el.setAttribute('draggable', 'true');

			this.el.view = this;
		}
	});

	return ToolbarButtonView;
});