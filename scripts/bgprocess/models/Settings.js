/**
 * @module BgProcess
 * @submodule models/Settings
 */
define(['backbone', 'preps/indexeddb'], function (BB) {

	/**
	 * User settings
	 * @class Settings
	 * @constructor
	 * @extends Backbone.Model
	 */
	var Settings = BB.Model.extend({
		defaults: {
			id: 'settings-id',
			lang: 'en', // or cs,sk,tr,de
			dateType: 'normal', // normal = DD.MM.YYYY, ISO = YYYY-MM-DD, US = MM/DD/YYYY
			layout: 'horizontal', // or vertical
			lines: 'auto', // one-line, two-lines
			posA: '250,*',
			posB: '350,*',
			posC: '50%,*',
			sortOrder: 'desc',
			icon: 'orange',
			readOnVisit: false,
			askOnOpening: true,
			panelToggled: true,
			enablePanelToggle: false,
			fullDate: false,
			hoursFormat: '24h',
			articleFontSize: '100',
			uiFontSize: '100',
			disableDateGroups: false,
			thickFrameBorders: false,
			badgeMode: 'disabled',
			circularNavigation: true,
			sortBy: 'date',
			askRmPinned: true
		},

		/**
		 * @property localStorage
		 * @type Backbone.LocalStorage
		 * @default *settings-backbone*
		 */
		localStorage: new Backbone.LocalStorage('settings-backbone')
	});

	return Settings;
});