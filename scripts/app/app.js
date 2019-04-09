/**
 * @module App
 */
define([
        'controllers/comm',
        'layouts/Layout', 'collections/Actions', 'layouts/FeedsLayout', 'layouts/ArticlesLayout',
        'layouts/ContentLayout', 'staticdb/shortcuts'
    ],
    function (comm, Layout, Actions, FeedsLayout, ArticlesLayout, ContentLayout, shortcuts) {

        document.documentElement.style.fontSize = bg.settings.get('uiFontSize') + '%';

        document.addEventListener('contextmenu', function (e) {
            if (!e.target.matches('#region-content header, #region-content header *')) {
                e.preventDefault();
            }
        });

        const app = window.app = new (Layout.extend({
            el: 'body',
            fixURL: function (url) {
                if (url.search(/[a-z]+:\/\//) === -1) {
                    url = 'http://' + url;
                }
                return url;
            },
            events: {
                'mousedown': 'handleMouseDown'
            },
            initialize: function () {
                this.actions = new Actions();

                window.addEventListener('blur', (e) => {
                    this.hideContextMenus();
                    if (e.target instanceof window.Window) {
                        comm.trigger('stop-blur');
                    }
                });

                bg.settings.on('change:layout', this.handleLayoutChange, this);
                bg.settings.on('change:panelToggled', this.handleToggleChange, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);

            },
            handleClearEvents: function (id) {
                if (window == null || id === tabID) {
                    bg.settings.off('change:layout', this.handleLayoutChange, this);
                    bg.settings.off('change:panelToggled', this.handleToggleChange, this);
                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },
            handleLayoutChange: function () {
                if (bg.settings.get('layout') === 'vertical') {
                    this.layoutToVertical();
                    this.articles.enableResizing(bg.settings.get('layout'), bg.settings.get('posC'));
                } else {
                    this.layoutToHorizontal();
                    this.articles.enableResizing(bg.settings.get('layout'), bg.settings.get('posB'));
                }
            },
            layoutToVertical: function () {
                document.querySelector('.subregions').classList.add('vertical');
            },
            layoutToHorizontal: function () {
                document.querySelector('.subregions').classList.remove('vertical');
            },

            handleMouseDown: function (e) {
                if (!e.target.matches('.context-menu, .context-menu *')) {
                    this.hideContextMenus();
                }
            },
            hideContextMenus: function () {
                comm.trigger('hide-overlays', {blur: true});
            },
            start: function () {
                this.attach('feeds', new FeedsLayout);
                this.attach('articles', new ArticlesLayout);
                this.attach('content', new ContentLayout);

                this.feeds.enableResizing('horizontal', bg.settings.get('posA'));
                this.articles.enableResizing('horizontal', bg.settings.get('posB'));

                this.trigger('start');
                this.trigger('start:after');
            },
            handleKeyDown: function (e) {
                let activeElement = document.activeElement;

                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    return;
                }

                let shortcut = '';
                if (e.ctrlKey) {
                    shortcut += 'ctrl+';
                }
                if (e.shiftKey) {
                    shortcut += 'shift+';
                }

                if (e.keyCode > 46 && e.keyCode < 91) {
                    shortcut += String.fromCharCode(e.keyCode).toLowerCase();
                } else if (e.keyCode in shortcuts.keys) {
                    shortcut += shortcuts.keys[e.keyCode];
                } else {
                    return;
                }

                const activeRegion = activeElement.parentNode.parentNode;
                const activeRegionName = activeRegion.getAttribute('name');
                if (activeRegionName && activeRegionName in shortcuts) {
                    if (shortcut in shortcuts[activeRegionName]) {
                        app.actions.execute(shortcuts[activeRegionName][shortcut], e);
                        e.preventDefault();
                        return false;
                    }
                }

                if (shortcut in shortcuts.global) {
                    app.actions.execute(shortcuts.global[shortcut], e);
                    e.preventDefault();
                    return false;
                }
            }
        }));

        document.addEventListener('keydown', app.handleKeyDown);

        return app;
    });