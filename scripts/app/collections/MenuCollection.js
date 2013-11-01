/**
 * @module App
 * @submodule collections/MenuCollection
 */
define(['backbone', 'models/MenuItem'], function(BB, MenuItem) {

	/**
	 * Each ContextMenu has its own MenuCollection instance
	 * @class MenuCollection
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var MenuCollection = BB.Collection.extend({
		model: MenuItem
	});

	return MenuCollection;
});