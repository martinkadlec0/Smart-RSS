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
            const fragment = document.createRange().createContextualFragment(tplIndicator);
            this.el.appendChild(fragment);

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
            if (bg.loader.get('loading') === true) {
                this.render();
                this.el.classList.add('indicator-visible');
            } else {
                setTimeout(() => {
                    this.el.classList.remove('indicator-visible');
                }, 500);
            }
        },

        /**
         * Renders the indicator (gradient/text)
         * @method render
         * @chainable
         */
        render: function () {
            const loader = bg.loader;
            if (loader.get('maxSources') === 0) {
                return;
            }
            const percentage = Math.round(loader.get('loaded') * 100 / loader.get('maxSources'));
            this.el.querySelector('#indicator-progress').style.background = 'linear-gradient(to right,  #c5c5c5 ' + percentage + '%, #eee ' + percentage + '%)';
            this.el.querySelector('#indicator-progress').textContent = Locale.UPDATING_FEEDS + ' (' + loader.get('loaded') + '/' + loader.get('maxSources') + ')';
            return this;
        }
    });

    return IndicatorView;
});