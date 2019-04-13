define(['backbone', ], function (BB) {
	return BB.View.extend({
		tagName: 'div',
		className: 'dynamic-space',
		initialize: function () {
			// this.el.setAttribute('draggable', 'true');
			this.el.view = this;
		}
	});
});