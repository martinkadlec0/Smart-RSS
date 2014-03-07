/**
 * @module BgProcess
 * @submodule collections/Folders
 */
define(['backbone', 'models/Folder', 'backboneDB'], function (BB, Folder) {

	/**
	 * Collection of feed folders
	 * @class Folders
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Folders = BB.Collection.extend({
		model: Folder,
		localStorage: new Backbone.LocalStorage('folders-backbone'),
		comparator: function(a, b) {
			return (a.get('title') || '').trim() < (b.get('title') || '').trim() ? -1 : 1;
		}
	});

	return Folders;

});