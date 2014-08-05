/**
 * @module App
 * @submodule models/Search
 */
define(['backbone'], function(BB) {
	/**
	 * Model for search items in feed list.
	 * @class Search
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Search = BB.Model.extend({
		defaults: {

			/**
			 * Name adn title of the search and the value to search by.
			 * @attribute name
			 * @type String
			 * @default ''
			 */
			name: ''
		}
	});

	return Search;
});