/**
 * @module App
 * @submodule models/Toolbar
 */
define(['backbone', 'staticdb/buttons'], function (BB, db) {

	/**
	 * Region toolbar for buttons
	 * @class Toolbar
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Toolbar = BB.Model.extend({
		defaults: {
			/**
			 * @attribute region
			 * @type String
			 * @default feeds
			 */
			region: 'feeds',

			/**
			 * @attribute position
			 * @type String
			 * @default top
			 */
			position: 'top',

			/**
			 * List of actions. Each action = one button/search on toolbar 
			 * @attribute actions
			 * @type Array
			 * @default []
			 */
			actions: [],

			/**
			 * @attribute firstRun
			 * @type Boolean
			 * @default true
			 */
			firstRun: true
		},

		/**
		 * @method initialize
		 */
		initialize: function() {
			if (!this.get('firstRun')) return;
			this.set({
				actions: db[this.id],
				firstRun: false
			});
		}
	});

	return Toolbar;
});