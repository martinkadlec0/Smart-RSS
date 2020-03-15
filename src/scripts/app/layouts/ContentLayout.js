/**
 * @module App
 * @submodule layouts/ContentLayout
 */
define([
        'layouts/Layout', 'views/ToolbarView', 'views/contentView', 'views/SandboxView'
    ],
    function (Layout, ToolbarView, contentView, SandboxView) {

        const toolbar = bg.toolbars.findWhere({region: 'content'});

        /**
         * Content layout view
         * @class ContentLayout
         * @constructor
         * @extends Layout
         */
        let ContentLayout = Layout.extend({

            /**
             * View element
             * @property el
             * @default #content
             * @type HTMLElement
             */
            el: '#content',

            /**
             * @method initialize
             */
            initialize: function () {
                this.on('attach', function () {

                    this.attach('toolbar', new ToolbarView({model: toolbar}));
                    this.attach('content', contentView);
                    this.attach('sandbox', new SandboxView());
                });

                // this.el.addEventListener('focus', (event) => {
                //     event.target.classList.add('focused');
                //     clearTimeout(blurTimeout);
                // });

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
                //             this.focus();
                //             return;
                //         }
                //         event.target.classList.remove('focused');
                //         focus = true;
                //     }, 0);
                // });

            }
        });

        return ContentLayout;
    });
