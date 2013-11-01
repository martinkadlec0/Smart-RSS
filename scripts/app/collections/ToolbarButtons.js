/**
 * @module App
 * @submodule collections/ToolbarButtons
 */
define(['backbone', 'models/ToolbarButton'], function (BB, ToolbarButton) {

	/**
	 * Each ToolbarView has its own ToolbarButtons instance
	 * @class ToolbarButtons
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var ToolbarButtons = BB.Collection.extend({
		model: ToolbarButton,
	});

	return ToolbarButtons;
});