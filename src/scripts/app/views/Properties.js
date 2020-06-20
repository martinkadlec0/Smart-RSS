define([
        'backbone', 'modules/Locale'
    ],
    function (BB, Locale) {

        return BB.View.extend({
            id: 'properties',
            current: null,
            template: Locale.translateHTML(`
<label id="property-title-label">
  {{NAME}}:
  <input id="prop-title" placeholder="{{FETCH_TITLE_TIP}}" title="{{FETCH_TITLE_TIP}}" type="text" value=""/>
</label>

<label id="property-title-address">{{ADDRESS}}: <input id="prop-url" type="url" value=""/></label>

<label>{{UPDATE}}: <select id="prop-update-every">
  <option value="-1">Use global setting</option>
  <option value="0">{{NEVER}}</option>
  <option value="5">{{EVERY_5_MINUTES}}</option>
  <option value="15">{{EVERY_15_MINUTES}}</option>
  <option value="30">{{EVERY_30_MINUTES}}</option>
  <option value="60">{{EVERY_HOUR}}</option>
  <option value="120">{{EVERY_2_HOURS}}</option>
  <option value="180">{{EVERY_3_HOURS}}</option>
  <option value="300">{{EVERY_5_HOURS}}</option>
  <option value="600">{{EVERY_10_HOURS}}</option>
  <option value="1440">{{EVERY_24_HOURS}}</option>
  <option value="10080">{{EVERY_WEEK}}</option>
</select></label>


<label>{{PARENT}}: <select id="prop-parent">
  <option value="0">{{ROOT_FOLDER}}</option>
</select></label>


<label>{{AUTOREMOVE}}: <select id="prop-autoremove">
  <option value="0">{{NEVER}}</option>
  <option value="1">{{OLDER_THAN_DAY}}</option>
  <option value="7">{{OLDER_THAN_WEEK}}</option>
  <option value="30">{{OLDER_THAN_MONTH}}</option>
  <option value="60">{{OLDER_THAN_TWO_MONTHS}}</option>
</select></label>

<button id="prop-ok">{{OK}}</button>
<button id="prop-cancel">{{CANCEL}}</button>
`),
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
                const autoRemove = parseInt(document.querySelector('#prop-autoremove').value);
                const folderId = document.querySelector('#prop-parent').value;

                if (this.current instanceof bg.Source) {
                    /* encrypt the password */
                    this.current.setPass(document.querySelector('#prop-password').value);

                    this.current.save({
                        title: document.querySelector('#prop-title').value,
                        url: app.fixURL(document.querySelector('#prop-url').value),
                        username: document.querySelector('#prop-username').value,
                        folderID: folderId,
                        updateEvery: updateEvery,
                        autoremove: autoRemove,
                        proxyThroughFeedly: document.querySelector('#prop-proxy').checked,
                        openEnclosure: document.querySelector('#openEnclosure').value,
                    });
                    if (folderId === '0') {
                        this.current.unset('folderID');
                    }
                    // this.render();
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
                    if (autoRemove >= -1) {
                        iterator.forEach(function (source) {
                            source.save({autoremove: autoRemove});
                        });
                    }

                    if (folderId >= 0) {
                        iterator.forEach(function (source) {
                            if (folderId === '0') {
                                source.unset('folderID');
                            } else {
                                source.save({folderID: folderId});
                            }
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
            initialize: function () {
                this.el.hidden = true;
            },
            renderSource: function () {
                /* decrypt password */
                const properties = this.current.toJSON();
                properties.password = this.current.getPass();

                const fragment = document.createRange().createContextualFragment(this.template);

                fragment.querySelector('#property-title-label input').value = properties.title;
                fragment.querySelector('#property-title-address input').value = properties.url;
                const details = document.createRange().createContextualFragment(Locale.translateHTML(`<details>
  <summary>{{MORE}}</summary>
  <label>{{USERNAME}}: <input id="prop-username" type="text" value=""/></label>
  <label>{{PASSWORD}}: <input id="prop-password" type="password" value=""/></label>

  <label>Proxy: <input id="prop-proxy" type="checkbox" value=""/></label>
  <label>Open media preview: <select id="openEnclosure">
    <option value="global">Use global setting</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select></label>
</details>`));
                details.querySelector('#prop-username').value = properties.username;
                details.querySelector('#prop-password').value = properties.password;
                details.querySelector('#prop-proxy').value = properties.proxyThroughFeedly;

                fragment.insertBefore(details, fragment.querySelector('button'));

                this.el.appendChild(fragment);

                let folders = bg.folders;
                let parentSelect = document.querySelector('#prop-parent');
                folders.forEach((folder) => {
                    const option = document.createElement('option');
                    option.textContent = folder.get('title');
                    option.setAttribute('value', folder.get('id'));
                    if (folder.get('id') === this.current.get('folderID')) {
                        option.setAttribute('selected', '');
                    }
                    parentSelect.insertAdjacentElement('beforeend', option);
                });

                if (this.current.get('updateEvery')) {
                    document.querySelector('#prop-update-every').value = this.current.get('updateEvery');
                }

                if (this.current.get('autoremove')) {
                    document.querySelector('#prop-autoremove').value = this.current.get('autoremove');
                }

                if (this.current.get('openEnclosure')) {
                    document.querySelector('#openEnclosure').value = this.current.get('openEnclosure');
                }

                if (this.current.get('proxyThroughFeedly')) {
                    document.querySelector('#prop-proxy').checked = true;
                }
            },
            renderGroup: function () {
                const isFolder = this.current instanceof bg.Folder;
                const listOfSources = isFolder ? bg.sources.where({folderID: this.current.id}) : this.current;

                const params = {
                    updateEveryDiffers: false,
                    autoremoveDiffers: false,
                    folderIdDiffers: false,
                    firstUpdate: listOfSources[0].get('updateEvery'),
                    firstAutoremove: listOfSources[0].get('autoremove'),
                    firstFolderId: listOfSources[0].get('folderID'),
                };


                const properties = isFolder ? Object.assign(params, this.current.attributes) : params;

                /**
                 * Test if all selected feeds has the same properties or if they are mixed
                 */
                if (!isFolder) {
                    params.updateEveryDiffers = listOfSources.some(function (c) {
                        if (params.firstUpdate !== c.get('updateEvery')) {
                            return true;
                        }
                    });

                    params.autoremoveDiffers = listOfSources.some(function (c) {
                        if (params.firstAutoremove !== c.get('autoremove')) {
                            return true;
                        }
                    });

                    params.folderIdDiffers = listOfSources.some(function (c) {
                        if (params.firstFolderId !== c.get('folderID')) {
                            return true;
                        }
                    });
                }

                /**
                 * Create HTML
                 */
                const fragment = document.createRange().createContextualFragment(this.template);

                const labelTitle = fragment.querySelector('#property-title-label');
                if (properties.title) {
                    labelTitle.querySelector('input').value = properties.title;
                } else {
                    fragment.removeChild(labelTitle);
                }
                const labelUrl = fragment.querySelector('#property-title-address');
                if (properties.url) {
                    labelUrl.querySelector('input').value = properties.url;
                } else {
                    fragment.removeChild(labelUrl);
                }


                const folders = bg.folders;
                const parentSelect = fragment.querySelector('#prop-parent');
                folders.forEach((folder) => {
                    const option = document.createElement('option');
                    option.textContent = folder.get('title');
                    option.setAttribute('value', folder.get('id'));
                    parentSelect.insertAdjacentElement('beforeend', option);
                });

                this.el.appendChild(fragment);


                const elementUpdateEvery = document.querySelector('#prop-update-every');
                if (properties.updateEveryDiffers) {
                    const option = document.createRange().createContextualFragment(`<option value="-2">&lt;mixed&gt;</option>`);
                    elementUpdateEvery.prepend(option);
                    elementUpdateEvery.value = -2;
                } else {
                    elementUpdateEvery.value = params.firstUpdate;
                }

                const elementParent = document.querySelector('#prop-parent');
                if (properties.folderIdDiffers) {
                    const option = document.createRange().createContextualFragment(`<option value="-2">&lt;mixed&gt;</option>`);
                    elementParent.prepend(option);
                    elementParent.value = -2;
                } else {
                    elementParent.value = params.firstFolderId;
                }

                const elementAutoremove = document.querySelector('#prop-autoremove');
                if (properties.autoremoveDiffers) {
                    const option = document.createRange().createContextualFragment(`<option value="-2">&lt;mixed&gt;</option>`);
                    elementAutoremove.prepend(option);
                    elementAutoremove.value = -2;
                } else {
                    elementAutoremove.value = params.firstAutoremove;
                }
            },

            render: function () {
                if (!this.current) {
                    return;
                }
                while (this.el.firstChild) {
                    this.el.removeChild(this.el.firstChild);
                }

                if (this.current instanceof bg.Source) {
                    this.renderSource();
                } else {
                    this.renderGroup();
                }
                return this;
            },
            show: function (source) {
                this.current = source;
                this.render();

                this.el.hidden = false;
            },
            hide: function () {
                this.el.hidden = true;
            }
        });
    });
