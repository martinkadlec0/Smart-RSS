define(['backbone', 'jquery', 'domReady!'], function (BB, $) {
	var ToolbarDynamicSpaceView = BB.View.extend({
		tagName: 'div',
		className: 'dynamic-space',
		initialize: function() {
			// this.el.setAttribute('draggable', 'true');
			this.el.view = this;
		}
	});

	return ToolbarDynamicSpaceView;
});