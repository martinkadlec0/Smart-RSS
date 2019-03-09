/**
 * @module App
 * @submodule layouts/ContentLayout
 */
define([
        'jquery', 'layouts/Layout', 'views/ToolbarView', 'views/contentView', 'views/SandboxView',
        'views/OverlayView', 'controllers/comm', 'domReady!'
    ],
    function ($, Layout, ToolbarView, contentView, SandboxView, OverlayView, comm) {

        var toolbar = bg.toolbars.findWhere({region: 'content'});

        /**
         * Content layout view
         * @class ContentLayout
         * @constructor
         * @extends Layout
         */
        var ContentLayout = Layout.extend({

            /**
             * View element
             * @property el
             * @default #region-content
             * @type HTMLElement
             */
            el: '#region-content',

            /**
             * @method initialize
             */
            initialize: function () {
                this.on('attach', function () {

                    this.attach('toolbar', new ToolbarView({model: toolbar}));
                    this.attach('content', contentView);
                    this.attach('sandbox', new SandboxView());
                    this.attach('overlay', new OverlayView());

                    this.listenTo(comm, 'hide-overlays', this.hideOverlay);
                });

                this.$el.on('focus', function () {
                    $(this).addClass('focused');
                    clearTimeout(blurTimeout);
                });

                let focus = true;
                let blurTimeout;

                comm.on('stop-blur', function () {
                    focus = false;
                });

                this.$el.on('blur', function (e) {
                    blurTimeout = setTimeout(function () {
                        if (focus && !e.relatedTarget) {
                            this.focus();
                            return;
                        }
                        $(this).removeClass('focused');
                        focus = true;
                    }.bind(this), 0);
                });

            },

            /**
             * Hides config overlay
             * @method hideOverlay
             */
            hideOverlay: function () {
                if (this.overlay.isVisible()) {
                    this.overlay.hide();
                }
            }

        });

        return ContentLayout;
    });