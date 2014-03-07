/**
 * @module BgProcess
 * @submodule collections/Items
 */
define(['backbone', 'models/Item', 'backboneDB'], function (BB, Item) {

	/**
	 * Collection of feed modules
	 * @class Items
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Items = BB.Collection.extend({
		model: Item,
		batch: false,
		localStorage: new Backbone.LocalStorage('items-backbone'),
		comparator: function(a, b) {
			var val = a.get('date') <= b.get('date') ? 1 : -1;
			if (settings.get('sortOrder') == 'asc') {
				val = -val;
			}
			return val;
		},
		initialize: function() {
			settings.on('change:sortOrder', this.sort, this);
		}
	});

	return Items;

});