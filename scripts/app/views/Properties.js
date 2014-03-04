define([
	'backbone', 'jquery', 'underscore', 'text!templates/properties.html', 'modules/Locale'
],
function(BB, $, _, tplProperties, Locale) {

	var Properties = BB.View.extend({
		id: 'properties',
		current: null,
		template: _.template(Locale.translateHTML(tplProperties)),
		events: {
			'click button' : 'handleClick',
			'keydown button' : 'handleKeyDown',
			'click #advanced-switch' : 'handleSwitchClick',
		},
		handleClick: function(e) {
			var t = e.currentTarget;
			if (t.id == 'prop-cancel') {
				this.hide();
			} else if (t.id == 'prop-ok') {
				this.saveData();
			}
		},
		saveData: function() {
			if (!this.current) {
				this.hide();
				return;
			}

			var updateEvery, autoremove;

			if (this.current instanceof bg.Source) {
				this.current.save({
					title: $('#prop-title').val(),
					url: app.fixURL($('#prop-url').val()),
					username: $('#prop-username').val(),
					password: $('#prop-password').val(),
					updateEvery: parseFloat($('#prop-update-every').val()),
					autoremove: $('#prop-autoremove').val(),
				});
			} else if (this.current instanceof bg.Folder) {
				this.current.save({
					title: $('#prop-title').val()
				});

				var sourcesInFolder = bg.sources.where({ folderID: this.current.id });

				updateEvery = parseFloat($('#prop-update-every').val());
				if (updateEvery >= 0) {
					sourcesInFolder.forEach(function(source) {
						source.save({ updateEvery: updateEvery });
					});
				}

				autoremove = parseFloat($('#prop-autoremove').val());
				if (autoremove >= 0) {
					sourcesInFolder.forEach(function(source) {
						source.save({ autoremove: autoremove });
					});
				}
			} else if (Array.isArray(this.current)) {
				updateEvery = parseFloat($('#prop-update-every').val());
				if (updateEvery >= 0) {
					this.current.forEach(function(source) {
						source.save({ updateEvery: updateEvery });
					});
				}

				autoremove = parseFloat($('#prop-autoremove').val());
				if (autoremove >= 0) {
					this.current.forEach(function(source) {
						source.save({ autoremove: autoremove });
					});
				}
			}

			this.hide();

		},
		handleKeyDown: function(e) {
			if (e.keyCode == 13) {
				this.handleClick(e);
			}
		},
		render: function() {
			if (!this.current) return;

			if (this.current instanceof bg.Source) {
				this.$el.html(this.template(this.current.attributes));

				if (this.current.get('updateEvery')) {
					$('#prop-update-every').val(this.current.get('updateEvery'));
				}

				if (this.current.get('autoremove')) {
					$('#prop-autoremove').val(this.current.get('autoremove'));
				}
			} else {
				var isFolder = this.current instanceof bg.Folder;
				var listOfSources = isFolder ? bg.sources.where({ folderID: this.current.id }) : this.current;

				var params = { updateEveryDiffers: 0, autoremoveDiffers: 0, firstUpdate: 0, firstAutoremove: 0 };

				/**
				 * Test if all selected feeds has the same properteies or if tehy are mixed
				 */

				params.firstUpdate = listOfSources[0].get('updateEvery');
				params.updateEveryDiffers = listOfSources.some(function(c) {
					if (params.firstUpdate != c.get('updateEvery')) return true;
				});

				params.firstAutoremove = listOfSources[0].get('autoremove');
				params.autoremoveDiffers = listOfSources.some(function(c) {
					if (params.firstAutoremove != c.get('autoremove')) return true;
				});

				/**
				 * Create HTML
				 */

				if (isFolder) {
					this.$el.html(this.template( _.extend(params, this.current.attributes)  ));
				} else {
					this.$el.html(this.template( params ));
				}

				/**
				 * Set <select>s's values
				 */

				if (!params.updateEveryDiffers) $('#prop-update-every').val(params.firstUpdate);
				if (!params.autoremoveDiffers) $('#prop-autoremove').val(params.firstAutoremove);
			}

			return this;
		},
		show: function(source) {
			this.current = source;
			this.render();
			
			this.$el.css('display', 'block');
		},
		hide: function() {
			this.$el.css('display', 'none');
		},
		handleSwitchClick: function() {
			$('#properties-advanced').toggleClass('visible');
			$('#advanced-switch').toggleClass('switched');
		}
	});

	return Properties;
});