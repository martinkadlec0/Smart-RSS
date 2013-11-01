/**
 * @module App
 * @submodule views/IndicatorView
 */
define(['backbone'], function(BB) {

	/**
	 * Feeds update indicator view
	 * @class IndicatorView
	 * @constructor
	 * @extends Backbone.View
	 */
	var IndicatorView = BB.View.extend({
		/**
		 * Indicator element id
		 * @property id
		 * @default indicator
		 */
		id: 'indicator',

		/**
		 * @method initialize
		 */
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.render, this);
			bg.loader.on('change:maxSources', this.render, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);

			this.handleLoadingChange();
		},

		/**
		 * Clears bg events it listens to
		 * @method handleClearEvents
		 * @param id {Integer} ID of the closed tab
		 */
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				bg.loader.off('change:loading', this.handleLoadingChange, this);
				bg.loader.off('change:loaded', this.render, this);
				bg.loader.off('change:maxSources', this.render, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},

		/**
		 * Hides/shows indicator according to loading flag
		 * @method handleLoadingChange
		 */
		handleLoadingChange: function() {
			var that = this;
			if (bg.loader.get('loading') == true) {
				this.render();
				this.$el.css('display', 'block');
			} else {
				setTimeout(function() {
					that.$el.css('display', 'none');
				}, 500);
			}
		},

		/**
		 * Renders the indicator (gradient/text)
		 * @method render
		 * @chainable
		 */
		render: function() {
			var l = bg.loader;
			if (l.get('maxSources') == 0) return;
			var perc = Math.round(l.get('loaded') * 100 / l.get('maxSources'));
			this.$el.css('background', 'linear-gradient(to right,  #c5c5c5 ' + perc + '%, #eee ' + perc + '%)');
			this.$el.html(bg.lang.c.UPDATING_FEEDS + ' (' + l.get('loaded') + '/' + l.get('maxSources') + ')');
			return this;
		}
	});

	return IndicatorView;
});