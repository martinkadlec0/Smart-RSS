/**
 * @module App
 * @submodule collections/Groups
 */
define(['backbone', 'models/Group'], function(BB, Group) {

	/**
	 * Collection of date groups
	 * @class Groups
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Groups = BB.Collection.extend({
		model: Group
	});

	return Groups;
});