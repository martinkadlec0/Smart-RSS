/**
 * @module BgProcess
 * @submodule collections/Searches
 */
define(['backbone', 'models/Search', 'preps/indexeddb'], function (BB, Search) {

	/**
	 * Collection of feed modules
	 * @class Searches
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Searches = BB.Collection.extend({
		model: Search,
		/*localStorage: new Backbone.LocalStorage('sources-backbone'),*/
		comparator: function(a, b) {
			var t1 = (a.get('title') || '').trim().toLowerCase();
			var t2 = (b.get('title') || '').trim().toLowerCase();
			return t1 < t2  ? -1 : 1;
		}
	});

	return Searches;

});