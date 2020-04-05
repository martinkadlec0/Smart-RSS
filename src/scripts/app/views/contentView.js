/**
 * @module App
 * @submodule views/contentView
 */
define([
        'backbone', '../../libs/template', 'helpers/formatDate', 'helpers/escapeHtml', 'helpers/stripTags', 'text!templates/download.html',
        'text!templates/header.html'
    ],
    function (BB, template, formatDate, escapeHtml, stripTags, tplDownload, tplHeader) {

        /**
         * Full view of one article (right column)
         * @class ContentView
         * @constructor
         * @extends Backbone.View
         */
        let ContentView = BB.View.extend({

            /**
             * Tag name of content view element
             * @property tagName
             * @default 'header'
             * @type String
             */
            tagName: 'header',

            /**
             * Content view template
             * @property template
             * @default ./templates/header.html
             * @type Function
             */
            template: template(tplHeader),

            /**
             * Template for downloading an article
             * @property downloadTemplate
             * @default ./templates/download.html
             * @type Function
             */
            downloadTemplate: template(tplDownload),


            events: {
                'mousedown': 'handleMouseDown',
                'click .pin-button': 'handlePinClick',
                'keydown': 'handleKeyDown'
            },

            /**
             * Changes pin state
             * @method handlePinClick
             * @triggered on click on pin button
             * @param event {MouseEvent}
             */
            handlePinClick: function (event) {
                const target = event.target;
                if (target.classList.contains('pinned')) {
                    target.classList.remove('pinned');
                } else {
                    target.classList.add('pinned');
                }
                this.model.save({
                    pinned: target.classList.contains('pinned')
                });
            },

            /**
             * Called when new instance is created
             * @method initialize
             */
            initialize: function () {

                this.on('attach', this.handleAttached);

                bg.items.on('change:pinned', this.handleItemsPin, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);
            },

            /**
             * Sets comm event listeners
             * @method handleAttached
             * @triggered when content view is attached to DOM
             */
            handleAttached: function () {
                app.on('select:article-list', function (data) {
                    this.handleNewSelected(bg.items.findWhere({id: data.value}));
                }, this);

                app.on('space-pressed', function () {
                    this.handleSpace();
                }, this);

                app.on('no-items:article-list', function () {
                    if (this.renderTimeout) {
                        clearTimeout(this.renderTimeout);
                    }
                    this.model = null;
                    this.hide();
                }, this);

            },

            /**
             * Next page in article or next unread article
             * @method handleSpace
             * @triggered when space is pressed in middle column
             */
            handleSpace: function () {
                const iframe = document.querySelector('iframe');
                const contentWindow = iframe.contentWindow;
                const doc = contentWindow.document;
                if (doc.documentElement.clientHeight + doc.body.scrollTop >= doc.body.offsetHeight) {
                    app.trigger('give-me-next');
                } else {
                    contentWindow.scrollBy(0, doc.documentElement.clientHeight * 0.85);
                }
            },

            /**
             * Unbinds all listeners to bg process
             * @method handleClearEvents
             * @triggered when tab is closed/refreshed
             * @param id {Number} id of the closed tab
             */
            handleClearEvents: function (id) {
                if (window == null || id === tabID) {
                    bg.items.off('change:pinned', this.handleItemsPin, this);
                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },

            /**
             * Sets the pin button state
             * @method handleItemsPin
             * @triggered when the pin state of the article is changed
             * @param model {Item} article that had its pin state changed
             */
            handleItemsPin: function (model) {
                if (model === this.model) {
                    const pinButton = this.el.querySelector('.pin-button');
                    if (this.model.get('pinned')) {
                        pinButton.classList.add('pinned');
                    } else {
                        pinButton.classList.remove('pinned');
                    }
                }
            },

            /**
             * Gets formatted date (according to settings) from given unix time
             * @method getFormattedDate
             * @param unixtime {Number}
             */
            getFormattedDate: function (unixtime) {
                const dateFormats = {normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY'};
                const pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

                const timeFormat = bg.settings.get('hoursFormat') === '12h' ? 'H:mm a' : 'hh:mm:ss';

                return formatDate(new Date(unixtime), pickedFormat + ' ' + timeFormat);
            },

            /**
             * Rendering of article is delayed with timeout for 50ms to speed up quick select changes in article list.
             * This property contains descriptor for that timeout.
             * @property renderTimeout
             * @default null
             * @type Number
             */
            renderTimeout: null,

            /**
             * Renders articles content asynchronously
             * @method render
             * @chainable
             */
            render: function () {
                clearTimeout(this.renderTimeout);

                this.renderTimeout = setTimeout(() => {

                    if (!this.model) {
                        return;
                    }
                    this.show();
                    const source = this.model.getSource();
                    const openEnclosure = source.get('openEnclosure');

                    const open = openEnclosure === 'yes' || openEnclosure === 'global' && bg.settings.get('openEnclosure') === 'yes';

                    const data = Object.create(this.model.attributes);
                    data.date = this.getFormattedDate(this.model.get('date'));
                    data.title = stripTags(data.title).trim() || '&lt;no title&gt;';
                    data.url = escapeHtml(data.url);
                    data.titleIsLink = bg.settings.get('titleIsLink');
                    data.open = open;


                    const content = this.model.get('content');

                    while (this.el.firstChild) {
                        this.el.removeChild(this.el.firstChild);
                    }

                    const fragment = document.createRange().createContextualFragment(this.template(data));
                    this.el.appendChild(fragment);

                    // first load might be too soon
                    const sandbox = app.content.sandbox;
                    const frame = sandbox.el;


                    frame.setAttribute('scrolling', 'no');

                    const resizeFrame = () => {
                            const scrollHeight = frame.contentDocument.body.scrollHeight;
                            frame.style.minHeight = '10px';
                            frame.style.minHeight = '70%';
                            frame.style.minHeight = `${scrollHeight}px`;

                            frame.style.height = '10px';
                            frame.style.height = '70%';
                            frame.style.height = `${scrollHeight}px`;
                    };

                    const loadContent = () => {

                        frame.contentWindow.scrollTo(0, 0);
                        document.querySelector('#content').scrollTo(0, 0);
                        frame.contentDocument.documentElement.style.fontSize = bg.settings.get('articleFontSize') + '%';
                        frame.contentDocument.querySelector('base').href = source.get('base') || source.get('url');

                        const contentElement = frame.contentDocument.querySelector('#smart-rss-content');
                        while (contentElement.firstChild) {
                            contentElement.removeChild(contentElement.firstChild);
                        }

                        const fragment = document.createRange().createContextualFragment(content);
                        contentElement.appendChild(fragment);


                        frame.contentDocument.querySelector('#smart-rss-url').href = this.model.get('url');

                        const clickHandler = (event) => {
                            if (event.target.matches('a')) {
                                event.stopPropagation();
                                const href = event.target.getAttribute('href');
                                if (!href || href[0] !== '#') {
                                    return true;
                                }
                                event.preventDefault();
                                const name = href.substring(1);
                                const nameElement = frame.contentDocument.querySelector('[name="' + name + ']"');
                                const idElement = frame.contentDocument.getElementById(name);
                                let element = null;
                                if (nameElement) {
                                    element = nameElement;
                                } else if (idElement) {
                                    element = idElement;
                                }
                                if (element) {
                                    const getOffset = function (el) {
                                        const box = el.getBoundingClientRect();

                                        return {
                                            top: box.top + frame.contentWindow.pageYOffset - frame.contentDocument.documentElement.clientTop,
                                            left: box.left + frame.contentWindow.pageXOffset - frame.contentDocument.documentElement.clientLeft
                                        };
                                    };

                                    const offset = getOffset(element);
                                    frame.contentWindow.scrollTo(offset.left, offset.top);
                                }

                                return false;
                            }
                        };

                        frame.contentDocument.removeEventListener('click', clickHandler);
                        frame.contentDocument.addEventListener('click', clickHandler);

                        frame.contentDocument.removeEventListener('load', resizeFrame);
                        frame.contentDocument.addEventListener('load', resizeFrame);

                        [...frame.contentDocument.querySelectorAll('img, picture, iframe, video, audio')].forEach((img) => {
                            img.onload = resizeFrame;
                        });

                        resizeFrame();
                    };


                    if (sandbox.loaded) {
                        loadContent();
                    } else {
                        sandbox.on('load', loadContent);
                    }
                }, 50);

                return this;
            },

            /**
             * Replaces old article model with newly selected one
             * @method handleNewSelected
             * @param model {Item} The new article model
             */
            handleNewSelected: function (model) {
                if (model === this.model) {
                    return;
                }
                this.model = model;
                if (!this.model) {
                    // should not happen but happens
                    this.hide();
                } else {
                    this.render();
                }
            },

            /**
             * Hides contents (header, iframe)
             * @method hide
             */
            hide: function () {
                [...document.querySelectorAll('header,iframe')].forEach((element) => {
                    element.hidden = true;
                });
            },

            /**
             * Show contents (header, iframe)
             * @method hide
             */
            show: function () {
                [...document.querySelectorAll('header,iframe')].forEach((element) => {
                    element.hidden = false;
                });
            }
        });

        return new ContentView();
    });
