/**
 * @module BgProcess
 * @submodule models/Log
 */
define(['backbone'], function (BB) {

	/**
	 * Error log model
	 * @class Log
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Log = BB.Model.extend({
		defaults: {
			message: '<no message>'
		}
	});

	return Log;

});