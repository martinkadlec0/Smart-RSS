define([
	'backbone', 'underscore', 'jquery', 'text!templates/report.html', 'modules/Locale'
],
function(BB, _, $, tplReport, Locale) {
	var ReportView = BB.View.extend({
		tagName: 'div',
		className: 'report-overlay',
		template: _.template(Locale.translateHTML(tplReport)),
		events: {
			'click #report-cancel': 'handleCancel',
			'submit form': 'handleSubmit',
		},
		initialize: function() {
			
		},
		render: function() {
			this.$el.html(this.template({}));
			setTimeout(function() {
				this.$el.find('#report-desc').focus();
			}.bind(this), 0);
			
			return this;
		},
		handleCancel: function() {
			this.remove();
  			this.unbind();
		},
		handleSubmit: function(e) {
			e.preventDefault();
			this.$el.find('.report-buttons').html('Sending report. Please wait!');
		}
	});

	return ReportView;
});