/**
 * @module BgProcess
 * @submodule collections/Logs
 */
define(['backbone', 'models/Log'], function (BB, Log) {

	/**
	 * Collection of error log modules
	 * @class Logs
	 * @constructor
	 * @extends Backbone.Collection
	 */
	var Logs = Backbone.Collection.extend({
		model: Log,
		initialze: function() {
			var that = this;
		},
		startLogging: function() {
			window.onerror = function(a, b, c) {
				var file = b.replace(/chrome\-extension:\/\/[^\/]+\//, '');
				var msg = a.toString() + ' (Line: ' + c.toString() + ', File: ' + file + ')';
				logs.add({
					message: msg
				});
			};
		}
	});


	return Logs;

});