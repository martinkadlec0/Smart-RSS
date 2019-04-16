/**
 * @module App
 */
define([
        'controllers/comm',
        'layouts/Layout', 'collections/Actions', 'layouts/FeedsLayout', 'layouts/ArticlesLayout',
        'layouts/ContentLayout', 'staticdb/shortcuts', 'preps/extendNative'
    ],
    function (comm, Layout, Actions, FeedsLayout, ArticlesLayout, ContentLayout, shortcuts) {

        document.documentElement.style.fontSize = bg.settings.get('uiFontSize') + '%';

        document.addEventListener('contextmenu', function (event) {
            if (!event.target.matches('#region-content header, #region-content header *')) {
                event.preventDefault();
            }
        });

        const app = window.app = new (Layout.extend({
            el: 'body',
            fixURL: function (url) {
                return url.search(/[a-z]+:\/\//) === -1 ? 'https://' + url : url;
            },
            events: {
                'mousedown': 'handleMouseDown'
            },
            initialize: function () {
                this.actions = new Actions();

                window.addEventListener('blur', (event) => {
                    this.hideContextMenus();
                    if (event.target instanceof window.Window) {
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

            handleMouseDown: function (event) {
                if (!event.target.matches('.context-menu, .context-menu *')) {
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
            handleKeyDown: function (event) {
                const activeElement = document.activeElement;

                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    return;
                }

                let shortcut = '';
                if (event.ctrlKey) {
                    shortcut += 'ctrl+';
                }
                if (event.shiftKey) {
                    shortcut += 'shift+';
                }

                if (event.keyCode > 46 && event.keyCode < 91) {
                    shortcut += String.fromCharCode(event.keyCode).toLowerCase();
                } else if (event.keyCode in shortcuts.keys) {
                    shortcut += shortcuts.keys[event.keyCode];
                } else {
                    return;
                }

                const activeRegion = activeElement.closest('.region');
                const activeRegionName = activeRegion ? activeRegion.getAttribute('name') : null;

                if (activeRegionName && activeRegionName in shortcuts) {
                    if (shortcut in shortcuts[activeRegionName]) {
                        app.actions.execute(shortcuts[activeRegionName][shortcut], event);
                        event.preventDefault();
                        return false;
                    }
                }

                if (shortcut in shortcuts.global) {
                    app.actions.execute(shortcuts.global[shortcut], event);
                    event.preventDefault();
                    return false;
                }
            }
        }));

        document.addEventListener('keydown', app.handleKeyDown);

        return app;
    });