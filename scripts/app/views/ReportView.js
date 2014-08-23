define([
	'backbone', 'underscore', 'jquery', 'text!templates/report.html', 'modules/Locale', 'controllers/comm'
],
function(BB, _, $, tplReport, Locale, comm) {
	var ReportView = BB.View.extend({
		tagName: 'div',
		className: 'report-overlay',
		template: _.template(Locale.translateHTML(tplReport)),
		events: {
			'click #report-cancel': 'handleCancel',
			'submit form': 'handleSubmit'
		},
		initialize: function() {
			this.listenTo(comm, 'hide-overlays', this.closeView);
		},
		render: function() {
			this.$el.html(this.template({}));
			setTimeout(function() {
				this.$el.find('#report-desc').focus();
			}.bind(this), 0);
			
			return this;
		},
		handleCancel: function() {
			this.closeView();
		},
		handleSubmit: function(e) {
			e.preventDefault();
			this.$el.find('.report-buttons').hide();
			this.$el.find('.report-message').html('Sending report. Please wait!');
			this.sendReport();
		},
		showButtons: function() {
			this.$el.find('.report-buttons').show();
			this.$el.find('.report-message').html('');
		},
		sendReport: function() {
			var desc = this.$el.find('#report-desc').val();
			var email = this.$el.find('#report-email').val();
			var includeFeeds = this.$el.find('#report-include-feeds').is(':checked');
			var feeds = includeFeeds ? JSON.stringify(bg.sources.pluck('url')) : '[]';
			var that = this;
			
			$.support.cors = true;
			$.ajax({
				type: 'post',
				url: 'http://blog.martinkadlec.eu/reports/add',
				data: {
					'desc': desc,
					'email': email,
					'feeds': feeds,
					'app': 'Smart RSS',
					'version': bg.version,
					'uastring': navigator.userAgent
				},
				success: function() {
					that.$el.find('.report-message').html('Report succesfully sent.');
					setTimeout(function() {
						that.closeView();
					}, 1000);
				},
				error: function() {
					that.$el.find('.report-message').html('There was an error. Please check your internet connection.');
					setTimeout(function() {
						that.showButtons();
					}, 1000);
				}
			});
		},
		closeView: function(e) {
			e = e || {};
			if (!e.blur) {
				this.stopListening();
				this.remove();
				this.unbind();
			}
		}
	});

	return ReportView;
});