define([
        'backbone', '../../libs/template', 'text!templates/properties.html', 'modules/Locale'
    ],
    function (BB, template, tplProperties, Locale) {

        return BB.View.extend({
            id: 'properties',
            current: null,
            template: template(Locale.translateHTML(tplProperties)),
            events: {
                'click button': 'handleClick',
                'keydown button': 'handleKeyDown'
            },
            handleClick: function (event) {
                const target = event.currentTarget;
                if (target.id === 'prop-cancel') {
                    this.hide();
                } else if (target.id === 'prop-ok') {
                    this.saveData();
                }
            },
            saveData: function () {
                if (!this.current) {
                    this.hide();
                    return;
                }

                const updateEvery = parseInt(document.querySelector('#prop-update-every').value);
                const autoremove = parseInt(document.querySelector('#prop-autoremove').value);

                if (this.current instanceof bg.Source) {
                    /* encrypt the password */
                    this.current.setPass(document.querySelector('#prop-password').value);

                    this.current.save({
                        title: document.querySelector('#prop-title').value,
                        url: app.fixURL(document.querySelector('#prop-url').value),
                        username: document.querySelector('#prop-username').value,
                        updateEvery: parseInt(document.querySelector('#prop-update-every').value),
                        autoremove: parseInt(document.querySelector('#prop-autoremove').value),
                        proxyThroughFeedly: document.querySelector('#prop-proxy').checked
                    });
                } else {
                    let iterator = [];
                    if (this.current instanceof bg.Folder) {
                        iterator = bg.sources.where({folderID: this.current.id});
                        this.current.save({
                            title: document.querySelector('#prop-title').value
                        });
                    } else if (Array.isArray(this.current)) {
                        iterator = this.current;
                    }
                    if (updateEvery >= -1) {
                        iterator.forEach(function (source) {
                            source.save({updateEvery: updateEvery});
                        });
                    }
                    if (autoremove >= -1) {
                        iterator.forEach(function (source) {
                            source.save({autoremove: autoremove});
                        });
                    }
                }
                this.hide();

            },
            handleKeyDown: function (e) {
                if (e.keyCode === 13) {
                    this.handleClick(e);
                }
            },
            render: function () {
                if (!this.current) {
                    return;
                }

                if (this.current instanceof bg.Source) {
                    /* decrypt password */
                    const properties = this.current.toJSON();
                    properties.password = this.current.getPass();

                    this.$el.html(this.template(properties));

                    if (this.current.get('updateEvery')) {
                        document.querySelector('#prop-update-every').value = this.current.get('updateEvery');
                    }

                    if (this.current.get('autoremove')) {
                        document.querySelector('#prop-autoremove').value = this.current.get('autoremove');
                    }
                    if (this.current.get('proxyThroughFeedly')) {
                        document.querySelector('#prop-proxy').checked = true;
                    }
                } else {
                    const isFolder = this.current instanceof bg.Folder;
                    const listOfSources = isFolder ? bg.sources.where({folderID: this.current.id}) : this.current;

                    const params = {updateEveryDiffers: 0, autoremoveDiffers: 0, firstUpdate: 0, firstAutoremove: 0};

                    /**
                     * Test if all selected feeds has the same properteies or if tehy are mixed
                     */

                    if (listOfSources.length) {
                        params.firstUpdate = listOfSources[0].get('updateEvery');
                        params.updateEveryDiffers = listOfSources.some(function (c) {
                            if (params.firstUpdate !== c.get('updateEvery')) {
                                return true;
                            }
                        });

                        params.firstAutoremove = listOfSources[0].get('autoremove');
                        params.autoremoveDiffers = listOfSources.some(function (c) {
                            if (params.firstAutoremove !== c.get('autoremove')) {
                                return true;
                            }
                        });
                    }

                    /**
                     * Create HTML
                     */

                    if (isFolder) {
                        this.el.innerHTML = this.template(Object.assign(params, this.current.attributes));
                    } else {
                        this.el.innerHTML = this.template(params);
                    }

                    /**
                     * Set <select>s's values
                     */

                    if (!params.autoremoveDiffers) {
                        document.querySelector('#prop-autoremove').value = params.firstAutoremove;
                    }
                    if (!params.updateEveryDiffers) {
                        document.querySelector('#prop-update-every').value = params.firstUpdate;
                    }
                }

                return this;
            },
            show: function (source) {
                this.current = source;
                this.render();

                this.el.style.display = 'block';
            },
            hide: function () {
                this.el.style.display = 'none';
            }
        });
    });