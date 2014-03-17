/**
 * @module BgProcess
 * @submodule collections/Items
 */
define(['backbone', 'models/Item', 'preps/indexeddb'], function (BB, Item) {

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
			var val;
			if (settings.get('sortBy') == 'title') {
				val = String(a.get('title')).toLowerCase() <= String(b.get('title')).toLowerCase() ? 1 : -1;
			} else if (settings.get('sortBy') == 'author') {
				val = String(a.get('author')).toLowerCase() <= String(b.get('author')).toLowerCase() ? 1 : -1;
			} else {
				val = a.get('date') <= b.get('date') ? 1 : -1;
			}

			if (settings.get('sortOrder') == 'asc') {
				val = -val;
			}
			return val;
		},
		initialize: function() {
			//settings.on('change:sortOrder', this.sort, this);
			this.listenTo(settings, 'change:sortOrder', this.sort);
			this.listenTo(settings, 'change:sortBy', this.sort);
		}
	});

	return Items;

});