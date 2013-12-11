/**
 * @module App
 * @submodule views/LogView
 */
define([
	'backbone', 'underscore', 'jquery', 'helpers/formatDate'
], function(BB, _, $, formatDate) {

	/**
	 * View in bottom right corner used for bgprocess error logs and integration tests
	 * @class LogView
	 * @constructor
	 * @extends Backbone.View
	 */
	var LogView = BB.View.extend({

		/**
		 * Tag name of the view
		 * @property tagName
		 * @default 'footer'
		 * @type String
		 */
		tagName: 'footer',
		events: {
			'click #button-hide-log': 'hide'
		},

		/**
		 * Initializations of events and template.
		 * Underscore template function has to be created in constructor as the HTML is not yet avalable on Protoype creation.
		 * @method initialize
		 */
		initialize: function() {
			this.template = _.template($('#template-log').html());
			this.$el.html(this.template({}));

			bg.logs.on('add', this.addItem, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},

		/**
		 * If the tab is closed, it will remove all events binded to bgprocess
		 * @method handleClearEvents
		 * @triggered when bgprocesses triggers clear-events event
		 * @param id {Number} ID of closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				bg.logs.off('add', this.addItem, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},

		/**
		 * Adds DOM element for the newly added model
		 * @method addItem
		 * @triggered when new model is added to log collection
		 * @param model {Backbone.Model}
		 */
		addItem: function(model) {
			this.show();
			$('<div class="log">' + formatDate(new Date, 'hh:mm:ss') + ': ' + model.get('message') + '</div>').insertAfter(this.$el.find('#button-hide-log'));
		},

		/**
		 * Show the Log view element (display: block)
		 * @method show
		 */
		show: function() {
			this.$el.css('display', 'block');
		},

		/**
		 * Hide the Log view element (display: none)
		 * @method hide
		 */
		hide: function() {
			this.$el.css('display', 'none');
		}
	});

	return LogView;
});