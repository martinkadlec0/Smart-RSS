/**
 * @module App
 * @submodule collections/ToolbarItems
 */
define(['backbone', 'models/ToolbarButton'], function (BB, ToolbarButton) {

	/**
	 * Each ToolbarView has its own ToolbarItems instance
	 * @class ToolbarItems
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var ToolbarItems = BB.Collection.extend({
		model: ToolbarButton,

		comparator: function(tbItem1, tbItem2) {
			if (!tbItem1.view || !tbItem2.view) return 0;
			var r1 = tbItem1.view.el.getBoundingClientRect();
			var r2 = tbItem2.view.el.getBoundingClientRect();

			return r1.left > r2.left ? 1 : -1;
		}
	});

	return ToolbarItems;
});