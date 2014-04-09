define([
	'backbone', 'underscore', 'jquery', 'text!templates/report.html', 'modules/Locale'
],
function(BB, _, $, tplReport, Locale) {
	var ReportView = BB.View.extend({
		tagName: 'div',
		className: 'report-overlay',
		template: _.template(Locale.translateHTML(tplReport)),
		events: {
			'click #report-cancel': 'handleCancel'
		},
		initialize: function() {
			
		},
		render: function() {
			this.$el.html(this.template({}));
			return this;
		},
		handleCancel: function() {
			this.remove();
  			this.unbind();
		}
	});

	return ReportView;
});