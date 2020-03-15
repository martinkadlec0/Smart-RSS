/**
 * @module App
 * @submodule layouts/FeedsLayout
 */
define([
        'layouts/Layout', 'views/ToolbarView', 'views/feedList',
        'instances/contextMenus', 'views/Properties', 'mixins/resizable', 'views/IndicatorView'
    ],
    function (Layout, ToolbarView, feedList, contextMenus, Properties, resizable, IndicatorView) {

        const toolbar = bg.toolbars.findWhere({region: 'feeds'});

        /**
         * Feeds layout view
         * @class FeedsLayout
         * @constructor
         * @extends Layout
         */
        let FeedsLayout = Layout.extend({
            /**
             * View element
             * @property el
             * @default #feeds
             * @type HTMLElement
             */
            el: '#feeds',

            /**
             * @method initialize
             */
            initialize: function () {

                this.on('attach', function () {
                    this.attach('toolbar', new ToolbarView({model: toolbar}));
                    this.attach('properties', new Properties);
                    this.attach('feedList', feedList);
                    this.attach('indicator', new IndicatorView);
                });

                this.el.view = this;

                // this.el.addEventListener('focus', (event) => {
                //     event.target.classList.add('focused');
                //     clearTimeout(blurTimeout);
                // });
                //
                // let focus = true;
                // let blurTimeout;
                //
                // comm.on('stop-blur', function () {
                //     focus = false;
                // });
                //
                // this.el.addEventListener('blur', (event) => {
                //     blurTimeout = setTimeout(() => {
                //         if (focus && !event.relatedTarget) {
                //             return;
                //         }
                //         event.target.classList.remove('focused');
                //         focus = true;
                //     }, 0);
                // });

                this.on('resize:after', this.handleResize);
                //window.addEventListener('resize', this.handleResize.bind(this));

                this.enableResizing('horizontal', bg.settings.get('posA'));
            },

            /**
             * Saves layout size
             * @method handleResize
             */
            handleResize: function () {
                if (bg.settings.get('panelToggled')) {
                    const width = this.el.offsetWidth;
                    bg.settings.save({posA: width});
                }
            }
        });

        FeedsLayout = FeedsLayout.extend(resizable);

        return FeedsLayout;
    });
