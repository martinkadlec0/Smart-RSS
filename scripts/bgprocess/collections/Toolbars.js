/**
 * @module BgProcess
 * @submodule collections/Toolbars
 */
define([
	'backbone', 'models/Toolbar', 'staticdb/defaultToolbarItems', 'preps/indexeddb'
],
function (BB, Toolbar, defaultToolbarItems) {

	/**
	 * Collection of feed modules
	 * @class Toolbars
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Toolbars = BB.Collection.extend({
		model: Toolbar,
		localStorage: new Backbone.LocalStorage('toolbars-backbone'),
		parse: function(data) {
			// this is very poor solution, but as long as there won't be any more toolbars it doesn't matter
			if (!data.length) return defaultToolbarItems;
			if (data[0].region != 'feeds') data.unshift(defaultToolbarItems[0]);
			if (data.length < 2 || data[1].region != 'articles') data.splice(1, 0, defaultToolbarItems[1]);
			if (data.length < 3 || data[2].region != 'content') data.push(defaultToolbarItems[2]);

			for (var i=0; i<data.length; i++) {
				if (!data[i].version || data[i].version < defaultToolbarItems[i].version) {
					data[i] = defaultToolbarItems[i];
				}
			}
			
			return data;
		}
	});

	return Toolbars;

});