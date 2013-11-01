define(['backbone', 'jquery', 'underscore'], function(BB, $, _) {

	var Properties = BB.View.extend({
		id: 'properties',
		current: null,
		events: {
			'click button' : 'handleClick',
			'keydown button' : 'handleKeyDown',
			'click #advanced-switch' : 'handleSwitchClick',
		},
		initialize: function() {
			this.template = _.template($('#template-properties').html());
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

			var updateEvery;

			if (this.current instanceof bg.Source) {
				this.current.save({
					title: $('#prop-title').val(),
					url: app.fixURL($('#prop-url').val()),
					username: $('#prop-username').val(),
					password: $('#prop-password').val(),
					updateEvery: parseFloat($('#prop-update-every').val())
				});
			} else if (this.current instanceof bg.Folder) {
				this.current.save({
					title: $('#prop-title').val()
				});

				updateEvery = parseFloat($('#prop-update-every').val());
				if (updateEvery >= 0) {
					bg.sources.where({ folderID: this.current.id }).forEach(function(source) {
						source.save({ updateEvery: updateEvery });
					});
				}
			} else if (Array.isArray(this.current)) {
				updateEvery = parseFloat($('#prop-update-every').val());
				if (updateEvery >= 0) {
					this.current.forEach(function(source) {
						source.save({ updateEvery: updateEvery });
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
			} else {
				var isFolder = this.current instanceof bg.Folder;
				var arr = isFolder ? bg.sources.where({ folderID: this.current.id }) : this.current;

				var firstUpdate = arr[0].get('updateEvery');
				var someDiffer = arr.some(function(c) {
					if (firstUpdate != c.get('updateEvery')) return true;
				});

				if (someDiffer) {
					this.$el.html(this.template( isFolder ? _.extend({ mixed: 1 }, this.current.attributes) : { mixed: 1 } ));
				} else {
					this.$el.html(this.template( isFolder ? this.current.attributes : {} ));
					$('#prop-update-every').val(firstUpdate);
				}
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