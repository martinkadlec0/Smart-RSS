/**
 * @module BgProcess
 * @submodule models/Source
 */
define(['backbone'], function (BB) {

	/**
	 * Feed module
	 * @class Source
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Source = Backbone.Model.extend({
		defaults: {
			title: '',
			url: 'about:blank',
			base: '',
			updateEvery: 180, // in minutes
			lastUpdate: 0,
			count: 0, // unread
			countAll: 0,
			username: '',
			password: '',
			hasNew: false,
			autoremove: 0 // in days
		}
	});

	return Source;
});