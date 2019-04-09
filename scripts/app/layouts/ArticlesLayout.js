/**
 * @module App
 * @submodule layouts/ArticlesLayout
 */
define([
        'jquery', 'layouts/Layout', 'views/ToolbarView', 'views/articleList',
        'mixins/resizable', 'controllers/comm'
    ],
    function ($, Layout, ToolbarView, articleList, resizable, comm) {

        var toolbar = bg.toolbars.findWhere({region: 'articles'});

        /**
         * Articles layout view
         * @class ArticlesLayout
         * @constructor
         * @extends Layout
         */
        var ArticlesLayout = Layout.extend({
            el: '#region-articles',
            events: {
                'keydown': 'handleKeyDown',
                'mousedown': 'handleMouseDown'
            },
            initialize: function () {
                this.el.view = this;

                this.on('attach', function () {
                    this.attach('toolbar', new ToolbarView({model: toolbar}));
                    this.attach('articleList', articleList);
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


                this.on('resize:after', this.handleResizeAfter);
            },

            /**
             * Saves the new layout size
             * @triggered after resize
             * @method handleResizeAfter
             */
            handleResizeAfter: function () {

                if (bg.settings.get('layout') === 'horizontal') {
                    const width = this.el.offsetWidth;
                    bg.settings.save({posB: width});
                } else {
                    const height = this.el.offsetHeight;
                    bg.settings.save({posC: height});
                }
            }
        });

        ArticlesLayout = ArticlesLayout.extend(resizable);

        return ArticlesLayout;
    });