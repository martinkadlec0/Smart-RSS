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
            if (!event.target.matches('#content header, #content header *')) {
                event.preventDefault();
            }
        });

        chrome.runtime.onMessage.addListener(onMessage);

        function changeUserStyle() {
            const userStyle = bg.settings.get('userStyle');
            document.querySelector('[data-custom-style]').textContent = userStyle;
            const frame = document.querySelector('[name="sandbox"]');
            if (!frame) {
                return;
            }
            const customStyleTag = frame.contentDocument.querySelector('[data-custom-style]');
            if (!customStyleTag) {
                return;
            }
            customStyleTag.textContent = userStyle;
        }

        function onMessage(message) {
            if (message.action === 'changeUserStyle') {
                changeUserStyle();
            }
        }

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
                bg.sources.on('clear-events', this.handleClearEvents, this);
            },
            handleClearEvents: function (id) {
                if (window == null || id === tabID) {
                    bg.settings.off('change:layout', this.handleLayoutChange, this);
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
                document.querySelector('#second-pane').classList.add('vertical');
            },
            layoutToHorizontal: function () {
                document.querySelector('#second-pane').classList.remove('vertical');
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
                changeUserStyle();
                this.handleLayoutChange();
            },
            handleKeyDown: function (event) {
                const activeElement = document.activeElement;
                const hotkeys = bg.settings.get('hotkeys');

                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    return;
                }

                let shortcut = '';
                if (event.ctrlKey) {
                    shortcut += 'ctrl+';
                }
                if (event.altKey) {
                    shortcut += 'alt+';
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
                const activeRegionName = activeRegion ? activeRegion.id : null;

                if (activeRegionName && activeRegionName in hotkeys) {
                    if (shortcut in hotkeys[activeRegionName]) {
                        app.actions.execute(hotkeys[activeRegionName][shortcut], event);
                        event.preventDefault();
                        return false;
                    }
                }

                if (shortcut in hotkeys.global) {
                    app.actions.execute(hotkeys.global[shortcut], event);
                    event.preventDefault();
                    return false;
                }
            }
        }));
        if (typeof browser !== 'undefined') {
            window.addEventListener('unload', () => {
                bg.reloadExt();
            });
        }

        document.addEventListener('keydown', app.handleKeyDown);

        return app;
    });
