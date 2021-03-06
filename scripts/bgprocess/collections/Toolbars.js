/**
 * @module BgProcess
 * @submodule collections/Toolbars
 */
define([
	'backbone', 'models/Toolbar', 'staticdb/defaultToolbarItems', 'preps/indexeddb'
],
function (BB, Toolbar, defaultToolbarItems) {

	function getDataByRegion(data, region) {
		if (!Array.isArray(data)) return null;

		for (var i=0; i<data.length; i++) {
			if (typeof data[i] != 'object') continue;
			if (data[i].region == region) return data[i];
		}

		return null;
	}

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
			if (!data.length) return defaultToolbarItems;

			parsedData = defaultToolbarItems;
			if (!Array.isArray(parsedData)) return [];

			for (var i=0; i<parsedData.length; i++) {

				var fromdb = getDataByRegion(data, parsedData[i].region);
				if (!fromdb || typeof fromdb != 'object') continue;

				if (fromdb.version && fromdb.version >= parsedData[i].version) {
					parsedData[i] = fromdb;
				}
			}
			
			return parsedData;
		}
	});

	return Toolbars;

});