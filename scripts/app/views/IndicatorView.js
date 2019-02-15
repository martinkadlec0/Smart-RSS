/**
 * @module App
 * @submodule views/IndicatorView
 */
define(['backbone', 'modules/Locale', 'text!templates/indicator.html'], function (BB, Locale, tplIndicator) {

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

        events: {
            'click #indicator-stop': 'handleButtonStop'
        },

        /**
         * @method initialize
         */
        initialize: function () {
            this.$el.html(tplIndicator);
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
        handleClearEvents: function (id) {
            if (window == null || id === tabID) {
                bg.loader.off('change:loading', this.handleLoadingChange, this);
                bg.loader.off('change:loaded', this.render, this);
                bg.loader.off('change:maxSources', this.render, this);
                bg.sources.off('clear-events', this.handleClearEvents, this);
            }
        },

        /**
         * Stops updating feeds
         * @method handleButtonStop
         * @triggered when user clicks on stop button
         */
        handleButtonStop: function () {
            app.actions.execute('feeds:stopUpdate');
        },

        /**
         * Hides/shows indicator according to loading flag
         * @method handleLoadingChange
         */
        handleLoadingChange: function () {
            var that = this;
            if (bg.loader.get('loading') === true) {
                this.render();
                this.$el.addClass('indicator-visible');
            } else {
                setTimeout(function () {
                    that.$el.removeClass('indicator-visible');
                }, 500);
            }
        },

        /**
         * Renders the indicator (gradient/text)
         * @method render
         * @chainable
         */
        render: function () {
            var l = bg.loader;
            if (l.get('maxSources') === 0) return;
            var perc = Math.round(l.get('loaded') * 100 / l.get('maxSources'));
            this.$el.find('#indicator-progress').css('background', 'linear-gradient(to right,  #c5c5c5 ' + perc + '%, #eee ' + perc + '%)');
            this.$el.find('#indicator-progress').html(Locale.c.UPDATING_FEEDS + ' (' + l.get('loaded') + '/' + l.get('maxSources') + ')');
            return this;
        }
    });

    return IndicatorView;
});